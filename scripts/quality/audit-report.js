'use strict';
/**
 * Gera `reports/audit/npm-audit.json` — o relatório de auditoria que o portão lê.
 *
 * Este projeto tem DOIS manifests: a raiz (Electron, empacotamento) e `frontend/`
 * (React, Vite). `npm audit` só enxerga a árvore do diretório em que roda, então um
 * relatório só nunca cobriu o produto inteiro.
 *
 * O portão lia `reports/audit/npm-audit.json`, um arquivo que ninguém escrevia — os
 * dois que existiam se chamavam `npm-audit-root.json` e `npm-audit-frontend.json`.
 * Com `blockOnMissingReport: false`, a categoria virava o aviso "relatório não
 * encontrado" e o portão seguia, cego para 1 vulnerabilidade CRÍTICA e 5 altas.
 *
 * Aqui os dois são gerados e SOMADOS num arquivo com o nome que o portão espera.
 */

const { execSync } = require('child_process');
const path = require('path');
const { REPO_ROOT, escreverJson, lerJson } = require('./utils');

const NIVEIS = ['info', 'low', 'moderate', 'high', 'critical'];

const ALVOS = [
    { nome: 'root', cwd: REPO_ROOT, saida: 'reports/audit/npm-audit-root.json' },
    { nome: 'frontend', cwd: path.join(REPO_ROOT, 'frontend'), saida: 'reports/audit/npm-audit-frontend.json' },
];

function auditar(alvo) {
    let bruto;
    try {
        bruto = execSync('npm audit --json', { cwd: alvo.cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    } catch (err) {
        // `npm audit` sai com código != 0 quando ENCONTRA vulnerabilidade. O JSON vem
        // no stdout mesmo assim — tratar a saída como falha era descartar exatamente o
        // caso que interessa.
        bruto = err.stdout?.toString() ?? '';
    }
    try {
        const dados = JSON.parse(bruto);
        escreverJson(alvo.saida, dados);
        return dados;
    } catch {
        console.warn(`[audit] não foi possível parsear a saída de ${alvo.nome}`);
        return null;
    }
}

function main() {
    const contagens = Object.fromEntries([...NIVEIS, 'total'].map((n) => [n, 0]));
    const vulnerabilities = {};
    const fontes = [];

    for (const alvo of ALVOS) {
        const dados = auditar(alvo) || lerJson(alvo.saida);
        if (!dados?.metadata?.vulnerabilities) continue;
        const v = dados.metadata.vulnerabilities;
        for (const nivel of NIVEIS) contagens[nivel] += v[nivel] || 0;
        contagens.total += v.total ?? NIVEIS.reduce((s, n) => s + (v[n] || 0), 0);
        // Prefixa o nome do pacote com o manifest para não colidir entre as árvores.
        for (const [nome, info] of Object.entries(dados.vulnerabilities || {})) {
            vulnerabilities[`${alvo.nome}:${nome}`] = info;
        }
        fontes.push(alvo.nome);
    }

    escreverJson('reports/audit/npm-audit.json', {
        mergedFrom: fontes,
        metadata: { vulnerabilities: contagens },
        vulnerabilities,
    });

    const resumo = NIVEIS.filter((n) => contagens[n] > 0).map((n) => `${contagens[n]} ${n}`).join(', ') || 'nenhuma';
    console.log(`auditoria (${fontes.join(' + ')}): ${resumo}`);
    console.log('gerado  reports/audit/npm-audit.json');
    return 0;
}

if (require.main === module) process.exit(main());
