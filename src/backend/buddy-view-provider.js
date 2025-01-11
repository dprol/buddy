"use strict";

Object.defineProperty(exports, "__esModule", { value: true });

const vscode = require("vscode");
const { Anthropic } = require("@anthropic-ai/sdk");
const utils = require('./utils');
const markdown = require("@ts-stack/markdown");
const hljs = require("highlight.js");

/**
 * clase para el renderizado de markdown
 */
class MyRenderer extends markdown.Renderer {
    code(code, lang, escaped, meta) {
        // Lista de lenguajes soportados
        const supportedLanguages = {
            'python': 'python',
            'py': 'python',
            'cpp': 'cpp',
            'c++': 'cpp',
            'c': 'c',
            'java': 'java'
        };

        // Si no se especifica lenguaje o no está soportado, usar python por defecto
        const language = supportedLanguages[lang?.toLowerCase()] || 'python';
        
        const out = hljs.highlight(code, { 'language': language }).value;
        return `\n<pre class='overflow-scroll white-space-pre' style="margin: 1em 0.5em;">
            <code class="language-${language} hljs">${out}</code>
        </pre>\n`;
    }

    list(body, ordered) {
        const type = ordered ? 'ol' : 'ul';
        return `\n<${type} style="list-style-type: disc;">\n${body}</${type}>\n`;
    }
}

markdown.Marked.setOptions({ renderer: new MyRenderer() });

class BuddyViewProvider {
    constructor(context) {
        this.context = context;
        this.previousChat = [];
        this.ac = new AbortController();
        this.overviewId = 0;
    }

    async queryAI(chatPrompt, assistantPrompt, abortController) {
        if (!this.anthropic) {
            await this.setUpConnection();
        }
        
        try {
            // Asegurarse de que no hay espacios en blanco al final de los mensajes
            const cleanMessages = chatPrompt.map(msg => ({
                role: msg.role === 'assistant' ? 'assistant' : 'user',
                content: msg.content.trim() // Eliminar espacios en blanco al principio y final
            }));
    
            const response = await this.anthropic.messages.create({
                model: "claude-3-5-sonnet-20241022",
                messages: cleanMessages,
                max_tokens: 2000,
                temperature: 0.5,
                system: cleanMessages[0].content.trim() // Asegurarse de que el mensaje del sistema también está limpio
            });
    
            return response.content[0].text.trim();
        } catch (error) {
            console.error("Error en queryAI:", error);
            throw error;
        }
    }
        
    capitalizeFirstLetter(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    lowerFirstLetter(str) {
        return str.charAt(0).toLowerCase() + str.slice(1);
    }

    async setUpConnection() {
        if (!this.credentials) {
            this.credentials = await utils.initAuth(this.context);
            this.anthropic = new anthropic_1.Anthropic({
                apiKey: this.credentials.anthropic.apiKey
            });
            console.log("Conexión establecida con Anthropic");
        }
    }

    updateChatHistory(prompt, output, editorSelectedText) {
        if (editorSelectedText) {
            this.previousChat = [{
                "role": "system",
                "content": `Soy un asistente experto para estudiantes universitarios`
            }];
        }
        this.previousChat.push(
            { "role": "user", "content": prompt },
            { "role": "assistant", "content": output }
        );
    }

    async sendApiRequestWithCode(selectedText, queryType, abortController, overviewRef = '', queryId = null, nlPrompt = '') {
        console.log('Iniciando petición API:', queryType);
        
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            this.sendMessage({
                type: 'error',
                message: 'No hay un editor activo.'
            });
            return;
        }

        try {
            this.sendMessage({ type: 'showProgress' });

            let [chatPrompt, prompt, assistantPrompt] = await this.preparePrompt(
                queryType, 
                selectedText
            );

            console.log('Prompt preparado:', prompt);

            let output = await this.queryAI(
                chatPrompt,
                assistantPrompt,
                abortController,
                queryType === "askAIQuery"
            );

            console.log('Respuesta recibida:', output);

            await this.processQueryResponse(queryType, output, prompt, queryId, selectedText);
            
            this.sendMessage({ type: 'hideProgress' });
        } catch (error) {
            console.error('Error en sendApiRequestWithCode:', error);
            this.sendMessage({
                type: 'error',
                message: 'Error: ' + error.message
            });
        }
    }

