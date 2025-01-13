"use strict";
// @ts-nocheck
(function () {
    // Inicialización
    const vscode = acquireVsCodeApi();
    const list = document.getElementById("qa-list");
    "use strict";
// @ts-nocheck
(function () {
    // Inicialización
    const vscode = acquireVsCodeApi();
    const list = document.getElementById("qa-list");
    const qaList = document.getElementById("qa-list");
if (qaList) {
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "button-container";

    const conceptButton = document.createElement("button");
    conceptButton.className = "concept-button";
    conceptButton.textContent = "Concept";
    conceptButton.addEventListener("click", function () {
        vscode.postMessage({ type: "askAIConcept" });
    });

    const usageButton = document.createElement("button");
    usageButton.className = "usage-button";
    usageButton.textContent = "Usage";
    usageButton.addEventListener("click", function () {
        vscode.postMessage({ type: "askAIUsage" });
    });

    buttonContainer.appendChild(conceptButton);
    buttonContainer.appendChild(usageButton);
    qaList.insertAdjacentElement('beforebegin', buttonContainer);
} else {
    console.error("No se pudo encontrar el contenedor #qa-list para añadir los botones.");
}
    let collapseId = 0;
    let detailId = 0;
    // Iconos personalizados
    const userIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" 
        stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2" style="color: var(--buddy-primary)">
        <path stroke-linecap="round" stroke-linejoin="round" 
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>`;
    const aiIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" 
        stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2" style="color: var(--buddy-primary)">
        <path stroke-linecap="round" stroke-linejoin="round" 
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>`;
    // Manejadores de eventos
    const detailButtonHandler = function (e, buttonType) {
        var _a, _b, _c;
        e.preventDefault();
        e.stopPropagation();
        const overviewId = e.target.id.split("-").slice(-1)[0];
        const inputApi = document.getElementById(`code-input-${overviewId}`);
        const fileName = document.getElementById(`filename-${overviewId}`);
        const overviewRef = document.getElementById(`overview-${overviewId}`);
        if (((_a = inputApi === null || inputApi === void 0 ? void 0 : inputApi.value) === null || _a === void 0 ? void 0 : _a.length) > 0) {
            (_c = (_b = document.getElementById("in-progress")) === null || _b === void 0 ? void 0 : _b.classList) === null || _c === void 0 ? void 0 : _c.remove("hidden");
            vscode.postMessage({
                type: buttonType,
                code: inputApi.value,
                filename: fileName.value,
                queryId: overviewId,
                overviewRef: overviewRef.value
            });
        }
    };
    const commentHandler = function (e) {
        var _a;
        e.preventDefault();
        e.stopPropagation();
        const commentId = e.target.id.replace("-comment", "");
        const commentToEmbed = document.getElementById(commentId);
        if (((_a = commentToEmbed === null || commentToEmbed === void 0 ? void 0 : commentToEmbed.value) === null || _a === void 0 ? void 0 : _a.length) > 0) {
            vscode.postMessage({
                type: "embedComment",
                value: commentToEmbed.value,
                commentType: commentId
            });
        }
    };
    const refreshHandler = function (e) {
        var _a, _b, _c;
        e.preventDefault();
        e.stopPropagation();
        const promptId = e.target.id.replace("refresh", "prompt");
        const overviewId = promptId.split("-").slice(-1)[0];
        const prompt = document.getElementById(promptId);
        const queryType = e.target.id.split("-")[0];
        const refreshId = queryType === "overview" ?
            `collapse-overview-${overviewId}` :
            `collapse-${overviewId}`;
        if (((_a = prompt === null || prompt === void 0 ? void 0 : prompt.value) === null || _a === void 0 ? void 0 : _a.length) > 0) {
            (_c = (_b = document.getElementById("in-progress")) === null || _b === void 0 ? void 0 : _b.classList) === null || _c === void 0 ? void 0 : _c.remove("hidden");
            vscode.postMessage({
                type: "reaskAI",
                queryType: queryType,
                overviewId: overviewId,
                refreshId: refreshId,
                prompt: prompt.value,
                commentType: e.target.id.replace("-refresh", "")
            });
        }
    };
    const collapseHandler = function (e, type = '') {
        e.preventDefault();
        e.stopPropagation();
        const curCollapseId = e.target.id.split("-").slice(-1)[0];
        const itemToCollapse = document.getElementById(`collapse${type}-${curCollapseId}`);
        const collapseButton = document.getElementById(`collapse${type}-button-${curCollapseId}`);
        if (itemToCollapse === null || itemToCollapse === void 0 ? void 0 : itemToCollapse.classList.contains("hidden")) {
            itemToCollapse.classList.remove("hidden");
            collapseButton.innerHTML = "▼";
        }
        else {
            itemToCollapse.classList.add("hidden");
            collapseButton.innerHTML = "▶";
        }
    };
    // Manejador de mensajes
    window.addEventListener("message", (event) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z;
        const message = event.data;
        let curQueryList;
        switch (message.type) {
            case "stopProgress":
                (_b = (_a = document.getElementById("in-progress")) === null || _a === void 0 ? void 0 : _a.classList) === null || _b === void 0 ? void 0 : _b.add("hidden");
                hideLoader();
                break;
            case "addNLQuestion":
                const nlcodeHtml = message.code ? message.codeHtml : "";
                const nlHtml = message.value;
                const processedPrompt = message.prompt.replace(/"/g, '&quot;');
                const hline = message.addHLine ? "<hr/>" : "";
                list.insertAdjacentHTML('beforeend', `<div class="buddy-card">
                        ${hline}
                        <div class="font-bold mb-2 flex items-center">
                            ${userIcon}
                            <span>Tú: Consulta</span>
                            <button class="buddy-button-icon ml-auto" id="query-refresh-${message.overviewId}">↻</button>
                        </div>
                        <div class="buddy-content">${nlHtml}</div>
                        ${nlcodeHtml}
                        <input type="hidden" id="query-prompt-${message.overviewId}" value="${processedPrompt}" />
                        <div id="query-div-${message.overviewId}"></div>
                    </div>`);
                (_d = (_c = document.getElementById("in-progress")) === null || _c === void 0 ? void 0 : _c.classList) === null || _d === void 0 ? void 0 : _d.remove("hidden");
                list.scrollTo(0, list.scrollHeight);
                (_e = document.getElementById(`query-refresh-${message.overviewId}`)) === null || _e === void 0 ? void 0 : _e.addEventListener("click", refreshHandler);
                hideLoader();
                break;
            case "addCodeQuestion":
                const codeHtml = message.codeHtml;
                const processedCode = message.code.replace(/"/g, '&quot;');
                const processedCodePrompt = message.prompt.replace(/"/g, '&quot;');
                list.insertAdjacentHTML('beforeend', `<div class="buddy-card">
                        <hr>
                        <div class="font-bold mb-2 flex items-center">
                            ${userIcon}
                            <span>Tú</span>
                            <button class="buddy-button-icon ml-auto" id="overview-refresh-${message.overviewId}">↻</button>
                        </div>
                        <div class="buddy-code">${codeHtml}</div>
                        <input type="hidden" id="code-input-${message.overviewId}" value="${processedCode}" />
                        <input type="hidden" id="filename-${message.overviewId}" value="${message.filename}" />
                        <input type="hidden" id="overview-prompt-${message.overviewId}" value="${processedCodePrompt}" />
                        <div id="code-div-${message.overviewId}"></div>
                    </div>`);
                (_g = (_f = document.getElementById("in-progress")) === null || _f === void 0 ? void 0 : _f.classList) === null || _g === void 0 ? void 0 : _g.remove("hidden");
                list.scrollTo(0, list.scrollHeight);
                (_h = document.getElementById(`overview-refresh-${message.overviewId}`)) === null || _h === void 0 ? void 0 : _h.addEventListener("click", refreshHandler);
                hideLoader();
                break;
            case "addOverview":
                (_k = (_j = document.getElementById("in-progress")) === null || _j === void 0 ? void 0 : _j.classList) === null || _k === void 0 ? void 0 : _k.add("hidden");
                curQueryList = document.getElementById(`code-div-${message.overviewId}`);
                curQueryList.insertAdjacentHTML('beforeend', `<div class="buddy-response-card">
                        <div class="font-bold mb-2 flex items-center">
                            ${aiIcon}
                            <span>Buddy: Resumen</span>
                            <button class="buddy-button-secondary ml-auto" id="overview-comment-${message.overviewId}">Insertar</button>
                            <button class="buddy-button-icon ml-2" id="collapse-overview-button-${message.overviewId}">▼</button>
                        </div>
                        <div id="collapse-overview-${message.overviewId}" class="buddy-content">
                            <div class="buddy-highlight">${message.valueHtml}</div>
                            <input type="hidden" id="overview-${message.overviewId}" value="${message.value.replace(/"/g, '&quot;')}" />
                            <div class="buddy-actions">
                                <span>Explica más sobre</span>
                                <button class="buddy-button" id="concept-button-${message.overviewId}">Conceptos</button>
                                <button class="buddy-button" id="usage-button-${message.overviewId}">Ejemplos</button>
                            </div>   
                        </div>
                    </div>`);
                (_l = document.getElementById(`collapse-overview-button-${message.overviewId}`)) === null || _l === void 0 ? void 0 : _l.addEventListener("click", e => collapseHandler(e, '-overview'));
                (_m = document.getElementById(`overview-comment-${message.overviewId}`)) === null || _m === void 0 ? void 0 : _m.addEventListener("click", commentHandler);
                (_o = document.getElementById(`concept-button-${message.overviewId}`)) === null || _o === void 0 ? void 0 : _o.addEventListener("click", e => detailButtonHandler(e, "askAIConcept"));
                (_p = document.getElementById(`usage-button-${message.overviewId}`)) === null || _p === void 0 ? void 0 : _p.addEventListener("click", e => detailButtonHandler(e, "askAIUsage"));
                hideLoader();
                break;
            case "addDetail":
                (_r = (_q = document.getElementById("in-progress")) === null || _q === void 0 ? void 0 : _q.classList) === null || _r === void 0 ? void 0 : _r.add("hidden");
                const detailHtml = `
                    <div class="buddy-detail-card">
                        <div class="font-bold mb-1 flex items-center">
                            ${aiIcon}
                            <span>${message.detailType}</span>
                            <button class="buddy-button-secondary ml-auto" 
                                id="${message.detailType}-comment-${detailId}">Insertar</button>
                            <button class="buddy-button-icon ml-2" 
                                id="collapse-button-${collapseId}">▼</button>
                        </div>
                        <div id="collapse-${collapseId}" class="buddy-content">
                            <div class="buddy-highlight">${message.valueHtml}</div>
                            <input type="hidden" id="${message.detailType}-${detailId}" 
                                value="${message.value.replace(/"/g, '&quot;')}" />
                        </div>
                    </div>`;
                if (message.detailType === "query") {
                    curQueryList = document.getElementById(`query-div-${message.queryId}`);
                }
                else {
                    curQueryList = document.getElementById(`collapse-overview-${message.queryId}`);
                }
                curQueryList.insertAdjacentHTML('beforeend', detailHtml);
                (_s = document.getElementById(`collapse-button-${collapseId}`)) === null || _s === void 0 ? void 0 : _s.addEventListener("click", collapseHandler);
                (_t = document.getElementById(`${message.detailType}-comment-${detailId}`)) === null || _t === void 0 ? void 0 : _t.addEventListener("click", commentHandler);
                detailId++;
                collapseId++;
                list.scrollTo(0, list.scrollHeight);
                hideLoader();
                break;
            case "redoQuery":
                (_v = (_u = document.getElementById("in-progress")) === null || _u === void 0 ? void 0 : _u.classList) === null || _v === void 0 ? void 0 : _v.add("hidden");
                const divToReplace = document.getElementById(`collapse-overview-${message.overviewId}`);
                const replaceOverviewId = message.queryId.split("-").slice(-1)[0];
                if (message.queryType === "overview") {
                    divToReplace.innerHTML = `
                        <div class="buddy-highlight">${message.valueHtml}</div>
                        <input type="hidden" id="overview-${replaceOverviewId}" value="${message.value.replace(/"/g, '&quot;')}" />
                        <div class="buddy-actions">
                            <span>Explica más sobre</span>
                            <button class="buddy-button" id="concept-button-${replaceOverviewId}">Conceptos</button>
                            <button class="buddy-button" id="usage-button-${replaceOverviewId}">Ejemplos</button>
                        </div>`;
                    (_w = document.getElementById(`concept-button-${replaceOverviewId}`)) === null || _w === void 0 ? void 0 : _w.addEventListener("click", e => detailButtonHandler(e, "askAIConcept"));
                    (_x = document.getElementById(`usage-button-${replaceOverviewId}`)) === null || _x === void 0 ? void 0 : _x.addEventListener("click", e => detailButtonHandler(e, "askAIUsage"));
                }
                else {
                    const queryHtml = `
                        <div class="buddy-highlight">${message.valueHtml}</div>
                        <input type="hidden" id="${message.queryType}-${replaceOverviewId}" 
                            value="${message.value.replace(/"/g, '&quot;')}" />`;
                    if (divToReplace) {
                        divToReplace.innerHTML = queryHtml;
                    }
                    else {
                        curQueryList = document.getElementById(`query-div-${replaceOverviewId}`);
                        curQueryList.insertAdjacentHTML('beforeend', `<div class="buddy-detail-card">
                                <div class="font-bold mb-1 flex items-center">
                                    ${aiIcon}
                                    <span>${message.queryType}</span>
                                    <button class="buddy-button-secondary ml-auto" 
                                        id="${message.queryType}-comment-${replaceOverviewId}">Insertar</button>
                                    <button class="buddy-button-icon ml-2" 
                                        id="collapse-overview-button-${replaceOverviewId}">▼</button>
                                </div>
                                <div id="collapse-overview-${replaceOverviewId}" class="buddy-content">
                                    ${queryHtml}
                                </div>
                            </div>`);
                        (_y = document.getElementById(`collapse-overview-button-${replaceOverviewId}`)) === null || _y === void 0 ? void 0 : _y.addEventListener("click", collapseHandler);
                        (_z = document.getElementById(`${message.queryType}-comment-${replaceOverviewId}`)) === null || _z === void 0 ? void 0 : _z.addEventListener("click", commentHandler);
                    }
                }
                hideLoader();
                break;
        }
    });
    // Configuración de eventos iniciales
    const submitHandler = function (e) {
        var _a;
        e.preventDefault();
        e.stopPropagation();
        const input = document.getElementById("question-input");
        if (((_a = input === null || input === void 0 ? void 0 : input.value) === null || _a === void 0 ? void 0 : _a.length) > 0) {
            vscode.postMessage({
                type: "askAIfromTab",
                value: input.value
            });
            input.value = "";
        }
    };
    // Inicialización de eventos de la interfaz
    const initializeUIEvents = () => {
        var _a, _b, _c, _d;
        // Botón de limpiar chat
        (_a = document.getElementById("clear-button")) === null || _a === void 0 ? void 0 : _a.addEventListener("click", () => {
            list.innerHTML = "";
            vscode.postMessage({ type: "clearChat" });
        });
        // Botón de detener consulta
        (_b = document.getElementById("stop-button")) === null || _b === void 0 ? void 0 : _b.addEventListener("click", () => {
            vscode.postMessage({ type: "stopQuery" });
        });
        // Botón de preguntar
        (_c = document.getElementById("ask-button")) === null || _c === void 0 ? void 0 : _c.addEventListener("click", submitHandler);
        // Entrada de texto
        (_d = document.getElementById("question-input")) === null || _d === void 0 ? void 0 : _d.addEventListener("keydown", function (e) {
            if (e.key === "Enter" && !e.shiftKey) {
                submitHandler(e);
            }
        });
    };
    // Inicializar eventos al cargar
    initializeUIEvents();
})();
//# sourceMappingURL=main.js.map
    let collapseId = 0;
    let detailId = 0;
    // Iconos personalizados
    const userIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" 
        stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2" style="color: var(--buddy-primary)">
        <path stroke-linecap="round" stroke-linejoin="round" 
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>`;
    const aiIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" 
        stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2" style="color: var(--buddy-primary)">
        <path stroke-linecap="round" stroke-linejoin="round" 
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>`;
    // Manejadores de eventos
    const detailButtonHandler = function (e, buttonType) {
        var _a, _b, _c;
        e.preventDefault();
        e.stopPropagation();
        const overviewId = e.target.id.split("-").slice(-1)[0];
        const inputApi = document.getElementById(`code-input-${overviewId}`);
        const fileName = document.getElementById(`filename-${overviewId}`);
        const overviewRef = document.getElementById(`overview-${overviewId}`);
        if (((_a = inputApi === null || inputApi === void 0 ? void 0 : inputApi.value) === null || _a === void 0 ? void 0 : _a.length) > 0) {
            (_c = (_b = document.getElementById("in-progress")) === null || _b === void 0 ? void 0 : _b.classList) === null || _c === void 0 ? void 0 : _c.remove("hidden");
            vscode.postMessage({
                type: buttonType,
                code: inputApi.value,
                filename: fileName.value,
                queryId: overviewId,
                overviewRef: overviewRef.value
            });
        }
    };
    const commentHandler = function (e) {
        var _a;
        e.preventDefault();
        e.stopPropagation();
        const commentId = e.target.id.replace("-comment", "");
        const commentToEmbed = document.getElementById(commentId);
        if (((_a = commentToEmbed === null || commentToEmbed === void 0 ? void 0 : commentToEmbed.value) === null || _a === void 0 ? void 0 : _a.length) > 0) {
            vscode.postMessage({
                type: "embedComment",
                value: commentToEmbed.value,
                commentType: commentId
            });
        }
    };
    const refreshHandler = function (e) {
        var _a, _b, _c;
        e.preventDefault();
        e.stopPropagation();
        const promptId = e.target.id.replace("refresh", "prompt");
        const overviewId = promptId.split("-").slice(-1)[0];
        const prompt = document.getElementById(promptId);
        const queryType = e.target.id.split("-")[0];
        const refreshId = queryType === "overview" ?
            `collapse-overview-${overviewId}` :
            `collapse-${overviewId}`;
        if (((_a = prompt === null || prompt === void 0 ? void 0 : prompt.value) === null || _a === void 0 ? void 0 : _a.length) > 0) {
            (_c = (_b = document.getElementById("in-progress")) === null || _b === void 0 ? void 0 : _b.classList) === null || _c === void 0 ? void 0 : _c.remove("hidden");
            vscode.postMessage({
                type: "reaskAI",
                queryType: queryType,
                overviewId: overviewId,
                refreshId: refreshId,
                prompt: prompt.value,
                commentType: e.target.id.replace("-refresh", "")
            });
        }
    };
    const collapseHandler = function (e, type = '') {
        e.preventDefault();
        e.stopPropagation();
        const curCollapseId = e.target.id.split("-").slice(-1)[0];
        const itemToCollapse = document.getElementById(`collapse${type}-${curCollapseId}`);
        const collapseButton = document.getElementById(`collapse${type}-button-${curCollapseId}`);
        if (itemToCollapse === null || itemToCollapse === void 0 ? void 0 : itemToCollapse.classList.contains("hidden")) {
            itemToCollapse.classList.remove("hidden");
            collapseButton.innerHTML = "▼";
        }
        else {
            itemToCollapse.classList.add("hidden");
            collapseButton.innerHTML = "▶";
        }
    };
    // Manejador de mensajes
    window.addEventListener("message", (event) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z;
        const message = event.data;
        let curQueryList;
        switch (message.type) {
            case "stopProgress":
                (_b = (_a = document.getElementById("in-progress")) === null || _a === void 0 ? void 0 : _a.classList) === null || _b === void 0 ? void 0 : _b.add("hidden");
                hideLoader();
                break;
            case "addNLQuestion":
                const nlcodeHtml = message.code ? message.codeHtml : "";
                const nlHtml = message.value;
                const processedPrompt = message.prompt.replace(/"/g, '&quot;');
                const hline = message.addHLine ? "<hr/>" : "";
                list.insertAdjacentHTML('beforeend', `<div class="buddy-card">
                        ${hline}
                        <div class="font-bold mb-2 flex items-center">
                            ${userIcon}
                            <span>Tú: Consulta</span>
                            <button class="buddy-button-icon ml-auto" id="query-refresh-${message.overviewId}">↻</button>
                        </div>
                        <div class="buddy-content">${nlHtml}</div>
                        ${nlcodeHtml}
                        <input type="hidden" id="query-prompt-${message.overviewId}" value="${processedPrompt}" />
                        <div id="query-div-${message.overviewId}"></div>
                    </div>`);
                (_d = (_c = document.getElementById("in-progress")) === null || _c === void 0 ? void 0 : _c.classList) === null || _d === void 0 ? void 0 : _d.remove("hidden");
                list.scrollTo(0, list.scrollHeight);
                (_e = document.getElementById(`query-refresh-${message.overviewId}`)) === null || _e === void 0 ? void 0 : _e.addEventListener("click", refreshHandler);
                hideLoader();
                break;
            case "addCodeQuestion":
                const codeHtml = message.codeHtml;
                const processedCode = message.code.replace(/"/g, '&quot;');
                const processedCodePrompt = message.prompt.replace(/"/g, '&quot;');
                list.insertAdjacentHTML('beforeend', `<div class="buddy-card">
                        <hr>
                        <div class="font-bold mb-2 flex items-center">
                            ${userIcon}
                            <span>Tú</span>
                            <button class="buddy-button-icon ml-auto" id="overview-refresh-${message.overviewId}">↻</button>
                        </div>
                        <div class="buddy-code">${codeHtml}</div>
                        <input type="hidden" id="code-input-${message.overviewId}" value="${processedCode}" />
                        <input type="hidden" id="filename-${message.overviewId}" value="${message.filename}" />
                        <input type="hidden" id="overview-prompt-${message.overviewId}" value="${processedCodePrompt}" />
                        <div id="code-div-${message.overviewId}"></div>
                    </div>`);
                (_g = (_f = document.getElementById("in-progress")) === null || _f === void 0 ? void 0 : _f.classList) === null || _g === void 0 ? void 0 : _g.remove("hidden");
                list.scrollTo(0, list.scrollHeight);
                (_h = document.getElementById(`overview-refresh-${message.overviewId}`)) === null || _h === void 0 ? void 0 : _h.addEventListener("click", refreshHandler);
                hideLoader();
                break;
            case "addOverview":
                (_k = (_j = document.getElementById("in-progress")) === null || _j === void 0 ? void 0 : _j.classList) === null || _k === void 0 ? void 0 : _k.add("hidden");
                curQueryList = document.getElementById(`code-div-${message.overviewId}`);
                curQueryList.insertAdjacentHTML('beforeend', `<div class="buddy-response-card">
                        <div class="font-bold mb-2 flex items-center">
                            ${aiIcon}
                            <span>Buddy: Resumen</span>
                            <button class="buddy-button-secondary ml-auto" id="overview-comment-${message.overviewId}">Insertar</button>
                            <button class="buddy-button-icon ml-2" id="collapse-overview-button-${message.overviewId}">▼</button>
                        </div>
                        <div id="collapse-overview-${message.overviewId}" class="buddy-content">
                            <div class="buddy-highlight">${message.valueHtml}</div>
                            <input type="hidden" id="overview-${message.overviewId}" value="${message.value.replace(/"/g, '&quot;')}" />
                            <div class="buddy-actions">
                                <span>Explica más sobre</span>
                                <button class="buddy-button" id="concept-button-${message.overviewId}">Conceptos</button>
                                <button class="buddy-button" id="usage-button-${message.overviewId}">Ejemplos</button>
                            </div>   
                        </div>
                    </div>`);
                (_l = document.getElementById(`collapse-overview-button-${message.overviewId}`)) === null || _l === void 0 ? void 0 : _l.addEventListener("click", e => collapseHandler(e, '-overview'));
                (_m = document.getElementById(`overview-comment-${message.overviewId}`)) === null || _m === void 0 ? void 0 : _m.addEventListener("click", commentHandler);
                (_o = document.getElementById(`concept-button-${message.overviewId}`)) === null || _o === void 0 ? void 0 : _o.addEventListener("click", e => detailButtonHandler(e, "askAIConcept"));
                (_p = document.getElementById(`usage-button-${message.overviewId}`)) === null || _p === void 0 ? void 0 : _p.addEventListener("click", e => detailButtonHandler(e, "askAIUsage"));
                hideLoader();
                break;
            case "addDetail":
                (_r = (_q = document.getElementById("in-progress")) === null || _q === void 0 ? void 0 : _q.classList) === null || _r === void 0 ? void 0 : _r.add("hidden");
                const detailHtml = `
                    <div class="buddy-detail-card">
                        <div class="font-bold mb-1 flex items-center">
                            ${aiIcon}
                            <span>${message.detailType}</span>
                            <button class="buddy-button-secondary ml-auto" 
                                id="${message.detailType}-comment-${detailId}">Insertar</button>
                            <button class="buddy-button-icon ml-2" 
                                id="collapse-button-${collapseId}">▼</button>
                        </div>
                        <div id="collapse-${collapseId}" class="buddy-content">
                            <div class="buddy-highlight">${message.valueHtml}</div>
                            <input type="hidden" id="${message.detailType}-${detailId}" 
                                value="${message.value.replace(/"/g, '&quot;')}" />
                        </div>
                    </div>`;
                if (message.detailType === "query") {
                    curQueryList = document.getElementById(`query-div-${message.queryId}`);
                }
                else {
                    curQueryList = document.getElementById(`collapse-overview-${message.queryId}`);
                }
                curQueryList.insertAdjacentHTML('beforeend', detailHtml);
                (_s = document.getElementById(`collapse-button-${collapseId}`)) === null || _s === void 0 ? void 0 : _s.addEventListener("click", collapseHandler);
                (_t = document.getElementById(`${message.detailType}-comment-${detailId}`)) === null || _t === void 0 ? void 0 : _t.addEventListener("click", commentHandler);
                detailId++;
                collapseId++;
                list.scrollTo(0, list.scrollHeight);
                hideLoader();
                break;
            case "redoQuery":
                (_v = (_u = document.getElementById("in-progress")) === null || _u === void 0 ? void 0 : _u.classList) === null || _v === void 0 ? void 0 : _v.add("hidden");
                const divToReplace = document.getElementById(`collapse-overview-${message.overviewId}`);
                const replaceOverviewId = message.queryId.split("-").slice(-1)[0];
                if (message.queryType === "overview") {
                    divToReplace.innerHTML = `
                        <div class="buddy-highlight">${message.valueHtml}</div>
                        <input type="hidden" id="overview-${replaceOverviewId}" value="${message.value.replace(/"/g, '&quot;')}" />
                        <div class="buddy-actions">
                            <span>Explica más sobre</span>
                            <button class="buddy-button" id="concept-button-${replaceOverviewId}">Conceptos</button>
                            <button class="buddy-button" id="usage-button-${replaceOverviewId}">Ejemplos</button>
                        </div>`;
                    (_w = document.getElementById(`concept-button-${replaceOverviewId}`)) === null || _w === void 0 ? void 0 : _w.addEventListener("click", e => detailButtonHandler(e, "askAIConcept"));
                    (_x = document.getElementById(`usage-button-${replaceOverviewId}`)) === null || _x === void 0 ? void 0 : _x.addEventListener("click", e => detailButtonHandler(e, "askAIUsage"));
                }
                else {
                    const queryHtml = `
                        <div class="buddy-highlight">${message.valueHtml}</div>
                        <input type="hidden" id="${message.queryType}-${replaceOverviewId}" 
                            value="${message.value.replace(/"/g, '&quot;')}" />`;
                    if (divToReplace) {
                        divToReplace.innerHTML = queryHtml;
                    }
                    else {
                        curQueryList = document.getElementById(`query-div-${replaceOverviewId}`);
                        curQueryList.insertAdjacentHTML('beforeend', `<div class="buddy-detail-card">
                                <div class="font-bold mb-1 flex items-center">
                                    ${aiIcon}
                                    <span>${message.queryType}</span>
                                    <button class="buddy-button-secondary ml-auto" 
                                        id="${message.queryType}-comment-${replaceOverviewId}">Insertar</button>
                                    <button class="buddy-button-icon ml-2" 
                                        id="collapse-overview-button-${replaceOverviewId}">▼</button>
                                </div>
                                <div id="collapse-overview-${replaceOverviewId}" class="buddy-content">
                                    ${queryHtml}
                                </div>
                            </div>`);
                        (_y = document.getElementById(`collapse-overview-button-${replaceOverviewId}`)) === null || _y === void 0 ? void 0 : _y.addEventListener("click", collapseHandler);
                        (_z = document.getElementById(`${message.queryType}-comment-${replaceOverviewId}`)) === null || _z === void 0 ? void 0 : _z.addEventListener("click", commentHandler);
                    }
                }
                hideLoader();
                break;
        }
    });
    // Configuración de eventos iniciales
    const submitHandler = function (e) {
        var _a;
        e.preventDefault();
        e.stopPropagation();
        const input = document.getElementById("question-input");
        if (((_a = input === null || input === void 0 ? void 0 : input.value) === null || _a === void 0 ? void 0 : _a.length) > 0) {
            vscode.postMessage({
                type: "askAIfromTab",
                value: input.value
            });
            input.value = "";
        }
    };
    // Inicialización de eventos de la interfaz
    const initializeUIEvents = () => {
        var _a, _b, _c, _d;
        // Botón de limpiar chat
        (_a = document.getElementById("clear-button")) === null || _a === void 0 ? void 0 : _a.addEventListener("click", () => {
            list.innerHTML = "";
            vscode.postMessage({ type: "clearChat" });
        });
        // Botón de detener consulta
        (_b = document.getElementById("stop-button")) === null || _b === void 0 ? void 0 : _b.addEventListener("click", () => {
            vscode.postMessage({ type: "stopQuery" });
        });
        // Botón de preguntar
        (_c = document.getElementById("ask-button")) === null || _c === void 0 ? void 0 : _c.addEventListener("click", submitHandler);
        // Entrada de texto
        (_d = document.getElementById("question-input")) === null || _d === void 0 ? void 0 : _d.addEventListener("keydown", function (e) {
            if (e.key === "Enter" && !e.shiftKey) {
                submitHandler(e);
            }
        });
    };
    // Inicializar eventos al cargar
    initializeUIEvents();
})();
//# sourceMappingURL=main.js.map