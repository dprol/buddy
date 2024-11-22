"use strict";

const { AIProvider } = require('./interface-ai');
const { Anthropic } = require('@anthropic-ai/sdk');
const vscode = require('vscode');

/**
 * Implementación del proveedor de Anthropic
 * @extends AIProvider
 */
class AnthropicProvider extends AIProvider {
    /**
     * @param {Object} credentials - Credenciales de Anthropic
     * @param {vscode.ExtensionContext} context - Contexto de la extensión
     */
    constructor(credentials, context) {
        super(credentials, context);
        this.anthropic = null;
        this.model = 'claude-3-5-sonnet-20241022';
    }

    /**
     * Inicializa la conexión con Anthropic
     */
    async initialize() {
        try {
            this.anthropic = new Anthropic({
                apiKey: this.credentials.apiKey
            });
            await this.validateCredentials();
        } catch (error) {
            throw new Error(`Error al inicializar Anthropic: ${error.message}`);
        }
    }

    /**
     * Realiza una consulta al modelo de Anthropic
     * @param {Array} messages - Mensajes del chat
     * @param {Object} options - Opciones de la consulta
     * @returns {Promise<string>} Respuesta del modelo
     */
    async query(messages, options = {}) {
        try {
            if (!this.anthropic) {
                await this.initialize();
            }

            const payload = this.createPayload(messages, options);
            const { isValid, reason } = this.validatePayload(payload);
            
            if (!isValid) {
                throw new Error(reason);
            }

            const response = await this.anthropic.messages.create({
                ...payload,
                timeout: options.timeout || 60000,
                signal: options.abortSignal
            });

            return this.processResponse(response);

        } catch (error) {
            this.handleError(error);
            return "";
        }
    }

    /**
     * Valida las credenciales realizando una consulta de prueba
     */
    async validateCredentials() {
        try {
            await this.anthropic.messages.create({
                model: this.model,
                max_tokens: 5,
                messages: [{ role: 'user', content: 'test' }]
            });
            return true;
        } catch (error) {
            throw new Error(`Credenciales inválidas: ${error.message}`);
        }
    }

    /**
     * Formatea los mensajes para Anthropic
     * @param {Array} messages - Mensajes a formatear
     * @returns {Array} Mensajes formateados
     */
    formatMessages(messages) {
        return messages.map(msg => ({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content
        }));
    }

    /**
     * Procesa la respuesta de Anthropic
     * @param {Object} response - Respuesta de Anthropic
     * @returns {string} Texto de la respuesta
     */
    processResponse(response) {
        if (!response.content || response.content.length === 0) {
            throw new Error('Respuesta vacía de Anthropic');
        }

        // Claude 3 devuelve un array de content blocks
        const message = response.content[0].text;

        if (response.usage && response.usage.output_tokens >= this.getModelLimits().maxTokens) {
            vscode.window.showWarningMessage(
                `La respuesta utilizó ${response.usage.output_tokens} tokens, ` +
                `excediendo el límite recomendado de ${this.getModelLimits().maxTokens}. ` +
                `Considera dividir tu consulta en partes más pequeñas.`
            );
        }

        return message.trim();
    }

    /**
     * Maneja los errores específicos de Anthropic
     * @param {Error} error - Error a manejar
     */
    handleError(error) {
        if (error?.message === "canceled") {
            vscode.window.showInformationMessage("Consulta cancelada");
        } else if (error?.message.includes("timeout")) {
            vscode.window.showErrorMessage(
                "Tiempo de espera agotado. Por favor, intenta de nuevo."
            );
        } else if (error?.status === 401) {
            vscode.window.showErrorMessage(
                "Error de autenticación. Verifica tu clave API."
            );
        } else if (error?.status === 429) {
            vscode.window.showErrorMessage(
                "Has excedido el límite de solicitudes. Espera un momento y vuelve a intentar."
            );
        } else {
            vscode.window.showErrorMessage(
                `Error al comunicarse con Anthropic: ${error.message}`
            );
        }
        throw error;
    }

    /**
     * Obtiene los límites del modelo actual
     * @returns {Object} Límites del modelo
     */
    getModelLimits() {
        const limits = {
            'claude-3-5-sonnet-20241022': {
                maxTokens: 4096,
                maxContextTokens: 15000
            }
        };

        return limits[this.model];
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
            stream: false,
            system: options.system || "Eres un asistente experto para desarrolladores.",
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
        this.anthropic = null;
    }
}

module.exports = AnthropicProvider;