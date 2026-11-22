"""피카부 Roll20 시트 빌드.

src/peekaboo.src.html 의 <!--@...--> 자리를 특기 리스트 · 졸음 슬롯 · 오바케 · 몸/의상/마법 · □ 칸(재능 · 부글부글 · 마력 슬롯),
src/worker.js(sheet worker) · src/rolltemplate.html(채팅 카드)로 채워 sheet/peekaboo.html 을,
src/peekaboo.src.css 의 /*@GEN*/ 자리를 칸 채우기 · 원기 슬롯 빗금 · 졸음 단계 규칙으로 채워 sheet/peekaboo.css 를 만든다.

    python3 build.py
"""
import pathlib

SRC = pathlib.Path(__file__).resolve().parent
OUT = SRC.parent / 'sheet'

# 특기 리스트 (공식 시트 순서): 열 글자 · 분야 · 2~12 특기
FIELDS = [
    ('A', '불량', ['밤샘', '졸기', '무시', '거짓말', '욕', '장난', '꼼수', '숨기', '훔치기', '겁주기', '싸움']),
    ('B', '운동', ['수영', '나무 타기', '유연함', '마라톤', '점프', '달리기 시합', '균형', '던지기', '구기', '받아치기', '힘센']),
    ('C', '친구', ['인터넷', '소문', '다정함', '참기', '편지', '수다', '자전거', '용기', '약속', '리드하기', '비밀 기지']),
    ('D', '놀이', ['컴퓨터', '게임', '모으기', '그림', '음악', '공상', '독서', '이야기 짓기', '퀴즈', '마술', '점']),
    ('E', '공부', ['실험', '우주', '생물', '공작', '계산', '숙제', '한자', '작문', '역사', '지리', '외국어']),
    ('F', '어른', ['법률', '꾸짖기', '치료', '매너', '추리', '계획성', '요리', '장보기', '멋내기', '연애', '도락']),
]
GAPS = ['a', 'b', 'c', 'd', 'e']   # 분야 오른쪽 공백 (a = 불량|운동 … e = 공부|어른)
# □ 칸: (속성, 개수, 모양 class, 단추 앞부분, 숫자 표시)
TOKENS = {'talent': ('talent_used', 6, 'sq', 'tl', False), 'muka_in': ('muka', 10, 'sq', 'mk', False),
          'muka_sp': ('muka', 5, 'sq', 'smk', False), 'mana': ('mp', 30, 'ms', 'ms', True)}
# 졸음 슬롯 (공식 시트의 단계 이름과 효과)
SLEEP = [('아직아직 괜찮아', ''), ('나른나른', '판정에 실패하면 졸음 +1'), ('졸려졸려', '판정에 실패하면 졸음 +1 · 판정에 −1 수정'),
         ('꾸벅꾸벅', '판정에 실패하면 졸음 +2 · 판정에 −1 수정'), ('멍해멍해', '판정에 실패하면 졸음 +2 · 판정에 −2 수정'),
         ('비틀비틀', '판정에 실패하면 졸음 +3 · 판정에 −2 수정')]
SLEEP_END = '행동 불능. 【졸음】이 29점 이하가 될 때까지 자유 행동이나 전투 행동을 할 수 없게 된다'
OB_ROWS = 5


def gap(g, head=False):
    return (f'<label class="gap{" gh" if head else ""}"><input type="checkbox" name="attr_gap_{g}" value="1" title="공백 칠하기">'
            '<span></span></label>')


def skills():
    head = '<div class="no corner"></div><div class="spc"></div>' + ''.join(
        f'<div class="fh">{name}<input type="checkbox" class="slot" name="attr_slot_{col.lower()}" value="1" title="{name} 원기 슬롯"></div>'
        + (gap(GAPS[i], True) if i < 5 else '') for i, (col, name, _) in enumerate(FIELDS))
    out = [head]
    for r in range(2, 13):
        line = f'<div class="no">{r}</div><div class="spc"></div>'
        for i, (col, _, names) in enumerate(FIELDS):
            n = names[r - 2]
            line += (f'<div class="c f{col.lower()}"><input type="checkbox" class="own" name="attr_{col}{r}" value="1" title="{n} 습득">'
                     f'<button type="action" class="n{" long" if len(n) >= 5 else ""}" name="act_r{col.lower()}{r}" title="{n} 판정">{n}</button>'
                     f'<span class="tn" name="attr_{col}{r}_value"></span></div>')
            if i < 5:
                line += gap(GAPS[i])
        out.append(line)
    return '\n'.join(out)


def slot_mirrors():
    return ''.join(f'<input type="hidden" class="slm{c.lower()}" name="attr_slot_{c.lower()}" value="0">' for c, _, _ in FIELDS)


