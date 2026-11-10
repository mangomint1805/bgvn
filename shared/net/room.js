// Phòng chơi dùng chung cho mọi game: chủ phòng nghe trên 4 đường, người vào thử lần lượt.
//   1) Máy chủ BGVN trên Cloudflare (server/ – đường chính)
//   2) Firebase Realtime Database (máy chủ Google – dự phòng)
//   3) PeerJS (nối thẳng máy với máy)
//   4) MQTT công cộng (dự phòng cuối)
// Tin nhắn là object JSON; game tự xử lý nội dung, lớp này chỉ lo kết nối, vào lại, báo trạng thái.
import { peerOptions, keepAlive } from './ice.js';
import { RelayHost, relayConnect } from './relay.js';
import { FbHost, fbConnect, fbEnabled } from './fbrelay.js';
import { CfHost, cfConnect, cfEnabled } from './cfrelay.js?v=2';
import { announceRoom } from './api.js?v=1';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function makeCode() { let s = ''; for (let i = 0; i < 5; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]; return s; }
const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }, del(k) { try { localStorage.removeItem(k); } catch (e) {} } };
// mã định danh máy này (để vào lại đúng chỗ ngồi cũ)
export function token() {
  let t = ls.get('bgvn-token') || ls.get('bangvn-token');
  if (!t) t = Math.random().toString(36).slice(2) + Date.now().toString(36);
  ls.set('bgvn-token', t); return t;
}
// phiên chơi gần nhất của từng game – để tải lại trang là vào lại phòng
export const session = {
  save(game, data) { ls.set('bgvn-session-' + game, JSON.stringify({ ...data, ts: Date.now() })); },
  load(game, maxAge = 3 * 3600e3) { try { const d = JSON.parse(ls.get('bgvn-session-' + game)); return d && Date.now() - d.ts < maxAge ? d : null; } catch (e) { return null; } },
  clear(game) { ls.del('bgvn-session-' + game); },
};

// ======================= CHỦ PHÒNG =======================
export class RoomHost {
  // opts: { ns, prefix, code?, keepCode?, onConn(conn), onReady(code), onError(msg) }
  constructor(opts) {
    this.o = opts; this.code = opts.code || makeCode(); this.opened = !!opts.keepCode;
    this.conns = new Set();
    const inner = opts.onConn; // theo dõi mọi kết nối để gửi nhịp tim
    this.o = { ...opts, onConn: c => { this.conns.add(c); const del = () => this.conns.delete(c); c.on('close', del); c.on('error', del); inner(c); } };
    this.open();
    this.stopKeep = keepAlive(() => this.peer);
    // phòng công khai (hiện ở Sảnh chung) – bật bằng nút "🌐 Công khai" (shared/ui/homebtn.js)
    this.pubK = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    try { window.__bgvnHost = this; dispatchEvent(new CustomEvent('bgvn-host', { detail: this })); } catch (e) {}
    this._unload = () => { if (this.pub) this.announce(false); };
    try { addEventListener('pagehide', this._unload); } catch (e) {}
    // nhịp tim: người chơi không nghe gì 8 giây thì tự vào lại (rớt mạng âm thầm, chủ phòng đã đóng chỗ…)
    this.hb = setInterval(() => { for (const c of this.conns) if (c.open && !String(c.peer || '').startsWith('cf:')) try { c.send({ t: '__hb' }); } catch (e) {} }, 2500); // đường Cloudflare tự giữ kết nối bằng ping/pong miễn phí
  }
  startRelays() {
    if (this.relayCode === this.code) return;
    this.relay && this.relay.destroy(); this.fb && this.fb.destroy(); this.cf && this.cf.destroy();
    this.relayCode = this.code;
    this.cf = new CfHost(this.o.ns, this.code, c => this.o.onConn(c));
    this.fb = new FbHost(this.o.ns, this.code, c => this.o.onConn(c));
    this.relay = new RelayHost(this.o.ns, this.code, c => this.o.onConn(c));
    this.o.onReady && this.o.onReady(this.code);
  }
  async open() {
    this.startRelays();
    const opt = await peerOptions(); if (this.dead) return;
    if (typeof Peer === 'undefined') return; // không tải được PeerJS: vẫn chơi được qua Firebase/MQTT
    this.peer = new Peer(this.o.prefix + this.code, opt);
    this.peer.on('open', () => { this.opened = true; this.o.onReady && this.o.onReady(this.code); });
    this.peer.on('connection', c => this.o.onConn(c));
    this.peer.on('disconnected', () => { if (!this.dead) setTimeout(() => { try { if (this.peer.disconnected && !this.peer.destroyed) this.peer.reconnect(); } catch (e) {} }, 1000); });
    this.peer.on('error', e => {
      if (e.type === 'unavailable-id') { // trùng mã: phòng cũ vừa rớt thì chờ máy chủ nhả mã, phòng mới thì đổi mã
        try { this.peer.destroy(); } catch (x) {}
        if (this.opened && (this.keepTries = (this.keepTries || 0) + 1) <= 8) setTimeout(() => this.open(), 3000);
        else if (!this.opened) { this.code = makeCode(); this.open(); }
      } else if (!['network', 'server-error', 'socket-error', 'socket-closed', 'disconnected', 'peer-unavailable'].includes(e.type)) this.o.onError && this.o.onError('Lỗi mạng: ' + e.type);
    });
  }
  get game() { return String(this.o.ns || '').replace(/^bgvn-/, ''); }
  announce(open) { try { announceRoom({ game: this.game, code: this.code, k: this.pubK, host: localStorage.getItem('bgvn-name') || 'Ai đó', n: this.conns.size + 1, open }); } catch (e) {} }
  setPublic(on) {
    this.pub = !!on; clearInterval(this.pubT);
    if (this.pub) { this.announce(true); this.pubT = setInterval(() => { if (!this.dead) this.announce(true); }, 30000); }
    else this.announce(false);
  }
  destroy() { if (this.pub) { this.pub = false; clearInterval(this.pubT); this.announce(false); } try { removeEventListener('pagehide', this._unload); if (window.__bgvnHost === this) window.__bgvnHost = null; } catch (e) {}
    this.dead = true; clearInterval(this.hb); this.stopKeep && this.stopKeep(); this.relay && this.relay.destroy(); this.fb && this.fb.destroy(); this.cf && this.cf.destroy(); try { this.peer && this.peer.destroy(); } catch (e) {} }
}

