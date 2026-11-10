#!/usr/bin/env python3
"""CSS 정리 확인: 두 판의 올인원에서 페이지에 넣는 CSS(CORE_CSS + addCss 묶음)를 꺼내
var(--aio-*) 를 :root 값으로 풀어 견준다. 같으면 화면도 같다 (변수로 바꾸기만 한 정리용).

    python3 tests/css-same.py 옛판.user.js 새판.user.js
"""
import re
import sys


def blocks(src):
    """CORE_CSS 와 addCss(`…`) 안의 글을 차례대로."""
    out = []
    for m in re.finditer(r'const CORE_CSS = `|addCss\(`', src):
        start = m.end()
        end = src.index('`', start)
        out.append(src[start:end])
    return out


def tokens(src):
    root = re.search(r':root \{([^}]*)\}', src).group(1)
    return {k: v.strip() for k, v in re.findall(r'(--aio-[\w-]+):([^;]+);', root)}


def resolve(css, tok):
    css = re.sub(r':root \{[^}]*\}', '', css)            # 변수 정의 줄은 견주지 않는다
    for _ in range(3):                                    # 변수 안의 변수까지
        css = re.sub(r'var\((--aio-[\w-]+)\)', lambda m: tok.get(m.group(1), m.group(0)), css)
    css = re.sub(r'calc\((-?\d+) \+ (\d+)\)', lambda m: str(int(m.group(1)) + int(m.group(2))), css)   # z-index: calc(층 + n)
    return re.sub(r'\s+', ' ', css).strip()


def main(a, b):
    sa, sb = open(a, encoding='utf8').read(), open(b, encoding='utf8').read()
    ba, bb = blocks(sa), blocks(sb)
    if len(ba) != len(bb):
        print(f'CSS 묶음 수가 다름: {len(ba)} → {len(bb)}')
        return 1
    ta, tb = tokens(sa), tokens(sb)
    for k, v in ta.items():
        if tb.get(k) != v:
            print(f'변수 값이 바뀜: {k} {v} → {tb.get(k)}')
            return 1
    bad = 0
    for i, (x, y) in enumerate(zip(ba, bb)):
        rx, ry = resolve(x, ta), resolve(y, tb)
        if rx != ry:
            bad += 1
            j = next(k for k in range(min(len(rx), len(ry))) if rx[k] != ry[k]) if rx[:len(ry)] != ry[:len(rx)] else min(len(rx), len(ry))
            print(f'묶음 {i}: 다름 @{j}\n  옛: …{rx[max(0, j - 80):j + 80]}\n  새: …{ry[max(0, j - 80):j + 80]}')
    print(f'CSS 묶음 {len(ba)}개 · 다른 묶음 {bad}개 · 변수 {len(ta)} → {len(tb)}개')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main(*sys.argv[1:3]))
