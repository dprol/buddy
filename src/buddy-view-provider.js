"use strict";

// Imports y configuración inicial
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const openai_1 = require("openai");
const anthropic_1 = require("@anthropic-ai/sdk");
const utils_1 = require("./utils");
const telemetry = require("./telemetry");
const markdown_1 = require("@ts-stack/markdown");
const highlight_js_1 = require("highlight.js");

/**
 * clase para el renderizado de markdown
 */
class MyRenderer extends markdown_1.Renderer {
    code(code, lang, escaped, meta) {
        const out = highlight_js_1.default.highlight(code, { 'language': "python" }).value;
        return `\n<pre class='overflow-scroll white-space-pre' style="margin: 1em 0.5em;"><code class="language-python hljs">${out}</code></pre>\n`;
    }

    list(body, ordered) {
        const type = ordered ? 'ol' : 'ul';
        return `\n<${type} style="list-style-type: disc;">\n${body}</${type}>\n`;
    }
}

markdown_1.Marked.setOptions({ renderer: new MyRenderer });

class BuddyViewProvider {
    constructor(context) {
        this.context = context;
        this.previousChat = [];
        this.ac = new AbortController();
        this.overviewId = 0;
        
        // Inicializar telemetría solo si está disponible
        try {
            if (this.context.workspaceState) {
                this.initTelemetry();
            }
        } catch (error) {
            console.debug('No se pudo inicializar la telemetría');
        }
    }

    async initTelemetry() {
        try {
            if (telemetry?.commands?.initTelemetry?.name) {
                await vscode.commands.executeCommand(
                    telemetry.commands.initTelemetry.name,
                    this.context.workspaceState
                );
            }
        } catch (error) {
            console.debug('Error inicializando telemetría:', error);
        }
    }

    // Método seguro para registrar logs
    logQuery(chatPrompt) {
        try {
            if (telemetry?.commands?.logTelemetry?.name) {
                vscode.commands.executeCommand(
                    telemetry.commands.logTelemetry.name,
                    new telemetry.LoggerEntry(
                        "Buddy.query",
                        "Enviando consulta: %s",
                        [chatPrompt.map(msg => `${msg.role}::: ${msg.content}`).join(':::::')]
                    )
                ).catch(console.debug); // Manejar errores silenciosamente
            }
        } catch (error) {
            console.debug('Error en telemetría:', error);
        }
    }

    async queryAI(chatPrompt, assistantPrompt, abortController, isQuery = false) {
        if (!this.openai && !this.anthropic) {
            await this.setUpConnection();
        }
        
        try {
            // Llamar a logQuery de manera segura
            if (typeof this.logQuery === 'function') {
                this.logQuery(chatPrompt);
            }

            const useAnthropicAPI = await this.context.globalState.get('useAnthropicAPI', false);
            
            if (useAnthropicAPI) {
                const response = await this.anthropic.messages.create({
                    model: "claude-3-5-sonnet-20241022",
                    messages: chatPrompt.map(msg => ({
                        role: msg.role === 'assistant' ? 'assistant' : 'user',
                        content: msg.content
                    })),
                    max_tokens: 2000,
                    temperature: 0.5,
                    system: chatPrompt[0].content,
                    timeout: 60000,
                    signal: abortController.signal
                });
                
                return response.content[0].text.trim();
            } else {
                const response = await this.openai.chat.completions.create({
                    model: "gpt-4",
                    messages: chatPrompt,
                    max_tokens: 4000,
                    temperature: 0.7
                });
                
                return response.choices[0].message.content.trim();
            }
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
        this.credentials = await (0, utils_1.initAuth)(this.context);
        this.openai = new openai_1.OpenAI({
            apiKey: this.credentials.openai.apiKey
        });
        this.anthropic = new anthropic_1.Anthropic({
            apiKey: this.credentials.anthropic.apiKey
        });
        console.log("Conexión establecida");
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
                "content": "Eres un asistente experto que proporciona pistas útiles para resolver problemas de programación básica a estudiantes universitarios."
            },
            {
                "role": "user",
                "content": `Dame una pista para resolver el siguiente problema: ${problemText}`
            }
        ];

