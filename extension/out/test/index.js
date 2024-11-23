"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = void 0;

const path = require("path");
const Mocha = require("mocha");
const glob = require("glob");

/**
 * Configuración de Mocha para Buddy
 * @type {Mocha.MochaOptions}
 */
const mochaConfig = {
    ui: 'tdd',                    // Interfaz de pruebas tipo TDD
    color: true,                  // Habilitar colores en la salida
    timeout: 10000,               // Timeout de 10 segundos por prueba
    reporter: 'spec',             // Reportero detallado
    slow: 5000,                   // Umbral para pruebas lentas (5s)
    retries: 1,                   // Reintentar pruebas fallidas una vez
};

/**
 * Ejecuta las pruebas de la extensión Buddy
 * @returns {Promise<void>} Promesa que se resuelve cuando terminan las pruebas
 */
async function run() {
    try {
        console.log('Iniciando pruebas de Buddy...');

        // Crear instancia de Mocha con la configuración
        const mocha = new Mocha(mochaConfig);

        // Ruta raíz de las pruebas
        const testsRoot = path.resolve(__dirname, '..');
        console.log('Directorio de pruebas:', testsRoot);

        return new Promise((resolve, reject) => {
            // Buscar archivos de prueba
            glob('**/**.test.js', { cwd: testsRoot }, (err, files) => {
                if (err) {
                    console.error('Error al buscar archivos de prueba:', err);
                    return reject(err);
                }

                try {
                    console.log(`Encontrados ${files.length} archivos de prueba`);

                    // Agregar archivos a la suite de pruebas
                    files.forEach(file => {
                        const testPath = path.resolve(testsRoot, file);
                        console.log('Agregando prueba:', file);
                        mocha.addFile(testPath);
                    });

                    // Configurar listeners de eventos
                    mocha.suite
                        .on('pre-require', () => {
                            console.log('Preparando entorno de pruebas...');
                        })
                        .on('require', (module, file) => {
                            console.log('Cargando módulo de prueba:', file);
                        });

                    // Ejecutar las pruebas
                    console.log('Ejecutando pruebas...');
                    mocha.run(failures => {
                        if (failures > 0) {
                            console.error(`❌ ${failures} pruebas fallaron.`);
                            reject(new Error(`${failures} pruebas fallaron.`));
                        } else {
                            console.log('✅ Todas las pruebas pasaron correctamente.');
                            resolve();
                        }
                    })
                    .on('test', test => {
                        console.log('Ejecutando:', test.title);
                    })
                    .on('test end', test => {
                        console.log(`${test.state === 'passed' ? '✓' : '✗'} ${test.title}`);
                    })
                    .on('end', () => {
                        console.log('Finalizando ejecución de pruebas...');
                    });

                } catch (error) {
                    console.error('Error durante la ejecución de las pruebas:', error);
                    reject(error);
                }
            });
        });
    } catch (error) {
        console.error('Error fatal en la ejecución de pruebas:', error);
        throw error;
    }
}

exports.run = run;

// Manejar errores no capturados
process.on('unhandledRejection', error => {
    console.error('Error no manejado en las pruebas:', error);
    process.exit(1);
});

//# sourceMappingURL=index.js.map