    async sendApiRequestWithHint(problemText) {
        if (!problemText) {
            console.error('Error: Texto del problema no proporcionado para askAIHint');
            return;
        }
        console.log('Generando pista para el problema:', problemText);

        const chatPrompt = [
            {
                "role": "system",
                "content": "Eres un asistente experto que proporciona pistas útiles para resolver problemas de programación básica a estudiantes universitarios sin dar directamente la solución."
            },
            {
                "role": "user",
                "content": `Dame una pista breve y diferente cada vez para resolver el siguiente problema: ${problemText}`
            }
        ];

        try {
            const hintResponse = await this.queryAI(chatPrompt, '', new AbortController(), false, true);
        console.log('Pista generada:', hintResponse);

            // Enviar la pista al front-end
            this.sendMessage({
                type: 'hintResponse',
                value: hintResponse
            });
        } catch (error) {
            console.error('Error generando la pista:', error);
            this.sendMessage({
                type: 'error',
                message: 'Error al generar la pista: ' + error.message
            });
        }
    }

    // Método para enviar mensajes al WebView
    sendMessage(message) {
        console.log('Enviando mensaje a WebView:', message);
        if (this.webView) {
            this.webView.webview.postMessage(message);
        }
    }

    async preparePrompt(queryType, problemText) {
        let chatPrompt = [
            {
                "role": "system",
                "content": "Soy un asistente experto para estudiantes universitarios"
            }
        ];
    
        let prompt = '';
        let assistantPrompt = '';
    
        if (queryType === 'askAIConcept') {
            prompt = `Analiza el siguiente problema y proporciona solo los conceptos clave necesarios para resolverlo. 
                     Para cada concepto, proporciona una breve explicación después de dos puntos.
                     Formato requerido:
                     Concepto: Explicación clara y concisa
                     No incluyas introducciones ni conclusiones, solo la lista de conceptos.
    
                     Problema:
                     ${problemText}`;
            
            assistantPrompt = ""; // No necesitamos un prompt adicional para el asistente
        } else if (queryType === 'askAIUsage') {
            prompt = `Proporciona un ejemplo en pseudocódigo y un ejemplo en código:\n\n${problemText}\n\nPor favor, explica cada paso claramente pero no des la solución directamente.`;
            assistantPrompt = "Aquí tienes un ejemplo en pseudocódigo:".trim();
        } else if (queryType === 'askAIHint') {
            prompt = `Una pista que ayude a empezar a resolver el problema:\n\n${problemText}`;
            assistantPrompt = "Aquí tienes una pista útil:".trim();
        }
    
        chatPrompt.push(
            { "role": "user", "content": prompt },
            { "role": "assistant", "content": assistantPrompt }
        );
    
        return [chatPrompt, prompt, assistantPrompt];
    }

    getAssistantPrompts(queryType) {
        switch (queryType) {
            case "askAIConcept":
                return "Varios conceptos del problema explicados:\n\n1.".trim();
            case "askAIUsage":
                return "Aquí tienes un ejemplo en pseudocódigo y otro en código".trim();
            case "askAIHint":
                return "Aquí tienes una pista para empezar a resolver el problema en código:".trim();
            default:
                return "";
        }
    }

    async processQueryResponse(queryType, output, prompt, queryId, editorSelectedText) {
        console.log('Procesando respuesta:', queryType);
        
        // Declarar las variables necesarias
        let valueHtml = '';
        const detailType = queryType.replace("askAI", "").toLowerCase();
        
        if (queryType === "askAIConcept") {
            const concepts = output
                .split('\n')
                .filter(line => line.trim())
                .map(concept => concept.trim());
        
            valueHtml = '<div class="concepts-container">';
            
            concepts.forEach(concept => {
                const [mainConcept, explanation] = concept.split(':').map(str => str.trim());
                
                if (mainConcept && explanation) {
                    valueHtml += `
                        <div class="concept-card">
                            <div class="concept-title">
                                <strong>${mainConcept}</strong>
                            </div>
                            <div class="concept-content">
                                <p>${explanation}</p>
                            </div>
                        </div>
                    `;
                }
            });
            
            valueHtml += '</div>';
        } else {
            valueHtml = markdown_1.Marked.parse(output);
        }
    
        this.sendMessage({
            type: 'addDetail',
            value: output,
            queryId: queryType === "askAIQuery" ? this.overviewId : queryId,
            detailType: detailType,
            valueHtml: valueHtml
        });
    
        if (queryType === "askAIQuery") {
            this.updateChatHistory(prompt, output, editorSelectedText);
        } else {
            this.previousChat.push(
                { "role": "user", "content": prompt },
                { "role": "assistant", "content": output }
            );
        }
    }

