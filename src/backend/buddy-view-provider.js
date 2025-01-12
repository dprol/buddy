"use strict";

// Manera correcta de importar en CommonJS
const vscode = require("vscode");
const { Anthropic } = require("@anthropic-ai/sdk");
const utils = require("./utils");
const { Marked, Renderer } = require("@ts-stack/markdown");
const hljs = require("highlight.js");

/**
 * Clase para renderizar markdown con soporte de resaltado de sintaxis.
 */
class MyRenderer extends Renderer {
    code(code, lang) {
        const supportedLanguages = {
            'python': 'python',
            'py': 'python',
            'cpp': 'cpp',
            'c++': 'cpp',
            'c': 'c',
            'java': 'java'
        };

        const language = supportedLanguages[lang?.toLowerCase()] || 'plaintext';
        const out = hljs.highlight(code, { language }).value;
        return `
            <pre class="overflow-scroll white-space-pre" style="margin: 1em 0.5em;">
                <code class="language-${language} hljs">${out}</code>
            </pre>
        `;
    }

    list(body, ordered) {
        const type = ordered ? 'ol' : 'ul';
        return `<${type} style="list-style-type: disc;">${body}</${type}>`;
    }
}
Marked.setOptions({ renderer: new MyRenderer() });

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
        try {
            const apiKey = await utils.initAuth(this.context);
            
            if (!apiKey) {
                throw new Error('Se requiere una clave API de Anthropic para continuar.');
            }
    
            this.anthropic = new Anthropic({ apiKey });
            console.log("Conexión establecida con Anthropic");
        } catch (error) {
            vscode.window.showErrorMessage('Error: Se requiere una clave API válida de Anthropic.');
            throw error;
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
    
        if (queryType === 'askAINextStep') {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                throw new Error('No hay editor activo. Por favor, abre un archivo de código.');
            }
    
            const selectedText = editor.document.getText(editor.selection);
            if (!selectedText) {
                throw new Error('Por favor, selecciona el código del que quieres saber el siguiente paso.');
            }
    
            prompt = `Analiza el siguiente código y proporciona solo el siguiente paso en el problema sin revelar la solución. Incluye el fragmento de código seleccionado y la sugerencia sin ningun otro comentario.
    
                     Código actual:
                     ${selectedText}`;
            
            assistantPrompt = "Aquí tienes las sugerencias para el siguiente paso:".trim();
        } else if (queryType === 'askAIConcept') {
            prompt = `Proporciona definiciones breves y precisas de conceptos básicos de programación presentes en el problema. Solo los conceptos de programación que ayuden a entender el problema mejor. Acompaña la definición con un ejemplo, preferiblemente en el código del lenguaje.
    
                     Problema:
                     ${problemText}`;
            
            assistantPrompt = "";
        } else if (queryType === 'askAIUsage') {
            prompt = `Genera ejemplos en pseudocódigo acompañados de diagramas de flujo que ilustren la solución del problema del enunciado:\n\n${problemText}\n\nEl lenguaje viene marcado en el problema. No incluyas explicación del algoritmo, limítate a los ejemplos anteriores. Titula cada ejemplo con Pseudocódigo y Diagrama de flujo`;
            assistantPrompt = "Aquí tienes un ejemplo en pseudocódigo:".trim();
        } else if (queryType === 'askAIHint') {
            prompt = `Proporciona al usuario una lista enumerada de 3 pasos iniciales para abordar el problema de programación, orientándolo sobre cómo comenzar la solución. En el lenguaje indicado. Cada pista tiene que llevar una ayuda de código. Limitarse a poner los pasos, no dar más explicaciones al final.\n\n${problemText}`;
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
            case "askAINextStep":
                return "Aquí tienes el próximo paso:".trim();
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
        } else if (queryType === 'askAIUsage') {
            valueHtml = `<div class="usage-content">
                <div class="buddy-highlight">${Marked.parse(output)}</div>
            </div>`;
        } else {
            valueHtml = Marked.parse(output);
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
                valueHtml: Marked.parse(output)
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
                if (['askAIConcept', 'askAIUsage', 'askAIHint', 'askAINextStep'].includes(data.type)) {
                    this.ac = new AbortController();
                    const [chatPrompt, prompt, assistantPrompt] = await this.preparePrompt(
                        data.type,
                        data.problemText
                    );
    
                    let output = await this.queryAI(chatPrompt, assistantPrompt, this.ac);
                    await this.processQueryResponse(data.type, output, prompt);
                } else if (data.type === 'clearChat') {
                    this.previousChat = [];
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
        const stylesMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'src', 'frontend', 'main.css'));
        const stylesHighlightUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'node_modules', 'highlight.js', 'styles', 'github-dark.css'));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'src', 'frontend', 'main.js'));
    
        return `<!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'unsafe-inline' 'unsafe-eval' ${webview.cspSource} https://cdn.jsdelivr.net;">
                <link href="${stylesHighlightUri}" rel="stylesheet">
                <link href="${stylesMainUri}" rel="stylesheet">
                <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
                <title>Buddy</title>
            </head>
            <body>
                <div class="flex flex-col h-screen">
                    <div class="problem-box">
                        <textarea id="problem-text" class="problem-content" placeholder="Escribe aquí el problema a resolver..."></textarea>
                    </div>
    
                    <!-- Loader fuera del dropdown -->
                    <div id="in-progress" class="hidden">
                        <div class="loader">
                            <div></div>
                            <div></div>
                            <div></div>
                        </div>
                    </div>
    
                    <div class="button-container">
                        <div class="dropdown">
                            <button class="buddy-button action-button dropdown-toggle" id="ask-button">
                                <span>Ayuda</span>
                                <span class="dropdown-arrow">▼</span>
                            </button>
                            <div class="dropdown-menu hidden" id="question-options">
                                <button class="dropdown-item" id="concept-button">
                                    <span class="item-icon">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256">
                                            <path d="M176,232a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h80A8,8,0,0,1,176,232Zm40-128a87.55,87.55,0,0,1-33.64,69.21A16.24,16.24,0,0,0,176,186v6a16,16,0,0,1-16,16H96a16,16,0,0,1-16-16v-6a16,16,0,0,0-6.23-12.66A87.59,87.59,0,0,1,40,104.49C39.74,56.83,78.26,17.14,125.88,16A88,88,0,0,1,216,104Z"/>
                                        </svg>
                                    </span>
                                    <span>Ver conceptos clave</span>
                                </button>
                                <button class="dropdown-item" id="usage-button">
                                    <span class="item-icon">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256">
                                            <path d="M200,168a32.06,32.06,0,0,0-31,24H72a32,32,0,0,1,0-64h96a40,40,0,0,0,0-80H72a8,8,0,0,0,0,16h96a24,24,0,0,1,0,48H72a48,48,0,0,0,0,96h97a32,32,0,1,0,31-40Z"/>
                                        </svg>
                                    </span>
                                    <span>Ver pseudocódigo y diagrama</span>
                                </button>
                                <button class="dropdown-item" id="hint-button">
                                    <span class="item-icon">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256">
                                            <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm39.1,131.79a47.84,47.84,0,0,0,0-55.58l28.5-28.49a87.83,87.83,0,0,1,0,112.56Z"/>
                                        </svg>
                                    </span>
                                    <span>Recibir una pista</span>
                                </button>
                                <button class="dropdown-item" id="next-step-button">
                                    <span class="item-icon">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256">
                                            <path d="M200,32a8,8,0,0,0-8,8v69.23L72.43,34.45A15.95,15.95,0,0,0,48,47.88V208.12a16,16,0,0,0,24.43,13.43L192,146.77V216a8,8,0,0,0,16,0V40A8,8,0,0,0,200,32Z"/>
                                        </svg>
                                    </span>
                                    <span>Ver próximo paso</span>
                                </button>
                            </div>
                        </div>
                        
                        <button class="buddy-button action-button" id="clear-button">
                            <span class="button-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                                    <path 
                                        stroke="currentColor" 
                                        stroke-linecap="round" 
                                        stroke-linejoin="round" 
                                        stroke-width="1.5" 
                                        d="m19.455 9-.005-.016m0 0A8.5 8.5 0 1 0 11.5 20.5c2.342 0 4.204-.69 6-2.48 1.011-1.007 1.675-2.023 2.062-3.145m-.113-5.89L19.5 9l1-3m-1.05 2.984-2.95-.922"
                                    />
                                </svg>
                            </span>
                        </button>
                    </div>
                    
                    <div id="qa-list" class="flex-1 overflow-y-auto p-4">
                        <!-- Lista de preguntas y respuestas -->
                    </div>
                </div>
    
                <script>
                </script>
            </body>
            </html>`;
    }
}

module.exports = BuddyViewProvider;