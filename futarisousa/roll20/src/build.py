"""둘이서 수사 Roll20 시트 빌드.

src/futarisousa.src.html 의 <!--@...--> 자리를 기능표 · 기벽 · 감정 표 · 상태이상 · 롤 템플릿 · sheet worker 로 채워
sheet/futarisousa.html 을 만든다. 표 · 기능 이름은 여기 한 곳에만 두고 워커에도 같은 값을 넣는다(// @DATA).

    python3 build.py              # sheet/futarisousa.html
    python3 build.py --preview P  # 레이아웃 확인용 HTML(P) — Roll20 밖에서 CSS 만 입혀 본다
"""
import json
import pathlib
import sys

SRC = pathlib.Path(__file__).resolve().parent
OUT = SRC.parent / 'sheet'

# 기능: (분야, [(속성 id, 이름) × 6]) — 속성은 sk_<id>, 굴림 단추는 act_r<id> (Roll20 단추 이름에는 _ 를 못 쓴다)
SKILLS = [
    ('통찰', [('lie', '거짓말'), ('change', '변화'), ('look', '외견'), ('physics', '물리'), ('scene', '현장'), ('weather', '날씨')]),
    ('감식', [('traffic', '교통'), ('info', '정보'), ('print', '지문'), ('science', '과학'), ('medical', '법의학'), ('bio', '생물')]),
    ('인간', [('social', '사교'), ('house', '가사'), ('rumor', '소문'), ('persuade', '설득'), ('trend', '유행'), ('business', '비즈니스')]),
    ('육체', [('bind', '포박'), ('guard', '방어'), ('endure', '끈기'), ('stamina', '체력'), ('breach', '돌파'), ('chase', '추적')]),
]
FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅']
# 감정 표A (D66 — 작은 눈이 앞) · 감정 표B (D10)
EMO_A = [('11', '얼굴'), ('12', '분위기'), ('13', '외견'), ('14', '수사 방법'), ('15', '행동거지'), ('16', '냄새'), ('22', '존재 자체'),
         ('23', '말씨'), ('24', '취미'), ('25', '별 이유 없이'), ('26', '남에 대한 태도'), ('33', '금전 감각'), ('34', '생활 습관'), ('35', '기능'),
         ('36', '복장'), ('44', '말하는 타이밍'), ('45', '윤리관'), ('46', '자신을 향한 태도'), ('55', '거리감'), ('56', '자신과의 관계'), ('66', '생활 관습')]
EMO_B = [('1', '인간성'), ('2', '취미'), ('3', '기능'), ('4', '별 이유 없이'), ('5', '감각'),
         ('6', '분위기'), ('7', '자신도 모르는 부분'), ('8', '자신이 잘 아는 부분'), ('9', '자신을 향한 태도'), ('10', '자신과의 관계')]
STATUS = [
    ('엇갈림', '체크가 되어 있는 동안 【마음고생】이 감소하지 않는다.'),
    ('탐정의 폭주', '체크가 되어 있는 동안 탐정 PC는 모든 판정에 [유리함]을 얻는다. 조수 PC는 모든 판정에 [불리함]을 받는다.'),
    ('다툼', '체크가 되어 있는 동안 【둘이서 수사】를 사용할 때 【여유】를 1점 감소해야만 한다.'),
    ('미아', '체크가 되어 있는 동안 「시추에이션 수사」 중에는 장면 플레이어만 판정에 참가할 수 있다.'),
    ('질 나쁜 소문', '체크가 되어 있는 동안 조수 PC가 게스트를 통해 얻은 기능을 습득하지 않은 것으로 간주한다.'),
    ('주목받음', '체크가 되어 있는 동안 「수사 곤란 레벨」이 1점 높은 것으로 간주한다.'),
]
# 새 시트 · 종류를 바꿀 때 액션 첫 줄 (이름, 타입, 코스트, 효과)
ACTIONS = {
    'det': ('둘이서 수사', '보조', '없음', '수사 페이즈에서 장면을 종료할 때 사용할 수 있다. 당신과 파트너는 서로에 대한 감정을 1개 심화함으로써 '
            '다음에 여는 장면을 「둘이서 수사 장면」으로 변경할 수 있다.'),
    'asi': ('따라잡다', '보조', '1', '판정의 주사위를 굴린 뒤에 사용할 수 있다. ①②의 효과를 얻는다. ①파트너에 대한 감정을 1개 심화함으로써 '
            '판정에 사용한 당신의 주사위를 다시 굴릴 수 있다. ②①의 효과로 주사위를 다시 굴릴 때, 굴리는 주사위를 10면체로 변경할 수 있다.'),
}


def skills():
    out = []
    for group, items in SKILLS:
        out.append(f'      <div class="srow"><b>{group}</b>')
        for sid, name in items:
            out.append(f'        <span class="sk"><input type="checkbox" name="attr_sk_{sid}" value="1" title="{name} 습득">'
                       f'<button type="action" name="act_r{sid}" title="{name} 판정">{name}</button></span>')
        out.append('      </div>')
    return '\n'.join(out)


def quirks():
    return '\n'.join(f'      <div class="quirk"><span>{f}</span><input type="text" name="attr_quirk{i + 1}" title="기벽 {i + 1}"></div>'
                     for i, f in enumerate(FACES))


def table(rows, cols):
    """감정 표: 열 우선으로 cols 열에 나눠 담는다."""
    per = -(-len(rows) // cols)
    out = []
    for r in range(per):
        cells = []
        for c in range(cols):
            k = c * per + r
            cells.append(f'<td class="n">{rows[k][0]}</td><td>{rows[k][1]}</td>' if k < len(rows) else '<td class="n"></td><td></td>')
        out.append('          <tr>' + ''.join(cells) + '</tr>')
    return '\n'.join(out)


def status():
    return '\n'.join(f'          <label class="st"><span class="no">{i + 1}</span><span class="sb"><b><input type="checkbox" name="attr_st{i + 1}" value="1">{n}</b>'
                     f'<small>{d}</small></span></label>' for i, (n, d) in enumerate(STATUS))


def data():
    return 'const DATA = ' + json.dumps({
        'skills': [[g, items] for g, items in SKILLS], 'faces': FACES, 'emoA': EMO_A, 'emoB': EMO_B, 'status': STATUS, 'actions': ACTIONS,
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
        'SKILLS': skills(), 'QUIRKS': quirks(), 'EMO_A': table(EMO_A, 3), 'EMO_B': table(EMO_B, 2), 'STATUS': status(),
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
        dark = ' class="sheet-darkmode"' if '--dark' in sys.argv else ''
        pathlib.Path(sys.argv[2]).write_text(
            f'<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>body{{margin:0;background:#e9e9ec}}.charsheet{{padding:16px}}</style>'
            f'<style>{css}</style></head><body{dark}><div class="charsheet">{html}</div></body></html>', encoding='utf-8')
    else:
        OUT.mkdir(exist_ok=True)
        (OUT / 'futarisousa.html').write_text(html, encoding='utf-8')
        print('wrote', OUT / 'futarisousa.html')
