// Quality Gate configuration
//
// This file controls the deterministic quality gate. Each section maps to a
// collector under `scripts/quality/`. The gate is opinionated by default but
// every threshold here is overridable per-project.
//
// Modes (see quality-gate.js):
//   - report:   collect + write JSON/MD, always exit 0
//   - check:    collect + compare against baseline.json, exit 1 if blocking regression
//   - baseline: collect current metrics and overwrite quality/baseline.json
//
// Ratchet rule: a metric is allowed to *improve* freely, but new regressions
// against the committed baseline are blocking. This lets legacy projects
// adopt the gate without first becoming perfect.

module.exports = {
  // "auto" lets utils.detectStack() decide. Override with one of:
  //   "node", "node-ts", "unity", "python", "mixed"
  projectType: "auto",

  coverage: {
    enabled: true,
    mode: "ratchet",
    allowDecrease: false,
    // Só o que o coverage.py de fato produz. `functions` ele nunca emite, e
    // `branches` só com `--cov-branch`. Pedir as quatro gerava dois avisos
    // permanentes de "métrica ausente" que não descreviam problema nenhum — e
    // aviso que sempre aparece é aviso que ninguém lê.
    metrics: ["lines", "statements"],

    // Absolute coverage minimums are opt-in to keep the template
    // legacy-friendly. Set `enabled: true` to apply them, and choose
    // `severity: "warning"` (advisory) or `severity: "blocking"` (strict).
    // Ratchet coverage still applies regardless — coverage must not drop
    // against the committed baseline.
    minimums: {
      enabled: false,
      severity: "warning",
      lines: 80,
      statements: 80,
      functions: 80,
      branches: 70,
    },
    minimumDeltaToReport: 0.01,
    blockOnMissingCoverageFile: false,
    // O pytest-cov escreve o formato do coverage.py aqui. Os dois caminhos do
    // istanbul continuam na lista para o dia em que o frontend ganhar testes.
    coverageSummaryPaths: [
      "reports/coverage-python.json",
      "coverage/coverage-summary.json",
      "coverage/coverage-final.json",
    ],
  },

  audit: {
    enabled: true,
    // Escrito por `npm run audit:report`, que SOMA a árvore da raiz e a do
    // frontend. Antes este caminho não existia — os relatórios reais tinham
    // outro nome — e o portão passava com aviso de "relatório não encontrado"
    // enquanto havia 1 vulnerabilidade crítica ao lado.
    npmAuditJsonPath: "reports/audit/npm-audit.json",
    // "high" bloqueia junto com "critical": a dívida foi zerada nesta rodada
    // (Electron 28→43, electron-builder 24→26, Vite 5→8), e o portão existe
    // para impedir que ela volte.
    blockLevels: ["critical", "high"],
    warnLevels: ["moderate"],
    infoLevels: ["low"],
    blockOnMissingReport: true,
  },

  lint: {
    enabled: true,
    mode: "ratchet",
    allowNewErrors: false,
    allowNewWarnings: false,
    // Lint errors increasing is always blocking. Warnings are advisory by
    // default so legacy projects with existing warning debt can adopt the
    // gate without first paying it down. Set to "blocking" for strict mode.
    warningIncreaseSeverity: "warning",
    eslintJsonPath: "reports/eslint/eslint.json",
    blockOnMissingReport: false,
  },

  duplication: {
    enabled: true,
    mode: "ratchet",
    allowIncrease: false,

    // Absolute duplication maximum is advisory by default to keep the
    // template legacy-friendly. Ratchet (`allowIncrease: false`) still
    // blocks increases against baseline. Set `severity: "blocking"` to
    // refuse PRs while duplication is above the recommended ceiling.
    maximum: {
      enabled: true,
      severity: "warning",
      percentage: 3.0,
    },

    jscpdJsonPaths: [
      "reports/duplication/jscpd-report.json",
      "reports/duplication/jscpd.json",
    ],
    blockOnMissingReport: false,
  },

  files: {
    enabled: true,
    include: [
      "app/**/*.py",
      "tests/**/*.py",
      "scripts/**/*.py",
      "frontend/src/**/*.js",
      "frontend/src/**/*.jsx",
      "electron/**/*.js",
      "electron/**/*.cjs",
    ],
    exclude: [
      "node_modules/**",
      "frontend/node_modules/**",
      "venv/**",
      "dist/**",
      "build/**",
      "coverage/**",
      "reports/**",
      ".git/**",
      "Library/**",
      "Temp/**",
      "obj/**",
      "bin/**",
    ],
    warnLines: 500,
    maxLinesNewFile: 800,
    maxLinesExistingFile: 1200,
    blockIfOversizedFileGrows: true,
  },

  complexity: {
    enabled: true,
    eslintJsonPath: "reports/complexity/eslint-complexity.json",
    maxDepth: 4,
    maxCyclomaticComplexity: 10,
    maxFunctionLines: 80,
    blockOnRegression: true,
    heuristicFallback: true,
  },

  pullRequest: {
    maxChangedFilesWarning: 30,
    maxChangedLinesWarning: 800,
    maxChangedLinesBlock: 1500,
  },

  aiReview: {
    enabled: true,
    aiIsNeverAuthoritative: true,
    blockOnlyDeterministicFindings: true,
  },
};
