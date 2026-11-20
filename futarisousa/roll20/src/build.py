"""둘이서 수사 Roll20 시트 빌드.

src/futarisousa.src.html 의 <!--@...--> 자리를 기능표 · 기벽 · 감정 표 · 상태이상 · 사전 조사 · 롤 템플릿 · sheet worker 로 채워
sheet/futarisousa.html 을 만든다. 표 · 이름은 여기 한 곳에만 두고 워커에도 같은 값을 넣는다(// @DATA).
칸 이름은 홈페이지 짝표(tpl/futari.json)의 열쇠 그대로 — role · cls · calm · worry · skill_묶음_차례 · repeating_acts …

    python3 build.py              # sheet/futarisousa.html
    python3 build.py --preview P  # 레이아웃 확인용 HTML(P) — 가상 Roll20 은 roll20kit/view.js
"""
import json
import pathlib
import sys

SRC = pathlib.Path(__file__).resolve().parent
OUT = SRC.parent / 'sheet'

# 기능: 속성 skill_<묶음 1~4>_<차례 1~6> (체크 = 습득) · 판정 단추 act_sk<묶음><차례> (Roll20 단추 이름에는 _ 를 피한다)
SKILLS = [
    ('통찰', ['거짓말', '변화', '외견', '물리', '현장', '날씨']),
    ('감식', ['교통', '정보', '지문', '과학', '법의학', '생물']),
    ('인간', ['사교', '가사', '소문', '설득', '유행', '비즈니스']),
    ('육체', ['포박', '방어', '끈기', '체력', '돌파', '추적']),
]
FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅']
# 감정 표A (D66 — 작은 눈이 앞) · 감정 표B (D10)
EMO_A = [('11', '얼굴'), ('12', '분위기'), ('13', '외견'), ('14', '수사 방법'), ('15', '행동거지'), ('16', '냄새'), ('22', '존재 자체'),
         ('23', '말씨'), ('24', '취미'), ('25', '별 이유 없이'), ('26', '남에 대한 태도'), ('33', '금전 감각'), ('34', '생활 습관'), ('35', '기능'),
         ('36', '복장'), ('44', '말하는 타이밍'), ('45', '윤리관'), ('46', '자신을 향한 태도'), ('55', '거리감'), ('56', '자신과의 관계'), ('66', '생활 관습')]
EMO_B = [('1', '인간성'), ('2', '취미'), ('3', '기능'), ('4', '별 이유 없이'), ('5', '감각'),
         ('6', '분위기'), ('7', '자신도 모르는 부분'), ('8', '자신이 잘 아는 부분'), ('9', '자신을 향한 태도'), ('10', '자신과의 관계')]
# 상태이상 cond_1 ~ cond_6
COND = [
    ('엇갈림', '체크가 되어 있는 동안 【마음고생】이 감소하지 않는다.'),
    ('탐정의 폭주', '체크가 되어 있는 동안 탐정 PC는 모든 판정에 [유리함]을 얻는다. 조수 PC는 모든 판정에 [불리함]을 받는다.'),
    ('다툼', '체크가 되어 있는 동안 【둘이서 수사】를 사용할 때 【여유】를 1점 감소해야만 한다.'),
    ('미아', '체크가 되어 있는 동안 「시추에이션 수사」 중에는 장면 플레이어만 판정에 참가할 수 있다.'),
    ('질 나쁜 소문', '체크가 되어 있는 동안 조수 PC가 게스트를 통해 얻은 기능을 습득하지 않은 것으로 간주한다.'),
    ('주목받음', '체크가 되어 있는 동안 「수사 곤란 레벨」이 1점 높은 것으로 간주한다.'),
]
CONFESS = ('· 탐정 PC는 위에 적힌 내용을 강렬한 감정으로 획득한다.\n· 모든 PC가 파트너에 대한 감정을 1개씩 획득한다.\n· 【여유】가 1D10점 상승한다.\n'
           '· 상태이상을 모두 회복한다.\n· 이번 세션 동안 한 번에 한해 판정 결과를 스페셜로 변경할 수 있다. 이때, 주사위를 굴려 6이 나온 것으로 간주한다.')
# 탐정 · 조수 시트 액션 표의 첫 줄 — 원본처럼 인쇄된 기본 액션 (이름 · 타입 · 코스트 · 효과). 말풍선 단추는 act_baseact
ACTS = {
    'det': ('둘이서 수사', '보조', '없음', '수사 페이즈에서 장면을 종료할 때 사용할 수 있다. 당신과 파트너는 서로에 대한 감정을 1개 심화함으로써 '
            '다음에 여는 장면을 「둘이서 수사 장면」으로 변경할 수 있다.'),
    'asi': ('따라잡다', '보조', '1', '판정의 주사위를 굴린 뒤에 사용할 수 있다. ①②의 효과를 얻는다. ①파트너에 대한 감정을 1개 심화함으로써 '
            '판정에 사용한 당신의 주사위를 다시 굴릴 수 있다. ②①의 효과로 주사위를 다시 굴릴 때, 굴리는 주사위를 10면체로 변경할 수 있다.'),
}
# 사전 조사 시트: (칸 번호, 묶음 1 가장 먼저 · 2 두 번째, 탐정 질문, 조수 질문) — 빈 질문은 그 사람 시트에 없음
PRE = [
    (1, 1, '어떤 탐정인가요?', '어떤 조수인가요?'),
    (2, 1, '이 캐릭터를 대표하는 행동', '이 캐릭터를 대표하는 행동'),
    (3, 1, '탐정으로서 하고 싶은 일', ''),
    (4, 2, '파트너가 해주기를 바라는 대우', '파트너가 해주기를 바라는 대우'),
    (5, 2, '', '탐정을 위해 하고 싶은 일'),
]


