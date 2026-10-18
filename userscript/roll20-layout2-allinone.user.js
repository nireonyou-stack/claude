// ==UserScript==
// @name         롤20 레이아웃2 올인원
// @version      1.4.0
// @match        https://app.roll20.net/editor*
// @grant        none
// 자동완성 데이터: 아래 줄의 주소를 홈페이지 데이터 파일로 바꾸고 맨 앞 "// "를 지우면 활성화됩니다.
// 데이터 파일을 고친 뒤에는 ?v= 숫자를 올려야 Tampermonkey가 새로 받아옵니다.
// // @require    https://nire.ivyro.net/PATH/nire-ruledata.js?v=1
// ==/UserScript==

(function () {
"use strict";

// 같은 스크립트가 두 개 설치돼 있으면 버튼·편집기가 겹쳐 오동작한다 → 알린다
let dupWarned = false;
const warnDuplicate = () => {
    if (dupWarned) return;
    dupWarned = true;
    console.warn("[올인원] 스크립트가 두 개 설치되어 있습니다.");
    alert("「롤20 레이아웃2 올인원」이 두 개 설치되어 있는 것 같습니다.\nTampermonkey 대시보드에서 예전 것을 끄거나 지워 주세요.");
};
if (window.__r20aio) { warnDuplicate(); return; }
window.__r20aio = true;
const SCRIPT_VER = "1.4.0";     // @version 과 같이 올린다

const CONFIG={
    prefix: "/desc ",
    inactiveBg: "#ffffff", inactiveText: "#adadad", inactiveBorder: "#cccccc",
    activeBg: "#1867c7", activeText: "#ffffff", activeBorder: "#1867c7",
    sadamActiveBg: "#555555", sadamActiveText: "#ffffff", sadamActiveBorder: "#555555",
    charSadamActiveBg: "#555555", charSadamActiveText: "#ffffff", charSadamActiveBorder: "#555555"
};

let isDescMode = false;
let isSadamMode = false;
let activeCustomBtn = null;

let localSadam = localStorage.getItem("r20_show_sadam") !== "false";
let localCharSadam = localStorage.getItem("r20_show_charsadam") !== "false";
if (localSadam && localCharSadam) {
    localCharSadam = false;
    localStorage.setItem("r20_show_charsadam", "false");
}

const btnVisible = {
    desc:      localStorage.getItem("r20_show_desc")    !== "false",
    sadam:     localSadam,
    charsadam: localCharSadam,
    journal:   localStorage.getItem("r20_show_journal") !== "false",
    autofill:  localStorage.getItem("r20_show_autofill") !== "false",
    bgm:       localStorage.getItem("r20_show_bgm")     !== "false",
    bulk:      localStorage.getItem("r20_show_bulk")    !== "false",
    jbrow:     localStorage.getItem("r20_show_jbrow")   !== "false"
};

const sharedBtnStyle = `
    border-radius: 4px !important;
    padding: 3px 6px !important;
    min-width: 36px !important;
    font-size: 11px !important;
    font-weight: 700 !important;
    cursor: pointer !important;
    transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease !important;
    border-style: solid !important;
    border-width: 1px !important;
    line-height: normal !important;
`;

function getCustomBtns() {
    try { return JSON.parse(localStorage.getItem("r20_custom_btns") || "[]"); } catch(e) { return []; }
}
function saveCustomBtns(btns) {
    localStorage.setItem("r20_custom_btns", JSON.stringify(btns));
}

function updateCustomButtonStyles() {
    const group = document.getElementById("custom-left-group");
    if (!group) return;
    const domBtns = [...group.querySelectorAll("[data-custom-btn]")];
    const count = domBtns.length;
    const small = count > 3;
    domBtns.forEach(b => {
        const idx = parseInt(b.dataset.customBtn);
        const isActive = activeCustomBtn && activeCustomBtn._idx === idx;
        applyBtnColors(b, isActive, { bg: CONFIG.activeBg, text: CONFIG.activeText, border: CONFIG.activeBorder });
        b.style.setProperty("padding", small ? "2px 4px" : "3px 6px", "important");
        b.style.setProperty("font-size", small ? "10px" : "11px", "important");
        b.style.setProperty("min-width", small ? "28px" : "36px", "important");
    });
}

function renderCustomButtons() {
    const group = document.getElementById("custom-left-group");
    if (!group) return;
    group.querySelectorAll("[data-custom-btn]").forEach(b => b.remove());
    getCustomBtns().forEach((btn, i) => {
        if (btn.visible === false) return;
        const b = document.createElement("button");
        b.type = "button";
        b.dataset.customBtn = String(i);
        b.textContent = btn.label;
        b.style.cssText = sharedBtnStyle;
        b.onclick = (e) => {
            e.preventDefault(); e.stopPropagation();
            const ta = document.querySelector("#textchat-input textarea");
            if (!ta) return;
            const isSame = activeCustomBtn && activeCustomBtn._idx === i;
            if (isSame) {
                activeCustomBtn = null;
            } else {
                activeCustomBtn = { ...btn, _idx: i };
                isDescMode = false;
                isSadamMode = false;
                const hasPlaceholder = /\?\{[^}]*\}/.test(btn.content);
                if (!hasPlaceholder) {
                    ta.value = btn.content;
                    ta.dispatchEvent(new Event("input", { bubbles: true }));
                } else {
                    ta.value = "";
                }
                updateDescButtonStyle(document.getElementById("custom-desc-toggle"));
                updateSadamButtonStyle(document.getElementById("custom-sadam-toggle"));
            }
            updateCustomButtonStyles();
            ta.focus();
        };
        group.appendChild(b);
    });
    updateCustomButtonStyles();
}

if (!document.getElementById("custom-journal-style")) {
    const style = document.createElement("style");
    style.id = "custom-journal-style";
    style.innerHTML = `
        #custom-journal-popup { position:fixed; width:190px; background:#ffffff; border:1px solid #cccccc; border-radius:4px; box-shadow:0 4px 12px rgba(0,0,0,0.18); z-index:10002; display:none; flex-direction:column; overflow:hidden; font-family:sans-serif; color:#333; }
        /* Roll20(Bootstrap)의 .show { display:block !important } 보다 앞서도록 !important */
        #custom-journal-popup.show { display:flex !important; }
        .cj-header { display:flex; align-items:center; justify-content:space-between; padding:4px 8px; background:#f0f0f0; border-bottom:1px solid #e0e0e0; font-size:11px; font-weight:bold; color:#666; flex-shrink:0; cursor:move; user-select:none; }
        .cj-close-btn { background:none; border:none; cursor:pointer; font-size:13px; color:#999; padding:0 2px; line-height:1; }
        .cj-close-btn:hover { color:#333; }
        .cj-item.cj-drag-over-left { box-shadow:inset 3px 0 0 #1867c7 !important; }
        .cj-item.cj-drag-over-right { box-shadow:inset -3px 0 0 #1867c7 !important; }
        .cj-search-container { padding:5px 6px; border-bottom:1px solid #eeeeee; background:#f9f9f9; flex-shrink:0; }
        .cj-search-input { width:100%; box-sizing:border-box; padding:4px 6px; border:1px solid #cccccc; border-radius:3px; outline:none; font-size:12px; }
        /* 아이콘 격자: 이름은 마우스를 올리면 툴팁으로 */
        .cj-list-container { overflow-y:auto; flex:1; min-height:0; display:grid; grid-template-columns:repeat(auto-fill, minmax(40px, 1fr)); gap:4px; padding:6px; align-content:start; }
        .cj-resize-handle { height:8px; cursor:se-resize; background:linear-gradient(135deg, transparent 40%, #ccc 40%, #ccc 50%, transparent 50%, transparent 60%, #ccc 60%, #ccc 70%, transparent 70%); background-size:8px 8px; background-position:bottom right; background-repeat:no-repeat; flex-shrink:0; }
        .cj-item { display:flex; align-items:center; justify-content:center; aspect-ratio:1; padding:2px; border-radius:6px; cursor:pointer; transition:background-color 0.1s ease; user-select:none; }
        .cj-item:hover { background-color:#e6f7ff; }
        .cj-item.cj-selected { background-color:#dcebfb; box-shadow:inset 0 0 0 2px #1867c7; }
        .cj-avatar { width:36px; height:36px; min-width:36px; border-radius:50%; object-fit:cover; background-color:#eeeeee; pointer-events:none; }
        .cj-avatar.cj-initial { display:flex; justify-content:center; align-items:center; font-size:14px; font-weight:700; color:#888; }
        #custom-settings-popup { position:fixed; width:190px; background:#ffffff; border:1px solid #cccccc; border-radius:4px; box-shadow:0 4px 10px rgba(0,0,0,0.15); z-index:10003; display:none; flex-direction:column; font-family:sans-serif; font-size:12px; color:#333; overflow-y:auto; max-height:70vh; }
        #custom-settings-popup.show { display:flex !important; }
        .cs-header { padding:5px 8px; background:#f0f0f0; border-bottom:1px solid #e0e0e0; font-size:11px; font-weight:bold; color:#666; flex-shrink:0; }
        .cs-row { display:flex; align-items:center; justify-content:space-between; padding:6px 10px; border-bottom:1px solid #f5f5f5; }
        .cs-switch { position:relative; width:32px; height:18px; display:inline-block; cursor:pointer; }
        .cs-switch input { opacity:0; width:0; height:0; }
        .cs-slider { position:absolute; inset:0; background:#cccccc; border-radius:18px; transition:0.2s; }
        .cs-slider:before { content:""; position:absolute; width:12px; height:12px; left:3px; top:3px; background:white; border-radius:50%; transition:0.2s; }
        .cs-switch input:checked + .cs-slider { background:#1867c7; }
        .cs-switch input:checked + .cs-slider:before { transform:translateX(14px); }
        .cs-custom-row { display:flex; align-items:center; padding:5px 8px; border-bottom:1px solid #f5f5f5; gap:4px; }
        .cs-custom-row > span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; font-size:11px; }
        .cs-custom-icon-btn { background:none; border:none; cursor:pointer; color:#bbb; font-size:11px; padding:2px 3px; flex-shrink:0; line-height:1; }
        .cs-custom-icon-btn:hover { color:#555; }
        .cs-custom-del:hover { color:#e55 !important; }
        .cs-custom-add-btn { display:flex; align-items:center; justify-content:center; gap:4px; margin:6px 8px 8px; padding:5px 8px; background:#f5f5f5; border:1px solid #ddd; border-radius:3px; cursor:pointer; font-size:11px; color:#666; font-weight:normal; }
        .cs-custom-add-btn:hover { background:#ebebeb; color:#333; }
        #cs-side-panel { position:fixed; width:300px; background:#ffffff; border:1px solid #cccccc; border-radius:4px; box-shadow:0 4px 16px rgba(0,0,0,0.2); z-index:10004; display:none; flex-direction:column; font-family:sans-serif; font-size:12px; color:#333; }
        #cs-side-panel.show { display:flex !important; }
        .cs-side-header { display:flex; align-items:center; justify-content:space-between; padding:7px 10px; background:#f0f0f0; border-bottom:1px solid #e0e0e0; font-size:11px; font-weight:bold; color:#555; flex-shrink:0; }
        .cs-side-close { background:none; border:none; cursor:pointer; color:#999; font-size:13px; padding:0 2px; line-height:1; }
        .cs-side-close:hover { color:#333; }
        .cs-side-body { padding:12px; display:flex; flex-direction:column; gap:10px; }
        .cs-side-field { display:flex; flex-direction:column; gap:4px; }
        .cs-side-field label { font-size:10px; color:#888; font-weight:bold; text-transform:uppercase; letter-spacing:0.5px; }
        .cs-side-name { border:1px solid #ccc; border-radius:3px; padding:6px 8px; font-size:12px; outline:none; width:100%; box-sizing:border-box; }
        .cs-side-name:focus { border-color:#1867c7; }
        .cs-side-textarea { border:1px solid #ccc; border-radius:3px; padding:6px 8px; font-size:11px; outline:none; width:100%; box-sizing:border-box; resize:vertical; min-height:120px; font-family:monospace; line-height:1.5; }
        .cs-side-textarea:focus { border-color:#1867c7; }
        .cs-side-footer { display:flex; gap:6px; padding:0 12px 12px; }
        .cs-side-save { flex:1; background:#1867c7; color:white; border:none; border-radius:3px; padding:7px; cursor:pointer; font-size:12px; font-weight:bold; }
        .cs-side-save:hover { background:#1455a4; }
        .cs-side-cancel { flex:1; background:#eeeeee; color:#555; border:none; border-radius:3px; padding:7px; cursor:pointer; font-size:12px; }
        .cs-side-cancel:hover { background:#e0e0e0; }
    `;
    document.head.appendChild(style);
}

function applyBtnColors(btn, isActive, c) {
    if (!btn) return;
    btn.style.setProperty("background-color", isActive ? c.bg : CONFIG.inactiveBg, "important");
    btn.style.setProperty("color", isActive ? c.text : CONFIG.inactiveText, "important");
    btn.style.setProperty("border-color", isActive ? c.border : CONFIG.inactiveBorder, "important");
    btn.style.setProperty("box-shadow", "none", "important");
    btn.style.setProperty("outline", "none", "important");
}

function updateDescButtonStyle(btn) {
    if (!btn) return;
    btn.innerText = "desc";
    applyBtnColors(btn, isDescMode, { bg: CONFIG.activeBg, text: CONFIG.activeText, border: CONFIG.activeBorder });
}

function updateSadamButtonStyle(btn) {
    if (!btn) return;
    btn.innerText = "사담";
    if (btnVisible.charsadam) {
        btn.title = "캐릭터 사담";
        applyBtnColors(btn, isSadamMode, { bg: CONFIG.charSadamActiveBg, text: CONFIG.charSadamActiveText, border: CONFIG.charSadamActiveBorder });
    } else {
        btn.title = "오너 사담";
        applyBtnColors(btn, isSadamMode, { bg: CONFIG.sadamActiveBg, text: CONFIG.sadamActiveText, border: CONFIG.sadamActiveBorder });
    }
}

const _hoverEvts = ["mouseover","mouseout","mouseenter","mouseleave","mousedown","mouseup","focus","blur"];
function addStyleRefresh(btn, fn) {
    _hoverEvts.forEach(evt => btn.addEventListener(evt, () => fn(btn)));
}

function applyCocofoliaLayout() {
    const container = document.getElementById("textchat-input");
    const textarea = container?.querySelector("textarea");
    const sendBtn = document.getElementById("chatSendBtn");
    const speakingAsSelect = document.getElementById("speakingas");
    const speakingAsContainer = speakingAsSelect?.closest("div");

    if (!container || !textarea || !sendBtn || !speakingAsContainer) return;
    if (container.classList.contains("layout-applied-v11")) return;

    const chatLog = document.querySelector("#textchat .content");
    if (chatLog && !chatLog.dataset.cleanerAttached) {
        const chatCleaner = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.classList && node.classList.contains("message")) {
                        const walk = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, false);
                        let textNode;
                        while ((textNode = walk.nextNode())) {
                            const match = textNode.nodeValue.match(/^\s*\/as\s+"([^"]+)"\s+(.*)/i);
                            if (match) {
                                textNode.nodeValue = " " + match[2];
                                const bySpan = node.querySelector(".by");
                                if (bySpan) bySpan.innerText = match[1] + ": ";
                            }
                        }
                    }
                });
            });
        });
        chatCleaner.observe(chatLog, { childList: true, subtree: true });
        chatLog.dataset.cleanerAttached = "true";
    }

    for (const [prop, val] of Object.entries({
        display: "flex", "flex-direction": "column", padding: "10px",
        "box-sizing": "border-box", overflow: "hidden", height: "auto"
    })) container.style.setProperty(prop, val, "important");

    if (!document.getElementById("custom-speaker-wrap")) {
        const wrap = document.createElement("div");
        wrap.id = "custom-speaker-wrap";
        wrap.style.cssText = "display: flex; width: 100%; height: 32px; margin-bottom: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; background: #fff; position: relative; align-items: stretch;";

        const visualSelect = document.createElement("div");
        visualSelect.id = "custom-select-visual";
        visualSelect.style.cssText = "width: 40px; min-width: 40px; display: flex; justify-content: center; align-items: center; position: relative; border-radius: 3px 0 0 3px; background-color: rgba(136, 136, 136, 0.1); color: #888888;";

        const iconBox = document.createElement("div");
        iconBox.id = "custom-icon-box";
        iconBox.style.cssText = "display: flex; justify-content: center; align-items: center; width: 100%; height: 100%; pointer-events: none;";

        speakingAsSelect.style.cssText = "position: absolute; left: 0; top: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; margin: 0; padding: 0;";
        visualSelect.appendChild(iconBox);
        visualSelect.appendChild(speakingAsSelect);

        const nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.id = "custom-speaker-name";
        nameInput.style.cssText = "flex-grow: 1; min-width: 0; border: none; border-left: 1px solid #ccc; padding: 0 10px; font-size: 13px; outline: none; box-sizing: border-box; background: transparent; height: 100%; line-height: normal;";

        const syncState = () => {
            const originalName = speakingAsSelect.options[speakingAsSelect.selectedIndex]?.text || "";
            const currentName = nameInput.value.trim();
            const isExtra = currentName !== "" && currentName !== originalName.trim();
            const selectedValue = speakingAsSelect.value;
            if (isExtra) {
                iconBox.innerHTML = "<span style='font-size: 14px; font-weight: bold;'>?</span>";
            } else {
                let avatarUrl = null;
                if (selectedValue && selectedValue.startsWith("character|")) {
                    const charId = selectedValue.split("|")[1];
                    const journalItem = document.querySelector(`li.character[data-itemid="${charId}"]`);
                    if (journalItem) {
                        const img = journalItem.querySelector("img");
                        if (img) {
                            const src = img.getAttribute("src") || img.getAttribute("data-src") || "";
                            if (src && !src.includes("images/character.png") && !src.includes("default")) avatarUrl = src;
                        }
                    }
                }
                iconBox.innerHTML = avatarUrl
                    ? `<img src="${avatarUrl}" style="width: 26px; height: 26px; border-radius: 50%; object-fit: cover;">`
                    : "<span style='font-size: 11px;'>▼</span>";
            }
        };
        const syncName = () => {
            nameInput.value = speakingAsSelect.options[speakingAsSelect.selectedIndex]?.text || "";
            syncState();
        };
        syncName();
        speakingAsSelect.addEventListener("change", syncName);
        speakingAsSelect.addEventListener("blur", syncName);
        nameInput.addEventListener("input", syncState);

        const settingsBtn = document.createElement("button");
        settingsBtn.id = "custom-settings-btn";
        settingsBtn.type = "button";
        settingsBtn.textContent = "⚙";
        settingsBtn.title = "버튼 표시 설정";
        settingsBtn.style.cssText = "width: 28px; min-width: 28px; border: none; border-left: 1px solid #ccc; background: rgba(136,136,136,0.07); color: #aaa; font-size: 13px; cursor: pointer; padding: 0; display: flex; align-items: center; justify-content: center; border-radius: 0 3px 3px 0; flex-shrink: 0;";

        // 사이드 패널
        const sidePanel = document.createElement("div");
        sidePanel.id = "cs-side-panel";

        const sidePanelHeader = document.createElement("div");
        sidePanelHeader.className = "cs-side-header";
        const sidePanelTitle = document.createElement("span");
        sidePanelTitle.textContent = "커스텀 버튼 추가";
        const sidePanelClose = document.createElement("button");
        sidePanelClose.className = "cs-side-close";
        sidePanelClose.textContent = "✕";
        sidePanelHeader.appendChild(sidePanelTitle);
        sidePanelHeader.appendChild(sidePanelClose);
        sidePanel.appendChild(sidePanelHeader);

        const sidePanelBody = document.createElement("div");
        sidePanelBody.className = "cs-side-body";

        const nameField = document.createElement("div");
        nameField.className = "cs-side-field";
        const nameLabel = document.createElement("label");
        nameLabel.textContent = "버튼 이름";
        const sideNameInp = document.createElement("input");
        sideNameInp.type = "text";
        sideNameInp.className = "cs-side-name";
        sideNameInp.placeholder = "예) 판정 매크로";
        nameField.appendChild(nameLabel);
        nameField.appendChild(sideNameInp);

        const contentField = document.createElement("div");
        contentField.className = "cs-side-field";
        const contentLabel = document.createElement("label");
        contentLabel.textContent = "매크로 내용";
        const sideContentTa = document.createElement("textarea");
        sideContentTa.className = "cs-side-textarea";
        sideContentTa.placeholder = '예) /desc [?{내용|}]........... 코드가 ?{}를 인식합니다.'
        contentField.appendChild(contentLabel);
        contentField.appendChild(sideContentTa);

        sidePanelBody.appendChild(nameField);
        sidePanelBody.appendChild(contentField);
        sidePanel.appendChild(sidePanelBody);

        const sidePanelFooter = document.createElement("div");
        sidePanelFooter.className = "cs-side-footer";
        const sideSaveBtn = document.createElement("button");
        sideSaveBtn.className = "cs-side-save";
        sideSaveBtn.textContent = "저장";
        const sideCancelBtn = document.createElement("button");
        sideCancelBtn.className = "cs-side-cancel";
        sideCancelBtn.textContent = "취소";
        sidePanelFooter.appendChild(sideSaveBtn);
        sidePanelFooter.appendChild(sideCancelBtn);
        sidePanel.appendChild(sidePanelFooter);

        [sideNameInp, sideContentTa].forEach(el => el.addEventListener("keydown", e => e.stopPropagation()));

        let sidePanelMode = "add";
        let sidePanelEditIdx = -1;

        const openSidePanel = (mode, idx = -1) => {
            sidePanelMode = mode;
            sidePanelEditIdx = idx;
            if (mode === "edit" && idx >= 0) {
                const btn = getCustomBtns()[idx];
                sidePanelTitle.textContent = "커스텀 버튼 수정";
                sideNameInp.value = btn.label;
                sideContentTa.value = btn.content;
            } else {
                sidePanelTitle.textContent = "커스텀 버튼 추가";
                sideNameInp.value = "";
                sideContentTa.value = "";
            }
            const spRect = settingsPopup.getBoundingClientRect();
            sidePanel.style.right = (window.innerWidth - spRect.left + 6) + "px";
            sidePanel.style.bottom = (window.innerHeight - spRect.bottom) + "px";
            sidePanel.style.left = "auto";
            sidePanel.style.top = "auto";
            sidePanel.classList.add("show");
            sideNameInp.focus();
        };

        const closeSidePanel = () => {
            sidePanel.classList.remove("show");
        };

        sidePanelClose.onclick = closeSidePanel;
        sideCancelBtn.onclick = closeSidePanel;

        sideSaveBtn.onclick = () => {
            const lbl = sideNameInp.value.trim();
            if (!lbl) { sideNameInp.focus(); return; }
            const btns = getCustomBtns();
            if (sidePanelMode === "edit" && sidePanelEditIdx >= 0) {
                btns[sidePanelEditIdx].label = lbl;
                btns[sidePanelEditIdx].content = sideContentTa.value;
            } else {
                btns.push({ label: lbl, content: sideContentTa.value, visible: true });
            }
            saveCustomBtns(btns);
            closeSidePanel();
            renderCustomList();
            renderCustomButtons();
        };

        document.body.appendChild(sidePanel);

        // 설정 팝업
        const settingsPopup = document.createElement("div");
        settingsPopup.id = "custom-settings-popup";

        const csHeader = document.createElement("div");
        csHeader.className = "cs-header";
        csHeader.textContent = "버튼 표시";
        settingsPopup.appendChild(csHeader);

        let sadamInp, charsadamInp;

        const makeRow = (label, key) => {
            const row = document.createElement("div");
            row.className = "cs-row";
            const labelSpan = document.createElement("span");
            labelSpan.textContent = label;
            const sw = document.createElement("label");
            sw.className = "cs-switch";
            const inp = document.createElement("input");
            inp.type = "checkbox";
            inp.checked = btnVisible[key];
            const slider = document.createElement("div");
            slider.className = "cs-slider";
            sw.appendChild(inp);
            sw.appendChild(slider);
            row.appendChild(labelSpan);
            row.appendChild(sw);

            if (key === "sadam") sadamInp = inp;
            if (key === "charsadam") charsadamInp = inp;

            inp.addEventListener("change", () => {
                if (key === "sadam" && inp.checked) {
                    btnVisible.sadam = true;
                    btnVisible.charsadam = false;
                    if (charsadamInp) charsadamInp.checked = false;
                    localStorage.setItem("r20_show_sadam", "true");
                    localStorage.setItem("r20_show_charsadam", "false");
                } else if (key === "charsadam" && inp.checked) {
                    btnVisible.charsadam = true;
                    btnVisible.sadam = false;
                    if (sadamInp) sadamInp.checked = false;
                    localStorage.setItem("r20_show_charsadam", "true");
                    localStorage.setItem("r20_show_sadam", "false");
                } else {
                    btnVisible[key] = inp.checked;
                    localStorage.setItem("r20_show_" + key, String(inp.checked));
                }

                const targets = {
                    desc: document.getElementById("custom-desc-toggle"),
                    journal: document.getElementById("custom-journal-toggle")
                };
                if (targets[key]) targets[key].style.display = inp.checked ? "" : "none";

                const sBtn = document.getElementById("custom-sadam-toggle");
                if (sBtn) {
                    sBtn.style.display = (btnVisible.sadam || btnVisible.charsadam) ? "" : "none";
                    updateSadamButtonStyle(sBtn);
                }

                if (key === "bgm") bgmPreview.setEnabled(inp.checked);
                if (key === "bulk") bulkEditor.setEnabled(inp.checked);
                if (key === "jbrow") jukeboxRow.setEnabled(inp.checked);
                if (!inp.checked && key === "autofill") autofill.close();

                if (!inp.checked && key === "journal") {
                    const jp = document.getElementById("custom-journal-popup");
                    if (jp) jp.classList.remove("show");
                }
                if (inp.checked && key === "journal") {
                    const jb = document.getElementById("custom-journal-toggle");
                    if (jb) {
                        jb.style.setProperty("background-color", CONFIG.inactiveBg, "important");
                        jb.style.setProperty("color", CONFIG.inactiveText, "important");
                        jb.style.setProperty("border-color", CONFIG.inactiveBorder, "important");
                    }
                }
            });
            return row;
        };
        settingsPopup.appendChild(makeRow("desc", "desc"));
        settingsPopup.appendChild(makeRow("오너 사담", "sadam"));
        settingsPopup.appendChild(makeRow("캐릭터 사담", "charsadam"));
        settingsPopup.appendChild(makeRow("저널", "journal"));
        settingsPopup.appendChild(makeRow("자동완성", "autofill"));
        settingsPopup.appendChild(makeRow("BGM 미리듣기", "bgm"));
        const bulkRow = makeRow("일괄 편집기", "bulk");
        bulkRow.firstChild.after(bulkEditor.openButton());
        settingsPopup.appendChild(bulkRow);
        settingsPopup.appendChild(makeRow("한 줄 보기 (주크박스·저널)", "jbrow"));

        // 커스텀 버튼 섹션
        const csCustomHeader = document.createElement("div");
        csCustomHeader.className = "cs-header";
        csCustomHeader.textContent = "커스텀 매크로";
        settingsPopup.appendChild(csCustomHeader);

        const customList = document.createElement("div");
        customList.id = "cs-custom-list";
        settingsPopup.appendChild(customList);

        const renderCustomList = () => {
            customList.innerHTML = "";
            getCustomBtns().forEach((btn, i) => {
                const row = document.createElement("div");
                row.className = "cs-custom-row";

                const labelSpan = document.createElement("span");
                labelSpan.textContent = btn.label;
                labelSpan.title = btn.content;

                // 표시 토글
                const sw = document.createElement("label");
                sw.className = "cs-switch";
                sw.style.flexShrink = "0";
                const inp = document.createElement("input");
                inp.type = "checkbox";
                inp.checked = btn.visible !== false;
                const slider = document.createElement("div");
                slider.className = "cs-slider";
                sw.appendChild(inp);
                sw.appendChild(slider);
                inp.addEventListener("change", () => {
                    const btns = getCustomBtns();
                    btns[i].visible = inp.checked;
                    saveCustomBtns(btns);
                    if (!inp.checked && activeCustomBtn && activeCustomBtn._idx === i) {
                        activeCustomBtn = null;
                    }
                    renderCustomButtons();
                });

                const editBtn = document.createElement("button");
                editBtn.className = "cs-custom-icon-btn";
                editBtn.textContent = "✎";
                editBtn.title = "수정";
                editBtn.onclick = () => openSidePanel("edit", i);

                const delBtn = document.createElement("button");
                delBtn.className = "cs-custom-icon-btn cs-custom-del";
                delBtn.textContent = "✕";
                delBtn.title = "삭제";
                delBtn.onclick = (e) => {
                    e.stopPropagation();
                    const btns = getCustomBtns();
                    btns.splice(i, 1);
                    saveCustomBtns(btns);
                    if (activeCustomBtn && activeCustomBtn._idx === i) activeCustomBtn = null;
                    renderCustomList();
                    renderCustomButtons();
                };

                row.appendChild(delBtn);
                row.appendChild(labelSpan);
                row.appendChild(sw);
                row.appendChild(editBtn);
                customList.appendChild(row);
            });
        };
        renderCustomList();

        const addBtnEl = document.createElement("div");
        addBtnEl.className = "cs-custom-add-btn";
        addBtnEl.textContent = "+ 추가";
        addBtnEl.onclick = () => openSidePanel("add");
        settingsPopup.appendChild(addBtnEl);

        settingsBtn.addEventListener("click", (e) => {
            e.preventDefault(); e.stopPropagation();
            if (settingsPopup.classList.contains("show")) {
                settingsPopup.classList.remove("show");
                closeSidePanel();
                return;
            }
            const r = settingsBtn.getBoundingClientRect();
            settingsPopup.style.right  = (window.innerWidth  - r.right)  + "px";
            settingsPopup.style.bottom = (window.innerHeight - r.top + 4) + "px";
            settingsPopup.style.left = "auto"; settingsPopup.style.top = "auto";
            settingsPopup.classList.add("show");
        });
        document.addEventListener("click", (e) => {
            if (!settingsPopup.contains(e.target) && e.target !== settingsBtn
                && !sidePanel.contains(e.target)) {
                settingsPopup.classList.remove("show");
                closeSidePanel();
            }
        });
        document.body.appendChild(settingsPopup);

        wrap.appendChild(visualSelect);
        wrap.appendChild(nameInput);
        wrap.appendChild(settingsBtn);

        Array.from(speakingAsContainer.childNodes).forEach(child => {
            if (child.style) child.style.display = "none";
        });
        speakingAsContainer.appendChild(wrap);
        speakingAsContainer.style.cssText = `
            float: none !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            margin: 0 0 4px 0 !important;
            padding: 0 !important;
        `;
    }

    const buttonRow = document.createElement("div");
    buttonRow.style.cssText = "display: flex !important; justify-content: space-between !important; align-items: center !important; margin-bottom: 4px !important; width: 100% !important;";

    const leftBtnGroup = document.createElement("div");
    leftBtnGroup.style.cssText = "display: flex !important; gap: 4px !important; align-items: center !important; position: relative !important; flex-wrap: wrap !important;";

    let toggleBtn = document.getElementById("custom-desc-toggle");
    if (!toggleBtn) {
        toggleBtn = document.createElement("button");
        toggleBtn.id = "custom-desc-toggle";
        toggleBtn.type = "button";
        toggleBtn.style.cssText = sharedBtnStyle;
        if (!btnVisible.desc) toggleBtn.style.display = "none";
        toggleBtn.onclick = (e) => {
            e.preventDefault(); e.stopPropagation();
            isDescMode = !isDescMode;
            if (isDescMode) { isSadamMode = false; activeCustomBtn = null; updateCustomButtonStyles(); }
            updateDescButtonStyle(toggleBtn);
            updateSadamButtonStyle(sadamBtn);
            textarea.focus();
        };
        addStyleRefresh(toggleBtn, updateDescButtonStyle);
        updateDescButtonStyle(toggleBtn);
    }

    let sadamBtn = document.getElementById("custom-sadam-toggle");
    if (!sadamBtn) {
        sadamBtn = document.createElement("button");
        sadamBtn.id = "custom-sadam-toggle";
        sadamBtn.type = "button";
        sadamBtn.style.cssText = sharedBtnStyle;
        if (!btnVisible.sadam && !btnVisible.charsadam) sadamBtn.style.display = "none";
        sadamBtn.onclick = (e) => {
            e.preventDefault(); e.stopPropagation();
            isSadamMode = !isSadamMode;
            if (isSadamMode) { isDescMode = false; activeCustomBtn = null; updateCustomButtonStyles(); }
            updateDescButtonStyle(toggleBtn);
            updateSadamButtonStyle(sadamBtn);
            textarea.focus();
        };
        addStyleRefresh(sadamBtn, updateSadamButtonStyle);
        updateSadamButtonStyle(sadamBtn);
    }

    let journalBtn = document.getElementById("custom-journal-toggle");
    let popup = document.getElementById("custom-journal-popup");
    let charList = [];

    if (!journalBtn) {
        journalBtn = document.createElement("button");
        journalBtn.id = "custom-journal-toggle";
        journalBtn.type = "button";
        journalBtn.innerText = "저널";
        journalBtn.style.cssText = sharedBtnStyle + `background-color: ${CONFIG.inactiveBg} !important; color: ${CONFIG.inactiveText} !important; border-color: ${CONFIG.inactiveBorder} !important;`;
        if (!btnVisible.journal) journalBtn.style.display = "none";

        popup = document.createElement("div");
        popup.id = "custom-journal-popup";

        const header = document.createElement("div");
        header.className = "cj-header";
        const titleSpan = document.createElement("span");
        titleSpan.textContent = "빠른 저널";
        const closeBtn = document.createElement("button");
        closeBtn.className = "cj-close-btn";
        closeBtn.textContent = "✕";
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            popup.classList.remove("show");
            journalBtn.style.setProperty("background-color", CONFIG.inactiveBg, "important");   // 이거 없으면 롤20이 자꾸 덮어씌우네요…….
            journalBtn.style.setProperty("color", CONFIG.inactiveText, "important");
        };
        header.appendChild(titleSpan);
        header.appendChild(closeBtn);
        popup.appendChild(header);

        header.addEventListener("mousedown", (e) => {
            if (e.target.classList.contains("cj-close-btn")) return;
            e.preventDefault();
            const r = popup.getBoundingClientRect();
            popup.style.left = r.left + "px"; popup.style.top = r.top + "px";
            popup.style.right = "auto"; popup.style.bottom = "auto";
            const sx = e.clientX, sy = e.clientY;
            const onMove = (e) => {
                popup.style.left = (r.left + e.clientX - sx) + "px";
                popup.style.top  = (r.top  + e.clientY - sy) + "px";
            };
            const onUp = () => {
                popup.dataset.userMoved = "true";
                localStorage.setItem("r20_popup_left", popup.style.left);
                localStorage.setItem("r20_popup_top",  popup.style.top);
                window.removeEventListener("mousemove", onMove);
                window.removeEventListener("mouseup",   onUp);
            };
            window.addEventListener("mousemove", onMove);
            window.addEventListener("mouseup",   onUp);
        });

        const searchContainer = document.createElement("div");
        searchContainer.className = "cj-search-container";
        const searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.className = "cj-search-input";
        searchInput.placeholder = "검색...";
        searchInput.addEventListener("keydown", (e) => e.stopPropagation());
        searchContainer.appendChild(searchInput);

        const listContainer = document.createElement("div");
        listContainer.className = "cj-list-container";
        popup.appendChild(searchContainer);
        popup.appendChild(listContainer);

        let dragSrcValue = null;

        const clearDragStyles = () => {
            listContainer.querySelectorAll(".cj-item").forEach(el =>
                el.classList.remove("cj-drag-over-left", "cj-drag-over-right"));
        };

        const updateList = (filterText = "") => {
            listContainer.innerHTML = "";
            charList.filter(c => c.name.toLowerCase().includes(filterText.toLowerCase()))
            .forEach(char => {
                const item = document.createElement("div");
                const currentVal = speakingAsSelect ? speakingAsSelect.value : "";
                item.className = "cj-item" + (char.value === currentVal ? " cj-selected" : "");
                item.dataset.charValue = char.value;
                item.title = char.name;                         // 이름은 마우스를 올리면 툴팁으로
                item.setAttribute("role", "button");
                item.setAttribute("aria-label", char.name);

                // 아이콘을 누른 채 4px 넘게 움직이면 순서 바꾸기(좌우), 그냥 떼면 선택
                let dragged = false;
                item.addEventListener("mousedown", (e) => {
                    if (e.button !== 0) return;
                    e.preventDefault(); e.stopPropagation();
                    const sx = e.clientX, sy = e.clientY;
                    dragged = false;
                    const dropTarget = (ev) => document.elementFromPoint(ev.clientX, ev.clientY)?.closest(".cj-item[data-char-value]");
                    const onMove = (ev) => {
                        if (!dragged) {
                            if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 4) return;
                            dragged = true;
                            dragSrcValue = char.value;
                            item.style.opacity = "0.5";
                            document.body.style.userSelect = "none";
                        }
                        clearDragStyles();
                        const target = dropTarget(ev);
                        if (target && target.dataset.charValue !== dragSrcValue) {
                            const mid = target.getBoundingClientRect().left + target.offsetWidth / 2;
                            target.classList.add(ev.clientX < mid ? "cj-drag-over-left" : "cj-drag-over-right");
                        }
                    };
                    const onUp = (ev) => {
                        window.removeEventListener("mousemove", onMove);
                        window.removeEventListener("mouseup",   onUp);
                        if (!dragged) return;
                        item.style.opacity = "";
                        document.body.style.userSelect = "";
                        const target = dropTarget(ev);
                        clearDragStyles();
                        if (target && target.dataset.charValue !== dragSrcValue) {
                            const fromIdx = charList.findIndex(c => c.value === dragSrcValue);
                            const toIdx   = charList.findIndex(c => c.value === target.dataset.charValue);
                            if (fromIdx !== -1 && toIdx !== -1) {
                                const mid   = target.getBoundingClientRect().left + target.offsetWidth / 2;
                                const after = ev.clientX >= mid;
                                const removed = charList.splice(fromIdx, 1)[0];
                                const newTo   = charList.findIndex(c => c.value === target.dataset.charValue);
                                charList.splice(after ? newTo + 1 : newTo, 0, removed);
                                localStorage.setItem("r20_char_order", JSON.stringify(charList.map(c => c.value)));
                                updateList(searchInput.value);
                            }
                        }
                        dragSrcValue = null;
                    };
                    window.addEventListener("mousemove", onMove);
                    window.addEventListener("mouseup",   onUp);
                });

                const jItem = char.id ? document.querySelector(`li.character[data-itemid="${char.id}"]`) : null;
                const img   = jItem?.querySelector("img");
                const src   = img ? (img.getAttribute("src") || img.getAttribute("data-src") || "") : "";
                let avatarEl;
                if (src && !src.includes("images/character.png") && !src.includes("default")) {
                    avatarEl = document.createElement("img");
                    avatarEl.src = src; avatarEl.className = "cj-avatar";
                    avatarEl.draggable = false;
                } else {
                    // 아바타가 없으면 이름 첫 글자
                    avatarEl = document.createElement("div");
                    avatarEl.className = "cj-avatar cj-initial";
                    avatarEl.textContent = char.name.trim().charAt(0) || "?";
                }

                item.appendChild(avatarEl);
                item.onclick = () => {
                    if (dragged) return;
                    if (speakingAsSelect) {
                        speakingAsSelect.value = char.value;
                        speakingAsSelect.dispatchEvent(new Event("change", { bubbles: true }));
                    }
                    updateList(searchInput.value);
                };
                listContainer.appendChild(item);
            });
        };

        const loadCharacters = () => {
            const raw = [];
            if (speakingAsSelect) {
                Array.from(speakingAsSelect.options).forEach(opt => {
                    const name = opt.text.trim(), val = opt.value;
                    if (!name || !val) return;
                    raw.push({ value: val, name, id: val.startsWith("character|") ? val.split("|")[1] : null });
                });
            }
            let order = null;
            try { order = JSON.parse(localStorage.getItem("r20_char_order") || "null"); } catch(e) {}
            if (order) {
                const ordered = [];
                order.forEach(v => { const c = raw.find(r => r.value === v); if (c) ordered.push(c); });
                raw.forEach(c => { if (!ordered.find(o => o.value === c.value)) ordered.push(c); });
                charList = ordered;
            } else {
                charList = raw;
            }
            updateList(searchInput.value);
        };

