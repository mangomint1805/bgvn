// Đường chính: máy chủ phòng BGVN trên Cloudflare (server/ – Workers + Durable Objects), nối bằng WebSocket.
// Giao diện giả lập "conn" giống fbrelay.js / relay.js: on('open'|'data'|'close'|'error'), send(msg), close(), open, peer.
// Thử máy chủ khác: ?cf=ws://127.0.0.1:8787 (lưu lại trong máy) · tắt: ?cf=0
const DEFAULT = 'wss://api.boardgamevui.com';
function base() {
  try {
    const q = new URLSearchParams(location.search).get('cf');
    if (q !== null) { if (q === '0' || q === '') localStorage.setItem('bgvn-cf', 'off'); else if (/^wss?:\/\//.test(q)) localStorage.setItem('bgvn-cf', q); else localStorage.removeItem('bgvn-cf'); }
    const v = localStorage.getItem('bgvn-cf');
    if (v === 'off') return null;
    if (v) return v.replace(/\/+$/, '');
  } catch (e) {}
  return DEFAULT;
}
export const cfHttp = () => (base() || DEFAULT).replace(/^ws/, 'http'); // địa chỉ http(s) của máy chủ (góp ý…)
export const cfEnabled = () => !!base() && typeof WebSocket !== 'undefined';
const rid = () => Math.random().toString(36).slice(2, 12);
const enc = d => JSON.stringify(d), dec = s => { try { return JSON.parse(s); } catch (e) { return null; } };
const wsUrl = (ns, code, q) => `${base()}/r/${encodeURIComponent(ns)}/${encodeURIComponent(code)}?${q}`;

class FakeConn {
  constructor(peer, sendFn) { this.peer = peer; this.open = true; this._h = {}; this._send = sendFn; }
  on(e, f) { (this._h[e] = this._h[e] || []).push(f); return this; }
  emit(e, x) { (this._h[e] || []).forEach(f => { try { f(x); } catch (err) { console.error(err); } }); }
  send(msg) { if (this.open) this._send(msg); }
  close() { if (!this.open) return; this.open = false; this._send({ t: '__bye' }); this.emit('close'); }
}

// ---- chủ phòng: 1 WebSocket, máy chủ gắn nhãn người gửi ----
export class CfHost {
  constructor(ns, code, onConn) {
    this.ns = ns; this.code = code; this.onConn = onConn; this.conns = new Map(); this.k = rid() + rid(); this.wait = 1000;
    if (cfEnabled()) this.open();
  }
  open() {
    if (this.dead) return;
    let ws; try { ws = new WebSocket(wsUrl(this.ns, this.code, `role=host&k=${this.k}`)); } catch (e) { this.retry(); return; }
    this.ws = ws;
    ws.onopen = () => { this.wait = 1000; };
    ws.onmessage = ev => {
      const m = dec(ev.data); if (!m) return;
      if (m.x === 'taken') { this.taken = true; return; } // trùng mã với phòng khác đang mở – đường này bỏ, còn Firebase/PeerJS
      if (!m.f) return;
      let conn = this.conns.get(m.f);
      if (m.bye) { if (conn) { this.conns.delete(m.f); conn.open = false; conn.emit('close'); } return; }
      const d = dec(m.s);
      if (!conn) {
        if (!d || d.t !== 'join') return;
        const id = m.f;
        conn = new FakeConn('cf:' + id, msg => {
          if (!this.ws || this.ws.readyState !== 1) return;
          if (msg && msg.t === '__bye') { this.ws.send(enc({ to: id, bye: 1 })); return; }
          this.ws.send(enc({ to: id, s: enc(msg) }));
        });
        this.conns.set(id, conn); this.onConn(conn);
      }
      if (d) conn.emit('data', d);
    };
    ws.onclose = () => {
      if (this.ws !== ws) return;
      for (const c of this.conns.values()) { c.open = false; c.emit('close'); } // máy chủ đã ngắt mọi người: họ sẽ tự vào lại
      this.conns.clear();
      if (!this.taken) this.retry();
    };
    ws.onerror = () => {};
  }
  retry() { if (this.dead) return; clearTimeout(this.rt); this.rt = setTimeout(() => this.open(), this.wait); this.wait = Math.min(this.wait * 2, 15000); }
  destroy() { this.dead = true; clearTimeout(this.rt); try { this.ws && this.ws.close(1000, 'bye'); } catch (e) {} }
}

// ---- người vào phòng ----
export function cfConnect(ns, code) {
  const me = rid(); let alive = true;
  let ws = null;
  const conn = new FakeConn('cf', msg => { if (ws && ws.readyState === 1) ws.send(enc(msg)); });
  conn.open = false;
  const fail = () => { if (!alive) return; alive = false; conn.open = false; try { ws && ws.close(); } catch (e) {} conn.emit('close'); };
  try { ws = new WebSocket(wsUrl(ns, code, `role=c&id=${me}`)); } catch (e) { setTimeout(fail, 0); return conn; }
  ws.onopen = () => { if (!alive) return; conn.open = true; conn.emit('open'); };
  ws.onmessage = ev => {
    if (!alive) return;
    const d = dec(ev.data); if (!d) return;
    if (d.x) { if (d.x === 'nf') conn.notFound = true; fail(); return; }
    if (d.t === '__bye') { fail(); return; }
    conn.emit('data', d);
  };
  ws.onclose = () => fail();
  ws.onerror = () => {};
  conn.close = () => { if (!alive) return; alive = false; conn.open = false; try { ws.close(1000, 'bye'); } catch (e) {} };
  return conn;
}
