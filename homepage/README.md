# 홈페이지 — Roll20 시트 받기 (import.roll20)

올인원 스크립트(`userscript/roll20-layout2-allinone.user.js`)의 **🏠 홈페이지로 보내기**가 보내는 캐릭터를 캐릭터 게시판 SHEET 글로 받는 파일들입니다.

## 파일 (캐릭터 게시판 스킨의 `sheet/` 폴더에 올림)

| 파일 | 하는 일 |
|---|---|
| `sheet/import.roll20.php` | 받는 곳. 열쇠 확인 → 룰 알아보기 → 새 시트 또는 새 판 → 원본 보관 |
| `sheet/import.roll20.lib.php` | 룰별 짝표 (Roll20 칸 → 홈페이지 시트 칸) |
| `sheet/import.roll20.config.sample.php` | 열쇠 · 글쓴이 견본 → `import.roll20.config.php` 로 복사해 고침 |

## 설치

1. 세 파일을 `skin/board/character/sheet/` 에 올립니다 (같은 폴더에 `sheet.lib.php` · `tpl/` 이 있어야 함).
2. `import.roll20.config.sample.php` 를 복사해 `import.roll20.config.php` 를 만들고 고칩니다.
   - `key` : 12자 이상의 아무도 모르는 값
   - `mb_id` : 새 시트 글의 글쓴이 (관리자 아이디 권장)
3. Roll20 에서 ⚙ 설정 → **홈페이지로 보내기**
   - 홈페이지 주소: `https://(홈페이지)/skin/board/character/sheet/import.roll20.php`
   - 열쇠: 2 의 `key` 와 같은 값
   - [연결 확인] → `✓ 연결됨 — 짝표: bloodmoon …`

## 받으면

- **이름(글 제목) · 룰이 같은 SHEET 글이 있으면** 그 시트의 **새 판** — 지금 판은 앞선 판으로 남습니다 (판 이름: `Roll20 날짜 시각`).
- **없으면 새 SHEET 글** — 비밀글이라 관리자 · 글쓴이만 봅니다 (점검 뒤 직접 공개). 같은 이름 프로필 글이 있으면 그 무리로 이어 붙입니다.
- 짝표에 있는 칸만 덮어씁니다. 메모 · 보이기 설정 · 세션 기록처럼 홈페이지에서만 쓰는 값은 그대로입니다 (단 목록 칸 — 어빌리티 · 아이템 등 — 은 Roll20 것으로 통째로 바뀝니다).
- **원본 보관**: 보낸 캐릭터 전체(속성 · 반복 줄 · 바이오 · GM 메모)를 `data/sheet_r20/<글번호>_<시각>_<Roll20 id>.json` 에 남깁니다 (웹에서 못 열게 막아 둠).
- **짝표가 아직 없는 룰**은 글을 만들지 않고 원본만 `data/sheet_r20/raw_…json` 에 남깁니다.

## 짝표

| 룰 | 상태 |
|---|---|
| 블러드문 (Roll20 `Blood Moon (Korean)`) | ✅ 머리 칸 · 특성치 · 게이지 · 변조 · 부위 대미지 · 특기(갭 포함) · 어빌리티 · 아이템 · 행복 · 관계 · 스토리 · 메모 |
| 시노비가미 · 인세인 · 마기카로기아 · D&D 5판 | ⏳ 원본 보관만 — Roll20 시트 칸 이름을 받은 뒤 추가 |

룰은 시트 칸 이름으로 먼저 알아보고, 모르면 Roll20 방의 시트 이름을 틀(`tpl/*.json`)의 이름 · 별칭(`aliases`)과 맞춰 봅니다.

## 보안

- 열쇠가 맞지 않으면 아무것도 하지 않습니다 (틀리면 1초 쉼).
- 응답은 Roll20(`https://app.roll20.net`) 에서만 읽을 수 있습니다 (CORS).
- 보낸 내용은 6MB 까지만 받습니다.
- PHP 5.4 에서도 돕니다 (`sheet.lib.php` 와 같은 규칙).
