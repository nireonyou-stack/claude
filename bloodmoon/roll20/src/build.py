"""블러드문 Roll20 시트 빌드.

src/bloodmoon.src.html 의 <!--@...--> 자리를 특기표 · 부위 · 텐션/광기 칸 · 팔로워 어빌리티 칸,
src/worker.js(sheet worker) · src/rolltemplate.html(롤 템플릿)로 채워 sheet/bloodmoon.html 을 만든다.

    python3 build.py              # sheet/bloodmoon.html
    python3 build.py --preview P  # 레이아웃 확인용 HTML(P) — Roll20 밖에서 CSS 만 입혀 본다
"""
import pathlib
import sys

SRC = pathlib.Path(__file__).resolve().parent
OUT = SRC.parent / 'sheet'

# 특기 리스트: (속성용 영문 id, 분야명, 2~12 특기)
FIELDS = [
    ('soc', '사회', ['두려워하기', '위협하기', '생각하지 않기', '자신감', '침묵하기', '전하기', '속이기', '지위', '웃기', '말하기', '화내기']),
    ('head', '머리', ['듣기', '감각기', '보기', '반응', '생각하기', '뇌', '직감', '예감', '외치기', '입', '물기']),
    ('arm', '팔', ['조이기', '때리기', '베기', '주팔', '쏘기', '조작', '찌르기', '반대팔', '휘두르기', '잡기', '던지기']),
    ('body', '동체', ['막기', '호흡기', '멈추기', '받기', '재기', '심장', '비껴내기', '피하기', '견디기', '소화기', '떨어지기']),
    ('leg', '다리', ['달리기', '다가가기', '차기', '주다리', '뛰어오르기', '설치하기', '밟기', '반대다리', '기어가기', '숙이기', '걷기']),
    ('env', '환경', ['쉬기', '일상', '숨기', '기다리기', '나타나기', '인맥', '포획하기', '열기', '도망치기', '퇴로', '쉬지 않기']),
]
TRI = {'두려워하기', '조이기', '달리기', '화내기', '던지기', '걷기'}   # 공황 시 사용불능(▲)
# 부위 대미지: (속성 id, 부위 특기, 신체부위 결정표 눈)
BODY = [('brain', '뇌', 2), ('armm', '주팔', 3), ('legm', '주다리', 4), ('digest', '소화기', 5), ('sense', '감각기', 6),
        ('mouth', '입', 8), ('breath', '호흡기', 9), ('lego', '반대다리', 10), ('armo', '반대팔', 11), ('heart', '심장', 12)]
MIND = [('conf', '자신감'), ('status', '지위'), ('daily', '일상'), ('contact', '인맥'), ('retreat', '퇴로')]
PART_NAMES = {n for _, n, _ in BODY} | {n for _, n in MIND}
GAPS = 'abcde'


def skills():
    """특기표 격자: 머리줄(분야 · 갭 글자) + 11줄(번호 · 칸 · 갭 막대)."""
    out = ['    <div></div>']
    for i, (_, head, _) in enumerate(FIELDS):
        out.append(f'    <div class="hd">{head}</div>')
        if i < 5:
            out.append(f'    <label class="gh" title="갭 {GAPS[i].upper()} 열 칠하기"><input type="checkbox" name="attr_gap_{GAPS[i]}" value="1"><span>{GAPS[i].upper()}</span></label>')
    for r in range(11):
        out.append(f'    <div class="no">{r + 2}</div>')
        for i, (fid, _, names) in enumerate(FIELDS):
            n, sid = names[r], f'{fid}{r + 2}'
            cls = 'c part' if n in PART_NAMES else 'c'
            tri = '<span class="tri">▲</span>' if n in TRI else ''
            out.append(
                f'    <div class="{cls}"><input type="hidden" class="offv" name="attr_sk_{sid}_off" value="0">'
                f'<input type="checkbox" class="own" name="attr_sk_{sid}" value="1" title="{n} 습득">'
                f'<button type="action" class="n" name="act_r{sid}" title="{n} 행동판정">{n}{tri}</button>'
                f'<span class="t" name="attr_sk_{sid}_tn">12</span><span class="hatch"></span></div>')
            if i < 5:
                out.append(f'    <label class="gap"><input type="checkbox" name="attr_gap_{GAPS[i]}" value="1"><span></span></label>')
    return '\n'.join(out)


def parts():
    out = [f'    <label><input type="checkbox" name="attr_dmg_{pid}" value="1"> {n}<sub>{no}</sub></label>' for pid, n, no in BODY]
    out.append('    <span class="sep"></span>')
    out += [f'    <label><input type="checkbox" name="attr_dmg_{pid}" value="1"> {n}</label>' for pid, n in MIND]
    return '\n'.join(out)


def track(attr, top):
    """0~top 라디오. 0 은 되돌리기 칸, 누른 칸까지 채워진다(:checked ~ 는 빈 칸). 10·20·30 은 격정 칸이라 음영."""
    out = [f'      <input type="radio" class="z" name="attr_{attr}" value="0" checked title="0으로">']
    ten = ' class="ten"'
    out += [f'      <input type="radio" name="attr_{attr}" value="{i}"{ten if i % 10 == 0 else ""}>' for i in range(1, top + 1)]
    return '\n'.join(out)


def follower_abilities():
    row = ('          <div class="fa"><button type="action" name="act_ab{k}" class="dice" title="팔로워 어빌리티 사용"></button>'
           '<input type="text" name="attr_ab{k}_name" placeholder="어빌리티"><input class="ag" type="text" name="attr_ab{k}_group" placeholder="그룹">'
           '<select class="pill" name="attr_ab{k}_type"><option value="" selected></option><option value="공격">공격</option><option value="보조">보조</option><option value="지원">지원</option><option value="상주">상주</option></select>'
           '<input type="text" name="attr_ab{k}_cost" placeholder="코스트"><input class="as" type="text" name="attr_ab{k}_skill" placeholder="지정특기">'
           '<textarea class="eff" name="attr_ab{k}_effect" placeholder="효과…"></textarea></div>')
    return '\n'.join(row.format(k=k) for k in (1, 2, 3))


def optional(name):
    p = SRC / name
    return p.read_text(encoding='utf-8').rstrip() if p.exists() else ''


def build():
    html = (SRC / 'bloodmoon.src.html').read_text(encoding='utf-8')
    for key, val in {
        'SKILLS': skills(), 'PARTS': parts(), 'TENSION': track('tension', 30), 'MADNESS': track('madness', 10),
        'FOLLOWER_ABILITIES': follower_abilities(),
        'ROLLTEMPLATE': optional('rolltemplate.html'),
        'WORKER': f'<script type="text/worker">\n{optional("worker.js")}\n</script>' if (SRC / 'worker.js').exists() else '',
    }.items():
        mark = f'<!--@{key}-->'
        assert mark in html, mark
        html = html.replace(mark, val)
    return html


if __name__ == '__main__':
    html = build()
    if len(sys.argv) == 3 and sys.argv[1] == '--preview':
        css = (OUT / 'bloodmoon.css').read_text(encoding='utf-8')
        pathlib.Path(sys.argv[2]).write_text(
            '<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>body{margin:0;background:#e9e9ec}.charsheet{padding:16px}</style>'
            f'<style>{css}</style></head><body><div class="charsheet">{html}</div></body></html>', encoding='utf-8')
    else:
        OUT.mkdir(exist_ok=True)
        (OUT / 'bloodmoon.html').write_text(html, encoding='utf-8')
        print('wrote', OUT / 'bloodmoon.html')
