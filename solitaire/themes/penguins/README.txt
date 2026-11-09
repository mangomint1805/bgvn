Theme "🐧 Cánh cụt" – Xếp bài cổ điển (BGVN)
=============================================

Bộ bài trong thư mục cards/ là tác phẩm của người khác (qua dự án KDE), KHÔNG phải do BGVN vẽ.
The card deck in cards/ is third-party artwork (via the KDE project); it was NOT drawn by BGVN.

1) Bộ bài / Card deck "Penguins"  ->  cards/*.svg
   - Tác giả / Authors (theo COPYRIGHT-penguins-deck.txt, giữ nguyên):
       Bản SVG / vector deck: Copyright 2009 Matthew Woehlke <mw_triad@users.sourceforge.net>
         (đưa vào KDE bởi Parker Coates, 2009), với một phần của bộ "Paris" (SVG: Richard Hoelscher).
       Bộ raster gốc: Ace of Penguins 1.0 – Copyright 1998 DJ Delorie, Markus F.X.J. Oberhumer.
       Original Tux artwork created by Larry Ewing, Simon Budig and Anja Gerwinski.
   - Nguồn / Source: KDE libkdegames, src/carddecks/svg-penguins/penguins.svg
       https://invent.kde.org/games/libkdegames/-/tree/master/src/carddecks/svg-penguins
       (mirror: https://github.com/KDE/libkdegames/tree/master/src/carddecks/svg-penguins)
       commit bcff4e3f8803cc2dfd0a545d1ba50e8c8471f22c
   - Giấy phép / License: GNU GPL version 3 or later (GPL-3.0-or-later) – xem LICENSE-GPL-3.0-or-later.txt.
     Ghi chú bắt buộc theo mục 7(b) GPL3 / Required notice under GPL3 section 7(b):
       "Original Tux artwork created by Larry Ewing, Simon Budig and Anja Gerwinski."
   - COPYRIGHT-penguins-deck.txt, kde-carddeck-index.desktop: file gốc của bộ bài, giữ nguyên.

2) Nền bàn "băng tuyết" (gradient + bông tuyết trong css/sol.css): BGVN tự vẽ.

Những gì BGVN đã thay đổi / Modifications made by BGVN (2026-11-10):
   - Tách file SVG gốc thành 53 file riêng (52 mặt + 1 lưng), mỗi file chỉ chứa phần tử của lá đó
     cùng các gradient/defs nó dùng; viewBox cắt đúng khung lá. Không vẽ lại, không chỉnh hình.
   - Nén bằng svgo 4.0.0 (1 lượt, làm tròn 2 chữ số thập phân) – sai khác điểm ảnh < 0,1%.
   - Khi lá bài hiển thị nhỏ (điện thoại), game phủ thêm một nhãn chỉ số (vd. "10♥") ở góc trên
     để dễ đọc; file SVG không bị sửa.
   - Split the original SVG into one file per card (no redrawing), optimized with svgo; on small
     screens the game overlays its own rank/suit label for readability.

Mã nguồn gốc đầy đủ có tại URL ở trên. Full source of the original is at the URL above.
