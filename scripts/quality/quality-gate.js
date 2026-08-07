'use strict';
/**
 * Portão de qualidade — comparação contra a baseline, veredito e relatórios.
 *
 * Modos:
 *   report    coleta e escreve JSON/MD. SEMPRE sai 0.
 *   check     coleta, compara com a baseline, sai 1 se houver regressão bloqueante.
 *   baseline  grava o estado atual em quality/baseline.json.
 *
 * Regra do ratchet: melhorar é livre; regredir contra a baseline bloqueia. É o que
 * permite um projeto legado adotar o portão sem antes ficar perfeito.
 */

const { carregarConfig, detectarStack, escreverJson, escreverTexto, lerJson, ramoAtual } = require('./utils');
const { coletarTudo, NIVEIS } = require('./collect');

const BASELINE_PATH = 'quality/baseline.json';

const BASELINE_VAZIA = {
    schemaVersion: 1,
    generatedAt: null,
    source: 'missing-baseline-file',
    coverage: { lines: null, statements: null, functions: null, branches: null },
    audit: { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 },
    duplication: { percentage: null, fragments: null, duplicatedLines: null },
    eslint: { errors: null, warnings: null, ruleViolations: {} },
    files: { oversizedFiles: [], maxLines: null, fileLineCounts: {} },
    complexity: { maxDepthViolations: null, complexityViolations: null, longFunctionViolations: null },
};

const pct = (v) => (typeof v === 'number' ? `${v.toFixed(2)}%` : 'n/d');

// --------------------------------------------------------------------------- //
// Comparação
// --------------------------------------------------------------------------- //

function compararCobertura(config, atual, baseline, achados) {
    if (!config.coverage.enabled) return;
    const c = config.coverage;
    if (!atual.available) {
        for (const w of atual.warnings) achados.push({ type: 'coverage-missing', ...w });
        if (c.blockOnMissingCoverageFile) {
            achados.push({ type: 'coverage-missing', severity: 'blocking', message: 'Relatório de cobertura ausente.' });
        }
        return;
    }

    for (const metrica of c.metrics) {
        const base = baseline.coverage?.[metrica] ?? null;
        const agora = atual.metrics?.[metrica] ?? null;

        if (agora === null) {
            achados.push({
                type: 'coverage-metric-missing',
                severity: 'warning',
                metric: metrica,
                message: `A cobertura não reporta "${metrica}" (formato ${atual.format}).`,
                recommendation:
                    metrica === 'branches'
                        ? 'Rode o pytest com `--cov-branch` para medir ramos.'
                        : `Remova "${metrica}" de coverage.metrics — o formato atual não produz esta métrica.`,
            });
            continue;
        }
        if (base === null) {
            achados.push({ type: 'coverage-no-baseline', severity: 'warning', metric: metrica, current: agora, message: `Sem baseline de cobertura para "${metrica}"; atual ${pct(agora)}.` });
            continue;
        }

        if (c.minimums?.enabled && typeof c.minimums[metrica] === 'number' && agora < c.minimums[metrica]) {
            achados.push({
                type: 'coverage-below-minimum',
                severity: c.minimums.severity === 'blocking' ? 'blocking' : 'warning',
                metric: metrica,
                current: agora,
                minimum: c.minimums[metrica],
                message: `Cobertura de "${metrica}" em ${pct(agora)}, abaixo do mínimo de ${pct(c.minimums[metrica])}.`,
                recommendation: 'Adicione testes para o código novo.',
            });
        }

        const delta = Number((agora - base).toFixed(2));
        if (!c.allowDecrease && agora < base - c.minimumDeltaToReport) {
            achados.push({
                type: 'coverage-drop',
                severity: 'blocking',
                metric: metrica,
                baseline: base,
                current: agora,
                delta,
                message: `Cobertura de "${metrica}" caiu de ${pct(base)} para ${pct(agora)}.`,
                recommendation: 'Adicione testes para o comportamento alterado, ou reverta a mudança.',
            });
        } else if (agora >= base + c.minimumDeltaToReport) {
            achados.push({ type: 'coverage-improved', severity: 'info', metric: metrica, baseline: base, current: agora, delta, message: `Cobertura de "${metrica}" subiu de ${pct(base)} para ${pct(agora)}.` });
        }
    }
}

