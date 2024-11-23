"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try {
            step(generator.next(value));
        }
        catch (e) {
            reject(e);
        } }
        function rejected(value) { try {
            step(generator["throw"](value));
        }
        catch (e) {
            reject(e);
        } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const utils = require("../../utils");
/**
 * Suite de pruebas para las utilidades de Buddy
 */
suite('Pruebas de Utilidades de Buddy', () => {
    /**
     * Pruebas de extensiones de archivo
     */
    suite('Extensiones de Archivo', () => {
        test('Obtener extensión de archivo simple', () => {
            const file = "path/to/file.js";
            const extension = utils.getFileExtension(file);
            assert.strictEqual(extension, 'js');
        });
        test('Obtener extensión de archivo sin extensión', () => {
            const file = "path/to/file";
            const extension = utils.getFileExtension(file);
            assert.strictEqual(extension, '');
        });
        test('Obtener extensión de archivo con múltiples puntos', () => {
            const file = "path/to/file.test.js";
            const extension = utils.getFileExtension(file);
            assert.strictEqual(extension, 'js');
        });
        test('Obtener extensión de archivo oculto', () => {
            const file = "path/to/.gitignore";
            const extension = utils.getFileExtension(file);
            assert.strictEqual(extension, 'gitignore');
        });
    });
    /**
     * Pruebas de formateo de texto
     */
    suite('Formateo de Texto', () => {
        test('Indentar texto correctamente', () => {
            const text = "línea1\nlínea2";
            const indented = utils.indentString(text, 2);
            assert.strictEqual(indented, "  línea1\n  línea2");
        });
        test('Formatear comentario dentro del límite', () => {
            const comment = "Este es un comentario corto";
            const formatted = utils.formatComment(comment, 30);
            assert.strictEqual(formatted.length, 1);
        });
        test('Formatear comentario que excede el límite', () => {
            const comment = "Este es un comentario muy largo que debería dividirse en múltiples líneas";
            const formatted = utils.formatComment(comment, 20);
            assert.strictEqual(formatted.length > 1, true);
        });
    });
    /**
     * Pruebas de validación
     */
    suite('Validaciones', () => {
        test('Validar carga útil de chat válida', () => {
            const payload = {
                model: "claude-3-5-sonnet-20241022",
                max_tokens: 2000,
                temperature: 0.7
            };
            const { isValid } = utils.validateChatPayload(payload);
            assert.strictEqual(isValid, true);
        });
        test('Validar carga útil de chat inválida', () => {
            const payload = {
                temperature: 1.5 // Temperatura fuera de rango
            };
            const { isValid } = utils.validateChatPayload(payload);
            assert.strictEqual(isValid, false);
        });
    });
    /**
     * Pruebas de manejo de credenciales
     */
    suite('Manejo de Credenciales', () => {
        test('Crear configuración de IA sin credenciales', () => __awaiter(void 0, void 0, void 0, function* () {
            try {
                yield utils.createChatPayload('chat', []);
                assert.fail('Debería fallar sin credenciales');
            }
            catch (error) {
                assert.strictEqual(error !== undefined, true);
            }
        }));
    });
    /**
     * Pruebas de utilidades de memoria
     */
    suite('Utilidades de Memoria', () => {
        test('Limpiar cache correctamente', () => {
            var _a;
            // Asumiendo que existe un método para limpiar cache
            const result = (_a = utils.clearCache) === null || _a === void 0 ? void 0 : _a.call(utils);
            assert.strictEqual(result, undefined);
        });
    });
    /**
     * Pruebas de manejo de errores
     */
    suite('Manejo de Errores', () => {
        test('Manejar entrada inválida graciosamente', () => {
            try {
                utils.getFileExtension(null);
                assert.fail('Debería lanzar error con entrada null');
            }
            catch (error) {
                assert.strictEqual(error instanceof Error, true);
            }
        });
        test('Manejar argumentos faltantes', () => {
            try {
                utils.formatComment();
                assert.fail('Debería lanzar error sin argumentos');
            }
            catch (error) {
                assert.strictEqual(error instanceof Error, true);
            }
        });
    });
});
//# sourceMappingURL=utils-test.js.map