const path = require('path');
const Mocha = require('mocha');
const glob = require('glob');

async function run() {
    const mocha = new Mocha({
        ui: 'tdd',
        color: true,
        timeout: 60000  // Aumentar timeout para dar tiempo a la activación
    });

    const testsRoot = path.resolve(__dirname, '.');

    return new Promise((resolve, reject) => {
        glob('**/**.test.js', { cwd: testsRoot }, (err, files) => {
            if (err) {
                return reject(err);
            }

            files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

            try {
                mocha.run(failures => {
                    if (failures > 0) {
                        reject(new Error(`${failures} tests failed.`));
                    } else {
                        resolve();
                    }
                });
            } catch (err) {
                reject(err);
            }
        });
    });
}

module.exports = {
    run
};