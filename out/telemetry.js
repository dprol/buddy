"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try {
            step(generator.next(value));
        }
        catch (e) {
            reject(e);
        } }
        function rejected(value) { try {
            step(generator["throw"](value));
        }
        catch (e) {
            reject(e);
        } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggerEntry = exports.listeners = exports.commands = exports.deinit = exports.init = void 0;
const vscode = require("vscode");
const Logger_1 = require("./logger");
Object.defineProperty(exports, "LoggerEntry", { enumerable: true, get: function () { return Logger_1.LoggerEntry; } });
// Variables de estado
let currentWindow = ""; // Nombre/URI de la ventana actual del editor
let currentTerm = ""; // Nombre de la terminal actual
let logger; // Logger de telemetría
let context; // Contexto de la extensión
let config; // Configuración
/**
 * Inicializa el módulo de telemetría
 * @param {vscode.ExtensionContext} inContext - Contexto de la extensión
 */
function init(inContext) {
    return __awaiter(this, void 0, void 0, function* () {
        console.info("Iniciando telemetría de Buddy...");
        context = inContext;
        // Configurar almacenamiento del workspace
        logger = Logger_1.Logger.getLogger(context.extensionUri);
        // Cargar configuración
        const cfg = vscode.workspace.getConfiguration("buddy");
        config = {
            active: cfg.get("telemetry.active", false),
        };
        console.info(config.active ?
            "Telemetría de Buddy activa" :
            "Telemetría de Buddy inactiva");
    });
}
exports.init = init;
/**
 * Se llama cuando la extensión se desactiva
 */
function deinit() {
    currentWindow = "";
    currentTerm = "";
    // Intentar persistir los datos antes de cerrar
    // Nota: Puede que no se ejecute al cerrar VS Code
    // Ver: https://github.com/microsoft/vscode/issues/122825#issuecomment-814218149
    logger.flush();
}
exports.deinit = deinit;
/**
 * Verifica si un archivo corresponde a un editor de código
 * @param {string} fn - Nombre del archivo
 * @returns {boolean} true si es un editor de código
 */
function isCodeEditor(fn) {
    return fn.charAt(0) === "/" || fn.charAt(0) === "\\";
}
/**
 * Comandos exportados por el módulo
 * Nota: Actualizar package.json manualmente
 */
exports.commands = {
    dumpLog: {
        name: "buddy.telemetry.DumpLog",
        fn: () => {
            logger.flush();
            vscode.window.showInformationMessage(`Datos de telemetría guardados en el sistema`);
        },
    },
    clearLog: {
        name: "buddy.telemetry.ClearLog",
        fn: () => {
            logger.clear();
            logger.push(new Logger_1.LoggerEntry("logDataCleared"));
            vscode.window.showInformationMessage("Datos de telemetría limpiados");
        },
    },
    logTelemetry: {
        name: "buddy.telemetry.log",
        fn: (le) => {
            if (le !== undefined && typeof le === "object") {
                logger.push(le);
            }
        },
    },
};
/**
 * Listeners exportados por el módulo
 */
exports.listeners = [
    // Manejadores del Workspace
    {
        event: vscode.workspace.onDidChangeConfiguration,
        fn: (e) => {
            logger.push(new Logger_1.LoggerEntry("onDidChangeConfiguration"));
        },
    },
    {
        event: vscode.workspace.onDidChangeTextDocument,
        fn: (e) => {
            for (const c of e.contentChanges) {
                logger.push(new Logger_1.LoggerEntry("onDidChangeTextDocument", "Cambio %s:%s a %s:%s en [%s] reemplazado con: %s`", [
                    c.range.start.line.toString(),
                    c.range.start.character.toString(),
                    c.range.end.line.toString(),
                    c.range.end.character.toString(),
                    e.document.fileName,
                    c.text,
                ]));
            }
        },
    },
    // Manejadores de Ventana
    {
        event: vscode.window.onDidChangeActiveTextEditor,
        fn: (editor) => {
            var _a;
            const previousWindow = currentWindow;
            currentWindow = editor !== undefined && isCodeEditor(editor.document.fileName)
                ? editor.document.fileName
                : (_a = editor === null || editor === void 0 ? void 0 : editor.document.uri.toString()) !== null && _a !== void 0 ? _a : "";
            logger.push(new Logger_1.LoggerEntry("onDidChangeActiveTextEditor", "Editor actual: [%s]; Editor anterior: [%s]", [currentWindow, previousWindow]));
        },
    },
    {
        event: vscode.window.onDidChangeTextEditorSelection,
        fn: (e) => {
            for (const s of e.selections) {
                const selectedText = e.textEditor.document.getText(s);
                logger.push(new Logger_1.LoggerEntry("onDidChangeTextEditorSelection", "Selección %s:%s a %s:%s en [%s] texto: %s", [
                    s.start.line.toString(),
                    s.start.character.toString(),
                    s.end.line.toString(),
                    s.end.character.toString(),
                    e.textEditor.document.fileName,
                    selectedText,
                ]));
            }
        },
    },
    {
        event: vscode.window.onDidChangeTextEditorVisibleRanges,
        fn: (e) => {
            for (const r of e.visibleRanges) {
                logger.push(new Logger_1.LoggerEntry("onDidChangeTextEditorVisibleRanges", "Rango visible %s:%s a %s:%s [%s]", [
                    r.start.line.toString(),
                    r.start.character.toString(),
                    r.end.line.toString(),
                    r.end.character.toString(),
                    e.textEditor.document.fileName,
                ]));
            }
        },
    },
    // Manejadores de Terminal
    {
        event: vscode.window.onDidOpenTerminal,
        fn: (term) => {
            logger.push(new Logger_1.LoggerEntry("onDidOpenTerminal", "Terminal abierta: [%s]", [term.name]));
        },
    },
    {
        event: vscode.window.onDidChangeActiveTerminal,
        fn: (term) => {
            const previousTerm = currentTerm;
            currentTerm = term === undefined ? "" : term.name;
            logger.push(new Logger_1.LoggerEntry("onDidChangeActiveTerminal", "Terminal actual: [%s]; Terminal anterior: [%s]", [currentTerm, previousTerm]));
        },
    },
    {
        event: vscode.window.onDidChangeTerminalState,
        fn: (term) => {
            logger.push(new Logger_1.LoggerEntry("onDidChangeTerminalState", "Terminal: [%s]; Interactuada: [%s]", [
                term.name,
                term.state.isInteractedWith ? "sí" : "no"
            ]));
        },
    },
    {
        event: vscode.window.onDidCloseTerminal,
        fn: (term) => {
            logger.push(new Logger_1.LoggerEntry("onDidCloseTerminal", "Terminal cerrada: [%s]", [term.name]));
        },
    },
];
//# sourceMappingURL=telemetry.js.map