def sleep():
    out = []
    for b, (nm, ef) in enumerate(SLEEP):
        for k in range(b * 5, b * 5 + 5):
            out.append(f'<label class="sl"><input type="radio" name="attr_sleep" value="{k}"{" checked" if k == 0 else ""}><span>{k}</span></label>')
        out.append(f'<div class="ef b{b}">{nm}{"*" if ef else ""}{f"<small>{ef}</small>" if ef else ""}</div>')
    out.append(f'<div class="last"><label class="sl"><input type="radio" name="attr_sleep" value="30"><span>30</span></label><div class="ef b6">{SLEEP_END}</div></div>')
    return '\n'.join(out)


def obake():
    return '\n'.join(f'<div class="orow"><i></i><input type="text" name="attr_ob{i}_name" title="만난 적 있는 오바케 {i}">'
                     f'<input type="text" class="w" name="attr_ob{i}_weak" title="약점 {i}"></div>' for i in range(1, OB_ROWS + 1))


def body():
    rows = [('몸', 'body', False), ('의상 1', 'cos1', False), ('의상 2', 'cos2', False), ('마법 1', 'mg1', True), ('마법 2', 'mg2', True), ('마법 3', 'mg3', True)]
    out = []
    for label, k, magic in rows:
        cost = (f'<span class="cost">코스트 <input type="text" name="attr_{k}_cost" title="{label} 코스트"></span>' if magic else '<span></span>')
        btn = f'<button type="action" class="bub" name="act_{k}" title="사용"></button>' if magic else ''
        out.append(f'<div class="brow"><b>{label}</b><input type="text" name="attr_{k}_name" title="{label}">{cost}'
                   f'<textarea name="attr_{k}_effect" title="{label} 효과"></textarea><span>{btn}</span></div>')
    return '\n'.join(out)


def tokens(key):
    attr, n, cls, pre, numbered = TOKENS[key]
    return (f'<span class="tok tk-{key}"><input type="hidden" class="hv" name="attr_{attr}" value="0">'
            + ''.join(f'<button type="action" class="{cls}" name="act_{pre}{k}" title="{k}">{k if numbered else ""}</button>' for k in range(1, n + 1)) + '</span>')


def gen_css():
    out = []
    # □ 칸: 값 v 면 앞에서 v 개를 채운다 (숨은 칸 value 를 Roll20 이 고쳐 줌)
    for key, (attr, n, cls, pre, numbered) in TOKENS.items():
        for v in range(1, n + 1):
            out.append(f'.pk .tk-{key} .hv[value="{v}"] ~ button[type=action].{cls}:nth-of-type(-n+{v}){{background-color:var(--accent);border-color:var(--accent);color:var(--acctx)}}')
    # 원기 슬롯에 체크한 분야: 습득 특기를 목표치 출발점에서 뺌 (빗금)
    for c, _, _ in FIELDS:
        c = c.lower()
        out.append(f'.pk .slm{c}[value="1"] ~ .grid .c.f{c}{{background:repeating-linear-gradient(-45deg,transparent 0 4px,var(--hatch) 4px 5px)}}')
        out.append(f'.pk .slm{c}[value="1"] ~ .grid .c.f{c} button[type=action].n{{color:var(--sub)}}')
    # 졸음 슬롯: 지금 단계의 효과 칸을 강조
    for b in range(7):
        out.append(f'.pk .sbm[value="{b}"] ~ .sleep .ef.b{b}{{background:var(--soft)}}')
    return '\n'.join(out)


def optional(name):
    p = SRC / name
    return p.read_text(encoding='utf-8').rstrip() if p.exists() else ''


def build():
    html = (SRC / 'peekaboo.src.html').read_text(encoding='utf-8')
    for key, val in {
        'SLOT_MIRRORS': slot_mirrors(), 'SKILLS': skills(), 'SLEEP': sleep(), 'OBAKE': obake(), 'BODY': body(),
        'TOK_TALENT': tokens('talent'), 'TOK_MUKA_IN': tokens('muka_in'), 'TOK_MUKA_SP': tokens('muka_sp'), 'TOK_MANA': tokens('mana'),
        'ROLLTEMPLATE': optional('rolltemplate.html'),
        'WORKER': f'<script type="text/worker">\n{optional("worker.js")}\n</script>',
    }.items():
        mark = f'<!--@{key}-->'
        assert mark in html, mark
        html = html.replace(mark, val)
    css = (SRC / 'peekaboo.src.css').read_text(encoding='utf-8')
    assert '/*@GEN*/' in css
    css = css.replace('/*@GEN*/', gen_css())
    return html, css


if __name__ == '__main__':
    html, css = build()
    OUT.mkdir(exist_ok=True)
    (OUT / 'peekaboo.html').write_text(html, encoding='utf-8')
    (OUT / 'peekaboo.css').write_text(css, encoding='utf-8')
    print('wrote', OUT / 'peekaboo.html', OUT / 'peekaboo.css')
