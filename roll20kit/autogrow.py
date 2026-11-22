"""글이 늘어나면 칸도 늘어나는 textarea (Roll20 시트 공용). 각 시트 build.py 가 마지막에 html · css 에 적용한다.

Roll20 에서 흔히 쓰는 방식: 같은 속성을 보여 주는 숨은 span(.mir)이 높이를 잡고, textarea 가 그 위를 덮는다.
워커 없이 Roll20 이 span 글을 속성 값으로 채워 주므로 줄바꿈 · 긴 글만큼 칸이 커진다.

    wrap(html)       시트 부분의 <textarea name="attr_X" class="c" …>…</textarea> 를
                     <div class="auto"><span class="mir c" name="attr_X"></span><textarea class="at c" …>…</textarea></div> 로 감싼다.
                     이미 감싼 것, <rolltemplate> 안은 그대로 둔다.
    css(css, root)   textarea 를 가리키는 규칙마다 같은 꼴의 span.mir 사본을 붙여(높이는 최소 높이로) 글자 · 여백을 맞추고,
                     끝에 기본 규칙(감싸개 · 숨은 거울 · 덮는 textarea)을 더한다. root 는 시트 맨 바깥 class (예: '.kd').
"""
import re

_TA = re.compile(r'<textarea\b([^>]*)>(.*?)</textarea>', re.S)


def wrap(html):
    cut = html.find('<rolltemplate')
    body, tail = (html, '') if cut < 0 else (html[:cut], html[cut:])

    def rep(m):
        attrs, inner = m.group(1), m.group(2)
        name = re.search(r'\bname="(attr_[^"]+)"', attrs)
        start = m.start()
        if not name or body[max(0, start - 60):start].rstrip().endswith('</span>') and 'class="mir' in body[max(0, start - 200):start]:
            return m.group(0)
        cls = re.search(r'\bclass="([^"]*)"', attrs)
        extra = cls.group(1) if cls else ''
        if cls:
            attrs = attrs.replace(cls.group(0), f'class="at {extra}"', 1)
        else:
            attrs = ' class="at"' + attrs
        only = ' '.join(c for c in extra.split() if c.endswith('-only'))   # 시트 종류별로 숨기는 class 는 감싸개에도
        return (f'<div class="auto{(" " + only) if only else ""}"><span class="mir{(" " + extra) if extra else ""}" name="{name.group(1)}"></span>'
                f'<textarea{attrs}>{inner}</textarea></div>')

    return _TA.sub(rep, body) + tail


def _mirror_decls(decls):
    out = []
    for d in decls.split(';'):
        if ':' not in d:
            continue
        k, v = d.split(':', 1)
        k = k.strip()
        if k in ('resize', 'overflow', 'overflow-y', 'cursor', 'flex', 'align-self', 'grid-column', 'grid-row', 'position'):
            continue
        if k == 'height':
            vv = v.strip()
            if vv in ('auto', '100%'):
                continue
            k = 'min-height'
        out.append(f'{k}:{v.strip()}')
    return ';'.join(out)


START = '/* auto height text fields (roll20kit/autogrow.py)'
END = '/* end auto height text fields */'


def css(text, root):
    # 다시 돌려도 같은 결과: 앞서 붙인 구역은 지우고 새로 만든다 (CSS 를 직접 고치는 시트용)
    if START in text:
        i = text.index(START)
        j = text.find(END, i)
        text = text[:i].rstrip() + '\n' + (text[j + len(END):].lstrip() if j >= 0 else '')
    rest = re.sub(r'@import[^;]*;', '', text)
    extra = []
    for m in re.finditer(r'([^{}]+)\{([^{}]*)\}', re.sub(r'/\*.*?\*/', '', rest, flags=re.S)):
        sels = [s.strip() for s in m.group(1).split(',')]
        hit = [s for s in sels if re.search(r'(^|[\s>+~])textarea\b', s) and 'rolltemplate' not in s and 'textarea.at' not in s]
        if not hit:
            continue
        decls = _mirror_decls(m.group(2))
        if decls:
            extra.append(','.join(re.sub(r'(^|(?<=[\s>+~]))textarea\b', 'span.mir', s) for s in hit) + '{' + decls + '}')
    base = (f'\n{START}: the hidden mirror span of the same attribute sets the height, the textarea covers it */\n'
            f'{root} div.auto{{position:relative;display:block;width:100%;min-width:0;flex:1 1 auto;align-self:stretch}}\n'
            + '\n'.join(extra) + '\n'
            f'{root} div.auto > span.mir{{display:block;visibility:hidden;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;pointer-events:none}}\n'
            f'{root} div.auto > span.mir::after{{content:"."}}\n'
            f'{root} div.auto > textarea.at{{position:absolute;top:0;left:0;width:100%;height:100%;min-height:0;margin:0;overflow:hidden;resize:none}}\n'
            f'{END}\n')
    return text.rstrip() + '\n' + base
