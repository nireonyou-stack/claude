# Roll20 시트 만들기 — 시행착오 기록 · 체크리스트

블러드문(Blood Moon (Korean)) 시트를 Roll20 에 내며 겪은 일을 모은 것. 새 룰 시트도 이 목록을 지킨다.
만드는 순서 · 판단 기준(자료 모으기 → 목업 → 승인 → 제출, 넣는 것 · 안 넣는 것, 사이코로 픽션 공통 부품)은 [PROCESS.md](PROCESS.md).
`python3 roll20kit/lint.py <시트 폴더>` 가 아래 ✔ 표시 항목을 자동으로 막는다 — 시트를 고칠 때마다 돌린다.
프로 계정이 없어 실제 Roll20 에서 시험할 수 없으니, 화면은 `node roll20kit/view.js <시트 폴더> <출력.html> [견본.json]` (가상 Roll20)로 본다.
가상 Roll20 은 시트를 iframe 의 `.charsheet` 안에 Roll20 기본 CSS 흉내와 함께 그리고, 반복 섹션을 `.repcontainer` 로 펼치고, 워커를 그대로 돌리고, 채팅에는 `.sheet-rolltemplate-*` 규칙만 싣는다 — lint 의 CSS 오류가 하나라도 있으면 채팅 CSS 를 통째로 뺀다 (실제 Roll20 과 같게). Roll20 기본 CSS 는 실제 값이 아니라 흉내이니, 새로 알게 된 실제 모습은 여기와 view.js 의 BASE 에 같이 적는다.

## 1. 채팅 카드(롤 템플릿) CSS 가 빠지는 것 — 네 번 고침 (가장 큰 함정)

실제 게임에서 시트는 iframe 안에 그려지고, 채팅이 있는 바깥 문서에는 Roll20 이 시트 CSS 에서 **롤 템플릿 규칙만 골라** 넣는다.
이 골라 넣기는 조건이 까다로워, 어긋나면 카드에 class 는 붙는데 규칙이 하나도 안 실린다(카드가 맨 글로 보임).

- ✔ CSS 파일 전체가 **ASCII 만**. 한글 주석 · `─` · `↺` 등은 물론, **CSS 이스케이프(`\25B8` 같은)로 써도 안 된다** (6a1a62b · 2021dbe)
  → 글리프(▸ ▼ ♥ 🎲 …)는 HTML 글자로 넣거나 `images/` 의 PNG 로.
- ✔ **롤 템플릿 규칙을 파일 맨 위**에, 시트 규칙보다 먼저 (e222b35)
- ✔ 그림을 `data:` 주소로 CSS 에 넣지 않는다 → `images/` 폴더의 PNG 를 `https://raw.githubusercontent.com/Roll20/roll20-character-sheets/master/<폴더>/images/…` 로 (e222b35)
- ✔ `@import` 말고는 at-rule(`@media` · `@font-face` · `@keyframes` …)을 쓰지 않는다 (e222b35)
- ✔ Google Fonts 는 옛 주소 `https://fonts.googleapis.com/css?family=A:400,700|B:900&display=swap` (`/css2` 금지) (e222b35)
- ✔ 주석 안에 `'` · `;` 를 쓰지 않는다 (e222b35)
- ✔ 다크 모드 카드 선택자는 같은 요소: `.sheet-rolltemplate-이름.sheet-rolltemplate-darkmode .sheet-card` (e222b35)
- ✔ 블러드문 v4(11-13) 뒤로 실제 게임에서 카드가 제대로 나오는 것을 사용자가 확인함 (11-20) — 위 목록이 원인 전부였다

## 2. 채팅 카드 안쪽

- 카드 안 인라인 굴림 결과(`.inlinerollresult`)는 Roll20 이 노란 상자 · 회색 글자로 칠한다. 카드에서 **인라인 굴림까지 칠하는 넓은 선택자**를 쓰지 않는다
  (예: `.sheet-r > span` 이 굴림 값까지 회색으로 — b3b8831). 값은 `computed::` 로 넣고 `.inlinerollresult` 를 카드 안에서 따로 정리한다.
