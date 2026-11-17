// pos.html + pos-samsung.css → pos-samsung.html
// 기능은 pos.html 한 곳에서만 고치고, 이 스크립트가 테마를 입힌 화면을 만들어요.
// 쓰는 법: node scripts/build-pos-theme.mjs [출력 폴더=현재 폴더]
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(process.argv[2] || root);
const html = readFileSync(join(root, 'pos.html'), 'utf8');
const css = readFileSync(join(root, 'pos-samsung.css'), 'utf8');

const headEnd = html.indexOf('</head>');
if (headEnd < 0) throw new Error('pos.html 에서 </head> 를 찾지 못했어요');
if (css.includes('</style')) throw new Error('pos-samsung.css 에 </style 이 들어 있으면 안 돼요');

let out = html.slice(0, headEnd) + `<style id="pos-theme">\n${css}</style>\n` + html.slice(headEnd);
const themed = out.replace('<meta name="theme-color" content="#1f3a5f">', '<meta name="theme-color" content="#ffffff">');
if (themed === out) console.warn('theme-color 메타를 찾지 못해 그대로 뒀어요');
out = themed;

writeFileSync(join(outDir, 'pos-samsung.html'), out);
console.log(`pos-samsung.html 생성 (${(out.length / 1024).toFixed(0)}KB) → ${outDir}`);
