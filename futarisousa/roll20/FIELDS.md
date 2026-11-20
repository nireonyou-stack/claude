# 둘이서 수사 Roll20 시트 — 홈페이지 짝표용 필드 목록

Roll20 시트 `Futari Sousa (Korean)` 의 속성(attribute) 이름 · 값 형식. 홈페이지 `tpl/futari.json` 열쇠와 맞춘 것.

- 시트 HTML: `futarisousa/roll20/sheet/futarisousa.html` (Roll20 PR: `Futari Sousa (Korean)/futarisousa.html`)
- 체크칸 값: 체크 `"1"`, 해제 `"0"` (빈 값일 수도 있음)
- 반복 줄: `repeating_<섹션>_<줄 id>_<칸>`. 줄 순서는 `_reporder_repeating_<섹션>` (쉼표로 이은 줄 id. 없으면 만든 순서)

## 시트 종류 (한 캐릭터 = 한 종류)

| 칸 | 값 |
|---|---|
| `sheet_type` | `det` 탐정 · `asi` 조수 · `base` 아지트 · `case` 사건 조사 · `cards` 알고 있었어/괴도 카드 · `thief` 괴도 |
| `role` | `탐정` · `조수` · 그 밖의 종류는 빈 값 (워커가 `sheet_type` 따라 채움) |
| `tab` | 화면 탭 (`pc` · `pre` · `hq` · `fight` · `extra`) — 짝표에는 필요 없음 |
| `sheet_version` | 시트 버전 (지금 `1`) — 짝표에는 필요 없음 |

## 탐정 · 조수 시트 (`det` · `asi`)

| 칸 | 내용 |
|---|---|
| `character_name` | 이름 (Roll20 캐릭터 이름) |
| `character_avatar` | 초상 (Roll20 캐릭터 아바타) |
| `cls` · `background` · `age` · `height` · `fashion` · `like` · `dislike` · `job` | 클래스 · 배경 · 나이 · 신장 · 패션 특징 · 좋아하는 것 · 싫어하는 것 · 직업 |
| `skill_<g>_<i>` | 기능 습득 `"1"`. g 분야 1 통찰 · 2 감식 · 3 인간 · 4 육체, i 1~6 (아래 표) |
| `quirk_1` ~ `quirk_6` | 기벽 (탐정만, 주사위 눈 1~6) |
| `calm` | 【여유】 (조수만, 숫자) |
| `worry` | 【마음고생】 `"0"`~`"3"` (조수만) |
| `repeating_guests` | 게스트 (조수만): `used` 체크 · `name` · `skill` · `rel` 관계 · `memo` |
| `repeating_acts` | 습득한 액션: `name` · `type` · `cost` · `eff` 효과 |
| `partner` · `call` | 파트너 이름 · 호칭 |
| `repeating_plike` · `repeating_pdislike` | 파트너의 마음에 드는 점 · 안 드는 점, 한 줄에 하나: `text` |
| `memo` | 수사 메모 |

기본 액션은 입력칸이 아니라 시트에 인쇄돼 있어서 `repeating_acts` 에 없다. 탐정은 「둘이서 수사」, 조수는 「따라잡다」를 `role` 로 붙이면 된다.

기능 이름 (`skill_<g>_<i>`):

| g \ i | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| 1 통찰 | 거짓말 | 변화 | 외견 | 물리 | 현장 | 날씨 |
| 2 감식 | 교통 | 정보 | 지문 | 과학 | 법의학 | 생물 |
| 3 인간 | 사교 | 가사 | 소문 | 설득 | 유행 | 비즈니스 |
| 4 육체 | 포박 | 방어 | 끈기 | 체력 | 돌파 | 추적 |

### 사전 조사 시트 (탐정 · 조수 시트의 탭)

| 칸 | 내용 |
|---|---|
| `pre_date` | 날짜 |
| `pre_q1` ~ `pre_q5` | 적은 내용 · `pre_c1` ~ `pre_c5` 체크 |

질문: 1 어떤 탐정인가요? / 어떤 조수인가요? · 2 이 캐릭터를 대표하는 행동 · 3 탐정으로서 하고 싶은 일 (탐정만) · 4 파트너가 해주기를 바라는 대우 · 5 탐정을 위해 하고 싶은 일 (조수만)

