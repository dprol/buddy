// @ts-nocheck
(function () {
    // Inicialización
    const vscode = acquireVsCodeApi();
    const list = document.getElementById("qa-list");
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
        e.preventDefault();
        e.stopPropagation();
        
        const overviewId = e.target.id.split("-").slice(-1)[0];
        const inputApi = document.getElementById(`code-input-${overviewId}`);
        const fileName = document.getElementById(`filename-${overviewId}`);
        const overviewRef = document.getElementById(`overview-${overviewId}`);

        if (inputApi?.value?.length > 0) {
            document.getElementById("in-progress")?.classList?.remove("hidden");
            vscode.postMessage({
                type: buttonType,
                code: inputApi.value,
                filename: fileName.value,
                queryId: overviewId,
                overviewRef: overviewRef.value
            });
        }
    };

     // Añadir lógica para el botón de Pista
     document.getElementById('hint-button')?.addEventListener('click', () => {
        const problemText = document.getElementById('problem-text').value.trim();
        if (!problemText) {
            vscode.postMessage({ 
                type: 'error',
                message: 'Por favor, escribe un problema antes de solicitar una pista.'
            });
            return;
        }
        vscode.postMessage({ 
            type: 'askAIHint',
            problemText: problemText
        });
        document.getElementById('in-progress')?.classList.remove('hidden');
    });

    // Manejador de mensajes para recibir la pista
    window.addEventListener("message", (event) => {
        const message = event.data;
        switch (message.type) {
            case 'hintResponse':
                const hintDiv = document.createElement('div');
                hintDiv.className = 'buddy-response-card';
                hintDiv.innerHTML = `<div class="font-bold mb-2 flex items-center">
                                        ${aiIcon}
                                        <span>Buddy: Pista</span>
                                    </div>
                                    <div class="buddy-content">${message.value}</div>`;
                list.appendChild(hintDiv);
                list.scrollTo(0, list.scrollHeight);
                document.getElementById('in-progress')?.classList.add('hidden');
                break;
        }
    });

    const commentHandler = function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const commentId = e.target.id.replace("-comment", "");
        const commentToEmbed = document.getElementById(commentId);
        
        if (commentToEmbed?.value?.length > 0) {
            vscode.postMessage({
                type: "embedComment",
                value: commentToEmbed.value,
                commentType: commentId
            });
        }
    };

    const refreshHandler = function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const promptId = e.target.id.replace("refresh", "prompt");
        const overviewId = promptId.split("-").slice(-1)[0];
        const prompt = document.getElementById(promptId);
        const queryType = e.target.id.split("-")[0];
        const refreshId = queryType === "overview" ? 
            `collapse-overview-${overviewId}` : 
            `collapse-${overviewId}`;

        if (prompt?.value?.length > 0) {
            document.getElementById("in-progress")?.classList?.remove("hidden");
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

    const collapseHandler = function(e, type = '') {
        e.preventDefault();
        e.stopPropagation();
        
        const curCollapseId = e.target.id.split("-").slice(-1)[0];
        const itemToCollapse = document.getElementById(`collapse${type}-${curCollapseId}`);
        const collapseButton = document.getElementById(`collapse${type}-button-${curCollapseId}`);
        
        if (itemToCollapse?.classList.contains("hidden")) {
            itemToCollapse.classList.remove("hidden");
            collapseButton.innerHTML = "▼";
        } else {
            itemToCollapse.classList.add("hidden");
            collapseButton.innerHTML = "▶";
        }
    };

    // Manejador de mensajes
    window.addEventListener("message", (event) => {
        const message = event.data;
        let curQueryList;
        
        switch (message.type) {
            case "stopProgress":
                document.getElementById("in-progress")?.classList?.add("hidden");
                break;

            case "addNLQuestion":
                const nlcodeHtml = message.code ? message.codeHtml : "";
                const nlHtml = message.value;
                const processedPrompt = message.prompt.replace(/"/g, '&quot;');
                const hline = message.addHLine ? "<hr/>" : "";
                
                list.insertAdjacentHTML('beforeend', 
                    `<div class="buddy-card">
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

                document.getElementById("in-progress")?.classList?.remove("hidden");
                list.scrollTo(0, list.scrollHeight);
                document.getElementById(`query-refresh-${message.overviewId}`)?.addEventListener("click", refreshHandler);
                break;

            case "addCodeQuestion":
                const codeHtml = message.codeHtml;
                const processedCode = message.code.replace(/"/g, '&quot;');
                const processedCodePrompt = message.prompt.replace(/"/g, '&quot;');
                
                list.insertAdjacentHTML('beforeend', 
                    `<div class="buddy-card">
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

                document.getElementById("in-progress")?.classList?.remove("hidden");
                list.scrollTo(0, list.scrollHeight);
                document.getElementById(`overview-refresh-${message.overviewId}`)?.addEventListener("click", refreshHandler);
                break;

            case "addOverview":
                document.getElementById("in-progress")?.classList?.add("hidden");
                curQueryList = document.getElementById(`code-div-${message.overviewId}`);
                
                curQueryList.insertAdjacentHTML('beforeend', 
                    `<div class="buddy-response-card">
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

                document.getElementById(`collapse-overview-button-${message.overviewId}`)?.addEventListener("click", 
                    e => collapseHandler(e, '-overview'));
                document.getElementById(`overview-comment-${message.overviewId}`)?.addEventListener("click", commentHandler);
                document.getElementById(`concept-button-${message.overviewId}`)?.addEventListener("click", 
                    e => detailButtonHandler(e, "askAIConcept"));
                document.getElementById(`usage-button-${message.overviewId}`)?.addEventListener("click", 
                    e => detailButtonHandler(e, "askAIUsage"));
                break;

            case "addDetail":
                document.getElementById("in-progress")?.classList?.add("hidden");
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
                } else {
                    curQueryList = document.getElementById(`collapse-overview-${message.queryId}`);
                }
                
                curQueryList.insertAdjacentHTML('beforeend', detailHtml);
                document.getElementById(`collapse-button-${collapseId}`)?.addEventListener("click", collapseHandler);
                document.getElementById(`${message.detailType}-comment-${detailId}`)?.addEventListener("click", commentHandler);
                
                detailId++;
                collapseId++;
                list.scrollTo(0, list.scrollHeight);
                break;

            case "redoQuery":
                document.getElementById("in-progress")?.classList?.add("hidden");
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
                    
                    document.getElementById(`concept-button-${replaceOverviewId}`)?.addEventListener("click", 
                        e => detailButtonHandler(e, "askAIConcept"));
                    document.getElementById(`usage-button-${replaceOverviewId}`)?.addEventListener("click", 
                        e => detailButtonHandler(e, "askAIUsage"));
                } else {
                    const queryHtml = `
                        <div class="buddy-highlight">${message.valueHtml}</div>
                        <input type="hidden" id="${message.queryType}-${replaceOverviewId}" 
                            value="${message.value.replace(/"/g, '&quot;')}" />`;
                            
                    if (divToReplace) {
                        divToReplace.innerHTML = queryHtml;
                    } else {
                        curQueryList = document.getElementById(`query-div-${replaceOverviewId}`);
                        curQueryList.insertAdjacentHTML('beforeend', 
                            `<div class="buddy-detail-card">
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
                        
                        document.getElementById(`collapse-overview-button-${replaceOverviewId}`)?.addEventListener("click", collapseHandler);
                        document.getElementById(`${message.queryType}-comment-${replaceOverviewId}`)?.addEventListener("click", commentHandler);
                    }
                }
                break;
        }
    });

    // Configuración de eventos iniciales
    const submitHandler = function (e) {
        e.preventDefault();
        e.stopPropagation();
        const input = document.getElementById("question-input");
        
        if (input?.value?.length > 0) {
            vscode.postMessage({
                type: "askAIfromTab",
                value: input.value
            });
            input.value = "";
        }
    };

    // Inicialización de eventos de la interfaz
    const initializeUIEvents = () => {
        // Botón de limpiar chat
        document.getElementById("clear-button")?.addEventListener("click", () => {
            const qaList = document.getElementById("qa-list");
            if (qaList) {
                qaList.innerHTML = "";
            }
            vscode.postMessage({ type: "clearChat" });
        });
        
        // Botón de detener consulta
        document.getElementById("stop-button")?.addEventListener("click", () => {
            vscode.postMessage({ type: "stopQuery" });
        });

        // Botón de preguntar
        document.getElementById("ask-button")?.addEventListener("click", submitHandler);
        
        // Entrada de texto
        document.getElementById("question-input")?.addEventListener("keydown", function (e) {
            if (e.key === "Enter" && !e.shiftKey) {
                submitHandler(e);
            }
        });
    };

    // Inicializar eventos al cargar
    initializeUIEvents();
})();
// Añadir botones Concept y Usage después de inicializar la interfaz
const buttonContainer = document.querySelector(".button-container") || document.createElement("div");
buttonContainer.className = "button-container";

if (!document.querySelector(".concept-button")) {
    const conceptButton = document.createElement("button");
    conceptButton.className = "concept-button";
    conceptButton.textContent = "Concepto";
    conceptButton.addEventListener("click", function() {
        vscode.postMessage({ type: "askAIConcept" });
    });
    buttonContainer.appendChild(conceptButton);
}

if (!document.querySelector(".usage-button")) {
    const usageButton = document.createElement("button");
    usageButton.className = "usage-button";
    usageButton.textContent = "Ejemplos";
    usageButton.addEventListener("click", function() {
        vscode.postMessage({ type: "askAIUsage" });
    });
    buttonContainer.appendChild(usageButton);
}

// Añadir el contenedor al body si no está ya presente
if (!document.querySelector(".button-container")) {
    document.body.appendChild(buttonContainer);
}
