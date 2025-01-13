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
        if (!problemText || !problemText.text) {
            console.error('Error: Texto del problema no proporcionado para askAIHint');
            return;
        }
        console.log('Generando pista para el problema:', problemText.text);
    
        const chatPrompt = [
            {
                "role": "system",
                "content": "Eres un asistente experto que proporciona pistas para ayudar a estudiantes universitarios a resolver problemas de programación."
            },
            {
                "role": "user",
                "content": `Proporciona 3 pistas que ayuden a empezar a resolver el siguiente problema en ${problemText.language}:\n\n${problemText.text}. No añadas ningun texto al final.`
            }
        ];
    
        try {
            const hintResponse = await this.queryAI(chatPrompt, '', new AbortController());
            console.log('Pistas generadas:', hintResponse);
    
            // Enviar las pistas al front-end
            this.sendMessage({
                type: 'hintResponse',
                value: hintResponse,
                valueHtml: Marked.parse(hintResponse) 
            });
        } catch (error) {
            console.error('Error generando las pistas:', error);
            this.sendMessage({
                type: 'error',
                message: 'Error al generar las pistas: ' + error.message
            });
        }
    }
    async sendApiRequestWithSolution(problemText) {
        if (!problemText) {
            console.error('Error: Texto del problema no proporcionado para askAISolution');
            return;
        }
        console.log('Generando explicación de la solución para:', problemText);
    
        const chatPrompt = [
            {
                "role": "system",
                "content": "Eres un asistente experto que proporciona explicaciones claras y concisas de soluciones de programación, usando fragmentos de código para ilustrar los conceptos clave."
            },
            {
                "role": "user",
                "content": `Por favor, explica la solución del siguiente problema usando fragmentos de código:\n\n${problemText}`
            }
        ];
    
        try {
            const solutionResponse = await this.queryAI(chatPrompt, '', new AbortController());
            console.log('Solución generada:', solutionResponse);
    
            // Convertir la respuesta a HTML con formato
            const valueHtml = Marked.parse(solutionResponse);
    
            this.sendMessage({
                type: 'solutionResponse',
                value: solutionResponse,
                valueHtml: valueHtml
            });
        } catch (error) {
            console.error('Error generando la solución:', error);
            this.sendMessage({
                type: 'error',
                message: 'Error al generar la solución: ' + error.message
            });
        }
    }
    
    async sendApiRequestWithFollowUp(problemText) {
        if (!problemText) {
            console.error('Error: Texto del problema no proporcionado para askAIFollowUp');
            return;
        }
        console.log('Generando preguntas de seguimiento para:', problemText);
    
        try {
            const [chatPrompt, prompt, assistantPrompt] = await this.preparePrompt('askAIFollowUp', problemText);
            const followUpResponse = await this.queryAI(chatPrompt, assistantPrompt, new AbortController());
            
            // Extraer preguntas y respuestas usando expresiones regulares
            const pairs = [];
            const regex = /Q(\d+):\s*(.*?)\s*A\1:\s*(.*?)(?=Q\d+:|$)/gs;
            let match;
    
            while ((match = regex.exec(followUpResponse)) !== null) {
                pairs.push({
                    number: match[1],
                    question: match[2].trim(),
                    answer: match[3].trim()
                });
            }
    
            // Crear HTML con estructura colapsable
            const htmlResponse = `
                <div class="follow-up-questions">
                    ${pairs.map(pair => `
                        <div class="follow-up-item mb-4">
                            <div class="follow-up-question">
                                <strong>Pregunta ${pair.number}:</strong> ${pair.question}
                                <button class="show-answer-button" onclick="this.parentElement.nextElementSibling.classList.toggle('hidden'); this.textContent = this.textContent === 'Ver respuesta' ? 'Ocultar respuesta' : 'Ver respuesta'">
                                    Ver respuesta
                                </button>
                            </div>
                            <div class="follow-up-answer hidden">
                                <div class="answer-content">
                                    ${Marked.parse(pair.answer)}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
    
            this.sendMessage({
                type: 'addDetail',
                value: followUpResponse,
                detailType: 'followup',
                valueHtml: htmlResponse
            });
    
        } catch (error) {
            console.error('Error generando preguntas de seguimiento:', error);
            this.sendMessage({
                type: 'error',
                message: 'Error al generar preguntas de seguimiento: ' + error.message
            });
        }
    }


    // Método para enviar mensajes al WebView
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
        
            prompt = `Analiza el siguiente código en ${problemText.language} y proporciona solo el siguiente paso en el problema sin revelar la solución. Incluye el fragmento de código seleccionado y la sugerencia sin ningún otro comentario.\n\nCódigo actual:\n${selectedText}`;
            assistantPrompt = "Aquí tienes las sugerencias para el siguiente paso:".trim();
        } else if (queryType === 'askAIConcept') {
                    prompt = `Proporciona definiciones breves y precisas de conceptos básicos de programación presentes en el problema. Solo los conceptos relevantes que ayuden a entender el problema mejor. Si es un concepto de código acompaña la definición con un ejemplo en ${problemText.language}. 
    
                     Problema:
                     ${problemText}`;
            
            assistantPrompt = "";
        } else if (queryType === 'askAIUsage') {
            prompt = `Genera ejemplos en pseudocódigo acompañados de diagramas de flujo que ilustren la solución del problema del enunciado:\n\n${problemText}\n\nEl lenguaje viene marcado en el problema. No incluyas explicación del algoritmo, limítate a los ejemplos anteriores. Titula cada ejemplo con Pseudocódigo y Diagrama de flujo`;
        }   else if (queryType === 'askAIHint') {
                prompt = `Proporciona al usuario una lista enumerada de 3 pasos iniciales para abordar el problema de programación, orientándolo sobre cómo comenzar la solución. En el lenguaje ${problemText.language}. Cada pista tiene que llevar una ayuda de código. Limitarse a poner los pasos, no dar más explicaciones al final.\n\n${problemText.text}`;
                assistantPrompt = "Aquí tienes una pista útil:".trim();
        } else if (queryType === 'askAISolution') {
            prompt = `Proporciona una explicación clara y concisa de la solución al siguiente problema, usando fragmentos de código para ilustrar los conceptos clave. No introduzcas limítate a poner bullets. La solución debe ser en el lenguaje especificado:\n\n${problemText}`;
            assistantPrompt = "Aquí tienes la explicación de la solución:";
        } else if (queryType === 'askAIFollowUp') {
            prompt = `Genera exactamente 3 preguntas de seguimiento educativas relacionadas con este problema. Para cada pregunta, proporciona también una respuesta detallada. Usa el siguiente formato exacto para cada par de pregunta y respuesta:
    
    Q1: [Primera pregunta]
    A1: [Respuesta a la primera pregunta]
    Q2: [Segunda pregunta]
    A2: [Respuesta a la segunda pregunta]
    Q3: [Tercera pregunta]
    A3: [Respuesta a la tercera pregunta]
    
    El problema es:\n\n${problemText}`;
            assistantPrompt = "Aquí tienes las preguntas de seguimiento:";
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
                return "Aquí tienes un ejemplo en pseudocódigo y otro en diagrama".trim();
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
        
        let valueHtml = '';
        const detailType = queryType.replace("askAI", "").toLowerCase();
        
        if (queryType === "askAIConcept") {
            const concepts = output
                .split('\n')
                .filter(line => line.trim())
                .map(concept => concept.trim());
        
            valueHtml = `
                <div class="concepts-container">
                    <div class="concepts-slider">
                        ${concepts.map((concept, index) => {
                            const [mainConcept, explanation] = concept.split(':').map(str => str.trim());
                            if (mainConcept && explanation) {
                                return `
                                    <div class="concept-card" id="concept-${index}">
                                        <div class="concept-title">
                                            <strong>${mainConcept}</strong>
                                        </div>
                                        <div class="concept-content">
                                            <p>${explanation}</p>
                                        </div>
                                    </div>
                                `;
                            }
                            return '';
                        }).join('')}
                    </div>
                    <div class="concepts-navigation">
                        <button class="concept-nav-button prev" onclick="previousConcept()">←</button>
                        <button class="concept-nav-button next" onclick="nextConcept()">→</button>
                    </div>
                </div>
            `;
        }  else if (queryType === "askAIHint") {
                valueHtml = `<div class="hint-content">
                    <div class="buddy-highlight">${Marked.parse(output)}</div>
                </div>`;
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
            console.log('Mensaje recibido en resolveWebviewView:', data);
            
            try {
                if (data.type === 'askAIHint') {
                    console.log('Procesando solicitud de pista');
                    await this.sendApiRequestWithHint(data.problemText);
                } else if (['askAIConcept', 'askAIUsage', 'askAINextStep'].includes(data.type)) {
                    console.log(`Procesando solicitud: ${data.type}`);
                    this.ac = new AbortController();
                    const [chatPrompt, prompt, assistantPrompt] = await this.preparePrompt(
                        data.type,
                        {
                            text: data.problemText.text,
                            language: data.problemText.language
                        }
                    );
    
                    let output = await this.queryAI(chatPrompt, assistantPrompt, this.ac);
                    await this.processQueryResponse(data.type, output, prompt);
                } else if (data.type === 'askAISolution') {
                    await this.sendApiRequestWithSolution(data.problemText);
                } else if (data.type === 'askAIFollowUp') {
                    await this.sendApiRequestWithFollowUp(data.problemText);
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

                
                    <div class="button-container">
                    <!-- Selector de lenguaje -->
<div class="dropdown">
    <button class="buddy-button language-button dropdown-toggle" id="language-button">
        <span>Lenguaje</span>
        <span class="dropdown-arrow">▼</span>
    </button>
    <div class="dropdown-menu hidden" id="language-options">
        <!-- Python -->
        <button class="dropdown-item" data-language="python">
            <span class="item-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40v72a8,8,0,0,0,16,0V40h88V88a8,8,0,0,0,8,8h48V216H168a8,8,0,0,0,0,16h32a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM64,144H48a8,8,0,0,0-8,8v56a8,8,0,0,0,16,0v-8h8a28,28,0,0,0,0-56Zm0,40H56V160h8a12,12,0,0,1,0,24Zm90.78-27.76-18.78,30V208a8,8,0,0,1-16,0V186.29l-18.78-30a8,8,0,1,1,13.56-8.48L128,168.91l13.22-21.15a8,8,0,1,1,13.56,8.48Z"/>
                </svg>
            </span>
            <span>Python</span>
        </button>
        <!-- C++ -->
<button class="dropdown-item" data-language="cpp">
    <span class="item-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256">
            <path d="M48,180c0,11,7.18,20,16,20a14.18,14.18,0,0,0,10.22-4.66A8,8,0,0,1,85.78,206.4,30.06,30.06,0,0,1,64,216c-17.65,0-32-16.15-32-36s14.35-36,32-36a30.06,30.06,0,0,1,21.78,9.6,8,8,0,0,1-11.56,11.06A14.24,14.24,0,0,0,64,160C55.18,160,48,169,48,180Zm-8-68V40A16,16,0,0,1,56,24h96a8,8,0,0,1,5.66,2.34l56,56A8,8,0,0,1,216,88v24a8,8,0,0,1-16,0V96H152a8,8,0,0,1-8-8V40H56v72a8,8,0,0,1-16,0ZM160,80h28.69L160,51.31Zm-12,92H136V160a8,8,0,0,0-16,0v12H108a8,8,0,0,0,0,16h12v12a8,8,0,0,0,16,0V188h12a8,8,0,0,0,0-16Zm68,0H204V160a8,8,0,0,0-16,0v12H176a8,8,0,0,0,0,16h12v12a8,8,0,0,0,16,0V188h12a8,8,0,0,0,0-16Z"></path>
        </svg>
    </span>
    <span>C++</span>
</button>

        <!-- C -->
<button class="dropdown-item" data-language="c">
    <span class="item-icon">
        <svg width="24" height="24" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 5.5L9.93198 5.43198C9.33524 4.83524 8.52589 4.5 7.68198 4.5H7.5C5.84315 4.5 4.5 5.84315 4.5 7.5C4.5 9.15685 5.84315 10.5 7.5 10.5H7.68198C8.52589 10.5 9.33524 10.1648 9.93198 9.56802L10 9.5M1.5 10.5V4.5L7.5 1L13.5 4.5V10.5L7.5 14L1.5 10.5Z" stroke="currentColor"/>
        </svg>
    </span>
    <span>C</span>
</button>
        <!-- Java -->
        <button class="dropdown-item" data-language="java">
            <span class="item-icon">
                <svg fill="currentColor" width="24" height="24" viewBox="-3 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="m5.701 18.561s-.918.534.653.714c.575.085 1.239.134 1.913.134 1.084 0 2.138-.125 3.149-.363l-.093.018c.374.228.809.445 1.262.624l.059.02c-4.698 2.014-10.633-.117-6.942-1.148z"/>
                    <path d="m5.127 15.933s-1.029.762.542.924c.687.086 1.482.136 2.289.136 1.461 0 2.884-.162 4.252-.468l-.129.024c.275.258.604.463.968.596l.02.006c-5.68 1.661-12.008.131-7.942-1.218z"/>
                    <path d="m9.966 11.475c1.158 1.333-.304 2.532-.304 2.532s2.939-1.52 1.59-3.418c-1.261-1.772-2.228-2.653 3.006-5.688 0 0-8.216 2.052-4.292 6.574z"/>
                    <path d="m16.18 20.505s.678.56-.747.992c-2.712.822-11.287 1.07-13.67.033-.856-.373.75-.89 1.254-.998.232-.059.499-.093.774-.093h.057-.003c-.952-.671-6.155 1.318-2.64 1.886 9.579 1.554 17.462-.7 14.978-1.82z"/>
                    <path d="m6.142 13.21s-4.362 1.036-1.545 1.412c.759.063 1.644.098 2.536.098 1.139 0 2.264-.058 3.372-.171l-.139.012c1.805-.152 3.618-.48 3.618-.48-.425.186-.785.382-1.126.605l.029-.018c-4.43 1.165-12.986.623-10.523-.569 1.086-.563 2.372-.893 3.734-.893h.046-.002z"/>
                    <path d="m13.966 17.585c4.502-2.34 2.421-4.588.967-4.286-.199.037-.372.085-.539.146l.023-.007c.095-.134.226-.237.379-.295l.006-.002c2.874-1.01 5.086 2.981-.928 4.56.037-.033.067-.072.089-.115l.001-.002z"/>
                    <path d="m11.252 0s2.494 2.494-2.366 6.33c-3.896 3.077-.889 4.831 0 6.836-2.274-2.052-3.943-3.858-2.824-5.54 1.644-2.468 6.197-3.664 5.19-7.627z"/>
                    <path d="m6.585 23.925c4.32.277 10.96-.154 11.12-2.198 0 0-.302.775-3.572 1.391-1.806.326-3.885.512-6.008.512-1.739 0-3.448-.125-5.121-.366l.191.023s.553.458 3.393.64z"/>
                </svg>
            </span>
            <span>Java</span>
        </button>
    </div>
</div>
                    <!-- Botón de ayuda existente -->
                        <div class="dropdown">
    <button class="buddy-button action-button dropdown-toggle" id="ask-button">
        <span>Ayuda</span>
        <span class="dropdown-arrow">▼</span>
    </button>
    <div class="dropdown-menu hidden" id="question-options">
        <button class="dropdown-item" id="concept-button">
            <span class="item-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M176,232a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h80A8,8,0,0,1,176,232Zm40-128a87.55,87.55,0,0,1-33.64,69.21A16.24,16.24,0,0,0,176,186v6a16,16,0,0,1-16,16H96a16,16,0,0,1-16-16v-6a16,16,0,0,0-6.23-12.66A87.59,87.59,0,0,1,40,104.5C39.74,56.83,78.26,17.15,125.88,16A88,88,0,0,1,216,104Zm-16,0a72,72,0,0,0-73.74-72c-39,.92-70.47,33.39-70.26,72.39a71.64,71.64,0,0,0,27.64,56.3h0A32,32,0,0,1,96,186v6h24V147.31L90.34,117.66a8,8,0,0,1,11.32-11.32L128,132.69l26.34-26.35a8,8,0,0,1,11.32,11.32L136,147.31V192h24v-6a32.12,32.12,0,0,1,12.47-25.35A71.65,71.65,0,0,0,200,104Z"/>
                </svg>
            </span>
            <span>Explicar conceptos clave</span>
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
                    <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm16-40a8,8,0,0,1-8,8,16,16,0,0,1-16-16V128a8,8,0,0,1,0-16,16,16,0,0,1,16,16v40A8,8,0,0,1,144,176ZM112,84a12,12,0,1,1,12,12A12,12,0,0,1,112,84Z"/>
                </svg>
            </span>
            <span>Recibir una pista</span>
        </button>
        <button class="dropdown-item" id="next-step-button">
            <span class="item-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216ZM160,80a8,8,0,0,0-8,8v25.57L100.24,81.22A8,8,0,0,0,88,88v80a8,8,0,0,0,12.24,6.78L152,142.43V168a8,8,0,0,0,16,0V88A8,8,0,0,0,160,80Zm-56,73.57V102.43L144.91,128Z"/>
                </svg>
            </span>
            <span>Ver próximo paso</span>
        </button>
        <button class="dropdown-item" id="solution-button">
            <span class="item-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M32,64a8,8,0,0,1,8-8H216a8,8,0,0,1,0,16H40A8,8,0,0,1,32,64Zm8,72h72a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16Zm88,48H40a8,8,0,0,0,0,16h88a8,8,0,0,0,0-16Zm109.66,13.66a8,8,0,0,1-11.32,0L206,177.36A40,40,0,1,1,217.36,166l20.3,20.3A8,8,0,0,1,237.66,197.66ZM184,168a24,24,0,1,0-24-24A24,24,0,0,0,184,168Z"/>
                </svg>
            </span>
            <span>Explicar solución</span>
        </button>
        <button class="dropdown-item" id="follow-up-button">
            <span class="item-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M80,64a8,8,0,0,1,8-8H216a8,8,0,0,1,0,16H88A8,8,0,0,1,80,64Zm136,56H88a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Zm0,64H88a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16ZM44,52A12,12,0,1,0,56,64,12,12,0,0,0,44,52Zm0,64a12,12,0,1,0,12,12A12,12,0,0,0,44,116Zm0,64a12,12,0,1,0,12,12A12,12,0,0,0,44,180Z"/>
                </svg>
            </span>
            <span>Hacer preguntas de seguimiento</span>
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

                    <!-- Loader fuera del dropdown -->
                    <div id="in-progress" class="hidden">
                        <div class="loader">
                        </div>
                    </div>
    
                <script>
(function() {
    const vscode = acquireVsCodeApi();
    const qaList = document.getElementById('qa-list');
    const languageButton = document.getElementById('language-button');
    const languageOptions = document.getElementById('language-options');
    let currentLanguage = 'python'; // Lenguaje por defecto

    function closeLanguageDropdown() {
    if (languageOptions) {
        languageOptions.classList.add('hidden');
        const arrow = languageButton?.querySelector('.dropdown-arrow');
        if (arrow) {
            arrow.style.transform = 'rotate(0deg)';
        }
    }
}
    // Toggle del dropdown de lenguaje
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

// Event listeners para las opciones de lenguaje
document.querySelectorAll('#language-options .dropdown-item').forEach(option => {
    option.addEventListener('click', (e) => {
        const selectedLanguage = e.target.dataset.language;
        currentLanguage = selectedLanguage;
        languageButton.querySelector('span').textContent = e.target.textContent;
        closeLanguageDropdown();
    });
});

// Actualizar el cierre del dropdown al hacer clic fuera
document.addEventListener('click', (e) => {
    if (!languageOptions?.contains(e.target) && !languageButton?.contains(e.target)) {
        closeLanguageDropdown();
    }
});
    
    function getProblemText() {
        return document.getElementById('problem-text').value.trim();
    }
    
    // Referencias al botón y al menú del dropdown
const askButton = document.getElementById('ask-button');
const questionOptions = document.getElementById('question-options');

// Función para cerrar el dropdown
function closeDropdown() {
    if (questionOptions) {
        questionOptions.classList.add('hidden'); // Oculta el menú
        const arrow = askButton?.querySelector('.dropdown-arrow');
        if (arrow) {
            arrow.style.transform = 'rotate(0deg)'; // Restaura la flecha
        }
    }
}

// Listener para abrir/cerrar el dropdown
askButton?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = questionOptions.classList.contains('hidden');
    if (isHidden) {
        questionOptions.classList.remove('hidden'); // Muestra el menú
        askButton.querySelector('.dropdown-arrow').style.transform = 'rotate(180deg)';
    } else {
        closeDropdown(); // Oculta el menú
    }
});

// Listener para cerrar el dropdown si se hace clic fuera
document.addEventListener('click', (e) => {
    if (!questionOptions?.contains(e.target) && !askButton?.contains(e.target)) {
        closeDropdown(); // Cierra el menú al hacer clic fuera
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
        problemText: getProblemText(),
        language: currentLanguage // Agregar el lenguaje
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
        problemText: {
            text: problemText,
            language: currentLanguage
        }
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
        problemText: {
            text: problemText,
            language: currentLanguage
        }
    });
    document.getElementById('in-progress')?.classList.remove('hidden');
    closeDropdown();
});

// Añadir aquí el evento del botón de pista
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
        problemText: {
            text: problemText,
            language: currentLanguage
        }
    });
    document.getElementById('in-progress')?.classList.remove('hidden');
    closeDropdown();
});

