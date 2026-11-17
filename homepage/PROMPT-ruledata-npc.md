# 로컬 Claude Code 에 줄 프롬프트 — 룰 데이터(자동완성) 입력 · NPC 보관소

아래 `---` 사이를 그대로 복사해서 **홈페이지 소스가 있는 폴더**에서 연 Claude Code 에 붙여 넣으세요.
(Roll20 올인원 스크립트 쪽 일은 이 저장소에서 따로 합니다. 이 프롬프트는 홈페이지 쪽만 만듭니다.)

---

## 할 일

그누보드 기반 홈페이지의 캐릭터 게시판 스킨 `skin/board/character/sheet/` 에 두 가지를 만들어 줘.
같은 폴더에 이미 `import.roll20.php` · `import.roll20.lib.php` · `import.roll20.config.php` · `sheet.lib.php` 가 있어.
**먼저 이 파일들을 읽고** 코드 모양(주석 말투 · 함수 이름 앞머리 · 오류 응답 모양 · 열쇠 확인 · CORS)을 그대로 따라 줘.

1. **룰 데이터 입력기** — Roll20 시트 자동완성이 읽는 데이터(마법 · 인법 · 어빌리티 · 아이템 · 팔로워 종별)를 홈페이지 화면에서 직접 넣고 고치기
2. **NPC 보관소** — Roll20 에서 만든 NPC · 에너미 시트를 보관하고, 나중에 다른 방에서 이름으로 불러와 시트를 채울 수 있게 하기
   (내 캐릭터 시트를 받는 캐릭터 게시판과는 **따로** — 게시판 글을 만들지 않는다)

## 지켜야 할 것

- **PHP 5.4 호환** — `??` · `[]` 배열 문법 · 클로저 · `random_bytes` 등 쓰지 말 것 (기존 파일 머리 주석과 같게)
- DB 는 그누보드 함수(`sql_query` · `sql_fetch` · `sql_real_escape_string`)와 `G5_TABLE_PREFIX` 를 쓴다. 표가 없으면 처음 쓸 때 만든다(`CREATE TABLE IF NOT EXISTS`).
- 관리 화면은 **최고관리자(`$is_admin == 'super'`)만**. 그 밖에는 로그인 화면으로 보내거나 403.
- Roll20 이 부르는 주소(아래 `ruledata.php` · `npc.roll20.php`)는
  - `Access-Control-Allow-Origin: https://app.roll20.net` (import.roll20.php 와 같게 · OPTIONS 사전 요청에도 응답)
  - POST 본문은 JSON 글이고 Content-Type 이 `text/plain` 이어도 받는다 (사전 요청 없이 보내려고)
  - 열쇠는 `import.roll20.config.php` 의 `key` 를 그대로 쓴다 (`import.roll20.php` 의 비교 함수를 재사용 · 틀리면 1초 쉬고 실패)
  - 본문 크기 제한 (예: 2MB) · JSON 이 아니면 실패
- 화면 글은 한국어. 모바일에서도 쓸 수 있게(표는 좁으면 카드로).
- 새 파일 머리에 무엇을 하는 파일인지, 요청 · 응답 모양을 주석으로 적어 줘 (import.roll20.php 머리 주석처럼).

## 1. 룰 데이터 입력기

### 데이터 모양 (바꾸지 말 것 — Roll20 스크립트가 이 모양을 읽는다)

목록 6개, 목록마다 레코드 배열. 레코드 키는 아래만 쓴다 (없는 키는 빼도 됨, `name` 은 필수).

| 목록 키 | 무엇 | 레코드 키 |
|---|---|---|
| `insane` | 인세인 특기 · 어빌리티 | name, type, skill, effect, enemy |
| `shinobigami` | 시노비가미 인법 | name, group(유파), type, skill, range, cost, effect, enemy |
| `magicalogia` | 마기카로기아 마법(장서) | name, type, skill, target, cost, charge, effect, recite, enemy |
| `bloodmoon` | 블러드문 어빌리티 | name, group, type, lv, skill, cost, effect, flavor, enemy |
| `bloodmoon_item` | 블러드문 아이템 | name, kind, effect |
| `bloodmoon_follower` | 블러드문 팔로워 종별 | name, desc(개요), special(특수능력), upper(상위특수능력) |

