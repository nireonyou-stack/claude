"""시노비가미 Roll20 시트 빌드.

src/shinobigami.src.html 의 <!--@...--> 자리를 특기 리스트 · 인물 칸 · 배경 · 인법 · 상태이상 · 굴림표 · 생명력 칸 ·
닌자도구 · 진실 · 오의, src/worker.js(sheet worker) · src/rolltemplate.html(채팅 카드)로 채워 sheet/shinobigami.html 을,
src/shinobigami.src.css 의 /*@HP*/ 자리를 생명력 칸 규칙으로 채워 sheet/shinobigami.css 를 만든다.
칸 이름은 중국어 번체 시트(Shinobi_Gami_Chinese_Traditional)와 맞춘다 — FIELDS.md.

    python3 build.py
"""
import pathlib

SRC = pathlib.Path(__file__).resolve().parent
OUT = SRC.parent / 'sheet'

# 특기 리스트: 열 글자(중국어 시트와 같음) · 분야 · 생명력 슬롯 값(중국어 시트 Ninpo_X_Field 의 값) · 2~12 특기
FIELDS = [
    ('A', '기술', 'violence', ['기기술', '불의 술', '물의 술', '침술', '암기', '의상술', '포승술', '등반술', '고문술', '손괴술', '굴삭술']),
    ('B', '체술', 'Body', ['기승술', '포술', '수리검술', '손놀림', '신체조작', '보법', '주법', '비행술', '격투술', '도검술', '괴력']),
    ('C', '인술', 'Stealth', ['생존술', '잠복술', '도주술', '도청술', '복화술', '은형술', '변장술', '향술', '분신술', '은폐술', '제육감']),
    ('D', '모술', 'Scheme', ['의술', '독술', '함정술', '조사술', '사기술', '대인술', '예능', '미인계', '괴뢰술', '유언비어', '경제력']),
    ('E', '전술', 'Strategy_Field', ['병량술', '동물사역', '야전술', '지형활용', '의지', '용병술', '기억술', '색적술', '암호술', '전달술', '인맥']),
    ('F', '요술', 'Sorcery', ['이형화', '소환술', '사령술', '결계술', '봉인술', '언령술', '환술', '동술', '천리안', '빙의술', '주술']),
]
GAPS = ['Z', 'A', 'B', 'C', 'D', 'E']          # Z = 기술 왼쪽(마계공학으로 요술과 이어짐), A~E = 분야 사이
# 상태이상: (속성 이름 꼬리, 이름, 누적되는지). 누적되는 것은 숫자칸, 아니면 체크칸. '|' = 기본 6종 | 전국 6종
CONDS = [('koshou', '고장', 0), ('mahi', '마비', 1), ('juushou', '중상', 0), ('yukue', '행방불명', 0), ('boukyaku', '망각', 1), ('noroi', '저주', 1), '|',
         ('saimin', '최면', 0), ('hidaruma', '불덩어리', 1), ('moudoku', '맹독', 1), ('kiga', '기아', 1), ('zanryu', '잔류물', 0), ('yabou', '야망', 0)]
BATTLEFIELDS = [('flat', '평지'), ('water', '수중'), ('high', '고지대'), ('storm', '악천후'), ('crowd', '혼잡'), ('danger', '위험지대')]
TABLES = ['장면 표', '감정 표', '신념 표', '펌블 표', '전장 표', '상태이상 표', '전국 상태이상 표']
GEAR = [('01', '병량환', '자신의 【생명력】이 1점 이상이라면 언제든지 사용할 수 있다. 이 아이템을 사용하면 자신의 【생명력】 1점이나 상태이상 하나를 회복할 수 있다.'),
        ('02', '신통환', '자신이 행동 판정의 주사위를 굴렸을 때 사용할 수 있다. 그 주사위를 다시 굴릴 수 있다.'),
        ('03', '둔갑부', '자신 이외의 누군가가 행동 판정의 주사위를 굴렸을 때 사용할 수 있다. 그 주사위를 다시 굴리게 할 수 있다.')]
TYPES = [('@{Tool}', '공'), ('@{support}', '서'), ('@{equip}', '장')]   # 인법 타입 (중국어 시트 값)
NINPO_ROWS = 8
PEOPLE_ROWS = 9
HP_MAX = 50