function compararAudit(config, atual, achados) {
    if (!config.audit.enabled) return;
    if (!atual.available) {
        for (const w of atual.warnings) achados.push({ type: 'audit-missing', ...w });
        if (config.audit.blockOnMissingReport) achados.push({ type: 'audit-missing', severity: 'blocking', message: 'Relatório de auditoria ausente.' });
        return;
    }
    const severidadePorNivel = (nivel) => {
        if ((config.audit.blockLevels || []).includes(nivel)) return 'blocking';
        if ((config.audit.warnLevels || []).includes(nivel)) return 'warning';
        return 'info';
    };
    for (const nivel of NIVEIS) {
        const n = atual.counts[nivel] || 0;
        if (n === 0) continue;
        achados.push({
            type: 'audit-vulnerability',
            severity: severidadePorNivel(nivel),
            level: nivel,
            count: n,
            message: `${n} vulnerabilidade(s) de severidade "${nivel}".`,
            recommendation: 'Rode `npm audit fix`; se exigir major, atualize a dependência deliberadamente.',
        });
    }
}

function compararDuplicacao(config, atual, baseline, achados) {
    if (!config.duplication.enabled) return;
    if (!atual.available) {
        for (const w of atual.warnings) achados.push({ type: 'duplication-missing', ...w });
        if (config.duplication.blockOnMissingReport) achados.push({ type: 'duplication-missing', severity: 'blocking', message: 'Relatório de duplicação ausente.' });
        return;
    }
    const max = config.duplication.maximum;
    if (max?.enabled && atual.percentage > max.percentage) {
        achados.push({
            type: 'duplication-over-maximum',
            severity: max.severity === 'blocking' ? 'blocking' : 'warning',
            current: atual.percentage,
            maximum: max.percentage,
            message: `Duplicação em ${pct(atual.percentage)}, acima do teto de ${pct(max.percentage)}.`,
            recommendation: 'Extraia o trecho repetido para um módulo compartilhado.',
        });
    }
    const base = baseline.duplication?.percentage ?? null;
    if (base === null) {
        achados.push({ type: 'duplication-no-baseline', severity: 'warning', current: atual.percentage, message: `Sem baseline de duplicação; atual ${pct(atual.percentage)}.` });
        return;
    }
    if (!config.duplication.allowIncrease && atual.percentage > base) {
        achados.push({
            type: 'duplication-increase',
            severity: 'blocking',
            baseline: base,
            current: atual.percentage,
            delta: Number((atual.percentage - base).toFixed(2)),
            message: `Duplicação subiu de ${pct(base)} para ${pct(atual.percentage)}.`,
            recommendation: 'Extraia o trecho repetido em vez de copiá-lo.',
        });
    } else if (atual.percentage < base) {
        achados.push({ type: 'duplication-improved', severity: 'info', baseline: base, current: atual.percentage, message: `Duplicação caiu de ${pct(base)} para ${pct(atual.percentage)}.` });
    }
}

