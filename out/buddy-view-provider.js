"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
    }
    setUpConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            this.credentials = yield (0, utils_1.initAuth)(this.context);
            this.openai = new openai_1.OpenAI({
                apiKey: this.credentials.openai.apiKey
            });
            this.anthropic = new anthropic_1.Anthropic({
                apiKey: this.credentials.anthropic.apiKey
            });
            console.log("Conexión establecida");
            vscode.commands.executeCommand(telemetry.commands.logTelemetry.name, new telemetry.LoggerEntry("AI.setupConnection", "Conexión con IA establecida"));
        });
    }
    queryAI(chatPrompt, assistantPrompt, abortController, isQuery = false) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.openai && !this.anthropic) {
                yield this.setUpConnection();
            }
            try {
                this.logQuery(chatPrompt);
                const useAnthropicAPI = yield this.context.globalState.get('useAnthropicAPI', false);
                const output = yield this.performAIQuery(useAnthropicAPI, chatPrompt, assistantPrompt, abortController, isQuery);
                return output;
            }
            catch (error) {
                console.error("Error en queryAI:", error);
                vscode.commands.executeCommand(telemetry.commands.logTelemetry.name, new telemetry.LoggerEntry("Buddy.queryError", "Error en consulta: %s, prompt: %s", [error.message, chatPrompt.map(msg => `${msg.role}::: ${msg.content}`).join(':::::')]));
                let errorMessage = "Lo siento, hubo un error al procesar tu consulta. ";
                if (error.name === "AbortError") {
                    errorMessage += "La consulta fue cancelada.";
                }
                else if (((_a = error.response) === null || _a === void 0 ? void 0 : _a.status) === 429) {
                    errorMessage += "Se ha excedido el límite de solicitudes. Por favor, intenta más tarde.";
                }
                else if (error.code === "ETIMEDOUT" || error.code === "ECONNABORTED") {
                    errorMessage += "La consulta tomó demasiado tiempo. Por favor, intenta de nuevo.";
                }
                else {
                    errorMessage += "Por favor, verifica tu conexión e intenta de nuevo.";
                }
                return errorMessage;
            }
        });
    }
    performAIQuery(useAnthropicAPI, chatPrompt, assistantPrompt, abortController, isQuery) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (useAnthropicAPI) {
                    const response = yield this.anthropic.messages.create({
                        model: "claude-3-5-sonnet-20241022",
                        messages: this.formatMessagesForAnthropic(chatPrompt),
                        max_tokens: 4000,
                        temperature: 0.7,
                        system: chatPrompt[0].content,
                        timeout: 60000,
                        signal: abortController.signal
                    });
                    return isQuery ?
                        response.content[0].text.trim() :
                        assistantPrompt + this.lowerFirstLetter(response.content[0].text.trim());
                }
                else {
                    // Removidos timeout y signal de la llamada a OpenAI
                    const response = yield this.openai.chat.completions.create({
                        model: "gpt-4",
                        messages: chatPrompt,
                        max_tokens: 4000,
                        temperature: 0.7
                    });
                    return isQuery ?
                        response.choices[0].message.content.trim() :
                        assistantPrompt + this.lowerFirstLetter(response.choices[0].message.content.trim());
                }
            }
            catch (error) {
                console.error("Error en performAIQuery:", error);
                throw error;
            }
        });
    }
    // Métodos auxiliares
    capitalizeFirstLetter(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    lowerFirstLetter(str) {
        return str.charAt(0).toLowerCase() + str.slice(1);
    }
    formatMessagesForAnthropic(messages) {
        return messages.map(msg => ({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content
        }));
    }
    // Métodos de UI y gestión de eventos
    resolveWebviewView(webviewView) {
        this.webView = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.context.extensionUri]
        };
        webviewView.webview.html = this.getHtml(webviewView.webview);
        webviewView.webview.onDidReceiveMessage(data => {
            if (['askAIfromTab', 'askAIConcept', 'askAIUsage'].includes(data.type)) {
                this.ac = new AbortController();
                this.sendRequest(data, this.ac);
            }
            else if (data.type === 'clearChat') {
                this.previousChat = [];
            }
            else if (data.type === 'stopQuery') {
                this.ac.abort();
            }
            else if (data.type === 'embedComment') {
                console.log(data);
                this.embedComment(data);
            }
            else if (data.type === "reaskAI") {
                console.log(data);
                this.ac = new AbortController();
                this.reaskAI(data, this.ac);
            }
        });
    }
    getAssistantPrompts(queryType) {
        switch (queryType) {
            case "askAIOverview":
                return ``;
            case "askAIQuery":
                return ``;
            case "askAIConcept":
                return `Varios conceptos del problema explicados:\n\n1. `;
            case "askAIUsage":
                return `Aquí tienes un ejemplo de código:\n`;
            default:
                return "";
        }
    }
    getPrompts(selectedText, queryType, nlPrompt, queryWithCode = false) {
        let prompt = "";
        if (queryType === "askAIOverview") {
            prompt = `Proporciona un resumen de una línea del siguiente código:\n${selectedText}`;
        }
        else if (queryType === "askAIQuery" && queryWithCode) {
            prompt = `En el contexto del siguiente código, ${nlPrompt}:\n${selectedText}`;
        }
        else if (queryType === "askAIQuery" && !queryWithCode) {
            prompt = nlPrompt;
        }
        else {
            // Analizar APIs en el código
            const apisMatches = selectedText.match(/\.[\w|\.]+\(/g);
            const preApis = apisMatches === null || apisMatches === void 0 ? void 0 : apisMatches.map(s => s.slice(1, -1));
            const apis = [];
            if (preApis) {
                for (const api of preApis) {
                    const apiParts = api.split(".");
                    if (apiParts.length > 0) {
                        apis.push(apiParts.slice(-1)[0]);
                    }
                }
            }
            if (queryType === "askAIConcept") {
                prompt = `Explica los conceptos específicos del dominio necesarios para entender el siguiente código:\n${selectedText}\nPor favor, no expliques bibliotecas o funciones API, céntrate solo en conceptos del dominio`;
            }
            else if (queryType === "askAIUsage") {
                prompt = `Por favor, proporciona un ejemplo de código, mostrando principalmente el uso de las llamadas API en el siguiente código:\n${selectedText}`;
            }
        }
        return prompt;
    }
    /**
     * Prepara el prompt para la consulta
     */
    preparePrompt(queryType, selectedText, fileName, overviewRef, nlPrompt, fullFileContent) {
        return __awaiter(this, void 0, void 0, function* () {
            let chatPrompt = [];
            let prompt = "";
            let assistantPrompt = "";
            if (queryType === "askAIOverview" || queryType === "askAIQuery") {
                this.overviewId += 1;
            }
            if (queryType === "askAIQuery" && fullFileContent.length > 0) {
                if (this.previousChat.length < 2) {
                    [chatPrompt, prompt, assistantPrompt] = this.generateChatPrompt(selectedText, queryType, fileName, overviewRef, nlPrompt, true, fullFileContent);
                }
                else {
                    [chatPrompt, prompt, assistantPrompt] = this.generateChatPrompt(selectedText, queryType, fileName, overviewRef, nlPrompt, false);
                }
            }
            else {
                [chatPrompt, prompt, assistantPrompt] = this.generateChatPrompt(selectedText, queryType, fileName, overviewRef, nlPrompt, true);
            }
            return [chatPrompt, prompt, assistantPrompt];
        });
    }
    /**
     * Genera el prompt del chat
     */
    generateChatPrompt(selectedText, queryType, fileName, overviewRef, nlPrompt, queryWithCode = false, fullFileContent) {
        let prompt = "";
        let assistantPrompt = this.getAssistantPrompts(queryType);
        if (queryType === "askAIQuery" && fullFileContent) {
            prompt = this.getPrompts(fullFileContent, queryType, nlPrompt, true);
        }
        else if (queryType === "askAIQuery" && queryWithCode) {
            prompt = this.getPrompts(selectedText, queryType, nlPrompt, true);
        }
        else {
            prompt = this.getPrompts(selectedText, queryType, nlPrompt);
        }
        let chatPrompt = [
            {
                "role": "system",
                "content": `Soy un asistente experto para estudiantes universitarios`
            }
        ];
        if (["askAIConcept", "askAIUsage"].includes(queryType) && overviewRef) {
            const overviewPrompt = this.getPrompts(selectedText, "askAIOverview");
            chatPrompt.push({ "role": "user", "content": overviewPrompt }, { "role": "assistant", "content": overviewRef });
        }
        else if (queryType === "askAIQuery" && this.previousChat.length >= 2 && !queryWithCode && nlPrompt) {
            chatPrompt = this.previousChat.slice(-3);
            prompt = nlPrompt;
            assistantPrompt = "";
        }
        chatPrompt.push({ "role": "user", "content": prompt }, { "role": "assistant", "content": assistantPrompt });
        return [chatPrompt, prompt, assistantPrompt];
    }
    sendRequest(data, abortController) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('1. Iniciando sendRequest');
                console.log('Datos recibidos:', {
                    type: data.type,
                    hasCode: !!data.code,
                    hasQueryId: !!data.queryId,
                    hasValue: !!data.value
                });
                if (!abortController) {
                    console.log('2. Creando nuevo AbortController');
                    abortController = new AbortController();
                }
                console.log('3. Evaluando tipo de request:', data.type);
                try {
                    if (data.type === 'askAIfromTab') {
                        console.log('4a. Procesando askAIfromTab');
                        yield this.sendApiRequestWithCode("", "askAIQuery", abortController, "", data.queryId, data.value);
                        console.log('5a. askAIfromTab completado');
                    }
                    else if (data.type === 'askAIOverview') {
                        console.log('4b. Procesando askAIOverview');
                        console.log('Código a procesar:', ((_a = data.code) === null || _a === void 0 ? void 0 : _a.substring(0, 100)) + '...');
                        yield this.sendApiRequestWithCode(data.code, data.type, abortController);
                        console.log('5b. askAIOverview completado');
                    }
                    else if (['askAIConcept', 'askAIUsage'].includes(data.type)) {
                        console.log('4c. Procesando', data.type);
                        yield this.sendApiRequestWithCode(data.code, data.type, abortController, data.overviewRef, data.queryId);
                        console.log('5c.', data.type, 'completado');
                    }
                    else {
                        console.warn('Tipo de request no reconocido:', data.type);
                    }
                    console.log('6. Request completado exitosamente');
                }
                catch (apiError) {
                    console.error('Error al llamar sendApiRequestWithCode:', apiError);
                    console.error('Stack trace:', apiError.stack);
                    throw apiError; // Re-lanzar para que lo capture el catch exterior
                }
            }
            catch (error) {
                console.error("Error en sendRequest:", error);
                console.error("Stack trace completo:", error.stack);
                vscode.window.showErrorMessage(`Error al procesar la solicitud: ${error.message}`);
                // Registrar en telemetría si está disponible
                if (vscode.commands && vscode.commands.executeCommand && this.context) {
                    try {
                        vscode.commands.executeCommand('buddy.logTelemetry', new this.context.LoggerEntry("sendRequest.error", "Error en solicitud: %s. Stack: %s", [error.message, error.stack]));
                    }
                    catch (telemetryError) {
                        console.error('Error al registrar telemetría:', telemetryError);
                    }
                }
            }
        });
    }
    logQuery(chatPrompt) {
        vscode.commands.executeCommand(telemetry.commands.logTelemetry.name, new telemetry.LoggerEntry("Buddy.query", "Enviando consulta: %s", [chatPrompt.map(msg => `${msg.role}::: ${msg.content}`).join(':::::')]));
    }
    sendMessage(message) {
        var _a;
        console.log('Enviando mensaje al WebView:', message);
        if (this.webView) {
            (_a = this.webView) === null || _a === void 0 ? void 0 : _a.webview.postMessage(message);
        }
        else {
            console.error('WebView no está inicializado');
            this.message = message;
        }
    }
    /**
         * Procesa y envía la respuesta
         */
    processQueryResponse(queryType, output, prompt, queryId, editorSelectedText) {
        return __awaiter(this, void 0, void 0, function* () {
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
            }
            else {
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
                }
            }
        });
    }
    /**
     * Actualiza el historial del chat
     */
    updateChatHistory(prompt, output, editorSelectedText) {
        if (editorSelectedText) {
            this.previousChat = [{
                    "role": "system",
                    "content": `Soy un asistente experto para estudiantes universitarios`
                }];
        }
        this.previousChat.push({ "role": "user", "content": prompt }, { "role": "assistant", "content": output });
    }
    /**
     * Genera el HTML de la vista web
     */
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
            <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="overflow-hidden">
            <div class="flex flex-col h-screen">
                <!-- ... resto del HTML ... -->
                <div id="qa-list" class="flex-1 overflow-y-auto"></div>
                <!-- ... resto del HTML ... -->
            </div>
            <script>
                (function() {
                    const vscode = acquireVsCodeApi();
                    const qaList = document.getElementById('qa-list');

                    window.addEventListener('message', event => {
                        const message = event.data;
                        console.log('Mensaje recibido en WebView:', message);

                        switch (message.type) {
                            case 'addOverview':
                                const overviewDiv = document.createElement('div');
                                overviewDiv.className = 'overview p-4 m-2 border rounded';
                                overviewDiv.innerHTML = message.valueHtml;
                                qaList.appendChild(overviewDiv);
                                break;
                            // ... otros casos ...
                        }
                    });
                }())
            </script>
        </body>
        </html>`;
    }
    /**
     * Maneja las solicitudes de código a la IA
     */
    sendApiRequestWithCode(selectedText, queryType, abortController, overviewRef, queryId, nlPrompt) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const editor = vscode.window.activeTextEditor;
            if (!editor)
                return;
            try {
                let fileName = editor.document.fileName;
                let editorSelectedText = editor.document.getText(editor.selection);
                let fullFileContent = "";
                if (queryType === "askAIQuery") {
                    if (editorSelectedText) {
                        selectedText = editorSelectedText;
                    }
                    else {
                        fullFileContent = editor.document.getText();
                    }
                }
                if (!this.webView) {
                    yield vscode.commands.executeCommand('buddy-vscode-plugin.view.focus');
                }
                else {
                    (_b = (_a = this.webView) === null || _a === void 0 ? void 0 : _a.show) === null || _b === void 0 ? void 0 : _b.call(_a, true);
                }
                let [chatPrompt, prompt, assistantPrompt] = yield this.preparePrompt(queryType, selectedText, fileName, overviewRef, nlPrompt, fullFileContent);
                let output = yield this.queryAI(chatPrompt, assistantPrompt, abortController, queryType === "askAIQuery");
                yield this.processQueryResponse(queryType, output, prompt, queryId, editorSelectedText);
            }
            catch (error) {
                console.error("Error en sendApiRequestWithCode:", error);
                vscode.window.showErrorMessage(`Error al procesar la consulta: ${error.message}`);
            }
        });
    }
    /**
     * Re-ejecuta una consulta a la IA
     */
    reaskAI(data, abortController) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let chatPrompt = data.prompt.split(":::::").map(str => {
                    let [role, content] = str.split("::: ");
                    return { role, content };
                });
                vscode.commands.executeCommand(telemetry.commands.logTelemetry.name, new telemetry.LoggerEntry("Buddy.reaskAI", "Actualizando consulta. prompt: %s, tipo: %s", [chatPrompt.map(msg => `${msg.role}::: ${msg.content}`).join(':::::'), data.queryType]));
                let output = yield this.queryAI(chatPrompt, this.getAssistantPrompts("askAI" + this.capitalizeFirstLetter(data.queryType)), abortController);
                this.sendMessage({
                    type: 'redoQuery',
                    overviewId: data.overviewId,
                    queryId: data.refreshId,
                    queryType: data.queryType,
                    value: output,
                    valueHtml: markdown_1.Marked.parse(output)
                });
            }
            catch (error) {
                console.error("Error en reaskAI:", error);
                vscode.window.showErrorMessage(`Error al actualizar la consulta: ${error.message}`);
            }
        });
    }
}
exports.default = BuddyViewProvider;
//# sourceMappingURL=buddy-view-provider.js.map