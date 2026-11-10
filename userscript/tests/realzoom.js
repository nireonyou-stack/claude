// 사용자가 준 실제 #vm_zoom_buttons 로: ⛶ 모양이 − 와 같은지 · 끝에 무언가 붙어도 순서가 안 바뀌는지
const { chromium } = require('playwright'); const fs = require('fs');
const us = fs.readFileSync(process.env.US || require('path').join(__dirname, '..', 'roll20-layout2-allinone.user.js'), 'utf8');
const SHOT = process.env.SHOT;
const DOM = `<div id="vm_zoom_buttons" data-v-app=""><div data-v-2e62d97c="" class="wrapper"><div data-v-2e62d97c="" class="parentContainer"><button data-v-2e62d97c="" aria-disabled="false" type="button" class="el-button el-button--default btnStyle plus allCurvedButtons el-tooltip__trigger el-tooltip__trigger" id="view-controls-button"><i class="el-icon"><div data-v-2e62d97c="" style="display: flex;"><svg viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4" fill="currentColor"/></svg></div></i><!--v-if--></button><div data-v-2e62d97c="" class="zoomButtonsInner"><button data-v-2e62d97c="" aria-disabled="false" type="button" class="el-button el-button--default btnStyle plus"><i class="el-icon"><span class="grimoire__roll20-icon">+</span></i><!--v-if--></button><button data-v-2e62d97c="" aria-disabled="false" type="button" class="el-button el-button--default btnStyle level"><!--v-if--><span class="">100</span></button><div data-v-2e62d97c="" class="sliderSection"><!--v-if--></div><button data-v-2e62d97c="" aria-disabled="false" type="button" class="el-button el-button--default btnStyle minus"><i class="el-icon"><span class="grimoire__roll20-icon">−</span></i><!--v-if--></button></div><button data-v-2e62d97c="" aria-disabled="false" type="button" class="el-button el-button--default btnStyle plus allCurvedButtons centerCameraButton el-tooltip__trigger el-tooltip__trigger"><i class="el-icon"><span class="grimoire__roll20-icon">⌖</span></i><!--v-if--></button><!--v-if--><!--v-if--></div></div></div>`;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 760 }, deviceScaleFactor: SHOT ? 2 : 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8766/blank.html');
  await p.evaluate(DOM => {
    document.body.style.cssText = 'margin:0;height:100vh;background:#555';
    document.head.insertAdjacentHTML('beforeend', `<style>
      .el-button { display:inline-flex; align-items:center; justify-content:center; background:#fff; border:1px solid #dcdfe6; color:#606266; }   /* Element Plus 기본 */
      .el-icon { width:1em; height:1em; display:inline-flex; } .el-icon svg { width:1em; height:1em; }
      .btnStyle[data-v-2e62d97c] { background:rgba(60,60,60,.55); border:0; color:#e8e8e8; }                                             /* Roll20 scoped */
      .parentContainer[data-v-2e62d97c] { display:flex; background:rgba(60,60,60,.55); }</style>`);
    document.body.insertAdjacentHTML('beforeend', `<div id="rightsidebar" style="position:fixed;right:0;top:0;width:330px;height:100%;background:#fff"></div>
      <div id="sidebarcontrol" style="position:fixed;right:330px;top:6px;width:28px;height:28px;background:#eee"></div><div id="page-button" style="width:28px;height:28px;background:#333"></div>` + DOM);
    window.Campaign = { activePage: () => ({ get: () => 25 }), get: () => '[]', on() {}, handouts: { models: [] }, characters: { models: [] } };
    window.is_gm = true;
  }, DOM);
  await p.addScriptTag({ content: us }); await p.waitForTimeout(500);
  const look = sel => p.$eval(sel, e => { const c = getComputedStyle(e); return `${c.backgroundColor} / ${c.color} / border ${c.borderTopWidth}`; });
  console.log('− 모양:', await look('.zoomButtonsInner > .minus'));
  console.log('⛶ 모양:', await look('.r20-fitz'));
  const order = () => p.evaluate(() => [...document.querySelectorAll('#vm_zoom_buttons button')].map(x => [x, x.getBoundingClientRect().top]).sort((a, c) => a[1] - c[1]).map(([x]) => x.id ? '👁' : x.classList.contains('centerCameraButton') ? '⌖' : x.classList.contains('r20-fitz') ? '⛶' : x.classList.contains('level') ? x.textContent : x.classList.contains('minus') ? '−' : x.classList.contains('plus') ? '+' : '?').join(' '));
  console.log('위→아래:', await order());
  await p.evaluate(() => document.querySelector('.parentContainer').insertAdjacentHTML('beforeend', '<div class="el-popper" style="position:absolute;width:0;height:0"></div>'));   // Roll20 이 끝에 무언가 붙임
  await p.waitForTimeout(200);
  console.log('끝에 붙은 뒤:', await order());
  if (SHOT) await p.screenshot({ path: SHOT + '/realzoom.png', clip: { x: 820, y: 30, width: 60, height: 230 } });
  console.log('errors:', errs); await b.close();
})();
