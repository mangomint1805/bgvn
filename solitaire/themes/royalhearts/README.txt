Theme "👑 Tim hồng" – Xếp bài cổ điển (BGVN)
=============================================

Toàn bộ hình trong thư mục này là tác phẩm của dự án KDE, KHÔNG phải do BGVN vẽ.
All artwork in this folder comes from the KDE project; it was NOT drawn by BGVN.

1) Bộ bài / Card deck "Jolly Royal"  ->  cards/*.svg
   - Tác giả / Author: Sean Wilson <suseux@gmail.com> (KDE, 2008) – theo lịch sử git của libkdegames
     (commit 82d1132 "Added new directory and proper name for new default card deck").
   - Nguồn / Source: KDE libkdegames, src/carddecks/svg-jolly-royal/jolly-royal.svg
       https://invent.kde.org/games/libkdegames/-/tree/master/src/carddecks/svg-jolly-royal
       (mirror: https://github.com/KDE/libkdegames/tree/master/src/carddecks/svg-jolly-royal)
       commit bcff4e3f8803cc2dfd0a545d1ba50e8c8471f22c
   - Giấy phép / License: GNU LGPL version 2.0 (LGPL-2.0-only) – xem LICENSE-LGPL-2.0-only.txt.
     Bộ bài không có ghi chú giấy phép riêng; nó thuộc libkdegames, và file copyright của Debian
     (https://metadata.ftp-master.debian.org/changelogs/main/libk/libkdegames/stable_copyright)
     xếp nó vào mục "Files: *  License: LGPL-2.0-only".
   - kde-carddeck-index.desktop: file mô tả gốc của bộ bài, giữ nguyên.

2) Nền bàn + ô trống / Table background + empty piles ("Royal Hearts")
     -> table.svg, pile.svg, pile-hot.svg
   - Tác giả / Authors: Sean Wilson <suseux@gmail.com> & Eugene Trounev <eugene.trounev@gmail.com>
     (theo kpat-theme-royalhearts.desktop, giữ nguyên).
   - Nguồn / Source: KDE KPatience (kpat), themes/royalhearts.svg
       https://invent.kde.org/games/kpat/-/tree/master/themes
       (mirror: https://github.com/KDE/kpat/tree/master/themes)
       commit 40facef8985c909674dc417c757bfc3e2181ebd3
   - Giấy phép / License: GNU GPL version 2 or later (GPL-2.0-or-later) – xem LICENSE-GPL-2.0-or-later.txt.
     (KPatience: "Files: *  License: GPL-2+" theo https://metadata.ftp-master.debian.org/changelogs/main/k/kpat/stable_copyright)

Những gì BGVN đã thay đổi / Modifications made by BGVN (2026-11-10):
   - Tách file SVG gốc thành 53 file riêng (52 mặt + 1 lưng), mỗi file chỉ chứa phần tử của lá đó
     cùng các gradient/defs nó dùng; viewBox cắt đúng khung lá. Không vẽ lại, không chỉnh hình.
   - table.svg / pile.svg / pile-hot.svg là phần tử #background / #pile / #pile_selected của theme,
     tách riêng như trên; table.svg đổi preserveAspectRatio thành "xMaxYMax slice" để phủ kín bàn.
   - Nén bằng svgo 4.0.0 (1 lượt, làm tròn 2 chữ số thập phân) – sai khác điểm ảnh < 0,1%.
   - Khi lá bài hiển thị nhỏ (điện thoại), game phủ thêm nhãn chỉ số (vd. "10♥") ở góc trên để dễ đọc.
   - Split the original SVGs into one file per element (no redrawing), optimized with svgo.

Mã nguồn gốc đầy đủ có tại các URL ở trên. Full source of the originals is at the URLs above.
