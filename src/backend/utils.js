"use strict";

const vscode = require('vscode');
const indentString = (...args) => import('indent-string').then(m => m.default(...args));

const ANTHROPIC_API_KEY = 'anthropic-api-key';

function buildStatusBarItem() {
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "$(hubot) Buddy AI";
    statusBarItem.tooltip = "Asistente de IA para estudiantes";
    statusBarItem.command = 'buddy.createExp';
    return statusBarItem;
}

async function setNewAnthropicKey(context) {
    const key = await vscode.window.showInputBox({
        prompt: 'Ingrese su clave API de Anthropic',
        password: true
    });
    if (key) {
        await context.secrets.store(ANTHROPIC_API_KEY, key);
    }
}

function getFileExtension(filename) {
    if (!filename) return '';
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}

async function formatText(text, spaces) {
    if (!text) return '';
    try {
        return await indentString(text, spaces);
    } catch (error) {
        console.error('Error al formatear texto:', error);
        return text;
    }
}

function formatComment(comment, maxLength) {
    if (!comment) return [];
    const words = comment.split(' ');
    const lines = [];
    let currentLine = '';

    words.forEach(word => {
        if ((currentLine + word).length > maxLength && currentLine !== '') {
            lines.push(currentLine.trim());
            currentLine = word + ' ';
        } else {
            currentLine += word + ' ';
        }
    });
    
    if (currentLine) {
        lines.push(currentLine.trim());
    }
    
    return lines;
}

function validateChatPayload(payload) {
    if (!payload) return { isValid: false, errors: ['Payload is required'] };
    
    const errors = [];
    
    if (payload.temperature && (payload.temperature < 0 || payload.temperature > 1)) {
        errors.push('Temperature must be between 0 and 1');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

module.exports = {
    ANTHROPIC_API_KEY,
    buildStatusBarItem,
    setNewAnthropicKey,
    getFileExtension,
    formatText,
    formatComment,
    validateChatPayload,
    initAuth
};