## 아지트 시트 (`base`, 두 PC 공용)

| 칸 | 내용 |
|---|---|
| `agit` · `agit_about` · `sign` | 아지트의 이름 · 어떤 곳? · 간판 탐정 |
| `repeating_keeps` | 추억의 물품: `name` · `what` 어떤 물건 · `ep` 에피소드 |
| `repeating_box` | 아이템 상자: `name` · `n` 개수 |
| `fight_cause` · `fight_det` · `fight_asi` · `fight_key` · `fight_how` | 다툼: 원인 · 탐정의 견해 · 조수의 견해 · 키워드 · 해결 방법 |
| `fight_done` | 다툼 해결 `yes` · `no` |
| `ex_det` · `ex_asi` · `confessed` | 규격 외: 탐정의 이름 · 조수의 이름 · 고백했다 체크 |
| `repeating_exdet` · `repeating_exasi` | 탐정 · 조수 PC의 규격 외 액션: `name` · `type` · `cost` · `eff` |

## 사건 조사 시트 (`case`, 그 세션만)

| 칸 | 내용 |
|---|---|
| `title` · `date` | 사건명 · 날짜 |
| `tantei` · `joshu` | 사건 담당자 (탐정 · 조수) |
| `block` · `level` | 조사 방해 요인 · 수사 곤란 레벨 (숫자) |
| `people` · `keys` | 등장인물 · 키워드 |
| `repeating_tjlike` · `repeating_tjdislike` | 탐정이 조수에 대해 마음에 드는 점 · 안 드는 점: `text` |
| `repeating_jtlike` · `repeating_jtdislike` | 조수가 탐정에 대해 마음에 드는 점 · 안 드는 점: `text` |
| `cond_1` ~ `cond_6` | 상태이상 체크: 1 엇갈림 · 2 탐정의 폭주 · 3 다툼 · 4 미아 · 5 질 나쁜 소문 · 6 주목받음 |
| `heart` · `heart_open` | 숨겨둔 마음 · 보이기 체크 |

## 알고 있었어 · 괴도 카드 (`cards`)

| 칸 | 내용 |
|---|---|
| `repeating_knew` | 알고 있었어 카드: `no` 번호 · `text` |
| `repeating_pcards` | 괴도 카드: `no` · `text` |

## 괴도 시트 (`thief`, GM)

| 칸 | 내용 |
|---|---|
| `character_name` · `character_avatar` | 이름 · 초상 (Roll20 캐릭터) |
| `background` · `realname` · `age` · `height` · `fashion` · `like` · `dislike` · `job` | 배경 · 진짜 이름 · 나이 · 신장 · 패션 특징 · 좋아하는 것 · 싫어하는 것 · 직업 |
| `repeating_tdlike` · `repeating_tddislike` | 탐정에 대해 마음에 드는 점 · 안 드는 점: `text` |
| `repeating_talike` · `repeating_tadislike` | 조수에 대해 마음에 드는 점 · 안 드는 점: `text` |
| `repeating_tcards` | 괴도 카드 (초안): `no` · `text` |

## 처음 받은 열쇠 목록과 달라진 점

| 처음 | 지금 |
|---|---|
| `p_like` · `p_dislike` (글칸) | `repeating_plike` · `repeating_pdislike` (한 줄씩) |
| `tj_like` · `tj_dislike` · `jt_like` · `jt_dislike` (글칸) | `repeating_tjlike` · `repeating_tjdislike` · `repeating_jtlike` · `repeating_jtdislike` |
| `confess` (고백 효과) | 없음 — 시트에 인쇄된 고정 글 |
| `repeating_acts` 첫 줄 = 기본 액션 | 기본 액션은 인쇄 · `repeating_acts` 는 습득한 액션만 |
| — | 새로 생김: `background` · 사전 조사 `pre_*` · 다툼 `fight_*` · 규격 외 `ex_*` · `confessed` · `repeating_exdet/exasi` · `heart_open` · 카드 · 괴도 시트 |