def skills():
    out = []
    for g, (group, names) in enumerate(SKILLS, 1):
        out.append(f'        <div class="srow"><b class="sg">{group}<i>▸</i></b>')
        for i, name in enumerate(names, 1):
            out.append(f'          <span class="sk"><input type="checkbox" name="attr_skill_{g}_{i}" value="1" title="{name} 습득">'
                       f'<button type="action" name="act_sk{g}{i}" title="{name} 판정">{name}</button></span>')
        out.append('        </div>')
    return '\n'.join(out)


def quirks():
    return '\n'.join(f'        <div class="quirk"><span>{f}</span><input type="text" name="attr_quirk_{i + 1}" title="기벽 {i + 1}"></div>'
                     for i, f in enumerate(FACES))


def table(rows, cols):
    """감정 표: 열 우선으로 cols 열에 나눠 담는다. <table> 은 Roll20 규정(Good Code)상 안 쓰고 div 그리드 (번호 · 글 칸을 줄 순서로)"""
    per = -(-len(rows) // cols)
    out = []
    for r in range(per):
        cells = []
        for c in range(cols):
            k = c * per + r
            cells.append(f'<span class="n">{rows[k][0]}</span><span>{rows[k][1]}</span>' if k < len(rows) else '<span class="n"></span><span></span>')
        out.append('            ' + ''.join(cells))
    return '\n'.join(out)


def cond():
    return '\n'.join(f'          <label class="st stc"><span class="no">{i + 1}</span><span class="sb"><b><input type="checkbox" name="attr_cond_{i + 1}" value="1">{n}</b>'
                     f'<small>{d}</small></span></label>' for i, (n, d) in enumerate(COND))


def pre(group):
    out = []
    for n, g, qd, qa in PRE:
        if g != group:
            continue
        cls = '' if qd and qa else (' k-det' if qd else ' k-asi')
        q = qd if qd == qa else (f'<span class="k-det">{qd}</span><span class="k-asi">{qa}</span>' if qd and qa else (qd or qa))
        out.append(f'          <div class="pi{cls}"><div class="pq">• {q}</div><div class="pirow"><input type="checkbox" name="attr_pre_c{n}" value="1" title="고르기">'
                   f'<textarea name="attr_pre_q{n}"></textarea></div></div>')
    return '\n'.join(out)


def baseact():
    return '\n'.join(f'      <div class="arow base k-{k}"><span>{n}</span><span>{t}</span><span>{c}</span><div class="be">{e}</div>'
                     f'<button type="action" name="act_baseact" class="use bub" title="채팅에 출력"></button></div>' for k, (n, t, c, e) in ACTS.items())


def data():
    return 'const DATA = ' + json.dumps({
        'skills': SKILLS, 'faces': FACES, 'emoA': EMO_A, 'emoB': EMO_B, 'cond': COND, 'acts': ACTS,
        'pre': PRE,
    }, ensure_ascii=False) + ';'


def optional(name):
    p = SRC / name
    return p.read_text(encoding='utf-8').rstrip() if p.exists() else ''


def build():
    html = (SRC / 'futarisousa.src.html').read_text(encoding='utf-8')
    worker = optional('worker.js')
    assert '// @DATA' in worker
    worker = worker.replace('// @DATA', data())
    for key, val in {
        'SKILLS': skills(), 'QUIRKS': quirks(), 'EMO_A': table(EMO_A, 3), 'EMO_B': table(EMO_B, 2), 'COND': cond(),
        'PRE1': pre(1), 'PRE2': pre(2), 'BASEACT': baseact(),
        'CONFESS': ''.join(f'<li>{l.lstrip("· ")}</li>' for l in CONFESS.split('\n')),
        'ROLLTEMPLATE': optional('rolltemplate.html'),
        'WORKER': f'<script type="text/worker">\n{worker}\n</script>',
    }.items():
        mark = f'<!--@{key}-->'
        assert mark in html, mark
        html = html.replace(mark, val)
    return html


if __name__ == '__main__':
    html = build()
    if len(sys.argv) == 3 and sys.argv[1] == '--preview':
        css = (OUT / 'futarisousa.css').read_text(encoding='utf-8')
        pathlib.Path(sys.argv[2]).write_text(
            '<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>body{margin:0;background:#e9e9ec}.charsheet{padding:16px}</style>'
            f'<style>{css}</style></head><body><div class="charsheet">{html}</div></body></html>', encoding='utf-8')
    else:
        OUT.mkdir(exist_ok=True)
        (OUT / 'futarisousa.html').write_text(html, encoding='utf-8')
        print('wrote', OUT / 'futarisousa.html')
