"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const NextStepDisplay = ({ currentCode, explanation, nextStepCode, language }) => {
    return (react_1.default.createElement("div", { className: "next-step-container bg-gray-800 rounded-lg p-6 my-4 w-full" },
        react_1.default.createElement("div", { className: "code-section mb-6" },
            react_1.default.createElement("h3", { className: "text-lg font-semibold text-blue-500 mb-2 flex items-center" },
                react_1.default.createElement("span", { className: "mr-2" }, "\uD83D\uDCDD"),
                "C\u00F3digo Actual"),
            react_1.default.createElement("pre", { className: "bg-gray-900 p-4 rounded-md overflow-x-auto" },
                react_1.default.createElement("code", { className: `language-${language}` }, currentCode))),
        react_1.default.createElement("div", { className: "next-step-section" },
            react_1.default.createElement("h3", { className: "text-lg font-semibold text-blue-500 mb-2 flex items-center" },
                react_1.default.createElement("span", { className: "mr-2" }, "\u27A1\uFE0F"),
                "Siguiente Paso"),
            react_1.default.createElement("div", { className: "explanation bg-gray-700 p-4 rounded-md mb-4 text-white" }, explanation),
            react_1.default.createElement("pre", { className: "bg-gray-900 p-4 rounded-md overflow-x-auto" },
                react_1.default.createElement("code", { className: `language-${language}` }, nextStepCode)))));
};
exports.default = NextStepDisplay;
//# sourceMappingURL=NextStepDisplay.js.map