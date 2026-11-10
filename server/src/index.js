// Máy chủ phòng chơi BGVN trên Cloudflare Workers + Durable Objects (gói miễn phí).
// Mỗi phòng = 1 Durable Object "Room" (theo ns + mã phòng). Chủ phòng và người chơi nối WebSocket vào,
// máy chủ chỉ chuyển tin (game vẫn do máy chủ phòng – trình duyệt chủ phòng – quyết định).
//
//   wss://api.boardgamevui.com/r/<ns>/<code>?role=host&k=<khoá chủ phòng>
//   wss://api.boardgamevui.com/r/<ns>/<code>?role=c&id=<mã người chơi>
//   Tin: người chơi → máy chủ: chuỗi JSON của game.     máy chủ → chủ phòng: {"f":id,"s":chuỗi} | {"f":id,"bye":1}
//        chủ phòng → máy chủ: {"to":id,"s":chuỗi} | {"to":id,"bye":1}   máy chủ → người chơi: chuỗi | {"x":"nf"} (không có phòng) | {"x":"gone"} (chủ phòng thoát)
//
//   POST /feedback  {t,msg,game,contact,page}   – góp ý / báo lỗi (lưu SQLite trong Durable Object "Inbox")
//   GET  /admin                                  – trang đọc góp ý (cần ADMIN_KEY đặt trong Cloudflare → Settings → Variables and Secrets)
import { DurableObject } from 'cloudflare:workers';

const ORIGINS = [/^https:\/\/(www\.)?boardgamevui\.com$/, /^https:\/\/mangomint1805\.github\.io$/, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];
const okOrigin = o => !o || ORIGINS.some(r => r.test(o)); // không có Origin (app/test) thì cho qua – chỉ chặn web lạ nhúng
const NS = /^bgvn-[a-z0-9]{2,12}$/, CODE = /^[A-Z0-9]{5}$/, ID = /^[a-z0-9]{4,24}$/;
const MAX_MSG = 200000, MAX_CLIENTS = 24, RATE = 80; // tin/giây mỗi kết nối

const cors = origin => ({ 'Access-Control-Allow-Origin': okOrigin(origin) && origin ? origin : 'https://boardgamevui.com', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'content-type', 'Vary': 'Origin' });
const json = (d, s = 200, h = {}) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', ...h } });

