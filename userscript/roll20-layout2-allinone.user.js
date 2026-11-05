// ==UserScript==
// @name         롤20 레이아웃2 올인원
// @version      1.50.0
// @match        https://app.roll20.net/editor*
// @match        https://app.roll20.net/campaigns/chatarchive/*
// @grant        none
// 자동완성 데이터: 설정(⚙) → 자동완성 아래 '데이터 주소' 칸에 홈페이지 데이터 주소를 붙여 넣습니다.
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
const SCRIPT_VER = "1.50.0";     // @version 과 같이 올린다

const CONFIG={
    prefix: "/desc ",
    inactiveBg: "#ffffff", inactiveText: "#adadad", inactiveBorder: "#cccccc",
    activeBg: "var(--aio-accent)", activeText: "#ffffff", activeBorder: "var(--aio-accent)",
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
    jbrow:     localStorage.getItem("r20_show_jbrow")   !== "false",
    sidepick:  localStorage.getItem("r20_show_sidepick") !== "false",
    qpick:     localStorage.getItem("r20_show_qpick")   !== "false",
    tokmenu:   localStorage.getItem("r20_show_tokmenu") !== "false",
    pageslim:  localStorage.getItem("r20_show_pageslim") !== "false",
    artroom:   localStorage.getItem("r20_show_artroom") !== "false",
    screenui:  localStorage.getItem("r20_show_screenui") !== "false",
    tokact:    localStorage.getItem("r20_show_tokact") !== "false",
    capture:   localStorage.getItem("r20_show_capture") !== "false",
    sheetshot: localStorage.getItem("r20_show_sheetshot") !== "false",
    deckview:  localStorage.getItem("r20_show_deckview") !== "false",
    macrobar:  localStorage.getItem("r20_show_macrobar") !== "false",
    mapshot:   localStorage.getItem("r20_show_mapshot") !== "false",
    emoji:     localStorage.getItem("r20_show_emoji") !== "false",
    logbak:    localStorage.getItem("r20_show_logbak") !== "false",
    tokset:    localStorage.getItem("r20_show_tokset") !== "false"
};
// GM 인지: Roll20 이 편집기에 심어 두는 is_gm. 방 데이터를 고치거나 플레이어에게 숨긴 것을 보여 줄 수 있는 기능은
// 이것이 true 일 때만 단추를 낸다. 아직 안 뜬 동안(gmKnown 거짓)은 정하지 않고 다음 inject 때 다시 본다
const gmKnown = () => typeof window.is_gm === "boolean";
const isGM = () => window.is_gm === true;
// 채팅 아카이브 페이지에서는 로그 백업만 띄운다 (나머지는 편집기 화면용 — 맨 아래 시작 부분에서 갈린다)
const IS_ARCHIVE = location.pathname.startsWith("/campaigns/chatarchive");

const sharedBtnStyle = `
    border-radius: 4px !important;
    padding: 1px 6px !important;
    min-width: 0 !important;
    font-size: 11px !important;
    font-weight: 700 !important;
    cursor: pointer !important;
    transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease !important;
    border-style: solid !important;
    border-width: 1px !important;
    height: 20px !important;
    box-sizing: border-box !important;
    line-height: 16px !important;
`;

function getCustomBtns() {
    try { return JSON.parse(localStorage.getItem("r20_custom_btns") || "[]"); } catch(e) { return []; }
}
function saveCustomBtns(btns) {
    localStorage.setItem("r20_custom_btns", JSON.stringify(btns));
}

// 커스텀 버튼 색 (이름, 값) — '' 은 기본(회색 → 파랑)
const BTN_COLORS = [["기본", ""], ["빨강", "#d64545"], ["주황", "#e07b1f"], ["노랑", "#c9a400"], ["초록", "#2e8b57"], ["청록", "#159a9c"], ["파랑", "#1867c7"], ["보라", "#7b4bc4"], ["분홍", "#b8215f"]];

function updateCustomButtonStyles() {
    const group = document.getElementById("custom-left-group");
    if (!group) return;
    const domBtns = [...group.querySelectorAll("[data-custom-btn]")];
    const count = domBtns.length;
    const small = count > 3;
    const saved = getCustomBtns();
    domBtns.forEach(b => {
        const idx = parseInt(b.dataset.customBtn);
        const isActive = activeCustomBtn && activeCustomBtn._idx === idx;
        const c = saved[idx]?.color;       // 색을 고른 단추: 평소엔 글자·테두리만 그 색, 켜면 그 색으로 채움
        applyBtnColors(b, isActive, c ? { bg: c, text: "#ffffff", border: c } : { bg: CONFIG.activeBg, text: CONFIG.activeText, border: CONFIG.activeBorder });
        if (c && !isActive) { b.style.setProperty("color", c, "important"); b.style.setProperty("border-color", c, "important"); }
        b.style.setProperty("padding", small ? "1px 4px" : "1px 6px", "important");     // 위아래 1px: 높이 20px 안에서 글자가 가운데 오게
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

const SADAM_ICON = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z"/></svg>';
function updateSadamButtonStyle(btn) {
    if (!btn) return;
    if (!btn.querySelector("svg")) {
        btn.innerHTML = SADAM_ICON;
        btn.style.setProperty("padding", "1px 4px", "important");
    }
    if (btnVisible.charsadam) {
        btn.title = "캐릭터 사담"; btn.setAttribute("aria-label", "캐릭터 사담");
        applyBtnColors(btn, isSadamMode, { bg: CONFIG.charSadamActiveBg, text: CONFIG.charSadamActiveText, border: CONFIG.charSadamActiveBorder });
    } else {
        btn.title = "오너 사담"; btn.setAttribute("aria-label", "오너 사담");
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
        display: "flex", "flex-direction": "column", padding: "4px 6px",
        "box-sizing": "border-box", overflow: "hidden", height: "auto"
    })) container.style.setProperty(prop, val, "important");

    if (!document.getElementById("custom-speaker-wrap")) {
        const wrap = document.createElement("div");
        wrap.id = "custom-speaker-wrap";
        wrap.style.cssText = "display: flex; width: 100%; height: 26px; margin-bottom: 0; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; background: #fff; position: relative; align-items: stretch;";

        const visualSelect = document.createElement("div");
        visualSelect.id = "custom-select-visual";
        visualSelect.style.cssText = "width: 28px; min-width: 28px; display: flex; justify-content: center; align-items: center; position: relative; border-radius: 3px 0 0 3px; background-color: rgba(136, 136, 136, 0.1); color: #888888;";

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

        const colorField = document.createElement("div");
        colorField.className = "cs-side-field";
        const colorLabel = document.createElement("label");
        colorLabel.textContent = "색";
        const swatchRow = document.createElement("div");
        swatchRow.className = "cs-swatches";
        swatchRow.setAttribute("role", "radiogroup");
        swatchRow.setAttribute("aria-label", "버튼 색");
        let sideColor = "";
        const paintSwatches = () => swatchRow.querySelectorAll("button").forEach(b => b.setAttribute("aria-checked", String(b.dataset.c === sideColor)));
        BTN_COLORS.forEach(([name, hex]) => {
            const b = document.createElement("button");
            b.type = "button";
            b.dataset.c = hex;
            b.title = name;
            b.setAttribute("role", "radio");
            b.setAttribute("aria-label", name);
            if (hex) b.style.background = hex;
            b.onclick = () => { sideColor = hex; paintSwatches(); };
            swatchRow.appendChild(b);
        });
        colorField.appendChild(colorLabel);
        colorField.appendChild(swatchRow);

        sidePanelBody.appendChild(nameField);
        sidePanelBody.appendChild(contentField);
        sidePanelBody.appendChild(colorField);
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
                sideColor = btn.color || "";
            } else {
                sidePanelTitle.textContent = "커스텀 버튼 추가";
                sideNameInp.value = "";
                sideContentTa.value = "";
                sideColor = "";
            }
            const spRect = settingsPopup.getBoundingClientRect();
            sidePanel.style.right = zpx(window.innerWidth - spRect.left + 6);
            sidePanel.style.bottom = zpx(window.innerHeight - spRect.bottom);
            sidePanel.style.left = "auto";
            sidePanel.style.top = "auto";
            paintSwatches();
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
                btns[sidePanelEditIdx].color = sideColor;
            } else {
                btns.push({ label: lbl, content: sideContentTa.value, visible: true, color: sideColor });
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

        // 스위치 한 줄: 이름 · 스위치 (묶인 기능은 이름에 마우스를 올리면 말풍선으로)
        const switchRow = (label, sub, on, onChange) => {
            const row = document.createElement("div");
            row.className = "cs-row";
            const text = document.createElement("span");
            text.className = "cs-text";
            const name = document.createElement("span");
            name.className = "cs-name";
            name.textContent = label;
            text.appendChild(name);
            if (sub) { text.dataset.tip = sub; text.setAttribute("aria-description", sub); }
            const sw = document.createElement("label");
            sw.className = "cs-switch";
            const inp = document.createElement("input");
            inp.type = "checkbox";
            inp.checked = on;
            inp.setAttribute("aria-label", label);
            const slider = document.createElement("div");
            slider.className = "cs-slider";
            sw.append(inp, slider);
            row.append(text, sw);
            inp.addEventListener("change", () => onChange(inp.checked));
            return row;
        };
        const sep = () => Object.assign(document.createElement("div"), { className: "cs-sep" });
        let csTip = null;
        settingsPopup.addEventListener("mouseover", e => {
            const t = e.target.closest?.(".cs-text[data-tip]");
            if (!t) return;
            if (!csTip) { csTip = document.createElement("div"); csTip.className = "cs-tip"; csTip.setAttribute("role", "tooltip"); }
            csTip.textContent = t.dataset.tip;
            document.body.appendChild(csTip);
            const r = t.getBoundingClientRect(), { width: w, height: h } = csTip.getBoundingClientRect();
            csTip.style.left = zpx(Math.max(4, Math.min(r.left, innerWidth - w - 4)));
            csTip.style.top = zpx(r.bottom + 4 + h > innerHeight ? r.top - h - 4 : r.bottom + 4);
        });
        settingsPopup.addEventListener("mouseout", e => { const t = e.target.closest?.(".cs-text[data-tip]"); if (t && !t.contains(e.relatedTarget)) csTip?.remove(); });
        // 기능 묶음: 스위치 하나로 묶음 안 기능을 다 켜고 끈다 (기능마다 켜짐 값은 따로 저장해 둔다)
        const bundleRows = b => {
            const row = switchRow(b.label, b.sub, b.members.every(([k]) => btnVisible[k]), on => {
                b.members.forEach(([k, name]) => {
                    btnVisible[k] = on;
                    localStorage.setItem("r20_show_" + k, String(on));
                    try { FEAT[name]?.setEnabled?.(on); } catch (e) { console.warn(`[올인원] ${name} 켜고 끄기 오류`, e); }
                });
                DIRTY.all = true;
            });
            return [row, ...(b.extra?.(row) || [])];
        };
        const byPlace = place => BUNDLES.filter(b => b.place === place).sort((x, y) => x.order - y.order);
        // 맨 위: 글자 크기 (올인원 창 전체) · 채팅도 같이
        const zRow = document.createElement("div");
        zRow.className = "cs-row";
        const zText = document.createElement("span");
        zText.className = "cs-text";
        zText.dataset.tip = "올인원이 띄우는 창 전체 — 일괄 편집기 · 빠른 저널 · 설정 · 이모지 · 시트 촬영 · 말풍선 …";
        zText.appendChild(Object.assign(document.createElement("span"), { className: "cs-name", textContent: "글자 크기" }));
        zRow.append(zText, aioZoom.control("cs-seg"));
        settingsPopup.append(zRow, switchRow("Roll20 채팅 글자도 같이", "채팅 기록 · 입력칸도 같은 배율로", aioZoom.chat(), on => aioZoom.chat(on)), sep());
        byPlace("main").forEach(b => settingsPopup.append(...bundleRows(b)));
        settingsPopup.appendChild(sep());
        settingsPopup.appendChild(switchRow("desc", "", btnVisible.desc, on => {
            btnVisible.desc = on;
            localStorage.setItem("r20_show_desc", String(on));
            const d = document.getElementById("custom-desc-toggle");
            if (d) d.style.display = on ? "" : "none";
        }));
        // 사담 단추: 끔 · 오너 · 캐릭터 중 하나
        const sadamRow = document.createElement("div");
        sadamRow.className = "cs-row";
        const sadamName = document.createElement("span");
        sadamName.className = "cs-name";
        sadamName.textContent = "사담";
        const seg = document.createElement("div");
        seg.className = "cs-seg";
        seg.setAttribute("role", "radiogroup");
        seg.setAttribute("aria-label", "사담 단추");
        const sadamNow = () => btnVisible.charsadam ? "char" : btnVisible.sadam ? "owner" : "off";
        const paintSeg = () => seg.querySelectorAll("button").forEach(b => b.setAttribute("aria-checked", String(b.dataset.v === sadamNow())));
        [["off", "끔"], ["owner", "오너"], ["char", "캐릭터"]].forEach(([v, label]) => {
            const b = document.createElement("button");
            b.type = "button";
            b.dataset.v = v;
            b.textContent = label;
            b.setAttribute("role", "radio");
            b.onclick = () => {
                btnVisible.sadam = v === "owner";
                btnVisible.charsadam = v === "char";
                localStorage.setItem("r20_show_sadam", String(btnVisible.sadam));
                localStorage.setItem("r20_show_charsadam", String(btnVisible.charsadam));
                if (v === "off") isSadamMode = false;
                const sBtn = document.getElementById("custom-sadam-toggle");
                if (sBtn) { sBtn.style.display = v === "off" ? "none" : ""; updateSadamButtonStyle(sBtn); }
                paintSeg();
            };
            seg.appendChild(b);
        });
        paintSeg();
        sadamRow.append(sadamName, seg);
        settingsPopup.appendChild(sadamRow);
        byPlace("chat").forEach(b => settingsPopup.append(...bundleRows(b)));
        settingsPopup.appendChild(sep());

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
            settingsPopup.style.right  = zpx(window.innerWidth  - r.right);
            settingsPopup.style.bottom = zpx(window.innerHeight - r.top + 4);
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
            margin: 0 0 3px 0 !important;
            padding: 0 !important;
        `;
    }

    const buttonRow = document.createElement("div");
    buttonRow.style.cssText = "display: flex !important; justify-content: space-between !important; align-items: center !important; margin-bottom: 2px !important; width: 100% !important;";

    const leftBtnGroup = document.createElement("div");
    leftBtnGroup.style.cssText = "display: flex !important; gap: 3px !important; align-items: center !important; position: relative !important; flex-wrap: wrap !important;";

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

    leftBtnGroup.id = "custom-left-group";
    leftBtnGroup.appendChild(sadamBtn);
    leftBtnGroup.appendChild(toggleBtn);

    buttonRow.appendChild(leftBtnGroup);
    buttonRow.appendChild(sendBtn);

    const resizer = document.createElement("div");
    resizer.id = "custom-resizer";
    resizer.style.cssText = `
        width: 100%;
        height: 4px;
        cursor: ns-resize;
        background: transparent;
        border-top: 1px solid #ddd;
        margin-bottom: 0;
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

// Roll20 은 예전 S3 그림 주소(s3.amazonaws.com/files.d20.io/…)를 files.d20.io 로 바꿔 보여 준다 → 미리보기도 같게
const r20img = u => String(u || "").replace(/^(?:https?:)?\/\/s3\.amazonaws\.com\/files\.d20\.io\//i, "https://files.d20.io/");
const copyText = async text => {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
        const ta = document.createElement("textarea");
        ta.value = text; ta.style.cssText = "position:fixed;left:-9999px";
        document.body.append(ta); ta.select();
        const ok = document.execCommand("copy"); ta.remove(); return ok;
    }
};
// 주크박스 곡 태그: Roll20 곡의 tags 칸 (방 데이터라 방을 복사하면 같이 가고, 주크박스는 GM 만 본다)
const tagList = s => String(s || "").split(/[\s,]+/).map(t => t.replace(/^#/, "")).filter(Boolean);
// ── 그림 미리보기 공통 (일괄 편집기 · 이 방의 이미지) ──
// files.d20.io 그림은 …/thumb|med|max|original.확장자 로 크기만 다르다
const VARIANT = /\/(?:thumb|med|max|original)\.([a-z0-9]+)(\?[^#]*)?$/i;
const sizedUrl = (u, s) => VARIANT.test(u) ? u.replace(VARIANT, (m, ext, qs) => `/${s}.${ext}${qs || ""}`) : u;
const escAttr = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
// 움직이는 그림 중 webm·mp4 는 <img> 로 그릴 수 없어 <video> 로 (Roll20 도 움직이는 그림은 med.webm 을 쓴다)
const isAnimVideo = u => /\.(?:webm|mp4)(?:[?#]|$)/i.test(String(u || ""));
// 미리보기 주소 후보: 앞에서부터 열어 보고 안 열리면 다음 것 (움직이는 png·gif 는 thumb 가 없는 경우가 있다)
const previewAlts = (u, sizes = ["thumb", "med", "max"]) =>
    [...new Set(sizes.flatMap(s => { const v = sizedUrl(u, s); return [r20img(v), v]; }).concat(r20img(u), u))].filter(Boolean);
const previewHtml = (u, cls = "") => {
    const vid = isAnimVideo(u), list = previewAlts(u, vid ? ["med", "max"] : undefined).map(x => vid ? x + "#t=0.1" : x);      // #t: 첫 장면을 보여 준다
    const a = `src="${escAttr(list[0])}" data-alts="${escAttr(list.slice(1).join("\n"))}"`;
    return vid ? `<video class="r20-anim ${cls}" ${a} muted loop playsinline preload="metadata"></video>`
        : `<img class="${cls}" ${a} alt="" loading="lazy" draggable="false">`;
};
// 안 열린 미리보기: 다음 후보로 바꾼다 (더 없으면 false)
const nextPreview = m => {
    const alts = (m.dataset.alts || "").split("\n").filter(Boolean);
    if (!alts.length) return false;
    m.dataset.alts = alts.slice(1).join("\n");
    m.src = alts[0];
    return true;
};
// 움직이는 그림 미리보기는 마우스를 올린 동안만 재생 (여러 개가 한꺼번에 돌아 무거워지지 않게)
document.addEventListener("mouseover", e => { if (e.target.matches?.("video.r20-anim")) e.target.play().catch(() => {}); });
document.addEventListener("mouseout", e => { if (e.target.matches?.("video.r20-anim")) e.target.pause(); });

// ── 기능 묶음 등록 ──
// 묶음(구역)마다 자기 CSS · 모듈 · 설정 줄을 스스로 등록한다. 묶음끼리는 FEAT.이름?.함수() 로만 부르므로
// 구역 하나를 통째로 지워도 나머지는 그대로 돈다. 화면이 바뀌면 FEAT 의 inject 를 하나씩 따로(try) 돌린다
const FEAT = {};            // 이름 → 모듈 { inject, setEnabled, … }
const BUNDLES = [];         // 설정 창 줄 { place: "main"|"chat", order, label, sub, members: [[btnVisible 키, 모듈 이름]], extra(row) }
const CSS_PARTS = [];
const addFeature = (name, mod) => (FEAT[name] = mod);
const addBundle = def => BUNDLES.push(def);
const addCss = css => CSS_PARTS.push(css);
// 기능이 watch(선택자)를 주면 그 요소가 새로 생기거나 그 안이 바뀐 때만 inject 를 부른다 (매번 문서 전체를 훑지 않게).
// instant 도 주면 그 요소가 새로 생긴 순간 바로 부른다(기다리지 않고). 문서 전체 감시자는 시작 쪽 하나만 둔다
// all: 다음 번엔 전부 (처음 · 설정을 바꾼 뒤)
const DIRTY = { all: true, set: new Set() };

// ── 글자 크기: 올인원이 띄우는 창을 CSS zoom 으로 한꺼번에 키운다 (설정 ⚙ 맨 위 · 일괄 편집기 머리줄) ──
// 확대된 창은 left · top 같은 길이도 같이 커지므로, 화면 좌표(getBoundingClientRect · clientX)를 넣을 땐 zpx() 로 넣는다.
// vw · vh 는 확대되지 않으므로 이 창들의 CSS 에선 var(--aio-z) 로 나눠 쓴다. (Roll20 창 안에 붙는 것 · 맵 위 단추줄은 제외)
const AIO_ZOOMED = "#custom-settings-popup, #cs-side-panel, .cs-tip, #custom-journal-popup, .r20jb-tip, .r20jbb-toast, #r20ss, #r20ss-bar, #r20-logbak, #r20-ccf, #r20-fit, .r20so, .r20tm-tip, .r20ta-pop, #r20be, #r20-ac-box, #r20-emoji";
const aioZoom = (() => {
    const KEY = "r20_aio_zoom", CHAT = "r20_aio_zoom_chat", MIN = 0.8, MAX = 2;
    let z = Math.min(MAX, Math.max(MIN, parseFloat(localStorage.getItem(KEY)) || 1));
    const ctrls = new Set();
    const paint = () => ctrls.forEach(c => {
        c.querySelector(".aio-zv").textContent = Math.round(z * 100) + "%";
        c.querySelector("[data-d='-1']").disabled = z <= MIN;
        c.querySelector("[data-d='1']").disabled = z >= MAX;
    });
    const apply = () => document.documentElement.style.setProperty("--aio-z", z);
    const chat = on => {
        if (on !== undefined) localStorage.setItem(CHAT, String(on));
        const v = localStorage.getItem(CHAT) === "true";
        document.documentElement.classList.toggle("r20-zchat", v);
        return v;
    };
    // 왼쪽 위로 놓인 창이 화면 밖으로 나가면 안으로 들인다 (다른 배율에서 기억한 자리로 열 때)
    const fit = e => {
        const r = e.getBoundingClientRect();
        if (e.style.left.endsWith("px")) { const x = Math.max(0, Math.min(r.left, innerWidth - r.width)); if (x !== r.left) e.style.left = x / z + "px"; }
        if (e.style.top.endsWith("px")) { const y = Math.max(0, Math.min(r.top, innerHeight - r.height)); if (y !== r.top) e.style.top = y / z + "px"; }
    };
    const set = v => {
        v = Math.min(MAX, Math.max(MIN, Math.round(v * 20) / 20));
        if (v === z) return;
        const k = z / v;
        z = v; localStorage.setItem(KEY, String(z)); apply(); paint();
        // 떠 있는 창은 화면에서의 자리를 그대로 (JS 로 넣은 px 값을 새 배율로 바꿔 둔다)
        document.querySelectorAll(AIO_ZOOMED).forEach(e => {
            ["left", "top", "right", "bottom", "max-height"].forEach(p => {
                const s = e.style.getPropertyValue(p);
                if (s.endsWith("px")) e.style.setProperty(p, parseFloat(s) * k + "px", e.style.getPropertyPriority(p));
            });
            if (e.isConnected && e.getClientRects().length) fit(e);
        });
    };
    // − · 지금 배율(누르면 100%) · + 단추 묶음. 어디에 몇 개를 두어도 같이 바뀐다
    const control = cls => {
        const c = document.createElement("span");
        c.className = "aio-zm " + cls;
        c.setAttribute("role", "group");
        c.setAttribute("aria-label", "글자 크기");
        c.innerHTML = '<button type="button" data-d="-1" aria-label="글자 작게" title="작게">−</button><button type="button" class="aio-zv" data-d="0" title="눌러서 100%로"></button><button type="button" data-d="1" aria-label="글자 크게" title="크게">+</button>';
        c.addEventListener("click", e => { const d = e.target.closest("button")?.dataset.d; if (d !== undefined) set(d === "0" ? 1 : z + d * 0.1); });
        ctrls.add(c); paint();
        return c;
    };
    apply(); chat();
    return { get: () => z, set, fit, chat, control };
})();
const zpx = v => v / aioZoom.get() + "px";

const CORE_CSS = `
        /* 색 · 모서리 이름표 — 강조색은 Roll20 핫핑크(Roll20 자체 팔레트 값). 바꿀 땐 여기만 */
        :root { --aio-accent:#e10085; --aio-accent-dark:#b4006a; --aio-accent-bg:#fce6f3; --aio-accent-soft:#f9cce7; --aio-accent-mid:#f399ce; --aio-ink:#222; --aio-ink-2:#333; --aio-ink-3:#555; --aio-ink-4:#767676; --aio-ink-5:#999; --aio-line:#ccc; --aio-line-2:#ddd; --aio-line-3:#e6e6e6; --aio-line-4:#f0f0f0; --aio-bg:#fff; --aio-bg-2:#fafafa; --aio-bg-3:#f4f4f6; --aio-bg-4:#ebebeb; --aio-bg-5:#ccc; --aio-r-sm:4px; --aio-r:6px; --aio-r-lg:8px; }
        /* 글자 크기 (aioZoom): 올인원 창 · (켜면) 채팅 기록과 입력칸 */
        :is(${AIO_ZOOMED}) { zoom:var(--aio-z, 1); }
        html.r20-zchat #textchat .content { zoom:var(--aio-z, 1); }
        html.r20-zchat #textchat-input textarea { font-size:calc(13px * var(--aio-z, 1)) !important; line-height:1.4 !important; }
        .aio-zm .aio-zv { min-width:44px; font-variant-numeric:tabular-nums; }
        .aio-zm button:disabled { opacity:0.4; cursor:default; }
        /* 올인원이 만든 창 안의 체크 상자 · 라디오 · 슬라이더도 강조색 (Roll20 것은 그대로) */
        :is(#custom-settings-popup, #cs-side-panel, #custom-journal-popup, #r20be, #r20ss, #r20ss-bar, #r20-ccf, #r20-fit, #r20-emoji, #imagedialog .r20ri, .r20ts, .r20so-dlg) :is(input[type="checkbox"], input[type="radio"], input[type="range"]) { accent-color:var(--aio-accent); }
        #custom-settings-popup { position:fixed; width:300px; background:var(--aio-bg); border:1px solid var(--aio-line); border-radius:var(--aio-r-sm); box-shadow:0 4px 10px rgba(0,0,0,0.15); z-index:10003; display:none; flex-direction:column; font-family:sans-serif; font-size:12px; color:var(--aio-ink-2); overflow-y:auto; max-height:calc(70vh / var(--aio-z, 1)); }
        #custom-settings-popup.show { display:flex !important; }
        /* 대화 입력 칸: 여백을 줄여 기록 판을 넓게 */
        #textchat-input.layout-applied-v11 { border-top:0 !important; }
        #textchat-input.layout-applied-v11 button:focus-visible { outline:2px solid var(--aio-accent) !important; outline-offset:1px; }
        #textchat-input.layout-applied-v11 #chatSendBtn { height:auto !important; min-height:0 !important; margin:0 !important; padding:1px 10px !important; font-size:12px !important; line-height:1.5 !important; }
        .cs-header { padding:5px 8px; background:var(--aio-bg-3); border-bottom:1px solid var(--aio-line-2); font-size:11px; font-weight:bold; color:var(--aio-ink-3); flex-shrink:0; }
        .cs-row { display:flex; align-items:center; justify-content:space-between; padding:6px 10px; border-bottom:1px solid var(--aio-line-4); }
        .cs-row.cs-rd { padding:0 10px 6px; }
        .cs-rd .cs-rd-file { flex-shrink:0; height:22px; margin:0 0 0 4px; padding:0 8px; border:1px solid var(--aio-line); border-radius:var(--aio-r-sm); background:var(--aio-bg); color:var(--aio-ink-2); font-size:11px; cursor:pointer; }
        .cs-rd input { flex:1; min-width:0; height:22px !important; margin:0 !important; padding:0 6px !important; border:1px solid var(--aio-line); border-radius:var(--aio-r-sm); font-size:11px !important; box-sizing:border-box; }
        .cs-switch { position:relative; width:32px; height:18px; display:inline-block; cursor:pointer; }
        .cs-switch input { opacity:0; width:0; height:0; }
        .cs-slider { position:absolute; inset:0; background:var(--aio-bg-5); border-radius:18px; transition:0.2s; }
        .cs-slider:before { content:""; position:absolute; width:12px; height:12px; left:3px; top:3px; background:white; border-radius:50%; transition:0.2s; }
        .cs-switch input:checked + .cs-slider { background:var(--aio-accent); }
        .cs-switch input:checked + .cs-slider:before { transform:translateX(14px); }
        .cs-custom-row { display:flex; align-items:center; padding:5px 8px; border-bottom:1px solid var(--aio-line-4); gap:4px; }
        .cs-custom-row > span { overflow:hidden; text-overflow:clip; white-space:nowrap; flex:1; font-size:11px; }
        .cs-custom-icon-btn { background:none; border:none; cursor:pointer; color:var(--aio-ink-5); font-size:11px; padding:2px 3px; flex-shrink:0; line-height:1; }
        .cs-custom-icon-btn:hover { color:var(--aio-ink-3); }
        .cs-custom-del:hover { color:#e55 !important; }
        .cs-custom-add-btn { display:flex; align-items:center; justify-content:center; gap:4px; margin:6px 8px 8px; padding:5px 8px; background:var(--aio-bg-3); border:1px solid var(--aio-line-2); border-radius:var(--aio-r-sm); cursor:pointer; font-size:11px; color:var(--aio-ink-3); font-weight:normal; }
        .cs-custom-add-btn:hover { background:var(--aio-bg-4); color:var(--aio-ink-2); }
        #cs-side-panel { position:fixed; width:300px; background:var(--aio-bg); border:1px solid var(--aio-line); border-radius:var(--aio-r-sm); box-shadow:0 4px 16px rgba(0,0,0,0.2); z-index:10004; display:none; flex-direction:column; font-family:sans-serif; font-size:12px; color:var(--aio-ink-2); }
        #cs-side-panel.show { display:flex !important; }
        .cs-side-header { display:flex; align-items:center; justify-content:space-between; padding:7px 10px; background:var(--aio-bg-3); border-bottom:1px solid var(--aio-line-2); font-size:11px; font-weight:bold; color:var(--aio-ink-3); flex-shrink:0; }
        .cs-side-close { background:none; border:none; cursor:pointer; color:var(--aio-ink-5); font-size:13px; padding:0 2px; line-height:1; }
        .cs-side-close:hover { color:var(--aio-ink-2); }
        .cs-side-body { padding:12px; display:flex; flex-direction:column; gap:10px; }
        .cs-side-field { display:flex; flex-direction:column; gap:4px; }
        .cs-side-field label { font-size:10px; color:var(--aio-ink-4); font-weight:bold; text-transform:uppercase; letter-spacing:0.5px; }
        .cs-side-name { border:1px solid var(--aio-line); border-radius:var(--aio-r-sm); padding:6px 8px; font-size:12px; outline:none; width:100%; box-sizing:border-box; }
        .cs-side-name:focus { border-color:var(--aio-accent); }
        .cs-side-textarea { border:1px solid var(--aio-line); border-radius:var(--aio-r-sm); padding:6px 8px; font-size:11px; outline:none; width:100%; box-sizing:border-box; resize:vertical; min-height:120px; font-family:monospace; line-height:1.5; }
        .cs-side-textarea:focus { border-color:var(--aio-accent); }
        .cs-swatches { display:flex; flex-wrap:wrap; gap:6px; }
        .cs-swatches button { width:20px; height:20px; padding:0; border:2px solid #fff; border-radius:50%; box-shadow:0 0 0 1px var(--aio-line); background:repeating-linear-gradient(45deg,var(--aio-bg) 0 3px,var(--aio-bg-4) 3px 6px); cursor:pointer; }
        .cs-swatches button[aria-checked="true"] { box-shadow:0 0 0 2px #333; }
        .cs-swatches button:focus-visible { outline:2px solid var(--aio-accent); outline-offset:2px; }
        .cs-side-footer { display:flex; gap:6px; padding:0 12px 12px; }
        .cs-side-save { flex:1; background:var(--aio-accent); color:white; border:none; border-radius:var(--aio-r-sm); padding:7px; cursor:pointer; font-size:12px; font-weight:bold; }
        .cs-side-save:hover { background:var(--aio-accent-dark); }
        .cs-side-cancel { flex:1; background:var(--aio-bg-3); color:var(--aio-ink-3); border:none; border-radius:var(--aio-r-sm); padding:7px; cursor:pointer; font-size:12px; }
        .cs-side-cancel:hover { background:var(--aio-bg-4); }
        #custom-sadam-toggle { display:inline-flex; align-items:center; justify-content:center; }
        .cs-text { flex:1; min-width:0; display:flex; flex-direction:column; gap:1px; padding-right:8px; }
        .cs-name { font-size:12px; color:var(--aio-ink-2); }
        .cs-tip { position:fixed; z-index:100005; max-width:240px; padding:4px 8px; border-radius:var(--aio-r-sm); background:rgba(20,20,22,0.94); color:#fff; font-size:11px; line-height:1.45; pointer-events:none; word-break:keep-all; box-shadow:0 2px 6px rgba(0,0,0,0.3); }
        .cs-sep { flex-shrink:0; height:0; margin:3px 0; border-top:1px solid var(--aio-line-2); }
        .cs-seg { display:flex; flex-shrink:0; border:1px solid var(--aio-line); border-radius:var(--aio-r-sm); overflow:hidden; }
        .cs-seg button { height:20px; margin:0; padding:0 7px; border:0; border-left:1px solid var(--aio-line); background:var(--aio-bg); color:var(--aio-ink-4); font-size:11px; cursor:pointer; }
        .cs-seg button:first-child { border-left:0; }
        .cs-seg button[aria-checked="true"] { background:var(--aio-accent); color:#fff; }
        .cs-seg button:focus-visible { outline:2px solid var(--aio-accent); outline-offset:-2px; }
`;

// ══════════ 묶음 1 · 주크박스 · 저널 목록 간소화 ══════════

// ───────── 주크박스 감시 (미리듣기 · 한 줄 보기가 같이 씀) ─────────
// #jukebox 하나만 지켜보다가 새로 그려진 곡 줄만 골라 넘긴다 (전체를 다시 훑지 않게).
// 받는 쪽: fn(곡 줄 목록, 재생목록 구조가 바뀌었을 수 있음)
const jbWatch = (() => {
    const subs = new Set();
    const OWN = ".r20jb-vol, .r20jb-loop, .r20-bgm-pv, .r20jb-step";       // 우리가 붙인 것은 무시
    let watched = null;
    const all = () => [...document.querySelectorAll("#jukebox li.jukeboxitem")];
    const run = (lis, folders) => subs.forEach(fn => { try { fn(lis, folders); } catch (e) { console.warn("[올인원] 주크박스 처리 오류", e); } });
    const ensure = () => {
        const jb = document.getElementById("jukebox");
        if (!jb || jb === watched) return;
        watched = jb;
        // 화면에 그려지기 전에 바로 붙인다 (슬라이더·버튼 깜빡임 방지)
        new MutationObserver(recs => {
            const lis = new Set();
            let folders = false;
            for (const r of recs) for (const n of r.addedNodes) {
                if (n.nodeType !== 1 || n.matches(OWN)) continue;
                const li = r.target.closest?.("li.jukeboxitem");
                if (li) { lis.add(li); continue; }
                if (n.matches("li.jukeboxitem")) lis.add(n);
                n.querySelectorAll("li.jukeboxitem").forEach(x => lis.add(x));
                if (n.matches("li.dd-item, ol, #jukeboxfolderroot") || n.querySelector("li.dd-folder")) folders = true;
            }
            if (lis.size || folders) run([...lis], folders);
        }).observe(jb, { childList: true, subtree: true });
        run(all(), true);
    };
    return { on: fn => subs.add(fn), ensure, all };
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

    const decorate = li => {
        li.querySelectorAll(".playbackcontrol").forEach(pc => {
            if (pc.querySelector(":scope > .r20-bgm-pv")) return;
            const a = document.createElement("a");
            a.className = "r20-bgm-pv";
            a.textContent = "🎧";
            a.title = "미리듣기 (나만 듣기)";
            a.setAttribute("role", "button");
            a.tabIndex = 0;
            pc.insertBefore(a, pc.querySelector("a.play"));
            if (audio && li.dataset.itemid === curId) a.classList.add("on");
        });
    };
    jbWatch.on(lis => { if (btnVisible.bgm) lis.forEach(decorate); });
    const inject = () => { if (btnVisible.bgm) jbWatch.ensure(); };

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
        if (on) { inject(); jbWatch.all().forEach(decorate); } else stop();
    };
    setEnabled(btnVisible.bgm);

    return {
        inject, setEnabled, play, stop, status,
        current: () => audio ? curId : null,
        setVolume: (id, v) => { if (audio && curId === id) audio.volume = v; },
        onChange: fn => listeners.add(fn)
    };
})();

// ───────── 한 줄 보기: 주크박스 곡 · 저널 항목을 한 줄씩 ('지금 재생 중'은 Roll20 원래 상자 그대로) ─────────
// 재생·반복·볼륨·메뉴는 Roll20 요소를 그대로 쓰고 CSS 로 배치만 바꾼다 (body.r20jb-on)
const jukeboxRow = (() => {
    let bound = false;
    const trackOf = li => window.Jukebox?.playlist?.get(li.dataset.itemid);
    const volOf = li => Number(trackOf(li)?.get("volume") ?? li.querySelector(".volume input.slider")?.value ?? 0);

    // ◂ ▸ 조절 단위(%)는 주크박스 위 칸에서 그때그때 바꾼다 (수동 페이드용)
    let STEP = Math.max(1, Math.min(50, parseInt(localStorage.getItem("r20jb_step"), 10) || 5));
    // Roll20 슬라이더 값을 바꿔 원래 처리기를 태우고, 안 먹으면 모델에 직접 저장
    const step = (li, dir) => {
        const now = volOf(li);
        const v = Math.max(0, Math.min(100, dir > 0 ? Math.floor(now / STEP) * STEP + STEP : Math.ceil(now / STEP) * STEP - STEP));
        const slider = li.querySelector(".volume input.slider");
        if (slider) {
            slider.value = v;
            slider.dispatchEvent(new Event("input", { bubbles: true }));
            slider.dispatchEvent(new Event("change", { bubbles: true }));
        }
        const m = trackOf(li);
        if (m && isGM() && Number(m.get("volume")) !== v) m.save({ volume: v });
        const label = li.querySelector(".r20jb-vol span");
        if (label) label.textContent = v;
    };

    // 곡 줄 하나에 ◂ ▸ 볼륨 · ↻ 반복 · 태그 말풍선을 붙인다 (이미 있으면 건너뜀)
    const decorate = li => {
        li.querySelectorAll(".volume").forEach(vol => {
            if (vol.querySelector(":scope > .r20jb-vol")) return;
            const box = document.createElement("span");
            box.className = "r20jb-vol";
            box.innerHTML = '<button type="button" data-dir="-1" aria-label="볼륨 내리기">◂</button><span></span><button type="button" data-dir="1" aria-label="볼륨 올리기">▸</button>';
            box.querySelector("span").textContent = Math.round(volOf(li));
            vol.appendChild(box);
        });
        const c = li.querySelector(":scope > .dd-content");
        if (c && !c.querySelector(":scope > .r20jb-loop")) {
            const b = document.createElement("button");
            b.type = "button"; b.className = "r20jb-loop"; b.textContent = "↻";
            b.setAttribute("aria-label", "반복 재생");
            setLoop(b, !!trackOf(li)?.get("loop"));
            c.appendChild(b);
        }
        tagOne(li);
        li.querySelectorAll(":scope > .dd-content > .title:not([tabindex])").forEach(ti => { ti.tabIndex = 0; ti.setAttribute("role", "button"); });
    };
    // 반복 재생: Roll20 곡 모델의 loop 값을 직접 켜고 끈다 (Roll20 쪽 체크박스 모양에 기대지 않게)
    const setLoop = (b, on) => {
        b.classList.toggle("on", on);
        b.setAttribute("aria-pressed", String(on));
        b.title = on ? "반복 재생 중 · 누르면 끄기" : "반복 안 함 · 누르면 켜기";
    };
    // 태그: 제목 줄 자리는 차지하지 않고, 제목에 마우스를 올리면 바로 검은 말풍선으로 (띄어쓰기·쉼표로 나눔)
    const tagText = m => tagList(m?.get("tags")).map(x => "#" + x).join(" ");
    const tagOne = li => li.querySelectorAll(":scope > .dd-content > .title").forEach(ti => {
        const txt = tagText(trackOf(li));
        if (txt) { if (ti.dataset.r20jbTags !== txt) ti.dataset.r20jbTags = txt; }
        else if (ti.dataset.r20jbTags) delete ti.dataset.r20jbTags;
    });
    let tip = null;
    const TAGGED = "#jukebox .title[data-r20jb-tags]";
    document.addEventListener("mouseover", e => {
        const ti = btnVisible.jbrow && e.target.closest?.(TAGGED);
        if (!ti) return;
        if (!tip) { tip = document.createElement("div"); tip.className = "r20jb-tip"; tip.setAttribute("role", "tooltip"); }
        tip.textContent = ti.dataset.r20jbTags;
        document.body.appendChild(tip);
        const r = ti.getBoundingClientRect(), { width: w, height: h } = tip.getBoundingClientRect();
        tip.style.left = zpx(Math.max(4, Math.min(r.left, innerWidth - w - 4)));
        tip.style.top = zpx(r.bottom + 4 + h > innerHeight ? r.top - h - 4 : r.bottom + 4);
    });
    document.addEventListener("mouseout", e => { const ti = e.target.closest?.(TAGGED); if (ti && !ti.contains(e.relatedTarget)) tip?.remove(); });
    document.addEventListener("wheel", () => tip?.remove(), { capture: true, passive: true });
    // 트랙이 없는 재생목록은 구분선으로 쓴다 → 표시만 붙이고 모양은 CSS.
    // 화면이 아니라 Roll20 폴더 구조로 판단해서, 접혀 있는 목록도 틀리지 않는다
    // 폴더 구조(JSON) → 안이 빈 폴더 id (주크박스 · 저널이 같이 쓴다)
    const emptyFolders = raw => {
        const ids = new Set();
        let list = [];
        try { list = JSON.parse(raw); } catch (e) {}
        const walk = l => (Array.isArray(l) ? l : []).forEach(x => { if (x && typeof x === "object") { if (!(x.i || []).length) ids.add(x.id); walk(x.i); } });
        walk(list);
        return ids;
    };
    let sepRaw = null, sepIds = new Set();
    const markSeps = () => {
        const raw = window.Campaign?.get?.("jukeboxfolder") || "[]";
        if (raw !== sepRaw) { sepRaw = raw; sepIds = emptyFolders(raw); }
        let changed = false;
        document.querySelectorAll("#jukeboxfolderroot li.dd-folder[data-globalfolderid]").forEach(f => {
            const on = sepIds.has(f.dataset.globalfolderid);
            if (f.classList.contains("r20jb-sep") !== on) { f.classList.toggle("r20jb-sep", on); changed = true; }
        });
        watchRoot();
        if (changed) { measured = false; if (rootShown) measureSoon(); }
    };
    // 안의 곡을 재생목록 제목 글자 자리까지 들여 쓰도록 실제 위치를 한 번 잰다 (Roll20 여백이 바뀌어도 맞게).
    // 위치 읽기는 화면 계산을 강제하므로, 목록이 보일 때(ResizeObserver) 한 번만 재서 #jukeboxfolderroot 에 넣는다
    let measured = false, rootShown = false, roRoot = null, mPending = false;
    const measure = () => {
        mPending = false;
        const root = document.getElementById("jukeboxfolderroot");
        if (measured || !btnVisible.jbrow || !root) return;
        const t = root.querySelector("li.dd-folder:not(.r20jb-sep) > .dd-content .folder-title");
        const r = t?.getBoundingClientRect();
        if (!r?.width) return;
        const ind = Math.round(r.left - t.closest("li.dd-folder").getBoundingClientRect().left) + "px";
        if (root.style.getPropertyValue("--r20jb-ind") !== ind) root.style.setProperty("--r20jb-ind", ind);
        measured = true;
    };
    const measureSoon = () => { if (!mPending) { mPending = true; requestAnimationFrame(measure); } };
    const ro = new ResizeObserver(es => {
        rootShown = es[es.length - 1].contentRect.width > 0;
        if (rootShown && !measured) measure();
    });
    const watchRoot = () => {
        const root = document.getElementById("jukeboxfolderroot");
        if (!root || root === roRoot) return;
        if (roRoot) ro.unobserve(roRoot);
        roRoot = root; measured = false; rootShown = false;
        ro.observe(root);
    };
    // 저널도 빈 폴더는 구분선으로 (폴더 몇십 개의 class 만 보므로 가볍다)
    let jSepRaw = null, jSepIds = new Set();
    const markJournalSeps = () => {
        const raw = window.Campaign?.get?.("journalfolder") || "[]";
        if (raw !== jSepRaw) { jSepRaw = raw; jSepIds = emptyFolders(raw); }
        document.querySelectorAll("#journalfolderroot li.dd-folder[data-globalfolderid]").forEach(f => {
            const on = jSepIds.has(f.dataset.globalfolderid);
            if (f.classList.contains("r20jn-sep") !== on) f.classList.toggle("r20jn-sep", on);
        });
    };
    // 폴더 일괄 닫기: 열린 폴더의 '접기' 단추를 안쪽(깊은 것)부터 대신 누른다 — 바깥을 다시 열어도 안쪽은 닫혀 있게
    const foldAll = sel => {
        const root = document.querySelector(sel);
        if (!root) return;
        [...root.querySelectorAll("li.dd-folder > button[data-action='collapse']")].filter(b => getComputedStyle(b).display !== "none").reverse().forEach(b => b.click());
    };
    const foldBtn = sel => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "btn r20-fold"; b.textContent = "▲"; b.title = "폴더 닫기 — 열린 폴더를 모두 닫아요";   // 좁은 기본 폭에서도 한 줄에 들도록 글 없이
        b.setAttribute("aria-label", "폴더 닫기");
        b.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); foldAll(sel); });
        return b;
    };
    const addStepControl = () => {
        const host = document.querySelector("#jukebox .secondarycontrols");
        if (host && !host.querySelector(".r20-fold")) host.appendChild(foldBtn("#jukeboxfolderroot"));
        if (!host || host.querySelector(".r20jb-step")) return;
        const wrap = document.createElement("label");
        wrap.className = "r20jb-step";
        wrap.title = "◂ ▸ 를 누를 때 바뀌는 볼륨 크기";
        wrap.append("볼륨 ±");
        const inp = document.createElement("input");
        inp.type = "number"; inp.min = "1"; inp.max = "50"; inp.value = STEP;
        inp.setAttribute("aria-label", "볼륨 조절 단위(%)");
        inp.addEventListener("input", () => {
            const v = parseInt(inp.value, 10);
            if (v >= 1 && v <= 50) { STEP = v; localStorage.setItem("r20jb_step", v); }
        });
        inp.addEventListener("keydown", e => e.stopPropagation());      // Roll20 단축키로 새지 않게
        wrap.append(inp, "%");
        host.appendChild(wrap);
    };

    // Roll20 이 곡 줄을 다시 그리면 그 줄만 다시 붙인다
    jbWatch.on((lis, folders) => {
        if (!btnVisible.jbrow) return;
        lis.forEach(decorate);
        if (folders) markSeps();
    });
    const inject = () => {
        if (!btnVisible.jbrow) return;
        addStepControl();
        jbWatch.ensure();
        // 다른 곳(일괄 편집기 등)에서 볼륨이 바뀌면 숫자도 맞춘다
        if (!bound && window.Jukebox?.playlist?.on) {
            bound = true;
            window.Jukebox.playlist.on("change:volume", m => {
                const label = document.querySelector(`#jukebox li.jukeboxitem[data-itemid="${CSS.escape(m.id)}"] .r20jb-vol span`);
                if (label) label.textContent = Math.round(Number(m.get("volume")) || 0);
            });
            window.Jukebox.playlist.on("change:tags", m => {
                const li = document.querySelector(`#jukebox li.jukeboxitem[data-itemid="${CSS.escape(m.id)}"]`);
                if (li) tagOne(li);
            });
            window.Jukebox.playlist.on("change:loop", m => {
                const b = document.querySelector(`#jukebox li.jukeboxitem[data-itemid="${CSS.escape(m.id)}"] .r20jb-loop`);
                if (b) setLoop(b, !!m.get("loop"));
            });
            // 빈 재생목록(구분선) 판단은 Roll20 폴더 구조가 바뀔 때도 다시
            window.Campaign?.on?.("change:jukeboxfolder", markSeps);
            window.Campaign?.on?.("change:journalfolder", markJournalSeps);
        }
        journalTools(true);
        markJournalSeps();
    };
    // 곡 줄을 0.4초 누르고 있으면 숨겨 둔 Roll20 끌기 손잡이에 mousedown 을 대신 보내 순서 바꾸기를 시작한다
    // (그 뒤 움직임·놓기는 실제 마우스 그대로 Roll20 이 처리). 단추·볼륨·미리듣기 위에서는 시작하지 않는다
    let lp = null, dropT = 0;
    const endLp = () => { clearTimeout(lp?.t); document.querySelectorAll("#jukebox li.r20jb-lift").forEach(x => x.classList.remove("r20jb-lift")); };
    document.addEventListener("mousedown", e => {
        if (!btnVisible.jbrow || e.button !== 0 || !e.isTrusted) return;
        const li = e.target.closest?.("#jukebox li.jukeboxitem");
        const handle = li?.querySelector(":scope > .dd-handle");
        if (!handle || e.target.closest("a, button, input, label, .r20-bgm-pv")) return;
        endLp();
        lp = { x: e.clientX, y: e.clientY, fired: false };
        lp.t = setTimeout(() => {
            lp.fired = true;
            li.classList.add("r20jb-lift");
            handle.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window, clientX: lp.x, clientY: lp.y, button: 0, buttons: 1 }));
        }, 400);
    }, true);
    document.addEventListener("mousemove", e => { if (lp && !lp.fired && Math.hypot(e.clientX - lp.x, e.clientY - lp.y) > 6) { endLp(); lp = null; } }, true);
    document.addEventListener("mouseup", () => {
        if (!lp) return;
        endLp();
        // 끌고 놓은 뒤 따라오는 click 은 버린다 (놓은 자리의 재생 단추 등이 눌리지 않게)
        if (lp.fired) {
            dropT = performance.now();
            const kill = ev => { ev.stopPropagation(); ev.preventDefault(); };
            document.addEventListener("click", kill, { capture: true, once: true });
            setTimeout(() => document.removeEventListener("click", kill, true), 300);       // click 이 안 따라오면 다음 클릭을 막지 않게
        }
        lp = null;
    }, true);
    // 곡 제목을 누르면 숨겨 둔 Roll20 재생 단추를 대신 누른다 (재생 ↔ 정지)
    const TITLE = "#jukebox li.jukeboxitem > .dd-content > .title";
    const playOf = ti => ti.closest("li.jukeboxitem").querySelector("a.play")?.click();
    document.addEventListener("keydown", e => {
        if ((e.key === "Enter" || e.key === " ") && btnVisible.jbrow && e.target.matches?.(TITLE)) { e.preventDefault(); e.stopPropagation(); playOf(e.target); }
    }, true);
    document.addEventListener("click", e => {
        const ti = btnVisible.jbrow && e.isTrusted && e.target.closest?.(TITLE);
        if (ti) { e.preventDefault(); e.stopPropagation(); if (performance.now() - dropT > 300) playOf(ti); return; }      // 끌어 놓은 직후 click 은 무시
        // 재생목록 제목 줄을 누르면 Roll20 의 +/− 단추를 대신 눌러 하위 트랙을 펼치거나 접는다 (구분선은 그대로)
        const head = btnVisible.jbrow && e.target.closest?.("#jukeboxfolderroot li.dd-folder:not(.r20jb-sep) > .dd-content");
        if (head && !e.target.closest(".playlistcontrols")) {
            const tg = [...head.parentElement.querySelectorAll(":scope > button[data-action]")].find(b => getComputedStyle(b).display !== "none");
            if (tg) { e.preventDefault(); tg.click(); }
            return;
        }
        const lb = e.target.closest?.(".r20jb-loop");
        if (lb) {
            e.preventDefault(); e.stopPropagation();
            const m = trackOf(lb.closest("li.jukeboxitem"));
            if (!m || !isGM()) return;
            const on = !m.get("loop");
            m.save({ loop: on });
            setLoop(lb, on);
            return;
        }
        const btn = e.target.closest?.(".r20jb-vol button");
        if (!btn) return;
        e.preventDefault(); e.stopPropagation();
        step(btn.closest("li.jukeboxitem"), Number(btn.dataset.dir));
    }, true);

    // 저널 탭: '+ 캐릭터 · + 핸드아웃 · + 추가' 를 맨 윗줄(일괄 편집 · 태그 단추 왼쪽)로 올린다.
    // Roll20 단추 자체를 옮기므로 동작은 그대로. 원래 자리를 기억해 두고 끄면 되돌린다
    let jtools = null;      // { wrap, moved: [[요소, 원래 부모, 원래 다음 형제]] }
    const journalTools = on => {
        if (!on) {
            // 나중에 옮긴 것부터 되돌려야 '원래 다음 형제'가 제자리에 있다
            jtools?.moved.slice().reverse().forEach(([el, p, n]) => { if (p.isConnected) p.insertBefore(el, n?.parentNode === p ? n : null); });
            jtools?.wrap.remove();
            jtools = null;
            return;
        }
        const sb = document.querySelector("#journal .content.searchbox"), cc = document.getElementById("vm_journal_creation_controls");
        if (!sb || !cc || cc.closest(".r20jn-tools")) return;
        // 같은 줄의 '+ 핸드아웃 · + 추가' (만들기 칸 밖에 있을 때만, 목록 안 단추는 제외)
        const extra = [...(cc.parentElement?.querySelectorAll(".btn, button") || [])]
            .filter(b => !cc.contains(b) && !b.closest(".searchbox, .dd-list, .r20jn-tools") && /핸드아웃|추가|Handout|Add/.test(b.textContent));
        if (!jtools?.wrap.isConnected) jtools = { wrap: Object.assign(document.createElement("div"), { className: "r20jn-tools" }), moved: [] };
        [cc, ...extra].forEach(el => { jtools.moved.push([el, el.parentElement, el.nextSibling]); jtools.wrap.appendChild(el); });
        if (!jtools.wrap.querySelector(".r20-fold")) jtools.wrap.appendChild(foldBtn("#journalfolderroot"));
        sb.prepend(jtools.wrap);
    };
    const setEnabled = on => {
        document.body.classList.toggle("r20jb-on", on);
        if (on) { inject(); jbWatch.all().forEach(decorate); markSeps(); measured = false; if (rootShown) measureSoon(); }
        else {
            document.querySelectorAll("#jukebox .r20-fold").forEach(b => b.remove());
            journalTools(false);
            document.querySelectorAll(TITLE + "[tabindex]").forEach(ti => { ti.removeAttribute("tabindex"); ti.removeAttribute("role"); });
        }
    };
    setEnabled(btnVisible.jbrow);
    return { inject, setEnabled };
})();

addCss(`
        .r20-bgm-pv { cursor:pointer; margin-right:4px; font-size:12px; opacity:0.55; text-decoration:none !important; user-select:none; }
        .r20-bgm-pv:hover, .r20-bgm-pv:focus-visible { opacity:1; }
        .r20-bgm-pv.on { opacity:1; filter:drop-shadow(0 0 2px var(--aio-accent)); }
        body.r20-bgm-off .r20-bgm-pv { display:none; }
        /* 주크박스 한 줄 보기: Roll20 요소는 그대로 두고 배치·크기만 바꾼다 (.playbackcontrol 을 풀어 한 줄 flex 로) */
        body.r20jb-on #jukebox .instructions { display:none !important; }
        body.r20jb-on #jukebox .secondarycontrols { display:flex !important; align-items:center; gap:8px; margin:2px 0 6px !important; }
        .r20jb-step { display:none; }
        /* 폴더 닫기 단추 (저널 · 주크박스) */
        body.r20jb-on :is(#jukebox, #journal) .r20-fold { height:22px; margin:0 !important; padding:0 6px !important; font-size:9px; line-height:20px; white-space:nowrap; }
        body.r20jb-on #jukebox .r20jb-step { display:inline-flex; align-items:center; gap:3px; margin:0 0 0 auto; font-size:11px; font-weight:normal; color:var(--aio-ink-3); }
        body.r20jb-on #jukebox .r20jb-step input { width:42px !important; height:22px !important; margin:0 !important; padding:0 4px !important; font-size:11px !important; text-align:center; }
        /* 사이드바 탭(저널 · 주크박스 · 그림 라이브러리 · 컬렉션)의 Roll20 단추를 '일괄 편집' 단추와 같은 모양으로 */
        /* Roll20 새 단추(grimoire__button, 예: 저널 '+ 캐릭터')도 같이. 높이는 테두리 포함 24px */
        body.r20jb-on :is(#journal, #jukebox, #imagedialog, #deckstables) :is(.btn, .grimoire__button) { box-sizing:border-box !important; height:24px !important; min-height:0 !important; padding:0 10px !important; border:1px solid var(--aio-line) !important; border-radius:var(--aio-r-sm) !important; background:var(--aio-bg) !important; background-image:none !important; box-shadow:none !important; text-shadow:none !important; color:var(--aio-ink-2) !important; font-size:11px !important; font-weight:700 !important; line-height:22px !important; vertical-align:middle; }
        body.r20jb-on #journal .searchbox .r20jn-tools { float:left; display:flex; align-items:center; gap:3px; margin:5px 0 0; }
        body.r20jb-on #journal .searchbox .r20jn-tools > *, body.r20jb-on #journal .searchbox .r20jn-tools #journal-creation-controls { float:none !important; margin:0 !important; }
        body.r20jb-on #journal .searchbox .r20jn-tools #journal-creation-controls { display:flex; gap:3px; }
        body.r20jb-on #journal .searchbox .r20jn-tools :is(.btn, .grimoire__button) { padding:0 7px !important; }
        body.r20jb-on #journal .searchbox .r20jn-tools .grimoire__button { min-width:0 !important; width:auto !important; }
        body.r20jb-on #journal .searchbox .r20jn-tools .grimoire__button span[style*="margin-left"] { margin-left:2px !important; }
        body.r20jb-on #journal .content.searchbox { container:r20jn / inline-size; }
        @container r20jn (max-width: 340px) {
            #journal .searchbox .r20jn-tools { gap:2px !important; }
            #journal .searchbox .r20jn-tools :is(.btn, .grimoire__button) { padding:0 5px !important; }
            #journal .searchbox button.r20be-open { gap:0 !important; padding:0 6px !important; font-size:0 !important; }
        }
        body.r20jb-on :is(#journal, #jukebox, #imagedialog, #deckstables) :is(.btn, .grimoire__button):hover { background:var(--aio-bg-3) !important; }
        body.r20jb-on :is(#journal, #jukebox, #imagedialog, #deckstables) :is(.btn, .grimoire__button):focus-visible { outline:2px solid var(--aio-accent) !important; outline-offset:1px; }
        body.r20jb-on #jukeboxfolderroot .dd-list .dd-list { clear:both; padding-left:0 !important; margin-left:0 !important; }
        /* 재생목록 머리줄: 폴더째 재생 버튼만 */
        /* 재생목록 줄 높이를 26px 로 맞춘다: 접기 단추(float)의 위쪽 여백·높이가 줄보다 커서 아래에 빈틈이 생기던 것 */
        body.r20jb-on #jukeboxfolderroot li.dd-folder { min-height:0 !important; margin:0 !important; padding:0 !important; }
        body.r20jb-on #jukeboxfolderroot li.dd-folder::before, body.r20jb-on #jukeboxfolderroot li.dd-folder::after, body.r20jb-on #jukeboxfolderroot li.dd-folder > .dd-content::after { display:none !important; }
        body.r20jb-on #jukeboxfolderroot li.dd-folder > button[data-action] { width:14px !important; height:26px !important; margin:0 0 0 2px !important; padding:0 !important; line-height:26px !important; }
        body.r20jb-on #jukeboxfolderroot li.dd-folder > button[data-action]::before, body.r20jb-on #journalfolderroot li.dd-folder > button[data-action]::before { top:0 !important; left:0 !important; width:100% !important; text-align:center; font-size:12px !important; line-height:26px !important; }
        body.r20jb-on #jukeboxfolderroot li.dd-folder > .dd-list { margin-top:0 !important; margin-bottom:0 !important; }
        /* 재생목록 안 곡: 재생목록 제목 글자가 시작하는 자리부터 (--r20jb-ind 는 jukeboxRow 가 실제 위치를 재서 넣는다) */
        body.r20jb-on #jukeboxfolderroot li.dd-folder > ol.dd-list { margin-left:0 !important; padding-left:calc(var(--r20jb-ind, 18px) - 3px) !important; border-left:0 !important; }
        body.r20jb-on #jukeboxfolderroot li.dd-folder > .dd-content { display:flex !important; align-items:center !important; gap:2px; height:auto !important; min-height:26px !important; margin:0 !important; padding:0 4px 0 1px !important; }
        body.r20jb-on #jukeboxfolderroot li.dd-folder > .dd-content .folder-title { flex:1 1 auto; min-width:0; float:none !important; width:auto !important; margin:0 !important; padding:0 !important; text-indent:0 !important; overflow:hidden; white-space:nowrap !important; text-overflow:clip; font-size:12px !important; font-weight:700 !important; line-height:26px !important; }
        /* 재생목록 줄의 재생 · 섞기 · 내보내기 단추는 빼고 제목을 끝까지 (재생은 곡 줄에서) */
        body.r20jb-on #jukeboxfolderroot li.dd-folder > .dd-content .playlistcontrols { display:none !important; }
        /* 트랙 없는 재생목록 = 구분선: 접기·재생 단추 없이 다른 줄보다 왼쪽으로 (.r20jb-sep 은 jukeboxRow 가 붙인다) */
        body.r20jb-on #jukeboxfolderroot li.dd-folder:not(.r20jb-sep) > .dd-content { cursor:pointer; }
        body.r20jb-on #jukeboxfolderroot li.dd-folder.r20jb-sep > button[data-action] { display:none !important; }
        body.r20jb-on #jukeboxfolderroot li.dd-folder.r20jb-sep > .dd-content { min-height:18px !important; }
        body.r20jb-on #jukeboxfolderroot li.dd-folder.r20jb-sep > .dd-content .folder-title, body.r20jb-on #journalfolderroot li.dd-folder.r20jn-sep > .dd-content .folder-title { font-size:10px !important; line-height:18px !important; }
        body.r20jb-on #jukeboxfolderroot li.dd-folder.r20jb-sep > .dd-list { display:none !important; }
        /* 빈 재생목록의 자리표시(끌어 넣기용)는 남기되 높이만 줄인다 */
        body.r20jb-on #jukeboxfolderroot li.dd-item-dummy { min-height:0 !important; }
        body.r20jb-on #jukeboxfolderroot li.dd-item-dummy > .dd-content { height:6px !important; min-height:0 !important; margin:0 !important; padding:0 !important; border:0 !important; }
        /* 곡 줄 */
        body.r20jb-on #jukebox li.jukeboxitem { position:relative !important; min-height:0 !important; height:auto !important; margin:0 !important; padding:0 !important; }
        /* 끌기 손잡이(☰)는 안 보이게 두고, 곡 줄을 길게 누르면 jukeboxRow 가 대신 눌러 순서 바꾸기를 시작한다 */
        body.r20jb-on #jukebox li.jukeboxitem > .dd-handle { position:absolute !important; left:0 !important; top:0 !important; bottom:0 !important; width:0 !important; opacity:0 !important; pointer-events:none !important; height:auto !important; margin:0 !important; padding:0 !important; border:0 !important; background:none !important; transform:none !important; overflow:hidden !important; text-indent:0 !important; font-size:0 !important; display:flex !important; align-items:center; justify-content:center; cursor:grab; }
        body.r20jb-on #jukebox li.jukeboxitem > .dd-handle::before { display:none !important; content:"" !important; position:static !important; display:block !important; margin:0 !important; font-size:9px !important; line-height:1 !important; color:var(--aio-ink-5) !important; opacity:0; }
        body.r20jb-on #jukebox li.jukeboxitem > .dd-handle::after { display:none !important; }
        body.r20jb-on #jukebox li.jukeboxitem > .dd-content { -webkit-user-select:none; user-select:none; display:flex !important; align-items:center !important; gap:0; float:none !important; position:relative !important; left:auto !important; width:auto !important; height:auto !important; min-height:26px !important; margin:0 !important; padding:0 2px 0 0 !important; border:0 !important; border-bottom:1px solid rgba(128,128,128,0.12) !important; background:none; }
        body.r20jb-on #jukebox li.jukeboxitem.r20jb-lift > .dd-content { background:rgba(225,0,133,0.1) !important; }
        body.r20jb-on #jukebox li.jukeboxitem .playbackcontrol { display:contents !important; }
        body.r20jb-on #jukebox li.jukeboxitem .playbackcontrol > * { float:none !important; position:static !important; margin:0 !important; flex-shrink:0; }
        body.r20jb-on #jukebox li.jukeboxitem .title { order:2; flex:1 1 auto; min-width:0; float:none !important; width:auto !important; margin:0 !important; padding:0 2px 0 0 !important; overflow:hidden; white-space:nowrap !important; text-overflow:clip; font-size:12px !important; font-weight:400 !important; line-height:26px !important; }
        body.r20jb-on #jukebox li.jukeboxitem .r20-bgm-pv { order:0; width:auto; min-width:12px; margin-right:2px !important; padding:0 !important; text-align:center; font-size:10px; filter:grayscale(1); opacity:0.4; }
        body.r20jb-on #jukebox li.jukeboxitem .r20-bgm-pv.on { filter:none; opacity:1; }
        /* 재생 ▶ 은 숨기고 곡 제목을 누르면 재생/정지 (jukeboxRow 가 숨긴 단추를 대신 누른다). 재생 중인 곡은 파란 제목으로 보인다 */
        body.r20jb-on #jukebox li.jukeboxitem a.play { display:none !important; }
        body.r20jb-on #jukebox li.jukeboxitem > .dd-content > .title { cursor:pointer; }
        body.r20jb-on #jukebox li.jukeboxitem > .dd-content > .title:focus-visible { outline:2px solid var(--aio-accent); outline-offset:-2px; }
        /* 볼륨: 슬라이더 대신 ◂ 값 ▸ */
        body.r20jb-on #jukebox li.jukeboxitem .volume { order:4; display:inline-flex !important; align-items:center; width:auto !important; height:26px; margin:0 !important; }
        body.r20jb-on #jukebox li.jukeboxitem .volume input.slider { display:none !important; }
        .r20jb-vol, .r20jb-loop { display:none; }
        body.r20jb-on #jukebox li.jukeboxitem .loopcontainer { display:none !important; }
        body.r20jb-on #jukebox li.jukeboxitem .r20jb-loop { order:0; display:none; align-items:center; justify-content:center; flex-shrink:0; width:12px; height:22px; margin:0 2px 0 0; padding:0; border:0; background:none; color:var(--aio-ink-5); font-size:12px; line-height:22px; cursor:pointer; }
        body.r20jb-on #jukebox li.jukeboxitem .r20jb-loop:hover { color:var(--aio-ink-4); }
        .r20jb-tip { position:fixed; z-index:100005; max-width:260px; padding:4px 8px; border-radius:var(--aio-r-sm); background:rgba(20,20,22,0.94); color:#fff; font-size:11px; line-height:1.45; pointer-events:none; word-break:keep-all; box-shadow:0 2px 6px rgba(0,0,0,0.3); }
        body.r20jb-on #jukebox li.jukeboxitem:has(a.play[data-isplaying="true"]) .r20jb-loop { display:inline-flex; }
        body.r20jb-on #jukebox li.jukeboxitem:has(a.play[data-isplaying="true"]) .r20-bgm-pv { display:none !important; }
        body.r20jb-on #jukebox li.jukeboxitem .r20jb-loop.on { color:var(--aio-accent); font-weight:700; }
        /* 곡 제목에 마우스: 마젠타 핑크 글자 + 파스텔 민트 바탕 (Roll20 의 하늘색 글자 · 노란 바탕 대신, 재생 중인 곡도) */
        html body.r20jb-on #jukebox li.jukeboxitem > .dd-content > .title:hover { color:var(--aio-accent) !important; background:#d4f5e9 !important; }
        body.r20jb-on #jukebox li.jukeboxitem .r20jb-vol { display:inline-flex; align-items:center; }
        body.r20jb-on #jukebox li.jukeboxitem .r20jb-vol button { width:8px; height:22px; margin:0; padding:0; border:0; background:none; color:var(--aio-ink-5); font-size:9px; line-height:22px; cursor:pointer; }
        body.r20jb-on #jukebox li.jukeboxitem .r20jb-vol button:hover { color:var(--aio-ink); }
        body.r20jb-on #jukebox li.jukeboxitem .r20jb-vol span { width:16px; color:var(--aio-ink-4); font-size:10px; text-align:center; font-variant-numeric:tabular-nums; }
        /* 메뉴(⋮)는 숨기고 그 자리를 제목이 쓴다 (삭제 등은 일괄 편집기에서) */
        body.r20jb-on #jukebox li.jukeboxitem .jukeboxitem-menu { display:none !important; }
        /* 저널 한 줄 보기: 항목 = 작은 동그란 아바타 + 이름 (폴더 계층은 10px 씩만 들여쓴다) */
        body.r20jb-on #journalfolderroot .dd-list .dd-list { clear:both; margin:0 !important; padding:0 0 0 12px !important; }
        body.r20jb-on #journalfolderroot li.dd-item { margin:0 !important; padding:0 !important; }
        /* Roll20 이 들여쓰기·간격에 쓰는 값(오프셋·text-indent 등)을 모두 0 으로 */
        body.r20jb-on #journalfolderroot ol.dd-list, body.r20jb-on #journalfolderroot li.dd-item, body.r20jb-on #journalfolderroot .dd-content, body.r20jb-on #journalfolderroot .folder-title, body.r20jb-on #journalfolderroot li.journalitem .token, body.r20jb-on #journalfolderroot li.journalitem .name, body.r20jb-on #journalfolderroot li.journalitem .namecontainer { text-indent:0 !important; left:auto !important; transform:none !important; }
        /* 폴더 ± 버튼은 줄 왼쪽 16px 안에 고정 */
        body.r20jb-on #journalfolderroot li.dd-folder { position:relative !important; min-height:0 !important; }
        body.r20jb-on #journalfolderroot li.dd-folder > button[data-action] { position:absolute !important; left:0 !important; top:0 !important; float:none !important; width:16px !important; height:26px !important; margin:0 !important; line-height:26px !important; z-index:2; }
        /* 빈 폴더 = 구분선 (주크박스의 빈 재생목록과 같은 모양 · .r20jn-sep 은 jukeboxRow 가 붙인다) */
        body.r20jb-on #journalfolderroot li.dd-folder.r20jn-sep > button[data-action] { display:none !important; }
        body.r20jb-on #journalfolderroot li.dd-folder.r20jn-sep > .dd-content { min-height:18px !important; padding-left:0 !important; }
        body.r20jb-on #journalfolderroot li.dd-folder.r20jn-sep > .dd-list { display:none !important; }
        body.r20jb-on #journalfolderroot li.dd-folder.r20jn-sep > .dd-handle { height:18px !important; }
        body.r20jb-on #journalfolderroot li.dd-folder > .dd-content { display:flex !important; align-items:center !important; height:auto !important; min-height:26px !important; margin:0 !important; padding:0 4px 0 16px !important; }
        body.r20jb-on #journalfolderroot li.dd-folder > .dd-content .folder-title { flex:1 1 auto; min-width:0; float:none !important; width:auto !important; margin:0 !important; padding:0 !important; overflow:hidden; white-space:nowrap !important; text-overflow:clip; font-size:12px !important; font-weight:700 !important; line-height:26px !important; }
        /* 폴더 끌기 손잡이(투명)가 줄 높이를 늘리지 않게 흐름에서 뺀다 */
        body.r20jb-on #journalfolderroot li.dd-folder > .dd-handle { position:absolute !important; left:0 !important; top:0 !important; float:none !important; height:26px !important; margin:0 !important; }
        body.r20jb-on #journalfolderroot li.dd-folder::before, body.r20jb-on #journalfolderroot li.dd-folder::after, body.r20jb-on #journalfolderroot li.dd-folder > .dd-content::after { display:none !important; }
        body.r20jb-on #journalfolderroot li.journalitem { min-height:0 !important; height:auto !important; margin:0 !important; padding:0 !important; }
        body.r20jb-on #journalfolderroot li.journalitem > .dd-content { display:flex !important; align-items:center !important; gap:6px; float:none !important; position:relative !important; width:auto !important; height:auto !important; min-height:26px !important; margin:0 !important; padding:0 4px !important; border:0 !important; border-bottom:1px solid rgba(128,128,128,0.12) !important; }
        body.r20jb-on #journalfolderroot li.journalitem .token { float:none !important; position:static !important; flex:0 0 18px; width:18px !important; height:18px !important; margin:0 !important; padding:0 !important; border:0 !important; border-radius:50%; overflow:hidden; background:none !important; }
        body.r20jb-on #journalfolderroot li.journalitem .token img { width:18px !important; height:18px !important; max-width:none !important; margin:0 !important; border-radius:50%; object-fit:cover; }
        body.r20jb-on #journalfolderroot li.journalitem .name { flex:1 1 auto; min-width:0; display:flex !important; align-items:center; gap:4px; float:none !important; position:static !important; width:auto !important; height:auto !important; margin:0 !important; padding:0 !important; }
        body.r20jb-on #journalfolderroot li.journalitem .namecontainer { flex:1 1 auto; min-width:0; float:none !important; position:static !important; width:auto !important; margin:0 !important; padding:0 !important; overflow:hidden; white-space:nowrap !important; text-overflow:clip; font-size:12px !important; font-weight:400 !important; line-height:26px !important; }
        body.r20jb-on #journalfolderroot li.journalitem .playerdots { flex-shrink:0; margin:0 !important; font-size:12px !important; line-height:1 !important; }
        body.r20jb-on #journalfolderroot li.journalitem .sourcefooter:empty { display:none !important; }
        /* 모음 탭(매크로 · 덱 · 목록에서 뽑기): 저널처럼 한 줄씩 가늘게 */
        body.r20jb-on #deckstables .content > p { display:none !important; }
        body.r20jb-on #deckstables .content > .clear { height:6px !important; }
        body.r20jb-on #deckstables .content > hr { margin:4px 0 !important; }
        body.r20jb-on #deckstables .content > h3 { margin:6px 0 4px !important; font-size:13px !important; line-height:24px !important; }
        body.r20jb-on #deckstables .content > button.btn { margin:6px 0 0 !important; }
        body.r20jb-on #deckstables .content > label { font-size:11px !important; font-weight:normal !important; }
        body.r20jb-on #deckstables table.table { width:100% !important; margin:0 !important; border-collapse:collapse !important; }
        body.r20jb-on #deckstables table.table thead { display:none !important; }
        body.r20jb-on #deckstables table.table td { height:26px; padding:0 4px !important; border:0 !important; border-bottom:1px solid rgba(128,128,128,0.12) !important; background:none !important; font-size:12px !important; line-height:26px !important; vertical-align:middle !important; white-space:nowrap; }
        body.r20jb-on #deckstables table.table tr:hover td { background:rgba(225,0,133,0.06) !important; }
        body.r20jb-on #deckstables table.table td.name { width:100%; max-width:0; overflow:hidden; text-overflow:clip; cursor:pointer; }
        body.r20jb-on #deckstables td.name a.rollmacro { display:inline-block; width:16px; margin:0 2px 0 0 !important; color:var(--aio-ink-5) !important; font-size:12px !important; text-align:center; text-decoration:none !important; }
        body.r20jb-on #deckstables td.name a.rollmacro:hover { color:var(--aio-ink) !important; }
        body.r20jb-on #deckstables td.bartoggle label { display:inline-flex !important; align-items:center; gap:2px; margin:0 !important; font-size:10px !important; font-weight:normal !important; color:var(--aio-ink-5) !important; line-height:26px !important; }
        body.r20jb-on #deckstables td.bartoggle input { margin:0 !important; }
        body.r20jb-on #deckstables tr.deck > td:nth-child(2), body.r20jb-on #deckstables tr.rollabletable > td:nth-child(2) { color:var(--aio-ink-5) !important; font-size:10px !important; text-align:right; }
        body.r20jb-on #deckstables td.actions { text-align:right !important; }
        body.r20jb-on #deckstables td.actions .btn { float:none !important; height:20px !important; margin:0 0 0 2px !important; padding:0 6px !important; font-size:10px !important; line-height:18px !important; vertical-align:middle; }
        body.r20jb-on #jukebox li.jukeboxitem:has(a.play[data-isplaying="true"]) > .dd-content { background:rgba(225,0,133,0.08) !important; }
        body.r20jb-on #jukebox li.jukeboxitem:has(a.play[data-isplaying="true"]) .title { color:var(--aio-accent) !important; font-weight:700 !important; }
`);
// ───────── 주크박스 자동 백업: GM 으로 들어올 때 · 폴더 구조가 바뀔 때 이 브라우저(IndexedDB)에 저장해 두고 되돌린다 ─────────
// 다른 브라우저 · 계정에서 Roll20 이 폴더를 빈 채로 저장한 일이 있었다(2026-11 · 폴더 72개가 다 비고 곡 2,500개가 밖으로).
// 폴더 안 곡이 한꺼번에 30% 넘게 줄면 그 저장은 '수상함'으로 따로 표시하고 알림을 띄운다. 되돌리기는 알림 · 일괄 편집기 BGM 탭 [백업]
const jbBackup = (() => {
    const MAX = 12;
    let dbp = null, bound = false, started = false, toast = null;
    const db = () => dbp || (dbp = new Promise((res, rej) => {
        const r = indexedDB.open("r20_jb_backup", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("room", { keyPath: "cid" });
        r.onsuccess = () => res(r.result);
        r.onerror = () => { dbp = null; rej(r.error); };
    }));
    const cid = () => String(window.campaign_id || window.Campaign?.id || "");
    const read = async () => {
        const d = await db(), id = cid();
        return new Promise(res => {
            const q = d.transaction("room").objectStore("room").get(id);
            q.onsuccess = () => res(q.result || { cid: id, snaps: [] });
            q.onerror = () => res({ cid: id, snaps: [] });
        });
    };
    const write = async rec => {
        const d = await db();
        return new Promise((res, rej) => { const t = d.transaction("room", "readwrite"); t.objectStore("room").put(rec); t.oncomplete = res; t.onerror = () => rej(t.error); });
    };
    // 폴더 수 · 폴더 안 곡 수
    const stats = raw => {
        let t = [];
        try { t = JSON.parse(raw || "[]"); } catch (e) {}
        let folders = 0, inF = 0;
        const walk = (l, deep) => (Array.isArray(l) ? l : []).forEach(x => {
            if (typeof x === "string") { if (deep) inF++; }
            else if (x && typeof x === "object") { folders++; walk(x.i, true); }
        });
        walk(t, false);
        return { folders, inF };
    };
    const lastGood = rec => rec.snaps.find(s => s.flag !== "drop");
    // 지금 구조를 저장한다. 바로 앞 백업과 같으면 건너뛴다
    const take = async () => {
        if (!isGM() || !cid()) return;
        const raw = window.Campaign?.get?.("jukeboxfolder"), n = window.Jukebox?.playlist?.models?.length || 0;
        if (typeof raw !== "string" || !n) return;
        let rec;
        try { rec = await read(); } catch (e) { return; }
        if (rec.snaps[0]?.raw === raw) return;
        const st = stats(raw), good = lastGood(rec);
        const drop = !!good && good.inF >= 20 && st.inF < good.inF * 0.7;
        rec.snaps.unshift(Object.assign({ at: Date.now(), raw, tracks: n, flag: drop ? "drop" : "ok" }, st));
        // 12개까지 — 정상 백업이 다 밀려나지 않게 마지막 정상 하나는 남긴다
        let keep = rec.snaps.slice(0, MAX);
        if (good && !keep.includes(good)) keep = keep.slice(0, MAX - 1).concat(good);
        rec.snaps = keep;
        try { await write(rec); } catch (e) { console.warn("[주크박스 백업] 저장 실패:", e); return; }
        if (drop) warn(good, st);
    };
    // 되돌리기: 백업 구조에서 지금 없는 곡은 빼고, 백업 뒤에 폴더에 넣은 곡은 같은 이름 폴더(없으면 맨 아래)에 붙인다
    const restore = async snap => {
        const C = window.Campaign;
        if (!isGM() || !C) return false;
        const have = new Set((window.Jukebox?.playlist?.models || []).map(m => m.id));
        let base, cur;
        try { base = JSON.parse(snap.raw); cur = JSON.parse(C.get("jukeboxfolder") || "[]"); } catch (e) { return false; }
        const keep = l => (Array.isArray(l) ? l : []).filter(x => typeof x !== "string" || have.has(x)).map(x => x && typeof x === "object" ? Object.assign({}, x, { i: keep(x.i) }) : x);
        base = keep(base);
        const used = new Set(), byName = new Map();
        const mark = l => l.forEach(x => { if (typeof x === "string") used.add(x); else if (x && typeof x === "object") { if (!byName.has(x.n)) byName.set(x.n, x); mark(x.i); } });
        mark(base);
        const walk = (l, folder) => (Array.isArray(l) ? l : []).forEach(x => {
            if (typeof x === "string") { if (used.has(x) || !have.has(x)) return; used.add(x); const f = folder && byName.get(folder.n); (f ? f.i : base).push(x); }
            else if (x && typeof x === "object") walk(x.i, x);
        });
        walk(cur, null);
        await take();                        // 되돌리기 전 지금 상태도 남겨 둔다
        C.save({ jukeboxfolder: JSON.stringify(base) });
        return true;
    };
    const fmt = s => { const d = new Date(s.at); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
    const closeToast = () => { toast?.remove(); toast = null; };
    const warn = (good, st) => {
        closeToast();
        toast = document.createElement("div");
        toast.className = "r20jbb-toast";
        toast.setAttribute("role", "alert");
        toast.innerHTML = `<b>주크박스 폴더에서 곡이 한꺼번에 빠졌어요</b><span>폴더 안 곡 ${good.inF.toLocaleString()} → ${st.inF.toLocaleString()} · ${fmt(good)} 백업으로 되돌릴 수 있어요</span>`
            + `<div><button type="button" data-a="restore">되돌리기</button><button type="button" data-a="close">괜찮아요</button></div>`;
        toast.addEventListener("click", async e => {
            const a = e.target.closest("button")?.dataset.a;
            if (a === "close") return closeToast();
            if (a === "restore") {
                const b = e.target.closest("button");
                b.disabled = true; b.textContent = "되돌리는 중…";
                const ok = await restore(good);
                toast.querySelector("span").textContent = ok ? "되돌렸어요. 주크박스 폴더를 확인해 주세요." : "되돌리지 못했어요.";
                toast.querySelector("div").innerHTML = '<button type="button" data-a="close">닫기</button>';
            }
        });
        document.body.appendChild(toast);
    };
    const list = async () => { try { return (await read()).snaps; } catch (e) { return []; } };
    // 게임이 다 뜬 뒤(GM · 주크박스 곡) 한 번 저장하고, 그 뒤로는 폴더 구조가 바뀔 때마다(3초 모아서)
    let t = 0;
    const inject = () => {
        if (!btnVisible.jbrow || started || !gmKnown()) return;
        if (!isGM()) { started = true; return; }
        if (!window.Campaign?.get || !window.Jukebox?.playlist?.models?.length) return;
        started = true;
        setTimeout(take, 8000);
        if (!bound && window.Campaign.on) { bound = true; window.Campaign.on("change:jukeboxfolder", () => { clearTimeout(t); t = setTimeout(take, 3000); }); }
    };
    const setEnabled = on => { if (on) inject(); else closeToast(); };
    return { inject, setEnabled, list, restore, fmt };
})();
addCss(`
        .r20jbb-toast { position:fixed; right:16px; bottom:16px; z-index:10010; display:flex; flex-direction:column; gap:6px; width:min(340px, calc((100vw - 32px) / var(--aio-z, 1))); padding:12px 14px;
            border:1px solid #e3b3a8; border-left:4px solid #c0392b; border-radius:var(--aio-r); background:var(--aio-bg); box-shadow:0 6px 18px rgba(0,0,0,0.2); color:var(--aio-ink-2); font:12px/1.5 sans-serif; }
        .r20jbb-toast b { font-size:13px; color:#a0322a; }
        .r20jbb-toast div { display:flex; gap:6px; justify-content:flex-end; }
        .r20jbb-toast button { height:26px; margin:0; padding:0 10px; border:1px solid var(--aio-line); border-radius:var(--aio-r-sm); background:var(--aio-bg); color:var(--aio-ink-2); font:12px sans-serif; cursor:pointer; }
        .r20jbb-toast button[data-a="restore"] { border-color:var(--aio-accent); background:var(--aio-accent); color:#fff; font-weight:700; }
        #r20be .r20be-bk { position:absolute; top:34px; right:10px; z-index:3; display:flex; flex-direction:column; width:min(360px, calc((100vw - 40px) / var(--aio-z, 1))); max-height:calc(60vh / var(--aio-z, 1)); overflow-y:auto; padding:6px 0;
            background:var(--aio-bg); border:1px solid var(--aio-line); border-radius:var(--aio-r-sm); box-shadow:0 4px 12px rgba(0,0,0,0.15); font-size:12px; }
        #r20be .r20be-bk[hidden] { display:none; }
        #r20be .r20be-bk p { margin:4px 12px 6px; color:var(--aio-ink-4); }
        #r20be .r20be-bk .row { display:flex; align-items:center; gap:8px; padding:6px 12px; border-top:1px solid var(--aio-line-4); }
        #r20be .r20be-bk .row span { flex:1; min-width:0; }
        #r20be .r20be-bk .row small { color:var(--aio-ink-4); }
        #r20be .r20be-bk .row.drop span { color:#a0322a; }
        #r20be .r20be-bk button { height:24px; margin:0; padding:0 9px; border:1px solid var(--aio-line); border-radius:var(--aio-r-sm); background:var(--aio-bg); color:var(--aio-ink-2); font-size:11px; cursor:pointer; white-space:nowrap; }
        #r20be .r20be-bk button:disabled { color:var(--aio-ink-5); cursor:default; }
`);
addFeature("bgmPreview", bgmPreview);
addFeature("jukeboxRow", jukeboxRow);
addFeature("jbBackup", jbBackup);
addBundle({ place: "main", order: 1, label: "주크박스 · 저널 목록 간소화", sub: "BGM 미리듣기 · BGM 태그 보기 · 목록 한 줄 보기 · 탭 단추 모양 통일 · 주크박스 폴더 자동 백업",
    members: [["bgm", "bgmPreview"], ["jbrow", "jukeboxRow"], ["jbrow", "jbBackup"]] });

// ══════════ 묶음 2 · 대화 캡처 · 맵시트 촬영 ══════════

// ───────── 요소 촬영(공용): 요소를 복제해 계산된 스타일·그림·글꼴을 안에 넣고 → SVG foreignObject → canvas → PNG ─────────
// 대화 캡처 · 시트 촬영이 같이 쓴다. 같은 출처 iframe 안의 요소(캐릭터 시트)도 그 문서의 스타일 · 글꼴로 찍는다
const domShot = (() => {
    // 물려받는 속성은 부모와 다를 때만, 나머지는 그 태그의 기본값과 다를 때만 적는다 (이미지 크기를 줄이려고)
    const INHERIT = new Set(["color", "font-family", "font-size", "font-style", "font-variant", "font-weight", "font-stretch", "line-height", "letter-spacing",
        "word-spacing", "text-align", "text-indent", "text-transform", "text-shadow", "white-space", "word-break", "overflow-wrap", "visibility", "direction",
        "list-style-type", "list-style-position", "list-style-image", "quotes", "tab-size", "hyphens", "font-kerning", "font-feature-settings",
        "font-variation-settings", "-webkit-text-fill-color", "-webkit-text-stroke-color", "-webkit-text-stroke-width", "text-rendering",
        "border-collapse", "border-spacing", "caption-side", "empty-cells", "cursor"]);
    const SKIP = /^(transition|animation|will-change|pointer-events|user-select|-webkit-user-select|cursor|zoom)/;     // zoom: 글자 크기 배율과 상관없이 100% 로 찍는다
    // 기본값 재기 · 크기 재기는 스타일시트가 하나도 없는 빈 문서에서 한다 — 이미지 안에도 Roll20 CSS 가 없으니
    // (Roll20 화면에서 재면 label · input 같은 태그 규칙이 기본값에 섞여, 그 값과 같은 속성이 이미지에서 빠진다)
    let blank = null, sandbox = null;
    const defaults = new Map();
    const blankDoc = () => {
        if (!blank?.isConnected) {
            blank = document.createElement("iframe");
            blank.setAttribute("aria-hidden", "true");
            blank.tabIndex = -1;
            blank.style.cssText = "position:fixed;left:-99999px;top:0;width:4000px;height:100px;border:0;visibility:hidden;pointer-events:none";
            document.body.appendChild(blank);
            const d = blank.contentDocument;
            d.open(); d.write('<!doctype html><html><head></head><body style="margin:0"></body></html>'); d.close();
            defaults.clear(); forced.clear(); sandbox = null;
        }
        return blank.contentDocument;
    };
    const defaultsOf = el => {
        const doc = blankDoc(), key = el.namespaceURI + ":" + el.localName;
        if (defaults.has(key)) return defaults.get(key);
        if (!sandbox) { sandbox = doc.createElement("div"); sandbox.style.cssText = "all:initial"; doc.body.appendChild(sandbox); }
        const d = doc.createElementNS(el.namespaceURI, el.localName);
        sandbox.appendChild(d);
        const cs = doc.defaultView.getComputedStyle(d), map = {};
        for (let i = 0; i < cs.length; i++) map[cs[i]] = cs.getPropertyValue(cs[i]);
        d.remove();
        defaults.set(key, map);
        return map;
    };
    // 브라우저가 태그 자체에 정해 두는 물려받는 속성(단추 · 입력칸의 글꼴, 링크 색, b 의 굵기 등) — 부모와 같아도 꼭 적어야 이미지에서 안 바뀐다.
    // 별난 값을 준 부모 밑에 그 태그를 놓아 보고 부모 값을 그대로 물려받지 않는 속성을 고른다
    const forced = new Map();
    const forcedOf = el => {
        const doc = blankDoc(), key = el.namespaceURI + ":" + el.localName;
        if (forced.has(key)) return forced.get(key);
        const par = doc.createElement("div");
        par.style.cssText = "all:initial;color:rgb(1,2,3);font:italic 300 13px/7px zz;letter-spacing:3px;word-spacing:5px;text-align:right;text-indent:9px;"
            + "text-transform:uppercase;white-space:pre;direction:rtl;list-style-type:square;text-shadow:1px 1px red;cursor:crosshair;-webkit-text-fill-color:rgb(4,5,6)";
        const d = doc.createElementNS(el.namespaceURI, el.localName);
        if (el.localName === "a" && el.hasAttribute("href")) d.setAttribute("href", "#");
        par.appendChild(d); doc.body.appendChild(par);
        const pcs = doc.defaultView.getComputedStyle(par), dcs = doc.defaultView.getComputedStyle(d), set = new Set();
        INHERIT.forEach(p => { if (dcs.getPropertyValue(p) !== pcs.getPropertyValue(p)) set.add(p); });
        par.remove();
        forced.set(key, set);
        return set;
    };
    const styleText = (cs, parentCs, def, force) => {
        const out = [];
        for (let i = 0; i < cs.length; i++) {
            const p = cs[i];
            if (SKIP.test(p)) continue;
            const v = cs.getPropertyValue(p);
            if (INHERIT.has(p) ? (!parentCs || v !== parentCs.getPropertyValue(p) || force?.has(p)) : v !== def[p]) out.push(`${p}:${v}`);
        }
        return out.join(";");
    };
    // 그림 · 글꼴은 주소 대신 데이터로 넣어야 이미지 안에 보인다 (못 가져오면 비워 둔다)
    const dataCache = new Map();
    const toData = url => {
        if (!url || url.startsWith("data:")) return Promise.resolve(url);
        const get = u => fetch(u, { mode: "cors", credentials: "omit" }).then(r => r.ok ? r.blob() : null)
            .then(b => b && new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => res(null); fr.readAsDataURL(b); }))
            .catch(() => null);
        // fetch 가 막히면(Roll20 이 바깥 주소로의 연결을 막는 경우 등) 그림으로 불러 캔버스에서 데이터로 — imgur 처럼 CORS 를 허락하는 곳이면 된다.
        // 채팅이 이미 CORS 없이 받아 둔 같은 주소는 캐시 때문에 실패할 수 있어 한 번 더 주소를 살짝 바꿔 받는다
        const viaImg = u => new Promise(res => {
            const im = new Image();
            im.crossOrigin = "anonymous";
            im.onload = () => {
                try {
                    const c = document.createElement("canvas");
                    c.width = im.naturalWidth; c.height = im.naturalHeight;
                    c.getContext("2d").drawImage(im, 0, 0);
                    res(c.toDataURL("image/png"));
                } catch (e) { res(null); }
            };
            im.onerror = () => res(null);
            im.src = u;
        });
        const bust = u => u + (u.includes("?") ? "&" : "?") + "r20cap=1";
        // s3.amazonaws.com/files.d20.io 주소는 CORS 가 막혀 있어 files.d20.io 로 먼저 받는다
        if (!dataCache.has(url)) dataCache.set(url, get(r20img(url)).then(d => d || (r20img(url) !== url ? get(url) : null))
            .then(d => d || viaImg(r20img(url))).then(d => d || viaImg(bust(r20img(url)))));
        return dataCache.get(url);
    };
    const inlineUrls = async (css, base = location.href) => {
        const urls = [...css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)].map(m => m[1]).filter(u => !u.startsWith("data:"));
        for (const u of new Set(urls)) {
            const d = await toData(new URL(u, base).href);
            css = css.split(u).join(d || "");
        }
        return css;
    };
    // ── 글꼴 ──
    // 쓰인 글꼴의 @font-face 를 데이터로 넣는다. 다른 곳(Google 글꼴 등) 스타일시트는 규칙을 못 읽으니 글을 받아서 읽는다.
    // 글자 범위(unicode-range)로 쪼개진 글꼴(한글 글꼴)은 실제로 쓴 글자 · 굵기에 걸리는 조각만 넣는다
    const remote = new Map();
    const remoteRules = href => {
        if (!remote.has(href)) remote.set(href, fetch(href, { mode: "cors", credentials: "omit" }).then(r => r.ok ? r.text() : "").catch(() => "")
            .then(t => { const s = new CSSStyleSheet(); try { s.replaceSync(t); } catch (e) { return []; } return [...s.cssRules]; }));
        return remote.get(href);
    };
    // iframe 문서의 규칙은 다른 창의 객체라 instanceof 대신 type 번호로 가린다 (3 @import · 5 @font-face)
    const collectFaces = async (rules, base, out, depth = 0) => {
        for (const r of rules) {
            if (r.type === 5) out.push([r, base]);
            else if (r.type === 3 && depth < 3) {
                const href = new URL(r.href, base).href;
                let sub = null;
                try { sub = r.styleSheet && [...r.styleSheet.cssRules]; } catch (e) { /* 다른 출처 */ }
                await collectFaces(sub || await remoteRules(href), href, out, depth + 1);
            } else if (r.type !== 1 && r.cssRules) await collectFaces(r.cssRules, base, out, depth);     // @media · @supports 안
        }
    };
    const unq = s => s.trim().replace(/^["']|["']$/g, "").toLowerCase();
    const ranges = s => (s || "").split(",").map(x => x.trim().replace(/^u\+/i, "")).filter(Boolean).map(x => {
        if (x.includes("?")) return [parseInt(x.replace(/\?/g, "0"), 16), parseInt(x.replace(/\?/g, "F"), 16)];
        const [a, b] = x.split("-");
        return [parseInt(a, 16), parseInt(b || a, 16)];
    });
    const weights = r => { const v = r.style.getPropertyValue("font-weight").trim().replace(/\bnormal\b/g, "400").replace(/\bbold\b/g, "700").split(/\s+/).map(Number); return [v[0] || 400, v[1] || v[0] || 400]; };
    // CSS 글꼴 고르기(굵기): 원하는 굵기에 대해 있는 굵기 중 어느 것을 쓰는지
    const pickWeight = (want, have) => {
        if (have.includes(want)) return want;
        const up = have.filter(w => w > want).sort((a, b) => a - b), down = have.filter(w => w < want).sort((a, b) => b - a);
        if (want >= 400 && want <= 500) return up.find(w => w <= 500) ?? down[0] ?? up[0];
        return want < 400 ? (down[0] ?? up[0]) : (up[0] ?? down[0]);
    };
    const fontFaces = async (families, doc, used) => {
        const want = new Set([...families].flatMap(f => f.split(",")).map(unq));
        const faces = [];
        for (const sh of doc.styleSheets) {
            let rules = null;
            try { rules = [...sh.cssRules]; } catch (e) { if (sh.href) rules = await remoteRules(sh.href); }
            if (rules) await collectFaces(rules, sh.href || doc.baseURI, faces);
        }
        const hits = faces.filter(([r]) => want.has(unq(r.style.getPropertyValue("font-family"))));
        const have = new Map();         // 글꼴 → 있는 (하나짜리) 굵기
        hits.forEach(([r]) => { const f = unq(r.style.getPropertyValue("font-family")), [a, b] = weights(r); if (a === b) have.set(f, [...new Set([...(have.get(f) || []), a])]); });
        const out = [], seen = new Set();
        for (const [r, base] of hits) {
            const f = unq(r.style.getPropertyValue("font-family")), [lo, hi] = weights(r), rg = ranges(r.style.getPropertyValue("unicode-range"));
            const take = [...used].some(([w, chars]) => (lo === hi ? pickWeight(w, have.get(f) || [lo]) === lo : w >= lo && w <= hi)
                && (!rg.length || [...chars].some(c => rg.some(([a, b]) => c >= a && c <= b))));
            if (!take) continue;
            const css = r.cssText.replace(/url\(\s*["']?([^"')]+)["']?\s*\)/g, (m0, u) => `url("${new URL(u, base).href}")`);
            if (seen.has(css)) continue;
            seen.add(css);
            out.push(inlineUrls(css));
        }
        return (await Promise.all(out)).join("\n");
    };
    // ── 복제: nodes 를 box(바깥 상자)의 글꼴 · 색으로 감싸 width 폭 · bg 바탕에 놓는다. 계산된 스타일은 지금 화면 그대로 읽는다
    const clone = (nodes, box, width, bg) => {
        const gcs = (el, ps) => el.ownerDocument.defaultView.getComputedStyle(el, ps);
        const wrap = document.createElement("div"), boxCs = gcs(box), rules = [], families = new Set([boxCs.fontFamily]), used = new Map();
        const addText = (s, cs) => {
            if (!s) return;
            const w = parseInt(cs.fontWeight, 10) || 400;
            if (!used.has(w)) used.set(w, new Set());
            for (const ch of s) used.get(w).add(ch.codePointAt(0));
        };
        let pn = 0;
        const pseudoRule = (cl, ps, pcs) => {
            families.add(pcs.fontFamily);           // ::before 에만 쓴 글꼴(Roll20 주사위 단추의 dicefontd20 등)도 넣는다
            const cls = "r20cp" + (++pn);
            cl.classList.add(cls);
            const body = [];
            for (let i = 0; i < pcs.length; i++) if (!SKIP.test(pcs[i])) body.push(`${pcs[i]}:${pcs.getPropertyValue(pcs[i])}`);
            rules.push(`.${cls}${ps}{${body.join(";")}}`);
        };
        wrap.setAttribute("style", styleText(boxCs, null, defaultsOf(wrap)) + `;width:${width}px;background-color:${bg};margin:0;padding:0;overflow:hidden;height:auto;max-height:none;position:static;inset:auto;transform:none`);
        const walk = (orig, parentCs) => {
            const cl = orig.cloneNode(false);
            if (orig.nodeType === 3) addText(orig.nodeValue, parentCs);
            if (orig.nodeType !== 1) return cl;
            const cs = gcs(orig), tag = orig.localName;
            families.add(cs.fontFamily);
            cl.removeAttribute("id");
            // 스크롤되지 않던 상자는 이미지에서 스크롤바가 생기지 않게 (글자 폭이 조금만 달라도 생겨서 모양이 무너진다)
            const still = /auto|scroll/.test(cs.overflow) && orig.scrollWidth <= orig.clientWidth && orig.scrollHeight <= orig.clientHeight;
            cl.setAttribute("style", styleText(cs, parentCs, defaultsOf(orig), forcedOf(orig)) + (still ? ";overflow:hidden" : ""));
            if (cs.display === "none") return cl;           // 안 보이는 것은 속까지 옮기지 않는다
            // ::before · ::after 는 복제에 없으니 규칙으로 따로 적는다
            ["::before", "::after"].forEach(ps => {
                const pcs = gcs(orig, ps), c = pcs.getPropertyValue("content");
                if (!c || c === "none" || c === "normal") return;
                pseudoRule(cl, ps, pcs);
                (c.match(/"(?:[^"\\]|\\.)*"/g) || []).forEach(q => addText(q.slice(1, -1), pcs));
            });
            // 입력칸: 복제는 처음 값만 가지므로 지금 값 · 체크 · 고른 항목을 적는다 (빈 칸이면 안내 글자 모양도)
            if (tag === "input" || tag === "textarea") {
                if (/^(checkbox|radio)$/i.test(orig.type)) orig.checked ? cl.setAttribute("checked", "") : cl.removeAttribute("checked");
                else if (tag === "input") cl.setAttribute("value", orig.value);
                else cl.textContent = orig.value;
                addText(orig.value, cs);
                if (!orig.value && orig.placeholder) { pseudoRule(cl, "::placeholder", gcs(orig, "::placeholder")); addText(orig.placeholder, cs); }
                if (tag === "textarea") return cl;
            } else if (tag === "option") orig.selected ? cl.setAttribute("selected", "") : cl.removeAttribute("selected");
            orig.childNodes.forEach(ch => cl.appendChild(walk(ch, cs)));
            if (tag === "img") { cl.setAttribute("data-src", orig.currentSrc || orig.src); cl.removeAttribute("srcset"); cl.removeAttribute("loading"); }
            return cl;
        };
        nodes.forEach(n => wrap.appendChild(walk(n, boxCs)));
        return { wrap, rules, families, used, doc: box.ownerDocument };
    };
    // ── 그리기: 복제를 PNG 로. scaleFor(w, h) 가 배율을 정한다
    const paint = async ({ wrap, rules, families, used, doc }, scaleFor) => {
        // 그림 · 배경 그림 → 데이터
        for (const img of wrap.querySelectorAll("img[data-src]")) {
            const d = await toData(img.getAttribute("data-src"));
            img.removeAttribute("data-src");
            if (d) img.setAttribute("src", d); else { img.removeAttribute("src"); img.style.visibility = "hidden"; }
        }
        for (const el of [wrap, ...wrap.querySelectorAll("[style*='url(']")]) el.setAttribute("style", await inlineUrls(el.getAttribute("style")));
        const style = document.createElement("style");
        style.textContent = (await fontFaces(families, doc, used)) + "\n" + (await inlineUrls(rules.join("\n")));
        wrap.prepend(style);
        // 크기는 빈 문서에 실제로 놓아 보고 잰다 (글꼴을 다 읽은 뒤)
        const bd = blankDoc(), meas = bd.createElement("div");
        meas.style.cssText = "position:absolute;left:0;top:0";
        meas.appendChild(wrap);
        bd.body.appendChild(meas);
        wrap.getBoundingClientRect();
        await bd.fonts.ready;
        const box = wrap.getBoundingClientRect(), w = Math.ceil(box.width), h = Math.ceil(box.height);
        meas.remove();
        const xml = new XMLSerializer().serializeToString(wrap);
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><foreignObject x="0" y="0" width="100%" height="100%">${xml}</foreignObject></svg>`;
        const img = new Image();
        img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
        await img.decode();
        const scale = scaleFor(w, h);
        const cv = document.createElement("canvas");
        cv.width = Math.round(w * scale); cv.height = Math.round(h * scale);
        const ctx = cv.getContext("2d");
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, w, h);
        return new Promise((res, rej) => cv.toBlob(b => b ? res(b) : rej(new Error("toBlob 실패")), "image/png"));
    };
    return { clone, paint };
})();

// ───────── 대화 캡처: 채팅 메시지를 골라 Roll20 채팅에 보이는 모양 그대로 이미지로 만들어 클립보드에 복사 ─────────
// 외부 라이브러리 없이: 고른 메시지를 복제해 계산된 스타일·그림·글꼴을 안에 넣고 → SVG foreignObject → canvas → PNG
const chatCapture = (() => {
    let on = false, last = null;
    const logEl = () => document.querySelector("#textchat .content");
    const msgs = () => [...(logEl()?.querySelectorAll(":scope > .message") || [])];
    const picked = () => msgs().filter(m => m.classList.contains("r20cap-sel"));
    const ICON = {
        cam: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>',
        x: '<path d="M18 6 6 18M6 6l12 12"/>',
        copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
        load: '<path class="spin" d="M21 12a9 9 0 1 1-6.2-8.6"/>',
        ok: '<path d="M20 6 9 17l-5-5"/>',
        bad: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>'
    };
    const svg = k => `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;
    let busy = false, note = "", noteT = 0;
    const capBtn = () => document.getElementById("custom-capture-toggle");
    const copyBtn = () => document.getElementById("custom-capture-copy");
    const paint = (b, bg, fg) => { b.style.setProperty("background-color", bg, "important"); b.style.setProperty("color", fg, "important"); };
    const IDLE_BG = "rgba(136,136,136,0.07)", IDLE_FG = "#aaa";
    const update = () => {
        const mb = capBtn(), cb = copyBtn();
        if (!mb || !cb) return;
        const n = picked().length;
        cb.style.display = on ? "flex" : "none";
        cb.disabled = !n || busy;
        cb.innerHTML = svg(busy ? "load" : "copy") + (n ? `<b>${n}</b>` : "");
        paint(cb, n ? CONFIG.activeBg : IDLE_BG, n ? CONFIG.activeText : IDLE_FG);
        mb.innerHTML = svg(note || (on ? "x" : "cam"));
        paint(mb, on ? "rgba(225,0,133,0.12)" : IDLE_BG, note === "ok" ? "#2e8b57" : note === "bad" ? "#c0392b" : on ? CONFIG.activeBg : IDLE_FG);
        const tip = note === "ok" ? "클립보드에 복사했어요" : note === "bad" ? "복사하지 못했어요 — 다시 눌러 주세요"
            : on ? "캡처 그만두기 (Esc)" : "대화 캡처: 메시지를 눌러 고르고(Shift: 범위) 이미지로 복사";
        mb.title = tip; mb.setAttribute("aria-label", tip);
    };
    const blink = k => { clearTimeout(noteT); note = k; update(); noteT = setTimeout(() => { note = ""; update(); }, 1400); };
    const start = () => {
        if (on) return;
        on = true; last = null;
        document.getElementById("textchat")?.classList.add("r20cap-on");
        update();
    };
    const stop = () => {
        on = false;
        document.getElementById("textchat")?.classList.remove("r20cap-on");
        msgs().forEach(m => m.classList.remove("r20cap-sel"));
        update();
    };
    // 고르는 동안 메시지를 누르면 고르기만 한다 (링크·단추 등 Roll20 동작은 막는다)
    document.addEventListener("click", e => {
        if (!on) return;
        const m = e.target.closest?.("#textchat .content > .message");
        if (!m) return;
        e.preventDefault(); e.stopPropagation();
        const list = msgs();
        if (e.shiftKey && last && list.includes(last)) {
            const a = list.indexOf(last), z = list.indexOf(m);
            list.slice(Math.min(a, z), Math.max(a, z) + 1).forEach(x => x.classList.add("r20cap-sel"));
        } else m.classList.toggle("r20cap-sel");
        last = m;
        update();
    }, true);
    // Shift+클릭이 글자를 끌어 고르지 않게
    document.addEventListener("mousedown", e => { if (on && e.target.closest?.("#textchat .content > .message")) e.preventDefault(); }, true);
    document.addEventListener("keydown", e => { if (on && e.key === "Escape") stop(); }, true);

    // ── 그리기 (domShot 공용) ──
    const render = async list => {
        const lg = logEl();
        // 맨 바깥: 채팅창 글꼴·색·배경을 그대로 (투명하면 흰 바탕)
        const bg = [lg, lg.parentElement, document.getElementById("textchat")].map(x => x && getComputedStyle(x).backgroundColor).find(c => c && c !== "rgba(0, 0, 0, 0)") || "#fff";
        // 고른 표시는 빼고 계산된 스타일을 읽는다
        document.getElementById("textchat")?.classList.remove("r20cap-on");
        list.forEach(m => m.classList.remove("r20cap-sel"));
        let shot;
        try { shot = domShot.clone(list, lg, lg.clientWidth, bg); }
        finally { list.forEach(m => m.classList.add("r20cap-sel")); if (on) document.getElementById("textchat")?.classList.add("r20cap-on"); }
        return domShot.paint(shot, (w, h) => h * 2 <= 16000 ? 2 : Math.max(0.5, 16000 / h));       // 선명하게, 너무 길면 줄여서
    };
    const copy = async () => {
        const list = picked();
        if (!list.length || busy) return;
        busy = true; update();
        try {
            // 누른 순간에 클립보드 쓰기를 시작해야 브라우저가 허락한다 (그림은 만들어지는 대로 넘긴다)
            await navigator.clipboard.write([new ClipboardItem({ "image/png": render(list) })]);
            busy = false;
            stop();
            blink("ok");
        } catch (e) {
            console.warn("[대화 캡처] 실패:", e);
            busy = false;
            blink("bad");
        }
    };
    // 말하는 사람 줄: [저널] [복사(고른 개수) — 고르는 동안만] [캡처 ↔ 그만두기] [⚙]
    const inject = () => {
        const gear = document.getElementById("custom-settings-btn");
        if (!btnVisible.capture || !gear || capBtn()) return;
        const mk = id => {
            const b = document.createElement("button");
            b.type = "button";
            b.id = id;
            b.style.cssText = "width: 28px; min-width: 28px; border: none; border-left: 1px solid #ccc; padding: 0; display: flex; align-items: center; justify-content: center; gap: 2px; flex-shrink: 0; cursor: pointer;";
            b.addEventListener("click", e => {
                e.preventDefault(); e.stopPropagation();
                if (id === "custom-capture-copy") return copy();
                clearTimeout(noteT); note = "";
                on ? stop() : start();
            });
            return b;
        };
        const cb = mk("custom-capture-copy");
        cb.style.width = "auto"; cb.style.padding = "0 5px";
        cb.title = "고른 메시지를 이미지로 클립보드에 복사";
        cb.setAttribute("aria-label", "이미지로 복사");
        gear.before(cb, mk("custom-capture-toggle"));
        update();
    };
    const setEnabled = v => {
        if (v) return inject();
        if (on) stop();
        capBtn()?.remove(); copyBtn()?.remove();
    };
    return { inject, setEnabled };
})();

// ───────── 시트 촬영: 뺄 부분을 눌러 숨기고(아래가 위로 붙음) 찍기 → 미리보기에서 전체 또는 드래그로 고른 부분을 PNG 파일로 저장 (캐릭터 창 제목 옆 단추) ─────────
// 시트는 같은 출처 iframe 안에 그려진다 → 그 문서의 .charsheet 를 domShot 으로 찍는다. 스크롤에 가려진 곳까지 전부, 보고 있는 탭 그대로
const sheetShot = (() => {
    const ICON = {
        cam: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>',
        load: '<path class="spin" d="M21 12a9 9 0 1 1-6.2-8.6"/>',
        ok: '<path d="M20 6 9 17l-5-5"/>',
        bad: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>'
    };
    const TIP = { cam: "시트 촬영: 뺄 부분을 눌러 숨긴 뒤 찍기 → 미리보기에서 전체 또는 드래그한 부분을 PNG 파일로 저장", load: "찍는 중…", ok: "PNG 파일로 저장했어요",
        bad: "찍지 못했어요 — 다시 눌러 주세요", tab: "캐릭터 시트 탭을 연 채로 눌러 주세요" };
    const paint = (b, k, tip = TIP[k]) => {
        b.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;
        b.dataset.state = k;
        b.title = tip; b.setAttribute("aria-label", tip);
    };
    const blink = (b, k, tip) => { paint(b, k, tip); clearTimeout(b._t); b._t = setTimeout(() => paint(b, "cam"), 1800); };
    // 캔버스 한계(Chrome: 한 변 32767px · 넓이 268M 픽셀) 안에서 2배. 그보다 길면 한계에 맞춰 배율만 낮추고 자르지 않는다
    const FULL = (w, h) => Math.min(2, 0.999 * Math.min(32767 / w, 32767 / h, Math.sqrt(268435456 / (w * h))));
    const stamp = () => { const d = new Date(), p = n => String(n).padStart(2, "0"); return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`; };
    const download = (blob, file) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = file;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 30000);
    };

    // ── 미리보기: 찍은 시트 전체를 보여 주고, 드래그로 고른 부분 또는 전체를 저장 ──
    const preview = (blob, base, width, b) => {
        document.getElementById("r20ss")?.remove();
        const url = URL.createObjectURL(blob);
        const box = document.createElement("div");
        box.id = "r20ss";
        box.innerHTML = '<div class="r20ss-panel" role="dialog" aria-modal="true" aria-labelledby="r20ss-t">'
            + '<div class="r20ss-head"><strong id="r20ss-t"></strong><button type="button" class="r20ss-x" title="닫기 (Esc)" aria-label="닫기">✕</button></div>'
            + '<div class="r20ss-body"><div class="r20ss-pic"><img alt="시트 미리보기" draggable="false"><div class="r20ss-sel" style="display:none"></div></div></div>'
            + '<div class="r20ss-foot"><span class="r20ss-info" aria-live="polite"></span>'
            + '<button type="button" class="r20ss-all">전체 저장</button><button type="button" class="r20ss-part" disabled>고른 부분 저장</button></div></div>';
        const $ = s => box.querySelector(s);
        const body = $(".r20ss-body"), pic = $(".r20ss-pic"), img = $("img"), sel = $(".r20ss-sel"), info = $(".r20ss-info"), allB = $(".r20ss-all"), partB = $(".r20ss-part");
        $("#r20ss-t").textContent = "시트 촬영 · " + base;
        img.style.width = width + "px";            // 화면에서 본 크기 그대로 (좁으면 창 폭에 맞춰 줄어든다)
        img.src = url;
        let rect = null, drag = null;               // rect: 그림 위 표시 좌표(px)
        const ratio = () => img.naturalWidth / img.getBoundingClientRect().width;
        const show = () => {
            const ok = !!rect && rect.w >= 4 && rect.h >= 4;
            sel.style.display = ok ? "block" : "none";
            if (ok) Object.assign(sel.style, { left: zpx(rect.x), top: zpx(rect.y), width: zpx(rect.w), height: zpx(rect.h) });
            partB.disabled = !ok;
            partB.classList.toggle("pri", ok); allB.classList.toggle("pri", !ok);
            const k = ratio();
            info.textContent = ok ? `고른 부분 ${Math.round(rect.w * k)} × ${Math.round(rect.h * k)}px · 다시 끌면 새로 고름`
                : "그림 위를 드래그해서 저장할 부분을 고르세요";
        };
        const at = (cx, cy) => { const r = img.getBoundingClientRect(); return { x: Math.max(0, Math.min(r.width, cx - r.left)), y: Math.max(0, Math.min(r.height, cy - r.top)) }; };
        const move = () => {
            const p = at(drag.cx, drag.cy);
            rect = { x: Math.min(drag.x, p.x), y: Math.min(drag.y, p.y), w: Math.abs(p.x - drag.x), h: Math.abs(p.y - drag.y) };
            show();
        };
        // 위 · 아래 가장자리 가까이 끌고 있으면 저절로 스크롤 (긴 시트)
        const tick = () => {
            if (!drag) return;
            const r = body.getBoundingClientRect(), d = drag.cy < r.top + 40 ? -1 : drag.cy > r.bottom - 40 ? 1 : 0;
            if (d) { body.scrollTop += d * 16; move(); }
            requestAnimationFrame(tick);
        };
        pic.addEventListener("pointerdown", e => {
            if (e.button !== 0) return;
            e.preventDefault();
            pic.setPointerCapture(e.pointerId);
            const p = at(e.clientX, e.clientY);
            drag = { x: p.x, y: p.y, cx: e.clientX, cy: e.clientY };
            move(); tick();
        });
        pic.addEventListener("pointermove", e => { if (drag) { drag.cx = e.clientX; drag.cy = e.clientY; move(); } });
        const end = () => { if (!drag) return; drag = null; if (rect && (rect.w < 4 || rect.h < 4)) rect = null; show(); };
        pic.addEventListener("pointerup", end);
        pic.addEventListener("pointercancel", end);
        const crop = () => {
            const k = ratio(), sx = Math.round(rect.x * k), sy = Math.round(rect.y * k);
            const sw = Math.min(img.naturalWidth - sx, Math.max(1, Math.round(rect.w * k))), sh = Math.min(img.naturalHeight - sy, Math.max(1, Math.round(rect.h * k)));
            const cv = document.createElement("canvas");
            cv.width = sw; cv.height = sh;
            cv.getContext("2d").drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
            return new Promise((res, rej) => cv.toBlob(x => x ? res(x) : rej(new Error("toBlob 실패")), "image/png"));
        };
        const close = () => {
            box.remove();
            URL.revokeObjectURL(url);
            document.removeEventListener("keydown", onKey, true);
            if (b.isConnected) b.focus();
        };
        // Esc 로 닫기, Tab 은 창 안에서만 돈다. 그 밖의 키는 Roll20 단축키로 새지 않게 막는다
        const onKey = e => {
            if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); return close(); }
            if (e.key !== "Tab") return;
            const f = [...box.querySelectorAll("button:not(:disabled)")], i = f.indexOf(document.activeElement);
            e.preventDefault();
            f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length]?.focus();
        };
        document.addEventListener("keydown", onKey, true);
        box.addEventListener("keydown", e => e.stopPropagation());
        box.addEventListener("mousedown", e => { if (e.target === box) close(); });
        $(".r20ss-x").addEventListener("click", close);
        allB.addEventListener("click", () => { download(blob, `${base}_${stamp()}.png`); close(); blink(b, "ok"); });
        partB.addEventListener("click", async () => {
            try { download(await crop(), `${base}_${stamp()}_부분.png`); close(); blink(b, "ok"); }
            catch (e) { console.warn("[시트 촬영] 자르기 실패:", e); info.textContent = "저장하지 못했어요 — 다시 눌러 주세요"; }
        });
        document.body.appendChild(box);
        img.decode().catch(() => {}).then(show);
        allB.focus();
    };

    // ── 숨길 부분 고르기: 실제 시트에서 덩어리를 눌러 잠깐 숨긴다(아래가 위로 붙는다) → 찍기 → 미리보기. 닫으면 시트는 그대로 돌아온다 ──
    // 시트 종류별로 숨긴 자리(시트 안 경로 + 클래스)를 기억해 두면 같은 시트의 다른 캐릭터에도 처음부터 적용한다
    const MEM_KEY = "r20_sheetshot_hide";
    const memLoad = () => { try { return JSON.parse(localStorage.getItem(MEM_KEY)) || {}; } catch (e) { return {}; } };
    const memSave = m => { try { localStorage.setItem(MEM_KEY, JSON.stringify(m)); } catch (e) { /* 저장 공간 없음 */ } };
    const clsOf = e => String(e.className?.baseVal ?? e.className ?? "").replace(/\br20ss-\S+/g, "").trim();
    // 시트 종류: 맨 위 몇 층의 태그 · 클래스 모양 (반복 섹션 줄 수와 무관)
    const kindOf = sheet => {
        let s = "";
        const walk = (e, d) => { for (const c of e.children) { if (s.length > 4000) return; s += `${d}${c.localName}.${clsOf(c)};`; if (d < 2 && !c.classList.contains("repcontainer")) walk(c, d + 1); } };
        walk(sheet, 0);
        let h = 5381;
        for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
        return h.toString(36);
    };
    const pathOf = (el, root) => { const p = []; for (let e = el; e && e !== root; e = e.parentElement) p.unshift(`${e.localName}:nth-child(${[...e.parentElement.children].indexOf(e) + 1})`); return ":scope > " + p.join(" > "); };
    let mode = null;
    const BLOCK = ["mousedown", "mouseup", "click", "dblclick", "pointerdown", "pointerup", "contextmenu", "dragstart", "touchstart"];
    const pick = (dlg, b) => {
        if (mode) { const same = mode.dlg === dlg; mode.exit(); if (same) return; }      // 다시 누르면 그만두기
        if (b.dataset.state === "load") return;
        let doc = null;
        try { doc = dlg.querySelector(".characterdialog iframe")?.contentDocument; } catch (e) { /* 다른 출처 */ }
        const sheet = doc && [...doc.querySelectorAll(".charsheet")].find(e => e.getClientRects().length);
        if (!sheet) return blink(b, "bad", TIP.tab);
        const win = doc.defaultView, kind = kindOf(sheet), hidden = [];
        let hov = null, level = 0, cand = null, note = "";
        // 고르는 동안만: 숨김 규칙 · 테두리 상자 (시트 밖 body 에 두어 찍히지 않는다)
        const css = doc.createElement("style");
        css.textContent = ".r20ss-hide{display:none!important}";
        doc.head.appendChild(css);
        const hl = doc.createElement("div");
        hl.style.cssText = "position:fixed;display:none;pointer-events:none;z-index:2147483647;border:2px solid #e10085;background:rgba(225,0,133,0.12);box-sizing:border-box;border-radius:2px";
        doc.body.appendChild(hl);
        const bar = document.createElement("div");
        bar.id = "r20ss-bar";
        bar.setAttribute("role", "toolbar");
        bar.setAttribute("aria-label", "시트 촬영: 숨길 부분 고르기");
        bar.innerHTML = '<span class="r20ss-hint" aria-live="polite"></span>'
            + '<span class="r20ss-grp"><button type="button" data-a="up" title="바깥 상자로 넓히기 (↑)">▲ 넓히기</button><button type="button" data-a="down" title="안쪽으로 좁히기 (↓)">▼</button></span>'
            + '<span class="r20ss-grp"><b class="r20ss-n"></b><button type="button" data-a="undo" title="마지막에 숨긴 것 되돌리기 (Ctrl+Z)">되돌리기</button><button type="button" data-a="all">모두</button></span>'
            + '<label class="r20ss-mem"><input type="checkbox"> 이 시트 종류에 기억</label>'
            + '<span class="r20ss-grp"><button type="button" data-a="cancel" title="그만두기 (Esc)">취소</button><button type="button" data-a="shot" class="pri">찍기 ▶</button></span>';
        const hint = bar.querySelector(".r20ss-hint"), num = bar.querySelector(".r20ss-n"), mem = bar.querySelector(".r20ss-mem input");
        mem.checked = localStorage.getItem("r20_sheetshot_remember") !== "false";
        mem.addEventListener("change", () => localStorage.setItem("r20_sheetshot_remember", String(mem.checked)));
        const status = () => {
            num.textContent = `숨김 ${hidden.length}`;
            bar.querySelector('[data-a="undo"]').disabled = bar.querySelector('[data-a="all"]').disabled = !hidden.length;
            if (cand) { const r = cand.getBoundingClientRect(); hint.textContent = `누르면 숨김: ${cand.localName}${clsOf(cand) ? "." + clsOf(cand).split(/\s+/)[0] : ""} (${Math.round(r.width)}×${Math.round(r.height)}) · ↑↓ 크기`; }
            else hint.textContent = note || "숨길 부분을 누르세요 · ↑↓ 로 덩어리 크기";
        };
        // 마우스 아래 요소에서 level 층 위 (시트 자체는 고르지 않는다)
        const draw = () => {
            cand = null;
            if (hov && sheet.contains(hov) && hov !== sheet) {
                let e = hov;
                for (let i = 0; i < level && e.parentElement && e.parentElement !== sheet; i++) e = e.parentElement;
                cand = e;
            }
            if (cand) { const r = cand.getBoundingClientRect(); Object.assign(hl.style, { display: "block", left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" }); }
            else hl.style.display = "none";
            status();
        };
        const hide = el => { el.classList.add("r20ss-hide"); hidden.push({ el, p: pathOf(el, sheet), c: clsOf(el) }); note = ""; };
        const undo = () => { hidden.pop()?.el.classList.remove("r20ss-hide"); note = ""; draw(); };
        const unhideAll = () => { while (hidden.length) hidden.pop().el.classList.remove("r20ss-hide"); note = ""; };
        const onMove = e => { hov = e.target; draw(); };
        const onBlock = e => {
            if (!sheet.contains(e.target)) return;
            e.preventDefault(); e.stopImmediatePropagation();
            if (e.type === "click" && cand) { hide(cand); hov = null; level = 0; draw(); }
        };
        const onKey = e => {
            const k = e.key;
            if (k === "Escape") exit();
            else if (k === "ArrowUp") { level++; draw(); }
            else if (k === "ArrowDown") { level = Math.max(0, level - 1); draw(); }
            else if (k.toLowerCase() === "z" && (e.ctrlKey || e.metaKey)) undo();
            else return;
            e.preventDefault(); e.stopPropagation();
        };
        BLOCK.forEach(t => win.addEventListener(t, onBlock, true));
        win.addEventListener("mousemove", onMove, true);
        doc.addEventListener("scroll", draw, true);
        win.addEventListener("keydown", onKey, true);
        document.addEventListener("keydown", onKey, true);
        const exit = () => {
            if (mode !== api) return;
            mode = null;
            unhideAll();
            BLOCK.forEach(t => win.removeEventListener(t, onBlock, true));
            win.removeEventListener("mousemove", onMove, true);
            doc.removeEventListener("scroll", draw, true);
            win.removeEventListener("keydown", onKey, true);
            document.removeEventListener("keydown", onKey, true);
            css.remove(); hl.remove(); bar.remove();
            b.classList.remove("on");
        };
        const shot = async () => {
            if (!sheet.isConnected) return exit();
            const m = memLoad();
            if (mem.checked && hidden.length) m[kind] = hidden.map(({ p, c }) => ({ p, c })); else delete m[kind];
            memSave(m);
            hl.style.display = "none";
            bar.querySelectorAll("button").forEach(x => { x.disabled = true; });
            hint.textContent = "찍는 중…";
            paint(b, "load");
            let res = null;
            try { res = await capture(dlg, sheet, doc); }
            catch (e) { console.warn("[시트 촬영] 실패:", e); }
            exit();
            if (!res) return blink(b, "bad");
            paint(b, "cam");
            preview(res.blob, res.base, res.width, b);
        };
        bar.addEventListener("click", e => {
            const a = e.target.closest("button")?.dataset.a;
            if (a === "up") { level++; draw(); } else if (a === "down") { level = Math.max(0, level - 1); draw(); }
            else if (a === "undo") undo(); else if (a === "all") { unhideAll(); draw(); }
            else if (a === "cancel") exit(); else if (a === "shot") shot();
        });
        const api = { dlg, exit };
        mode = api;
        // 기억해 둔 자리: 같은 경로에 같은 클래스인 것만 다시 숨긴다 (시트가 바뀌었으면 건너뜀)
        (memLoad()[kind] || []).forEach(({ p, c }) => {
            let el = null;
            try { el = sheet.querySelector(p); } catch (e) { /* 잘못된 경로 */ }
            if (el && clsOf(el) === c && !el.classList.contains("r20ss-hide")) hide(el);
        });
        document.body.appendChild(bar);
        b.classList.add("on");
        if (hidden.length) note = `기억해 둔 ${hidden.length}곳을 숨겼어요 · 더 누르거나 되돌리기`;
        draw();
        bar.querySelector('[data-a="shot"]').focus();
    };

    const capture = async (dlg, sheet, doc) => {
        const win = doc.defaultView, chain = [];
        for (let e = sheet; e; e = e.parentElement) chain.push(e);
        const bg = chain.map(e => win.getComputedStyle(e).backgroundColor).find(c => c && c !== "rgba(0, 0, 0, 0)" && c !== "transparent") || "#fff";
        const width = Math.ceil(sheet.getBoundingClientRect().width);
        const blob = await domShot.paint(domShot.clone([sheet], sheet.parentElement, width, bg), FULL);
        const base = (dlg.querySelector(".ui-dialog-title")?.textContent || "").trim().replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "_").slice(0, 80) || "character";
        return { blob, base, width };
    };
    // 캐릭터 창(.characterdialog 안의 시트 iframe)의 제목 옆에 단추 하나
    const inject = () => {
        if (!btnVisible.sheetshot) return;
        document.querySelectorAll(".ui-dialog").forEach(dlg => {
            const bar = dlg.querySelector(":scope > .ui-dialog-titlebar");
            if (!bar || bar.querySelector(".r20shot") || !dlg.querySelector(".characterdialog iframe")) return;
            const b = document.createElement("button");
            b.type = "button";
            b.className = "r20shot";
            paint(b, "cam");
            b.addEventListener("mousedown", e => e.stopPropagation());        // 창 끌기 시작 막기
            b.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); pick(dlg, b); });
            const t = bar.querySelector(".ui-dialog-title");
            t ? t.after(b) : bar.prepend(b);
        });
    };
    const setEnabled = v => { if (v) return inject(); mode?.exit(); document.querySelectorAll(".r20shot").forEach(b => b.remove()); document.getElementById("r20ss")?.remove(); };
    return { inject, setEnabled, watch: ".ui-dialog" };
})();

// @share-swap-start logBackup — 배포판은 share/logBackup.share.js 로 바꾼다 (홈페이지 전용 문법)
// ───────── 로그 백업: 채팅을 홈페이지 '세션 로그' 문법 글로 바꿔 클립보드에 (그림은 주소만 · 명단은 따로) ─────────
// 채팅 아카이브 페이지(/campaigns/chatarchive)에만 단추를 띄운다(archive). 편집기 화면에는 아무것도 안 붙인다.
// 범위는 기본이 아카이브 전체, '시작 · 끝 찍기'로 자른다.
// 첫 줄 [R20] = 홈페이지가 이 글에서는 '굴림 · 장면 표' 같은 낱말로 줄 종류를 추측하지 않는다
const logBackup = (() => {
    const SEL = ".content > .message";
    const msgs = () => [...document.querySelectorAll(SEL)];
    let pop = null, ra = null, rb = null, mode = null, noWhisper = true;       // ra · rb: 시작 · 끝 메시지 (null = 처음 · 끝)
    const ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>';
    const btn = () => document.getElementById("custom-logbak-toggle");

    // ── 바꾸기 ──
    const abs = u => { try { return r20img(new URL(u, location.href).href); } catch (e) { return ""; } };
    const tokSafe = s => String(s).replace(/\[/g, "［").replace(/\]/g, "］").replace(/\|/g, "¦");     // [[…|…]] 문법을 깨지 않게 (표 굴림 1t[표이름] 등)
    // 이모지처럼 4바이트 글자는 &#x…; 로 (홈페이지 DB 가 utf8(3바이트)이면 ???? 로 저장된다 — 홈페이지가 다시 글자로 그린다)
    const ent = s => s.replace(/[\u{10000}-\u{10FFFF}]/gu, c => "&#x" + c.codePointAt(0).toString(16).toUpperCase() + ";");
    const urlSafe = u => u.replace(/\]/g, "%5D").replace(/\|/g, "%7C");
    const SKIP = new Set(["avatar", "tstamp", "by", "spacer", "flyout", "clear"]);
    const BLOCK = /^(DIV|P|TR|TABLE|TBODY|THEAD|UL|OL|LI|H[1-6]|SECTION|BLOCKQUOTE|PRE|HR|DL|DT|DD)$/;
    // 꾸민 글자([글](#" style="…") 등): 홈페이지가 받는 속성만 남긴다 (같은 목록을 홈페이지도 거른다)
    const KEEP = new Set(["color", "background", "background-color", "font-size", "font-weight", "font-style", "font-family", "text-align", "text-decoration",
        "text-shadow", "letter-spacing", "line-height", "padding", "margin", "border", "border-radius", "box-shadow", "display"]);
    const parseStyle = st => {
        const o = {};
        String(st || "").split(";").forEach(d => { const i = d.indexOf(":"); if (i > 0) { const k = d.slice(0, i).trim().toLowerCase(), v = d.slice(i + 1).trim(); if (k && v) o[k] = v; } });
        return o;
    };
    const SADAM = parseStyle(SADAM_STYLE);
    const isSadam = o => ["font-size", "color"].every(k => (o[k] || "").replace(/\s/g, "").toLowerCase() === SADAM[k].toLowerCase());
    const styleOf = o => Object.entries(o).filter(([k, v]) => KEEP.has(k)
            && !(k === "text-decoration" && v === "none") && !(k === "display" && v === "inline")
            && !/url\s*\(|expression|javascript|[<>{}\\\]|]/i.test(v))
        .map(([k, v]) => `${k}:${v.replace(/"/g, "'")}`).join(";");
    let styles = null;          // 바꾸는 동안 쓴 꾸밈 (같은 것이 여러 번이면 맨 위에 한 번만 적고 이름으로 부른다)
    const deco = (st, inner) => {
        if (!inner.trim()) return inner;
        const o = parseStyle(st);
        if (isSadam(o)) return `((${inner}))`;
        const s = styleOf(o);
        if (!s) return inner;
        if (/^color:#[0-9a-f]{3,6}$/i.test(s)) return `[[색:${s.slice(6)}]]${inner}[[/색]]`;
        let i = styles.indexOf(s);
        if (i < 0) i = styles.push(s) - 1;
        return `[[꾸밈:\u0001${i}\u0001]]${inner}[[/꾸밈]]`;
    };
    const rollChip = el => {
        const d = (el.getAttribute("title") || "").replace(/<[^>]*>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
            .replace(/^\s*Rolling\s+/i, "").replace(/\s+/g, " ").trim();
        const r = el.textContent.trim();
        return d ? `[[굴림:${tokSafe(r)}|${tokSafe(d)}]]` : `[[굴림:${tokSafe(r)}]]`;
    };
    // 노드 → 글 (줄바꿈은 \n). tpl: 롤템플릿 안 (꾸밈 그림 · 숨긴 칸은 뺀다)
    const text = (node, tpl) => {
        if (node.nodeType === 3) return node.nodeValue.replace(/[\s ]+/g, " ");
        if (node.nodeType !== 1) return "";
        const el = node, tag = el.tagName;
        if ([...el.classList].some(c => SKIP.has(c)) || /^(SCRIPT|STYLE|INPUT|BUTTON|TEXTAREA|SELECT)$/.test(tag)) return "";
        if (tpl && getComputedStyle(el).display === "none") return "";
        if (tag === "BR") return "\n";
        if (el.classList.contains("inlinerollresult")) return rollChip(el);
        // 그림은 제 줄에 — 홈페이지에서 제 크기(넓으면 칸 폭까지)로 보인다
        if (tag === "IMG") {
            const u = abs(el.getAttribute("src"));
            if (tpl || !/^https?:/.test(u)) return "";
            const r = swap(u, "그림");
            return r ? `\n[[그림:${urlSafe(r)}]]\n` : "";
        }
        let s = [...el.childNodes].map(n => text(n, tpl)).join("");
        if ((tag === "B" || tag === "STRONG") && s.trim() && !s.includes("\n")) s = `**${s}**`;
        else if ((tag === "I" || tag === "EM") && s.trim() && !s.includes("\n")) s = `*${s}*`;
        const st = (tag === "A" || tag === "SPAN") && el.getAttribute("style");
        if (st) s = deco(st, s);
        // 꾸밈 없는 링크는 걷고 글자 · 그림만 남긴다 (Roll20 은 채팅 그림을 같은 주소 링크로 감싼다)
        if (BLOCK.test(tag)) s = "\n" + s + "\n";
        else if (tag === "TD" || tag === "TH") s = " " + s + " ";
        return s;
    };
    // 여러 줄로 나눌 때 줄마다 꾸밈 · 사담 짝을 닫고 다음 줄에서 다시 연다 (홈페이지는 줄 묶음마다 따로 그린다)
    const PAIR = /\[\[(?:꾸밈|색):[^\]]*\]\]|\[\[\/(?:꾸밈|색)\]\]|\(\(|\)\)/g;
    const closeOf = t => t === "((" ? "))" : t.startsWith("[[꾸밈") ? "[[/꾸밈]]" : "[[/색]]";
    const splitLines = s => {
        const out = [];
        let open = [];
        for (const raw of s.split("\n")) {
            const line = raw.replace(/\s+/g, " ").trim();
            if (!line) continue;
            const st = [...open];
            for (const [t] of line.matchAll(PAIR)) { if (t === "((" || !t.startsWith("[[/") && t !== "))") st.push(t); else st.pop(); }
            out.push(open.join("") + line + st.slice().reverse().map(closeOf).join(""));
            open = st;
        }
        return out;
    };
    // Roll20 저장소 그림(아바타 · 채팅 그림 · 마켓플레이스)은 홈페이지에 그대로 걸지 않는다 — Roll20 에 부담을 주지 않게.
    // 판에 '바꿀 그림' 목록으로 보여 주고, 사용자가 넣은 주소로 바꾼다 (비워 두면 뺀다). 넣은 주소는 이 브라우저에 기억해 둔다
    const R20 = /^https?:\/\/(?:[^/]*\.)?(?:roll20\.net|d20\.io)\/|^https?:\/\/s3\.amazonaws\.com\/files\.d20\.io\//i;
    const MAP_KEY = "r20lb_imgmap";
    let imgMap = {};
    try { imgMap = JSON.parse(localStorage.getItem(MAP_KEY)) || {}; } catch (e) {}
    const saveMap = () => { try { localStorage.setItem(MAP_KEY, JSON.stringify(imgMap)); } catch (e) {} };
    let found = null;           // 바꾸는 동안 만난 Roll20 그림: 주소 → 이름표
    const swap = (u, label) => {
        if (!R20.test(u)) return u;
        if (!found.has(u)) found.set(u, label);
        return imgMap[u] || "";
    };

    const convert = list => {
        styles = [];
        found = new Map();
        const out = [], cast = new Map();
        let who = "", lastWho = null;
        const block = s => { out.push(s); lastWho = null; };
        // 이름은 말하는 사람이 바뀔 때만. 홈페이지가 다른 줄로 오해할 수 있는 줄(: 이 있거나 :::, /, [, (( 로 시작)은 이름을 붙인다
        const say = (name, s) => splitLines(s).forEach(l => {
            const need = lastWho !== name || /[:：]/.test(l) || /^(:::|\/|\[|\(\()/.test(l);
            out.push(need ? `${name}: ${l}` : l);
            lastWho = name;
        });
        for (const m of list) {
            const c = m.classList;
            if (noWhisper && (c.contains("whisper") || c.contains("private"))) continue;
            if (c.contains("system")) continue;
            const by = m.querySelector(":scope > .by");
            if (by) {
                who = by.textContent.replace(/[:：]\s*$/, "").trim() || who;
                const av = m.querySelector(":scope > .avatar img")?.getAttribute("src");
                if (who && av && !cast.has(who)) cast.set(who, swap(abs(av), "아바타 · " + who));
            }
            const name = who || "?";
            const tpl = m.querySelector("[class^='sheet-rolltemplate-'], [class*=' sheet-rolltemplate-']");
            if (tpl) {
                // 줄마다 '항목: 값'. 굴림 칩만 있는 줄은 앞 줄 끝에 붙인다
                const rows = [];
                splitLines(text(tpl, true))
                    .forEach(x => { if (/^(\[\[굴림:[^\]]*\]\]\s*)+$/.test(x) && rows.length) rows[rows.length - 1] += " " + x; else rows.push(x); });
                block(`[ROLL:${name}]`); rows.forEach(r => out.push(r)); block("[/ROLL]");
                continue;
            }
            if (c.contains("rollresult")) {
                const f = (m.querySelector(".formula:not(.formattedformula)")?.textContent || "").replace(/^\s*rolling\s+/i, "").trim();
                const d = (m.querySelector(".formattedformula")?.textContent || "").replace(/\s+/g, "").trim();
                const r = (m.querySelector(".rolled")?.textContent || "").trim();
                block(`[ROLL:${name}]`); out.push(`${tokSafe(f)} [[굴림:${tokSafe(r)}${d ? "|" + tokSafe(d) : ""}]]`); block("[/ROLL]");
                continue;
            }
            const body = [...m.childNodes].map(n => text(n)).join("");
            if (c.contains("desc")) { splitLines(body).forEach(l => out.push("/desc " + l)); lastWho = null; }
            else if (c.contains("emote")) { splitLines(body).forEach(l => out.push(":::" + l)); lastWho = null; }
            else say(name, body);
        }
        // 두 번 넘게 쓴 긴 꾸밈은 맨 위에 [[꾸밈정의:s1|…]] 로 한 번만
        const used = styles.map((s, i) => ({ s, n: out.reduce((a, l) => a + l.split(`\u0001${i}\u0001`).length - 1, 0) }));
        const defs = [];
        const name = used.map(({ s, n }) => n > 1 && s.length > 20 ? (defs.push(`[[꾸밈정의:s${defs.length + 1}|${s}]]`), "s" + defs.length) : s);
        const lines = ["[R20]", ...defs, ...out].map(l => ent(l.replace(/\u0001(\d+)\u0001/g, (x, i) => name[i])));
        return { text: lines.join("\n"), lines: lines.length, imgs: [...found],
            cast: [...cast].map(([n, u]) => `${ent(n.replace(/\|/g, "¦"))} | ${u}`).join("\n") };
    };

    // ── 범위 ──
    const range = () => {
        const all = msgs();
        let i = ra && all.includes(ra) ? all.indexOf(ra) : 0, j = rb && all.includes(rb) ? all.indexOf(rb) : all.length - 1;
        if (i > j) [i, j] = [j, i];
        return { all, list: all.slice(i, j + 1), i, j };
    };
    const paintRange = () => {
        const { all, i, j } = range(), show = isOpen();
        all.forEach((m, k) => {
            m.classList.toggle("r20lb-out", show && (k < i || k > j));
            m.classList.toggle("r20lb-a", show && m === ra);
            m.classList.toggle("r20lb-b", show && m === rb);
        });
        document.body.classList.toggle("r20lb-pick", show && !!mode);
    };
    const kb = n => n >= 1024 ? (n / 1024).toFixed(n >= 10240 ? 0 : 1) + "KB" : n + "B";
    let cache = null;
    const refresh = () => {
        if (!pop) return;
        const { all, list } = range(), whole = list.length === all.length;
        cache = convert(list);
        pop.querySelector(".st").textContent = `${cache.lines.toLocaleString()}줄 · ${kb(new TextEncoder().encode(cache.text).length)}`;
        pop.querySelector(".hint").textContent = mode === "a" ? "채팅에서 시작할 메시지를 누르세요" : mode === "b" ? "채팅에서 끝낼 메시지를 누르세요"
            : whole ? `채팅 전체 (${all.length.toLocaleString()}개)` : `${list.length.toLocaleString()}개 메시지`;
        pop.querySelectorAll(".rg button[data-k]").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.k === mode)));
        const sw = pop.querySelector(".sw");
        sw.setAttribute("aria-checked", String(noWhisper));
        paintImgs();
        paintRange();
    };
    // 바꿀 그림 목록 — 입력 중에는 다시 그리지 않는다 (글자를 칠 때마다 칸이 사라지지 않게)
    const countImgs = () => {
        const n = cache.imgs.length, done = cache.imgs.filter(([u]) => imgMap[u]).length;
        pop.querySelector(".cnt").textContent = n ? `${done} / ${n}` : "";
    };
    const paintImgs = () => {
        const box = pop.querySelector(".imgs");
        box.replaceChildren(...cache.imgs.map(([u, label]) => {
            const row = document.createElement("div"), im = document.createElement("img"), b = document.createElement("b"), inp = document.createElement("input");
            im.src = u; im.alt = ""; im.loading = "lazy";
            b.textContent = label; b.title = u;
            inp.type = "url"; inp.placeholder = "바꿀 주소 https://…"; inp.value = imgMap[u] || "";
            inp.setAttribute("aria-label", label + " 바꿀 주소");
            row.classList.toggle("ok", !!imgMap[u]);
            inp.addEventListener("input", () => {
                const v = inp.value.trim();
                if (/^https?:\/\/\S+$/i.test(v)) imgMap[u] = v; else delete imgMap[u];
                row.classList.toggle("ok", !!imgMap[u]);
                saveMap();
                countImgs();
            });
            row.append(im, b, inp);
            return row;
        }));
        pop.querySelector(".noimg").hidden = cache.imgs.length > 0;
        countImgs();
    };
    const flash = (b, msg) => { const t = b.textContent; b.textContent = msg; b.disabled = true; setTimeout(() => { b.textContent = t; b.disabled = false; }, 1400); };

    // ── 판 ──
    const place = () => {
        if (!pop) return;
        Object.assign(pop.style, { right: "16px", bottom: "64px", width: "360px" });
    };
    const build = () => {
        pop = document.createElement("div");
        pop.id = "r20-logbak";
        pop.setAttribute("role", "dialog");
        pop.setAttribute("aria-label", "로그 백업");
        pop.innerHTML = '<div class="hd"><b>📜 로그 백업</b><span class="st"></span><button type="button" class="x" aria-label="닫기">✕</button></div>'
            + '<div class="bd"><div class="rg"><span>범위</span><button type="button" data-k="a">▶ 시작 찍기</button><button type="button" data-k="b">끝 찍기 ■</button><button type="button" data-k="all">전체</button></div>'
            + '<div class="hint" aria-live="polite"></div>'
            + '<button type="button" class="sw" role="switch"><i aria-hidden="true"></i>귓속말 · GM 굴림 빼기</button>'
            + '<div class="lbl">Roll20 저장소 그림 <b class="cnt"></b><br>바꿀 주소를 넣으면 그 주소로, 비워 두면 빼요 (아바타 · 채팅 그림)</div><div class="imgs"></div><div class="noimg">Roll20 저장소 그림이 없어요</div>'
            + '<div class="go"><button type="button" class="pri" data-go="log">로그 복사</button><button type="button" data-go="cast">명단 복사</button></div></div>';
        pop.addEventListener("click", async e => {
            const b = e.target.closest("button");
            if (!b) return;
            if (b.classList.contains("x")) return close();
            if (b.classList.contains("sw")) { noWhisper = !noWhisper; return refresh(); }
            const k = b.dataset.k, go = b.dataset.go;
            if (k === "all") { ra = rb = null; mode = null; return refresh(); }
            if (k) { mode = mode === k ? null : k; return refresh(); }
            if (go) {
                cache = convert(range().list);           // 방금 넣은 주소까지 (목록은 다시 그리지 않는다)
                countImgs();
                const ok = await copyText(go === "log" ? cache.text : cache.cast);
                flash(b, ok ? "복사했어요" : "복사 실패");
            }
        });
        document.body.appendChild(pop);
    };
    const isOpen = () => !!pop && !pop.hidden;
    const paintBtn = () => { const b = btn(); if (!b) return; b.style.color = isOpen() ? "#8a3d9e" : ""; b.setAttribute("aria-expanded", String(isOpen())); };
    const open = () => { if (!pop) build(); pop.hidden = false; place(); refresh(); paintBtn(); };
    const close = () => { if (!pop) return; pop.hidden = true; mode = null; paintRange(); paintBtn(); };
    // 찍는 동안 메시지를 누르면 시작 · 끝만 정한다 (Roll20 동작은 막는다)
    document.addEventListener("click", e => {
        if (!mode || !isOpen()) return;
        const m = e.target.closest?.(SEL);
        if (!m) return;
        e.preventDefault(); e.stopPropagation();
        if (mode === "a") ra = m; else rb = m;
        mode = null;
        refresh();
    }, true);
    document.addEventListener("keydown", e => { if (isOpen() && e.key === "Escape") { if (mode) { mode = null; refresh(); } else close(); } }, true);
    window.addEventListener("resize", () => isOpen() && place());

    // 채팅 아카이브 페이지: 오른쪽 아래 떠 있는 단추 하나 (설정에서 이 묶음을 끄면 안 띄운다)
    const archive = () => {
        if (!btnVisible.logbak) return;
        const st = document.createElement("style");
        st.textContent = LB_CSS;
        document.head.appendChild(st);
        const b = document.createElement("button");
        b.type = "button";
        b.id = "custom-logbak-toggle";
        b.title = "로그 백업: 채팅을 홈페이지 세션 로그 글로";
        b.setAttribute("aria-label", "로그 백업");
        b.innerHTML = ICON;
        b.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); isOpen() ? close() : open(); });
        b.classList.add("r20lb-float");
        document.body.appendChild(b);
    };
    return { archive };
})();

const LB_CSS = `
        #r20-logbak { position:fixed; z-index:10006; display:flex; flex-direction:column; max-height:calc(70vh / var(--aio-z, 1)); background:#fff; border:1px solid #ccc; border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,0.2); font:12px/1.5 sans-serif; color:#333; }
        #r20-logbak[hidden] { display:none; }
        #r20-logbak .hd { display:flex; align-items:center; gap:6px; padding:6px 8px; border-bottom:1px solid #eee; }
        #r20-logbak .hd b { font-size:12px; }
        #r20-logbak .st { flex:1; color:#888; font-size:11px; }
        #r20-logbak button { height:22px; margin:0; padding:0 9px; border:1px solid #ccc; border-radius:4px; background:#fff; color:#333; font:700 11px/20px sans-serif; cursor:pointer; }
        #r20-logbak button:focus-visible { outline:2px solid #8a3d9e; outline-offset:1px; }
        #r20-logbak button[aria-pressed=true] { background:#8a3d9e; border-color:#8a3d9e; color:#fff; }
        #r20-logbak button:disabled { opacity:.7; cursor:default; }
        #r20-logbak .x { padding:0 6px; }
        #r20-logbak .bd { display:flex; flex-direction:column; gap:6px; padding:6px 8px 8px; overflow-y:auto; }
        #r20-logbak .rg { display:flex; align-items:center; gap:4px; flex-wrap:wrap; }
        #r20-logbak .rg span, #r20-logbak .lbl { color:#888; font-size:11px; }
        #r20-logbak .hint { min-height:18px; color:#8a3d9e; font-size:11px; }
        #r20-logbak .sw { display:flex; align-items:center; gap:6px; align-self:flex-start; padding:0; border:0; background:none; font-weight:400; }
        #r20-logbak .sw i { position:relative; width:26px; height:14px; border-radius:7px; background:#c8c8cc; }
        #r20-logbak .sw i::after { content:""; position:absolute; top:2px; left:2px; width:10px; height:10px; border-radius:50%; background:#fff; transition:left .15s; }
        #r20-logbak .sw[aria-checked=true] i { background:#e10085; }
        #r20-logbak .sw[aria-checked=true] i::after { left:14px; }
        #r20-logbak .lbl b { color:#8a3d9e; }
        #r20-logbak .imgs { display:flex; flex-direction:column; gap:4px; }
        #r20-logbak .imgs > div { display:flex; align-items:center; gap:6px; min-width:0; }
        #r20-logbak .imgs img { width:24px; height:24px; flex-shrink:0; border-radius:4px; object-fit:cover; background:#eee; }
        #r20-logbak .imgs b { flex:0 0 96px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; font-size:11px; font-weight:700; }
        #r20-logbak .imgs input { flex:1; min-width:0; height:22px; margin:0; padding:0 6px; border:1px solid #ccc; border-radius:4px; font:11px/20px sans-serif; color:#333; background:#fff; }
        #r20-logbak .imgs input:focus { outline:2px solid #8a3d9e; outline-offset:-1px; border-color:#8a3d9e; }
        #r20-logbak .imgs .ok input { border-color:#2e8b57; background:#f1fbf5; }
        #r20-logbak .noimg { color:#aaa; font-size:11px; }
        #r20-logbak .go { display:flex; gap:5px; margin-top:2px; }
        #r20-logbak .go .pri { background:#e10085; border-color:#e10085; color:#fff; }
        /* 범위: 밖은 흐리게, 시작 · 끝에 표시 */
        .message.r20lb-out { opacity:.3; }
        .message.r20lb-a, .message.r20lb-b { position:relative; }
        .message.r20lb-a::before, .message.r20lb-b::after { position:absolute; right:4px; z-index:1; padding:0 6px; border-radius:8px; background:#8a3d9e; color:#fff; font:700 9.5px/15px sans-serif; pointer-events:none; }
        .message.r20lb-a::before { content:"▶ 여기부터"; top:-2px; }
        .message.r20lb-b::after { content:"여기까지 ■"; bottom:-2px; }
        body.r20lb-pick .message { cursor:crosshair; }
        body.r20lb-pick .message:hover { outline:2px dashed #8a3d9e; outline-offset:-2px; }
        .r20lb-float { position:fixed; right:16px; bottom:16px; z-index:10006; width:40px; height:40px; display:flex; align-items:center; justify-content:center; padding:0; border:1px solid #ccc; border-radius:50%; background:#fff; color:#8a3d9e; box-shadow:0 2px 8px rgba(0,0,0,.2); cursor:pointer; }
        .r20lb-float svg { width:18px; height:18px; }
`;
// @share-swap-end logBackup

// ── 새 선(Jumpgate 그리기 도구): path 가 비고 points · shape(free · pol · rec · eli) · x/y(점들 상자의 가운데)로 저장된다 (실제 진단 11-04)
//    맵 촬영 · 맵 맞추기가 같이 쓴다. 예전 선은 path · left/top 그대로
const pathPts = m => {
    if (m.get("path")) return null;
    try { const p = JSON.parse(m.get("points") || "null"); return Array.isArray(p) && p.length ? p.map(([x, y]) => [+x, +y]) : null; } catch (e) { return null; }
};
const ptsBox = pts => ({ x0: Math.min(...pts.map(p => p[0])), y0: Math.min(...pts.map(p => p[1])), x1: Math.max(...pts.map(p => p[0])), y1: Math.max(...pts.map(p => p[1])) });

// ───────── 맵 촬영: 보고 있는 페이지의 맵·토큰 레이어(그림 + 펜으로 그린 선 + 글자)를 순서대로 다시 그려 PNG 로 클립보드에 ─────────
// 화면을 찍는 게 아니라 Roll20 데이터로 그리므로 GM 레이어 · 조명 · 안개 · 격자 · 화면 UI 는 들어가지 않는다
const mapShot = (() => {
    const ICON = {
        map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
        up: '<path d="M12 15V4"/><path d="m7 9 5-5 5 5"/><path d="M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3"/>',
        pgset: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
        cam: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><path d="M8 13l2.5-2.5L13 13l2-2 3 3"/>',
        fit: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/><rect x="9" y="9" width="6" height="6" rx="1"/>',
        load: '<path class="spin" d="M21 12a9 9 0 1 1-6.2-8.6"/>',
        ok: '<path d="M20 6 9 17l-5-5"/>',
        warn: '<path d="M20 6 9 17l-5-5"/><circle cx="19" cy="19" r="2" fill="currentColor"/>',
        bad: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>'
    };
    const svg = k => `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;
    const box = () => document.getElementById("r20-mapshot");
    const btn = () => box()?.querySelector(".shot");
    let busy = false, noteT = 0;
    const show = (k, tip) => {
        const b = btn();
        if (!b) return;
        b.innerHTML = svg(k);
        b.dataset.state = k;
        b.title = tip;
        b.setAttribute("aria-label", tip);
    };
    const idle = () => show("cam", "맵 촬영: 맵·토큰 레이어를 이미지로 클립보드에 복사");
    const note = (k, tip) => { clearTimeout(noteT); show(k, tip); noteT = setTimeout(idle, 3000); };
    // Roll20 은 fetch 로 그림 서버에 못 가게 막혀 있어서 <img crossOrigin> 으로 받는다.
    // s3.amazonaws.com/files.d20.io 주소는 CORS 가 안 될 수 있어 files.d20.io 로 먼저 받아 보고,
    // 그다음 원래 주소, 마지막으로 (CORS 없이 캐시된 경우를 피해) 주소 끝을 바꿔 받는다
    const loadOne = u => new Promise(res => {
        const im = new Image();
        im.crossOrigin = "anonymous";
        im.onload = () => res(im);
        im.onerror = () => res(null);
        im.src = u;
    });
    // 움직이는 그림(webm · mp4)은 <img> 로 못 그려서 <video> 로 받아 첫 장면을 그린다
    const loadVid = u => new Promise(res => {
        const v = document.createElement("video");
        let t = 0;
        const fin = ok => { clearTimeout(t); v.onloadeddata = v.onerror = null; res(ok ? v : null); };
        t = setTimeout(() => fin(false), 15000);
        v.crossOrigin = "anonymous"; v.muted = true; v.playsInline = true; v.preload = "auto";
        v.onloadeddata = () => fin(v.videoWidth > 0);
        v.onerror = () => fin(false);
        v.src = u + "#t=0.1";        // 맨 처음 장면은 검은 경우가 있어 조금 뒤 (미리보기와 같은 값)
    });
    let failed = [];
    const load = async u => {
        const cands = [...new Set([r20img(u), u, u + (u.includes("?") ? "&" : "?") + "r20ms=" + Date.now()])];
        const vid = isAnimVideo(u);
        // 그림 주소는 <img> 로 먼저, 안 되면 <video> 로 한 번 더 (확장자가 안 맞는 움직이는 그림)
        for (const kind of vid ? ["video"] : ["img", "video"]) {
            for (const c of cands) {
                const im = await (kind === "img" ? loadOne(c) : loadVid(c));
                if (im) return im;
            }
        }
        failed.push(u);
        return null;
    };
    const num = (m, k, d = 0) => { const v = parseFloat(m.get(k)); return Number.isFinite(v) ? v : d; };
    const usable = c => c && c !== "transparent" && c !== "none";
    const paint = (ctx, p) => {
        if (usable(p.get("fill"))) { ctx.fillStyle = p.get("fill"); ctx.fill(); }
        const sw = num(p, "stroke_width", 0);
        if (sw > 0 && usable(p.get("stroke"))) { ctx.lineWidth = sw; ctx.strokeStyle = p.get("stroke"); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke(); }
    };
    // 새 선: 점들 상자의 가운데가 (x, y). rec · eli 는 두 점이 상자 모서리, pol 은 꺾은선, free 는 점 사이 가운데를 지나는 부드러운 곡선
    //   (Roll20 처럼 같은 점을 두 번 찍으면 모서리가 선다). 첫 점과 끝 점이 같으면 닫는다
    const drawPathV2 = (ctx, p, pts) => {
        const b = ptsBox(pts), shape = p.get("shape"), n = pts.length;
        ctx.save();
        ctx.translate(num(p, "x"), num(p, "y"));
        ctx.rotate(num(p, "rotation") * Math.PI / 180);
        ctx.scale(num(p, "scaleX", 1), num(p, "scaleY", 1));
        ctx.translate(-(b.x0 + b.x1) / 2, -(b.y0 + b.y1) / 2);
        ctx.beginPath();
        if (shape === "rec") ctx.rect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
        else if (shape === "eli") ctx.ellipse((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.x1 - b.x0) / 2, (b.y1 - b.y0) / 2, 0, 0, Math.PI * 2);
        else {
            ctx.moveTo(...pts[0]);
            if (shape === "free" && n > 2) {
                for (let i = 1; i < n - 1; i++) ctx.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
                ctx.lineTo(...pts[n - 1]);
            } else pts.slice(1).forEach(q => ctx.lineTo(...q));
            if (n > 2 && pts[0][0] === pts[n - 1][0] && pts[0][1] === pts[n - 1][1]) ctx.closePath();
        }
        paint(ctx, p);
        ctx.restore();
    };
    // 글자(T 도구): (left, top) 이 글자 덩어리의 가운데. 여러 줄은 덩어리 안에서 왼쪽 맞춤, 줄 간격은 글자 크기의 1.2배
    const fontOf = t => `${t.get("font_style") || ""} ${t.get("font_weight") || ""} ${num(t, "font_size", 16)}px "${t.get("font_family") || "Arial"}", sans-serif`.trim();
    const drawText = (ctx, t) => {
        const lines = String(t.get("text") ?? "").split(/\r?\n/);
        if (!lines.some(s => s.trim())) return;
        const fs = num(t, "font_size", 16), lh = fs * 1.2, st = t.get("stroke");
        ctx.save();
        ctx.translate(num(t, "left"), num(t, "top"));
        ctx.rotate(num(t, "rotation") * Math.PI / 180);
        ctx.font = fontOf(t);
        ctx.textAlign = "left"; ctx.textBaseline = "middle";
        const x0 = -Math.max(...lines.map(s => ctx.measureText(s).width)) / 2, y0 = -(lines.length - 1) * lh / 2;
        lines.forEach((s, i) => {
            if (usable(st)) { ctx.lineWidth = Math.max(1, fs / 12); ctx.strokeStyle = st; ctx.lineJoin = "round"; ctx.strokeText(s, x0, y0 + i * lh); }
            ctx.fillStyle = t.get("color") || "#000000";
            ctx.fillText(s, x0, y0 + i * lh);
        });
        ctx.restore();
    };
    // 펜 선: path 는 [["M",x,y],["L",x,y],["Q",..],["C",..]] — 점들의 가운데가 (left, top) 에 오도록 놓는다. 새 선은 drawPathV2
    const drawPath = (ctx, p) => {
        const pts = pathPts(p);
        if (pts) return drawPathV2(ctx, p, pts);
        let cmds;
        try { cmds = JSON.parse(p.get("path") || "[]"); } catch (e) { return; }
        if (!Array.isArray(cmds) || !cmds.length) return;
        const xs = [], ys = [];
        cmds.forEach(([, ...a]) => a.forEach((v, i) => (i % 2 ? ys : xs).push(+v)));
        if (!xs.length) return;
        ctx.save();
        ctx.translate(num(p, "left"), num(p, "top"));
        ctx.rotate(num(p, "rotation") * Math.PI / 180);
        ctx.scale(num(p, "scaleX", 1), num(p, "scaleY", 1));
        ctx.translate(-(Math.min(...xs) + Math.max(...xs)) / 2, -(Math.min(...ys) + Math.max(...ys)) / 2);
        ctx.beginPath();
        cmds.forEach(([c, ...a]) => {
            a = a.map(Number);
            if (c === "M") ctx.moveTo(a[0], a[1]);
            else if (c === "L") ctx.lineTo(a[0], a[1]);
            else if (c === "Q") ctx.quadraticCurveTo(a[0], a[1], a[2], a[3]);
            else if (c === "C") ctx.bezierCurveTo(a[0], a[1], a[2], a[3], a[4], a[5]);
            else if (c === "Z" || c === "z") ctx.closePath();
        });
        paint(ctx, p);
        ctx.restore();
    };
    const drawImg = (ctx, g, im) => {
        const w = num(g, "width"), h = num(g, "height");
        ctx.save();
        ctx.translate(num(g, "left"), num(g, "top"));
        ctx.rotate(num(g, "rotation") * Math.PI / 180);
        ctx.scale(g.get("fliph") ? -1 : 1, g.get("flipv") ? -1 : 1);
        ctx.globalAlpha = Math.max(0, Math.min(1, num(g, "baseOpacity", 1)));
        ctx.drawImage(tinted(im, g.get("tint_color"), w, h) || im, -w / 2, -h / 2, w, h);
        ctx.restore();
    };
    // 색조 입히기(토큰 설정, tint_color): Roll20 은 그림 색과 색조를 반반 섞는다 — 검정이면 반쯤 어둡게, 흰색이면 반쯤 바래게.
    // 투명한 곳은 그대로(source-atop). 실제 Roll20 화면 비교(11-04): 검정 · 흰색 사본 차이가 어디서나 127.
    // 따로 작은 캔버스에 그려 넘긴다(크기는 놓인 크기, 4096px 까지). 색조가 없으면(transparent) null
    const tinted = (im, c, w, h) => {
        if (!usable(c) || !/^#?[0-9a-f]{3,8}$/i.test(c)) return null;
        const s = Math.min(1, 4096 / Math.max(w, h, 1)), cv = document.createElement("canvas");
        cv.width = Math.max(1, Math.round(w * s)); cv.height = Math.max(1, Math.round(h * s));
        const x = cv.getContext("2d");
        x.drawImage(im, 0, 0, cv.width, cv.height);
        x.globalCompositeOperation = "source-atop";
        x.globalAlpha = 0.5;
        x.fillStyle = c.startsWith("#") ? c : "#" + c;
        x.fillRect(0, 0, cv.width, cv.height);
        return cv;
    };
    const render = async () => {
        const pg = Campaign.activePage?.() || Campaign.pages?.get(Campaign.get("playerpageid"));
        if (!pg?.thegraphics) throw new Error("페이지를 아직 불러오지 않았어요");
        const W = num(pg, "width", 25) * 70, H = num(pg, "height", 25) * 70;
        const k = Math.min(1, 8192 / Math.max(W, H));             // 브라우저 캔버스 한도 안으로
        const z = new Map(String(pg.get("zorder") || "").split(",").map((id, i) => [id, i]));
        const texts = new Set(pg.thetexts?.models || []);
        const objs = [...pg.thegraphics.models.filter(g => g.get("imgsrc")), ...(pg.thepaths?.models || []), ...texts];
        // 맵 레이어 먼저, 그다음 토큰 레이어. 같은 레이어 안에서는 Roll20 의 앞뒤 순서(zorder)대로
        const list = ["map", "objects"].flatMap(layer => objs.filter(o => o.get("layer") === layer)
            .sort((a, b) => (z.get(a.id) ?? num(a, "z_index", 1e9)) - (z.get(b.id) ?? num(b, "z_index", 1e9))));
        failed = [];
        const imgs = await Promise.all(list.map(o => o.get("imgsrc") ? load(o.get("imgsrc")) : null));
        // 글자 글꼴: Roll20 이 문서에 실어 둔 글꼴을 쓴다. 아직 안 실렸으면 불러 보고, 끝내 없으면 기본 글꼴로 (콘솔에 남김)
        const fonts = [...new Set(list.filter(o => texts.has(o)).map(fontOf))];
        await Promise.all(fonts.map(f => document.fonts?.load(f).catch(() => null)));
        const noFont = fonts.filter(f => document.fonts && !document.fonts.check(f));
        if (noFont.length) console.warn("[맵 촬영] 글꼴을 못 찾아 기본 글꼴로 그림:", noFont);
        if (failed.length) console.warn(`[맵 촬영] 그림 ${failed.length}/${list.length}개를 못 불러옴`, failed.slice(0, 20));
        const cv = document.createElement("canvas");
        cv.width = Math.round(W * k); cv.height = Math.round(H * k);
        const ctx = cv.getContext("2d");
        ctx.scale(k, k);
        ctx.fillStyle = pg.get("background_color") || "#ffffff";
        ctx.fillRect(0, 0, W, H);
        let miss = 0;
        list.forEach((o, i) => {
            if (texts.has(o)) return drawText(ctx, o);
            if (!o.get("imgsrc")) return drawPath(ctx, o);
            if (imgs[i]) drawImg(ctx, o, imgs[i]); else miss++;
        });
        const blob = await new Promise((res, rej) => cv.toBlob(b => b ? res(b) : rej(new Error("이미지를 만들지 못했어요")), "image/png"));
        return { blob, miss };
    };
    const shoot = async () => {
        if (busy || !isGM()) return;
        busy = true;
        clearTimeout(noteT);
        show("load", "맵을 그리는 중…");
        let info = null;
        try {
            // 누른 순간에 클립보드 쓰기를 시작해야 브라우저가 허락한다 (그림은 다 그려지는 대로 넘긴다)
            await navigator.clipboard.write([new ClipboardItem({ "image/png": render().then(r => (info = r).blob) })]);
            note(info.miss ? "warn" : "ok", info.miss ? `복사했어요 — 그림 ${info.miss}개는 불러오지 못해 빠졌어요` : "맵 이미지를 클립보드에 복사했어요");
        } catch (e) {
            console.warn("[맵 촬영] 실패:", e);
            note("bad", "복사하지 못했어요 — " + (e?.message || e));
        }
        busy = false;
    };
    // 페이지 설정: Roll20 페이지 창을 열고 "현재 페이지 설정" 을 대신 누른다 (페이지 창이 열려 있으면 바로)
    const pageSettings = async b => {
        if (!isGM()) return;
        const find = () => document.querySelector(".vtt-page-card-menu .current-page-settings");
        let el = find();
        if (!el) {
            document.getElementById("page-button")?.click();
            for (let i = 0; i < 20 && !(el = find()); i++) await new Promise(r => setTimeout(r, 100));
        }
        if (el) { el.click(); setOpen(false); return; }
        b.title = "페이지 설정을 못 찾았어요";
        setTimeout(() => { b.title = "페이지 설정"; }, 3000);
    };
    // 맵 단추를 누르면 촬영 · 가져오기 · 페이지 설정 단추가 아래로 펼쳐진다 (바깥을 누르거나 Esc 로 접기, 찍는 중엔 안 접힘)
    const setOpen = v => {
        const w = box();
        if (!w) return;
        w.classList.toggle("open", v);
        w.querySelector(".main").setAttribute("aria-expanded", String(v));
    };
    document.addEventListener("pointerdown", e => {
        const w = box();
        if (w?.classList.contains("open") && !busy && !w.contains(e.target)) setOpen(false);
    }, true);
    document.addEventListener("keydown", e => {
        const w = box();
        if (e.key === "Escape" && w?.classList.contains("open") && w.contains(document.activeElement)) { setOpen(false); w.querySelector(".main").focus(); }
    });
    const inject = () => {
        if (!btnVisible.mapshot || box() || !document.getElementById("sidebarcontrol") || !gmKnown()) return;
        // 촬영은 토큰 정보로 맵을 다시 그려서 안개 · 다이내믹 라이팅에 가려진 곳까지 찍힌다 → 가져오기 · 페이지 설정과 함께 GM 만
        if (!isGM()) return;
        const b = document.createElement("div");
        b.id = "r20-mapshot";
        b.innerHTML = `<button type="button" class="main" title="맵" aria-label="맵 도구" aria-expanded="false" aria-controls="r20-maptray">${svg("map")}</button>`
            + '<div class="tray" id="r20-maptray" role="group" aria-label="맵 도구"><button type="button" class="shot"></button>'
            + `<button type="button" class="imp" title="코코포리아 맵 가져오기" aria-label="코코포리아 맵 가져오기">${svg("up")}</button>`
            + `<button type="button" class="fit" title="맵 맞추기" aria-label="맵 맞추기">${svg("fit")}</button>`
            + `<button type="button" class="pgset" title="페이지 설정" aria-label="페이지 설정">${svg("pgset")}</button></div>`;
        b.addEventListener("click", e => {
            const k = e.target.closest("button")?.className;
            if (!k) return;
            e.preventDefault(); e.stopPropagation();
            if (k === "main") setOpen(!b.classList.contains("open"));
            else if (k === "shot") shoot();
            else if (k === "imp") { mapFit.close(); ccfImport.toggle(b); }
            else if (k === "fit") { ccfImport.close(); mapFit.toggle(b); }
            else if (k === "pgset") pageSettings(e.target.closest("button"));
        });
        document.body.appendChild(b);
        idle();
        if (FEAT.screenUI) FEAT.screenUI.place();
        else {      // 화면 정리 묶음이 없으면 햄버거 밑에 혼자 놓는다
            const r = document.getElementById("sidebarcontrol").getBoundingClientRect();
            Object.assign(b.style, { top: r.bottom + 4 + "px", right: innerWidth - r.right + "px" });
        }
    };
    const setEnabled = v => {
        if (v) return inject();
        box()?.remove();
        ccfImport.close();
        mapFit.close();
    };
    return { inject, setEnabled };
})();

// ───────── 코코포리아 맵 가져오기: 룸 데이터 ZIP 의 마커 · 스크린 패널을 지금 페이지에 같은 칸 · 같은 겹침 순서로 놓는다 ─────────
// 그림은 Roll20 테이블에 파일을 끌어다 놓은 것처럼 해서 Roll20 이 직접 올린다 (한 번에 하나씩).
// 올린 주소는 파일 이름(코코포리아가 붙인 내용 해시) + 크기로 기억해 두고, 다시 가져올 때는 또 올리지 않는다.
// 확장자만 다른 파일(apng 를 바꾼 webm 등)을 같이 넣으면 같은 이름의 그림 대신 그걸 올리고,
// 없으면 (켜 둔 경우) apng · 움직이는 webp 를 브라우저 안에서 투명 webm 으로 바꿔 올린다 (Roll20 은 이것들을 안 움직인다).
// 룸 데이터(__data.json)가 없는 ZIP 은 그림 묶음으로 보고, 안의 그림을 라이브러리에만 올린다
const ccfImport = (() => {
    const UP_KEY = "r20_ccf_up";
    const CAN_CONV = typeof ImageDecoder === "function" && typeof VideoEncoder === "function";
    let conv = localStorage.getItem("r20_ccf_conv") !== "false";
    let lay = localStorage.getItem("r20_ccf_lay") !== "false";        // 그림 묶음: 올린 그림을 지금 페이지에도 늘어놓기
    const MIME = { png: "image/png", apng: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", webm: "video/webm", mp4: "video/mp4" };
    const R20 = /^https:\/\/(?:s3\.amazonaws\.com\/)?files\.d20\.io\//i;
    let pop = null, anchor = null, zip = null, zipName = "", data = null, scenes = [], sel = 0, grid = null, busy = false, stop = false;
    let pending = null, zipPw = null;      // 암호를 기다리는 ZIP, 맞힌 암호(바이트)
    let pack = null;                       // 룸 데이터가 없는 ZIP: 올릴 그림 이름들
    let cell = localStorage.getItem("r20_ccf_cell") === "70" ? 70 : 24;      // 기본은 코코포리아 그림 그대로 (1칸 = 24px)
    const extra = new Map();          // 확장자 뺀 이름 → 바꿔 올릴 파일
    const blobs = new Map(), looks = new Map(), bitmaps = new Map(), anims = new Map();
    const upMap = (() => { try { return JSON.parse(localStorage.getItem(UP_KEY) || "{}") || {}; } catch (e) { return {}; } })();
    const saveUp = () => { try { localStorage.setItem(UP_KEY, JSON.stringify(upMap)); } catch (e) {} };
    const base = n => String(n).replace(/^.*\//, "").replace(/\.[^.]+$/, "");
    const typeOf = n => data?.resources?.[n]?.type || MIME[String(n).split(".").pop().toLowerCase()] || "application/octet-stream";

    // ── ZIP: 끝의 목록(central directory)만 읽고, 파일은 필요할 때 브라우저 내장 압축 풀기로 (ZIP 전체를 메모리에 올리지 않는다) ──
    const readZip = async file => {
        const tail = new DataView(await file.slice(Math.max(0, file.size - 65557)).arrayBuffer());
        let e = tail.byteLength - 22;
        while (e >= 0 && tail.getUint32(e, true) !== 0x06054b50) e--;
        if (e < 0) throw new Error("ZIP 파일이 아니에요");
        const count = tail.getUint16(e + 10, true), cdSize = tail.getUint32(e + 12, true), cdOff = tail.getUint32(e + 16, true);
        if (count === 0xffff || cdOff === 0xffffffff) throw new Error("너무 큰 ZIP(ZIP64)은 못 읽어요");
        const v = new DataView(await file.slice(cdOff, cdOff + cdSize).arrayBuffer());
        const out = new Map(), td = new TextDecoder();
        // 이름: UTF-8 표시가 없으면 윈도우 압축이 쓰는 한국어(euc-kr) · 일본어(shift_jis) 코드일 수 있다
        const strict = ["utf-8", "euc-kr", "shift_jis"].map(l => new TextDecoder(l, { fatal: true }));
        const nameOf = (u, flag) => {
            if (!(flag & 0x800)) for (const d of strict) { try { return d.decode(u); } catch (e) {} }
            return td.decode(u);
        };
        let p = 0;
        for (let i = count; i > 0; i--) {
            if (v.getUint32(p, true) !== 0x02014b50) throw new Error("ZIP 목록이 깨졌어요");
            const flag = v.getUint16(p + 8, true), method = v.getUint16(p + 10, true), csize = v.getUint32(p + 20, true), size = v.getUint32(p + 24, true);
            // 암호 머리 12바이트의 마지막 바이트 = CRC 맨 윗바이트 (뒤에 크기를 적는 방식이면 수정 시각의 윗바이트)
            const check = flag & 8 ? v.getUint16(p + 12, true) >>> 8 : v.getUint32(p + 16, true) >>> 24;
            const nl = v.getUint16(p + 28, true), lo = v.getUint32(p + 42, true);
            const name = nameOf(new Uint8Array(v.buffer, p + 46, nl), flag);
            const short = name.replace(/^.*\//, "");         // 폴더는 떼고, 이름이 겹치면 폴더째로
            if (!name.endsWith("/")) out.set(out.has(short) ? name : short, { method, size, enc: !!(flag & 1), check, file, lo, csize, raw: null });
            p += 46 + nl + v.getUint16(p + 30, true) + v.getUint16(p + 32, true);
        }
        return out;
    };
    // ── ZIP 암호(ZipCrypto: 반디집 · 7-Zip · 윈도우 기본 방식): 암호로 세 열쇠를 만들고 한 바이트씩 풀며 열쇠를 굴린다 ──
    const CRC = (() => {
        const t = new Int32Array(256);
        for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
        return t;
    })();
    const roll = (k, b) => {
        k[0] = CRC[(k[0] ^ b) & 255] ^ (k[0] >>> 8);
        k[1] = Math.imul(k[1] + (k[0] & 255), 134775813) + 1;
        k[2] = CRC[(k[2] ^ (k[1] >>> 24)) & 255] ^ (k[2] >>> 8);
    };
    const unlock = (pw, u) => {         // u = 암호 머리 12바이트 + 데이터
        const k = new Int32Array([0x12345678, 0x23456789, 0x34567890]), out = new Uint8Array(u.length);
        pw.forEach(b => roll(k, b));
        for (let i = 0; i < u.length; i++) {
            const t = (k[2] | 2) & 0xffff, c = u[i] ^ ((Math.imul(t, t ^ 1) >>> 8) & 255);
            out[i] = c;
            roll(k, c);
        }
        return out;
    };
    // 파일 몸통: 그 파일 머리(30바이트 + 이름 · 덧붙임 길이)를 읽어 위치를 알아낸다
    const rawOf = async z => {
        if (!z.raw) {
            const h = new DataView(await z.file.slice(z.lo, z.lo + 30).arrayBuffer());
            const start = z.lo + 30 + h.getUint16(26, true) + h.getUint16(28, true);
            z.raw = z.file.slice(start, start + z.csize);
        }
        return z.raw;
    };
    const blobOf = n => {
        if (!blobs.has(n)) {
            const z = zip.get(n);
            const raw = rawOf(z).then(r => z.enc ? r.arrayBuffer().then(a => new Blob([unlock(zipPw, new Uint8Array(a)).subarray(12)])) : r);
            const b = raw.then(r => z.method === 0 ? r : new Response(r.stream().pipeThrough(new DecompressionStream("deflate-raw"))).blob());
            blobs.set(n, b.then(x => x.slice(0, x.size, typeOf(n))));
        }
        return blobs.get(n);
    };
    // 앞부분만 풀어 본다 — 움직이는 그림인지 보려고 큰 ZIP 의 그림을 전부 풀어 두지 않게 (암호 ZIP 은 처음부터 풀어야 해서 통째로)
    const headOf = async (n, len = 65536) => {
        const z = zip.get(n);
        if (blobs.has(n) || z.enc) return new Uint8Array(await (await blobOf(n)).slice(0, len).arrayBuffer());
        const raw = await rawOf(z);
        if (z.method === 0) return new Uint8Array(await raw.slice(0, len).arrayBuffer());
        const rd = raw.stream().pipeThrough(new DecompressionStream("deflate-raw")).getReader(), parts = [];
        let got = 0;
        try { while (got < len) { const { value, done } = await rd.read(); if (done) break; parts.push(value); got += value.length; } }
        finally { rd.cancel().catch(() => {}); }
        const out = new Uint8Array(Math.min(got, len));
        for (let i = 0, o = 0; i < parts.length && o < out.length; i++) { const t = parts[i].subarray(0, out.length - o); out.set(t, o); o += t.length; }
        return out;
    };
    // 움직이는 그림인지: apng 는 그림 데이터(IDAT) 앞에 acTL 조각, webp 는 VP8X 머리의 애니메이션 표시(0x02)
    const animType = n => /\.a?png$/i.test(n) ? "image/png" : /\.webp$/i.test(n) ? "image/webp" : "";
    const isAnim = n => {
        if (!anims.has(n)) anims.set(n, (async () => {
            const t = animType(n);
            if (!t) return false;
            const u = await headOf(n);
            if (t === "image/webp") return String.fromCharCode(...u.subarray(12, 16)) === "VP8X" && !!(u[20] & 2);
            const dv = new DataView(u.buffer, u.byteOffset, u.length);
            for (let p = 8; p + 8 <= u.length; p += 12 + dv.getUint32(p)) {
                const type = String.fromCharCode(...u.subarray(p + 4, p + 8));
                if (type === "acTL") return true;
                if (type === "IDAT") return false;
            }
            return false;
        })());
        return anims.get(n);
    };
    // 8×8 로 줄여 봐서: 다 투명하면 blank, 한 가지 색이면 그 색 (배경 · 전경 그림을 올릴지 정한다)
    const look = n => {
        if (!looks.has(n)) looks.set(n, (async () => {
            try {
                const bm = await createImageBitmap(await blobOf(n));
                const c = document.createElement("canvas");
                c.width = c.height = 8;
                const x = c.getContext("2d", { willReadFrequently: true });
                x.drawImage(bm, 0, 0, 8, 8);
                const d = x.getImageData(0, 0, 8, 8).data;
                let clear = true, same = true;
                for (let i = 0; i < d.length; i += 4) {
                    if (d[i + 3] > 8) clear = false;
                    if (d[i + 3] < 250 || Math.abs(d[i] - d[0]) > 3 || Math.abs(d[i + 1] - d[1]) > 3 || Math.abs(d[i + 2] - d[2]) > 3) same = false;
                }
                if (clear) return { blank: true };
                return same ? { color: "#" + [d[0], d[1], d[2]].map(c => c.toString(16).padStart(2, "0")).join("") } : {};
            } catch (e) { return {}; }
        })());
        return looks.get(n);
    };

    // ── 배치 계산: 코코포리아 좌표는 칸 단위(필드 가운데가 0,0) → 왼쪽 위 끝을 정수 칸으로 당겨 Roll20 페이지 (0,0) 에 ──
    const has = n => !!n && zip.has(n);
    const layout = async sc => {
        const ms = Object.values(sc.markers || {}).map((m, i) => ({ ...m, i }));
        const ok = ms.filter(m => has(m.imageUrl) && +m.width > 0 && +m.height > 0).sort((a, b) => (a.z || 0) - (b.z || 0) || a.i - b.i);
        const fw = +sc.fieldWidth || 0, fh = +sc.fieldHeight || 0;
        const fg = has(sc.foregroundUrl) && fw > 0 && fh > 0 && !(await look(sc.foregroundUrl)).blank;
        const bg = has(sc.backgroundUrl) ? await look(sc.backgroundUrl) : { blank: true };
        // 스크린 패널: 판 위에 있는 것만 (마커 위에 놓인다). 뒤집혀 있으면 뒷면 그림, 숨김이면 GM 층
        const ps = Object.values(sc.items || {}).filter(q => q.active !== false)
            .map((q, i) => ({ ...q, i, imageUrl: q.closed && q.coverImageUrl ? q.coverImageUrl : q.imageUrl }));
        const okp = ps.filter(q => has(q.imageUrl) && +q.width > 0 && +q.height > 0).sort((a, b) => (a.z || 0) - (b.z || 0) || a.i - b.i);
        const skipped = ms.length - ok.length + ps.length - okp.length;
        const items = [];
        if (fg) items.push({ img: sc.foregroundUrl, x: -fw / 2, y: -fh / 2, w: fw, h: fh, lock: true, base: true });
        ok.forEach(m => items.push({ img: m.imageUrl, x: +m.x || 0, y: +m.y || 0, w: +m.width, h: +m.height, lock: !!m.locked }));
        okp.forEach(q => items.push({ img: q.imageUrl, x: +q.x || 0, y: +q.y || 0, w: +q.width, h: +q.height, lock: !!q.locked, rot: +q.angle || 0, gm: q.visible === false }));
        if (!items.length) return { items, skipped };
        const x0 = Math.floor(Math.min(...items.map(t => t.x))), y0 = Math.floor(Math.min(...items.map(t => t.y)));
        const pw = Math.ceil((Math.max(...items.map(t => t.x + t.w)) - x0) * cell / 70);
        const ph = Math.ceil((Math.max(...items.map(t => t.y + t.h)) - y0) * cell / 70);
        // 배경(화면 뒤 그림): 한 가지 색이면 페이지 배경색, 그림이면 맵 층 맨 아래에 페이지 가득
        if (!bg.blank && !bg.color) items.unshift({ img: sc.backgroundUrl, x: x0, y: y0, w: pw * 70 / cell, h: ph * 70 / cell, lock: true, base: true });
        return { items, x0, y0, pw, ph, color: bg.color || sc.backgroundColor || "", skipped };
    };
    const px = v => Math.round(v * cell * 100) / 100;
    const attrsOf = (t, L) => ({ left: px(t.x - L.x0 + t.w / 2), top: px(t.y - L.y0 + t.h / 2), width: px(t.w), height: px(t.h),
        rotation: t.rot || 0, layer: t.gm ? "gmlayer" : t.lock ? "map" : "objects", controlledby: t.lock ? "" : "all" });

    // ── apng · 움직이는 webp → 투명 webm: 색과 투명도를 VP9(안 되면 VP8) 두 줄기로 따로 만들어, 투명도는 블록 덧붙임(BlockAdditional)으로 넣는다 ──
    // (ffmpeg 의 투명 webm 과 같은 짜임. 브라우저 인코더는 아직 투명도를 직접 못 받는다)
    const toWebm = async (bytes, type, halt) => {
        const dec = new ImageDecoder({ data: bytes, type });
        let ec = null, ea = null;
        try {
            await dec.tracks.ready; await dec.completed;
            const n = dec.tracks.selectedTrack.frameCount;
            let f = (await dec.decode({ frameIndex: 0 })).image;
            // 2배로 키워(이웃 픽셀 그대로) 만든다: 4:2:0 은 색을 2×2 마다 하나만 남겨 가는 선 · 글자 가장자리 색이 번지는데,
            // 키운 그림을 Roll20 이 원래 크기로 줄여 그리면 색이 원본 픽셀마다 살아난다 (아주 큰 그림은 1배)
            const fw = f.displayWidth, fh = f.displayHeight, K = Math.max(fw, fh) * 2 <= 2048 ? 2 : 1;
            const W = fw * K + ((fw * K) & 1), H = fh * K + ((fh * K) & 1);       // 4:2:0 은 짝수 크기
            const fps = Math.max(1, Math.round(1e6 / (f.duration || 100000)));
            let cfg = null;
            for (const codec of ["vp09.00.10.08", "vp8"]) {
                const c = { codec, width: W, height: H, framerate: fps, bitrate: Math.max(300000, Math.round(W * H * fps * 0.25)) };
                if ((await VideoEncoder.isConfigSupported(c).catch(() => ({}))).supported) { cfg = c; break; }
            }
            if (!cfg) throw new Error("이 브라우저는 webm 을 못 만들어요");
            let err = null;
            const enc = arr => {
                const e = new VideoEncoder({ output: c => { const u = new Uint8Array(c.byteLength); c.copyTo(u); arr.push({ ts: c.timestamp, key: c.type === "key", data: u }); },
                    error: x => { err = err || x; } });
                e.configure(cfg);
                return e;
            };
            const color = [], alpha = [];
            ec = enc(color); ea = enc(alpha);
            const cv = new OffscreenCanvas(W, H), x = cv.getContext("2d", { willReadFrequently: true });
            x.imageSmoothingEnabled = false;
            const yuv = new Uint8Array(W * H * 3 / 2).fill(128, W * H);          // 투명도 줄기: 밝기 = 투명도, 색차는 가운데
            let end = 0;
            for (let i = 0; i < n && !err; i++) {
                if (halt?.()) { f.close(); throw new Error("멈춤"); }
                if (i) f = (await dec.decode({ frameIndex: i })).image;
                x.clearRect(0, 0, W, H);
                x.drawImage(f, 0, 0, fw * K, fh * K);
                const ts = f.timestamp, dur = f.duration || 100000, key = i % 50 === 0;
                f.close();
                end = ts + dur;
                const px = x.getImageData(0, 0, W, H).data;
                const vc = new VideoFrame(px, { format: "RGBX", codedWidth: W, codedHeight: H, timestamp: ts, duration: dur });
                ec.encode(vc, { keyFrame: key }); vc.close();
                for (let j = 0, k = 3; j < W * H; j++, k += 4) yuv[j] = px[k];
                const va = new VideoFrame(yuv, { format: "I420", codedWidth: W, codedHeight: H, timestamp: ts, duration: dur });
                ea.encode(va, { keyFrame: key }); va.close();
                while (ec.encodeQueueSize > 4 || ea.encodeQueueSize > 4) await new Promise(r => setTimeout(r, 0));
            }
            await ec.flush(); await ea.flush();
            if (err) throw err;
            return webmFile(W, H, cfg.codec.startsWith("vp8") ? "V_VP8" : "V_VP9", color, alpha, end / 1000);
        } finally {
            dec.close();
            [ec, ea].forEach(e => { if (e && e.state !== "closed") e.close(); });
        }
    };
    // 아주 작은 WebM(EBML) 쓰기: 영상 줄기 하나 + 투명도 덧붙임, 키 장면마다 묶음(Cluster)
    const cat = parts => { const o = new Uint8Array(parts.reduce((s, p) => s + p.length, 0)); let i = 0; parts.forEach(p => { o.set(p, i); i += p.length; }); return o; };
    const beBytes = (n, len) => { const o = new Uint8Array(len); for (let i = len - 1; i >= 0; i--) { o[i] = n % 256; n = Math.floor(n / 256); } return o; };
    const uintB = n => { let L = 1; while (n >= 256 ** L) L++; return beBytes(n, L); };
    const sizeB = n => { let L = 1; while (L < 8 && n >= 2 ** (7 * L) - 1) L++; const o = beBytes(n, L); o[0] |= 1 << (8 - L); return o; };
    const el = (id, ...kids) => {
        const body = cat(kids.map(k => typeof k === "number" ? uintB(k) : typeof k === "string" ? new TextEncoder().encode(k) : k));
        return cat([uintB(id), sizeB(body.length), body]);
    };
    const webmFile = (W, H, codecId, color, alpha, durMs) => {
        const f64 = new Uint8Array(8);
        new DataView(f64.buffer).setFloat64(0, durMs);
        const head = el(0x1A45DFA3, el(0x4286, 1), el(0x42F7, 1), el(0x42F2, 4), el(0x42F3, 8), el(0x4282, "webm"), el(0x4287, 4), el(0x4285, 2));
        const info = el(0x1549A966, el(0x2AD7B1, 1000000), el(0x4D80, "r20"), el(0x5741, "r20"), el(0x4489, f64));
        // AlphaMode 1 + MaxBlockAdditionID 1 → 덧붙임 1번이 투명도
        const tracks = el(0x1654AE6B, el(0xAE, el(0xD7, 1), el(0x73C5, 1), el(0x83, 1), el(0x86, codecId), el(0x55EE, 1), el(0xE0, el(0xB0, W), el(0xBA, H), el(0x53C0, 1))));
        const clusters = [], alphaAt = new Map(alpha.map(a => [a.ts, a.data]));      // 투명도는 같은 시각의 장면과 짝 (장면을 빠뜨려도 어긋나지 않게)
        let cur = null, base0 = 0, prev = 0;
        color.forEach(c => {
            const t = Math.round(c.ts / 1000);
            if (c.key || !cur || t - base0 > 30000) {           // 묶음 안 상대 시각은 16비트
                if (cur) clusters.push(el(0x1F43B675, ...cur));
                cur = [el(0xE7, t)];
                base0 = t;
            }
            const rel = new Uint8Array(2);
            new DataView(rel.buffer).setInt16(0, t - base0);
            const kids = [el(0xA1, cat([Uint8Array.of(0x81), rel, Uint8Array.of(0), c.data]))];
            if (!c.key) { const d = new Uint8Array(2); new DataView(d.buffer).setInt16(0, prev - t); kids.push(el(0xFB, d)); }     // 앞 장면을 참조 = 키 장면 아님
            if (alphaAt.has(c.ts)) kids.push(el(0x75A1, el(0xA6, el(0xEE, 1), el(0xA5, alphaAt.get(c.ts)))));
            cur.push(el(0xA0, ...kids));
            prev = t;
        });
        if (cur) clusters.push(el(0x1F43B675, ...cur));
        return new Blob([head, el(0x18538067, info, tracks, ...clusters)], { type: "video/webm" });
    };

    // 기억해 둔 주소가 아직 열리는지 — 라이브러리에서 지운 그림은 주소가 죽어서, 다시 쓰면 Roll20 에 빈칸으로 놓인다.
    // Roll20 처럼 crossOrigin 으로 열어 본다. 못 열면(시간 초과 포함) 기억을 지우고 새로 올린다
    const alive = new Map();
    const opens = u => {
        if (!alive.has(u)) alive.set(u, new Promise(res => {
            const v = isAnimVideo(u), el = document.createElement(v ? "video" : "img");
            let to = 0;
            const done = ok => { clearTimeout(to); el.onload = el.onerror = el.onloadedmetadata = null; el.removeAttribute("src"); res(ok); };
            to = setTimeout(() => done(false), 20000);
            el.crossOrigin = "anonymous";
            if (v) { el.muted = true; el.preload = "metadata"; el.onloadedmetadata = () => done(true); }
            else el.onload = () => done(true);
            el.onerror = () => done(false);
            el.src = u;
        }));
        return alive.get(u);
    };
    // 다시 쓸 열쇠들을 한꺼번에 확인해서 죽은 것은 upMap 에서 뺀다 → 몇 개 뺐는지
    const dropDead = async keys => {
        const ks = [...new Set(keys)].filter(k => upMap[k]);
        if (!ks.length) return 0;
        prog(`올려 둔 그림 ${ks.length}개가 아직 열리는지 확인하는 중…`);
        const dead = (await Promise.all(ks.map(async k => [k, await opens(upMap[k])]))).filter(x => !x[1]).map(x => x[0]);
        if (dead.length) { console.warn("[코코포리아 가져오기] 안 열리는 옛 주소 — 새로 올림:", dead.map(k => upMap[k])); dead.forEach(k => delete upMap[k]); saveUp(); }
        return dead.length;
    };
    // 올릴 파일과 기억 열쇠: 직접 넣은 파일 > (켜 두면) apng 를 바꾼 webm > ZIP 그림 그대로
    const plainSrc = async n => { const b = await blobOf(n); return { key: n + ":" + b.size, file: new File([b], n, { type: typeOf(n) }) }; };
    const sourceOf = async n => {
        const f = extra.get(base(n));
        if (f) return { key: f.name + ":" + f.size, file: f };
        if (conv && CAN_CONV && await isAnim(n)) return { key: n + ":webm2", conv: true };       // webm2 = 2배 화질 (이전 변환본은 다시 쓰지 않음)
        return plainSrc(n);
    };

    // ── 올리기: Roll20 테이블 캔버스에 파일을 끌어다 놓은 것처럼 → Roll20 이 라이브러리에 올리고 토큰 층에 그림을 만든다 ──
    const dropUpload = (pg, file) => new Promise(res => {
        const cv = document.getElementById("babylonCanvas") || document.querySelector("#editor-wrapper canvas");
        if (!cv) return res(null);
        let got = null, tick = 0;
        const t0 = Date.now(), onAdd = m => { got = got || m; };
        const fin = m => { clearInterval(tick); pg.thegraphics.off("add", onAdd); res(m); };
        pg.thegraphics.on("add", onAdd);
        tick = setInterval(() => {
            if (got && R20.test(got.get("imgsrc") || "")) fin(got);
            else if (Date.now() - t0 > 90000) fin(null);
        }, 250);
        const r = cv.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
        const dt = new DataTransfer();
        dt.items.add(file);
        for (const type of ["dragenter", "dragover", "drop"])
            cv.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt, clientX: x, clientY: y }));
    });
    const page = () => (typeof window.Campaign?.activePage === "function" ? window.Campaign.activePage() : null);
    const run = async () => {
        const pg = page(), sc = scenes[sel];
        if (!pg?.thegraphics || !sc) return prog("지금 페이지를 못 찾았어요");
        const L = await layout(sc);
        if (!L.items.length) return prog("놓을 패널이 없어요");
        busy = true; stop = false; paint();
        $(".warn").textContent = "가져오는 동안 Roll20 에서 다른 페이지로 옮기지 마세요";
        try { await runRoom(pg, sc, L); }
        catch (e) { console.warn("[코코포리아 가져오기] 오류:", e); prog("멈췄어요 — 오류: " + (e?.message || e)); }
        finally { busy = false; paint(); refresh(); }
    };
    const runRoom = async (pg, sc, L) => {
        // apng → webm 은 Roll20 에 올리기 전에 한꺼번에 (이미 올려 둔 건 건너뜀, 못 바꾸면 멈춘 그림으로)
        const srcs = new Map();
        for (const n of new Set(L.items.map(t => t.img))) srcs.set(n, await sourceOf(n));
        const redo = await dropDead([...srcs.values()].map(s => s.key));        // 안 열리는 옛 주소는 새로 올린다
        const todo = [...srcs].filter(([, s]) => s.conv && !upMap[s.key]);
        let k = 0, conved = 0, convFail = 0;
        for (const [n, s] of todo) {
            if (stop) break;
            prog(`webm 으로 바꾸는 중 ${++k}/${todo.length}`);
            try {
                s.file = new File([await toWebm(new Uint8Array(await (await blobOf(n)).arrayBuffer()), animType(n), () => stop)], base(n) + ".webm", { type: "video/webm" });
                blobs.delete(n);
                conved++;
            } catch (e) {
                if (stop) break;
                console.warn("[코코포리아 가져오기] webm 으로 못 바꿈:", n, e);
                convFail++;
                srcs.set(n, await plainSrc(n));
            }
        }
        if (!stop) pg.save({ width: L.pw, height: L.ph, snapping_increment: cell / 70, showgrid: !!grid, ...(L.color ? { background_color: L.color } : {}) });
        const urls = new Map(), fail = new Set();
        let up = 0, reused = 0, placed = 0, i = 0;
        for (const t of L.items) {
            if (stop) break;
            prog(`놓는 중 ${++i}/${L.items.length}`);
            if (!urls.has(t.img)) {
                const s = srcs.get(t.img), f = s.file;
                let src = upMap[s.key] || null;
                if (src) reused++;
                else {
                    prog(`그림 올리는 중 ${up + 1} · 놓는 중 ${i}/${L.items.length}`);
                    const g = await dropUpload(pg, f);
                    s.file = null; blobs.delete(t.img);         // 올렸으면 그림 몸통은 더 안 쓴다
                    if (g) {
                        src = g.get("imgsrc");
                        upMap[s.key] = src;
                        saveUp();
                        up++;
                        urls.set(t.img, src);
                        g.save(attrsOf(t, L));        // Roll20 이 만든 그림을 그 자리로 (만든 순서가 곧 겹침 순서)
                        placed++;
                        continue;
                    }
                    console.warn("[코코포리아 가져오기] 못 올림:", f.name);
                }
                urls.set(t.img, src);
            }
            const src = urls.get(t.img);
            if (!src) { fail.add(t.img); continue; }
            try { pg.thegraphics.create({ imgsrc: src, page_id: pg.id, ...attrsOf(t, L) }); placed++; }
            catch (e) { console.warn("[코코포리아 가져오기] 놓기 실패:", e); fail.add(t.img); }
        }
        prog((stop ? `멈췄어요 — ${placed}/${L.items.length}개 놓음` : `다 놓았어요 — ${placed}개`)
            + ` · 새로 올린 그림 ${up} · 다시 쓴 그림 ${reused}` + (redo ? ` (옛 주소가 안 열려 다시 올린 그림 ${redo})` : "") + (conved ? ` · webm 으로 바꾼 그림 ${conved}` : "")
            + (convFail ? ` · 못 바꿔 멈춘 그림으로 ${convFail}` : "") + (fail.size ? ` · 못 올린 그림 ${fail.size}개 (콘솔에 목록)` : ""));
        if (fail.size) console.warn("[코코포리아 가져오기] 못 올린 그림:", [...fail]);
    };

    // 그림 묶음 올리기: 하나씩 Roll20 에 올린다. 켜 두면(기본) 지금 페이지에 첫 그림이 떨어진 자리부터 늘어놓고,
    // 끄면 테이블에 생긴 그림을 지워 라이브러리에만 남긴다. 이름이 흔해서 기억 열쇠는 내용 해시 (같은 그림은 어느 ZIP 에서 와도 한 번만)
    const hashOf = async b => [...new Uint8Array(await crypto.subtle.digest("SHA-256", await b.arrayBuffer()))].slice(0, 16)
        .map(v => v.toString(16).padStart(2, "0")).join("");
    const runPack = async () => {
        const pg = page();
        if (!pg?.thegraphics) return prog("지금 페이지를 못 찾았어요");
        busy = true; stop = false; paint();
        $(".warn").textContent = "올리는 동안 Roll20 에서 다른 페이지로 옮기지 마세요";
        try { await runPackAll(pg); }
        catch (e) { console.warn("[그림 올리기] 오류:", e); prog("멈췄어요 — 오류: " + (e?.message || e)); }
        finally { busy = false; paint(); refresh(); }
    };
    // 원래 크기: 그림은 첫 장면, 영상은 메타데이터 (모르면 1칸)
    const dimsOf = async b => {
        try { const bm = await createImageBitmap(b), d = [bm.width, bm.height]; bm.close(); return d; } catch (e) { /* 영상 */ }
        const v = document.createElement("video"), u = URL.createObjectURL(b);
        try {
            v.muted = true; v.preload = "metadata"; v.src = u;
            await new Promise((res, rej) => { v.onloadedmetadata = res; v.onerror = rej; setTimeout(rej, 10000); });
            return [v.videoWidth || 70, v.videoHeight || 70];
        } catch (e) { return [70, 70]; } finally { URL.revokeObjectURL(u); }
    };
    // 늘어놓기: 원래 크기 그대로, 페이지 오른쪽 끝(반 칸 여백)에 닿으면 다음 줄로. 줄 폭이 15칸(1050px)이 되게 시작점을 당긴다(페이지가 좁으면 왼쪽 끝부터)
    // 놓은 것의 오른쪽 · 아래 끝(put.r · put.b)을 기억해 두었다가 다 놓은 뒤 모자라면 페이지를 늘린다 — 페이지 저장은 끝에 한 번
    const shelf = (x0, y0, W) => {
        const right = W - 35;
        if (right - x0 < 1050) x0 = Math.max(35, right - 1050);
        let x = x0, y = y0, rowH = 0;
        const put = (w, h) => {
            if (x > x0 && x + w > right) { x = x0; y += rowH + 35; rowH = 0; }
            const at = { left: x + w / 2, top: y + h / 2, width: w, height: h };
            put.r = Math.max(put.r, x + w); put.b = Math.max(put.b, y + h);
            x += w + 35; rowH = Math.max(rowH, h);
            return at;
        };
        put.r = 0; put.b = 0;
        return put;
    };
    // 늘어놓은 것이 페이지 밖으로 나갔으면 그만큼만 페이지를 늘린다(줄이지는 않는다). 70px 한 칸 단위, 끝에 반 칸 여백
    const growTo = (pg, s) => {
        if (!s?.b) return;
        const W = parseFloat(pg.get("width")) || 25, H = parseFloat(pg.get("height")) || 25;
        const nw = Math.max(W, Math.ceil((s.r + 35) / 70)), nh = Math.max(H, Math.ceil((s.b + 35) / 70));
        if (nw !== W || nh !== H) { pg.save({ width: nw, height: nh }); return [nw, nh]; }
    };
    const urlKey = u => String(u || "").replace(/[?#].*$/, "").replace(/\/(?:thumb|med|max|original)\.[a-z0-9]+$/i, "");
    const runPackAll = async pg => {
        let up = 0, reused = 0, conved = 0, convFail = 0, redo = 0, i = 0, slot = null;
        const fail = [], mine = new Set(), kept = new Set(), before = new Set(pg.thegraphics.models.map(m => m.id));
        // g: Roll20 이 떨어뜨린 그림(새로 올린 것) · src: 이미 올려 둔 주소 — 늘어놓거나, 끈 경우엔 지운다
        const put = (g, src, dims) => {
            mine.add(urlKey(src));
            if (!lay) { if (g) try { g.destroy(); } catch (e) { console.warn("[그림 올리기] 테이블 그림을 못 지움:", e); } return; }
            if (!slot) {        // 첫 그림이 떨어진 자리(보고 있는 화면 가운데)부터, 모르면 페이지 왼쪽 위
                const l = +g?.get("left") - (+g?.get("width") || 0) / 2, t = +g?.get("top") - (+g?.get("height") || 0) / 2;
                const W = (parseFloat(pg.get("width")) || 25) * 70;
                slot = Number.isFinite(l) && Number.isFinite(t) ? shelf(Math.max(0, l), Math.max(0, t), W) : shelf(35, 35, W);
            }
            const at = { ...slot(...dims), layer: "objects" };
            if (g) g.save(at); else g = pg.thegraphics.create({ imgsrc: src, page_id: pg.id, ...at });
            if (g) kept.add(g.id);
        };
        for (const n of pack) {
            if (stop) break;
            prog(`올리는 중 ${++i}/${pack.length}`);
            const b = await blobOf(n).catch(() => null);
            blobs.delete(n);                 // 이 그림은 이번에 한 번만 쓴다
            if (!b) { fail.push(n); continue; }
            const h = "h:" + await hashOf(b), name = base(n), dims = await dimsOf(b);      // webm 으로 바꿔도 원래 크기로 놓는다
            let file = null, key = h;
            redo += await dropDead([h, h + ":webm2"]);         // 안 열리는 옛 주소는 새로 올린다
            if (conv && CAN_CONV && await isAnim(n)) {
                if (upMap[h + ":webm2"]) { reused++; put(null, upMap[h + ":webm2"], dims); continue; }
                prog(`webm 으로 바꾸는 중 ${i}/${pack.length}`);
                try { file = new File([await toWebm(new Uint8Array(await b.arrayBuffer()), animType(n), () => stop)], name + ".webm", { type: "video/webm" }); key = h + ":webm2"; conved++; }
                catch (e) { if (stop) break; console.warn("[그림 올리기] webm 으로 못 바꿈:", n, e); convFail++; }
            }
            if (!file) {
                if (upMap[h]) { reused++; put(null, upMap[h], dims); continue; }
                file = new File([b], /\.apng$/i.test(n) ? name + ".png" : n.replace(/^.*\//, ""), { type: typeOf(n) });
            }
            prog(`올리는 중 ${i}/${pack.length}`);
            const g = await dropUpload(pg, file);
            if (!g) { fail.push(n); continue; }
            upMap[key] = g.get("imgsrc");
            saveUp();
            up++;
            put(g, upMap[key], dims);
        }
        // 이번에 테이블에 생긴 그 그림 중 늘어놓은 것 말고 남은 것(Roll20 이 하나 더 만든 것 등)은 지운다
        if (mine.size) pg.thegraphics.models.filter(m => !before.has(m.id) && !kept.has(m.id) && mine.has(urlKey(m.get("imgsrc"))))
            .forEach(m => { try { m.destroy(); } catch (e) { console.warn("[그림 올리기] 테이블 그림을 못 지움:", e); } });
        const grown = lay ? growTo(pg, slot) : null;
        prog((stop ? `멈췄어요 — ${i}/${pack.length}` : lay ? "다 올리고 늘어놓았어요" : "다 올렸어요") + (grown ? ` · 페이지를 ${grown[0]}×${grown[1]}칸으로 늘렸어요` : "") + ` · 새로 올린 그림 ${up} · 이미 올린 그림 ${reused}` + (redo ? ` (옛 주소가 안 열려 다시 올린 그림 ${redo})` : "") + (conved ? ` · webm 으로 바꾼 그림 ${conved}` : "")
            + (convFail ? ` · 못 바꿔 멈춘 그림으로 ${convFail}` : "") + (fail.length ? ` · 못 올린 그림 ${fail.length}개 (콘솔에 목록)` : ""));
        if (fail.length) console.warn("[그림 올리기] 못 올린 그림:", fail);
    };

    // ── 판 ──
    const $ = s => pop.querySelector(s);
    const prog = s => { if (pop) $(".prog").textContent = s; };
    const IMG = /\.(?:a?png|jpe?g|gif|webp|webm|mp4)$/i;
    const imgsIn = z => [...z.keys()].filter(n => IMG.test(n) && !/(^|\/)(__MACOSX\/|\._)/.test(n))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const openZip = async (z, name) => {
        zip = z; zipName = name; blobs.clear(); looks.clear(); bitmaps.clear(); anims.clear();
        pack = null;
        if (!z.has("__data.json")) {           // 그림 묶음
            const list = imgsIn(z);
            try { await blobOf(list[0]); } catch (e) { zip = null; throw new Error(zipPw ? "암호가 틀렸어요" : "그림을 못 풀었어요"); }
            pack = list;
            return;
        }
        let d;
        try { d = JSON.parse(await (await blobOf("__data.json")).text()); }
        catch (e) { zip = null; throw new Error(zipPw ? "암호가 틀렸어요" : "__data.json 을 못 읽었어요"); }
        if (!d?.entities?.room) { zip = null; throw new Error("코코포리아 룸 데이터가 아니에요"); }
        data = d;
        const ent = d.entities, items = ent.items || {}, chars = ent.characters || {}, byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0);
        // 고를 수 있는 것: 지금 방 · 장면(배경 · 마커만 바뀌고 스크린 패널은 지금 것 그대로) · 세이브 데이터(그때의 방과 스크린 패널 통째로)
        scenes = [{ ...ent.room, items, chars, name: "지금 방", grp: "" },
            ...Object.values(ent.scenes || {}).sort(byOrder).map(s => ({ ...s, items, chars, name: s.name || "이름 없음", grp: "장면" })),
            ...Object.values(ent.savedatas || {}).sort(byOrder).map(s => {
                const sn = ent.snapshots?.[s.snapshotId];
                return sn?.room && { ...sn.room, items: sn.items || {}, chars: sn.characters || {}, name: s.name || "이름 없음", grp: "세이브 데이터" };
            }).filter(Boolean)];
        sel = 0; grid = null;
    };
    // 암호 확인: 머리 12바이트만 풀어 마지막 바이트가 맞으면 열어 본다 (우연히 맞는 1/256 은 JSON 에서 걸러진다)
    const tryPw = async () => {
        const inp = $(".pw input"), pw = new TextEncoder().encode(inp.value);
        const d = pending && [pending.z.get("__data.json"), ...pending.z.values()].find(e => e?.enc);     // 암호가 걸린 파일로 확인
        if (!d || busy) return;
        if (unlock(pw, new Uint8Array(await (await rawOf(d)).slice(0, 12).arrayBuffer()))[11] !== d.check) { prog("암호가 틀렸어요"); inp.select(); return; }
        zipPw = pw;
        try { await openZip(pending.z, pending.name); pending = null; inp.value = ""; prog(""); }
        catch (e) { zipPw = null; prog(e?.message || String(e)); inp.select(); }
        refresh();
    };
    const addFiles = async files => {
        for (const f of files) {
            if (/\.zip$/i.test(f.name)) {
                try {
                    const z = await readZip(f);
                    if (!z.has("__data.json") && !imgsIn(z).length) throw new Error("코코포리아 룸 데이터도, 올릴 그림도 없어요");
                    pending = null; zipPw = null; zip = null; data = null; scenes = []; pack = null;
                    if ([...z.values()].some(e => e.enc && e.method === 99)) throw new Error("AES 암호는 못 풀어요 — 압축을 풀어 암호 없이 다시 묶어 주세요");
                    if ([...z.values()].some(e => e.enc)) { pending = { z, name: f.name }; prog("암호가 걸린 ZIP 이에요 — 암호를 넣어 주세요"); continue; }
                    await openZip(z, f.name);
                    prog("");
                } catch (e) { zip = null; data = null; scenes = []; pack = null; prog("못 읽었어요 — " + (e?.message || e)); }
            } else extra.set(base(f.name), f);
        }
        refresh();
    };
    // 미리보기용 작은 그림: 다 그리면 그림 몸통은 비우고 160px 로 줄여 든다 (큰 ZIP 도 메모리에 다 들고 있지 않게)
    const thumbOf = n => {
        if (!bitmaps.has(n)) bitmaps.set(n, blobOf(n).then(b => createImageBitmap(b)).then(bm => bm.width <= 160 ? bm
            : createImageBitmap(bm, { resizeWidth: 160, resizeQuality: "medium" }).finally(() => bm.close())).catch(() => null).finally(() => blobs.delete(n)));
        return bitmaps.get(n);
    };
    // 미리보기: 첫 장면만 (apng 도 첫 장면)
    const drawPreview = async (sc, L) => {
        const cv = $(".pv");
        if (!L?.items.length) { cv.hidden = true; return; }
        const W = L.pw * 70, H = L.ph * 70, k = Math.min(300 / W, 240 / H);
        cv.hidden = false;
        cv.width = Math.round(W * k); cv.height = Math.round(H * k);
        const x = cv.getContext("2d");
        x.fillStyle = L.color || "#ffffff";
        x.fillRect(0, 0, cv.width, cv.height);
        for (const t of L.items) {
            const bm = await thumbOf(t.img);
            if (scenes[sel] !== sc) return;        // 그리는 사이 장면을 바꿨으면 그만
            const a = attrsOf(t, L);
            if (bm) x.drawImage(bm, (a.left - a.width / 2) * k, (a.top - a.height / 2) * k, a.width * k, a.height * k);
        }
    };
    // 그림 묶음 판: 그림 수 · 움직이는 그림 수 · 앞쪽 48개 썸네일
    const refreshPack = async () => {
        $(".set").hidden = true;
        $(".pg").textContent = ""; $(".warn").textContent = "";
        $(".conv").setAttribute("aria-checked", String(conv));
        paint();
        const list = pack, isA = await Promise.all(list.map(n => isAnim(n).catch(() => false)));
        if (pack !== list) return;
        const anim = isA.filter(Boolean).length;
        $(".conv").hidden = !(anim && CAN_CONV);
        $(".lay").hidden = false;
        $(".lay").setAttribute("aria-checked", String(lay));
        $(".info").textContent = `룸 데이터가 없는 ZIP 이라 그림을 Roll20 라이브러리에 올려요${lay ? " (지금 페이지에도 늘어놓아요)" : ""} — 그림 ${list.length}개` + (anim ? ` · 움직이는 그림 ${anim}개` : "")
            + (anim && !(conv && CAN_CONV) ? " (멈춘 그림으로 올라가요)" : "");
        const cv = $(".pv"), show = list.filter(n => !/\.(webm|mp4)$/i.test(n)).slice(0, 48), S = 36, cols = 8;
        cv.hidden = !show.length;
        cv.width = cols * S; cv.height = Math.ceil(show.length / cols) * S;
        const x = cv.getContext("2d");
        x.clearRect(0, 0, cv.width, cv.height);
        for (let i = 0; i < show.length; i++) {
            const n = show[i];
            const bm = await thumbOf(n);
            if (pack !== list) return;
            if (!bm) continue;
            const k = Math.min((S - 4) / bm.width, (S - 4) / bm.height), w = bm.width * k, h = bm.height * k;
            x.drawImage(bm, (i % cols) * S + (S - w) / 2, Math.floor(i / cols) * S + (S - h) / 2, w, h);
        }
    };
    const refresh = async () => {
        if (!pop) return;
        const sc = scenes[sel];
        $(".fn").textContent = zip ? zipName + (extra.size ? ` + 파일 ${extra.size}개` : "") : pending ? pending.name + " 🔒" : "ZIP 을 여기에 끌어다 놓아도 돼요";
        const pwRow = $(".pw");
        if (pwRow.hidden === !!pending) { pwRow.hidden = !pending; if (pending) pwRow.querySelector("input").focus(); }
        const s = $("select");
        $(".scn").hidden = !zip || !!pack;
        if (pack) return refreshPack();
        $(".lay").hidden = true;
        let html = "", grp = "";
        scenes.forEach((c, i) => {
            if (c.grp !== grp) html += (grp ? "</optgroup>" : "") + ((grp = c.grp) ? `<optgroup label="${escAttr(grp)}">` : "");
            const n = Object.keys(c.markers || {}).length + Object.values(c.items || {}).filter(q => q.active !== false).length;
            html += `<option value="${i}"${i === sel ? " selected" : ""}>${escAttr(c.name)} · 패널 ${n}</option>`;
        });
        s.innerHTML = html + (grp ? "</optgroup>" : "");
        pop.querySelectorAll("[data-cell]").forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.cell === cell)));
        if (grid === null && sc) grid = !!sc.displayGrid;
        $(".grid").setAttribute("aria-checked", String(!!grid));
        $(".conv").setAttribute("aria-checked", String(conv));
        $(".set").hidden = !sc;
        paint();
        if (!sc) { $(".info").textContent = ""; $(".pg").textContent = ""; $(".warn").textContent = ""; $(".pv").hidden = $(".conv").hidden = true; return; }
        const L = await layout(sc);
        if (scenes[sel] !== sc) return;
        const imgs = [...new Set(L.items.map(t => t.img))];
        const isA = await Promise.all(imgs.map(isAnim));
        const anim = isA.filter(Boolean).length;
        const swap = imgs.filter(n => extra.has(base(n))).length;
        const left = imgs.filter((n, i) => isA[i] && !extra.has(base(n))).length;       // 직접 넣은 webm 이 없는 움직이는 그림
        $(".conv").hidden = !(left && CAN_CONV);
        const other = Object.keys(sc.chars || {}).length;
        const nb = L.items.filter(t => t.base).length;      // 필드 · 배경 그림
        $(".info").textContent = `패널 ${L.items.length - nb}개` + (nb ? ` + 필드·배경 그림 ${nb}` : "") + ` · 그림 ${imgs.length}종` + (anim ? ` · 움직이는 그림 ${anim}종` : "")
            + (swap ? ` (직접 넣은 파일 ${swap}개 짝 맞음)` : "")
            + (left && !(conv && CAN_CONV) ? ` — webm 이 없는 ${left}종은 멈춘 그림으로 올라가요` : "")
            + (L.skipped ? ` · 그림 없는 패널 ${L.skipped}개 빼요` : "") + (other ? ` · 캐릭터 ${other}명은 아직 안 옮겨요` : "");
        $(".pg").innerHTML = L.items.length ? `지금 페이지 → <b>${L.pw}×${L.ph}</b> · 칸 너비 ${+(cell / 70).toFixed(3)}`
            + (L.color ? ` · 배경색 <i style="background:${escAttr(L.color)}"></i>${escAttr(L.color)}` : "") : "";
        const n = page()?.thegraphics?.models?.length || 0;
        $(".warn").textContent = n ? `지금 페이지에 그림이 ${n}개 있어요 — 그 위에 겹쳐 놓여요` : "";
        drawPreview(sc, L);
    };
    const paint = () => {
        if (!pop) return;
        const go = $(".pri");
        go.textContent = busy ? "멈추기" : pack ? (lay ? "올리고 늘어놓기" : "라이브러리에 올리기") : "가져오기";
        go.disabled = !busy && !scenes[sel] && !pack;
        pop.querySelectorAll("[data-cell], select, .sw, [data-k=pick], .pw input, .pw button").forEach(el => { el.disabled = busy; });
    };
    const place = () => {
        if (!pop || !anchor?.isConnected) return;
        const r = anchor.getBoundingClientRect();
        Object.assign(pop.style, { top: zpx(Math.round(r.top)), right: zpx(Math.round(innerWidth - r.left + 8)) });
    };
    const build = () => {
        pop = document.createElement("div");
        pop.id = "r20-ccf";
        pop.setAttribute("role", "dialog");
        pop.setAttribute("aria-label", "코코포리아 맵 가져오기");
        pop.innerHTML = '<div class="hd"><b>코코포리아 맵 가져오기</b><button type="button" class="x" aria-label="닫기">✕</button></div>'
            + '<div class="bd"><div class="rg"><button type="button" data-k="pick">ZIP · webm 고르기</button><span class="fn"></span>'
            + '<input type="file" multiple accept=".zip,.webm,.mp4,.gif,.png,.webp,.jpg,.jpeg" hidden></div>'
            + '<div class="rg pw" hidden><input type="password" placeholder="ZIP 암호" aria-label="ZIP 암호" autocomplete="off"><button type="button" data-k="pw">열기</button></div>'
            + '<label class="rg scn" hidden><span>장면</span><select></select></label><div class="info"></div>'
            + '<button type="button" class="sw conv" role="switch" hidden><i aria-hidden="true"></i>움직이는 그림은 webm 으로 바꿔 올리기</button>'
            + '<button type="button" class="sw lay" role="switch" hidden><i aria-hidden="true"></i>올린 그림을 지금 페이지에도 늘어놓기</button><canvas class="pv" hidden></canvas>'
            + '<div class="set"><div class="rg"><span>칸 크기</span><button type="button" data-cell="24">원본 24px</button><button type="button" data-cell="70">Roll20 70px</button>'
            + '<button type="button" class="sw grid" role="switch"><i aria-hidden="true"></i>그리드 표시</button></div>'
            + '<div class="pg"></div><div class="warn"></div></div>'
            + '<div class="go"><button type="button" class="pri">가져오기</button><span class="prog" aria-live="polite"></span></div></div>';
        const inp = $("input[type=file]");
        $(".pw input").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); tryPw(); } });
        inp.addEventListener("change", () => { addFiles([...inp.files]); inp.value = ""; });
        $("select").addEventListener("change", e => { sel = +e.target.value; grid = null; refresh(); });
        pop.addEventListener("click", e => {
            const b = e.target.closest("button");
            if (!b) return;
            if (b.classList.contains("x")) return close();
            if (b.dataset.k === "pick") return inp.click();
            if (b.dataset.k === "pw") return tryPw();
            if (b.dataset.cell) { cell = +b.dataset.cell; localStorage.setItem("r20_ccf_cell", String(cell)); return refresh(); }
            if (b.classList.contains("conv")) { conv = !conv; localStorage.setItem("r20_ccf_conv", String(conv)); return refresh(); }
            if (b.classList.contains("lay")) { lay = !lay; localStorage.setItem("r20_ccf_lay", String(lay)); return refresh(); }
            if (b.classList.contains("grid")) { grid = !grid; return refresh(); }
            if (b.classList.contains("pri")) { if (busy) { stop = true; prog("이번 그림까지 하고 멈춰요…"); } else if (pack) runPack(); else run(); }
        });
        // 판에 끌어다 놓은 파일은 Roll20 이 받지 않게 여기서 끝낸다
        pop.addEventListener("dragover", e => { e.preventDefault(); e.stopPropagation(); });
        pop.addEventListener("drop", e => { e.preventDefault(); e.stopPropagation(); if (!busy) addFiles([...e.dataTransfer.files]); });
        document.body.appendChild(pop);
    };
    const isOpen = () => !!pop && !pop.hidden;
    const open = at => { if (!isGM()) return; anchor = at; if (!pop) build(); pop.hidden = false; place(); refresh(); };
    const close = () => { if (pop) pop.hidden = true; };
    const toggle = at => (isOpen() ? close() : open(at));
    document.addEventListener("keydown", e => { if (e.key === "Escape" && isOpen() && pop.contains(document.activeElement)) close(); });
    window.addEventListener("resize", () => isOpen() && place());
    return { toggle, close };
})();

// ───────── 맵 맞추기 (GM): 페이지 크기 · 내용 자리를 격자를 지키며 맞춘다 — 맵 단추 밑 ─────────
// [격자 원칙] 크기는 절대 안 바꾸고(③ 배율 제외) 모든 것을 같은 거리만큼, 그것도 칸 단위로만 옮긴다 → 격자에 맞던 토큰은 계속 맞고,
//   160×16 장식 위에 70×70 토큰을 얹은 조합도 그대로. 정가운데에서 반 칸이 남으면 오른쪽 · 아래 여백이 한 칸 더 된다
// [격자에 맞추기] 칸에 딱 맞는 크기의 토큰들이 격자에서 같이 밀려 있으면, 그 밀림만큼 내용 전체를 한꺼번에 옮긴다(따로 어긋난 것은 보여 주기만)
// [같이 옮기는 것] 그림(모든 층) · 선(조명 벽 포함) · 글자. 그 밖의 것(문 · 창문 등)은 세어서 알린다
// [되돌리기] 마지막 한 번 — 페이지 크기와 옮긴 것의 자리 · 크기를 그대로
const mapFit = (() => {
    const RATIOS = [["free", "자유", 0], ["16:9", "16:9", 16 / 9], ["4:3", "4:3", 4 / 3], ["1:1", "1:1", 1], ["3:4", "3:4", 3 / 4], ["9:16", "9:16", 9 / 16], ["a4", "A4 세로", 1 / Math.SQRT2]];
    const MARGINS = [0, 1, 2, 5, 10, 20];
    const LAYERS = [["map", "맵"], ["objects", "토큰"], ["gmlayer", "GM"]];
    const KEY = "r20_fit";
    const st = Object.assign({ mode: "fit", ratio: "free", margin: 1, layers: ["map", "objects"], far: false }, (() => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { return {}; } })());
    const saveSt = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
    let pop = null, anchor = null, undo = null;
    const num = (m, k, d = 0) => { const v = parseFloat(m.get(k)); return Number.isFinite(v) ? v : d; };
    const page = () => window.Campaign?.activePage?.() || null;
    const cellOf = pg => 70 * (num(pg, "snapping_increment", 1) > 0 ? num(pg, "snapping_increment", 1) : 1);
    const mod = (a, b) => ((a % b) + b) % b;

    // ── 페이지 위의 것들: { m, kind, layer, box:{x0,y0,x1,y1} } ──
    const things = pg => {
        const out = [];
        const box = (cx, cy, w, h, rot) => {
            const r = (rot || 0) * Math.PI / 180, c = Math.abs(Math.cos(r)), s = Math.abs(Math.sin(r));
            const W = w * c + h * s, H = w * s + h * c;
            return { x0: cx - W / 2, y0: cy - H / 2, x1: cx + W / 2, y1: cy + H / 2 };
        };
        (pg.thegraphics?.models || []).forEach(m => out.push({ m, kind: "g", layer: m.get("layer") || "", box: box(num(m, "left"), num(m, "top"), num(m, "width"), num(m, "height"), num(m, "rotation")) }));
        (pg.thepaths?.models || []).forEach(m => {
            const pts = pathPts(m), b = pts && ptsBox(pts), sx = Math.abs(num(m, "scaleX", 1)), sy = Math.abs(num(m, "scaleY", 1));
            out.push({ m, kind: "p", v2: !!pts, layer: m.get("layer") || "",       // 새 선은 (x, y) 가 가운데, 크기는 점들 상자
                box: pts ? box(num(m, "x"), num(m, "y"), (b.x1 - b.x0) * sx, (b.y1 - b.y0) * sy, num(m, "rotation"))
                    : box(num(m, "left"), num(m, "top"), num(m, "width") * sx, num(m, "height") * sy, num(m, "rotation")) });
        });
        (pg.thetexts?.models || []).forEach(m => out.push({ m, kind: "t", layer: m.get("layer") || "", box: box(num(m, "left"), num(m, "top"), num(m, "width"), num(m, "height"), num(m, "rotation")) }));
        return out;
    };
    // 못 옮기는 다른 것들 (Jumpgate 의 문 · 창문 같은 모음) — 세기만 한다
    const others = pg => Object.keys(pg).filter(k => /^the/.test(k) && !["thegraphics", "thepaths", "thetexts"].includes(k) && Array.isArray(pg[k]?.models) && pg[k].models.length)
        .map(k => [k.replace(/^the/, ""), pg[k].models.length]);
    const bboxOf = list => list.length ? list.reduce((a, t) => ({ x0: Math.min(a.x0, t.box.x0), y0: Math.min(a.y0, t.box.y0), x1: Math.max(a.x1, t.box.x1), y1: Math.max(a.y1, t.box.y1) }),
        { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }) : null;

    // ── 덩어리 나누기: 상자를 세로 · 가로로 비춰 보아 큰 빈틈(30칸 또는 앞 덩어리 길이의 절반 이상)으로 갈라진 덩어리 가운데
    //    것이 가장 많은 쪽만 '내용'. 멀리 떨어진 GM 메모 하나 때문에 맵이 수백 칸이 되지 않게 (11-03 실제 Roll20) ──
    const mainIsland = list => {
        const split = (items, a0, a1) => {
            const sorted = items.slice().sort((p, q) => p.box[a0] - q.box[a0]), groups = [];
            let cur = [], start = 0, end = -Infinity;
            for (const t of sorted) {
                if (cur.length && t.box[a0] - end > Math.max(30 * 70, (end - start) / 2)) { groups.push(cur); cur = []; end = -Infinity; }
                if (!cur.length) start = t.box[a0];
                cur.push(t); end = Math.max(end, t.box[a1]);
            }
            if (cur.length) groups.push(cur);
            return groups.sort((x, y) => y.length - x.length)[0] || [];
        };
        let main = list;
        for (let i = 0; i < 3; i++) { const n = main.length; main = split(split(main, "y0", "y1"), "x0", "x1"); if (main.length === n) break; }
        return main;
    };
    // ── 격자: 칸에 딱 맞는 크기의 토큰(90° 단위로만 돈 것)들이 격자에서 얼마나 밀려 있나 ──
    const gridInfo = (list, cell) => {
        const toks = list.filter(t => t.kind === "g" && t.layer !== "gmlayer" && mod(num(t.m, "rotation"), 90) < 0.5)
            .filter(t => { const w = t.box.x1 - t.box.x0, h = t.box.y1 - t.box.y0; return w >= cell - 0.5 && h >= cell - 0.5 && Math.abs(w / cell - Math.round(w / cell)) < 0.01 && Math.abs(h / cell - Math.round(h / cell)) < 0.01; });
        const offs = toks.map(t => { let ox = mod(Math.round(t.box.x0), cell), oy = mod(Math.round(t.box.y0), cell); if (ox > cell - 1) ox = 0; if (oy > cell - 1) oy = 0; return { t, ox, oy }; });
        // 가장 많은 밀림 (1px 안쪽은 같은 것으로)
        const tally = new Map();
        offs.forEach(o => { const k = o.ox + "," + o.oy; tally.set(k, (tally.get(k) || 0) + 1); });
        let best = "0,0", bn = -1;
        tally.forEach((n, k) => { if (n > bn) { best = k; bn = n; } });
        const [bx, by] = best.split(",").map(Number);
        const near = (a, b) => Math.min(Math.abs(a - b), cell - Math.abs(a - b)) <= 1;
        const off = offs.filter(o => !(near(o.ox, bx) && near(o.oy, by)));
        return { toks: offs.length, ox: bx, oy: by, stray: off,
            // 다 같이 옮길 거리 — 가까운 쪽으로 (반 칸 넘게 밀렸으면 반대로)
            dx: bx ? (bx <= cell / 2 ? -bx : cell - bx) : 0, dy: by ? (by <= cell / 2 ? -by : cell - by) : 0, shared: bn };
    };

    // ── 계획 세우기: 페이지 크기(칸 = 70px 단위) · 옮길 거리 · 배율 ──
    // dx 는 칸(cell)의 배수로만. lo ≤ dx ≤ hi 에서 가운데(c)에 가장 가까운 것, 같으면 작은 쪽(남는 칸은 오른쪽 · 아래로)
    const pickShift = (lo, hi, c, cell) => {
        let best = null;
        for (let k = Math.ceil((lo - 1e-6) / cell); k * cell <= hi + 1e-6; k++) { const d = k * cell; if (best === null || Math.abs(d - c) < Math.abs(best - c) - 1e-6) best = d; }
        return best;
    };
    // 비율 r 에 1% 안쪽으로 가까운, w ≥ W · h ≥ H 인 가장 작은 (w, h)
    const fitRatio = (W, H, r) => {
        let best = null;
        const ok = (w, h) => w >= W && h >= H && Math.abs(w / h - r) / r <= 0.01;
        const take = (w, h) => { if (ok(w, h) && (!best || w * h < best[0] * best[1])) best = [w, h]; };
        for (let h = H; h < H + 400; h++) { take(Math.max(W, Math.round(h * r)), h); take(Math.max(W, Math.ceil(h * r)), h); }
        for (let w = W; w < W + 400; w++) { take(w, Math.max(H, Math.round(w / r))); take(w, Math.max(H, Math.ceil(w / r))); }
        return best || [W, H];
    };
    const plan = () => {
        const pg = page();
        if (!pg?.thegraphics) return { err: "페이지를 아직 불러오지 않았어요" };
        const cell = cellOf(pg), all = things(pg), layered = all.filter(t => st.layers.includes(t.layer));
        const W0px = num(pg, "width", 25) * 70, H0px = num(pg, "height", 25) * 70;
        const hits = (bx, W, H) => bx.x1 > 0.5 && bx.y1 > 0.5 && bx.x0 < W - 0.5 && bx.y0 < H - 0.5;
        // 내용 = 지금 맵과 겹치는 것. 맵 밖에 둔 것(예비 리소스 묶음 · 멀리 둔 메모)은 범위에서 뺀다 (11-03 실제 Roll20:
        // 맵 아래에 쌓아 둔 묶음이 시트보다 많아서 '가장 큰 덩어리'로 고르면 시트가 밀려났다). 맵 안에 아무것도 없으면 가장 큰 덩어리
        const inPage = layered.filter(t => hits(t.box, W0px, H0px));
        const main = inPage.length ? inPage : mainIsland(layered), far = layered.filter(t => !main.includes(t)), counted = st.far ? layered : main;
        const b0 = bboxOf(counted);
        if (!b0) return { err: "고른 층에 놓인 것이 없어요" };
        // 여백 · 크기는 맵과 같은 70px 칸으로 센다 (격자 한 칸이 7px 인 촘촘한 페이지도 있다). 옮기는 거리만 격자 칸 단위
        const W0 = num(pg, "width", 25), H0 = num(pg, "height", 25), m = Math.max(0, +st.margin || 0) * 70;
        let k = 1, b = b0;
        if (st.mode === "scale") {
            // 격자를 지키는 배율만: 키우기는 2 · 3 · 4배, 줄이기는 ½ · ⅓ · ¼ 중 칸에 딱 맞는 토큰이 모두 그 배수일 때만
            const g = gridInfo(counted, cell);
            const safeDown = d => g.stray.length === 0 && counted.filter(t => t.kind === "g").every(t => {
                const w = t.box.x1 - t.box.x0, h = t.box.y1 - t.box.y0;
                const isGrid = Math.abs(w / cell - Math.round(w / cell)) < 0.01 && Math.abs(h / cell - Math.round(h / cell)) < 0.01;
                return !isGrid || [w, h, t.box.x0 - g.ox, t.box.y0 - g.oy].every(v => Math.abs(mod(Math.round(v / cell), d)) < 1e-6);
            });
            const fits = f => (b0.x1 - b0.x0) * f + 2 * m <= W0 * 70 + 0.5 && (b0.y1 - b0.y0) * f + 2 * m <= H0 * 70 + 0.5;
            const cands = [4, 3, 2, 1, 1 / 2, 1 / 3, 1 / 4].filter(f => f >= 1 || safeDown(Math.round(1 / f)));
            k = cands.find(fits) || 0;
            if (!k) return { err: "격자를 지키며 맵 안에 맞출 배율이 없어요 — 여백을 줄이거나 '맵을 내용에'를 써 보세요" };
            b = { x0: b0.x0 * k, y0: b0.y0 * k, x1: b0.x1 * k, y1: b0.y1 * k };
        }
        const cw = b.x1 - b.x0, ch = b.y1 - b.y0;
        const r = st.mode === "fit" ? (RATIOS.find(x => x[0] === st.ratio) || RATIOS[0])[2] : 0;
        // 맞추기: 비율이 있으면 1% 안쪽 크기 · 없으면 딱 그만큼 / 가운데 · 배율: 넘치는 쪽만 늘린다
        const size = (nw, nh) => st.mode === "fit" ? (r ? fitRatio(Math.max(1, nw), Math.max(1, nh), r) : [Math.max(1, nw), Math.max(1, nh)]) : [Math.max(W0, nw), Math.max(H0, nh)];
        // 옮길 거리 — 칸 단위로, 여백을 지키며 가운데에 가장 가깝게. 칸이 안 들어가면 그쪽을 한 칸 늘려 크기(비율)부터 다시
        let nw = Math.ceil((cw + 2 * m - 0.5) / 70), nh = Math.ceil((ch + 2 * m - 0.5) / 70), Wu = W0, Hu = H0, dx = null, dy = null;
        for (let i = 0; i < 8; i++) {
            [Wu, Hu] = size(nw, nh);
            dx = pickShift(m - b.x0, Wu * 70 - m - b.x1, (Wu * 70 - cw) / 2 - b.x0, cell);
            dy = pickShift(m - b.y0, Hu * 70 - m - b.y1, (Hu * 70 - ch) / 2 - b.y0, cell);
            if (dx !== null && dy !== null) break;
            if (dx === null) nw = Wu + 1;
            if (dy === null) nh = Hu + 1;
        }
        if (dx === null || dy === null) return { err: "여백을 지키며 칸 단위로 놓을 자리를 못 찾았어요" };
        const L = b.x0 + dx, T = b.y0 + dy;
        // 맵 안에 있던 것이 밖으로 나가거나(out), 밖에 두었던 것이 새 맵 안으로 들어오는 것(into) — 층마다 센다
        const out = {}, into = {};
        let outFar = false;
        all.forEach(t => {
            const nb = { x0: t.box.x0 * k + dx, y0: t.box.y0 * k + dy, x1: t.box.x1 * k + dx, y1: t.box.y1 * k + dy };
            const was = hits(t.box, W0px, H0px), now = hits(nb, Wu * 70, Hu * 70), l = t.layer || "?";
            if (was && !now) { out[l] = (out[l] || 0) + 1; if (far.includes(t)) outFar = true; }
            if (!was && now) into[l] = (into[l] || 0) + 1;
        });
        return { pg, cell, all, k, dx, dy, W0, H0, Wu, Hu, cw, ch, far, margins: { l: L / 70, t: T / 70, r: (Wu * 70 - (L + cw)) / 70, b: (Hu * 70 - (T + ch)) / 70 },
            grid: cell >= 35 ? gridInfo(counted, cell) : null, others: others(pg), out, outFar, into, inPageCount: inPage.length };
    };

    // ── 적용 · 되돌리기 ──
    const snap = (t) => ({ m: t.m, a: Object.fromEntries(["left", "top", "x", "y", "width", "height", "scaleX", "scaleY", "font_size"].filter(k => t.m.get(k) !== undefined).map(k => [k, t.m.get(k)])) });
    const moveAll = (all, dx, dy, k = 1) => all.forEach(t => {
        const a = t.v2 ? { x: num(t.m, "x") * k + dx, y: num(t.m, "y") * k + dy } : { left: num(t.m, "left") * k + dx, top: num(t.m, "top") * k + dy };
        if (k !== 1) {
            if (t.kind === "g") { a.width = num(t.m, "width") * k; a.height = num(t.m, "height") * k; }
            if (t.kind === "p") { a.scaleX = num(t.m, "scaleX", 1) * k; a.scaleY = num(t.m, "scaleY", 1) * k; }
            if (t.kind === "t" && t.m.get("font_size") !== undefined) a.font_size = Math.round(num(t.m, "font_size", 16) * k);
        }
        t.m.save(a);
    });
    const remember = (pg, list) => { undo = { pg, page: { width: pg.get("width"), height: pg.get("height") }, items: list.map(snap) }; };
    const apply = () => {
        const p = plan();
        if (p.err) return say(p.err, true);
        remember(p.pg, p.all);
        moveAll(p.all, p.dx, p.dy, p.k);
        if (p.Wu !== p.W0 || p.Hu !== p.H0) p.pg.save({ width: p.Wu, height: p.Hu });
        say(`맞췄어요 — ${p.Wu}×${p.Hu}칸${p.k !== 1 ? ` · ${fmtK(p.k)}` : ""} · ${p.all.length}개 옮김`);
        draw();
    };
    const alignAll = () => {
        const p = plan();
        if (p.err) return say(p.err, true);
        if (!p.grid) return say("격자가 촘촘해서 격자 맞추기는 하지 않아요");
        if (!p.grid.dx && !p.grid.dy) return say("이미 격자에 맞아 있어요");
        remember(p.pg, p.all);
        moveAll(p.all, p.grid.dx, p.grid.dy);
        say(`내용 전체를 (${p.grid.dx}, ${p.grid.dy})px 옮겨 격자에 맞췄어요`);
        draw();
    };
    const alignStray = () => {
        const p = plan();
        if (p.err) return say(p.err, true);
        if (!p.grid) return say("격자가 촘촘해서 격자 맞추기는 하지 않아요");
        const s = p.grid.stray;
        if (!s.length) return say("따로 어긋난 토큰이 없어요");
        if (s.length > 3 && !confirm(`따로 어긋난 토큰 ${s.length}개를 하나씩 가장 가까운 격자선으로 옮겨요.\n격자에 안 맞춰 일부러 놓은 배치라면 조합이 틀어질 수 있어요 (되돌리기는 돼요). 할까요?`)) return;
        remember(p.pg, s.map(o => o.t));
        // 다른 토큰들과 같은 밀림으로 — 가까운 쪽 격자선으로 (크기는 그대로)
        const near = d => { d = mod(d, p.cell); return d <= p.cell / 2 ? -d : p.cell - d; };
        s.forEach(({ t, ox, oy }) => t.m.save({ left: num(t.m, "left") + near(ox - p.grid.ox), top: num(t.m, "top") + near(oy - p.grid.oy) }));
        say(`따로 어긋난 토큰 ${s.length}개를 격자에 붙였어요 (크기는 그대로)`);
        draw();
    };
    const doUndo = () => {
        if (!undo) return;
        undo.items.forEach(({ m, a }) => { try { m.save(a); } catch (e) {} });
        undo.pg.save(undo.page);
        undo = null;
        say("되돌렸어요");
        draw();
    };

    // ── 판 ──
    const fmtK = k => k >= 1 ? `${k}배` : `${Math.round(1 / k)}분의 1`;
    const LN = { map: "맵", objects: "토큰", gmlayer: "GM", walls: "벽", foreground: "앞" };
    const chip = (attr, v, label, on) => `<button type="button" ${attr}="${v}" aria-pressed="${on}">${label}</button>`;
    const say = (t, bad) => { const el = pop?.querySelector(".prog"); if (el) { el.textContent = t; el.classList.toggle("bad", !!bad); } };
    const draw = () => {
        if (!pop) return;
        const $ = s => pop.querySelector(s);
        $(".mode").innerHTML = [["fit", "맵을 내용에"], ["center", "내용을 가운데"], ["scale", "내용 크기 맞춤"]].map(([v, l]) => chip("data-mode", v, l, st.mode === v)).join("");
        $(".ratio").innerHTML = RATIOS.map(([v, l]) => chip("data-ratio", v, l, st.ratio === v)).join("");
        $(".rrow").hidden = st.mode !== "fit";
        $(".margin").innerHTML = MARGINS.map(v => chip("data-margin", v, v, +st.margin === v)).join("")
            + `<input type="number" min="0" max="200" step="1" aria-label="여백 직접 (칸)" placeholder="직접" value="${MARGINS.includes(+st.margin) ? "" : st.margin}">`;
        $(".layers").innerHTML = LAYERS.map(([v, l]) => chip("data-layer", v, l, st.layers.includes(v))).join("");
        const p = plan();
        $(".sum").textContent = "";
        $(".grid").textContent = "";
        if (p.err) { $(".sum").textContent = p.err; $(".pri").disabled = true; }
        else {
            $(".pri").disabled = false;
            const f = n => (Math.round(n * 10) / 10).toString();
            const lines = [`${f(p.W0)}×${f(p.H0)}칸 → ${p.Wu}×${p.Hu}칸${st.mode === "fit" && st.ratio !== "free" ? ` (${(RATIOS.find(x => x[0] === st.ratio) || [])[1]} ≈ ${(p.Wu / p.Hu).toFixed(2)})` : ""}${p.k !== 1 ? ` · ${fmtK(p.k)}` : ""}`,
                `내용 ${f(p.cw / 70)}×${f(p.ch / 70)}칸 · 격자 한 칸 ${f(p.cell / 70)}칸(${Math.round(p.cell * 10) / 10}px)`,
                `여백 위 ${f(p.margins.t)} · 아래 ${f(p.margins.b)} · 왼 ${f(p.margins.l)} · 오른 ${f(p.margins.r)}칸 · 전부 (${f(p.dx / 70)}, ${f(p.dy / 70)})칸 옮김`,
                `그림 ${p.all.filter(t => t.kind === "g").length} · 선 ${p.all.filter(t => t.kind === "p").length} · 글자 ${p.all.filter(t => t.kind === "t").length}개를 같이 옮겨요`];
            if (p.others.length) lines.push(`못 옮기는 것: ${p.others.map(([k, n]) => `${k} ${n}`).join(", ")}`);
            const outs = Object.entries(p.out);
            if (outs.length) lines.push(`⚠ 맵 안에 있다가 밖으로 나가는 것: ${outs.map(([l, n]) => `${LN[l] || l} ${n}개`).join(", ")} — ${p.outFar ? "'같이 세기'하면 들어와요" : "'범위를 셀 층'에 넣으면 같이 들어와요"}`);
            const ins = Object.entries(p.into);
            if (ins.length) lines.push(`⚠ 맵 밖에 두었다가 새 맵 안으로 들어오는 것: ${ins.map(([l, n]) => `${LN[l] || l} ${n}개`).join(", ")} — 여백을 줄이거나 그것들을 조금 떨어뜨려 두세요`);
            lines.forEach(l => { const d = document.createElement("div"); d.textContent = l; $(".sum").appendChild(d); });
            if (p.far.length) {
                const fl = document.createElement("div"), cnt = {};
                p.far.forEach(t => { cnt[t.layer] = (cnt[t.layer] || 0) + 1; });
                fl.textContent = `${p.inPageCount ? "맵 밖에 둔 것" : "멀리 떨어진 것"} ${p.far.length}개 (${Object.entries(cnt).map(([l, n]) => `${LN[l] || l} ${n}`).join(" · ")}) — ${st.far ? "같이 셌어요" : "범위에서 뺐어요"} `;
                fl.insertAdjacentHTML("beforeend", `<button type="button" data-act="far">${st.far ? "빼고 세기" : "같이 세기"}</button>`);
                $(".grid").appendChild(fl);
            }
            const g = p.grid;
            const gl = document.createElement("div");
            if (!g) gl.textContent = `격자가 촘촘해서(한 칸 ${Math.round(p.cell * 10) / 10}px) 격자 맞추기는 건너뛰어요 — 크기 · 간격은 그대로 옮겨요`;
            else if (!g.toks) gl.textContent = "칸에 딱 맞는 크기의 토큰이 없어요 — 격자 확인은 건너뛰어요";
            else if (!g.dx && !g.dy) gl.textContent = `칸 크기 토큰 ${g.toks}개 중 ${g.shared}개가 격자에 맞아요`;
            else { gl.textContent = `칸 크기 토큰 ${g.toks}개 중 ${g.shared}개가 격자에서 (${g.ox}, ${g.oy})px 밀려 있어요 `; gl.insertAdjacentHTML("beforeend", '<button type="button" data-act="align">다 같이 맞추기</button>'); }
            $(".grid").appendChild(gl);
            if (g?.stray.length) { const s = document.createElement("div"); s.textContent = `따로 어긋난 토큰 ${g.stray.length}개 `; s.insertAdjacentHTML("beforeend", '<button type="button" data-act="stray">그것도 붙이기</button>'); $(".grid").appendChild(s); }
        }
        $(".undo").disabled = !undo;
    };
    const build = () => {
        pop = document.createElement("div");
        pop.id = "r20-fit";
        pop.setAttribute("role", "dialog");
        pop.setAttribute("aria-label", "맵 맞추기");
        pop.innerHTML = '<div class="hd"><b>맵 맞추기</b><button type="button" class="x" aria-label="닫기">✕</button></div>'
            + '<div class="bd"><span class="lb">방식</span><div class="rg mode"></div>'
            + '<div class="rrow"><span class="lb">맵 비율 <small>1% 안쪽으로</small></span><div class="rg ratio"></div></div>'
            + '<span class="lb">여백 (칸) <small>가장 좁은 쪽</small></span><div class="rg margin"></div>'
            + '<span class="lb">범위를 셀 층 <small>옮기는 건 전부</small></span><div class="rg layers"></div>'
            + '<div class="grid"></div><div class="sum" aria-live="polite"></div>'
            + '<div class="go"><button type="button" class="undo">되돌리기</button><button type="button" class="pri">맞추기</button></div><div class="prog" aria-live="polite"></div></div>';
        pop.addEventListener("click", e => {
            const b = e.target.closest("button");
            if (!b) return;
            if (b.classList.contains("x")) return close();
            if (b.dataset.mode) st.mode = b.dataset.mode;
            else if (b.dataset.ratio) st.ratio = b.dataset.ratio;
            else if (b.dataset.margin != null) st.margin = +b.dataset.margin;
            else if (b.dataset.layer) { const v = b.dataset.layer; st.layers = st.layers.includes(v) ? st.layers.filter(x => x !== v) : [...st.layers, v]; }
            else if (b.dataset.act === "far") st.far = !st.far;
            else if (b.dataset.act === "align") return alignAll();
            else if (b.dataset.act === "stray") return alignStray();
            else if (b.classList.contains("undo")) return doUndo();
            else if (b.classList.contains("pri")) return apply();
            else return;
            saveSt(); say(""); draw();
        });
        pop.addEventListener("change", e => { if (e.target.matches(".margin input") && e.target.value !== "") { st.margin = Math.max(0, Math.min(200, Math.round(+e.target.value) || 0)); saveSt(); draw(); } });
        document.body.appendChild(pop);
    };
    const place = () => {
        if (!pop || !anchor?.isConnected) return;
        const r = anchor.getBoundingClientRect();
        Object.assign(pop.style, { top: zpx(Math.round(r.top)), right: zpx(Math.round(innerWidth - r.left + 8)) });
    };
    const isOpen = () => !!pop && !pop.hidden;
    const open = at => { if (!isGM()) return; anchor = at; if (!pop) build(); pop.hidden = false; place(); say(""); draw(); };
    const close = () => { if (pop) pop.hidden = true; };
    const toggle = at => (isOpen() ? close() : open(at));
    document.addEventListener("keydown", e => { if (e.key === "Escape" && isOpen() && pop.contains(document.activeElement)) close(); });
    window.addEventListener("resize", () => isOpen() && place());
    return { toggle, close };
})();
addCss(`
        /* 맵 맞추기 판 (맵 단추 밑) — 가져오기 판과 같은 모양 */
        #r20-fit { position:fixed; z-index:10006; display:flex; flex-direction:column; width:330px; max-width:calc((100vw - 32px) / var(--aio-z, 1)); max-height:calc(80vh / var(--aio-z, 1)); background:var(--aio-bg); border:1px solid var(--aio-line); border-radius:var(--aio-r-lg); box-shadow:0 8px 24px rgba(0,0,0,0.2); font:12px/1.5 sans-serif; color:var(--aio-ink-2); }
        #r20-fit[hidden] { display:none; }
        #r20-fit .hd { display:flex; align-items:center; justify-content:space-between; padding:6px 8px; border-bottom:1px solid var(--aio-line-4); }
        #r20-fit .bd { display:flex; flex-direction:column; gap:5px; padding:6px 8px 8px; overflow-y:auto; }
        #r20-fit .rrow[hidden] { display:none; }
        #r20-fit .rrow { display:flex; flex-direction:column; gap:5px; }
        #r20-fit .lb { font-weight:700; color:var(--aio-ink-2); } #r20-fit .lb small { font-weight:400; color:var(--aio-ink-5); margin-left:4px; }
        #r20-fit .rg, #r20-fit .go { display:flex; align-items:center; gap:4px; flex-wrap:wrap; }
        #r20-fit .go { justify-content:flex-end; margin-top:2px; }
        #r20-fit button { height:22px; margin:0; padding:0 9px; border:1px solid var(--aio-line); border-radius:var(--aio-r-sm); background:var(--aio-bg); color:var(--aio-ink-2); font:700 11px/20px sans-serif; cursor:pointer; }
        #r20-fit button:disabled { opacity:.5; cursor:default; }
        #r20-fit button:focus-visible, #r20-fit input:focus-visible { outline:2px solid var(--aio-accent); outline-offset:1px; }
        #r20-fit button[aria-pressed=true], #r20-fit .pri { background:var(--aio-accent); border-color:var(--aio-accent); color:#fff; }
        #r20-fit .x { padding:0 6px; }
        #r20-fit .margin input { width:52px; height:22px; margin:0; padding:0 5px; border:1px solid var(--aio-line); border-radius:var(--aio-r-sm); font-size:11px; }
        #r20-fit .grid { display:flex; flex-direction:column; gap:3px; padding:5px 7px; border-radius:var(--aio-r-sm); background:#fff7e6; color:#7a5410; font-size:11px; }
        #r20-fit .grid:empty { display:none; }
        #r20-fit .grid button { height:20px; margin-left:4px; padding:0 7px; font-size:10.5px; line-height:18px; }
        #r20-fit .sum { padding:5px 7px; border-radius:var(--aio-r-sm); background:var(--aio-bg-3); color:var(--aio-ink-3); font-size:11px; }
        #r20-fit .sum:empty { display:none; }
        #r20-fit .prog { color:#2e7d4f; font-size:11px; } #r20-fit .prog.bad { color:#c0392b; } #r20-fit .prog:empty { display:none; }
`);

addCss(`
        /* 맵 단추 (화면 제어 줄 맨 아래): 누르면 촬영 · 가져오기 · 페이지 설정 단추가 아래로 펼쳐진다 */
        #r20-mapshot { position:fixed; z-index:3000; width:28px; height:28px; }
        #r20-mapshot button { width:28px; height:28px; margin:0; padding:0; display:flex; align-items:center; justify-content:center; border:0; border-radius:var(--aio-r); background:rgba(245,245,247,0.94); color:var(--aio-ink-3); box-shadow:0 1px 3px rgba(0,0,0,0.3); cursor:pointer; }
        #r20-mapshot button:hover, #r20-mapshot.open > .main { color:var(--aio-accent); }
        #r20-mapshot button:focus-visible, #r20-ccf button:focus-visible, #r20-ccf select:focus-visible { outline:2px solid var(--aio-accent); outline-offset:1px; }
        #r20-mapshot .tray { position:absolute; top:100%; right:0; display:flex; flex-direction:column; gap:4px; padding-top:4px; opacity:0; visibility:hidden; transform:translateY(-12px); pointer-events:none; transition:transform .18s ease, opacity .18s ease, visibility 0s linear .18s; }
        #r20-mapshot .tray button { border-top-right-radius:0; border-bottom-right-radius:0; }
        #r20-mapshot.open .tray { opacity:1; visibility:visible; transform:none; pointer-events:auto; transition:transform .18s ease, opacity .18s ease; }
        #r20-mapshot .shot[data-state=ok] { color:#2e8b57; }
        #r20-mapshot .shot[data-state=warn] { color:#c98a00; }
        #r20-mapshot .shot[data-state=bad] { color:#c0392b; }
        #r20-mapshot .spin, #custom-capture-copy .spin, .ui-dialog-titlebar .r20shot .spin { transform-origin:12px 12px; animation:r20cap-spin .8s linear infinite; }
        @media (prefers-reduced-motion: reduce) { #r20-mapshot .tray { transition:none; } }
        /* 코코포리아 맵 가져오기 판 (맵 단추 밑) */
        #r20-ccf { position:fixed; z-index:10006; display:flex; flex-direction:column; width:320px; max-width:calc((100vw - 32px) / var(--aio-z, 1)); max-height:calc(80vh / var(--aio-z, 1)); background:var(--aio-bg); border:1px solid var(--aio-line); border-radius:var(--aio-r-lg); box-shadow:0 8px 24px rgba(0,0,0,0.2); font:12px/1.5 sans-serif; color:var(--aio-ink-2); }
        #r20-ccf[hidden] { display:none; }
        #r20-ccf .hd { display:flex; align-items:center; justify-content:space-between; padding:6px 8px; border-bottom:1px solid var(--aio-line-4); }
        #r20-ccf .bd { display:flex; flex-direction:column; gap:6px; padding:6px 8px 8px; overflow-y:auto; }
        #r20-ccf .rg, #r20-ccf .go { display:flex; align-items:center; gap:4px; flex-wrap:wrap; }
        #r20-ccf .set { display:flex; flex-direction:column; gap:6px; }
        #r20-ccf .set[hidden] { display:none; }
        #r20-ccf .rg > span, #r20-ccf .fn, #r20-ccf .info, #r20-ccf .pg, #r20-ccf .prog { color:var(--aio-ink-4); font-size:11px; }
        #r20-ccf .fn { min-width:0; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; flex:1; }
        #r20-ccf .pw[hidden], #r20-ccf input[type=file] { display:none !important; }
        #r20-ccf .pw input { flex:1; min-width:0; height:24px; margin:0; padding:0 6px; border:1px solid var(--aio-line); border-radius:var(--aio-r-sm); font-size:12px; }
        #r20-ccf .pw input:focus { outline:2px solid var(--aio-accent); outline-offset:-1px; border-color:var(--aio-accent); }
        #r20-ccf button { height:22px; margin:0; padding:0 9px; border:1px solid var(--aio-line); border-radius:var(--aio-r-sm); background:var(--aio-bg); color:var(--aio-ink-2); font:700 11px/20px sans-serif; cursor:pointer; }
        #r20-ccf button:disabled { opacity:.6; cursor:default; }
        #r20-ccf button[aria-pressed=true], #r20-ccf .pri { background:var(--aio-accent); border-color:var(--aio-accent); color:#fff; }
        #r20-ccf .x { padding:0 6px; }
        #r20-ccf .scn { margin:0; flex-wrap:nowrap; font-weight:400; }
        #r20-ccf .scn[hidden] { display:none; }
        #r20-ccf select { flex:1; min-width:0; height:24px; margin:0; padding:0 4px; font-size:12px; }
        #r20-ccf .pv { display:block; max-width:100%; margin:0 auto; border-radius:var(--aio-r-sm); }
        #r20-ccf .pv[hidden] { display:none; }
        #r20-ccf .sw { display:flex; align-items:center; gap:6px; margin-left:auto; padding:0; border:0; background:none; font-weight:400; }
        #r20-ccf .conv, #r20-ccf .lay { align-self:flex-start; margin-left:0; }
        #r20-ccf .conv[hidden], #r20-ccf .lay[hidden] { display:none; }
        #r20-ccf .sw i { position:relative; width:26px; height:14px; border-radius:var(--aio-r); background:var(--aio-bg-5); }
        #r20-ccf .sw i::after { content:""; position:absolute; top:2px; left:2px; width:10px; height:10px; border-radius:50%; background:var(--aio-bg); transition:left .15s; }
        #r20-ccf .sw[aria-checked=true] i { background:var(--aio-accent); }
        #r20-ccf .sw[aria-checked=true] i::after { left:14px; }
        #r20-ccf .pg b { color:var(--aio-ink-2); }
        #r20-ccf .pg i { display:inline-block; width:10px; height:10px; margin:0 3px 0 4px; border:1px solid var(--aio-line); border-radius:2px; vertical-align:-1px; }
        #r20-ccf .warn { color:#c98a00; font-size:11px; }
        #r20-ccf .warn:empty { display:none; }
        /* 대화 캡처: 고르는 동안 메시지를 눌러 고르고, 고른 것은 왼쪽 막대 + 옅은 배경 */
        #textchat.r20cap-on .content > .message { cursor:pointer; user-select:none; }
        #textchat.r20cap-on .content > .message:hover { box-shadow:inset 3px 0 0 var(--aio-accent-mid) !important; }
        #textchat .content > .message.r20cap-sel { box-shadow:inset 3px 0 0 var(--aio-accent) !important; background-color:rgba(225,0,133,0.08) !important; }
        #custom-capture-copy:disabled { cursor:default; }
        #custom-capture-copy b { font:700 10px/1 sans-serif; }
        @keyframes r20cap-spin { to { transform:rotate(360deg); } }
        /* 시트 촬영: 캐릭터 창 제목(float:left) 바로 옆 단추 — 제목 글자 가운데 높이에 맞춘다. 창을 접으면 Roll20 이 제목줄 단추와 함께 숨긴다 */
        .ui-dialog-titlebar .r20shot { float:left; width:26px; height:24px; margin:9px 0 0 2px; padding:0; border:0; border-radius:var(--aio-r-sm); background:none; color:var(--aio-ink-5); display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:none; }
        .ui-dialog-titlebar .r20shot:hover { background:rgba(225,0,133,0.1); color:var(--aio-accent); }
        .ui-dialog-titlebar .r20shot:focus-visible, #r20ss button:focus-visible, #r20ss-bar button:focus-visible { outline:2px solid var(--aio-accent); outline-offset:1px; }
        .ui-dialog-titlebar .r20shot[data-state="ok"] { color:#2e8b57; }
        .ui-dialog-titlebar .r20shot[data-state="bad"] { color:#c0392b; }
        .ui-dialog-titlebar .r20shot[data-state="load"] { cursor:progress; }
        /* 시트 촬영 미리보기: 드래그로 고른 곳만 밝게(바깥은 그림자로 어둡게) */
        #r20ss { position:fixed; inset:0; z-index:100010; display:flex; align-items:center; justify-content:center; padding:16px; background:rgba(0,0,0,0.5); box-sizing:border-box; }
        #r20ss .r20ss-panel { display:flex; flex-direction:column; width:min(920px, 100%); max-height:100%; background:var(--aio-bg); border-radius:var(--aio-r); box-shadow:0 8px 30px rgba(0,0,0,0.35); overflow:hidden; font:13px/1.4 sans-serif; color:var(--aio-ink-2); }
        #r20ss .r20ss-head { display:flex; align-items:center; gap:8px; padding:8px 8px 8px 14px; border-bottom:1px solid var(--aio-line-3); }
        #r20ss .r20ss-head strong { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:14px; }
        #r20ss .r20ss-x { width:30px; height:30px; margin:0; padding:0; border:0; border-radius:var(--aio-r-sm); background:none; color:var(--aio-ink-4); font-size:16px; line-height:30px; cursor:pointer; box-shadow:none; }
        #r20ss .r20ss-x:hover { background:var(--aio-bg-3); color:var(--aio-ink-2); }
        #r20ss .r20ss-body { flex:1; min-height:0; overflow:auto; padding:12px; background:var(--aio-bg-4); }
        #r20ss .r20ss-pic { position:relative; width:fit-content; max-width:100%; margin:0 auto; overflow:hidden; cursor:crosshair; user-select:none; touch-action:none; box-shadow:0 1px 4px rgba(0,0,0,0.2); }
        #r20ss .r20ss-pic img { display:block; max-width:100%; height:auto; margin:0; pointer-events:none; }
        #r20ss .r20ss-sel { position:absolute; border:2px solid var(--aio-accent); background:rgba(225,0,133,0.06); box-shadow:0 0 0 9999px rgba(0,0,0,0.35); box-sizing:border-box; pointer-events:none; }
        #r20ss .r20ss-foot { display:flex; align-items:center; flex-wrap:wrap; gap:8px; padding:8px 12px; border-top:1px solid var(--aio-line-3); }
        #r20ss .r20ss-info { flex:1; min-width:160px; color:var(--aio-ink-4); font-size:12px; }
        #r20ss .r20ss-foot button { height:30px; margin:0; padding:0 14px; border:1px solid var(--aio-line); border-radius:var(--aio-r-sm); background:var(--aio-bg); color:var(--aio-ink-2); font-size:12px; font-weight:bold; cursor:pointer; box-shadow:none; text-shadow:none; }
        #r20ss .r20ss-foot button.pri, #r20ss-bar button.pri { background:var(--aio-accent); border-color:var(--aio-accent); color:#fff; }
        #r20ss .r20ss-foot button:disabled, #r20ss-bar button:disabled { opacity:0.45; cursor:default; }
        .ui-dialog-titlebar .r20shot.on { background:rgba(225,0,133,0.14); color:var(--aio-accent); }
        /* 숨길 부분 고르기 띠: 화면 아래 가운데에 떠서 시트를 가리지 않는다 */
        #r20ss-bar { position:fixed; left:50%; bottom:16px; transform:translateX(-50%); z-index:100009; display:flex; flex-wrap:wrap; align-items:center; gap:6px 10px; width:max-content; max-width:calc((100vw - 32px) / var(--aio-z, 1)); padding:8px 10px; background:var(--aio-bg); border:1px solid var(--aio-line); border-radius:var(--aio-r-lg); box-shadow:0 6px 24px rgba(0,0,0,0.25); font:12px/1.4 sans-serif; color:var(--aio-ink-2); box-sizing:border-box; }
        #r20ss-bar .r20ss-hint { min-width:220px; max-width:360px; color:var(--aio-ink-3); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        #r20ss-bar .r20ss-grp { display:inline-flex; align-items:center; gap:4px; }
        #r20ss-bar .r20ss-n { margin-right:2px; font-weight:bold; color:var(--aio-accent); }
        #r20ss-bar button { height:28px; margin:0; padding:0 10px; border:1px solid var(--aio-line); border-radius:var(--aio-r-sm); background:var(--aio-bg); color:var(--aio-ink-2); font-size:12px; font-weight:bold; cursor:pointer; box-shadow:none; text-shadow:none; }
        #r20ss-bar button:hover:not(:disabled) { background:var(--aio-bg-3); }
        #r20ss-bar .r20ss-mem { display:inline-flex; align-items:center; gap:4px; width:auto; margin:0; padding:0; font-size:12px; font-weight:normal; color:var(--aio-ink-3); cursor:pointer; }
        #r20ss-bar .r20ss-mem input { margin:0; width:auto; height:auto; }
`);
addFeature("chatCapture", chatCapture);
addFeature("sheetShot", sheetShot);
addFeature("mapShot", mapShot);
addFeature("logBackup", logBackup);
addBundle({ place: "main", order: 6, label: "대화 캡처 · 시트 촬영 · 맵(촬영 · 맞추기 · 코코포리아 가져오기) · 로그 백업", sub: "시트 촬영 단추는 캐릭터 창 제목 옆 · 로그 백업 단추는 채팅 아카이브 페이지 오른쪽 아래에",
    members: [["capture", "chatCapture"], ["sheetshot", "sheetShot"], ["mapshot", "mapShot"], ["logbak", "logBackup"]] });

// ══════════ 묶음 3 · 토큰 · 클릭 메뉴 · 화면 간소화 ══════════

// ───────── 면 선택: 다면 토큰의 Choose Side 창을 썸네일 격자로 (슬라이더 대신 눌러서 고르기) ─────────
// Roll20 창과 이미지는 그대로 두고, 고른 면에 맞춰 Roll20 슬라이더를 움직인 뒤 원래 [Choose] 로 적용한다
const sidePicker = (() => {
    let size = Math.max(48, Math.min(220, parseInt(localStorage.getItem("r20_cs_size"), 10) || 96));
    const choicesOf = dlg => [...dlg.querySelectorAll(".sidechoices > .sidechoice")];

    const select = (dlg, idx) => {
        const list = choicesOf(dlg);
        if (idx < 0 || idx >= list.length) return;
        const $ = window.$ || window.jQuery, sl = dlg.querySelector(".sideslider");
        let done = false;
        // Roll20 의 [Choose] 는 setTokenSide(tt) — tt 는 창에 걸린 'slide' 이벤트 처리기만 바꾼다.
        // 그래서 값만 넣지 않고, 끌었을 때처럼 slide 이벤트를 보내 그 처리기를 태운다
        if ($ && sl) {
            try {
                const min = $(sl).slider("option", "min"), max = $(sl).slider("option", "max");
                if (typeof min === "number" && typeof max === "number") {
                    const v = max - min === list.length - 1 ? min + idx : Math.round(min + idx * (max - min) / Math.max(1, list.length - 1));
                    $(sl).slider("value", v);
                    $(sl).trigger("slide", { value: v, handle: sl.querySelector(".ui-slider-handle") });
                    done = $(sl).slider("value") === v;
                }
            } catch (e) { /* 슬라이더를 만든 jQuery 가 아님 → 아래 마우스 방식 */ }
        }
        // 아니면 슬라이더 막대를 그 자리에서 누른 것처럼 마우스 이벤트를 보내 Roll20 처리기를 그대로 태운다
        // (숨겨 둔 슬라이더는 잠깐 보이지 않게 펼쳐 위치를 잰다 · 값 범위는 0 ~ 면 수-1)
        if (!done && sl && list.length > 1) {
            dlg.classList.add("r20cs-drive");
            try {
                const r = sl.getBoundingClientRect();
                const o = { bubbles: true, cancelable: true, view: window, button: 0, clientX: r.left + (idx / (list.length - 1)) * r.width, clientY: r.top + r.height / 2 };
                sl.dispatchEvent(new MouseEvent("mousedown", { ...o, buttons: 1 }));
                sl.dispatchEvent(new MouseEvent("mouseup", o));
            } finally { dlg.classList.remove("r20cs-drive"); }
        }
        list.forEach((c, i) => c.setAttribute("data-selected", String(i === idx)));
        const bar = dlg.querySelector(".r20cs-bar");
        if (bar) {
            bar.querySelector(".r20cs-num").textContent = `${idx + 1}번`;
            bar.querySelector("input").value = idx + 1;
        }
    };
    const choose = dlg => {
        const btns = [...dlg.querySelectorAll(".ui-dialog-buttonset button")];
        (btns.find(b => /choose/i.test(b.textContent)) || btns[0])?.click();
    };

    const enhance = dlg => {
        const list = choicesOf(dlg), cur = Math.max(0, list.findIndex(c => c.getAttribute("data-selected") === "true"));
        dlg.classList.add("r20cs");
        dlg._r20csFirst = list[0];
        dlg.style.setProperty("--cs-size", size + "px");
        list[cur]?.classList.add("r20cs-cur");
        const bar = document.createElement("div");
        bar.className = "r20cs-bar";
        bar.innerHTML = '<strong class="r20cs-num"></strong><span class="r20cs-info"></span><span class="r20cs-flex"></span>'
            + '<label>번호로 가기 <input type="number" min="1" aria-label="번호로 가기"></label>'
            + '<span class="r20cs-zoom"><button type="button" data-d="-1" aria-label="썸네일 작게">−</button><button type="button" data-d="1" aria-label="썸네일 크게">+</button></span>';
        bar.querySelector(".r20cs-num").textContent = `${cur + 1}번`;
        bar.querySelector(".r20cs-info").textContent = `/ 전체 ${list.length}면 · 지금 ${cur + 1}번 · 더블클릭하면 바로 적용`;
        const inp = bar.querySelector("input");
        inp.max = list.length;
        inp.value = cur + 1;
        inp.addEventListener("keydown", e => { e.stopPropagation(); if (e.key === "Enter") choose(dlg); });
        inp.addEventListener("input", () => {
            const n = parseInt(inp.value, 10);
            if (n >= 1 && n <= list.length) { select(dlg, n - 1); list[n - 1].scrollIntoView({ block: "nearest" }); }
        });
        bar.querySelectorAll(".r20cs-zoom button").forEach(b => b.addEventListener("click", () => {
            size = Math.max(48, Math.min(220, size + Number(b.dataset.d) * 16));
            localStorage.setItem("r20_cs_size", size);
            dlg.style.setProperty("--cs-size", size + "px");
        }));
        dlg.querySelector(".ui-dialog-titlebar")?.after(bar);
        // 창을 키워서 화면 가운데로
        const w = Math.min(760, window.innerWidth - 40);
        dlg.style.width = w + "px";
        dlg.style.left = Math.max(10, (window.innerWidth - w) / 2) + "px";
        dlg.style.top = Math.max(10, (window.innerHeight - dlg.offsetHeight) / 2) + "px";
        list[cur]?.scrollIntoView({ block: "center" });
    };

    // 토큰 메뉴에서 이전·다음·처음·마지막 면을 고르면: Roll20 의 면 선택 창이 뜨는 대로 보이지 않게 골라 적용한다
    let auto = null, autoTimer = null;
    const endAuto = () => {
        auto = null; clearTimeout(autoTimer);
        setTimeout(() => document.body.classList.remove("r20cs-auto"), 300);      // 닫히는 창이 번쩍이지 않게
    };
    const startAuto = act => {
        auto = act;
        document.body.classList.add("r20cs-auto");
        clearTimeout(autoTimer);
        autoTimer = setTimeout(() => { if (auto) { console.warn("[토큰 메뉴] 면 선택 창이 뜨지 않음"); endAuto(); } }, 3000);
    };
    const runAuto = () => {
        const dlg = [...document.querySelectorAll(".ui-dialog:has(.sidechoices > .sidechoice)")].find(d => getComputedStyle(d).display !== "none");
        if (!dlg) return;
        const list = choicesOf(dlg), n = list.length, cur = Math.max(0, list.findIndex(c => c.getAttribute("data-selected") === "true"));
        const to = { prev: (cur - 1 + n) % n, next: (cur + 1) % n, first: 0, last: n - 1 }[auto];
        endAuto();
        select(dlg, to);
        choose(dlg);
    };

    const inject = () => {
        if (auto) return runAuto();
        if (!btnVisible.sidepick) return;
        document.querySelectorAll(".ui-dialog:has(.sidechoices > .sidechoice)").forEach(dlg => {
            const first = dlg.querySelector(".sidechoices > .sidechoice");
            if (dlg.classList.contains("r20cs")) {
                if (dlg._r20csFirst === first) return;
                // Roll20 이 같은 창을 다른 토큰으로 다시 쓴 경우: 새로 꾸민다
                dlg.querySelector(".r20cs-bar")?.remove();
                dlg.querySelectorAll(".r20cs-cur").forEach(c => c.classList.remove("r20cs-cur"));
            }
            enhance(dlg);
        });
    };
    const pick = (e, apply) => {
        const c = e.target.closest?.(".ui-dialog.r20cs .sidechoice");
        if (!c) return;
        const dlg = c.closest(".ui-dialog");
        select(dlg, choicesOf(dlg).indexOf(c));
        if (apply) choose(dlg);
    };
    document.addEventListener("click", e => pick(e, false), true);
    document.addEventListener("dblclick", e => pick(e, true), true);
    // 면 자동 고르기 중에는 매번 (창이 다시 보이기만 할 수도 있어서)
    return { inject, startAuto, get watch() { return auto ? null : ".ui-dialog"; } };
})();

// ───────── 면 순서 창: 여러 면 토큰의 면 · 굴림표 항목 순서를 끌어서(또는 단추로) 바꾼다 — 토큰 메뉴 · 일괄 편집기가 같이 쓴다 ─────────
// open({ title, sub, items:[{src, name}], cur, onSave(order) }) — order 는 남긴 항목의 원래 번호를 새 순서대로 (뺀 것은 없다)
const sideOrder = (() => {
    let box = null, prevFocus = null;
    const close = () => {
        if (!box) return;
        box.remove(); box = null;
        document.removeEventListener("keydown", onKey, true);
        prevFocus?.focus?.(); prevFocus = null;
    };
    const onKey = e => { if (e.key === "Escape" && box) { e.preventDefault(); e.stopPropagation(); close(); } };
    const open = ({ title, sub = "", items, cur = -1, unit = "면", onSave }) => {
        close();
        prevFocus = document.activeElement;
        let list = items.map((it, i) => ({ ...it, i })), sel = Math.max(0, list.findIndex(x => x.i === cur)), dragFrom = -1;
        box = document.createElement("div");
        box.className = "r20so";
        box.innerHTML = `<div class="r20so-dlg" role="dialog" aria-modal="true" aria-labelledby="r20so-t">
            <div class="r20so-h"><b id="r20so-t"></b><small></small><button type="button" class="r20so-x" aria-label="닫기">✕</button></div>
            <div class="r20so-grid" role="listbox" aria-label="면 순서"></div>
            <div class="r20so-bar">
                <button type="button" data-m="prev">‹ 앞으로</button><button type="button" data-m="next">뒤로 ›</button>
                <button type="button" data-m="first">맨 앞</button><button type="button" data-m="last">맨 뒤</button>
                <button type="button" data-m="drop">이 ${unit} 빼기</button><button type="button" data-m="rev">거꾸로</button></div>
            <p class="r20so-hint">끌어서 놓거나, 하나 누르고 단추로 옮겨요 · ← → 고르기 · Shift + ← → 옮기기</p>
            <div class="r20so-f"><button type="button" data-m="cancel">취소</button><button type="button" class="pri" data-m="save">저장</button></div></div>`;
        box.querySelector("#r20so-t").textContent = title;
        box.querySelector(".r20so-h small").textContent = sub;
        const grid = box.querySelector(".r20so-grid");
        const move = (from, to) => {
            if (from < 0 || from >= list.length) return;
            to = Math.max(0, Math.min(list.length - 1, to));
            const [x] = list.splice(from, 1);
            list.splice(to, 0, x);
            sel = to;
        };
        const draw = (focus) => {
            grid.textContent = "";
            list.forEach((it, k) => {
                const t = document.createElement("button");
                t.type = "button"; t.className = "r20so-t" + (k === sel ? " sel" : "") + (it.i === cur ? " cur" : "");
                t.draggable = true; t.dataset.k = k;
                t.setAttribute("role", "option"); t.setAttribute("aria-selected", String(k === sel));
                t.setAttribute("aria-label", `${k + 1}번${it.name ? " " + it.name : ""}${it.i === cur ? " · 지금 면" : ""}`);
                const n = document.createElement("b"); n.textContent = k + 1; t.appendChild(n);
                if (it.src) { const im = document.createElement("img"); im.src = r20img(it.src); im.alt = ""; im.loading = "lazy"; t.appendChild(im); }
                else { const s = document.createElement("span"); s.className = "r20so-txt"; s.textContent = it.name || "(빈 항목)"; t.appendChild(s); }
                if (it.i === cur) { const c = document.createElement("i"); c.textContent = "지금"; t.appendChild(c); }
                grid.appendChild(t);
            });
            box.querySelector('[data-m="drop"]').disabled = list.length <= 1;
            if (focus) grid.children[sel]?.focus();
        };
        grid.addEventListener("click", e => { const t = e.target.closest(".r20so-t"); if (!t) return; sel = +t.dataset.k; draw(true); });
        grid.addEventListener("keydown", e => {
            if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
            e.preventDefault();
            const d = e.key === "ArrowLeft" ? -1 : 1;
            if (e.shiftKey) move(sel, sel + d); else sel = Math.max(0, Math.min(list.length - 1, sel + d));
            draw(true);
        });
        // 끌어서 놓기 — 놓은 칸의 왼쪽 절반이면 그 앞, 오른쪽 절반이면 그 뒤에
        const at = e => { const t = e.target.closest?.(".r20so-t"); if (!t) return -1; const r = t.getBoundingClientRect(); return +t.dataset.k + (e.clientX > r.left + r.width / 2 ? 1 : 0); };
        grid.addEventListener("dragstart", e => { const t = e.target.closest(".r20so-t"); if (!t) return; dragFrom = +t.dataset.k; t.classList.add("drag"); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", ""); });
        grid.addEventListener("dragover", e => {
            if (dragFrom < 0) return;
            e.preventDefault();
            grid.querySelectorAll(".ins-l,.ins-r").forEach(x => x.classList.remove("ins-l", "ins-r"));
            const p = at(e); if (p < 0) return;
            const t = grid.children[Math.min(p, list.length - 1)];
            t?.classList.add(p >= list.length ? "ins-r" : "ins-l");
        });
        grid.addEventListener("drop", e => { e.preventDefault(); const p = at(e); if (dragFrom >= 0 && p >= 0) move(dragFrom, p > dragFrom ? p - 1 : p); dragFrom = -1; draw(true); });
        grid.addEventListener("dragend", () => { dragFrom = -1; draw(false); });
        box.addEventListener("click", e => {
            if (e.target === box) return close();        // 바깥(어두운 판)을 누르면 닫기
            const m = e.target.closest("[data-m]")?.dataset.m;
            if (!m && !e.target.closest(".r20so-x")) return;
            if (!m || m === "cancel") return close();
            if (m === "prev") move(sel, sel - 1);
            else if (m === "next") move(sel, sel + 1);
            else if (m === "first") move(sel, 0);
            else if (m === "last") move(sel, list.length - 1);
            else if (m === "rev") { list.reverse(); sel = list.length - 1 - sel; }
            else if (m === "drop" && list.length > 1) { list.splice(sel, 1); sel = Math.min(sel, list.length - 1); }
            else if (m === "save") { const order = list.map(x => x.i); close(); onSave?.(order); return; }
            draw(true);
        });
        document.addEventListener("keydown", onKey, true);
        document.body.appendChild(box);
        draw(true);
    };
    return { open, close };
})();
addCss(`
    .r20so { position:fixed; inset:0; z-index:100005; background:rgba(0,0,0,0.35); display:flex; align-items:center; justify-content:center; }
    .r20so-dlg { width:min(470px, calc((100vw - 32px) / var(--aio-z, 1))); max-height:calc((100vh - 40px) / var(--aio-z, 1)); display:flex; flex-direction:column; background:var(--aio-bg); color:var(--aio-ink);
        border-radius:var(--aio-r-lg); box-shadow:0 10px 34px rgba(0,0,0,0.3); font:14px/1.5 system-ui, "Malgun Gothic", sans-serif; }
    .r20so-h { display:flex; align-items:baseline; gap:8px; padding:12px 14px 10px; border-bottom:1px solid var(--aio-line-3); }
    .r20so-h b { font-size:15px; } .r20so-h small { color:var(--aio-ink-4); font-size:12px; }
    .r20so-x { margin-left:auto; border:0; background:none; font-size:16px; color:var(--aio-ink-4); cursor:pointer; padding:2px 6px; border-radius:var(--aio-r); }
    .r20so-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(88px, 1fr)); gap:10px; padding:14px; overflow:auto; }
    .r20so-t { position:relative; aspect-ratio:1; padding:6px; border:2px solid var(--aio-line-2); border-radius:var(--aio-r-lg); background:var(--aio-bg-3); cursor:grab;
        display:flex; align-items:center; justify-content:center; overflow:visible; }
    .r20so-t img { max-width:100%; max-height:100%; object-fit:contain; pointer-events:none; }
    .r20so-t b { position:absolute; left:5px; top:2px; font-size:11px; color:var(--aio-ink-3); font-weight:600; }
    .r20so-t i { position:absolute; right:4px; bottom:3px; font:600 10px/1.5 system-ui, sans-serif; background:var(--aio-accent-dark); color:#fff; border-radius:var(--aio-r); padding:0 5px; }
    .r20so-txt { font-size:12px; color:var(--aio-ink-2); text-align:center; word-break:keep-all; overflow:hidden; max-height:100%; }
    .r20so-t.sel { border-color:var(--aio-accent); box-shadow:0 0 0 3px var(--aio-accent-soft); }
    .r20so-t.drag { opacity:.35; border-style:dashed; }
    .r20so-t.ins-l::before, .r20so-t.ins-r::after { content:""; position:absolute; top:6px; bottom:6px; width:3px; border-radius:2px; background:var(--aio-accent); }
    .r20so-t.ins-l::before { left:-8px; } .r20so-t.ins-r::after { right:-8px; }
    .r20so-t:focus-visible { outline:2px solid var(--aio-accent); outline-offset:2px; }
    .r20so-bar { display:flex; flex-wrap:wrap; gap:6px; padding:0 14px 8px; }
    .r20so-bar button, .r20so-f button { min-height:32px; padding:4px 11px; border:1px solid var(--aio-line); border-radius:var(--aio-r); background:var(--aio-bg); color:var(--aio-ink-2); font-size:13px; cursor:pointer; }
    .r20so-bar button:disabled { opacity:.4; cursor:default; }
    .r20so-bar button:focus-visible, .r20so-f button:focus-visible, .r20so-x:focus-visible { outline:2px solid var(--aio-accent); outline-offset:1px; }
    .r20so-hint { margin:0; padding:0 14px 10px; font-size:12px; color:var(--aio-ink-4); }
    .r20so-f { display:flex; justify-content:flex-end; gap:8px; padding:10px 14px; border-top:1px solid var(--aio-line-4); }
    .r20so-f .pri { background:var(--aio-accent); border-color:var(--aio-accent); color:#fff; }
`);

// ───────── 토큰 메뉴: 여러 면 토큰에 면 선택 · 이전 면 · 다음 면, '여러 면' 안에 처음 면 · 마지막 면 ─────────
// 토큰 선택(d20 엔진)에 손댈 수 없어서, 새 단추는 Roll20 의 원래 '면 선택'을 대신 눌러 창을 열고 sidePicker 가 보이지 않게 고른다
// + 메뉴 정리: 카드 메뉴 · 파티 · 레이어 · 편집 묶음(▸)과 순서. Roll20 항목은 옮기지 않고 숨기기만 하며(flex order 로 순서),
//   묶음 안 단추는 숨겨 둔 원래 항목을 대신 누른다
// + 롤러블 토큰으로 합치기 · 면 순서 바꾸기(GM, 편집 묶음): 고른 토큰을 알아내 면을 모으거나 순서를 바꾼다
// 순서(11-04): 카드 뒤집기 · 면 선택 ─ 편집 · 카드 메뉴 · 파티 · 레이어 · 여러 면 · 고급 변환 ─ 그 밖의 Roll20 항목
const tokenMenu = (() => {
    const RE = { multi: /^(여러 면|Multi-?Sided)$/i, choose: /^(면 선택|Choose Side)$/i, random: /^(무작위 면|Random Side)$/i };
    const labelEl = b => b.querySelector(":scope > .submenu-button-outer span[style*='text-align']");
    const label = b => labelEl(b)?.textContent.trim() || "";
    const multiOf = menu => [...menu.querySelectorAll(":scope > button")].find(b => RE.multi.test(label(b)));
    const origChoose = multi => [...multi.querySelectorAll(":scope > .submenu > button:not([data-r20tm])")].find(b => RE.choose.test(label(b)));
    // Roll20 단추를 본떠(같은 스타일) 새 단추를 만든다
    const makeBtn = (tpl, text, act) => {
        const b = tpl.cloneNode(true);
        b.querySelector(":scope > .submenu")?.replaceChildren();
        b.querySelector(":scope > .submenu-button-outer .submenu-button-icon")?.remove();
        labelEl(b).textContent = text;
        b.classList.remove("disabled", "r20tm-hide");
        b.dataset.r20tm = act;
        return b;
    };
    // 정리할 순서. 묶음 항목은 [Roll20 이름(하위 메뉴 안이면 '부모>자식'), 보일 이름]. '@…' 은 Roll20 항목이 아니라 이 스크립트의 동작
    //   (@roll 합치기 · @order 면 순서(편집 묶음) · @centerX/@centerY/@center 가운데 정렬(레이어 묶음) — GM 만, 고른 토큰은 pickSel 로 알아낸다)
    //   { icons: [[이름, 보일 이름, 아이콘]…] } 은 묶음 안 아이콘 한 줄(3칸) · { hr } 은 가는 구분선(위아래에 보이는 항목이 있을 때만)
    const LAYOUT = [
        { one: "카드 뒤집기" },
        { faces: true },
        { hr: true },
        { g: "편집", icon: "복사", items: [["복사"], ["붙여넣기"], ["실행 취소"], ["다시 실행"], ["삭제"], ["@roll", "롤러블 토큰으로 합치기"], ["@order", "면 순서 바꾸기"]] },
        { g: "카드 메뉴", icon: "카드 가져가기", items: [["카드 가져가기", "가져가기"], ["카드 제외하기", "제외하기"]] },
        { g: "파티", icon: "모두에게 핑", items: [["모두에게 핑"], ["시선 집중 핑"], ["파티 정의"], ["파티 배치"], ["핀 놓기"], ["턴 추가"]] },
        { g: "레이어", icon: "레이어 변경", items: [["레이어 변경>토큰", "토큰 레이어로"], ["레이어 변경>GM", "GM 레이어로"], ["레이어 변경>맵", "맵 레이어로"],
            { icons: [["앞으로 가져오기", "앞으로 가져오기", "up"], ["뒤로 보내기", "뒤로 보내기", "down"], ["위치 고정", "위치 고정", "lock"]] },
            { icons: [["@centerX", "가로만 가운데 정렬", "cx"], ["@centerY", "세로만 가운데 정렬", "cy"], ["@center", "맵 정중앙 정렬", "cc"]] }] },
        { one: "여러 면" },
        { one: "고급 변환" },
        { hr: true }
    ];
    const ICON = {
        up: '<path d="M5 4h14M12 20V9M7 13l5-5 5 5"/>', down: '<path d="M5 20h14M12 4v11M7 11l5 5 5-5"/>',
        lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
        cx: '<path d="M12 3v18M7 8h10M5 15h14"/>', cy: '<path d="M3 12h18M8 7v10M15 5v14"/>', cc: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 8v8M8 12h8"/>'
    };
    const flat = items => items.flatMap(x => x.icons || [x]);
    const ours = b => b.dataset.r20tm || b.dataset.r20tmG || b.dataset.r20tmP || b.dataset.r20tmAct;
    const leftIcon = b => b.querySelector(":scope > .submenu-button-outer .submenu-button-inner .grimoire__roll20-icon");
    // 같은 이름이 먼저, 없으면 앞부분이 같은 것 ('위치 고정 해제' 같은 바뀐 이름)
    const findIn = (menu, name) => {
        const tops = [...menu.querySelectorAll(":scope > button")].filter(b => !ours(b));
        return tops.find(b => label(b) === name) || tops.find(b => label(b).startsWith(name)) || null;
    };
    const hoverOpen = b => ["mouseenter", "mouseover"].forEach(t => b.dispatchEvent(new MouseEvent(t, { bubbles: t === "mouseover" })));
    // 묶음 안 단추: Roll20 하위 메뉴 항목(고급 변환 안의 '그룹 생성'처럼 글자만 있는 단추)을 본떠 만들고,
    // 누르면 숨겨 둔 원래 항목을 누른다. 꺼짐 상태는 원래 항목을 따른다
    let ITEM = null;            // 본뜰 Roll20 하위 메뉴 항목 (하위 메뉴가 처음 그려질 때 잡아 둔다)
    const grabItem = menu => {
        const it = ITEM ? null : menu.querySelector(":scope > button > .submenu > button:not([data-r20tm]):not([data-r20tm-p])");
        if (it && labelEl(it)) ITEM = it.cloneNode(true);
    };
    const proxyBtn = (src, path, text) => {
        const b = (ITEM || src).cloneNode(true);
        b.removeAttribute("data-r20tm-hide"); b.removeAttribute("data-r20tm-hov"); b.style.order = "";
        b.querySelector(":scope > .submenu")?.replaceChildren();
        b.querySelector(":scope > .submenu-button-outer .submenu-button-icon")?.remove();
        b.querySelectorAll(".grimoire__roll20-icon, svg").forEach(x => x.remove());
        labelEl(b).textContent = text;
        b.classList.toggle("disabled", src.classList.contains("disabled"));
        b.dataset.r20tmP = path;
        return b;
    };
    // 마우스를 올리면 열고, 벗어나면 잠깐(0.3초) 기다렸다 닫는다 — 메뉴와 하위 메뉴 사이 틈을 지나가도 닫히지 않게.
    // 다른 머리에 올리면 앞의 것은 바로 닫는다
    let closeNow = null;
    const hoverKeep = (el, open, close, fly) => {
        let t = 0;
        const shut = () => { clearTimeout(t); if (closeNow === shut) closeNow = null; close(); };
        el.addEventListener("mouseenter", () => {
            clearTimeout(t);
            if (closeNow && closeNow !== shut) closeNow();
            closeNow = shut;
            open();
        });
        el.addEventListener("mouseleave", () => { clearTimeout(t); t = setTimeout(shut, 300); });
        fly?.addEventListener("mouseenter", () => clearTimeout(t));
        fly?.addEventListener("mouseleave", () => { clearTimeout(t); t = setTimeout(shut, 300); });
    };
    // 이 메뉴에 있는 항목만: '@…'은 GM 동작(면 순서는 여러 면 토큰일 때만), 나머지는 Roll20 원래 항목이 있을 때.
    // now(묶음을 열 때): 레이어 묶음에서 지금 레이어로 옮기기는 뺀다
    const has = (menu, path) => path === "@order" ? rollOK(menu) && !!multiOf(menu) : path.startsWith("@") ? rollOK(menu) : !!findIn(menu, path.split(">")[0]);
    const presentOf = (menu, L, now) => {
        const cur = now && L.g === "레이어" ? curLayer(menu) : null;
        return L.items.map(x => x.icons ? { icons: x.icons.filter(([p]) => has(menu, p)) } : x)
            .filter(x => x.icons ? x.icons.length : has(menu, x[0]) && !(cur && x[0] === "레이어 변경>" + cur));
    };
    // 아이콘 한 줄(3칸): 이름은 마우스를 올리면 뜨는 말풍선(.r20tm-tip)과 aria-label 로. 위치 고정은 고정된 토큰이면 눌린 모양
    const iconRow = (menu, list) => {
        const row = document.createElement("div");
        row.className = "r20tm-irow";
        list.forEach(([path, text, ic]) => {
            const b = document.createElement("button"), src = path.startsWith("@") ? null : findIn(menu, path);
            const name = src ? label(src) || text : text;          // '위치 고정 해제' 처럼 Roll20 이 바꾼 이름
            b.type = "button"; b.className = "r20tm-ib";
            b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[ic]}</svg>`;
            b.setAttribute("aria-label", name); b.dataset.tip = name;
            if (!src) b.dataset.r20tmAct = path.slice(1);
            else {
                b.dataset.r20tmP = path;
                b.classList.toggle("disabled", src.classList.contains("disabled"));
                if (path === "위치 고정") { const on = name !== text; b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", String(on)); }
            }
            row.appendChild(b);
        });
        return row;
    };
    // 지금 레이어: Roll20 '레이어 변경' 하위 메뉴가 지금 것만 다르게 그리면(꺼짐 · 체크 · aria · 아이콘 수) 그 이름('토큰' · 'GM' · '맵').
    // 못 알아내면 null → 셋 다 보인다. 하위 메뉴 항목은 메뉴가 뜰 때 미리 그려 둔다(arrange). 처음 한 번은 생김새를 콘솔에 남긴다(진단용)
    let layerLogged = false;
    const curLayer = menu => {
        const lc = findIn(menu, "레이어 변경"), its = lc ? [...lc.querySelectorAll(":scope > .submenu > button")] : [];
        const sig = b => [b.disabled || b.classList.contains("disabled") || b.getAttribute("aria-disabled") === "true",
            /\b(active|selected|checked|current)\b/i.test(b.className), ["aria-checked", "aria-pressed", "aria-selected", "aria-current"].some(a => b.getAttribute(a) === "true"),
            /[✓✔]/.test(b.textContent), b.querySelectorAll("svg, i, img, .grimoire__roll20-icon").length].join("|");
        const sigs = its.map(sig), odd = its.filter((b, i) => sigs.indexOf(sigs[i]) === sigs.lastIndexOf(sigs[i]));
        const cur = its.length >= 3 && odd.length === 1 ? label(odd[0]) || odd[0].textContent.trim() : null;
        if (!layerLogged && its.length) { layerLogged = true; console.info("[토큰 메뉴] 레이어 하위 메뉴:", its.map(b => b.outerHTML.replace(/\s+/g, " ").slice(0, 240)), "→ 지금 레이어:", cur); }
        return cur;
    };
    // 묶음 머리: 하위 메뉴가 있는 Roll20 단추(화살표 포함)를 본뜨고, 아이콘은 대표 항목 것으로
    const makeGroup = (menu, L, tpl) => {
        const g = tpl.cloneNode(true);
        g.removeAttribute("data-r20tm-hide"); g.removeAttribute("data-r20tm-hov"); g.classList.remove("disabled");
        g.dataset.r20tmG = L.g;
        labelEl(g).textContent = L.g;
        const ic = leftIcon(findIn(menu, L.icon) || tpl), gi = leftIcon(g);
        if (ic && gi) gi.replaceWith(ic.cloneNode(true));
        // 하위 메뉴는 머리 안이 아니라 메뉴 판에 따로 붙여 띄운다 (머리 안의 .submenu 는 Roll20 이 자리를 다시 잡아 버린다)
        const tsub = g.querySelector(":scope > .submenu");
        const sub = document.createElement("div");
        if (tsub) { for (const at of tsub.attributes) if (at.name.startsWith("data-v-")) sub.setAttribute(at.name, ""); tsub.remove(); }
        sub.className = "submenu r20tm-sub";
        sub.style.display = "none";
        g._r20tmFly = sub;
        menu.appendChild(sub);
        const item = ([path, text]) => {
            if (!path.startsWith("@")) return proxyBtn(findIn(menu, path.split(">")[0]), path, text || path);
            const b = proxyBtn(findIn(menu, "삭제") || tpl, path, text);
            b.classList.remove("disabled");
            delete b.dataset.r20tmP; b.dataset.r20tmAct = path.slice(1);
            return b;
        };
        const build = () => sub.replaceChildren(...presentOf(menu, L, true).map(x => x.icons ? iconRow(menu, x.icons) : item(x)));
        build();
        // 메뉴에 transform · zoom 이 걸려 있으면 left/top 값이 곧 화면 좌표가 아니다 (기준점이 옮겨지고 배율이 붙는다)
        // → 두 번 놓아 보고 실제로 놓인 화면 좌표에서 이동·배율을 구해, 원하는 화면 좌표가 되는 값을 넣는다 (!important: Roll20 CSS 를 이기도록)
        const place = () => {
            const put = (x, y) => { sub.style.setProperty("left", x + "px", "important"); sub.style.setProperty("top", y + "px", "important"); };
            put(0, 0);
            const a = sub.getBoundingClientRect();
            put(100, 100);
            const b = sub.getBoundingClientRect();
            const sx = (b.left - a.left) / 100 || 1, sy = (b.top - a.top) / 100 || 1;
            const m = menu.getBoundingClientRect(), r = g.getBoundingClientRect(), w = a.width, h = a.height;
            const pad = (parseFloat(getComputedStyle(sub).paddingTop) || 0) * sy;
            const want = { x: m.right + 4 + w > innerWidth - 4 ? m.left - w - 4 : m.right + 4, y: Math.max(4, Math.min(r.top - pad, innerHeight - h - 4)) };
            put((want.x - a.left) / sx, (want.y - a.top) / sy);
        };
        // 고급 변환 · 여러 면처럼 메뉴 판 오른쪽 바깥에 띄우고, 첫 항목을 이 줄 높이에 맞춘다.
        // (Roll20 하위 메뉴에서 자리를 읽어 따라 하면 여는 방식·움직임에 따라 어긋나서, 자리는 정해진 규칙으로만 계산한다)
        hoverKeep(g, () => {
            build();        // 열 때마다 지금 상태로 (하위 메뉴 항목 모양 ITEM · 위치 고정 해제 · 지금 레이어)
            sub.removeAttribute("style");
            Object.assign(sub.style, { display: "flex", flexDirection: "column", zIndex: "100001" });
            ["position:fixed", "margin:0", "transition:none", "animation:none", "transform:none", "translate:none"].forEach(kv => { const [k, v] = kv.split(":"); sub.style.setProperty(k, v, "important"); });
            const mcs = getComputedStyle(menu);
            if (PANEL) Object.assign(sub.style, PANEL);
            else if (getComputedStyle(sub).backgroundColor === "rgba(0, 0, 0, 0)")
                Object.assign(sub.style, { backgroundColor: mcs.backgroundColor, border: mcs.border, borderRadius: mcs.borderRadius, boxShadow: mcs.boxShadow, padding: mcs.padding });
            place();
            // 바로 옆 Roll20 하위 메뉴(고급 변환 · 여러 면)가 닫히는 동안 화면 기준이 잠깐 바뀌어 어긋날 수 있다 → 조금 뒤 다시 맞춘다
            [60, 250].forEach(ms => setTimeout(() => { if (sub.style.display !== "none") place(); }, ms));
        }, () => { sub.style.display = "none"; }, sub);
        return g;
    };
    // Roll20 하위 메뉴(▸)는 눌러야 열린다 → 마우스를 올리면 대신 눌러 열고, 벗어나면 닫는다
    const subOf = b => b.querySelector(":scope > .submenu");
    const isOpen = b => { const sb = subOf(b); return !!sb && getComputedStyle(sb).display !== "none"; };
    const toggleR20 = b => (b.querySelector(":scope > .submenu-button-outer") || b).click();
    // 모양만 읽는다: 숨겨 둔 '레이어 변경'을 한 번 열어 하위 메뉴 항목 본(ITEM)을 잡고,
    // 화면에 열린 Roll20 하위 메뉴에서 판 모양(PANEL: 배경·테두리·둥글기·그림자·여백)을 읽는다
    let PANEL = null, learning = false, probed = false;
    const learnLook = b => {
        const sb = subOf(b), menu = b.closest(".context-menu");
        grabItem(menu);
        if (PANEL || !sb || !isOpen(b)) return;
        const cs = getComputedStyle(sb);
        if (cs.backgroundColor !== "rgba(0, 0, 0, 0)")
            PANEL = { backgroundColor: cs.backgroundColor, border: cs.border, borderRadius: cs.borderRadius, boxShadow: cs.boxShadow, padding: cs.padding, minWidth: cs.minWidth };
    };
    const learnOpen = async menu => {
        if (probed || learning) return;
        const b = [...menu.querySelectorAll(":scope > button[data-r20tm-hide]")].find(x => x.querySelector(":scope > .submenu-button-outer .submenu-button-icon"));
        if (!b) return;
        learning = true;
        toggleR20(b);
        await new Promise(r => setTimeout(r, 40));
        const sb = subOf(b);
        if (sb && sb.style.display !== "none") { grabItem(menu); toggleR20(b); probed = true; }        // 다시 닫는다
        learning = false;
    };
    const hoverR20 = menu => menu.querySelectorAll(":scope > button").forEach(b => {
        if (ours(b) || b.dataset.r20tmHov || !b.querySelector(":scope > .submenu-button-outer .submenu-button-icon")) return;
        b.dataset.r20tmHov = "1";
        hoverKeep(b, () => { if (!isOpen(b)) toggleR20(b); setTimeout(() => learnLook(b), 300); }, () => { if (isOpen(b)) toggleR20(b); });
    });
    const arrange = menu => {
        if (!findIn(menu, "레이어 변경") && !findIn(menu, "삭제")) return;      // 빈 맵 메뉴 등은 그대로
        hoverR20(menu);
        const tpl = findIn(menu, "레이어 변경") || findIn(menu, "고급 변환") || findIn(menu, "여러 면");
        const used = new Set();
        LAYOUT.forEach((L, i) => {
            const order = (i + 1) * 10;
            if (L.one) { const b = findIn(menu, L.one); if (b) { b.style.order = order; used.add(b); } return; }
            if (L.faces) { menu.querySelectorAll(":scope > button[data-r20tm]").forEach((b, k) => { b.style.order = order + k; }); return; }
            if (L.hr) {
                let hr = menu.querySelector(`:scope > .r20tm-hr[data-i="${i}"]`);
                if (!hr) { hr = document.createElement("div"); hr.className = "r20tm-hr"; hr.dataset.i = i; hr.setAttribute("role", "separator"); menu.appendChild(hr); }
                hr.style.order = order;
                return;
            }
            const present = flat(presentOf(menu, L));
            present.forEach(([path]) => { if (path.startsWith("@")) return; const b = findIn(menu, path.split(">")[0]); b.setAttribute("data-r20tm-hide", ""); used.add(b); });
            let gb = menu.querySelector(`:scope > button[data-r20tm-g="${L.g}"]`);
            if (!present.length) { gb?._r20tmFly?.remove(); gb?.remove(); return; }
            if (!gb && tpl) gb = menu.appendChild(makeGroup(menu, L, tpl));
            if (gb) gb.style.order = order;
        });
        // 레이어 묶음이 지금 레이어를 알 수 있게 Roll20 '레이어 변경' 하위 메뉴 항목을 미리 그려 둔다(숨긴 단추라 안 보인다)
        const lc = findIn(menu, "레이어 변경");
        if (lc && !lc.querySelector(":scope > .submenu > button")) hoverOpen(lc);
        learnOpen(menu);
        menu.classList.add("r20tm-arranged");
        menu.querySelectorAll(":scope > button").forEach(b => { if (!ours(b) && !used.has(b)) b.style.order = 900; });       // 목록에 없는 것은 맨 아래
        // 구분선은 위아래에 보이는 항목이 있을 때만
        const shown = [...menu.querySelectorAll(":scope > button")].filter(b => getComputedStyle(b).display !== "none").map(b => +b.style.order || 0);
        menu.querySelectorAll(":scope > .r20tm-hr").forEach(hr => { const o = +hr.style.order; hr.hidden = !(shown.some(x => x < o) && shown.some(x => x > o)); });
    };
    // 메뉴가 지난번 정리한 그대로면(같은 단추 요소 · 단추 수 · Roll20 단추 이름) 다시 훑지 않는다
    const sigOf = menu => {
        const tops = [...menu.querySelectorAll(":scope > button")];
        if (tops.some(b => !b._r20tmSeen)) return null;        // 새로 그려진 단추가 있으면 다시
        return btnVisible.tokmenu + "|" + menu.getElementsByTagName("button").length + "|" + tops.map(b => ours(b) ? "" : label(b)).join("|");
    };
    const inject = () => {
        document.querySelectorAll(".context-menu").forEach(menu => {
            const sig = sigOf(menu);
            if (sig !== null && menu._r20tmSig === sig) { if (btnVisible.tokmenu) learnOpen(menu); return; }
            faces(menu);
            if (btnVisible.tokmenu) arrange(menu);      // 면 단추를 붙인 뒤에 순서를 매긴다
            menu.querySelectorAll(":scope > button").forEach(b => { b._r20tmSeen = true; });
            menu._r20tmSig = sigOf(menu);
        });
    };
    const faces = menu => {
        {   // (예전 inject 본문 — 들여쓰기 유지)
            const multi = btnVisible.tokmenu && multiOf(menu);
            // 여러 면 토큰이 아니게 다시 그려졌으면 붙였던 단추를 걷는다
            if (!multi) { menu.querySelectorAll("button[data-r20tm]").forEach(b => b.remove()); menu.querySelectorAll(".r20tm-hide").forEach(b => b.classList.remove("r20tm-hide")); return; }
            const sub = [...multi.querySelectorAll(":scope > .submenu > button:not([data-r20tm])")];
            const choose = sub.find(b => RE.choose.test(label(b))), random = sub.find(b => RE.random.test(label(b)));
            const tpl = random || choose;
            if (!tpl) return;
            if (!menu.querySelector(":scope > button[data-r20tm]")) {
                // 면 선택 ‹ › : 줄을 누르면 고르는 창, ‹ › 는 이전 · 다음 면
                const row = makeBtn(tpl, "면 선택", "choose"), nav = document.createElement("span");
                nav.className = "r20tm-nav";
                nav.innerHTML = '<span role="button" data-r20tm-nav="prev" title="이전 면" aria-label="이전 면">‹</span><span role="button" data-r20tm-nav="next" title="다음 면" aria-label="다음 면">›</span>';
                row.appendChild(nav);
                multi.before(row);
            }
            if (!multi.querySelector(":scope > .submenu > button[data-r20tm]"))
                tpl.after(makeBtn(tpl, "처음 면", "first"), makeBtn(tpl, "마지막 면", "last"));
            choose?.classList.add("r20tm-hide");       // 원래 '면 선택'은 위로 올렸으므로 숨긴다 (누르는 데는 쓴다)
        }
    };
    // ── 롤러블 토큰으로 합치기 (GM, '편집' 묶음 안): 고른 토큰들의 그림을 면으로 모아 첫 토큰(왼쪽 위부터 읽는 순서) 하나에 넣고 나머지는 지운다 ──
    // ── 면 순서 바꾸기 (GM, '편집' 묶음 안, 여러 면 토큰일 때): 고른 여러 면 토큰 하나의 면 순서를 sideOrder 창에서 ──
    // Roll20 은 지금 고른 토큰을 스크립트에 알려 주지 않는다 → 숨겨 둔 '뒤로 보내기' · '앞으로 가져오기'를 메뉴가 열린 그 순간에
    // 연달아 대신 눌러, 페이지 겹침 순서(zorder)에서 한쪽 끝으로 옮겨진 것들 = 고른 것으로 본다.
    // 둘을 다 누르는 까닭: 고른 것이 이미 맨 앞(끝)이면 '앞으로'로는 안 바뀌고, 맨 뒤(처음)면 '뒤로'로는 안 바뀐다.
    // (스크립트가 만든 그림은 zorder 에 안 들어가서 임시 그림으로 자리를 채울 수 없다 — 실제 Roll20 진단 11-03)
    // 다 끝나면 겹침 순서는 처음대로 되돌린다
    // 합치기 · 면 순서 바꾸기를 보일지: GM 이고, 순서 단추(앞으로 가져오기)가 있는 토큰 메뉴
    const rollOK = menu => btnVisible.tokmenu && isGM() && !!findIn(menu, "앞으로 가져오기");
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const zOf = pg => String(pg.get("zorder") || "");
    const zList = s => String(s).split(",").filter(Boolean);
    // zorder 가 before 와 달라진 뒤 0.3초 그대로일 때까지 (최대 2.5초) → 그때의 값
    const zSettle = async (pg, before) => {
        let last = zOf(pg), still = 0;
        for (let t = 0; t < 2500; t += 100) {
            await wait(100);
            const now = zOf(pg);
            if (now !== before && now === last) { if ((still += 100) >= 300) return now; } else still = 0;
            last = now;
        }
        return last;
    };
    // a → b 에서 움직인 것들 = 둘의 가장 긴 공통 순서(LCS)에 못 든 것. 어디로 옮겼든(맨 끝 · 층의 맨 아래 …) 같은 셈이다.
    // ('뒤로 보내기'는 페이지 맨 처음이 아니라 그 층의 맨 아래로 보낸다 — 실제 Roll20 11-03)
    // 둘 중 무엇이 움직였는지 같아 보이면(옆자리끼리 바뀜) 끝 쪽(preferEnd)이나 앞쪽으로 간 것을 움직인 것으로 본다
    const movedSet = (a, b, preferEnd) => {
        if (a.join() === b.join()) return [];
        const n = a.length, m = b.length, W = m + 1, dp = new Uint16Array((n + 1) * W);
        for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++)
            dp[i * W + j] = a[i - 1] === b[j - 1] ? dp[(i - 1) * W + j - 1] + 1 : Math.max(dp[(i - 1) * W + j], dp[i * W + j - 1]);
        const keep = new Set();
        for (let i = n, j = m; i > 0 && j > 0;) {
            if (a[i - 1] === b[j - 1]) { keep.add(b[j - 1]); i--; j--; }
            else if (preferEnd ? dp[i * W + j - 1] >= dp[(i - 1) * W + j] : dp[i * W + j - 1] > dp[(i - 1) * W + j]) j--;
            else i--;
        }
        const was = new Set(a);
        return b.filter(id => !keep.has(id) && was.has(id));
    };
    const sidesOf = g => { const s = String(g.get("sides") || ""); return s ? s.split("|").filter(Boolean).map(x => { try { return decodeURIComponent(x); } catch (e) { return x; } }) : [g.get("imgsrc")]; };
    // 고른 토큰 알아내기 — 합치기 · 면 순서 바꾸기가 같이 쓴다. → { gs, unsure, undoZ(gone) } (메뉴 · 페이지가 없으면 null)
    const pickSel = async menu => {
        const pg = window.Campaign?.activePage?.();
        const back = menu && findIn(menu, "뒤로 보내기"), front = menu && findIn(menu, "앞으로 가져오기");
        if (!pg?.thegraphics || !front || !isGM()) return null;
        const dis = b => !!b?.classList.contains("disabled");
        // 지나온 순서를 다 적어 둔다 (Roll20 은 토큰마다 한 번씩 바꾸기도 한다 — 진단: 두 개 → 바뀜 두 번)
        const z0 = zOf(pg), snaps = [];
        const onZ = () => { const z = zOf(pg); if (z !== (snaps[snaps.length - 1] ?? z0)) snaps.push(z); };
        pg.on("change:zorder", onZ);
        // 둘째 단서: 위치 고정된 그림은 순서 단추로 순서가 안 바뀐다(11-03 실제 Roll20) → '위치 고정'도 같이 눌러
        // 잠금 칸(이름에 lock)이 바뀐 그림을 모으고, 끝나면 잠금은 처음 값으로 되돌린다. 다른 칸은 건드리지 않는다
        const lockBtn = findIn(menu, "위치 고정"), locked = new Map();
        // Roll20 모음이 '바뀜' 알림을 안 넘겨줄 수 있어서(11-03 실제: 잠금 변화 0) 누르기 전 · 뒤의 잠금 칸을 직접 견준다
        const lockKeys = g => Object.keys(g.attributes || {}).filter(k => /lock/i.test(k));
        const lockSnap = () => new Map(pg.thegraphics.models.map(g => [g, Object.fromEntries(lockKeys(g).map(k => [k, g.get(k)]))]));
        const before = lockSnap();
        const onG = m => {
            const ch = m.changedAttributes?.() || {}, prev = m.previousAttributes?.() || {};
            Object.keys(ch).forEach(k => { if (!/lock/i.test(k)) return; const rec = locked.get(m) || {}; if (!(k in rec)) rec[k] = prev[k] ?? false; locked.set(m, rec); });
        };
        pg.thegraphics.on?.("change", onG);
        // Roll20 메뉴는 첫 클릭 하나만 먹는다(11-03 실제: 뒤의 클릭은 잠금 변화 0). 그래서 첫 클릭은 '위치 고정' —
        // 고른 토큰이 어디에 있든(층 맨 아래 · 맨 위) 잠금이 바뀐다. 뒤의 클릭(고정 한 번 더 · 뒤로 보내기)은 먹는 환경이면 덤으로 쓴다.
        // 누를 때마다 바로 순서 · 잠금을 읽어 둔다
        const zb = back && !dis(back) ? back : front;
        const lockDiff = snap => pg.thegraphics.models.forEach(g => {
            const was = before.get(g) || {}, now = snap.get(g) || {}, rec = locked.get(g) || {};
            new Set([...Object.keys(was), ...Object.keys(now)]).forEach(k => { if (!(k in rec) && !!was[k] !== !!now[k]) rec[k] = was[k] ?? false; });
            if (Object.keys(rec).length) locked.set(g, rec);
        });
        // '위치 고정'은 두 번 — 고정 · 안 고정이 섞이면 Roll20 이 한 값으로 맞춰서 원래 그 값이던 것은 안 바뀐다.
        // 둘째 클릭이 먹으면 어느 쪽이든 한 번은 바뀐다(매번 읽어 둔다). 끝나면 처음 값으로 되돌린다
        for (let i = 0; i < 2 && lockBtn && !dis(lockBtn); i++) {
            try { lockBtn.click(); } catch (e) { console.warn("[토큰 메뉴] 고정 단추를 못 누름:", e); break; }
            lockDiff(lockSnap());
        }
        try { zb.click(); } catch (e) { console.warn("[토큰 메뉴] 순서 단추를 못 누름:", e); }
        onZ();
        // 잠금으로 이미 찾았으면 순서는 잠깐만 기다린다(뒤로 보내기가 안 먹는 환경에서 2.5초씩 기다리지 않게)
        if (locked.size) await wait(500); else await zSettle(pg, z0);
        await wait(200);
        pg.off("change:zorder", onZ);
        pg.thegraphics.off?.("change", onG);
        onZ();
        lockDiff(lockSnap());
        locked.forEach((rec, m) => { try { m.save(rec); } catch (e) { console.warn("[토큰 메뉴] 잠금을 못 되돌림:", e); } });
        // 지나온 순서마다 처음과 견주어 '확실히' 움직인 것만 모은다 — 옆자리끼리 바뀌어 누가 움직였는지 같아 보이는 것은
        // 두 해석(끝 쪽 · 앞쪽)에 다 든 것만. 고른 것이 한 끝에 붙어 있어 한쪽 동작이 애매해도 다른 동작에서 멀리 움직여 잡힌다
        // ('뒤로' · '앞으로'가 토큰마다 섞여 들어와도 된다)
        const a = zList(z0), u = new Set();
        snaps.forEach(sz => { const b = zList(sz), late = new Set(movedSet(a, b, true)); movedSet(a, b, false).forEach(id => { if (late.has(id)) u.add(id); }); });
        // 옆자리끼리 바뀐 것처럼 애매하면 누른 쪽으로 읽는다 ('뒤로'면 앞쪽(아래)으로 간 것, '앞으로'면 끝쪽(위)으로 간 것)
        if (!u.size && snaps.length) movedSet(a, zList(snaps[snaps.length - 1]), zb === front).forEach(id => u.add(id));
        locked.forEach((_, m) => u.add(m.id));
        let gs = [...u].map(id => pg.thegraphics.get(id)).filter(g => g && g.get("imgsrc"));
        // 안전장치: Roll20 은 한 층에서만 고를 수 있다 → 가장 많은 층 것만. 층이 반반이거나 너무 많으면(40 넘게) 하지 않는다
        const byLayer = {}; gs.forEach(g => { const l = g.get("layer") || ""; (byLayer[l] = byLayer[l] || []).push(g); });
        const groups = Object.values(byLayer).sort((x, y) => y.length - x.length);
        const unsure = gs.length > 40 || (groups.length > 1 && groups[0].length === groups[1].length);
        if (groups.length > 1 && !unsure) gs = groups[0];
        if (unsure) console.warn("[토큰 메뉴] 고른 토큰이 이상함:", gs.length, "개 · 층", Object.keys(byLayer).map(l => l + " " + byLayer[l].length).join(", "), "· 순서 변화", snaps.length, "번");
        const diag = () => JSON.stringify({ 찾은것: gs.length, 순서변화: snaps.length, 잠금변화: locked.size, 앞으로: front ? (dis(front) ? "꺼짐" : "있음") : "없음",
            뒤로: back ? (dis(back) ? "꺼짐" : "있음") : "없음", 위치고정: lockBtn ? (dis(lockBtn) ? "꺼짐" : label(lockBtn)) : "없음",
            잠금칸: [...new Set(pg.thegraphics.models.flatMap(lockKeys))].slice(0, 6), 그림칸: Object.keys(pg.thegraphics.models[0]?.attributes || {}).length });
        if (!gs.length) console.warn("[토큰 메뉴] 찾은 것 없음 —", diag());
        // 겹침 순서를 처음대로 — 지운 것은 빼고, 그 사이 새로 생긴 것은 뒤에 그대로
        const undoZ = (gone = new Set()) => {
            const now = zList(zOf(pg)), keep = a.filter(id => !gone.has(id) && now.includes(id)), extra = now.filter(id => !a.includes(id) && !gone.has(id));
            const want = [...keep, ...extra].join(",");
            if (want !== zOf(pg)) pg.save({ zorder: want });
        };
        return { gs, unsure, undoZ, diag };
    };
    const NOT_SURE = n => `고른 토큰을 확실히 알아내지 못했어요 (${n}개로 보여요). 아무것도 바꾸지 않았어요 — 토큰을 다시 골라 해 주세요.`;
    const NOT_FOUND = "고른 토큰을 알아내지 못했어요. 토큰을 다시 골라 오른쪽 클릭해 주세요.\n(계속 그러면 F12 콘솔의 [토큰 메뉴] 줄을 알려 주세요)";
    const mergeRoll = async menu => {
        const r = await pickSel(menu);
        if (!r) return;
        const { gs, unsure, undoZ } = r;
        if (gs.length === 1) console.warn("[토큰 메뉴] 하나만 찾음 —", r.diag());
        if (unsure || gs.length < 2) { undoZ(); alert(unsure ? NOT_SURE(gs.length) : gs.length ? "토큰을 두 개 이상 골라 주세요.\n(두 개 넘게 골랐다면: 위치 고정된 것과 안 된 것이 섞여 있으면 하나만 잡힐 수 있어요 — '위치 고정'을 같게 맞춘 뒤 다시 해 주세요)" : NOT_FOUND); return; }
        // 면 순서: 위 → 아래 줄, 줄 안에서는 왼쪽 → 오른쪽 (윗변이 토큰 높이의 반 안쪽이면 같은 줄)
        const top = g => +g.get("top") - +g.get("height") / 2, left = g => +g.get("left") - +g.get("width") / 2;
        const tol = Math.min(...gs.map(g => +g.get("height") || 70)) / 2;
        gs.sort((x, y) => Math.abs(top(x) - top(y)) <= tol ? left(x) - left(y) : top(x) - top(y));
        const sides = gs.flatMap(sidesOf).filter(Boolean);
        if (!confirm(`토큰 ${gs.length}개를 면 ${sides.length}개짜리 롤러블 토큰 하나로 합칠까요?\n왼쪽 위 토큰 자리 · 크기에 남기고, 나머지 ${gs.length - 1}개는 지워요.`)) { undoZ(); return; }
        gs[0].save({ sides: sides.map(encodeURIComponent).join("|"), currentSide: 0, imgsrc: sides[0] });
        const gone = new Set();
        gs.slice(1).forEach(g => { try { gone.add(g.id); g.destroy(); } catch (e) { console.warn("[토큰 메뉴] 토큰을 못 지움:", e); } });
        await wait(300);
        undoZ(gone);
    };
    // 면 순서 바꾸기: 고른 여러 면 토큰 하나의 면을 sideOrder 창에서. 지금 보이는 그림은 순서가 바뀌어도 그대로 보이게
    // 맵 가운데로: 고른 토큰들을 한 덩어리로(서로 간격 그대로) 페이지 가운데에. 격자가 반 칸(35px) 이상이면
    // 맵 맞추기와 같이 격자 칸 단위로만 옮긴다 — 격자에 맞던 토큰은 계속 맞고, 정가운데에서 반 칸 남으면 오른쪽 · 아래로
    const centerSel = async (menu, axis) => {
        const r = await pickSel(menu);
        if (!r) return;
        r.undoZ();
        if (r.unsure || !r.gs.length) { alert(r.unsure ? NOT_SURE(r.gs.length) : NOT_FOUND); return; }
        const pg = window.Campaign?.activePage?.();
        if (!pg) return;
        const n = (m, k, d = 0) => { const v = parseFloat(m.get(k)); return Number.isFinite(v) ? v : d; };
        const box = g => {
            const rad = n(g, "rotation") * Math.PI / 180, c = Math.abs(Math.cos(rad)), sn = Math.abs(Math.sin(rad));
            const w = n(g, "width") * c + n(g, "height") * sn, h = n(g, "width") * sn + n(g, "height") * c;
            return [n(g, "left") - w / 2, n(g, "top") - h / 2, n(g, "left") + w / 2, n(g, "top") + h / 2];
        };
        const bs = r.gs.map(box);
        const x0 = Math.min(...bs.map(b => b[0])), y0 = Math.min(...bs.map(b => b[1])), x1 = Math.max(...bs.map(b => b[2])), y1 = Math.max(...bs.map(b => b[3]));
        const snap = n(pg, "snapping_increment", 1), cell = 70 * (snap > 0 ? snap : 1);
        const step = v => cell >= 35 ? Math.floor(v / cell + 0.5 - 1e-9) * cell : Math.round(v);       // 반 칸이면 작은 쪽(남는 칸은 오른쪽 · 아래)
        const dx = axis === "y" ? 0 : step(n(pg, "width", 25) * 70 / 2 - (x0 + x1) / 2);
        const dy = axis === "x" ? 0 : step(n(pg, "height", 25) * 70 / 2 - (y0 + y1) / 2);
        if (!dx && !dy) return;
        r.gs.forEach(g => g.save({ left: n(g, "left") + dx, top: n(g, "top") + dy }));
    };
    const reorderSel = async menu => {
        const r = await pickSel(menu);
        if (!r) return;
        r.undoZ();                  // 겹침 순서는 바로 되돌린다
        if (r.unsure || !r.gs.length) { alert(r.unsure ? NOT_SURE(r.gs.length) : NOT_FOUND); return; }
        if (r.gs.length > 1) { alert("면 순서는 토큰 하나씩 바꿀 수 있어요 — 여러 면 토큰 하나만 골라 주세요."); return; }
        const g = r.gs[0], sides = sidesOf(g);
        if (sides.length < 2) { alert("여러 면 토큰이 아니에요."); return; }
        const cur = Math.min(sides.length - 1, Math.max(0, parseInt(g.get("currentSide"), 10) || 0));
        sideOrder.open({ title: "면 순서 바꾸기", sub: `${g.get("name") || "토큰"} · 면 ${sides.length}개`, items: sides.map(src => ({ src })), cur,
            onSave: order => {
                const ns = order.map(i => sides[i]);
                if (!ns.length || ns.join("|") === sides.join("|")) return;
                const c = Math.max(0, order.indexOf(cur));
                g.save({ sides: ns.map(encodeURIComponent).join("|"), currentSide: c, imgsrc: ns[c] });
            } });
    };
    // 동작 셋 — 메뉴 단추를 누를 때와 왼클릭 메뉴(tokenActs, 숨긴 우클릭 메뉴로)가 같이 쓴다
    const runAct = (menu, a) => a === "roll" ? mergeRoll(menu) : a === "order" ? reorderSel(menu)
        : /^center/.test(a) ? centerSel(menu, a === "centerX" ? "x" : a === "centerY" ? "y" : "xy") : null;
    const runPath = async (menu, path) => {
        const [parent, child] = path.split(">"), orig = findIn(menu, parent);
        if (!orig) return;
        if (!child) { orig.click(); return; }
        // 하위 메뉴 항목: 원래 묶음에 마우스를 올린 것처럼 해서 그리게 한 뒤 누른다
        const item = () => [...orig.querySelectorAll(":scope > .submenu > button")].find(x => label(x) === child);
        if (!item()) { hoverOpen(orig); await new Promise(r => setTimeout(r, 80)); }
        item()?.click();
    };
    const runFace = async (menu, act) => {
        const multi = multiOf(menu);
        let orig = multi && origChoose(multi);
        if (!orig && multi) {
            // 하위 메뉴가 아직 안 그려졌으면 '여러 면'에 마우스를 올린 것처럼 해서 그리게 한다
            hoverOpen(multi);
            await new Promise(r => setTimeout(r, 80));
            orig = origChoose(multi);
        }
        if (!orig) { console.warn("[토큰 메뉴] '면 선택'을 찾지 못함"); return; }
        if (act !== "choose") sidePicker.startAuto(act);
        orig.click();
    };
    document.addEventListener("click", e => {
        const rb = e.target.closest?.(".context-menu button[data-r20tm-act]");
        if (rb) { e.preventDefault(); e.stopPropagation(); runAct(rb.closest(".context-menu"), rb.dataset.r20tmAct); return; }
        const hdr = e.isTrusted && e.target.closest?.(".context-menu > button[data-r20tm-hov]");
        if (hdr && !e.target.closest(".submenu") && isOpen(hdr)) { e.preventDefault(); e.stopPropagation(); return; }
        const p = e.target.closest?.(".context-menu button[data-r20tm-p]");
        if (!p && e.target.closest?.(".context-menu button[data-r20tm-g]")) { e.preventDefault(); e.stopPropagation(); return; }
        if (p) {
            e.preventDefault(); e.stopPropagation();
            if (!p.classList.contains("disabled")) runPath(p.closest(".context-menu"), p.dataset.r20tmP);
            return;
        }
        const b = e.target.closest?.(".context-menu button[data-r20tm]");
        if (!b) return;
        e.preventDefault(); e.stopPropagation();
        runFace(b.closest(".context-menu"), e.target.closest("[data-r20tm-nav]")?.dataset.r20tmNav || b.dataset.r20tm);
    }, true);
    // ── 왼클릭 메뉴(tokenActs)용: 숨긴 우클릭 메뉴에서 읽고(info) · 대신 누른다(run) ──
    // 토큰 메뉴인지: 토큰에만 있는 항목이 하나라도 (빈 맵 메뉴는 핑 · 붙여넣기 정도)
    const TOKEN_ONLY = ["삭제", "복사", "레이어 변경", "캐릭터 시트", "턴 추가", "위치 고정", "카드 뒤집기", "여러 면"];
    const LAYER_G = LAYOUT.find(L => L.g === "레이어");
    const layerSpec = menu => presentOf(menu, LAYER_G, true).map(x => x.icons
        ? { icons: x.icons.map(([path, text, ic]) => {
            const src = path.startsWith("@") ? null : findIn(menu, path), name = src ? label(src) || text : text;
            return { path, name, svg: ICON[ic], on: path === "위치 고정" && name !== text, off: !!src?.classList.contains("disabled") };
        }) }
        : { path: x[0], name: x[1] || x[0], off: !!findIn(menu, x[0].split(">")[0])?.classList.contains("disabled") });
    const info = menu => ({
        token: TOKEN_ONLY.some(n => findIn(menu, n)), card: !!findIn(menu, "카드 뒤집기"), multi: !!multiOf(menu),
        sheet: !!findIn(menu, "캐릭터 시트"), ping: !!findIn(menu, "시선 집중 핑"), layer: layerSpec(menu)
    });
    const run = (menu, spec) => spec.face ? runFace(menu, spec.face) : spec.path.startsWith("@") ? runAct(menu, spec.path.slice(1)) : runPath(menu, spec.path);
    // 아이콘 단추 말풍선: 하위 메뉴 판 밖으로 나가도 잘리지 않게 body 에 띄운다
    let tip = null;
    const hideTip = () => { tip?.remove(); };
    document.addEventListener("mouseover", e => {
        const b = e.target.closest?.(".context-menu .r20tm-ib, .r20ta-pop [data-tip]");
        if (!b) return hideTip();
        tip ||= Object.assign(document.createElement("div"), { className: "r20tm-tip" });
        tip.textContent = b.dataset.tip || "";
        document.body.appendChild(tip);
        const r = b.getBoundingClientRect(), w = tip.getBoundingClientRect().width;
        tip.style.left = zpx(Math.max(4, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 4)));
        tip.style.top = zpx(r.bottom + 4);
    }, true);
    document.addEventListener("pointerdown", hideTip, true);
    // 메뉴가 뜬 순간 붙인다(instant) — 100ms 뒤면 원래 메뉴가 잠깐 보인다. 감시는 시작 쪽 본체 감시자가 한다
    return { inject, watch: ".context-menu", instant: true, info, run };
})();

// ───────── 토큰 액션 → 클릭 메뉴: 토큰을 왼클릭(끌지 않고)하면 그 자리에 토큰 액션 매크로를 메뉴로 띄운다 (body.r20ta-on) ─────────
// 위쪽 토큰 액션 줄(#secondary-toolbar 의 ul.tokenactions)은 숨기고, 메뉴 항목은 그 줄의 원래 단추를 대신 누른다
const tokenActs = (() => {
    let down = null, pop = null, busy = false;
    const barEl = () => document.getElementById("secondary-toolbar");
    const shown = el => !!el && getComputedStyle(el).display !== "none";
    // 우리가 줄을 숨기는 것(visibility)과 상관없이, Roll20 이 줄·단추를 실제로 보여 주고 있는지로 판단한다
    // (빈 곳을 누르면 선택이 풀려 Roll20 이 줄을 감춘다 → 메뉴를 띄우지 않는다)
    const actions = () => {
        const b = barEl(), ul = b?.querySelector("ul.tokenactions");
        if (!ul) return [];
        const hid = b.classList.contains("r20ta-hide");
        if (hid) b.classList.remove("r20ta-hide");
        const live = ul.getClientRects().length > 0 && getComputedStyle(ul).visibility !== "hidden" && +getComputedStyle(b).opacity > 0;
        const list = live ? [...ul.querySelectorAll("button")].filter(x => x.getClientRects().length > 0) : [];
        if (hid) b.classList.add("r20ta-hide");
        return list;
    };
    const close = () => { pop?.remove(); pop = null; };
    const wait = ms => new Promise(r => setTimeout(r, ms));
    // 판 위를 눌렀는지: Roll20 맵 판(#tabletop-wrapper · 캔버스, 예전 화면은 #editor-wrapper)
    const onBoard = t => !!t && (t.id === "tabletop-wrapper" || t.tagName === "CANVAS" || !!t.closest?.("#editor-wrapper"));
    // ── 그 자리에 마우스 동작을 흉내 낸다 — Roll20 은 스크립트가 보낸 우클릭 · 더블클릭도 받는다(실제 진단 11-04) ──
    const fire = (at, type, btn, extra) => at.el.dispatchEvent(new (type.startsWith("pointer") ? PointerEvent : MouseEvent)(type,
        { bubbles: true, cancelable: true, composed: true, clientX: at.x, clientY: at.y, button: btn, buttons: btn === 2 ? 2 : 1, pointerId: 1, pointerType: "mouse", isPrimary: true, view: window, ...extra }));
    const press = (at, btn, detail = 1) => {
        fire(at, "pointerdown", btn, { detail }); fire(at, "mousedown", btn, { detail });
        fire(at, "pointerup", btn, { buttons: 0, detail }); fire(at, "mouseup", btn, { buttons: 0, detail });
    };
    const shownMenu = () => [...document.querySelectorAll(".context-menu")].find(m => m.getClientRects().length);
    // 숨긴 우클릭 메뉴: 그 자리를 우클릭한 것처럼 해서 Roll20 메뉴를 보이지 않게(body.r20ta-probe) 띄운다
    const probe = async at => {
        document.body.classList.add("r20ta-probe");
        press(at, 2); fire(at, "contextmenu", 2, { buttons: 0 });
        let m = null;
        for (let i = 0; i < 20 && !(m = shownMenu()); i++) await wait(25);
        if (m) await wait(60);            // 토큰 메뉴 정리 · 레이어 하위 메뉴가 그려질 틈
        else document.body.classList.remove("r20ta-probe");
        return m;
    };
    // 닫기: 항목을 누르면 Roll20 이 닫는다. 안 닫혔으면 그 자리를 왼클릭 (Esc 로는 안 닫힌다 — 진단 11-04)
    const unprobe = async (at, m, ms) => {
        for (let t = 0; t < ms && m.isConnected && m.getClientRects().length; t += 25) await wait(25);
        if (m.isConnected && m.getClientRects().length) { press(at, 0); for (let i = 0; i < 12 && m.isConnected && m.getClientRects().length; i++) await wait(25); }
        document.body.classList.remove("r20ta-probe");
    };
    const solo = async fn => {
        if (busy) return;
        busy = true;
        try { await fn(); }
        catch (e) { console.warn("[토큰 액션] 숨긴 우클릭 메뉴 오류:", e); document.body.classList.remove("r20ta-probe"); }
        finally { busy = false; }
    };
    // 메뉴 항목 실행: 그때마다 새로 숨긴 우클릭 메뉴를 띄워 누른다(Roll20 메뉴는 한 번 누르면 닫힌다). 토큰 설정은 더블클릭
    const act = (at, spec) => {
        close();
        if (spec.dbl) { press(at, 0, 1); fire(at, "click", 0, { buttons: 0, detail: 1 }); press(at, 0, 2); fire(at, "click", 0, { buttons: 0, detail: 2 }); fire(at, "dblclick", 0, { buttons: 0, detail: 2 }); return; }
        solo(async () => {
            const m = await probe(at);
            if (!m) return console.warn("[토큰 액션] 우클릭 메뉴를 못 열었어요");
            try { await tokenMenu.run(m, spec); } finally { await unprobe(at, m, 1500); }
        });
    };
    // 토큰을 눌렀으면: 숨긴 우클릭 메뉴로 무엇이 되는지 읽고 닫은 뒤 메뉴를 띄운다(토큰이 아니면 토큰 액션만 — 없으면 안 띄움)
    const show = at => solo(async () => {
        let info = null;
        const m = await probe(at);
        if (m) { try { info = tokenMenu.info(m); } finally { await unprobe(at, m, 0); } }
        const list = actions();
        if (info?.token || list.length) open(at, info?.token ? info : null, list);
    });
    // ── 메뉴 판: [카드 뒤집기 · ‹면 선택› · 레이어] [토큰 설정 · 캐릭터 시트 · 시선 집중 핑] ─ 토큰 액션 ──
    // 못 쓰는 칸은 지우지 않고 흐리게(자리가 늘 같게). 이름은 마우스를 올리면 말풍선(tokenMenu 의 .r20tm-tip)
    const SVG = {
        flip: '<rect x="3" y="5" width="10" height="14" rx="2"/><path d="M16 8h3a2 2 0 0 1 2 2v7M18 15l3 3 3-3"/>',
        face: '<rect x="4" y="4" width="12" height="12" rx="2"/><path d="M8 20h10a2 2 0 0 0 2-2V8"/>',
        layer: '<path d="M12 4l9 5-9 5-9-5z"/><path d="M3 14l9 5 9-5"/>',
        gear: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
        sheet: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
        ping: '<circle cx="12" cy="12" r="2.5"/><circle cx="12" cy="12" r="7"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>'
    };
    const ib = (name, d, off, fn, cls = "r20ta-ib") => {
        const b = document.createElement("button");
        b.type = "button"; b.className = cls; b.setAttribute("role", "menuitem");
        b.innerHTML = d.startsWith("<") ? `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>` : d;
        b.setAttribute("aria-label", name); b.dataset.tip = name;
        if (off) { b.classList.add("off"); b.setAttribute("aria-disabled", "true"); }
        b.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); if (!off && fn) fn(); });
        return b;
    };
    const row3 = (...cells) => { const r = document.createElement("div"); r.className = "r20ta-g3"; r.append(...cells); return r; };
    const hr = () => Object.assign(document.createElement("div"), { className: "r20ta-hr" });
    // 레이어 하위 판: 우클릭 레이어 묶음과 같은 내용(지금 레이어 빼기 · 아이콘 3칸 줄). 마우스를 올리면 열고 0.3초 여유를 두고 닫는다
    const layerFly = (at, anchor, spec) => {
        const f = document.createElement("div");
        f.className = "r20ta-fly"; f.setAttribute("role", "menu"); f.setAttribute("aria-label", "레이어"); f.hidden = true;
        spec.forEach(x => {
            if (!x.icons) { const b = document.createElement("button"); b.type = "button"; b.setAttribute("role", "menuitem"); b.textContent = x.name;
                if (x.off) b.classList.add("off"); b.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); if (!x.off) act(at, { path: x.path }); }); f.appendChild(b); return; }
            f.appendChild(row3(...x.icons.map(i => { const b = ib(i.name, i.svg, i.off, () => act(at, { path: i.path })); if (i.on) { b.classList.add("on"); b.setAttribute("aria-pressed", "true"); } return b; })));
        });
        let t = 0;
        const place = () => {
            f.classList.remove("left");
            f.style.top = Math.max(0, anchor.offsetTop - 4) + "px";
            if (pop.getBoundingClientRect().right + f.offsetWidth + 8 > innerWidth) f.classList.add("left");
        };
        const openF = () => { clearTimeout(t); if (f.hidden) { f.hidden = false; place(); } };
        const shut = () => { clearTimeout(t); t = setTimeout(() => { f.hidden = true; }, 300); };
        [anchor, f].forEach(el => { el.addEventListener("mouseenter", openF); el.addEventListener("mouseleave", shut); });
        anchor.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); f.hidden ? openF() : (f.hidden = true); });
        return f;
    };
    const open = (at, info, list) => {
        close();
        pop = document.createElement("div");
        pop.className = "r20ta-pop";
        pop.setAttribute("role", "menu");
        pop.setAttribute("aria-label", "토큰 메뉴");
        pop._info = !!info;
        if (info) {
            const face = document.createElement("div");
            face.className = "r20ta-face";
            face.append(ib("이전 면", "‹", !info.multi, () => act(at, { face: "prev" }), "r20ta-nav"), ib("면 선택", SVG.face, !info.multi, () => act(at, { face: "choose" })),
                ib("다음 면", "›", !info.multi, () => act(at, { face: "next" }), "r20ta-nav"));
            const lay = ib("레이어", SVG.layer, !info.layer.length, null);
            pop.append(row3(ib("카드 뒤집기", SVG.flip, !info.card, () => act(at, { path: "카드 뒤집기" })), face, lay),
                row3(ib("토큰 설정", SVG.gear, false, () => act(at, { dbl: true })), ib("캐릭터 시트", SVG.sheet, !info.sheet, () => act(at, { path: "캐릭터 시트" })),
                    ib("시선 집중 핑", SVG.ping, !info.ping, () => act(at, { path: "시선 집중 핑" }))));
            if (info.layer.length) pop.appendChild(layerFly(at, lay, info.layer));
            if (list.length) pop.appendChild(hr());
        }
        list.forEach(orig => {
            const b = document.createElement("button");
            b.type = "button";
            b.setAttribute("role", "menuitem");
            b.textContent = orig.textContent.trim() || "(이름 없음)";
            b.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); close(); orig.click(); });
            pop.appendChild(b);
        });
        document.body.appendChild(pop);
        const { width: w, height: h } = pop.getBoundingClientRect();
        pop.style.left = zpx(Math.max(4, Math.min(at.x + 10, innerWidth - w - 4)));
        pop.style.top = zpx(Math.max(4, Math.min(at.y + 10, innerHeight - h - 4)));
    };
    // 위쪽 줄에 토큰 액션만 있을 때는 줄을 숨긴다 (그리기 도구 설정 등 다른 줄은 그대로)
    const inject = () => {
        const b = barEl();
        if (!b) return;
        const ul = b.querySelector("ul.tokenactions");
        const others = [...b.querySelectorAll("ul.mode")].some(u => u !== ul && shown(u));
        b.classList.toggle("r20ta-hide", btnVisible.tokact && !!ul && !others);
        if (pop && !pop._info && !actions().length) close();         // 토큰 액션만 띄운 메뉴는 선택이 풀리면 닫는다
    };
    document.addEventListener("pointerdown", e => {
        if (pop && !pop.contains(e.target)) close();
        if (!e.isTrusted) return;           // 숨긴 메뉴를 열고 닫으려고 스크립트가 보낸 것은 무시
        const mod = e.shiftKey || e.ctrlKey || e.metaKey || e.altKey;      // 여럿 고르기 등은 그대로
        down = btnVisible.tokact && e.button === 0 && !mod && onBoard(e.target) ? { x: e.clientX, y: e.clientY, el: e.target } : null;
    }, true);
    document.addEventListener("pointerup", e => {
        if (!down || !e.isTrusted || e.button !== 0) return;
        const at = { x: e.clientX, y: e.clientY, el: down.el }, moved = Math.hypot(at.x - down.x, at.y - down.y) > 4;
        down = null;
        if (moved) return;                  // 끌어서 옮긴 것은 메뉴를 띄우지 않는다
        setTimeout(() => show(at), 60);     // Roll20 이 선택 · 토큰 액션을 갱신한 뒤
    }, true);
    document.addEventListener("keydown", e => { if (pop && e.key === "Escape") close(); }, true);
    document.addEventListener("contextmenu", close, true);
    document.addEventListener("wheel", () => pop && close(), { capture: true, passive: true });
    const setEnabled = on => {
        document.body.classList.toggle("r20ta-on", on);
        if (!on) { close(); barEl()?.classList.remove("r20ta-hide"); }
        else inject();
    };
    setEnabled(btnVisible.tokact);
    return { inject, setEnabled };
})();

// ───────── 덱 창: 반투명 판 · 카드 최대 100px · 메뉴는 마우스를 올릴 때 카드 왼쪽에 (#showndecks.r20dk-on — 모양은 CSS) ─────────
const deckView = (() => {
    let hov = null, t = 0;
    const place = ad => {
        const c = ad.querySelector(".controls"), st = ad.querySelector(".deckstack");
        if (!c || !st) return;
        const r = st.getBoundingClientRect(), w = c.offsetWidth, h = c.offsetHeight;
        const x = r.left - w - 6 >= 4 ? r.left - w - 6 : r.right + 6;
        c.style.setProperty("left", Math.round(x) + "px", "important");
        c.style.setProperty("top", Math.round(Math.max(4, Math.min(r.top, innerHeight - h - 4))) + "px", "important");
    };
    const close = () => { clearTimeout(t); t = 0; hov?.classList.remove("r20dk-hov"); hov = null; };
    // 카드 → 메뉴로 옮겨 가는 틈에서 닫히지 않게 조금 기다린다
    document.addEventListener("mouseover", e => {
        if (!btnVisible.deckview) return;
        const ad = e.target.closest?.("#showndecks.r20dk-on .adeck");
        if (!ad) { if (hov && !t) t = setTimeout(close, 250); return; }
        clearTimeout(t); t = 0;
        if (hov === ad) return;
        close();
        hov = ad;
        ad.classList.add("r20dk-hov");
        place(ad);
    });
    document.addEventListener("scroll", e => { if (hov && e.target.id === "showndecks") close(); }, true);
    const inject = () => {
        const sd = document.getElementById("showndecks");
        if (!sd) return;
        sd.classList.toggle("r20dk-on", btnVisible.deckview);
    };
    return { inject, setEnabled: () => inject() };
})();

// ───────── 화면 배치: 햄버거(≡) 밑에 페이지 메뉴 버튼, 그 밑에 화면 제어(보기 · 중앙 · 확대 · 배율 · 축소)를 세로로 (body.r20sc-on) ─────────
// Roll20 요소는 그대로 두고 자리·모양만 바꾼다
const screenUI = (() => {
    const Z_KEYS = ["position", "left", "right", "top", "width", "height"];
    // 햄버거 바로 밑부터 차례로 쌓고, 오른쪽 끝을 햄버거에 맞춘다
    const place = () => {
        const hb = document.getElementById("sidebarcontrol");
        if (!hb) return;
        const r = hb.getBoundingClientRect(), side = document.getElementById("rightsidebar")?.getBoundingClientRect();
        const edge = side && side.width > 0 && side.left < innerWidth - 1 ? side.left : r.right;       // 대화 판 안쪽을 덮지 않게
        let y = r.bottom + 4;
        const els = btnVisible.screenui ? [document.getElementById("page-button"), document.getElementById("vm_zoom_buttons")] : [];
        els.push(document.getElementById("r20-mapshot"));
        els.forEach(el => {
            if (!el) return;
            const set = (k, v) => el.style.setProperty(k, v, "important");
            set("position", "fixed"); set("left", "auto");
            if (el.id === "vm_zoom_buttons") { set("width", "auto"); set("height", "auto"); }
            set("top", Math.round(y) + "px");
            set("right", Math.round(innerWidth - edge) + "px");
            y += el.getBoundingClientRect().height + 4;
        });
    };
    let watched = null, watchedSide = null;
    const inject = () => {
        if (!btnVisible.screenui && !btnVisible.mapshot) return;
        place();
        const side = document.getElementById("rightsidebar");
        if (side && watchedSide !== side) {
            watchedSide = side;
            new ResizeObserver(() => place()).observe(side);
        }
        // 채팅·저널을 여닫으면 햄버거가 움직인다 → 따라간다
        const hb = document.getElementById("sidebarcontrol");
        if (hb && watched !== hb) {
            watched = hb;
            new MutationObserver(() => place()).observe(hb, { attributes: true, attributeFilter: ["style", "class"] });
            hb.addEventListener("click", () => [60, 300, 700].forEach(ms => setTimeout(() => place(), ms)));
        }
    };
    const setEnabled = on => {
        document.body.classList.toggle("r20sc-on", on);
        if (on) return inject();
        ["vm_zoom_buttons", "page-button"].forEach(id => { const el = document.getElementById(id); if (el) Z_KEYS.forEach(k => el.style.removeProperty(k)); });
        place();
    };
    window.addEventListener("resize", () => place());
    setEnabled(btnVisible.screenui);
    return { inject, setEnabled, place };
})();

// ───────── 페이지 창 슬림: Roll20 페이지 창(.vtt-page-card-menu)의 겉모양만 가늘고 가볍게 (body.r20pg-on) ─────────
// 누르기 · 끌기 · 메뉴 등 동작은 Roll20 그대로. 카드 크기만 −/+ 단추로 바꾼다
const pagePanel = (() => {
    let size = Math.max(90, Math.min(260, parseInt(localStorage.getItem("r20_pg_size"), 10) || 150));
    const apply = menu => { if (menu.style.getPropertyValue("--r20pg-size") !== size + "px") menu.style.setProperty("--r20pg-size", size + "px"); };
    const inject = () => {
        if (!btnVisible.pageslim) return;
        document.querySelectorAll(".vtt-page-card-menu").forEach(menu => {
            apply(menu);
            const row = menu.querySelector(".input-row");
            if (!row || row.querySelector(".r20pg-zoom")) return;       // Vue 가 다시 그리면 다시 단다
            const z = document.createElement("span");
            z.className = "r20pg-zoom";
            z.innerHTML = '<button type="button" data-d="-1" aria-label="썸네일 작게">−</button><button type="button" data-d="1" aria-label="썸네일 크게">+</button>';
            z.addEventListener("click", e => {
                const b = e.target.closest("button[data-d]");
                if (!b) return;
                size = Math.max(90, Math.min(260, size + Number(b.dataset.d) * 30));
                localStorage.setItem("r20_pg_size", size);
                document.querySelectorAll(".vtt-page-card-menu").forEach(apply);
            });
            const create = [...row.children].find(c => c.querySelector(".create-page"));
            row.insertBefore(z, create || null);
        });
    };
    const setEnabled = on => {
        document.body.classList.toggle("r20pg-on", on);
        if (!on) document.querySelectorAll(".r20pg-zoom").forEach(z => z.remove());
        else inject();
    };
    setEnabled(btnVisible.pageslim);
    return { inject, setEnabled, watch: ".vtt-page-card-menu" };
})();

// ───────── 맵 아래 매크로 줄: 두 줄로 쌓기 + 길게(0.4초) 눌러 끌면 순서 바꾸기 (body.r20mb-on) ─────────
// 순서 바꾸기·저장은 Roll20 의 sortable 그대로이고, 시작 조건(delay)만 바꾼다
const macroBar = (() => {
    let bound = null, orig = null;
    const inject = () => {
        document.body.classList.toggle("r20mb-on", btnVisible.macrobar);
        const list = document.getElementById("macrobar_macros"), jq = window.jQuery || window.$;
        if (!list || !jq?.fn?.sortable || !list.classList.contains("ui-sortable")) return;
        const $l = jq(list);
        if (bound !== list) {
            bound = list;
            orig = { delay: $l.sortable("option", "delay") || 0, cancel: $l.sortable("option", "cancel") };
            $l.on("sortstart.r20mb", () => list.classList.add("r20mb-drag")).on("sortstop.r20mb", () => list.classList.remove("r20mb-drag"));
        }
        // jQuery UI 는 기본으로 <button> 에서 시작한 끌기를 무시한다 → 켜져 있을 땐 단추를 잡아도 끌리게
        const want = btnVisible.macrobar ? { delay: 400, cancel: "input,textarea,select,option" } : orig;
        if ($l.sortable("option", "delay") !== want.delay || $l.sortable("option", "cancel") !== want.cancel) $l.sortable("option", want);
        // 두 줄이 되며 아래로 넘치면 아래쪽에 붙인다
        const mb = document.getElementById("macrobar");
        if (btnVisible.macrobar && mb && mb.getBoundingClientRect().bottom > innerHeight - 2) {
            mb.style.setProperty("top", "auto", "important");
            mb.style.setProperty("bottom", "12px", "important");
        }
    };
    return { inject, setEnabled: () => inject() };
})();

addCss(`
        /* 재생 중인 곡 */
        /* 페이지 창 슬림 (body.r20pg-on) — Roll20 Vue 스타일 위에 덮어쓴다 */
        body.r20pg-on .vtt-page-card-menu .page-card-menu-header { padding:0 !important; }
        body.r20pg-on .vtt-page-card-menu .page-card-menu-header > .horizontal-wrapper:first-child { min-height:0 !important; height:46px !important; padding:0 10px 0 14px !important; border-bottom:1px solid var(--aio-line-4); align-items:center !important; }
        body.r20pg-on .vtt-page-card-menu .current-page-wrapper { display:flex !important; align-items:center !important; gap:10px !important; }
        body.r20pg-on .vtt-page-card-menu .current-page { display:flex !important; align-items:center !important; gap:8px !important; }
        body.r20pg-on .vtt-page-card-menu .current-page__thumbnail { width:auto !important; height:24px !important; max-width:40px; border-radius:var(--aio-r-sm) !important; object-fit:cover; }
        body.r20pg-on .vtt-page-card-menu .current-page__title { font-size:14px !important; font-weight:700 !important; color:var(--aio-ink) !important; }
        body.r20pg-on .vtt-page-card-menu .current-page-settings { display:inline-flex !important; align-items:center !important; gap:5px !important; height:28px !important; padding:0 10px !important; border-radius:var(--aio-r) !important; color:var(--aio-ink-3) !important; font-size:12px !important; cursor:pointer; }
        body.r20pg-on .vtt-page-card-menu .current-page-settings:hover, body.r20pg-on .vtt-page-card-menu .page-card-menu-header .btn-cancel:hover, body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .block-submenu-header .buttons-container button:hover { background:var(--aio-bg-3) !important; color:var(--aio-ink) !important; }
        body.r20pg-on .vtt-page-card-menu .current-page-settings__text { font-size:12px !important; font-weight:400 !important; color:inherit !important; }
        body.r20pg-on .vtt-page-card-menu .party-box-outer { min-height:0 !important; height:32px !important; padding:0 8px !important; border:0 !important; border-radius:var(--aio-r) !important; background:transparent !important; box-shadow:none !important; }
        body.r20pg-on .vtt-page-card-menu .party-box-outer:hover { background:var(--aio-bg-3) !important; }
        body.r20pg-on .vtt-page-card-menu .party-ribbon img { height:20px !important; width:auto !important; }
        body.r20pg-on .vtt-page-card-menu .player-icon { width:22px !important; height:22px !important; min-width:0 !important; border-width:2px !important; }
        body.r20pg-on .vtt-page-card-menu .party-page-name { font-size:12px !important; }
        body.r20pg-on .vtt-page-card-menu .party-page-members { font-size:10px !important; color:var(--aio-ink-4) !important; }
        body.r20pg-on .vtt-page-card-menu .page-card-menu-header .btn-cancel { width:28px !important; height:28px !important; min-width:0 !important; padding:0 !important; border:0 !important; border-radius:var(--aio-r) !important; background:transparent !important; color:var(--aio-ink-3) !important; box-shadow:none !important; }
        body.r20pg-on .vtt-page-card-menu .input-row { min-height:0 !important; height:44px !important; gap:8px !important; padding:0 14px !important; margin:0 !important; align-items:center !important; }
        body.r20pg-on .vtt-page-card-menu .folder__add { width:28px !important; height:28px !important; min-width:0 !important; padding:0 !important; border:0 !important; border-radius:var(--aio-r) !important; background:transparent !important; color:var(--aio-ink-3) !important; box-shadow:none !important; }
        body.r20pg-on .vtt-page-card-menu .folder__add:hover { background:var(--aio-bg-3) !important; }
        body.r20pg-on .vtt-page-card-menu .page-search-input .el-input__wrapper { height:30px !important; min-height:0 !important; padding:0 10px !important; border-radius:var(--aio-r) !important; background:var(--aio-bg-3) !important; box-shadow:none !important; }
        body.r20pg-on .vtt-page-card-menu .page-search-input .el-input__inner { height:28px !important; font-size:12px !important; }
        body.r20pg-on .vtt-page-card-menu .page-search-input .grimoire__roll20-icon { --v7353a950:14px !important; color:var(--aio-ink-4) !important; }
        body.r20pg-on .vtt-page-card-menu .create-page button { height:28px !important; min-height:0 !important; padding:0 10px !important; font-size:12px !important; }
        body.r20pg-on .vtt-page-card-menu .create-page__label, body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .grimoire-tab__label { font-size:12px !important; font-weight:700 !important; }
        body.r20pg-on .vtt-page-card-menu .r20pg-zoom { display:flex; gap:2px; flex-shrink:0; }
        body.r20pg-on .vtt-page-card-menu .r20pg-zoom button { width:24px; height:24px; margin:0; padding:0; border:1px solid var(--aio-line-2); border-radius:var(--aio-r-sm); background:var(--aio-bg); color:var(--aio-ink-3); font-size:13px; line-height:1; cursor:pointer; }
        body.r20pg-on .vtt-page-card-menu .r20pg-zoom button:hover { background:var(--aio-bg-3); color:var(--aio-ink); }
        body.r20pg-on .vtt-page-card-menu .breadcrumb-wrapper { min-height:0 !important; height:32px !important; font-size:12px !important; color:var(--aio-ink-4) !important; }
        body.r20pg-on .vtt-page-card-menu .breadcrumb-item { font-size:12px !important; color:var(--aio-ink-4) !important; }
        body.r20pg-on .vtt-page-card-menu .breadcrumb-item:last-of-type { color:var(--aio-ink-2) !important; font-weight:700 !important; }
        body.r20pg-on .vtt-page-card-menu .page-tree-view-collapse-title { font-size:10px !important; font-weight:700 !important; letter-spacing:0.04em; color:var(--aio-ink-4) !important; }
        body.r20pg-on .vtt-page-card-menu .all-btn { height:28px !important; padding:0 8px !important; border-radius:var(--aio-r) !important; font-size:12px !important; }
        body.r20pg-on .vtt-page-card-menu .tree-view .node { min-height:0 !important; height:28px !important; margin:0 !important; padding:0 4px !important; border:0 !important; border-radius:var(--aio-r) !important; background:transparent !important; box-shadow:none !important; }
        body.r20pg-on .vtt-page-card-menu .tree-view .node:hover { background:var(--aio-bg-3) !important; }
        body.r20pg-on .vtt-page-card-menu .tree-view .node.active { background:var(--aio-accent-bg) !important; }
        body.r20pg-on .vtt-page-card-menu .tree-view .node-button { height:28px !important; min-height:0 !important; padding:0 4px !important; font-size:12px !important; }
        body.r20pg-on .vtt-page-card-menu .tree-view .node-icon .grimoire__roll20-icon { --v7353a950:14px !important; font-size:14px !important; color:var(--aio-ink-5) !important; }
        body.r20pg-on .vtt-page-card-menu .tree-view .node.active .node-icon .grimoire__roll20-icon { color:var(--aio-accent) !important; }
        body.r20pg-on .vtt-page-card-menu .tree-view .node-name { font-size:12px !important; font-weight:400 !important; color:var(--aio-ink-2) !important; }
        body.r20pg-on .vtt-page-card-menu .tree-view .node.active .node-name { font-weight:700 !important; color:var(--aio-accent-dark) !important; }
        body.r20pg-on .vtt-page-card-menu .tree-view .node-children-count { min-width:0 !important; padding:0 !important; border:0 !important; background:none !important; color:var(--aio-ink-5) !important; font-size:11px !important; font-weight:400 !important; }
        body.r20pg-on .vtt-page-card-menu .page-container { display:grid !important; grid-template-columns:repeat(auto-fill, minmax(var(--r20pg-size, 150px), 1fr)) !important; gap:12px 10px !important; padding:4px 16px 16px !important; }
        body.r20pg-on .vtt-page-card-menu .vtt-page-card-wrapper.page-card { width:auto !important; min-width:0 !important; height:auto !important; margin:0 !important; padding:0 !important; }
        body.r20pg-on .vtt-page-card-menu .vtt-page-card { position:relative !important; flex:1 1 auto !important; min-width:0 !important; width:100% !important; height:auto !important; min-height:0 !important; margin:0 !important; padding:0 !important; border:0 !important; border-radius:0 !important; background:transparent !important; box-shadow:none !important; }
        body.r20pg-on .vtt-page-card-menu .card-thumbnail-container { position:relative !important; width:100% !important; height:auto !important; aspect-ratio:16/10; border-radius:var(--aio-r) !important; overflow:hidden !important; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.06); }
        body.r20pg-on .vtt-page-card-menu .card-thumbnail { position:absolute !important; inset:0 !important; width:100% !important; height:100% !important; border-radius:0 !important; }
        body.r20pg-on .vtt-page-card-menu .vtt-page-card:hover .card-thumbnail-container { box-shadow:0 0 0 2px var(--aio-accent-mid) !important; }
        body.r20pg-on .vtt-page-card-menu .vtt-page-card.selected .card-thumbnail-container { box-shadow:0 0 0 2px var(--aio-accent) !important; }
        body.r20pg-on .vtt-page-card-menu .vtt-page-card.selected .card-thumbnail-container::before { content:"현재"; position:absolute; left:5px; top:5px; z-index:3; padding:0 6px; border-radius:var(--aio-r-lg); background:var(--aio-accent); color:#fff; font-size:9px; font-weight:700; line-height:15px; }
        body.r20pg-on .vtt-page-card-menu .vtt-page-title { min-height:0 !important; height:auto !important; margin:0 !important; padding:5px 1px 0 !important; text-align:left !important; }
        body.r20pg-on .vtt-page-card-menu .vtt-page-title .el-text { font-size:16px !important; font-weight:400 !important; color:var(--aio-ink-2) !important; }
        body.r20pg-on .vtt-page-card-menu .vtt-page-controls { position:absolute !important; top:4px !important; right:4px !important; left:auto !important; bottom:auto !important; z-index:3; display:flex !important; gap:2px; width:auto !important; height:auto !important; margin:0 !important; padding:1px 3px !important; border-radius:var(--aio-r-sm); background:rgba(255,255,255,0.92) !important; opacity:0; transition:opacity 0.12s; }
        body.r20pg-on .vtt-page-card-menu .vtt-page-controls > span:first-child { display:none !important; }
        body.r20pg-on .vtt-page-card-menu .vtt-page-card:hover .vtt-page-controls, body.r20pg-on .vtt-page-card-menu .vtt-page-card:focus-within .vtt-page-controls { opacity:1; }
        /* 페이지 설정 창(세부 정보): Roll20 공용 .block-submenu 중 페이지 설정 칸이 든 창에만 */
        body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) { border-radius:var(--aio-r-lg) !important; box-shadow:0 6px 24px rgba(0,0,0,0.18) !important; }
        body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .block-submenu-header { min-height:0 !important; height:42px !important; padding:0 8px 0 14px !important; border-bottom:1px solid var(--aio-line-4) !important; align-items:center !important; }
        body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .block-submenu-header .title { margin:0 !important; font-size:13px !important; font-weight:700 !important; }
        body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .block-submenu-header .buttons-container button { width:28px !important; height:28px !important; padding:0 !important; border:0 !important; border-radius:var(--aio-r) !important; background:transparent !important; color:var(--aio-ink-3) !important; }
        body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .block-submenu-body { padding:0 14px 10px !important; }
        body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .section.tabs { min-height:0 !important; margin:0 0 4px !important; padding:6px 0 0 !important; border-bottom:1px solid var(--aio-line-4); }
        body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .grimoire-tab__button { height:auto !important; padding:4px 0 7px !important; font-size:12px !important; }
        body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .section { padding-top:6px !important; padding-bottom:6px !important; margin:0 !important; }
        body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .title-wrapper { min-height:0 !important; margin:0 0 4px !important; padding:0 !important; gap:4px !important; align-items:center !important; }
        body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) h4.title, body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .large-title { margin:6px 0 4px !important; font-size:12px !important; font-weight:700 !important; color:var(--aio-ink-2) !important; }
        body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) h5, body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .title.subheader, body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .smallerTitle { margin:0 !important; font-size:11px !important; font-weight:400 !important; color:var(--aio-ink-3) !important; line-height:1.4 !important; }
        body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .info-icon { --v7353a950:12px !important; color:var(--aio-ink-5) !important; }
        body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .rowspacer { min-height:0 !important; height:auto !important; gap:4px !important; padding-top:0 !important; align-items:center !important; flex-wrap:nowrap !important; }
        body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .pagename-top { display:grid !important; grid-template-columns:minmax(0, 1.3fr) minmax(0, 1fr) !important; gap:8px !important; padding:6px 0 4px !important; }
        body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .pagename-top > div { width:auto !important; min-width:0 !important; }
        body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .pagename-top .el-input, body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .pagename-top .el-select { width:100% !important; }
        body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .el-input__wrapper, body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .el-select__wrapper { min-height:0 !important; height:28px !important; padding:0 8px !important; border-radius:var(--aio-r) !important; box-shadow:0 0 0 1px var(--aio-line-2) inset !important; background:var(--aio-bg) !important; font-size:12px !important; }
        body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .el-input__inner, body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .el-select__selected-item { height:26px !important; font-size:12px !important; line-height:26px !important; }
        body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .flex-wrapper { flex:1 1 0 !important; min-width:0 !important; width:auto !important; }
        body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .flex-wrapper.disabled { flex:0.8 1 0 !important; }
        body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .flex-wrapper .__container, body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .flex-wrapper .label { width:100% !important; min-width:0 !important; margin:0 !important; }
        body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .pillBox { display:flex !important; align-items:center !important; width:100% !important; min-width:0 !important; height:28px !important; margin:0 !important; padding:0 !important; border:1px solid var(--aio-line-2) !important; border-radius:var(--aio-r) !important; background:var(--aio-bg) !important; box-shadow:none !important; overflow:hidden; }
        body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .pillBox.disabled { background:var(--aio-bg-3) !important; }
        body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .pillBox .__box { flex:1 1 auto !important; width:100% !important; min-width:0 !important; height:26px !important; margin:0 !important; padding:0 4px !important; border:0 !important; background:transparent !important; font-size:12px !important; text-align:right !important; box-shadow:none !important; }
        body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .pillBox.disabled .__box { color:var(--aio-ink-5) !important; }
        body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .pillBox .append { flex-shrink:0 !important; height:auto !important; margin:0 !important; padding:0 7px 0 2px !important; border:0 !important; background:transparent !important; color:var(--aio-ink-4) !important; font-size:10px !important; white-space:nowrap; }
        body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .rowspacer > .el-button.is-link { border:0 !important; background:transparent !important; box-shadow:none !important; flex:0 0 14px !important; width:14px !important; min-width:0 !important; height:auto !important; margin:0 !important; padding:0 !important; opacity:0.45; }
        body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .rowspacer > .el-button.is-link img { width:12px !important; height:12px !important; }
        body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .block-submenu-divider, body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .divider-svg { margin:8px 0 !important; border-color:var(--aio-line-4) !important; background:var(--aio-bg-3); }
        body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .hug-edges { width:100% !important; min-height:0 !important; margin:0 !important; padding-top:4px !important; padding-bottom:4px !important; align-items:center !important; font-size:12px !important; }
        body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .text-tool-color { display:flex !important; flex-direction:row !important; align-items:center !important; justify-content:space-between !important; gap:8px !important; width:100% !important; margin:0 !important; padding:2px 0 !important; }
        body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .text-tool-color h5, body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .switch-label h5 { font-size:12px !important; color:var(--aio-ink-2) !important; }
        body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .color-picker-trigger { width:22px !important; height:22px !important; border-radius:var(--aio-r-sm) !important; box-shadow:0 0 0 1px var(--aio-line-2) !important; }
        body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .el-switch { height:22px !important; transform:scale(0.8); transform-origin:right center; }
        body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .vtt-button, body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .button--delete-archive { height:28px !important; min-height:0 !important; padding:0 10px !important; border-radius:var(--aio-r) !important; font-size:12px !important; }
        body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .horizontal-slider-labels, body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .horizontal-slider-input-units { font-size:10px !important; }
        body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .horizontal-slider-input-box { height:26px !important; font-size:12px !important; }
        body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .block-submenu-footer { min-height:0 !important; height:48px !important; padding:0 12px !important; border-top:1px solid var(--aio-line-4) !important; background:var(--aio-bg-2) !important; }
        body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .block-submenu-footer-content { gap:6px !important; align-items:center !important; }
        body.r20pg-on .block-submenu:has([data-testid^="pageSettings-"]) .block-submenu-footer .grimoire__button { height:28px !important; min-height:0 !important; padding:0 14px !important; border-radius:var(--aio-r) !important; font-size:12px !important; }
        /* 면 선택(Choose Side): 슬라이더 대신 썸네일 격자, 번호는 CSS counter 로 붙인다 */
        .ui-dialog.r20cs .sideslider { display:none !important; }
        .ui-dialog.r20cs-drive .sideslider { display:block !important; position:fixed !important; left:0 !important; top:0 !important; width:1000px !important; height:10px !important; visibility:hidden !important; }
        body.r20cs-auto .ui-dialog:has(.sidechoices) { visibility:hidden !important; }
        .context-menu button.r20tm-hide, .context-menu button[data-r20tm-hide] { display:none !important; }
        .context-menu.r20tm-arranged > .context-menu-divider { display:none !important; }
        /* 가는 구분선 · 묶음 안 아이콘 한 줄(3칸) · 말풍선 */
        .context-menu > .r20tm-hr { flex:0 0 auto; height:1px; margin:3px 8px; background:rgba(128,128,128,0.25); }
        .context-menu > .r20tm-hr[hidden] { display:none; }
        /* Roll20 하위 메뉴 판(세로 flex)이 줄을 내용 폭으로 줄이고 단추 · 아이콘 크기를 덮어써서 3칸이 몰렸다 → 판 폭으로 늘리고 크기는 !important */
        .context-menu .r20tm-irow { display:grid !important; grid-template-columns:repeat(3, 1fr) !important; align-self:stretch !important; width:auto !important; box-sizing:border-box; gap:0; padding:2px 4px; }
        .context-menu .r20tm-ib { position:relative !important; display:flex !important; align-items:center !important; justify-content:center !important; width:auto !important; height:30px !important; min-width:0 !important; margin:0 !important; padding:0 !important; border:0; border-radius:var(--aio-r); background:transparent; color:inherit; cursor:pointer; }
        /* 칸 사이 짧은 세로 구분선 */
        .context-menu .r20tm-ib + .r20tm-ib::before { content:""; position:absolute; left:0; top:8px; bottom:8px; width:1px; background:rgba(128,128,128,0.3); pointer-events:none; }
        .context-menu .r20tm-ib:hover { background:rgba(128,128,128,0.16); }
        .context-menu .r20tm-ib.is-on { background:rgba(128,128,128,0.26); }
        .context-menu .r20tm-ib.disabled { opacity:.4; cursor:default; }
        .context-menu .r20tm-ib svg { width:17px !important; height:17px !important; flex:0 0 auto; fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
        .context-menu .r20tm-ib:focus-visible, .context-menu button[data-r20tm]:focus-visible, .context-menu button[data-r20tm-g]:focus-visible, .context-menu .r20tm-sub > button:focus-visible { outline:2px solid var(--aio-accent); outline-offset:-2px; }
        .r20tm-tip { position:fixed; z-index:100006; padding:3px 8px; border-radius:var(--aio-r-sm); background:rgba(20,20,22,0.92); color:#fff; font:11px/1.4 sans-serif; white-space:nowrap; pointer-events:none; }
        /* 덱 창: 반투명 판에 카드 더미만 (폭 70px, 높이는 그림 비율대로). 메뉴(이름 + 돌리기·선택·회수·섞기·숨기기)는 마우스를 올릴 때 카드 왼쪽에 띄운다 */
        /* Roll20 은 메뉴를 판 안 40px 폭에 넣어서 글자가 한 자씩 꺾였다 → position:fixed 로 판 밖에 (자리는 deckView 가 잡는다) */
        #showndecks.r20dk-on { width:auto !important; padding:6px !important; overflow-x:hidden !important; overflow-y:auto !important; background:rgba(255,255,255,0.22) !important; border-radius:var(--aio-r-lg); box-sizing:border-box; scrollbar-width:thin; }
        #showndecks.r20dk-on .adeck { width:auto !important; height:auto !important; margin:0 0 6px !important; padding:0 !important; float:none !important; }
        #showndecks.r20dk-on .adeck:last-child { margin-bottom:0 !important; }
        #showndecks.r20dk-on .deckstack { left:0 !important; margin:0 !important; width:70px !important; height:auto !important; }
        #showndecks.r20dk-on .deckstack .allback, #showndecks.r20dk-on .deckstack .nextcard > div { width:70px !important; height:auto !important; }
        #showndecks.r20dk-on .deckstack img { display:block; width:70px !important; height:auto !important; max-width:none !important; max-height:none !important; }
        #showndecks.r20dk-on .controls { display:none !important; }
        #showndecks.r20dk-on .adeck.r20dk-hov .controls { display:block !important; visibility:visible !important; opacity:1 !important; position:fixed !important; right:auto !important; z-index:20; width:96px !important; height:auto !important; padding:4px !important; overflow:visible !important; background:var(--aio-bg) !important; border:1px solid var(--aio-line-2); border-radius:var(--aio-r); box-shadow:0 4px 12px rgba(0,0,0,0.25); }
        #showndecks.r20dk-on .control { overflow:hidden; white-space:nowrap; text-overflow:clip; font-size:12px; line-height:20px; text-align:left !important; }
        #showndecks.r20dk-on .control:first-child { padding:0 6px; font-weight:700; color:var(--aio-ink); }
        #showndecks.r20dk-on .control a { display:block; padding:0 6px; border-radius:var(--aio-r-sm); color:var(--aio-accent); text-decoration:none; }
        #showndecks.r20dk-on .control a:hover { background:var(--aio-accent-bg); }
        #showndecks.r20dk-on .control:has(> a.removedcardspile), #showndecks.r20dk-on .control:has(> a.discardpile) { display:none !important; }
        /* 매크로 줄: 두 줄로 쌓고 넘치면 줄 안에서 세로 스크롤 · 길게 누르면 들림 */
        body.r20mb-on #macrobar { height:auto !important; max-height:66px !important; overflow-x:hidden !important; overflow-y:auto !important; scrollbar-width:thin; }
        /* flex 로 하면 jQuery UI 가 세로 목록으로 여겨 옆으로 끌어도 안 바뀐다 → inline-block 을 줄바꿈 */
        body.r20mb-on #macrobar_macros { display:block !important; width:auto !important; white-space:normal !important; padding:2px 0 0; }
        body.r20mb-on #macrobar_macros .macrobox { display:inline-block !important; vertical-align:top; width:auto !important; margin:0 4px 4px 0 !important; float:none !important; }
        body.r20mb-on #macrobar_macros .macrobox > button { height:26px !important; max-width:180px; margin:0 !important; padding:0 10px !important; border-radius:13px !important; font-size:12px !important; line-height:24px !important; white-space:nowrap; overflow:hidden; text-overflow:clip; box-shadow:0 1px 2px rgba(0,0,0,0.25); }
        body.r20mb-on #macrobar #macrobar_macros .macrobox > :not(button) { display:none !important; }     /* 손잡이 등: 단추 전체를 길게 눌러 끄니 필요 없다 (Roll20 의 :hover 규칙보다 우선) */
        /* 마우스를 올려도 단추 칸 크기가 그대로 (Roll20 이 올렸을 때 오른쪽에 주는 여백·장식 없애기) */
        body.r20mb-on #macrobar #macrobar_macros .macrobox:hover { width:auto !important; margin:0 4px 4px 0 !important; padding:0 !important; }
        body.r20mb-on #macrobar_macros .macrobox::before, body.r20mb-on #macrobar_macros .macrobox::after, body.r20mb-on #macrobar_macros .macrobox > button::after { display:none !important; }
        body.r20mb-on #macrobar_macros .macrobox > button:hover { box-shadow:0 0 0 2px rgba(225,0,133,0.55); }
        body.r20mb-on #macrobar_macros .ui-sortable-helper > button { transform:scale(1.08); box-shadow:0 6px 14px rgba(0,0,0,0.4) !important; }
        body.r20mb-on #macrobar_macros.r20mb-drag > .macrobox:not(.ui-sortable-helper):not(.ui-sortable-placeholder) { opacity:0.55; }
        body.r20mb-on #macrobar_macros > .ui-sortable-placeholder { display:inline-block !important; visibility:visible !important; width:3px !important; min-width:3px; height:26px !important; padding:0 !important; border-radius:2px; background:#ffd84d; box-shadow:0 0 6px #ffd84d; }
        .context-menu > button[data-r20tm="choose"] { position:relative; }
        /* 화면 배치: 화면 제어는 햄버거 밑에 하나로 접고 마우스를 올리면 왼쪽으로 펼침, 조명 레이어 자리에 페이지 버튼 */
        body.r20sc-on #page-button { width:28px !important; height:28px !important; min-width:0 !important; padding:0 !important; }
        /* 크기는 화면 제어 단추(.btnStyle)에만 — 눈 단추가 여는 창(라이트 모드 · 플레이어 시점 미리 보기 …)의 단추는 그대로 */
        body.r20sc-on #vm_zoom_buttons button.btnStyle { width:26px !important; height:24px !important; min-width:0 !important; margin:0 !important; padding:0 !important; }
        /* 오른쪽 대화 판에 붙은 인덱스 탭처럼: 오른쪽 모서리는 각지게 (페이지 · 화면 제어 · 맵) */
        body.r20sc-on #page-button, body.r20sc-on #vm_zoom_buttons, body.r20sc-on #vm_zoom_buttons > .wrapper, body.r20sc-on #vm_zoom_buttons .parentContainer, #r20-mapshot > .main { border-top-right-radius:0 !important; border-bottom-right-radius:0 !important; }
        body.r20sc-on #vm_zoom_buttons .level { font-size:11px !important; }
        body.r20sc-on #vm_zoom_buttons .parentContainer { gap:0 !important; padding:2px 0 !important; }
        body.r20sc-on #vm_zoom_buttons .wrapper { width:auto !important; height:auto !important; }
        body.r20sc-on #vm_zoom_buttons .parentContainer, body.r20sc-on #vm_zoom_buttons .zoomButtonsInner { display:flex !important; flex-direction:column !important; align-items:center !important; width:auto !important; height:auto !important; }
        body.r20sc-on #vm_zoom_buttons .parentContainer > :first-child { order:1; }
        body.r20sc-on #vm_zoom_buttons .parentContainer > :last-child { order:2; }
        body.r20sc-on #vm_zoom_buttons .parentContainer > .zoomButtonsInner { order:3; }
        body.r20sc-on #vm_zoom_buttons .zoomButtonsInner > .plus { order:1; }
        body.r20sc-on #vm_zoom_buttons .zoomButtonsInner > .level { order:2; }
        body.r20sc-on #vm_zoom_buttons .zoomButtonsInner > .sliderSection { order:3; }
        body.r20sc-on #vm_zoom_buttons .zoomButtonsInner > .minus { order:4; }
        /* 토큰 액션: 위쪽 줄은 숨기고 토큰을 클릭한 자리에 메뉴로 */
        body.r20ta-on #secondary-toolbar.r20ta-hide { visibility:hidden !important; pointer-events:none !important; }
        .r20ta-pop { position:fixed; z-index:100002; min-width:150px; max-width:280px; padding:4px; border-radius:var(--aio-r-lg); background:var(--aio-bg-3); box-shadow:0 6px 18px rgba(0,0,0,0.35); font-family:inherit; }
        /* 숨긴 우클릭 메뉴(왼클릭 메뉴가 읽고 누르는 동안) */
        body.r20ta-probe .context-menu, body.r20ta-probe .context-menu * { visibility:hidden !important; }
        .r20ta-pop button { display:flex; align-items:center; width:100%; height:30px; margin:0; padding:0 10px; border:0; border-radius:var(--aio-r); background:transparent; color:var(--aio-ink-2); font-size:13px; text-align:left; white-space:nowrap; overflow:hidden; text-overflow:clip; cursor:pointer; }
        .r20ta-pop button:hover, .r20ta-pop button:focus-visible { background:var(--aio-bg-3); outline:none; }
        .r20ta-pop:has(.r20ta-g3) { min-width:186px; }
        .r20ta-pop .r20ta-g3 { display:grid; grid-template-columns:repeat(3, 1fr); gap:0; }
        .r20ta-pop .r20ta-g3 > * { position:relative; }
        .r20ta-pop .r20ta-g3 > * + *::before { content:""; position:absolute; left:0; top:9px; bottom:9px; width:1px; background:rgba(0,0,0,0.12); pointer-events:none; }
        .r20ta-pop .r20ta-ib { justify-content:center; height:32px; padding:0; }
        .r20ta-pop .r20ta-ib svg { width:17px; height:17px; fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
        .r20ta-pop .r20ta-face { display:flex; align-items:center; min-width:0; padding:0 3px; }
        .r20ta-pop .r20ta-face .r20ta-ib { flex:1 1 auto; min-width:0; }
        .r20ta-pop .r20ta-nav { flex:0 0 16px; width:16px; height:32px; padding:0; justify-content:center; font-size:15px; color:var(--aio-ink-3); }
        .r20ta-pop .off { opacity:.35; cursor:default; }
        .r20ta-pop .off:hover { background:transparent; }
        .r20ta-pop .on { background:var(--aio-bg-4); }
        .r20ta-pop .r20ta-hr { height:1px; margin:3px 6px; background:rgba(0,0,0,0.1); }
        .r20ta-pop .r20ta-fly { position:absolute; left:calc(100% + 4px); min-width:160px; padding:4px; border-radius:var(--aio-r-lg); background:var(--aio-bg-3); box-shadow:0 6px 18px rgba(0,0,0,0.35); }
        .r20ta-pop .r20ta-fly.left { left:auto; right:calc(100% + 4px); }
        .r20ta-pop .r20ta-fly[hidden] { display:none; }
        .context-menu .r20tm-nav { position:absolute; right:6px; top:50%; transform:translateY(-50%); display:inline-flex; gap:2px; }
        .context-menu .r20tm-nav > span { display:inline-flex; align-items:center; justify-content:center; width:24px; height:20px; border-radius:var(--aio-r-sm); font-size:15px; line-height:1; cursor:pointer; }
        .context-menu .r20tm-nav > span:hover { background:rgba(0,0,0,0.1); }
        .ui-dialog.r20cs .ui-dialog-content { height:min(60vh, 520px) !important; overflow-y:auto !important; padding:10px 12px !important; }
        .ui-dialog.r20cs .sidechoices { display:grid !important; grid-template-columns:repeat(auto-fill, minmax(var(--cs-size, 96px), 1fr)); gap:8px; counter-reset:side; }
        .ui-dialog.r20cs .sidechoice { position:relative !important; display:block !important; float:none !important; width:auto !important; height:auto !important; aspect-ratio:1; margin:0 !important; padding:0 !important; border-radius:var(--aio-r-lg); overflow:hidden; background:var(--aio-bg-4); cursor:pointer; counter-increment:side; }
        .ui-dialog.r20cs .sidechoice img, .ui-dialog.r20cs .sidechoice video { position:absolute !important; inset:0 !important; display:block !important; width:100% !important; height:100% !important; min-width:0 !important; min-height:0 !important; max-width:none !important; max-height:none !important; margin:0 !important; padding:0 !important; object-fit:contain !important; pointer-events:none; }
        .ui-dialog.r20cs .sidechoice::after { content:counter(side); position:absolute; left:4px; bottom:4px; padding:0 5px; border-radius:var(--aio-r); background:rgba(0,0,0,0.55); color:#fff; font-size:10px; font-weight:700; line-height:15px; }
        .ui-dialog.r20cs .sidechoice:hover { outline:2px solid var(--aio-accent-mid); outline-offset:-2px; }
        .ui-dialog.r20cs .sidechoice[data-selected="true"] { outline:3px solid var(--aio-accent); outline-offset:-3px; }
        .ui-dialog.r20cs .sidechoice.r20cs-cur::before { content:"현재"; position:absolute; right:4px; top:4px; z-index:1; padding:0 5px; border-radius:var(--aio-r); background:var(--aio-bg); color:var(--aio-accent); font-size:9px; font-weight:700; line-height:14px; }
        .r20cs-bar { display:flex; flex-wrap:wrap; align-items:center; gap:8px; padding:8px 12px; border-bottom:1px solid var(--aio-line-3); font-size:12px; color:var(--aio-ink-2); }
        .r20cs-bar .r20cs-info { color:var(--aio-ink-3); font-size:11px; }
        .r20cs-bar .r20cs-flex { flex:1; }
        .r20cs-bar label { display:flex; align-items:center; gap:4px; margin:0; font-size:11px; font-weight:normal; color:var(--aio-ink-3); }
        .r20cs-bar input { width:58px !important; height:24px !important; margin:0 !important; padding:0 6px !important; font-size:12px !important; }
        .r20cs-zoom { display:flex; gap:2px; }
        .r20cs-zoom button { width:24px; height:22px; padding:0; border:1px solid var(--aio-line); border-radius:var(--aio-r-sm); background:var(--aio-bg); color:var(--aio-ink-3); font-size:13px; line-height:1; cursor:pointer; }
        .r20cs-zoom button:hover { background:var(--aio-bg-4); color:var(--aio-ink); }
`);
// ───────── 토큰 설정 창 정리: Roll20 '토큰 설정'의 세부 정보 탭을 한 화면 표로 (GM용 메모 탭 · 저장 · 취소는 Roll20 그대로) ─────────
// [원래 칸은 숨겨 두고 새 칸이 대신 바꾼다] Roll20 은 저장할 때 원래 칸(.bar1_value · .showplayers_name …)을 읽는다.
//   새 칸은 고칠 때마다 원래 칸 값을 바꾸고 change 를 보낸다. Roll20 이 원래 칸을 바꾸면(연동 캐릭터를 고르면 바 값 등) 잠깐 뒤 다시 읽어 맞춘다.
// [숨은 것 꺼내기] '…' 안의 플레이어 보기 · 편집, 바 숫자 보이기를 줄마다 단추로. 드롭다운은 연동 캐릭터 · 특성치 연결만 남긴다
// [색] 색조 · 오라 색은 Roll20 색 단추(spectrum)를 이쪽으로 옮겨 쓴다. 오라는 접어 둔다(펼침은 기억)
// 칸 이름은 실제 Roll20 진단(11-04) 그대로
const tokenSet = (() => {
    const isTS = d => /^(토큰 설정|Token Settings)/.test(d.querySelector(".ui-dialog-title")?.textContent.trim() || "");
    const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    const fire = (e, ...types) => types.forEach(t => e.dispatchEvent(new Event(t, { bubbles: true })));
    const LIMIT = 150;          // Roll20 툴팁 글자 수
    let auraOpen = localStorage.getItem("r20_ts_aura") === "1";
    // 세부 정보 칸들을 담은 곳: 연동 캐릭터와 마지막 칸(오라 2 반경 · 바 위치)의 가장 가까운 공통 조상 (GM 메모를 품으면 안 된다)
    const paneOf = dlg => {
        const a = dlg.querySelector(".represents"), b = dlg.querySelector(".aura2_radius") || dlg.querySelector(".token_bar_location");
        if (!a || !b) return null;
        const up = new Set(); for (let p = a; p && p !== dlg; p = p.parentElement) up.add(p);
        let p = b; while (p && p !== dlg && !up.has(p)) p = p.parentElement;
        return p && p !== dlg && !p.querySelector(".gmnotes") ? p : null;
    };
    // 바 색: 원래 '바 1' 줄의 작은 동그라미 색 (숨기기 전에 읽는다, 없으면 회색)
    const barColor = (pane, n) => {
        const lab = [...pane.querySelectorAll("*")].find(e => e.children.length <= 3 && new RegExp(`^(바|Bar)\\s*${n}$`, "i").test(e.textContent.trim()));
        const dot = lab && [lab, ...(lab.parentElement || lab).querySelectorAll("*")].find(x => {
            const r = x.getBoundingClientRect(), bg = getComputedStyle(x).backgroundColor;
            return r.width > 0 && r.width <= 18 && r.height <= 18 && bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent";
        });
        return dot ? getComputedStyle(dot).backgroundColor : "#bbb";
    };
    const build = dlg => {
        const pane = paneOf(dlg);
        if (!pane || pane.querySelector(":scope > .r20ts")) return pane;
        const Q = c => dlg.querySelector(/[.\s[]/.test(c) ? c : "." + c);     // 원래 칸은 그때그때 찾는다 (Roll20 이 다시 그려도)
        const syncs = [], moved = [];
        const sync = () => syncs.forEach(f => { try { f(); } catch (e) { /* 원래 칸이 잠깐 없을 때 */ } });
        let t1 = 0, t2 = 0;
        const later = () => { clearTimeout(t1); clearTimeout(t2); t1 = setTimeout(sync, 80); t2 = setTimeout(sync, 400); };
        const stop = e => e.stopPropagation();                     // Roll20 단축키로 새지 않게
        // ── 칸 만들기 ──
        const text = (c, cls = "") => {
            const i = mk("input", cls); i.type = "text"; i.addEventListener("keydown", stop);
            i.addEventListener("input", () => { const o = Q(c); if (o) { o.value = i.value; fire(o, "input", "change"); later(); } });
            syncs.push(() => { const o = Q(c); if (o && document.activeElement !== i) i.value = o.value; });
            return i;
        };
        const select = c => {
            const s = mk("select"); let sig = "";
            s.addEventListener("change", () => { const o = Q(c); if (o) { o.value = s.value; fire(o, "change"); later(); } });
            syncs.push(() => {
                const o = Q(c); if (!o) return;
                const ns = o.options.length + "|" + (o.options[0]?.value || "") + "|" + (o.options[o.options.length - 1]?.value || "");
                if (ns !== sig) { sig = ns; s.innerHTML = o.innerHTML; }       // 연동 캐릭터가 바뀌면 특성치 목록도 바뀐다
                s.value = o.value;
            });
            return s;
        };
        const chip = (label, c) => {
            const b = mk("button", "r20ts-chip", label); b.type = "button";
            b.addEventListener("click", () => { const o = Q(c); if (!o) return; o.checked = !o.checked; fire(o, "input", "change"); later(); sync(); });
            syncs.push(() => b.setAttribute("aria-pressed", String(!!Q(c)?.checked)));
            return b;
        };
        // 단추 묶음: get() → 지금 번호, set(i) → 바꾸기
        const seg = (labels, get, set, cls = "") => {
            const w = mk("span", "r20ts-seg " + cls); w.setAttribute("role", "group");
            const bs = labels.map((l, i) => { const b = mk("button", "", l); b.type = "button"; b.addEventListener("click", () => { set(i); later(); sync(); }); w.appendChild(b); return b; });
            syncs.push(() => { const k = get(); bs.forEach((b, i) => b.setAttribute("aria-pressed", String(i === k))); });
            return w;
        };
        // 고르기(select)를 번호로: 개수가 맞으면 짧은 이름, 아니면 Roll20 글 그대로
        const segSelect = (c, short) => {
            const o = Q(c); if (!o) return mk("span");
            const labels = o.options.length === short.length ? short : [...o.options].map(x => x.text);
            return seg(labels, () => Q(c)?.selectedIndex ?? -1, i => { const x = Q(c); if (x) { x.selectedIndex = i; fire(x, "change"); } });
        };
        const btn = (label, c) => { const b = mk("button", "r20ts-btn", label); b.type = "button"; b.addEventListener("click", e => { e.preventDefault(); Q(c)?.click(); }); return b; };
        // 색 단추: Roll20 색 고르기(spectrum)의 단추를 옮겨 온다. 못 찾으면 브라우저 색 고르기로 대신
        const color = c => {
            const o = Q(c), rep = o && (o.nextElementSibling?.classList.contains("sp-replacer") ? o.nextElementSibling : o.parentElement?.querySelector(".sp-replacer"));
            if (rep) { moved.push([rep, rep.parentElement, rep.nextSibling]); return rep; }
            const i = mk("input", "r20ts-color"); i.type = "color";
            i.addEventListener("input", () => { const x = Q(c); if (!x) return; x.value = i.value; try { window.jQuery?.(x).spectrum?.("set", i.value); } catch (e) { /* 없음 */ } fire(x, "change"); });
            syncs.push(() => { const v = Q(c)?.value || ""; if (/^#[0-9a-f]{6}$/i.test(v)) i.value = v; });
            return i;
        };
        const row = (...kids) => { const r = mk("div", "r20ts-row"); r.append(...kids); return r; };
        const lb = t => mk("span", "r20ts-lb", t);
        const sec = (...kids) => { const s = mk("div", "r20ts-sec"); s.append(...kids); return s; };
        const grow = e => { e.classList.add("r20ts-grow"); return e; };
        const panel = mk("div", "r20ts");
        // ── 기본 ──
        const op = Q("token_opacity_slider"), rng = mk("input", "r20ts-range"), pct = mk("span", "r20ts-pct");
        rng.type = "range"; ["min", "max", "step"].forEach(a => op?.getAttribute(a) && rng.setAttribute(a, op.getAttribute(a)));
        rng.setAttribute("aria-label", "기본 불투명도");
        rng.addEventListener("input", () => { const o = Q("token_opacity_slider"); if (!o) return; o.value = rng.value; fire(o, "input", "change"); pct.textContent = Math.round(rng.value * 100) + "%"; });
        syncs.push(() => { const o = Q("token_opacity_slider"); if (o) { rng.value = o.value; pct.textContent = Math.round(o.value * 100) + "%"; } });
        const rep = select("select.represents"); rep.setAttribute("aria-label", "토큰에 연동된 캐릭터");
        const nm = text("input.name"); nm.setAttribute("aria-label", "이름");
        panel.appendChild(sec(
            row(lb("캐릭터"), grow(rep), btn("시트 열기", "go_to_character"), btn("기본 토큰 갱신", "update_default_token")),
            row(lb("이름"), grow(nm), chip("이름표", "showname"), chip("보기", "showplayers_name"), chip("편집", "playersedit_name")),
            row(lb("색조"), color("tint_color"), mk("span", "r20ts-gap"), lb("불투명도"), grow(rng), pct)));
        // ── 토큰 바 ──
        const bars = mk("div", "r20ts-bars");
        ["", "값 / 최대", "특성치 연결", "플레이어", "숫자 보이기"].forEach(h => bars.appendChild(mk("span", "r20ts-gh", h)));
        for (const n of [1, 2, 3]) {
            if (!Q(`bar${n}_value`)) continue;
            const dot = mk("span", "r20ts-dot"); dot.style.background = barColor(pane, n);
            const v = text(`bar${n}_value`, "r20ts-num"), m = text(`bar${n}_max`, "r20ts-num");
            v.setAttribute("aria-label", `바 ${n} 값`); m.setAttribute("aria-label", `바 ${n} 최대`);
            const vm = mk("span", "r20ts-vm"); vm.append(v, "/", m);
            const ln = select(`bar${n}_link`); ln.setAttribute("aria-label", `바 ${n} 특성치 연결`);
            const pp = mk("span", "r20ts-pair"); pp.append(chip("보기", `showplayers_bar${n}`), chip("편집", `playersedit_bar${n}`));
            bars.append(dot, vm, ln, pp, segSelect(`bar${n}options`, ["숨김", "편집자", "모두"]));
        }
        const radios = () => [...dlg.querySelectorAll("input[name=barStyle]")];
        panel.appendChild(sec(mk("div", "r20ts-st", "토큰 바"), bars,
            row(lb("바 위치"), segSelect("token_bar_location", ["위", "위 겹침", "아래 겹침", "아래"]), mk("span", "r20ts-grow"), lb("모양"),
                seg(["기본", "축소"], () => radios().findIndex(r => r.checked), i => { const r = radios()[i]; if (r) { r.checked = true; fire(r, "click", "change"); } }))));
        // ── 오라 (접기) ──
        const fold = mk("button", "r20ts-fold"); fold.type = "button";
        const auraBox = mk("div", "r20ts-aura");
        const setFold = () => { fold.textContent = (auraOpen ? "▾ " : "▸ ") + "오라"; fold.setAttribute("aria-expanded", String(auraOpen)); auraBox.hidden = !auraOpen; };
        fold.addEventListener("click", () => { auraOpen = !auraOpen; localStorage.setItem("r20_ts_aura", auraOpen ? "1" : "0"); setFold(); });
        for (const n of [1, 2]) {
            const o = Q(`aura${n}_options`), six = o?.options.length === 6;
            const idx = () => Q(`aura${n}_options`)?.selectedIndex ?? 0;
            const put = i => { const x = Q(`aura${n}_options`); if (x) { x.selectedIndex = i; fire(x, "change"); } };
            const r = text(`aura${n}_radius`, "r20ts-num"); r.setAttribute("aria-label", `오라 ${n} 반경`);
            auraBox.appendChild(row(lb(`오라 ${n}`), r, mk("span", "r20ts-unit", "ft"),
                six ? seg(["○", "□", "⬡"], () => idx() % 3, i => put(i + (idx() >= 3 ? 3 : 0)), "r20ts-shape") : segSelect(`aura${n}_options`, []),
                six ? seg(["채움", "테두리"], () => (idx() >= 3 ? 1 : 0), i => put(idx() % 3 + i * 3)) : mk("span"),
                color(`aura${n}_color`), mk("span", "r20ts-grow"), chip("보기", `showplayers_aura${n}`), chip("편집", `playersedit_aura${n}`)));
        }
        setFold();
        panel.appendChild(sec(fold, auraBox));
        // ── 툴팁: 150자가 넘는 부분은 빨갛게(트위터처럼), 숫자도 빨갛게 ──
        const tt = mk("div", "r20ts-tt"), bk = mk("div", "r20ts-bk"), ta = mk("textarea"), cnt = mk("span", "r20ts-cnt");
        ta.setAttribute("aria-label", "툴팁"); ta.rows = 2; ta.addEventListener("keydown", stop);
        const esc = s => s.replace(/[&<>]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[ch]);
        const paint = () => {
            const v = ta.value;
            bk.innerHTML = esc(v.slice(0, LIMIT)) + (v.length > LIMIT ? `<mark>${esc(v.slice(LIMIT))}</mark>` : "") + "\n";
            cnt.textContent = `${v.length}/${LIMIT}`; cnt.classList.toggle("over", v.length > LIMIT);
            ta.style.setProperty("height", "auto", "important");          // 글이 늘면 칸도 늘린다(뒤판과 줄이 어긋나지 않게 스크롤 없이)
            ta.style.setProperty("height", Math.max(44, ta.scrollHeight + 2) + "px", "important");
        };
        ta.addEventListener("input", () => { const o = Q("token-tooltip"); if (o) { o.value = ta.value; fire(o, "input", "change"); } paint(); });
        syncs.push(() => { const o = Q("token-tooltip"); if (o && document.activeElement !== ta) { ta.value = o.value; paint(); } });
        tt.append(bk, ta);
        const side = mk("div", "r20ts-side"); side.append(chip("표시", "show_tooltip"), chip("GM만", "gm_only_tooltip"), cnt);
        const ttRow = row(lb("툴팁"), tt, side); ttRow.classList.add("r20ts-top");
        panel.appendChild(sec(ttRow));
        pane.prepend(panel);
        moved.forEach(([e]) => e.classList.add("r20ts-moved"));
        pane.classList.add("r20ts-on");
        pane._r20ts = { panel, moved, sync };
        sync();
        return pane;
    };
    const undo = pane => {
        const s = pane._r20ts; if (!s) return;
        s.moved.slice().reverse().forEach(([e, p, n]) => { e.classList.remove("r20ts-moved"); if (p.isConnected) p.insertBefore(e, n?.parentNode === p ? n : null); });
        s.panel.remove(); pane.classList.remove("r20ts-on"); delete pane._r20ts;
    };
    const dialogs = () => [...document.querySelectorAll(".ui-dialog")].filter(d => d.getClientRects().length && isTS(d));
    let hooked = false;
    const inject = () => {
        if (!btnVisible.tokset) return;
        dialogs().forEach(d => { try { build(d); } catch (e) { console.warn("[토큰 설정] 정리 못 함:", e); } });
        // 같은 창을 다시 열면(다른 토큰) 원래 칸 값이 바뀌므로 다시 읽는다
        if (!hooked && window.jQuery) { hooked = true; window.jQuery(document).on("dialogopen", () => setTimeout(() => dialogs().forEach(d => paneOf(d)?._r20ts?.sync()), 50)); }
    };
    const setEnabled = on => {
        if (on) return inject();
        document.querySelectorAll(".r20ts-on").forEach(undo);
    };
    return { inject, setEnabled, watch: ".ui-dialog" };
})();
addCss(`
        /* 토큰 설정 창 정리 — 일괄 편집기와 같은 모양 */
        .r20ts-on > :not(.r20ts) { display:none !important; }
        .r20ts { display:flex; flex-direction:column; padding:0 2px 4px; color:var(--aio-ink-2); font-size:12px; text-align:left; }
        .r20ts .r20ts-sec { padding:8px 0; border-bottom:1px solid var(--aio-line-4); }
        .r20ts .r20ts-sec:last-child { border-bottom:0; }
        .r20ts .r20ts-st { margin:0 0 6px; color:var(--aio-ink-4); font-size:11px; font-weight:700; }
        .r20ts .r20ts-row { display:flex; align-items:center; gap:6px; min-height:30px; }
        .r20ts .r20ts-row + .r20ts-row, .r20ts .r20ts-bars + .r20ts-row { margin-top:6px; }
        .r20ts .r20ts-row.r20ts-top { align-items:flex-start; }
        .r20ts .r20ts-lb { flex:0 0 52px; margin:0; color:var(--aio-ink-3); font-size:11px; font-weight:700; }
        .r20ts .r20ts-grow { flex:1 1 auto; min-width:0; }
        .r20ts .r20ts-gap { width:10px; }
        .r20ts input[type=text], .r20ts select { height:28px !important; margin:0 !important; padding:0 8px !important; border:1px solid var(--aio-line) !important; border-radius:var(--aio-r-sm) !important; background:var(--aio-bg); color:var(--aio-ink-2); font-size:12px !important; box-shadow:none !important; box-sizing:border-box !important; }
        .r20ts select { padding:0 4px !important; min-width:0; }
        .r20ts .r20ts-num { width:46px !important; text-align:center; padding:0 4px !important; }
        .r20ts .r20ts-btn { height:28px; margin:0; padding:0 10px; border:1px solid var(--aio-line); border-radius:var(--aio-r-sm); background:var(--aio-bg); color:var(--aio-ink-2); font-size:12px; white-space:nowrap; cursor:pointer; }
        .r20ts .r20ts-btn:hover { background:var(--aio-bg-3); }
        .r20ts .r20ts-chip { height:26px; margin:0; padding:0 10px; border:1px solid var(--aio-line); border-radius:13px; background:var(--aio-bg); color:var(--aio-ink-3); font-size:11px; line-height:24px; white-space:nowrap; cursor:pointer; }
        .r20ts .r20ts-chip[aria-pressed=true] { background:var(--aio-accent); border-color:var(--aio-accent); color:#fff; }
        .r20ts .r20ts-seg { display:inline-flex; flex:0 0 auto; gap:2px; padding:2px; background:var(--aio-bg-4); border-radius:var(--aio-r-sm); }
        .r20ts .r20ts-seg button { height:22px; margin:0; padding:0 7px; border:0; border-radius:var(--aio-r-sm); background:transparent; color:var(--aio-ink-3); font-size:11px; line-height:22px; white-space:nowrap; cursor:pointer; }
        .r20ts .r20ts-seg button[aria-pressed=true] { background:var(--aio-bg); color:var(--aio-ink); font-weight:700; box-shadow:0 1px 2px rgba(0,0,0,0.12); }
        .r20ts .r20ts-shape button { width:28px; padding:0; font-size:13px; }
        .r20ts :is(.r20ts-chip, .r20ts-btn, .r20ts-seg button, .r20ts-fold):focus-visible { outline:2px solid var(--aio-accent); outline-offset:1px; }
        .r20ts .r20ts-bars { display:grid; grid-template-columns:12px auto minmax(80px, 1fr) auto auto; gap:4px 6px; align-items:center; }
        .r20ts .r20ts-gh { color:var(--aio-ink-5); font-size:10.5px; white-space:nowrap; }
        .r20ts .r20ts-dot { width:10px; height:10px; border-radius:50%; }
        .r20ts .r20ts-vm { display:flex; align-items:center; gap:3px; color:var(--aio-ink-4); }
        .r20ts .r20ts-pair { display:flex; gap:4px; }
        .r20ts .r20ts-range { flex:1 1 auto; min-width:60px; margin:0; accent-color:var(--aio-accent); }
        .r20ts .r20ts-pct { width:38px; text-align:right; color:var(--aio-ink-3); }
        .r20ts .r20ts-unit { color:var(--aio-ink-4); }
        .r20ts .r20ts-color { width:30px; height:28px; padding:0; border:1px solid var(--aio-line); border-radius:var(--aio-r-sm); background:var(--aio-bg); }
        .r20ts .sp-replacer.r20ts-moved { margin:0; }
        .r20ts .r20ts-fold { display:flex; align-items:center; width:100%; height:24px; margin:0; padding:0; border:0; background:none; color:var(--aio-ink-4); font-size:11px; font-weight:700; text-align:left; cursor:pointer; }
        .r20ts .r20ts-aura { margin-top:4px; }
        .r20ts .r20ts-aura[hidden] { display:none; }
        .r20ts .r20ts-side { display:flex; flex-direction:column; gap:4px; align-items:stretch; }
        .r20ts .r20ts-cnt { color:var(--aio-ink-5); font-size:10.5px; text-align:center; }
        .r20ts .r20ts-cnt.over { color:var(--aio-accent); font-weight:700; }
        /* 툴팁: 뒤판(.r20ts-bk)이 150자 넘는 부분에 빨간 바탕을 깔고, 글은 그 위 투명한 글칸에서 보인다 (글꼴 · 여백을 똑같이) */
        .r20ts .r20ts-tt { position:relative; flex:1 1 auto; min-width:0; }
        .r20ts .r20ts-tt .r20ts-bk, .r20ts .r20ts-tt textarea { font:12px/1.5 sans-serif !important; letter-spacing:0; padding:6px 8px !important; border:1px solid transparent !important; white-space:pre-wrap; overflow-wrap:break-word; word-break:normal; }
        .r20ts .r20ts-tt .r20ts-bk { position:absolute; inset:0; overflow:hidden; color:transparent; background:var(--aio-bg); border-radius:var(--aio-r-sm); pointer-events:none; }
        .r20ts .r20ts-tt .r20ts-bk mark { color:transparent; background:rgba(225,0,133,0.3); border-radius:2px; padding:0; }
        .r20ts .r20ts-tt textarea { position:relative; display:block; width:100% !important; min-height:44px; margin:0 !important; border-radius:var(--aio-r-sm); box-shadow:none !important; box-sizing:border-box !important; resize:none; overflow:hidden; background:transparent !important; border-color:var(--aio-line) !important; color:var(--aio-ink-2); }
        .r20ts .r20ts-tt textarea:focus { border-color:var(--aio-accent) !important; outline:none; }
`);
addFeature("sidePicker", sidePicker);
addFeature("tokenMenu", tokenMenu);
addFeature("tokenActs", tokenActs);
addFeature("deckView", deckView);
addFeature("screenUI", screenUI);
addFeature("pagePanel", pagePanel);
addFeature("macroBar", macroBar);
addFeature("tokenSet", tokenSet);
addBundle({ place: "main", order: 2, label: "토큰 · 클릭 메뉴 · 화면 간소화", sub: "토큰 메뉴(면 선택 · 면 순서 · 롤러블로 합치기 · 가운데 정렬) · 면 고르기 창 · 토큰 액션 클릭 메뉴 · 토큰 설정 창 · 덱 창 · 화면 제어 · 페이지 창 · 매크로 줄",
    members: [["tokmenu", "tokenMenu"], ["sidepick", "sidePicker"], ["tokact", "tokenActs"], ["deckview", "deckView"], ["screenui", "screenUI"], ["pageslim", "pagePanel"], ["macrobar", "macroBar"], ["tokset", "tokenSet"]] });

// ══════════ 묶음 4 · 이미지 · 매크로&저널 뷰어 ══════════

// @share-cut-start room — 이 방의 이미지 (배포판에서 뺌)
// ───────── 그림 라이브러리 · 이 방의 이미지: 페이지·캐릭터·핸드아웃·굴림표·덱에 쓰인 그림을 한곳에서 본다 ─────────
// 맵에 놓기는 Roll20 라이브러리 항목과 같은 모양(.draggableresult + data-fullsizeurl)으로 만들어 Roll20 드롭을 그대로 쓴다
// → 계정 라이브러리에는 아무것도 추가되지 않는다. (보는 동안 라이브러리 정리 영역은 숨겨 실수로 넣는 일도 막는다)
const roomImages = (() => {
    const KINDS = [["all", "전체"], ["page", "페이지"], ["char", "캐릭터"], ["handout", "핸드아웃"], ["table", "굴림표"], ["deck", "덱"]];
    const OWN = { table: 0, deck: 1, char: 2, handout: 3, page: 4 };
    const SEARCH_SVG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
    const esc = escAttr;
    const norm = s => String(s || "").replace(/\s+/g, "").toLowerCase();
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    // files.d20.io 그림은 …/thumb|med|max|original.확장자 로 크기만 다르다 → 크기 부분을 뺀 주소로 같은 그림을 묶는다
    const sized = sizedUrl;
    const keyOf = u => r20img(u).replace(/^https?:/i, "").replace(/[?#].*$/, "").replace(/\/(?:thumb|med|max|original)\.[a-z0-9]+$/i, "");

    let size = Math.max(48, Math.min(160, parseInt(localStorage.getItem("r20_ri_size"), 10) || 72));
    let mode = localStorage.getItem("r20_ri_mode");
    if (mode !== "room") mode = "lib";
    let src = "all", q = "", groups = [], items = new Map(), unread = 0, shown = 0;
    let loading = null, root = null, ro = null, wasVisible = false, dragBase = null;
    const opened = new Set();       // 펼친 묶음 이름 (기본은 모두 접힘, 검색 중엔 모두 펼침)

    // ── 모으기: 불러온 페이지의 토큰(여러 면 포함) · 캐릭터 아바타/기본 토큰 · 핸드아웃 · 굴림표 항목 · 덱 카드 ──
    const gather = () => {
        const C = window.Campaign, items = new Map();
        let groups = [], unread = 0;
        if (!C) return { items, groups, unread };
        const group = (kind, name, key) => { const g = { kind, name, key, list: [], has: new Set() }; groups.push(g); return g; };
        const add = (g, url, name, use) => {
            if (typeof url !== "string" || !/^(?:https?:)?\/\//i.test(url)) return;
            const k = keyOf(url);
            let it = items.get(k);
            if (!it) items.set(k, it = { k, url, name: "", img: "", uses: [] });
            if (!it.name && name) it.name = name;
            if (use.kind === "page" && !it.img) it.img = url;       // 토큰의 imgsrc 는 그대로 다시 쓸 수 있다
            if (!it.uses.some(u => u.kind === use.kind && u.id === use.id)) it.uses.push(use);
            if (!g.has.has(it)) { g.has.add(it); g.list.push(it); }
        };
        const pages = C.pages?.models || [], act = typeof C.activePage === "function" ? C.activePage() : null;
        [act, ...pages.filter(p => p !== act)].forEach(p => {
            if (!p) return;
            if (!p.thegraphics) { unread++; return; }
            const name = p.get("name") || "(이름 없는 페이지)";
            const g = group("page", (p === act ? "지금 페이지 · " : "페이지 · ") + name, "page:" + p.id), use = { kind: "page", id: p.id, label: "페이지 · " + name };
            p.thegraphics.models.forEach(m => {
                const nm = m.get("name") || "";
                add(g, m.get("imgsrc"), nm, use);
                String(m.get("sides") || "").split("|").forEach(s => { try { if (s) add(g, decodeURIComponent(s), nm, use); } catch (e) {} });
            });
        });
        const chars = group("char", "캐릭터", "char");
        (C.characters?.models || []).forEach(m => {
            const name = m.get("name") || "", use = { kind: "char", id: m.id, label: "캐릭터 · " + name };
            add(chars, m.get("avatar"), name, use);
            try { add(chars, JSON.parse(m.get("defaulttoken") || "null")?.imgsrc, name, use); } catch (e) {}
        });
        const hos = group("handout", "핸드아웃", "handout");
        (C.handouts?.models || []).forEach(m => {
            const name = m.get("name") || "";
            add(hos, m.get("avatar"), name, { kind: "handout", id: m.id, label: "핸드아웃 · " + name });
        });
        (C.rollabletables?.models || []).forEach(t => {
            const name = t.get("name") || "", g = group("table", "굴림표 · " + name, "table:" + t.id), use = { kind: "table", id: t.id, label: "굴림표 · " + name };
            (t.tableitems?.models || []).forEach(m => add(g, m.get("avatar"), m.get("name") || name, use));
        });
        (C.decks?.models || []).forEach(d => {
            const name = d.get("name") || "", g = group("deck", "덱 · " + name, "deck:" + d.id), use = { kind: "deck", id: d.id, label: "덱 · " + name };
            add(g, d.get("avatar"), name + " 뒷면", use);
            (d.cards?.models || []).forEach(m => { add(g, m.get("avatar"), m.get("name") || name, use); add(g, m.get("card_back"), name + " 뒷면", use); });
        });
        return { items, groups: groups.filter(g => g.list.length), unread };
    };
    const collect = () => { ({ items, groups, unread } = gather()); };
    // 같은 그림은 한 곳에만: 굴림표 → 덱 → 캐릭터 → 핸드아웃 → 페이지 순으로 먼저 나온 묶음이 주인
    // (굴림표 토큰을 여러 페이지에 복사해도 그림은 굴림표 묶음에만 보이고, 페이지 묶음엔 그 페이지에만 있는 그림이 남는다)
    const ownerMap = vis => {
        const owner = new Map();
        vis.slice().sort((a, b) => OWN[a.g.kind] - OWN[b.g.kind]).forEach(x => x.its.forEach(it => { if (!owner.has(it)) owner.set(it, x.g); }));
        return owner;
    };

    // ── 그리기 ──
    const tileHtml = it => {
        const tip = (it.name || "이름 없음") + "\n" + it.uses.map(u => u.label).join("\n");
        return `<li class="draggableresult library-item r20ri-tile" tabindex="0" role="button" data-k="${esc(it.k)}" data-fullsizeurl="${esc(r20img(sized(it.url, "max")))}" data-grid-width="${it.gw || "null"}" data-grid-height="${it.gh || "null"}" title="${esc(tip)}">`
            + `<div class="token">${previewHtml(it.url)}</div>`
            + `<div class="namecontainer">${esc(it.name)}</div>`
            + (it.uses.length > 1 ? `<span class="r20ri-cnt">×${it.uses.length}</span>` : "") + "</li>";
    };
    const foot = () => {
        if (!root) return;
        const note = root.querySelector(".r20ri-note"), nb = note.querySelector("button");
        root.querySelector(".r20ri-sum").textContent = `총 ${shown}장`;
        note.hidden = !unread && !loading;
        note.querySelector("span").textContent = loading ? `페이지 읽는 중 ${loading.done}/${loading.total}` : `아직 안 읽은 페이지 ${unread}개`;
        nb.textContent = loading ? "멈추기" : "모두 읽기";
        nb.dataset.a = "load";
    };
    const render = () => {
        if (!root) return;
        closePop();
        const v = norm(q), seen = new Set();
        const vis = groups.filter(g => src === "all" || g.kind === src).map(g => ({ g,
            its: v && !norm(g.name).includes(v) ? g.list.filter(it => norm(it.name + it.uses.map(u => u.label).join("")).includes(v)) : g.list }));
        const owner = ownerMap(vis);
        let html = "";
        vis.forEach(({ g, its }) => {
            its = its.filter(it => owner.get(it) === g);
            if (!its.length) return;
            its.forEach(it => seen.add(it));
            const open = !!v || opened.has(g.name);
            html += `<section><button type="button" class="r20ri-gh" data-g="${esc(g.name)}" aria-expanded="${open}"><span aria-hidden="true">${open ? "▾" : "▸"}</span>${esc(g.name)} <small>${its.length}장</small></button>`
                + (open ? `<ul class="r20ri-grid">${its.map(tileHtml).join("")}</ul>` : "") + "</section>";
        });
        root.querySelector(".r20ri-list").innerHTML = html || `<p class="r20ri-empty">${groups.length ? "찾는 그림이 없어요" : "그림이 없어요"}</p>`;
        shown = seen.size;
        foot();
    };
    const refresh = () => { collect(); render(); };

    // 안 읽은 페이지: Roll20 이 페이지 복제 때 쓰는 fullyLoadPage() 로 하나씩 불러온다 (누르면 멈춤)
    // 진행 상황은 일괄 편집기 방 이미지 탭에도 알린다 (fn(loading) — 끝나면 null)
    const hooks = new Set();
    const tell = () => hooks.forEach(fn => { try { fn(loading); } catch (e) {} });
    const loadPages = async () => {
        if (loading) { loading.stop = true; return; }
        const todo = (window.Campaign?.pages?.models || []).filter(p => !p.thegraphics && typeof p.fullyLoadPage === "function");
        if (!todo.length) return;
        loading = { done: 0, total: todo.length, stop: false };
        foot(); tell();
        for (const p of todo) {
            if (loading.stop) break;
            try { await Promise.race([p.fullyLoadPage(), sleep(15000)]); } catch (e) { console.warn("[이 방의 이미지] 페이지 읽기 실패:", p.get?.("name"), e); }
            loading.done++;
            if (loading.done % 5 === 0) refresh(); else foot();
            tell();
        }
        loading = null;
        refresh(); tell();
    };

    // ── 끌어 놓기: 처음 마우스를 올릴 때 jQuery UI draggable 을 단다 (그림이 많아도 가볍게) ──
    const initDrag = tile => {
        const $ = window.jQuery;
        if (!$?.fn?.draggable || tile.classList.contains("ui-draggable")) return;
        if (!dragBase) {
            // Roll20 라이브러리 항목의 start/stop(externaldrag 표시)을 그대로 빌려 쓴다
            const ref = [...document.querySelectorAll(".draggableresult.ui-draggable")].find(e => !e.classList.contains("r20ri-tile"));
            try { if (ref) dragBase = { ...$(ref).draggable("option") }; } catch (e) {}
        }
        $(tile).draggable({ ...(dragBase || {}), disabled: false, handle: false, cancel: "", helper: "clone", appendTo: "body",
            revert: true, revertDuration: 0, distance: 3, cursorAt: { left: 32, top: 32 }, scroll: false, zIndex: 100000 });
    };

    // ── 창의 글 편집칸(핸드아웃 내용·GM 메모, 캐릭터 소개 등)에 끌어 놓기: 놓은 자리에 <img> 를 넣는다 ──
    // Roll20 라이브러리 그림도 함께 받는다 (둘 다 .draggableresult + data-fullsizeurl)
    const insertImg = (box, url, ev, ui) => {
        ui.helper?.css("visibility", "hidden");     // 끌고 있는 그림이 커서 바로 밑에 있어 놓을 자리 찾기를 가린다
        const x = ev.clientX ?? ev.originalEvent?.clientX, y = ev.clientY ?? ev.originalEvent?.clientY;
        let r = x != null && document.caretRangeFromPoint ? document.caretRangeFromPoint(x, y) : null;
        if (!r || !box.contains(r.startContainer)) { r = document.createRange(); r.selectNodeContents(box); r.collapse(false); }
        box.focus();
        const sel = getSelection();
        sel.removeAllRanges(); sel.addRange(r);
        // 편집기가 바뀐 내용을 알아채도록 붙여넣기와 같은 길(insertHTML)로 넣는다
        if (!document.execCommand("insertHTML", false, `<img src="${esc(url)}">`)) {
            r.insertNode(Object.assign(document.createElement("img"), { src: url }));
            box.dispatchEvent(new Event("input", { bubbles: true }));
        }
    };
    const bindEditors = () => {
        const $ = window.jQuery;
        if (!$?.fn?.droppable) return;
        document.querySelectorAll('.ui-dialog [contenteditable="true"]:not(.r20ri-drop)').forEach(box => {
            box.classList.add("r20ri-drop");
            $(box).droppable({ accept: ".draggableresult", tolerance: "pointer", hoverClass: "r20ri-dropin",
                drop: (e, ui) => {
                    // 뒤에 있는 맵에 토큰으로도 놓이지 않게 Roll20 에 '처리됨' 표시
                    const oe = e.originalEvent;
                    if (oe) { oe.dropHandled = true; if (oe.originalEvent) oe.originalEvent.dropHandled = true; }
                    const u = ui.draggable.attr("data-fullsizeurl");
                    if (u) insertImg(box, u, e, ui);
                } });
        });
    };

    // ── 그림 메뉴 ──
    const say = (btn, msg) => {
        const old = btn.dataset.label || (btn.dataset.label = btn.textContent);
        btn.textContent = msg;
        setTimeout(() => { if (btn.isConnected) btn.textContent = old; }, 1400);
    };
    const ratioOf = u => new Promise(res => {
        const im = new Image();
        im.onload = () => res(im.naturalWidth && im.naturalHeight ? im.naturalWidth / im.naturalHeight : 1);
        im.onerror = () => res(1);
        im.src = u;
    });
    // 지금 페이지에 바로 놓기: 토큰 층은 가운데에 긴 변 2칸(140px), 맵 층은 페이지에 맞춰 가운데
    const place = async (it, layer, btn) => {
        const pg = typeof window.Campaign?.activePage === "function" ? window.Campaign.activePage() : null;
        if (!pg?.thegraphics) return say(btn, "지금 페이지를 못 찾았어요");
        const W = (parseFloat(pg.get("width")) || 25) * 70, H = (parseFloat(pg.get("height")) || 25) * 70;
        let w, h;
        const r = await ratioOf(r20img(sized(it.url, "thumb")));
        if (layer === "map") { if (W / H > r) { h = H; w = H * r; } else { w = W; h = W / r; } }
        else if (r >= 1) { w = 140; h = 140 / r; } else { h = 140; w = 140 * r; }
        try {
            pg.thegraphics.create({ imgsrc: it.img || r20img(sized(it.url, "max")), left: Math.round(W / 2), top: Math.round(H / 2),
                width: Math.round(w), height: Math.round(h), layer, page_id: pg.id });
            say(btn, "놓았어요");
        } catch (e) { console.warn("[이 방의 이미지] 놓기 실패:", e); say(btn, "놓지 못했어요"); }
    };
    const openJournal = u => {
        const m = (u.kind === "char" ? window.Campaign?.characters : window.Campaign?.handouts)?.get?.(u.id);
        if (typeof m?.view?.showDialog === "function") return m.view.showDialog();
        const li = document.querySelector(`li.journalitem[data-itemid="${CSS.escape(u.id)}"]`);
        if (li) { if (window.jQuery) window.jQuery(li).trigger("click"); else li.click(); }
    };
    // 핸드아웃으로 만들기: 그림을 핸드아웃 그림으로, 이름은 그림 이름 (GM 만 보기)
    const makeHandout = async (it, btn) => {
        const C = window.Campaign;
        if (typeof C?.handouts?.create !== "function") return say(btn, "핸드아웃을 만들 수 없어요");
        let m;
        try { m = C.handouts.create({ name: it.name || "그림", avatar: r20img(sized(it.url, "max")), inplayerjournals: "", archived: false }); }
        catch (e) { console.warn("[이 방의 이미지] 핸드아웃 만들기 실패:", e); return say(btn, "만들지 못했어요"); }
        if (!m?.id) return say(btn, "만들지 못했어요");
        say(btn, "만들었어요");
        // 저널 맨 위에 둔다 — Roll20 이 이미 넣었으면 그대로 (두 번 넣지 않게 잠깐 기다렸다 확인)
        await sleep(400);
        const raw = C.get?.("journalfolder") || "[]";
        if (!raw.includes(`"${m.id}"`)) {
            try { const tree = JSON.parse(raw); if (Array.isArray(tree)) { tree.unshift(m.id); C.save({ journalfolder: JSON.stringify(tree) }); } } catch (e) {}
        }
        await sleep(300);
        openJournal({ kind: "handout", id: m.id });
    };
    const closePop = () => {
        root?.querySelector(".r20ri-pop")?.remove();
        root?.querySelectorAll(".r20ri-tile.on").forEach(t => t.classList.remove("on"));
    };
    const openPop = (tile, kb) => {
        const it = items.get(tile.dataset.k);
        if (!it) return;
        closePop();
        const pop = document.createElement("div");
        pop.className = "r20ri-pop";
        pop.setAttribute("role", "dialog");
        pop.setAttribute("aria-label", "그림 메뉴");
        pop.innerHTML = `<div class="r20ri-ph">${previewHtml(it.url)}<div><strong>${esc(it.name || "이름 없음")}</strong><span>${it.uses.length}곳에서 씀</span></div>`
            + `<button type="button" class="r20ri-x" data-a="close" aria-label="닫기">✕</button></div>`
            + `<button type="button" class="r20ri-mi" data-a="objects">지금 페이지 가운데에 놓기 (토큰 층)</button>`
            + `<button type="button" class="r20ri-mi" data-a="map">지금 페이지에 맞춰 놓기 (맵 층)</button>`
            + `<button type="button" class="r20ri-mi" data-a="copy">이미지 주소 복사</button>`
            + `<button type="button" class="r20ri-mi" data-a="handout">핸드아웃으로 만들기</button>`
            + `<div class="r20ri-uses"><small>사용처</small>` + it.uses.map((u, i) => u.kind === "char" || u.kind === "handout"
                ? `<button type="button" data-a="open" data-i="${i}" title="열기">${esc(u.label)}</button>` : `<span>${esc(u.label)}</span>`).join("") + "</div>";
        pop._it = it;
        root.querySelector(".r20ri-body").appendChild(pop);
        tile.classList.add("on");
        if (kb) pop.querySelector(".r20ri-mi").focus();
    };
    const onPop = (pop, b) => {
        const it = pop._it, a = b.dataset.a;
        if (a === "close") closePop();
        else if (a === "objects" || a === "map") place(it, a, b);
        else if (a === "copy") copyText(r20img(sized(it.url, "max"))).then(ok => say(b, ok ? "복사했어요" : "복사하지 못했어요"));
        else if (a === "handout") makeHandout(it, b);
        else if (a === "open") openJournal(it.uses[+b.dataset.i]);
    };

    // ── 틀 ──
    const fit = () => {
        if (!root || mode === "lib" || !root.offsetParent) { if (root && mode === "lib") root.style.height = ""; return; }
        root.style.height = Math.max(240, window.innerHeight - root.getBoundingClientRect().top - 8) + "px";
    };
    const setMode = m => {
        mode = m;
        localStorage.setItem("r20_ri_mode", m);
        const dlg = root?.parentNode;
        dlg?.classList.toggle("r20ri-room", m !== "lib");
        if (root) root.dataset.m = m;
        root?.querySelectorAll(".r20ri-seg button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.m === m)));
        if (m !== "lib" && dlg) dlg.scrollTop = 0;
        if (m === "room") refresh();
        else closePop();
        fit();
    };
    const build = () => {
        const r = document.createElement("div");
        r.className = "r20ri";
        r.dataset.m = mode;
        r.style.setProperty("--ri-size", size + "px");
        r.innerHTML = `<div class="r20ri-seg" role="group" aria-label="그림 보기">`
            + `<button type="button" data-m="lib" aria-pressed="${mode === "lib"}">내 라이브러리</button>`
            + `<button type="button" data-m="room" aria-pressed="${mode === "room"}">이 방의 이미지</button></div>`
            + `<div class="r20ri-body">`
            + `<div class="r20ri-bar"><label class="r20ri-q">${SEARCH_SVG}<input type="search" placeholder="이름·사용처 검색" aria-label="이미지 검색"></label>`
            + `<span class="r20ri-zoom"><button type="button" data-d="-1" aria-label="작게">−</button><button type="button" data-d="1" aria-label="크게">+</button></span></div>`
            + `<div class="r20ri-chips">${KINDS.map(([k, l]) => `<button type="button" data-src="${k}" aria-pressed="${src === k}">${l}</button>`).join("")}</div>`
            + `<div class="r20ri-note" hidden><span></span><button type="button" data-a="load"></button></div>`
            + `<div class="r20ri-list"></div>`
            + `<div class="r20ri-foot"><span class="r20ri-sum" title="같은 그림은 하나로 셉니다 · 그림을 끌어서 맵에 놓기"></span>`
            + `<button type="button" data-only="room" data-a="openall">전부 펼치기</button><button type="button" data-only="room" data-a="closeall">전부 접기</button><button type="button" data-only="room" data-a="reload">다시 읽기</button></div></div>`;
        const input = r.querySelector(".r20ri-q input"), list = r.querySelector(".r20ri-list");
        let qt = null;
        input.addEventListener("input", () => { clearTimeout(qt); qt = setTimeout(() => { q = input.value; render(); }, 150); });
        r.addEventListener("keydown", e => {
            e.stopPropagation();                 // Roll20 단축키 막기
            if (e.key === "Escape") closePop();
            const t = e.target.closest?.(".r20ri-tile");
            if (t && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openPop(t, true); }
        });
        r.addEventListener("click", e => {
            const b = e.target.closest("button");
            const pop = e.target.closest(".r20ri-pop");
            if (pop) { if (b?.dataset.a) onPop(pop, b); return; }
            const t = e.target.closest(".r20ri-tile");
            if (t) return t.classList.contains("on") ? closePop() : openPop(t);
            if (!b) return closePop();
            if (b.dataset.g != null) {
                if (q) return;                                    // 검색 중엔 모두 펼쳐 둔다
                if (opened.has(b.dataset.g)) opened.delete(b.dataset.g); else opened.add(b.dataset.g);
                render();
            } else if (b.dataset.m) setMode(b.dataset.m);
            else if (b.dataset.src) {
                src = b.dataset.src;
                r.querySelectorAll(".r20ri-chips button").forEach(c => c.setAttribute("aria-pressed", String(c === b)));
                render();
            } else if (b.dataset.d) {
                size = Math.max(48, Math.min(160, size + Number(b.dataset.d) * 16));
                localStorage.setItem("r20_ri_size", size);
                r.style.setProperty("--ri-size", size + "px");
            } else if (b.dataset.a === "load") loadPages();
            else if (b.dataset.a === "reload") refresh();
            else if (b.dataset.a === "openall") { groups.forEach(g => opened.add(g.name)); render(); }
            else if (b.dataset.a === "closeall") { opened.clear(); render(); }
        });
        list.addEventListener("mouseover", e => { const t = e.target.closest(".r20ri-tile"); if (t) initDrag(t); });
        // 안 열리는 그림: 다른 크기·원래 주소로 → 그래도 안 되면 빈 칸 (error 는 버블링되지 않아 캡처로 받는다 · 메뉴 그림도 함께)
        r.addEventListener("error", e => {
            const m = e.target;
            if ((m.tagName === "IMG" || m.tagName === "VIDEO") && !nextPreview(m)) m.classList.add("r20ri-broken");
        }, true);
        return r;
    };
    // 탭이 보이게 될 때마다 새로 모은다 (다른 탭에서 토큰·카드를 바꿨을 수 있다)
    const onResize = () => {
        const vis = !!root?.offsetParent;
        if (vis && !wasVisible && mode === "room") refresh();
        wasVisible = vis;
        fit();
    };
    const inject = () => {
        if (!btnVisible.artroom) return;
        bindEditors();
        const dlg = document.getElementById("imagedialog");
        if (!dlg || root?.parentNode === dlg) return;
        root = build();
        dlg.prepend(root);
        dlg.classList.toggle("r20ri-room", mode !== "lib");
        ro?.disconnect();
        ro = new ResizeObserver(onResize);
        ro.observe(dlg);
        wasVisible = false;
        onResize();
    };
    const setEnabled = on => {
        if (on) return inject();
        ro?.disconnect(); ro = null;
        root?.parentNode?.classList.remove("r20ri-room");
        root?.remove(); root = null;
    };
    window.addEventListener("resize", fit);
    return { inject, setEnabled, gather, ownerMap, sized, loadPages, onPages: fn => hooks.add(fn), loadingNow: () => loading };
})();

// @share-cut-end room
// ───────── 매크로 선택 썸네일: ?{질문|이름,이미지주소|…} 의 Macro Options 창에 이미지 격자를 붙인다 ─────────
// 원래 드롭다운은 그대로 두고 같이 바꾼다 (Submit 때 Roll20 은 드롭다운 값을 읽는다)
const queryPicker = (() => {
    let size = Math.max(80, Math.min(260, parseInt(localStorage.getItem("r20_qp_size"), 10) || 140));
    // 값 → 그림 주소: 전체 주소이거나, imgur 그림 ID 만 고르는 꼴(https://imgur.com/?{…|이름,oTmvLxD|…}.png)
    // ID 판별: 5~8자 영문·숫자 섞임 — 'Attack' 같은 보통 낱말·숫자만은 뺀다
    const imgurId = v => /^[A-Za-z0-9]{5,8}$/.test(v) && /[A-Za-z]/.test(v) && !/^[A-Z]?[a-z]+$|^[A-Z]+$/.test(v);
    const imgOf = v => /^https?:\/\/\S+$/i.test(v) ? v : imgurId(v) ? `https://i.imgur.com/${v}.png` : "";
    const labelOf = o => o.textContent.trim();
    // '—————' 같은 항목은 묶음 구분선으로
    const isDivider = o => !imgOf(o.value) && /^[\s—–\-─━=_~·.]{3,}$/.test(o.textContent);
    // imgur 는 작은 썸네일(m: 320px)로 받아 수십 장도 가볍게
    const thumbOf = url => {
        const m = url.match(/^https?:\/\/(?:i\.)?imgur\.com\/([A-Za-z0-9]{5,10})(\.[A-Za-z]+)?$/);
        return m ? `https://i.imgur.com/${m[1]}m${m[2] || ".png"}` : r20img(url);
    };
    const choose = dlg => {
        const btns = [...dlg.querySelectorAll(".ui-dialog-buttonset button")];
        (btns.find(b => /submit/i.test(b.textContent)) || btns[0])?.click();
    };
    const mark = (dlg, sel) => dlg.querySelectorAll(".r20qp-tile").forEach(b => {
        const on = +b.dataset.i === sel.selectedIndex;
        b.classList.toggle("on", on);
        b.setAttribute("aria-pressed", String(on));
    });

    const textPic = o => {
        const sp = document.createElement("span");
        sp.className = "r20qp-img";
        sp.textContent = labelOf(o);
        return sp;
    };
    const tile = (o, i) => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "r20qp-tile"; b.dataset.i = i; b.title = labelOf(o);
        let pic;
        const url = imgOf(o.value);
        if (url) {
            pic = document.createElement("img");
            pic.className = "r20qp-img";
            pic.alt = ""; pic.loading = "lazy"; pic.draggable = false;
            const thumb = thumbOf(url);
            let retried = thumb === url;
            // 썸네일이 안 되면 원본으로 한 번 더, 그래도 안 되면 이름 칸으로
            pic.addEventListener("error", () => { if (!retried) { retried = true; pic.src = url; } else pic.replaceWith(textPic(o)); });
            pic.src = thumb;
        } else pic = textPic(o);
        const lb = document.createElement("span");
        lb.className = "r20qp-lb"; lb.textContent = labelOf(o);
        b.append(pic, lb);
        return b;
    };

    const enhance = (dlg, sel) => {
        dlg.classList.add("r20qp");
        dlg._r20qpSel = sel;
        dlg.style.setProperty("--qp-size", size + "px");
        const box = document.createElement("div");
        box.className = "r20qp-box";
        box.innerHTML = '<div class="r20qp-bar"><input type="search" placeholder="이름으로 찾기" aria-label="이름으로 찾기">'
            + '<span class="r20qp-zoom"><button type="button" data-d="-1" aria-label="썸네일 작게">−</button><button type="button" data-d="1" aria-label="썸네일 크게">+</button></span></div>'
            + '<div class="r20qp-grid"></div>';
        const grid = box.querySelector(".r20qp-grid"), q = box.querySelector("input");
        let sec = null;
        const newSec = () => { sec = document.createElement("div"); sec.className = "r20qp-sec"; grid.appendChild(sec); };
        newSec();
        [...sel.options].forEach((o, i) => {
            if (isDivider(o)) { if (sec.childElementCount) newSec(); return; }
            sec.appendChild(tile(o, i));
        });
        if (!sec.childElementCount) sec.remove();
        (dlg.querySelector(".ui-dialog-content") || dlg).appendChild(box);

        grid.addEventListener("click", e => {
            const b = e.target.closest(".r20qp-tile");
            if (!b) return;
            sel.selectedIndex = +b.dataset.i;
            sel.dispatchEvent(new Event("change", { bubbles: true }));
        });
        grid.addEventListener("dblclick", e => { if (e.target.closest(".r20qp-tile")) choose(dlg); });
        sel.addEventListener("change", () => mark(dlg, sel));
        q.addEventListener("keydown", e => e.stopPropagation());       // Roll20 단축키·Enter 제출 막기
        q.addEventListener("input", () => {
            const v = q.value.replace(/\s+/g, "").toLowerCase();
            grid.querySelectorAll(".r20qp-tile").forEach(b => { b.hidden = !!v && !b.title.replace(/\s+/g, "").toLowerCase().includes(v); });
            grid.querySelectorAll(".r20qp-sec").forEach(s => { s.hidden = ![...s.children].some(b => !b.hidden); });
            grid.classList.toggle("searching", !!v);
        });
        box.querySelectorAll(".r20qp-zoom button").forEach(b => b.addEventListener("click", () => {
            size = Math.max(80, Math.min(260, size + Number(b.dataset.d) * 30));
            localStorage.setItem("r20_qp_size", size);
            dlg.style.setProperty("--qp-size", size + "px");
        }));
        mark(dlg, sel);
        // 창을 키워서 화면 가운데로
        const w = Math.min(720, window.innerWidth - 40);
        dlg.style.width = w + "px";
        dlg.style.left = Math.max(10, (window.innerWidth - w) / 2) + "px";
        dlg.style.top = Math.max(10, (window.innerHeight - dlg.offsetHeight) / 2) + "px";
        grid.querySelector(".r20qp-tile.on")?.scrollIntoView({ block: "nearest" });
    };

    const inject = () => {
        if (!btnVisible.qpick) return;
        document.querySelectorAll(".ui-dialog").forEach(dlg => {
            if (!dlg.classList.contains("vtt-macro-selection-ui-dialog")
                && dlg.querySelector(".ui-dialog-title")?.textContent.trim() !== "Macro Options") return;
            const sel = dlg.querySelector(".ui-dialog-content select");
            if (!sel || dlg._r20qpSel === sel || dlg._r20qpNo === sel) return;
            // 이미지 고르기가 아닌 질문은 그대로: 그림 항목이 2개 이상이고 (구분선 빼고) 절반 이상일 때만
            const opts = [...sel.options].filter(o => !isDivider(o)), imgs = opts.filter(o => imgOf(o.value)).length;
            if (imgs < 2 || imgs * 2 < opts.length) { dlg._r20qpNo = sel; return; }
            dlg.querySelector(".r20qp-box")?.remove();      // Roll20 이 창을 다른 질문에 다시 쓴 경우
            enhance(dlg, sel);
        });
    };
    return { inject, watch: ".ui-dialog" };
})();

// ───────── 빠른 저널: 말하는 사람 줄 ⚙ 왼쪽 단추 → 캐릭터 아이콘 격자에서 골라 말하는 사람 바꾸기 (끌어서 순서 바꾸기) ─────────
const quickJournal = (() => {
    const inject = () => {
        const gear = document.getElementById("custom-settings-btn");
        if (!btnVisible.journal || !gear || document.getElementById("custom-journal-toggle")) return;
        const speakingAsSelect = document.getElementById("speakingas");
        let charList = [];
        const journalBtn = document.createElement("button");
        journalBtn.id = "custom-journal-toggle";
        journalBtn.type = "button";
        journalBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/></svg>';
        journalBtn.title = "빠른 저널";
        journalBtn.setAttribute("aria-label", "빠른 저널");
        journalBtn.style.cssText = "width: 28px; min-width: 28px; border: none; border-left: 1px solid #ccc; padding: 0; display: flex; align-items: center; justify-content: center; flex-shrink: 0; cursor: pointer;"
            + `background-color: ${CONFIG.inactiveBg} !important; color: ${CONFIG.inactiveText} !important; border-color: ${CONFIG.inactiveBorder} !important;`;

        const popup = document.createElement("div");
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
        // 아이콘 크기 −/+ (기억해 둔다)
        let cjSize = parseInt(localStorage.getItem("r20_cj_size"), 10) || 50;
        const applyCjSize = () => { popup.style.setProperty("--cj-size", cjSize + "px"); localStorage.setItem("r20_cj_size", cjSize); };
        const zoom = document.createElement("span");
        zoom.className = "cj-zoom";
        [["−", -10, "아이콘 작게"], ["+", 10, "아이콘 크게"]].forEach(([label, d, title]) => {
            const b = document.createElement("button");
            b.type = "button";
            b.textContent = label;
            b.title = title;
            b.setAttribute("aria-label", title);
            b.onclick = (e) => { e.stopPropagation(); cjSize = Math.max(30, Math.min(120, cjSize + d)); applyCjSize(); };
            zoom.appendChild(b);
        });
        applyCjSize();
        header.appendChild(titleSpan);
        header.appendChild(zoom);
        header.appendChild(closeBtn);
        popup.appendChild(header);

        header.addEventListener("mousedown", (e) => {
            if (e.target.closest(".cj-close-btn, .cj-zoom")) return;
            e.preventDefault();
            const r = popup.getBoundingClientRect();
            popup.style.left = zpx(r.left); popup.style.top = zpx(r.top);
            popup.style.right = "auto"; popup.style.bottom = "auto";
            const sx = e.clientX, sy = e.clientY;
            const onMove = (e) => {
                popup.style.left = zpx(r.left + e.clientX - sx);
                popup.style.top  = zpx(r.top  + e.clientY - sy);
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
                // 단추가 대화 판 안(⚙ 옆)에 있으니 판 왼쪽 바깥에 연다
                const sideL = document.getElementById("rightsidebar")?.getBoundingClientRect().left;
                popup.style.right  = zpx(window.innerWidth - (sideL > 0 ? sideL - 8 : rect.left - 210));
                popup.style.bottom = zpx(window.innerHeight - rect.top + 8);
                popup.style.left   = "auto"; popup.style.top = "auto";
            }
            const savedW = localStorage.getItem("r20_popup_w");
            const savedH = localStorage.getItem("r20_popup_h");
            if (savedW) popup.style.width = savedW;
            if (savedH) popup.style.height = savedH;
            popup.classList.add("show");
            aioZoom.fit(popup);
            // 캐릭터가 많아도 팝업이 화면 밖으로 넘치지 않게 (목록은 안에서 스크롤)
            popup.style.maxHeight = "";
            const pr = popup.getBoundingClientRect();
            const room = popup.style.top && popup.style.top !== "auto" ? window.innerHeight - pr.top : pr.bottom;
            popup.style.maxHeight = zpx(Math.max(160, room - 8));
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
                popup.style.width  = Math.max(150, startW + (ev.clientX - startX) / aioZoom.get()) + "px";
                popup.style.height = Math.max(120, startH + (ev.clientY - startY) / aioZoom.get()) + "px";
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
        // 말하는 사람 줄: [저널] [캡처 단추들] [⚙]
        (document.getElementById("custom-capture-copy") || gear).before(journalBtn);
    };
    const setEnabled = on => {
        if (on) return inject();
        document.getElementById("custom-journal-toggle")?.remove();
        document.getElementById("custom-journal-popup")?.remove();
    };
    // Esc 로 닫기 (다른 창들과 같게) — 닫기 단추를 대신 누른다. 검색칸이 키를 막으므로 잡는 단계(capture)에서
    document.addEventListener("keydown", e => {
        if (e.key !== "Escape") return;
        const p = document.getElementById("custom-journal-popup");
        if (p?.classList.contains("show")) p.querySelector(".cj-close-btn")?.click();
    }, true);
    return { inject, setEnabled };
})();

addCss(`
        #custom-journal-popup { position:fixed; width:190px; background:var(--aio-bg); border:1px solid var(--aio-line); border-radius:var(--aio-r-sm); box-shadow:0 4px 12px rgba(0,0,0,0.18); z-index:10002; display:none; flex-direction:column; overflow:hidden; font-family:sans-serif; color:var(--aio-ink-2); }
        /* Roll20(Bootstrap)의 .show { display:block !important } 보다 앞서도록 !important */
        #custom-journal-popup.show { display:flex !important; }
        .cj-header { display:flex; align-items:center; justify-content:space-between; padding:4px 8px; background:var(--aio-bg-3); border-bottom:1px solid var(--aio-line-2); font-size:11px; font-weight:bold; color:var(--aio-ink-3); flex-shrink:0; cursor:move; user-select:none; }
        .cj-close-btn { background:none; border:none; cursor:pointer; font-size:13px; color:var(--aio-ink-5); padding:0 2px; line-height:1; }
        .cj-close-btn:hover { color:var(--aio-ink-2); }
        .cj-close-btn:focus-visible, .cj-zoom button:focus-visible { outline:2px solid var(--aio-accent); outline-offset:1px; }
        .cj-search-input:focus { border-color:var(--aio-accent); }
        .cj-zoom { display:flex; gap:2px; margin-left:auto; margin-right:6px; }
        .cj-zoom button { width:20px; height:18px; padding:0; border:1px solid var(--aio-line-2); border-radius:var(--aio-r-sm); background:var(--aio-bg); color:var(--aio-ink-3); font-size:12px; line-height:1; cursor:pointer; }
        .cj-zoom button:hover { background:var(--aio-bg-4); color:var(--aio-ink-2); }
        .cj-item.cj-drag-over-left { box-shadow:inset 3px 0 0 var(--aio-accent) !important; }
        .cj-item.cj-drag-over-right { box-shadow:inset -3px 0 0 var(--aio-accent) !important; }
        .cj-search-container { padding:5px 6px; border-bottom:1px solid var(--aio-line-4); background:var(--aio-bg-2); flex-shrink:0; }
        .cj-search-input { width:100%; box-sizing:border-box; padding:4px 6px; border:1px solid var(--aio-line); border-radius:var(--aio-r-sm); outline:none; font-size:12px; }
        /* 아이콘 격자: 이름은 마우스를 올리면 툴팁으로 */
        .cj-list-container { overflow-y:auto; flex:1; min-height:0; display:grid; grid-template-columns:repeat(auto-fill, minmax(calc(var(--cj-size, 50px) + 4px), 1fr)); gap:4px; padding:6px; align-content:start; }
        .cj-resize-handle { height:8px; cursor:se-resize; background:linear-gradient(135deg, transparent 40%, var(--aio-bg-5) 40%, var(--aio-bg-5) 50%, transparent 50%, transparent 60%, var(--aio-bg-5) 60%, var(--aio-bg-5) 70%, transparent 70%); background-size:8px 8px; background-position:bottom right; background-repeat:no-repeat; flex-shrink:0; }
        .cj-item { display:flex; align-items:center; justify-content:center; aspect-ratio:1; padding:2px; border-radius:var(--aio-r-lg); cursor:pointer; transition:background-color 0.1s ease; user-select:none; }
        .cj-item:hover { background-color:var(--aio-accent-bg); }
        .cj-item.cj-selected { background-color:var(--aio-accent-soft); box-shadow:inset 0 0 0 2px var(--aio-accent); }
        .cj-avatar { width:var(--cj-size, 50px); height:var(--cj-size, 50px); min-width:var(--cj-size, 50px); border-radius:var(--aio-r-lg); object-fit:cover; background-color:var(--aio-bg-3); pointer-events:none; }
        .cj-avatar.cj-initial { display:flex; justify-content:center; align-items:center; font-size:calc(var(--cj-size, 50px) * 0.32); font-weight:700; color:var(--aio-ink-4); }
        .ui-dialog.r20qp .r20qp-bar { display:flex; align-items:center; gap:6px; margin:6px 0 8px; }
        .ui-dialog.r20qp .r20qp-bar input { flex:1; min-width:0; height:28px !important; margin:0 !important; padding:0 8px !important; border:1px solid var(--aio-line); border-radius:var(--aio-r-sm); font-size:12px !important; box-sizing:border-box; }
        .ui-dialog.r20qp .r20qp-zoom { display:flex; gap:2px; }
        .ui-dialog.r20qp .r20qp-zoom button { width:26px; height:26px; margin:0; padding:0; border:1px solid var(--aio-line); border-radius:var(--aio-r-sm); background:var(--aio-bg); color:var(--aio-ink-3); font-size:14px; line-height:1; cursor:pointer; }
        .ui-dialog.r20qp .r20qp-zoom button:hover { background:var(--aio-bg-3); color:var(--aio-ink); }
        .ui-dialog.r20qp .r20qp-grid { max-height:min(55vh, 480px); overflow-y:auto; padding:2px; }
        .ui-dialog.r20qp .r20qp-sec { display:grid; grid-template-columns:repeat(auto-fill, minmax(var(--qp-size, 140px), 1fr)); gap:4px; }
        .ui-dialog.r20qp .r20qp-sec + .r20qp-sec { margin-top:8px; padding-top:8px; border-top:1px solid var(--aio-line-2); }
        .ui-dialog.r20qp .r20qp-grid.searching .r20qp-sec + .r20qp-sec { margin-top:4px; padding-top:0; border-top:0; }
        .ui-dialog.r20qp .r20qp-tile { display:flex; flex-direction:column; gap:4px; min-width:0; height:auto; margin:0; padding:4px; border:0; border-radius:var(--aio-r); background:transparent; box-shadow:none; color:var(--aio-ink); text-align:left; cursor:pointer; }
        .ui-dialog.r20qp .r20qp-tile:hover { background:var(--aio-accent-bg); }
        .ui-dialog.r20qp .r20qp-tile.on { background:var(--aio-accent-bg); box-shadow:inset 0 0 0 2px var(--aio-accent); }
        .ui-dialog.r20qp .r20qp-tile[hidden], .ui-dialog.r20qp .r20qp-sec[hidden] { display:none !important; }
        .ui-dialog.r20qp .r20qp-img { display:flex; align-items:center; justify-content:center; width:100%; aspect-ratio:16/9; padding:4px; border-radius:var(--aio-r-sm); background:var(--aio-bg-3); color:var(--aio-ink-3); font-size:11px; text-align:center; overflow:hidden; box-sizing:border-box; object-fit:contain; pointer-events:none; }
        .ui-dialog.r20qp .ui-dialog-content > p { display:flex; align-items:center; gap:6px; margin:0 0 2px !important; font-size:12px !important; color:var(--aio-ink-3); }
        .ui-dialog.r20qp .ui-dialog-content > p select { width:auto !important; max-width:220px; height:24px !important; margin:0 !important; padding:0 4px !important; border:1px solid var(--aio-line-2) !important; border-radius:var(--aio-r-sm) !important; background:var(--aio-bg) !important; box-shadow:none !important; color:var(--aio-ink-3) !important; font-size:11px !important; }
        .ui-dialog.r20qp img.r20qp-img { padding:0; }
        .ui-dialog.r20qp .r20qp-lb { font-size:11px; line-height:1.3; white-space:nowrap; overflow:hidden; text-overflow:clip; }
        /* @share-cut-start css-room — 이 방의 이미지 (배포판에서 뺌) */
        #imagedialog .r20ri { display:flex; flex-direction:column; color:var(--aio-ink-2); font-size:12px; }
        #imagedialog .r20ri button { margin:0; font:inherit; line-height:1; text-shadow:none; background-image:none; box-shadow:none; cursor:pointer; }
        #imagedialog .r20ri-seg { display:flex; flex-shrink:0; gap:2px; margin:4px 0 6px; padding:2px; border-radius:var(--aio-r); background:var(--aio-bg-3); }
        #imagedialog .r20ri-seg button { flex:1; height:26px; padding:0; border:0; border-radius:var(--aio-r-sm); background:transparent; font-size:12px; color:var(--aio-ink-3); }
        #imagedialog .r20ri-seg button[aria-pressed="true"] { background:var(--aio-bg); color:var(--aio-ink); font-weight:700; box-shadow:0 1px 2px rgba(0,0,0,0.12); }
        #imagedialog .r20ri-body { display:none; }
        #imagedialog.r20ri-room { overflow:hidden !important; }
        #imagedialog.r20ri-room > :not(.r20ri) { display:none !important; }
        #imagedialog.r20ri-room .r20ri-body { position:relative; display:flex; flex-direction:column; flex:1; min-height:0; }
        #imagedialog .r20ri-bar { display:flex; align-items:center; gap:6px; margin-bottom:6px; }
        #imagedialog .r20ri-q { flex:1; display:flex; align-items:center; gap:6px; height:28px; margin:0; padding:0 8px; border-radius:var(--aio-r); background:var(--aio-bg-3); min-width:0; }
        #imagedialog .r20ri-q input { flex:1; min-width:0; width:auto; height:26px; margin:0; padding:0; border:0 !important; background:transparent; box-shadow:none !important; font-size:12px; outline:none; }
        #imagedialog .r20ri-zoom { display:flex; gap:2px; }
        #imagedialog .r20ri-zoom button { width:24px; height:24px; padding:0; border:1px solid var(--aio-line-2); border-radius:var(--aio-r-sm); background:var(--aio-bg); color:var(--aio-ink-3); font-size:13px; }
        #imagedialog .r20ri-chips { display:flex; flex-wrap:wrap; gap:4px; margin-bottom:6px; }
        #imagedialog .r20ri-chips button, #imagedialog .r20ri-foot button, #imagedialog .r20ri-note button { height:24px; padding:0 9px; border:1px solid var(--aio-line-2); border-radius:12px; background:var(--aio-bg); font-size:11px; color:var(--aio-ink-3); white-space:nowrap; }
        #imagedialog .r20ri-chips button[aria-pressed="true"] { background:var(--aio-accent); border-color:var(--aio-accent); color:#fff; font-weight:700; }
        #imagedialog .r20ri-note { display:flex; align-items:center; gap:6px; margin-bottom:6px; padding:5px 8px; border-radius:var(--aio-r); background:var(--aio-accent-bg); color:var(--aio-accent-dark); font-size:11px; }
        #imagedialog .r20ri-note[hidden] { display:none; }
        #imagedialog .r20ri-note span { flex:1; overflow-wrap:anywhere; }
        #imagedialog .r20ri-list { flex:1; min-height:0; overflow-y:auto; overscroll-behavior:contain; }
        #imagedialog button.r20ri-gh { display:flex; align-items:center; gap:6px; width:100%; height:auto; padding:7px 2px 5px; border:0; background:none; font-size:11px; font-weight:700; color:var(--aio-ink-3); text-align:left; }
        #imagedialog button.r20ri-gh:hover { color:var(--aio-ink); }
        #imagedialog .r20ri-gh > span { width:10px; flex-shrink:0; color:var(--aio-ink-5); font-size:10px; }
        #imagedialog .r20ri-gh small { font-weight:400; color:var(--aio-ink-4); display:inline !important; position:static !important; top:auto !important; }
        #imagedialog .r20ri-gh::after { content:""; flex:1; height:1px; background:var(--aio-bg-3); }
        #imagedialog .r20ri-empty { margin:20px 0; color:var(--aio-ink-4); text-align:center; }
        #imagedialog ul.r20ri-grid { display:grid !important; grid-template-columns:repeat(auto-fill, minmax(var(--ri-size, 72px), 1fr)); gap:6px; margin:0 !important; padding:0 2px 2px !important; list-style:none; }
        li.r20ri-tile { position:relative; float:none !important; display:block !important; width:auto !important; height:auto !important; aspect-ratio:1; margin:0 !important; padding:0 !important; border:0 !important; border-radius:var(--aio-r); overflow:hidden; background:var(--aio-bg-3) !important; box-shadow:inset 0 0 0 1px rgba(0,0,0,0.06); list-style:none; cursor:grab; }
        li.r20ri-tile:hover { box-shadow:0 0 0 2px var(--aio-accent-mid); }
        li.r20ri-tile.on { box-shadow:0 0 0 2px var(--aio-accent); }
        li.r20ri-tile:focus-visible { outline:2px solid var(--aio-accent); outline-offset:1px; }
        li.r20ri-tile .token { position:absolute !important; inset:0; float:none !important; width:auto !important; height:auto !important; margin:0 !important; padding:0 !important; border:0 !important; background:none !important; }
        li.r20ri-tile .token img, li.r20ri-tile .token video { display:block; width:100% !important; height:100% !important; max-width:none !important; margin:0 !important; object-fit:contain; }
        .r20ri-broken { visibility:hidden; }
        li.r20ri-tile .namecontainer { display:none !important; }
        li.r20ri-tile .r20ri-cnt { position:absolute; right:4px; bottom:4px; padding:0 5px; border-radius:var(--aio-r); background:rgba(0,0,0,0.55); color:#fff; font-size:9px; font-weight:700; line-height:14px; }
        li.r20ri-tile.ui-draggable-dragging { width:64px !important; height:64px !important; z-index:100000 !important; box-shadow:0 4px 12px rgba(0,0,0,0.3); opacity:0.9; cursor:grabbing; }
        li.r20ri-tile.ui-draggable-dragging .r20ri-cnt { display:none; }
        .r20ri-drop.r20ri-dropin { outline:2px dashed var(--aio-accent) !important; outline-offset:-2px; }
        #imagedialog .r20ri-pop { position:absolute; left:0; right:0; bottom:40px; z-index:5; max-height:70%; overflow-y:auto; padding:6px 0; border:1px solid var(--aio-line-3); border-radius:var(--aio-r-lg); background:var(--aio-bg); box-shadow:0 6px 18px rgba(0,0,0,0.15); }
        #imagedialog .r20ri-ph { display:flex; align-items:center; gap:8px; padding:2px 6px 8px 10px; border-bottom:1px solid var(--aio-line-4); }
        #imagedialog .r20ri-ph img, #imagedialog .r20ri-ph video { flex-shrink:0; width:44px; height:44px; border-radius:var(--aio-r); background:var(--aio-bg-3); object-fit:contain; }
        #imagedialog .r20ri-ph div { flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; font-size:11px; color:var(--aio-ink-3); }
        #imagedialog .r20ri-ph strong { overflow:hidden; font-size:12px; color:var(--aio-ink); white-space:nowrap; text-overflow:clip; }
        #imagedialog .r20ri-ph .r20ri-x { width:24px; height:24px; padding:0; border:0; border-radius:var(--aio-r-sm); background:transparent; color:var(--aio-ink-4); }
        #imagedialog .r20ri-mi { display:block; width:100%; height:28px; padding:0 10px; border:0; background:transparent; font-size:12px; color:var(--aio-ink-2); text-align:left; }
        #imagedialog .r20ri-mi:hover, #imagedialog .r20ri-ph .r20ri-x:hover { background:var(--aio-bg-3); }
        #imagedialog .r20ri-uses { display:flex; flex-direction:column; align-items:flex-start; gap:3px; margin-top:4px; padding:6px 10px 2px; border-top:1px solid var(--aio-line-4); font-size:11px; color:var(--aio-ink-3); }
        #imagedialog .r20ri-uses > small { color:var(--aio-ink-4); }
        #imagedialog .r20ri-uses button { height:auto; padding:0; border:0; background:none; color:var(--aio-accent); font-size:11px; text-align:left; }
        #imagedialog .r20ri-uses button:hover { text-decoration:underline; }
        #imagedialog .r20ri-foot { display:flex; flex-shrink:0; align-items:center; gap:6px; height:34px; border-top:1px solid var(--aio-line-4); font-size:11px; color:var(--aio-ink-3); }
        #imagedialog .r20ri-foot button { padding:0 7px; }
        #imagedialog .r20ri-sum { flex:1; min-width:0; overflow:hidden; white-space:nowrap; text-overflow:clip; }
        /* 위쪽 '오디오 관리' 옆: 일괄 편집 단추와 같은 모양 */
        /* @share-cut-end css-room */
`);
addFeature("roomImages", roomImages);    // @share-cut-line
addFeature("queryPicker", queryPicker);
addFeature("quickJournal", quickJournal);
addBundle({ place: "main", order: 3, label: "이미지 · 매크로&저널 뷰어", sub: "이 방의 이미지 전체 보기 · 매크로 선택 썸네일 · 빠른 저널 뷰어",
    members: [["artroom", "roomImages"], ["qpick", "queryPicker"], ["journal", "quickJournal"]] });

// ══════════ 묶음 5 · 저널 · BGM · 매크로 일괄 편집기 ══════════

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
        rtable:  SVG('<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="15.5" cy="15.5" r="1.2"/>', ' style="color:#8a6d2b"'),
        down:    SVG('<path d="m6 9 6 6 6-6"/>'),
        right:   SVG('<path d="m9 6 6 6-6 6"/>'),
        check:   SVG('<path d="m5 12 5 5 9-10"/>', ' style="stroke-width:3.2"'),
        plus:    SVG('<path d="M12 5v14M5 12h14"/>'),
        x:       SVG('<path d="M18 6 6 18M6 6l12 12"/>'),
        pen:     SVG('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
        phones:  SVG('<path d="M3 14v-2a9 9 0 0 1 18 0v2"/><path d="M21 15a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2zM3 15a2 2 0 0 0 2 2h1v-6H5a2 2 0 0 0-2 2z"/>'),
        list:    SVG('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
        macro:   SVG('<path d="m7 8-4 4 4 4M17 8l4 4-4 4M14 4l-4 16"/>', ' style="color:#be185d"'),
        deck:    SVG('<rect x="4" y="3" width="12" height="16" rx="2"/><path d="M8 21h10a2 2 0 0 0 2-2V7"/>', ' style="color:#7c3a7c"'),
        grid:    SVG('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>')
    };
    const KIND_NAME = { folder: "폴더", group: "플레이리스트", handout: "핸드아웃", char: "캐릭터", track: "트랙", rtable: "굴림표", macro: "매크로", deck: "덱" };
    const CONTENT = ["notes", "gm"];
    // 편집칸 [내용, GM 노트] → Roll20 blob 이름
    const BLOBS = { handout: ["notes", "gmnotes"], char: ["bio", "gmnotes"] };
    // p · br · div · span 외의 태그가 있으면 서식 있는 내용으로 본다
    const RICH_RE = /<(?!\/?(?:p|br|div|span)\b)[a-z]/i;
    // 서식 편집: Roll20 핸드아웃 편집기와 같은 Summernote (Roll20 이 이미 불러 둔 jQuery 플러그인을 빌려 쓴다)
    const hasNote = () => typeof window.jQuery?.fn?.summernote === "function";
    // 편집 방식 rich(서식) · text(글자) · html — 마지막에 고른 방식으로 연다. rich · html 은 n.cur 에 HTML 을 둔다
    const docMode = () => { const m = localStorage.getItem("r20be_doc_mode") || "rich"; return m === "rich" && !hasNote() ? "text" : m; };
    const initMode = (n, k) => { n.mode[k] = docMode(); n.htmlMode[k] = n.mode[k] !== "text"; };
    const ATELIER = "https://atelier.zyuna.link/?type=handout";
    const NOTE_TOOLBAR = [["style", ["style"]], ["font", ["bold", "italic", "underline", "strikethrough", "clear"]], ["fontname", ["fontname", "fontsize"]],
        ["color", ["color"]], ["para", ["ul", "ol", "paragraph"]], ["insert", ["table", "picture", "link", "hr"]], ["history", ["undo", "redo"]]];
    const HINT = "더블클릭: 이름 바꾸기 · 체크(Shift: 범위)로 여러 개 한꺼번에 · 끌어서 폴더 이동 · Ctrl+S: 저장";
    const HINT_IMG = "그림을 눌러 고르기 (Shift: 범위) · 고른 그림을 덱 카드 · 굴림표 항목으로 넣거나 주소를 따서 매크로에 쓰기 · 같은 그림은 한 번만";
    const HINT_ICON = "아이콘을 누르면 오른쪽에서 편집 · 왼쪽 위 네모(Shift: 범위)로 여러 개 골라 폴더 이동·삭제 · −/+ 아이콘 크기 · Ctrl+S: 저장";

    const esc = escAttr;
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
    // 저장: 불러온 형식 그대로. 단 % 가 든 내용(아틀리에 그림 data:…%23… 주소 등)은 날 HTML 로 두면 Roll20 이 풀어 읽다가
    // %23 → # 으로 바뀌어 그림 주소가 잘린다 → Roll20 편집기처럼 escape() 형식으로
    const encodeBlob = (html, enc) => enc || html.includes("%") ? escape(html) : html;
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
    const TABS = ["journal", "bgm", "macros", "decks", "tables", "images"];
    const S = { tab: "journal", journal: null, bgm: null, macros: null, decks: null, tables: null, images: null };
    // 핸드아웃·캐릭터만 볼 때 아이콘(포트레이트) 보기 · 아이콘 크기 — 이 브라우저에 기억
    const VIEW = {
        icons: localStorage.getItem("r20be_icons") !== "0",
        size: Math.max(56, Math.min(140, parseInt(localStorage.getItem("r20be_icon_size"), 10) || 84))
    };
    let ui = null, dragId = null, saving = false;
    const cur = () => S[S.tab];

    const mkNode = (id, kind, model, attrs) => ({
        id, kind, model, parent: null, kids: kind === "folder" || kind === "group" ? [] : null, extra: {},
        orig: { ...attrs }, cur: { ...attrs }, changed: new Set(),
        raw: {}, origText: {}, rich: {}, htmlMode: {}, mode: {}, enc: {}, loaded: false, loading: false, loadError: false,
        isNew: false, deleted: false, moved: false, orphan: false, dupOf: null
    });
    const leaf = (kind, m) => mkNode(m.id, kind, m, kind === "track"
        ? { name: m.get("title") || "", vol: Number(m.get("volume")) || 0, loop: !!m.get("loop"), tags: m.get("tags") || "" }
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

    // 굴림표: 표 하나 = 목록 한 줄, 항목(이름·가중치·이미지)은 n.items 에 둔다
    const tablesColl = () => window.Campaign?.rollabletables || window.d20?.Campaign?.rollabletables || null;
    const itemNode = (m, attrs) => {
        const a = m ? { name: m.get("name") || "", weight: Number(m.get("weight")) || 0, avatar: m.get("avatar") || "" } : attrs;
        return { id: m ? m.id : "new:" + uid(), model: m, orig: { ...a }, cur: { ...a }, changed: new Set(), isNew: !m, deleted: false };
    };
    const setItem = (it, k, v) => {
        it.cur[k] = v;
        if (!it.isNew && v === it.orig[k]) it.changed.delete(k); else it.changed.add(k);
    };
    const itemDirty = it => it.isNew || it.deleted || it.moved || it.changed.size > 0;
    const buildTables = () => {
        const roots = (tablesColl()?.models || []).map(m => {
            const n = mkNode(m.id, "rtable", m, { name: m.get("name") || "", show: !!m.get("showplayers") });
            n.items = (m.tableitems?.models || []).map((it, k) => Object.assign(itemNode(it), { ord: k }));      // ord = Roll20 에 만든 차례
            n.checkedItems = new Set();
            return n;
        });
        return { which: "tables", roots, sel: null, checked: new Set(), collapsed: new Set(), lastCheck: null, visible: [],
            structDirty: false, removed: 0, q: "", filter: "all", ctab: "notes", bulk: { find: "", rep: "", move: "" },
            tbulk: { pattern: "{n}", start: 1, w: 1 }, adding: false };
    };

    // 굴림표 · 매크로 · 덱 탭이 함께 쓰는 탭 상태
    const flatTab = (which, roots) => ({ which, roots, sel: null, checked: new Set(), collapsed: new Set(), lastCheck: null, visible: [],
        structDirty: false, removed: 0, q: "", filter: "all", ctab: "notes", bulk: { find: "", rep: "", move: "" },
        tbulk: { pattern: "{n}", start: 1, w: 1 }, adding: false });
    // 매크로: GM 본인의 매크로 (보이는 사람·토큰 액션·내용)
    const macrosColl = () => window.currentPlayer?.macros || null;
    const buildMacros = () => flatTab("macros", (macrosColl()?.models || []).map(m => {
        const tok = m.get("istokenaction");
        return mkNode(m.id, "macro", m, { name: m.get("name") || "", action: m.get("action") || "", share: m.get("visibleto") || "", token: tok === true || tok === "true" });
    }));
    // 덱: 덱 하나 = 목록 한 줄, 카드(이름·앞면·뒷면)는 n.items 에 둔다
    const decksColl = () => window.Campaign?.decks || null;
    const cardNode = (m, attrs) => {
        const a = m ? { name: m.get("name") || "", avatar: m.get("avatar") || "", card_back: m.get("card_back") || "", tooltip: m.get("tooltip") || "" } : attrs;
        return { id: m ? m.id : "new:" + uid(), model: m, orig: { ...a }, cur: { ...a }, changed: new Set(), isNew: !m, deleted: false };
    };
    const buildDecks = () => flatTab("decks", (decksColl()?.models || []).map(m => {
        const n = mkNode(m.id, "deck", m, { name: m.get("name") || "", back: m.get("avatar") || "" });
        n.items = (m.cards?.models || []).map((c, k) => Object.assign(cardNode(c), { ord: k }));      // ord = Roll20 에 만든 차례
        n.checkedItems = new Set();
        return n;
    }));

    // 방 이미지: '이 방의 이미지'와 같은 모음 (편집 대상이 아니라 덱·굴림표 탭으로 보내는 곳)
    const buildImages = () => ({ ...flatTab("images", []), data: FEAT.roomImages.gather(), gsel: "" });
    const buildTab = which => {
        if (which === "images") return buildImages();
        if (which === "tables") return buildTables();
        if (which === "macros") return buildMacros();
        if (which === "decks") return buildDecks();
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
    const nodeDirty = n => n.isNew || n.deleted || n.moved || n.changed.size > 0;
    const isDirty = n => nodeDirty(n) || !!n.items?.some(itemDirty);       // 목록의 주황 점
    const builtTabs = () => [S.journal, S.bgm, S.macros, S.decks, S.tables].filter(Boolean);
    const dirtyCount = () => builtTabs().reduce((s, t) => s + t.removed + allNodes(t).reduce((c, n) =>
        c + (nodeDirty(n) ? 1 : 0) + (n.items ? n.items.filter(itemDirty).length : 0), 0), 0);
    const needStruct = t => (t.which === "journal" || t.which === "bgm")
        && (t.structDirty || t.removed > 0 || allNodes(t).some(n => n.kids && (n.isNew || n.changed.has("name"))));
    // 굴림표 이름에는 공백을 쓸 수 없다
    const cleanName = (n, v) => n.kind === "rtable" ? v.replace(/\s+/g, "") : v;

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
    const removeNode = (t, n) => {
        const l = listOf(t, n.parent); l.splice(l.indexOf(n), 1); t.checked.delete(n.id); if (t.sel === n.id) t.sel = null;
        // 저장 전 복제본을 지우면 '복제 후 원본 삭제'로 지우려던 원본은 되살린다
        if (n.isNew && n.copyOf?.movedTo === n) { n.copyOf.deleted = false; n.copyOf.movedTo = null; }
    };
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
        if (n.kind === "rtable") return `${n.items.filter(it => !it.deleted).length}개`;
        if (n.kind === "deck") return `${n.items.filter(it => !it.deleted).length}장`;
        if (n.kind === "macro") return n.cur.token ? "토큰" : "";
        if (n.kind === "track") return `${n.cur.vol}%${n.cur.loop ? " · 반복" : ""}${tagList(n.cur.tags).map(x => " #" + x).join("")}`;
        const s = n.cur.share;
        return (n.cur.archived ? "보관 · " : "") + (s === "all" ? "전체" : s ? `${s.split(",").filter(Boolean).length}명` : "GM");
    };
    const visibleRows = t => {
        const q = t.q.trim().toLowerCase(), filtering = !!q || t.filter !== "all";
        const hit = n => !q || n.cur.name.toLowerCase().includes(q) || (n.kind === "macro" && n.cur.action.toLowerCase().includes(q))
            || (n.kind === "track" && (n.cur.tags || "").toLowerCase().includes(q.replace(/^#/, "")));
        // 핸드아웃·캐릭터만 볼 때는 폴더 없이 한 줄로 모은다 (어느 폴더인지는 오른쪽에 표시)
        if (isFlat(t)) return allNodes(t).filter(n => !n.kids && n.kind === t.filter && hit(n)).map(n => ({ n, depth: 0, flat: true }));
        const walk = (list, depth) => list.flatMap(n => {
            if (!n.kids) return (t.filter === "all" || n.kind === t.filter) && hit(n) ? [{ n, depth }] : [];
            const inner = walk(n.kids, depth + 1);
            const selfOk = !filtering || ((t.filter === "all" || t.filter === n.kind) && hit(n));
            if (filtering && !inner.length && !selfOk) return [];
            return [{ n, depth }, ...(filtering || !t.collapsed.has(n.id) ? inner : [])];
        });
        return walk(t.roots, 0);
    };
    const isFlat = t => t.which === "journal" && t.filter !== "all";
    const rowHtml = ({ n, depth, flat }) => {
        const t = cur(), sel = t.sel === n.id, chk = t.checked.has(n.id), shut = t.collapsed.has(n.id);
        const cls = ["r20be-row", sel && "sel", chk && "chk", n.deleted && "del"].filter(Boolean).join(" ");
        return `<div class="${cls}" data-id="${esc(n.id)}" role="treeitem" aria-level="${depth + 1}" aria-selected="${sel}"`
            + `${n.kids ? ` aria-expanded="${!shut}"` : ""} draggable="true" style="padding-left:${4 + depth * 16}px">`
            + (n.kids ? `<button type="button" class="r20be-ib" data-act="toggle" aria-label="펼치기/접기">${shut ? ICON.right : ICON.down}</button>` : `<span class="r20be-sp"></span>`)
            + `<button type="button" class="r20be-cb${chk ? " on" : ""}" data-act="check" aria-label="선택" aria-pressed="${chk}">${ICON.check}</button>`
            + `<button type="button" class="r20be-nm" data-act="pick" title="더블클릭: 이름 바꾸기">${ICON[n.kind]}<span>${esc(n.cur.name || "(이름 없음)")}</span></button>`
            + (isDirty(n) ? `<span class="r20be-dot" title="저장 안 한 변경"></span>` : "")
            + `<span class="r20be-meta">${esc((flat && n.parent ? n.parent.cur.name + " · " : "") + meta(n))}</span></div>`;
    };
    // ── 아이콘 보기: 포트레이트 + 이름, 폴더별로 묶는다 (이름 바꾸기는 오른쪽 편집칸에서) ──
    const iconMode = t => !!t && isFlat(t) && VIEW.icons;
    // 저널 목록에 Roll20 이 그려 둔 썸네일을 먼저 쓴다 (빠른 저널과 같은 방식 — 모델의 avatar 주소는 안 열리는 것이 있다)
    const journalThumb = id => {
        const img = document.querySelector(`li.journalitem[data-itemid="${CSS.escape(id)}"] img`);
        return [img?.getAttribute("src"), img?.getAttribute("data-src")]
            .find(src => src && !src.includes("images/character.png") && !src.includes("default")) || "";
    };
    const avatarOf = n => {
        const m = n.model || n.dupOf;
        return m ? journalThumb(m.id) || m.get?.("avatar") || "" : "";
    };
    // 그림: 바꾼 주소(r20img)로 먼저 열고, 안 열리면 data-alts 의 다른 크기·원래 주소로
    // 움직이는 webm·mp4 는 <video>, 그 밖에는 저장된 주소부터 열고 안 되면 다른 크기로
    const imgEl = (u, props = {}) => {
        if (isAnimVideo(u)) {
            const list = previewAlts(u, ["med", "max"]).map(x => x + "#t=0.1");
            return el("video", { ...props, class: ("r20-anim " + (props.class || "")).trim(), src: list[0], "data-alts": list.slice(1).join("\n"),
                muted: true, loop: true, playsinline: "", preload: "metadata" });
        }
        const src = r20img(u);
        return el("img", { ...props, src, "data-alts": previewAlts(u).filter(x => x !== src).join("\n"), loading: "lazy", alt: "" });
    };
    // 안 열리는 그림: 원래 주소로 한 번 더 → 그래도 안 되면 아이콘은 이름 첫 글자, 카드·항목은 빈 칸
    // (error 는 버블링되지 않아 창 전체에서 캡처로 받는다)
    const onImgError = e => {
        const img = e.target;
        if (img.tagName !== "IMG" && img.tagName !== "VIDEO") return;
        if (nextPreview(img)) return;
        if (img.dataset.orig && !img.dataset.retried) { img.dataset.retried = "1"; img.src = img.dataset.orig; return; }
        if (img.matches(".r20be-pic")) {
            const name = img.closest(".r20be-tile")?.querySelector(".r20be-tn")?.textContent || "";
            img.replaceWith(el("span", { class: "r20be-pic" }, name.trim().charAt(0) || "?"));
        } else img.classList.add("r20be-broken");
    };
    const folderPath = n => {
        const names = [];
        for (let p = n.parent; p; p = p.parent) names.unshift(p.cur.name);
        return names.length ? names.join(" › ") : "폴더 밖";
    };
    const tileHtml = n => {
        const t = cur(), sel = t.sel === n.id, chk = t.checked.has(n.id);
        const cls = ["r20be-row r20be-tile", sel && "sel", chk && "chk", n.deleted && "del"].filter(Boolean).join(" ");
        const name = n.cur.name || "(이름 없음)", src = avatarOf(n);
        return `<div class="${cls}" data-id="${esc(n.id)}" role="treeitem" aria-selected="${sel}">`
            + `<button type="button" class="r20be-tl" data-act="pick" title="${esc(name + " · " + folderPath(n))}">`
            + (src ? previewHtml(src, "r20be-pic")
                   : `<span class="r20be-pic">${esc(name.trim().charAt(0) || "?")}</span>`)
            + `<span class="r20be-tn">${esc(name)}</span></button>`
            + `<button type="button" class="r20be-cb${chk ? " on" : ""}" data-act="check" aria-label="${esc(name)} 선택" aria-pressed="${chk}">${ICON.check}</button>`
            + (isDirty(n) ? `<span class="r20be-dot" title="저장 안 한 변경"></span>` : "") + `</div>`;
    };
    const rowEl = id => ui.tree.querySelector(`.r20be-row[data-id="${CSS.escape(id)}"]`);
    const renderTree = () => {
        if (cur().which === "images") return renderImgTree();
        const t = cur(), rows = visibleRows(t), icons = iconMode(t);
        t.visible = rows.map(r => r.n.id);
        ui.tree.classList.toggle("r20be-icons", icons);
        ui.tree.style.setProperty("--be-icon", VIEW.size + "px");
        if (!rows.length) ui.tree.innerHTML = `<p class="r20be-empty">${t.q || t.filter !== "all" ? "검색 결과가 없습니다" : "항목이 없습니다"}</p>`;
        else if (icons) {
            const groups = new Map();       // 부모 폴더 → 항목 (저널 순서 그대로)
            rows.forEach(({ n }) => { const k = n.parent ? n.parent.id : ""; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(n); });
            t.visible = [...groups.values()].flat().map(n => n.id);       // Shift 범위 선택도 보이는 순서대로
            ui.tree.innerHTML = [...groups.values()].map(list =>
                `<div class="r20be-igh">${ICON.folder}<span>${esc(folderPath(list[0]))}</span><small>${list.length}</small></div>`
                + `<div class="r20be-igrid" role="group">${list.map(tileHtml).join("")}</div>`).join("");
        } else ui.tree.innerHTML = rows.map(rowHtml).join("");
        updateBar();
    };
    const refreshRow = n => {
        const r = rowEl(n.id), t = cur(), flat = isFlat(t);
        if (r) r.outerHTML = iconMode(t) ? tileHtml(n) : rowHtml({ n, depth: flat ? 0 : depthOf(n), flat });
        updateBar();
    };
    const updateBar = () => {
        const c = dirtyCount();
        ui.badge.hidden = !c;
        ui.badge.textContent = `저장 안 한 변경 ${c}건`;
        ui.save.disabled = !c || saving;
        ui.revert.disabled = !c || saving;
    };
    const setStatus = (msg, kind) => { ui.foot.textContent = msg || (cur()?.which === "images" ? HINT_IMG : iconMode(cur()) ? HINT_ICON : HINT); ui.foot.className = "r20be-foot" + (kind ? " " + kind : ""); };

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
            const v = cleanName(n, inp.value.trim());
            if (ok && v) setField(n, "name", v);
            renderTree(); renderPane();
        };
        inp.addEventListener("keydown", e => { if (e.key === "Enter") finish(true); else if (e.key === "Escape") finish(false); });
        inp.addEventListener("blur", () => finish(true));
    };

    // ── 오른쪽 편집칸 ──
    const field = (label, control) => el("label", { class: "r20be-fld" }, el("span", { class: "r20be-lb" }, label), control);
    const nameInput = n => el("input", { class: "r20be-in", value: n.cur.name, oninput: e => {
        const v = cleanName(n, e.target.value);
        if (v !== e.target.value) e.target.value = v;
        setField(n, "name", v);
        refreshRow(n);
    } });
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
        !n.kids && n.kind !== "rtable" && n.kind !== "deck" && !n.isNew && !n.deleted ? el("button", { type: "button", class: "r20be-sec", onclick: () => duplicate(n) }, "복제") : null,
        (n.kind === "rtable" || n.kind === "deck") && !n.deleted ? el("button", { type: "button", class: "r20be-sec", onclick: () => dupMany([n], false) }, "복제") : null,
        (n.kind === "rtable" || n.kind === "deck") && !n.deleted ? el("button", { type: "button", class: "r20be-sec", title: "복제본이 목록 맨 뒤에 생기고 원본은 지워집니다 (순서 정리용)",
            onclick: () => dupMany([n], true) }, "복제 후 원본 삭제") : null,
        el("button", { type: "button", class: "r20be-sec" + (n.deleted ? "" : " danger"), onclick: () => toggleDelete(n) },
            n.deleted ? "삭제 취소" : n.kids ? `${KIND_NAME[n.kind]} 삭제` : "삭제"));

    const setMode = (n, k, m) => {
        const on = m !== "text", edited = n.changed.has(k);
        if (!on && n.htmlMode[k] && edited && RICH_RE.test(n.cur[k])
            && !confirm("글자로 바꾸면 고친 내용의 서식(굵게 · 표 · 그림 등)이 사라집니다. 계속할까요?")) return false;
        if (on !== !!n.htmlMode[k]) {
            const v = on ? (edited ? textToHtml(n.cur[k]) : n.raw[k]) : (edited ? htmlToText(n.cur[k]) : n.origText[k]);
            n.htmlMode[k] = on;
            setField(n, k, v);
        }
        n.mode[k] = m;
        localStorage.setItem("r20be_doc_mode", m);
        return true;
    };
    // 지금 떠 있는 서식 편집기. 오른쪽 칸을 다시 그리기 전에 내용을 받아 두고 치운다
    // (바뀜 알림은 입력 0.1초 뒤에 오므로, 그 사이에 저장 · 이동해도 빠지지 않게 dirty 로 따로 본다)
    let note = null;
    const noteFlush = () => {
        if (!note?.dirty) return;
        note.dirty = false;
        setField(note.n, note.k, window.jQuery(note.host).summernote("code"));
        refreshRow(note.n);
    };
    const noteOff = () => {
        if (!note) return;
        noteFlush();
        try { window.jQuery(note.host).summernote("destroy"); } catch (e) { console.warn("[일괄 편집기] 서식 편집기 닫기 실패", e); }
        note = null;
    };
    const noteOn = host => {
        const jq = window.jQuery, { n, k } = host._doc;
        const me = note = { host, n, k, dirty: false };
        jq(host).summernote({
            toolbar: NOTE_TOOLBAR, minHeight: 260, disableDragAndDrop: true, followingToolbar: false,     // 창 스크롤 따라가기 대신 CSS sticky
            callbacks: {
                onChange: html => { if (note !== me) return; me.dirty = false; setField(n, k, html); refreshRow(n); },
                // 파일을 넣으면 Summernote 는 그림을 글 속에 통째로(base64) 박는다 → 주소로만
                onImageUpload: () => alert("그림 파일은 넣을 수 없어요. Roll20 처럼 그림 주소(URL)로 넣어 주세요.")
            }
        });
        const ed = host.nextElementSibling;
        ed?.querySelector(".note-editable")?.addEventListener("input", () => { me.dirty = true; });
        // 단추 말풍선: 부트스트랩 말풍선은 body 에 붙어 이 창 뒤로 숨으므로 브라우저 기본 말풍선으로 바꾼다
        ed?.querySelectorAll(".note-toolbar [data-original-title]").forEach(b => {
            try { jq(b).tooltip("destroy"); } catch (e) { /* 말풍선이 없는 판 */ }
            b.title = b.dataset.originalTitle;
        });
    };
    // ◀ 이전 · 다음 ▶ : 목록에 보이는 순서대로 핸드아웃 · 캐릭터만 (Alt+↑/↓)
    const stepDoc = d => {
        const t = cur(), byId = new Map(allNodes(t).map(x => [x.id, x]));
        const ids = [...ui.tree.querySelectorAll(".r20be-row[data-id]")].map(r => r.dataset.id).filter(id => BLOBS[byId.get(id)?.kind]);
        const i = ids.indexOf(t.sel), id = ids[i + d];
        if (i < 0 || !id) return;
        select(id);
        rowEl(id)?.scrollIntoView({ block: "nearest" });
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
                initMode(n, k);
                if (!n.changed.has(k)) n.cur[k] = n.htmlMode[k] ? n.raw[k] : n.origText[k];
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
        const t = cur(), k = t.ctab, ready = n.loaded && !n.dupOf && !n.loadError;
        const mode = ready ? n.mode[k] || (n.htmlMode[k] ? "html" : "text") : null;
        const modes = [["rich", "서식"], ["text", "글자"], ["html", "HTML"]].filter(([m]) => m !== "rich" || hasNote());
        const ed = el("div", { class: "r20be-ed" + (mode === "rich" ? " rich" : "") },
            el("div", { class: "r20be-ctabs", role: "tablist" },
                [["notes", n.kind === "char" ? "소개" : "내용"], ["gm", "GM 노트"]].map(([key, label]) =>
                    el("button", { type: "button", role: "tab", "aria-selected": String(k === key), class: "r20be-ctab" + (k === key ? " on" : ""),
                        onclick: () => { t.ctab = key; renderPane(); } }, label)),
                ready ? el("span", { class: "r20be-mode", role: "radiogroup", "aria-label": "편집 방식" }, modes.map(([m, label]) =>
                    el("button", { type: "button", role: "radio", "aria-checked": String(m === mode),
                        onclick: () => { if (m === mode) return; noteFlush(); if (setMode(n, k, m)) renderPane(); } }, label))) : null));
        if (n.dupOf) ed.append(el("p", { class: "r20be-empty" }, "저장하면 원본 내용이 그대로 복사됩니다"));
        else if (n.loadError) ed.append(el("p", { class: "r20be-empty" }, "내용을 불러오지 못했습니다 ",
            el("button", { type: "button", class: "r20be-sec", onclick: () => { n.loadError = false; renderPane(); } }, "다시 시도")));
        else if (!n.loaded) { ed.append(el("p", { class: "r20be-empty" }, "불러오는 중…")); if (!n.loading) loadContent(n); }
        else if (mode === "rich") {
            const host = el("div", { class: "r20be-rte" });
            host.innerHTML = n.cur[k] ?? "";        // Summernote 가 이 안의 HTML 로 시작한다 (renderPane 이 붙인 뒤 noteOn)
            host._doc = { n, k };
            ed.append(host);
        }
        else {
            if (n.rich[k] && mode === "text") ed.append(el("div", { class: "r20be-warn" }, "서식(굵게·이미지 등)이 있는 내용입니다. 글자로 고치면 서식이 사라집니다. 위의 [서식] · [HTML] 로 편집하세요."));
            ed.append(el("textarea", { class: "r20be-ta" + (n.htmlMode[k] ? " mono" : ""), value: n.cur[k] ?? "", spellcheck: "false",
                "aria-label": k === "gm" ? "GM 노트" : n.kind === "char" ? "소개" : "내용",
                oninput: e => { setField(n, k, e.target.value); autosize(e.target); refreshRow(n); } }));
        }
        // 머리줄: ◀ 이전 · 다음 ▶ · 크게 · 아틀리에
        const head = paneHead(n), wide = ui.root.classList.contains("r20be-wide");
        head.querySelector(".r20be-flex").after(
            el("span", { class: "r20be-docnav" },
                el("button", { type: "button", class: "r20be-sec", title: "목록에서 이전 항목 (Alt+↑)", onclick: () => stepDoc(-1) }, "◀ 이전"),
                el("button", { type: "button", class: "r20be-sec", title: "목록에서 다음 항목 (Alt+↓)", onclick: () => stepDoc(1) }, "다음 ▶")),
            el("button", { type: "button", class: "r20be-sec", "aria-pressed": String(wide), title: wide ? "목록 다시 보이기" : "목록을 숨기고 편집 칸을 창 가득",
                onclick: () => { noteFlush(); ui.root.classList.toggle("r20be-wide"); renderPane(); } }, wide ? "⤡ 작게" : "⤢ 크게"),
            el("a", { class: "r20be-sec r20be-link", href: ATELIER, target: "_blank", rel: "noopener noreferrer",
                title: "쥬나 아틀리에(atelier.zyuna.link) 핸드아웃 편집기를 새 탭으로 — [Roll20 복사] 한 것을 [서식] 칸에 붙여 넣으면 서식째 들어가요" }, "아틀리에 ↗"));
        return el("div", { class: "r20be-pane-in" }, head,
            el("div", { class: "r20be-grid" },
                field(`${KIND_NAME[n.kind]} 이름`, nameInput(n)),
                field("저널에 표시", el("select", { class: "r20be-in", onchange: e => { setField(n, "share", e.target.value); refreshRow(n); } },
                    shareOptions(n.cur.share).map(o => el("option", { value: o.v, selected: o.v === n.cur.share }, o.label))))),
            ed);
    };

    // 미리듣기 칸: 재생 상태가 바뀔 때마다 _sync 로 글자만 갱신 (버튼 포커스 유지)
    const pvBlock = n => {
        const label = el("span", {}), note = el("span", { class: "r20be-note" });
        const pv = FEAT.bgmPreview;
        const btn = el("button", { type: "button", class: "r20be-sec", onclick: () => {
            if (pv.current() === n.id) pv.stop(); else pv.play(n.id, n.cur.vol / 100);
        } }, ico("phones"), label);
        const box = el("div", { class: "r20be-pv" }, btn, note);
        box._sync = () => {
            const on = pv.current() === n.id;
            btn.classList.toggle("on", on);
            label.textContent = on ? "미리듣기 정지" : "미리듣기 (나만)";
            note.textContent = pv.status(n.id) || "참가자에게는 들리지 않음";
        };
        box._sync();
        return box;
    };
    FEAT.bgmPreview?.onChange(() => { ui?.pane.querySelector(".r20be-pv")?._sync?.(); ui?.pane.querySelector(".r20be-tlist")?._sync?.(); });     // 미리듣기 묶음이 없으면 칸도 없다

    const trackPane = n => {
        const t = cur();
        const volLb = el("span", { class: "r20be-lb" }, `볼륨 ${n.cur.vol}%`);
        const here = n.parent ? n.parent.id : "";
        return el("div", { class: "r20be-pane-in" }, paneHead(n),
            field("트랙 제목", nameInput(n)),
            field("태그 (GM 만 보임 · 띄어쓰기로 여러 개)", el("input", { class: "r20be-in", value: n.cur.tags, placeholder: "예: 전투 보스 잔잔",
                oninput: e => { setField(n, "tags", e.target.value.trim()); refreshRow(n); } })),
            field("위치", el("select", { class: "r20be-in", onchange: e => { if (moveNode(t, n, e.target.value ? find(t, e.target.value) : null, null)) renderTree(); } },
                el("option", { value: "", selected: !here }, "맨 위 (플레이리스트 밖)"),
                groupList(t).map(g => el("option", { value: g.n.id, selected: g.n.id === here }, g.label)))),
            el("label", { class: "r20be-fld" }, volLb,
                el("input", { type: "range", class: "r20be-range", min: "0", max: "100", value: String(n.cur.vol),
                    oninput: e => {
                        setField(n, "vol", Number(e.target.value));
                        volLb.textContent = `볼륨 ${e.target.value}%`;
                        FEAT.bgmPreview?.setVolume(n.id, e.target.value / 100);      // 미리듣기 중이면 바로 반영
                        refreshRow(n);
                    } })),
            el("label", { class: "r20be-chk" },
                el("input", { type: "checkbox", checked: n.cur.loop, onchange: e => { setField(n, "loop", e.target.checked); refreshRow(n); } }), "반복 재생"),
            n.isNew || !FEAT.bgmPreview ? null : pvBlock(n));
    };

    // 플레이리스트 곡 정렬: 숫자 → 알파벳 → 가나다 (대소문자 무시, 숫자는 크기순). 자리가 바뀐 곡만 옮김 표시 — 저장해야 반영
    //   태그순: 첫 태그끼리 묶고 그 안은 이름순, 태그 없는 곡은 맨 뒤
    const byName = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
    const nameCmp = (a, b) => byName.compare(a.cur.name || "", b.cur.name || "");
    const tagCmp = (a, b) => {
        const x = tagList(a.cur.tags)[0], y = tagList(b.cur.tags)[0];
        return x && y ? byName.compare(x, y) || nameCmp(a, b) : x ? -1 : y ? 1 : nameCmp(a, b);
    };
    const folderFirst = (a, b) => (b.kids ? 1 : 0) - (a.kids ? 1 : 0) || nameCmp(a, b);      // 저널 폴더: 하위 폴더 먼저, 그다음 항목
    const sortKids = (t, n, cmp) => {
        const sorted = [...n.kids].sort(cmp);
        if (sorted.every((k, i) => k === n.kids[i])) return false;
        sorted.forEach((k, i) => { if (n.kids[i] !== k) k.moved = true; });
        n.kids.splice(0, n.kids.length, ...sorted);
        t.structDirty = true;
        return true;
    };
    // ── 저널 폴더 안 보기: 바로 안의 항목 + 하위 폴더별 묶음 (아이콘 보기 카드를 그대로 쓴다) ──
    // 카드를 누르면 그 항목 편집, 다른 묶음으로 끌어 놓으면 그 폴더로 (왼쪽 목록과도 서로 끌어 옮길 수 있다)
    const folderView = g => {
        const t = cur(), box = el("div", { class: "r20be-fv" });
        box.style.setProperty("--be-icon", VIEW.size + "px");
        const sec = (f, depth) => {
            const items = f.kids.filter(k => !k.kids), shut = f !== g && t.collapsed.has(f.id);
            const s = el("section", { class: "r20be-fsec", "data-fid": f.id, style: depth ? `margin-left:${Math.min(depth, 4) * 16}px` : null },
                el("header", {}, ico("folder"), el("b", {}, f.cur.name || "(이름 없음)"),
                    el("small", {}, (f === g ? "바로 안 · " : "") + `${items.length}개` + (shut ? " · 접힘" : "")),
                    el("span", { class: "r20be-flex" }),
                    items.length > 1 ? el("button", { type: "button", class: "r20be-xs", title: "이 묶음의 항목을 골라 한꺼번에 바꾸기",
                        onclick: () => { t.checked = new Set(items.map(k => k.id)); renderTree(); renderPane(); } }, "모두 선택") : null,
                    f !== g ? el("button", { type: "button", class: "r20be-xs", onclick: () => { t.collapsed.delete(f.id); select(f.id); rowEl(f.id)?.scrollIntoView({ block: "nearest" }); } }, "열기") : null,
                    f !== g ? el("button", { type: "button", class: "r20be-xs", "aria-expanded": String(!shut),
                        onclick: () => { if (shut) t.collapsed.delete(f.id); else t.collapsed.add(f.id); renderTree(); renderPane(); } }, shut ? "펼치기" : "접기") : null));
            if (!shut) s.append(items.length ? el("div", { class: "r20be-igrid", role: "group", html: items.map(tileHtml).join("") })
                : el("p", { class: "r20be-fempty" }, "비어 있음 · 카드를 여기로 끌어 놓으면 이 폴더로"));
            return [s, ...(shut ? [] : f.kids.filter(k => k.kids).flatMap(k => sec(k, depth + 1)))];
        };
        box.append(...sec(g, 0));
        box.querySelectorAll(".r20be-tile").forEach(x => { x.draggable = true; });
        box.addEventListener("click", e => {
            const id = e.target.closest("[data-act=pick]") && e.target.closest(".r20be-tile")?.dataset.id;
            if (id) { select(id); rowEl(id)?.scrollIntoView({ block: "nearest" }); }
        });
        const clear = () => box.querySelectorAll(".drop").forEach(x => x.classList.remove("drop"));
        box.addEventListener("dragstart", e => {
            const tile = e.target.closest?.(".r20be-tile");
            if (!tile) return;
            dragId = tile.dataset.id;
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", dragId);
        });
        const target = e => {
            const secEl = e.target.closest?.(".r20be-fsec"), f = secEl && find(t, secEl.dataset.fid), d = dragId && find(t, dragId);
            if (!f || !d || d === f || isAncestor(d, f)) return null;
            const tile = e.target.closest(".r20be-tile"), b = tile && find(t, tile.dataset.id);
            return { secEl, f, d, before: b && b !== d && b.parent === f ? b : null };
        };
        box.addEventListener("dragover", e => { const tg = target(e); if (!tg) return; e.preventDefault(); clear(); tg.secEl.classList.add("drop"); });
        box.addEventListener("dragleave", e => { if (!box.contains(e.relatedTarget)) clear(); });
        box.addEventListener("drop", e => {
            const tg = target(e);
            clear();
            if (!tg) return;
            e.preventDefault();
            dragId = null;
            if (moveNode(t, tg.d, tg.f, tg.before)) { renderTree(); renderPane(); setStatus(`'${tg.d.cur.name}' → ${tg.f.cur.name} (저장해야 Roll20에 반영)`, "ok"); }
        });
        box.addEventListener("dragend", () => { dragId = null; clear(); });
        return box;
    };
    // ── 플레이리스트 곡 목록: ▶ 미리듣기(나만) · 줄을 누르면 그 곡 편집 · 끌어서 순서 바꾸기 ──
    const trackList = g => {
        const t = cur(), pv = FEAT.bgmPreview;
        const list = el("div", { class: "r20be-tlist", role: "list" },
            el("div", { class: "r20be-tkrow hd" }, el("span"), el("span", {}, "곡 이름"), el("span", {}, "태그"), el("span", {}, "볼륨"), el("span", {}, "반복")),
            g.kids.map(n => el("div", { class: "r20be-tkrow" + (n.deleted ? " del" : ""), "data-id": n.id, draggable: "true", role: "listitem" },
                pv ? el("button", { type: "button", class: "r20be-tplay", "data-play": n.id, "aria-label": `${n.cur.name} 미리듣기 (나만)` }) : el("span"),
                el("span", { class: "r20be-tkn", title: n.cur.name }, n.cur.name || "(이름 없음)", isDirty(n) ? el("span", { class: "r20be-dot", title: "저장 안 한 변경" }) : null),
                el("span", { class: "r20be-ttags" }, tagList(n.cur.tags).map(x => el("span", {}, x))),
                el("span", { class: "r20be-tvol", title: `볼륨 ${n.cur.vol}%` }, el("i", { style: `width:${Math.max(0, Math.min(100, n.cur.vol))}%` })),
                el("span", { title: n.cur.loop ? "반복" : "반복 안 함" }, n.cur.loop ? "🔁" : ""))));
        list._sync = () => list.querySelectorAll("[data-play]").forEach(b => {
            const on = pv.current() === b.dataset.play;
            b.classList.toggle("on", on); b.textContent = on ? "❚❚" : "▶";
        });
        if (pv) list._sync();
        list.addEventListener("click", e => {
            const row = e.target.closest(".r20be-tkrow[data-id]");
            if (!row) return;
            const p = e.target.closest("[data-play]"), n = find(t, row.dataset.id);
            if (p && n) { if (pv.current() === n.id) pv.stop(); else pv.play(n.id, n.cur.vol / 100); return; }
            select(row.dataset.id); rowEl(row.dataset.id)?.scrollIntoView({ block: "nearest" });
        });
        const clear = () => list.querySelectorAll(".ins").forEach(x => x.classList.remove("ins"));
        list.addEventListener("dragstart", e => { const row = e.target.closest?.(".r20be-tkrow[data-id]"); if (!row) return; dragId = row.dataset.id; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", dragId); });
        const before = e => { const row = e.target.closest?.(".r20be-tkrow[data-id]"); return row ? find(t, row.dataset.id) : null; };
        list.addEventListener("dragover", e => {
            const d = dragId && find(t, dragId);
            if (!d || d.kids) return;
            e.preventDefault(); clear();
            const b = before(e); if (b) list.querySelector(`.r20be-tkrow[data-id="${CSS.escape(b.id)}"]`)?.classList.add("ins");
        });
        list.addEventListener("drop", e => {
            const d = dragId && find(t, dragId), b = before(e);
            clear();
            if (!d || d.kids) return;
            e.preventDefault(); dragId = null;
            if (b !== d && moveNode(t, d, g, b)) { renderTree(); renderPane(); }
        });
        list.addEventListener("dragend", () => { dragId = null; clear(); });
        return list;
    };
    const groupPane = n => {
        const t = cur();
        const head = paneHead(n);
        if (t.which === "journal") head.querySelector(".r20be-flex").after(
            el("button", { type: "button", class: "r20be-sec r20be-new", title: "이 폴더 안에 새 폴더", onclick: () => createNode("folder") }, "＋ 하위 폴더"));
        return el("div", { class: "r20be-pane-in" }, head,
            field(`${KIND_NAME[n.kind]} 이름`, nameInput(n)),
            el("p", { class: "r20be-note" }, `안에 든 항목 ${n.kids.length}개 · 지우면 안의 항목은 한 단계 위로 옮겨집니다`),
            el("div", { class: "r20be-btns" }, el("button", { type: "button", class: "r20be-sec", disabled: !n.kids.length,
                onclick: () => { t.checked = new Set(n.kids.map(k => k.id)); t.collapsed.delete(n.id); renderTree(); renderPane(); } },
                "안의 항목 모두 선택 → 한꺼번에 바꾸기"),
                (t.which === "bgm" ? [["곡 이름순 정렬", nameCmp, "숫자 → 알파벳 → 가나다 순 (저장해야 반영)", "이미 이름순이에요"],
                    ["곡 태그순 정렬", tagCmp, "첫 태그끼리 묶고 그 안은 이름순, 태그 없는 곡은 맨 뒤 (저장해야 반영)", "이미 태그순이에요"]]
                    : t.which === "journal" ? [["이름순 정렬", folderFirst, "바로 안의 하위 폴더 먼저, 그다음 항목 — 숫자 → 알파벳 → 가나다 순 (저장해야 반영)", "이미 이름순이에요"]] : []).map(([label, cmp, tip, same]) =>
                    el("button", { type: "button", class: "r20be-sec", disabled: n.kids.length < 2, title: tip,
                        onclick: e => {
                            if (!sortKids(t, n, cmp)) { const b = e.currentTarget; b.textContent = same; setTimeout(() => { b.textContent = label; }, 1500); return; }
                            t.collapsed.delete(n.id); renderTree(); renderPane(); updateBar();
                        } }, label))),
            t.which === "journal" ? folderView(n) : t.which === "bgm" && n.kids.length ? trackList(n) : null);
    };

    const bulkPane = list => {
        const t = cur(), st = t.bulk;
        const prev = el("div", { class: "r20be-prev" });
        // 공개 범위(저널에 표시 · 매크로 보이는 사람): "_keep" 이면 바꾸지 않음
        const shareOn = () => (t.which === "journal" || t.which === "macros") && st.share != null && st.share !== "_keep";
        // 이름: 찾아 바꾸기 → 앞에 붙이기 (이미 그 말로 시작하면 건너뜀)
        const rename = s => { if (st.find) s = s.split(st.find).join(st.rep); return st.pre && !s.startsWith(st.pre) ? st.pre + s : s; };
        const apply = el("button", { type: "button", class: "r20be-pri", onclick: () => {
            if (st.find || st.pre) list.forEach(n => { const v = rename(n.cur.name); if (v !== n.cur.name) setField(n, "name", v); });
            if (shareOn()) list.forEach(n => { if (!n.kids && n.cur.share !== st.share) setField(n, "share", st.share); });
            if (st.move) {
                const p = st.move === "_root" ? null : find(t, st.move);
                list.forEach(n => { if (!(t.which === "bgm" && n.kids)) moveNode(t, n, p, null); });
            }
            t.bulk = { find: "", rep: "", pre: "", move: "", share: "_keep" };
            renderTree(); renderPane();
            setStatus(`${list.length}개에 적용했습니다 (저장해야 Roll20에 반영)`, "ok");
        } }, `${list.length}개에 적용`);
        const draw = () => {
            prev.textContent = "";
            prev.append(el("div", {}, el("span", {}, "지금"), el("span", {}, "바뀐 뒤 (미리보기)")));
            list.slice(0, 50).forEach(n => {
                const after = rename(n.cur.name);
                prev.append(el("div", {}, el("span", {}, n.cur.name),
                    el("span", { class: after !== n.cur.name ? "chg" : "same" }, after !== n.cur.name ? after : "(변경 없음)")));
            });
            if (list.length > 50) prev.append(el("div", {}, el("span", { class: "same" }, `외 ${list.length - 50}개`), el("span", {})));
            if (shareOn()) {
                const leaves = list.filter(n => !n.kids), changing = leaves.filter(n => n.cur.share !== st.share).length;
                const label = shareOptions(st.share).find(o => o.v === st.share)?.label || st.share;
                prev.append(el("div", {}, el("span", { class: "same" }, t.which === "journal" ? "저널에 표시" : "보이는 사람"),
                    el("span", { class: changing ? "chg" : "same" }, changing ? `${changing}개 → ${t.which === "macros" && !st.share ? "나만" : label}` : "(변경 없음)")));
            }
            apply.disabled = !st.find && !st.pre && !st.move && !shareOn();
        };
        const setTok = on => {
            list.forEach(n => { if (n.cur.token !== on) setField(n, "token", on); });
            renderTree(); renderPane();
            setStatus(`${list.length}개의 토큰 액션을 ${on ? "켰" : "껐"}습니다 (저장해야 Roll20에 반영)`, "ok");
        };
        const box = el("div", { class: "r20be-pane-in" },
            el("div", { class: "r20be-ph" }, el("strong", {}, `${list.length}개 선택됨`), el("span", { class: "r20be-flex" }),
                el("button", { type: "button", class: "r20be-sec", onclick: () => { t.checked.clear(); renderTree(); renderPane(); } }, "선택 해제")),
            el("div", { class: "r20be-grid" },
                field("찾을 말", el("input", { class: "r20be-in", value: st.find, oninput: e => { st.find = e.target.value; draw(); } })),
                field("바꿀 말", el("input", { class: "r20be-in", value: st.rep, oninput: e => { st.rep = e.target.value; draw(); } }))),
            field("앞에 붙일 말 (이미 그 말로 시작하면 건너뜀)", el("input", { class: "r20be-in", value: st.pre || "", placeholder: "예: [전투] ", oninput: e => { st.pre = e.target.value; draw(); } })),
            t.which === "tables" || t.which === "decks" ? el("div", { class: "r20be-acts" },
                el("button", { type: "button", class: "r20be-sec", onclick: () => dupMany(list, false) }, "선택 항목 복제"),
                el("button", { type: "button", class: "r20be-sec", title: "목록 순서대로 복제본이 맨 뒤에 생기고 원본은 지워집니다 (순서 정리용)",
                    onclick: () => dupMany(list, true) }, "복제 후 원본 삭제"),
                t.which === "tables" ? el("button", { type: "button", class: "r20be-sec", onclick: () => openRollMacro(list) }, "굴림 매크로 만들기") : null) : null,
            t.which === "journal" || t.which === "macros" ? field(t.which === "journal" ? "저널에 표시 (폴더는 빼고)" : "보이는 사람",
                el("select", { class: "r20be-in", onchange: e => { st.share = e.target.value; draw(); } },
                    el("option", { value: "_keep", selected: !shareOn() }, "바꾸지 않음"),
                    shareOptions("").map(o => el("option", { value: o.v, selected: shareOn() && st.share === o.v }, t.which === "macros" && !o.v ? "나만" : o.label)))) : null,
            t.which === "bgm" ? (() => {
                const tagIn = el("input", { class: "r20be-in", placeholder: "태그 (띄어쓰기로 여러 개)", "aria-label": "붙이거나 뺄 태그" });
                const tagOp = add => {
                    const want = tagList(tagIn.value);
                    if (!want.length) return;
                    const tracks = list.filter(n => n.kind === "track");
                    tracks.forEach(n => {
                        const has = tagList(n.cur.tags), next = add ? [...has, ...want.filter(x => !has.includes(x))] : has.filter(x => !want.includes(x));
                        if (next.join(" ") !== has.join(" ")) setField(n, "tags", next.join(" "));
                    });
                    renderTree(); renderPane();
                    setStatus(`곡 ${tracks.length}개에서 태그 ${want.map(x => "#" + x).join(" ")}를 ${add ? "붙였" : "뺐"}습니다 (저장해야 Roll20에 반영)`, "ok");
                };
                return field("태그", el("div", { class: "r20be-acts" }, tagIn,
                    el("button", { type: "button", class: "r20be-sec", onclick: () => tagOp(true) }, "붙이기"),
                    el("button", { type: "button", class: "r20be-sec", onclick: () => tagOp(false) }, "빼기")));
            })() : null,
            t.which === "macros" ? el("div", { class: "r20be-acts" },
                el("button", { type: "button", class: "r20be-sec", onclick: () => setTok(true) }, "토큰 액션 켜기"),
                el("button", { type: "button", class: "r20be-sec", onclick: () => setTok(false) }, "토큰 액션 끄기")) : null,
            !(t.which === "journal" || t.which === "bgm") ? null : field(t.which === "journal" ? "폴더로 이동" : "플레이리스트로 이동",
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

    // 굴림표 편집칸: 항목 카드 격자 + 고른 항목 일괄 바꾸기 + 줄 단위로 항목 추가
    const tablePane = n => {
        const t = cur(), tb = t.tbulk;
        const live = () => n.items.filter(it => !it.deleted);
        const picked = () => live().filter(it => n.checkedItems.has(it.id));
        const fmt = k => tb.pattern.split("{n}").join(String(tb.start + k));
        const grid = el("div", { class: "r20be-tgrid" });
        const bar = el("div", { class: "r20be-tbar", hidden: true });
        const changed = () => { refreshRow(n); updateBar(); };
        const card = it => {
            const on = n.checkedItems.has(it.id);
            const c = el("div", { class: "r20be-card" + (on ? " chk" : "") + (itemDirty(it) ? " dirty" : "") });
            const cb = el("button", { type: "button", class: "r20be-cb2" + (on ? " on" : ""), "aria-label": "선택", html: ICON.check });
            const toggle = () => {
                if (n.checkedItems.has(it.id)) n.checkedItems.delete(it.id); else n.checkedItems.add(it.id);
                c.classList.toggle("chk"); cb.classList.toggle("on");
                drawBar();
            };
            cb.onclick = toggle;
            const thumb = it.cur.avatar
                ? el("button", { type: "button", class: "r20be-thumb", title: it.cur.name, onclick: toggle }, imgEl(it.cur.avatar))
                : el("button", { type: "button", class: "r20be-thumb none", onclick: toggle }, "이미지 없음");
            const mark = () => { c.classList.toggle("dirty", itemDirty(it)); changed(); };
            c.append(thumb, cb,
                el("input", { class: "r20be-in r20be-mini", value: it.cur.name, "aria-label": "항목 이름",
                    oninput: e => { setItem(it, "name", e.target.value); mark(); } }),
                el("label", { class: "r20be-wl" }, "가중치",
                    el("input", { class: "r20be-in r20be-mini", type: "number", min: "0", value: String(it.cur.weight),
                        oninput: e => { setItem(it, "weight", Math.max(0, parseInt(e.target.value, 10) || 0)); mark(); } })));
            return c;
        };
        const drawGrid = () => {
            grid.textContent = "";
            const list = live();
            if (!list.length) grid.append(el("p", { class: "r20be-empty" }, "항목이 없습니다 · [+ 항목 추가]로 넣어 주세요"));
            list.forEach(it => grid.append(card(it)));
        };
        const drawBar = () => {
            const sel = picked();
            bar.hidden = !sel.length;
            if (!sel.length) return;
            const prev = el("span", { class: "prev" });
            const showPrev = () => { prev.textContent = "→ " + sel.slice(0, 3).map((_, k) => fmt(k)).join(", ") + (sel.length > 3 ? " …" : ""); };
            showPrev();
            bar.textContent = "";
            bar.append(
                el("strong", {}, `${sel.length}개 선택`),
                el("span", { class: "r20be-note" }, "이름"),
                el("input", { class: "r20be-in r20be-mini", value: tb.pattern, "aria-label": "이름 규칙 ({n} = 번호)", style: "width:120px",
                    oninput: e => { tb.pattern = e.target.value; showPrev(); } }),
                el("span", { class: "r20be-note" }, "시작"),
                el("input", { class: "r20be-in r20be-mini", type: "number", value: String(tb.start), "aria-label": "시작 번호", style: "width:56px",
                    oninput: e => { tb.start = parseInt(e.target.value, 10) || 1; showPrev(); } }),
                prev,
                el("button", { type: "button", class: "r20be-pri", onclick: () => {
                    sel.forEach((it, k) => setItem(it, "name", fmt(k)));
                    drawGrid(); changed();
                    setStatus(`${sel.length}개 이름을 바꿨습니다 (저장해야 Roll20에 반영)`, "ok");
                } }, "이름 적용"),
                el("span", { class: "r20be-sepv" }),
                el("span", { class: "r20be-note" }, "가중치"),
                el("input", { class: "r20be-in r20be-mini", type: "number", min: "0", value: String(tb.w), "aria-label": "가중치", style: "width:56px",
                    oninput: e => { tb.w = Math.max(0, parseInt(e.target.value, 10) || 0); } }),
                el("button", { type: "button", class: "r20be-sec", onclick: () => { sel.forEach(it => setItem(it, "weight", tb.w)); drawGrid(); changed(); } }, "적용"),
                el("button", { type: "button", class: "r20be-sec danger", onclick: () => {
                    sel.forEach(it => { if (it.isNew) n.items.splice(n.items.indexOf(it), 1); else it.deleted = true; });
                    n.checkedItems.clear();
                    drawGrid(); drawBar(); changed();
                    setStatus(`${sel.length}개를 지웠습니다 (저장해야 Roll20에 반영)`, "ok");
                } }, "삭제"),
                el("button", { type: "button", class: "r20be-sec", onclick: () => { n.checkedItems.clear(); drawGrid(); drawBar(); } }, "선택 해제"));
        };
        // 한 줄에 하나: "이미지 주소" 또는 "이름 | 이미지 주소" 또는 이름만(글자 표)
        const addBox = el("div", { class: "r20be-add", hidden: !t.adding });
        const ta = el("textarea", { class: "r20be-in", "aria-label": "새 항목", placeholder: "한 줄에 하나씩 · 이미지 주소만 / 이름 | 이미지 주소 / 이름만" });
        addBox.append(ta, el("button", { type: "button", class: "r20be-pri", onclick: () => {
            const lines = ta.value.split("\n").map(l => l.trim()).filter(Boolean);
            lines.forEach(l => {
                const [a, b] = l.split("|").map(x => x.trim());
                const attrs = b !== undefined ? { name: a, avatar: b } : /^https?:\/\//.test(a) ? { name: "", avatar: a } : { name: a, avatar: "" };
                n.items.push(itemNode(null, { ...attrs, weight: 1 }));
            });
            ta.value = "";
            drawGrid(); changed();
            setStatus(`항목 ${lines.length}개를 추가했습니다 (저장해야 Roll20에 반영)`, "ok");
        } }, "추가"));
        drawGrid(); drawBar();
        return el("div", { class: "r20be-pane-in" }, paneHead(n),
            el("div", { class: "r20be-trow" },
                field("굴림표 이름 (공백 불가)", nameInput(n)),
                el("label", { class: "r20be-chk" },
                    el("input", { type: "checkbox", checked: !!n.cur.show, onchange: e => { setField(n, "show", e.target.checked); changed(); } }),
                    "플레이어의 목록 뽑기 허용"),
                el("span", { class: "r20be-flex" }),
                el("button", { type: "button", class: "r20be-sec", onclick: () => { live().forEach(it => n.checkedItems.add(it.id)); drawGrid(); drawBar(); } }, "모두 선택"),
                el("button", { type: "button", class: "r20be-sec", onclick: () => {
                    live().forEach(it => { if (n.checkedItems.has(it.id)) n.checkedItems.delete(it.id); else n.checkedItems.add(it.id); });
                    drawGrid(); drawBar();
                } }, "선택 반전"),
                el("button", { type: "button", class: "r20be-sec", onclick: () => openMerge(n) }, "합치기…"),
                el("button", { type: "button", class: "r20be-sec", onclick: () => openRollMacro([n]) }, "굴림 매크로"),
                el("button", { type: "button", class: "r20be-sec", disabled: live().length < 2, onclick: openOrder }, "순서 바꾸기…"),
                el("button", { type: "button", class: "r20be-sec", onclick: () => { t.adding = !t.adding; addBox.hidden = !t.adding; if (t.adding) ta.focus(); } }, ico("plus"), "항목 추가")),
            addBox, bar, grid);
        // 항목 순서 — 토큰 메뉴의 '면 순서 바꾸기'와 같은 창. 굴림표를 맵에 끌어 놓으면 이 순서가 롤러블 토큰의 면 순서가 된다
        function openOrder() { openItemOrder(n, "항목", () => { drawGrid(); drawBar(); changed(); }); }
    };
    // 굴림표 항목 · 덱 카드 순서 바꾸기 (sideOrder 창). 뺀 것은 지움 표시 — 저장 때 지운다
    const openItemOrder = (n, unit, redraw) => {
        const L = n.items.filter(it => !it.deleted);
        sideOrder.open({ title: `${unit} 순서 바꾸기`, sub: `${n.cur.name} · ${unit} ${L.length}${unit === "카드" ? "장" : "개"}`, unit,
            items: L.map(it => ({ src: it.cur.avatar, name: it.cur.name })),
            onSave: order => {
                const kept = order.map(i => L[i]);
                L.filter((_, i) => !order.includes(i)).forEach(it => { if (it.isNew) n.items.splice(n.items.indexOf(it), 1); else it.deleted = true; n.checkedItems.delete(it.id); });
                n.items = [...kept, ...n.items.filter(it => it.deleted)];
                markOrder(n);
                redraw();
                setStatus(`${unit} 순서를 바꿨습니다 (저장해야 Roll20에 반영)`, "ok");
            } });
    };
    // 덱에서 나가 있는 카드 수 — 뽑을 더미 · 버린 더미 · 뺀 카드 어디에도 없는 카드 (뽑을 더미가 아직 없으면 0)
    const pileIds = (m, k) => { const v = m?.get(k); return Array.isArray(v) ? v : typeof v === "string" ? v.split(",").filter(Boolean) : []; };
    const cardsOut = n => {
        const deck = pileIds(n.model, "currentDeck");
        if (!deck.length) return 0;
        const home = new Set([...deck, ...pileIds(n.model, "discardPile"), ...pileIds(n.model, "removedcards")]);
        return n.items.filter(it => !it.isNew && !it.deleted && !home.has(it.id)).length;
    };
    // Roll20 굴림표 항목에는 순서 칸이 없고 만든 차례로 선다 → 앞에서부터 원래 차례 그대로인 데까지는 두고,
    // 처음 어긋난 자리부터 뒤는 저장할 때 다시 만든다(moved). 원래 순서로 되돌리면 표시도 사라진다
    const markOrder = n => {
        const L = n.items.filter(it => !it.deleted);
        let p = 0, last = -1;
        while (p < L.length && !L[p].isNew && L[p].ord > last) { last = L[p].ord; p++; }
        L.forEach((it, k) => { it.moved = k >= p && !it.isNew; });
    };

    // 덱 편집칸: 카드 격자(앞면 + 뒷면 작게) · 전체/반전/해제 선택 → 이름·뒷면·삭제 한꺼번에 · 줄 단위로 카드 추가
    const deckPane = n => {
        const t = cur(), tb = t.tbulk;
        const live = () => n.items.filter(it => !it.deleted);
        const picked = () => live().filter(it => n.checkedItems.has(it.id));
        const fmt = k => tb.pattern.split("{n}").join(String(tb.start + k));
        const grid = el("div", { class: "r20be-tgrid" });
        const bar = el("div", { class: "r20be-tbar" });
        const changed = () => { refreshRow(n); updateBar(); };
        const card = it => {
            const on = n.checkedItems.has(it.id);
            const c = el("div", { class: "r20be-card" + (on ? " chk" : "") + (itemDirty(it) ? " dirty" : "") });
            const cb = el("button", { type: "button", class: "r20be-cb2" + (on ? " on" : ""), "aria-label": "선택", html: ICON.check });
            const toggle = () => {
                if (n.checkedItems.has(it.id)) n.checkedItems.delete(it.id); else n.checkedItems.add(it.id);
                c.classList.toggle("chk"); cb.classList.toggle("on");
                drawBar();
            };
            cb.onclick = toggle;
            const back = it.cur.card_back || n.cur.back;      // 카드 뒷면이 없으면 덱 기본 뒷면
            const thumb = el("button", { type: "button", class: "r20be-thumb" + (it.cur.avatar ? "" : " none"), title: it.cur.name, onclick: toggle },
                it.cur.avatar ? imgEl(it.cur.avatar) : "앞면 없음",
                back ? imgEl(back, { class: "r20be-back" }) : null);
            c.append(thumb, cb,
                el("input", { class: "r20be-in r20be-mini", value: it.cur.name, "aria-label": "카드 이름",
                    oninput: e => { setItem(it, "name", e.target.value); c.classList.toggle("dirty", itemDirty(it)); changed(); } }),
                // 툴팁: Roll20 카드 창의 '툴팁'과 같은 칸 (최대 150자)
                el("textarea", { class: "r20be-in r20be-ctip", rows: "2", maxlength: "150", placeholder: "툴팁", value: it.cur.tooltip, "aria-label": "카드 툴팁",
                    oninput: e => { setItem(it, "tooltip", e.target.value); c.classList.toggle("dirty", itemDirty(it)); changed(); } }));
            return c;
        };
        const drawGrid = () => {
            grid.textContent = "";
            const list = live();
            if (!list.length) grid.append(el("p", { class: "r20be-empty" }, "카드가 없습니다 · [+ 카드 추가]로 넣어 주세요"));
            list.forEach(it => grid.append(card(it)));
        };
        const drawBar = () => {
            const sel = picked();
            const pick = (label, fn) => el("button", { type: "button", class: "r20be-sec", onclick: () => { fn(); drawGrid(); drawBar(); } }, label);
            bar.textContent = "";
            bar.classList.toggle("idle", !sel.length);
            bar.append(
                pick("전체 선택", () => live().forEach(it => n.checkedItems.add(it.id))),
                pick("선택 반전", () => live().forEach(it => { if (n.checkedItems.has(it.id)) n.checkedItems.delete(it.id); else n.checkedItems.add(it.id); })),
                pick("선택 해제", () => n.checkedItems.clear()),
                el("strong", {}, `${sel.length}장 선택`));
            if (!sel.length) return;
            const prev = el("span", { class: "prev" });
            const showPrev = () => { prev.textContent = "→ " + sel.slice(0, 3).map((_, k) => fmt(k)).join(", ") + (sel.length > 3 ? " …" : ""); };
            showPrev();
            const backIn = el("input", { class: "r20be-in r20be-mini", placeholder: "뒷면 이미지 주소", "aria-label": "뒷면 이미지 주소", style: "width:170px" });
            const tipIn = el("input", { class: "r20be-in r20be-mini", maxlength: "150", placeholder: "툴팁 (비우면 지움)", "aria-label": "고른 카드 툴팁", style: "width:150px" });
            bar.append(
                el("span", { class: "r20be-sepv" }),
                el("input", { class: "r20be-in r20be-mini", value: tb.pattern, "aria-label": "이름 규칙 ({n} = 번호)", style: "width:110px",
                    oninput: e => { tb.pattern = e.target.value; showPrev(); } }),
                el("input", { class: "r20be-in r20be-mini", type: "number", value: String(tb.start), "aria-label": "시작 번호", style: "width:52px",
                    oninput: e => { tb.start = parseInt(e.target.value, 10) || 1; showPrev(); } }),
                prev,
                el("button", { type: "button", class: "r20be-pri", onclick: () => {
                    sel.forEach((it, k) => setItem(it, "name", fmt(k)));
                    drawGrid(); changed();
                    setStatus(`${sel.length}장 이름을 바꿨습니다 (저장해야 Roll20에 반영)`, "ok");
                } }, "이름 적용"),
                el("span", { class: "r20be-sepv" }),
                backIn,
                el("button", { type: "button", class: "r20be-sec", onclick: () => {
                    const v = backIn.value.trim();
                    sel.forEach(it => setItem(it, "card_back", v));
                    drawGrid(); changed();
                    setStatus(`${sel.length}장 뒷면을 ${v ? "바꿨" : "덱 기본으로 돌렸"}습니다 (저장해야 Roll20에 반영)`, "ok");
                } }, "뒷면 적용"),
                el("span", { class: "r20be-sepv" }),
                tipIn,
                el("button", { type: "button", class: "r20be-sec", onclick: () => {
                    const v = tipIn.value.trim();
                    sel.forEach(it => setItem(it, "tooltip", v));
                    drawGrid(); changed();
                    setStatus(`${sel.length}장 툴팁을 ${v ? "바꿨" : "지웠"}습니다 (저장해야 Roll20에 반영)`, "ok");
                } }, "툴팁 적용"),
                el("button", { type: "button", class: "r20be-sec danger", onclick: () => {
                    sel.forEach(it => { if (it.isNew) n.items.splice(n.items.indexOf(it), 1); else it.deleted = true; });
                    n.checkedItems.clear();
                    drawGrid(); drawBar(); changed();
                    setStatus(`${sel.length}장을 지웠습니다 (저장해야 Roll20에 반영)`, "ok");
                } }, "선택 삭제"));
        };
        // 한 줄에 하나: "앞면 주소" 또는 "이름 | 앞면" 또는 "이름 | 앞면 | 뒷면" 또는 "이름 | 앞면 | 뒷면 | 툴팁"
        const addBox = el("div", { class: "r20be-add", hidden: !t.adding });
        const ta = el("textarea", { class: "r20be-in", "aria-label": "새 카드", placeholder: "한 줄에 한 장씩 · 앞면 주소만 / 이름 | 앞면 / 이름 | 앞면 | 뒷면 / 이름 | 앞면 | 뒷면 | 툴팁" });
        addBox.append(ta, el("button", { type: "button", class: "r20be-pri", onclick: () => {
            const lines = ta.value.split("\n").map(l => l.trim()).filter(Boolean);
            lines.forEach(l => {
                const p = l.split("|").map(x => x.trim());
                const [name, avatar, back, tip] = p.length > 1 ? [p[0], p[1], p[2] || "", p.slice(3).join(" | ")] : /^https?:\/\//.test(p[0]) ? ["", p[0], "", ""] : [p[0], "", "", ""];
                n.items.push(cardNode(null, { name, avatar, card_back: back, tooltip: tip.slice(0, 150) }));
            });
            ta.value = "";
            drawGrid(); changed();
            setStatus(`카드 ${lines.length}장을 추가했습니다 (저장해야 Roll20에 반영)`, "ok");
        } }, "추가"));
        drawGrid(); drawBar();
        return el("div", { class: "r20be-pane-in" }, paneHead(n),
            el("div", { class: "r20be-trow" },
                field("덱 이름", nameInput(n)),
                field("기본 뒷면 (이미지 주소)", el("input", { class: "r20be-in", value: n.cur.back,
                    oninput: e => { setField(n, "back", e.target.value.trim()); changed(); } })),
                el("span", { class: "r20be-flex" }),
                el("button", { type: "button", class: "r20be-sec", onclick: () => openMerge(n) }, "합치기…"),
                el("button", { type: "button", class: "r20be-sec", disabled: live().length < 2, onclick: () => {
                    const out = cardsOut(n);
                    if (out && !confirm(`테이블이나 손에 나가 있는 카드가 ${out}장 있어요.\n순서를 바꾼 카드는 저장할 때 새로 만들어져서, 나가 있던 카드와 이어지지 않을 수 있어요.\n덱의 '회수'로 거둔 뒤 바꾸는 걸 권해요. 그래도 열까요?`)) return;
                    openItemOrder(n, "카드", () => { drawGrid(); drawBar(); changed(); });
                } }, "순서 바꾸기…"),
                el("button", { type: "button", class: "r20be-sec", onclick: () => { t.adding = !t.adding; addBox.hidden = !t.adding; if (t.adding) ta.focus(); } }, ico("plus"), "카드 추가")),
            el("p", { class: "r20be-note" }, "게임 중인 덱은 카드를 모두 회수(Recall)한 뒤 편집하세요 · 새 카드는 덱을 섞은 뒤부터 뽑힙니다"),
            addBox, bar, grid);
    };

    // 매크로 편집칸
    const macroPane = n => el("div", { class: "r20be-pane-in" }, paneHead(n),
        el("div", { class: "r20be-grid" },
            field("매크로 이름 (#이름으로 부를 때 공백은 안 됨)", nameInput(n)),
            field("보이는 사람", el("select", { class: "r20be-in", onchange: e => { setField(n, "share", e.target.value); refreshRow(n); } },
                shareOptions(n.cur.share).map(o => el("option", { value: o.v, selected: o.v === n.cur.share }, o.v ? o.label : "나만"))))),
        el("label", { class: "r20be-chk" },
            el("input", { type: "checkbox", checked: n.cur.token, onchange: e => { setField(n, "token", e.target.checked); refreshRow(n); } }), "토큰 액션으로 보이기"),
        field("내용", el("textarea", { class: "r20be-ta mono", value: n.cur.action, spellcheck: "false", "aria-label": "매크로 내용",
            oninput: e => { setField(n, "action", e.target.value); autosize(e.target); refreshRow(n); } })));

    // 합치기: 같은 탭의 다른 굴림표·덱 항목을 이 표 끝에 복사 (저장할 때 반영)
    const openMerge = n => {
        const t = cur(), deck = n.kind === "deck", unit = deck ? "장" : "개";
        const others = t.roots.filter(x => x !== n && !x.deleted);
        const live = x => x.items.filter(it => !it.deleted);
        const picks = new Set();
        let delSrc = false;
        const sum = el("span", { class: "r20be-msum" });
        const go = el("button", { type: "button", class: "r20be-pri", disabled: true }, "합치기");
        const draw = () => {
            const add = others.filter(x => picks.has(x.id)).reduce((a, x) => a + live(x).length, 0);
            sum.textContent = picks.size ? `${picks.size}개 · ${add}${unit} 추가 → 합치면 ${live(n).length + add}${unit}` : "합칠 것을 고르세요";
            go.disabled = !picks.size;
        };
        const list = el("div", { class: "r20be-mlist" }, others.length ? others.map(x => el("label", { class: "r20be-mrow" },
            el("input", { type: "checkbox", onchange: e => { if (e.target.checked) picks.add(x.id); else picks.delete(x.id); draw(); } }),
            el("span", {}, x.cur.name || "(이름 없음)"), el("small", {}, `${live(x).length}${unit}`)))
            : el("p", { class: "r20be-empty" }, "합칠 수 있는 것이 없습니다"));
        const ov = el("div", { class: "r20be-ov" });
        const close = () => ov.remove();
        go.onclick = () => {
            const src = others.filter(x => picks.has(x.id));
            let added = 0;
            src.forEach(x => live(x).forEach(it => { n.items.push(deck ? cardNode(null, { ...it.cur }) : itemNode(null, { ...it.cur })); added++; }));
            if (delSrc) src.forEach(x => { if (x.isNew) removeNode(t, x); else x.deleted = true; });
            close();
            renderTree(); renderPane();
            setStatus(`${added}${unit}을 합쳤습니다${delSrc ? " · 고른 것은 저장할 때 삭제" : ""} (저장해야 Roll20에 반영)`, "ok");
        };
        ov.append(el("div", { class: "r20be-dlg", role: "dialog", "aria-label": "합치기" },
            el("strong", {}, `‘${n.cur.name}’에 합치기`),
            el("span", { class: "r20be-note" }, deck ? "고른 덱의 카드(이름·앞면·뒷면)를 이 덱 끝에 복사합니다." : "고른 굴림표의 항목(이름·가중치·이미지)을 이 표 끝에 복사합니다."),
            list,
            el("label", { class: "r20be-chk" }, el("input", { type: "checkbox", onchange: e => { delSrc = e.target.checked; } }), "합친 뒤 고른 것은 삭제"),
            el("div", { class: "r20be-acts" }, sum, el("span", { class: "r20be-flex" }),
                el("button", { type: "button", class: "r20be-sec", onclick: close }, "취소"), go)));
        ov.addEventListener("click", e => { if (e.target === ov) close(); });
        ov.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
        ui.root.append(ov);
        draw();
        ov.querySelector("input")?.focus();
    };

    // ── 방 이미지 탭: 왼쪽 묶음 목록, 오른쪽 그림 격자 → 덱에 넣기 · 굴림표에 넣기 · 주소 따기 ──
    const normQ = v => String(v || "").replace(/\s+/g, "").toLowerCase();
    const imgGroups = t => {
        const q = normQ(t.q), hit = it => normQ(it.name + it.uses.map(u => u.label).join("")).includes(q);
        return t.data.groups.filter(g => t.filter === "all" || g.kind === t.filter)
            .map(g => ({ g, its: q && !normQ(g.name).includes(q) ? g.list.filter(hit) : g.list })).filter(x => x.its.length);
    };
    // '전체'는 같은 그림을 한 번만 (주인 묶음 순서대로), 묶음을 고르면 그 묶음에서 쓰는 그림 전부
    const imgAll = vis => { const own = FEAT.roomImages.ownerMap(vis); return vis.flatMap(({ g, its }) => its.filter(it => own.get(it) === g)); };
    const imgList = t => { const vis = imgGroups(t), x = vis.find(v => v.g.key === t.gsel); return x ? x.its : imgAll(vis); };
    const IMG_ICON = { page: "grid", char: "char", handout: "handout", table: "rtable", deck: "deck" };
    const renderImgTree = () => {
        const t = cur(), vis = imgGroups(t);
        if (t.gsel && !vis.some(v => v.g.key === t.gsel)) t.gsel = "";
        const row = (key, icon, name, n) => `<div class="r20be-row${t.gsel === key ? " sel" : ""}" data-g="${esc(key)}" role="treeitem" aria-selected="${t.gsel === key}">`
            + `<button type="button" class="r20be-nm">${ICON[icon]}<span>${esc(name)}</span></button><span class="r20be-meta">${n}장</span></div>`;
        t.visible = [];
        ui.tree.classList.remove("r20be-icons");
        ui.tree.innerHTML = vis.length ? row("", "grid", "전체 (같은 그림은 한 번만)", imgAll(vis).length) + vis.map(v => row(v.g.key, IMG_ICON[v.g.kind], v.g.name, v.its.length)).join("")
            : `<p class="r20be-empty">${t.q ? "검색 결과가 없습니다" : "그림이 없습니다"}</p>`;
        updateBar();
    };
    const drawPagesBtn = () => {
        if (!FEAT.roomImages) return;       // 그림 묶음이 없으면 단추도 없다 (처음부터 숨김)
        const l = FEAT.roomImages.loadingNow(), t = S.images;
        ui.pagesBtn.hidden = S.tab !== "images" || (!l && !t?.data.unread);
        ui.pagesBtn.textContent = l ? `페이지 읽는 중 ${l.done}/${l.total} · 멈추기` : `안 읽은 페이지 ${t?.data.unread || 0}개 읽기`;
    };
    const imagePane = t => {
        const list = imgList(t);
        const picked = () => list.filter(it => t.checked.has(it.k));
        const bar = el("div", { class: "r20be-tbar" });
        const grid = el("div", { class: "r20be-tgrid r20be-imgs", role: "group", "aria-label": "그림" });
        grid.style.setProperty("--be-icon", VIEW.size + "px");
        grid.innerHTML = list.length ? list.map((it, i) => {
            const nm = it.name || "(이름 없음)";
            return `<div class="r20be-card" data-i="${i}" title="${esc(nm + "\n" + it.uses.map(u => u.label).join("\n"))}">`
                + `<button type="button" class="r20be-thumb r20be-ithumb" aria-label="${esc(nm)} 선택">${previewHtml(it.url)}</button>`
                + `<button type="button" class="r20be-cb2" aria-label="선택" aria-pressed="false">${ICON.check}</button>`
                + `<span class="r20be-inm">${esc(nm)}</span>${it.uses.length > 1 ? `<span class="r20be-icnt">×${it.uses.length}</span>` : ""}</div>`;
        }).join("") : `<p class="r20be-empty">그림이 없습니다</p>`;
        const sync = () => {
            grid.querySelectorAll(".r20be-card").forEach(c => {
                const on = t.checked.has(list[+c.dataset.i].k), cb = c.querySelector(".r20be-cb2");
                c.classList.toggle("chk", on); cb.classList.toggle("on", on); cb.setAttribute("aria-pressed", String(on));
            });
            drawBar();
        };
        grid.addEventListener("click", e => {
            const c = e.target.closest(".r20be-card");
            if (!c || !e.target.closest("button")) return;
            const z = +c.dataset.i, it = list[z], a = list.findIndex(x => x.k === t.lastCheck);
            if (e.shiftKey && a >= 0) list.slice(Math.min(a, z), Math.max(a, z) + 1).forEach(x => t.checked.add(x.k));
            else if (t.checked.has(it.k)) t.checked.delete(it.k); else t.checked.add(it.k);
            t.lastCheck = it.k;
            sync();
        });
        const drawBar = () => {
            const sel = picked();
            const pick = (label, fn) => el("button", { type: "button", class: "r20be-sec", onclick: () => { fn(); sync(); } }, label);
            bar.textContent = "";
            bar.classList.toggle("idle", !sel.length);
            bar.append(
                pick("전체 선택", () => list.forEach(it => t.checked.add(it.k))),
                pick("선택 반전", () => list.forEach(it => { if (t.checked.has(it.k)) t.checked.delete(it.k); else t.checked.add(it.k); })),
                pick("선택 해제", () => t.checked.clear()),
                el("strong", {}, `${sel.length}장 선택`),
                el("span", { class: "r20be-flex" }),
                ...[["deck", "덱에 넣기…"], ["table", "굴림표에 넣기…"], ["handout", "핸드아웃으로 만들기…"], ["url", "주소 따기…"]].map(([k, label]) =>
                    el("button", { type: "button", class: "r20be-sec", disabled: !sel.length, onclick: () => openImgSend(k, picked()) }, label)));
        };
        sync();
        return el("div", { class: "r20be-pane-in" }, bar, grid);
    };
    // 고른 그림 보내기: 덱 카드 · 굴림표 항목은 그 탭에 '저장 안 한 변경'으로 넣는다 (기존 편집과 같이 [저장] 때 반영)
    const openImgSend = (mode, sel) => {
        const full = it => r20img(FEAT.roomImages.sized(it.url, "max"));
        const ensure = which => {
            if (!S[which]) { if (which === "decks" ? !decksColl() : !tablesColl()) return null; S[which] = buildTab(which); }
            return S[which];
        };
        const tabsBox = el("div", { class: "r20be-chips" }), body = el("div", { class: "r20be-isend" });
        const note = el("span", { class: "r20be-note" }), applyBtn = el("button", { type: "button", class: "r20be-pri" });
        let apply = () => {};
        // 기존 것 / 새로 만들기 고르기 (덱 · 굴림표 공통)
        const target = (which, label, newName) => {
            const t = ensure(which), list = t ? t.roots.filter(n => !n.deleted) : [];
            const oldRb = el("input", { type: "radio", name: "r20be-isend", checked: list.length > 0, disabled: !list.length });
            const newRb = el("input", { type: "radio", name: "r20be-isend", checked: !list.length });
            const pickSel = el("select", { class: "r20be-in", "aria-label": `기존 ${label}`, disabled: !list.length, onfocus: () => { oldRb.checked = true; } },
                ...list.map(n => el("option", { value: n.id }, `${n.cur.name || "(이름 없음)"} (${n.items.filter(x => !x.deleted).length}${which === "decks" ? "장" : "항목"})`)));
            const nameIn = el("input", { class: "r20be-in", value: newName, "aria-label": `새 ${label} 이름`, onfocus: () => { newRb.checked = true; } });
            body.append(el("label", { class: "r20be-chk" }, oldRb, `기존 ${label}`, pickSel), el("label", { class: "r20be-chk" }, newRb, `새 ${label}`, nameIn));
            return { t, node: () => oldRb.checked ? list.find(n => n.id === pickSel.value) : null, name: () => nameIn.value.trim() };
        };
        const done = (msg, close) => {
            S.images.checked.clear();
            close(); renderPane(); updateBar();
            setStatus(msg, "ok");
        };
        const draw = close => {
            tabsBox.textContent = ""; body.textContent = "";
            [["deck", "덱에 넣기"], ["table", "굴림표에 넣기"], ["handout", "핸드아웃으로 만들기"], ["url", "주소 따기"]].forEach(([k, label]) => tabsBox.append(el("button", { type: "button",
                class: "r20be-chip" + (mode === k ? " on" : ""), "aria-pressed": String(mode === k), onclick: () => { mode = k; draw(close); } }, label)));
            if (mode === "deck") {
                const tg = target("decks", "덱", "새 덱");
                if (!tg.t) { note.textContent = "덱을 아직 불러오지 못했습니다"; applyBtn.disabled = true; return; }
                note.textContent = `카드 ${sel.length}장 · 카드 이름 = 그림 이름 · 뒷면 = 덱 기본 뒷면 · 덱 탭에서 고친 뒤 [저장]`;
                applyBtn.textContent = "넣기"; applyBtn.disabled = false;
                apply = () => {
                    let n = tg.node();
                    if (!n) {
                        n = Object.assign(mkNode("new:" + uid(), "deck", null, { name: tg.name() || "새 덱", back: "" }), { items: [], checkedItems: new Set() });
                        n.isNew = true; n.loaded = true;
                        tg.t.roots.push(n);
                    }
                    sel.forEach(it => n.items.push(cardNode(null, { name: it.name || "", avatar: full(it), card_back: "", tooltip: "" })));
                    done(`덱 '${n.cur.name}'에 카드 ${sel.length}장을 넣었습니다 · 덱 탭에서 확인 후 [저장]`, close);
                };
            } else if (mode === "table") {
                const tg = target("tables", "굴림표", "새굴림표");
                if (!tg.t) { note.textContent = "굴림표를 아직 불러오지 못했습니다"; applyBtn.disabled = true; return; }
                const wIn = el("input", { class: "r20be-in", type: "number", min: "0", value: "1", "aria-label": "항목 비중", style: "width:70px" });
                body.append(el("label", { class: "r20be-chk" }, "항목 비중", wIn));
                note.textContent = `항목 ${sel.length}개 · 항목 이름 = 그림 이름 · 굴림표 탭에서 고친 뒤 [저장]`;
                applyBtn.textContent = "넣기"; applyBtn.disabled = false;
                apply = () => {
                    let n = tg.node();
                    const w = Math.max(0, parseInt(wIn.value, 10) || 0);
                    if (!n) {
                        n = Object.assign(mkNode("new:" + uid(), "rtable", null, { name: tg.name().replace(/\s+/g, "") || "새굴림표", show: false }), { items: [], checkedItems: new Set() });
                        n.isNew = true; n.loaded = true;
                        tg.t.roots.push(n);
                    }
                    sel.forEach(it => n.items.push(itemNode(null, { name: it.name || "그림", weight: w, avatar: full(it) })));
                    done(`굴림표 '${n.cur.name}'에 항목 ${sel.length}개를 넣었습니다 · 굴림표 탭에서 확인 후 [저장]`, close);
                };
            } else if (mode === "handout") {
                // 그림 한 장 = 핸드아웃 하나 (이름 = 그림 이름, 핸드아웃 그림 = 그 그림) → 저널 탭에 저장 안 한 변경으로
                const t = S.journal || (S.journal = buildTab("journal"));
                const folderSel = el("select", { class: "r20be-in", "aria-label": "넣을 폴더" },
                    el("option", { value: "" }, "맨 위 (폴더 밖)"), ...groupList(t).map(({ n, label }) => el("option", { value: n.id }, label)));
                const shareSel = el("select", { class: "r20be-in", "aria-label": "보이는 사람" }, ...shareOptions("").map(o => el("option", { value: o.v }, o.label)));
                body.append(el("div", { class: "r20be-grid" }, field("넣을 폴더", folderSel), field("보이는 사람", shareSel)));
                note.textContent = `핸드아웃 ${sel.length}개 · 이름 = 그림 이름 · 저널 탭에서 고친 뒤 [저장]`;
                applyBtn.textContent = "만들기"; applyBtn.disabled = false;
                apply = () => {
                    const parent = folderSel.value ? find(t, folderSel.value) : null;
                    sel.forEach(it => {
                        const n = mkNode("new:" + uid(), "handout", null, { name: it.name || "그림", share: shareSel.value });
                        n.isNew = true; n.loaded = true; n.parent = parent;
                        CONTENT.forEach(k => { n.raw[k] = ""; n.origText[k] = ""; n.cur[k] = ""; initMode(n, k); });
                        n.copyAttrs = { avatar: full(it) };
                        listOf(t, parent).push(n);
                    });
                    t.structDirty = true;
                    if (parent) t.collapsed.delete(parent.id);
                    done(`핸드아웃 ${sel.length}개를 만들었습니다 · 저널 탭에서 확인 후 [저장]`, close);
                };
            } else {
                const fmt = el("select", { class: "r20be-in", "aria-label": "모양" },
                    el("option", { value: "url" }, "주소만 (한 줄에 하나)"), el("option", { value: "q" }, "매크로 질문 ?{…|이름,주소}"));
                const size = el("select", { class: "r20be-in", "aria-label": "크기" },
                    el("option", { value: "max" }, "원본 (max)"), el("option", { value: "med" }, "중간 (med)"), el("option", { value: "thumb" }, "작게 (thumb)"));
                const qIn = el("input", { class: "r20be-in", value: "그림 선택", "aria-label": "질문 문구" });
                const out = el("textarea", { class: "r20be-in mono", readOnly: true, "aria-label": "결과", style: "height:120px" });
                const qRow = el("label", { class: "r20be-chk" }, "질문 문구", qIn);
                const make = () => {
                    const urls = sel.map(it => r20img(FEAT.roomImages.sized(it.url, size.value)));
                    qRow.hidden = fmt.value !== "q";
                    out.value = fmt.value === "q" ? `?{${qEsc(qIn.value)}|` + sel.map((it, i) => `${qEsc(it.name || "그림 " + (i + 1))},${urls[i]}`).join("|") + "}" : urls.join("\n");
                };
                [fmt, size].forEach(x => x.addEventListener("change", make));
                qIn.addEventListener("input", make);
                body.append(el("div", { class: "r20be-grid" }, field("모양", fmt), field("크기", size)), qRow, out);
                make();
                note.textContent = `주소 ${sel.length}개 · 질문 모양은 매크로 썸네일 선택 창에서 그림으로 보여요`;
                applyBtn.textContent = "복사"; applyBtn.disabled = false;
                apply = async () => {
                    const ok = await copyText(out.value);
                    if (ok) done(`주소 ${sel.length}개를 복사했습니다`, close);
                    else setStatus("복사하지 못했습니다 — 결과 칸을 직접 복사해 주세요", "err");
                };
            }
        };
        applyBtn.onclick = () => apply();
        openDialog(`고른 그림 ${sel.length}장`, close => {
            draw(close);
            return [tabsBox, body, el("div", { class: "r20be-acts" }, note, el("span", { class: "r20be-flex" }),
                el("button", { type: "button", class: "r20be-sec", onclick: close }, "취소"), applyBtn)];
        });
    };

    const renderPane = () => {
        const t = cur();
        noteOff();
        ui.pane.textContent = "";
        if (t.which === "images") { ui.pane.append(imagePane(t)); return; }
        const checked = allNodes(t).filter(n => t.checked.has(n.id));
        const n = t.sel && find(t, t.sel);
        ui.pane.append(checked.length >= 2 ? bulkPane(checked)
            : !n ? el("p", { class: "r20be-empty" }, "왼쪽에서 항목을 고르세요")
            : n.kids ? groupPane(n) : n.kind === "rtable" ? tablePane(n) : n.kind === "deck" ? deckPane(n) : n.kind === "macro" ? macroPane(n)
            : n.kind === "track" ? trackPane(n) : docPane(n));
        ui.pane.querySelectorAll(".r20be-ta").forEach(autosize);
        ui.pane.querySelectorAll(".r20be-rte").forEach(noteOn);
    };

    // ── 만들기 · 복제 · 삭제 (모두 저장할 때 반영) ──
    const createNode = kind => {
        const t = cur(), sel = t.sel && find(t, t.sel);
        // 고른 게 폴더면 그 안, 항목이면 같은 폴더, 없으면 맨 위. 주크박스 플레이리스트는 겹치지 않음
        const parent = ["group", "rtable", "macro", "deck"].includes(kind) || !sel ? null : sel.kids ? sel : sel.parent;
        // 폴더는 구조에만 있으므로 바로 쓸 ID, 항목은 저장 때 Roll20 ID로 바뀌는 임시 ID
        const n = kind === "folder" || kind === "group" ? mkNode(uid(), kind, null, { name: `새 ${KIND_NAME[kind]}` })
            : kind === "rtable" ? Object.assign(mkNode("new:" + uid(), kind, null, { name: "새굴림표", show: false }), { items: [], checkedItems: new Set() })
            : kind === "deck" ? Object.assign(mkNode("new:" + uid(), kind, null, { name: "새 덱", back: "" }), { items: [], checkedItems: new Set() })
            : kind === "macro" ? mkNode("new:" + uid(), kind, null, { name: "새매크로", action: "", share: "", token: false })
            : mkNode("new:" + uid(), kind, null, { name: `새 ${KIND_NAME[kind]}`, share: "" });
        n.isNew = true; n.loaded = true; n.parent = parent;
        CONTENT.forEach(k => { n.raw[k] = ""; n.origText[k] = ""; n.cur[k] = ""; initMode(n, k); });
        // 새 플레이리스트는 기존 플레이리스트의 설정(재생 방식 등)을 따른다
        if (kind === "group") n.extra = { ...(allNodes(t).find(x => x.kids)?.extra || {}) };
        listOf(t, parent).push(n);
        if (parent) t.collapsed.delete(parent.id);
        if (kind !== "rtable") t.structDirty = true;
        t.sel = n.id; t.q = "";
        if (t.filter !== "all" && t.filter !== kind) t.filter = "all";      // 모아보기 중이면 그 종류는 그대로 둔다
        render();
        const row = rowEl(n.id);
        if (!row) return;
        row.scrollIntoView({ block: "nearest" });
        // 아이콘 보기에는 칸 안 이름 입력이 없어 오른쪽 이름칸으로 바로 간다
        if (iconMode(t)) { if (!t.checked.size) { const inp = ui.pane.querySelector("input.r20be-in"); inp?.focus(); inp?.select(); } }
        else startRename(row, n);
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
    // 굴림표 · 덱 복제: 항목(카드)과 설정까지 새로 만든다. Roll20 은 만든 순서로 보여 주므로 복제본은 맨 뒤에 생긴다
    // → '복제 후 원본 삭제'를 원하는 순서로 하면 목록 순서를 정리할 수 있다
    const NO_COPY = new Set(["id", "name", "cards", "tableitems", "currentDeck", "currentIndex", "currentCardShown", "discardPile", "removedcards"]);
    const copyAttrsOf = m => Object.fromEntries(Object.entries(m.attributes || {}).filter(([k, v]) => !NO_COPY.has(k) && (v === null || typeof v !== "object")));
    const dupCollection = (t, n, moveOrig) => {
        const deck = n.kind === "deck";
        const name = moveOrig ? n.cur.name : deck ? `${n.cur.name} 사본` : `${n.cur.name}-사본`;
        const d = Object.assign(mkNode("new:" + uid(), n.kind, null, { ...n.cur, name }), {
            items: n.items.filter(it => !it.deleted).map(it => deck ? cardNode(null, { ...it.cur }) : itemNode(null, { ...it.cur })),
            checkedItems: new Set(), copyAttrs: n.model ? copyAttrsOf(n.model) : n.copyAttrs, copyOf: n });
        d.isNew = true; d.dupOf = n.model;
        t.roots.push(d);
        if (moveOrig) { if (n.isNew) removeNode(t, n); else { n.deleted = true; n.movedTo = d; } }
        return d;
    };
    const dupMany = (list, moveOrig) => {
        const t = cur(), ordered = t.roots.filter(x => list.includes(x) && !x.deleted);       // 목록 순서대로
        let last = null;
        ordered.forEach(n => { last = dupCollection(t, n, moveOrig); });
        t.checked.clear();
        if (last) t.sel = last.id;
        renderTree(); renderPane();
        setStatus(`${ordered.length}개 ${moveOrig ? "복제 후 원본 삭제 — 저장하면 복제본이 맨 뒤에 생기고 원본은 지워집니다" : "복제 — 저장하면 맨 뒤에 생깁니다"}`
            + (moveOrig && t.which === "decks" ? " (게임판·손에 꺼내 둔 원본 덱 카드는 함께 사라질 수 있어요)" : ""), "ok");
    };
    // ── 새 굴림표 템플릿: 주사위 꼴에 맞춰 번호·비중을 미리 채운다 ──
    const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
    const TABLE_TPL = [
        ["blank", "빈 표", "항목 없이 만듭니다 · 오른쪽에 내용을 넣으면 한 줄이 한 항목 (비중 1)", () => []],
        ["1d6", "1d6", "1~6 · 모두 같은 확률", () => range(1, 6).map(i => [String(i), 1])],
        ["2d6", "2d6", "2~12 · 비중 1·2·3·4·5·6·5·4·3·2·1 (36분의 몇)", () => range(2, 12).map(i => [String(i), 6 - Math.abs(7 - i)])],
        ["1d10", "1d10", "1~10 · 모두 같은 확률", () => range(1, 10).map(i => [String(i), 1])],
        ["d66", "D66", "작은 눈이 십의 자리 (11~16, 22~26 … 66) · 같은 눈 비중 1, 나머지 2", () =>
            range(1, 6).flatMap(a => range(a, 6).map(b => [String(a * 10 + b), a === b ? 1 : 2]))]
    ];
    // 편집기 위에 뜨는 작은 창: body(close) 가 내용 요소 목록을 돌려준다
    const openDialog = (title, body) => {
        const ov = el("div", { class: "r20be-ov" });
        const close = () => ov.remove();
        ov.append(el("div", { class: "r20be-dlg wide", role: "dialog", "aria-label": title }, el("strong", {}, title), ...body(close)));
        ov.addEventListener("click", e => { if (e.target === ov) close(); });
        ov.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
        ui.root.append(ov);
        ov.querySelector("input, textarea")?.focus();
        return close;
    };
    const openTableTemplate = () => {
        const t = cur();
        let tpl = "2d6";
        const nameIn = el("input", { class: "r20be-in", value: "새굴림표", "aria-label": "굴림표 이름" });
        const chips = el("div", { class: "r20be-chips" }), desc = el("span", { class: "r20be-note" });
        const prev = el("div", { class: "r20be-tprev" }), count = el("span", {});
        const ta = el("textarea", { class: "r20be-in", "aria-label": "항목 내용", placeholder: "한 줄에 하나씩 — 위에서부터 번호 순서대로 채웁니다. 비우면 번호만." });
        const numCb = el("input", { type: "checkbox", checked: true });
        // 템플릿 + 붙여 넣은 내용 → [이름, 비중] 목록
        const rows = () => {
            const lines = ta.value.split("\n").map(l => l.trim());
            while (lines.length && !lines[lines.length - 1]) lines.pop();
            const base = TABLE_TPL.find(x => x[0] === tpl)[3]();
            const list = tpl === "blank" ? lines.filter(Boolean).map((_, i) => [String(i + 1), 1]) : base;
            const filled = tpl === "blank" ? lines.filter(Boolean) : lines;
            return list.map(([label, w], i) => {
                const line = filled[i] || "";
                return [line ? (numCb.checked ? `${label} ${line}` : line) : label, w, label];
            });
        };
        const draw = () => {
            chips.textContent = "";
            TABLE_TPL.forEach(([k, label]) => chips.append(el("button", { type: "button", class: "r20be-chip" + (tpl === k ? " on" : ""), "aria-pressed": String(tpl === k),
                onclick: () => { tpl = k; draw(); } }, label)));
            desc.textContent = TABLE_TPL.find(x => x[0] === tpl)[2];
            const list = rows(), total = list.reduce((a, r) => a + r[1], 0) || 1;
            count.textContent = `항목 ${list.length}칸`;
            prev.textContent = "";
            list.forEach(([name, w]) => prev.append(el("div", {}, el("span", {}, name), el("span", {}, `비중 ${w}`), el("span", {}, `${(w / total * 100).toFixed(1)}%`))));
            if (!list.length) prev.append(el("p", { class: "r20be-empty" }, "항목 없음"));
        };
        ta.addEventListener("input", draw);
        numCb.addEventListener("change", draw);
        openDialog("새 굴림표", close => [
            field("이름 (공백 불가)", nameIn),
            el("div", { class: "r20be-fld" }, el("span", { class: "r20be-lb" }, "템플릿"), chips, desc),
            el("div", { class: "r20be-tsplit" },
                el("div", { class: "r20be-fld" }, el("span", { class: "r20be-lb" }, "미리보기 · ", count), prev),
                el("div", { class: "r20be-fld" }, el("span", { class: "r20be-lb" }, "항목 내용 (선택)"), ta,
                    el("label", { class: "r20be-chk" }, numCb, "앞에 번호 붙이기 (예: 2 ○○○)"))),
            el("div", { class: "r20be-acts" }, el("span", { class: "r20be-note" }, "만든 뒤에도 편집칸에서 고칠 수 있어요 · 저장해야 Roll20에 반영"),
                el("span", { class: "r20be-flex" }),
                el("button", { type: "button", class: "r20be-sec", onclick: close }, "취소"),
                el("button", { type: "button", class: "r20be-pri", onclick: () => {
                    const n = Object.assign(mkNode("new:" + uid(), "rtable", null, { name: nameIn.value.replace(/\s+/g, "") || "새굴림표", show: false }), {
                        items: rows().map(([name, weight]) => itemNode(null, { name, weight, avatar: "" })), checkedItems: new Set() });
                    n.isNew = true; n.loaded = true;
                    t.roots.push(n);
                    t.sel = n.id; t.q = "";
                    close(); render();
                    rowEl(n.id)?.scrollIntoView({ block: "nearest" });
                    setStatus(`굴림표 '${n.cur.name}'(${n.items.length}칸)을 만들었습니다 (저장해야 Roll20에 반영)`, "ok");
                } }, "만들기"))]);
        draw();
    };

    // ── 굴림표 → 굴림 매크로: [[1t[?{질문|보이는 이름,표 이름|…}]]] ──
    const qEsc = v => String(v).replace(/\|/g, "&#124;").replace(/,/g, "&#44;").replace(/}/g, "&#125;");
    const DIVIDER = /^-{3,}$/;
    const buildRollMacro = (question, text) => {
        const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
        const split = l => { const i = l.lastIndexOf(","); return i < 0 ? [l, l] : [l.slice(0, i).trim(), l.slice(i + 1).trim()]; };
        const tables = lines.filter(l => !DIVIDER.test(l));
        if (tables.length === 1 && lines.length === 1) return `[[1t[${split(lines[0])[1]}]]]`;
        return `[[1t[?{${qEsc(question)}|` + lines.map(l => DIVIDER.test(l) ? "------------------------------" : split(l).map(qEsc).join(",")).join("|") + "}]]]";
    };
    const openRollMacro = list => {
        const t = cur(), tables = t.roots.filter(x => list.includes(x) && !x.deleted);       // 목록 순서대로
        const nameIn = el("input", { class: "r20be-in", value: "표굴림", "aria-label": "매크로 이름" });
        const qIn = el("input", { class: "r20be-in", value: "표 선택", "aria-label": "질문 문구" });
        const ta = el("textarea", { class: "r20be-in mono", "aria-label": "목록", value: tables.map(x => `${x.cur.name}, ${x.cur.name}`).join("\n") });
        const tokCb = el("input", { type: "checkbox" });
        const prev = el("div", { class: "r20be-mprev" });
        const draw = () => { prev.textContent = buildRollMacro(qIn.value, ta.value); };
        [qIn, ta].forEach(x => x.addEventListener("input", draw));
        openDialog("굴림 매크로 만들기", close => [
            el("span", { class: "r20be-note" }, `고른 굴림표 ${tables.length}개 · 한 줄에 '보이는 이름, 표 이름' · 줄 순서 = 메뉴 순서 · '---' 줄은 구분선`),
            el("div", { class: "r20be-grid" }, field("매크로 이름", nameIn), field("질문 문구", qIn)),
            field("목록", ta),
            el("div", { class: "r20be-fld" }, el("span", { class: "r20be-lb" }, "미리보기"), prev),
            el("div", { class: "r20be-acts" },
                el("label", { class: "r20be-chk" }, tokCb, "토큰 액션으로 보이기"),
                el("span", { class: "r20be-flex" }),
                el("button", { type: "button", class: "r20be-sec", onclick: close }, "취소"),
                el("button", { type: "button", class: "r20be-sec", onclick: async () => {
                    const ok = await copyText(prev.textContent);
                    setStatus(ok ? "매크로 내용을 복사했습니다" : "복사하지 못했습니다 — 미리보기를 직접 복사해 주세요", ok ? "ok" : "err");
                } }, "복사만"),
                el("button", { type: "button", class: "r20be-pri", onclick: () => {
                    if (!macrosColl()) { setStatus("매크로를 아직 불러오지 못했습니다 — [복사만]을 써 주세요", "err"); return; }
                    if (!S.macros) S.macros = buildTab("macros");
                    const m = mkNode("new:" + uid(), "macro", null, { name: nameIn.value.trim() || "표굴림", action: prev.textContent, share: "", token: tokCb.checked });
                    m.isNew = true; m.loaded = true;
                    S.macros.roots.push(m);
                    S.macros.sel = m.id;
                    close(); updateBar();
                    setStatus(`매크로 탭에 '${m.cur.name}'을 만들었습니다 (저장해야 Roll20에 반영)`, "ok");
                } }, "매크로로 만들기"))]);
        draw();
    };

    // 지우기는 만들기 · 고치기가 다 끝난 뒤에. '복제 후 원본 삭제'의 복제본이 다 만들어지지 않았으면 원본을 남긴다
    const deleteRoots = async (t, attempt) => {
        for (const n of [...t.roots]) {
            if (!n.deleted) continue;
            if (n.isNew) { removeNode(t, n); continue; }
            const copy = n.movedTo;
            if (copy && (copy.isNew || copy.items.some(it => it.isNew))) {
                await attempt(n.cur.name, async () => { throw new Error("복제본을 다 만들지 못해 원본을 남김"); });
                continue;
            }
            await attempt(n.cur.name, async () => { n.model.destroy(); removeNode(t, n); });
        }
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
            n.model = window.Jukebox.playlist.create({ title: n.cur.name, source: a.source, track_id: a.track_id,
                volume: n.cur.vol, loop: n.cur.loop, tags: n.cur.tags ?? (a.tags || ""), playing: false, softstop: false });
        } else {
            const [bn, bg] = BLOBS[n.kind], blobs = {};
            if (n.dupOf) {          // 원본 내용을 먼저 읽고 나서 만든다
                blobs[bn] = await getBlob(n.dupOf, bn);
                blobs[bg] = await getBlob(n.dupOf, bg);
            } else {
                if (n.cur.notes) blobs[bn] = encodeBlob(toHtml(n, "notes"));
                if (n.cur.gm) blobs[bg] = encodeBlob(toHtml(n, "gm"));
            }
            const base = n.dupOf ? n.dupOf.toJSON() : { ...(n.copyAttrs || {}) };
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
        if (n.changed.has("tags")) a.tags = n.cur.tags;
        const html = {};
        CONTENT.forEach((k, i) => {
            if (!n.changed.has(k)) return;
            html[k] = toHtml(n, k);
            blobs[BLOBS[n.kind][i]] = encodeBlob(html[k], n.enc[k]);
        });
        if (Object.keys(blobs).length) n.model.updateBlobs(blobs);
        n.model.save(a);
        // 저장한 값을 새 기준으로
        CONTENT.forEach(k => { if (k in html) { n.raw[k] = html[k]; n.origText[k] = htmlToText(html[k]); } });
        n.orig = { ...n.orig, ...n.cur };
        n.changed.clear();
    };

    const saveTables = async (t, attempt) => {
        const coll = tablesColl();
        for (const n of [...t.roots]) {
            if (n.deleted) continue;        // 지우기는 deleteRoots 에서 마지막에
            if (n.isNew) await attempt(n.cur.name, async () => {
                n.model = coll.create({ ...(n.copyAttrs || {}), name: n.cur.name, showplayers: !!n.cur.show });
                if (!n.model?.id) throw new Error("생성 실패");
                const old = n.id;
                n.id = n.model.id; n.isNew = false; n.orig = { ...n.cur }; n.changed.clear();
                if (t.sel === old) t.sel = n.id;
            });
            else if (n.changed.size) await attempt(n.cur.name, async () => {
                const a = {};
                if (n.changed.has("name")) a.name = n.cur.name;
                if (n.changed.has("show")) a.showplayers = !!n.cur.show;
                n.model.save(a);
                n.orig = { ...n.cur }; n.changed.clear();
            });
            if (n.isNew || !n.model?.tableitems) continue;      // 표를 못 만들었으면 항목도 건너뛴다
            for (const it of [...n.items]) {
                const label = `${n.cur.name} · ${it.cur.name || "항목"}`;
                if (it.deleted) await attempt(label, async () => { if (!it.isNew) it.model.destroy(); n.items.splice(n.items.indexOf(it), 1); });
                else if (it.isNew) await attempt(label, async () => {
                    it.model = n.model.tableitems.create({ name: it.cur.name, avatar: it.cur.avatar, weight: it.cur.weight });
                    if (!it.model?.id) throw new Error("생성 실패");
                    it.id = it.model.id; it.isNew = false; it.orig = { ...it.cur };
                });
                else if (it.moved) await attempt(label, async () => {      // 순서를 바꾼 항목: 새 자리에 다시 만들고 옛것을 지운다
                    const m = n.model.tableitems.create({ name: it.cur.name, avatar: it.cur.avatar, weight: it.cur.weight });
                    if (!m?.id) throw new Error("생성 실패");
                    const was = it.id;
                    it.model.destroy();
                    it.model = m; it.id = m.id; it.moved = false; it.orig = { ...it.cur }; it.changed.clear();
                    if (n.checkedItems.delete(was)) n.checkedItems.add(it.id);
                });
                else if (it.changed.size) await attempt(label, async () => {
                    const a = {};
                    it.changed.forEach(k => { a[k] = it.cur[k]; });
                    it.model.save(a);
                    it.orig = { ...it.cur }; it.changed.clear();
                });
            }
            n.items.filter(it => !it.deleted && !it.isNew).forEach((it, k) => { it.ord = k; });       // 저장한 순서가 새 기준
        }
    };

    // 매크로: 편집칸 키 → Roll20 속성
    const MACRO_ATTR = { name: "name", action: "action", share: "visibleto", token: "istokenaction" };
    const saveMacros = async (t, attempt) => {
        const coll = macrosColl();
        for (const n of [...t.roots]) {
            if (n.deleted) {
                if (!n.isNew) await attempt(n.cur.name, async () => { n.model.destroy(); removeNode(t, n); });
                else removeNode(t, n);
                continue;
            }
            if (n.isNew) await attempt(n.cur.name, async () => {
                const a = {};
                Object.entries(MACRO_ATTR).forEach(([k, r]) => { a[r] = n.cur[k]; });
                n.model = coll.create(a);
                if (!n.model?.id) throw new Error("생성 실패");
                const old = n.id;
                n.id = n.model.id; n.isNew = false; n.dupOf = null; n.orig = { ...n.cur }; n.changed.clear();
                if (t.sel === old) t.sel = n.id;
            });
            else if (n.changed.size) await attempt(n.cur.name, async () => {
                const a = {};
                n.changed.forEach(k => { if (MACRO_ATTR[k]) a[MACRO_ATTR[k]] = n.cur[k]; });
                n.model.save(a);
                n.orig = { ...n.cur }; n.changed.clear();
            });
        }
    };
    const saveDecks = async (t, attempt) => {
        const coll = decksColl();
        for (const n of [...t.roots]) {
            if (n.deleted) continue;        // 지우기는 deleteRoots 에서 마지막에
            if (n.isNew) await attempt(n.cur.name, async () => {
                n.model = coll.create({ ...(n.copyAttrs || {}), name: n.cur.name, avatar: n.cur.back });
                if (!n.model?.id) throw new Error("생성 실패");
                const old = n.id;
                n.id = n.model.id; n.isNew = false; n.orig = { ...n.cur }; n.changed.clear();
                if (t.sel === old) t.sel = n.id;
            });
            else if (n.changed.size) await attempt(n.cur.name, async () => {
                const a = {};
                if (n.changed.has("name")) a.name = n.cur.name;
                if (n.changed.has("back")) a.avatar = n.cur.back;
                n.model.save(a);
                n.orig = { ...n.cur }; n.changed.clear();
            });
            if (n.isNew) continue;      // 덱을 못 만들었으면 카드도 건너뛴다
            if (!n.model?.cards) {
                // 카드 목록이 아직 없으면 실패로 남겨 다시 저장할 수 있게 한다
                if (n.items.some(itemDirty)) await attempt(`${n.cur.name} · 카드`, async () => { throw new Error("덱의 카드 목록을 찾지 못함"); });
                continue;
            }
            const gone = new Set(), remap = new Map();
            for (const it of [...n.items]) {
                const label = `${n.cur.name} · ${it.cur.name || "카드"}`;
                if (it.deleted) await attempt(label, async () => {
                    if (!it.isNew) { gone.add(it.model.id); it.model.destroy(); }
                    n.items.splice(n.items.indexOf(it), 1);
                });
                else if (it.isNew) await attempt(label, async () => {
                    it.model = n.model.cards.create({ name: it.cur.name, avatar: it.cur.avatar, card_back: it.cur.card_back, tooltip: it.cur.tooltip });
                    if (!it.model?.id) throw new Error("생성 실패");
                    it.id = it.model.id; it.isNew = false; it.orig = { ...it.cur };
                });
                else if (it.moved) await attempt(label, async () => {      // 순서를 바꾼 카드: 새 자리에 다시 만들고 옛것을 지운다 (더미 목록의 id 는 아래에서 바꾼다)
                    const m = n.model.cards.create({ name: it.cur.name, avatar: it.cur.avatar, card_back: it.cur.card_back, tooltip: it.cur.tooltip });
                    if (!m?.id) throw new Error("생성 실패");
                    const was = it.id;
                    it.model.destroy();
                    remap.set(was, m.id);
                    it.model = m; it.id = m.id; it.moved = false; it.orig = { ...it.cur }; it.changed.clear();
                    if (n.checkedItems.delete(was)) n.checkedItems.add(it.id);
                });
                else if (it.changed.size) await attempt(label, async () => {
                    const a = {};
                    it.changed.forEach(k => { a[k] = it.cur[k]; });
                    it.model.save(a);
                    it.orig = { ...it.cur }; it.changed.clear();
                });
            }
            // 지운 카드가 뽑을 순서·버린 더미 목록에 남아 있지 않게 · 다시 만든 카드는 옛 id 자리에 새 id 를 (섞은 순서 그대로)
            if (gone.size || remap.size) await attempt(`${n.cur.name} · 덱 순서`, async () => {
                const a = {};
                const fix = ids => ids.filter(id => !gone.has(id)).map(id => remap.get(id) || id);
                ["currentDeck", "discardPile", "removedcards"].forEach(k => {
                    const v = n.model.get(k);
                    if (Array.isArray(v)) { const nv = fix(v); if (nv.join() !== v.join()) a[k] = nv; }
                    else if (typeof v === "string" && v) { const nv = fix(v.split(",").filter(Boolean)).join(","); if (nv !== v) a[k] = nv; }
                });
                if (Object.keys(a).length) n.model.save(a);
            });
            n.items.filter(it => !it.deleted && !it.isNew).forEach((it, k) => { it.ord = k; });       // 저장한 순서가 새 기준
        }
    };

    const save = async () => {
        noteFlush();
        if (saving || !dirtyCount()) return;
        if (!isGM()) { setStatus("GM 만 저장할 수 있어요", "err"); return; }
        const dels = builtTabs().flatMap(t => allNodes(t).flatMap(n => [
            ...(n.deleted && !n.isNew ? [n.cur.name] : []),
            ...(n.items || []).filter(it => it.deleted && !it.isNew).map(it => `${n.cur.name} · ${it.cur.name || "항목"}`)]));
        if (dels.length && !confirm(`${dels.length}개 항목을 Roll20에서 삭제합니다. 되돌릴 수 없습니다.\n\n`
            + dels.slice(0, 10).map(name => "· " + name).join("\n") + (dels.length > 10 ? "\n…" : "") + "\n\n계속할까요?")) return;
        saving = true; updateBar(); setStatus("저장 중…");
        const total = dirtyCount(), errs = [];
        const attempt = async (label, fn) => {
            try { await fn(); } catch (e) { console.warn("[일괄 편집기] 저장 실패:", label, e); errs.push(label); }
        };
        for (const t of builtTabs()) {
            if (t.which === "tables") { await saveTables(t, attempt); await deleteRoots(t, attempt); continue; }
            if (t.which === "decks") { await saveDecks(t, attempt); await deleteRoots(t, attempt); continue; }
            if (t.which === "macros") { await saveMacros(t, attempt); continue; }
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
        const keep = TABS.map(k => S[k] && { k, sel: S[k].sel, collapsed: S[k].collapsed, filter: S[k].filter, q: S[k].q, ctab: S[k].ctab });
        TABS.forEach(k => { S[k] = null; });
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
        ui.segT.classList.toggle("on", S.tab === "tables");
        ui.segM.classList.toggle("on", S.tab === "macros");
        ui.segD.classList.toggle("on", S.tab === "decks");
        ui.segI.classList.toggle("on", S.tab === "images");
        ui.search.value = t.q;
        ui.search.placeholder = { tables: "굴림표 이름 검색", macros: "매크로 이름·내용 검색", decks: "덱 이름 검색", images: "이름·사용처 검색" }[t.which] || "이름 검색";
        ui.newBtn.hidden = t.which === "images";
        drawPagesBtn();
        ui.newLabel.textContent = isFlat(t) ? `새 ${KIND_NAME[t.filter]}` : { tables: "새 굴림표", macros: "새 매크로", decks: "새 덱" }[t.which] || "새로 만들기";
        const defs = t.which === "journal" ? [["all", "전체"], ["handout", "핸드아웃만"], ["char", "캐릭터만"]]
            : t.which === "bgm" ? [["all", "전체"], ["track", "트랙"], ["group", "플레이리스트"]]
            : t.which === "images" ? [["all", "전체"], ["page", "페이지"], ["char", "캐릭터"], ["handout", "핸드아웃"], ["table", "굴림표"], ["deck", "덱"]] : [];
        ui.chips.textContent = "";
        defs.forEach(([k, label]) => ui.chips.append(el("button", { type: "button", class: "r20be-chip" + (t.filter === k ? " on" : ""),
            "aria-pressed": String(t.filter === k), onclick: () => { t.filter = k; render(); } }, label)));
        ui.view.hidden = !isFlat(t);
        ui.zoom.hidden = !iconMode(t) && t.which !== "images";
        ui.fold.hidden = !(t.which === "journal" || t.which === "bgm") || isFlat(t);
        ui.bkBtn.hidden = t.which !== "bgm" || !FEAT.jbBackup || !btnVisible.jbrow;
        if (t.which !== "bgm") ui.bk.hidden = true;
        [[ui.vList, !VIEW.icons], [ui.vGrid, VIEW.icons]].forEach(([b, on]) => { b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); });
        if (ui.foot.className === "r20be-foot") setStatus();      // 안내문만 보기 방식에 맞춘다 (알림 문구는 그대로)
        renderTree(); renderPane();
    };
    const switchTab = tab => {
        if (tab === "bgm" && !window.Jukebox?.playlist) { setStatus("주크박스를 아직 불러오지 못했습니다", "err"); return; }
        if (tab === "tables" && !tablesColl()) { setStatus("굴림표를 아직 불러오지 못했습니다", "err"); return; }
        if (tab === "macros" && !macrosColl()) { setStatus("매크로를 아직 불러오지 못했습니다", "err"); return; }
        if (tab === "decks" && !decksColl()) { setStatus("덱을 아직 불러오지 못했습니다", "err"); return; }
        S.tab = tab;
        if (!S[tab]) S[tab] = buildTab(tab);
        ui.menu.hidden = true;
        render();
    };
    // 주크박스 백업: 시점마다 폴더 수 · 폴더 안 곡 수. 저장 안 한 변경이 있으면 되돌리지 않는다(편집 중인 나무가 덮어쓸 수 있다)
    const toggleBackups = async () => {
        if (!ui.bk.hidden) { ui.bk.hidden = true; return; }
        const B = FEAT.jbBackup, snaps = B ? await B.list() : [], dirty = dirtyCount() > 0;
        ui.bk.textContent = "";
        ui.bk.append(el("p", {}, snaps.length ? "이 브라우저에 남은 주크박스 폴더 백업이에요. 되돌리면 백업 뒤에 폴더에 넣은 곡은 같은 이름 폴더에 붙어요."
            : "아직 백업이 없어요. GM 으로 방에 들어오면 자동으로 저장돼요."));
        if (dirty) ui.bk.append(el("p", {}, "저장하지 않은 변경이 있어서 되돌릴 수 없어요. 먼저 [저장] 또는 [되돌리기]를 해 주세요."));
        snaps.forEach((s, i) => ui.bk.append(el("div", { class: "row" + (s.flag === "drop" ? " drop" : "") },
            el("span", {}, `${B.fmt(s)}${i === 0 ? " · 지금" : ""}${s.flag === "drop" ? " · 곡이 빠짐" : ""}`, el("br"), el("small", {}, `폴더 ${s.folders} · 폴더 안 ${s.inF.toLocaleString()}곡 · 전체 ${s.tracks.toLocaleString()}곡`)),
            el("button", { type: "button", disabled: dirty || i === 0, onclick: async e => {
                e.target.disabled = true; e.target.textContent = "되돌리는 중…";
                const ok = await B.restore(s);
                ui.bk.hidden = true;
                if (!ok) return setStatus("되돌리지 못했습니다", "err");
                S.bgm = null;
                setTimeout(() => { switchTab("bgm"); setStatus(`${B.fmt(s)} 백업으로 되돌렸습니다`, "ok"); }, 600);
            } }, "되돌리기"))));
        ui.bk.hidden = false;
    };
    const toggleMenu = () => {
        if (!ui.menu.hidden) { ui.menu.hidden = true; return; }
        const t = cur(), hasGroup = allNodes(t).some(n => n.kids);
        // 핸드아웃·캐릭터 모아보기 중이거나 굴림표 탭이면 메뉴 없이 바로 만든다
        if (isFlat(t)) return createNode(t.filter);
        if (t.which === "tables") return openTableTemplate();
        if (t.which === "macros") return createNode("macro");
        if (t.which === "decks") return createNode("deck");
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
        ui.root.addEventListener("error", onImgError, true);
        tr.addEventListener("click", e => {
            if (cur().which === "images") {
                const r = e.target.closest(".r20be-row[data-g]");
                if (!r) return;
                const t = cur();
                t.gsel = r.dataset.g; t.checked.clear(); t.lastCheck = null;
                renderTree(); renderPane(); ui.pane.scrollTop = 0;
                return;
            }
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
            if (!row || !["journal", "bgm"].includes(cur().which)) { e.preventDefault(); return; }
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
                p.style.left = zpx(Math.min(Math.max(0, r.left + ev.clientX - sx), window.innerWidth - 80));
                p.style.top = zpx(Math.min(Math.max(0, r.top + ev.clientY - sy), window.innerHeight - 40));
            };
            const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); keep(); };
            window.addEventListener("mousemove", mv);
            window.addEventListener("mouseup", up);
        });
        p.addEventListener("mouseup", keep);    // 모서리로 크기를 바꾼 뒤 기억
        p.addEventListener("keydown", e => {
            e.stopPropagation();    // Roll20 단축키(토큰 삭제 등)로 새지 않게
            if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown") && ui.pane.querySelector(".r20be-docnav")) { e.preventDefault(); stepDoc(e.key === "ArrowUp" ? -1 : 1); }
        });
        // Roll20이 휠·터치패드 스크롤을 맵 확대/이동용으로 가로채므로 창 안의 스크롤은 직접 처리한다
        // (Roll20 처리기보다 먼저 받도록 window 캡처 단계에서)
        window.addEventListener("wheel", e => {
            if (!p.classList.contains("r20be-show") || !p.contains(e.target)) return;
            e.preventDefault();
            e.stopImmediatePropagation();
            const dy = (e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY) / aioZoom.get();
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
            const mv = ev => { area.scrollTop = st + (ev.clientY - sy) / aioZoom.get() * ratio; };
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
    // 왼쪽 목록 폭: 경계를 끌어서(←/→ 키로도) 바꾸고 기억한다
    const bindSplit = col => {
        const KEY = "r20be_tree_w";
        const set = w => { w = Math.round(Math.max(200, w)); col.style.flexBasis = w + "px"; return w; };
        const saved = parseInt(localStorage.getItem(KEY), 10);
        if (saved) set(saved);
        const bar = el("div", { class: "r20be-split", role: "separator", "aria-orientation": "vertical", "aria-label": "목록 폭 조절", tabindex: "0", title: "끌어서 목록 폭 조절" });
        bar.addEventListener("pointerdown", e => {
            e.preventDefault();
            bar.setPointerCapture(e.pointerId);
            bar.classList.add("on");
            const x0 = e.clientX, w0 = col.offsetWidth;
            const move = ev => set(w0 + (ev.clientX - x0) / aioZoom.get());
            const up = () => {
                bar.removeEventListener("pointermove", move);
                bar.removeEventListener("pointerup", up);
                bar.classList.remove("on");
                localStorage.setItem(KEY, col.offsetWidth);       // max-width 로 잘린 실제 폭
            };
            bar.addEventListener("pointermove", move);
            bar.addEventListener("pointerup", up);
        });
        bar.addEventListener("keydown", e => {
            const d = { ArrowLeft: -20, ArrowRight: 20 }[e.key];
            if (!d) return;
            e.preventDefault(); e.stopPropagation();
            set(col.getBoundingClientRect().width + d);
            localStorage.setItem(KEY, Math.round(col.getBoundingClientRect().width));
        });
        col.appendChild(bar);
    };
    const ensureUi = () => {
        if (ui) return;
        ui = {};
        ui.segJ = el("button", { type: "button", onclick: () => switchTab("journal") }, "저널");
        ui.segB = el("button", { type: "button", onclick: () => switchTab("bgm") }, "배경음악");
        ui.segT = el("button", { type: "button", onclick: () => switchTab("tables") }, "굴림표");
        ui.segM = el("button", { type: "button", onclick: () => switchTab("macros") }, "매크로");
        ui.segD = el("button", { type: "button", onclick: () => switchTab("decks") }, "덱");
        ui.segI = el("button", { type: "button", hidden: !FEAT.roomImages, onclick: () => switchTab("images") }, "방 이미지");     // 그림 묶음이 없으면 탭도 없다
        const head = el("div", { class: "r20be-head" },
            el("strong", {}, "일괄 편집기"),
            SCRIPT_VER ? el("small", { class: "r20be-ver" }, "v" + SCRIPT_VER) : null,
            el("div", { class: "r20be-seg" }, ui.segJ, ui.segB, ui.segM, ui.segD, ui.segT, ui.segI),
            el("span", { class: "r20be-flex" }),
            aioZoom.control("r20be-zm r20be-tz"),
            el("button", { type: "button", class: "r20be-ib", "aria-label": "닫기", title: "닫기 (저장 안 한 변경은 남아 있음)", html: ICON.x, onclick: close }));
        ui.search = el("input", { class: "r20be-in r20be-search", type: "search", placeholder: "이름 검색", "aria-label": "이름 검색",
            oninput: debounce(() => { cur().q = ui.search.value; renderTree(); if (cur().which === "images") renderPane(); }, 150) });
        ui.chips = el("div", { class: "r20be-chips" });
        ui.newLabel = el("span", {}, "새로 만들기");
        ui.newBtn = el("button", { type: "button", class: "r20be-sec", "aria-haspopup": "true", onclick: toggleMenu }, ico("plus"), ui.newLabel);
        ui.menu = el("div", { class: "r20be-menu", hidden: true });
        ui.badge = el("span", { class: "r20be-badge", hidden: true });
        const setView = icons => { VIEW.icons = icons; localStorage.setItem("r20be_icons", icons ? "1" : "0"); render(); };
        const zoom = d => {
            VIEW.size = Math.max(56, Math.min(140, VIEW.size + d * 14));
            localStorage.setItem("r20be_icon_size", VIEW.size);
            ui.tree.style.setProperty("--be-icon", VIEW.size + "px");
            ui.pane.querySelector(".r20be-imgs")?.style.setProperty("--be-icon", VIEW.size + "px");
        };
        ui.vList = el("button", { type: "button", "aria-label": "목록으로 보기", title: "목록", html: ICON.list, onclick: () => setView(false) });
        ui.vGrid = el("button", { type: "button", "aria-label": "아이콘으로 보기", title: "아이콘", html: ICON.grid, onclick: () => setView(true) });
        ui.view = el("span", { class: "r20be-vw", role: "group", "aria-label": "보기 방식", hidden: true }, ui.vList, ui.vGrid);
        ui.zoom = el("span", { class: "r20be-zm", hidden: true },
            el("button", { type: "button", "aria-label": "아이콘 작게", onclick: () => zoom(-1) }, "−"),
            el("button", { type: "button", "aria-label": "아이콘 크게", onclick: () => zoom(1) }, "+"));
        // 폴더 · 플레이리스트 한꺼번에 펼치기 · 접기 (저널 · BGM 의 폴더 보기에서만)
        const foldAll = shut => { const t = cur(); t.collapsed = new Set(shut ? allNodes(t).filter(n => n.kids).map(n => n.id) : []); renderTree(); };
        ui.fold = el("span", { class: "r20be-zm r20be-fold", hidden: true },
            el("button", { type: "button", title: "폴더 전부 펼치기", onclick: () => foldAll(false) }, "전체 열기"),
            el("button", { type: "button", title: "폴더 전부 접기", onclick: () => foldAll(true) }, "전체 닫기"));
        // 주크박스 백업 목록 (BGM 탭 · 자동 백업 묶음이 켜져 있을 때)
        ui.bk = el("div", { class: "r20be-bk", hidden: true, role: "dialog", "aria-label": "주크박스 백업" });
        ui.bkBtn = el("button", { type: "button", class: "r20be-sec", hidden: true, title: "주크박스 폴더 구조 백업 — 고른 시점으로 되돌리기", onclick: () => toggleBackups() }, "백업");
        ui.pagesBtn = el("button", { type: "button", class: "r20be-sec", hidden: true, onclick: () => FEAT.roomImages?.loadPages() });
        // 페이지를 읽는 동안 묶음 목록을 늘리고, 다 읽으면 격자도 새로
        FEAT.roomImages?.onPages(l => {
            if (!ui.root.classList.contains("r20be-show") || S.tab !== "images" || !S.images) return;
            if (!l || l.done % 5 === 0) { S.images.data = FEAT.roomImages.gather(); renderTree(); if (!l) renderPane(); }
            drawPagesBtn();
        });
        ui.revert = el("button", { type: "button", class: "r20be-sec", onclick: revert }, "되돌리기");
        ui.save = el("button", { type: "button", class: "r20be-pri", onclick: save }, "저장");
        ui.tree = el("div", { class: "r20be-tree", role: "tree", "aria-label": "항목 목록" });
        ui.pane = el("div", { class: "r20be-pane" });
        ui.foot = el("div", { class: "r20be-foot" }, HINT);
        ui.root = el("section", { id: "r20be", "aria-label": "일괄 편집기" }, head,
            el("div", { class: "r20be-tools" }, ui.search, ui.chips, ui.view, ui.zoom, ui.fold, el("span", { class: "r20be-flex" }), ui.pagesBtn, ui.bkBtn, ui.newBtn, ui.badge, ui.revert, ui.save, ui.menu, ui.bk),
            el("div", { class: "r20be-body" }, scrollCol(ui.tree, "tree"), scrollCol(ui.pane, "pane")),
            ui.foot);
        bindTree();
        bindPanel(head);
        bindSplit(ui.root.querySelector(".r20be-col.tree"));
        document.body.appendChild(ui.root);
    };

    const open = tab => {
        if (!isGM()) { alert("일괄 편집기는 이 방의 GM 만 쓸 수 있어요."); return; }
        if (!window.Campaign?.handouts) { alert("Roll20 데이터를 아직 불러오는 중입니다. 잠시 후 다시 열어 주세요."); return; }
        ensureUi();
        if (!dirtyCount()) TABS.forEach(k => { S[k] = null; });     // 저장 안 한 변경이 없으면 늘 최신 상태로 연다
        ui.root.classList.add("r20be-show");
        aioZoom.fit(ui.root);
        setStatus();
        switchTab(tab || S.tab);
    };
    function close() { ui.root.classList.remove("r20be-show"); ui.menu.hidden = true; }

    // 저널 · 주크박스 탭 위쪽에 여는 버튼
    const inject = () => {
        if (!btnVisible.bulk || !gmKnown()) return;
        // 핸드아웃 · 캐릭터 · GM 메모 · 주크박스를 읽고 고치므로 GM 만
        if (!isGM()) { document.querySelectorAll("button.r20be-open").forEach(b => b.remove()); return; }
        [["journal", "journal"], ["jukebox", "bgm"]].forEach(([id, tab]) => {
            const host = document.getElementById(id);
            if (!host) return;
            // 예전 버전 사본이 단 버튼이면 지우고 이 버전 것으로 단다
            host.querySelectorAll(".r20be-open:not([data-aio])").forEach(b => { b.remove(); warnDuplicate(); });
            if (host.querySelector(".r20be-open")) return;
            (host.querySelector(".content") || host).prepend(el("button", { type: "button", class: "r20be-open", "data-aio": "1", title: "일괄 편집", "aria-label": "일괄 편집",
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

addCss(`
        #r20be { position:fixed; z-index:10005; display:none; flex-direction:column; width:900px; height:600px; min-width:420px; min-height:320px; max-width:calc((100vw - 16px) / var(--aio-z, 1)); max-height:calc((100vh - 16px) / var(--aio-z, 1)); background:var(--aio-bg); border:1px solid var(--aio-line); border-radius:var(--aio-r-sm); box-shadow:0 8px 24px rgba(0,0,0,0.22); font-family:sans-serif; font-size:12px; color:var(--aio-ink-2); resize:both; overflow:hidden; box-sizing:border-box; }
        /* Roll20(Bootstrap)의 .show { display:block !important } 와 겹치지 않게 전용 클래스를 쓴다 */
        #r20be.r20be-show { display:flex !important; }
        #r20be *, #r20be *::before, #r20be *::after { box-sizing:border-box; }
        #r20be [hidden] { display:none !important; }
        #r20be button:focus-visible, #r20be input:focus-visible, #r20be select:focus-visible, #r20be textarea:focus-visible { outline:2px solid var(--aio-accent); outline-offset:1px; }
        #r20be .r20be-head { display:flex; align-items:center; gap:10px; height:36px; padding:0 6px 0 10px; background:var(--aio-bg-3); border-bottom:1px solid var(--aio-line-2); cursor:move; user-select:none; flex-shrink:0; }
        #r20be .r20be-head strong { font-size:12px; color:var(--aio-ink-3); }
        #r20be .r20be-ver { margin-left:-6px; color:var(--aio-ink-5); font-size:10px; }
        #r20be .r20be-seg { display:flex; gap:2px; padding:2px; background:var(--aio-bg-4); border-radius:var(--aio-r-sm); }
        #r20be .r20be-seg button { border:0; background:transparent; height:24px; padding:0 12px; font-size:12px; font-weight:700; color:var(--aio-ink-3); border-radius:var(--aio-r-sm); cursor:pointer; }
        #r20be .r20be-seg button.on { background:var(--aio-accent); color:#fff; }
        #r20be .r20be-flex { flex:1; }
        #r20be .r20be-ico { display:inline-flex; flex-shrink:0; }
        #r20be .r20be-ib { display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px; border:0; background:transparent; border-radius:var(--aio-r-sm); cursor:pointer; color:var(--aio-ink-3); padding:0; flex-shrink:0; }
        #r20be .r20be-ib:hover { background:var(--aio-bg-4); color:var(--aio-ink-2); }
        #r20be .r20be-tools { position:relative; display:flex; flex-wrap:wrap; align-items:center; gap:6px; padding:6px 8px; border-bottom:1px solid var(--aio-line-3); flex-shrink:0; }
        #r20be .r20be-chips { display:flex; flex-wrap:wrap; gap:4px; }
        #r20be .r20be-in { width:100%; height:28px; margin:0; padding:0 8px; border:1px solid var(--aio-line); border-radius:var(--aio-r-sm); background:var(--aio-bg); color:var(--aio-ink-2); font-size:12px; box-shadow:none; }
        #r20be .r20be-in:focus { border-color:var(--aio-accent); outline:none; }
        #r20be .r20be-search { flex:1 1 160px; max-width:240px; width:auto; }
        #r20be .r20be-chip { height:24px; padding:0 9px; border:1px solid var(--aio-line); border-radius:12px; background:var(--aio-bg); color:var(--aio-ink-3); font-size:11px; cursor:pointer; }
        #r20be .r20be-chip.on { border-color:var(--aio-accent); background:var(--aio-accent-bg); color:var(--aio-accent); font-weight:700; }
        #r20be .r20be-badge { padding:3px 8px; border-radius:var(--aio-r-lg); background:#fff4e5; color:#b45309; font-size:11px; font-weight:700; }
        #r20be .r20be-pri { height:26px; padding:0 14px; border:0; border-radius:var(--aio-r-sm); background:var(--aio-accent); color:#fff; font-size:12px; font-weight:700; cursor:pointer; }
        #r20be .r20be-pri:hover { background:var(--aio-accent-dark); }
        #r20be .r20be-pri:disabled { background:var(--aio-accent-mid); cursor:default; }
        #r20be .r20be-sec { display:inline-flex; align-items:center; gap:4px; height:26px; padding:0 10px; border:1px solid var(--aio-line); border-radius:var(--aio-r-sm); background:var(--aio-bg); color:var(--aio-ink-2); font-size:12px; cursor:pointer; }
        #r20be .r20be-sec:hover { background:var(--aio-bg-3); }
        #r20be .r20be-sec:disabled { background:var(--aio-bg); color:var(--aio-ink-5); cursor:default; }
        #r20be .r20be-sec.on { background:#333; border-color:#333; color:#fff; }
        #r20be .r20be-sec.danger { color:#b91c1c; }
        #r20be .r20be-menu { position:absolute; top:34px; z-index:2; display:flex; flex-direction:column; min-width:130px; padding:4px 0; background:var(--aio-bg); border:1px solid var(--aio-line); border-radius:var(--aio-r-sm); box-shadow:0 4px 12px rgba(0,0,0,0.18); }
        #r20be .r20be-menu button { padding:6px 12px; border:0; background:transparent; color:var(--aio-ink-2); font-size:12px; text-align:left; cursor:pointer; }
        #r20be .r20be-menu button:hover { background:var(--aio-accent-bg); }
        #r20be .r20be-menu button:disabled { background:transparent; color:var(--aio-ink-5); cursor:default; }
        #r20be .r20be-body { flex:1 1 0; min-height:0; display:flex; overflow:hidden; }
        #r20be .r20be-col { position:relative; min-height:0; display:flex; }
        #r20be .r20be-col.tree { flex:0 0 300px; min-width:200px; max-width:calc(100% - 280px); border-right:1px solid var(--aio-line-3); }
        #r20be .r20be-split { position:absolute; top:0; bottom:0; right:-4px; z-index:5; width:8px; cursor:col-resize; touch-action:none; }
        #r20be .r20be-split:hover, #r20be .r20be-split:focus-visible, #r20be .r20be-split.on { background:rgba(225,0,133,0.22); outline:none; }
        #r20be .r20be-col.pane, #r20be .r20be-isend .r20be-chk > .r20be-in:not([type=number]) { flex:1; min-width:0; }
        /* 기본 스크롤바 대신 직접 만든 스크롤바(.r20be-sb)를 쓴다 */
        #r20be .r20be-tree, #r20be .r20be-pane { flex:1; min-width:0; min-height:0; overflow-y:auto; scrollbar-width:none; }
        #r20be .r20be-tree::-webkit-scrollbar, #r20be .r20be-pane::-webkit-scrollbar { display:none; }
        #r20be .r20be-tree { padding-right:14px; }
        #r20be .r20be-pane { padding:14px 26px 14px 16px; }
        #r20be .r20be-sb { position:absolute; top:3px; right:3px; bottom:3px; width:10px; border-radius:var(--aio-r-sm); background:var(--aio-bg-4); cursor:pointer; }
        #r20be .r20be-sb-th { position:absolute; top:0; left:1px; right:1px; min-height:24px; border-radius:var(--aio-r-sm); background:var(--aio-bg-5); cursor:grab; }
        #r20be .r20be-sb-th:hover, #r20be .r20be-sb-th.drag { background:#888; }
        #r20be .r20be-row { display:flex; align-items:center; gap:3px; min-height:28px; padding-right:6px; border-bottom:1px solid var(--aio-line-4); }
        #r20be .r20be-row:hover { background:var(--aio-accent-bg); }
        #r20be .r20be-row.chk { background:var(--aio-accent-bg); }
        #r20be .r20be-row.sel { background:var(--aio-accent-soft); }
        #r20be .r20be-row.del .r20be-nm span, #r20be .r20be-tile.del .r20be-tn { color:var(--aio-ink-5); text-decoration:line-through; }
        #r20be .r20be-row.drop-in { outline:2px solid var(--aio-accent); outline-offset:-2px; }
        #r20be .r20be-row.drop-before { box-shadow:inset 0 2px 0 var(--aio-accent); }
        #r20be .r20be-sp { width:22px; flex-shrink:0; }
        #r20be .r20be-cb { display:inline-flex; align-items:center; justify-content:center; width:15px; height:15px; padding:0; border:1px solid var(--aio-line); border-radius:var(--aio-r-sm); background:var(--aio-bg); color:#fff; cursor:pointer; flex-shrink:0; }
        #r20be .r20be-cb svg { visibility:hidden; }
        #r20be .r20be-btns { display:flex; flex-wrap:wrap; gap:6px; }
        #r20be .r20be-cb.on, #r20be .r20be-cb2.on { background:var(--aio-accent); border-color:var(--aio-accent); }
        #r20be .r20be-cb.on svg { visibility:visible; }
        #r20be .r20be-nm { flex:1; min-width:0; display:flex; align-items:center; gap:5px; height:26px; padding:0 4px; border:0; background:transparent; color:var(--aio-ink); font-size:12px; text-align:left; cursor:pointer; }
        #r20be .r20be-nm span, #r20be .r20be-prev span, #r20be .r20be-tprev > div > span:first-child { overflow:hidden; text-overflow:clip; white-space:nowrap; }
        #r20be .r20be-nm svg { flex-shrink:0; }
        #r20be .r20be-dot { width:7px; height:7px; border-radius:50%; background:#c2410c; flex-shrink:0; }
        #r20be .r20be-meta { color:var(--aio-ink-3); font-size:10px; white-space:nowrap; flex-shrink:0; }
        #r20be .r20be-vw { display:flex; gap:2px; padding:2px; background:var(--aio-bg-4); border-radius:var(--aio-r-sm); }
        #r20be .r20be-vw button { display:flex; align-items:center; justify-content:center; width:26px; height:22px; padding:0; border:0; border-radius:var(--aio-r-sm); background:transparent; color:var(--aio-ink-3); cursor:pointer; }
        #r20be .r20be-vw button.on { background:var(--aio-bg); color:var(--aio-accent); box-shadow:0 0 0 1px var(--aio-accent-soft); }
        #r20be .r20be-zm { display:flex; gap:2px; }
        #r20be .r20be-zm button { width:22px; height:22px; padding:0; border:1px solid var(--aio-line); border-radius:var(--aio-r-sm); background:var(--aio-bg); color:var(--aio-ink-3); font-size:13px; line-height:1; cursor:pointer; }
        #r20be .r20be-zm button:hover { background:var(--aio-bg-3); color:var(--aio-ink); }
        #r20be .r20be-tz .aio-zv { width:auto; padding:0 6px; font-size:12px; }
        #r20be .r20be-fold button { width:auto; padding:0 7px; font-size:11px; white-space:nowrap; }
        #r20be .r20be-tree.r20be-icons { padding:2px 10px 12px; }
        #r20be .r20be-igh { display:flex; align-items:center; gap:6px; padding:10px 4px 4px; font-size:11px; font-weight:700; color:var(--aio-ink-3); }
        #r20be .r20be-igh span { min-width:0; overflow:hidden; text-overflow:clip; white-space:nowrap; }
        #r20be .r20be-igh small { font-weight:400; color:var(--aio-ink-3); }
        #r20be .r20be-igh::after { content:""; flex:1; height:1px; background:var(--aio-bg-3); }
        #r20be .r20be-igrid { display:grid; grid-template-columns:repeat(auto-fill, minmax(var(--be-icon, 84px), 1fr)); gap:4px; }
        #r20be .r20be-row.r20be-tile { position:relative; display:block; min-height:0; padding:0; border:0; border-radius:var(--aio-r-lg); }
        #r20be .r20be-tile.sel { box-shadow:inset 0 0 0 2px var(--aio-accent); }
        #r20be .r20be-tl { display:flex; flex-direction:column; align-items:center; gap:5px; width:100%; padding:6px 4px 8px; border:0; border-radius:var(--aio-r-lg); background:transparent; cursor:pointer; }
        #r20be .r20be-pic { display:flex; align-items:center; justify-content:center; width:100%; aspect-ratio:1; border-radius:var(--aio-r-lg); object-fit:cover; background:var(--aio-bg-4); color:var(--aio-ink-4); font-size:calc(var(--be-icon, 84px) * 0.32); font-weight:700; }
        #r20be .r20be-tn { width:100%; font-size:11px; line-height:1.35; color:var(--aio-ink); text-align:center; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; word-break:keep-all; overflow-wrap:anywhere; }
        #r20be .r20be-tile .r20be-cb { position:absolute; left:9px; top:9px; width:18px; height:18px; border-radius:var(--aio-r-sm); }
        #r20be .r20be-tile .r20be-dot { position:absolute; right:9px; top:9px; box-shadow:0 0 0 2px #fff; }
        #r20be .r20be-tile.del .r20be-pic { opacity:0.4; }
        #r20be .r20be-inl { flex:1; min-width:0; height:24px; }
        #r20be .r20be-pane-in { display:flex; flex-direction:column; gap:12px; min-height:100%; }
        #r20be .r20be-ph { display:flex; align-items:center; gap:8px; }
        #r20be .r20be-ph strong { font-size:14px; }
        #r20be .r20be-tag { padding:2px 7px; border-radius:var(--aio-r-lg); font-size:10px; font-weight:700; }
        #r20be .r20be-tag.del { background:#fde8e8; color:#b91c1c; }
        #r20be .r20be-tag.new { background:#e7f6ec; color:#15803d; }
        #r20be .r20be-grid { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:10px; }
        #r20be .r20be-fld { display:block; margin:0; font-weight:normal; }
        #r20be .r20be-lb { display:block; margin-bottom:4px; color:var(--aio-ink-3); font-size:11px; font-weight:700; }
        #r20be .r20be-ed { flex:1 0 auto; min-height:240px; display:flex; flex-direction:column; border:1px solid var(--aio-line); border-radius:var(--aio-r-sm); overflow:hidden; }
        #r20be .r20be-ctabs { display:flex; padding:0 4px; border-bottom:1px solid var(--aio-line-3); flex-shrink:0; }
        #r20be .r20be-ctab { height:28px; padding:0 10px; border:0; border-bottom:2px solid transparent; background:transparent; color:var(--aio-ink-3); font-size:12px; font-weight:700; cursor:pointer; }
        #r20be .r20be-ctab.on { border-bottom-color:var(--aio-accent); color:var(--aio-accent); }
        #r20be .r20be-ta { flex:1 0 auto; width:100%; min-height:200px; overflow:hidden; margin:0; padding:10px 12px; border:0; border-radius:0; box-shadow:none; resize:none; outline:none; font-family:inherit; font-size:13px; line-height:1.7; }
        #r20be .r20be-ta.mono { font-family:Consolas, monospace; font-size:12px; }
        /* 폴더 안 보기 · 곡 목록 */
        #r20be .r20be-fv { display:flex; flex-direction:column; gap:8px; }
        #r20be .r20be-fsec { border:1px solid var(--aio-line-3); border-radius:var(--aio-r); }
        #r20be .r20be-fsec > header { display:flex; align-items:center; gap:6px; min-height:32px; padding:0 8px 0 10px; background:var(--aio-bg-2); border-radius:var(--aio-r) var(--aio-r) 0 0; font-size:12px; }
        #r20be .r20be-fsec > header small { color:var(--aio-ink-4); }
        #r20be .r20be-fsec > header .r20be-ico { color:var(--aio-ink-4); }
        #r20be .r20be-fsec .r20be-igrid { padding:8px; }
        #r20be .r20be-fsec.drop { outline:2px dashed var(--aio-accent); outline-offset:-1px; background:#fff8fc; }
        #r20be .r20be-fsec.drop > header { background:var(--aio-accent-bg); color:var(--aio-accent); }
        #r20be .r20be-fv .r20be-cb { display:none; }
        #r20be .r20be-fv .r20be-tile { cursor:grab; }
        #r20be .r20be-fempty { margin:0; padding:12px; text-align:center; color:var(--aio-ink-4); font-size:12px; }
        #r20be .r20be-xs { height:22px; margin:0; padding:0 7px; border:1px solid var(--aio-line-2); border-radius:var(--aio-r-sm); background:var(--aio-bg); color:var(--aio-ink-3); font-size:11px; cursor:pointer; }
        #r20be .r20be-xs:hover { background:var(--aio-bg-3); color:var(--aio-ink); }
        #r20be .r20be-sec.r20be-new { border-color:var(--aio-accent); color:var(--aio-accent); }
        #r20be .r20be-tlist { border:1px solid var(--aio-line-3); border-radius:var(--aio-r); overflow:hidden; }
        #r20be .r20be-tkrow { display:grid; grid-template-columns:26px minmax(0, 1fr) minmax(0, 150px) 60px 24px; align-items:center; gap:8px; min-height:34px; padding:0 10px; border-bottom:1px solid var(--aio-line-4); font-size:12.5px; cursor:pointer; }
        #r20be .r20be-tkrow:last-child { border-bottom:0; }
        #r20be .r20be-tkrow.hd { min-height:28px; background:var(--aio-bg-2); font-size:11px; font-weight:700; color:var(--aio-ink-4); cursor:default; }
        #r20be .r20be-tkrow[data-id]:hover { background:var(--aio-bg-2); }
        #r20be .r20be-tkrow.ins { box-shadow:inset 0 2px 0 var(--aio-accent); }
        #r20be .r20be-tkrow .r20be-tkn { display:flex; align-items:center; gap:6px; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        #r20be .r20be-tkrow.del .r20be-tkn { color:var(--aio-ink-5); text-decoration:line-through; }
        #r20be .r20be-tplay { width:24px; height:24px; margin:0; padding:0; border:1px solid var(--aio-line-2); border-radius:50%; background:var(--aio-bg); color:var(--aio-ink-3); font-size:9px; line-height:1; cursor:pointer; }
        #r20be .r20be-tplay.on { border-color:var(--aio-accent); color:var(--aio-accent); }
        #r20be .r20be-ttags { overflow:hidden; white-space:nowrap; }
        #r20be .r20be-ttags span { display:inline-block; margin-right:3px; padding:0 6px; border-radius:9px; background:var(--aio-bg-4); font-size:10.5px; }
        #r20be .r20be-tvol { position:relative; height:4px; border-radius:2px; background:var(--aio-line-2); overflow:hidden; }
        #r20be .r20be-tvol i { position:absolute; inset:0 auto 0 0; background:var(--aio-accent); }
        #r20be .r20be-mode { display:flex; align-self:center; margin:0 2px 0 auto; border:1px solid var(--aio-line); border-radius:var(--aio-r-sm); overflow:hidden; }
        #r20be .r20be-mode button { height:22px; margin:0; padding:0 9px; border:0; border-left:1px solid var(--aio-line); border-radius:0; background:var(--aio-bg); color:var(--aio-ink-4); font-size:11px; font-weight:700; cursor:pointer; }
        #r20be .r20be-mode button:first-child { border-left:0; }
        #r20be .r20be-mode button[aria-checked="true"] { background:var(--aio-accent); color:#fff; }
        #r20be .r20be-ed.rich { overflow:visible; }
        #r20be .r20be-ed.rich .note-editor { flex:1 0 auto; margin:0; border:0; border-radius:0; box-shadow:none; }
        #r20be .r20be-ed.rich :is(.note-toolbar-wrapper, .note-editor > .note-toolbar) { position:sticky; top:-14px; z-index:3; }     /* 긴 글을 내려도 단추줄은 위에 */
        body > .note-popover { z-index:10006 !important; }     /* 서식 편집기의 링크 · 그림 말풍선은 body 에 붙으므로 이 창보다 위로 */
        #r20be .r20be-ph { flex-wrap:wrap; }
        #r20be .r20be-docnav { display:flex; gap:4px; }
        #r20be a.r20be-link { display:inline-flex; align-items:center; text-decoration:none; }
        #r20be.r20be-wide .r20be-col.tree { display:none; }
        #r20be .r20be-warn { display:flex; flex-wrap:wrap; align-items:center; gap:8px; padding:6px 10px; border-bottom:1px solid #fde4c8; background:#fff7ed; color:#92400e; font-size:11px; }
        #r20be .r20be-note, #r20be .r20be-empty { margin:0; color:var(--aio-ink-3); font-size:12px; }
        #r20be .r20be-empty { padding:24px 8px; text-align:center; }
        #r20be .r20be-chk { display:flex; align-items:center; gap:6px; margin:0; font-size:12px; font-weight:normal; }
        #r20be .r20be-chk input { margin:0; }
        #r20be .r20be-range { width:100%; margin:0; }
        #r20be .r20be-pv { display:flex; align-items:center; gap:10px; padding:10px 12px; border:1px solid var(--aio-line-3); border-radius:var(--aio-r-sm); background:var(--aio-bg-2); }
        #r20be .r20be-prev { border:1px solid var(--aio-line-3); border-radius:var(--aio-r-sm); overflow:hidden; }
        #r20be .r20be-prev > div { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:10px; padding:5px 10px; border-top:1px solid var(--aio-line-4); }
        #r20be .r20be-prev > div:first-child { border-top:0; background:var(--aio-bg-3); color:var(--aio-ink-3); font-size:11px; font-weight:700; }
        #r20be .r20be-prev .chg, #r20be .r20be-tbar .prev { color:var(--aio-accent); font-weight:700; }
        #r20be .r20be-prev .same { color:var(--aio-ink-4); }
        #r20be .r20be-acts { display:flex; gap:8px; }
        /* 굴림표 */
        #r20be .r20be-trow { display:flex; flex-wrap:wrap; align-items:flex-end; gap:12px; }
        #r20be .r20be-trow .r20be-fld { width:240px; }
        #r20be .r20be-trow .r20be-chk { height:28px; }
        #r20be .r20be-add { display:flex; gap:8px; align-items:flex-start; }
        #r20be .r20be-add textarea { flex:1; height:72px; padding:6px 8px; resize:vertical; }
        #r20be .r20be-tbar { display:flex; flex-wrap:wrap; align-items:center; gap:6px; padding:8px 10px; border:1px solid var(--aio-accent-soft); border-radius:var(--aio-r); background:var(--aio-accent-bg); font-size:12px; }
        #r20be .r20be-sepv { width:1px; height:18px; background:var(--aio-accent-soft); }
        #r20be .r20be-tgrid { display:grid; grid-template-columns:repeat(auto-fill, minmax(104px, 1fr)); gap:8px; }
        #r20be .r20be-tgrid > .r20be-empty { grid-column:1 / -1; }
        #r20be .r20be-card { position:relative; display:flex; flex-direction:column; gap:4px; padding:5px; border:1px solid var(--aio-line-2); border-radius:var(--aio-r-lg); background:var(--aio-bg); }
        #r20be .r20be-card.chk { border-color:var(--aio-accent); background:var(--aio-accent-bg); }
        #r20be .r20be-card.dirty { box-shadow:inset 0 0 0 1px #f0b27a; }
        #r20be .r20be-ctip { height:auto; min-height:38px; padding:3px 6px; font-size:11px; line-height:1.35; resize:vertical; }
        #r20be .r20be-thumb { display:flex; align-items:center; justify-content:center; width:100%; aspect-ratio:1; padding:0; border:0; border-radius:var(--aio-r); background:var(--aio-bg-3); color:var(--aio-ink-4); font-size:11px; overflow:hidden; cursor:pointer; }
        #r20be .r20be-thumb img, #r20be .r20be-thumb video { width:100%; height:100%; object-fit:cover; }
        #r20be .r20be-thumb.none { border:1px dashed var(--aio-line); background:var(--aio-bg-2); }
        #r20be .r20be-card .r20be-thumb { position:relative; }
        #r20be .r20be-thumb .r20be-back { position:absolute; right:4px; bottom:4px; width:32%; height:auto; aspect-ratio:1; object-fit:cover; border:2px solid #fff; border-radius:var(--aio-r-sm); background:var(--aio-bg-5); box-shadow:0 1px 3px rgba(0,0,0,0.3); }
        #r20be .r20be-tbar.idle { border-color:var(--aio-line-4); background:var(--aio-bg-2); }
        #r20be .r20be-tgrid.r20be-imgs { grid-template-columns:repeat(auto-fill, minmax(var(--be-icon, 84px), 1fr)); gap:6px; }
        #r20be .r20be-imgs .r20be-card { gap:3px; padding:4px; }
        #r20be .r20be-ithumb { background:var(--aio-bg-3); }
        #r20be .r20be-ithumb img, #r20be .r20be-ithumb video { object-fit:contain; }
        #r20be .r20be-inm { overflow:hidden; padding:0 2px; color:var(--aio-ink-2); font-size:11px; white-space:nowrap; text-overflow:clip; }
        #r20be .r20be-icnt { position:absolute; right:8px; top:8px; padding:0 5px; border-radius:var(--aio-r); background:rgba(0,0,0,0.55); color:#fff; font-size:9px; font-weight:700; line-height:14px; }
        #r20be .r20be-isend { display:flex; flex-direction:column; gap:8px; }
        #r20be .r20be-isend .r20be-chk[hidden] { display:none; }
        #r20be .r20be-broken { visibility:hidden; }
        #r20be .r20be-ov { position:absolute; inset:0; z-index:5; display:flex; align-items:center; justify-content:center; background:rgba(30,30,30,0.35); }
        #r20be .r20be-dlg { width:min(440px, calc(100% - 32px)); display:flex; flex-direction:column; gap:10px; padding:16px; background:var(--aio-bg); border-radius:var(--aio-r); box-shadow:0 10px 30px rgba(0,0,0,0.3); }
        #r20be .r20be-dlg > strong { font-size:14px; }
        #r20be .r20be-mlist { display:flex; flex-direction:column; gap:4px; max-height:240px; overflow-y:auto; }
        #r20be .r20be-mrow { display:flex; align-items:center; gap:8px; margin:0; padding:6px 8px; border:1px solid var(--aio-line-3); border-radius:var(--aio-r-sm); font-size:12px; font-weight:normal; cursor:pointer; }
        #r20be .r20be-mrow input { margin:0; }
        #r20be .r20be-mrow span { flex:1; min-width:0; overflow:hidden; text-overflow:clip; white-space:nowrap; }
        #r20be .r20be-mrow small { color:var(--aio-ink-3); }
        #r20be .r20be-mrow:has(input:checked) { border-color:var(--aio-accent); background:var(--aio-accent-bg); }
        #r20be .r20be-msum { font-size:12px; font-weight:700; color:var(--aio-accent); }
        #r20be .r20be-dlg.wide { width:min(640px, calc(100% - 32px)); max-height:calc(100% - 32px); overflow-y:auto; }
        #r20be .r20be-tsplit { display:grid; grid-template-columns:minmax(0, 1fr) minmax(0, 1fr); gap:12px; }
        #r20be .r20be-tprev { height:220px; overflow-y:auto; border:1px solid var(--aio-line-3); border-radius:var(--aio-r-sm); }
        #r20be .r20be-tprev > div { display:grid; grid-template-columns:minmax(0, 1fr) 52px 48px; gap:6px; align-items:center; height:24px; padding:0 8px; border-bottom:1px solid var(--aio-line-4); font-size:11px; }
        #r20be .r20be-tprev > div > span:not(:first-child) { color:var(--aio-ink-3); text-align:right; }
        #r20be .r20be-tsplit textarea { height:196px; padding:6px 8px; resize:none; }
        #r20be .r20be-dlg textarea.mono { height:180px; padding:6px 8px; font-family:ui-monospace, Consolas, monospace; resize:vertical; }
        #r20be .r20be-mprev { max-height:96px; overflow-y:auto; padding:8px; border:1px solid var(--aio-line-3); border-radius:var(--aio-r-sm); background:var(--aio-bg-2); font-family:ui-monospace, Consolas, monospace; font-size:11px; line-height:1.5; word-break:break-all; user-select:text; }
        #r20be .r20be-cb2 { position:absolute; left:9px; top:9px; display:flex; align-items:center; justify-content:center; width:18px; height:18px; padding:0; border:1px solid var(--aio-line); border-radius:var(--aio-r-sm); background:var(--aio-bg); color:#fff; cursor:pointer; }
        #r20be .r20be-cb2 svg { visibility:hidden; }
        #r20be .r20be-cb2.on svg { visibility:visible; }
        #r20be .r20be-mini { height:24px; padding:0 6px; font-size:11px; }
        #r20be .r20be-wl { display:flex; align-items:center; gap:4px; margin:0; color:var(--aio-ink-3); font-size:10px; font-weight:normal; }
        #r20be .r20be-wl input { width:52px; }
        #r20be .r20be-foot { display:flex; align-items:center; min-height:26px; padding:3px 10px; border-top:1px solid var(--aio-line-3); background:var(--aio-bg-3); color:var(--aio-ink-3); font-size:11px; flex-shrink:0; }
        #r20be .r20be-foot.ok { color:#15803d; font-weight:700; }
        #r20be .r20be-foot.err { color:#b91c1c; font-weight:700; }
        @media (max-width: 640px) {
            #r20be .r20be-body { flex-direction:column; }
            #r20be .r20be-col.tree { flex:0 0 40% !important; max-width:none; border-right:0; border-bottom:1px solid var(--aio-line-3); }
            #r20be .r20be-split { display:none; }
            #r20be .r20be-grid { grid-template-columns:minmax(0, 1fr); }
        }
        body button.r20be-open { display:inline-flex; align-items:center; gap:4px; height:24px; margin:6px 0; padding:0 10px; border:1px solid var(--aio-line); border-radius:var(--aio-r-sm); background:var(--aio-bg); color:var(--aio-ink-2); font-size:11px; font-weight:700; cursor:pointer; box-sizing:border-box; }
        body button.r20be-open:hover { background:var(--aio-bg-3); }
        #jukebox button.r20be-open { margin-top:2px; margin-left:3px; }     /* 옆 '오디오 관리'와 높이 맞춤 */
        #journal button.r20be-open { margin-top:5px; margin-left:3px; }     /* 옆 태그 단추와 높이 맞춤 */
        body.r20be-off button.r20be-open { display:none; }
        .r20be-mini { margin-left:auto; margin-right:6px; padding:1px 8px; border:1px solid var(--aio-line-2); border-radius:var(--aio-r-sm); background:var(--aio-bg-3); color:var(--aio-ink-3); font-size:11px; cursor:pointer; }
        .r20be-mini:hover { background:var(--aio-bg-4); color:var(--aio-ink-2); }
`);
addFeature("bulkEditor", bulkEditor);
addBundle({ place: "main", order: 4, label: "저널 · BGM · 매크로 일괄 편집기", sub: "덱 · 굴림표 · 이미지도 — 굴림표 항목 · 덱 카드 순서 바꾸기",
    members: [["bulk", "bulkEditor"]],
    extra: row => { row.querySelector(".cs-text").after(bulkEditor.openButton()); } });

// ══════════ 묶음 6 · 기본시트 데이터 자동완성 ══════════

// ───────── 자동완성: 시트 인법/마법 · 어빌리티 · 아이템 목록 이름칸에 데이터명을 입력하면 그 행을 채운다 ─────────
// 데이터: window.NIRE_RULEDATA = { insane:[…], shinobigami:[…], magicalogia:[…], bloodmoon:[…], bloodmoon_item:[…] }
//   — @require 로 들어오거나 설정의 '데이터 주소'에서 받아 오거나, 홈페이지가 없으면 '파일'로 고른 데이터 파일(같은 모양)을 브라우저에 넣어 둔다
// 레코드 키: name, group(유파 · 그룹), type, skill, range, target, cost, charge, effect, flavor, recite, kind(아이템 분류)
// type/skill 은 시트 드롭다운에 보이는 글자(예: "공격", "폭력")로 적으면 된다.
const autofill = (() => {
    const MAX = 8;
    // 시스템별 "레코드 키 → 시트 필드명(접두어 뒤)"
    const FIELDS = {
        insane:      { name: "Name", type: "Types", skill: "Assigned_Skill", effect: "Effect" },
        shinobigami: { name: "Name", group: "Clan", type: "Types", skill: "Assigned_Skill", range: "Range", cost: "Cost", effect: "Effect" },
        magicalogia: { name: "Name", type: "Types", skill: "Assigned_Skill", target: "skillTarget", cost: "Cost", charge: "Charge", effect: "Effect", recite: "Recite" },
        // 블러드문 시트: 반복 줄의 칸 이름이 그대로(name …), 팔로워 어빌리티는 ab1_ ~ ab3_ 이 앞에 붙는다
        // 레벨(lv · level)은 데이터에 있을 때만 — 시트에 Lv 칸이 생긴 판부터 채워진다
        bloodmoon:      { name: "name", group: "group", type: "type", lv: "lv", level: "lv", skill: "skill", cost: "cost", effect: "effect", flavor: "flavor" },
        bloodmoon_item: { name: "name", kind: "kind", effect: "effect" }
    };
    // inSANe 고정 행(Ninpo_03_Name)과 반복 행(Ninpo_Name) 모두 대상
    const NAME_RE = /^attr_((?:Ninpo|Magic)_(?:\d+_)?)Name$/;
    const BM_RE = /^attr_(ab[1-3]_)?name$/;

    const norm = s => String(s ?? "").replace(/^\s*\d+\.\s*/, "").replace(/\s+/g, "").toLowerCase();
    const normCache = new Map();
    const getList = sys => {
        const list = window.NIRE_RULEDATA?.[sys];
        if (!Array.isArray(list)) return null;
        if (!normCache.has(list)) normCache.set(list, list.map(r => norm(r.name)));
        return list;
    };

    // Roll20 CSP 가 외부 <script> 는 막지만 fetch 는 허락한다 → 주소에서 글로 받아 JSON 부분만 읽는다.
    // 홈페이지 PHP 가 Access-Control-Allow-Origin: https://app.roll20.net 을 내야 한다.
    const URL_KEY = "r20_ruledata_url", FILE_KEY = "r20_ruledata_file";       // 주소 · 파일은 둘 중 하나만 (마지막에 넣은 것)
    let status = window.NIRE_RULEDATA ? "ok" : "none";     // none · loading · ok · badkey · fail
    const getUrl = () => localStorage.getItem(URL_KEY) || "";
    const fileName = () => { try { return JSON.parse(localStorage.getItem(FILE_KEY) || "null")?.name || ""; } catch (e) { return ""; } };
    // 'window.NIRE_RULEDATA = {…};' 모양이면 = 뒤만, 아니면 통째로 JSON
    const parseData = text => {
        const at = text.indexOf("window.NIRE_RULEDATA");
        const d = JSON.parse(at < 0 ? text : text.slice(text.indexOf("=", at) + 1).trim().replace(/;\s*$/, ""));
        if (!d || typeof d !== "object" || Array.isArray(d)) throw new Error("데이터 모양이 아님");
        return d;
    };
    const statusText = () => {
        if (status === "ok") return Object.values(window.NIRE_RULEDATA || {}).reduce((a, v) => a + (Array.isArray(v) ? v.length : 0), 0) + "개";
        return { loading: "불러오는 중…", badkey: "열쇠가 맞지 않음", fail: "불러오기 실패" }[status] || "데이터 없음";
    };
    const setStatus = st => { status = st; document.dispatchEvent(new CustomEvent("r20-ruledata")); };
    const load = async () => {
        const url = getUrl();
        if (!url) {
            const f = localStorage.getItem(FILE_KEY);
            if (!f) return;
            try { window.NIRE_RULEDATA = parseData(JSON.parse(f).text); normCache.clear(); setStatus("ok"); }
            catch (e) { console.warn("[자동완성] 넣어 둔 데이터 파일을 못 읽음:", e); setStatus("fail"); }
            return;
        }
        setStatus("loading");
        try {
            const res = await fetch(url, { cache: "no-cache" });
            const text = await res.text();
            const at = text.indexOf("window.NIRE_RULEDATA");
            if (!res.ok || at < 0) {
                console.warn("[자동완성] 데이터가 아닌 응답:", res.status, text.slice(0, 200));
                return setStatus(/열쇠/.test(text) ? "badkey" : "fail");
            }
            window.NIRE_RULEDATA = JSON.parse(text.slice(text.indexOf("=", at) + 1).trim().replace(/;\s*$/, ""));
            normCache.clear();
            setStatus("ok");
        } catch (e) {
            console.warn("[자동완성] 데이터 불러오기 실패 — 홈페이지 PHP 의 Access-Control-Allow-Origin 헤더를 확인하세요.", e);
            setStatus("fail");
        }
    };
    // '// @require  https://…' 줄을 통째로 붙여 넣어도 주소만 쓴다
    const setUrl = v => {
        const url = (String(v).match(/https?:\/\/\S+/) || [""])[0];
        if (url) { localStorage.setItem(URL_KEY, url); localStorage.removeItem(FILE_KEY); load(); }
        else { localStorage.removeItem(URL_KEY); setStatus(window.NIRE_RULEDATA ? "ok" : "none"); }
        return url;
    };
    // 데이터 파일(.js · .json)을 읽어 브라우저(localStorage)에 넣어 둔다 → 다음부터 주소 없이 쓴다. 성공하면 true
    const setFile = async f => {
        let text;
        try { text = await f.text(); window.NIRE_RULEDATA = parseData(text); }
        catch (e) { console.warn("[자동완성] 데이터 파일이 아님:", e); setStatus("fail"); return false; }
        try { localStorage.setItem(FILE_KEY, JSON.stringify({ name: f.name, text })); }
        catch (e) { console.warn("[자동완성] 데이터가 너무 커서 브라우저에 못 넣음 — 이번 접속에만 씀:", e); }
        localStorage.removeItem(URL_KEY);
        normCache.clear();
        setStatus("ok");
        return true;
    };
    const clearData = () => { localStorage.removeItem(URL_KEY); localStorage.removeItem(FILE_KEY); delete window.NIRE_RULEDATA; normCache.clear(); setStatus("none"); };
    if (!window.NIRE_RULEDATA) load();

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

    // 블러드문: 어빌리티 줄 · 팔로워의 어빌리티 칸 3개 → 어빌리티, 아이템 줄 → 아이템 (팔로워 이름 칸은 아님)
    const bmCtx = el => {
        const m = el.name?.match(BM_RE);
        const grp = m && el.closest(".bm") && el.closest(".repcontainer")?.dataset.groupname;
        const sys = grp === "repeating_items" && !m[1] ? "bloodmoon_item"
            : (grp === "repeating_abilities" && !m[1]) || (grp === "repeating_followers" && m[1]) ? "bloodmoon" : null;
        const row = sys && el.closest(".repitem");
        return row ? { base: m[1] || "", row, sys } : null;
    };
    const ctx = el => {
        if (BM_RE.test(el.name || "")) return el.disabled ? null : bmCtx(el);
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
            s.textContent = [r.group, r.type, r.skill, r.kind].filter(Boolean).join(" · ");
            it.append(b, s);
            box.appendChild(it);
        });
        const rc = input.getBoundingClientRect();
        // 시트 iframe 안의 칸이면 iframe 위치만큼 옮겨서 맨 위 화면 좌표로 바꾼다
        let ox = 0, oy = 0;
        for (let w = input.ownerDocument.defaultView; w?.frameElement; w = w.parent) {
            const fr = w.frameElement.getBoundingClientRect();
            ox += fr.left + w.frameElement.clientLeft; oy += fr.top + w.frameElement.clientTop;
        }
        const top = rc.top + oy, bottom = rc.bottom + oy;
        const z = aioZoom.get();
        box.style.left = zpx(Math.min(rc.left + ox, window.innerWidth - 230 * z));
        box.style.minWidth = zpx(Math.max(220 * z, rc.width));
        // 아래 공간이 부족하면 위로 띄운다
        const below = window.innerHeight - bottom;
        box.style.top = below > 270 * z ? zpx(bottom + 2) : "auto";
        box.style.bottom = below > 270 * z ? "auto" : zpx(window.innerHeight - top + 2);
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
        const Ev = el.ownerDocument.defaultView?.Event || Event;
        el.dispatchEvent(new Ev("input", { bubbles: true }));
        el.dispatchEvent(new Ev("change", { bubbles: true }));
    };

    const apply = rec => {
        const c = rec && input && ctx(input);
        if (!c) return close();
        const map = FIELDS[c.sys];
        const data = { ...rec };
        const el = field => c.row.querySelector(`:is(input,textarea,select)[name="attr_${c.base}${field}"]`);
        // 플레이버 칸이 없는 시트 · 줄(팔로워 어빌리티 · 아이템)은 효과 뒤에 붙인다
        if (data.flavor && !(map.flavor && el(map.flavor))) data.effect = [data.effect, data.flavor].filter(Boolean).join("\n\n");
        filling = true;
        for (const [key, field] of Object.entries(map)) {
            if (data[key] == null || data[key] === "") continue;
            // 같은 name 의 표시용 <span> 이 앞에 있는 시트가 있어 입력 요소만 고른다
            const f = el(field);
            if (!f) continue;
            // 블러드문 아이템 분류가 [아이템 · 레어아이템] 고르기인 판: 데이터의 다른 분류는 '레어' 가 들어 있는지로 고른다
            const v = c.sys === "bloodmoon_item" && key === "kind" && f.tagName === "SELECT" && !pickOption(f, data.kind)
                ? (/레어/.test(data.kind) ? "레어아이템" : "아이템") : String(data[key]);
            setField(f, v);
        }
        filling = false;
        close();
    };

    const onInput = e => {
        if (!btnVisible.autofill || filling) return;
        const c = ctx(e.target);
        if (!c) return;
        const found = search(c.sys, norm(e.target.value));
        if (!found.length) return close();
        input = e.target;
        input.setAttribute("autocomplete", "off");
        items = found; sel = 0;
        render();
    };

    const onKey = e => {
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
    };

    // 이름칸이 들어 있는 영역(또는 그 시트 iframe 을 품은 창)이 스크롤될 때만 닫는다 (채팅 자동 스크롤 등은 무시)
    const onScroll = e => {
        if (!input) return;
        const fe = input.ownerDocument.defaultView?.frameElement;
        if (e.target.contains?.(input) || (fe && e.target.contains?.(fe))) close();
    };

    const onFocusOut = e => { if (e.target === input) close(); };

    // 캐릭터 시트는 같은 출처의 iframe 안에 그려진다 → 맨 위 문서와 시트 문서 모두에 건다.
    // document.write 로 다시 그려지면 문서는 그대로인데 리스너만 지워지므로, 기록해 두지 않고 매번 다시 건다
    // (같은 함수를 다시 addEventListener 하면 중복되지 않는다)
    // 걸었다는 표시는 <html> 요소에 (document.open 으로 다시 쓰면 리스너와 함께 <html> 도 새로 생긴다)
    const hook = doc => {
        const root = doc?.documentElement;
        if (!root || root._r20af) return;
        root._r20af = true;
        doc.addEventListener("input", onInput, true);
        doc.addEventListener("keydown", onKey, true);
        doc.addEventListener("focusout", onFocusOut, true);
        doc.addEventListener("scroll", onScroll, true);
        doc.defaultView?.addEventListener("resize", close);
    };
    const hookFrame = f => { try { hook(f.contentDocument); } catch (e) { /* 다른 출처 */ } };
    hook(document);
    const framesSeen = new WeakSet();
    const inject = () => {
        document.querySelectorAll("iframe").forEach(f => {
            if (!framesSeen.has(f)) {
                framesSeen.add(f);
                f.addEventListener("load", () => hookFrame(f));
            }
            hookFrame(f);
        });
    };
    // 시트 칸을 누르면 맨 위 창이 포커스를 잃는다 → 그 순간 그 iframe 에 다시 건다
    window.addEventListener("blur", () => setTimeout(() => {
        const a = document.activeElement;
        if (a?.tagName === "IFRAME") hookFrame(a);
    }, 0));
    // 시트에서 다른 시트로 옮겨 갈 때는 맨 위 창 blur 가 없다 → iframe 이 포커스를 받을 때도
    document.addEventListener("focusin", e => { if (e.target.tagName === "IFRAME") hookFrame(e.target); });

    const setEnabled = on => { if (!on) close(); };
    return { close, inject, getUrl, setUrl, setFile, clearData, fileName, statusText, setEnabled, watch: "iframe" };
})();

addCss(`
        #r20-ac-box { position:fixed; z-index:100000; min-width:220px; max-width:360px; max-height:260px; overflow-y:auto; background:var(--aio-bg); border:1px solid var(--aio-line); border-radius:var(--aio-r-sm); box-shadow:0 4px 12px rgba(0,0,0,0.18); font-family:sans-serif; font-size:12px; color:var(--aio-ink-2); display:none; }
        #r20-ac-box.show { display:block; }
        .r20-ac-item { display:flex; align-items:baseline; gap:6px; padding:4px 8px; cursor:pointer; border-bottom:1px solid var(--aio-line-4); white-space:nowrap; }
        .r20-ac-item b { font-weight:700; overflow:hidden; text-overflow:clip; }
        .r20-ac-item small { color:var(--aio-ink-5); font-size:10px; overflow:hidden; text-overflow:clip; }
        .r20-ac-item.on, .r20-ac-item:hover { background:var(--aio-accent-bg); }
`);
addFeature("autofill", autofill);
// 자동완성 줄: 이름 옆에 데이터 상태(개수 · 불러오는 중 · 실패), 아래 칸에 데이터 주소
addBundle({ place: "main", order: 5, label: "기본시트 데이터 자동완성", sub: "",
    members: [["autofill", "autofill"]],
    extra: row => {
        const name = row.querySelector(".cs-name");
        const show = () => { name.textContent = `기본시트 데이터 자동완성 (${autofill.statusText()})`; };
        show();
        document.addEventListener("r20-ruledata", show);
        const rdRow = document.createElement("div");
        rdRow.className = "cs-row cs-rd";
        const rdInp = document.createElement("input");
        rdInp.type = "text";
        rdInp.placeholder = "데이터 주소 붙여넣기";
        rdInp.setAttribute("aria-label", "자동완성 데이터 주소");
        rdInp.value = autofill.getUrl();
        rdInp.addEventListener("change", () => { if (rdInp.value.trim()) rdInp.value = autofill.setUrl(rdInp.value); else autofill.clearData(); });
        // 홈페이지가 없으면 데이터 파일을 골라 브라우저에 넣어 둔다 (주소 칸은 비운다)
        const fileBtn = document.createElement("button");
        fileBtn.type = "button";
        fileBtn.className = "cs-rd-file";
        fileBtn.textContent = "파일";
        fileBtn.title = "데이터 파일(.js · .json)을 골라 이 브라우저에 넣어 두기";
        const fileInp = Object.assign(document.createElement("input"), { type: "file", accept: ".js,.json,text/javascript,application/json" });
        fileInp.style.cssText = "display:none !important";
        fileBtn.addEventListener("click", () => fileInp.click());
        fileInp.addEventListener("change", async () => {
            const f = fileInp.files[0];
            fileInp.value = "";
            if (f && await autofill.setFile(f)) rdInp.value = "";
        });
        const showFile = () => { const n = autofill.fileName(); rdInp.placeholder = n ? `파일: ${n}` : "데이터 주소 붙여넣기"; };
        showFile();
        document.addEventListener("r20-ruledata", showFile);
        rdRow.append(rdInp, fileBtn, fileInp);
        return [rdRow];
    } });

// ══════════ 채팅 단추 · 이모지 팔레트 ══════════

// ───────── 이모지 팔레트: 전송 왼쪽 단추 → 입력칸 위에 이모지 · 텍스트 이모티콘 · 내 것(직접 등록) ─────────
// 누르면 커서 자리에 넣고 팔레트는 열어 둔다. 우클릭: 내 것에 넣기/빼기. 최근 쓴 것·내 것은 이 브라우저에 저장
const emojiPalette = (() => {
    const E = s => s.split("|").map(x => { const i = x.indexOf(" "); return [x.slice(0, i), x.slice(i + 1)]; });
    const TEXTS = [["^^", "웃음"], ["^_^", "웃음"], ["ㅎㅅㅎ", "헤헤"], ["ㅎㅎ", "히히 웃음"], ["ㅋㅋㅋ", "웃음"], ["ㅠㅠ", "눈물 울음"], ["ㅜㅜ", "눈물 울음"], [";;", "땀 당황"],
        ["-_-", "무표정"], ["ㅡㅡ", "무표정 짜증"], [">_<", "꽉 부끄"], ["@_@", "어지러움"], ["T_T", "울음"], ["OTL", "좌절"], ["orz", "좌절"],
        ["(｡•̀ᴗ-)✧", "윙크 반짝"], ["٩(◕‿◕)۶", "신남"], ["(๑•̀ㅂ•́)و✧", "화이팅"], ["(╯°□°)╯︵ ┻━┻", "상 엎기 화남"], ["┬─┬ノ( º _ ºノ)", "상 정리"],
        ["¯\\_(ツ)_/¯", "몰라"], ["( ˘ω˘ )", "졸림 평온"], ["(*´▽`*)", "행복"], ["(´；ω；`)", "울음 눈물"], ["ʕ•ᴥ•ʔ", "곰"], ["ฅ^•ﻌ•^ฅ", "고양이"],
        ["(=^･ω･^=)", "고양이"], ["( •́ ̯•̀ )", "시무룩"], ["(ノ´ヮ`)ノ*: ･ﾟ", "반짝 신남"], ["✧*｡٩(ˊᗜˋ*)و✧*｡", "신남 기쁨"], ["(っ˘ω˘ς )", "포근 졸림"],
        ["( ˙▿˙ )", "멍"], ["(⊙_⊙)", "놀람"], ["(￣▽￣)", "흐뭇"], ["(｀・ω・´)", "결의 진지"], ["٩(๑`^´๑)۶", "화남"], ["(。>﹏<。)", "부끄 당황"],
        ["(づ｡◕‿‿◕｡)づ", "안아줘 포옹"], ["♪(´▽｀)", "노래 신남"], ["(｡•́︿•̀｡)", "시무룩 슬픔"], ["( ´ ▽ ` )ﾉ", "안녕 인사"], ["ヽ(・∀・)ﾉ", "만세"]];
    const GROUPS = [
        { k: "recent", icon: "🕘", name: "최근" },
        { k: "mine", icon: "⭐", name: "내 것" },
        { k: "text", icon: "^^", name: "텍스트 이모티콘", list: TEXTS, txt: true },
        { k: "face", icon: "😀", name: "표정", list: E("😀 웃음|😃 활짝|😄 신남|😁 히죽|😆 깔깔|😅 진땀|🤣 데굴데굴 웃음|😂 웃음 눈물|🙂 미소|🙃 거꾸로|😉 윙크|😊 수줍음 미소|😇 천사|🥰 사랑|😍 하트 눈|🤩 반짝 눈|😘 뽀뽀|😋 냠냠|😛 메롱|🤪 장난|🤭 입가림|🤫 쉿|🤔 생각|🤨 의심|😐 무표정|😑 멍|😶 말없음|😏 능글|😒 시큰둥|🙄 눈굴림|😬 이크|😌 안도|😔 시무룩|😪 졸림|😴 잠|😷 마스크|🤒 아픔|🥵 더움|🥶 추움|😵 어지러움|🤯 충격|🥳 파티 축하|😎 멋짐|🧐 관찰|😕 갸우뚱|😟 걱정|🥺 부탁|🥹 감동|😢 눈물|😭 엉엉 울음|😱 비명 놀람|😳 당황|😤 씩씩|😡 화남|🤬 욕|😈 악마|💀 해골|👻 유령|👽 외계인|🤖 로봇|💩 똥") },
        { k: "people", icon: "👋", name: "손·사람", list: E("👋 손 인사|👌 오케이|✌️ 브이|🤞 행운|👍 좋아요|👎 싫어요|👏 박수|🙌 만세|🙏 부탁 기도|🤝 악수|💪 힘|✋ 손바닥 멈춰|👉 오른쪽|👈 왼쪽|👆 위|👇 아래|🫶 하트 손|🫡 경례|🤷 몰라|🙇 꾸벅 사과|🙋 손들기|🙅 안돼|🙆 좋아|🤦 이마짚기|👀 눈 보기|👂 귀|🧠 뇌|🫠 녹음|💃 춤|🏃 달리기") },
        { k: "animal", icon: "🐱", name: "동물", list: E("🐱 고양이|🐶 강아지|🐰 토끼|🦊 여우|🐻 곰|🐼 판다|🐨 코알라|🐯 호랑이|🦁 사자|🐮 소|🐷 돼지|🐸 개구리|🐵 원숭이|🐔 닭|🐧 펭귄|🐦 새|🦜 앵무새|🦉 부엉이|🦇 박쥐|🐺 늑대|🐍 뱀|🐉 용|🐢 거북|🐟 물고기|🐠 열대어|🐙 문어|🦋 나비|🐝 벌|🕷️ 거미|🦄 유니콘") },
        { k: "food", icon: "🍎", name: "음식", list: E("🍎 사과|🍓 딸기|🍑 복숭아|🍋 레몬|🍇 포도|🍉 수박|🍞 빵|🧀 치즈|🍖 고기|🍗 치킨|🍔 햄버거|🍕 피자|🍜 라면|🍣 초밥|🍙 주먹밥|🍡 경단|🍰 케이크|🎂 생일 케이크|🍫 초콜릿|🍬 사탕|🍩 도넛|🍪 쿠키|☕ 커피|🍵 차|🧋 버블티|🍺 맥주|🍷 와인|🥂 건배") },
        { k: "play", icon: "🎲", name: "놀이·전투", list: E("🎲 주사위|🃏 카드 조커|🎴 화투|🀄 마작|♟️ 체스|🎭 연극 가면|🎮 게임|🕹️ 조이스틱|🎯 명중 다트|🏆 트로피|🥇 금메달|🎉 축하|🎊 색종이|🎁 선물|🎈 풍선|🎵 음표|🎶 음악|🎤 마이크|🎬 영화|📸 사진|⚔️ 칼 전투|🛡️ 방패|🏹 활|🔫 총|💣 폭탄|🧪 물약") },
        { k: "nature", icon: "🌸", name: "자연", list: E("☀️ 해|🌙 달|⭐ 별|🌟 반짝 별|✨ 반짝|☁️ 구름|🌧️ 비|⛈️ 천둥|❄️ 눈|⚡ 번개|🔥 불|💧 물방울|🌊 파도|🌈 무지개|🌸 벚꽃|🌹 장미|🌻 해바라기|🍀 네잎클로버|🍁 단풍|🌲 나무|🌵 선인장|🍄 버섯|🌕 보름달|🌑 그믐달|🪐 행성|🏰 성|⛩️ 신사|🌃 밤") },
        { k: "thing", icon: "💡", name: "사물", list: E("💡 전구|🗡️ 단검|🔪 칼|📜 두루마리|📖 책|📚 책더미|✉️ 편지|🔮 수정구|🗝️ 열쇠|🔒 잠금|💰 돈|💎 보석|👑 왕관|🎩 모자|👓 안경|⌛ 모래시계|⏰ 시계|📱 휴대폰|💻 노트북|🕯️ 촛불|🧸 곰인형|🪄 마법 지팡이|🧿 부적|⚰️ 관|🩸 피|💊 약|🔍 돋보기|📌 핀") },
        { k: "symbol", icon: "❤️", name: "기호", list: E("❤️ 하트 빨강|🧡 주황 하트|💛 노랑 하트|💚 초록 하트|💙 파랑 하트|💜 보라 하트|🖤 검은 하트|🤍 흰 하트|💔 깨진 하트|💕 하트 둘|💖 반짝 하트|💯 백점|💢 분노|💥 쾅|💦 땀|💨 휙|💤 쿨쿨|💬 말풍선|💭 생각 풍선|❗ 느낌표|❓ 물음표|‼️ 느낌표 둘|⁉️ 물음 느낌|✅ 체크|❌ 엑스|⭕ 동그라미|🔺 세모|➡️ 화살표|♪ 음표 기호|★ 검은 별|☆ 흰 별|♡ 빈 하트|♥ 하트 기호") }
    ];
    const RECENT = "r20_emo_recent", MINE = "r20_emo_mine", TAB = "r20_emo_tab";
    const read = k => { try { const v = JSON.parse(localStorage.getItem(k) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
    const all = () => GROUPS.filter(g => g.list).flatMap(g => g.list);
    const nameOf = t => (read(MINE).find(x => x[0] === t) || all().find(x => x[0] === t) || [t, ""])[1];
    const isEmoji = t => [...t].length <= 3 && /\p{Extended_Pictographic}/u.test(t);
    const SMILE = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9.5h.01M15 9.5h.01"/></svg>';
    let pop = null, tab = localStorage.getItem(TAB) || "face", q = "", sel = null, note = "";
    const ta = () => document.querySelector("#textchat-input textarea");
    const btn = () => document.getElementById("custom-emoji-toggle");
    const isOpen = () => !!pop && !pop.hidden;
    const paintBtn = () => {
        const b = btn();
        if (!b) return;
        applyBtnColors(b, isOpen(), { bg: CONFIG.activeBg, text: CONFIG.activeText, border: CONFIG.activeBorder });
        b.setAttribute("aria-expanded", String(isOpen()));
    };
    const listNow = () => {
        const s = q.trim().toLowerCase();
        if (s) {
            const seen = new Set();
            return [...read(MINE), ...all()].filter(([t, n]) => (String(n).toLowerCase().includes(s) || t.toLowerCase().includes(s)) && !seen.has(t) && seen.add(t));
        }
        if (tab === "recent") return read(RECENT).map(t => [t, nameOf(t)]);
        if (tab === "mine") return read(MINE);
        return GROUPS.find(g => g.k === tab)?.list || [];
    };
    const render = () => {
        if (!pop) return;
        pop.querySelectorAll(".tabs button").forEach(b => b.setAttribute("aria-selected", String(!q && b.dataset.k === tab)));
        const g = GROUPS.find(x => x.k === tab);
        const items = listNow();
        pop.querySelector(".head").textContent = note || (q ? `'${q}' 찾기` : g?.name || "") + (tab === "mine" && !q ? " · 우클릭으로 빼기" : "");
        const grid = pop.querySelector(".grid");
        grid.textContent = "";
        items.forEach(([t, n]) => {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "it " + (isEmoji(t) ? "e" : "t");
            b.dataset.t = t;
            b.textContent = t;
            const mine = read(MINE).some(x => x[0] === t);
            b.title = (n ? n + " · " : "") + (mine ? "클릭: 넣기 · 우클릭: 내 것에서 빼기" : "클릭: 넣기 · 우클릭: 내 것에 넣기");
            b.setAttribute("aria-label", n || t);
            grid.appendChild(b);
        });
        if (!items.length) grid.innerHTML = `<div class="empty">${q ? "찾는 것이 없어요" : tab === "recent" ? "아직 쓴 것이 없어요" : tab === "mine" ? "아래에서 등록하거나, 다른 탭에서 우클릭해 넣어요" : ""}</div>`;
        pop.querySelector(".add").hidden = !(tab === "mine" && !q);
    };
    const flash = msg => { note = msg; render(); setTimeout(() => { note = ""; render(); }, 1200); };
    const insert = t => {
        const el = ta();
        if (!el) return;
        if (document.activeElement !== el) { el.focus(); if (sel) el.setSelectionRange(sel[0], sel[1]); }
        // insertText: 되돌리기(Ctrl+Z)가 되고 input 이벤트도 난다. 안 되면 직접 끼운다
        if (!document.execCommand("insertText", false, t)) {
            el.setRangeText(t, el.selectionStart, el.selectionEnd, "end");
            el.dispatchEvent(new Event("input", { bubbles: true }));
        }
        sel = [el.selectionStart, el.selectionEnd];
        localStorage.setItem(RECENT, JSON.stringify([t, ...read(RECENT).filter(x => x !== t)].slice(0, 32)));
    };
    const toggleMine = t => {
        const mine = read(MINE), has = mine.some(x => x[0] === t);
        localStorage.setItem(MINE, JSON.stringify(has ? mine.filter(x => x[0] !== t) : [...mine, [t, nameOf(t)]]));
        flash(has ? `'${t}' 를 내 것에서 뺐어요` : `'${t}' 를 내 것에 넣었어요`);
    };
    const place = () => {
        const c = document.getElementById("textchat-input");
        if (!pop || !c) return;
        const r = c.getBoundingClientRect();
        const z = aioZoom.get();
        pop.style.width = zpx(Math.round(Math.max(220, Math.min(330 * z, r.width - 8))));
        pop.style.right = zpx(Math.round(innerWidth - r.right + 4));
        pop.style.bottom = zpx(Math.round(innerHeight - r.top + 4));
        pop.style.height = zpx(Math.round(Math.max(180, Math.min(330 * z, r.top - 8))));
    };
    const build = () => {
        pop = document.createElement("div");
        pop.id = "r20-emoji";
        pop.setAttribute("role", "dialog");
        pop.setAttribute("aria-label", "이모지 팔레트");
        pop.hidden = true;
        pop.innerHTML = '<input type="search" class="q" placeholder="찾기 (예: 웃음, 하트, 고양이)" aria-label="이모지 찾기"><div class="tabs" role="tablist" aria-label="분류"></div>'
            + '<div class="head" aria-live="polite"></div><div class="grid"></div>'
            + '<form class="add"><input class="at" placeholder="넣을 글자 (이모지·이모티콘)" aria-label="등록할 글자" required><input class="an" placeholder="이름 (찾기용)" aria-label="이름"><button type="submit">등록</button></form>';
        const tabs = pop.querySelector(".tabs");
        GROUPS.forEach(g => {
            const b = document.createElement("button");
            b.type = "button";
            b.setAttribute("role", "tab");
            b.dataset.k = g.k;
            b.title = b.ariaLabel = g.name;
            b.textContent = g.icon;
            if (g.icon === "^^") b.className = "txt";
            tabs.appendChild(b);
        });
        tabs.addEventListener("click", e => {
            const b = e.target.closest("button[data-k]");
            if (!b) return;
            tab = b.dataset.k; q = ""; pop.querySelector(".q").value = "";
            localStorage.setItem(TAB, tab);
            render();
        });
        pop.querySelector(".q").addEventListener("input", e => { q = e.target.value; render(); });
        pop.addEventListener("keydown", e => { e.stopPropagation(); if (e.key === "Escape") { close(); ta()?.focus(); } });    // Roll20 단축키로 새지 않게
        const grid = pop.querySelector(".grid");
        grid.addEventListener("mousedown", e => { if (e.target.closest(".it")) e.preventDefault(); });      // 입력칸 커서를 잃지 않게
        grid.addEventListener("click", e => { const b = e.target.closest(".it"); if (b) insert(b.dataset.t); });
        grid.addEventListener("contextmenu", e => { const b = e.target.closest(".it"); if (!b) return; e.preventDefault(); e.stopPropagation(); toggleMine(b.dataset.t); });
        pop.querySelector(".add").addEventListener("submit", e => {
            e.preventDefault();
            const t = pop.querySelector(".at").value.trim(), n = pop.querySelector(".an").value.trim();
            if (!t) return;
            localStorage.setItem(MINE, JSON.stringify([...read(MINE).filter(x => x[0] !== t), [t, n]]));
            pop.querySelector(".at").value = pop.querySelector(".an").value = "";
            flash(`'${t}' 를 등록했어요`);
        });
        document.body.appendChild(pop);
    };
    const open = () => {
        if (!pop) build();
        const el = ta();
        if (el && document.activeElement === el) sel = [el.selectionStart, el.selectionEnd];
        pop.hidden = false;
        place(); render(); paintBtn();
    };
    const close = () => { if (pop) pop.hidden = true; paintBtn(); };
    // 입력칸을 떠날 때 커서 자리를 기억해 둔다 (찾기 칸에 글을 쓰다가 눌러도 그 자리에 들어가게)
    document.addEventListener("focusout", e => { if (e.target === ta()) sel = [e.target.selectionStart, e.target.selectionEnd]; }, true);
    document.addEventListener("pointerdown", e => { if (isOpen() && !pop.contains(e.target) && !btn()?.contains(e.target) && e.target !== ta()) close(); }, true);     // 입력칸을 눌러 커서를 옮기는 건 열어 둔다
    document.addEventListener("keydown", e => { if (isOpen() && e.key === "Escape") close(); }, true);
    window.addEventListener("resize", () => isOpen() && place());
    const inject = () => {
        const send = document.getElementById("chatSendBtn");
        if (!btnVisible.emoji || !send || btn() || !send.closest("#textchat-input")) return;
        const b = document.createElement("button");
        b.type = "button";
        b.id = "custom-emoji-toggle";
        b.title = "이모지 · 이모티콘";
        b.setAttribute("aria-label", "이모지 팔레트");
        b.innerHTML = SMILE;
        b.style.cssText = sharedBtnStyle + "margin-left:auto !important; margin-right:4px !important; padding:1px 5px !important; display:inline-flex; align-items:center; justify-content:center;";
        b.addEventListener("mousedown", e => e.preventDefault());
        b.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); isOpen() ? close() : open(); });
        addStyleRefresh(b, paintBtn);
        send.before(b);
        paintBtn();
    };
    const setEnabled = v => {
        if (v) return inject();
        close();
        btn()?.remove();
    };
    return { inject, setEnabled };
})();

addCss(`
        /* 이모지 팔레트 (입력칸 위) */
        #r20-emoji { position:fixed; z-index:10005; display:flex; flex-direction:column; background:var(--aio-bg); border:1px solid var(--aio-line-2); border-radius:var(--aio-r-lg); box-shadow:0 8px 24px rgba(0,0,0,0.22); overflow:hidden; font-family:sans-serif; color:var(--aio-ink-2); }
        #r20-emoji[hidden] { display:none; }
        #r20-emoji .q { flex-shrink:0; width:auto; height:28px; margin:8px 8px 4px; padding:0 10px; border:1px solid var(--aio-line-2); border-radius:14px; font-size:12px; outline:none; box-sizing:border-box; box-shadow:none; }
        #r20-emoji .q:focus { border-color:var(--aio-accent); }
        #r20-emoji .tabs { flex-shrink:0; display:flex; padding:0 4px; border-bottom:1px solid var(--aio-line-4); }
        #r20-emoji .tabs button { flex:1; min-width:0; height:28px; margin:0; padding:0; border:0; border-bottom:2px solid transparent; border-radius:0; background:none; font-size:15px; cursor:pointer; opacity:0.55; }
        #r20-emoji .tabs button.txt { font-size:11px; font-weight:700; color:var(--aio-ink-3); }
        #r20-emoji .tabs button[aria-selected="true"] { opacity:1; border-bottom-color:var(--aio-accent); }
        #r20-emoji .tabs button:focus-visible { outline:2px solid var(--aio-accent); outline-offset:-2px; }
        #r20-emoji .head { flex-shrink:0; padding:4px 10px 2px; font-size:11px; font-weight:700; color:var(--aio-ink-4); }
        #r20-emoji .grid { flex:1; min-height:0; overflow-y:auto; padding:2px 6px 8px; display:flex; flex-wrap:wrap; align-content:flex-start; gap:2px; scrollbar-width:thin; }
        #r20-emoji .it { margin:0; border:0; border-radius:var(--aio-r); background:none; color:var(--aio-ink-2); cursor:pointer; }
        #r20-emoji .it.e { width:34px; height:34px; padding:0; font-size:21px; line-height:34px; }
        #r20-emoji .it.t { height:28px; padding:0 8px; background:var(--aio-bg-3); font-size:13px; white-space:nowrap; }
        #r20-emoji .it:hover, #r20-emoji .it:focus-visible { background:var(--aio-accent-bg); outline:none; }
        #r20-emoji .empty { padding:12px 6px; font-size:12px; color:var(--aio-ink-5); }
        #r20-emoji .add { flex-shrink:0; display:flex; gap:4px; margin:0; padding:6px 8px; border-top:1px solid var(--aio-line-4); }
        #r20-emoji .add[hidden] { display:none; }
        #r20-emoji .add input { min-width:0; height:26px; margin:0; padding:0 8px; border:1px solid var(--aio-line-2); border-radius:var(--aio-r-sm); font-size:12px; box-sizing:border-box; box-shadow:none; }
        #r20-emoji .add .at { flex:1.4; }
        #r20-emoji .add .an { flex:1; }
        #r20-emoji .add button { flex-shrink:0; height:26px; margin:0; padding:0 10px; border:0; border-radius:var(--aio-r-sm); background:var(--aio-accent); color:#fff; font-size:12px; cursor:pointer; }
`);
addFeature("emojiPalette", emojiPalette);
addBundle({ place: "chat", order: 1, label: "이모지 팔레트", sub: "", members: [["emoji", "emojiPalette"]] });

// ══════════ 시작 ══════════

// 스타일은 바탕 CSS + 묶음마다 등록한 CSS 를 한 번에 넣는다
// (예전 버전 사본이 먼저 넣은 스타일이 있으면 알리고 이 버전 것으로 바꾼다)
// 채팅 아카이브 페이지: 로그 백업 단추만 (묶음을 뺀 판이면 아무것도 안 한다)
if (IS_ARCHIVE) { FEAT.logBackup?.archive(); return; }
const oldAddonStyle = document.getElementById("r20-addon-style");
if (oldAddonStyle && !oldAddonStyle.dataset.aio) warnDuplicate();
if (!oldAddonStyle || !oldAddonStyle.dataset.aio) {
    const style = oldAddonStyle || document.createElement("style");
    style.id = "r20-addon-style";
    style.dataset.aio = "1";
    style.textContent = [CORE_CSS, ...CSS_PARTS].join("\n");
    document.head.appendChild(style);
}
// 한 기능이 오류를 내도 나머지는 계속 붙도록 하나씩 따로 돌린다
const injectAll = () => {
    try { applyCocofoliaLayout(); } catch (e) { console.warn("[올인원] 채팅 입력칸 오류", e); }
    const all = DIRTY.all;
    DIRTY.all = false;
    for (const [name, mod] of Object.entries(FEAT)) {
        if (mod.watch && !all && !DIRTY.set.delete(name)) continue;
        try { mod.inject?.(); } catch (e) { console.warn(`[올인원] ${name} 오류 — 이 기능만 건너뜀`, e); }
    }
};
const markDirty = recs => {
    if (DIRTY.all) return;
    for (const [name, mod] of Object.entries(FEAT)) {
        const sel = mod.watch;
        if (!sel || DIRTY.set.has(name)) continue;
        const hit = recs.some(r => r.target.closest?.(sel)
            || [...r.addedNodes].some(n => n.nodeType === 1 && (n.matches(sel) || n.querySelector(sel))));
        if (hit) DIRTY.set.add(name);
    }
};
// instant 기능: 그 요소가 새로 생긴 순간 바로
const injectNow = recs => {
    for (const [name, mod] of Object.entries(FEAT)) {
        const sel = mod.instant && mod.watch;
        if (!sel || !recs.some(r => [...r.addedNodes].some(n => n.nodeType === 1 && (n.matches(sel) || n.querySelector(sel))))) continue;
        try { mod.inject(); } catch (e) { console.warn(`[올인원] ${name} 오류 — 이 기능만 건너뜀`, e); }
    }
};
let _layoutTimer = null;
new MutationObserver(recs => {
    injectNow(recs);
    markDirty(recs);
    clearTimeout(_layoutTimer);
    _layoutTimer = setTimeout(injectAll, 100);
}).observe(document.body, { childList: true, subtree: true });
injectAll();


})();