- `type` · `skill` 은 시트 드롭다운에 보이는 글자 그대로 (예: "공격", "폭력").
- `enemy` 는 **에너미 전용**(룰북에서 에너미만 쓰는 어빌리티 · 장서 · 인법)이면 `1`, 아니면 키를 뺀다. 따로 목록을 만들지 않고 **같은 목록 안에** 둔다 (Roll20 쪽이 읽는 주소 · 목록이 그대로이게).
- 같은 목록 안에서 `name` 은 겹치지 않게 (겹치면 저장할 때 알려 주기).

예:
```json
{ "name": "첩보원",
  "desc": "몬스터를 조사하고 있는 비밀조직의 첩보원입니다……",
  "special": "사이클마다 한 번 수렵판정에 마이너스 2의 수정을 붙일 수 있다.",
  "upper": "사이클마다 추가로 [레벨-5]회, 수렵 판정에 마이너스 2의 수정을 붙일 수 있다." }
```

### 저장

- 표 `{prefix}nire_ruledata` : id, list(목록 키), name, data(레코드 JSON 통째), sort(차례), updated_at
- (list, name) 에 유일 색인

### 관리 화면 `ruledata.admin.php`

- 위쪽 탭: 목록 6개. 탭마다 그 목록의 레코드 표 + 찾기(이름 · 효과 글자 일부)
- 줄을 누르면 고치기 칸(목록마다 위 표의 키만 · effect · desc · special · upper 는 여러 줄 글칸 · enemy 는 [에너미 전용] 체크) · 저장 · 지우기(확인) · 복제
- 표 위에 걸러 보기 [전체 / 일반 / 에너미 전용] · 표에서 에너미 전용 줄은 꼬리표로 표시
- **붙여 넣기로 한꺼번에 넣기**: 엑셀 · 구글 시트에서 복사한 표(탭 구분)를 붙여 넣으면 첫 줄을 머리(키 이름 또는 한국어 머리: 이름 · 유파 · 그룹 · 타입 · 지정특기 · 간격 · 목표 · 코스트 · 충전 · 효과 · 주문 · 분류 · 개요 · 특수능력 · 상위특수능력 · 레벨 · 에너미 · 에너미전용)로 읽어 미리보기 → [넣기]. 이름이 같은 것은 [덮어쓰기 / 건너뛰기] 고르기
  - 에너미 칸 값은 `1 · O · ○ · Y · 예 · TRUE · 에너미` 를 1 로, 빈 칸 · 그 밖은 일반으로
  - 붙여 넣기 화면에 [이번에 넣는 것은 모두 에너미 전용] 체크도 둔다 (룰북 에너미 장만 따로 붙일 때)
- JSON 내보내기 · 들여오기 (백업용 — 목록 하나 또는 전체)
- 끌어서 차례 바꾸기는 없어도 됨 (이름 차례로 보여 줘도 됨)

### 내보내는 주소 `ruledata.php` (GET)

- 응답: `window.NIRE_RULEDATA = {…};` (Content-Type `application/javascript; charset=utf-8`)
  - `?format=json` 이면 `{…}` 만 (`application/json`)
- 목록 6개를 모두 담는다 (비어 있으면 빈 배열). 레코드는 data 의 키만 (id · sort 같은 저장용 값은 빼기)
- 열쇠 없이 읽을 수 있어도 된다 (룰북 데이터라 공개 · 쓰기는 관리 화면에서만)
- `Last-Modified` · `ETag` 를 내고 맞으면 304 · 고칠 때마다 바뀌게

Roll20 쪽 설정: 올인원 ⚙ 설정 → 기본시트 데이터 자동완성 → **데이터 주소** = `https://(홈페이지)/skin/board/character/sheet/ruledata.php`

## 2. NPC 보관소

### 저장

- 표 `{prefix}nire_npc` : id, rule(룰 키 — import.roll20.lib.php 가 알아보는 것과 같게 · 모르면 'unknown'), name, tags(쉼표 구분), memo, data(아래 char 통째 JSON), roll20_id, created_at, updated_at
- (rule, name) 에 유일 색인 — 같은 룰 · 이름이면 새로 만들지 않고 고친다(덮어쓰기)

### Roll20 이 부르는 주소 `npc.roll20.php` (POST)

`char` 의 모양은 `import.roll20.php` 가 받는 것과 **똑같다**:
`{ id, name, avatar, bio, gmnotes, hint, attrs: [[이름, current, max], …], order: { 반복묶음: [줄id…] } }`

