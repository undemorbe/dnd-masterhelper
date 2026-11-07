// Mini-markup -> docx builder for the campaign handbook
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, LevelFormat, PageBreak, TableOfContents, Footer, PageNumber,
  Header, LineRuleType,
} = require('docx');

const C = {
  blood: '7A1E1E', ink: '1E1A1A', muted: '5A5250', gold: '8A6A2A',
  headBg: '2B2323', rowAlt: 'F4EFEA', imp: 'F6E4E1', impBorder: '9C2B2B',
  tip: 'EAF0EC', tipBorder: '3E6B55', spoil: 'ECE8F3', spoilBorder: '5B4A86', quote: 'F7F3EE',
};
const FONT = 'Cambria';
const BODY = 'Calibri';
const PAGE_W = 11906, MARGIN = 1134; // A4, 2 cm margins
const CONTENT_W = PAGE_W - 2 * MARGIN; // 9638

function runs(text, base = {}) {
  // supports **bold** and *italic*
  const out = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), ...base }));
    const t = m[0];
    if (t.startsWith('**')) out.push(new TextRun({ text: t.slice(2, -2), ...base, bold: true }));
    else out.push(new TextRun({ text: t.slice(1, -1), ...base, italics: true }));
    last = m.index + t.length;
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), ...base }));
  return out;
}

const thin = (color = 'BFB5AE') => ({ style: BorderStyle.SINGLE, size: 4, color });

function box(lines, kind) {
  const conf = {
    imp: { bg: C.imp, bc: C.impBorder, label: 'ВАЖНО' },
    tip: { bg: C.tip, bc: C.tipBorder, label: 'СОВЕТ МАСТЕРУ' },
    spoil: { bg: C.spoil, bc: C.spoilBorder, label: 'ТАЙНА · ТОЛЬКО ДЛЯ МАСТЕРА' },
    quote: { bg: C.quote, bc: C.gold, label: null },
  }[kind];
  const children = [];
  lines.forEach((l, i) => {
    let label = conf.label, text = l;
    const mm = l.match(/^\[([^\]]+)\]\s*(.*)$/);
    if (i === 0 && mm) { label = mm[1]; text = mm[2]; }
    const parts = [];
    if (i === 0 && label) parts.push(new TextRun({ text: label + '.  ', bold: true, color: conf.bc, font: BODY, size: 19 }));
    const isBullet = text.startsWith('- ');
    if (isBullet) text = '— ' + text.slice(2);
    parts.push(...runs(text, kind === 'quote' ? { italics: true, font: FONT, size: 22, color: C.ink } : { font: BODY, size: 20 }));
    children.push(new Paragraph({ children: parts, spacing: { before: 40, after: 40 }, indent: isBullet ? { left: 200 } : undefined }));
  });
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [CONTENT_W],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: CONTENT_W, type: WidthType.DXA },
      shading: { fill: conf.bg, type: ShadingType.CLEAR, color: 'auto' },
      margins: { top: 100, bottom: 100, left: 180, right: 180 },
      borders: { top: thin(conf.bg), bottom: thin(conf.bg), right: thin(conf.bg), left: { style: BorderStyle.SINGLE, size: 24, color: conf.bc } },
      children,
    })] })],
  });
}

function table(rows) {
  const cols = rows[0].length;
  // weight columns by max text length (clamped)
  const weights = Array.from({ length: cols }, (_, c) => {
    const mx = Math.max(...rows.map(r => (r[c] || '').replace(/\*/g,'').length));
    const word = Math.max(...rows.map(r => Math.max(0, ...(r[c] || '').replace(/\*/g,'').split(/\s+/).map(w => w.length))));
    return Math.max(Math.min(Math.max(mx, 6), 60), word * 2.1 + 4);
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let widths = weights.map(w => Math.floor(CONTENT_W * w / total));
  widths[widths.length - 1] += CONTENT_W - widths.reduce((a, b) => a + b, 0);
  const trs = rows.map((r, ri) => new TableRow({
    tableHeader: ri === 0,
    cantSplit: true,
    children: r.map((cell, ci) => new TableCell({
      width: { size: widths[ci], type: WidthType.DXA },
      shading: { fill: ri === 0 ? C.headBg : (ri % 2 === 0 ? C.rowAlt : 'FFFFFF'), type: ShadingType.CLEAR, color: 'auto' },
      margins: { top: 60, bottom: 60, left: 100, right: 100 },
      borders: { top: thin(), bottom: thin(), left: thin(), right: thin() },
      children: (cell || '').split(' // ').map(seg => new Paragraph({
        children: runs(seg, ri === 0 ? { bold: true, color: 'FFFFFF', font: BODY, size: 19 } : { font: BODY, size: 19 }),
        spacing: { before: 0, after: 20 },
      })),
    })),
  }));
  return new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: widths, rows: trs });
}

