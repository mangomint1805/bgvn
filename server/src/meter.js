// 📊 Ước tính hạn mức Cloudflare (gói Free: 13.000 GB-s + 100.000 request Durable Object mỗi ngày, làm mới 0h UTC = 7h sáng VN).
// Durable Object dùng WebSocket ngủ đông chỉ bị tính giờ trong lúc đang XỬ LÝ sự kiện (128 MB = 0,125 GB) – xử lý xong là hết tính,
// không phải chờ ~10 giây như bản đo cũ (bản cũ đếm dư khoảng 10 lần). Đối chiếu số thật trên Cloudflare: trung bình ~50 ms / sự kiện.
// Tin WebSocket gửi lên: 20 tin = 1 request. Đây là số ƯỚC TÍNH tự đo – số chính xác xem ở trang Cloudflare.
export const PER_EVENT = 50, GB = 0.125;
export const LIMITS = {
  free: { gbs: 13000, req: 100000, per: 'day' },
  paid: { gbs: 400000, req: 1000000, per: 'month' },
};
export class Meter {
  constructor(flush) { this.flush = flush; this.ms = 0; this.req = 0; this.msg = 0; this.lastFlush = Date.now(); }
  // kind: 'req' (kết nối / gọi RPC) | 'msg' (tin WebSocket gửi lên)
  async tick(kind = 'req') {
    const t = Date.now();
    this.ms += PER_EVENT;
    if (kind === 'msg') this.msg++; else this.req++;
    if (t - this.lastFlush > 60000) await this.out(t);
  }
  async out(t = Date.now()) { // gửi số đã đo
    const ms = this.ms, req = this.req + Math.floor(this.msg / 20);
    this.msg %= 20; this.ms = 0; this.req = 0; this.lastFlush = t;
    if (ms > 0 || req > 0) try { await this.flush(ms, req); } catch (e) {}
  }
}
