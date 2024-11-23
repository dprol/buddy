"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggerEntry = exports.Logger = void 0;
const util = require("util");
const vscode = require("vscode");
const JSON5 = require("json5");
/**
 * Almacenamiento ligero para datos de eventos antes de su persistencia.
 *
 * Es un singleton. Usar getLogger() para obtener la instancia.
 */
class Logger {
    /**
     * Obtiene la instancia del logger
     * @param {vscode.Uri} extensionUri - URI de la extensión
     * @returns {Logger} Instancia del logger
     */
    static getLogger(extensionUri) {
        if (Logger.theInstance === undefined) {
            Logger.theInstance = new Logger(extensionUri);
        }
        return Logger.theInstance;
    }
    constructor(extensionUri) {
        this.extensionUri = extensionUri;
        this.log = [];
        this.interval = 30000; // 30 segundos
        this.chunkPrefix = `BuddyLogChunk`;
        this.lastPersist = new Date();
        this.nextPersist = new Date(this.lastPersist.getTime() + this.interval);
        this.calcPersist();
    }
    /**
     * Calcula el próximo tiempo de persistencia
     * @private
     */
    calcPersist() {
        this.lastPersist = new Date();
        this.nextPersist = new Date(this.lastPersist.getTime() + this.interval);
    }
    /**
     * Persiste un fragmento del log
     */
    persistChunk() {
        const { workspaceFolders } = vscode.workspace;
        if (!workspaceFolders || workspaceFolders.length !== 1) {
            console.debug('No se puede persistir el log: configuración de workspace inválida');
            return;
        }
        const chunkName = `${this.chunkPrefix}-${this.lastPersist.toISOString()}`;
        const chunkUri = vscode.Uri.joinPath(workspaceFolders[0].uri, "telemetry", chunkName + ".json");
        this.calcPersist(); // Resetear marcas de persistencia
        if (this.log.length) {
            const logCopy = [...this.log]; // Crear copia del log
            this.log = []; // Limpiar datos persistidos
            vscode.workspace.fs.writeFile(chunkUri, Buffer.from(JSON5.stringify(logCopy, null, 2)));
        }
        else {
            console.debug("No hay datos de log para persistir");
        }
    }
    /**
     * Limpia los datos del log en memoria
     */
    clear() {
        this.log = [];
        console.debug(`Log en memoria limpiado (los chunks persistidos permanecen)`);
    }
    /**
     * Fuerza la persistencia del log actual
     */
    flush() {
        this.persistChunk();
    }
    /**
     * Agrega una entrada al log
     * @param {LoggerEntry} logEntry - Entrada a agregar
     */
    push(logEntry) {
        this.log.push(logEntry);
        // Verificar si es tiempo de persistir
        if (new Date() > this.nextPersist) {
            this.persistChunk();
        }
    }
    /**
     * Obtiene el contenido actual del log
     * @returns {LoggerEntry[]} Entradas actuales del log
     */
    getCurrentLog() {
        return [...this.log];
    }
}
/**
 * Entrada individual en el log
 */
class LoggerEntry {
    /**
     * @param {string} src - Origen del log
     * @param {string} msg - Mensaje del log
     * @param {any[]} prm - Parámetros adicionales
     */
    constructor(src, msg, prm) {
        this.src = src;
        this.msg = msg;
        this.prm = prm;
        this.time = new Date().toISOString();
    }
    /**
     * Convierte la entrada a string
     * @returns {string} Representación en string de la entrada
     */
    toString() {
        const logStart = `${this.time}:${this.src}`;
        if (!this.msg) {
            return logStart;
        }
        if (!this.prm) {
            return `${logStart}: ${this.msg}`;
        }
        return `${logStart}: ${util.format(this.msg, ...this.prm)}`;
    }
    /**
     * Convierte la entrada a JSON
     * @returns {Object} Representación en JSON de la entrada
     */
    toJSON() {
        return {
            time: this.time,
            source: this.src,
            message: this.msg,
            params: this.prm
        };
    }
}
exports.Logger = Logger;
exports.LoggerEntry = LoggerEntry;
//# sourceMappingURL=logger.js.map