// DOM -”-

        journalBtn.onclick = (e) => {
            e.preventDefault(); e.stopPropagation();
            if (popup.classList.contains("show")) {
                popup.classList.remove("show");
                journalBtn.style.setProperty("background-color", CONFIG.inactiveBg, "important");
                journalBtn.style.setProperty("color", CONFIG.inactiveText, "important");
                return;
            }
            loadCharacters();
            const savedL = localStorage.getItem("r20_popup_left");
            const savedT = localStorage.getItem("r20_popup_top");
            if (savedL && savedT) {
                popup.style.left = savedL; popup.style.top = savedT;
                popup.style.right = "auto"; popup.style.bottom = "auto";
            } else if (!popup.dataset.userMoved) {
                const rect = journalBtn.getBoundingClientRect();
                popup.style.right  = (window.innerWidth - rect.left + 210) + "px";
                popup.style.bottom = (window.innerHeight - rect.top + 8) + "px";
                popup.style.left   = "auto"; popup.style.top = "auto";
            }
            const savedW = localStorage.getItem("r20_popup_w");
            const savedH = localStorage.getItem("r20_popup_h");
            if (savedW) popup.style.width = savedW;
            if (savedH) popup.style.height = savedH;
            popup.classList.add("show");
            // 캐릭터가 많아도 팝업이 화면 밖으로 넘치지 않게 (목록은 안에서 스크롤)
            popup.style.maxHeight = "";
            const pr = popup.getBoundingClientRect();
            const room = popup.style.top && popup.style.top !== "auto" ? window.innerHeight - pr.top : pr.bottom;
            popup.style.maxHeight = Math.max(160, room - 8) + "px";
            journalBtn.style.setProperty("background-color", "#444", "important");
            journalBtn.style.setProperty("color", "#fff", "important");
            searchInput.value = ""; updateList("");
            searchInput.focus();
        };

        searchInput.oninput = (e) => updateList(e.target.value);

        const resizeHandle = document.createElement("div");
        resizeHandle.className = "cj-resize-handle";
        resizeHandle.addEventListener("mousedown", (e) => {
            e.preventDefault(); e.stopPropagation();
            const startX = e.clientX, startY = e.clientY;
            const startW = popup.offsetWidth, startH = popup.offsetHeight;
            const onMove = (ev) => {
                popup.style.width  = Math.max(150, startW + (ev.clientX - startX)) + "px";
                popup.style.height = Math.max(120, startH + (ev.clientY - startY)) + "px";
            };
            const onUp = () => {
                localStorage.setItem("r20_popup_w", popup.style.width);
                localStorage.setItem("r20_popup_h", popup.style.height);
                window.removeEventListener("mousemove", onMove);
                window.removeEventListener("mouseup", onUp);
            };
            window.addEventListener("mousemove", onMove);
            window.addEventListener("mouseup", onUp);
        });
        popup.appendChild(resizeHandle);

        document.body.appendChild(popup);
    }

    leftBtnGroup.id = "custom-left-group";
    leftBtnGroup.appendChild(toggleBtn);
    leftBtnGroup.appendChild(sadamBtn);
    leftBtnGroup.appendChild(journalBtn);

    buttonRow.appendChild(leftBtnGroup);
    buttonRow.appendChild(sendBtn);

    const resizer = document.createElement("div");
    resizer.id = "custom-resizer";
    resizer.style.cssText = `
        width: 100%;
        height: 6px;
        cursor: ns-resize;
        background: transparent;
        border-top: 1px solid #ddd;
        margin-bottom: 2px;
        z-index: 2000;
        position: relative;
    `;

    let targetHeight = 90;
    let isApplying = false;

    const applyTextareaHeight = () => {
        if (isApplying) return;
        isApplying = true;
        textarea.style.setProperty("height", targetHeight + "px", "important");
        textarea.style.setProperty("min-height", targetHeight + "px", "important");
        isApplying = false;
    };
    applyTextareaHeight();

    textarea.style.setProperty("resize", "none", "important");
    textarea.style.setProperty("width", "100%", "important");
    textarea.style.setProperty("margin", "0", "important");
    textarea.style.setProperty("box-sizing", "border-box", "important");

    new MutationObserver(applyTextareaHeight).observe(textarea, {
        attributes: true,
        attributeFilter: ["style"]
    });

    resizer.addEventListener("mousedown", function (e) {
        e.preventDefault();
        const startY = e.clientY;
        const startHeight = targetHeight;
        document.body.style.setProperty("user-select", "none", "important");
        function doDrag(e) {
            const newHeight = startHeight + (startY - e.clientY);
            if (newHeight > 50) { targetHeight = newHeight; applyTextareaHeight(); }
        }
        function stopDrag() {
            document.body.style.removeProperty("user-select");
            window.removeEventListener("mousemove", doDrag);
            window.removeEventListener("mouseup", stopDrag);
        }
        window.addEventListener("mousemove", doDrag);
        window.addEventListener("mouseup", stopDrag);
    });

    container.appendChild(buttonRow);
    container.appendChild(resizer);
    container.appendChild(textarea);
    container.classList.add("layout-applied-v11");
    renderCustomButtons();
}

