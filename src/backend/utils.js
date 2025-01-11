const vscode = require('vscode');

const ANTHROPIC_API_KEY = 'buddy.anthropic.apiKey';

async function initAuth(context) {
    let apiKey = await context.secrets.get(ANTHROPIC_API_KEY);
    
    if (!apiKey) {
        apiKey = await vscode.window.showInputBox({
            prompt: 'Introduce tu clave API de Anthropic',
            placeHolder: 'sk-ant-...',
            password: true
        });
        
        if (apiKey) {
            await context.secrets.store(ANTHROPIC_API_KEY, apiKey);
        }
    }
    
    return apiKey;
}

async function setNewAnthropicKey(context) {
    const apiKey = await vscode.window.showInputBox({
        prompt: 'Introduce tu clave API de Anthropic',
        placeHolder: 'sk-ant-...',
        password: true
    });

    if (apiKey) {
        await context.secrets.store(ANTHROPIC_API_KEY, apiKey);
    }

    return apiKey;
}

function buildStatusBarItem() {
    const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    item.text = '$(hubot) Buddy';
    item.tooltip = 'Asistente de programación';
    item.command = 'buddy.createExp';
    return item;
}

module.exports = { ANTHROPIC_API_KEY, initAuth, setNewAnthropicKey, buildStatusBarItem };