function compararLint(config, atual, baseline, achados) {
    if (!config.lint.enabled) return;
    if (!atual.available) {
        // `collectorWarnings`, não `warnings`: neste coletor `warnings` é a contagem.
        for (const w of atual.collectorWarnings || []) achados.push({ type: 'lint-missing', ...w });
        if (config.lint.blockOnMissingReport) achados.push({ type: 'lint-missing', severity: 'blocking', message: 'Relatório de lint ausente.' });
        return;
    }
    const baseErros = baseline.eslint?.errors ?? null;
    const baseAvisos = baseline.eslint?.warnings ?? null;

    if (baseErros === null) {
        achados.push({ type: 'lint-no-baseline', severity: 'warning', message: `Sem baseline de lint; atual: ${atual.errors} erro(s) e ${atual.warnings} aviso(s).` });
        return;
    }
    if (!config.lint.allowNewErrors && atual.errors > baseErros) {
        achados.push({
            type: 'lint-errors-increase',
            severity: 'blocking',
            baseline: baseErros,
            current: atual.errors,
            message: `Erros de lint subiram de ${baseErros} para ${atual.errors}.`,
            recommendation: 'Corrija os erros novos; erro de lint é defeito, não estilo.',
        });
    } else if (atual.errors < baseErros) {
        achados.push({ type: 'lint-errors-improved', severity: 'info', baseline: baseErros, current: atual.errors, message: `Erros de lint caíram de ${baseErros} para ${atual.errors}.` });
    }
    if (!config.lint.allowNewWarnings && baseAvisos !== null && atual.warnings > baseAvisos) {
        achados.push({
            type: 'lint-warnings-increase',
            severity: config.lint.warningIncreaseSeverity === 'blocking' ? 'blocking' : 'warning',
            baseline: baseAvisos,
            current: atual.warnings,
            message: `Avisos de lint subiram de ${baseAvisos} para ${atual.warnings}.`,
        });
    }
}

function compararArquivos(config, atual, baseline, achados) {
    if (!config.files.enabled || !atual.available) return;
    const baseContagens = baseline.files?.fileLineCounts || {};
    const adicionados = new Set(atual.addedFiles || []);

    for (const { file, lines } of atual.oversizedFiles) {
        const base = baseContagens[file];
        if (base === undefined) {
            achados.push({ type: 'oversized-file-no-baseline', severity: 'warning', file, currentLines: lines, message: `Arquivo grande ${file} (${lines} linhas) não está na baseline.` });
        } else if (lines > base && config.files.blockIfOversizedFileGrows) {
            achados.push({
                type: 'oversized-file-grew',
                severity: 'blocking',
                file,
                baselineLines: base,
                currentLines: lines,
                delta: lines - base,
                message: `O arquivo já grande ${file} cresceu de ${base} para ${lines} linhas.`,
                recommendation: 'Coloque o código novo num módulo separado e menor.',
            });
        } else {
            achados.push({ type: 'oversized-file-stable', severity: 'info', file, currentLines: lines, message: `${file} continua grande (${lines} linhas), mas não cresceu.` });
        }
    }

    for (const file of adicionados) {
        const lines = atual.fileLineCounts[file];
        if (lines === undefined || lines <= config.files.maxLinesNewFile) continue;

        // Um arquivo que a baseline JÁ registra não é novo para o portão, mesmo que o
        // `git diff` contra main ainda o veja como adicionado. Sem esta condição o
        // mesmo arquivo era simultaneamente "estado aceito" e "novo e proibido", e o
        // portão ficava permanentemente vermelho num branch sem ter o que corrigir —
        // o tipo de reprovação que ensina a ignorar o portão.
        //
        // A regra continua valendo para o que interessa: um arquivo criado DEPOIS da
        // baseline não está em `fileLineCounts` e segue bloqueando.
        if (Object.prototype.hasOwnProperty.call(baseContagens, file)) {
            achados.push({
                type: 'oversized-file-accepted',
                severity: 'info',
                file,
                currentLines: lines,
                message: `${file} (${lines} linhas) já consta na baseline como dívida aceita.`,
            });
            continue;
        }

        achados.push({
            type: 'new-file-oversized',
            severity: 'blocking',
            file,
            currentLines: lines,
            limit: config.files.maxLinesNewFile,
            message: `O arquivo NOVO ${file} nasce com ${lines} linhas, acima do limite de ${config.files.maxLinesNewFile}.`,
            recommendation: 'Divida-o antes de mesclar — arquivo novo não tem desculpa de legado.',
        });
    }

    for (const { file, lines } of atual.nearLimitFiles.slice(0, 10)) {
        achados.push({ type: 'file-near-limit', severity: 'warning', file, currentLines: lines, warnAt: config.files.warnLines, message: `${file} tem ${lines} linhas, perto do limite de aviso de ${config.files.warnLines}.` });
    }
}