def skills():
    """머리줄(모서리 · 공백 Z · 분야+슬롯 …) + 11줄(번호 · 공백 · 칸 …). 공백은 줄마다 같은 속성의 체크칸이라 위아래로 이어져 보인다."""
    gap = lambda g: f'<label class="gap"><input type="checkbox" name="attr_{g}" value="1" title="공백 {g} 칠하기"><span></span></label>'
    out = ['<div class="no corner"></div>' + gap('Z')]
    for i, (col, name, _, _) in enumerate(FIELDS):
        out.append(f'<div class="fh">{name}<button type="action" class="slot s{col.lower()}" name="act_slot{col.lower()}" title="{name} 생명력 슬롯 (누를 때마다 소실 → 부정 → 빈칸)"><span>부</span></button></div>'
                   + (gap(GAPS[i + 1]) if i < 5 else ''))
    for r in range(2, 13):
        line = f'<div class="no{" nw" if r in (2, 12) else ""}">{r}</div>' + gap('Z')
        for i, (col, _, _, names) in enumerate(FIELDS):
            n = names[r - 2]
            line += (f'<div class="c f{col.lower()}"><input type="checkbox" class="own" name="attr_{col}{r}" value="1" title="{n} 습득">'
                     f'<span class="ic ima" title="마비">마</span>'
                     f'<button type="action" class="n" name="act_r{col}{r}" title="{n} 판정">{n}</button>'
                     f'<span class="tn" name="attr_{col}{r}_value"></span></div>')
            if i < 5:
                line += gap(GAPS[i + 1])
        out.append(line)
    return '\n'.join(out)


def field_mirrors():
    """특기 리스트 칸 무늬(소실 · 부정)와 슬롯 모양을 가르는 숨은 거울 — .sg 앞에 둔다."""
    return '\n'.join(f'<input type="hidden" class="f-{col.lower()}" name="attr_Ninpo_{col}_Field" value="@{{{key}}}">' for col, _, key, _ in FIELDS)


def people():
    out = []
    for i in range(1, PEOPLE_ROWS + 1):
        k = f'{i:02d}'
        out.append(
            f'<div class="pr"><input type="text" name="attr_relation_name_{k}" title="인물명 {i}">'
            f'<input type="checkbox" class="box" name="attr_relation_live_{k}" value="1" title="거처">'
            f'<input type="checkbox" class="box" name="attr_relation_secret_{k}" value="1" title="비밀">'
            f'<input type="checkbox" class="box ob" name="attr_relation_ougi_on_{k}" value="1" title="오의">'
            f'<span class="pk"><input type="text" name="attr_relation_ougi_{k}" title="오의 지정특기"><button type="action" class="dic" name="act_brk{k}" title="파훼 판정"></button></span>'
            f'<span class="emw"><input type="text" class="emo" name="attr_relation_sense_{k}" title="감정"><input type="hidden" class="emf" name="attr_relation_emo_{k}" value="0"><span class="ic ibk" title="망각">망</span></span>'
            f'<span class="pm"><input type="radio" class="none" name="attr_relation_sign_{k}" value="" checked>'
            f'<label class="pmk"><input type="radio" name="attr_relation_sign_{k}" value="+"><span>+</span></label>'
            f'<label class="pmk"><input type="radio" name="attr_relation_sign_{k}" value="-"><span>&minus;</span></label></span></div>')
    return '\n'.join(out)


def backgrounds():
    out = []
    for i in range(1, 6):
        k = f'{i:02d}'
        out.append(
            f'<div class="bw"><input type="checkbox" class="tgl tbg" name="attr_background_open_{k}" value="1" title="효과 칸 펴기">'
            f'<div class="bl"><input type="text" name="attr_background_name_{k}" title="배경 {i}"><span class="plus"></span>'
            f'<button type="action" class="bub" name="act_bg{k}" title="채팅에 출력"></button></div>'
            f'<div class="bx"><textarea name="attr_background_{k}" title="배경 {i} 효과"></textarea></div></div>')
    return '\n'.join(out)


def type_radios(name):
    parts = [f'<input type="radio" class="none" name="{name}" value="" checked>']
    for j, (v, t) in enumerate(TYPES):
        if j:
            parts.append('<i>&#x30FB;</i>')
        parts.append(f'<label class="tyk"><input type="radio" name="{name}" value="{v}"><span>{t}</span></label>')
    return ''.join(parts)


