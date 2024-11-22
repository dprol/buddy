"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ANTHROPIC_API_KEY = exports.OPENAI_API_KEY = exports.buildStatusBarItem = 
exports.getFileExtension = exports.setNewAnthropicKey = exports.setNewOpenAIKey = 
exports.getConfValue = exports.validateChatPayload = exports.createChatPayload = 
exports.initAuth = void 0;

const vscode = require("vscode");

// constantes para las claves API
const OPENAI_API_KEY = "OPENAI_API_KEY";
const ANTHROPIC_API_KEY = "ANTHROPIC_API_KEY";
exports.OPENAI_API_KEY = OPENAI_API_KEY;
exports.ANTHROPIC_API_KEY = ANTHROPIC_API_KEY;

/**
 * inicializa la autenticación
 * @param {vscode.ExtensionContext} context 
 * @returns {Promise<Object>} configuración de autenticación
 */
const initAuth = async (context) => {
    console.log('Iniciando autenticación');
    const config = {};

    // obtener clave OpenAI
    let openaiKey = await context.secrets.get(OPENAI_API_KEY);
    if (process.env["OPENAI_TOKEN"]) {
        openaiKey = process.env["OPENAI_TOKEN"];
    }

    // obtener clave Anthropic
    let anthropicKey = await context.secrets.get(ANTHROPIC_API_KEY);
    if (process.env["ANTHROPIC_TOKEN"]) {
        anthropicKey = process.env["ANTHROPIC_TOKEN"];
    }

    // verificar y configurar OpenAI
    if (!openaiKey) {
        console.log("Clave API de OpenAI no encontrada");
        openaiKey = await setNewOpenAIKey(context);
    }

    // verificar y configurar Anthropic
    if (!anthropicKey) {
        console.log("Clave API de Anthropic no encontrada");
        anthropicKey = await setNewAnthropicKey(context);
    }

    // configurar las claves
    config.openai = { apiKey: openaiKey };
    config.anthropic = { apiKey: anthropicKey };

    // configurar organización OpenAI si existe
    let org = getConfValue('org');
    if (org) {
        config.openai.organization = org;
    }

    return config;
};

/**
 * obtiene un valor de configuración
 * @param {string} key clave de configuración
 * @returns {any} valor de configuración
 */
const getConfValue = (key) => vscode.workspace.getConfiguration('buddy').get(key);

/**
 * configura una nueva clave API de OpenAI
 * @param {vscode.ExtensionContext} context 
 * @returns {Promise<string>} Clave API
 */
const setNewOpenAIKey = async (context) => {
    const inputBoxOptions = {
        title: "Introduce tu clave API de OpenAI",
        prompt: "La clave se almacenará de forma segura",
        password: true,
        ignoreFocusOut: true
    };

    const secret = await vscode.window.showInputBox(inputBoxOptions);
    if (!secret) {
        vscode.window.showWarningMessage('No se ha recibido ninguna clave API.');
        return "";
    }

    await context.secrets.store(OPENAI_API_KEY, secret);
    return secret;
};

/**
 * configura una nueva clave API de Anthropic
 * @param {vscode.ExtensionContext} context 
 * @returns {Promise<string>} Clave API
 */
const setNewAnthropicKey = async (context) => {
    const inputBoxOptions = {
        title: "Introduce tu clave API de Anthropic",
        prompt: "La clave se almacenará de forma segura",
        password: true,
        ignoreFocusOut: true
    };

    const secret = await vscode.window.showInputBox(inputBoxOptions);
    if (!secret) {
        vscode.window.showWarningMessage('No se ha recibido ninguna clave API.');
        return "";
    }

    await context.secrets.store(ANTHROPIC_API_KEY, secret);
    return secret;
};

/**
 * construye el elemento de la barra de estado
 * @returns {vscode.StatusBarItem} elemento de la barra de estado
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
 * obtiene la extensión de un archivo
 * @param {string} file Ruta del archivo
 * @returns {string} Extensión del archivo
 */
const getFileExtension = (file) => {
    let activeFile = file;
    let filePathParts = activeFile.split('.');
    return filePathParts[filePathParts.length - 1];
};

/**
 * crea la carga útil para el chat
 * @param {string} type Tipo de chat
 * @param {Array} message Mensajes del chat
 * @returns {Object} Carga útil del chat
 */
const createChatPayload = (type, message) => {
    return {
        "model": getConfValue('chatModel'),
        "messages": message,
        "max_tokens": getConfValue('maxTokens'),
        "temperature": getConfValue('temperature')
    };
};

/**
 * valida la carga útil del chat
 * @param {Object} payload Carga útil a validar
 * @returns {Object} Resultado de la validación
 */
const validateChatPayload = (payload) => {
    let reason = "";
    let isValid = true;

    if (!payload.temperature || payload.temperature < 0 || payload.temperature > 1) {
        reason = "La temperatura debe estar entre 0 y 1, actualiza la configuración";
        isValid = false;
    }
    if (!payload.max_tokens || payload.max_tokens < 1 || payload.max_tokens >= 4000) {
        reason = "El máximo de tokens debe estar entre 1 y 4000, actualiza la configuración";
        isValid = false;
    }
    if (!payload.model) {
        reason = "Modelo de IA no especificado, actualiza la configuración";
        isValid = false;
    }

    return { isValid, reason };
};

// Exportaciones
exports.initAuth = initAuth;
exports.getConfValue = getConfValue;
exports.setNewOpenAIKey = setNewOpenAIKey;
exports.setNewAnthropicKey = setNewAnthropicKey;
exports.buildStatusBarItem = buildStatusBarItem;
exports.getFileExtension = getFileExtension;
exports.createChatPayload = createChatPayload;
exports.validateChatPayload = validateChatPayload;

//# sourceMappingURL=utils.js.map