function applyDescPrefix(text) {
    const stripped = text.startsWith(CONFIG.prefix) ? text.slice(CONFIG.prefix.length) : text;
    if (!stripped.trim() || stripped.startsWith("/")) return text;
    return CONFIG.prefix + stripped;
}

// 오너 사담 · 캐릭터 사담 공통 글자 모양
const SADAM_STYLE = "text-decoration:none; font-size:11px; color:#aaaaaa;";

function applySadamPrefix(text) {
    const trimmed = text.trim();
    if (!trimmed || trimmed.startsWith("/")) return text;
    return `/o [${trimmed}](#"style="${SADAM_STYLE}")`;
}

function applyCharSadamPrefix(text) {
    const trimmed = text.trim();
    if (!trimmed || trimmed.startsWith("/")) return text;
    return `[${trimmed}](#"style="${SADAM_STYLE}")`;
}

function applyActivePrefix(text) {
	text = text.trimStart();
    if (activeCustomBtn) {
        const content = activeCustomBtn.content;
        const match = content.match(/^([\s\S]*?)\?\{[^}]*\}([\s\S]*)$/);
        if (match) return match[1] + text + match[2];
        return content;
    }

    let baseText = text;
    const asRegex = /^\/as\s+"[^"]+"\s*/i;
    if (asRegex.test(baseText)) baseText = baseText.replace(asRegex, "");

    if (isDescMode) return applyDescPrefix(baseText);
    if (isSadamMode) {
        if (btnVisible.charsadam) return applyCharSadamPrefix(baseText);
        else return applySadamPrefix(baseText);
    }

    const speakingAsSelect = document.getElementById("speakingas");
    const nameInput = document.getElementById("custom-speaker-name");
    if (speakingAsSelect && nameInput) {
        const originalName = speakingAsSelect.options[speakingAsSelect.selectedIndex]?.text || "";
        const customName = nameInput.value.trim();
        const trimmedText = baseText.trim();
        if (customName !== "" && customName !== originalName && !trimmedText.startsWith("/")) {
            return `/as "${customName}" ${baseText}`;
        }
    }
    return baseText;
}

document.addEventListener("keydown", (e) => {
    const target = e.target;
    if (target.tagName === "TEXTAREA" && target.classList.contains("ui-autocomplete-input")) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            e.stopImmediatePropagation();
            target.value = applyActivePrefix(target.value);
            target.dispatchEvent(new Event("input", { bubbles: true }));
            const sendBtn = document.getElementById("chatSendBtn");
            if (sendBtn) sendBtn.click();
        }
        if (e.key === "ArrowUp") {
            setTimeout(() => {
                let val = target.value;
                val = val.replace(/^\/as\s+"[^"]+"\s*/i, "");
                val = val.replace(/^\/desc\s+/i, "");

                // 오너·캐릭터 사담 (예전 글자 모양으로 보낸 것도 포함)
                const sadamMatch = val.match(/^(?:\/o\s+)?\[(.*?)\]\(#"style="[^"]*"\)/i);
                if (sadamMatch) val = sadamMatch[1];

                if (target.value !== val) target.value = val;
            }, 10);
        }
    }
}, true);

document.addEventListener("mousedown", (e) => {
    if (e.target.id === "chatSendBtn" || e.target.closest("#chatSendBtn")) {
        const textarea = document.querySelector("#textchat-input textarea");
        if (textarea) {
            textarea.value = applyActivePrefix(textarea.value);
            textarea.dispatchEvent(new Event("input", { bubbles: true }));
        }
    }
}, true);