- `computed::키` 는 매크로의 **앞쪽 칸**에 둔다 (블러드문 rolltemplate 주석).
- 펌블 · 스페셜처럼 룰이 바꿀 수 있는 판정은, 룰 요약에 정확한 조건이 있을 때만 자동으로 찍는다 (5a5d65a — 블러드문은 펌블치가 오르는 룰이라 뺐다).
- 채팅 칸 폭은 약 270~290px. 카드는 그 폭에서 줄바꿈이 깨지지 않게.

## 3. Roll20 기본 CSS (시트 iframe 안의 base.css)

- ✔ Roll20 은 모든 `label` 을 inline-block · 폭 100% · 굵게 · 여백으로 그린다 — 한 클래스짜리 선택자로는 못 이긴다.
  label 규칙은 **요소 + 클래스 둘 이상** (`.futari label.st`) 으로 쓰고 폭 · 여백 · 굵기를 다시 준다 (8803593 · f310ced)
- ✔ Bootstrap 클래스 이름(`mark` · `btn` · `label` · `badge` · `well` · `row` · `table` · `hide` · `show` …)을 시트에 쓰지 않는다
  — `.mark` 에 노란 바탕이 붙었다 (9134f42)
- 입력칸 · select · textarea · button 은 Bootstrap 모양(높이 · 테두리 · 그림자 · 그라데이션)이 먼저 깔린다 → 시트 루트 아래에서 height:auto · box-shadow:none 등으로 다시 준다.
- 반복 섹션 아래 Roll20 이 `Modify` · `+Add` 단추(`.repcontrol`)를 붙인다 — 시트 모양에 맞게 다시 그린다 (9416a6d)
- **시트 폭은 830px** 기준. 넘치면 오른쪽 칸이 밀려난다 (cdb5625)

## 4. HTML · 워커

- ✔ 단추 이름(`act_…`)에는 `_` 를 쓰지 않는다 (Roll20 이 반복 줄 이름으로 읽음)
- ✔ 반복 섹션 이름은 `repeating_` 뒤에 영소문자 · 숫자만
- ✔ 라디오 묶음에는 숨은 빈 라디오(`value="" checked`, CSS 로 숨김)를 둔다 — checked 가 없으면 Roll20 이 첫 라디오를 기본값으로 골라 새 캐릭터에 값이 미리 들어간다 (아마데우스 · 둘이서 수사 다툼)
- ✔ `<table>` 태그를 쓰지 않는다 — Roll20 PR 봇이 Good Code 규정 위반으로 경고. 표는 div 그리드로 (둘이서 수사 감정 표)
- `:has()` · `color-mix()` 같은 최신 CSS 는 피한다 (Roll20 쪽 처리 확인 안 됨) — ✔ lint 가 경고
- 시트 종류 · 탭은 숨은 `<input type="hidden" name="attr_…">` + 형제 선택자로 가른다 (Roll20 이 hidden 의 value 속성을 고쳐 줌)
- 새 시트 기본값(기본 줄 등)은 `sheet:opened` + `sheet_version` 으로 한 번만

## 5. 제출 (Roll20/roll20-character-sheets 로 PR)

- 폴더: `<시트 이름>/` 에 html · css · sheet.json · 미리보기 png (+ images/)
- ✔ sheet.json: html · css · authors · roll20userid · preview · instructions · legacy
- 포크 `nireonyou-stack/Blood-Moon-Korean-` 에 upstream master 에서 새 브랜치 → 사용자가 compare 링크로 PR
- 커밋 제목 꼴: `[시트 이름] New Sheet: …` · `[시트 이름] Bugfix: …`
- 새 시트 PR 은 `?expand=1&template=new_sheet.md` 를 붙인 compare 링크로 연다 (게임 정보 · 체크리스트 양식). 룰 텍스트 칸은 블러드문 · 둘이서 수사 모두 체크 + 설명(게임 용어만 / 공식 시트 인쇄 문구만)
- PR 봇의 알림 중 `translation.json 없음` · `새 시트라 DB 등록 필요` 는 정보일 뿐 — 고칠 것 없음
