// 중첩 변환 확인: 두 판의 CSS 묶음을 크로미움에 그대로 읽혀(CSSOM) 중첩을 펼친 규칙 목록(선택자 + 선언, 차례대로)을 견준다.
//   node tests/cssom-same.js 옛판.user.js 새판.user.js     → 같으면 '같음', 다르면 첫 다른 자리
// 덤: 한쪽에서 앞 줄 찌꺼기 등으로 규칙이 깨져 브라우저가 버리면 펼친 규칙 수가 달라져 드러난다.
const { chromium } = require('playwright'); const fs = require('fs');
const blocks = f => { const src = fs.readFileSync(f, 'utf8'), out = [], re = /const CORE_CSS = `|addCss\(`/g; let m;
  while ((m = re.exec(src))) { const s = m.index + m[0].length; out.push(src.slice(s, src.indexOf('`', s)).replace(/\$\{[^}]*\}/g, 'X')); } return out; };
(async () => {
  const [A, B] = [blocks(process.argv[2]), blocks(process.argv[3])];
  const b = await chromium.launch(); const p = await b.newPage();
  console.log('브라우저', b.version());
  const flat = (txt) => p.evaluate(txt => {
    const split = s => { const o = []; let d = 0, c = ''; for (const ch of s) { if ('(['.includes(ch)) d++; if (')]'.includes(ch)) d--; if (ch === ',' && !d) { o.push(c.trim()); c = ''; } else c += ch; } o.push(c.trim()); return o; };
    const out = []; let bad = [];
    const walk = (rules, par, ctx) => { for (const r of rules) {
      if (r instanceof CSSStyleRule) {
        let sel = r.selectorText;
        if (par != null) { if (split(par).length > 1) bad.push('부모가 목록: ' + par); sel = split(sel).map(s => s.includes('&') ? s.split('&').join(par) : par + ' ' + s).join(', '); }
        if (r.style.cssText) out.push(ctx + sel + ' { ' + r.style.cssText + ' }');
        if (r.cssRules && r.cssRules.length) walk(r.cssRules, sel, ctx);
      } else if (r.constructor.name === 'CSSNestedDeclarations') { out.push(ctx + par + ' {' + r.style.cssText + ' } (뒤 선언)'); }
      else if (r.cssRules) walk(r.cssRules, par, ctx + r.cssText.slice(0, r.cssText.indexOf('{')).trim() + ' » ');
      else out.push(ctx + r.cssText);
    } };
    const sh = new CSSStyleSheet(); sh.replaceSync(txt); walk(sh.cssRules, null, '');
    return { out, bad };
  }, txt);
  if (A.length !== B.length) { console.log('묶음 수 다름', A.length, B.length); process.exit(1); }
  let diff = 0, nA = 0, nB = 0;
  for (let i = 0; i < A.length; i++) {
    const [x, y] = [await flat(A[i]), await flat(B[i])]; nA += x.out.length; nB += y.out.length;
    if (y.bad.length) console.log('묶음', i, y.bad.slice(0, 3));
    const n = Math.max(x.out.length, y.out.length);
    for (let k = 0; k < n; k++) if (x.out[k] !== y.out[k]) { diff++; console.log(`묶음 ${i} 규칙 ${k}\n  옛: ${(x.out[k] || '(없음)').slice(0, 220)}\n  새: ${(y.out[k] || '(없음)').slice(0, 220)}`); break; }
  }
  console.log(`묶음 ${A.length}개 · 펼친 규칙 ${nA} → ${nB} · 다른 묶음 ${diff}개 → ${diff ? '다름' : '같음'}`);
  await b.close(); process.exit(diff ? 1 : 0);
})();
