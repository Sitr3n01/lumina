'use strict';
/**
 * Utilitários compartilhados do portão de qualidade.
 *
 * Sem dependências externas de propósito: o portão precisa rodar em CI antes de
 * qualquer `npm ci` opcional dar errado, e uma dependência a mais é uma forma a
 * mais de o portão falhar por motivo que não é qualidade.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

const paraRepo = (...partes) => path.join(REPO_ROOT, ...partes);

/** Lê JSON, devolvendo `null` se o arquivo não existe ou não parseia. */
function lerJson(caminhoRelativo) {
    const completo = path.isAbsolute(caminhoRelativo) ? caminhoRelativo : paraRepo(caminhoRelativo);
    try {
        return JSON.parse(fs.readFileSync(completo, 'utf8'));
    } catch {
        return null;
    }
}

function escreverJson(caminhoRelativo, valor) {
    const completo = paraRepo(caminhoRelativo);
    fs.mkdirSync(path.dirname(completo), { recursive: true });
    fs.writeFileSync(completo, `${JSON.stringify(valor, null, 2)}\n`, 'utf8');
}

function escreverTexto(caminhoRelativo, texto) {
    const completo = paraRepo(caminhoRelativo);
    fs.mkdirSync(path.dirname(completo), { recursive: true });
    fs.writeFileSync(completo, texto, 'utf8');
}

function existe(caminhoRelativo) {
    return fs.existsSync(paraRepo(caminhoRelativo));
}

/**
 * Converte um glob no estilo `app/**\/*.py` em RegExp.
 *
 * Suporta o subconjunto que a configuração usa: `**`, `*`, `?` e `{a,b}`. A ordem
 * das substituições importa — `**` tem de ser consumido antes de `*`, senão o
 * segundo padrão come o primeiro e `**` passa a não cruzar diretórios.
 */
function globParaRegex(glob) {
    let saida = '';
    for (let i = 0; i < glob.length; i += 1) {
        const c = glob[i];
        if (c === '*') {
            if (glob[i + 1] === '*') {
                // `**/` cruza zero ou mais diretórios; `**` sozinho come o resto.
                if (glob[i + 2] === '/') {
                    saida += '(?:.*/)?';
                    i += 2;
                } else {
                    saida += '.*';
                    i += 1;
                }
            } else {
                saida += '[^/]*';
            }
        } else if (c === '?') {
            saida += '[^/]';
        } else if (c === '{') {
            const fim = glob.indexOf('}', i);
            if (fim === -1) {
                saida += '\\{';
            } else {
                const alternativas = glob.slice(i + 1, fim).split(',');
                saida += `(?:${alternativas.map((a) => a.replace(/[.+^${}()|[\]\\]/g, '\\$&')).join('|')})`;
                i = fim;
            }
        } else if ('.+^$()|[]\\'.includes(c)) {
            saida += `\\${c}`;
        } else {
            saida += c;
        }
    }
    return new RegExp(`^${saida}$`);
}

function criarMatcher(padroes) {
    const regexes = padroes.map(globParaRegex);
    return (caminho) => regexes.some((r) => r.test(caminho));
}

/** Caminhos sempre com `/`, para que os globs funcionem igual no Windows. */
const normalizar = (p) => p.split(path.sep).join('/');

/**
 * Lista arquivos do repositório que casam com `include` e não com `exclude`.
 *
 * Anda o disco em vez de perguntar ao git: o portão precisa medir a árvore de
 * trabalho, que é o que a pessoa acabou de mudar, e não o índice.
 */
