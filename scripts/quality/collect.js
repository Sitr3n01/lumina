'use strict';
/**
 * Coletores do portão de qualidade.
 *
 * Cada coletor devolve `{ available, ...métricas, source, warnings }`. Nenhum deles
 * decide nada: a comparação com a baseline e a severidade das descobertas moram em
 * `quality-gate.js`. Coletar e julgar são coisas separadas — misturar as duas foi o
 * que deixou o portão anterior "passar" categorias que ele nem tinha lido.
 */

const { lerJson, listarArquivos, contarLinhas, arquivosMudados } = require('./utils');

const aviso = (message, recommendation) => ({ severity: 'warning', message, ...(recommendation ? { recommendation } : {}) });

// --------------------------------------------------------------------------- //
// Cobertura
// --------------------------------------------------------------------------- //

/**
 * Lê cobertura de dois formatos diferentes.
 *
 * O portão nasceu esperando `coverage-summary.json` do istanbul. Este projeto é
 * Python: o pytest-cov escreve o JSON do coverage.py, com `totals.percent_covered`
 * e nenhuma das quatro métricas do istanbul. Procurar só o formato istanbul fazia
 * o coletor responder "nenhum relatório encontrado" com o relatório ali do lado —
 * e cobertura virava um aviso permanente que ninguém mais lia.
 */
function coletarCobertura(config) {
    const caminhos = config.coverage.coverageSummaryPaths || [];
    const warnings = [];

    for (const caminho of caminhos) {
        const dados = lerJson(caminho);
        if (!dados) continue;

        // Formato coverage.py: `{ meta, files, totals }`.
        if (dados.totals && typeof dados.totals.percent_covered === 'number') {
            const t = dados.totals;
            const linhas = Number(t.percent_covered.toFixed(2));
            const metrics = {
                lines: linhas,
                statements: Number((t.percent_statements_covered ?? t.percent_covered).toFixed(2)),
                // coverage.py só produz `branches` com `--cov-branch`, e `functions`
                // nunca. Ausente é `null`, não zero: zero seria uma afirmação falsa e
                // travaria o ratchet no pior valor possível.
                functions: null,
                branches: typeof t.percent_covered_branches === 'number' ? Number(t.percent_covered_branches.toFixed(2)) : null,
            };
            return { available: true, metrics, source: caminho, format: 'coverage.py', warnings };
        }

        // Formato istanbul: `{ total: { lines: { pct }, ... } }`.
        if (dados.total && dados.total.lines) {
            const pct = (m) => (typeof dados.total[m]?.pct === 'number' ? Number(dados.total[m].pct.toFixed(2)) : null);
            return {
                available: true,
                metrics: { lines: pct('lines'), statements: pct('statements'), functions: pct('functions'), branches: pct('branches') },
                source: caminho,
                format: 'istanbul',
                warnings,
            };
        }
    }

    warnings.push(
        aviso(
            `Nenhum relatório de cobertura encontrado em: ${caminhos.join(', ') || '(nenhum caminho configurado)'}.`,
            'Rode `npm run test:coverage:ci`.',
        ),
    );
    return { available: false, metrics: null, source: null, warnings };
}

// --------------------------------------------------------------------------- //
// Auditoria de dependências
// --------------------------------------------------------------------------- //

const NIVEIS = ['info', 'low', 'moderate', 'high', 'critical'];

function coletarAudit(config) {
    const caminhos = [config.audit.npmAuditJsonPath, ...(config.audit.extraAuditJsonPaths || [])].filter(Boolean);
    const counts = Object.fromEntries([...NIVEIS, 'total'].map((n) => [n, 0]));
    const lidos = [];
    const warnings = [];

    for (const caminho of caminhos) {
        const dados = lerJson(caminho);
        if (!dados) continue;
        const v = dados.metadata?.vulnerabilities;
        if (!v) continue;
        for (const nivel of NIVEIS) counts[nivel] += v[nivel] || 0;
        counts.total += v.total ?? NIVEIS.reduce((s, n) => s + (v[n] || 0), 0);
        lidos.push(caminho);
    }

    if (!lidos.length) {
        warnings.push(aviso(`Relatório de auditoria não encontrado em: ${caminhos.join(', ')}.`, 'Rode `npm run audit:report`.'));
        return { available: false, counts, source: null, warnings };
    }
    return { available: true, counts, source: lidos.join(' + '), warnings };
}

// --------------------------------------------------------------------------- //
// Duplicação
// --------------------------------------------------------------------------- //

function coletarDuplicacao(config) {
    const warnings = [];
    for (const caminho of config.duplication.jscpdJsonPaths || []) {
        const dados = lerJson(caminho);
        const total = dados?.statistics?.total;
        if (!total) continue;
        return {
            available: true,
            percentage: Number(Number(total.percentage).toFixed(2)),
            fragments: total.clones ?? dados.duplicates?.length ?? 0,
            duplicatedLines: total.duplicatedLines ?? 0,
            source: caminho,
            warnings,
        };
    }
    warnings.push(aviso('Relatório de duplicação não encontrado.', 'Rode `npm run duplication:ci`.'));
    return { available: false, percentage: null, fragments: null, duplicatedLines: null, source: null, warnings };
}

// --------------------------------------------------------------------------- //
// Lint
// --------------------------------------------------------------------------- //

