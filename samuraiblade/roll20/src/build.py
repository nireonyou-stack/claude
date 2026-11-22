"""사무라이 블레이드 Roll20 시트 빌드.

src/samuraiblade.src.html 의 <!--@...--> 자리를 특기 리스트 · 어빌리티 · 인연 · GS/BS · 장비품 · 아이템,
src/worker.js(sheet worker) · src/rolltemplate.html(채팅 카드)로 채워 sheet/samuraiblade.html 을,
src/samuraiblade.src.css 의 /*@GEN*/ 자리를 아이템 개수 칸 채우기 규칙으로 채워 sheet/samuraiblade.css 를 만든다.

    python3 build.py
"""
import pathlib

SRC = pathlib.Path(__file__).resolve().parent
OUT = SRC.parent / 'sheet'

# 특기 리스트 (공식 시트 순서): 열 글자 · 壱~陸 · 분야 · 2~12 특기 (용어: TR꿈악어 님 한국어 캐릭터 시트)
FIELDS = [
    ('A', '壱', '재능', ['질서', '괴물', '인덕', '천계', '방패', '꿈', '신기', '성신', '의료', '기도', '사랑']),
    ('B', '弐', '숙달', ['현세', '이형', '경비', '규칙', '맨손', '땅', '곤봉', '수행', '기계', '각인', '기쁨']),
    ('C', '参', '이지', ['창조', '요괴', '교섭', '계승', '총', '물', '활', '탐구', '학문', '주문', '슬픔']),
    ('D', '肆', '신체', ['파괴', '짐승', '운동', '혈통', '도검', '불꽃', '장병', '파사', '조종', '기공', '분노']),
    ('E', '伍', '감성', ['상야', '빙의', '지각', '운명', '편쇄', '바람', '닌구', '환상', '전뇌', '염력', '안락']),
    ('F', '陸', '심연', ['혼돈', '죽음', '은밀', '신비', '조아', '영혼', '주물', '윤회', '범죄', '마법', '미움']),
]
# 인쇄된 어빌리티 (혼백사 공통): 이름 · 조건 · 타이밍 · 기능 · 간격 · 대상 · 회수 · 효과
PRINTED = [('무령각성', '혼백사', '선언', '없음', '없음', '자신', '세션', '생명력 전부 회복, BS 전체 해제 후 【각성】'),
           ('참찰전개', '혼백사', '선언', '없음', '없음', '자신', '세션', '손패에서 완성된 역을 【참패】로 전개'),
           ('화투동조', '혼백사', '선언', '없음', '없음', '자신', '세션', '손패가 최대가 될 때까지 화투 습득'),
           ('혼백산화', '혼백사', '선언', '없음', '없음', '자신', '세션', '【화투동조】와 같은 효과. 세션 종료 시 【은퇴】')]
GS = [('고양', '공격판정에 부스트+1한다'), ('축복', '방어판정에 부스트+1한다'), ('가속', '통상 이동공격은 +1칸, 전력이동은 +2칸한다.'),
      ('철벽', '자신이 받는 대미지가 1점 감소한다.'), ('신격', '자신이 부여하는 대미지를 1점 추가한다.'), ('무쌍', '【대상:단일】을 【대상:라인】으로 변경.')]
BS = [('맹독', '차례의 행동을 할 때마다 1점의 대미지를 받는다.'), ('주박', '모든 판정 난이도가 1단계 상승한다. (행위판정에 +5)'),
      ('발묶임', '이동공격을 할 수 없고, 전력이동은 1칸 이동이 된다.'), ('공포', '자신이 부여하는 대미지가 1점 감소한다 (0점이라면 대미지가 부여X)'),
      ('부상', '자신이 받는 대미지가 1점 추가된다.'), ('혼란', '【횟수: 사이클】과 【횟수:배틀】어빌리티 사용불가.')]
EQUIP = ['무기', '보조무기', '방어구', '보조방어구', '장식품']
ITEMS = [('방진', '배치 롤을 2회 실행해, 원하는 쪽을 선택할 수 있다.'), ('병기', '하급 봉마 1체를 전투 시트 상에서 배제할 수 있다.'),
         ('영측', '상급·특급 봉마 1체의 데이터를 알 수 있다. 봉마 어빌리티는 알 수 없다.'), ('약품', '생명력 완쾌나 BS 전체 해제. 전투 중엔 생명력 1D6 회복 or BS 1개 해제'),
         ('탈것', '즉시 전력 이동 한다. BS 【발묶임】이라도 사용 가능.'), ('호부', '【횟수: 사이클】인 사용완료 어빌리티를 재사용할 수 있다.')]
EN_ROWS = 6
AN = ' class="an"'


def skills():
    out = ['<div class="no corner"></div>' + ''.join(f'<div class="fh"><i><b>{num}</b></i>{name}</div>' for _, num, name, _ in FIELDS) + '<div class="no corner"></div>']
    for r in range(2, 13):
        line = f'<div class="no">{r}</div>'
        for col, _, _, names in FIELDS:
            n = names[r - 2]
            line += (f'<div class="c"><input type="checkbox" class="own" name="attr_{col}{r}" value="1" title="{n} 습득">'
                     f'<button type="action" class="n" name="act_r{col.lower()}{r}" title="{n} 판정">{n}</button>'
                     f'<span class="tn" name="attr_{col}{r}_value"></span></div>')
        out.append(line + f'<div class="no">{r}</div>')
    return '\n'.join(out)