function compararComplexidade(config, atual, baseline, achados) {
    if (!config.complexity.enabled) return;
    for (const w of atual.warnings || []) achados.push({ type: 'complexity-collector', ...w });

    const chaves = [
        ['maxDepthViolations', 'profundidade'],
        ['complexityViolations', 'complexidade ciclomática'],
        ['longFunctionViolations', 'função longa'],
    ];
    for (const [chave, rotulo] of chaves) {
        const agora = atual[chave];
        const base = baseline.complexity?.[chave] ?? null;
        if (agora === null || agora === undefined) continue;
        if (base === null) {
            if (agora > 0) achados.push({ type: 'complexity-no-baseline', severity: 'info', metric: chave, current: agora, message: `Sem baseline de ${rotulo}; atual ${agora}.` });
            continue;
        }
        if (agora > base) {
            achados.push({
                type: 'complexity-increase',
                severity: config.complexity.blockOnRegression ? 'blocking' : 'warning',
                metric: chave,
                baseline: base,
                current: agora,
                message: `Violações de ${rotulo} subiram de ${base} para ${agora}.`,
                recommendation: 'Extraia funções auxiliares em vez de aprofundar a existente.',
            });
        }
    }
}

// --------------------------------------------------------------------------- //
// Relatório
// --------------------------------------------------------------------------- //

function renderMarkdown(relatorio) {
    const l = [];
    const rotuloStatus = { passed: 'Aprovado', warning: 'Aviso', failed: 'Reprovado' }[relatorio.status];
    l.push('## Portão de qualidade', '', `**Status:** ${rotuloStatus}`, '');

    const categoria = (nome, chave) => {
        const bloqueia = relatorio.regressions.some((r) => r.type.startsWith(chave));
        const avisa = relatorio.warnings.some((r) => r.type.startsWith(chave));
        return `| ${nome} | ${bloqueia ? 'Reprovado' : avisa ? 'Aviso' : 'Aprovado'} |`;
    };
    l.push('### Resumo', '', '| Categoria | Resultado |', '|---|---|');
    l.push(categoria('Cobertura', 'coverage'), categoria('Auditoria', 'audit'), categoria('Duplicação', 'duplication'));
    l.push(categoria('Lint', 'lint'), categoria('Tamanho de arquivo', 'oversized'), categoria('Complexidade', 'complexity'));
    l.push('');

    const c = relatorio.current;
    l.push('### Números', '', '| Métrica | Valor |', '|---|---|');
    if (c.coverage.available) l.push(`| Cobertura (linhas) | ${pct(c.coverage.metrics.lines)} |`);
    if (c.audit.available) l.push(`| Vulnerabilidades | ${c.audit.counts.critical} crítica(s), ${c.audit.counts.high} alta(s), ${c.audit.counts.moderate} moderada(s) |`);
    if (c.duplication.available) l.push(`| Duplicação | ${pct(c.duplication.percentage)} |`);
    if (c.eslint.available) l.push(`| Lint | ${c.eslint.errors} erro(s), ${c.eslint.warnings} aviso(s) |`);
    if (c.files.available) l.push(`| Arquivos analisados | ${c.files.totalFiles} (maior: ${c.files.maxLines} linhas) |`);
    if (c.complexity && !c.complexity.heuristicOnly) l.push(`| Complexidade | ${c.complexity.complexityViolations} ciclomática, ${c.complexity.maxDepthViolations} profundidade, ${c.complexity.longFunctionViolations} função longa |`);
    l.push('');

    l.push('### Regressões bloqueantes', '');
    if (!relatorio.regressions.length) l.push('Nenhuma.');
    else for (const r of relatorio.regressions) l.push(`- ${r.message}`);
    l.push('');

    if (relatorio.warnings.length) {
        l.push('### Avisos', '');
        for (const w of relatorio.warnings) l.push(`- ${w.message}`);
        l.push('');
    }
    if (relatorio.recommendations.length) {
        l.push('### Recomendações', '');
        for (const r of relatorio.recommendations) l.push(`- ${r}`);
        l.push('');
    }
    l.push('---', '', '_Verificações determinísticas são autoritativas; comentário de IA é apenas consultivo._');
    return `${l.join('\n')}\n`;
}

