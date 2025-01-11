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
// módulo para TypeScript
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
// importaciones
const vscode = require("vscode"); // api principal de VS Code
const utils_1 = require("./utils");
const buddy_view_provider_1 = require("./buddy-view-provider"); // vista personalizada
// array para mantener un registro de los recursos desechables
const disposables = [];
/**
 * función principal de la extensión
 * se ejecuta cuando la extensión se usa por primera vez
 * @param context el contexto de extensión
 */
function activate(context) {
    return __awaiter(this, void 0, void 0, function* () {
        // inicialización de la vista personalizada, las utilidades y la barra de estado
        const buddyViewProvider = new buddy_view_provider_1.default(context);
        const statusBarItem = (0, utils_1.buildStatusBarItem)();
        statusBarItem.show();
        // mensajes modales
        const modalMessageOptions = {
            "modal": true,
            "detail": "- Asistente de IA"
        };
        
        let createExplanation = vscode.commands.registerCommand('buddy.createExp', () => __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('1. Iniciando createExp');
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    console.log('No hay editor activo');
                    return;
                }
        
                const selectedText = editor.document.getText(editor.selection);
                console.log('2. Texto seleccionado:', selectedText);
                
                if (!selectedText) {
                    console.log('No hay texto seleccionado');
                    vscode.window.showWarningMessage('No se ha seleccionado ningún texto');
                    return;
                }
        
                statusBarItem.hide();
                const statusMessage = vscode.window.setStatusBarMessage('$(hubot) Generando una explicación! $(book)');
                
                console.log('3. Preparando request para buddyViewProvider');
                console.log('Datos a enviar:', {
                    code: selectedText,
                    type: "askAIOverview",
                    filename: editor.document.fileName
                });
        
                console.log('4. Enviando request a buddyViewProvider');
                try {
                    yield buddyViewProvider.sendRequest({
                        code: selectedText,
                        type: "askAIOverview",
                        filename: editor.document.fileName
                    }, new AbortController());
                    console.log('5. Request completado exitosamente');
                } catch (requestError) {
                    console.error('Error en el request:', requestError);
                    throw requestError; // Re-lanzar para que lo capture el catch exterior
                }
        
                console.log('6. Limpiando UI');
                statusMessage.dispose();
                statusBarItem.show();
                console.log('7. Proceso completado');
        
            } catch (error) {
                console.error('Error en createExp:', error);
                console.error('Stack trace:', error.stack);
                vscode.window.showErrorMessage(`Error al generar explicación: ${error.message}`);
                
                // Asegurar que la UI se restaure
                if (statusMessage) {
                    statusMessage.dispose();
                }
                statusBarItem.show();
            }
        }));
        /**
         * actualizar clave API de OpenAI
         * gestionar el almacenamiento seguro de la clave API de OpenAI
         */
        let updateOpenAIKey = vscode.commands.registerCommand('buddy.updateOpenAIKey', () => __awaiter(this, void 0, void 0, function* () {
            console.log('Running updateOpenAIKey');
            statusBarItem.hide();
            const statusMessage = vscode.window.setStatusBarMessage('$(hubot) Almacenando clave API de OpenAI $(pencil)');
            yield (0, utils_1.setNewOpenAIKey)(context);
            statusMessage.dispose();
            statusBarItem.show();
        }));
        /**
         * actualizar clave API de Anthropic
         * gestionar el almacenamiento seguro de la clave API de Anthropic
         */
        let updateAnthropicKey = vscode.commands.registerCommand('buddy.updateAnthropicKey', () => __awaiter(this, void 0, void 0, function* () {
            console.log('Running updateAnthropicKey');
            statusBarItem.hide();
            const statusMessage = vscode.window.setStatusBarMessage('$(hubot) Almacenando clave API de Anthropic $(pencil)');
            yield (0, utils_1.setNewAnthropicKey)(context);
            statusMessage.dispose();
            statusBarItem.show();
        }));
        /**
         * eliminar clave API de OpenAI
         * eliminar de forma segura la clave API almacenada de OpenAI
         */
        let removeOpenAIKey = vscode.commands.registerCommand('buddy.removeOpenAIKey', () => __awaiter(this, void 0, void 0, function* () {
            console.log('Ejecutando removeOpenAIKey');
            statusBarItem.hide();
            const statusMessage = vscode.window.setStatusBarMessage('$(hubot) Eliminando clave OpenAI API $(error)');
            yield context.secrets.delete(utils_1.OPENAI_API_KEY);
            statusMessage.dispose();
            statusBarItem.show();
        }));
        /**
         * eliminar clave API de Anthropic
         * eliminar de forma segura la clave API almacenada de Anthropic
         */
        let removeAnthropicKey = vscode.commands.registerCommand('buddy.removeAnthropicKey', () => __awaiter(this, void 0, void 0, function* () {
            console.log('Ejecutando removeAnthropicKey');
            statusBarItem.hide();
            const statusMessage = vscode.window.setStatusBarMessage('$(hubot) Eliminando clave Anthropic API $(error)');
            yield context.secrets.delete(utils_1.ANTHROPIC_API_KEY);
            statusMessage.dispose();
            statusBarItem.show();
        }));
        // registrar todos los comandos y vista para el contexto
        context.subscriptions.push(createExplanation, updateOpenAIKey, updateAnthropicKey, removeOpenAIKey, removeAnthropicKey, vscode.window.registerWebviewViewProvider("buddy-vscode-plugin.view",  buddyViewProvider, 
            {
                webviewOptions: { 
                    retainContextWhenHidden: true,
                    enableScripts: true 
                }
        }));
    });
}
exports.activate = activate;
/**
 * función de desactivación de la extensión
 * se llama cuando la extensión se deja de usar
 * limpia todos los recursos y desactiva la telemetría
 */
function deactivate() {
    disposables.forEach((e) => e.dispose());
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map