| 요청 | 응답 |
|---|---|
| `{ op:'ping', key }` | `{ ok:true, count, rules:[…] }` |
| `{ op:'save', key, char, tags? }` | `{ ok:true, id, mode:'new' \| 'update', rule }` — 룰은 import.roll20.lib.php 의 룰 알아보기 함수로 |
| `{ op:'list', key, rule?, q? }` | `{ ok:true, items:[{ id, rule, name, avatar, tags, updated_at }] }` — q 는 이름 · 태그 일부, 최대 200개, 이름 차례 |
| `{ op:'get', key, id }` 또는 `{ op:'get', key, rule, name }` | `{ ok:true, item:{ id, rule, name, tags, memo, char } }` |

- 실패는 `{ ok:false, msg }` (import.roll20.php 와 같은 모양)
- 모든 요청에 열쇠 필요 (NPC 는 GM 비밀이라 읽기도 막는다)

### 관리 화면 `npc.admin.php`

- 룰별 걸러 보기 · 이름 · 태그 찾기 · 목록(아바타 작게 · 이름 · 룰 · 태그 · 고친 때)
- 하나 열면: 아바타 · 이름 · 태그 · 메모(고치기) · 바이오 · GM 메모(HTML 그대로 보이되 스크립트는 빼기) · 속성 표(attrs 를 이름 차례로 · 반복 줄은 묶어서)
- 지우기(확인) · 이름 바꾸기 · 복제 · JSON 내보내기/들여오기(백업)
- 홈페이지에서 NPC 를 처음부터 입력하는 화면은 **없어도 된다** (Roll20 시트에 입력해서 보내는 방식)

## 끝나면 알려 줄 것

- 만든 파일 목록과 각 파일이 하는 일
- 두 주소의 실제 URL 모양
- 붙여 넣기에서 알아보는 한국어 머리 목록
- 시험해 본 것: 관리 화면에서 넣기 · 고치기 · 붙여 넣기 · `ruledata.php` 응답 · `npc.roll20.php` 의 ping · save · list · get (curl 로)

---

## 이미 위 프롬프트로 만들었다면 — 이것만 붙여 넣기

> 룰 데이터 입력기에 **에너미 전용** 표시를 더해 줘. 새 목록 · 새 주소를 만들지 말고 지금 목록(insane · shinobigami · magicalogia · bloodmoon)의 레코드에 `enemy` 키(에너미 전용이면 `1`, 아니면 키 없음)를 더한다.
> - 고치기 칸에 [에너미 전용] 체크 · 표 위에 [전체 / 일반 / 에너미 전용] 걸러 보기 · 표에 꼬리표
> - 붙여 넣기: 머리 `에너미` · `에너미전용` 을 enemy 로 읽고 값 `1 · O · ○ · Y · 예 · TRUE · 에너미` 를 1 로. [이번에 넣는 것은 모두 에너미 전용] 체크도
> - `ruledata.php` 주소 · 응답 모양은 그대로 (레코드에 enemy 키만 더 나옴). JSON 내보내기 · 들여오기에도 enemy 가 들어가게
> - 끝나면 에너미 전용 하나를 넣고 `ruledata.php?format=json` 에 `"enemy":1` 이 나오는지 curl 로 보여 줘

## (참고) Roll20 스크립트 쪽에서 이어서 할 일 — 이 저장소에서

- 자동완성: 데이터 주소에 `ruledata.php` 를 넣으면 지금 기능 그대로 읽는다. 팔로워 종별(`bloodmoon_follower`)은 시트의 팔로워 종별 칸(`kind`)에서 고르면 특수능력 칸(`special`)을 채우고, **LV 6 이상일 때만** 상위특수능력을 아랫줄에 붙인다 (v1.115.0 에서 넣음). 에너미 전용(`enemy:1`)은 같은 칸에서 고를 수 있고 고르는 목록에 '에너미 전용'으로 표시된다 (v1.115.2).
- NPC 보관소: 홈페이지가 준비되면 ① 시트 창에서 [NPC 보관소로 보내기] ② 새 시트의 이름 칸에 NPC 이름을 치면 보관소에서 찾아 시트 전체(속성 · 반복 줄 · 바이오)를 채우기 — 위 `npc.roll20.php` 모양대로 붙인다.
