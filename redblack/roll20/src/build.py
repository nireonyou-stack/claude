"""적과 흑 Roll20 시트 빌드.

src/redblack.src.html 의 <!--@...--> 자리를 카드 패드 · 낸 카드 칸 · 문장 · 기본/상급 선언 · 권한 마법,
src/worker.js(sheet worker) · src/rolltemplate.html(채팅 카드, 낸 카드 칩 자리는 여기서 만든다)로 채워 sheet/redblack.html 을 만든다.
CSS 는 src/redblack.src.css 를 그대로 sheet/redblack.css 로 옮긴다.

    python3 build.py
"""
import html as H
import pathlib

SRC = pathlib.Path(__file__).resolve().parent
OUT = SRC.parent / 'sheet'

RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
SLOTS = 10   # 낸 카드 칸 수
# 문장 (인쇄): 이름 · 효과
CRESTS = [('인피니티', '대상이 차례에 하는 고발은 1회가 아니라 2회까지 가능해진다.'),
          ('오버로드', '대상은 고발 국면의 차례 중, 원할 때 1회, 덱에서 2장을 뽑아 손패를 보충할 수 있다.'),
          ('언리미티드', '고발 국면 중, 대상은 플레이 때 손패를 1장 지정한다. 그 손패는 적과 흑 양쪽으로 취급한다.')]
# 기본 선언 (이름 · 본문 인쇄, 〔기동〕 · LV 는 계보마다 기입)
BASIC = [('현장 재구축', '오브젝트 1개를 대상으로, 대상을 소환해 질문 1개에 답하게 한다. 대상은 자신의 인식으로 증언하고, 진실로 등록한다.\n증언에서는 거짓말을 하지 않지만, 대상의 지성으로는 이해할 수 없는 정보는 증언할 수 없다.'),
         ('인물 재구축', '캐스트 1명을 대상으로, 대상을 소환해 질문 1개에 답하게 한다. 대상은 자신의 인식으로 증언하고, 진실로 등록한다.\n증언에서는 거짓말을 하지 않지만, 모르는 정보는 증언할 수 없고, 오인한 정보도 그대로 말한다.'),
         ('심문 선고', '당신을 대상으로, YES / NO 로 답할 수 있는 질문을 하고, GM 은 답이 YES 면 YES 라고 답하고, 진실로 등록한다.\n답이 NO 인 경우나, 애초에 시나리오 안에 답이 없으면 "불명" 이라고 GM 은 고한다.'),
         ('물질 재변성', '오브젝트 1개를 대상으로, 대상 크기가 손바닥 크기라면, 다른 것으로 바꾼다, 라는 환상으로 등록한다.\n어떤 형상과 기능을 가질지는 자유롭게 정한다.'),
         ('서약 재설정', '캐스트 1명을 대상으로, 대상의 마음을 세뇌해, 지정한 하루, 대상이 "절대 하지 않는 금칙" 을 정해서, 환상으로 등록한다.\n대상이 금칙의 행동을 하지 않는 것이 보장된다.\n대상이 직접 사망하는 룰은 설정할 수 없다.'),
         ('각본 검색', '단어 최대 2개를 대상으로, GM 은 대상 전부를 포함한 미발견 각본을 검색해, 해당한 수가 1건이면 환상으로 등록한다.\n해당이 1건이 아닌 경우, 해당 건수만 알 수 있다.')]
NOBLE_N = 6
AUTH_N = 9


def esc(s):
    return H.escape(s, quote=True)


def pad(color):
    keys = [(k.lower(), k) for k in RANKS] + [('x', '광대')]
    return (f'<span class="pad{" rd" if color == "r" else ""}">'
            + ''.join(f'<button type="action" class="{"jk" if k == "x" else "pk"}" name="act_{color}{k}" title="{"흑" if color == "b" else "적"} {lab}">{lab}</button>' for k, lab in keys)
            + '</span>')


def hand():
    return ''.join(f'<span class="slot"><input type="hidden" class="pv" name="attr_pc{i}" value="">'
                   f'<button type="action" class="pc" name="act_pcx{i}" title="빼기"><span class="k" name="attr_pc{i}_k"></span><span class="s" name="attr_pc{i}_s"></span></button></span>'
                   for i in range(1, SLOTS + 1))


