"""킬데스 비즈니스 Roll20 시트 빌드.

src/killdeath.src.html 의 <!--@...--> 자리를 특기 리스트 · 어빌리티 · 관계 · 헬 사이버 · 토큰(차지 · 블록 · 사망 횟수),
src/worker.js(sheet worker) · src/rolltemplate.html(채팅 카드)로 채워 sheet/killdeath.html 을,
src/killdeath.src.css 의 /*@GEN*/ 자리를 주사위 눈 · 토큰 채우기 규칙으로 채워 sheet/killdeath.css 를 만든다.

    python3 build.py
"""
import pathlib

SRC = pathlib.Path(__file__).resolve().parent
OUT = SRC.parent / 'sheet'

# 특기 리스트 (공식 시트 순서): 열 글자 · 분야 · 2~12 특기
FIELDS = [
    ('A', '직업', ['무직', '예술가', '연구자', '가사 도우미', '학생', '악한', '노동자', '탐정', '거물', '의사', '공무원']),
    ('B', '동작', ['외치기', '번뜩이기', '베기', '휘두르기', '던지기', '때리기', '차기', '뛰기', '쏘기', '잡기', '기다리기']),
    ('C', '소품', ['피어스', '머리 장식', '총', '목걸이', '벨트', '안경', '모자', '시계', '검', '반지', '타투']),
    ('D', '의상', ['네이키드', '아웃도어', '에스닉', '힙합', '밀리터리', '포멀', '트래드', '고딕', '펑크', '메탈', '아이돌']),
    ('E', '정동', ['사랑', '기쁨', '기대', '초조', '자부', '분노', '슬픔', '질투', '공포', '수치', '혐오']),
    ('F', '소망', ['죽음', '복수', '승리', '지배', '획득', '번영', '강화', '안전', '건강', '장수', '삶']),
]
GAPS = ['a', 'b', 'c', 'd', 'e']   # 분야 오른쪽 공백 (a = 직업|동작 … e = 정동|소망)
REL_ROWS = 6
CY_ROWS = 5
# 주사위 눈 자리 (%): 분야 이름 옆 1D6 분야 표시
PIPS = {1: [(50, 50)], 2: [(28, 28), (72, 72)], 3: [(25, 25), (50, 50), (75, 75)], 4: [(28, 28), (72, 28), (28, 72), (72, 72)],
        5: [(25, 25), (75, 25), (50, 50), (25, 75), (75, 75)], 6: [(28, 22), (72, 22), (28, 50), (72, 50), (28, 78), (72, 78)]}
# 토큰: (속성, 개수, 모양 class, 단추 앞부분)
TOKENS = {'charge': (3, 'bu'), 'block': (3, 'sh'), 'deaths': (6, 'sk')}


def gap(g, head=False):
    return (f'<label class="gap{" gh" if head else ""}"><input type="checkbox" name="attr_gap_{g}" value="1" title="공백 {g.upper()} 칠하기">'
            f'<span></span>{f"<b>{g.upper()}</b>" if head else ""}</label>')


def skills():
    out = [''.join(f'<div class="fh">{name}<span class="pip p{i + 1}">{"<i></i>" * (i + 1)}</span></div>' + (gap(GAPS[i], True) if i < 5 else '')
                   for i, (_, name, _) in enumerate(FIELDS)) + '<div class="no corner"></div>']
    for r in range(2, 13):
        line = ''
        for i, (col, _, names) in enumerate(FIELDS):
            n = names[r - 2]
            line += (f'<div class="c"><input type="checkbox" class="own" name="attr_{col}{r}" value="1" title="{n} 습득">'
                     f'<button type="action" class="n" name="act_r{col.lower()}{r}" title="{n} 판정">{n}</button>'
                     f'<span class="tn" name="attr_{col}{r}_value"></span></div>')
            if i < 5:
                line += gap(GAPS[i])
        out.append(line + f'<div class="no">{r}</div>')
    return '\n'.join(out)


