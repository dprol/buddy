"use strict";

const assert = require("assert");
const vscode = require("vscode");

suite("Buddy Extension Test Suite", function() {
    
    // Configurar tiempo de espera
    this.timeout(10000);
    
    suiteSetup(async () => {
        // Esperar a que la extensión se active
        await vscode.extensions.getExtension('dprol.buddy').activate();
    });

    test("Extension should be present", async function() {
        const extension = vscode.extensions.getExtension('dprol.buddy');
        assert.ok(extension, 'Extension should be available');
    });

    test("Should register commands", async function() {
        // Obtener todos los comandos
        const commands = await vscode.commands.getCommands();
        
        // Verificar comandos específicos
        const expectedCommands = [
            'buddy.updateAnthropicKey',
            'buddy.removeAnthropicKey'
        ];

        for (const cmd of expectedCommands) {
            assert.ok(
                commands.includes(cmd),
                `Command ${cmd} should be registered`
            );
        }
    });

    test("Should load extension settings", function() {
        const config = vscode.workspace.getConfiguration('buddy');
        assert.ok(config, 'Configuration should be available');
    });
});