// 예전 버전 사본이 먼저 넣은 스타일이 있으면 이 버전 것으로 바꾼다
const oldAddonStyle = document.getElementById("r20-addon-style");
if (oldAddonStyle && !oldAddonStyle.dataset.aio) warnDuplicate();
if (!oldAddonStyle || !oldAddonStyle.dataset.aio) {
    const style = oldAddonStyle || document.createElement("style");
    style.id = "r20-addon-style";
    style.dataset.aio = "1";
    style.innerHTML = `
        #r20-ac-box { position:fixed; z-index:100000; min-width:220px; max-width:360px; max-height:260px; overflow-y:auto; background:#fff; border:1px solid #ccc; border-radius:4px; box-shadow:0 4px 12px rgba(0,0,0,0.18); font-family:sans-serif; font-size:12px; color:#333; display:none; }
        #r20-ac-box.show { display:block; }
        .r20-ac-item { display:flex; align-items:baseline; gap:6px; padding:4px 8px; cursor:pointer; border-bottom:1px solid #f0f0f0; white-space:nowrap; }
        .r20-ac-item b { font-weight:700; overflow:hidden; text-overflow:ellipsis; }
        .r20-ac-item small { color:#999; font-size:10px; overflow:hidden; text-overflow:ellipsis; }
        .r20-ac-item.on, .r20-ac-item:hover { background:#e6f7ff; }
        .r20-bgm-pv { cursor:pointer; margin-right:4px; font-size:12px; opacity:0.55; text-decoration:none !important; user-select:none; }
        .r20-bgm-pv:hover, .r20-bgm-pv:focus-visible { opacity:1; }
        .r20-bgm-pv.on { opacity:1; filter:drop-shadow(0 0 2px #1867c7); }
        body.r20-bgm-off .r20-bgm-pv { display:none; }

        #r20be { position:fixed; z-index:10005; display:none; flex-direction:column; width:900px; height:600px; min-width:420px; min-height:320px; max-width:calc(100vw - 16px); max-height:calc(100vh - 16px); background:#fff; border:1px solid #b5b5b5; border-radius:4px; box-shadow:0 8px 24px rgba(0,0,0,0.22); font-family:sans-serif; font-size:12px; color:#333; resize:both; overflow:hidden; box-sizing:border-box; }
        /* Roll20(Bootstrap)의 .show { display:block !important } 와 겹치지 않게 전용 클래스를 쓴다 */
        #r20be.r20be-show { display:flex !important; }
        #r20be *, #r20be *::before, #r20be *::after { box-sizing:border-box; }
        #r20be [hidden] { display:none !important; }
        #r20be button:focus-visible, #r20be input:focus-visible, #r20be select:focus-visible, #r20be textarea:focus-visible { outline:2px solid #1867c7; outline-offset:1px; }
        #r20be .r20be-head { display:flex; align-items:center; gap:10px; height:36px; padding:0 6px 0 10px; background:#f0f0f0; border-bottom:1px solid #dcdcdc; cursor:move; user-select:none; flex-shrink:0; }
        #r20be .r20be-head strong { font-size:12px; color:#555; }
        #r20be .r20be-ver { margin-left:-6px; color:#999; font-size:10px; }
        #r20be .r20be-seg { display:flex; gap:2px; padding:2px; background:#e2e2e2; border-radius:4px; }
        #r20be .r20be-seg button { border:0; background:transparent; height:24px; padding:0 12px; font-size:12px; font-weight:700; color:#555; border-radius:3px; cursor:pointer; }
        #r20be .r20be-seg button.on { background:#1867c7; color:#fff; }
        #r20be .r20be-flex { flex:1; }
        #r20be .r20be-ico { display:inline-flex; flex-shrink:0; }
        #r20be .r20be-ib { display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px; border:0; background:transparent; border-radius:3px; cursor:pointer; color:#6b6b6b; padding:0; flex-shrink:0; }
        #r20be .r20be-ib:hover { background:#e6e6e6; color:#333; }
        #r20be .r20be-tools { position:relative; display:flex; flex-wrap:wrap; align-items:center; gap:6px; padding:6px 8px; border-bottom:1px solid #e6e6e6; flex-shrink:0; }
        #r20be .r20be-chips { display:flex; flex-wrap:wrap; gap:4px; }
        #r20be .r20be-in { width:100%; height:28px; margin:0; padding:0 8px; border:1px solid #ccc; border-radius:3px; background:#fff; color:#333; font-size:12px; box-shadow:none; }
        #r20be .r20be-in:focus { border-color:#1867c7; outline:none; }
        #r20be .r20be-search { flex:1 1 160px; max-width:240px; width:auto; }
        #r20be .r20be-chip { height:24px; padding:0 9px; border:1px solid #d4d4d4; border-radius:12px; background:#fff; color:#555; font-size:11px; cursor:pointer; }
        #r20be .r20be-chip.on { border-color:#1867c7; background:#eef5fd; color:#1867c7; font-weight:700; }
        #r20be .r20be-badge { padding:3px 8px; border-radius:10px; background:#fff4e5; color:#b45309; font-size:11px; font-weight:700; }
        #r20be .r20be-pri { height:26px; padding:0 14px; border:0; border-radius:3px; background:#1867c7; color:#fff; font-size:12px; font-weight:700; cursor:pointer; }
        #r20be .r20be-pri:hover { background:#1455a4; }
        #r20be .r20be-pri:disabled { background:#b9cde6; cursor:default; }
        #r20be .r20be-sec { display:inline-flex; align-items:center; gap:4px; height:26px; padding:0 10px; border:1px solid #d4d4d4; border-radius:3px; background:#fff; color:#444; font-size:12px; cursor:pointer; }
        #r20be .r20be-sec:hover { background:#f2f2f2; }
        #r20be .r20be-sec:disabled { background:#fff; color:#aaa; cursor:default; }
        #r20be .r20be-sec.on { background:#333; border-color:#333; color:#fff; }
        #r20be .r20be-sec.danger { color:#b91c1c; }
        #r20be .r20be-menu { position:absolute; top:34px; z-index:2; display:flex; flex-direction:column; min-width:130px; padding:4px 0; background:#fff; border:1px solid #ccc; border-radius:4px; box-shadow:0 4px 12px rgba(0,0,0,0.18); }
        #r20be .r20be-menu button { padding:6px 12px; border:0; background:transparent; color:#333; font-size:12px; text-align:left; cursor:pointer; }
        #r20be .r20be-menu button:hover { background:#eef6ff; }
        #r20be .r20be-menu button:disabled { background:transparent; color:#aaa; cursor:default; }
        #r20be .r20be-body { flex:1 1 0; min-height:0; display:flex; overflow:hidden; }
        #r20be .r20be-col { position:relative; min-height:0; display:flex; }
        #r20be .r20be-col.tree { flex:0 0 300px; min-width:200px; border-right:1px solid #e6e6e6; }
        #r20be .r20be-col.pane { flex:1; min-width:0; }
        /* 기본 스크롤바 대신 직접 만든 스크롤바(.r20be-sb)를 쓴다 */
        #r20be .r20be-tree, #r20be .r20be-pane { flex:1; min-width:0; min-height:0; overflow-y:auto; scrollbar-width:none; }
        #r20be .r20be-tree::-webkit-scrollbar, #r20be .r20be-pane::-webkit-scrollbar { display:none; }
        #r20be .r20be-tree { padding-right:14px; }
        #r20be .r20be-pane { padding:14px 26px 14px 16px; }
        #r20be .r20be-sb { position:absolute; top:3px; right:3px; bottom:3px; width:10px; border-radius:5px; background:#ededed; cursor:pointer; }
        #r20be .r20be-sb-th { position:absolute; top:0; left:1px; right:1px; min-height:24px; border-radius:4px; background:#b0b0b0; cursor:grab; }
        #r20be .r20be-sb-th:hover, #r20be .r20be-sb-th.drag { background:#888; }
        #r20be .r20be-row { display:flex; align-items:center; gap:3px; min-height:28px; padding-right:6px; border-bottom:1px solid #f2f2f2; }
        #r20be .r20be-row:hover { background:#f3f8fe; }
        #r20be .r20be-row.chk { background:#eef5fd; }
        #r20be .r20be-row.sel { background:#dcebfb; }
        #r20be .r20be-row.del .r20be-nm span { color:#999; text-decoration:line-through; }
        #r20be .r20be-row.drop-in { outline:2px solid #1867c7; outline-offset:-2px; }
        #r20be .r20be-row.drop-before { box-shadow:inset 0 2px 0 #1867c7; }
        #r20be .r20be-sp { width:22px; flex-shrink:0; }
        #r20be .r20be-cb { display:inline-flex; align-items:center; justify-content:center; width:15px; height:15px; padding:0; border:1px solid #b8b8b8; border-radius:3px; background:#fff; color:#fff; cursor:pointer; flex-shrink:0; }
        #r20be .r20be-cb svg { visibility:hidden; }
        #r20be .r20be-cb.on { background:#1867c7; border-color:#1867c7; }
        #r20be .r20be-cb.on svg { visibility:visible; }
        #r20be .r20be-nm { flex:1; min-width:0; display:flex; align-items:center; gap:5px; height:26px; padding:0 4px; border:0; background:transparent; color:#222; font-size:12px; text-align:left; cursor:pointer; }
        #r20be .r20be-nm span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        #r20be .r20be-nm svg { flex-shrink:0; }
        #r20be .r20be-dot { width:7px; height:7px; border-radius:50%; background:#c2410c; flex-shrink:0; }
        #r20be .r20be-meta { color:#6b6b6b; font-size:10px; white-space:nowrap; flex-shrink:0; }
        #r20be .r20be-inl { flex:1; min-width:0; height:24px; }
        #r20be .r20be-pane-in { display:flex; flex-direction:column; gap:12px; min-height:100%; }
        #r20be .r20be-ph { display:flex; align-items:center; gap:8px; }
        #r20be .r20be-ph strong { font-size:14px; }
        #r20be .r20be-tag { padding:2px 7px; border-radius:9px; font-size:10px; font-weight:700; }
        #r20be .r20be-tag.del { background:#fde8e8; color:#b91c1c; }
        #r20be .r20be-tag.new { background:#e7f6ec; color:#15803d; }
        #r20be .r20be-grid { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:10px; }
        #r20be .r20be-fld { display:block; margin:0; font-weight:normal; }
        #r20be .r20be-lb { display:block; margin-bottom:4px; color:#555; font-size:11px; font-weight:700; }
        #r20be .r20be-ed { flex:1 0 auto; min-height:240px; display:flex; flex-direction:column; border:1px solid #ccc; border-radius:4px; overflow:hidden; }
        #r20be .r20be-ctabs { display:flex; padding:0 4px; border-bottom:1px solid #e6e6e6; flex-shrink:0; }
        #r20be .r20be-ctab { height:28px; padding:0 10px; border:0; border-bottom:2px solid transparent; background:transparent; color:#6b6b6b; font-size:12px; font-weight:700; cursor:pointer; }
        #r20be .r20be-ctab.on { border-bottom-color:#1867c7; color:#1867c7; }
        #r20be .r20be-ta { flex:1 0 auto; width:100%; min-height:200px; overflow:hidden; margin:0; padding:10px 12px; border:0; border-radius:0; box-shadow:none; resize:none; outline:none; font-family:inherit; font-size:13px; line-height:1.7; }
        #r20be .r20be-ta.mono { font-family:Consolas, monospace; font-size:12px; }
        #r20be .r20be-warn { display:flex; flex-wrap:wrap; align-items:center; gap:8px; padding:6px 10px; border-bottom:1px solid #fde4c8; background:#fff7ed; color:#92400e; font-size:11px; }
        #r20be .r20be-note, #r20be .r20be-empty { margin:0; color:#6b6b6b; font-size:12px; }
        #r20be .r20be-empty { padding:24px 8px; text-align:center; }
        #r20be .r20be-chk { display:flex; align-items:center; gap:6px; margin:0; font-size:12px; font-weight:normal; }
        #r20be .r20be-chk input { margin:0; }
        #r20be .r20be-range { width:100%; margin:0; }
        #r20be .r20be-pv { display:flex; align-items:center; gap:10px; padding:10px 12px; border:1px solid #e6e6e6; border-radius:4px; background:#fafafa; }
        #r20be .r20be-prev { border:1px solid #e6e6e6; border-radius:4px; overflow:hidden; }
        #r20be .r20be-prev > div { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:10px; padding:5px 10px; border-top:1px solid #f0f0f0; }
        #r20be .r20be-prev > div:first-child { border-top:0; background:#f6f6f6; color:#555; font-size:11px; font-weight:700; }
        #r20be .r20be-prev span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        #r20be .r20be-prev .chg { color:#1867c7; font-weight:700; }
        #r20be .r20be-prev .same { color:#8a8a8a; }
        #r20be .r20be-acts { display:flex; gap:8px; }
        #r20be .r20be-foot { display:flex; align-items:center; min-height:26px; padding:3px 10px; border-top:1px solid #e6e6e6; background:#f7f7f7; color:#555; font-size:11px; flex-shrink:0; }
        #r20be .r20be-foot.ok { color:#15803d; font-weight:700; }
        #r20be .r20be-foot.err { color:#b91c1c; font-weight:700; }
        @media (max-width: 640px) {
            #r20be .r20be-body { flex-direction:column; }
            #r20be .r20be-col.tree { flex:0 0 40%; border-right:0; border-bottom:1px solid #e6e6e6; }
            #r20be .r20be-grid { grid-template-columns:minmax(0, 1fr); }
        }
        /* 주크박스 한 줄 보기: Roll20 요소는 그대로 두고 배치·크기만 바꾼다 (.playbackcontrol 을 풀어 한 줄 flex 로) */
        body.r20jb-on #jukebox .instructions { display:none !important; }
        body.r20jb-on #jukebox .secondarycontrols { margin:2px 0 6px !important; }
        body.r20jb-on #jukebox #addnewjukeboxfolder { height:auto !important; padding:2px 8px !important; font-size:11px !important; line-height:1.4 !important; }
        body.r20jb-on #jukeboxfolderroot .dd-list .dd-list { clear:both; padding-left:0 !important; margin-left:0 !important; }
        /* 재생목록 머리줄: 폴더째 재생 버튼만 */
        body.r20jb-on #jukeboxfolderroot li.dd-folder > .dd-content { display:flex !important; align-items:center !important; gap:2px; height:auto !important; min-height:28px !important; margin:0 !important; padding-top:0 !important; padding-bottom:0 !important; }
        body.r20jb-on #jukeboxfolderroot li.dd-folder > .dd-content .folder-title { flex:1 1 auto; min-width:0; float:none !important; width:auto !important; margin:0 !important; overflow:hidden; white-space:nowrap !important; text-overflow:ellipsis; font-size:12px !important; font-weight:700 !important; line-height:28px !important; }
        body.r20jb-on #jukeboxfolderroot li.dd-folder > .dd-content .playlistcontrols { display:flex !important; align-items:center; flex-shrink:0; float:none !important; position:static !important; margin:0 !important; }
        body.r20jb-on #jukeboxfolderroot .playlistcontrols a.playstyle, body.r20jb-on #jukeboxfolderroot .playlistcontrols a.exportplaylist { display:none !important; }
        body.r20jb-on #jukeboxfolderroot .playlistcontrols a.play { display:inline-flex !important; align-items:center; justify-content:center; width:22px; margin:0 !important; color:#777 !important; text-decoration:none !important; }
        body.r20jb-on #jukeboxfolderroot .playlistcontrols a.play .pictos { font-size:13px !important; line-height:28px !important; }
        body.r20jb-on #jukeboxfolderroot .playlistcontrols a.play:hover { color:#222 !important; }
        /* 빈 재생목록의 자리표시(끌어 넣기용)는 남기되 높이만 줄인다 */
        body.r20jb-on #jukeboxfolderroot li.dd-item-dummy > .dd-content { height:6px !important; min-height:0 !important; margin:0 !important; padding:0 !important; border:0 !important; }
        /* 곡 줄 */
        body.r20jb-on #jukebox li.jukeboxitem { position:relative !important; min-height:0 !important; height:auto !important; margin:0 !important; padding:0 !important; }
        /* 끌기 손잡이(☰)는 곡 줄 바로 왼쪽에 붙이고, 줄에 마우스를 올렸을 때만 보인다 */
        body.r20jb-on #jukebox li.jukeboxitem > .dd-handle { position:absolute !important; left:0 !important; top:0 !important; bottom:0 !important; width:12px !important; height:auto !important; margin:0 !important; padding:0 !important; border:0 !important; background:none !important; transform:none !important; overflow:hidden !important; text-indent:0 !important; font-size:0 !important; display:flex !important; align-items:center; justify-content:center; cursor:grab; }
        body.r20jb-on #jukebox li.jukeboxitem > .dd-handle::before { content:"☰" !important; position:static !important; display:block !important; margin:0 !important; font-size:9px !important; line-height:1 !important; color:#999 !important; opacity:0; }
        body.r20jb-on #jukebox li.jukeboxitem > .dd-handle::after { display:none !important; }
        body.r20jb-on #jukebox li.jukeboxitem:hover > .dd-handle::before { opacity:1; }
        body.r20jb-on #jukebox li.jukeboxitem > .dd-content { display:flex !important; align-items:center !important; gap:0; float:none !important; position:relative !important; left:auto !important; width:auto !important; height:auto !important; min-height:26px !important; margin:0 0 0 12px !important; padding:0 2px !important; border:0 !important; border-bottom:1px solid rgba(128,128,128,0.12) !important; background:none; }
        body.r20jb-on #jukebox li.jukeboxitem .playbackcontrol { display:contents !important; }
        body.r20jb-on #jukebox li.jukeboxitem .playbackcontrol > * { float:none !important; position:static !important; margin:0 !important; flex-shrink:0; }
        body.r20jb-on #jukebox li.jukeboxitem .title { order:2; flex:1 1 auto; min-width:0; float:none !important; width:auto !important; margin:0 !important; padding:0 3px !important; overflow:hidden; white-space:nowrap !important; text-overflow:ellipsis; font-size:12px !important; font-weight:400 !important; line-height:26px !important; }
        body.r20jb-on #jukebox li.jukeboxitem .r20-bgm-pv { order:0; width:14px; text-align:center; font-size:11px; filter:grayscale(1); opacity:0.4; }
        body.r20jb-on #jukebox li.jukeboxitem .r20-bgm-pv.on { filter:none; opacity:1; }
        body.r20jb-on #jukebox li.jukeboxitem a.play { order:1; display:inline-flex !important; align-items:center; justify-content:center; width:14px; color:#777 !important; text-decoration:none !important; }
        body.r20jb-on #jukebox li.jukeboxitem a.play .pictos { font-size:12px !important; line-height:26px !important; }
        body.r20jb-on #jukebox li.jukeboxitem .loopcontainer { order:3; display:inline-flex !important; align-items:center; width:14px; justify-content:center; }
        body.r20jb-on #jukebox li.jukeboxitem .loopcontainer input.loop { display:none !important; }
        body.r20jb-on #jukebox li.jukeboxitem .loopcontainer label, body.r20jb-on #jukebox li.jukeboxitem .loopcontainer label * { margin:0 !important; padding:0 !important; font-size:10px !important; line-height:26px !important; color:#c6c6c6 !important; cursor:pointer; }
        body.r20jb-on #jukebox li.jukeboxitem .loopcontainer input.loop:checked + label, body.r20jb-on #jukebox li.jukeboxitem .loopcontainer input.loop:checked + label * { color:#5f8fc7 !important; }
        body.r20jb-on #jukebox li.jukeboxitem .volume { order:4; display:inline-flex !important; align-items:center; width:48px !important; height:26px; margin:0 2px !important; }
        /* 볼륨: 슬라이더 대신 ◂ 값 ▸ (10% 단위) — 버튼이 붙으면 슬라이더는 숨긴다 */
        body.r20jb-on #jukebox li.jukeboxitem .volume:has(> .r20jb-vol) { width:auto !important; margin:0 !important; }
        body.r20jb-on #jukebox li.jukeboxitem .volume:has(> .r20jb-vol) input.slider { display:none !important; }
        .r20jb-vol { display:none; }
        body.r20jb-on #jukebox li.jukeboxitem .r20jb-vol { display:inline-flex; align-items:center; }
        body.r20jb-on #jukebox li.jukeboxitem .r20jb-vol button { width:11px; height:22px; margin:0; padding:0; border:0; background:none; color:#aaa; font-size:9px; line-height:22px; cursor:pointer; }
        body.r20jb-on #jukebox li.jukeboxitem .r20jb-vol button:hover { color:#222; }
        body.r20jb-on #jukebox li.jukeboxitem .r20jb-vol span { width:20px; color:#777; font-size:10px; text-align:center; font-variant-numeric:tabular-nums; }
        body.r20jb-on #jukebox li.jukeboxitem .volume input.slider { -webkit-appearance:none !important; appearance:none !important; width:100% !important; height:14px !important; margin:0 !important; padding:0 !important; border:0 !important; background:transparent !important; box-shadow:none !important; }
        body.r20jb-on #jukebox li.jukeboxitem .volume input.slider::-webkit-slider-runnable-track { height:2px !important; border:0 !important; border-radius:1px; background:#d3dbe6 !important; }
        body.r20jb-on #jukebox li.jukeboxitem .volume input.slider::-webkit-slider-thumb { -webkit-appearance:none !important; width:8px !important; height:8px !important; margin-top:-3px !important; border:0 !important; border-radius:50% !important; background:#7d9fc9 !important; box-shadow:none !important; }
        body.r20jb-on #jukebox li.jukeboxitem .volume input.slider::-moz-range-track { height:2px; border:0; background:#d3dbe6; }
        body.r20jb-on #jukebox li.jukeboxitem .volume input.slider::-moz-range-thumb { width:8px; height:8px; border:0; border-radius:50%; background:#7d9fc9; }
        body.r20jb-on #jukebox li.jukeboxitem .jukeboxitem-menu { order:5; display:inline-flex !important; align-items:center; justify-content:center; width:10px; color:#aaa !important; text-decoration:none !important; }
        body.r20jb-on #jukebox li.jukeboxitem .jukeboxitem-menu, body.r20jb-on #jukebox li.jukeboxitem .jukeboxitem-menu * { font-size:10px !important; }
        body.r20jb-on #jukebox li.jukeboxitem a.play:hover, body.r20jb-on #jukebox li.jukeboxitem .jukeboxitem-menu:hover, body.r20jb-on #jukebox li.jukeboxitem .loopcontainer label:hover * { color:#222 !important; }
        /* 저널 한 줄 보기: 항목 = 작은 동그란 아바타 + 이름 (폴더 계층은 10px 씩만 들여쓴다) */
        body.r20jb-on #journalfolderroot .dd-list .dd-list { clear:both; margin:0 !important; padding:0 0 0 12px !important; }
        body.r20jb-on #journalfolderroot li.dd-item { margin:0 !important; padding:0 !important; }
        /* Roll20 이 들여쓰기·간격에 쓰는 값(오프셋·text-indent 등)을 모두 0 으로 */
        body.r20jb-on #journalfolderroot ol.dd-list, body.r20jb-on #journalfolderroot li.dd-item, body.r20jb-on #journalfolderroot .dd-content, body.r20jb-on #journalfolderroot .folder-title, body.r20jb-on #journalfolderroot li.journalitem .token, body.r20jb-on #journalfolderroot li.journalitem .name, body.r20jb-on #journalfolderroot li.journalitem .namecontainer { text-indent:0 !important; left:auto !important; transform:none !important; }
        /* 폴더 ± 버튼은 줄 왼쪽 16px 안에 고정 */
        body.r20jb-on #journalfolderroot li.dd-folder { position:relative !important; }
        body.r20jb-on #journalfolderroot li.dd-folder > button[data-action] { position:absolute !important; left:0 !important; top:0 !important; float:none !important; width:16px !important; height:26px !important; margin:0 !important; line-height:26px !important; z-index:2; }
        body.r20jb-on #journalfolderroot li.dd-folder > .dd-content { display:flex !important; align-items:center !important; height:auto !important; min-height:26px !important; margin:0 !important; padding:0 4px 0 16px !important; }
        body.r20jb-on #journalfolderroot li.dd-folder > .dd-content .folder-title { flex:1 1 auto; min-width:0; float:none !important; width:auto !important; margin:0 !important; padding:0 !important; overflow:hidden; white-space:nowrap !important; text-overflow:ellipsis; font-size:12px !important; font-weight:700 !important; line-height:26px !important; }
        body.r20jb-on #journalfolderroot li.dd-folder > .dd-handle { height:26px !important; }
        body.r20jb-on #journalfolderroot li.journalitem { min-height:0 !important; height:auto !important; margin:0 !important; padding:0 !important; }
        body.r20jb-on #journalfolderroot li.journalitem > .dd-content { display:flex !important; align-items:center !important; gap:6px; float:none !important; position:relative !important; width:auto !important; height:auto !important; min-height:26px !important; margin:0 !important; padding:0 4px !important; border:0 !important; border-bottom:1px solid rgba(128,128,128,0.12) !important; }
        body.r20jb-on #journalfolderroot li.journalitem .token { float:none !important; position:static !important; flex:0 0 18px; width:18px !important; height:18px !important; margin:0 !important; padding:0 !important; border:0 !important; border-radius:50%; overflow:hidden; background:none !important; }
        body.r20jb-on #journalfolderroot li.journalitem .token img { width:18px !important; height:18px !important; max-width:none !important; margin:0 !important; border-radius:50%; object-fit:cover; }
        body.r20jb-on #journalfolderroot li.journalitem .name { flex:1 1 auto; min-width:0; display:flex !important; align-items:center; gap:4px; float:none !important; position:static !important; width:auto !important; height:auto !important; margin:0 !important; padding:0 !important; }
        body.r20jb-on #journalfolderroot li.journalitem .namecontainer { flex:1 1 auto; min-width:0; float:none !important; position:static !important; width:auto !important; margin:0 !important; padding:0 !important; overflow:hidden; white-space:nowrap !important; text-overflow:ellipsis; font-size:12px !important; font-weight:400 !important; line-height:26px !important; }
        body.r20jb-on #journalfolderroot li.journalitem .playerdots { flex-shrink:0; margin:0 !important; font-size:12px !important; line-height:1 !important; }
        body.r20jb-on #journalfolderroot li.journalitem .sourcefooter:empty { display:none !important; }
        /* 재생 중인 곡 */
        body.r20jb-on #jukebox li.jukeboxitem:has(a.play[data-isplaying="true"]) > .dd-content { background:rgba(24,103,199,0.08) !important; }
        body.r20jb-on #jukebox li.jukeboxitem:has(a.play[data-isplaying="true"]) .title { color:#1867c7 !important; font-weight:700 !important; }
        body.r20jb-on #jukebox li.jukeboxitem a.play[data-isplaying="true"] { color:#1867c7 !important; }
        body button.r20be-open { display:inline-flex; align-items:center; gap:4px; margin:6px 0; padding:3px 10px; border:1px solid #ccc; border-radius:4px; background:#fff; color:#333; font-size:11px; font-weight:700; cursor:pointer; }
        body button.r20be-open:hover { background:#f2f2f2; }
        body.r20be-off button.r20be-open { display:none; }
        .r20be-mini { margin-left:auto; margin-right:6px; padding:1px 8px; border:1px solid #ddd; border-radius:3px; background:#f5f5f5; color:#555; font-size:11px; cursor:pointer; }
        .r20be-mini:hover { background:#ebebeb; color:#333; }
    `;
    document.head.appendChild(style);
}

