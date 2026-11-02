// Đường dự phòng khi kết nối P2P (WebRTC) bị mạng chặn – hay gặp khi dùng 4G.
// Tin nhắn đi qua máy chủ MQTT công cộng bằng WebSocket (cổng 443/8084), mạng nào cũng qua được.
// Giao diện giả lập "conn" của PeerJS: on('data'|'close'|'error'), send(msg), close(), open, peer.
const MQTT_URL = 'https://cdn.jsdelivr.net/npm/mqtt@5.10.1/dist/mqtt.min.js';
const BROKERS = ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt'];
let loading = null;
function loadMqtt() {
  if (window.mqtt) return Promise.resolve(window.mqtt);
  if (!loading) loading = new Promise((res, rej) => { const s = document.createElement('script'); s.src = MQTT_URL; s.onload = () => res(window.mqtt); s.onerror = rej; document.head.appendChild(s); });
  return loading;
}
const rid = () => Math.random().toString(36).slice(2, 10);
function client(url) { return window.mqtt.connect(url, { clientId: 'bgvn_' + rid(), clean: true, reconnectPeriod: 2000, connectTimeout: 8000, keepalive: 30 }); }

class FakeConn {
  constructor(peer, sendFn) { this.peer = peer; this.open = true; this._h = {}; this._send = sendFn; }
  on(e, f) { (this._h[e] = this._h[e] || []).push(f); return this; }
  emit(e, x) { (this._h[e] || []).forEach(f => { try { f(x); } catch (err) { console.error(err); } }); }
  send(msg) { if (this.open) this._send(msg); }
  close() { if (!this.open) return; this.open = false; this._send({ t: '__bye' }); this.emit('close'); }
}

// Chủ phòng: nghe trên mọi broker
export class RelayHost {
  constructor(ns, code, onConn) {
    this.topic = `${ns}/${code}`; this.onConn = onConn; this.conns = new Map(); this.clients = [];
    loadMqtt().then(() => {
      if (this.dead) return;
      for (const url of BROKERS) {
        const c = client(url); this.clients.push(c);
        c.on('connect', () => c.subscribe(this.topic + '/h', { qos: 0 }));
        c.on('message', (_t, buf) => this.onMsg(c, buf));
      }
    }).catch(() => {});
    this.timer = setInterval(() => { const now = Date.now(); for (const [id, x] of this.conns) if (now - x.seen > 20000) { this.conns.delete(id); x.conn.open = false; x.conn.emit('close'); } }, 5000);
  }
  onMsg(c, buf) {
    let m; try { m = JSON.parse(buf.toString()); } catch (e) { return; }
    if (!m || !m.from) return;
    let x = this.conns.get(m.from);
    if (m.bye) { if (x) { this.conns.delete(m.from); x.conn.open = false; x.conn.emit('close'); } return; }
    if (!x) {
      if (!m.d || m.d.t !== 'join') return; // chỉ nhận người mới bằng tin "join"
      const conn = new FakeConn('mq:' + m.from, msg => c.publish(`${this.topic}/c/${m.from}`, JSON.stringify(msg)));
      x = { conn, seen: Date.now() }; this.conns.set(m.from, x); this.onConn(conn);
    }
    x.seen = Date.now();
    if (m.d) x.conn.emit('data', m.d);
  }
  destroy() { this.dead = true; clearInterval(this.timer); for (const x of this.conns.values()) x.conn.send({ t: '__bye' }); this.clients.forEach(c => { try { c.end(true); } catch (e) {} }); }
}

// Người vào phòng: thử từng broker, broker nào nối được thì dùng
export function relayConnect(ns, code) {
  const me = rid(); const topic = `${ns}/${code}`;
  const conn = new FakeConn('relay', msg => cur && cur.publish(topic + '/h', JSON.stringify({ from: me, d: msg })));
  conn.open = false; let cur = null, ping = null, i = 0, alive = true;
  const fail = () => { if (!alive) return; alive = false; clearInterval(ping); conn.emit('error'); conn.emit('close'); };
  loadMqtt().then(() => {
    const tryNext = () => {
      if (!alive) return; if (i >= BROKERS.length) { fail(); return; }
      const c = client(BROKERS[i++]); let ok = false;
      const to = setTimeout(() => { if (!ok) { try { c.end(true); } catch (e) {} tryNext(); } }, 8000);
      c.on('connect', () => {
        if (ok) return; ok = true; clearTimeout(to); cur = c;
        c.subscribe(`${topic}/c/${me}`, { qos: 0 }, () => {
          conn.open = true; conn.emit('open');
          ping = setInterval(() => c.publish(topic + '/h', JSON.stringify({ from: me, ping: 1 })), 5000);
        });
      });
      c.on('message', (_t, buf) => { let m; try { m = JSON.parse(buf.toString()); } catch (e) { return; } if (m.t === '__bye') { alive = false; clearInterval(ping); conn.open = false; conn.emit('close'); return; } conn.emit('data', m); });
    };
    tryNext();
  }).catch(fail);
  conn.close = () => { if (!alive) return; alive = false; clearInterval(ping); try { cur && cur.publish(topic + '/h', JSON.stringify({ from: me, bye: 1 })); } catch (e) {} setTimeout(() => { try { cur && cur.end(true); } catch (e) {} }, 300); conn.open = false; };
  return conn;
}