export default {
  async fetch(req, env) {
    const url = new URL(req.url), origin = req.headers.get('Origin');
    const p = url.pathname.split('/').filter(Boolean);
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors(origin) });
    if (p[0] === 'r' && p.length === 3) {
      if (req.headers.get('Upgrade') !== 'websocket') return new Response('Cần WebSocket', { status: 426 });
      if (!okOrigin(origin)) return new Response('Origin không hợp lệ', { status: 403 });
      const [, ns, code] = p;
      if (!NS.test(ns) || !CODE.test(code)) return new Response('Mã phòng không hợp lệ', { status: 400 });
      const stub = env.ROOM.get(env.ROOM.idFromName(`${ns}/${code}`));
      return stub.fetch(req);
    }
    if (p[0] === 'feedback' && req.method === 'POST') {
      if (!okOrigin(origin)) return json({ ok: false }, 403);
      const inbox = env.INBOX.get(env.INBOX.idFromName('main'));
      const r = await inbox.add(await req.text(), req.headers.get('CF-Connecting-IP') || '', req.headers.get('User-Agent') || '');
      return json(r, r.ok ? 200 : 400, cors(origin));
    }
    if (p[0] === 'admin') {
      if (p[1] === 'list' && req.method === 'POST') {
        const { key, del } = await req.json().catch(() => ({}));
        const want = String(env.ADMIN_KEY || '').trim();
        if (!want) return json({ ok: false, msg: 'Máy chủ chưa có ADMIN_KEY – vào Cloudflare → bgvn-rooms → Settings → Variables and Secrets (KHÔNG phải mục Build) để thêm' }, 503);
        if (String(key || '').trim() !== want) return json({ ok: false, msg: 'Sai mật khẩu' }, 401);
        const inbox = env.INBOX.get(env.INBOX.idFromName('main'));
        if (del) await inbox.remove(del);
        return json({ ok: true, items: await inbox.list() });
      }
      return new Response(ADMIN_HTML, { headers: { 'content-type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }
    if (url.pathname === '/' || p[0] === 'health') return json({ ok: true, name: 'BGVN rooms' }, 200, cors(origin));
    return new Response('Không có gì ở đây', { status: 404 });
  },
};

// ======================= PHÒNG CHƠI =======================
export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env); this.rate = new Map();
    // "ping" → "pong" do Cloudflare tự trả lời, KHÔNG đánh thức Durable Object (không tốn thời gian chạy)
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }
  host() { return this.ctx.getWebSockets('host')[0] || null; }
  client(id) { return this.ctx.getWebSockets('c:' + id)[0] || null; }
  async fetch(req) {
    const url = new URL(req.url), role = url.searchParams.get('role');
    const pair = new WebSocketPair(), [cli, srv] = Object.values(pair);
    if (role === 'host') {
      const k = (url.searchParams.get('k') || '').slice(0, 40);
      const old = this.host();
      if (old) {
        const a = old.deserializeAttachment() || {};
        if (a.k !== k) { this.ctx.acceptWebSocket(srv, ['reject']); srv.send(JSON.stringify({ x: 'taken' })); srv.close(4001, 'taken'); return new Response(null, { status: 101, webSocket: cli }); }
        try { old.close(4000, 'replaced'); } catch (e) {}
      }
      this.ctx.acceptWebSocket(srv, ['host']); srv.serializeAttachment({ role: 'host', k });
      return new Response(null, { status: 101, webSocket: cli });
    }
    const id = url.searchParams.get('id') || '';
    this.ctx.acceptWebSocket(srv, ['c:' + id]);
    if (!ID.test(id)) { srv.send('{"x":"nf"}'); srv.close(4002, 'bad id'); return new Response(null, { status: 101, webSocket: cli }); }
    if (!this.host()) { srv.send('{"x":"nf"}'); srv.close(4004, 'no room'); return new Response(null, { status: 101, webSocket: cli }); }
    if (this.ctx.getWebSockets().length > MAX_CLIENTS + 1) { srv.send('{"x":"full"}'); srv.close(4003, 'full'); return new Response(null, { status: 101, webSocket: cli }); }
    const dup = this.ctx.getWebSockets('c:' + id).filter(w => w !== srv); dup.forEach(w => { try { w.close(4000, 'replaced'); } catch (e) {} });
    srv.serializeAttachment({ role: 'c', id });
    return new Response(null, { status: 101, webSocket: cli });
  }
  limited(ws) { // chống spam: quá RATE tin/giây thì cắt
    const now = Date.now(), r = this.rate.get(ws) || { t: now, n: 0 };
    if (now - r.t > 1000) { r.t = now; r.n = 0; }
    r.n++; this.rate.set(ws, r); return r.n > RATE;
  }
  async webSocketMessage(ws, msg) {
    if (typeof msg !== 'string' || msg.length > MAX_MSG + 200 || this.limited(ws)) { try { ws.close(4008, 'too much'); } catch (e) {} return; }
    const a = ws.deserializeAttachment() || {};
    if (a.role === 'host') {
      let m; try { m = JSON.parse(msg); } catch (e) { return; }
      if (!m || typeof m.to !== 'string') return;
      const c = this.client(m.to); if (!c) { if (!m.bye) ws.send(JSON.stringify({ f: m.to, bye: 1 })); return; }
      if (m.bye) { try { c.send('{"x":"gone"}'); c.close(1000, 'bye'); } catch (e) {} return; }
      if (typeof m.s === 'string') try { c.send(m.s); } catch (e) {}
    } else if (a.role === 'c') {
      const h = this.host(); if (!h) { try { ws.send('{"x":"gone"}'); ws.close(1000, 'gone'); } catch (e) {} return; }
      try { h.send(JSON.stringify({ f: a.id, s: msg })); } catch (e) {}
    }
  }
  async webSocketClose(ws, code) { this.gone(ws); try { ws.close(code === 1005 ? 1000 : code, 'bye'); } catch (e) {} }
  async webSocketError(ws) { this.gone(ws); }
  gone(ws) {
    this.rate.delete(ws);
    const a = ws.deserializeAttachment() || {};
    if (a.role === 'host') { // chủ phòng thoát: báo mọi người (nếu chưa có chủ phòng mới thay)
      if (this.ctx.getWebSockets('host').some(w => w !== ws && w.readyState === 1)) return;
      for (const w of this.ctx.getWebSockets()) if (w !== ws) { try { w.send('{"x":"gone"}'); w.close(1000, 'host left'); } catch (e) {} }
    } else if (a.role === 'c') {
      const h = this.host(); if (h) try { h.send(JSON.stringify({ f: a.id, bye: 1 })); } catch (e) {}
    }
  }
}

