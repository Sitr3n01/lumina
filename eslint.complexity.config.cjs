// Config dedicada à medição de COMPLEXIDADE, separada do lint do dia a dia.
//
// Existe à parte porque as três regras abaixo são métricas de portão, não estilo:
// a saída JSON vira `reports/complexity/eslint-complexity.json` e é comparada com a
// baseline. Misturá-las no `eslint.config.mjs` faria toda função longa virar ruído no
// lint normal, e ruído que ninguém lê acaba sendo desligado.
//
// A versão anterior mirava `scripts/quality/**/*.js` — um diretório que NÃO existia no
// repositório. Zero arquivos analisados, zero violações, e o portão reportava
// "Complexidade: Aprovado". Passava por vacuidade, não por mérito.

const globals = require("globals");

const REGRAS = {
  complexity: ["warn", { max: 10 }],
  "max-depth": ["warn", 4],
  "max-lines-per-function": ["warn", { max: 80, skipBlankLines: true, skipComments: true }],
};

module.exports = [
  {
    // Frontend React: módulos ES com JSX, rodando no navegador.
    files: ["frontend/src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: REGRAS,
  },
  {
    // Processo principal do Electron e os scripts do portão: Node/CommonJS.
    files: ["electron/**/*.{js,cjs}", "scripts/quality/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: { ...globals.node, ...globals.commonjs },
    },
    rules: REGRAS,
  },
  {
    // Renderer do wizard: navegador, sem bundler, com `wizardAPI` vindo do preload.
    files: ["electron/wizard/wizard.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: { ...globals.browser, wizardAPI: "readonly" },
    },
    rules: REGRAS,
  },
  {
    ignores: ["frontend/dist/", "frontend/node_modules/", "node_modules/", "venv/", "reports/"],
  },
];
