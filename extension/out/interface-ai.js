"use strict";

/**
 * Interfaz base para proveedores de IA
 * Define los métodos comunes que deben implementar todos los proveedores
 */
class AIProvider {
    constructor(credentials, context) {
        if (new.target === AIProvider) {
            throw new TypeError('No se puede instanciar la clase abstracta AIProvider directamente');
        }
        this.context = context;
        this.credentials = credentials;
    }

    /**
     * Inicializa la conexión con el proveedor de IA
     * @returns {Promise<void>}
     */
    async initialize() {
        throw new Error('El método initialize() debe ser implementado');
    }

    /**
     * Realiza una consulta al modelo de IA
     * @param {Array} messages - Array de mensajes del chat
     * @param {Object} options - Opciones adicionales para la consulta
     * @returns {Promise<string>} Respuesta del modelo
     */
    async query(messages, options = {}) {
        throw new Error('El método query() debe ser implementado');
    }

    /**
     * Valida las credenciales del proveedor
     * @returns {Promise<boolean>} true si las credenciales son válidas
     */
    async validateCredentials() {
        throw new Error('El método validateCredentials() debe ser implementado');
    }

    /**
     * Formatea los mensajes para el proveedor específico
     * @param {Array} messages - Mensajes a formatear
     * @returns {Array} Mensajes formateados
     */
    formatMessages(messages) {
        throw new Error('El método formatMessages() debe ser implementado');
    }

    /**
     * Procesa la respuesta del proveedor
     * @param {Object} response - Respuesta del proveedor
     * @returns {string} Texto procesado
     */
    processResponse(response) {
        throw new Error('El método processResponse() debe ser implementado');
    }

    /**
     * Maneja los errores específicos del proveedor
     * @param {Error} error - Error a manejar
     * @throws {Error} Error procesado
     */
    handleError(error) {
        throw new Error('El método handleError() debe ser implementado');
    }

    /**
     * Obtiene los límites del modelo (tokens, etc)
     * @returns {Object} Objeto con los límites
     */
    getModelLimits() {
        throw new Error('El método getModelLimits() debe ser implementado');
    }

    /**
     * Detiene una consulta en curso
     * @param {AbortController} controller - Controlador para abortar la consulta
     */
    abort(controller) {
        if (controller) {
            controller.abort();
        }
    }

    /**
     * Limpia los recursos utilizados
     */
    dispose() {
        // Implementación base que puede ser sobrescrita
        this.credentials = null;
    }
}

module.exports = {
    AIProvider
};