def ninpo_row(p, btn, title):
    """인법 한 줄 + 펴는 칸(그림 주소 · 개요 · 썸네일). p = 속성 앞부분(Ninpo_01_ 또는 반복 줄의 Ninpo_)."""
    return (f'<div class="nw"><input type="checkbox" class="tgl tnp" name="attr_{p}open" value="1" title="그림 주소 · 개요 칸 펴기">'
            f'<div class="nr"><span><button type="action" class="dic" name="act_{btn}" title="{title}"></button></span>'
            f'<span class="nnw"><input type="text" class="nn" name="attr_{p}Name" title="인법명"><input type="hidden" class="npf" name="attr_{p}on" value="0"><span class="ic inr" title="저주">저</span></span>'
            f'<span class="ty">{type_radios(f"attr_{p}Types")}</span>'
            f'<span class="ctr"><input type="text" name="attr_{p}Range" title="간격"></span>'
            f'<span class="ctr"><input type="text" name="attr_{p}Cost" title="코스트"></span>'
            f'<span><input type="text" name="attr_{p}Assigned_Skill" title="지정 특기"></span>'
            f'<span><textarea name="attr_{p}Effect" title="효과"></textarea></span>'
            f'<span><span class="plus"></span></span></div>'
            f'<div class="nx"><b>그림 주소</b><input type="text" class="img" name="attr_{p}Img" title="그림 주소">'
            f'<b>개요</b><textarea name="attr_{p}Flavor" title="개요"></textarea><img class="thumb" name="attr_{p}Img" alt=""></div></div>')


def ninpo():
    return '\n'.join(ninpo_row(f'Ninpo_{i:02d}_', f'np{i:02d}', '인법 판정') for i in range(1, NINPO_ROWS + 1))


def ninpo_rep():
    return ninpo_row('Ninpo_', 'use', '인법 판정')


def conds():
    out = []
    for c in CONDS:
        if c == '|':
            out.append('<span class="vbar"></span>')
            continue
        key, name, stack = c
        if stack:
            out.append(f'<span class="ckn k-{key}">{name}<input type="number" name="attr_cond_{key}" value="" min="0" title="{name} 누적 수"></span>')
        else:
            out.append(f'<label class="ck"><input type="checkbox" name="attr_cond_{key}" value="1"><span>{name}</span></label>')
    return ''.join(out)


def cond_mirrors():
    return '\n'.join(f'<input type="hidden" class="t-c{key}" name="attr_cf_{key}" value="0">' for c in CONDS if c != '|' for key, _, stack in [c] if stack)


def battlefields():
    return ''.join(f'<label class="ck"><input type="checkbox" name="attr_bf_{k}" value="1"{" checked" if k == "flat" else ""}><span>{n}</span></label>' for k, n in BATTLEFIELDS)


def plots():
    out = ['<input type="radio" class="none" name="attr_plot" value="" checked>']
    out += [f'<label class="sgk"><input type="radio" name="attr_plot" value="{k}"><span>{k}</span></label>' for k in range(0, 8)]
    return ''.join(out)


def tables():
    out = [f'<button type="action" class="rt" name="act_rt{i}" title="{n} 굴림"><i class="tdi"></i>{n}</button>' for i, n in enumerate(TABLES, 1)]
    out.append('<span class="rtg">' + ''.join(f'<button type="action" class="rt" name="act_nd{n}" title="{n}D6 굴림">{n}D6</button>' for n in (1, 2, 3)) + '</span>')
    return ''.join(out)


def hpbox():
    """생명력 칸: 0(숨김) + 1~50 라디오. 누른 칸까지 채워진다(:checked ~ 는 빈 칸). 기본 6."""
    out = ['<input type="radio" class="hz" name="attr_hp" value="0">']
    out += [f'<input type="radio" name="attr_hp" value="{k}"{" checked" if k == 6 else ""} title="생명력 {k}">' for k in range(1, HP_MAX + 1)]
    return ''.join(out)


def circles(name):
    """개수 ○×6: 0(숨김) + 1~6 라디오, 누른 칸까지 칠해진다."""
    return (f'<span class="cir"><input type="radio" class="hz" name="{name}" value="0" checked>'
            + ''.join(f'<input type="radio" name="{name}" value="{k}" title="{k}개">' for k in range(1, 7)) + '</span>')


def gear():
    return '\n'.join(
        f'<div class="gi"><div class="gh"><button type="action" class="bub" name="act_gear{int(k)}" title="사용 (1개 줄이고 채팅에 출력)"></button>'
        f'<b>{n}<i>&times;</i></b>{circles(f"attr_gear_{k}")}</div><p>{e}</p></div>' for k, n, e in GEAR)


def gear_rep():
    return ('<div class="gi"><div class="gh"><button type="action" class="bub" name="act_use" title="사용 (1개 줄이고 채팅에 출력)"></button>'
            f'<input type="text" name="attr_name" title="특수 닌자도구 이름">{circles("attr_count")}</div>'
            '<textarea name="attr_effect" title="특수 닌자도구 효과"></textarea></div>')


