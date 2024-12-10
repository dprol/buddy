"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
// Constante para la clave API de Anthropic
const ANTHROPIC_API_KEY = ""; // Reemplazar con clave Anthropic
/**
 * Inicializa la configuración
 * @returns {Object} Configuración de autenticación
 */
const initAuth = () => {
    console.log('Inicializando configuración');
    return {
        anthropic: {
            apiKey: ANTHROPIC_API_KEY
        }
    };
};
/**
 * Construye el elemento de la barra de estado
 * @returns {vscode.StatusBarItem} Elemento de la barra de estado
 */
const buildStatusBarItem = () => {
    const statusBarItem = vscode.window.createStatusBarItem();
    statusBarItem.name = "Buddy";
    statusBarItem.text = `$(hubot) Asistente IA`;
    statusBarItem.command = "buddy.createExp";
    statusBarItem.tooltip = "Pide ayuda a buddy para entender el problema";
    return statusBarItem;
};
/**
 * Obtiene la extensión de un archivo
 * @param {string} file Ruta del archivo
 * @returns {string} Extensión del archivo
 */
const getFileExtension = (file) => {
    let activeFile = file;
    let filePathParts = activeFile.split('.');
    return filePathParts[filePathParts.length - 1];
};
// Exportaciones
exports.initAuth = initAuth;
exports.buildStatusBarItem = buildStatusBarItem;
exports.getFileExtension = getFileExtension;
exports.ANTHROPIC_API_KEY = ANTHROPIC_API_KEY;
//# sourceMappingURL=utils.js.map