// ───────── 자동완성: 시트 인법/마법 목록 이름칸에 데이터명을 입력하면 그 행을 채운다 ─────────
// 데이터는 @require 한 파일이 넣어 둔다: window.NIRE_RULEDATA = { insane:[…], shinobigami:[…], magicalogia:[…] }
// 레코드 키: name, group(유파), type, skill, range, target, cost, charge, effect, flavor, recite
// type/skill 은 시트 드롭다운에 보이는 글자(예: "공격", "폭력")로 적으면 된다.
const autofill = (() => {
    const MAX = 8;
    // 시스템별 "레코드 키 → 시트 필드명(접두어 뒤)"
    const FIELDS = {
        insane:      { name: "Name", type: "Types", skill: "Assigned_Skill", effect: "Effect" },
        shinobigami: { name: "Name", group: "Clan", type: "Types", skill: "Assigned_Skill", range: "Range", cost: "Cost", effect: "Effect" },
        magicalogia: { name: "Name", type: "Types", skill: "Assigned_Skill", target: "skillTarget", cost: "Cost", charge: "Charge", effect: "Effect", recite: "Recite" }
    };
    // inSANe 고정 행(Ninpo_03_Name)과 반복 행(Ninpo_Name) 모두 대상
    const NAME_RE = /^attr_((?:Ninpo|Magic)_(?:\d+_)?)Name$/;

    const norm = s => String(s ?? "").replace(/^\s*\d+\.\s*/, "").replace(/\s+/g, "").toLowerCase();
    const normCache = new Map();
    const getList = sys => {
        const list = window.NIRE_RULEDATA?.[sys];
        if (!Array.isArray(list)) return null;
        if (!normCache.has(list)) normCache.set(list, list.map(r => norm(r.name)));
        return list;
    };

    let box = null, input = null, items = [], sel = 0, filling = false;

    const ensureBox = () => {
        if (box) return box;
        box = document.createElement("div");
        box.id = "r20-ac-box";
        box.setAttribute("role", "listbox");
        // mousedown 기본동작을 막아 이름칸 포커스를 유지
        box.addEventListener("mousedown", e => {
            e.preventDefault();
            const el = e.target.closest(".r20-ac-item");
            if (el) apply(items[+el.dataset.i]);
        });
        document.body.appendChild(box);
        return box;
    };

    const close = () => {
        if (box) box.classList.remove("show");
        input = null; items = [];
    };

    const ctx = el => {
        const m = el.name?.match(NAME_RE);
        if (!m || el.disabled) return null;
        const base = m[1];
        const row = el.closest(".repitem") || (() => {
            let p = el.parentElement;
            for (let i = 0; p && i < 6; i++, p = p.parentElement)
                if (p.querySelector(`[name="attr_${base}Effect"]`)) return p;
            return null;
        })();
        if (!row) return null;
        const sys = base.startsWith("Magic") ? "magicalogia"
            : row.querySelector(`[name="attr_${base}Clan"]`) ? "shinobigami" : "insane";
        return { base, row, sys };
    };

    const search = (sys, q) => {
        const list = getList(sys);
        if (!list || !q) return [];
        const names = normCache.get(list);
        const head = [], mid = [];
        for (let i = 0; i < list.length && head.length < MAX; i++) {
            const n = names[i];
            if (n.startsWith(q)) head.push(list[i]);
            else if (mid.length < MAX && n.includes(q)) mid.push(list[i]);
        }
        return head.concat(mid).slice(0, MAX);
    };

    const render = () => {
        ensureBox().innerHTML = "";
        items.forEach((r, i) => {
            const it = document.createElement("div");
            it.className = "r20-ac-item" + (i === sel ? " on" : "");
            it.dataset.i = i;
            it.setAttribute("role", "option");
            const b = document.createElement("b");
            b.textContent = r.name;
            const s = document.createElement("small");
            s.textContent = [r.group, r.type, r.skill].filter(Boolean).join(" · ");
            it.append(b, s);
            box.appendChild(it);
        });
        const rc = input.getBoundingClientRect();
        box.style.left = Math.min(rc.left, window.innerWidth - 230) + "px";
        box.style.minWidth = Math.max(220, rc.width) + "px";
        // 아래 공간이 부족하면 위로 띄운다
        const below = window.innerHeight - rc.bottom;
        box.style.top = below > 270 ? (rc.bottom + 2) + "px" : "auto";
        box.style.bottom = below > 270 ? "auto" : (window.innerHeight - rc.top + 2) + "px";
        box.classList.add("show");
        box.children[sel]?.scrollIntoView({ block: "nearest" });
    };

    const pickOption = (select, label) => {
        const want = norm(label);
        if (!want) return null;
        const opts = [...select.options];
        return opts.find(o => norm(o.textContent) === want)
            || opts.find(o => norm(o.value) === want || norm(o.value) === `@{${want}}`)
            || null;
    };

    const setField = (el, value) => {
        if (el.tagName === "SELECT") {
            const opt = pickOption(el, value);
            if (!opt) { console.warn("[자동완성] 드롭다운에 없는 값:", value, el.name); return; }
            el.value = opt.value;
        } else {
            el.value = value;
        }
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
    };

    const apply = rec => {
        const c = rec && input && ctx(input);
        if (!c) return close();
        const map = FIELDS[c.sys];
        const data = { ...rec };
        // 플레이버 칸이 없는 시트는 효과 뒤에 붙인다
        if (data.flavor && !map.flavor) data.effect = [data.effect, data.flavor].filter(Boolean).join("\n\n");
        filling = true;
        for (const [key, field] of Object.entries(map)) {
            if (data[key] == null || data[key] === "") continue;
            // 같은 name 의 표시용 <span> 이 앞에 있는 시트가 있어 입력 요소만 고른다
            const el = c.row.querySelector(`:is(input,textarea,select)[name="attr_${c.base}${field}"]`);
            if (el) setField(el, String(data[key]));
        }
        filling = false;
        close();
    };

    document.addEventListener("input", e => {
        if (!btnVisible.autofill || filling) return;
        const c = ctx(e.target);
        if (!c) return;
        const found = search(c.sys, norm(e.target.value));
        if (!found.length) return close();
        input = e.target;
        input.setAttribute("autocomplete", "off");
        items = found; sel = 0;
        render();
    }, true);

    document.addEventListener("keydown", e => {
        if (!input || e.target !== input || !box?.classList.contains("show")) return;
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            sel = (sel + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length;
            render();
        } else if (e.key === "Tab") {
            apply(items[sel]);   // 포커스 이동은 그대로 둔다
            return;
        } else if (e.key === "Enter") {
            apply(items[sel]);
        } else if (e.key === "Escape") {
            close();
        } else return;
        e.preventDefault(); e.stopPropagation();
    }, true);

    document.addEventListener("focusout", e => { if (e.target === input) close(); }, true);
    window.addEventListener("resize", close);
    // 이름칸이 들어 있는 영역이 스크롤될 때만 닫는다 (채팅 자동 스크롤 등은 무시)
    document.addEventListener("scroll", e => { if (input && e.target.contains?.(input)) close(); }, true);

    return { close };
})();

