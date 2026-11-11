#!/usr/bin/env python3
# Tăng ?v= cho mọi file đã đổi so với nhánh gốc và lan lên cả chuỗi import.  Dùng: python3 tools/bump.py [nhánh-gốc=main]
import re, subprocess, sys, os
base = sys.argv[1] if len(sys.argv) > 1 else 'main'
run = lambda *a: subprocess.run(a, capture_output=True, text=True).stdout.split('\n')
changed = [f for f in run('git', 'diff', '--name-only', base) if f]
new = set(f for f in run('git', 'diff', '--name-only', '--diff-filter=A', base) + run('git', 'ls-files', '-o', '--exclude-standard') if f)
files = [f for f in run('git', 'ls-files', '-co', '--exclude-standard') if f.endswith(('.js', '.html', '.css', '.mjs')) and not f.startswith(('server/', 'tools/')) and os.path.exists(f)]
done, queue, n = set(), [f for f in changed if f not in new and os.path.exists(f)], 0
while queue:
    F = queue.pop(0); bn = re.escape(os.path.basename(F))
    for imp in files:
        if (imp, F) in done or imp == F: continue
        s = open(imp).read(); hit = False
        def rep(m):
            global hit
            ref = m.group(1)
            path = os.path.normpath(ref.lstrip('/') if ref.startswith('/') else os.path.join(os.path.dirname(imp), ref))
            if path != F: return m.group(0)
            hit = True; return f'{ref}?v={int(m.group(2)) + 1}'
        s2 = re.sub(r'([\w./-]*' + bn + r')\?v=(\d+)', rep, s)
        if hit:
            open(imp, 'w').write(s2); done.add((imp, F)); n += 1
            if imp not in new and imp not in changed and imp not in queue: queue.append(imp)
            if imp not in changed: changed.append(imp)
print('đã tăng', n, 'chỗ ?v')
