"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const path = require("path");
const test_electron_1 = require("@vscode/test-electron");

/**
 * Función principal para ejecutar las pruebas de la extensión Buddy
 * @returns {Promise<void>}
 */
async function main() {
    try {
        // Configuración de rutas
        const paths = {
            // Ruta al directorio que contiene el package.json de la extensión
            // Se pasa a --extensionDevelopmentPath
            extension: path.resolve(__dirname, '../../'),
            
            // Ruta al ejecutor de pruebas
            // Se pasa a --extensionTestsPath
            tests: path.resolve(__dirname, './suite/index')
        };

        // Configuración de las pruebas
        const testConfig = {
            extensionDevelopmentPath: paths.extension,
            extensionTestsPath: paths.tests,
            // Configuraciones adicionales para las pruebas de Buddy
            launchArgs: [
                '--disable-extensions', // Deshabilitar otras extensiones durante las pruebas
                '--disable-gpu'        // Deshabilitar aceleración GPU para pruebas más estables
            ]
        };

        console.log('Iniciando pruebas de Buddy...');
        console.log('Ruta de la extensión:', paths.extension);
        console.log('Ruta de las pruebas:', paths.tests);

        // Descargar VS Code, descomprimirlo y ejecutar las pruebas de integración
        await test_electron_1.runTests(testConfig);
        
        console.log('Pruebas completadas exitosamente');
    } catch (error) {
        console.error('Error al ejecutar las pruebas de Buddy:');
        console.error(error);
        process.exit(1);
    }
}

// Manejo de errores no capturados
process.on('unhandledRejection', (error) => {
    console.error('Error no manejado en las pruebas:');
    console.error(error);
    process.exit(1);
});

// Ejecutar pruebas
main().catch(error => {
    console.error('Error fatal al ejecutar las pruebas:');
    console.error(error);
    process.exit(1);
});

//# sourceMappingURL=runTest.js.map