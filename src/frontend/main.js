// @ts-nocheck
(function () {
    // Inicialización
    const vscode = acquireVsCodeApi();
    const list = document.getElementById("qa-list");
    let collapseId = 0;
    let detailId = 0;

// Mostrar el loader
function showLoader() {
    const loader = document.getElementById('loader-container');
    if (loader) loader.classList.remove('hidden');
}

// Ocultar el loader
function hideLoader() {
    const loader = document.getElementById('loader-container');
    if (loader) loader.classList.add('hidden');
}   

    // Función para obtener el texto del problema
function getProblemText() {
    return document.getElementById('problem-text').value.trim();
}

// Función para cerrar el dropdown
function closeDropdown() {
    const questionOptions = document.getElementById('question-options');
    if (questionOptions) {
        questionOptions.classList.add('hidden');
        const arrow = document.querySelector('#ask-button .dropdown-arrow');
        if (arrow) {
            arrow.style.transform = 'rotate(0deg)';
        }
    }
}

// Referencia al contenedor de respuestas
const qaList = document.getElementById("qa-list");

     // Añadir la inicialización del lenguaje aquí
     let currentLanguage = 'python'; // Lenguaje por defecto
     const languageButton = document.getElementById('language-button');
     const languageOptions = document.getElementById('language-options');
 
     function closeLanguageDropdown() {
         if (languageOptions) {
             languageOptions.classList.add('hidden');
             const arrow = languageButton?.querySelector('.dropdown-arrow');
             if (arrow) {
                 arrow.style.transform = 'rotate(0deg)';
             }
         }
     }
     

 
     // Event listener para el botón de lenguaje
     languageButton?.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = languageOptions.classList.contains('hidden');
        const arrow = languageButton.querySelector('.dropdown-arrow');
        
        if (isHidden) {
            languageOptions.classList.remove('hidden');
            arrow.style.transform = 'rotate(180deg)';
        } else {
            closeLanguageDropdown();
        }
    });

     document.querySelectorAll('#language-options .dropdown-item').forEach(option => {
        option.addEventListener('click', (e) => {
            const selectedLanguage = e.currentTarget.dataset.language;
            currentLanguage = selectedLanguage;
            languageButton.querySelector('span').textContent = e.currentTarget.textContent.trim();
            closeLanguageDropdown();
            
            vscode.postMessage({
                type: 'languageChanged',
                language: selectedLanguage
            });
        });
    });
 
     // Cerrar dropdown de lenguaje al hacer click fuera
     document.addEventListener('click', (e) => {
         if (!languageOptions?.contains(e.target) && !languageButton?.contains(e.target)) {
             closeLanguageDropdown();
         }
     });

    // Iconos para ayuda
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

// Iconos para lenguajes
const pythonIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 256 256" 
stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2" style="color: var(--buddy-primary)">
<path d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40v72a8,8,0,0,0,16,0V40h88V88a8,8,0,0,0,8,8h48V216H168a8,8,0,0,0,0,16h32a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM64,144H48a8,8,0,0,0-8,8v56a8,8,0,0,0,16,0v-8h8a28,28,0,0,0,0-56Zm0,40H56V160h8a12,12,0,0,1,0,24Zm90.78-27.76-18.78,30V208a8,8,0,0,1-16,0V186.29l-18.78-30a8,8,0,1,1,13.56-8.48L128,168.91l13.22-21.15a8,8,0,1,1,13.56,8.48Z"/>
</svg>`;

const cppIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 256 256" 
stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2" style="color: var(--buddy-primary)">
<path d="M48,180c0,11,7.18,20,16,20a14.18,14.18,0,0,0,10.22-4.66A8,8,0,0,1,85.78,206.4,30.06,30.06,0,0,1,64,216c-17.65,0-32-16.15-32-36s14.35-36,32-36a30.06,30.06,0,0,1,21.78,9.6,8,8,0,0,1-11.56,11.06A14.24,14.24,0,0,0,64,160C55.18,160,48,169,48,180Zm-8-68V40A16,16,0,0,1,56,24h96a8,8,0,0,1,5.66,2.34l56,56A8,8,0,0,1,216,88v24a8,8,0,0,1-16,0V96H152a8,8,0,0,1-8-8V40H56v72a8,8,0,0,1-16,0ZM160,80h28.69L160,51.31Zm-12,92H136V160a8,8,0,0,0-16,0v12H108a8,8,0,0,0,0,16h12v12a8,8,0,0,0,16,0V188h12a8,8,0,0,0,0-16Zm68,0H204V160a8,8,0,0,0-16,0v12H176a8,8,0,0,0,0,16h12v12a8,8,0,0,0,16,0V188h12a8,8,0,0,0,0-16Z"/>
</svg>`;

const cIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 48 48" 
stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2" style="color: var(--buddy-primary)">
<path d="M22.903,3.286c0.679-0.381,1.515-0.381,2.193,0 c3.355,1.883,13.451,7.551,16.807,9.434C42.582,13.1,43,13.804,43,14.566c0,3.766,0,15.101,0,18.867 c0,0.762-0.418,1.466-1.097,1.847c-3.355,1.883-13.451,7.551-16.807,9.434c-0.679,0.381-1.515,0.381-2.193,0 c-3.355-1.883-13.451-7.551-16.807-9.434C5.418,34.899,5,34.196,5,33.434c0-3.766,0-15.101,0-18.867 c0-0.762,0.418-1.466,1.097-1.847C9.451,10.837,19.549,5.169,22.903,3.286z"/>
</svg>`;

const javaIcon = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 512 512" 
stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2" style="color: var(--buddy-primary)">
<path d="M253.464,94.869c-23.658,16.639-50.471,35.498-64.838,66.699 c-24.954,54.435,51.062,113.812,54.311,116.313c0.755,0.581,1.659,0.871,2.56,0.871c0.957,0,1.915-0.327,2.693-0.979 c1.509-1.262,1.937-3.406,1.031-5.152c-0.275-0.53-27.561-53.53-26.547-91.552c0.359-13.243,18.892-28.266,38.512-44.171 c17.97-14.568,38.34-31.079,50.258-50.394c26.164-42.516-2.916-84.322-3.213-84.74c-1.155-1.622-3.287-2.209-5.11-1.41 c-1.821,0.804-2.83,2.773-2.414,4.72c0.059,0.277,5.714,27.923-10.022,56.406C284.203,73.25,269.959,83.268,253.464,94.869z"/>
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
                overviewRef: overviewRef.value,
                language: currentLanguage // Añadir el lenguaje
            });
        }
    };
    
    // Insertar al principio de la lista
    if (qaList.firstChild) {
        qaList.insertBefore(responseDiv, qaList.firstChild);
    } else {
        qaList.appendChild(responseDiv);
    }
    
    // Scroll suave al principio
    qaList.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
    document.getElementById('in-progress')?.classList.add('hidden');
    break;


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
                commentType: e.target.id.replace("-refresh", ""),
                language: currentLanguage // Añadir el lenguaje
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

    // Función para procesar la solución
    
async function processSolution(output) {
    const parts = [];
    const partRegex = /PARTE(\d+):\s*TÍTULO:\s*(.*?)\s*CONTENIDO:\s*([\s\S]*?)(?=PARTE\d+:|$)/g;
    let match;
    
    while ((match = partRegex.exec(output)) !== null) {
        parts.push({
            number: match[1],
            title: match[2].trim(),
            content: match[3].trim()
        });
    }

    const sliderId = `solution-slider-${Date.now()}`;
    
    return `
        <div class="solution-container" id="${sliderId}">
            <div class="concepts-slider">
                ${parts.map((part, index) => `
                    <div class="solution-card ${index === 0 ? 'active' : ''}" data-index="${index}">
                        <h3 class="solution-title">${part.title}</h3>
                        <div class="solution-content">${marked(part.content)}</div>
                    </div>
                `).join('')}
            </div>
            <div class="concepts-navigation">
                <button class="concept-nav-button prev" onclick="prevSlide('${sliderId}')">←</button>
                <button class="concept-nav-button next" onclick="nextSlide('${sliderId}')">→</button>
            </div>
            <div class="concepts-indicators">
                ${parts.map((_, index) => `
                    <button class="concept-indicator ${index === 0 ? 'active' : ''}"
                            data-index="${index}"
                            onclick="goToSlide('${sliderId}', ${index})"></button>
                `).join('')}
            </div>
        </div>
    `;
}

// Funciones de navegación
function goToSlide(sliderId, index) {
    const container = document.getElementById(sliderId);
    if (!container) return;

    const cards = container.querySelectorAll('.solution-card, .concept-card');
    const indicators = container.querySelectorAll('.concept-indicator');

    cards.forEach(card => {
        card.classList.remove('active');
        card.style.display = 'none';
    });
    
    indicators.forEach(indicator => {
        indicator.classList.remove('active');
    });

    if (cards[index]) {
        cards[index].classList.add('active');
        cards[index].style.display = 'flex';
    }
    
    if (indicators[index]) {
        indicators[index].classList.add('active');
    }
}

function nextSlide(sliderId) {
    const container = document.getElementById(sliderId);
    if (!container) return;

    const cards = container.querySelectorAll('.solution-card, .concept-card');
    const currentCard = container.querySelector('.solution-card.active, .concept-card.active');
    let currentIndex = Array.from(cards).indexOf(currentCard);
    
    const nextIndex = (currentIndex + 1) % cards.length;
    goToSlide(sliderId, nextIndex);
}

function prevSlide(sliderId) {
    const container = document.getElementById(sliderId);
    if (!container) return;

    const cards = container.querySelectorAll('.solution-card, .concept-card');
    const currentCard = container.querySelector('.solution-card.active, .concept-card.active');
    let currentIndex = Array.from(cards).indexOf(currentCard);
    
    const prevIndex = (currentIndex - 1 + cards.length) % cards.length;
    goToSlide(sliderId, prevIndex);
}

    // Manejador de mensajes
    window.addEventListener("message", (event) => {
        const message = event.data;
        let curQueryList;
        
        switch (message.type) {
            case 'error':
            hideLoader();
            // Creamos un div para mostrar el mensaje de error
            const errorDiv = document.createElement('div');
            errorDiv.className = 'buddy-error-message';
            errorDiv.textContent = message.message;
            
            // Lo insertamos al principio de la lista
            if (qaList.firstChild) {
                qaList.insertBefore(errorDiv, qaList.firstChild);
            } else {
                qaList.appendChild(errorDiv);
            }
            
            // Auto-eliminar después de 5 segundos
            setTimeout(() => {
                errorDiv.remove();
            }, 5000);
            break;

        case "stopProgress":
            hideLoader();
            break;
            case "addDetail":
    if (message.detailType === "solution") {
        const responseDiv = document.createElement('div');
        responseDiv.className = 'buddy-response-card';
        responseDiv.innerHTML = message.valueHtml;
        if (qaList.firstChild) {
            qaList.insertBefore(responseDiv, qaList.firstChild);
        } else {
            qaList.appendChild(responseDiv);
        }
    }
    document.getElementById('loader-container').classList.add('hidden');
    hideLoader();
    break;
            case "stopProgress":
                hideLoader();
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
                hideLoader();
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
                hideLoader();
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
                    hideLoader();
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
                hideLoader();
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
                hideLoader();
                break;
                case 'followUpResponse':
    const responseDiv = document.createElement('div');
    responseDiv.className = 'buddy-response-card';
    responseDiv.innerHTML = message.valueHtml; // Usar el HTML ya generado
   
    // Configurar event listeners para los botones de mostrar/ocultar respuesta
    responseDiv.querySelectorAll('.show-answer-button').forEach(button => {
        button.addEventListener('click', function(e) {
            const answerDiv = this.parentElement.nextElementSibling;
            answerDiv.classList.toggle('hidden');
            this.textContent = answerDiv.classList.contains('hidden') ?
                'Ver respuesta' : 'Ocultar respuesta';
        });
    });
    
    // Insertar al principio de la lista
    if (qaList.firstChild) {
        qaList.insertBefore(responseDiv, qaList.firstChild);
    } else {
        qaList.appendChild(responseDiv);
    }
    
    // Scroll suave al principio
    qaList.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
    document.getElementById('in-progress')?.classList.add('hidden');
    hideLoader();
    break;
        }
    });

    // Configuración de eventos iniciales
    const submitHandler = function (e) {
        e.preventDefault();
        e.stopPropagation();
        const input = document.getElementById("question-input");
    
        if (input?.value?.length > 0) {
            showLoader(); // Mostrar loader antes de enviar el mensaje
            vscode.postMessage({
                type: "askAIfromTab",
                value: input.value,
                language: currentLanguage // Añadir el lenguaje
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
        vscode.postMessage({ 
            type: "askAIConcept",
            language: currentLanguage // Añadir el lenguaje
        });
    });
    buttonContainer.appendChild(conceptButton);
}

if (!document.querySelector(".usage-button")) {
    const usageButton = document.createElement("button");
    usageButton.className = "usage-button";
    usageButton.textContent = "Ejemplos";
    usageButton.addEventListener("click", function() {
        vscode.postMessage({ 
            type: "askAIUsage",
            language: currentLanguage // Añadir el lenguaje
        });
    });
    buttonContainer.appendChild(usageButton);
}

// Añadir el contenedor al body si no está ya presente
if (!document.querySelector(".button-container")) {
    document.body.appendChild(buttonContainer);
}