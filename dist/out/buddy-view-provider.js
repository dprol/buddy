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
// módulo para TypeScript
Object.defineProperty(exports, "__esModule", { value: true });
// importaciones
const vscode = require("vscode");
const openai_1 = require("openai");
const anthropic_1 = require("@anthropic-ai/sdk");
const utils_1 = require("./utils");
const telemetry = require("./telemetry/Telemetry");
const markdown_1 = require("@ts-stack/markdown");
const highlight_js_1 = require("highlight.js");
/**
 * clase para el renderizado de markdown
 * extiende el renderizador base para personalizar el formato de código y listas
 */
class MyRenderer extends markdown_1.Renderer {
    // renderizado de bloques de código
    code(code, lang, escaped, meta) {
        const out = highlight_js_1.default.highlight(code, { 'language': "python" }).value;
        return `\n<pre class='overflow-scroll white-space-pre' style="margin: 1em 0.5em;"><code class="language-python hljs">${out}</code></pre>\n`;
    }
    // renderizado de listas
    list(body, ordered) {
        const type = ordered ? 'ol' : 'ul';
        return `\n<${type} style="list-style-type: disc;">\n${body}</${type}>\n`;
    }
}
// renderizador para Markdown
markdown_1.Marked.setOptions({ renderer: new MyRenderer });
/**
 * inicializa la conexión con OpenAI
 * @param credentials credenciales para la API de OpenAI
 */
const initOpenAI = (credentials) => {
    const openaiConfig = new openai_1.Configuration(Object.assign({}, credentials));
    return new openai_1.OpenAIApi(openaiConfig);
};
/**
 * inicializa la conexión con Anthropic
 * @param credentials credenciales para la API de Anthropic
 */
const initAnthropic = (credentials) => {
    return new anthropic_1.Anthropic({
        apiKey: credentials.apiKey
    });
};
/**
 * clase de vista para Buddy
 * gestiona la interfaz y la comunicación con las APIs de IA
 */
