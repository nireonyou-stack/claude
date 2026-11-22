# 비기닝 아이돌 (Korean) — 칸 이름

홈페이지 짝표 · 올인원 자동완성이 쓰는 속성 목록. Roll20 에 같은 룰 시트가 없어 새로 정한 이름이다.

| 속성 | 뜻 | 값 |
|---|---|---|
| `route` | 시트 종류 · 노선 | `tiara` 티아라 · `crown` 크라운 · `unit` 유닛 시트 |
| `pc_role` | PC 역할 | `side` 사이드 PC · `center` 센터 PC · `support` 서포터 |
| `idol_class` · `background` | 아이돌 클래스 · 배경 | 글 |
| `character_name` · `age` · `player` | 이름 · 나이 · 플레이어 | 글 |
| `image_color` · `feature1` · `feature2` · `likes` · `dislikes` | 이미지 컬러 · 특징 1 · 2 · 좋아하는 것 · 싫어하는 것 | 글 |
| `voice` · `physical` · `visual` | 보이스 · 피지컬 · 비주얼 | 숫자 |
| `kosei_skill` · `kosei_target` | 개성 특기 · 개성 목표치 | 글 |
| `A2` … `F12` | 특기 습득 (열 A~F = 신장 · 속성 · 재능 · 캐릭터 · 취미 · 출신, 줄 2~12) | `1` / 빈칸 |
| `D7_name` · `E7_name` | 캐릭터 7 · 취미 7 (직접 적는 특기) | 글 |
| `A2_value` … | 목표치 (워커가 계산) | 숫자 / 빈칸 |
| `gap_a` … `gap_e` | 공백 칠하기 (a = 신장 \| 속성 … e = 취미 \| 출신) | `1` / 빈칸 |
| `acting` | 【연기파 아이돌】 — 특기 리스트 왼쪽 끝 · 오른쪽 끝 연결 | `1` / 빈칸 |
| `link1_used` … `link6_used` | 아이돌 링크 사용함 (인쇄된 6 개) | `1` / 빈칸 |
| `sk1`~`sk6` `_name` · `_type` · `_skill` · `_effect` | 아이돌 스킬 (타입 `보조` / `상주`) | 글 |
| `re1` … `re6` | 리액션 표 1~6 | 글 |
| `un1_name` … `un6_name` · `un1` … `un6` | 이해 대상 · 이해 | 글 · `1` |
| `mem1` … `mem3` · `mem1_used` … | 추억 · 사용함 | 글 · `1` |
| `mental` · `mental80` | 멘탈 · 상한 80 (의상 「80s」) | 0~50 (상한 80 이면 0~80) · `1` / 빈칸 |
| `plan_goal` · `plan_task` · `plan_task_done` | 마이 플랜: 목표 · 과제 · 과제 달성 | 글 · 글 · `1` |
| `plan_goalv` · `plan_vol_done` · `idol_voltage` | 목표 볼티지 · 달성 · 【아이돌 볼티지】 | 숫자 · `1` · 숫자 |
| `plan_card` | 센터 PC 프로듀스 카드 내용 | 글 |
| `cos1`~`cos3` `_brand` · `_effect` | 의상 코디 (브랜드 · 효과) | 글 |
| `unit_name` · `unit_theme` · `world_setting` · `unit_members` | 유닛 시트: 유닛명 · 유닛 테마 · 월드 세팅 · 유닛 멤버 | 글 |
| `up1`~`up5` `_name` · `_type` · `_effect` | 유닛 파워 (타입 `보조` / `상주`, 1 은 처음에 【운명공동체】) | 글 |
| `cond1` … `cond6` | 변조 1~6 받는 중 | `1` / 빈칸 |
| `unit_init` | 유닛 파워 1 기본값을 넣었는지 | `1` / `0` |
| `mod` · `fumble_adj` · `special_adj` | 수정치 · 펌블치 · 스페셜치 손 수정 | 숫자 |
| `fumble` · `special` | 펌블치 · 스페셜치 (워커가 계산, 기본 2 · 12) | 숫자 |
| `last_left` | 마지막 퍼포먼스의 남은 눈 (심포니 기본값) | 눈을 이어 적은 글 (예 `216`) |
| `last_dice` · `last_roll` | 마지막 판정 · 퍼포먼스 · 심포니의 눈과 다시 계산할 정보 (주사위 고치기) | 글 · JSON |
| `roll_display_to` | 공개 범위 | `" "` 모두에게 · `"/w gm "` GM 에게 |

퍼포먼스 판정의 주사위는 최대 6개 (능력치 7 이상은 익스텐션 +능력치−6) — OPEN_QUESTIONS.md.