// ───────── BGM 미리듣기: 주크박스 트랙을 전체 재생 전에 GM 본인만 로컬로 들어본다 ─────────
// 브라우저 Audio 로 재생하므로 Roll20 동기화(참가자 재생)와 무관하다.
const bgmPreview = (() => {
    let audio = null, curId = null, failedId = null;
    const listeners = new Set();
    const notify = () => listeners.forEach(fn => fn());
    // 참가자가 듣게 될 크기 그대로: 트랙 볼륨(0~100)을 따른다
    const trackVol = track => { const v = Number(track.get("volume")); return isFinite(v) ? Math.min(1, Math.max(0, v / 100)) : 0.5; };
    const fmt = t => isFinite(t) ? `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}` : "-:--";

    // My Audio 트랙 주소는 vtt.bundle 의 재생 주소 형식을 따른다 (track_id 앞부분 = 오디오 ID)
    const trackUrl = track => {
        const tid = String(track.get("track_id") || "");
        if (/^https?:\/\//.test(tid)) return tid;
        if (track.get("source") !== "My Audio" || !tid) return null;
        return `${window.IS_EMBEDDED ? "/.proxy" : ""}/audio_library/play/${window.campaign_id}/${tid.split(/[-#]/)[0]}`;
    };

    // 주크박스 목록은 Roll20이 자주 다시 그리므로 요소 대신 트랙 ID로 찾는다
    const markBtn = on => {
        if (!curId) return;
        document.querySelectorAll(`li.jukeboxitem[data-itemid="${CSS.escape(curId)}"] .r20-bgm-pv`)
            .forEach(b => b.classList.toggle("on", on));
    };

    function stop() {
        if (audio) { audio.pause(); audio.removeAttribute("src"); audio.load(); audio = null; }
        markBtn(false);
        curId = null;
        notify();
    }

    // vol(0~1)을 주면 그 크기로, 없으면 트랙 볼륨으로 재생
    const play = (id, vol) => {
        const track = window.Jukebox?.playlist?.get(id);
        if (!track) { console.warn("[BGM 미리듣기] 트랙을 찾지 못함:", id); return; }
        stop();
        failedId = null;
        const url = trackUrl(track);
        if (!url) { console.warn("[BGM 미리듣기] 지원하지 않는 음원:", track.attributes); failedId = id; notify(); return; }
        curId = id;
        const a = audio = new Audio(url);
        a.volume = vol ?? trackVol(track);
        // 정지된 이전 Audio 의 늦은 이벤트는 무시
        a.addEventListener("timeupdate", () => { if (a === audio) notify(); });
        a.addEventListener("ended", () => { if (a === audio) stop(); });
        a.addEventListener("error", () => {
            if (a !== audio) return;
            console.warn("[BGM 미리듣기] 재생 실패:", url, track.attributes);
            failedId = id;
            stop();
        });
        a.play().catch(() => {});
        markBtn(true);
        notify();
    };
    // 편집기에 보여줄 상태 글자
    const status = id => audio && curId === id ? `재생 중 ${fmt(audio.currentTime)} / ${fmt(audio.duration)}`
        : failedId === id ? "재생 실패 (콘솔 확인)" : "";

    const inject = () => {
        if (!btnVisible.bgm) return;
        document.querySelectorAll("li.jukeboxitem .playbackcontrol:not(:has(> .r20-bgm-pv))").forEach(pc => {
            const a = document.createElement("a");
            a.className = "r20-bgm-pv";
            a.textContent = "🎧";
            a.title = "미리듣기 (나만 듣기)";
            a.setAttribute("role", "button");
            a.tabIndex = 0;
            pc.insertBefore(a, pc.querySelector("a.play"));
            if (audio && pc.closest("li.jukeboxitem")?.dataset.itemid === curId) a.classList.add("on");
        });
    };

    const onToggle = e => {
        const btn = e.target.closest?.(".r20-bgm-pv");
        if (!btn) return;
        e.preventDefault(); e.stopPropagation();
        const li = btn.closest("li.jukeboxitem");
        if (!li) return;
        if (audio && curId === li.dataset.itemid) stop();
        else play(li.dataset.itemid);
    };
    document.addEventListener("click", e => {
        // Roll20 전체 재생을 누르면 미리듣기는 끈다
        if (audio && e.target.closest?.("li.jukeboxitem a.play")) stop();
        onToggle(e);
    }, true);
    document.addEventListener("mousedown", e => { if (e.target.closest?.(".r20-bgm-pv")) e.stopPropagation(); }, true);
    document.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") onToggle(e); }, true);

    const setEnabled = on => {
        document.body.classList.toggle("r20-bgm-off", !on);
        if (on) inject(); else stop();
    };
    setEnabled(btnVisible.bgm);

    return {
        inject, setEnabled, play, stop, status,
        current: () => audio ? curId : null,
        setVolume: (id, v) => { if (audio && curId === id) audio.volume = v; },
        onChange: fn => listeners.add(fn)
    };
})();

// ───────── 일괄 편집기: 저널(핸드아웃·캐릭터·폴더)과 주크박스(트랙·플레이리스트)를 한 창에서 편집 ─────────
// Roll20 팝업을 열지 않고 Campaign / Jukebox 모델을 직접 읽으며, 바뀐 것만 모아 [저장] 때 반영한다.
const bulkEditor = (() => {
    const SVG = (d, extra = "") => `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${d}</svg>`;
    const ICON = {
        folder:  SVG('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>', ' style="color:#b7791f"'),
        group:   SVG('<path d="M3 6h12M3 12h12M3 18h7"/><path d="M15 15v6l5-3z"/>', ' style="color:#7c3aed"'),
        handout: SVG('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>', ' style="color:#4b5563"'),
        char:    SVG('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>', ' style="color:#1867c7"'),
        track:   SVG('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>', ' style="color:#0f766e"'),
        down:    SVG('<path d="m6 9 6 6 6-6"/>'),
        right:   SVG('<path d="m9 6 6 6-6 6"/>'),
        check:   SVG('<path d="m5 12 5 5 9-10"/>', ' style="stroke-width:3.2"'),
        plus:    SVG('<path d="M12 5v14M5 12h14"/>'),
        x:       SVG('<path d="M18 6 6 18M6 6l12 12"/>'),
        pen:     SVG('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
        phones:  SVG('<path d="M3 14v-2a9 9 0 0 1 18 0v2"/><path d="M21 15a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2zM3 15a2 2 0 0 0 2 2h1v-6H5a2 2 0 0 0-2 2z"/>')
    };
    const KIND_NAME = { folder: "폴더", group: "플레이리스트", handout: "핸드아웃", char: "캐릭터", track: "트랙" };
    const CONTENT = ["notes", "gm"];
    // 편집칸 [내용, GM 노트] → Roll20 blob 이름
    const BLOBS = { handout: ["notes", "gmnotes"], char: ["bio", "gmnotes"] };
    // p · br · div · span 외의 태그가 있으면 서식 있는 내용으로 본다
    const RICH_RE = /<(?!\/?(?:p|br|div|span)\b)[a-z]/i;
    const HINT = "더블클릭: 이름 바꾸기 · 체크(Shift: 범위)로 여러 개 한꺼번에 · 끌어서 폴더 이동 · Ctrl+S: 저장";

    const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const uid = () => typeof window.generateUUID === "function" ? window.generateUUID()
        : "-r20be" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

    const el = (tag, props, ...kids) => {
        const e = document.createElement(tag);
        for (const [k, v] of Object.entries(props || {})) {
            if (v == null || v === false) continue;
            if (k === "class") e.className = v;
            else if (k === "html") e.innerHTML = v;              // 고정 아이콘 문자열 전용
            else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
            else if (k === "value" || typeof v === "boolean") e[k] = v;
            else e.setAttribute(k, v);
        }
        kids.flat().forEach(c => { if (c != null && c !== false) e.append(c); });
        return e;
    };
    const ico = name => el("span", { class: "r20be-ico", html: ICON[name] });

    // Roll20 내용(HTML) ↔ 편집칸 글자
    const htmlToText = html => {
        const doc = new DOMParser().parseFromString(String(html || ""), "text/html");
        doc.querySelectorAll("br").forEach(b => b.replaceWith("\n"));
        doc.querySelectorAll("p,div,li,h1,h2,h3,h4,h5,h6,tr,blockquote").forEach(b => b.append("\n"));
        return doc.body.textContent.replace(/ /g, " ").replace(/\n{3,}/g, "\n\n").trim();
    };
    const textToHtml = text => String(text).split("\n").map(l => `<p>${esc(l) || "<br>"}</p>`).join("");
    // 일부 내용은 escape() 형식(%3C…, %uB9D1…)으로 저장돼 있다 → 풀어서 보여주고, 저장할 때 같은 형식으로 되돌린다
    const decodeBlob = s => {
        s = String(s || "");
        if (/[<>]/.test(s) || !/%(?:[0-9A-Fa-f]{2}|u[0-9A-Fa-f]{4})/.test(s)) return { html: s, enc: false };
        try { return { html: unescape(s), enc: true }; } catch (e) { return { html: s, enc: false }; }
    };

    const getBlob = (m, name, ms = 8000) => new Promise((ok, no) => {
        const t = setTimeout(() => no(new Error("blob timeout: " + name)), ms);
        try { m._getLatestBlob(name, v => { clearTimeout(t); ok(v ?? ""); }); }
        catch (e) { clearTimeout(t); no(e); }
    });

    // ── 작업용 트리 ──
    const S = { tab: "journal", journal: null, bgm: null };
    let ui = null, dragId = null, saving = false;
    const cur = () => S[S.tab];

    const mkNode = (id, kind, model, attrs) => ({
        id, kind, model, parent: null, kids: kind === "folder" || kind === "group" ? [] : null, extra: {},
        orig: { ...attrs }, cur: { ...attrs }, changed: new Set(),
        raw: {}, origText: {}, rich: {}, htmlMode: {}, enc: {}, loaded: false, loading: false, loadError: false,
        isNew: false, deleted: false, moved: false, orphan: false, dupOf: null
    });
    const leaf = (kind, m) => mkNode(m.id, kind, m, kind === "track"
        ? { name: m.get("title") || "", vol: Number(m.get("volume")) || 0, loop: !!m.get("loop") }
        : { name: m.get("name") || "", share: m.get("inplayerjournals") || "", archived: !!m.get("archived") });

    const allNodes = t => { const out = []; const w = l => l.forEach(n => { out.push(n); if (n.kids) w(n.kids); }); w(t.roots); return out; };
    const find = (t, id) => allNodes(t).find(n => n.id === id) || null;
    const listOf = (t, p) => p ? p.kids : t.roots;
    const depthOf = n => { let d = 0; for (let p = n.parent; p; p = p.parent) d++; return d; };
    const isAncestor = (a, n) => { for (let p = n.parent; p; p = p.parent) if (p === a) return true; return false; };
    const groupList = t => {
        const out = [];
        const w = (l, path) => l.forEach(n => {
            if (!n.kids) return;
            const label = path ? `${path} / ${n.cur.name}` : n.cur.name;
            out.push({ n, label });
            w(n.kids, label);
        });
        w(t.roots, "");
        return out;
    };

    const buildTab = which => {
        const C = window.Campaign, isJ = which === "journal";
        const colls = isJ ? [["handout", C.handouts], ["char", C.characters]] : [["track", window.Jukebox.playlist]];
        const lookup = id => { for (const [kind, c] of colls) { const m = c.get(id); if (m) return [kind, m]; } return null; };
        const seen = new Set();
        const walk = (arr, parent) => {
            const out = [];
            for (const e of arr) {
                let n = null;
                if (typeof e === "string") {
                    const f = !seen.has(e) && lookup(e);
                    if (!f) continue;
                    seen.add(e);
                    n = leaf(f[0], f[1]);
                } else if (e && typeof e === "object") {
                    const { n: name, i, id, ...extra } = e;     // 모르는 키(플레이리스트 재생 방식 등)는 그대로 보존
                    n = mkNode(id || uid(), isJ ? "folder" : "group", null, { name: name || "" });
                    n.extra = extra;
                    n.kids = walk(Array.isArray(i) ? i : [], n);
                } else continue;
                n.parent = parent;
                out.push(n);
            }
            return out;
        };
        let raw = [];
        try { raw = JSON.parse(C.get(isJ ? "journalfolder" : "jukeboxfolder") || "[]"); } catch (e) {}
        const roots = walk(Array.isArray(raw) ? raw : [], null);
        // 폴더 구조에 없는 항목도 편집할 수 있게 맨 아래에 붙인다 (옮기지 않으면 구조에 넣지 않음)
        for (const [kind, c] of colls) for (const m of c.models) {
            if (seen.has(m.id)) continue;
            const n = leaf(kind, m);
            n.orphan = true;
            roots.push(n);
        }
        const t = { which, roots, sel: null, checked: new Set(), collapsed: new Set(), lastCheck: null, visible: [],
            structDirty: false, removed: 0, q: "", filter: "all", ctab: "notes", bulk: { find: "", rep: "", move: "" } };
        // 항목이 많으면 폴더를 접은 채로 시작 (렌더링 부담 줄이기)
        const nodes = allNodes(t);
        if (nodes.length > 150) nodes.forEach(n => n.kids && t.collapsed.add(n.id));
        return t;
    };

    const serialize = t => {
        const ser = list => list.flatMap(n => {
            if (n.deleted) return [];
            if (n.kids) return [{ ...n.extra, n: n.cur.name, i: ser(n.kids), id: n.id }];
            if (n.isNew || (n.orphan && !n.moved)) return [];
            return [n.id];
        });
        return ser(t.roots);
    };

    const origOf = (n, k) => CONTENT.includes(k) ? ((n.htmlMode[k] ? n.raw[k] : n.origText[k]) ?? "") : n.orig[k];
    const setField = (n, k, v) => {
        n.cur[k] = v;
        if (!n.isNew && v === origOf(n, k)) n.changed.delete(k); else n.changed.add(k);
    };
    const toHtml = (n, k) => n.htmlMode[k] ? n.cur[k] : textToHtml(n.cur[k]);
    const isDirty = n => n.isNew || n.deleted || n.moved || n.changed.size > 0;
    const builtTabs = () => [S.journal, S.bgm].filter(Boolean);
    const dirtyCount = () => builtTabs().reduce((s, t) => s + t.removed + allNodes(t).filter(isDirty).length, 0);
    const needStruct = t => t.structDirty || t.removed > 0 || allNodes(t).some(n => n.kids && (n.isNew || n.changed.has("name")));

    const moveNode = (t, n, parent, before) => {
        if (parent && (parent === n || isAncestor(n, parent) || !parent.kids)) return false;
        const from = listOf(t, n.parent);
        from.splice(from.indexOf(n), 1);
        const to = listOf(t, parent), i = before ? to.indexOf(before) : -1;
        to.splice(i < 0 ? to.length : i, 0, n);
        n.parent = parent; n.moved = true; t.structDirty = true;
        if (parent) t.collapsed.delete(parent.id);
        return true;
    };
    const removeNode = (t, n) => { const l = listOf(t, n.parent); l.splice(l.indexOf(n), 1); t.checked.delete(n.id); if (t.sel === n.id) t.sel = null; };
    // 폴더 · 플레이리스트를 지우면 안의 항목은 한 단계 위로 옮긴다
    const removeGroup = (t, g, ask = true) => {
        if (ask && !confirm(`'${g.cur.name}' ${KIND_NAME[g.kind]}를 지울까요?\n안에 든 항목 ${g.kids.length}개는 한 단계 위로 옮겨집니다. (저장해야 반영)`)) return;
        const l = listOf(t, g.parent);
        g.kids.forEach(k => { k.parent = g.parent; k.moved = true; });
        l.splice(l.indexOf(g), 1, ...g.kids);
        if (!g.isNew) t.removed++;
        t.structDirty = true;
        t.checked.delete(g.id);
        if (t.sel === g.id) t.sel = null;
    };

    // ── 목록 ──
    const meta = n => {
        if (n.kids) return `${n.kids.length}개`;
        if (n.kind === "track") return `${n.cur.vol}%${n.cur.loop ? " · 반복" : ""}`;
        const s = n.cur.share;
        return (n.cur.archived ? "보관 · " : "") + (s === "all" ? "전체" : s ? `${s.split(",").filter(Boolean).length}명` : "GM");
    };
    const visibleRows = t => {
        const q = t.q.trim().toLowerCase(), filtering = !!q || t.filter !== "all";
        const hit = n => !q || n.cur.name.toLowerCase().includes(q);
        const walk = (list, depth) => list.flatMap(n => {
            if (!n.kids) return (t.filter === "all" || n.kind === t.filter) && hit(n) ? [{ n, depth }] : [];
            const inner = walk(n.kids, depth + 1);
            const selfOk = !filtering || ((t.filter === "all" || t.filter === n.kind) && hit(n));
            if (filtering && !inner.length && !selfOk) return [];
            return [{ n, depth }, ...(filtering || !t.collapsed.has(n.id) ? inner : [])];
        });
        return walk(t.roots, 0);
    };
    const rowHtml = ({ n, depth }) => {
        const t = cur(), sel = t.sel === n.id, chk = t.checked.has(n.id), shut = t.collapsed.has(n.id);
        const cls = ["r20be-row", sel && "sel", chk && "chk", n.deleted && "del"].filter(Boolean).join(" ");
        return `<div class="${cls}" data-id="${esc(n.id)}" role="treeitem" aria-level="${depth + 1}" aria-selected="${sel}"`
            + `${n.kids ? ` aria-expanded="${!shut}"` : ""} draggable="true" style="padding-left:${4 + depth * 16}px">`
            + (n.kids ? `<button type="button" class="r20be-ib" data-act="toggle" aria-label="펼치기/접기">${shut ? ICON.right : ICON.down}</button>` : `<span class="r20be-sp"></span>`)
            + `<button type="button" class="r20be-cb${chk ? " on" : ""}" data-act="check" aria-label="선택" aria-pressed="${chk}">${ICON.check}</button>`
            + `<button type="button" class="r20be-nm" data-act="pick" title="더블클릭: 이름 바꾸기">${ICON[n.kind]}<span>${esc(n.cur.name || "(이름 없음)")}</span></button>`
            + (isDirty(n) ? `<span class="r20be-dot" title="저장 안 한 변경"></span>` : "")
            + `<span class="r20be-meta">${esc(meta(n))}</span></div>`;
    };
    const rowEl = id => ui.tree.querySelector(`.r20be-row[data-id="${CSS.escape(id)}"]`);
    const renderTree = () => {
        const t = cur(), rows = visibleRows(t);
        t.visible = rows.map(r => r.n.id);
        ui.tree.innerHTML = rows.length ? rows.map(rowHtml).join("")
            : `<p class="r20be-empty">${t.q || t.filter !== "all" ? "검색 결과가 없습니다" : "항목이 없습니다"}</p>`;
        updateBar();
    };
    const refreshRow = n => { const r = rowEl(n.id); if (r) r.outerHTML = rowHtml({ n, depth: depthOf(n) }); updateBar(); };
    const updateBar = () => {
        const c = dirtyCount();
        ui.badge.hidden = !c;
        ui.badge.textContent = `저장 안 한 변경 ${c}건`;
        ui.save.disabled = !c || saving;
        ui.revert.disabled = !c || saving;
    };
    const setStatus = (msg, kind) => { ui.foot.textContent = msg || HINT; ui.foot.className = "r20be-foot" + (kind ? " " + kind : ""); };

    const select = id => {
        cur().sel = id;
        ui.tree.querySelectorAll(".r20be-row.sel").forEach(r => { r.classList.remove("sel"); r.setAttribute("aria-selected", "false"); });
        const r = rowEl(id);
        if (r) { r.classList.add("sel"); r.setAttribute("aria-selected", "true"); }
        renderPane();
        ui.pane.scrollTop = 0;
    };

    const startRename = (row, n) => {
        const nm = row.querySelector(".r20be-nm");
        if (!nm) return;
        const inp = el("input", { class: "r20be-in r20be-inl", value: n.cur.name, "aria-label": "이름 바꾸기" });
        row.draggable = false;
        nm.replaceWith(inp);
        inp.focus(); inp.select();
        let done = false;
        const finish = ok => {
            if (done) return;
            done = true;
            if (ok && inp.value.trim()) setField(n, "name", inp.value.trim());
            renderTree(); renderPane();
        };
        inp.addEventListener("keydown", e => { if (e.key === "Enter") finish(true); else if (e.key === "Escape") finish(false); });
        inp.addEventListener("blur", () => finish(true));
    };

    // ── 오른쪽 편집칸 ──
    const field = (label, control) => el("label", { class: "r20be-fld" }, el("span", { class: "r20be-lb" }, label), control);
    const nameInput = n => el("input", { class: "r20be-in", value: n.cur.name, oninput: e => { setField(n, "name", e.target.value); refreshRow(n); } });
    const shareOptions = v => {
        const players = (window.Campaign.players?.models || []).map(p => ({ v: p.id, label: p.get("displayname") || p.id }));
        const opts = [{ v: "", label: "GM만" }, { v: "all", label: "모든 플레이어" }, ...players];
        if (v && !opts.some(o => o.v === v)) opts.push({ v, label: `선택된 플레이어 ${v.split(",").filter(Boolean).length}명 (지금 설정)` });
        return opts;
    };
    const paneHead = n => el("div", { class: "r20be-ph" },
        el("strong", {}, KIND_NAME[n.kind]),
        n.deleted ? el("span", { class: "r20be-tag del" }, "삭제 예정")
            : n.isNew ? el("span", { class: "r20be-tag new" }, n.dupOf ? "복제 예정" : "새 항목") : null,
        el("span", { class: "r20be-flex" }),
        !n.kids && !n.isNew && !n.deleted ? el("button", { type: "button", class: "r20be-sec", onclick: () => duplicate(n) }, "복제") : null,
        el("button", { type: "button", class: "r20be-sec" + (n.deleted ? "" : " danger"), onclick: () => toggleDelete(n) },
            n.deleted ? "삭제 취소" : n.kids ? `${KIND_NAME[n.kind]} 삭제` : "삭제"));

    const setMode = (n, k, on) => {
        const edited = n.changed.has(k);
        const v = on ? (edited ? textToHtml(n.cur[k]) : n.raw[k]) : (edited ? htmlToText(n.cur[k]) : n.origText[k]);
        n.htmlMode[k] = on;
        setField(n, k, v);
    };
    const loadContent = async n => {
        n.loading = true;
        try {
            const blobs = await Promise.all(BLOBS[n.kind].map(name => getBlob(n.model, name)));
            CONTENT.forEach((k, i) => {
                const d = decodeBlob(blobs[i]);
                n.raw[k] = d.html;
                n.enc[k] = d.enc;
                n.origText[k] = htmlToText(n.raw[k]);
                n.rich[k] = RICH_RE.test(n.raw[k]);
                n.htmlMode[k] = false;
                if (!n.changed.has(k)) n.cur[k] = n.origText[k];
            });
            n.loaded = true;
        } catch (e) {
            console.warn("[일괄 편집기] 내용 불러오기 실패:", n.cur.name, e);
            n.loadError = true;
        }
        n.loading = false;
        if (ui.root.classList.contains("r20be-show") && cur().sel === n.id) renderPane();
    };

    const docPane = n => {
        const t = cur(), k = t.ctab;
        const ed = el("div", { class: "r20be-ed" },
            el("div", { class: "r20be-ctabs", role: "tablist" },
                [["notes", n.kind === "char" ? "소개" : "내용"], ["gm", "GM 노트"]].map(([key, label]) =>
                    el("button", { type: "button", role: "tab", "aria-selected": String(k === key), class: "r20be-ctab" + (k === key ? " on" : ""),
                        onclick: () => { t.ctab = key; renderPane(); } }, label))));
        if (n.dupOf) ed.append(el("p", { class: "r20be-empty" }, "저장하면 원본 내용이 그대로 복사됩니다"));
        else if (n.loadError) ed.append(el("p", { class: "r20be-empty" }, "내용을 불러오지 못했습니다 ",
            el("button", { type: "button", class: "r20be-sec", onclick: () => { n.loadError = false; renderPane(); } }, "다시 시도")));
        else if (!n.loaded) { ed.append(el("p", { class: "r20be-empty" }, "불러오는 중…")); if (!n.loading) loadContent(n); }
        else {
            if (n.rich[k]) ed.append(el("div", { class: "r20be-warn" }, "서식(굵게·이미지 등)이 있는 내용입니다. 글자로 고치면 서식이 사라집니다.",
                el("label", { class: "r20be-chk" },
                    el("input", { type: "checkbox", checked: !!n.htmlMode[k], onchange: e => { setMode(n, k, e.target.checked); renderPane(); } }), "HTML로 편집")));
            ed.append(el("textarea", { class: "r20be-ta" + (n.htmlMode[k] ? " mono" : ""), value: n.cur[k] ?? "", spellcheck: "false",
                "aria-label": k === "gm" ? "GM 노트" : n.kind === "char" ? "소개" : "내용",
                oninput: e => { setField(n, k, e.target.value); autosize(e.target); refreshRow(n); } }));
        }
        return el("div", { class: "r20be-pane-in" }, paneHead(n),
            el("div", { class: "r20be-grid" },
                field(`${KIND_NAME[n.kind]} 이름`, nameInput(n)),
                field("저널에 표시", el("select", { class: "r20be-in", onchange: e => { setField(n, "share", e.target.value); refreshRow(n); } },
                    shareOptions(n.cur.share).map(o => el("option", { value: o.v, selected: o.v === n.cur.share }, o.label))))),
            ed);
    };

    // 미리듣기 칸: 재생 상태가 바뀔 때마다 _sync 로 글자만 갱신 (버튼 포커스 유지)
    const pvBlock = n => {
        const label = el("span", {}), note = el("span", { class: "r20be-note" });
        const btn = el("button", { type: "button", class: "r20be-sec", onclick: () => {
            if (bgmPreview.current() === n.id) bgmPreview.stop(); else bgmPreview.play(n.id, n.cur.vol / 100);
        } }, ico("phones"), label);
        const box = el("div", { class: "r20be-pv" }, btn, note);
        box._sync = () => {
            const on = bgmPreview.current() === n.id;
            btn.classList.toggle("on", on);
            label.textContent = on ? "미리듣기 정지" : "미리듣기 (나만)";
            note.textContent = bgmPreview.status(n.id) || "참가자에게는 들리지 않음";
        };
        box._sync();
        return box;
    };
    bgmPreview.onChange(() => ui?.pane.querySelector(".r20be-pv")?._sync?.());

    const trackPane = n => {
        const t = cur();
        const volLb = el("span", { class: "r20be-lb" }, `볼륨 ${n.cur.vol}%`);
        const here = n.parent ? n.parent.id : "";
        return el("div", { class: "r20be-pane-in" }, paneHead(n),
            field("트랙 제목", nameInput(n)),
            field("위치", el("select", { class: "r20be-in", onchange: e => { if (moveNode(t, n, e.target.value ? find(t, e.target.value) : null, null)) renderTree(); } },
                el("option", { value: "", selected: !here }, "맨 위 (플레이리스트 밖)"),
                groupList(t).map(g => el("option", { value: g.n.id, selected: g.n.id === here }, g.label)))),
            el("label", { class: "r20be-fld" }, volLb,
                el("input", { type: "range", class: "r20be-range", min: "0", max: "100", value: String(n.cur.vol),
                    oninput: e => {
                        setField(n, "vol", Number(e.target.value));
                        volLb.textContent = `볼륨 ${e.target.value}%`;
                        bgmPreview.setVolume(n.id, e.target.value / 100);      // 미리듣기 중이면 바로 반영
                        refreshRow(n);
                    } })),
            el("label", { class: "r20be-chk" },
                el("input", { type: "checkbox", checked: n.cur.loop, onchange: e => { setField(n, "loop", e.target.checked); refreshRow(n); } }), "반복 재생"),
            n.isNew ? null : pvBlock(n));
    };

    const groupPane = n => {
        const t = cur();
        return el("div", { class: "r20be-pane-in" }, paneHead(n),
            field(`${KIND_NAME[n.kind]} 이름`, nameInput(n)),
            el("p", { class: "r20be-note" }, `안에 든 항목 ${n.kids.length}개 · 지우면 안의 항목은 한 단계 위로 옮겨집니다`),
            el("div", {}, el("button", { type: "button", class: "r20be-sec", disabled: !n.kids.length,
                onclick: () => { t.checked = new Set(n.kids.map(k => k.id)); t.collapsed.delete(n.id); renderTree(); renderPane(); } },
                "안의 항목 모두 선택 → 한꺼번에 바꾸기")));
    };

    const bulkPane = list => {
        const t = cur(), st = t.bulk;
        const prev = el("div", { class: "r20be-prev" });
        const apply = el("button", { type: "button", class: "r20be-pri", onclick: () => {
            if (st.find) list.forEach(n => { const v = n.cur.name.split(st.find).join(st.rep); if (v !== n.cur.name) setField(n, "name", v); });
            if (st.move) {
                const p = st.move === "_root" ? null : find(t, st.move);
                list.forEach(n => { if (!(t.which === "bgm" && n.kids)) moveNode(t, n, p, null); });
            }
            t.bulk = { find: "", rep: "", move: "" };
            renderTree(); renderPane();
            setStatus(`${list.length}개에 적용했습니다 (저장해야 Roll20에 반영)`, "ok");
        } }, `${list.length}개에 적용`);
        const draw = () => {
            prev.textContent = "";
            prev.append(el("div", {}, el("span", {}, "지금"), el("span", {}, "바뀐 뒤 (미리보기)")));
            list.slice(0, 50).forEach(n => {
                const after = st.find ? n.cur.name.split(st.find).join(st.rep) : n.cur.name;
                prev.append(el("div", {}, el("span", {}, n.cur.name),
                    el("span", { class: after !== n.cur.name ? "chg" : "same" }, after !== n.cur.name ? after : "(변경 없음)")));
            });
            if (list.length > 50) prev.append(el("div", {}, el("span", { class: "same" }, `외 ${list.length - 50}개`), el("span", {})));
            apply.disabled = !st.find && !st.move;
        };
        const box = el("div", { class: "r20be-pane-in" },
            el("div", { class: "r20be-ph" }, el("strong", {}, `${list.length}개 선택됨`), el("span", { class: "r20be-flex" }),
                el("button", { type: "button", class: "r20be-sec", onclick: () => { t.checked.clear(); renderTree(); renderPane(); } }, "선택 해제")),
            el("div", { class: "r20be-grid" },
                field("찾을 말", el("input", { class: "r20be-in", value: st.find, oninput: e => { st.find = e.target.value; draw(); } })),
                field("바꿀 말", el("input", { class: "r20be-in", value: st.rep, oninput: e => { st.rep = e.target.value; draw(); } }))),
            field(t.which === "journal" ? "폴더로 이동" : "플레이리스트로 이동",
                el("select", { class: "r20be-in", onchange: e => { st.move = e.target.value; draw(); } },
                    el("option", { value: "", selected: !st.move }, "이동 안 함"),
                    el("option", { value: "_root", selected: st.move === "_root" }, "맨 위 (폴더 밖)"),
                    groupList(t).map(g => el("option", { value: g.n.id, selected: st.move === g.n.id }, g.label)))),
            prev,
            el("div", { class: "r20be-acts" }, apply,
                el("button", { type: "button", class: "r20be-sec danger", onclick: () => bulkDelete(list) }, "선택 항목 삭제")));
        draw();
        return box;
    };

    const renderPane = () => {
        const t = cur();
        ui.pane.textContent = "";
        const checked = allNodes(t).filter(n => t.checked.has(n.id));
        const n = t.sel && find(t, t.sel);
        ui.pane.append(checked.length >= 2 ? bulkPane(checked)
            : !n ? el("p", { class: "r20be-empty" }, "왼쪽에서 항목을 고르세요")
            : n.kids ? groupPane(n) : n.kind === "track" ? trackPane(n) : docPane(n));
        ui.pane.querySelectorAll(".r20be-ta").forEach(autosize);
    };

    // ── 만들기 · 복제 · 삭제 (모두 저장할 때 반영) ──
    const createNode = kind => {
        const t = cur(), sel = t.sel && find(t, t.sel);
        // 고른 게 폴더면 그 안, 항목이면 같은 폴더, 없으면 맨 위. 주크박스 플레이리스트는 겹치지 않음
        const parent = kind === "group" || !sel ? null : sel.kids ? sel : sel.parent;
        // 폴더는 구조에만 있으므로 바로 쓸 ID, 항목은 저장 때 Roll20 ID로 바뀌는 임시 ID
        const n = kind === "folder" || kind === "group"
            ? mkNode(uid(), kind, null, { name: `새 ${KIND_NAME[kind]}` })
            : mkNode("new:" + uid(), kind, null, { name: `새 ${KIND_NAME[kind]}`, share: "" });
        n.isNew = true; n.loaded = true; n.parent = parent;
        CONTENT.forEach(k => { n.raw[k] = ""; n.origText[k] = ""; n.cur[k] = ""; });
        // 새 플레이리스트는 기존 플레이리스트의 설정(재생 방식 등)을 따른다
        if (kind === "group") n.extra = { ...(allNodes(t).find(x => x.kids)?.extra || {}) };
        listOf(t, parent).push(n);
        if (parent) t.collapsed.delete(parent.id);
        t.structDirty = true; t.sel = n.id; t.filter = "all"; t.q = "";
        render();
        const row = rowEl(n.id);
        if (row) { row.scrollIntoView({ block: "nearest" }); startRename(row, n); }
    };
    const duplicate = n => {
        const t = cur();
        const d = mkNode("new:" + uid(), n.kind, null, { ...n.cur, name: `${n.cur.name} 사본` });
        d.isNew = true; d.dupOf = n.model; d.parent = n.parent; d.loaded = true;
        const l = listOf(t, n.parent);
        l.splice(l.indexOf(n) + 1, 0, d);
        t.structDirty = true; t.sel = d.id;
        renderTree(); renderPane();
    };
    const toggleDelete = n => {
        const t = cur();
        if (n.kids) removeGroup(t, n);
        else if (n.isNew) removeNode(t, n);
        else n.deleted = !n.deleted;
        renderTree(); renderPane();
    };
    const bulkDelete = list => {
        const t = cur(), groups = list.filter(n => n.kids);
        if (groups.length && !confirm(`폴더·플레이리스트 ${groups.length}개도 지웁니다. 안의 항목은 한 단계 위로 옮겨집니다. (저장해야 반영)`)) return;
        list.filter(n => !n.kids).forEach(n => { if (n.isNew) removeNode(t, n); else n.deleted = true; });
        groups.forEach(g => removeGroup(t, g, false));
        t.checked.clear();
        renderTree(); renderPane();
    };

    // ── 저장 ──
    const saveStruct = async t => {
        window.Campaign.save({ [t.which === "journal" ? "journalfolder" : "jukeboxfolder"]: JSON.stringify(serialize(t)) });
        t.structDirty = false; t.removed = 0;
        allNodes(t).forEach(n => {
            if (n.moved) { n.orphan = false; n.moved = false; }
            if (n.kids) { n.isNew = false; n.changed.clear(); n.orig.name = n.cur.name; }
        });
    };
    const createItem = async n => {
        if (n.kind === "track") {
            const a = n.dupOf.attributes;
            n.model = window.Jukebox.playlist.create({ title: n.cur.name, source: a.source, track_id: a.track_id, tags: a.tags || "",
                volume: n.cur.vol, loop: n.cur.loop, playing: false, softstop: false });
        } else {
            const [bn, bg] = BLOBS[n.kind], blobs = {};
            if (n.dupOf) {          // 원본 내용을 먼저 읽고 나서 만든다
                blobs[bn] = await getBlob(n.dupOf, bn);
                blobs[bg] = await getBlob(n.dupOf, bg);
            } else {
                if (n.cur.notes) blobs[bn] = toHtml(n, "notes");
                if (n.cur.gm) blobs[bg] = toHtml(n, "gm");
            }
            const base = n.dupOf ? n.dupOf.toJSON() : {};
            delete base.id;
            const coll = n.kind === "handout" ? window.Campaign.handouts : window.Campaign.characters;
            n.model = coll.create({ ...base, name: n.cur.name, inplayerjournals: n.cur.share });
            if (Object.keys(blobs).length) n.model.updateBlobs(blobs);
        }
        if (!n.model?.id) throw new Error("생성 실패");
        n.id = n.model.id; n.isNew = false; n.dupOf = null; n.changed.clear();
    };
    // 캐릭터 복제는 속성·능력치까지 복사해야 해서 Roll20 자체 복제 기능을 쓴다
    const duplicateChar = async (t, n) => {
        const src = n.dupOf, C = window.Campaign;
        const before = new Set(C.characters.models.map(m => m.id));
        const view = src.editview;
        if (view && !view.el.firstElementChild) view.render();
        await Promise.all(["bio", "gmnotes", "defaulttoken"].map(b => getBlob(src, b).catch(() => null)));
        const btn = view?.el?.querySelector(".duplicate");
        if (!btn) throw new Error("Roll20 복제 버튼을 찾지 못했습니다");
        if (window.jQuery) window.jQuery(btn).trigger("click"); else btn.click();
        let m = null;
        for (let i = 0; i < 50 && !m; i++) { await sleep(100); m = C.characters.models.find(x => !before.has(x.id)); }
        if (!m) throw new Error("복제된 캐릭터를 찾지 못했습니다");
        await sleep(300);       // Roll20이 자기 폴더 정리를 마칠 때까지
        m.save({ name: n.cur.name, inplayerjournals: n.cur.share });
        n.id = m.id; n.model = m; n.isNew = false; n.dupOf = null;
        await saveStruct(t);
    };
    const saveItem = async n => {
        const a = {}, blobs = {};
        if (n.changed.has("name")) a[n.kind === "track" ? "title" : "name"] = n.cur.name;
        if (n.changed.has("share")) a.inplayerjournals = n.cur.share;
        if (n.changed.has("vol")) a.volume = n.cur.vol;
        if (n.changed.has("loop")) a.loop = n.cur.loop;
        const html = {};
        CONTENT.forEach((k, i) => {
            if (!n.changed.has(k)) return;
            html[k] = toHtml(n, k);
            blobs[BLOBS[n.kind][i]] = n.enc[k] ? escape(html[k]) : html[k];     // 불러온 형식 그대로
        });
        if (Object.keys(blobs).length) n.model.updateBlobs(blobs);
        n.model.save(a);
        // 저장한 값을 새 기준으로
        CONTENT.forEach(k => { if (k in html) { n.raw[k] = html[k]; n.origText[k] = htmlToText(html[k]); } });
        n.orig = { ...n.orig, ...n.cur };
        n.changed.clear();
    };

    const save = async () => {
        if (saving || !dirtyCount()) return;
        const dels = builtTabs().flatMap(t => allNodes(t).filter(n => n.deleted && !n.isNew));
        if (dels.length && !confirm(`${dels.length}개 항목을 Roll20에서 삭제합니다. 되돌릴 수 없습니다.\n\n`
            + dels.slice(0, 10).map(n => "· " + n.cur.name).join("\n") + (dels.length > 10 ? "\n…" : "") + "\n\n계속할까요?")) return;
        saving = true; updateBar(); setStatus("저장 중…");
        const total = dirtyCount(), errs = [];
        const attempt = async (label, fn) => {
            try { await fn(); } catch (e) { console.warn("[일괄 편집기] 저장 실패:", label, e); errs.push(label); }
        };
        for (const t of builtTabs()) {
            const nodes = allNodes(t);
            for (const n of nodes) if (n.deleted && !n.isNew) await attempt(n.cur.name, async () => { n.model.destroy(); removeNode(t, n); });
            // 고친 내용을 먼저 저장해야 복제본이 고친 내용으로 만들어진다
            for (const n of nodes) if (!n.isNew && !n.deleted && !n.kids && n.changed.size) await attempt(n.cur.name, () => saveItem(n));
            for (const n of nodes) if (n.isNew && !n.kids && !(n.kind === "char" && n.dupOf)) {
                const old = n.id;
                await attempt(n.cur.name, () => createItem(n));
                if (t.sel === old) t.sel = n.id;
            }
            if (needStruct(t)) await attempt("폴더 구조", () => saveStruct(t));
            for (const n of nodes) if (n.isNew && n.kind === "char" && n.dupOf) {
                const old = n.id;
                await attempt(n.cur.name, () => duplicateChar(t, n));
                if (t.sel === old) t.sel = n.id;
            }
        }
        saving = false;
        // 실패한 것이 있으면 작업 내용을 남겨 다시 저장할 수 있게 한다
        if (errs.length) {
            render();
            setStatus(`${errs.length}건 저장 실패: ${errs.slice(0, 3).join(", ")}${errs.length > 3 ? " 외" : ""} (콘솔 확인 후 다시 저장)`, "err");
        } else {
            reload();
            setStatus(`변경 ${total}건을 Roll20에 저장했습니다`, "ok");
        }
    };

    // ── 창 ──
    const reload = () => {
        const keep = ["journal", "bgm"].map(k => S[k] && { k, sel: S[k].sel, collapsed: S[k].collapsed, filter: S[k].filter, q: S[k].q, ctab: S[k].ctab });
        S.journal = S.bgm = null;
        keep.forEach(o => {
            if (!o) return;
            const t = S[o.k] = buildTab(o.k);
            Object.assign(t, { collapsed: o.collapsed, filter: o.filter, q: o.q, ctab: o.ctab, sel: find(t, o.sel) ? o.sel : null });
        });
        if (!S[S.tab]) S[S.tab] = buildTab(S.tab);
        render();
    };
    const revert = () => {
        if (dirtyCount() && !confirm("저장 안 한 변경을 모두 버리고 Roll20의 지금 상태로 되돌릴까요?")) return;
        reload();
        setStatus("변경을 모두 되돌렸습니다", "ok");
    };
    const render = () => {
        const t = cur();
        ui.segJ.classList.toggle("on", S.tab === "journal");
        ui.segB.classList.toggle("on", S.tab === "bgm");
        ui.search.value = t.q;
        const defs = t.which === "journal" ? [["all", "전체"], ["handout", "핸드아웃"], ["char", "캐릭터"]]
            : [["all", "전체"], ["track", "트랙"], ["group", "플레이리스트"]];
        ui.chips.textContent = "";
        defs.forEach(([k, label]) => ui.chips.append(el("button", { type: "button", class: "r20be-chip" + (t.filter === k ? " on" : ""),
            "aria-pressed": String(t.filter === k), onclick: () => { t.filter = k; render(); } }, label)));
        renderTree(); renderPane();
    };
    const switchTab = tab => {
        if (tab === "bgm" && !window.Jukebox?.playlist) { setStatus("주크박스를 아직 불러오지 못했습니다", "err"); return; }
        S.tab = tab;
        if (!S[tab]) S[tab] = buildTab(tab);
        ui.menu.hidden = true;
        render();
    };
    const toggleMenu = () => {
        if (!ui.menu.hidden) { ui.menu.hidden = true; return; }
        const t = cur(), hasGroup = allNodes(t).some(n => n.kids);
        const items = t.which === "journal" ? [["handout", "핸드아웃"], ["char", "캐릭터"], ["folder", "폴더"]] : [["group", "플레이리스트"]];
        ui.menu.textContent = "";
        items.forEach(([kind, label]) => ui.menu.append(el("button", { type: "button", disabled: kind === "group" && !hasGroup,
            title: kind === "group" && !hasGroup ? "Roll20에서 첫 플레이리스트를 만든 뒤 쓸 수 있습니다" : null,
            onclick: () => { ui.menu.hidden = true; createNode(kind); } }, label)));
        ui.menu.style.left = ui.newBtn.offsetLeft + "px";
        ui.menu.hidden = false;
    };

    const dropTarget = e => {
        const t = cur(), d = find(t, dragId);
        if (!d) return null;
        const row = e.target.closest(".r20be-row");
        if (!row) return { parent: null, before: null, row: null };     // 빈 곳: 맨 위 단계 끝
        const n = find(t, row.dataset.id);
        if (!n || n === d) return null;
        if (n.kids && (t.which === "journal" || !d.kids) && !isAncestor(d, n)) return { parent: n, before: null, row, into: true };
        if (t.which === "bgm" && d.kids) { let top = n; while (top.parent) top = top.parent; return { parent: null, before: top, row }; }
        return { parent: n.parent, before: n, row };
    };
    const bindTree = () => {
        const tr = ui.tree;
        tr.addEventListener("click", e => {
            const b = e.target.closest("[data-act]"), row = e.target.closest(".r20be-row");
            if (!b || !row) return;
            const t = cur(), n = find(t, row.dataset.id);
            if (!n) return;
            if (b.dataset.act === "toggle") {
                if (t.collapsed.has(n.id)) t.collapsed.delete(n.id); else t.collapsed.add(n.id);
                renderTree();
            } else if (b.dataset.act === "check") {
                const a = t.visible.indexOf(t.lastCheck), z = t.visible.indexOf(n.id);
                if (e.shiftKey && a >= 0 && z >= 0) t.visible.slice(Math.min(a, z), Math.max(a, z) + 1).forEach(id => t.checked.add(id));
                else if (t.checked.has(n.id)) t.checked.delete(n.id); else t.checked.add(n.id);
                t.lastCheck = n.id;
                renderTree(); renderPane();
            } else select(n.id);
        });
        tr.addEventListener("dblclick", e => {
            const row = e.target.closest(".r20be-row");
            const n = row && e.target.closest(".r20be-nm") && find(cur(), row.dataset.id);
            if (n && !n.deleted) startRename(row, n);
        });
        // 끌어서 옮기기
        const clearDrop = () => tr.querySelectorAll(".drop-in,.drop-before").forEach(r => r.classList.remove("drop-in", "drop-before"));
        tr.addEventListener("dragstart", e => {
            const row = e.target.closest?.(".r20be-row");
            if (!row) return;
            dragId = row.dataset.id;
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", dragId);
        });
        tr.addEventListener("dragover", e => {
            if (!dragId) return;
            e.preventDefault();
            clearDrop();
            const tg = dropTarget(e);
            if (tg?.row) tg.row.classList.add(tg.into ? "drop-in" : "drop-before");
        });
        tr.addEventListener("drop", e => {
            if (!dragId) return;
            e.preventDefault();
            clearDrop();
            const t = cur(), tg = dropTarget(e), d = find(t, dragId);
            dragId = null;
            if (tg && d && moveNode(t, d, tg.parent, tg.before)) { renderTree(); renderPane(); }
        });
        tr.addEventListener("dragend", () => { dragId = null; clearDrop(); });
    };
    const bindPanel = head => {
        const p = ui.root;
        try {
            const r = JSON.parse(localStorage.getItem("r20be_rect") || "null");
            if (r) Object.assign(p.style, { left: r.left, top: r.top, width: r.width, height: r.height });
        } catch (e) {}
        if (!p.style.left) Object.assign(p.style, { left: "60px", top: "60px" });
        const keep = () => localStorage.setItem("r20be_rect", JSON.stringify({
            left: p.style.left, top: p.style.top, width: p.offsetWidth + "px", height: p.offsetHeight + "px" }));
        head.addEventListener("mousedown", e => {
            if (e.target.closest("button")) return;
            e.preventDefault();
            const r = p.getBoundingClientRect(), sx = e.clientX, sy = e.clientY;
            const mv = ev => {
                p.style.left = Math.min(Math.max(0, r.left + ev.clientX - sx), window.innerWidth - 80) + "px";
                p.style.top = Math.min(Math.max(0, r.top + ev.clientY - sy), window.innerHeight - 40) + "px";
            };
            const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); keep(); };
            window.addEventListener("mousemove", mv);
            window.addEventListener("mouseup", up);
        });
        p.addEventListener("mouseup", keep);    // 모서리로 크기를 바꾼 뒤 기억
        p.addEventListener("keydown", e => e.stopPropagation());    // Roll20 단축키(토큰 삭제 등)로 새지 않게
        // Roll20이 휠·터치패드 스크롤을 맵 확대/이동용으로 가로채므로 창 안의 스크롤은 직접 처리한다
        // (Roll20 처리기보다 먼저 받도록 window 캡처 단계에서)
        window.addEventListener("wheel", e => {
            if (!p.classList.contains("r20be-show") || !p.contains(e.target)) return;
            e.preventDefault();
            e.stopImmediatePropagation();
            const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
            for (let n = e.target; n && n !== p; n = n.parentElement) {
                if (n.scrollHeight > n.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(n).overflowY)) {
                    const before = n.scrollTop;
                    n.scrollTop += dy;
                    if (n.scrollTop !== before) return;     // 끝까지 갔으면 바깥 영역으로 넘긴다
                }
            }
        }, { capture: true, passive: false });
        // 창이 열려 있으면 Ctrl+S 는 브라우저 "페이지 저장" 대신 편집기 저장 (채팅 등 다른 입력칸에 있을 때는 제외)
        document.addEventListener("keydown", e => {
            if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "s" || !p.classList.contains("r20be-show")) return;
            if (!p.contains(e.target) && e.target !== document.body) return;
            e.preventDefault();
            save();
        }, true);
        document.addEventListener("click", e => {
            if (!ui.menu.hidden && !ui.menu.contains(e.target) && !ui.newBtn.contains(e.target)) ui.menu.hidden = true;
        });
    };
    // 내용칸은 글 길이만큼 늘리고, 스크롤은 오른쪽 칸 전체가 맡는다
    const autosize = ta => { ta.style.height = "auto"; ta.style.height = ta.scrollHeight + "px"; };
    // 마우스로 끌 수 있는 스크롤바 (Roll20이 휠을 막거나 기본 스크롤바를 숨겨도 동작)
    const scrollCol = (area, kind) => {
        const thumb = el("div", { class: "r20be-sb-th" });
        const track = el("div", { class: "r20be-sb", "aria-hidden": "true" }, thumb);
        // 넘치지 않을 때도 막대는 보이게 둔다 (손잡이가 막대를 꽉 채움)
        const sync = () => {
            const sh = area.scrollHeight, ch = area.clientHeight, tH = track.clientHeight, over = sh > ch + 1;
            const th = over ? Math.max(24, tH * ch / sh) : tH;
            thumb.style.height = th + "px";
            thumb.style.transform = `translateY(${over ? (tH - th) * area.scrollTop / (sh - ch) : 0}px)`;
        };
        let raf = 0;
        const later = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(sync); };
        area.addEventListener("scroll", sync);
        new ResizeObserver(later).observe(area);
        new MutationObserver(later).observe(area, { childList: true, subtree: true, characterData: true });
        thumb.addEventListener("mousedown", e => {
            e.preventDefault(); e.stopPropagation();
            const sy = e.clientY, st = area.scrollTop;
            const ratio = (area.scrollHeight - area.clientHeight) / Math.max(1, track.clientHeight - thumb.offsetHeight);
            thumb.classList.add("drag");
            const mv = ev => { area.scrollTop = st + (ev.clientY - sy) * ratio; };
            const up = () => { thumb.classList.remove("drag"); window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
            window.addEventListener("mousemove", mv);
            window.addEventListener("mouseup", up);
        });
        // 막대 빈 곳을 누르면 한 화면씩 이동
        track.addEventListener("mousedown", e => {
            if (e.target === thumb) return;
            e.preventDefault();
            area.scrollTop += (e.clientY < thumb.getBoundingClientRect().top ? -1 : 1) * area.clientHeight * 0.9;
        });
        return el("div", { class: "r20be-col " + kind }, area, track);
    };
    const ensureUi = () => {
        if (ui) return;
        ui = {};
        ui.segJ = el("button", { type: "button", onclick: () => switchTab("journal") }, "저널");
        ui.segB = el("button", { type: "button", onclick: () => switchTab("bgm") }, "배경음악");
        const head = el("div", { class: "r20be-head" },
            el("strong", {}, "일괄 편집기"),
            SCRIPT_VER ? el("small", { class: "r20be-ver" }, "v" + SCRIPT_VER) : null,
            el("div", { class: "r20be-seg" }, ui.segJ, ui.segB),
            el("span", { class: "r20be-flex" }),
            el("button", { type: "button", class: "r20be-ib", "aria-label": "닫기", title: "닫기 (저장 안 한 변경은 남아 있음)", html: ICON.x, onclick: close }));
        ui.search = el("input", { class: "r20be-in r20be-search", type: "search", placeholder: "이름 검색", "aria-label": "이름 검색",
            oninput: debounce(() => { cur().q = ui.search.value; renderTree(); }, 150) });
        ui.chips = el("div", { class: "r20be-chips" });
        ui.newBtn = el("button", { type: "button", class: "r20be-sec", "aria-haspopup": "true", onclick: toggleMenu }, ico("plus"), "새로 만들기");
        ui.menu = el("div", { class: "r20be-menu", hidden: true });
        ui.badge = el("span", { class: "r20be-badge", hidden: true });
        ui.revert = el("button", { type: "button", class: "r20be-sec", onclick: revert }, "되돌리기");
        ui.save = el("button", { type: "button", class: "r20be-pri", onclick: save }, "저장");
        ui.tree = el("div", { class: "r20be-tree", role: "tree", "aria-label": "항목 목록" });
        ui.pane = el("div", { class: "r20be-pane" });
        ui.foot = el("div", { class: "r20be-foot" }, HINT);
        ui.root = el("section", { id: "r20be", "aria-label": "일괄 편집기" }, head,
            el("div", { class: "r20be-tools" }, ui.search, ui.chips, el("span", { class: "r20be-flex" }), ui.newBtn, ui.badge, ui.revert, ui.save, ui.menu),
            el("div", { class: "r20be-body" }, scrollCol(ui.tree, "tree"), scrollCol(ui.pane, "pane")),
            ui.foot);
        bindTree();
        bindPanel(head);
        document.body.appendChild(ui.root);
    };

    const open = tab => {
        if (!window.Campaign?.handouts) { alert("Roll20 데이터를 아직 불러오는 중입니다. 잠시 후 다시 열어 주세요."); return; }
        ensureUi();
        if (!dirtyCount()) S.journal = S.bgm = null;     // 저장 안 한 변경이 없으면 늘 최신 상태로 연다
        ui.root.classList.add("r20be-show");
        setStatus();
        switchTab(tab || S.tab);
    };
    function close() { ui.root.classList.remove("r20be-show"); ui.menu.hidden = true; }

    // 저널 · 주크박스 탭 위쪽에 여는 버튼
    const inject = () => {
        if (!btnVisible.bulk) return;
        [["journal", "journal"], ["jukebox", "bgm"]].forEach(([id, tab]) => {
            const host = document.getElementById(id);
            if (!host) return;
            // 예전 버전 사본이 단 버튼이면 지우고 이 버전 것으로 단다
            host.querySelectorAll(".r20be-open:not([data-aio])").forEach(b => { b.remove(); warnDuplicate(); });
            if (host.querySelector(".r20be-open")) return;
            (host.querySelector(".content") || host).prepend(el("button", { type: "button", class: "r20be-open", "data-aio": "1",
                onclick: e => { e.preventDefault(); e.stopPropagation(); open(tab); } }, el("span", { html: ICON.pen }), "일괄 편집"));
        });
    };
    const setEnabled = on => {
        document.body.classList.toggle("r20be-off", !on);
        if (on) inject(); else if (ui) close();
    };
    setEnabled(btnVisible.bulk);
    window.addEventListener("beforeunload", e => { if (dirtyCount()) { e.preventDefault(); e.returnValue = ""; } });

    return { inject, setEnabled, open, openButton: () => el("button", { type: "button", class: "r20be-mini", onclick: () => open() }, "열기") };
})();

