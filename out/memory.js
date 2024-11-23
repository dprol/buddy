"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Memory = void 0;
/**
 * Interfaz para el servicio de persistencia de VS Code Memento
 * Esta clase proporciona una capa de abstracción para manejar
 * el almacenamiento persistente de datos en la extensión Buddy
 */
class Memory {
    /**
     * @param {vscode.Memento} memento - Instancia de Memento de VS Code
     */
    constructor(memento) {
        this.memento = memento;
        this.prefix = 'buddy_'; // Prefijo para todas las claves de Buddy
    }
    /**
     * Verifica si existe una clave en el almacenamiento
     * @param {string} key - Clave a verificar
     * @returns {boolean} true si la clave no existe
     */
    has(key) {
        const fullKey = this.getFullKey(key);
        return this.get(fullKey) !== undefined;
    }
    /**
     * Obtiene el valor asociado a una clave
     * @param {string} key - Clave a buscar
     * @returns {any} Valor almacenado o undefined si no existe
     */
    get(key) {
        const fullKey = this.getFullKey(key);
        const value = this.memento.get(fullKey);
        if (value === undefined) {
            console.debug(`Valor no encontrado para clave: ${key}`);
        }
        return value;
    }
    /**
     * Elimina una clave del almacenamiento
     * @param {string} key - Clave a eliminar
     */
    delete(key) {
        const fullKey = this.getFullKey(key);
        console.debug(`Eliminando clave: ${key}`);
        this.memento.update(fullKey, undefined);
    }
    /**
     * Almacena un valor asociado a una clave
     * @param {string} key - Clave para almacenar
     * @param {any} value - Valor a almacenar
     */
    set(key, value) {
        const fullKey = this.getFullKey(key);
        console.debug(`Almacenando valor para clave: ${key}`);
        try {
            this.memento.update(fullKey, value);
        }
        catch (error) {
            console.error(`Error al almacenar valor para clave ${key}:`, error);
            throw new Error(`Error de almacenamiento: ${error.message}`);
        }
    }
    /**
     * Obtiene todas las claves almacenadas
     * @returns {readonly string[]} Array de claves
     */
    keys() {
        return this.memento.keys().filter(key => key.startsWith(this.prefix));
    }
    /**
     * Limpia todos los datos almacenados por Buddy
     */
    clear() {
        const keys = this.keys();
        console.debug(`Limpiando ${keys.length} claves de almacenamiento`);
        keys.forEach(key => {
            this.delete(key);
        });
    }
    /**
     * Genera la clave completa con el prefijo de Buddy
     * @private
     * @param {string} key - Clave base
     * @returns {string} Clave completa con prefijo
     */
    getFullKey(key) {
        return `${this.prefix}${key}`;
    }
    /**
     * Obtiene el tamaño actual del almacenamiento
     * @returns {number} Número de claves almacenadas
     */
    size() {
        return this.keys().length;
    }
    /**
     * Verifica si el almacenamiento está vacío
     * @returns {boolean} true si no hay claves almacenadas
     */
    isEmpty() {
        return this.size() === 0;
    }
    /**
     * Obtiene un resumen del estado del almacenamiento
     * @returns {Object} Objeto con información del almacenamiento
     */
    getStats() {
        return {
            totalKeys: this.size(),
            isEmpty: this.isEmpty(),
            keys: this.keys()
        };
    }
}
exports.Memory = Memory;
//# sourceMappingURL=memory.js.map