def abilities():
    out = []
    for i, (n, cond, tim, sk, rng, tgt, cnt, ef) in enumerate(PRINTED, 1):
        out.append(f'<div class="ar pr"><span><button type="action" class="bub" name="act_pab{i}" title="채팅에 올림"></button></span><span class="lv">—</span>'
                   f'<span class="an">{n}</span><span>{cond}</span><span>{tim}</span><span>{sk}</span><span>{rng}</span><span>{tgt}</span><span>{cnt}</span>'
                   f'<span class="ef">{ef}</span><span class="cks"><input type="checkbox" class="ck" name="attr_pab{i}_used" value="1" title="사용함"></span></div>')
    out.append('<div class="ar pr"><span><button type="action" class="dic" name="act_mr" title="판정"></button></span><span class="lv">1</span>'
               '<span class="an">† 무령도</span><span>혼백사</span><span>이동공격 · 전력공격</span><span><input type="text" name="attr_mr_skill" title="무령도 기능"></span>'
               '<span>무기</span><span>단일</span><span>무제한</span>'
               '<span class="ef">이동공격 <input type="text" class="dmg" name="attr_mr_dmg" title="이동공격 대미지">점 / 전력공격에는 +1점</span><span class="cks"></span></div>')
    for lv in range(2, 8):
        cells = ''.join(f'<span{AN if k == "name" else ""}><input type="text" name="attr_ab{lv}_{k}" title="{t}"></span>'
                        for k, t in [('name', '어빌리티'), ('cond', '조건'), ('timing', '타이밍'), ('skill', '기능'), ('range', '간격'), ('target', '대상'), ('count', '회수')])
        out.append(f'<div class="ar"><span><button type="action" class="dic" name="act_ab{lv}" title="판정"></button></span><span class="lv">{lv}</span>{cells}'
                   f'<span class="ef"><div class="auto"><span class="mir" name="attr_ab{lv}_effect"></span><textarea name="attr_ab{lv}_effect" title="효과"></textarea></div></span>'
                   f'<span class="cks">' + ''.join(f'<input type="checkbox" class="ck" name="attr_ab{lv}_u{k}" value="1" title="사용함">' for k in (1, 2, 3)) + '</span></div>')
    return '\n'.join(out)


def bonds():
    return '\n'.join(f'<div class="er"><span><input type="text" name="attr_en{i}_name" title="인연"></span><span><input type="text" class="ctr" name="attr_en{i}_emo" title="감정"></span>'
                     f'<span><input type="checkbox" class="ck" name="attr_en{i}_bond" value="1" title="유대"></span></div>' for i in range(1, EN_ROWS + 1))


def status(key, rows):
    return '\n'.join(f'<div class="sr2"><i>{i}</i><b>{n}</b><span>{e}</span><input type="checkbox" class="ck" name="attr_{key}{i}" value="1" title="{n}"></div>'
                     for i, (n, e) in enumerate(rows, 1))


def equip():
    # 공식 시트: 장비품 · 종별 · 간격 · 효과 (효과는 둘째 줄)
    return '\n'.join(f'<div class="qr"><b>{k}</b><input type="text" name="attr_eq{i}_name" title="{k}"><input type="text" class="s" name="attr_eq{i}_type" title="종별">'
                     f'<input type="text" class="s" name="attr_eq{i}_range" title="간격"><input type="text" class="ef" name="attr_eq{i}_effect" title="{k} 효과"></div>'
                     for i, k in enumerate(EQUIP, 1)) + '\n<div class="qr qn">장식품은 전투시 사용불가</div>'


def items():
    return '\n'.join(f'<div class="it"><i>{i}</i><b>{n}</b><span>{e}</span><span class="tok"><input type="hidden" class="hv" name="attr_it{i}_n" value="0">'
                     + ''.join(f'<button type="action" class="cnt" name="act_it{i}c{k}" title="{k}"></button>' for k in (1, 2, 3))
                     + f'</span><button type="action" class="bub" name="act_it{i}" title="사용"></button></div>' for i, (n, e) in enumerate(ITEMS, 1))


def gen_css():
    return '\n'.join(f'.sbd .it .hv[value="{v}"] ~ button[type=action].cnt:nth-of-type(-n+{v}){{background-color:var(--ink)}}' for v in (1, 2, 3))


def optional(name):
    p = SRC / name
    return p.read_text(encoding='utf-8').rstrip() if p.exists() else ''


def build():
    html = (SRC / 'samuraiblade.src.html').read_text(encoding='utf-8')
    for key, val in {
        'SKILLS': skills(), 'ABILITIES': abilities(), 'BONDS': bonds(), 'GS': status('gs', GS), 'BS': status('bs', BS), 'EQUIP': equip(), 'ITEMS': items(),
        'ROLLTEMPLATE': optional('rolltemplate.html'),
        'WORKER': f'<script type="text/worker">\n{optional("worker.js")}\n</script>',
    }.items():
        mark = f'<!--@{key}-->'
        assert mark in html, mark
        html = html.replace(mark, val)
    css = (SRC / 'samuraiblade.src.css').read_text(encoding='utf-8')
    assert '/*@GEN*/' in css
    css = css.replace('/*@GEN*/', gen_css())
    return html, css


if __name__ == '__main__':
    html, css = build()
    OUT.mkdir(exist_ok=True)
    (OUT / 'samuraiblade.html').write_text(html, encoding='utf-8')
    (OUT / 'samuraiblade.css').write_text(css, encoding='utf-8')
    print('wrote', OUT / 'samuraiblade.html', OUT / 'samuraiblade.css')
