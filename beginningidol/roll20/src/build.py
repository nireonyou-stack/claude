"""비기닝 아이돌 Roll20 시트 빌드.

src/beginningidol.src.html 의 <!--@...--> 자리를 특기 리스트 · 아이돌 링크 · 아이돌 스킬 · 리액션 표 · 이해 · 추억 · 멘탈,
src/worker.js(sheet worker) · src/rolltemplate.html(채팅 카드)로 채워 sheet/beginningidol.html 을,
src/beginningidol.src.css 의 /*@GEN*/ 자리를 주사위 눈 규칙으로 채워 sheet/beginningidol.css 를 만든다.

    python3 build.py
"""
import pathlib

SRC = pathlib.Path(__file__).resolve().parent
OUT = SRC.parent / 'sheet'

# 특기 리스트 (공식 시트 순서): 열 글자 · 분야 · 2~12 특기 ('' = 직접 적는 칸)
FIELDS = [
    ('A', '신장', ['~125', '131', '136', '141', '146', '156', '166', '171', '176', '180', '190~']),
    ('B', '속성', ['에스닉', '다크', '섹시', '페미닌', '큐트', '플레인', '패션', '팝', '버닝', '쿨', '스타']),
    ('C', '재능', ['이국 문화', '스타일', '집중력', '담력', '체력', '미소', '운동 신경', '배려', '학력', '셀럽', '연기력']),
    ('D', '캐릭터', ['중2병', '미스터리어스', '마이페이스', '연파', '말꼬리', '', '활기', '경파', '공손함', '덜렁이', '바보']),
    ('E', '취미', ['오컬트', '펫', '스포츠', '멋내기', '요리', '', '쇼핑', '댄스', '게임', '음악', '아이돌']),
    ('F', '출신', ['오키나와', '규슈', '시코쿠', '주고쿠', '긴키', '주부', '간토', '호쿠리쿠', '도호쿠', '홋카이도', '해외']),
]
GAPS = ['a', 'b', 'c', 'd', 'e']
PIPS = {1: [(50, 50)], 2: [(28, 28), (72, 72)], 3: [(25, 25), (50, 50), (75, 75)], 4: [(28, 28), (72, 28), (28, 72), (72, 72)],
        5: [(25, 25), (75, 25), (50, 50), (25, 75), (75, 75)], 6: [(28, 22), (72, 22), (28, 50), (72, 50), (28, 78), (72, 78)]}
# 아이돌 링크 (공식 시트에 인쇄된 6 개)
LINKS = [('멘탈 케어', '언제든지 사용할 수 있다. 캐릭터 한 명의 【멘탈】을 1D6점 상승시킨다.'),
         ('트레이닝+', '드라마 페이즈의 장면이 종료하기 직전에 사용할 수 있다. 그 장면의 장면 플레이어는 「특훈」을 한다.'),
         ('커버 포지션', '캐릭터 한 명이 판정의 주사위를 굴린 직후에 사용할 수 있다. 그 판정에 사용한 주사위를 모두 다시 굴린다.'),
         ('싱크로', '캐릭터 한 명이 퍼포먼스 판정을 한 직후(주사위를 제거하기 전)에 사용할 수 있다. 그 퍼포먼스에 사용한 주사위를 1개 골라 다시 굴린다.'),
         ('심퍼시', '캐릭터 한 명이 판정 혹은 퍼포먼스 판정을 한 직후에 사용할 수 있다. 그 PC에 대해 「이해」를 얻는다.'),
         ('디스커션', '언제든지 사용할 수 있다. 「변조」를 모두 회복한다.')]
SKILL_ROWS = 6
MENTAL_MAX = 50


def gap(g, head=False):
    star = f'<b>{g.upper()}</b>' if head else ''   # 머리줄: 별 모양 안에 공백 글자
    return (f'<label class="gap{" gh" if head else ""}"><input type="checkbox" name="attr_gap_{g}" value="1" title="공백 {g.upper()} 칠하기">'
            f'<span></span>{star}</label>')


def skills():
    out = ['<div class="no corner"></div>' + ''.join(
        f'<div class="fh">{name}<span class="pip p{i + 1}">{"<i></i>" * (i + 1)}</span></div>' + (gap(GAPS[i], True) if i < 5 else '')
        for i, (_, name, _) in enumerate(FIELDS))]
    for r in range(2, 13):
        line = f'<div class="no">{r}</div>'
        for i, (col, _, names) in enumerate(FIELDS):
            n, key = names[r - 2], f'{col}{r}'
            if n:
                cls = ' long' if len(n) >= 6 else ''
                body = f'<button type="action" class="n{cls}" name="act_r{key.lower()}" title="{n} 판정">{n}</button>'
                line += f'<div class="c"><input type="checkbox" class="own" name="attr_{key}" value="1" title="습득">{body}<span class="tn" name="attr_{key}_value"></span></div>'
            else:
                line += (f'<div class="c free"><input type="checkbox" class="own" name="attr_{key}" value="1" title="습득">'
                         f'<input type="text" name="attr_{key}_name" title="직접 적는 특기"><button type="action" class="dic" name="act_r{key.lower()}" title="판정"></button>'
                         f'<span class="tn" name="attr_{key}_value"></span></div>')
            if i < 5:
                line += gap(GAPS[i])
        out.append(line)
    return '\n'.join(out)