def abilities():
    out = []
    for k in range(7, 0, -1):
        lv = '<span class="none">없음</span>' if k == 7 else f'<span class="lv"><input type="text" name="attr_ab{k}_level" title="레벨"></span>'
        out.append(f'<div class="ar{" kt" if k == 7 else ""}"><span><button type="action" class="dic" name="act_ab{k}" title="공격 판정"></button></span>'
                   f'<span class="rk">{k}</span><span class="nm"><input type="text" name="attr_ab{k}_name" title="리스크 {k} 어빌리티 이름"></span>{lv}'
                   f'<span><textarea name="attr_ab{k}_effect" title="효과"></textarea></span><span><input type="text" name="attr_ab{k}_skill" title="지정특기"></span></div>')
    return '\n'.join(out)


def relations():
    return '\n'.join(
        f'<div class="rr"><span><input type="checkbox" class="ck" name="attr_rel{i}_used" value="1" title="사용함"></span>'
        f'<span><input type="text" name="attr_rel{i}_name" title="관계 이름"></span><span><input type="text" name="attr_rel{i}_attr" title="속성"></span>'
        f'<span class="ctr"><input type="text" name="attr_rel{i}_depth" title="심도"><button type="action" class="bub" name="act_rel{i}" title="채팅에 출력"></button></span></div>'
        for i in range(1, REL_ROWS + 1))


def cyber():
    return '\n'.join(
        f'<div class="rr"><span><input type="text" name="attr_cy{i}_name" title="헬 사이버 이름"></span><span><input type="text" name="attr_cy{i}_effect" title="효과"></span>'
        f'<span><button type="action" class="bub" name="act_cy{i}" title="채팅에 출력"></button></span></div>'
        for i in range(1, CY_ROWS + 1))


def tokens(attr, pre):
    n, cls = TOKENS[attr]
    return (f'<span class="tok"><input type="hidden" class="hv" name="attr_{attr}" value="0">'
            + ''.join(f'<button type="action" class="tk {cls}" name="act_{pre}{k}" title="{k}"></button>' for k in range(1, n + 1)) + '</span>')


def gen_css():
    out = []
    for face, pts in PIPS.items():
        for j, (x, y) in enumerate(pts, 1):
            out.append(f'.kd .pip.p{face} i:nth-child({j}){{left:calc({x}% - 1.5px);top:calc({y}% - 1.5px)}}')
    # 토큰: 값 v 면 앞에서 v 개를 채운다 (숨은 칸 value 를 Roll20 이 고쳐 줌)
    fill = {'bu': 'background-color:var(--accent)', 'sh': 'background-color:var(--ink)',
            'sk': 'background-color:var(--accent);border-color:var(--accent);--eye:#ffffff'}
    for attr, (n, cls) in TOKENS.items():
        for v in range(1, n + 1):
            out.append(f'.kd .tok .hv[value="{v}"] ~ button[type=action].{cls}:nth-of-type(-n+{v}){{{fill[cls]}}}')
    return '\n'.join(out)


def optional(name):
    p = SRC / name
    return p.read_text(encoding='utf-8').rstrip() if p.exists() else ''


def build():
    html = (SRC / 'killdeath.src.html').read_text(encoding='utf-8')
    for key, val in {
        'SKILLS': skills(), 'ABILITIES': abilities(), 'RELATIONS': relations(), 'CYBER': cyber(),
        'TOK_CHARGE_PC': tokens('charge', 'chg'), 'TOK_BLOCK_PC': tokens('block', 'blk'), 'TOK_DEATHS': tokens('deaths', 'dth'),
        'TOK_CHARGE_TG': tokens('charge', 'tchg'), 'TOK_BLOCK_TG': tokens('block', 'tblk'),
        'ROLLTEMPLATE': optional('rolltemplate.html'),
        'WORKER': f'<script type="text/worker">\n{optional("worker.js")}\n</script>',
    }.items():
        mark = f'<!--@{key}-->'
        assert mark in html, mark
        html = html.replace(mark, val)
    css = (SRC / 'killdeath.src.css').read_text(encoding='utf-8')
    assert '/*@GEN*/' in css
    css = css.replace('/*@GEN*/', gen_css())
    return html, css


if __name__ == '__main__':
    html, css = build()
    OUT.mkdir(exist_ok=True)
    (OUT / 'killdeath.html').write_text(html, encoding='utf-8')
    (OUT / 'killdeath.css').write_text(css, encoding='utf-8')
    print('wrote', OUT / 'killdeath.html', OUT / 'killdeath.css')