// ======================= HỘP THƯ GÓP Ý =======================
export class Inbox extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env); this.sql = ctx.storage.sql; this.ipHits = new Map();
    this.sql.exec(`CREATE TABLE IF NOT EXISTS fb (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER, t TEXT, game TEXT, msg TEXT, contact TEXT, page TEXT, ua TEXT)`);
  }
  async add(body, ip, ua) {
    let d; try { d = JSON.parse(body); } catch (e) { return { ok: false, msg: 'Dữ liệu lỗi' }; }
    const s = (v, n) => (typeof v === 'string' ? v : '').trim().slice(0, n);
    const t = ['bug', 'idea', 'other'].includes(d.t) ? d.t : 'other', msg = s(d.msg, 2000);
    if (msg.length < 3) return { ok: false, msg: 'Nội dung ngắn quá' };
    const now = Date.now(), hits = (this.ipHits.get(ip) || []).filter(x => now - x < 3600e3);
    if (hits.filter(x => now - x < 30e3).length >= 1 || hits.length >= 20) return { ok: false, msg: 'Gửi chậm lại chút nha' };
    hits.push(now); this.ipHits.set(ip, hits);
    const n = this.sql.exec('SELECT COUNT(*) AS n FROM fb').one().n;
    if (n >= 5000) this.sql.exec('DELETE FROM fb WHERE id IN (SELECT id FROM fb ORDER BY id LIMIT 100)');
    this.sql.exec('INSERT INTO fb (ts,t,game,msg,contact,page,ua) VALUES (?,?,?,?,?,?,?)', now, t, s(d.game, 20), msg, s(d.contact, 100), s(d.page, 200), s(ua, 300));
    return { ok: true };
  }
  async list() { return this.sql.exec('SELECT * FROM fb ORDER BY id DESC LIMIT 500').toArray(); }
  async remove(id) { this.sql.exec('DELETE FROM fb WHERE id = ?', +id || 0); }
}

const ADMIN_HTML = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Góp ý BGVN</title><meta name="robots" content="noindex">
<style>body{margin:0;font:15px/1.5 system-ui,sans-serif;background:#fff7ee;color:#2a2340}main{max-width:760px;margin:0 auto;padding:16px}h1{font-size:22px}
input,button{font:inherit;padding:10px 12px;border-radius:10px;border:1.5px solid #e2d4c4}button{background:#2a2340;color:#fff;border:0;cursor:pointer}
.it{background:#fff;border-radius:14px;padding:12px 14px;margin:10px 0;box-shadow:0 2px 8px #0001}.meta{font-size:12.5px;color:#7a6f88;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.tag{padding:2px 8px;border-radius:999px;background:#eee;font-weight:700}.bug{background:#ffd9dc}.idea{background:#dff5e6}.msg{white-space:pre-wrap;margin:6px 0}.del{margin-left:auto;background:#ff4d5e;padding:4px 10px;font-size:13px}</style></head>
<body><main><h1>💌 Góp ý / báo lỗi BGVN</h1><form id="f"><input id="k" type="password" placeholder="Mật khẩu quản trị" autocomplete="current-password" autocapitalize="off" autocorrect="off" spellcheck="false"> <label style="font-size:13px"><input type="checkbox" onchange="k.type=this.checked?'text':'password'"> hiện</label> <button>Xem</button></form><p id="st"></p><div id="l"></div></main>
<script>
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const T={bug:'🐞 Lỗi',idea:'💡 Góp ý',other:'💬 Khác'};
async function load(del){const key=$('#k').value;const r=await fetch('/admin/list',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key,del})});const d=await r.json();
if(!d.ok){$('#st').textContent=d.msg||'Lỗi';return}sessionStorage.k=key;$('#st').textContent=d.items.length+' tin';
$('#l').innerHTML=d.items.map(i=>'<div class="it"><div class="meta"><span class="tag '+i.t+'">'+T[i.t]+'</span><b>'+esc(i.game||'chung')+'</b><span>'+new Date(i.ts).toLocaleString('vi-VN')+'</span>'+(i.contact?'<span>📮 '+esc(i.contact)+'</span>':'')+'<button class="del" data-id="'+i.id+'">Xoá</button></div><div class="msg">'+esc(i.msg)+'</div><div class="meta">'+esc(i.page)+' · '+esc(i.ua)+'</div></div>').join('')}
$('#f').onsubmit=e=>{e.preventDefault();load()};$('#l').onclick=e=>{const b=e.target.closest('.del');if(b&&confirm('Xoá tin này?'))load(b.dataset.id)};
try{if(sessionStorage.k){$('#k').value=sessionStorage.k;load()}}catch(e){}
</script></body></html>`;
