# Roll20 시트 등록 노하우 (Roll20/roll20-character-sheets)

한국어 시트 9개(블러드문 · 둘이서 수사 · 아마데우스 · 시노비가미 · 킬데스 비즈니스 · 비기닝 아이돌 · 피카부 · 적과 흑 · 사무라이 블레이드)를
올리며 겪은 것. 시트 만드는 순서는 [PROCESS.md](PROCESS.md), 기술 함정은 [LESSONS.md](LESSONS.md).

## 0. 전체 흐름

1. 포크에 브랜치 푸시 → **사용자가** compare 링크로 PR 을 연다 (Claude 는 브랜치 · 링크 · 영어 제목까지)
2. PR 자동 검사(Sheet Checks) → 봇 댓글 "Checks passed, with notes"
3. 리뷰어 요청에 대응 (같은 브랜치에 커밋을 더 올림)
4. 새 시트: Roll20 직원이 approved.yaml(공식 시트 목록)에 등록하는 PR 을 따로 만들어 머지 (예: #15736)
5. 시트 PR 머지 → 몇 분 안에 Roll20 이 CDN 에 배포 → 게임의 시트 고르기 화면에 나옴
6. 배포 확인 (4장의 주소로)

## 1. 올리기 전 준비

- **폴더**: `<시트 영어 이름>/` — 뒤에 `(Korean)` 을 붙이지 않는다 (2026-11-24 리뷰어 요청, 9개 모두 바꿈).
  예외: `Blood Moon (Korean)` (이미 그 이름으로 합쳐져 있음).
- **파일**: html · css · sheet.json · 미리보기 png (+ images/).
  sheet.json 키는 `html · css · authors · roll20userid · preview · instructions · legacy(false)`.
- **제작자 · 계정 번호**:
  - 블러드문: `authors` = `nire`, `roll20userid` = `4733990` — 바꾸지 않는다 (2026-11-28 사용자 결정)
  - 나머지 8개: `sai-korokoro` · `9429405`
- **PR 하나 = 시트 폴더 하나**. 루트 파일이나 다른 폴더는 건드리지 않는다 (봇이 막는다).
- **커밋 제목**: `[폴더 이름] New Sheet: …` · `[폴더 이름] Bugfix: …`.
  끝에는 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` 한 줄만 (Claude-Session 줄은 넣지 않는다).
- **브랜치**: upstream master 에서 새로, 시트마다 따로 (예: `shinobigami-chat-cards`).
  - 이미 머지된 시트를 고칠 때도 **새 브랜치 · 새 PR** (머지된 PR 에는 더 못 올린다).
  - 옛 브랜치를 다시 쓸 때는 master 를 merge 로 들여온다. force push 는 하지 않는다 (예: `blood-moon-author`, 2026-11-28).
- **포크**: `sai-korokoro/Blood-Moon-Korean-` (예전 이름 `nireonyou-stack/blood-moon-korean-` 로 푸시해도 넘어간다).
  클론은 `/home/user/blood-moon-korean-` (sparse-checkout — 새 폴더는 `git sparse-checkout add "<폴더>"`).
- **PR 링크**: `https://github.com/Roll20/roll20-character-sheets/compare/master...sai-korokoro:Blood-Moon-Korean-:<브랜치>?expand=1`
  (새 시트는 끝에 `&template=new_sheet.md` — 게임 정보 · 체크리스트 양식이 붙는다)
- **올리기 전 점검**
  - `python3 roll20kit/lint.py <sheet 폴더>` 0/0 · `node <룰>/roll20/test/test.js` · `node roll20kit/view.js` 화면 확인
  - 바뀐 파일이 그 폴더뿐인지: `git diff --stat upstream/master..HEAD`
  - 포크에 넣은 html · css 가 이 저장소의 빌드 결과와 같은지

## 2. 자동 검사 · 봇 메시지 읽는 법

| 보이는 것 | 뜻 |
|---|---|
| "✅ Checks passed, with notes" | 정상 |
| note "This is a new sheet, the development team will have to add this to the database." | 정보 — 직원이 등록한다 |
| note "Could not find a translation.json in your sheet" | 정보 — 번역 파일은 Crowdin 으로만 |
| 병합 상자 "2 of 3 checks passed" · "Character Sheet Validation failed" | 새 시트면 늘 이렇다 (직원 답변 #14724 · #15273) |
| 경고 "pull_request_target … December 2, 2026" | GitHub 공지 — 우리와 무관 |
| 직원 PR(approved.yaml 수정)의 "2 errors to fix · Could not find a sheet folder · root directory" | 그 PR 이 루트 파일을 고쳐서 나는 것 — 우리와 무관 (#15736) |

## 3. 리뷰어가 요청한 것 (다음 시트도 처음부터 지킨다)

- 폴더 이름에서 `(Korean)` 빼기
- `<html>` · `<head>` · `<body>` 태그 빼기, script 요소는 하나, `<table>` 금지
- PR 체크리스트 문구는 그대로 두고 체크만
- 번역 파일은 Crowdin 으로만
- 공식 시트 · 룰북에 인쇄된 문장(기본 능력 설명 등)은 시트에 넣지 않는다 (2026-11-23, 6개 시트에서 뺌)

## 4. 머지 뒤 — 배포 확인

- Roll20 은 머지된 시트를 `https://storage.googleapis.com/roll20-cdn/sheetsockets/<내부 이름>/v1.0.0/` 에 올린다
  (index.html · index.css · sheetworkers.json · rolltemplates.json · 미리보기 png 등). 게임은 여기서 시트를 가져온다.
- 내부 이름은 approved.yaml 의 키 (직원이 정함):

  | 폴더 | 내부 이름 |
  |---|---|
  | Amadeus | `amadeus` |
  | Futari Sousa | `futarisousa` |
  | Shinobigami | `shinobigamisaikoro` |
  | Kill Death Business | `killdeathbusiness` |
  | Beginning Idol | `beginningidol` |
  | Peekaboo | `peekabo` (o 하나 — Roll20 쪽 이름 그대로) |
  | Red and Black | `redandblack` |
  | Samurai Blade | `samuraiblade` |
  | Blood Moon (Korean) | `bloodmoon` |

- **확인 방법**: `…/sheetsockets/<내부 이름>/v1.0.0/<미리보기 파일>` 을 브라우저로 연다. 그림이 뜨면 배포됨, 404 면 안 됨.
  올라간 파일 목록 · 시각은 `https://storage.googleapis.com/roll20-cdn?prefix=sheetsockets/<내부 이름>/` (LastModified).
- 시트 고르기 화면의 이름(예: "Shinwa Sousei RPG Amadeus")은 직원이 정한 것이라 우리 파일에는 없다.

## 5. 사례: 아마데우스 · 둘이서 수사가 빈 시트로 나옴 (2026-11-26 ~ 27)

- **증상**: 시트 고르기 화면에 제작자 · 미리보기가 없고, 게임에서 캐릭터 시트가 빈 화면.
- **원인 찾기**: 사용자가 정상 시트(시노비가미)의 미리보기 주소를 알려 줘서 배포 위치(4장)를 알았다.
  9개 모두 11-26 19:20~19:24 UTC 에 머지됐는데, 이 두 개만 CDN 에 파일이 없었다.
  우리 파일 구성 · sheet.json · HTML/CSS/JS · 자동 검사 결과 · 머지 형태는 정상 시트와 같았다.
- **조치**: 확인된 사실과 링크(정상 1개 · 404 2개)만 적은 영어 댓글 → 직원이 몇 시간 안에 다시 배포 (11-27 18:34 · 18:44 UTC).
- **교훈**: 처음 짐작(폴더 이름을 바꾼 탓)은 틀렸다. 짐작으로 댓글을 달지 말고, 누구나 눌러 볼 수 있는 증거부터 모은다.

## 6. 소통

- Roll20 쪽 댓글은 영어로 짧게: 확인된 사실 + 링크. 원인을 짐작해 쓰지 않고,
  "If something in the sheet files is causing it, please let me know and I will fix it." 처럼 판단은 직원에게 넘긴다.
- 사용자에게는 한국어로 설명하고, 영어 문장은 뜻을 붙여 준다.
- Roll20 정책: AI 도움을 받더라도 사람이 코드를 고칠 수 있어야 한다 → 사용자가 이해하고 설명할 수 있는 내용만 올린다.
- 직원은 미국 업무 시간에 움직인다 (한국 새벽 ~ 오전 = 미국 낮). 댓글을 달면 바로 처리되기도 한다.
