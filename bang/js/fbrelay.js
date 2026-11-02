// Đường chính: Firebase Realtime Database (máy chủ Google) – ổn định, mạng nào cũng qua.
// Giao diện giả lập "conn" của PeerJS giống relay.js: on('open'|'data'|'close'|'error'), send(msg), close(), open, peer.
// Dữ liệu: rooms/<ns>/<code>/alive (chủ phòng còn mở), /h/<id> (tin gửi chủ phòng), /c/<client>/<id> (tin gửi từng người).
export const FIREBASE = {
  apiKey: '',
  databaseURL: '',
  projectId: '',
};
const V = '10.12.2';
let sdk = null;
export const fbEnabled = () => !!(FIREBASE.apiKey && FIREBASE.databaseURL);
async function db() {
  if (!sdk) sdk = (async () => {
    const app = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`);
    const d = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-database.js`);
    const a = app.getApps().length ? app.getApp() : app.initializeApp(FIREBASE);
    return { ...d, db: d.getDatabase(a) };
  })();
  return sdk;
}
const rid = () => Math.random().toString(36).slice(2, 10);
const enc = d => JSON.stringify(d), dec = s => { try { return JSON.parse(s); } catch (e) { return null; } };

class FakeConn {
  constructor(peer, sendFn) { this.peer = peer; this.open = true; this._h = {}; this._send = sendFn; }
  on(e, f) { (this._h[e] = this._h[e] || []).push(f); return this; }
  emit(e, x) { (this._h[e] || []).forEach(f => { try { f(x); } catch (err) { console.error(err); } }); }
  send(msg) { if (this.open) this._send(msg); }
  close() { if (!this.open) return; this.open = false; this._send({ t: '__bye' }); this.emit('close'); }
}

export class FbHost {
  constructor(ns, code, onConn) {
    this.conns = new Map(); this.offs = [];
    if (!fbEnabled()) return;
    db().then(F => {
      if (this.dead) return;
      const room = F.ref(F.db, `rooms/${ns}/${code}`); this.F = F; this.room = room;
      F.set(room, { alive: Date.now() }).then(() => {
        F.onDisconnect(room).remove();
        const h = F.ref(F.db, `rooms/${ns}/${code}/h`);
        this.offs.push(F.onChildAdded(h, snap => {
          const m = snap.val(); F.remove(snap.ref);
          if (!m || !m.from) return;
          let conn = this.conns.get(m.from);
          if (m.bye) { if (conn) { this.conns.delete(m.from); conn.open = false; conn.emit('close'); } return; }
          const d = dec(m.s);
          if (!conn) {
            if (!d || d.t !== 'join') return;
            const out = F.ref(F.db, `rooms/${ns}/${code}/c/${m.from}`);
            conn = new FakeConn('fb:' + m.from, msg => F.push(out, { s: enc(msg) }));
            this.conns.set(m.from, conn); onConn(conn);
          }
          if (d) conn.emit('data', d);
        }));
      });
    }).catch(e => console.warn('Firebase lỗi', e));
  }
  destroy() { this.dead = true; this.offs.forEach(f => f()); if (this.F && this.room) this.F.remove(this.room).catch(() => {}); }
}

export function fbConnect(ns, code) {
  const me = rid(); let F = null, alive = true; const offs = [];
  const conn = new FakeConn('fb', msg => F && F.push(F.ref(F.db, `rooms/${ns}/${code}/h`), { from: me, s: enc(msg) }));
  conn.open = false;
  const fail = () => { if (!alive) return; alive = false; offs.forEach(f => f()); conn.open = false; conn.emit('close'); };
  db().then(async X => {
    F = X; if (!alive) return;
    const al = await F.get(F.ref(F.db, `rooms/${ns}/${code}/alive`));
    if (!al.exists()) { conn.notFound = true; fail(); return; }
    const mine = F.ref(F.db, `rooms/${ns}/${code}/c/${me}`);
    F.onDisconnect(F.push(F.ref(F.db, `rooms/${ns}/${code}/h`))).set({ from: me, bye: 1 });
    F.onDisconnect(mine).remove();
    offs.push(F.onChildAdded(mine, snap => {
      const m = snap.val(); F.remove(snap.ref);
      const d = m && dec(m.s); if (!d) return;
      if (d.t === '__bye') { fail(); return; }
      conn.emit('data', d);
    }));
    let seen = false; // chủ phòng đóng tab -> phòng bị xoá
    offs.push(F.onValue(F.ref(F.db, `rooms/${ns}/${code}/alive`), s => { if (s.exists()) seen = true; else if (seen) fail(); }));
    conn.open = true; conn.emit('open');
  }).catch(() => fail());
  conn.close = () => {
    if (!alive) return; alive = false; offs.forEach(f => f()); conn.open = false;
    if (F) { F.push(F.ref(F.db, `rooms/${ns}/${code}/h`), { from: me, bye: 1 }); F.remove(F.ref(F.db, `rooms/${ns}/${code}/c/${me}`)); }
  };
  return conn;
}
