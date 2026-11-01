// 자동완성 데이터 틀 — 이 파일을 고친 뒤, Roll20 화면 오른쪽 위 설정(⚙) › 기본시트 데이터 자동완성 › [파일] 로 불러오세요.
// 한 번 불러오면 그 브라우저에 저장돼서 다음부터는 다시 안 골라도 됩니다. 고친 뒤에는 [파일]로 다시 불러오세요.
//
// 적는 법
// - 아래 = 뒤의 { … } 는 JSON 이라서 큰따옴표(" ")만 쓰고, 마지막 항목 뒤에 쉼표를 붙이지 마세요.
// - 쓰지 않는 룰은 [] 로 비워 두면 됩니다. 한 줄 = 시트 이름칸에 입력하면 채워지는 항목 하나.
// - type · skill 은 시트 드롭다운에 보이는 글자 그대로 (예: "공격", "폭력").
// - 룰북 내용을 통째로 옮겨 남에게 퍼뜨리지 마세요. 자기가 쓸 것만 직접 적는 용도예요.
//
// 룰마다 쓰는 칸
//   insane         name · type · skill · effect
//   shinobigami    name · group(유파) · type · skill · range · cost · effect
//   magicalogia    name · type · skill · target · cost · charge · effect · recite
//   bloodmoon      name · group · type · skill · cost · effect · flavor
//   bloodmoon_item name · kind(분류) · effect
window.NIRE_RULEDATA = {
  "insane": [],
  "shinobigami": [
    { "name": "예시 인법", "group": "", "type": "공격", "skill": "", "range": "1", "cost": "1", "effect": "여기에 효과를 적어요." }
  ],
  "magicalogia": [],
  "bloodmoon": [],
  "bloodmoon_item": []
};
