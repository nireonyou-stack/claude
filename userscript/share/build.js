// 배포판 만들기: node userscript/share/build.js → userscript/share/out/roll20-layout2-share.user.js
// 원본(../roll20-layout2-allinone.user.js)에 달린 표시를 따라 자르고 바꾼다.
//   @share-cut-start 이름 … @share-cut-end 이름   그 줄들째 지운다 (이 방의 이미지 · 모은 목록)
//   @share-swap-start 이름 … @share-swap-end 이름 같은 폴더의 이름.share.js 로 바꾼다 (로그 백업)
//   @share-cut-line                                 그 줄만 지운다
// 아래 FIX 는 원본 글자를 그대로 찾아 바꾼다 — 원본이 바뀌어 못 찾으면 멈춘다(조용히 빠뜨리지 않게).
const fs = require("fs"), path = require("path");
const SRC = path.join(__dirname, "..", "roll20-layout2-allinone.user.js");
const OUT = path.join(__dirname, "out", "roll20-layout2-share.user.js");

let lines = fs.readFileSync(SRC, "utf8").split("\n");
const out = [];
for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const m = l.match(/@share-(cut|swap)-start (\w[\w-]*)/);
    if (m) {
        const end = lines.findIndex((x, j) => j > i && x.includes(`@share-${m[1]}-end ${m[2]}`));
        if (end < 0) throw new Error(`@share-${m[1]}-end ${m[2]} 가 없음`);
        if (m[1] === "swap") out.push(...fs.readFileSync(path.join(__dirname, `${m[2]}.share.js`), "utf8").replace(/\n$/, "").split("\n"));
        i = end;
        continue;
    }
    if (l.includes("@share-cut-line")) continue;
    out.push(l);
}
let s = out.join("\n");

const FIX = [
    ["// @name         롤20 레이아웃2 올인원\n", "// @name         롤20 레이아웃2 올인원 (배포판)\n"],
    ["// 자동완성 데이터: 설정(⚙) → 자동완성 아래 '데이터 주소' 칸에 홈페이지 데이터 주소를 붙여 넣습니다.\n",
     "// 자동완성 데이터: ruledata.template.js 를 고쳐서 설정(⚙) → 기본시트 데이터 자동완성 → [파일]로 불러옵니다.\n"
     + "// 로그 백업 형식을 바꾸려면 이 파일의 logBackup 구역 설명을 보세요 (formatLog 만 고치면 됨).\n"
     + "// 맵 단추 · 일괄 편집기는 그 방의 GM 일 때만 나옵니다.\n"],
    ['    members: [["artroom", "roomImages"], ["artroom", "assetBank"], ["qpick", "queryPicker"], ["journal", "quickJournal"]] });',
     '    members: [["qpick", "queryPicker"], ["journal", "quickJournal"]] });'],
    ['label: "이미지 · 매크로&저널 뷰어", sub: "이 방의 이미지 전체 보기 · 모은 목록(저장소 계정 그림 · 트랙) · 매크로 선택 썸네일 · 빠른 저널 뷰어",',
     'label: "매크로&저널 뷰어", sub: "매크로 선택 썸네일 · 빠른 저널 뷰어",'],
    ['label: "대화 캡쳐 · 맵(촬영 · 코코포리아 가져오기) · 로그 백업", sub: "로그 백업 단추는 채팅 아카이브 페이지 오른쪽 아래에",',
     'label: "대화 캡쳐 · 맵(촬영 · 코코포리아 가져오기) · 로그 백업", sub: "맵 단추는 GM 만 · 로그 백업 단추는 채팅 아카이브 페이지 오른쪽 아래에",']
];
for (const [a, b] of FIX) {
    const n = s.split(a).length - 1;
    if (n !== 1) throw new Error(`바꿀 곳을 ${n}번 찾음: ${a.slice(0, 60)}`);
    s = s.replace(a, b);
}
// 남은 표시 · 지운 기능 이름이 새어 나가지 않았는지
const left = s.match(/@share-|const roomImages|assetBank|r20_asset_bank|r20ri-tile/g);       // FEAT.roomImages?. 처럼 없을 때를 대비한 곳은 남아도 된다
if (left) throw new Error("남은 것: " + [...new Set(left)].join(", "));

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, s);
console.log(`${path.relative(process.cwd(), OUT)} · ${s.split("\n").length}줄 · ${(Buffer.byteLength(s) / 1024).toFixed(0)}KB`);
