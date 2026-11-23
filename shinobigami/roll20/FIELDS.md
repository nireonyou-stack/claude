# 시노비가미 (한국어) Roll20 시트 — 칸 이름 짝표

중국어 번체 시트 `Shinobi_Gami_Chinese_Traditional` 과 같은 이름을 쓴다 (홈페이지 짝표 · 올인원 자동완성 · 시트 바꾸기가 함께 맞도록).
**굵게** = 이 시트에서 새로 생긴 칸, *기울임* = 중국어 시트와 이름은 같지만 값 모양이 다른 칸.

## 기본

| 칸 | 속성 | 값 |
|---|---|---|
| 시트 종류 | **sheet_type** | `ninja` · `normal` |
| 이름 · 플레이어 | character_name · player | |
| 나이 · 성별 · 유파 · 계급 | age · gender · clan · rank | 글 (중국어 시트의 clan · rank 는 고르기 칸) |
| 신념 · 법식 · 사회적 신분 · 공적 | conviction · aim · surface · score | 글 |
| 진실의 수 (일반인) | **truth_count** | 글 |
| 생명력 · 최대 | hp · hp_max | 숫자, 새 캐릭터 6 / 6 |
| 유파 문장 그림 주소 | **crest_url** | 주소 (채팅 카드 워터마크) |
| 공개 | roll_display_to | `" "` 모두에게 · `"/w gm "` GM 에게 (중국어 시트와 같은 값) |

## 특기 리스트

| 칸 | 속성 | 값 |
|---|---|---|
| 습득 특기 | A2 ~ F12 (A 기술 · B 체술 · C 인술 · D 모술 · E 전술 · F 요술) | `1` / `0` |
| 목표치 | A2_value ~ F12_value | 숫자 (워커가 씀) |
| 공백 | Z · A · B · C · D · E (Z = 기술 왼쪽, A~E = 그 분야 오른쪽) | `1` / `0` |
| 생명력 슬롯 | *Ninpo_A_Field ~ Ninpo_F_Field* | `@{violence}` · `@{violence(lost)}` · **`@{violence(dirty)}`** (부정, 새 값). B `Body` · C `Stealth` · D `Scheme` · E `Strategy_Field` · F `Sorcery` |
| 마계공학 · 목련 | MuoChie · MuLian | `1` / `0` — 인법명에 들어가면 워커가 켬 (중국어 시트는 손으로 체크) |
| 요마화 | **yoma** · **yoma_ok** | 배경에 「마인」이 있으면 yoma_ok 1 |

## 인물 칸 (9줄, 중국어 시트는 6줄 + 반복)

| 칸 | 속성 (NN = 01~09) | 값 |
|---|---|---|
| 인물명 | relation_name_NN | 글 |
| 거처 · 비밀 | *relation_live_NN · relation_secret_NN* | `1` / `0` (중국어 시트는 글칸) |
| 오의 체크 | **relation_ougi_on_NN** | `1` / `0` |
| 오의 지정특기 | relation_ougi_NN | 글 (특기 이름) — 파훼 판정 |
| 감정 · +/− | relation_sense_NN · **relation_sign_NN** | 글 · `+` / `-` |

## 배경 (5줄) · 인법 (8줄 + 반복)

| 칸 | 속성 | 값 |
|---|---|---|
| 배경 이름 · 효과 | background_name_01~05 · background_01~05 | 글 |
| 인법 | Ninpo_01_ ~ Ninpo_08_ + Name · Types · Range · Cost · Assigned_Skill · Effect | Types: `@{Tool}` 공격 · `@{support}` 서포트 · `@{equip}` 장비 (중국어 시트와 같은 값) |
| 인법 그림 · 개요 | **Ninpo_NN_Img · Ninpo_NN_Flavor** | 주소 · 글 |
| 추가 인법 | repeating_acitems: Ninpo_Name · Ninpo_Types · … · **Ninpo_Img · Ninpo_Flavor** | |

## 판정 띠

| 칸 | 속성 | 값 |
|---|---|---|
| 장면 · 플롯 | **scene** · **plot** | `drama` / `battle` · `0`~`7` |
| 전장 | **bf_flat · bf_water · bf_high · bf_storm · bf_crowd · bf_danger** | `1` / `0` (평지가 처음 값) |
| 펌블치 · 스페셜치 | **fumble · special** (워커) · **fumble_adj · special_adj** (손 수정 −12~+12) | |
| 상태이상 (체크) | **cond_koshou · cond_juushou · cond_yukue · cond_saimin · cond_zanryu · cond_yabou** | `1` / `0` |
| 상태이상 (누적) | **cond_mahi · cond_boukyaku · cond_noroi · cond_hidaruma · cond_moudoku · cond_kiga** | 숫자 (중국어 시트의 status_01~06 글칸은 쓰지 않음) |

## 접는 곳

| 칸 | 속성 | 값 |
|---|---|---|
| 오의 1 · 2 | **Ougi1_name · Ougi1_skill** · Ougi1 (효과) · **Ougi1_img** | 중국어 시트의 Ougi1 · Ougi2 는 효과 글로 그대로 |
| 강점 · 결점 | **repeating_ougia / repeating_ougib**: sname · seff · wname · weff | 한 줄 = 한 쌍 |
| 진실 (일반인) | **truth_name_1~3 · truth_set_1~3 · truth_eff_1~3** | |
| 병량환 · 신통환 · 둔갑부 | gear_01 · gear_02 · gear_03 | 개수 `0`~`6` |
| 특수 닌자도구 | **repeating_gear**: name · count · effect | |

## 워커가 쓰는 숨은 칸

fold_open (시트를 열 때 0) · sheet_version · hp_dim · hp_slots · cf_mahi 등 (누적 상태이상 표시) · relation_emo_NN (감정이 있는 줄) · Ninpo_NN_on · Ninpo_on (이름이 있는 인법 줄)