// ───────── 한 줄 보기: 주크박스 곡 · 저널 항목을 한 줄씩 ('지금 재생 중'은 Roll20 원래 상자 그대로) ─────────
// 재생·반복·볼륨·메뉴는 Roll20 요소를 그대로 쓰고 CSS 로 배치만 바꾼다 (body.r20jb-on)
const jukeboxRow = (() => {
    let bound = false;
    const trackOf = li => window.Jukebox?.playlist?.get(li.dataset.itemid);
    const volOf = li => Number(trackOf(li)?.get("volume") ?? li.querySelector(".volume input.slider")?.value ?? 0);

    // ◂ ▸ 로 10% 단위 조절: Roll20 슬라이더 값을 바꿔 원래 처리기를 태우고, 안 먹으면 모델에 직접 저장
    const step = (li, dir) => {
        const now = volOf(li);
        const v = Math.max(0, Math.min(100, dir > 0 ? Math.floor(now / 10) * 10 + 10 : Math.ceil(now / 10) * 10 - 10));
        const slider = li.querySelector(".volume input.slider");
        if (slider) {
            slider.value = v;
            slider.dispatchEvent(new Event("input", { bubbles: true }));
            slider.dispatchEvent(new Event("change", { bubbles: true }));
        }
        const m = trackOf(li);
        if (m && Number(m.get("volume")) !== v) m.save({ volume: v });
        const label = li.querySelector(".r20jb-vol span");
        if (label) label.textContent = v;
    };

    const inject = () => {
        if (!btnVisible.jbrow) return;
        // 다른 곳(일괄 편집기 등)에서 볼륨이 바뀌면 숫자도 맞춘다
        if (!bound && window.Jukebox?.playlist?.on) {
            bound = true;
            window.Jukebox.playlist.on("change:volume", m => {
                const label = document.querySelector(`#jukebox li.jukeboxitem[data-itemid="${CSS.escape(m.id)}"] .r20jb-vol span`);
                if (label) label.textContent = Math.round(Number(m.get("volume")) || 0);
            });
        }
        document.querySelectorAll("#jukebox li.jukeboxitem .volume:not(:has(> .r20jb-vol))").forEach(vol => {
            const box = document.createElement("span");
            box.className = "r20jb-vol";
            box.innerHTML = '<button type="button" data-dir="-1" aria-label="볼륨 10% 내리기">◂</button><span></span><button type="button" data-dir="1" aria-label="볼륨 10% 올리기">▸</button>';
            box.querySelector("span").textContent = Math.round(volOf(vol.closest("li.jukeboxitem")));
            vol.appendChild(box);
        });
    };
    document.addEventListener("click", e => {
        const btn = e.target.closest?.(".r20jb-vol button");
        if (!btn) return;
        e.preventDefault(); e.stopPropagation();
        step(btn.closest("li.jukeboxitem"), Number(btn.dataset.dir));
    }, true);

    const setEnabled = on => {
        document.body.classList.toggle("r20jb-on", on);
        if (on) inject();
    };
    setEnabled(btnVisible.jbrow);
    return { inject, setEnabled };
})();

let _layoutTimer = null;
const observer = new MutationObserver(() => {
    clearTimeout(_layoutTimer);
    _layoutTimer = setTimeout(() => { applyCocofoliaLayout(); bgmPreview.inject(); bulkEditor.inject(); jukeboxRow.inject(); }, 100);
});
observer.observe(document.body, { childList: true, subtree: true });
applyCocofoliaLayout();

})();
