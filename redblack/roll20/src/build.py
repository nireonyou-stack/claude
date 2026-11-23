"""적과 흑 Roll20 시트 빌드.

src/redblack.src.html 의 <!--@...--> 자리를 카드 패드 · 낸 카드 칸 · 문장 · 기본/상급 선언 · 권한 마법,
src/worker.js(sheet worker) · src/rolltemplate.html(채팅 카드, 낸 카드 칩 자리는 여기서 만든다)로 채워 sheet/redblack.html 을 만든다.
CSS 는 src/redblack.src.css 를 그대로 sheet/redblack.css 로 옮긴다.

    python3 build.py
"""
import pathlib
import sys

SRC = pathlib.Path(__file__).resolve().parent
OUT = SRC.parent / 'sheet'
sys.path.insert(0, str(SRC.parents[2] / 'roll20kit'))
import autogrow  # noqa: E402  글이 늘어나면 칸도 늘어나는 textarea

RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
SLOTS = 10   # 낸 카드 칸 수
CREST_N = 3
BASIC_N = 6
NOBLE_N = 6
AUTH_N = 9


def pad(color):
    # 광대는 덱에 1장, 적이면서 흑 (룰북 52쪽) → 흑 줄 끝에 단추 1개 (act_jx)
    keys = [(k.lower(), k) for k in RANKS]
    jk = '<button type="action" class="jk" name="act_jx" title="광대 (적 · 흑 양쪽)">광대</button>' if color == 'b' else ''
    return (f'<span class="pad{" rd" if color == "r" else ""}">'
            + ''.join(f'<button type="action" class="pk" name="act_{color}{k}" title="{"흑" if color == "b" else "적"} {lab}">{lab}</button>' for k, lab in keys)
            + jk + '</span>')


def hand():
    return ''.join(f'<span class="slot"><input type="hidden" class="pv" name="attr_pc{i}" value="">'
                   f'<button type="action" class="pc" name="act_pcx{i}" title="빼기"><span class="k" name="attr_pc{i}_k"></span><span class="s" name="attr_pc{i}_s"></span></button></span>'
                   for i in range(1, SLOTS + 1))


def crests():
    """문장: 이름 · 해금 · 묘사 · 효과 — 모두 직접 기입"""
    return '\n'.join(f'<div class="em orn"><input type="hidden" class="cm" name="attr_crest{i}_on" value="0"><div class="eh"><b>문장</b><input type="text" name="attr_crest{i}_name" title="문장 이름">'
                     f'<label class="ul"><input type="checkbox" class="ck" name="attr_crest{i}_on" value="1" title="해금">해금</label></div>'
                     f'<div class="ds"><i>묘사</i><textarea name="attr_crest{i}_desc" title="묘사"></textarea></div>'
                     f'<textarea class="tx" name="attr_crest{i}_text" title="효과"></textarea></div>' for i in range(1, CREST_N + 1))


def calling(key, n, what):
    """선언 마법 칸 (기본 bc · 상급 nc): 이름 · LV · 〔기동〕 · 효과 — 모두 직접 기입"""
    return '\n'.join(f'<div class="mg orn"><div class="mh"><b>선언</b><input type="text" class="nm" name="attr_{key}{i}_name" title="{what} 이름"><span class="lv">LV<input type="number" name="attr_{key}{i}_lv" title="LV"></span></div>'
                     f'<div class="boot"><span class="bt"><span>〔기동〕</span><input type="text" name="attr_{key}{i}_boot" title="기동"></span></div>'
                     f'<textarea class="tx" name="attr_{key}{i}_text" title="효과"></textarea><div class="ft"><button type="action" class="bub" name="act_{key}{i}" title="기동해 채팅에 올림"></button></div></div>'
                     for i in range(1, n + 1))


def auth():
    return '\n'.join(f'<div class="mg au orn"><div class="mh"><b>권한</b><input type="text" class="nm" name="attr_au{i}_name" title="권한 마법 이름"><span></span></div>'
                     f'<div class="boot"><span class="bt"><input type="text" class="bv" name="attr_au{i}_boot" title="기동"></span>'
                     f'<span class="bt c"><span>흑색:</span><input type="text" name="attr_au{i}_black" title="흑색"></span>'
                     f'<span class="bt c r"><span>적색:</span><input type="text" name="attr_au{i}_red" title="적색"></span></div>'
                     f'<textarea class="tx" name="attr_au{i}_text" title="효과"></textarea>'
                     f'<div class="ft"><label class="tg"><input type="checkbox" class="ck" name="attr_au{i}_acc" value="1">고발</label>'
                     f'<label class="tg"><input type="checkbox" class="ck" name="attr_au{i}_sup" value="1">원호</label>'
                     f'<button type="action" class="bub" name="act_au{i}" title="기동해 채팅에 올림"></button></div></div>' for i in range(1, AUTH_N + 1))


def card_chips():
    # 낸 카드 칩: 자리 i 마다 흑(bk · bs) · 적(rk · rs) · 광대(jk) 중 하나만 온다 — 순서를 지킨다
    return ''.join(f'{{{{#bk{i}}}}}<span class="sheet-pc"><b>{{{{bk{i}}}}}</b><i>{{{{bs{i}}}}}</i></span>{{{{/bk{i}}}}}'
                   f'{{{{#rk{i}}}}}<span class="sheet-pc sheet-rd"><b>{{{{rk{i}}}}}</b><i>{{{{rs{i}}}}}</i></span>{{{{/rk{i}}}}}'
                   f'{{{{#jk{i}}}}}<span class="sheet-pc sheet-jk"><b>JK</b><i>&#x2605;</i></span>{{{{/jk{i}}}}}' for i in range(1, SLOTS + 1))


def optional(name):
    p = SRC / name
    return p.read_text(encoding='utf-8').rstrip() if p.exists() else ''


def build():
    html = (SRC / 'redblack.src.html').read_text(encoding='utf-8')
    hints = ''.join(f'{{{{#eh{i}}}}}<div>{{{{computed::eh{i}}}}}</div>{{{{/eh{i}}}}}' for i in range(1, SLOTS + 1))
    tpl = optional('rolltemplate.html').replace('<!--@CHIPS-->', card_chips()).replace('<!--@HINTS-->', hints)
    for key, val in {
        'PAD_B': pad('b'), 'PAD_R': pad('r'), 'HAND': hand(), 'CRESTS': crests(), 'BASIC': calling('bc', BASIC_N, '기본 선언'), 'NOBLE': calling('nc', NOBLE_N, '상급 선언'), 'AUTH': auth(),
        'ROLLTEMPLATE': tpl,
        'WORKER': f'<script type="text/worker">\n{optional("worker.js")}\n</script>',
    }.items():
        mark = f'<!--@{key}-->'
        assert mark in html, mark
        html = html.replace(mark, val)
    return html, (SRC / 'redblack.src.css').read_text(encoding='utf-8')


if __name__ == '__main__':
    html, css = build()
    html, css = autogrow.wrap(html), autogrow.css(css, '.rb')
    OUT.mkdir(exist_ok=True)
    (OUT / 'redblack.html').write_text(html, encoding='utf-8')
    (OUT / 'redblack.css').write_text(css, encoding='utf-8')
    print('wrote', OUT / 'redblack.html', OUT / 'redblack.css')
