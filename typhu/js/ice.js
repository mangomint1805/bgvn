// Cấu hình kết nối P2P: nhiều STUN (tìm địa chỉ công khai).
// TURN (chuyển tiếp khi 2 mạng chặn P2P, hay gặp ở 4G): điền vào TURN bên dưới nếu có tài khoản TURN miễn phí
// (vd. Metered / ExpressTURN), dạng { urls: ['turn:host:80', 'turns:host:443?transport=tcp'], username: '...', credential: '...' }.
const TURN = null;

let cache = null;
export async function peerOptions() {
  if (!cache) {
    const ice = [
      { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun.cloudflare.com:3478', 'stun:global.stun.twilio.com:3478'] },
    ];
    if (TURN) ice.push(TURN);
    cache = { debug: 1, config: { iceServers: ice } };
  }
  return cache;
}

// Giữ kết nối tới máy chủ mai mối PeerJS: điện thoại chuyển app (gửi mã qua Zalo/Messenger) hay làm rớt kết nối,
// khi đó người khác không tìm thấy phòng. Tự nối lại khi rớt hoặc khi quay lại tab.
export function keepAlive(getPeer) {
  const fix = () => { const p = getPeer(); if (p && !p.destroyed && p.disconnected) { try { p.reconnect(); } catch (e) {} } };
  const t = setInterval(fix, 4000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) fix(); });
  addEventListener('online', fix);
  return () => clearInterval(t);
}