function coletarEslint(config) {
    const warnings = [];
    const dados = lerJson(config.lint.eslintJsonPath);
    if (!Array.isArray(dados)) {
        warnings.push(aviso(`Relatório do ESLint não encontrado em ${config.lint.eslintJsonPath}.`, 'Rode `npm run lint:report`.'));
        return { available: false, errors: null, warnings: null, ruleViolations: {}, topFiles: [], warningsList: [], collectorWarnings: warnings };
    }

    let errors = 0;
    let avisos = 0;
    const ruleViolations = {};
    const porArquivo = [];

    for (const arquivo of dados) {
        errors += arquivo.errorCount || 0;
        avisos += arquivo.warningCount || 0;
        for (const m of arquivo.messages || []) {
            if (!m.ruleId) continue;
            ruleViolations[m.ruleId] = (ruleViolations[m.ruleId] || 0) + 1;
        }
        const total = (arquivo.errorCount || 0) + (arquivo.warningCount || 0);
        if (total > 0) porArquivo.push({ file: arquivo.filePath, problems: total });
    }

    porArquivo.sort((a, b) => b.problems - a.problems);
    return {
        available: true,
        errors,
        warnings: avisos,
        ruleViolations,
        topFiles: porArquivo.slice(0, 10),
        warningsList: [],
        collectorWarnings: warnings,
    };
}

// --------------------------------------------------------------------------- //
// Tamanho de arquivo
// --------------------------------------------------------------------------- //

function coletarArquivos(config) {
    const { include, exclude, warnLines, maxLinesNewFile, maxLinesExistingFile } = config.files;
    const arquivos = listarArquivos(include, exclude);
    const fileLineCounts = {};
    for (const f of arquivos) fileLineCounts[f] = contarLinhas(f);

    const ordenados = Object.entries(fileLineCounts)
        .map(([file, lines]) => ({ file, lines }))
        .sort((a, b) => b.lines - a.lines);

    const { estrategia, mudados, adicionados } = arquivosMudados();

    return {
        available: true,
        totalFiles: arquivos.length,
        changedFiles: mudados,
        changedFilesStrategy: estrategia,
        addedFiles: adicionados,
        largestFiles: ordenados.slice(0, 10),
        oversizedFiles: ordenados.filter((f) => f.lines > maxLinesExistingFile).map((f) => ({ ...f, limit: maxLinesExistingFile })),
        nearLimitFiles: ordenados.filter((f) => f.lines >= warnLines && f.lines <= maxLinesExistingFile),
        fileLineCounts,
        maxLines: ordenados[0]?.lines ?? 0,
        thresholds: { warnLines, maxLinesNewFile, maxLinesExistingFile },
        warnings: [],
    };
}

// --------------------------------------------------------------------------- //
// Complexidade
// --------------------------------------------------------------------------- //

/**
 * Prefere o relatório do ESLint (AST de verdade). O fallback heurístico conta
 * chaves e regex, e sempre emite um aviso — um número heurístico apresentado sem
 * ressalva vira baseline e passa a valer como se fosse medido.
 */
function coletarComplexidade(config) {
    const warnings = [];
    const dados = lerJson(config.complexity.eslintJsonPath);

    if (Array.isArray(dados)) {
        let maxDepthViolations = 0;
        let complexityViolations = 0;
        let longFunctionViolations = 0;
        const details = [];
        for (const arquivo of dados) {
            for (const m of arquivo.messages || []) {
                if (m.ruleId === 'max-depth') maxDepthViolations += 1;
                else if (m.ruleId === 'complexity') complexityViolations += 1;
                else if (m.ruleId === 'max-lines-per-function') longFunctionViolations += 1;
                else continue;
                if (details.length < 30) details.push({ file: arquivo.filePath, line: m.line, rule: m.ruleId, message: m.message });
            }
        }
        // Um relatório com zero arquivos analisados não é "sem violações": é um
        // config apontando para lugar nenhum. Foi o que fez a categoria passar por
        // vacuidade enquanto lintava um diretório inexistente.
        if (dados.length === 0) {
            warnings.push(
                aviso(
                    'O relatório de complexidade não analisou arquivo nenhum.',
                    'Confira os globs de `eslint.complexity.config.cjs` — provavelmente apontam para um diretório que não existe.',
                ),
            );
        }
        return { heuristicOnly: false, filesAnalyzed: dados.length, maxDepthViolations, complexityViolations, longFunctionViolations, details, warnings };
    }

    if (!config.complexity.heuristicFallback) {
        warnings.push(aviso('Relatório de complexidade ausente e fallback heurístico desligado.', 'Rode `npm run complexity:ci`.'));
        return { heuristicOnly: false, filesAnalyzed: 0, maxDepthViolations: null, complexityViolations: null, longFunctionViolations: null, details: [], warnings };
    }

    warnings.push(
        aviso('Análise de complexidade em modo heurístico.', 'Rode `npm run complexity:ci` para usar o relatório AST do ESLint.'),
    );
    return { heuristicOnly: true, filesAnalyzed: 0, maxDepthViolations: 0, complexityViolations: 0, longFunctionViolations: 0, details: [], warnings };
}

function coletarTudo(config) {
    const eslint = coletarEslint(config);
    return {
        coverage: config.coverage.enabled ? coletarCobertura(config) : { available: false, metrics: null, warnings: [] },
        audit: config.audit.enabled ? coletarAudit(config) : { available: false, counts: {}, warnings: [] },
        duplication: config.duplication.enabled ? coletarDuplicacao(config) : { available: false, warnings: [] },
        // NÃO renomear `collectorWarnings` para `warnings` aqui: no coletor de lint
        // `warnings` já é a CONTAGEM de avisos do ESLint. Sobrescrever trocava o número
        // por um array e o relatório saía com "0 erro(s),  aviso(s)".
        eslint: config.lint.enabled ? eslint : { available: false, collectorWarnings: [] },
        files: config.files.enabled ? coletarArquivos(config) : { available: false, warnings: [] },
        complexity: config.complexity.enabled ? coletarComplexidade(config) : { warnings: [] },
    };
}

module.exports = { coletarTudo, NIVEIS };