let NUMCOUNT = 0; let firstH1 = true;
const H1S = [];
function parse(src) {
  const lines = src.split(/\r?\n/);
  const out = [];
  let i = 0;
  let currentNum = null;
  while (i < lines.length) {
    let l = lines[i];
    if (!l.trim()) { i++; currentNum = null; continue; }
    if (l.startsWith('# ')) {
      out.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: !firstH1, children: [new TextRun(l.slice(2))] }));
      H1S.push(l.slice(2));
      firstH1 = false; i++; continue;
    }
    if (l.startsWith('## ')) { out.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(l.slice(3))] })); i++; continue; }
    if (l.startsWith('### ')) { out.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(l.slice(4))] })); i++; continue; }
    if (l.startsWith('#### ')) { out.push(new Paragraph({ heading: HeadingLevel.HEADING_4, children: [new TextRun(l.slice(5))] })); i++; continue; }
    if (l === '---pb') { out.push(new Paragraph({ children: [new PageBreak()] })); i++; continue; }
    const boxMap = { '!': 'imp', '?': 'tip', '%': 'spoil', '>': 'quote' };
    const bk = l.match(/^([!?%>]) /);
    if (bk) {
      const kind = boxMap[bk[1]]; const buf = [];
      while (i < lines.length && lines[i].startsWith(bk[1] + ' ')) { buf.push(lines[i].slice(2)); i++; }
      out.push(box(buf, kind)); out.push(new Paragraph({ spacing: { after: 60 }, children: [] }));
      continue;
    }
    if (l.startsWith('|')) {
      const buf = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        buf.push(lines[i].replace(/^\|/, '').replace(/\|\s*$/, '').split('|').map(s => s.trim())); i++;
      }
      out.push(table(buf)); out.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
      continue;
    }
    let m;
    if ((m = l.match(/^(\s*)- (.*)$/))) {
      const lvl = Math.min(Math.floor(m[1].length / 2), 1);
      out.push(new Paragraph({ numbering: { reference: 'bul', level: lvl }, children: runs(m[2]), spacing: { after: 40 } }));
      i++; continue;
    }
    if ((m = l.match(/^\d+\. (.*)$/))) {
      if (currentNum === null) { NUMCOUNT++; currentNum = 'num' + NUMCOUNT; }
      out.push(new Paragraph({ numbering: { reference: currentNum, level: 0 }, children: runs(m[1]), spacing: { after: 40 } }));
      i++; continue;
    }
    out.push(new Paragraph({ children: runs(l), spacing: { after: 100 } }));
    i++;
  }
  return out;
}

const dir = path.join(__dirname, 'content');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.txt')).sort();
const body = [];
for (const f of files) body.push(...parse(fs.readFileSync(path.join(dir, f), 'utf8')));

const title = [
  new Paragraph({ spacing: { before: 2600, after: 200 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'ГОРОД, КОТОРЫЙ', font: FONT, size: 64, bold: true, color: C.blood })] }),
  new Paragraph({ spacing: { after: 300 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'НАРИСОВАЛИ', font: FONT, size: 64, bold: true, color: C.blood })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.gold, space: 8 } }, spacing: { after: 300 }, children: [new TextRun({ text: 'Методичка мастера · кампания', font: FONT, size: 30, color: C.ink })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 900 }, children: [new TextRun({ text: 'Bloodborne × Fear & Hunger × Look Outside', italics: true, font: FONT, size: 24, color: C.muted })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new TextRun({ text: '«Сайлас Вейл рисовал людей так, как хотел их видеть.', italics: true, font: FONT, size: 24 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 }, children: [new TextRun({ text: 'Элиас Вейл лечил людей такими, какими они были.»', italics: true, font: FONT, size: 24 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Тема кампании: что происходит, когда человек получает право исправлять реальность?', font: BODY, size: 20, color: C.muted })] }),
  new Paragraph({ children: [new PageBreak()] }),
  new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('СОДЕРЖАНИЕ')] }),
  ...H1S.map(h => new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: h, font: FONT, size: 22, bold: /^(8|13|22|27|32|33|44)\./.test(h), color: /^(8|13|22|27|32|33|44)\./.test(h) ? C.blood : C.ink })] })),
  new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: 'Навигация по разделам — панель навигации Word (Вид → Область навигации).', italics: true, size: 18, color: C.muted })] }),
  new Paragraph({ children: [new PageBreak()] }),
];

const doc = new Document({
  creator: 'Boris Stankov',
  title: 'Город, который нарисовали — методичка мастера',
  
  styles: {
    default: { document: { run: { font: BODY, size: 21, color: C.ink }, paragraph: { spacing: { line: 276, lineRule: LineRuleType.AUTO } } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: FONT, size: 36, bold: true, color: C.blood },
        paragraph: { spacing: { before: 120, after: 200 }, outlineLevel: 0, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: C.blood, space: 4 } } } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: FONT, size: 28, bold: true, color: C.ink },
        paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1, keepNext: true } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: FONT, size: 24, bold: true, color: C.blood },
        paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2, keepNext: true } },
      { id: 'Heading4', name: 'Heading 4', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: BODY, size: 21, bold: true, color: C.gold },
        paragraph: { spacing: { before: 140, after: 60 }, outlineLevel: 3, keepNext: true } },
    ],
  },
  numbering: { config: [
    { reference: 'bul', levels: [
      { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 500, hanging: 260 } } } },
      { level: 1, format: LevelFormat.BULLET, text: '◦', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 900, hanging: 260 } } } },
    ] },
    ...Array.from({ length: NUMCOUNT }, (_, k) => ({ reference: 'num' + (k + 1), levels: [
      { level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 500, hanging: 320 } } } },
    ] })),
  ] },
  sections: [{
    properties: { titlePage: true, page: { size: { width: PAGE_W, height: 16838 }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } },
    headers: { first: new Header({ children: [new Paragraph({ children: [] })] }), default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Город, который нарисовали · методичка мастера', size: 16, color: C.muted, italics: true })] })] }) },
    footers: { first: new Footer({ children: [new Paragraph({ children: [] })] }), default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: C.muted })] })] }) },
    children: [...title, ...body],
  }],
});

Packer.toBuffer(doc).then(buf => {
  const outPath = process.argv[2] || path.join(__dirname, 'out.docx');
  fs.writeFileSync(outPath, buf);
  console.log('written', outPath, buf.length);
});
