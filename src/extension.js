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
const { buildStatusBarItem, setNewAnthropicKey, ANTHROPIC_API_KEY } = require("./utils");
const BuddyViewProvider = require("./buddy-view-provider");

// Array para gestionar recursos desechables
const disposables = [];

/**
  * Función principal de la extensión, ejecutada al activarse.
 * @param {vscode.ExtensionContext} context - Contexto de la extensión.
 */
function activate(context) {
        console.log("Activando extensión Buddy...");

        // Inicializar la vista personalizada
        const buddyViewProvider = new BuddyViewProvider(context);

        // Crear barra de estado
        const statusBarItem = buildStatusBarItem();
        statusBarItem.show();

        /**
         * Comando para crear una explicación de código
         */
        const createExplanation = vscode.commands.registerCommand("buddy.createExp", async () => {
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
        
                await buddyViewProvider.sendRequest({
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
        }); 

        /**
     * Comando para actualizar la clave API de Anthropic
     */
    const updateAnthropicKey = vscode.commands.registerCommand("BuddyAI.updateAnthropicKey", async () => {
        try {
            statusBarItem.hide();
            const statusMessage = vscode.window.setStatusBarMessage("$(key) Almacenando clave API de Anthropic...");
            await setNewAnthropicKey(context);
            vscode.window.showInformationMessage("Clave API de Anthropic actualizada correctamente.");
            statusMessage.dispose();
            statusBarItem.show();
        } catch (error) {
            console.error("Error actualizando la clave Anthropic:", error);
            vscode.window.showErrorMessage("Error al actualizar la clave Anthropic.");
        }
    });

    /**
     * Comando para eliminar la clave API de Anthropic
     */
    const removeAnthropicKey = vscode.commands.registerCommand("BuddyAI.removeAnthropicKey", async () => {
        try {
            statusBarItem.hide();
            const statusMessage = vscode.window.setStatusBarMessage("$(trash) Eliminando clave Anthropic API...");
            await context.secrets.delete(ANTHROPIC_API_KEY);
            vscode.window.showInformationMessage("Clave API de Anthropic eliminada correctamente.");
            statusMessage.dispose();
            statusBarItem.show();
        } catch (error) {
            console.error("Error eliminando la clave Anthropic:", error);
            vscode.window.showErrorMessage("Error al eliminar la clave Anthropic.");
        }
    });

    // Registrar WebView y comandos
    context.subscriptions.push(
        createExplanation,
        updateAnthropicKey,
        removeAnthropicKey,
        vscode.window.registerWebviewViewProvider("BuddyAI-vscode-plugin", buddyViewProvider, {
            webviewOptions: {
                retainContextWhenHidden: true,
                enableScripts: true,
            },
        })
    );
}

/**
 * Función de desactivación de la extensión.
 */
function deactivate() {
    disposables.forEach((disposable) => disposable.dispose());
}

module.exports = {
    activate,
    deactivate
};