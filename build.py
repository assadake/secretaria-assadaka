#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""يبني ملف HTML واحد قائم بذاته من ملفات مجلد src/

الاستعمال:
  python build.py            # يعيد بناء secretariat.html و index.html فقط
  python build.py --check    # يفشل (exit 1) إذا لم تكن النسخ مبنيّة من src/ الحالية (للتكامل المستمر)
  python build.py --zip      # يعيد بناء secretariat_pc.zip بمحتوى نظيف (بدون بيانات/نسخ احتياطية)
"""
import re, sys, pathlib, zipfile, os

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / 'src'
parts = {
    'font': SRC / 'cairo_embedded.css',
    'style': SRC / 'style.css',
    'assets': SRC / 'assets.js',
    'templates': SRC / 'templates.js',
    'credits': SRC / 'credits.js',
    'group': SRC / 'group.js',
    'app': SRC / 'app.js',
}


def build_html():
    html = (SRC / 'index.html').read_text(encoding='utf-8')
    for key, path in parts.items():
        content = path.read_text(encoding='utf-8')
        if key in ('assets', 'templates', 'credits', 'group', 'app'):
            content = content.replace('</script', '<\\/script')
        html = html.replace(f'/*@@INCLUDE:{key}@@*/', content)
    return html


def cmd_build():
    html = build_html()
    outs = [ROOT / 'secretariat.html', ROOT / 'index.html']
    for out in outs:
        out.write_text(html, encoding='utf-8')
    print(' + '.join(str(o) for o in outs) + f' — {len(html)/1024:.0f} Ko')


def cmd_check():
    html = build_html()
    stale = [name for name in ('secretariat.html', 'index.html')
             if not (ROOT / name).exists() or (ROOT / name).read_text(encoding='utf-8') != html]
    if stale:
        print('[!] الملفات التالية ليست مبنيّة من src/ الحالية: ' + ', '.join(stale))
        print('    شغّل: python build.py')
        return 1
    print('[i] index.html و secretariat.html متطابقتان مع src/')
    return 0


# ملفات التوزيع المطلوبة (كل ما يحتاجه مكتب السكرتارية، بلا بيانات حيّة)
ZIP_INCLUDE_FILES = [
    'secretariat.html', 'index.html', 'server.py', 'config.json', 'requirements.txt',
    'build.py', 'demarrer_serveur.bat', 'lancer_application.bat', 'render.yaml',
    '.env.example', '.gitignore',
    'ARCHIVE_PARTAGEE.md', 'GITHUB_DEPLOIEMENT.md', 'INSTALLATION_ET_UTILISATION.md',
    'MISE_A_JOUR.md', 'MISE_A_JOUR_FACILE.md', 'OUVRIR_SUR_PC.md', 'PAS_A_PAS_MISE_A_JOUR.md',
    'README_دليل_الاستخدام.md', 'RENDER_DEPLOIEMENT.md', 'SUPABASE_DEPLOIEMENT.md',
    'AUDIT_ET_AMELIORATIONS.md',
    'exemples_lettres.pdf', 'دليل_سريع_للسكرتارية.pdf', 'version.json',
]
ZIP_INCLUDE_DIRS = ['src', 'supabase']
# لا تُضمّن أبداً: نسخ احتياطية أو قاعدة بيانات حيّة أو أسرار
ZIP_EXCLUDE_DIRS = {'data', 'backups', '.git', '__pycache__', ' Unselected files'.strip()}
ZIP_EXCLUDE_EXT = ('.db', '.db-wal', '.db-shm', '.env', '.zip', '.pyc')


def cmd_zip():
    cmd_build()
    dst = ROOT / 'secretariat_pc.zip'
    if dst.exists():
        dst.unlink()
    count = 0
    with zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for name in ZIP_INCLUDE_FILES:
            fpath = ROOT / name
            if fpath.is_file():
                zf.write(fpath, name)
                count += 1
        for d in ZIP_INCLUDE_DIRS:
            dpath = ROOT / d
            for root, dirs, files in os.walk(dpath):
                dirs[:] = [x for x in dirs if x not in ZIP_EXCLUDE_DIRS and not x.startswith('.')]
                for fn in files:
                    if fn.lower().endswith(ZIP_EXCLUDE_EXT) or fn.startswith('.'):
                        continue
                    full = os.path.join(root, fn)
                    zf.write(full, os.path.relpath(full, ROOT))
                    count += 1
    print(f'{dst} — {count} ملف — {dst.stat().st_size/1024/1024:.1f} Mo')


def main():
    args = sys.argv[1:]
    if '--check' in args:
        return cmd_check()
    if '--zip' in args:
        cmd_zip()
        return 0
    cmd_build()
    return 0


if __name__ == '__main__':
    sys.exit(main())
