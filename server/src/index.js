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
export { Users } from './users.js';
export { Lobby } from './lobby.js';

const ORIGINS = [/^https:\/\/(www\.)?boardgamevui\.com$/, /^https:\/\/mangomint1805\.github\.io$/, /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];
const okOrigin = o => !o || ORIGINS.some(r => r.test(o)); // không có Origin (app/test) thì cho qua – chỉ chặn web lạ nhúng
const NS = /^bgvn-[a-z0-9]{2,12}$/, CODE = /^[A-Z0-9]{5}$/, ID = /^[a-z0-9]{4,24}$/;
const MAX_MSG = 200000, MAX_CLIENTS = 24, RATE = 80; // tin/giây mỗi kết nối

const cors = origin => ({ 'Access-Control-Allow-Origin': okOrigin(origin) && origin ? origin : 'https://boardgamevui.com', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'content-type, authorization', 'Vary': 'Origin' });
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
    const ip = req.headers.get('CF-Connecting-IP') || '';
    const body = async () => { try { return JSON.parse(await req.text()); } catch (e) { return {}; } };
    const bearer = () => (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
    // ---- tài khoản ----
    if (p[0] === 'auth') {
      if (!okOrigin(origin)) return json({ ok: false }, 403);
      const U = env.USERS.get(env.USERS.idFromName('main')), H = cors(origin);
      if (p[1] === 'config') return json({ ok: true, google: env.GOOGLE_CLIENT_ID || null }, 200, H);
      if (req.method !== 'POST') return json({ ok: false }, 405, H);
      const d = await body(); let r;
      if (p[1] === 'register') r = await U.register(d, ip);
      else if (p[1] === 'login') r = await U.login(d, ip);
      else if (p[1] === 'google') r = await U.google(d, ip, env.GOOGLE_CLIENT_ID);
      else if (p[1] === 'me') { const u = await U.whoami(bearer()); r = u ? { ok: true, user: u } : { ok: false, msg: 'Hết phiên đăng nhập' }; }
      else if (p[1] === 'logout') r = await U.logout(bearer());
      else if (p[1] === 'rename') r = await U.rename(bearer(), d.name);
      else if (p[1] === 'password') r = await U.changePassword(bearer(), d.old, d.new);
      else return json({ ok: false }, 404, H);
      return json(r, 200, H);
    }
    // ---- sảnh chung ----
    if (p[0] === 'presence') { // đếm người đang mở web
      if (req.headers.get('Upgrade') !== 'websocket') return json({ ok: true, n: await env.LOBBY.get(env.LOBBY.idFromName('main')).online() }, 200, cors(origin));
      if (!okOrigin(origin)) return new Response('Origin không hợp lệ', { status: 403 });
      return env.LOBBY.get(env.LOBBY.idFromName('main')).fetch(req);
    }
    if (p[0] === 'lobby') {
      const L = env.LOBBY.get(env.LOBBY.idFromName('main'));
      if (p.length === 1) {
        if (req.headers.get('Upgrade') !== 'websocket') return new Response('Cần WebSocket', { status: 426 });
        if (!okOrigin(origin)) return new Response('Origin không hợp lệ', { status: 403 });
        return L.fetch(req);
      }
      if (!okOrigin(origin)) return json({ ok: false }, 403);
      if (p[1] === 'room' && req.method === 'POST') return json(await L.putRoom(await body()), 200, cors(origin));
      if (p[1] === 'rooms') return json({ ok: true, list: await L.rooms() }, 200, cors(origin));
      return json({ ok: false }, 404, cors(origin));
    }
    if (p[0] === 'feedback' && req.method === 'POST') {
      if (!okOrigin(origin)) return json({ ok: false }, 403);
      const inbox = env.INBOX.get(env.INBOX.idFromName('main'));
      const r = await inbox.add(await req.text(), req.headers.get('CF-Connecting-IP') || '', req.headers.get('User-Agent') || '');
      return json(r, r.ok ? 200 : 400, cors(origin));
    }
    if (p[0] === 'admin') {
      if (p[1] === 'list' && req.method === 'POST') {
        const { key, del, op, ...d } = await req.json().catch(() => ({}));
        const want = String(env.ADMIN_KEY || '').trim();
        if (!want) return json({ ok: false, msg: 'Máy chủ chưa có ADMIN_KEY – vào Cloudflare → bgvn-rooms → Settings → Variables and Secrets (KHÔNG phải mục Build) để thêm' }, 503);
        if (String(key || '').trim() !== want) return json({ ok: false, msg: 'Sai mật khẩu' }, 401);
        if (op) { // báo cáo, cấm chat, tài khoản
          const L = env.LOBBY.get(env.LOBBY.idFromName('main')), U = env.USERS.get(env.USERS.idFromName('main'));
          if (op === 'users') return json({ ok: true, users: await U.adminFind(d.q) });
          if (op === 'user') return json(await U.adminSet(d.id, d.patch || {}));
          if (op === 'stats') return json({ ok: true, ...(await L.admin('stats')), ...(await U.stats()) });
          return json({ ok: true, ...(await L.admin(op, d)) });
        }
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

const ADMIN_HTML = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Quản trị BGVN</title><meta name="robots" content="noindex">
<style>body{margin:0;font:15px/1.5 system-ui,sans-serif;background:#fff7ee;color:#2a2340}main{max-width:820px;margin:0 auto;padding:16px}h1{font-size:22px;margin:4px 0 10px}
input,button,select{font:inherit;padding:9px 12px;border-radius:10px;border:1.5px solid #e2d4c4}button{background:#2a2340;color:#fff;border:0;cursor:pointer}button.sm{padding:4px 10px;font-size:13px}button.red{background:#e0384a}button.gray{background:#8a7f96}
.tabs{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0}.tabs button{background:#fff;color:#2a2340;border:1.5px solid #e2d4c4}.tabs button.on{background:#2a2340;color:#fff}
.it{background:#fff;border-radius:14px;padding:12px 14px;margin:10px 0;box-shadow:0 2px 8px #0001}.meta{font-size:12.5px;color:#7a6f88;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.tag{padding:2px 8px;border-radius:999px;background:#eee;font-weight:700}.bug{background:#ffd9dc}.idea{background:#dff5e6}.msg{white-space:pre-wrap;margin:6px 0}.acts{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}.r{margin-left:auto}
#stats{font-size:13px;color:#7a6f88}</style></head>
<body><main><h1>🛠️ Quản trị BGVN</h1>
<form id="f"><input id="k" type="password" placeholder="Mật khẩu quản trị" autocomplete="current-password" autocapitalize="off" autocorrect="off" spellcheck="false"> <label style="font-size:13px"><input type="checkbox" onchange="k.type=this.checked?'text':'password'"> hiện</label> <button>Vào</button></form>
<p id="st"></p><div id="stats"></div>
<div class="tabs" id="tabs" hidden><button data-t="fb" class="on">💌 Góp ý</button><button data-t="rp">🚩 Báo cáo chat</button><button data-t="bn">⛔ Đang cấm</button><button data-t="us">👤 Tài khoản</button></div>
<div id="l"></div></main>
<script>
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const T={bug:'🐞 Lỗi',idea:'💡 Góp ý',other:'💬 Khác'};let tab='fb',D={};
const dt=t=>new Date(t).toLocaleString('vi-VN');
async function api(body){const r=await fetch('/admin/list',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key:$('#k').value,...body})});return r.json()}
async function load(extra){
  const d=await api(extra||{}); if(!d.ok&&d.ok!==undefined&&!d.items&&!d.reports){$('#st').textContent=d.msg||'Lỗi';return}
  try{sessionStorage.k=$('#k').value}catch(e){} $('#st').textContent='';$('#tabs').hidden=false;
  if(tab==='fb'){D=d;$('#l').innerHTML=(d.items||[]).map(i=>'<div class="it"><div class="meta"><span class="tag '+i.t+'">'+T[i.t]+'</span><b>'+esc(i.game||'chung')+'</b><span>'+dt(i.ts)+'</span>'+(i.contact?'<span>📮 '+esc(i.contact)+'</span>':'')+'<button class="sm red r" data-del="'+i.id+'">Xoá</button></div><div class="msg">'+esc(i.msg)+'</div><div class="meta">'+esc(i.page)+' · '+esc(i.ua)+'</div></div>').join('')||'<p>Chưa có góp ý.</p>'}
  if(tab==='rp'){$('#l').innerHTML=(d.reports||[]).map(r=>'<div class="it"><div class="meta"><b>'+esc(r.tname)+'</b><span>'+esc(r.target)+'</span><span>'+dt(r.ts)+'</span><span class="r">báo bởi '+esc(r.rname)+'</span></div><div class="msg">“'+esc(r.text)+'”'+(r.reason?'\\n<i>Lý do: '+esc(r.reason)+'</i>':'')+'</div><div class="acts"><button class="sm" data-op="hide" data-msg="'+r.msg+'">Ẩn tin</button><button class="sm red" data-ban="'+esc(r.target)+'" data-h="24">Cấm chat 24h</button><button class="sm red" data-ban="'+esc(r.target)+'" data-h="168">Cấm 7 ngày</button><button class="sm red" data-ban="'+esc(r.target)+'" data-h="87600">Cấm vĩnh viễn</button><button class="sm gray" data-op="dismiss" data-id="'+r.id+'">Bỏ qua</button></div></div>').join('')||'<p>Không có báo cáo nào 🎉</p>'}
  if(tab==='bn'){$('#l').innerHTML=(d.bans||[]).map(b=>'<div class="it"><div class="meta"><b>'+esc(b.who)+'</b><span>đến '+dt(b.until)+'</span><span>'+esc(b.reason)+'</span><button class="sm r" data-unban="'+esc(b.who)+'">Gỡ cấm</button></div></div>').join('')||'<p>Không ai bị cấm.</p>'}
  if(tab==='us'){$('#l').innerHTML='<form id="uf"><input id="uq" placeholder="Tìm tên đăng nhập / tên / id"> <button>Tìm</button></form>'+((d.users||[]).map(u=>'<div class="it"><div class="meta"><b>'+esc(u.name)+'</b><span>@'+esc(u.username||'(Google)')+'</span><span>id '+u.id+'</span><span>'+dt(u.created)+'</span>'+(u.banned?'<span class="tag bug">bị khoá</span>':'')+'<span class="r"></span><button class="sm '+(u.banned?'':'red')+'" data-ub="'+u.id+'" data-v="'+(u.banned?0:1)+'">'+(u.banned?'Mở khoá':'Khoá tài khoản')+'</button>'+(u.username?'<button class="sm gray" data-pw="'+u.id+'">Đặt lại mật khẩu</button>':'')+'</div></div>').join(''));
    $('#uf').onsubmit=e=>{e.preventDefault();load({op:'users',q:$('#uq').value})}}
}
async function stats(){const s=await api({op:'stats'});if(s.ok)$('#stats').textContent='👥 Đang ở sảnh: '+s.online+' · 🚪 Phòng công khai: '+s.rooms+' · 🧑 Tài khoản: '+s.users}
function go(t){tab=t;document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===t));load(t==='fb'?{}:t==='us'?{op:'users',q:''}:{op:'reports'})}
$('#f').onsubmit=e=>{e.preventDefault();go(tab);stats()};
$('#tabs').onclick=e=>{const b=e.target.closest('button');if(b)go(b.dataset.t)};
$('#l').onclick=async e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.del&&confirm('Xoá góp ý này?'))return load({del:b.dataset.del});
  if(b.dataset.op){await api({op:b.dataset.op,msg:b.dataset.msg,id:b.dataset.id});return go(tab)}
  if(b.dataset.ban){const reason=prompt('Lý do cấm (tuỳ chọn):')??'';await api({op:'ban',who:b.dataset.ban,hours:+b.dataset.h,reason});return go(tab)}
  if(b.dataset.unban){await api({op:'unban',who:b.dataset.unban});return go(tab)}
  if(b.dataset.ub){if(!confirm('Chắc chưa?'))return;await api({op:'user',id:b.dataset.ub,patch:{banned:b.dataset.v==='1'}});return load({op:'users',q:$('#uq').value})}
  if(b.dataset.pw){const pw=prompt('Mật khẩu mới cho tài khoản này (≥ 6 ký tự):');if(pw&&pw.length>=6){await api({op:'user',id:b.dataset.pw,patch:{password:pw}});alert('Đã đặt lại – nhắn người đó mật khẩu mới.')}}
};
try{if(sessionStorage.k){$('#k').value=sessionStorage.k;go('fb');stats()}}catch(e){}
</script></body></html>`;
