#!/usr/bin/env python3
"""Ставит одну и ту же метку версии на все файлы демо: index.html, все import и имя кэша service worker.
Зачем: браузер (и GitHub Pages, max-age=600) может держать старые файлы. Если новая версия экрана
встретится со старым store.js, демо не загрузится. Одна метка на всех — файлы обновляются только вместе.
Запуск: python3 demo/set_version.py            — метка по текущему времени
        python3 demo/set_version.py 20260920a  — своя метка"""
import os, re, sys
from datetime import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
VER = sys.argv[1] if len(sys.argv) > 1 else datetime.now().strftime("%Y%m%d%H%M")


def sub(path, pattern, repl):
    s = open(path, encoding="utf-8").read()
    t = re.sub(pattern, repl, s)
    if t != s:
        open(path, "w", encoding="utf-8").write(t)


# все относительные import в модулях: from './x.js' или from './x.js?v=...' -> from './x.js?v=VER'
for d, _, files in os.walk(os.path.join(HERE, "js")):
    for f in files:
        if f.endswith(".js"):
            sub(os.path.join(d, f), r"""(from\s+['"])(\.{1,2}/[^'"?]+\.js)(\?v=[^'"]*)?(['"])""", rf"\g<1>\g<2>?v={VER}\g<4>")

# точки входа в index.html
sub(os.path.join(HERE, "index.html"), r'((?:href|src)="(?:css|js)/[^"?]+\.(?:css|js))(\?v=[^"]*)?"', rf'\g<1>?v={VER}"')
# имя кэша service worker: новая версия — новый кэш
sub(os.path.join(HERE, "sw.js"), r"const C = 'alim-crm-[^']*';", f"const C = 'alim-crm-{VER}';")
print("версия демо:", VER)
