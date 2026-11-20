"""Roll20 시트 검사 — roll20kit/LESSONS.md 의 함정을 자동으로 막는다.

    python3 roll20kit/lint.py <시트 폴더>        # sheet.json 이 있는 폴더 (예: futarisousa/roll20/sheet)

오류(ERROR)가 하나라도 있으면 종료 코드 1. 경고(WARN)는 알리기만 한다.
view.js(가상 Roll20)도 이 검사로 '채팅 카드 CSS 가 빠질지'를 정한다 (card_css_ok).
"""
import json
import pathlib
import re
import sys

BOOTSTRAP = {'mark', 'btn', 'label', 'badge', 'well', 'row', 'table', 'hide', 'show', 'muted', 'lead', 'nav', 'hero-unit',
             'container', 'alert', 'close', 'caret', 'fade', 'in', 'active', 'disabled'} | {f'span{i}' for i in range(1, 13)}


def strip_comments(css):
    return re.sub(r'/\*.*?\*/', '', css, flags=re.S)


def rules(css):
    """at-rule 이 없다는 전제(검사함)로 '선택자 { … }' 를 차례대로."""
    body = re.sub(r'@import[^;]*;', '', strip_comments(css))
    out, depth, start, sel = [], 0, 0, ''
    for i, ch in enumerate(body):
        if ch == '{':
            if depth == 0:
                sel = body[start:i].strip()
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                out.append(sel)
                start = i + 1
    return out