        try {
            const hintResponse = await this.queryAI(chatPrompt, '', new AbortController());
            console.log('Pista generada:', hintResponse);

            // Enviar la pista al front-end
            this.sendMessage({
                type: 'addDetail',
                value: hintResponse,
                detailType: 'hint',
                valueHtml: `<p>${hintResponse}</p>`
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

    // Vista web y sus manejadores de eventos
    resolveWebviewView(webviewView) {
        this.webView = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.context.extensionUri]
        };
        webviewView.webview.html = this.getHtml(webviewView.webview);
    }

    async preparePrompt(queryType, problemText) {
        let chatPrompt = [
            {
                "role": "system",
                "content": "Soy un asistente experto para estudiantes universitarios"
            }
        ];
    
        let prompt = '';
        let assistantPrompt = this.getAssistantPrompts(queryType);
    
        if (queryType === 'askAIConcept') {
            prompt = `Explica los conceptos específicos del dominio necesarios para entender y resolver el siguiente problema:\n\n${problemText}\n\nPor favor, céntrate en los conceptos clave y fundamentos necesarios.`;
        } else if (queryType === 'askAIUsage') {
            prompt = `Proporciona una solución paso a paso con ejemplo de código para el siguiente problema:\n\n${problemText}\n\nPor favor, explica cada paso claramente.`;
        } else if (queryType === 'askAIHint') {
            prompt = `Dame una pista para resolver el siguiente problema:\n\n${problemText}`;
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
                return "Varios conceptos del problema explicados:\n\n1. ";
            case "askAIUsage":
                return "Aquí tienes un ejemplo de código:\n";
            case "askAIHint":
                return "Aquí tienes una pista útil:\n";
            default:
                return "";
        }
    }

    async processQueryResponse(queryType, output, prompt, queryId, editorSelectedText) {
        console.log('Procesando respuesta:', queryType);
        
        if (queryType === "askAIOverview") {
            this.sendMessage({
                type: 'addOverview',
                value: output,
                overviewId: this.overviewId,
                valueHtml: markdown_1.Marked.parse(output)
            });
    
            this.previousChat = [
                {
                    "role": "system",
                    "content": `Soy un asistente experto para estudiantes universitarios`
                },
                {
                    "role": "user",
                    "content": prompt
                },
                {
                    "role": "assistant",
                    "content": output
                }
            ];
        } else {
            const detailType = queryType.replace("askAI", "").toLowerCase();
            this.sendMessage({
                type: 'addDetail',
                value: output,
                queryId: queryType === "askAIQuery" ? this.overviewId : queryId,
                detailType: detailType,
                valueHtml: markdown_1.Marked.parse(output)
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

            vscode.commands.executeCommand(
                telemetry.commands.logTelemetry.name,
                new telemetry.LoggerEntry(
                    "Buddy.reaskAI",
                    "Actualizando consulta. prompt: %s, tipo: %s",
                    [chatPrompt.map(msg => `${msg.role}::: ${msg.content}`).join(':::::'), data.queryType]
                )
            );

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
    
                    let output = await this.queryAI(
                        chatPrompt,
                        assistantPrompt,
                        this.ac
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
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'main.js'));
        const stylesMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'main.css'));
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
                    <button class="buddy-button action-button" id="concept-button">
                        <span>Conceptos</span>
                    </button>
                    <button class="buddy-button action-button" id="usage-button">
                        <span>Ejemplos</span>
                    </button>
                    <button class="buddy-button action-button" id="hint-button">
                        <span>Pista</span>
                    </button>
                    <button class="buddy-button action-button" id="clear-button">
                        <span>Limpiar Chat</span>
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
                
                // Event Listeners para los botones
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
                        problemText: getProblemText(),
                        message: 'Aquí tienes una pista para resolver el problema:'
                    });
                    document.getElementById('in-progress')?.classList.remove('hidden');
                });
    
                document.getElementById('clear-button')?.addEventListener('click', () => {
                    document.getElementById('problem-text').value = '';
                    if (qaList) {
                        qaList.innerHTML = '';
                        vscode.postMessage({ type: 'clearChat' });
                    }
                });
    
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