    sendMessage(message) {
        console.log('Enviando mensaje a WebView:', message);
        if (this.webView) {
            this.webView.webview.postMessage(message);
        }
    }

    async reaskAI(data, abortController) {
        try {
            let chatPrompt = data.prompt.split(":::::").map(str => {
                let [role, content] = str.split("::: ");
                return { role, content };
            });

            let output = await this.queryAI(
                chatPrompt,
                this.getAssistantPrompts("askAI" + this.capitalizeFirstLetter(data.queryType)),
                abortController
            );

            this.sendMessage({
                type: 'redoQuery',
                overviewId: data.overviewId,
                queryId: data.refreshId,
                queryType: data.queryType,
                value: output,
                valueHtml: markdown_1.Marked.parse(output)
            });
        } catch (error) {
            console.error("Error en reaskAI:", error);
            vscode.window.showErrorMessage(`Error al actualizar la consulta: ${error.message}`);
        }
    }

    /**
     * vista web y sus manejadores de eventos
     */
    resolveWebviewView(webviewView) {
        this.webView = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.context.extensionUri]
        };
        webviewView.webview.html = this.getHtml(webviewView.webview);
    
        webviewView.webview.onDidReceiveMessage(async (data) => {
            console.log('Mensaje recibido:', data);
    
            try {
                if (['askAIConcept', 'askAIUsage', 'askAIHint'].includes(data.type)) {
                    this.ac = new AbortController();
                    console.log('Procesando solicitud:', data.type);
                    
                    const [chatPrompt, prompt, assistantPrompt] = await this.preparePrompt(
                        data.type,
                        data.problemText
                    );
    
                    // Aquí forzamos a utilizar Anthropic en lugar de OpenAI
                    let output = await this.queryAI(
                        chatPrompt,
                        assistantPrompt,
                        this.ac,
                        false, // No es una consulta directa desde código
                        true   // Forzar el uso de Anthropic
                    );
    
                    await this.processQueryResponse(data.type, output, prompt);
                } else if (data.type === 'clearChat') {
                    this.previousChat = [];
                    console.log('Chat limpiado');
                }
            } catch (error) {
                console.error('Error procesando mensaje:', error);
                this.sendMessage({
                    type: 'error',
                    message: 'Error: ' + error.message
                });
            }
        });
    }

    getHtml(webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'extension', 'media', 'main.js'));
        const stylesMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'extension', 'media', 'main.css'));
        const stylesHighlightUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'node_modules', 'highlight.js', 'styles', 'github-dark.css'));

        return `<!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="${stylesHighlightUri}" rel="stylesheet">
            <link href="${stylesMainUri}" rel="stylesheet">
            <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
            <title>BUDDY</title>
        </head>
        <body>
            <div class="flex flex-col h-screen">
                <div class="problem-box">
                    <textarea id="problem-text" class="problem-content" placeholder="Escribe aquí el problema a resolver..."></textarea>
                </div>

                <div class="button-container">
    <div class="dropdown">
        <button class="buddy-button action-button dropdown-toggle" id="ask-button">
            <span>Tengo una pregunta</span>
            <span class="dropdown-arrow">▼</span>
        </button>
        <div class="dropdown-menu hidden" id="question-options">
            <button class="dropdown-item" id="concept-button">
                <span class="item-icon">📚</span>
                <span>Ver conceptos del problema</span>
            </button>
            <button class="dropdown-item" id="usage-button">
                <span class="item-icon">📝</span>
                <span>Ver ejemplos de uso</span>
            </button>
            <button class="dropdown-item" id="hint-button">
                <span class="item-icon">💡</span>
                <span>Dame una pista</span>
            </button>
        </div>
    </div>
    
    <button class="buddy-button action-button" id="clear-button">
        <span class="button-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                <path fill="currentColor" d="M3 6h18v2H3V6zm3 4h2v10H6V10zm4 0h2v10h-2V10zm4 0h2v10h-2V10zm4 0h2v10h-2V10z"/>
            </svg>
        </span>
    </button>
</div>
                
                <div id="qa-list" class="flex-1 overflow-y-auto p-4">
                    <!-- Lista de preguntas y respuestas -->
                </div>
                
                <div id="in-progress" class="hidden">
                    <div class="loader"></div>
                </div>
            </div>

            <script>
(function() {
    const vscode = acquireVsCodeApi();
    const qaList = document.getElementById('qa-list');
    
    function getProblemText() {
        return document.getElementById('problem-text').value.trim();
    }
    
    // Manejo del dropdown
    const askButton = document.getElementById('ask-button');
    const questionOptions = document.getElementById('question-options');

    function closeDropdown() {
        if (questionOptions) {
            questionOptions.classList.add('hidden');
            const arrow = askButton?.querySelector('.dropdown-arrow');
            if (arrow) {
                arrow.style.transform = 'rotate(0deg)';
            }
        }
    }

    // Toggle del dropdown
    askButton?.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = questionOptions.classList.contains('hidden');
        const arrow = askButton.querySelector('.dropdown-arrow');
        
        if (isHidden) {
            questionOptions.classList.remove('hidden');
            arrow.style.transform = 'rotate(180deg)';
        } else {
            closeDropdown();
        }
    });

    // Cerrar dropdown al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (!questionOptions?.contains(e.target) && !askButton?.contains(e.target)) {
            closeDropdown();
        }
    });

    // Event listeners para las opciones
    document.getElementById('concept-button')?.addEventListener('click', () => {
        const problemText = getProblemText();
        if (!problemText) {
            vscode.postMessage({ 
                type: 'error',
                message: 'Por favor, escribe un problema antes de solicitar los conceptos.'
            });
            return;
        }
        vscode.postMessage({ 
            type: 'askAIConcept',
            problemText: getProblemText()
        });
        document.getElementById('in-progress')?.classList.remove('hidden');
        closeDropdown();
    });

    document.getElementById('usage-button')?.addEventListener('click', () => {
        const problemText = getProblemText();
        if (!problemText) {
            vscode.postMessage({ 
                type: 'error',
                message: 'Por favor, escribe un problema antes de solicitar ejemplos.'
            });
            return;
        }
        vscode.postMessage({ 
            type: 'askAIUsage',
            problemText: getProblemText()
        });
        document.getElementById('in-progress')?.classList.remove('hidden');
        closeDropdown();
    });

    document.getElementById('hint-button')?.addEventListener('click', () => {
        const problemText = getProblemText();
        if (!problemText) {
            vscode.postMessage({ 
                type: 'error',
                message: 'Por favor, escribe un problema antes de solicitar una pista.'
            });
            return;
        }
        vscode.postMessage({ 
            type: 'askAIHint',
            problemText: getProblemText()
        });
        document.getElementById('in-progress')?.classList.remove('hidden');
        closeDropdown();
    });

    document.getElementById('clear-button')?.addEventListener('click', () => {
        if (qaList) {
            qaList.innerHTML = '';
            vscode.postMessage({ type: 'clearChat' });
        }
    });

    // Event listener para mensajes
    window.addEventListener('message', event => {
        const message = event.data;
        console.log('Mensaje recibido:', message);

        switch (message.type) {
            case 'updateProblem':
                document.getElementById('problem-text').value = message.text;
                break;
            case 'showProgress':
                document.getElementById('in-progress')?.classList.remove('hidden');
                break;
            case 'hideProgress':
                document.getElementById('in-progress')?.classList.add('hidden');
                break;
            case 'addDetail':
            case 'addOverview':
                if (qaList) {
                    const responseDiv = document.createElement('div');
                    responseDiv.className = 'buddy-response-card';
                    responseDiv.innerHTML = message.valueHtml;
                    qaList.appendChild(responseDiv);
                    qaList.scrollTo(0, qaList.scrollHeight);
                }
                document.getElementById('in-progress')?.classList.add('hidden');
                break;
            case 'error':
                alert(message.message);
                break;
        }
    });
})();
</script>
        </body>
        </html>`;
    }
}

exports.default = BuddyViewProvider;