def links():
    return '\n'.join(
        f'<div class="li"><div class="lh">{i}. {n}<span class="sp"></span><button type="action" class="bub" name="act_link{i}" title="채팅에 출력"></button>'
        f'<input type="checkbox" class="x" name="attr_link{i}_used" value="1" title="사용함"></div><p>{e}</p></div>'
        for i, (n, e) in enumerate(LINKS, 1))


def idol_skills():
    out = []
    for i in range(1, SKILL_ROWS + 1):
        ty = (f'<input type="radio" class="none" name="attr_sk{i}_type" value="" checked>'
              f'<label class="tyk"><input type="radio" name="attr_sk{i}_type" value="보조"><span>보조</span></label><i>&#x00B7;</i>'
              f'<label class="tyk"><input type="radio" name="attr_sk{i}_type" value="상주"><span>상주</span></label>')
        out.append(f'<div class="srow"><span><button type="action" class="dic" name="act_sk{i}" title="사용 (지정특기가 있으면 판정)"></button></span>'
                   f'<span class="nm"><input type="text" name="attr_sk{i}_name" title="아이돌 스킬 {i}"></span><span class="ty">{ty}</span>'
                   f'<span><input type="text" name="attr_sk{i}_skill" title="지정특기"></span><span><textarea name="attr_sk{i}_effect" title="효과"></textarea></span></div>')
    return '\n'.join(out)


def reactions():
    return '\n'.join(f'<div class="re"><b>{i}</b><input type="text" name="attr_re{i}" title="리액션 {i}"></div>' for i in range(1, 7))


def understanding():
    return '\n'.join(f'<div class="un"><input type="text" name="attr_un{i}_name" title="이해 대상 {i}"><span>에 대한 이해</span>'
                     f'<input type="checkbox" class="box" name="attr_un{i}" value="1" title="이해 {i}"></div>' for i in range(1, 7))


def memories():
    return '\n'.join(f'<div class="mi"><label class="heart" title="사용함"><input type="checkbox" name="attr_mem{i}_used" value="1"><span></span></label>'
                     f'<div><div class="lab">No.{i}</div><input type="text" name="attr_mem{i}" title="추억 {i}"></div></div>' for i in range(1, 4))


def mental():
    return ('<input type="radio" class="none" name="attr_mental" value="" checked>'
            + ''.join(f'<label class="mt"><input type="radio" name="attr_mental" value="{k}"><span>{k}</span></label>' for k in range(MENTAL_MAX + 1)))


def gen_css():
    out = []
    for face, pts in PIPS.items():
        for j, (x, y) in enumerate(pts, 1):
            out.append(f'.bi .pip.p{face} i:nth-child({j}){{left:calc({x}% - 1.5px);top:calc({y}% - 1.5px)}}')
    return '\n'.join(out)


def optional(name):
    p = SRC / name
    return p.read_text(encoding='utf-8').rstrip() if p.exists() else ''


def build():
    html = (SRC / 'beginningidol.src.html').read_text(encoding='utf-8')
    for key, val in {
        'SKILLS': skills(), 'LINKS': links(), 'IDOL_SKILLS': idol_skills(), 'REACTIONS': reactions(),
        'UNDERSTANDING': understanding(), 'MEMORIES': memories(), 'MENTAL': mental(),
        'ROLLTEMPLATE': optional('rolltemplate.html'),
        'WORKER': f'<script type="text/worker">\n{optional("worker.js")}\n</script>',
    }.items():
        mark = f'<!--@{key}-->'
        assert mark in html, mark
        html = html.replace(mark, val)
    css = (SRC / 'beginningidol.src.css').read_text(encoding='utf-8')
    assert '/*@GEN*/' in css
    css = css.replace('/*@GEN*/', gen_css())
    return html, css


if __name__ == '__main__':
    html, css = build()
    OUT.mkdir(exist_ok=True)
    (OUT / 'beginningidol.html').write_text(html, encoding='utf-8')
    (OUT / 'beginningidol.css').write_text(css, encoding='utf-8')
    print('wrote', OUT / 'beginningidol.html', OUT / 'beginningidol.css')
