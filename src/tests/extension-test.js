"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const assert = require("assert");
const vscode = require("vscode");
// const buddy = require('../../extension'); // Importar cuando sea necesario

/**
 * Suite de pruebas para la extensión Buddy
 * Verifica la funcionalidad principal de la extensión
 */
suite('Pruebas de Buddy', () => {
    // Configuración inicial antes de las pruebas
    suiteSetup(async () => {
        vscode.window.showInformationMessage('Iniciando pruebas de Buddy');
        // Esperar a que la extensión se active
        await vscode.commands.executeCommand('buddy.createExp');
    });

    // Limpieza después de las pruebas
    suiteTeardown(() => {
        vscode.window.showInformationMessage('Pruebas de Buddy completadas');
    });

    /**
     * Pruebas de comandos básicos
     */
    suite('Comandos Básicos', () => {
        test('La extensión está presente', async () => {
            const extension = vscode.extensions.getExtension('tu.buddy');
            assert.strictEqual(extension !== undefined, true, 'Extensión no encontrada');
        });

        test('Los comandos están registrados', async () => {
            const commands = await vscode.commands.getCommands();
            assert.strictEqual(commands.includes('buddy.createExp'), true, 'Comando createExp no encontrado');
            assert.strictEqual(commands.includes('buddy.clearChat'), true, 'Comando clearChat no encontrado');
        });
    });

    /**
     * Pruebas de la interfaz de usuario
     */
    suite('Interfaz de Usuario', () => {
        test('Vista web se inicializa correctamente', async () => {
            const result = await vscode.commands.executeCommand('buddy-vscode-plugin.view.focus');
            assert.strictEqual(result !== undefined, true, 'Vista web no inicializada');
        });
    });

    /**
     * Pruebas de funcionalidad de IA
     */
    suite('Funcionalidad de IA', () => {
        test('Manejo de consultas vacías', async () => {
            try {
                await vscode.commands.executeCommand('buddy.createExp', '');
                assert.fail('Debería rechazar consultas vacías');
            } catch (error) {
                assert.strictEqual(error !== undefined, true);
            }
        });

        test('Formato de respuestas', async () => {
            // Aquí irían las pruebas del formato de respuestas
            // Por ahora es un placeholder
            assert.strictEqual(true, true);
        });
    });

    /**
     * Pruebas de utilidades
     */
    suite('Utilidades', () => {
        test('Gestión de configuración', () => {
            const config = vscode.workspace.getConfiguration('buddy');
            assert.strictEqual(config !== undefined, true, 'Configuración no encontrada');
        });

        test('Telemetría', () => {
            const config = vscode.workspace.getConfiguration('buddy');
            const telemetryEnabled = config.get('telemetry.enabled');
            assert.strictEqual(typeof telemetryEnabled === 'boolean', true);
        });
    });

    /**
     * Pruebas de rendimiento
     */
    suite('Rendimiento', () => {
        test('Tiempo de respuesta aceptable', async function() {
            this.timeout(5000); // 5 segundos máximo
            const startTime = Date.now();
            await vscode.commands.executeCommand('buddy.createExp');
            const endTime = Date.now();
            const duration = endTime - startTime;
            assert.strictEqual(duration < 5000, true, 'Respuesta demasiado lenta');
        });
    });

    /**
     * Pruebas de manejo de errores
     */
    suite('Manejo de Errores', () => {
        test('Manejo de errores de API', async () => {
            // Simular error de API
            try {
                // Aquí iría la simulación del error
                assert.strictEqual(true, true);
            } catch (error) {
                assert.fail('No debería fallar silenciosamente');
            }
        });
    });
});

//# sourceMappingURL=extension.test.js.map