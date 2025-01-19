"use strict";

// Manera correcta de importar en CommonJS
const vscode = require("vscode");
const { Anthropic } = require("@anthropic-ai/sdk");
const utils = require("./utils");
const { Marked, Renderer } = require("@ts-stack/markdown");
const hljs = require("highlight.js");
const React = require('react');
const ReactDOM = require('react-dom');
const ConceptSlider = require('../componentes/ConceptSlider');

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
        this.currentLanguage = 'python'; // Valor por defecto
    }

updateLanguage(language) {
    console.log('Actualizando lenguaje a:', language);
    this.currentLanguage = language;
}

    hideLoader() {
        this.sendMessage({
            type: 'hideLoader'
        });
    }

    async queryAI(chatPrompt, assistantPrompt, abortController) {
        if (!this.anthropic) {
            await this.setUpConnection();
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
        try {
            this.sendMessage({ type: 'showLoader' });
            console.log('Iniciando petición API:', queryType);
            
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                this.sendMessage({
                    type: 'error',
                    message: 'No hay un editor activo.'
                });
                return;
            }
    
            this.sendMessage({ type: 'showProgress' });
            
            const problemText = {
                text: selectedText,
                language: this.currentLanguage
            };
    
            let [chatPrompt, prompt, assistantPrompt] = await this.preparePrompt(
                queryType, 
                problemText
            );
    
            console.log('Prompt preparado:', prompt);
    
            let output = await this.queryAI(
                chatPrompt,
                assistantPrompt,
                abortController
            );
    
            console.log('Respuesta recibida:', output);
            await this.processQueryResponse(queryType, output, prompt, queryId, selectedText);
            
            this.sendMessage({ type: 'hideLoader' });
            
        } catch (error) {
            console.error('Error en sendApiRequestWithCode:', error);
            this.sendMessage({
                type: 'error',
                message: 'Error: ' + error.message
            });
            this.sendMessage({ type: 'hideLoader' });
        }
    }
    async sendApiRequestWithHint(problemText) {
        if (!problemText || !problemText.text) {
            console.error('Error: Texto del problema no proporcionado para askAIHint');
            return;
        }
        console.log('Generando pista para el problema:', problemText.text, 'en lenguaje:', problemText.language);
    
        const chatPrompt = [
            {
                "role": "system",
                "content": `Eres un asistente de programación que proporciona exactamente 3 pistas cortas y directas con ejemplos de código en ${problemText.language}. No hagas introducciones ni comentarios adicionales.`
            },
            {
                "role": "user",
                "content": `Genera exactamente 3 pistas con ejemplos de código en ${problemText.language} para resolver este problema. Cada pista debe empezar con "PISTA X:" donde X es el número. No agregues ninguna introducción ni conclusión:\n\n${problemText.text}`
            }
        ];
    
        try {
            const hintResponse = await this.queryAI(chatPrompt, '', new AbortController());
            
            // Procesar la respuesta para asegurar exactamente 3 pistas
            const hints = hintResponse
                .split(/PISTA \d+:/)
                .slice(1, 4)  // Tomar exactamente 3 pistas
                .map(hint => hint.trim());

                // Función para obtener el icono según el lenguaje
    const getLanguageIcon = (language) => {
        const icons = {
            'python': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256">
                <path d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40v72a8,8,0,0,0,16,0V40h88V88a8,8,0,0,0,8,8h48V216H168a8,8,0,0,0,0,16h32a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM64,144H48a8,8,0,0,0-8,8v56a8,8,0,0,0,16,0v-8h8a28,28,0,0,0,0-56Zm0,40H56V160h8a12,12,0,0,1,0,24Zm90.78-27.76-18.78,30V208a8,8,0,0,1-16,0V186.29l-18.78-30a8,8,0,1,1,13.56-8.48L128,168.91l13.22-21.15a8,8,0,1,1,13.56,8.48Z"/>
            </svg>`,
            'cpp': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256">
                <path d="M48,180c0,11,7.18,20,16,20a14.18,14.18,0,0,0,10.22-4.66A8,8,0,0,1,85.78,206.4,30.06,30.06,0,0,1,64,216c-17.65,0-32-16.15-32-36s14.35-36,32-36a30.06,30.06,0,0,1,21.78,9.6,8,8,0,0,1-11.56,11.06A14.24,14.24,0,0,0,64,160C55.18,160,48,169,48,180Zm-8-68V40A16,16,0,0,1,56,24h96a8,8,0,0,1,5.66,2.34l56,56A8,8,0,0,1,216,88v24a8,8,0,0,1-16,0V96H152a8,8,0,0,1-8-8V40H56v72a8,8,0,0,1-16,0ZM160,80h28.69L160,51.31Zm-12,92H136V160a8,8,0,0,0-16,0v12H108a8,8,0,0,0,0,16h12v12a8,8,0,0,0,16,0V188h12a8,8,0,0,0,0-16Zm68,0H204V160a8,8,0,0,0-16,0v12H176a8,8,0,0,0,0,16h12v12a8,8,0,0,0,16,0V188h12a8,8,0,0,0,0-16Z"/>
            </svg>`,
            'c': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 15 15">
                <path d="M10 5.5L9.93198 5.43198C9.33524 4.83524 8.52589 4.5 7.68198 4.5H7.5C5.84315 4.5 4.5 5.84315 4.5 7.5C4.5 9.15685 5.84315 10.5 7.5 10.5H7.68198C8.52589 10.5 9.33524 10.1648 9.93198 9.56802L10 9.5M1.5 10.5V4.5L7.5 1L13.5 4.5V10.5L7.5 14L1.5 10.5Z" stroke="currentColor"/>
            </svg>`,
            'java': `<svg fill="currentColor" width="24" height="24" viewBox="-3 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="m5.701 18.561s-.918.534.653.714c.575.085 1.239.134 1.913.134 1.084 0 2.138-.125 3.149-.363l-.093.018c.374.228.809.445 1.262.624l.059.02c-4.698 2.014-10.633-.117-6.942-1.148z"/>
            </svg>`
        };
        return icons[language.toLowerCase()] || icons['python'];
    };
    
    const formattedHintResponse = `
    <div class="hint-content">
        <div class="hint-header-container">
            <div class="language-icon">
                ${problemText.language === 'python' ? `<svg width="24" height="24" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 2.5H7M4.5 4V1.5C4.5 0.947715 4.94772 0.5 5.5 0.5H9.5C10.0523 0.5 10.5 0.947715 10.5 1.5V6.5C10.5 7.05228 10.0523 7.5 9.5 7.5H5.5C4.94772 7.5 4.5 7.94772 4.5 8.5V13.5C4.5 14.0523 4.94772 14.5 5.5 14.5H9.5C10.0523 14.5 10.5 14.0523 10.5 13.5V11M8 4.5H1.5C0.947715 4.5 0.5 4.94772 0.5 5.5V10.5C0.5 11.0523 0.947715 11.5 1.5 11.5H4.5M7 10.5H13.5C14.0523 10.5 14.5 10.0523 14.5 9.5V4.5C14.5 3.94772 14.0523 3.5 13.5 3.5H10.5M8 12.5H9" stroke="currentColor"/>
                </svg>` : problemText.language === 'cpp' ? `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M48,180c0,11,7.18,20,16,20a14.18,14.18,0,0,0,10.22-4.66A8,8,0,0,1,85.78,206.4,30.06,30.06,0,0,1,64,216c-17.65,0-32-16.15-32-36s14.35-36,32-36a30.06,30.06,0,0,1,21.78,9.6,8,8,0,0,1-11.56,11.06A14.24,14.24,0,0,0,64,160C55.18,160,48,169,48,180Zm-8-68V40A16,16,0,0,1,56,24h96a8,8,0,0,1,5.66,2.34l56,56A8,8,0,0,1,216,88v24a8,8,0,0,1-16,0V96H152a8,8,0,0,1-8-8V40H56v72a8,8,0,0,1-16,0ZM160,80h28.69L160,51.31Zm-12,92H136V160a8,8,0,0,0-16,0v12H108a8,8,0,0,0,0,16h12v12a8,8,0,0,0,16,0V188h12a8,8,0,0,0,0-16Zm68,0H204V160a8,8,0,0,0-16,0v12H176a8,8,0,0,0,0,16h12v12a8,8,0,0,0,16,0V188h12a8,8,0,0,0,0-16Z"/>
                </svg>` : problemText.language === 'c' ? `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 15 15">
                    <path d="M10 5.5L9.93198 5.43198C9.33524 4.83524 8.52589 4.5 7.68198 4.5H7.5C5.84315 4.5 4.5 5.84315 4.5 7.5C4.5 9.15685 5.84315 10.5 7.5 10.5H7.68198C8.52589 10.5 9.33524 10.1648 9.93198 9.56802L10 9.5M1.5 10.5V4.5L7.5 1L13.5 4.5V10.5L7.5 14L1.5 10.5Z" stroke="currentColor"/>
                </svg>` : `<svg version="1.1" width="24" height="24" viewBox="0 0 490 490" style="enable-background:new 0 0 490 490;" fill="currentColor">
                    <g>
                        <path d="M117.077,372.699c9.825,0,16.344-1.585,19.544-4.74c3.2-3.17,4.8-9.6,4.8-19.275v-52.009h-14.296v50.244
                            c0,5.742-0.598,9.436-1.795,11.066c-1.196,1.645-3.888,2.467-8.09,2.467c-7.028,0-10.662-2.288-10.871-6.849
                            c-0.12-1.884-0.165-3.484-0.165-4.815c0-1.391-0.12-3.484-0.344-6.295H92.224l-0.165,5.578c0,10.318,1.555,17.002,4.666,20.053
                            C99.835,371.174,106.624,372.699,117.077,372.699z"/>
                        <path d="M167.77,357.581h32.524l4.8,14.46h14.864l-25.466-75.366h-21.473l-25.077,75.366h15.133L167.77,357.581z M183.949,307.77
                            l13.025,39.253h-25.84L183.949,307.77z"/>
                        <path d="M265.566,372.041l24.3-75.366h-15.133l-13.967,42.737c-1.256,3.828-2.766,8.942-4.531,15.342l-1.436,5.144h-0.389
                            c-2.617-9.615-4.591-16.464-5.907-20.546l-14.146-42.678h-14.849l24.075,75.366H265.566z"/>
                        <path d="M304.491,372.041l4.695-14.46h32.524l4.815,14.46h14.849l-25.451-75.366h-21.488l-25.062,75.366H304.491z M325.366,307.77
                            l13.04,39.253h-25.84L325.366,307.77z"/>
                        <path d="M77.788,0v265.111H42.189v139.615h0.001l35.59,35.591L77.788,490h370.023V102.422L345.388,0H77.788z M395.793,389.413
                            H57.501v-108.99h338.292V389.413z M353.022,36.962l57.816,57.804h-57.816V36.962z"/>
                    </g>
                </svg>`}
            </div>
            <div class="hint-header">Pistas para empezar</div>
        </div>
        ${hints.map((hint, index) => {
            const formattedHint = hint.replace(
                /```(\w+)?\s*([\s\S]*?)```/g,
                (_, lang, code) => `<pre><code class="language-${problemText.language}">${code.trim()}</code></pre>`
            );
            return `
                <div class="hint-item">
                    <div class="hint-title">PISTA ${index + 1}:</div>
                    <div class="hint-content-text">
                        ${formattedHint}
                    </div>
                </div>`;
        }).join('')}
    </div>`;
    
            this.sendMessage({
                type: 'hintResponse',
                value: hintResponse,
                valueHtml: formattedHintResponse
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
        const text = typeof problemText === 'string' ? problemText : problemText.text;
        const language = problemText.language;
        
        if (!problemText) {
            console.error('Error: Texto del problema no proporcionado para askAISolution');
            return;
        }
        
        console.log('Generando explicación de la solución para:', problemText);
    
        const chatPrompt = [
            {
                "role": "system",
                "content": `Eres un asistente experto que proporciona soluciones de programación divididas en 3 partes. Usa exactamente el formato:
                PARTE1:
                TÍTULO: [título descriptivo]
                CONTENIDO: [explicación con código en ${language}]
                
                PARTE2:
                TÍTULO: [título descriptivo]
                CONTENIDO: [explicación con código en ${language}]
                
                PARTE3: 
                TÍTULO: [título descriptivo]
                CONTENIDO: [explicación con código en ${language}]`
            },
            {
                "role": "user",
                "content": `Explica la solución del siguiente problema:\n\n${text}`
            }
        ];
    
        try {
            const solutionResponse = await this.queryAI(chatPrompt, '', new AbortController());
            console.log('Solución generada:', solutionResponse);
    
            // Procesar las partes

            const parts = [];
            const partRegex = /PARTE(\d+):\s*TÍTULO:\s*(.*?)\s*CONTENIDO:\s*([\s\S]*?)(?=PARTE\d+:|$)/g;
            let match;
            
            while ((match = partRegex.exec(solutionResponse)) !== null) {
                parts.push({
                    number: match[1],
                    title: match[2].trim(),
                    content: match[3].trim()
                });
            }
    
            const sliderId = `solution-slider-${Date.now()}`;
            const valueHtml = `
                <div class="concepts-container solution-container" id="${sliderId}">
                    <div class="concepts-slider" style="transform: translateX(0%)">
                        ${parts.map((part, index) => `
                            <div class="concept-card solution-card ${index === 0 ? 'active' : ''}" data-index="${index}">
                                <h3 class="concept-title">${part.title}</h3>
                                <div class="concept-content solution-content">${Marked.parse(part.content)}</div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="concepts-navigation">
                        <button class="concept-nav-button prev" onclick="prevConcept('${sliderId}')">←</button>
                        <button class="concept-nav-button next" onclick="nextConcept('${sliderId}')">→</button>
                    </div>
                    <div class="concepts-indicators">
                        ${parts.map((_, index) => `
                            <button class="concept-indicator ${index === 0 ? 'active' : ''}"
                                    data-index="${index}"
                                    onclick="goToSlide('${sliderId}', ${index})"></button>
                        `).join('')}
                    </div>
                </div>`;
    
            this.sendMessage({
                type: 'addDetail',
                value: solutionResponse,
                detailType: 'solution',
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
        const text = typeof problemText === 'string' ? problemText : problemText.text;
        const language = problemText.language;
        
        if (!problemText) {
            console.error('Error: Texto del problema no proporcionado para askAIFollowUp');
            return;
        }
        
        console.log('Generando preguntas de seguimiento para:', problemText);
    
        const chatPrompt = [
            {
                "role": "system",
                "content": `Eres un asistente experto que genera 3 preguntas de seguimiento educativas. Usa exactamente el formato:
                PREGUNTA1:
                TÍTULO: [pregunta corta]
                RESPUESTA: [respuesta detallada con código en ${language}]
                
                PREGUNTA2:
                TÍTULO: [pregunta corta]
                RESPUESTA: [respuesta detallada con código en ${language}]
                
                PREGUNTA3:
                TÍTULO: [pregunta corta]
                RESPUESTA: [respuesta detallada con código en ${language}]`
            },
            {
                "role": "user",
                "content": `Genera preguntas de seguimiento para este problema:\n\n${text}`
            }
        ];
    
        try {
            const followUpResponse = await this.queryAI(chatPrompt, '', new AbortController());
            
            // Procesar las preguntas
            const questions = [];
            const questionRegex = /PREGUNTA(\d+):\s*TÍTULO:\s*(.*?)\s*RESPUESTA:\s*([\s\S]*?)(?=PREGUNTA\d+:|$)/g;
            let match;
            
            while ((match = questionRegex.exec(followUpResponse)) !== null) {
                questions.push({
                    number: match[1],
                    title: match[2].trim(),
                    answer: match[3].trim()
                });
            }
    
            const sliderId = `followup-slider-${Date.now()}`;
            const valueHtml = `
            <div class="concepts-container followup-container" id="${sliderId}">
                <div class="concepts-slider">
                    ${questions.map((question, index) => `
                        <div class="concept-card followup-card ${index === 0 ? 'active' : ''}" data-index="${index}">
                            <h3 class="concept-title followup-title">Pregunta ${question.number}</h3>
                            <div class="followup-question">${question.title}</div>
                            <div class="answer-section">
                                <button 
                                    class="expand-button" 
                                    onclick="toggleAnswer(this, 'answer-${sliderId}-${index}')"
                                >
                                    <span class="icon-text">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256">
                                            <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm48-88a8,8,0,0,1-8,8H136v32a8,8,0,0,1-16,0V136H88a8,8,0,0,1,0-16h32V88a8,8,0,0,1,16,0v32h32A8,8,0,0,1,176,128Z"></path>
                                        </svg>
                                        Ver respuesta
                                    </span>
                                </button>
                                <div id="answer-${sliderId}-${index}" class="followup-answer">
                                    ${Marked.parse(question.answer)}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="concepts-navigation">
                    <button class="concept-nav-button prev" onclick="prevConcept('${sliderId}')">←</button>
                    <button class="concept-nav-button next" onclick="nextConcept('${sliderId}')">→</button>
                </div>
                <div class="concepts-indicators">
                    ${questions.map((_, index) => `
                        <button class="concept-indicator ${index === 0 ? 'active' : ''}"
                                data-index="${index}"
                                onclick="goToSlide('${sliderId}', ${index})"></button>
                    `).join('')}
                </div>
            </div>`;
    
            this.sendMessage({
                type: 'addDetail',
                value: followUpResponse,
                detailType: 'followup',
                valueHtml: valueHtml
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
        const text = typeof problemText === 'string' ? problemText : problemText.text;
        const language = problemText.language;
        let chatPrompt = [{
            "role": "system",
            "content": "Soy un asistente experto para estudiantes universitarios"
        }];
        let prompt = '';
        let assistantPrompt = '';
    
        if (queryType === 'askAIUsage') {
            prompt = `Genera únicamente y sin explicaciones adicionales:
            
            1. Un pseudocódigo específico para ${language} que resuelva el problema.
            2. Un diagrama de flujo usando notación UML que represente la solución.
            
            Usa exactamente este formato:
            
            Pseudocódigo:
            [pseudocódigo en ${language}]
        
            Diagrama de flujo:
            @startuml
            start
            [diagrama de flujo]
            stop
            @enduml
        
            El problema a resolver es:
            ${text}`;
            
            assistantPrompt = "Aquí tienes el pseudocódigo y diagrama de flujo:";
        } else if (queryType === 'askAINextStep') {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                throw new Error('No hay editor activo. Por favor, abre un archivo de código.');
            }
        
            const selectedText = editor.document.getText(editor.selection);
            if (!selectedText) {
                throw new Error('Por favor, selecciona el código del que quieres saber el siguiente paso.');
            }
        
            prompt = `Analiza el siguiente código en ${language} y proporciona solo el siguiente paso en el problema sin revelar la solución. Incluye el fragmento de código seleccionado y la sugerencia sin ningún otro comentario.\n\nCódigo actual:\n${selectedText}`;
            assistantPrompt = "Aquí tienes las sugerencias para el siguiente paso:".trim();
        } else if (queryType === 'askAIConcept') {
            prompt = `Analiza el siguiente problema y proporciona exactamente 3 definiciones de los conceptos clave de programación presentes.
            Si es un concepto específico del lenguaje ${language}, incluye ejemplos en ese lenguaje.
            
            Usa EXACTAMENTE este formato para cada concepto, incluyendo los marcadores CONCEPTO: y EXPLICACIÓN::
        
            CONCEPTO: [nombre del concepto]
            EXPLICACIÓN: [explicación detallada adaptada al lenguaje ${language}]
        
            Asegúrate de dejar una línea en blanco entre cada concepto.
        
            Problema:
            ${problemText.text}`;
                
            assistantPrompt = "Aquí tienes los conceptos clave:";
        } else if (queryType === 'askAIUsage') {
            prompt = `Genera ejemplos en pseudocódigo acompañados de diagramas de flujo que ilustren la solución del problema del enunciado:\n\n${problemText}\n\nEl lenguaje viene marcado en el problema. No incluyas explicación del algoritmo, limítate a los ejemplos anteriores. Titula cada ejemplo con Pseudocódigo y Diagrama de flujo`;
        }   else if (queryType === 'askAIHint') {
                prompt = `Proporciona al usuario una lista enumerada de 3 pasos iniciales para abordar el problema de programación, orientándolo sobre cómo comenzar la solución. En el lenguaje ${problemText.language}. Cada pista tiene que llevar una ayuda de código. Limitarse a poner los pasos, no dar más explicaciones al final. Decir explicitamente en qué lenguaje le estás pasando las pistas. Tiene que ser ${language}\n\n${problemText.text}`;
                assistantPrompt = "Aquí tienes una pista útil:".trim();
        } else if (queryType === 'askAISolution') {
            prompt = `Analiza el siguiente problema y proporciona una solución detallada en ${language}. 
            La solución debe estar dividida en exactamente 3 partes usando este formato:
        
            PARTE1:
            TÍTULO: [título descriptivo de esta parte]
            CONTENIDO: [explicación detallada con código en ${language} si es necesario]
        
            PARTE2:
            TÍTULO: [título descriptivo de esta parte]
            CONTENIDO: [explicación detallada con código en ${language} si es necesario]
        
            PARTE3:
            TÍTULO: [título descriptivo de esta parte]
            CONTENIDO: [explicación detallada con código en ${language} si es necesario]
        
            Problema a resolver:
            ${text}`;
        
            assistantPrompt = "Aquí tienes la solución detallada:";
        
        } else if (queryType === 'askAIFollowUp') {
            prompt = `Genera exactamente 3 preguntas de seguimiento educativas sobre conceptos avanzados o casos especiales relacionados con este problema. 
            Usa exactamente este formato:
        
            PREGUNTA1:
            TÍTULO: [pregunta corta y directa]
            RESPUESTA: [respuesta detallada con ejemplos de código en ${language} si es necesario]
        
            PREGUNTA2:
            TÍTULO: [pregunta corta y directa]
            RESPUESTA: [respuesta detallada con ejemplos de código en ${language} si es necesario]
        
            PREGUNTA3:
            TÍTULO: [pregunta corta y directa]
            RESPUESTA: [respuesta detallada con ejemplos de código en ${language} si es necesario]
        
            El problema base es:
            ${text}`;
        
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
            const concepts = [];
            const conceptPairs = output.split(/CONCEPTO:/g).filter(Boolean);
            
            for (const pair of conceptPairs) {
                const explanationMatch = pair.match(/\s*(.*?)\s*EXPLICACIÓN:\s*([\s\S]*?)(?=(?:\s*CONCEPTO:|$))/i);
                
                if (explanationMatch) {
                    concepts.push({
                        title: explanationMatch[1].trim(),
                        content: explanationMatch[2].trim()
                    });
                }
            }
            
            const sliderId = `concept-slider-${Date.now()}`;
valueHtml = `
    <div class="concepts-container" id="${sliderId}">
        <div class="concepts-slider">
            ${concepts.map((concept, index) => {
                const formattedContent = concept.content.replace(
                    /```(\w+)?\s*([\s\S]*?)```/g,
                    (_, lang, code) => `<pre><code class="language-${this.currentLanguage}">${code.trim()}</code></pre>`
                );
                return `
                    <div class="concept-card ${index === 0 ? 'active' : ''}" data-index="${index}">
                        <h3 class="concept-title">${concept.title}</h3>
                        <div class="concept-content">${formattedContent}</div>
                    </div>
                `;
            }).join('')}
        </div>
        <div class="concepts-navigation">
            <button class="concept-nav-button prev" onclick="prevConcept('${sliderId}')">←</button>
            <button class="concept-nav-button next" onclick="nextConcept('${sliderId}')">→</button>
        </div>
        <div class="concepts-indicators">
            ${concepts.map((_, index) => `
                <button class="concept-indicator ${index === 0 ? 'active' : ''}"
                        data-index="${index}"
                        onclick="goToSlide('${sliderId}', ${index})"></button>
            `).join('')}
        </div>
    </div>`;
        } else if (queryType === "askAIUsage") {
            const pseudoMatch = output.match(/Pseudocódigo:([\s\S]*?)(?=Diagrama de flujo:|$)/i);
            const diagramMatch = output.match(/Diagrama de flujo:([\s\S]*?)(?=@startuml|$)/i);
            const umlMatch = output.match(/@startuml([\s\S]*?)@enduml/i);
            
            const pseudocode = pseudoMatch ? pseudoMatch[1].trim() : '';
            const umlDiagram = umlMatch ? umlMatch[1].trim() : '';
            
            const sliderId = `usage-slider-${Date.now()}`;
    valueHtml = `
        <div class="concepts-container" id="${sliderId}">
            <div class="concepts-slider">
                <div class="concept-card solution-card active" data-index="0">
                    <h3 class="concept-title">Pseudocódigo</h3>
                    <div class="solution-content">
                        <pre><code class="language-${this.currentLanguage}">${pseudocode}</code></pre>
                    </div>
                </div>
                <div class="concept-card solution-card" data-index="1">
                    <h3 class="concept-title">Diagrama de Flujo</h3>
                    <div class="solution-content">
                        <pre class="uml-diagram">${umlDiagram}</pre>
                    </div>
                </div>
            </div>
            <div class="concepts-navigation">
                <button class="concept-nav-button prev" onclick="prevConcept('${sliderId}')">←</button>
                <button class="concept-nav-button next" onclick="nextConcept('${sliderId}')">→</button>
            </div>
            <div class="concepts-indicators">
                <button class="concept-indicator active" data-index="0" onclick="goToSlide('${sliderId}', 0)"></button>
                <button class="concept-indicator" data-index="1" onclick="goToSlide('${sliderId}', 1)"></button>
            </div>
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
                if (data.type === 'languageChanged') {
                    this.updateLanguage(data.language);
                    return;
                }

                if (data.type === 'askAIConcept') {
                    console.log('Procesando solicitud de concepto para lenguaje:', data.problemText.language);
                    this.sendMessage({ type: 'showLoader' });
                    await this.sendApiRequestWithCode(data.problemText.text, data.type, new AbortController(), '', null, '', data.problemText.language);
                } else if (data.type === 'askAIHint') {
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
            } finally {
                this.sendMessage({ type: 'hideLoader' });
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
            <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
            <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
            <title>Buddy</title>
            <script>
    const sliderStates = new Map();

    function toggleAnswer(button, answerId) {
        const answerDiv = document.getElementById(answerId);
        if (answerDiv) {
            answerDiv.classList.toggle('visible');
            button.classList.toggle('expanded');
            const icon = button.querySelector('svg');
            if (icon) {
                icon.style.transform = button.classList.contains('expanded') ? 'rotate(45deg)' : 'rotate(0deg)';
            }
        }
    }

    function showSlide(sliderId, index) {
        const container = document.getElementById(sliderId);
        if (!container) return;

        const cards = container.querySelectorAll('.concept-card');
        const indicators = container.querySelectorAll('.concept-indicator');

        cards.forEach(card => {
            card.classList.remove('active');
            card.style.display = 'none';
        });
    indicators.forEach(indicator => indicator.classList.remove('active'));

        if (cards[index]) {
            cards[index].classList.add('active');
            cards[index].style.display = 'flex';
        }
        
        if (indicators[index]) {
            indicators[index].classList.add('active');
        }
    }

function goToSlide(sliderId, index) {
        showSlide(sliderId, index);
    }

    function nextConcept(sliderId) {
        const container = document.getElementById(sliderId);
        if (!container) return;

        const cards = container.querySelectorAll('.concept-card');
        const currentCard = container.querySelector('.concept-card.active');
        let currentIndex = Array.from(cards).indexOf(currentCard);
        
        const nextIndex = (currentIndex + 1) % cards.length;
        showSlide(sliderId, nextIndex);
    }

    function prevConcept(sliderId) {
        const container = document.getElementById(sliderId);
        if (!container) return;

        const cards = container.querySelectorAll('.concept-card');
        const currentCard = container.querySelector('.concept-card.active');
        let currentIndex = Array.from(cards).indexOf(currentCard);
        
        const prevIndex = (currentIndex - 1 + cards.length) % cards.length;
        showSlide(sliderId, prevIndex);
    }
</script>
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

                    <div id="loader-container" class="hidden">
                        <svg class="loader-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
    <circle fill="var(--buddy-primary)" stroke="var(--buddy-primary)" stroke-width="15" r="15" cx="40" cy="100">
        <animate attributeName="opacity" calcMode="spline" dur="2" values="1;0;1;" keySplines=".5 0 .5 1;.5 0 .5 1" repeatCount="indefinite" begin="-.4"></animate>
    </circle>
    <circle fill="var(--buddy-primary)" stroke="var(--buddy-primary)" stroke-width="15" r="15" cx="100" cy="100">
        <animate attributeName="opacity" calcMode="spline" dur="2" values="1;0;1;" keySplines=".5 0 .5 1;.5 0 .5 1" repeatCount="indefinite" begin="-.2"></animate>
    </circle>
    <circle fill="var(--buddy-primary)" stroke="var(--buddy-primary)" stroke-width="15" r="15" cx="160" cy="100">
        <animate attributeName="opacity" calcMode="spline" dur="2" values="1;0;1;" keySplines=".5 0 .5 1;.5 0 .5 1" repeatCount="indefinite" begin="0"></animate>
    </circle>
</svg>
                    </div>
                    
                    <div id="qa-list" class="flex-1 overflow-y-auto p-4">
                        <!-- Lista de preguntas y respuestas -->
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
            const selectedLanguage = e.currentTarget.dataset.language;
            currentLanguage = selectedLanguage;
            languageButton.querySelector('span').textContent = e.currentTarget.textContent.trim();
            closeLanguageDropdown();
            
            // Notificar al backend del cambio de lenguaje
            vscode.postMessage({
                type: 'languageChanged',
                language: selectedLanguage
            });
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
        questionOptions.classList.add('hidden');
        const arrow = askButton?.querySelector('.dropdown-arrow');
        if (arrow) {
            arrow.style.transform = 'rotate(0deg)';
        }
    }
}

// Toggle del dropdown de ayuda
askButton?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = questionOptions.classList.contains('hidden');
    if (isHidden) {
        questionOptions.classList.remove('hidden');
        askButton.querySelector('.dropdown-arrow').style.transform = 'rotate(180deg)';
    } else {
        closeDropdown();
    }
});

// Eventos de cierre al hacer click fuera
document.addEventListener('click', (e) => {
    // Cerrar dropdown de lenguaje
    if (!languageOptions?.contains(e.target) && !languageButton?.contains(e.target)) {
        closeLanguageDropdown();
    }
    
    // Cerrar dropdown de preguntas
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
        // Guardar el texto del problema y el lenguaje actual
    const messageData = {
        type: 'askAIConcept',
        problemText: {
            text: problemText,
            language: currentLanguage
        }
    };
    
    console.log('Enviando solicitud de conceptos:', messageData); // Para debugging
    
    document.getElementById('loader-container').classList.remove('hidden');
    vscode.postMessage(messageData);
    closeDropdown();
});

    document.getElementById('usage-button')?.addEventListener('click', () => {
    const problemText = getProblemText();
    if (!problemText) {
        vscode.postMessage({ 
            type: 'error',
            message: 'Por favor, escribe un problema antes de solicitar el pseudocódigo y diagrama.'
        });
        return;
    }
    document.getElementById('loader-container').classList.remove('hidden');
    vscode.postMessage({ 
        type: 'askAIUsage',
        problemText: {
            text: problemText,
            language: currentLanguage
        }
    });
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
        document.getElementById('loader-container').classList.remove('hidden');
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
    document.getElementById('loader-container').classList.remove('hidden');
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
// Event listeners
// Botón de solución
document.getElementById('solution-button')?.addEventListener('click', () => {
    const problemText = getProblemText();
    if (!problemText) {
        vscode.postMessage({ 
            type: 'error',
            message: 'Por favor, escribe un problema antes de solicitar la solución.'
        });
        return;
    }
        document.getElementById('loader-container').classList.remove('hidden');
    vscode.postMessage({ 
        type: 'askAISolution',
        problemText: {
            text: problemText,
            language: currentLanguage
        }
    });
    document.getElementById('in-progress')?.classList.remove('hidden');
    closeDropdown();
});

// Botón de follow-up
document.getElementById('follow-up-button')?.addEventListener('click', () => {
    const problemText = getProblemText();
    if (!problemText) {
        vscode.postMessage({ 
            type: 'error',
            message: 'Por favor, escribe un problema antes de solicitar preguntas de seguimiento.'
        });
        return;
    }
        document.getElementById('loader-container').classList.remove('hidden');
    vscode.postMessage({ 
        type: 'askAIFollowUp',
        problemText: {
            text: problemText,
            language: currentLanguage
        }
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
    
    switch (message.type) {
        case 'showLoader':
            document.getElementById('loader-container')?.classList.remove('hidden');
            break;
            
        case 'hideLoader':
            document.getElementById('loader-container')?.classList.add('hidden');
            break;
            
        case 'error':
            document.getElementById('loader-container')?.classList.add('hidden');
            alert(message.message);
            break;

        case 'updateProblem':
            document.getElementById('problem-text').value = message.text;
            break;

        case 'showProgress':
            document.getElementById('in-progress')?.classList.remove('hidden');
            break;

        case 'hideProgress':
            document.getElementById('in-progress')?.classList.add('hidden');
            break;

        case 'hintResponse':
            const hintDiv = document.createElement('div');
            hintDiv.className = 'buddy-response-card';
            hintDiv.innerHTML = message.valueHtml;
            qaList.insertBefore(hintDiv, qaList.firstChild);
            qaList.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
            break;

        case 'addDetail':
        case 'addOverview':
        case 'solutionResponse':
        case 'followUpResponse':
            if (qaList) {
                // Procesar respuesta específica para conceptos
                if (message.detailType === 'concept') {
                    console.log('Recibiendo respuesta de conceptos:', message);
                    
                    if (!message.valueHtml) {
                        console.error('No hay contenido HTML en la respuesta');
                        return;
                    }
                }

                const responseDiv = document.createElement('div');
                responseDiv.className = 'buddy-response-card';
                responseDiv.innerHTML = message.valueHtml;
                
                // Configurar botones para followUpResponse
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

                // Insertar al principio y hacer scroll
                qaList.insertBefore(responseDiv, qaList.firstChild);
                qaList.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }
            document.getElementById('in-progress')?.classList.add('hidden');
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