function montarRelatorio(modo) {
    const config = carregarConfig();
    const baseline = lerJson(BASELINE_PATH) || BASELINE_VAZIA;
    const atual = coletarTudo(config);
    const achados = [];

    compararCobertura(config, atual.coverage, baseline, achados);
    compararAudit(config, atual.audit, achados);
    compararDuplicacao(config, atual.duplication, baseline, achados);
    compararLint(config, atual.eslint, baseline, achados);
    compararArquivos(config, atual.files, baseline, achados);
    compararComplexidade(config, atual.complexity, baseline, achados);

    const regressions = achados.filter((a) => a.severity === 'blocking');
    const warnings = achados.filter((a) => a.severity === 'warning');
    const infos = achados.filter((a) => a.severity === 'info');
    const status = regressions.length ? 'failed' : warnings.length ? 'warning' : 'passed';

    return {
        schemaVersion: 1,
        status,
        generatedAt: new Date().toISOString(),
        mode: modo,
        stack: detectarStack(),
        summary: { blocking: regressions.length, warnings: warnings.length, infos: infos.length },
        baseline,
        current: atual,
        regressions,
        warnings,
        infos,
        recommendations: [...new Set([...regressions, ...warnings].map((a) => a.recommendation).filter(Boolean))],
        aiReviewContext: {
            shouldRunAiExplainer: status !== 'passed',
            reason: status === 'failed' ? 'O portão reprovou com regressões bloqueantes.' : status === 'warning' ? 'O portão passou com avisos.' : 'Nada a explicar.',
        },
    };
}

function gravarBaseline() {
    const config = carregarConfig();
    const atual = coletarTudo(config);
    const ramo = ramoAtual();
    if (ramo && !['main', 'master', 'HEAD'].includes(ramo)) {
        console.warn(
            `\nAVISO: você está em "${ramo}", não em main.\n` +
            'Gravar a baseline num branch de trabalho é como o portão deixa de ver uma regressão.\n' +
            'Só faça isso se estiver ADOTANDO o portão pela primeira vez, e num commit próprio.\n',
        );
    }

    const baseline = {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        source: `quality:baseline a partir do branch ${ramo ?? 'desconhecido'}`,
        coverage: atual.coverage.metrics || BASELINE_VAZIA.coverage,
        audit: atual.audit.counts || BASELINE_VAZIA.audit,
        duplication: { percentage: atual.duplication.percentage, fragments: atual.duplication.fragments, duplicatedLines: atual.duplication.duplicatedLines },
        eslint: { errors: atual.eslint.errors, warnings: atual.eslint.warnings, ruleViolations: atual.eslint.ruleViolations || {} },
        files: { oversizedFiles: atual.files.oversizedFiles || [], maxLines: atual.files.maxLines ?? null, fileLineCounts: atual.files.fileLineCounts || {} },
        complexity: {
            maxDepthViolations: atual.complexity.maxDepthViolations ?? null,
            complexityViolations: atual.complexity.complexityViolations ?? null,
            longFunctionViolations: atual.complexity.longFunctionViolations ?? null,
        },
    };
    escreverJson(BASELINE_PATH, baseline);
    console.log(`baseline gravada em ${BASELINE_PATH}`);
    return 0;
}

function main() {
    const modo = process.argv[2] || 'report';

    if (modo === 'baseline') return gravarBaseline();
    if (!['report', 'check'].includes(modo)) {
        console.error(`Modo desconhecido: ${modo}. Use report, check ou baseline.`);
        return 2;
    }

    const relatorio = montarRelatorio(modo);
    escreverJson('reports/quality-gate.json', relatorio);
    escreverTexto('reports/quality-gate.md', renderMarkdown(relatorio));

    console.log(renderMarkdown(relatorio));
    console.log(`relatórios: reports/quality-gate.json e reports/quality-gate.md`);

    // `report` nunca reprova: serve para olhar o estado. Só `check` é portão.
    if (modo === 'check' && relatorio.status === 'failed') return 1;
    return 0;
}

if (require.main === module) process.exit(main());

module.exports = { montarRelatorio, renderMarkdown, BASELINE_VAZIA };
