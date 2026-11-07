import re, glob, json, html, sys, os
BASE = os.path.dirname(os.path.abspath(__file__))
CONTENT = os.path.join(BASE, 'content')

def inline(t):
    t = html.escape(t, quote=False)
    t = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', t)
    t = re.sub(r'(?<![\w*])\*([^*]+)\*(?!\w)', r'<em>\1</em>', t)
    t = re.sub(r'(https?://[^\s<|]+)', r'<a href="\1" target="_blank" rel="noopener">\1</a>', t)
    return t

BOX = {'!': ('imp', 'Важно'), '?': ('tip', 'Совет мастеру'), '%': ('spoil', 'Тайна · только для мастера'), '>': ('quote', None)}

def parse(src):
    sections = []
    cur = None
    lines = src.split('\n')
    i = 0
    h2i = 0
    def emit(x):
        cur['html'].append(x)
    while i < len(lines):
        l = lines[i]
        if not l.strip():
            i += 1; continue
        m = re.match(r'^# (\d+)\. (.*)', l)
        if m:
            cur = {'n': int(m.group(1)), 'title': m.group(2).strip(), 'html': [], 'toc': []}
            sections.append(cur); h2i = 0; i += 1; continue
        if cur is None:
            i += 1; continue
        if l.startswith('## '):
            h2i += 1; aid = 's%d-%d' % (cur['n'], h2i)
            cur['toc'].append((aid, l[3:].strip()))
            emit('<h2 id="%s">%s</h2>' % (aid, inline(l[3:].strip()))); i += 1; continue
        if l.startswith('### '):
            emit('<h3>%s</h3>' % inline(l[4:])); i += 1; continue
        if l.startswith('#### '):
            emit('<h4>%s</h4>' % inline(l[5:])); i += 1; continue
        if l == '---pb':
            i += 1; continue
        bm = re.match(r'^([!?%>]) ', l)
        if bm:
            ch = bm.group(1); kind, label = BOX[ch]; buf = []
            while i < len(lines) and lines[i].startswith(ch + ' '):
                buf.append(lines[i][2:]); i += 1
            parts = []
            for k, b in enumerate(buf):
                lab = label
                mm = re.match(r'^\[([^\]]+)\]\s*(.*)$', b)
                if k == 0 and mm:
                    lab, b = mm.group(1), mm.group(2)
                pre = '<span class="box-label">%s</span> ' % html.escape(lab) if (k == 0 and lab) else ''
                if b.startswith('- '):
                    parts.append('<p class="box-li">%s%s</p>' % (pre, inline(b[2:])))
                else:
                    parts.append('<p>%s%s</p>' % (pre, inline(b)))
            emit('<div class="box %s">%s</div>' % (kind, ''.join(parts)))
            continue
        if l.startswith('|'):
            rows = []
            while i < len(lines) and lines[i].startswith('|'):
                rows.append([c.strip() for c in lines[i].strip().strip('|').split('|')]); i += 1
            th = ''.join('<th>%s</th>' % inline(c) for c in rows[0])
            body = ''.join('<tr>%s</tr>' % ''.join('<td>%s</td>' % '<br>'.join(inline(x) for x in c.split(' // ')) for c in r) for r in rows[1:])
            emit('<div class="tbl"><table><thead><tr>%s</tr></thead><tbody>%s</tbody></table></div>' % (th, body))
            continue
        if re.match(r'^\s*- ', l):
            out = '<ul>'; depth = 0
            while i < len(lines) and re.match(r'^\s*- ', lines[i]):
                mm = re.match(r'^(\s*)- (.*)$', lines[i])
                d = 1 if len(mm.group(1)) >= 2 else 0
                if d > depth: out += '<ul>'
                elif d < depth: out += '</ul>'
                depth = d
                out += '<li>%s</li>' % inline(mm.group(2)); i += 1
            if depth: out += '</ul>'
            emit(out + '</ul>'); continue
        if re.match(r'^\d+\. ', l):
            out = '<ol>'
            while i < len(lines) and re.match(r'^\d+\. ', lines[i]):
                out += '<li>%s</li>' % inline(re.sub(r'^\d+\. ', '', lines[i])); i += 1
            emit(out + '</ol>'); continue
        emit('<p>%s</p>' % inline(l)); i += 1
    return sections

src = '\n'.join(open(f).read() for f in sorted(glob.glob(os.path.join(CONTENT, '*.txt'))))
secs = parse(src)

def group_of(title, state):
    t = title.upper()
    if t.startswith('АКТ '):
        state['g'] = title.split(':')[0].strip().title().replace('Акт ', 'Акт ')
        state['g'] = 'Акт ' + title.split(':')[0].split()[1]
    elif t.startswith('ПЕРСОНАЖИ'):
        state['g'] = 'Герои'
    elif t.startswith('МЕХАНИКИ') or t.startswith('МИНИ-ИГРЫ'):
        state['g'] = 'Механики'
    elif t.startswith('ОРУЖИЕ') or t.startswith('ПРОКАЧКА') or t.startswith('СНАРЯЖЕНИЕ'):
        state['g'] = 'Снаряжение'
    elif t.startswith('МУЗЫКА') or t.startswith('БАНК') or t.startswith('ОТКРЫТЫЕ') or t.startswith('ШПАРГАЛКА'):
        state['g'] = 'Справочник'
    elif t.startswith('ROADMAP'):
        state['g'] = 'Roadmap'
    return state['g']

st = {'g': 'Основы'}
data = []
for s in secs:
    g = group_of(s['title'], st)
    body = ''.join(s['html'])
    plain = re.sub(r'<[^>]+>', ' ', body)
    plain = html.unescape(re.sub(r'\s+', ' ', plain)).strip()
    t = s['title'].lower()
    t = t[0].upper() + t[1:]
    for a, b in [('осирис','Осирис'),('вейл','Вейл'),('ашгрей','Ашгрей'),('гравенхольм','Гравенхольм'),('тесори','Тесори'),('bloodborne','Bloodborne'),('посланц','Посланц'),('мглин','Мглин'),('«терпение»','«Терпение»'),('«ненасытная луна»','«Ненасытная луна»'),('«глотка»','«Глотка»'),('«прогресс»','«Прогресс»'),('шипов','Шипов'),('город-картина','Город-Картина'),('изнанка холста','Изнанка Холста'),('звёздный колодец','Звёздный Колодец'),('король крыс','Король Крыс'),('шпиль мольберта','Шпиль Мольберта')]:
        t = t.replace(a, b)
    t = re.sub(r'акт (v|iv|iii|ii|i)\b', lambda m: 'Акт ' + m.group(1).upper(), t, flags=re.I)
    t = t.replace('Roadmap', 'Roadmap')
    data.append({'id': 's%d' % s['n'], 'n': s['n'], 'title': s['title'], 'disp': t, 'group': g,
                 'html': body, 'toc': s['toc'], 'text': plain})

# extract music links and road encounters for tools
music = []
for s in secs:
    if s['title'].startswith('МУЗЫКА'):
        for row in re.findall(r'<tr><td>(.*?)</td><td>.*?href="([^"]+)".*?</td><td>(.*?)</td></tr>', ''.join(s['html'])):
            music.append({'scene': re.sub('<[^>]+>', '', row[0]), 'url': row[1], 'where': re.sub('<[^>]+>', '', row[2])})

json.dump({'sections': data, 'music': music}, open(os.path.join(BASE, 'data.json'), 'w'), ensure_ascii=False)
print(len(data), 'sections', len(music), 'tracks', sum(len(d['html']) for d in data) // 1024, 'KB')
