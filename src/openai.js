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
const { AIProvider } = require('./interface-ai');
const { Configuration, OpenAIApi } = require('openai');
const vscode = require('vscode');
/**
 * Implementación del proveedor de OpenAI
 * @extends AIProvider
 */
class OpenAIProvider extends AIProvider {
    /**
     * @param {Object} credentials - Credenciales de OpenAI
     * @param {vscode.ExtensionContext} context - Contexto de la extensión
     */
    constructor(credentials, context) {
        super(credentials, context);
        this.openai = null;
        this.model = this.context.globalState.get('openaiModel', 'gpt-4o');
    }
    /**
     * Inicializa la conexión con OpenAI
     */
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const config = new Configuration({
                    apiKey: this.credentials.apiKey,
                    organization: this.credentials.organization
                });
                this.openai = new OpenAIApi(config);
                yield this.validateCredentials();
            }
            catch (error) {
                throw new Error(`Error al inicializar OpenAI: ${error.message}`);
            }
        });
    }
    /**
     * Realiza una consulta al modelo de OpenAI
     * @param {Array} messages - Mensajes del chat
     * @param {Object} options - Opciones de la consulta
     * @returns {Promise<string>} Respuesta del modelo
     */
    query(messages, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!this.openai) {
                    yield this.initialize();
                }
                const payload = this.createPayload(messages, options);
                const { isValid, reason } = this.validatePayload(payload);
                if (!isValid) {
                    throw new Error(reason);
                }
                const response = yield this.openai.createChatCompletion(payload, {
                    timeout: options.timeout || 60000,
                    signal: options.abortSignal
                });
                return this.processResponse(response);
            }
            catch (error) {
                this.handleError(error);
                return "";
            }
        });
    }
    /**
     * Valida las credenciales realizando una consulta de prueba
     */
    validateCredentials() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.openai.createChatCompletion({
                    model: this.model,
                    messages: [{ role: "user", content: "test" }],
                    max_tokens: 5
                });
                return true;
            }
            catch (error) {
                throw new Error(`Credenciales inválidas: ${error.message}`);
            }
        });
    }
    /**
     * Formatea los mensajes para OpenAI
     * @param {Array} messages - Mensajes a formatear
     * @returns {Array} Mensajes formateados
     */
    formatMessages(messages) {
        return messages.map(msg => ({
            role: msg.role,
            content: msg.content
        }));
    }
    /**
     * Procesa la respuesta de OpenAI
     * @param {Object} response - Respuesta de OpenAI
     * @returns {string} Texto de la respuesta
     */
    processResponse(response) {
        var _a, _b;
        const message = response.data.choices[0].message;
        if (((_a = response.data.usage) === null || _a === void 0 ? void 0 : _a.total_tokens) >= this.getModelLimits().maxTokens) {
            vscode.window.showWarningMessage(`La respuesta utilizó ${response.data.usage.total_tokens} tokens, ` +
                `excediendo el límite de ${this.getModelLimits().maxTokens}. ` +
                `Considera dividir tu consulta en partes más pequeñas.`);
        }
        return ((_b = message === null || message === void 0 ? void 0 : message.content) === null || _b === void 0 ? void 0 : _b.trim()) || "";
    }
    /**
     * Maneja los errores específicos de OpenAI
     * @param {Error} error - Error a manejar
     */
    handleError(error) {
        var _a;
        if ((error === null || error === void 0 ? void 0 : error.message) === "canceled") {
            vscode.window.showInformationMessage("Consulta cancelada");
        }
        else if (error === null || error === void 0 ? void 0 : error.message.includes("timeout")) {
            vscode.window.showErrorMessage("Tiempo de espera agotado. Por favor, intenta de nuevo.");
        }
        else if (((_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.status) === 401) {
            vscode.window.showErrorMessage("Error de autenticación. Verifica tu clave API.");
        }
        else {
            vscode.window.showErrorMessage(`Error al comunicarse con OpenAI: ${error.message}`);
        }
        throw error;
    }
    /**
     * Obtiene los límites del modelo actual
     * @returns {Object} Límites del modelo
     */
    getModelLimits() {
        const limits = {
            'gpt-4o': {
                maxTokens: 4000,
                maxContextTokens: 8000
            }
        };
        return limits[this.model] || limits['gpt-4o'];
    }
    /**
     * Crea la carga útil para la consulta
     * @private
     */
    createPayload(messages, options) {
        return {
            model: this.model,
            messages: this.formatMessages(messages),
            max_tokens: options.maxTokens || this.getModelLimits().maxTokens,
            temperature: options.temperature || 0.7,
            top_p: options.topP || 1,
            presence_penalty: options.presencePenalty || 0,
            frequency_penalty: options.frequencyPenalty || 0,
            stream: false
        };
    }
    /**
     * Valida la carga útil antes de enviarla
     * @private
     */
    validatePayload(payload) {
        let isValid = true;
        let reason = "";
        if (!payload.model) {
            reason = "Modelo no especificado";
            isValid = false;
        }
        if (!payload.temperature || payload.temperature < 0 || payload.temperature > 1) {
            reason = "La temperatura debe estar entre 0 y 1";
            isValid = false;
        }
        if (!payload.max_tokens || payload.max_tokens < 1 ||
            payload.max_tokens > this.getModelLimits().maxTokens) {
            reason = `El número de tokens debe estar entre 1 y ${this.getModelLimits().maxTokens}`;
            isValid = false;
        }
        return { isValid, reason };
    }
    /**
     * Limpia los recursos
     */
    dispose() {
        super.dispose();
        this.openai = null;
    }
}
module.exports = OpenAIProvider;
//# sourceMappingURL=openai.js.map