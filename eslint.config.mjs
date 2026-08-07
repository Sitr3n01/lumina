import js from "@eslint/js";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["frontend/src/**/*.{js,jsx}"],
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/jsx-no-target-blank": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "error",
      "no-duplicate-imports": "error",
      "no-var": "error",
      "prefer-const": "error",
      eqeqeq: ["error", "always"],
    },
  },
  {
    // Processo principal do Electron: Node/CommonJS, não navegador.
    //
    // `electron/` estava inteiro em `ignores` — cerca de 2.900 linhas sem lint nenhum,
    // e é o código mais sensível do produto: é onde moram a allowlist de navegação, o
    // `shell.openExternal`, os handlers de IPC e o auto-update. O `quality-gate.config.cjs`
    // já listava `electron/**/*.js` em `files.include`, então o portão contava estes
    // arquivos para tamanho enquanto o lint não os enxergava.
    files: ["electron/**/*.{js,cjs}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        ...globals.node,
        ...globals.commonjs,
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-debugger": "error",
      "no-duplicate-imports": "error",
      "no-var": "error",
      "prefer-const": "error",
      // `null: "ignore"` porque `value == null` é o idioma deliberado para "nulo OU
      // indefinido". Trocar por `===` aqui não é rigor, é regressão: passaria a deixar
      // `undefined` escapar por dois guardas de sanitização.
      eqeqeq: ["error", "always", { null: "ignore" }],
      // `.catch(() => { })` é intencional em telemetria e em atualização de splash:
      // a falha não tem tratamento útil e não pode derrubar o fluxo.
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  {
    // Scripts do portão de qualidade: Node/CommonJS, sem dependências externas.
    files: ["scripts/quality/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        ...globals.node,
        ...globals.commonjs,
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-var": "error",
      "prefer-const": "error",
      eqeqeq: ["error", "always", { null: "ignore" }],
    },
  },
  {
    // O renderer do wizard roda no navegador, com o preload expondo `wizardAPI`.
    files: ["electron/wizard/wizard.js"],
    languageOptions: {
      sourceType: "script",
      globals: {
        ...globals.browser,
        wizardAPI: "readonly",
      },
    },
    rules: {
      // As funções de topo deste arquivo SÃO usadas — por `onclick=` e `oninput=` em
      // `wizard.html`, que o ESLint não lê. São 16 handlers inline. Tratar o aviso
      // "definida mas nunca usada" como verdade e apagá-las quebraria o wizard inteiro.
      "no-unused-vars": ["warn", { args: "after-used", varsIgnorePattern: ".*" }],
    },
  },
  {
    ignores: [
      "frontend/dist/",
      "frontend/node_modules/",
      "node_modules/",
      "*.config.js",
    ],
  },
];
