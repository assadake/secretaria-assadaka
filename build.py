#!/usr/bin/env python3
"""يبني ملف HTML واحد قائم بذاته من ملفات مجلد src/"""
import re, pathlib, sys

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / 'src'
parts = {
    'font': SRC / 'cairo_embedded.css',
    'style': SRC / 'style.css',
    'assets': SRC / 'assets.js',
    'templates': SRC / 'templates.js',
    'app': SRC / 'app.js',
}

html = (SRC / 'index.html').read_text(encoding='utf-8')
for key, path in parts.items():
    content = path.read_text(encoding='utf-8')
    if key in ('assets', 'templates', 'app'):
        content = content.replace('</script', '<\\/script')
    html = html.replace(f'/*@@INCLUDE:{key}@@*/', content)

# الملف الرئيسي + نسخة index.html ليُفتح التطبيق مباشرة من جذر الخادم
outs = [ROOT / 'secretariat.html', ROOT / 'index.html']
for out in outs:
    out.write_text(html, encoding='utf-8')
print(' + '.join(str(o) for o in outs) + f' — {len(html)/1024:.0f} Ko')
