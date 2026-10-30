// Roll20 sheet worker 흉내 — getAttrs/setAttrs/on/getSectionIDs/generateRowID/startRoll/finishRoll
// 시트 HTML 의 기본값 · 반복 섹션 칸을 읽고, 바뀜 이벤트(사용자/워커)를 Roll20 처럼 낸다.
const fs = require('fs'), vm = require('vm');
function parseSheet(html) {
  const worker = (html.match(/<script type="text\/worker">([\s\S]*?)<\/script>/) || [])[1] || '';
  const body = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<rolltemplate[\s\S]*?<\/rolltemplate>/g, '');
  const defaults = {}, repDefaults = {};
  const scan = (frag, put) => {
    for (const m of frag.matchAll(/<(input|select|textarea|span)\b([^>]*)>([\s\S]*?)(?=<\/\1>|<(?:input|select|textarea|span)\b|$)/g)) {
      const [, tag, attrs, inner] = m, nm = (attrs.match(/\bname="attr_([^"]+)"/) || [])[1];
      if (!nm) continue;
      const type = (attrs.match(/\btype="([^"]+)"/) || [])[1] || '', val = (attrs.match(/\bvalue="([^"]*)"/) || [])[1];
      let d;
      if (tag === 'input' && type === 'checkbox') d = /\bchecked\b/.test(attrs) ? (val ?? 'on') : '0';
      else if (tag === 'input' && type === 'radio') { if (!/\bchecked\b/.test(attrs)) continue; d = val ?? ''; }
      else if (tag === 'input') d = val ?? '';
      else if (tag === 'select') { const opts = [...inner.matchAll(/<option\b([^>]*)>/g)]; const o = opts.find(x => /\bselected\b/.test(x[1])) || opts[0]; d = o ? ((o[1].match(/value="([^"]*)"/) || [])[1] ?? '') : ''; }
      else if (tag === 'textarea') d = inner.replace(/<\/textarea>[\s\S]*/, '');
      else continue;          // span 은 표시용
      put(nm.toLowerCase(), d);
    }
  };
  for (const m of body.matchAll(/<fieldset class="repeating_([a-z0-9]+)">([\s\S]*?)<\/fieldset>/g)) {
    repDefaults[m[1]] = {}; scan(m[2], (k, v) => { if (!(k in repDefaults[m[1]])) repDefaults[m[1]][k] = v; });
  }
  scan(body.replace(/<fieldset[\s\S]*?<\/fieldset>/g, ''), (k, v) => { if (!(k in defaults)) defaults[k] = v; });
  return { worker, defaults, repDefaults };
}
function makeSim(html, opts = {}) {
  const { worker, defaults, repDefaults } = parseSheet(html);
  const attrs = new Map(), handlers = [], log = [], rolls = [];
  let seq = 0, rid = 0, queue = Promise.resolve();
  const dice = opts.dice || [];           // 굴릴 눈 차례 (없으면 1)
  const queries = opts.queries || {};     // 질의 답: 질의 문구 앞부분 → 값
  const REP = /^repeating_([a-z0-9]+)_([^_]+)_(.+)$/i;
  const def = k => { const m = k.match(REP); if (m) return repDefaults[m[1].toLowerCase()]?.[m[3].toLowerCase()] ?? ''; return defaults[k] ?? ''; };
  const get = k => { k = k.toLowerCase(); return attrs.has(k) ? attrs.get(k) : def(k); };
  const later = fn => { queue = queue.then(() => new Promise(r => setTimeout(() => { try { fn(); } catch (e) { log.push(['ERROR', e.stack]); } r(); }, 0))); };
  const fire = (name, info) => {
    handlers.forEach(([ev, cb]) => { if (ev.split(/\s+/).map(s => s.toLowerCase()).includes(name.toLowerCase())) later(() => cb(info)); });
  };
  const changed = (k, prev, val, src) => {
    const m = k.match(REP), info = { sourceAttribute: k, sourceType: src, previousValue: prev, newValue: val };
    fire(`change:${k}`, { ...info, triggerName: `change:${k}` });
    if (m) { fire(`change:repeating_${m[1]}:${m[3]}`, { ...info, triggerName: `change:${k}` }); fire(`change:repeating_${m[1]}`, { ...info, triggerName: `change:${k}` }); }
  };
  const api = {
    on: (ev, cb) => handlers.push([ev, cb]),
    getAttrs: (names, cb) => later(() => cb(Object.fromEntries(names.map(n => [n, String(get(n))])))),
    setAttrs: (obj, o, cb) => {
      if (typeof o === 'function') { cb = o; o = {}; }
      later(() => {
        Object.entries(obj).forEach(([k, v]) => {
          const key = k.toLowerCase(), prev = get(key);
          if (v === undefined) log.push(['WARN', 'setAttrs undefined: ' + k]);
          attrs.set(key, v);
          if (!(o && o.silent) && String(prev) !== String(v)) changed(key, prev, v, 'sheetworker');
        });
        if (cb) later(cb);
      });
    },
    getSectionIDs: (sec, cb) => later(() => {
      const ids = []; for (const k of attrs.keys()) { const m = k.match(REP); if (m && m[1] === sec.toLowerCase() && !ids.includes(m[2])) ids.push(m[2]); }
      cb(ids);
    }),
    generateRowID: () => '-sim' + (++seq).toString(36).padStart(4, '0'),
    removeRepeatingRow: row => later(() => { for (const k of [...attrs.keys()]) if (k.startsWith(row.toLowerCase() + '_')) attrs.delete(k); }),
    startRoll: (macro, cb) => later(() => {
      const results = {}, id = 'roll' + (++rid);
      if ((macro.match(/\{\{/g) || []).length !== (macro.match(/\}\}/g) || []).length) log.push(['WARN', 'braces unbalanced: ' + macro]);
      for (const m of macro.matchAll(/\{\{([a-z0-9_]+)=\[\[([\s\S]*?)\]\]\}\}/gi)) {
        let expr = m[2];
        expr = expr.replace(/\?\{([^|}]*)\|([^}]*)\}/g, (all, q, rest) => {
          const ans = Object.entries(queries).find(([k]) => q.startsWith(k));
          const opts = rest.split('|').map(o => o.includes(',') ? o.split(',').pop() : o);
          return ans ? String(typeof ans[1] === 'function' ? ans[1](q, rest) : ans[1]) : opts[0];
        });
        const ds = [];
        const val = expr.replace(/(\d+)d(\d+)/gi, (a, n, s) => { let t = 0; for (let i = 0; i < +n; i++) { const d = dice.length ? dice.shift() : 1; ds.push(d); t += d; } return t; });
        let result; try { result = Function(`return (${val})`)(); } catch (e) { log.push(['WARN', `bad expr ${m[1]}: ${expr}`]); result = NaN; }
        results[m[1]] = { result, dice: ds, expression: expr };
      }
      const r = { macro, results, rollId: id, computed: null }; rolls.push(r);
      cb({ rollId: id, results });
    }),
    finishRoll: (id, computed) => { const r = rolls.find(x => x.rollId === id); if (r) r.computed = computed; },
    console,
  };
  vm.createContext(api);
  vm.runInContext(worker, api);
  const sim = {
    attrs, rolls, log, get,
    settle: async () => { let q; do { q = queue; await q; } while (q !== queue); },
    open: () => fire('sheet:opened', { triggerName: 'sheet:opened' }),
    // 사용자가 칸을 바꿈
    set: (k, v) => { const key = k.toLowerCase(), prev = get(key); attrs.set(key, String(v)); if (String(prev) !== String(v)) changed(key, prev, String(v), 'player'); },
    remove: row => { for (const k of [...attrs.keys()]) if (k.startsWith(row.toLowerCase() + '_')) attrs.delete(k); const m = row.match(/^repeating_([a-z0-9]+)_(.+)$/i); fire(`remove:repeating_${m[1]}`, { triggerName: `remove:${row}`, sourceAttribute: row, removedInfo: {} }); },
    click: (btn, row) => {
      if (row) { const full = `${row}_${btn}`.toLowerCase(), sec = row.match(/^repeating_([a-z0-9]+)_/i)[1]; fire(`clicked:repeating_${sec}:${btn}`, { triggerName: `clicked:${full}`, sourceAttribute: full }); }
      else fire(`clicked:${btn}`, { triggerName: `clicked:${btn}` });
    },
    addRow: (sec, vals = {}) => { const id = api.generateRowID(); Object.entries(vals).forEach(([f, v]) => sim.set(`repeating_${sec}_${id}_${f}`, v)); return `repeating_${sec}_${id}`; },
    dice, queries,
  };
  return sim;
}
module.exports = { makeSim, parseSheet };
