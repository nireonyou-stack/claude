// v1.110.9 Roll20 페이지 설정 창 정리: 사용자가 보내 준 실제 구조(일부)에 올인원 CSS 만 입혀
// 이름이 칸 줄 왼쪽에 서는지 · 짧은 회색 줄이 숨는지 · 격자 유형/대각선 측정이 반씩인지 · 아래 단추가 오른쪽인지 본다 (Roll20 CSS 는 없음)
const { chromium } = require('playwright'); const fs = require('fs');
const src = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
const re = /const CORE_CSS = `|addCss\(`/g; let m, css = '';
while ((m = re.exec(src))) { const s = m.index + m[0].length; css += src.slice(s, src.indexOf('`', s)).replace(/\$\{[^}]*\}/g, '#__x') + '\n'; }
const pill = (id, v, u, dis) => `<div class="flex-wrapper${dis ? ' disabled' : ''}" data-testid="pageSettings-pd-tab-${id}"><div class="__container"><label class="label"><div class="pillBox${dis ? ' disabled' : ''}"><input class="__box" value="${v}">${u ? `<div class="append">${u}</div>` : ''}</div><span class="__units"></span></label></div></div>`;
const row = (a, b, c) => `<div class="rowspacer">${a}<button class="el-button is-link multi">×</button>${b}<button class="el-button is-link plus">=</button>${c}</div>`;
const html = `<div class="block-submenu isResizable" style="width:500px"><div class="block-submenu-header"><div class="title-area"><h4 class="title">페이지 설정</h4></div></div>
<div class="block-submenu-body scrollShadows"><div><div class="wrapper"><div class="section"></div><div>
 <div class="section"><div class="section-header"><div class="title-wrapper"><h5 class="title large-title">캔버스 크기</h5></div></div></div>
 <div class="section" id="w"><div class="title-wrapper"><h5 class="title">너비</h5></div>${row(pill('cellsWide', 34, '칸'), pill('w70', 50, '픽셀/칸', 1), pill('pixelsWide', 1700, '픽셀'))}</div>
 <div class="block-submenu-divider" id="dv"></div>
 <div class="title-wrapper" id="ct"><h5 class="title large-title">셀 크기</h5></div>${row(pill('cellSize', 0.71, '칸'), pill('c70', 70, 'px', 1), pill('pixelCellSize', 50, '픽셀/칸'))}
 <div class="divider-svg" id="ds"></div>
 <div class="section"><div class="title-wrapper"><h4 class="title large-title">축척</h4></div><div class="rowspacer no-gap">${pill('scale', 5)}<div class="rowScaleDropdown scale"><div class="el-select"><div class="el-select__wrapper">Feet</div></div></div></div></div>
 <div><div class="rowspacer widerGap" id="wg"><div><div class="title-wrapper"><h5 class="title subheader">격자 유형</h5></div><div class="el-select el-select--large" data-testid="pageSettings-pd-tab-grid-type"><div class="el-select__wrapper">Square</div></div></div>
  <div><div class="title-wrapper"><h5 class="title subheader">대각선 측정</h5></div><div class="el-select el-select--large"><div class="el-select__wrapper">D&amp;D 5e / 4</div></div></div></div></div>
</div></div></div></div>
<div class="block-submenu-footer"><div class="block-submenu-footer-content" style="display:flex"><button class="el-button grimoire__button closeStyle">취소</button><button class="el-button el-button--primary grimoire__button">설정 저장</button></div></div></div>`;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 700, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.setContent(`<!doctype html><meta charset="utf-8"><style>${css}</style><body class="r20pg-on"><div class="vtt-page-card-menu">${html}</div></body>`);
  const r = await p.evaluate(() => {
    const box = s => document.querySelector(s).getBoundingClientRect();
    const lab = box('#w > .title-wrapper'), rw = box('#w > .rowspacer'), ct = box('#ct'), crow = box('#ct + .rowspacer');
    return { 너비이름옆에칸: Math.abs(lab.top - rw.top) < 4 && rw.left > lab.right - 1, 셀크기도옆에: Math.abs(ct.top - crow.top) < 4 && crow.left > ct.right - 1,
      셀크기글씨: getComputedStyle(document.querySelector('#ct h5')).fontWeight, 짧은줄: getComputedStyle(document.getElementById('dv')).display,
      긴줄폭: Math.round(box('#ds').width) + '/' + Math.round(box('.block-submenu-body').width), 칸높이: Math.round(box('.pillBox').height),
      반씩: getComputedStyle(document.getElementById('wg')).gridTemplateColumns.split(' ').length, 저장단추오른쪽: box('.el-button--primary').right > box('.closeStyle').right };
  });
  console.log(JSON.stringify(r));
  const ok = r.너비이름옆에칸 && r.셀크기도옆에 && r.셀크기글씨 === '400' && r.짧은줄 === 'none' && r.칸높이 === 26 && r.반씩 === 2 && r.저장단추오른쪽;
  console.log(ok ? '맞음' : '✗ 다름'); console.log('errors:', errs); await b.close();
})();
