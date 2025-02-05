"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const WelcomeScreen = ({ onSubmit }) => {
    const [apiConfiguration, setApiConfiguration] = (0, react_1.useState)({
        provider: 'anthropic',
        apiKey: ''
    });
    const handleSubmit = () => {
        if (apiConfiguration.apiKey) {
            onSubmit(apiConfiguration);
        }
    };
    return (react_1.default.createElement("div", { className: "w-full max-w-xl mx-auto p-4" },
        react_1.default.createElement("div", { className: "bg-white rounded-lg shadow p-6 space-y-4" },
            react_1.default.createElement("div", null,
                react_1.default.createElement("label", { className: "block text-sm font-medium mb-2 text-gray-700" }, "API Provider"),
                react_1.default.createElement("select", { value: apiConfiguration.provider, onChange: (e) => setApiConfiguration(prev => ({ ...prev, provider: e.target.value })), className: "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" },
                    react_1.default.createElement("option", { value: "anthropic" }, "Anthropic"))),
            react_1.default.createElement("div", null,
                react_1.default.createElement("label", { className: "block text-sm font-medium mb-2 text-gray-700" }, "Anthropic API Key"),
                react_1.default.createElement("input", { type: "password", value: apiConfiguration.apiKey, onChange: (e) => setApiConfiguration(prev => ({ ...prev, apiKey: e.target.value })), placeholder: "Enter API Key...", className: "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" }),
                react_1.default.createElement("p", { className: "text-sm text-gray-500 mt-1" }, "This key is stored locally and only used to make API requests from this extension.")))));
};
exports.default = WelcomeScreen;
//# sourceMappingURL=WelcomeView.js.map