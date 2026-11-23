"""비기닝 아이돌 Roll20 시트 빌드.

src/beginningidol.src.html 의 <!--@...--> 자리를 특기 리스트 · 아이돌 링크 · 아이돌 스킬 · 리액션 표 · 이해 · 추억 · 멘탈 · 의상,
유닛 시트의 유닛 파워 · 변조,
src/worker.js(sheet worker) · src/rolltemplate.html(채팅 카드)로 채워 sheet/beginningidol.html 을,
src/beginningidol.src.css 의 /*@GEN*/ 자리를 주사위 눈 규칙으로 채워 sheet/beginningidol.css 를 만든다.

    python3 build.py
"""
import pathlib
import sys

SRC = pathlib.Path(__file__).resolve().parent
OUT = SRC.parent / 'sheet'
sys.path.insert(0, str(SRC.parents[2] / 'roll20kit'))
import autogrow  # noqa: E402  글이 늘어나면 칸도 늘어나는 textarea

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
LINK_ROWS = 6                    # 아이돌 링크
SKILL_ROWS = 6
MENTAL_MAX, MENTAL_HI = 50, 80   # 의상 「80s」 를 입으면 상한 80 (51~80 칸은 상한 80 체크 때만 보임)
COS_ROWS = 3                     # 의상 코디 최대 3 브랜드
UP_ROWS = 5                      # 유닛 파워
# 변조 (유닛 시트 · 룰북 5·01·06 변조표)
CONDS = [('불온한 공기', '유닛 멤버의 【멘탈】이 감소할 때, 감소하는 값을 1점 더 늘린다.'),
         ('미묘한 거리감', '유닛 멤버는 「이해」를 할 수 없게 된다.'),
         ('실패에 대한 불안', '유닛 멤버의 펌블치가 1점 상승한다.'),
         ('멤버의 부상', '유닛 멤버는 「막간」에 【멘탈】을 상승시킬 수 없게 된다.'),
         ('논란', '유닛 멤버가 퍼포먼스 판정을 할 때, 모든 능력치를 1점 낮은 것으로 취급한다.'),
         ('엇갈림', '유닛 멤버는 아이돌 링크를 사용할 수 없다.')]


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
        f'<div class="li"><div class="lh">{i}.<input type="text" name="attr_link{i}_name" title="아이돌 링크 이름"><button type="action" class="bub" name="act_link{i}" title="채팅에 출력"></button>'
        f'<input type="checkbox" class="x" name="attr_link{i}_used" value="1" title="사용함"></div><textarea name="attr_link{i}_text" title="효과"></textarea></div>'
        for i in range(1, LINK_ROWS + 1))


def idol_skills():
    out = []
    for i in range(1, SKILL_ROWS + 1):
        ty = type_radio(f'sk{i}_type')
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
            + ''.join(f'<label class="mt{" hi" if k > MENTAL_MAX else ""}"><input type="radio" name="attr_mental" value="{k}"><span>{k}</span></label>'
                      for k in range(MENTAL_HI + 1)))


def type_radio(attr):
    return (f'<input type="radio" class="none" name="attr_{attr}" value="" checked>'
            f'<label class="tyk"><input type="radio" name="attr_{attr}" value="보조"><span>보조</span></label><i>&#x00B7;</i>'
            f'<label class="tyk"><input type="radio" name="attr_{attr}" value="상주"><span>상주</span></label>')


def costumes():
    return '\n'.join(f'<div class="cr"><b>{i}</b><span class="nm"><input type="text" name="attr_cos{i}_brand" title="의상 브랜드 {i}"></span>'
                     f'<span><textarea name="attr_cos{i}_effect" title="효과"></textarea></span>'
                     f'<span><button type="action" class="bub" name="act_cos{i}" title="채팅에 출력"></button></span></div>' for i in range(1, COS_ROWS + 1))


def unit_powers():
    return '\n'.join(f'<div class="srow"><span><button type="action" class="bub" name="act_up{i}" title="채팅에 출력"></button></span>'
                     f'<span class="nm"><input type="text" name="attr_up{i}_name" title="유닛 파워 {i}"></span><span class="ty">{type_radio(f"up{i}_type")}</span>'
                     f'<span><textarea name="attr_up{i}_effect" title="효과"></textarea></span></div>' for i in range(1, UP_ROWS + 1))


def conditions():
    return '\n'.join(f'<div class="cd"><input type="checkbox" class="ck" name="attr_cond{i}" value="1" title="받는 중">'
                     f'<b>{i}. {n}</b><p>{e}</p></div>' for i, (n, e) in enumerate(CONDS, 1))


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
        'COSTUMES': costumes(), 'UNIT_POWERS': unit_powers(), 'CONDITIONS': conditions(),
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
    html, css = autogrow.wrap(html), autogrow.css(css, '.bi')
    OUT.mkdir(exist_ok=True)
    (OUT / 'beginningidol.html').write_text(html, encoding='utf-8')
    (OUT / 'beginningidol.css').write_text(css, encoding='utf-8')
    print('wrote', OUT / 'beginningidol.html', OUT / 'beginningidol.css')
