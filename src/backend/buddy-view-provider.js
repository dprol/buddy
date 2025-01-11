"use strict";

Object.defineProperty(exports, "__esModule", { value: true });

const vscode = require("vscode");
const { Anthropic } = require("@anthropic-ai/sdk");
const { initAuth } = require('./utils');
const markdown = require("@ts-stack/markdown");
const hljs = require("highlight.js");

/**
 * clase para el renderizado de markdown
 */
class MyRenderer extends markdown.Renderer {
    code(code, lang, escaped, meta) {
        const supportedLanguages = {
            'python': 'python',
            'py': 'python',
            'cpp': 'cpp',
            'c++': 'cpp',
            'c': 'c',
            'java': 'java'
        };

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
            if (!this.anthropic) {
                throw new Error('No se pudo inicializar la conexión con Anthropic.');
            }
        }
        
        try {
            const cleanMessages = chatPrompt.map(msg => ({
                role: msg.role === 'assistant' ? 'assistant' : 'user',
                content: msg.content.trim()
            }));

            const response = await this.anthropic.messages.create({
                model: "claude-3-5-sonnet-20241022",
                messages: cleanMessages,
                max_tokens: 2000,
                temperature: 0.5,
                system: cleanMessages[0].content.trim()
            });

            return response.content[0].text.trim();
        } catch (error) {
            console.error("Error en queryAI:", error);
            throw error;
        }
    }

    async setUpConnection() {
        try {
            const apiKey = await initAuth(this.context);

            if (!apiKey) {
                throw new Error('No se pudo obtener la clave API de Anthropic. Configúrela correctamente.');
            }

            this.anthropic = new Anthropic({
                apiKey: apiKey
            });

            console.log("Conexión establecida con Anthropic");
        } catch (error) {
            console.error("Error en setUpConnection:", error.message);
            vscode.window.showErrorMessage(`Error al establecer conexión con Anthropic: ${error.message}`);
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

    sendMessage(message) {
        console.log('Enviando mensaje a WebView:', message);
        if (this.webView) {
            this.webView.webview.postMessage(message);
        }
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
}

exports.default = BuddyViewProvider;