def check(folder):
    folder = pathlib.Path(folder)
    errs, warns = [], []
    E, W = errs.append, warns.append
    meta = json.loads((folder / 'sheet.json').read_text(encoding='utf-8'))
    for k in ('html', 'css', 'authors', 'roll20userid', 'preview', 'instructions', 'legacy'):
        if k not in meta:
            E(f'sheet.json: {k} 없음')
    if meta.get('preview') and not (folder / meta['preview']).exists():
        E(f'sheet.json: 미리보기 그림 {meta["preview"]} 없음')
    css = (folder / meta['css']).read_text(encoding='utf-8')
    html = (folder / meta['html']).read_text(encoding='utf-8')

    # ── 1. 채팅 카드 CSS 를 살리는 조건
    card = []
    for n, line in enumerate(css.split('\n'), 1):
        bad = [c for c in line if ord(c) > 0x7E or (ord(c) < 0x20 and c != '\t')]
        if bad:
            card.append(f'CSS {n}행: ASCII 밖 글자 {"".join(bad[:5])!r}')
        for m in re.finditer(r'\\([0-9a-fA-F]{2,6})', line):
            if int(m.group(1), 16) > 0x7E:
                card.append(f'CSS {n}행: 높은 유니코드 이스케이프 \\{m.group(1)} (이스케이프도 안 됨)')
    for m in re.finditer(r'@([a-z-]+)', strip_comments(css)):
        if m.group(1) != 'import':
            card.append(f'CSS: @{m.group(1)} — @import 말고 at-rule 금지')
    if 'data:' in css:
        card.append('CSS: data: 주소 — 그림은 images/ PNG 로')
    if 'fonts.googleapis.com/css2' in css:
        card.append('CSS: Google Fonts 는 /css?family=A:400|B:700 꼴 (/css2 금지)')
    for c in re.findall(r'/\*.*?\*/', css, flags=re.S):
        if "'" in c or ';' in c:
            card.append(f"CSS 주석 안 ' 또는 ; : {c[:50]!r}")
    rs = rules(css)
    names = set(re.findall(r'<rolltemplate class="sheet-rolltemplate-([a-z0-9-]+)"', html))
    seen_sheet = False
    for sel in rs:
        is_card = all(s.strip().startswith('.sheet-rolltemplate-') for s in sel.split(','))
        if is_card and seen_sheet:
            card.append(f'CSS: 롤 템플릿 규칙이 시트 규칙 뒤에 있음 — 맨 위로: {sel[:60]}')
        if not is_card:
            seen_sheet = True
        if 'sheet-rolltemplate-darkmode' in sel and re.search(r'sheet-rolltemplate-[a-z0-9-]+\s+\.sheet-rolltemplate-darkmode', sel):
            card.append(f'CSS: 다크 모드 카드 선택자는 같은 요소(.x.sheet-rolltemplate-darkmode): {sel[:60]}')
    for nm in names:
        if not any(f'.sheet-rolltemplate-{nm}' in s for s in rs):
            card.append(f'CSS: 롤 템플릿 {nm} 의 규칙 없음')
    errs += card

    # ── 3. Roll20 기본 CSS
    for sel in rs:
        for part in sel.split(','):
            if re.search(r'(^|[\s>+~])label\b', part):
                last = re.split(r'[\s>+~]+', part.strip())
                comp = next((x for x in reversed(last) if x.startswith('label')), '')
                if part.count('.') < 2 or not re.match(r'label\.', comp):
                    W(f'CSS: label 규칙은 요소+클래스 둘 이상 (Roll20 기본 label 을 이기게): {part.strip()[:60]}')
        for k in (':has(', 'color-mix('):
            if k in sel:
                W(f'CSS: {k} 는 피함 — {sel[:60]}')
    for k in (':has(', 'color-mix('):
        if k in strip_comments(css) and not any(k in s for s in rs):
            W(f'CSS: {k} 는 피함 (선언 안)')
    for cls in re.findall(r'class="([^"]+)"', html):
        for c in cls.split():
            if c in BOOTSTRAP:
                W(f'HTML: Bootstrap 클래스 이름 {c!r} — Roll20 기본 CSS 가 칠함')

    # ── 4. HTML · 워커
    # 라디오 묶음에 checked 가 하나도 없으면 Roll20 은 첫 라디오를 기본값으로 쓴다 — 새 캐릭터에 미리 골라진 값이 생김 (아마데우스)
    body = re.sub(r'<rolltemplate.*?</rolltemplate>|<script.*?</script>', '', html, flags=re.S)
    groups = {}
    for m in re.finditer(r'<input\b[^>]*type="radio"[^>]*>', body):
        nm = re.search(r'name="(attr_[^"]+)"', m.group(0))
        if nm:
            g = groups.setdefault(nm.group(1), [False, body.count(chr(10), 0, m.start()) + 1])
            g[0] = g[0] or bool(re.search(r'\bchecked\b', m.group(0)))
    for nm, (chk, line) in groups.items():
        if not chk:
            W(f'HTML: 라디오 {nm} (줄 {line}) 에 checked 가 없음 — Roll20 이 첫 라디오를 기본값으로 고름. 숨은 빈 라디오를 checked 로')
    # <table> 은 Roll20 PR 봇이 경고 (Good Code 규정) — 표는 div 그리드로 (둘이서 수사 감정 표)
    for m in re.finditer(r'<table\b', html):
        W(f'HTML: <table> 태그 (줄 {html.count(chr(10), 0, m.start()) + 1}) — Roll20 PR 봇이 경고, div 그리드로')
    # 반복 줄 안 단추 이름의 _ 는 Roll20 이 줄 이름으로 잘못 읽는다 (오류) · 밖은 블러드문 act_chk_* 가 실제로 돌았음 (경고)
    reps = ''.join(re.findall(r'<fieldset.*?</fieldset>', html, flags=re.S))
    for nm in re.findall(r'name="act_([^"]+)"', html):
        if '_' in nm:
            (E if f'name="act_{nm}"' in reps else W)(f'HTML: 단추 이름 act_{nm} — _ 는 피함')
    for nm in re.findall(r'class="repeating_([^"\s]+)', html):
        if not re.fullmatch(r'[a-z0-9]+', nm):
            E(f'HTML: 반복 섹션 이름 repeating_{nm} — 영소문자 · 숫자만')
    for m in re.finditer(r'<rolltemplate.*?</rolltemplate>', html, flags=re.S):
        t = m.group(0)
        if t.count('{{') != t.count('}}'):
            E('롤 템플릿: {{ }} 짝이 안 맞음')
    return errs, warns


def card_css_ok(folder):
    """채팅 카드 CSS 가 Roll20 채팅에 실릴 조건(1장)을 모두 지키는지."""
    errs, _ = check(folder)
    return not [e for e in errs if e.startswith('CSS')]


if __name__ == '__main__':
    errs, warns = check(sys.argv[1])
    for w in warns:
        print('WARN ', w)
    for e in errs:
        print('ERROR', e)
    print(f'lint: 오류 {len(errs)} · 경고 {len(warns)}')
    sys.exit(1 if errs else 0)
