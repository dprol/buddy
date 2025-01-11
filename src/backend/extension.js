"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;

const vscode = require("vscode");
const utils = require("./utils");
const BuddyViewProvider = require("./buddy-view-provider");

const disposables = [];

async function activate(context) {
    console.log('Activating Buddy extension...');

    try {
        // Inicializar proveedores
        const buddyViewProvider = new BuddyViewProvider.default(context);
        const statusBarItem = utils.buildStatusBarItem();

        // Registrar todos los comandos inmediatamente
        const commands = [
            {
                id: 'buddy.createExp',
                handler: async () => {
                    try {
                        const editor = vscode.window.activeTextEditor;
                        if (!editor) {
                            return vscode.window.showWarningMessage('No hay editor activo');
                        }

                        const selectedText = editor.document.getText(editor.selection);
                        if (!selectedText) {
                            return vscode.window.showWarningMessage('No se ha seleccionado ningún texto');
                        }

                        statusBarItem.hide();
                        const statusMessage = vscode.window.setStatusBarMessage('$(hubot) Generando explicación... $(book)');

                        try {
                            await buddyViewProvider.sendRequest({
                                code: selectedText,
                                type: "askAIOverview",
                                filename: editor.document.fileName
                            }, new AbortController());
                        } finally {
                            statusMessage.dispose();
                            statusBarItem.show();
                        }
                    } catch (error) {
                        console.error('Error en createExp:', error);
                        vscode.window.showErrorMessage(`Error al generar explicación: ${error.message}`);
                    }
                }
            },
            {
                id: 'buddy.updateAnthropicKey',
                handler: async () => {
                    const statusMessage = vscode.window.setStatusBarMessage('$(key) Actualizando clave de Anthropic...');
                    try {
                        await utils.setNewAnthropicKey(context);
                        vscode.window.showInformationMessage('Clave de Anthropic actualizada con éxito');
                    } catch (error) {
                        vscode.window.showErrorMessage('Error al actualizar la clave de Anthropic');
                    } finally {
                        statusMessage.dispose();
                        statusBarItem.show();
                    }
                }
            },
            {
                id: 'buddy.removeAnthropicKey',
                handler: async () => {
                    const statusMessage = vscode.window.setStatusBarMessage('$(trash) Eliminando clave de Anthropic...');
                    try {
                        await context.secrets.delete(utils.ANTHROPIC_API_KEY);
                        vscode.window.showInformationMessage('Clave de Anthropic eliminada con éxito');
                    } catch (error) {
                        vscode.window.showErrorMessage('Error al eliminar la clave de Anthropic');
                    } finally {
                        statusMessage.dispose();
                        statusBarItem.show();
                    }
                }
            }
        ];

        // Registrar todos los comandos
        commands.forEach(({ id, handler }) => {
            const disposable = vscode.commands.registerCommand(id, handler);
            context.subscriptions.push(disposable);
        });

        // Registrar webview provider
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider("buddy-vscode-plugin.view", buddyViewProvider, {
                webviewOptions: {
                    retainContextWhenHidden: true,
                    enableScripts: true
                }
            })
        );

        // Mostrar status bar item al final
        statusBarItem.show();
        console.log('Buddy extension activated successfully');

    } catch (error) {
        console.error('Error during activation:', error);
        vscode.window.showErrorMessage('Error al activar la extensión Buddy');
        throw error; // Re-throw para que VS Code pueda manejarlo
    }
}

function deactivate() {
    console.log('Deactivating Buddy extension...');
    disposables.forEach(disposable => {
        try {
            disposable.dispose();
        } catch (error) {
            console.error('Error disposing:', error);
        }
    });
}

exports.activate = activate;
exports.deactivate = deactivate;