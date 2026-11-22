"""아마데우스 Roll20 시트 빌드.

src/amadeus.src.html 의 <!--@...--> 자리를 능력치 · 롤 템플릿 · sheet worker 로 채워 sheet/amadeus.html 을 만든다.
능력치 이름 · 계수 · 인쇄 문구는 여기 한 곳에만 두고 워커에도 같은 값을 넣는다(// @DATA).
시트에 넣는 글은 공식 캐릭터 시트에 인쇄된 것만 (Roll20 PR 규정 — roll20kit/LESSONS.md 5장).

    python3 build.py   # sheet/amadeus.html — 가상 Roll20 은 roll20kit/view.js
"""
import json
import pathlib
import sys

SRC = pathlib.Path(__file__).resolve().parent
OUT = SRC.parent / 'sheet'
sys.path.insert(0, str(SRC.parents[2] / 'roll20kit'))
import autogrow  # noqa: E402  글이 늘어나면 칸도 늘어나는 textarea

# 능력치: (열쇠, 이름, 영문) — 공식 시트 배치대로 두 줄씩 (무용 | 영력, 기술 | 사랑, 두뇌 | 일상)
ABIL = [('war', '무용', 'WARFARE'), ('spi', '영력', 'SPIRIT'), ('tec', '기술', 'TECHNIQUE'),
        ('lov', '사랑', 'LOVE'), ('bra', '두뇌', 'BRAIN'), ('mun', '일상', 'MUNDANE')]
# 생명력 기본 = 무용 · 영력의 랭크 계수 + 모드 계수 (룰 1·03·01·01 생명력 산출표). 평가 글자(예: A+)를 읽어 계산
HP_RANK = {'S': 10, 'A': 7, 'B': 5, 'C': 3, 'D': 1}
HP_MODE = {'3': 6, '2': 3, '1': 1, '0': 0, '-1': -1, '-2': -2}
# 공식 캐릭터 시트에 인쇄된 문구 (번역)
BLESSING = ('부모신의 축복', '보조', '※', '없음',
            '자신이 판정을 할 때, 그 판정이 자신의 부모신의 권능에 관한 것이라면 판정의 주사위를 굴리기 전에 사용할 수 있다. '
            '자신의 【생명력】을 2점 소비할 때마다 그 판정의 달성치가 1점 상승한다. '
            '단, 【생명력】은 [자신의 속성과 같은 영역의 각성단계×2]점까지만 소비할 수 있다.')
FOOD = '휴식 시에 식사를 하는 것으로 【생명력】을 1점 회복할 수 있다.'
# 운명의 수레바퀴: 무드 다이스 눈 → 영역 (1 흑 · 2 적 · 3 청 · 4 녹 · 5 백 · 6 아무 곳)
WHEEL = ['흑', '적', '청', '녹', '백', '아무 곳']


def abilities():
    """능력치 칸: 이름(판정 단추) · 평가 · 다이스 개수 · 수정 — 셋 다 직접 입력 (공식 시트처럼). 평가가 D 면 '낮은 눈' 표시는 워커가"""
    out = []
    for k, name, eng in ABIL:
        out.append(
            f'      <div class="ab">\n'
            f'        <button type="action" name="act_{k}" class="nm" title="{name} 판정"><b>{name}</b><i>{eng}</i></button>\n'
            f'        <div class="ev"><small>평가</small><input type="text" class="g" name="attr_{k}_grade" title="{name} 평가"></div>\n'
            f'        <div class="dc"><small>다이스</small><span class="dn"><input type="number" class="v" name="attr_{k}_dice" min="1" title="{name} 다이스 개수"><i>개</i></span>'
            f'<small class="lo" name="attr_{k}_low"></small></div>\n'
            f'        <div class="dc"><small>수정</small><input type="text" class="v" name="attr_{k}_mod" title="{name} 수정"></div>\n'
            f'      </div>')
    return '\n'.join(out)


def rolltemplate():
    """판정 카드의 주사위 칸: 4개까지. a = 액션 다이스 차례 · x<i> = 보이는 다른 다이스 · m = 무드 다이스(인과)가 있는 판정."""
    def chips(i):
        return ''.join(f'{{{{#rollTotal() computed::d{i} {v}}}}}<i class="sheet-k sheet-k{v}" title="{WHEEL[v - 1]}"></i>{{{{/rollTotal() computed::d{i} {v}}}}}'
                       for v in range(1, 7))
    dice = ''
    for i in range(1, 5):
        mood = f'{{{{#rollTotal() computed::m 1}}}}{chips(i)}{{{{/rollTotal() computed::m 1}}}}'
        dice += (f'{{{{#rollTotal() computed::a {i}}}}}<span class="sheet-die sheet-act"><b>{{{{computed::d{i}}}}}</b>{mood}</span>{{{{/rollTotal() computed::a {i}}}}}'
                 f'{{{{#rollTotal() computed::x{i} 1}}}}<span class="sheet-die"><b>{{{{computed::d{i}}}}}</b>{mood}</span>{{{{/rollTotal() computed::x{i} 1}}}}')
    return (SRC / 'rolltemplate.html').read_text(encoding='utf-8').replace('<!--@DICE-->', dice).rstrip()


def data():
    return 'const DATA = ' + json.dumps({
        'abil': ABIL, 'hpRank': HP_RANK, 'hpMode': HP_MODE, 'blessing': BLESSING, 'food': FOOD,
    }, ensure_ascii=False) + ';'


def build():
    html = (SRC / 'amadeus.src.html').read_text(encoding='utf-8')
    worker = (SRC / 'worker.js').read_text(encoding='utf-8')
    assert '// @DATA' in worker
    worker = worker.replace('// @DATA', data())
    n, cat, cond, chk, eff = BLESSING
    for key, val in {
        'ABIL': abilities(), 'BLESSING': f'<span class="gn">{n}</span><span class="c">{cat}</span><span class="c">{cond}</span><span class="c">{chk}</span><span></span><span class="ef">{eff}</span>',
        'FOOD': FOOD, 'ROLLTEMPLATE': rolltemplate(), 'WORKER': f'<script type="text/worker">\n{worker}\n</script>',
    }.items():
        mark = f'<!--@{key}-->'
        assert mark in html, mark
        html = html.replace(mark, val)
    return html


if __name__ == '__main__':
    OUT.mkdir(exist_ok=True)
    (OUT / 'amadeus.html').write_text(autogrow.wrap(build()), encoding='utf-8')
    css = OUT / 'amadeus.css'   # CSS 는 sheet 쪽 파일을 직접 고친다 — 자동 늘리기 구역만 다시 만든다
    css.write_text(autogrow.css(css.read_text(encoding='utf-8'), '.amadeus'), encoding='utf-8')
    print('wrote', OUT / 'amadeus.html')
