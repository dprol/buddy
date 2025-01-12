"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;

const vscode = require("vscode");
const utils = require("./utils");
const BuddyViewProvider = require("./buddy-view-provider");

const disposables = [];

async function activate(context) {
    try {
        // Inicializar el proveedor de vista y la barra de estado
        const buddyViewProvider = new BuddyViewProvider(context);
        const statusBarItem = utils.buildStatusBarItem();

        // Registrar el proveedor de vista webview
        const viewRegistration = vscode.window.registerWebviewViewProvider(
            'buddy-vscode-plugin.view',
            buddyViewProvider,
            {
                webviewOptions: {
                    retainContextWhenHidden: true,
                    enableScripts: true
                }
            }
        );
        
        context.subscriptions.push(viewRegistration);

        // Definir comandos de las claves API
        const commands = [
            {
                id: 'buddy.updateAnthropicKey',
                handler: async () => {
                    const statusMessage = vscode.window.setStatusBarMessage('$(key) Actualizando clave de Anthropic...');
                    try {
                        await utils.setNewAnthropicKey(context);
                        vscode.window.showInformationMessage('Clave de Anthropic actualizada con éxito');
                    } catch (error) {
                        console.error('Error actualizando clave:', error);
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
                        console.error('Error eliminando clave:', error);
                        vscode.window.showErrorMessage('Error al eliminar la clave de Anthropic');
                    } finally {
                        statusMessage.dispose();
                        statusBarItem.show();
                    }
                }
            }
        ];

        // Registrar comandos
        commands.forEach(({ id, handler }) => {
            const disposable = vscode.commands.registerCommand(id, handler);
            context.subscriptions.push(disposable);
            disposables.push(disposable);
        });

        // Mostrar barra de estado
        statusBarItem.show();
        disposables.push(statusBarItem);

        console.log('Buddy extension activated successfully');

    } catch (error) {
        console.error('Error during activation:', error);
        vscode.window.showErrorMessage('Error al activar la extensión Buddy');
        throw error;
    }
}

function deactivate() {
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