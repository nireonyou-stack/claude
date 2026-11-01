// ───────── 로그 백업 (배포판): 채팅 아카이브의 메시지를 읽어 글로 바꿔 클립보드에 ─────────
// 원본은 만든 사람 홈페이지 전용 문법으로 바꿔 줬다. 배포판은 그 부분을 비워 두고 간단한 글(이름: 내용)로만 낸다.
//
// ▶ 내 블로그 · 노션 · 홈페이지 형식으로 바꾸고 싶다면
//   이 구역(logBackup) 전체를 쓰고 있는 AI 에게 보여 주고 이렇게 부탁하세요:
//   "formatLog(list) 를 ○○ 형식으로 출력하게 고쳐 줘. list 구조는 주석에 적혀 있어."
//   readMessages() 와 단추는 그대로 두고 formatLog 만 바꾸면 된다.
//
// 채팅 아카이브 페이지(/campaigns/chatarchive)에만 오른쪽 아래 단추를 띄운다. 편집기 화면에는 아무것도 안 붙인다.
const logBackup = (() => {
    const META = ["avatar", "tstamp", "by", "spacer", "flyout", "clear"];
    const isMeta = n => META.some(k => n.classList.contains(k));
    // 보이는 글자 (줄바꿈 · 그림 자리 유지)
    const textOf = el => {
        let s = "";
        el.childNodes.forEach(n => {
            if (n.nodeType === 3) { s += n.nodeValue; return; }
            if (n.nodeType !== 1 || isMeta(n)) return;
            if (n.tagName === "BR") { s += "\n"; return; }
            if (n.tagName === "IMG") { s += n.alt ? `[${n.alt}]` : "[그림]"; return; }
            const block = /^(DIV|P|TR|LI|H[1-6]|TABLE|BLOCKQUOTE|PRE)$/.test(n.tagName);
            if (block && s && !s.endsWith("\n")) s += "\n";
            s += textOf(n);
            if (block && !s.endsWith("\n")) s += "\n";
        });
        return s;
    };

    // 메시지 하나 = { who, avatar, kind, text, html, roll }
    //   who     말한 사람 (Roll20 은 같은 사람이 이어 말하면 이름을 생략한다 → 앞 사람 이름을 이어 받는다)
    //   avatar  아바타 그림 주소 (없으면 "")
    //   kind    "say" 일반 · "emote" /em · "desc" /desc · "whisper" 귓속말 · "roll" 굴림 · "card" 굴림 카드(롤 템플릿)
    //   text    보이는 글자 (줄바꿈 유지)
    //   html    본문 HTML (꾸밈을 그대로 살리고 싶을 때)
    //   roll    kind 가 "roll" 이면 { formula: "1d20+3", result: "17" }, 아니면 null
    const readMessages = () => {
        const out = [];
        let who = "", avatar = "";
        document.querySelectorAll(".content > .message").forEach(m => {
            const c = m.classList;
            if (c.contains("system")) return;
            const by = m.querySelector(":scope > .by");
            if (by) {
                who = by.textContent.replace(/[:：]\s*$/, "").trim() || who;
                avatar = m.querySelector(":scope > .avatar img")?.src || "";
            }
            const card = m.querySelector("[class^='sheet-rolltemplate-'], [class*=' sheet-rolltemplate-']");
            const kind = card ? "card" : c.contains("rollresult") ? "roll" : c.contains("whisper") || c.contains("private") ? "whisper"
                : c.contains("emote") ? "emote" : c.contains("desc") ? "desc" : "say";
            const roll = kind === "roll" ? {
                formula: (m.querySelector(".formula:not(.formattedformula)")?.textContent || "").replace(/^\s*rolling\s+/i, "").trim(),
                result: (m.querySelector(".rolled")?.textContent || "").trim()
            } : null;
            const body = m.cloneNode(true);
            body.querySelectorAll(META.map(k => ":scope > ." + k).join(", ")).forEach(x => x.remove());
            out.push({ who, avatar, kind, text: textOf(m).replace(/\n{3,}/g, "\n\n").trim(), html: body.innerHTML.trim(), roll });
        });
        return out;
    };

    // ▼▼▼ 여기를 바꾸세요 — list(위 구조)를 받아 클립보드에 넣을 글자 하나를 돌려준다 ▼▼▼
    const formatLog = list => list
        .filter(m => m.kind !== "whisper")                 // 귓속말은 뺀다
        .map(m => {
            if (m.kind === "emote") return `* ${m.text}`;
            if (m.kind === "desc") return m.text;
            if (m.kind === "roll") return `${m.who}: 🎲 ${m.roll.formula} = ${m.roll.result}`;
            return `${m.who}: ${m.text.replace(/\n/g, "\n    ")}`;
        })
        .join("\n");
    // ▲▲▲ 여기까지 ▲▲▲

    const ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h8"/></svg>';
    const CSS = `
        .r20lb-float { position:fixed; right:16px; bottom:16px; z-index:10006; display:flex; align-items:center; gap:6px; height:36px; padding:0 12px; border:1px solid #ccc; border-radius:18px; background:#fff; color:#333; font:700 12px/1 sans-serif; box-shadow:0 2px 8px rgba(0,0,0,0.15); cursor:pointer; }
        .r20lb-float:hover { background:#f6f6f6; }
        .r20lb-float:focus-visible { outline:2px solid #8a3d9e; outline-offset:2px; }
`;
    const archive = () => {
        if (!btnVisible.logbak) return;
        const st = document.createElement("style");
        st.textContent = CSS;
        document.head.appendChild(st);
        const b = document.createElement("button");
        b.type = "button";
        b.id = "custom-logbak-toggle";
        b.className = "r20lb-float";
        b.title = "채팅 전체를 글로 바꿔 복사";
        b.innerHTML = ICON + "<span>로그 복사</span>";
        const label = b.querySelector("span");
        b.addEventListener("click", async e => {
            e.preventDefault(); e.stopPropagation();
            let ok = false;
            try { ok = await copyText(formatLog(readMessages())); } catch (err) { console.warn("[로그 백업] 바꾸기 실패:", err); }
            label.textContent = ok ? "복사했어요" : "복사 실패";
            setTimeout(() => { label.textContent = "로그 복사"; }, 1400);
        });
        document.body.appendChild(b);
    };
    return { archive };
})();