class BuddyViewProvider {
    constructor(context) {
        this.context = context;
        this.previousChat = [];
        this.ac = new AbortController();
        this.overviewId = 0;
    }
    /**
     * obtiene los prompts iniciales según el tipo de consulta
     */
    getAssistantPrompts(queryType) {
        switch (queryType) {
            case "askAIOverview":
                return `Este código `;
            case "askAIQuery":
                return `En este código, `;
            case "askAIConcept":
                return `Varios conceptos del problema explicados:\n\n1. `;
            case "askAIUsage":
                return `Aquí tienes un ejemplo de código:\n`;
            default:
                return "";
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
        // manejadores de eventos para los mensajes de la vista web
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
    /**
     * conexiones con las APIs de IA
     */
    setUpConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            this.credentials = yield (0, utils_1.initAuth)(this.context);
            this.openai = initOpenAI(this.credentials.openai);
            this.anthropic = initAnthropic(this.credentials.anthropic);
            console.log("Conexión establecida");
            vscode.commands.executeCommand(telemetry.commands.logTelemetry.name, new telemetry.LoggerEntry("AI.setupConnection", "Conexión con IA establecida"));
        });
    }
    toggleAIProvider() {
        return __awaiter(this, void 0, void 0, function* () {
            const currentProvider = yield this.context.globalState.get('useAnthropicAPI', false);
            yield this.context.globalState.update('useAnthropicAPI', !currentProvider);
            return !currentProvider;
        });
    }
    /**
         * convierte a mayúscula la primera letra de una cadena
         * @param {string} str - Cadena a modificar
         * @returns {string} Cadena con la primera letra en mayúscula
         */
    ;
    capitalizeFirstLetter(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    /**
     * Convierte a minúscula la primera letra de una cadena
     * @param {string} str - Cadena a modificar
     * @returns {string} Cadena con la primera letra en minúscula
     */
    ;
    lowerFirstLetter(str) {
        return str.charAt(0).toLowerCase() + str.slice(1);
    }
    /**
    * aplicar indentación a una cadena de texto
    * @param {string} string - Texto a indentar
    * @param {number} count - número de niveles de indentación
    * @param {string} indent - carácter de indentación
    * @returns {string} texto indentado
    * @throws {TypeError} si los parámetros no son del tipo correcto
    * @throws {RangeError} si count es negativo
    */
    // https://www.npmjs.com/package/indent-string
    indentString(string, count = 1, indent = ' ') {
        // Validaciones de tipo
        if (typeof string !== 'string') {
            throw new TypeError(`Se esperaba una cadena de texto, se recibió \`${typeof string}\``);
        }
        if (typeof count !== 'number') {
            throw new TypeError(`Se esperaba un número, se recibió \`${typeof count}\``);
        }
        if (count < 0) {
            throw new RangeError(`El número de indentaciones debe ser mayor o igual a 0, se recibió \`${count}\``);
        }
        if (typeof indent !== 'string') {
            throw new TypeError(`Se esperaba una cadena para la indentación, se recibió \`${typeof indent}\``);
        }
        // Si no hay indentación, devolver el texto original
        if (count === 0) {
            return string;
        }
        // Expresión regular para encontrar líneas no vacías
        const regex = /^(?!\s*$)/gm;
        return string.replace(regex, indent.repeat(count));
    }
    /**
     * Formatea un comentario ajustándolo a un ancho máximo
     * @param {string} comment - Comentario a formatear
     * @param {number} maxWidth - Ancho máximo de línea
     * @returns {string[]} Líneas formateadas
     */
    formatComment(comment, maxWidth = 79) {
        // Verificar si el comentario es válido
        if (!comment) {
            return [];
        }
        // Dividir el comentario en palabras
        const words = comment.split(' ');
        const lines = [];
        let currentLine = words[0];
        // Procesar cada palabra
        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            // Verificar si la palabra cabe en la línea actual
            if (currentLine.length + word.length + 1 <= maxWidth) {
                currentLine = currentLine + ' ' + word;
            }
            else {
                // Si no cabe, comenzar nueva línea
                lines.push(currentLine);
                currentLine = word;
            }
        }
        // Agregar la última línea si existe
        if (currentLine.length > 0) {
            lines.push(currentLine);
        }
        return lines;
    }
    /**
     * Inserta un comentario en el editor activo
     * @param {Object} comment - Objeto con el comentario a insertar
     * @param {string} comment.value - Contenido del comentario
     * @param {string} comment.commentType - Tipo de comentario
     * @returns {Promise<void>}
     */
    embedComment(comment) {
        return __awaiter(this, void 0, void 0, function* () {
            // Verificar si hay un editor activo
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                return;
            }
            // https://github.com/microsoft/vscode-comment/blob/master/extension.ts
            try {
                // obtener la selección actual y calcular la posición de inserción
                const selection = editor.selection;
                const startLine = selection.start.line - 1;
                const currentLine = editor.document.lineAt(startLine);
                const lastCharIndex = currentLine.text.length;
                // determinar la posición de inserción
                let pos;
                let initialNewline = '';
                if (lastCharIndex > 0 && startLine !== 0) {
                    pos = new vscode.Position(startLine, lastCharIndex);
                    initialNewline = '\n';
                }
                else {
                    pos = new vscode.Position(startLine, 0);
                }
                let textToInsert = `${initialNewline}\n"""[Buddy: ${comment.commentType.split("-")[0]}]\n`;
                // formatear el contenido según el tipo de comentario
                if (!comment.commentType.includes("Ejemplos")) {
                    // Para comentarios regulares, formatear cada línea
                    const responseLines = comment.value.split("\n");
                    responseLines.forEach(line => {
                        textToInsert += this.formatComment(line).join("\n") + "\n";
                    });
                }
                else {
                    // para ejemplos de uso, mantener el formato original
                    textToInsert += comment.value;
                }
                textToInsert += `"""\n`;
                const currentCodeLine = editor.document.lineAt(selection.start.line);
                const firstNonWhiteSpace = currentCodeLine.firstNonWhitespaceCharacterIndex;
                // cadena de indentación
                let indentation = '';
                for (let i = 0; i < firstNonWhiteSpace; i++) {
                    indentation += currentCodeLine.text.charAt(i) === '\t' ? '\t' : ' ';
                }
                // se aplica la indentación al comentario
                textToInsert = this.indentString(textToInsert, 1, indentation);
                // registrar la acción en telemetría
                vscode.commands.executeCommand(telemetry.commands.logTelemetry.name, new telemetry.LoggerEntry("Buddy.embed", "Insertando comentario de IA: %s, en posición %s:%s", [comment.value, pos.line, pos.character]));
                // insertar el comentario en el editor
                yield editor.edit(editBuilder => {
                    editBuilder.insert(pos, textToInsert);
                });
            }
            catch (error) {
                // manejar cualquier error que pueda ocurrir durante la inserción
                vscode.window.showErrorMessage(`Error al insertar el comentario: ${error.message}`);
                // registrar el error en telemetría
                vscode.commands.executeCommand(telemetry.commands.logTelemetry.name, new telemetry.LoggerEntry("Buddy.embedError", "Error al insertar comentario: %s", [error.message]));
            }
        });
    }
    /**
 * Genera los prompts específicos según el tipo de consulta
 * @param {string} selectedText - Texto de código seleccionado
 * @param {string} queryType - Tipo de consulta
 * @param {string} nlPrompt - Prompt en lenguaje natural
 * @param {boolean} queryWithCode - Indica si la consulta incluye código
 * @returns {string} Prompt generado
 */
    getPrompts(selectedText, queryType, nlPrompt, queryWithCode = false) {
        let prompt = "";
        // Generar prompt según el tipo de consulta
        if (queryType === "askAIOverview") {
            prompt = `Proporciona un resumen de una línea del siguiente código:
        ${selectedText}
    `;
        }
        else if (queryType === "askAIQuery" && queryWithCode) {
            prompt = `En el contexto del siguiente código, ${nlPrompt}:
        ${selectedText}`;
        }
        else if (queryType === "askAIQuery" && !queryWithCode) {
            prompt = `${nlPrompt}`;
        }
        else if (queryType === "askAIConcept") {
            prompt = `Explica los conceptos necesarios para entender el siguiente problema:
        ${selectedText}
        Por favor, no expliques bibliotecas o funciones API, céntrate solo en conceptos del dominio`;
        }
        else if (queryType === "askAIUsage") {
            prompt = `Por favor, proporciona un ejemplo de código:
        ${selectedText}
    `;
        }
        return prompt;
    }
    /**
     * Maneja las solicitudes a la IA
     * @param {Object} data - Datos de la solicitud
     * @param {AbortController} abortController - Controlador para cancelar la solicitud
     */
    sendRequest(data, abortController) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Asegurar que existe un controlador de aborto
                if (!abortController) {
                    abortController = new AbortController();
                }
                // Procesar según el tipo de solicitud
                if (data.type === 'askAIfromTab') {
                    yield this.sendApiRequestWithCode("", "askAIQuery", abortController, "", data.queryId, data.value);
                }
                else if (data.type === 'askAIOverview') {
                    yield this.sendApiRequestWithCode(data.code, data.type, abortController);
                }
                else if (['askAIConcept', 'askAIUsage'].includes(data.type)) {
                    yield this.sendApiRequestWithCode(data.code, data.type, abortController, data.overviewRef, data.queryId);
                }
            }
            catch (error) {
                vscode.window.showErrorMessage(`Error al procesar la solicitud: ${error.message}`);
            }
        });
    }
    /**
     * Genera los prompts específicos según el tipo de consulta
     * @param {string} selectedText - Texto de código seleccionado
     * @param {string} queryType - Tipo de consulta
     * @param {string} nlPrompt - Prompt en lenguaje natural
     * @param {boolean} queryWithCode - Indica si la consulta incluye código
     * @returns {string} Prompt generado
     */
    getPrompts(selectedText, queryType, nlPrompt, queryWithCode = false) {
        let prompt = "";
        // Generar prompt según el tipo de consulta
        if (queryType === "askAIOverview") {
            prompt = `Proporciona un resumen de una línea del siguiente código:
            ${selectedText}
        `;
        }
        else if (queryType === "askAIQuery" && queryWithCode) {
            prompt = `En el contexto del siguiente código, ${nlPrompt}: 
            ${selectedText}`;
        }
        else if (queryType === "askAIQuery" && !queryWithCode) {
            prompt = `${nlPrompt}`;
        }
        else {
            // Analizar APIs en el código
            const apisMatches = selectedText.match(/\.[\w|\.]+\(/g);
            const preApis = apisMatches === null || apisMatches === void 0 ? void 0 : apisMatches.map(s => s.slice(1, -1));
            const apis = [];
            // Extraer nombres de APIs
            if (preApis) {
                for (const api of preApis) {
                    const apiParts = api.split(".");
                    if (apiParts.length > 0) {
                        apis.push(apiParts.slice(-1)[0]);
                    }
                }
            }
            // Generar prompts específicos según el tipo
            if (queryType === "askAIConcept") {
                prompt = `Explica los conceptos específicos del dominio necesarios para entender el siguiente código:
                ${selectedText}
                Por favor, no expliques bibliotecas o funciones API, céntrate solo en conceptos del dominio`;
            }
            else if (queryType === "askAIUsage") {
                prompt = `Por favor, proporciona un ejemplo de código, mostrando principalmente el uso de las llamadas API en el siguiente código:
                ${selectedText}
            `;
            }
        }
        return prompt;
    }
    /**
     * Maneja las solicitudes a la IA
     * @param {Object} data - Datos de la solicitud
     * @param {AbortController} abortController - Controlador para cancelar la solicitud
     */
    sendRequest(data, abortController) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Asegurar que existe un controlador de aborto
                if (!abortController) {
                    abortController = new AbortController();
                }
                // Procesar según el tipo de solicitud
                if (data.type === 'askAIfromTab') {
                    yield this.sendApiRequestWithCode("", "askAIQuery", abortController, "", data.queryId, data.value);
                }
                else if (data.type === 'askAIOverview') {
                    yield this.sendApiRequestWithCode(data.code, data.type, abortController);
                }
                else if (['askAIConcept', 'askAIUsage'].includes(data.type)) {
                    yield this.sendApiRequestWithCode(data.code, data.type, abortController, data.overviewRef, data.queryId);
                }
            }
            catch (error) {
                vscode.window.showErrorMessage(`Error al procesar la solicitud: ${error.message}`);
            }
        });
    }
    /**
     * Generando el prompt completo para la conversación con la IA
     * @param {string} selectedText - Texto seleccionado
     * @param {string} queryType - Tipo de consulta
     * @param {string} fileName - Nombre del archivo
     * @param {string} overviewRef - Referencia al resumen
     * @param {string} nlPrompt - Prompt en lenguaje natural
     * @param {boolean} queryWithCode - Indica si incluye código
     * @param {string} fullFileContent - Contenido completo del archivo
     * @returns {Array} Array con el prompt de chat, prompt y assistantPrompt
     */
    generateChatPrompt(selectedText, queryType, fileName, overviewRef, nlPrompt, queryWithCode = false, fullFileContent) {
        // generando prompt inicial
        let prompt = "";
        let assistantPrompt = this.getAssistantPrompts(queryType);
        // determinando el tipo de prompt según el contexto
        if (queryType === "askAIQuery" && fullFileContent) {
            prompt = this.getPrompts(fullFileContent, queryType, nlPrompt, true);
        }
        else if (queryType === "askAIQuery" && queryWithCode) {
            prompt = this.getPrompts(selectedText, queryType, nlPrompt, true);
        }
        else {
            prompt = this.getPrompts(selectedText, queryType, nlPrompt);
        }
        // generando el prompt del chat
        let chatPrompt = [
            {
                "role": "system",
                "content": `Soy un asistente experto para estudiantes universitarios`
            }
        ];
        // añadiendo contexto adicional si es necesario
        if (["askAIConcept", "askAIUsage"].includes(queryType) && overviewRef) {
            const overviewPrompt = this.getPrompts(selectedText, "askAIOverview");
            chatPrompt.push({ "role": "user", "content": overviewPrompt }, { "role": "assistant", "content": overviewRef });
        }
        else if (queryType === "askAIQuery" && this.previousChat.length >= 2 && !queryWithCode && nlPrompt) {
            chatPrompt = this.previousChat.slice(-3);
            prompt = nlPrompt;
            assistantPrompt = "";
        }
        // fin del prompt
        chatPrompt.push({ "role": "user", "content": prompt }, { "role": "assistant", "content": assistantPrompt });
        // registrando telemetría
        this.logPromptGeneration(selectedText, chatPrompt, queryType);
        // enviando mensajes según el tipo
        this.sendAppropriateMessage(queryType, selectedText, fileName, nlPrompt, chatPrompt, fullFileContent);
        return [chatPrompt, prompt, assistantPrompt];
    }
    /**
     * registrando la generación del prompt en telemetría
     */
    logPromptGeneration(selectedText, chatPrompt, queryType) {
        vscode.commands.executeCommand(telemetry.commands.logTelemetry.name, new telemetry.LoggerEntry("Buddy.prompt", "Prompt de IA generado. Código: %s, prompt: %s, tipo: %s", [
            selectedText,
            chatPrompt.map(msg => `${msg.role}::: ${msg.content}`).join(':::::'),
            queryType
        ]));
    }
    logQuery(chatPrompt) {
        vscode.commands.executeCommand(telemetry.commands.logTelemetry.name, new telemetry.LoggerEntry("Buddy.query", "Enviando consulta: %s", [chatPrompt.map(msg => `${msg.role}::: ${msg.content}`).join(':::::')]));
    }
    /**
     * enviando el mensaje apropiado según el tipo de consulta
     */
    sendAppropriateMessage(queryType, selectedText, fileName, nlPrompt, chatPrompt, fullFileContent) {
        const promptString = chatPrompt.map(msg => `${msg.role}::: ${msg.content}`).join(':::::');
        if (queryType === "askAIOverview") {
            this.sendMessage({
                type: 'addCodeQuestion',
                code: selectedText,
                filename: fileName,
                codeHtml: markdown_1.Marked.parse("```\n" + selectedText + "\n```"),
                overviewId: this.overviewId,
                prompt: promptString
            });
        }
        else if (queryType === "askAIQuery") {
            this.handleQueryMessage(nlPrompt, selectedText, fullFileContent, promptString);
        }
    }
    /**
     * manejando el envío de mensajes para consultas
     */
    handleQueryMessage(nlPrompt, selectedText, fullFileContent, promptString) {
        const baseMessage = {
            type: 'addNLQuestion',
            value: nlPrompt,
            overviewId: this.overviewId,
            prompt: promptString
        };
        if (!fullFileContent && selectedText) {
            this.sendMessage(Object.assign(Object.assign({}, baseMessage), { code: selectedText, addHLine: true, codeHtml: markdown_1.Marked.parse("```\n" + selectedText + "\n```") }));
        }
        else {
            this.sendMessage(Object.assign(Object.assign({}, baseMessage), { addHLine: this.previousChat.length < 2 }));
        }
    }
    /**
 * vuelve a realizar una consulta a la IA
 * @param {Object} data - Datos de la consulta
 * @param {AbortController} abortController - Controlador para salir de la consulta
 */
    reaskAI(data, abortController) {
        return __awaiter(this, void 0, void 0, function* () {
            // reconstruir el prompt del chat desde la cadena formateada
            let chatPrompt = data.prompt.split(":::::").map(str => {
                let [role, content] = str.split("::: ");
                return { role, content };
            });
            // registrar en telemetría
            vscode.commands.executeCommand(telemetry.commands.logTelemetry.name, new telemetry.LoggerEntry("Buddy.reaskAI", "Actualizando consulta. prompt: %s, tipo: %s", [chatPrompt.map(msg => `${msg.role}::: ${msg.content}`).join(':::::'), data.queryType]));
            // realizar la consulta
            let output = yield this.queryAI(chatPrompt, this.getAssistantPrompts("askAI" + this.capitalizeFirstLetter(data.queryType)), abortController);
            // enviar respuesta actualizada
            this.sendMessage({
                type: 'redoQuery',
                overviewId: data.overviewId,
                queryId: data.refreshId,
                queryType: data.queryType,
                value: output,
                valueHtml: markdown_1.Marked.parse(output)
            });
        });
    }
    /**
     * envía una solicitud de código a la IA
     * @param {string} selectedText - Texto seleccionado
     * @param {string} queryType - Tipo de consulta
     * @param {AbortController} abortController - Controlador para abortar
     * @param {string} overviewRef - Referencia al resumen
     * @param {string} queryId - ID de la consulta
     * @param {string} nlPrompt - Prompt en lenguaje natural
     */
    sendApiRequestWithCode(selectedText, queryType, abortController, overviewRef, queryId, nlPrompt) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                return;
            }
            try {
                // obtener texto y nombre del archivo
                let fileName = editor.document.fileName;
                let editorSelectedText = editor.document.getText(editor.selection);
                let fullFileContent = "";
                // procesar el texto según el tipo de consulta
                if (queryType === "askAIQuery") {
                    if (editorSelectedText) {
                        selectedText = editorSelectedText;
                    }
                    else {
                        fullFileContent = editor.document.getText();
                    }
                }
                // asegurar que la vista web está visible
                if (!this.webView) {
                    yield vscode.commands.executeCommand('buddy-vscode-plugin.view.focus');
                }
                else {
                    (_b = (_a = this.webView) === null || _a === void 0 ? void 0 : _a.show) === null || _b === void 0 ? void 0 : _b.call(_a, true);
                }
                // preparar y generar el prompt
                let [chatPrompt, prompt, assistantPrompt] = yield this.preparePrompt(queryType, selectedText, fileName, overviewRef, nlPrompt, fullFileContent);
                // realizar la consulta
                let output = yield this.queryAI(chatPrompt, assistantPrompt, abortController, queryType === "askAIQuery");
                // procesar y enviar la respuesta
                yield this.processQueryResponse(queryType, output, prompt, queryId, editorSelectedText);
            }
            catch (error) {
                vscode.window.showErrorMessage(`Error al procesar la consulta: ${error.message}`);
            }
        });
    }
    /**
     * prepara el prompt para la consulta
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
    formatMessagesForAnthropic(messages) {
        return messages.map(msg => ({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content
        }));
    }
    /**
     * procesa la respuesta de la consulta
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
     * actualiza el historial del chat
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
     * realiza una consulta a la IA (OpenAI o Anthropic)
     * @param {Array} chatPrompt - Prompt del chat
     * @param {string} assistantPrompt - Prompt inicial del asistente
     * @param {AbortController} abortController - Controlador para abortar
     * @param {boolean} isQuery - Indica si es una consulta directa
     * @returns {Promise<string>} Respuesta de la IA
     */
    performAIQuery(useAnthropicAPI, chatPrompt, assistantPrompt, abortController, isQuery) {
        var _a, _b;
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
                    let payload = {
                        model: "gpt-4o",
                        messages: chatPrompt,
                        max_tokens: 4000,
                        temperature: 0.7
                    };
                    const response = yield this.openai.createChatCompletion(payload, { timeout: 60000, signal: abortController.signal });
                    return isQuery ?
                        (_a = response.data.choices[0].message) === null || _a === void 0 ? void 0 : _a.content.trim() :
                        assistantPrompt + this.lowerFirstLetter((_b = response.data.choices[0].message) === null || _b === void 0 ? void 0 : _b.content.trim());
                }
            }
            catch (error) {
                throw error;
            }
        });
    }
    queryAI(chatPrompt, assistantPrompt, abortController, isQuery = false) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.openai && !this.anthropic) {
                yield this.setUpConnection();
            }
            try {
                // registrar la consulta
                this.logQuery(chatPrompt);
                // realizar la consulta según el servicio configurado
                const useAnthropicAPI = yield this.context.globalState.get('useAnthropicAPI', false);
                const output = yield this.performAIQuery(useAnthropicAPI, chatPrompt, assistantPrompt, abortController, isQuery);
                return output;
            }
            catch (error) {
                return this.handleQueryError(error, chatPrompt);
            }
        });
    }
    /**
     * envía un mensaje a la vista web
     */
    sendMessage(message) {
        var _a;
        if (this.webView) {
            console.log(message);
            (_a = this.webView) === null || _a === void 0 ? void 0 : _a.webview.postMessage(message);
        }
        else {
            this.message = message;
        }
    }
    /**
     * genera el HTML de la vista web
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
                <div class="flex">
                    <button style="background: var(--vscode-button-background); margin-left: auto;" 
                            id="clear-button" class="mr-2 mt-4 mb-4 pl-1 pr-1">Limpiar todo</button>
                    <button style="background: var(--vscode-button-background); color: var(--vscode-errorForeground); font-weight: bolder;" 
                            id="stop-button" class="mr-2 mr-4 mt-4 mb-4 pl-1 pr-1">&#9633; </button>
                </div>
                <div class="flex-1 overflow-y-auto" id="qa-list"></div>
                <div id="in-progress" class="p-4 flex items-center hidden">
                    <div style="text-align: center;">
                        <div>Por favor, espera mientras pienso la mejor respuesta...</div>
                        <div class="loader"></div>
                    </div>
                </div>
                <div class="p-4 flex items-center">
                    <div class="flex-1">
                        <textarea
                            type="text"
                            rows="2"
                            class="border p-2 w-full"
                            id="question-input"
                            placeholder="Haz una pregunta..."
                        ></textarea>
                    </div>
                    <button style="background: var(--vscode-button-background)" 
                            id="ask-button" class="p-2 ml-5">Preguntar</button>
                </div>
            </div>
            <script src="${scriptUri}"></script>
        </body>
        </html>`;
    }
}
/**
 * exportación de la clase BuddyViewProvider
 * Esta clase maneja la interfaz de usuario y la comunicación con las APIs de IA
 */
exports.default = BuddyViewProvider;
//# sourceMappingURL=buddy-view-provider.js.map