function listarArquivos(include, exclude) {
    const casaInclude = criarMatcher(include);
    const casaExclude = criarMatcher(exclude);
    const encontrados = [];

    // Poda diretórios inteiros que o exclude já condena. Sem isso a varredura
    // desce em `node_modules` e `venv` — dezenas de milhares de arquivos — só
    // para descartar cada um no fim.
    const podados = new Set(['node_modules', 'venv', '.git', 'dist', 'build', 'release', '__pycache__']);

    const andar = (dirAbsoluto, prefixo) => {
        let entradas;
        try {
            entradas = fs.readdirSync(dirAbsoluto, { withFileTypes: true });
        } catch {
            return;
        }
        for (const entrada of entradas) {
            const relativo = prefixo ? `${prefixo}/${entrada.name}` : entrada.name;
            if (entrada.isDirectory()) {
                if (podados.has(entrada.name)) continue;
                if (casaExclude(`${relativo}/`)) continue;
                andar(path.join(dirAbsoluto, entrada.name), relativo);
            } else if (entrada.isFile()) {
                if (casaInclude(relativo) && !casaExclude(relativo)) encontrados.push(relativo);
            }
        }
    };

    andar(REPO_ROOT, '');
    return encontrados.sort();
}

function contarLinhas(caminhoRelativo) {
    try {
        const conteudo = fs.readFileSync(paraRepo(caminhoRelativo), 'utf8');
        if (conteudo === '') return 0;
        // Não conta uma linha fantasma quando o arquivo termina em newline.
        return conteudo.split('\n').length - (conteudo.endsWith('\n') ? 1 : 0);
    } catch {
        return 0;
    }
}

function git(args) {
    try {
        return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch {
        return null;
    }
}

function temGit() {
    return git(['rev-parse', '--is-inside-work-tree']) === 'true';
}

function ramoAtual() {
    return git(['rev-parse', '--abbrev-ref', 'HEAD']);
}

/**
 * Arquivos mudados em relação à base de comparação.
 *
 * Tenta várias bases porque o portão roda em contextos diferentes: no CI existe
 * `origin/main`, num clone raso pode não existir, e localmente a pessoa pode
 * estar em cima de `main` sem remoto configurado. Devolve junto a estratégia
 * usada, para que o relatório diga de onde os números vieram em vez de mostrar
 * uma lista vazia sem explicação.
 */
function arquivosMudados() {
    const candidatos = ['origin/main', 'origin/master', 'main', 'master'];
    for (const base of candidatos) {
        if (git(['rev-parse', '--verify', '--quiet', base]) === null) continue;
        const merge = git(['merge-base', base, 'HEAD']);
        if (!merge) continue;
        const saida = git(['diff', '--name-only', `${merge}..HEAD`]);
        const adicionados = git(['diff', '--name-only', '--diff-filter=A', `${merge}..HEAD`]);
        if (saida === null) continue;
        return {
            estrategia: `${base}...HEAD`,
            mudados: saida ? saida.split('\n').filter(Boolean).map(normalizar) : [],
            adicionados: adicionados ? adicionados.split('\n').filter(Boolean).map(normalizar) : [],
        };
    }
    return { estrategia: 'indisponível', mudados: [], adicionados: [] };
}

/** Detecta a pilha para o bloco `stack` do relatório. */
function detectarStack() {
    const raiz = lerJson('package.json') || {};
    const deps = { ...(raiz.dependencies || {}), ...(raiz.devDependencies || {}) };
    let gerenciador = 'npm';
    if (existe('pnpm-lock.yaml')) gerenciador = 'pnpm';
    else if (existe('yarn.lock')) gerenciador = 'yarn';

    let runner = null;
    for (const nome of ['vitest', 'jest', 'mocha']) if (deps[nome]) runner = nome;
    if (!runner && existe('pyproject.toml')) runner = 'pytest';

    return {
        packageManager: gerenciador,
        testRunner: runner,
        eslint: existe('eslint.config.mjs') || existe('eslint.config.js') || existe('.eslintrc.json'),
        typescript: existe('tsconfig.json'),
        unity: existe('ProjectSettings/ProjectVersion.txt'),
        python: existe('pyproject.toml') || existe('requirements.txt'),
        hasGit: temGit(),
    };
}

function carregarConfig() {
    return require(paraRepo('quality', 'quality-gate.config.cjs'));
}

module.exports = {
    REPO_ROOT,
    paraRepo,
    lerJson,
    escreverJson,
    escreverTexto,
    existe,
    globParaRegex,
    criarMatcher,
    normalizar,
    listarArquivos,
    contarLinhas,
    git,
    temGit,
    ramoAtual,
    arquivosMudados,
    detectarStack,
    carregarConfig,
};
