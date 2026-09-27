"""블러드문 룰북 텍스트(d.txt)에서 어빌리티/아이템 카드를 추출해 parsed.json으로 저장.

Docs 텍스트 내보내기에서 표 셀은 '탭으로 시작하는 줄'로 시작하고,
같은 셀의 줄바꿈은 탭 없는 줄로 이어진다. 이를 이용해 셀 단위로 묶는다.
"""
import json, re

lines = open('d.txt', encoding='utf-8').read().split('\n')

# 각주: '[80] 역) scheme' → 비고로 옮긴다
FOOT = {}
for l in lines:
    m = re.match(r'^\[(\d+)\] (.+)$', l)
    if m:
        FOOT[m.group(1)] = m.group(2).strip()

# 다음 섹션 제목(카드 뒤에 붙어 나오는 줄) 판별
HEAD = re.compile(r'^((종족|조직|무장|체형|혈통) : \S.*|범용|경증광기|중증광기|마수|악귀|'
                  r'이형\d*|혈계\d*|위인\d*|아이템|레어아이템|_+)$')

START = next(i for i, l in enumerate(lines) if re.match(r'^\t*그룹 범용', l))
END = next(i for i, l in enumerate(lines) if l.startswith('파트 8'))


def cells(blk):
    """블록 줄들을 셀 목록으로 묶는다."""
    out = []
    for l in blk:
        if l.startswith('\t'):
            out.append([l.strip()])
        elif l.strip() and out:
            out[-1].append(l.strip())
    out = [c for c in out if any(c)]
    # 마지막 셀 끝의 섹션 제목 제거
    while out and out[-1] and HEAD.match(out[-1][-1]):
        out[-1].pop()
        if not any(out[-1]):
            out.pop()
    return [[x for x in c if x] for c in out if any(c)]


def clean(text, notes):
    """각주 표시 [n]을 떼어 notes에 모은다."""
    for n in re.findall(r'\[(\d+)\]', text):
        if n in FOOT and FOOT[n] not in notes:
            notes.append(FOOT[n])
    return re.sub(r'\[\d+\]', '', text).strip()


starts = [i for i in range(START, END) if re.match(r'^\t*(그룹|분류) \S', lines[i])]
abilities, items, warns = [], [], []
for n, i in enumerate(starts):
    j = starts[n + 1] if n + 1 < len(starts) else END
    cs = cells(lines[i:j])
    notes = []
    head = cs[0][0]
    if head.startswith('그룹 '):
        # 셀 순서: 그룹, 레벨제한, 이름(2줄), 타입, 코스트, 지정특기, 효과, [개요]
        f = {}
        for c in cs[1:]:
            m = re.match(r'^(레벨제한|타입|코스트|지정특기|효과)(?: (.*))?$', c[0])
            if m and m.group(1) not in f:
                f[m.group(1)] = '\n'.join([m.group(2) or ''] + c[1:]).strip()
        name_c = cs[2] if len(cs) > 2 else []
        rest = [c for c in cs[1:] if not re.match(r'^(레벨제한|타입|코스트|지정특기|효과)( |$)', c[0])]
        flav = rest[1:]  # rest[0] = 이름 셀
        if len(f) < 5 or not name_c or len(flav) > 1:
            warns.append((i + 1, head, list(f), cs[:3], flav))
        group = re.sub(r'\s*:\s*', ':', head[3:].strip())
        abilities.append(dict(
            line=i + 1, group=group,
            name=clean('\n'.join(name_c), notes),
            level=f.get('레벨제한', ''), type=f.get('타입', ''),
            cost=clean(f.get('코스트', ''), notes), spec=clean(f.get('지정특기', ''), notes),
            effect=clean(f.get('효과', ''), notes),
            flavor=clean('\n'.join('\n'.join(c) for c in flav), notes),
            note='\n'.join(notes)))
    else:
        # 셀 순서: 분류, 이름, 효과, [설명]
        body = cs[1:]
        eff = next((k for k, c in enumerate(body) if c[0].startswith('효과 ')), None)
        if eff != 1:
            warns.append((i + 1, head, body[:3]))
        e = body[eff]
        items.append(dict(
            line=i + 1, cat=head[3:].strip(),
            name=clean('\n'.join(body[0]), notes),
            effect=clean('\n'.join([e[0][3:]] + e[1:]), notes),
            flavor=clean('\n'.join('\n'.join(c) for c in body[eff + 1:]), notes),
            note='\n'.join(notes)))

json.dump(dict(abilities=abilities, items=items),
          open('parsed.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(abilities), len(items), 'warns', len(warns))
for w in warns:
    print(w)