def crests():
    return '\n'.join(f'<div class="em orn"><input type="hidden" class="cm" name="attr_crest{i}_on" value="0"><div class="eh"><b>문장</b><span>{n}</span>'
                     f'<label class="ul"><input type="checkbox" class="ck" name="attr_crest{i}_on" value="1" title="{n} 해금">해금</label></div>'
                     f'<div class="ds"><i>묘사</i><textarea name="attr_crest{i}_desc" title="{n} 묘사"></textarea></div>'
                     f'<div class="tx"><b>【지속】 당신을 대상.</b><br>{esc(t)}</div></div>' for i, (n, t) in enumerate(CRESTS, 1))


def basic():
    out = []
    for i, (n, t) in enumerate(BASIC, 1):
        body = ''.join(f'<p>{esc(p)}</p>' for p in t.split('\n'))
        out.append(f'<div class="mg orn"><div class="mh"><b>선언</b><span class="nm">{n}</span><span class="lv">LV<input type="number" name="attr_bc{i}_lv" value="1" title="{n} LV"></span></div>'
                   f'<div class="boot"><span class="bt"><span>〔기동〕</span><input type="text" name="attr_bc{i}_boot" title="{n} 기동"></span></div>'
                   f'<div class="tx">{body}</div><div class="ft"><input type="text" class="lvx" name="attr_bc{i}_lvx" title="{n} LV 효과">'
                   f'<button type="action" class="bub" name="act_bc{i}" title="기동해 채팅에 올림"></button></div></div>')
    return '\n'.join(out)


def noble():
    return '\n'.join(f'<div class="mg orn"><div class="mh"><b>선언</b><input type="text" class="nm" name="attr_nc{i}_name" title="상급 선언 이름"><span class="lv">LV<input type="number" name="attr_nc{i}_lv" title="LV"></span></div>'
                     f'<div class="boot"><span class="bt"><span>〔기동〕</span><input type="text" name="attr_nc{i}_boot" title="기동"></span></div>'
                     f'<textarea class="tx" name="attr_nc{i}_text" title="효과"></textarea><div class="ft"><button type="action" class="bub" name="act_nc{i}" title="기동해 채팅에 올림"></button></div></div>'
                     for i in range(1, NOBLE_N + 1))


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
    # 낸 카드 칩: 자리 i 마다 흑(bk · bs) 또는 적(rk · rs) 중 하나만 온다 — 순서를 지킨다
    return ''.join(f'{{{{#bk{i}}}}}<span class="sheet-pc"><b>{{{{bk{i}}}}}</b><i>{{{{bs{i}}}}}</i></span>{{{{/bk{i}}}}}'
                   f'{{{{#rk{i}}}}}<span class="sheet-pc sheet-rd"><b>{{{{rk{i}}}}}</b><i>{{{{rs{i}}}}}</i></span>{{{{/rk{i}}}}}' for i in range(1, SLOTS + 1))


def optional(name):
    p = SRC / name
    return p.read_text(encoding='utf-8').rstrip() if p.exists() else ''


def build():
    html = (SRC / 'redblack.src.html').read_text(encoding='utf-8')
    tpl = optional('rolltemplate.html').replace('<!--@CHIPS-->', card_chips())
    for key, val in {
        'PAD_B': pad('b'), 'PAD_R': pad('r'), 'HAND': hand(), 'CRESTS': crests(), 'BASIC': basic(), 'NOBLE': noble(), 'AUTH': auth(),
        'ROLLTEMPLATE': tpl,
        'WORKER': f'<script type="text/worker">\n{optional("worker.js")}\n</script>',
    }.items():
        mark = f'<!--@{key}-->'
        assert mark in html, mark
        html = html.replace(mark, val)
    return html, (SRC / 'redblack.src.css').read_text(encoding='utf-8')


if __name__ == '__main__':
    html, css = build()
    OUT.mkdir(exist_ok=True)
    (OUT / 'redblack.html').write_text(html, encoding='utf-8')
    (OUT / 'redblack.css').write_text(css, encoding='utf-8')
    print('wrote', OUT / 'redblack.html', OUT / 'redblack.css')