def truths():
    return '\n'.join(
        f'<div class="tr nm"><button type="action" class="bub say" name="act_truth{i}" title="채팅에 출력"></button>'
        f'<div class="orow"><span class="chip">이름</span><input type="text" name="attr_truth_name_{i}" title="진실 {i} 이름"></div>'
        f'<div class="lab"><span class="chip">설정</span><textarea name="attr_truth_set_{i}" title="진실 {i} 설정"></textarea></div>'
        f'<div class="lab"><span class="chip">효과</span><textarea class="e" name="attr_truth_eff_{i}" title="진실 {i} 효과"></textarea></div></div>' for i in (1, 2, 3))


def ougi():
    out = []
    for i, sec in ((1, 'ougia'), (2, 'ougib')):
        out.append(
            f'<div class="og nj"><input type="checkbox" class="tgl tog" name="attr_Ougi{i}_imgopen" value="1" title="그림 주소 · 썸네일 펴기"><span class="pic"></span>'
            f'<button type="action" class="bub say" name="act_ougi{i}" title="채팅에 출력"></button>'
            f'<div class="orow"><span class="chip">오의명 {i}</span><input type="text" class="ogn" name="attr_Ougi{i}_name" title="오의명 {i}"></div>'
            f'<div class="orow"><span class="chip">지정 특기</span><input type="text" name="attr_Ougi{i}_skill" title="오의 {i} 지정 특기"></div>'
            f'<div class="lines"><span class="chip">효과</span><textarea name="attr_Ougi{i}" title="오의 {i} 효과"></textarea><img class="thumb" name="attr_Ougi{i}_img" alt=""></div>'
            f'<div class="orow imgrow"><span class="chip">그림 주소</span><input type="text" name="attr_Ougi{i}_img" title="오의 {i} 그림 주소"></div>'
            f'<div class="gps"><fieldset class="repeating_{sec}"><div class="gp">'
            '<div class="orow"><span class="chip gs">강점</span><input type="text" name="attr_sname" title="강점 이름"></div><textarea name="attr_seff" title="강점 효과"></textarea>'
            '<div class="orow"><span class="chip gw">결점</span><input type="text" name="attr_wname" title="결점 이름"></div><textarea name="attr_weff" title="결점 효과"></textarea>'
            '</div></fieldset><span class="gtl">강점 · 결점</span></div></div>')
    return '\n'.join(out)


def hp_css():
    """생명력 칸: 최대치보다 큰 칸은 흐리게 · 10칸 단위로 보이기 (hp_dim · hp_slots 는 워커가 맞춘다)."""
    out = []
    for m in range(0, HP_MAX):
        out.append(f'.t-hpd[value="{m}"] ~ .sg .hpb input:nth-of-type(n+{m + 2}){{border-color:#4a4a4a;background:transparent;pointer-events:none;cursor:default}}')
    for s in (10, 20, 30, 40):
        out.append(f'.t-hps[value="{s}"] ~ .sg .hpb input:nth-of-type(n+{s + 2}){{display:none}}')
    return '\n'.join(out)


def optional(name):
    p = SRC / name
    return p.read_text(encoding='utf-8').rstrip() if p.exists() else ''


def build():
    html = (SRC / 'shinobigami.src.html').read_text(encoding='utf-8')
    for key, val in {
        'FIELD_MIRRORS': field_mirrors(), 'COND_MIRRORS': cond_mirrors(), 'SKILLS': skills(), 'PEOPLE': people(),
        'BACKGROUNDS': backgrounds(), 'NINPO': ninpo(), 'NINPO_REP': ninpo_rep(), 'CONDS': conds(), 'BATTLEFIELDS': battlefields(),
        'PLOTS': plots(), 'TABLES': tables(), 'HPBOX': hpbox(), 'GEAR': gear(), 'GEAR_REP': gear_rep(), 'TRUTHS': truths(), 'OUGI': ougi(),
        'ROLLTEMPLATE': optional('rolltemplate.html'),
        'WORKER': f'<script type="text/worker">\n{optional("worker.js")}\n</script>',
    }.items():
        mark = f'<!--@{key}-->'
        assert mark in html, mark
        html = html.replace(mark, val)
    css = (SRC / 'shinobigami.src.css').read_text(encoding='utf-8')
    assert '/*@HP*/' in css
    css = css.replace('/*@HP*/', hp_css())
    return html, css


if __name__ == '__main__':
    html, css = build()
    OUT.mkdir(exist_ok=True)
    (OUT / 'shinobigami.html').write_text(html, encoding='utf-8')
    (OUT / 'shinobigami.css').write_text(css, encoding='utf-8')
    print('wrote', OUT / 'shinobigami.html', OUT / 'shinobigami.css')
