// Cấu hình kết nối P2P: nhiều STUN + TURN miễn phí (Open Relay của Metered, xác thực kiểu coturn static-auth).
// TURN giúp 2 máy khác mạng (4G, wifi công ty/trường…) vẫn nối được khi kết nối trực tiếp bị chặn.
const TURN_HOST = 'staticauth.openrelay.metered.ca';
const TURN_SECRET = 'openrelayprojectsecret';

async function turnCreds() {
  const user = Math.floor(Date.now() / 1000) + 24 * 3600 + ':bgvn';
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(TURN_SECRET), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(user));
  return { username: user, credential: btoa(String.fromCharCode(...new Uint8Array(sig))) };
}

let cache = null;
export async function peerOptions() {
  if (!cache) {
    const ice = [
      { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] },
    ];
    try {
      const c = await turnCreds();
      ice.push({ urls: [`turn:${TURN_HOST}:80`, `turn:${TURN_HOST}:80?transport=tcp`, `turn:${TURN_HOST}:443`, `turns:${TURN_HOST}:443?transport=tcp`], ...c });
    } catch (e) { /* không có WebCrypto thì chỉ dùng STUN */ }
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