// ======================= NGƯỜI VÀO PHÒNG =======================
// báo cho trang biết kết quả vào phòng (shared/net/joinlink.js nghe để xử lý link mời): welcome | fail | reject
function emit(type, code, msg) { try { dispatchEvent(new CustomEvent('bgvn-room', { detail: { type, code, msg } })); } catch (e) {} }
export class RoomClient {
  // opts: { ns, prefix, code, joinMsg(): object, onMsg(msg), onWelcome(id), onStatus(text, kind), onFail(text), onLost() }
  constructor(opts) {
    this.o = opts; this.code = opts.code.toUpperCase().trim(); this.id = null; this.tries = 0; this.wasIn = false;
    this.modes = /[?&]relay=1/.test(location.search) ? ['mqtt'] : /[?&]p2p=1/.test(location.search) ? ['p2p'] : [...(cfEnabled() ? ['cf'] : []), ...(fbEnabled() ? ['fb'] : []), 'p2p', 'mqtt'];
    this.mi = 0;
    if (this.modes.includes('p2p')) this.initPeer();
    this.connect();
  }
  status(t, kind = 'wait') { this.o.onStatus && this.o.onStatus(t, kind); }
  initPeer() {
    this.peerOpen = new Promise(async res => {
      const opt = await peerOptions(); if (this.dead) return;
      setTimeout(() => res(false), 6000);
      if (typeof Peer === 'undefined') { res(false); return; }
      try { this.peer = new Peer(undefined, opt); } catch (e) { res(false); return; }
      this.stopKeep = keepAlive(() => this.peer);
      this.peer.on('open', () => res(true));
      this.peer.on('error', e => { if (e.type === 'peer-unavailable' && this.mode() === 'p2p' && !this.id) this.next(); else res(false); });
    });
  }
  mode() { return this.modes[this.mi]; }
  next() {
    if (this.dead || this.id) return;
    clearTimeout(this.joinTimer);
    if (this.mi < this.modes.length - 1) { this.mi++; this.connect(); return; }
    // hết đường: thử lại vòng mới. Đang chơi mà rớt thì kiên nhẫn hơn (chủ phòng có thể đang tải lại trang)
    const max = this.wasIn ? 12 : 2;
    if (++this.tries <= max) { this.status(this.wasIn ? `Mất kết nối – đang vào lại (${this.tries}/${max})…` : `Chưa thấy phòng, thử lại (${this.tries}/${max})…`); this.mi = 0; setTimeout(() => this.connect(), this.wasIn ? 3000 : 2000); return; }
    const msg = this.wasIn ? 'Không vào lại được phòng. Có thể chủ phòng đã thoát.' : `Không tìm thấy phòng ${this.code}. Kiểm tra lại mã – chủ phòng phải đang mở tab game.`;
    this.status(msg, 'fail'); this.o.onFail && this.o.onFail(msg); emit('fail', this.code, msg);
  }
  retryNow() { if (this.dead || this.id) return; this.tries = 0; this.mi = 0; this.connect(); }
  async connect() {
    if (this.dead || this.id) return;
    const mode = this.mode();
    try { this.conn && this.conn.close(); } catch (e) {}
    this.conn = null;
    let conn;
    if (!this.wasIn) this.status(this.tries ? `Đang thử lại (${this.tries})…` : 'Đang kết nối…');
    if (mode === 'p2p') {
      const ok = await this.peerOpen; if (this.dead || this.id) return;
      if (!ok || !this.peer || this.peer.disconnected) { this.next(); return; }
      conn = this.peer.connect(this.o.prefix + this.code, { reliable: true });
    } else if (mode === 'cf') conn = cfConnect(this.o.ns, this.code);
    else if (mode === 'fb') conn = fbConnect(this.o.ns, this.code);
    else conn = relayConnect(this.o.ns, this.code);
    this.conn = conn;
    clearTimeout(this.joinTimer);
    this.joinTimer = setTimeout(() => { if (!this.id && conn === this.conn) this.next(); }, mode === 'p2p' ? 7000 : mode === 'cf' ? 8000 : 12000);
    conn.on('open', () => { if (conn === this.conn) conn.send({ t: 'join', token: token(), ...this.o.joinMsg() }); });
    conn.on('data', msg => {
      if (conn !== this.conn || !msg) return;
      this.lastSeen = Date.now();
      if (msg.t === '__hb') return;
      if (msg.t === 'welcome') { clearTimeout(this.joinTimer); this.id = msg.id; this.tries = 0; this.wasIn = true; this.watch(conn, lost); this.status('Đã vào phòng', 'ok'); this.o.onWelcome && this.o.onWelcome(msg.id, msg); emit('welcome', this.code); return; }
      this.o.onMsg(msg);
      if (msg.t === 'error' && !this.id && !this.wasIn && !this.dead) emit('reject', this.code, msg.msg); // chủ phòng từ chối (đủ người, ván đang chơi…)
    });
    const lost = () => {
      if (conn !== this.conn || this.dead || conn._gone) return;
      if (!this.id) { if (conn.notFound || mode !== 'p2p') this.next(); return; }
      conn._gone = true; this.id = null; this.tries = 0; this.mi = 0;
      this.status('Mất kết nối – đang vào lại…'); this.o.onLost && this.o.onLost();
      setTimeout(() => { if (!this.dead) this.connect(); }, 1500);
    };
    conn.on('close', lost); conn.on('error', lost);
  }
  // chủ phòng có gửi nhịp tim (bản mới): im lặng quá 8 giây thì coi như mất kết nối và vào lại
  watch(conn, lost) {
    clearInterval(this.wd); this.lastSeen = Date.now(); let gotHb = false;
    const onHb = m => { if (m && m.t === '__hb') gotHb = true; }; conn.on('data', onHb);
    this.wd = setInterval(() => {
      if (this.dead || conn !== this.conn) { clearInterval(this.wd); return; }
      if (gotHb && Date.now() - this.lastSeen > 8000) { clearInterval(this.wd); try { conn.close(); } catch (e) {} lost(); }
    }, 1000);
  }
  send(msg) { if (this.conn && this.conn.open) this.conn.send(msg); }
  destroy() { this.dead = true; clearInterval(this.wd); clearTimeout(this.joinTimer); this.stopKeep && this.stopKeep(); try { this.conn && this.conn.close(); } catch (e) {} try { this.peer && this.peer.destroy(); } catch (e) {} }
}