document.getElementById('next-step-button')?.addEventListener('click', () => {
    vscode.postMessage({ 
        type: 'askAINextStep',
        problemText: {
            text: '', // Se obtiene del editor en el backend
            language: currentLanguage
        }
    });
    document.getElementById('in-progress')?.classList.remove('hidden');
    closeDropdown();
});
// Agregar event listeners para los nuevos botones
document.getElementById('solution-button')?.addEventListener('click', () => {
    const problemText = getProblemText();
    if (!problemText) {
        vscode.postMessage({ 
            type: 'error',
            message: 'Por favor, escribe un problema antes de solicitar la solución.'
        });
        return;
    }
    vscode.postMessage({ 
        type: 'askAISolution',
        problemText: problemText,
        language: currentLanguage
    });
    document.getElementById('in-progress')?.classList.remove('hidden');
    closeDropdown();
});

document.getElementById('follow-up-button')?.addEventListener('click', () => {
    const problemText = getProblemText();
    if (!problemText) {
        vscode.postMessage({ 
            type: 'error',
            message: 'Por favor, escribe un problema antes de solicitar preguntas de seguimiento.'
        });
        return;
    }
    vscode.postMessage({ 
        type: 'askAIFollowUp',
        problemText: problemText,
        language: currentLanguage
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
        case 'solutionResponse':
        case 'followUpResponse':
            if (qaList) {
                const responseDiv = document.createElement('div');
                responseDiv.className = 'buddy-response-card';
                responseDiv.innerHTML = message.valueHtml;
                
                // Para followUpResponse, configurar los event listeners de los botones
        if (message.type === 'followUpResponse') {
            responseDiv.querySelectorAll('.show-answer-button').forEach(button => {
                button.addEventListener('click', function(e) {
                    const answerDiv = this.parentElement.nextElementSibling;
                    answerDiv.classList.toggle('hidden');
                    this.textContent = answerDiv.classList.contains('hidden') ? 
                        'Ver respuesta' : 'Ocultar respuesta';
                });
            });
        }
        
        // Insertar la nueva respuesta al principio
        qaList.insertBefore(responseDiv, qaList.firstChild);
        
        // Hacer scroll suave al principio
        qaList.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
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

module.exports = BuddyViewProvider;