#!/usr/bin/env python3
"""Пересобрать index.html из текстов в source/content: python3 source/build_site.py"""
import os, subprocess, sys
BASE = os.path.dirname(os.path.abspath(__file__))
subprocess.run([sys.executable, os.path.join(BASE, 'gen.py')], check=True)
data = open(os.path.join(BASE, 'data.json'), encoding='utf-8').read().replace('</', '<\\/')
tpl = open(os.path.join(BASE, 'template.html'), encoding='utf-8').read()
head = ('<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" '
        'content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}'
        'body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style></head><body>')
out = os.path.join(BASE, '..', 'index.html')
open(out, 'w', encoding='utf-8').write(head + tpl.replace('/*DATA*/', data) + '</body></html>')
print('Готово:', os.path.abspath(out))
