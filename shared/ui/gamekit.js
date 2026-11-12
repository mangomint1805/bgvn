// 🧰 Bộ khung giao diện cho game nhỏ: màn hình đầu / phòng chờ / ván chơi + tạo phòng, vào phòng, link mời, vào lại sau khi tải trang.
// Dùng với shared/net/simplenet.js và các id chuẩn trong index.html (xem cotuong/index.html làm mẫu):
//   #screen-home #screen-lobby #screen-game · #name #btn-create #join-code #btn-join #btn-offline
//   #room-code #code-box #btn-copy #btn-leave-lobby #btn-leave · #modal #modal-box #toast
// const ui = gameKit({ game, net, onLobby(info, ui), onState(view, prev, ui), offline(net) })
import { linkCode, clearLinkCode, inviteUrl, joinByLink } from '../net/joinlink.js?v=2';
import { netStatus } from './status.js';
import { confirmBox } from './dialog.js?v=1';
export const $ = s => document.querySelector(s);
export const $$ = s => [...document.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
const AV = ['#ff4d6d', '#ff9f1c', '#e0a800', '#12a66a', '#14a3a0', '#4d8dff', '#7b5cff', '#d94dff', '#ff2d87', '#5b6b8a'];
export const cleanName = n => String(n || '').replace(' 🤖', '').trim();
export const avatar = (name, size = 36) => { let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return `<span class="gk-av" style="width:${size}px;height:${size}px;font-size:${Math.round(size * .46)}px;background:${AV[h % AV.length]}">${esc([...cleanName(name)][0] || '?').toUpperCase()}</span>`; };

export function gameKit({ game, net: N, onLobby, onState, offline }) {
  const { Host, Client, loadSnapshot, session } = N;
  const ui = { net: null, isHost: false, myId: null, lobby: null, view: null, code: '' };
  ui.show = id => $$('.screen').forEach(s => s.classList.toggle('active', s.id === id));
  let toastT; ui.toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); };
  ui.openModal = (html, cls = '') => { $('#modal-box').className = 'modal-box ' + cls; $('#modal-box').innerHTML = html; $('#modal').classList.add('open'); };
  ui.closeModal = () => $('#modal').classList.remove('open');
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal' && !$('#modal-box').classList.contains('lock')) ui.closeModal(); });
  ui.act = a => ui.net && ui.net.act(ui.myId, a); // hành động của chính mình
  ui.actAs = (id, a) => { if (!ui.net) return; if (ui.isHost) ui.net.actAs(id, a); else if (id === ui.myId) ui.net.act(id, a); };
  ui.controls = id => !!ui.net && (ui.isHost ? ui.net.controls(id) : id === ui.myId);
  const myName = () => { const n = $('#name').value.trim() || 'Bạn'; ls.set('bgvn-name', n); return n; };
  $('#name').value = ls.get('bgvn-name') || '';

  const handlers = {
    onLobby(info, code, started) { if (ui.gone) return; /* tin tới trễ sau khi đã rời phòng */ if (!ui.net) { queueMicrotask(() => ui.net && handlers.onLobby(info, code, started)); return; } /* Host báo phòng ngay trong lúc khởi tạo, trước khi ui.net được gán */ ui.lobby = info; ui.code = code; $('#room-code').textContent = code; if (!started) { ui.view = null; if (!$('#screen-lobby').classList.contains('active')) ui.show('screen-lobby'); } onLobby && onLobby(info, ui, started); },
    onState(v) {
      if (ui.gone) return;
      if (!ui.net) { queueMicrotask(() => ui.net && handlers.onState(v)); return; }
      if (!v) { ui.view = null; ui.closeModal(); ui.show('screen-lobby'); onLobby && ui.lobby && onLobby(ui.lobby, ui, false); onState && onState(null, null, ui); return; }
      const prev = ui.view; ui.view = v; if (!$('#screen-game').classList.contains('active')) ui.show('screen-game');
      onState && onState(v, prev, ui);
    },
    onError(m) { ui.toast(m); }, onJoined(id) { ui.myId = id; }, onDisconnect() {}, onKicked() { ui.leave(); },
    onNet(t, k, retry) { netStatus(t, k, retry); },
  };
  // Host bọc lại để giao diện gọi thống nhất: net.act(id, a)
  const wrapHost = h => { h.actRaw = h.act; return h; };
  function startHost(off, skipSetup = false) {
    if (ui.net) ui.net.leave();
    ui.gone = false;
    const h = new Host(myName(), handlers, off); ui.net = { act: (id, a) => h.act(id, a), actAs: (id, a) => h.actAs(id, a), controls: id => h.controls(id), leave: () => h.leave(), raw: h };
    ui.isHost = true; ui.myId = 'host'; wrapHost(h);
    if (off) { session.save(game, { role: 'host', code: 'OFFLINE' }); if (!skipSetup) offline && offline(h); }
    $('#code-box').style.display = off ? 'none' : ''; ui.show('screen-lobby'); return h;
  }
  ui.startHost = startHost; // game tự mở phòng (vd. chế độ luyện tập) – trả về Host
  function startClient(code, name) {
    if (ui.net) ui.net.leave();
    ui.gone = false;
    const c = new Client(code, name, handlers); ui.net = { act: (id, a) => c.act(a), actAs: (id, a) => c.actAs(id, a), controls: id => c.controls(id), leave: () => c.leave(), raw: c };
    ui.isHost = false; $('#code-box').style.display = '';
  }
  $('#btn-create').onclick = () => startHost(false);
  if ($('#btn-offline')) $('#btn-offline').onclick = () => startHost(true);
  $('#btn-join').onclick = () => { const code = $('#join-code').value.trim(); if (code.length < 5) { ui.toast('Nhập mã phòng 5 ký tự nhé.'); return; } startClient(code, myName()); ui.toast('Đang kết nối…'); };
  $('#join-code').addEventListener('keydown', e => { if (e.key === 'Enter') $('#btn-join').click(); });
  ui.leave = () => { ui.gone = true; if (ui.net) ui.net.leave(); ui.net = null; ui.view = null; ui.lobby = null; ui.closeModal(); ui.show('screen-home'); onState && onState(null, null, ui); };
  $('#btn-leave-lobby').onclick = ui.leave;
  if ($('#btn-leave')) $('#btn-leave').onclick = async () => {
    const r = await confirmBox(ui.isHost ? 'Bạn là chủ phòng: rời đi là cả phòng giải tán.' : 'Bạn có thể vào lại bằng mã phòng.', { title: 'Rời ván?', ok: 'Rời ván', cancel: 'Ở lại', danger: true });
    if (r) ui.leave();
  };
  $('#btn-copy').onclick = () => { const url = inviteUrl($('#room-code').textContent); navigator.clipboard?.writeText(url).then(() => ui.toast('Đã chép link mời 📋'), () => ui.toast(url)); };
  const qcode = linkCode(); if (qcode) $('#join-code').value = qcode;
  const linkJoin = code => { $('#join-code').value = code; joinByLink({ code, toast: m => ui.toast(m), join: n => { $('#name').value = n; $('#btn-join').click(); }, abort: () => ui.leave() }); };
  // tải lại trang: khôi phục phòng / vào lại
  (function resume() {
    const snap = loadSnapshot(), ses = session.load(game), lk = linkCode();
    if (lk && !(ses && ses.code === lk)) { linkJoin(lk); return; }
    if (lk) clearLinkCode();
    if (snap && ses && ses.role === 'host') {
      const h = new Host((snap.players.find(p => p.id === 'host') || {}).name || myName(), handlers, !!snap.offline, snap);
      ui.net = { act: (id, a) => h.act(id, a), actAs: (id, a) => h.actAs(id, a), controls: id => h.controls(id), leave: () => h.leave(), raw: h }; ui.isHost = true; ui.myId = 'host';
      $('#code-box').style.display = snap.offline ? 'none' : ''; ui.show('screen-lobby'); netStatus('Đã khôi phục phòng ' + (snap.offline ? 'chơi trên máy này' : snap.code), 'ok'); return;
    }
    if (ses && ses.role === 'client' && ses.code) startClient(ses.code, ses.name || myName());
  })();
  return ui;
}
