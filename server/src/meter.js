// 📊 Ước tính hạn mức Cloudflare (gói Free: 13.000 GB-s + 100.000 request Durable Object mỗi ngày, làm mới 0h UTC = 7h sáng VN).
// Durable Object bị tính giờ khi đang "thức" (128 MB = 0,125 GB). Sau tin cuối ~10 giây thì nó ngủ (hibernation) → không tính.
// Tin WebSocket gửi lên: 20 tin = 1 request. Đây là số ƯỚC TÍNH tự đo – số chính xác xem ở trang Cloudflare.
export const IDLE = 10000, GB = 0.125;
export const LIMITS = {
  free: { gbs: 13000, req: 100000, per: 'day' },
  paid: { gbs: 400000, req: 1000000, per: 'month' },
};
export class Meter {
  constructor(flush) { this.flush = flush; this.seg = null; this.ms = 0; this.req = 0; this.msg = 0; this.lastFlush = Date.now(); }
  // kind: 'req' (kết nối / gọi RPC) | 'msg' (tin WebSocket gửi lên)
  async tick(kind = 'req') {
    const t = Date.now();
    if (!this.seg || t - this.seg.last > IDLE) { if (this.seg) this.ms += this.seg.last - this.seg.from + IDLE; this.seg = { from: t, last: t }; }
    else this.seg.last = t;
    if (kind === 'msg') this.msg++; else this.req++;
    if (t - this.lastFlush > 60000) await this.out(t);
  }
  async out(t = Date.now(), tail = 0) { // gửi số đã đo; tail = cộng thêm thời gian chờ ngủ (khi phòng sắp vắng)
    if (this.seg) { this.ms += t - this.seg.from + tail; this.seg = tail ? null : { from: t, last: this.seg.last }; }
    const ms = this.ms, req = this.req + Math.floor(this.msg / 20);
    this.msg %= 20; this.ms = 0; this.req = 0; this.lastFlush = t;
    if (ms > 0 || req > 0) try { await this.flush(ms, req); } catch (e) {}
  }
}
