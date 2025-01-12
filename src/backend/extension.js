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
// Importaciones
const vscode = require("vscode");
const { buildStatusBarItem, setNewOpenAIKey, setNewAnthropicKey, OPENAI_API_KEY, ANTHROPIC_API_KEY } = require("./utils");
const BuddyViewProvider = require("./buddy-view-provider");

// Array para gestionar recursos desechables
const disposables = [];

/**
 * Función principal de la extensión, ejecutada al activarse.
 * @param {vscode.ExtensionContext} context - Contexto de la extensión.
 */
function activate(context) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Activando extensión Buddy...");

        // Inicializar la vista personalizada
        const buddyViewProvider = new BuddyViewProvider(context);

        // Crear barra de estado
        const statusBarItem = buildStatusBarItem();
        statusBarItem.show();

        /**
         * Comando para crear una explicación de código
         */
        const createExplanation = vscode.commands.registerCommand("buddy.createExp", () => __awaiter(this, void 0, void 0, function* () {
            let statusMessage;
            try {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    vscode.window.showWarningMessage("No hay un editor activo.");
                    return;
                }

                const selectedText = editor.document.getText(editor.selection);
                if (!selectedText) {
                    vscode.window.showWarningMessage("No se ha seleccionado ningún texto.");
                    return;
                }

                statusBarItem.hide();
                statusMessage = vscode.window.setStatusBarMessage("$(hubot) Generando una explicación... $(book)");

                yield buddyViewProvider.sendRequest({
                    code: selectedText,
                    type: "askAIOverview",
                    filename: editor.document.fileName,
                }, new AbortController());

                vscode.window.showInformationMessage("¡Explicación generada exitosamente!");
            } catch (error) {
                console.error("Error en createExp:", error);
                vscode.window.showErrorMessage(`Error al generar la explicación: ${error.message}`);
            } finally {
                if (statusMessage) statusMessage.dispose();
                statusBarItem.show();
            }
        }));

        /**
         * Comando para actualizar la clave API de OpenAI
         */
        const updateOpenAIKey = vscode.commands.registerCommand("buddy.updateOpenAIKey", () => __awaiter(this, void 0, void 0, function* () {
            try {
                statusBarItem.hide();
                const statusMessage = vscode.window.setStatusBarMessage("$(hubot) Almacenando clave API de OpenAI $(pencil)");
                yield setNewOpenAIKey(context);
                vscode.window.showInformationMessage("Clave API de OpenAI actualizada correctamente.");
                statusMessage.dispose();
                statusBarItem.show();
            } catch (error) {
                console.error("Error actualizando la clave OpenAI:", error);
                vscode.window.showErrorMessage("Error al actualizar la clave OpenAI.");
            }
        }));

        /**
         * Comando para actualizar la clave API de Anthropic
         */
        const updateAnthropicKey = vscode.commands.registerCommand("buddy.updateAnthropicKey", () => __awaiter(this, void 0, void 0, function* () {
            try {
                statusBarItem.hide();
                const statusMessage = vscode.window.setStatusBarMessage("$(hubot) Almacenando clave API de Anthropic $(pencil)");
                yield setNewAnthropicKey(context);
                vscode.window.showInformationMessage("Clave API de Anthropic actualizada correctamente.");
                statusMessage.dispose();
                statusBarItem.show();
            } catch (error) {
                console.error("Error actualizando la clave Anthropic:", error);
                vscode.window.showErrorMessage("Error al actualizar la clave Anthropic.");
            }
        }));

        /**
         * Comando para eliminar la clave API de OpenAI
         */
        const removeOpenAIKey = vscode.commands.registerCommand("buddy.removeOpenAIKey", () => __awaiter(this, void 0, void 0, function* () {
            try {
                statusBarItem.hide();
                const statusMessage = vscode.window.setStatusBarMessage("$(hubot) Eliminando clave OpenAI API $(trash)");
                yield context.secrets.delete(OPENAI_API_KEY);
                vscode.window.showInformationMessage("Clave API de OpenAI eliminada correctamente.");
                statusMessage.dispose();
                statusBarItem.show();
            } catch (error) {
                console.error("Error eliminando la clave OpenAI:", error);
                vscode.window.showErrorMessage("Error al eliminar la clave OpenAI.");
            }
        }));

        /**
         * Comando para eliminar la clave API de Anthropic
         */
        const removeAnthropicKey = vscode.commands.registerCommand("buddy.removeAnthropicKey", () => __awaiter(this, void 0, void 0, function* () {
            try {
                statusBarItem.hide();
                const statusMessage = vscode.window.setStatusBarMessage("$(hubot) Eliminando clave Anthropic API $(trash)");
                yield context.secrets.delete(ANTHROPIC_API_KEY);
                vscode.window.showInformationMessage("Clave API de Anthropic eliminada correctamente.");
                statusMessage.dispose();
                statusBarItem.show();
            } catch (error) {
                console.error("Error eliminando la clave Anthropic:", error);
                vscode.window.showErrorMessage("Error al eliminar la clave Anthropic.");
            }
        }));

        // Registrar WebView y comandos
        context.subscriptions.push(
            createExplanation,
            updateOpenAIKey,
            updateAnthropicKey,
            removeOpenAIKey,
            removeAnthropicKey,
            vscode.window.registerWebviewViewProvider("buddy-vscode-plugin.view", buddyViewProvider, {
                webviewOptions: {
                    retainContextWhenHidden: true,
                    enableScripts: true,
                },
            })
        );
    });
}
exports.activate = activate;

/**
 * Función de desactivación de la extensión.
 */
function deactivate() {
    disposables.forEach((disposable) => disposable.dispose());
}
exports.deactivate = deactivate;