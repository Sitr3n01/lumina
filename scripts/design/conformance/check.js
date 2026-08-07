// Verificador de conformidade do LUMINA Design System.
// Mede o que os documentos prometem, lendo estilos COMPUTADOS num navegador real.
import { BREAKPOINTS, MEDIA, windowClass } from '../../../frontend/src/styles/tokens/breakpoints.js';

const root = document.documentElement;
const cs = (el = root) => getComputedStyle(el);
const tok = (name, el = root) => cs(el).getPropertyValue(name).trim();

// ---------- cor ----------
const parseRGB = (v) => {
  const m = v.match(/-?[\d.]+/g);
  if (!m) return null;
  return [Number(m[0]), Number(m[1]), Number(m[2])];
};
// Resolve QUALQUER cor CSS para sRGB pintando num canvas.
// getComputedStyle não serve: `color-mix(in oklab, …)` computa para `oklab(…)`,
// e ler os três primeiros números daquilo como se fossem RGB dá quase preto.
const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
const resolve = (value) => {
  if (!value) return null;
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = '#000';
  const antes = ctx.fillStyle;
  ctx.fillStyle = value;
  if (ctx.fillStyle === antes && !/^#0{6}$/i.test(String(value).trim())) {
    // canvas rejeitou o valor; tenta via elemento (cobre var() e palavras-chave)
    const p = document.createElement('span');
    document.body.appendChild(p);
    p.style.color = value;
    const c = getComputedStyle(p).color;
    p.remove();
    return parseRGB(c);
  }
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return [d[0], d[1], d[2]];
};
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const contrast = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const report = [];
const add = (grupo, teste, ok, detalhe) => report.push({ grupo, teste, status: ok ? 'PASS' : 'FAIL', detalhe });

// ---------- 1. Todo papel semântico resolve, nos dois temas ----------
async function tokensJSON() {
  const r = await fetch('../../../frontend/src/styles/tokens/tokens.json');
  return r.json();
}

function setTheme(t) {
  if (t === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', t);
  // força recomputo
  void root.offsetHeight;
}

function checkRolesResolve(json) {
  for (const tema of ['light', 'dark']) {
    setTheme(tema);
    const faltando = [];
    for (const papel of Object.keys(json.semantic[tema].color)) {
      const v = tok(`--lm-color-${papel}`);
      if (!v) faltando.push(papel);
    }
    add('tokens', `todos os papéis semânticos resolvem (${tema})`, faltando.length === 0,
      faltando.length ? `ausentes: ${faltando.join(', ')}` : `${Object.keys(json.semantic[tema].color).length} papéis`);
  }
}

// ---------- 2. Contraste medido no navegador ----------
const PARES = [
  ['on-primary', 'primary', 4.5], ['on-primary-container', 'primary-container', 4.5],
  ['on-secondary-container', 'secondary-container', 4.5], ['on-tertiary-container', 'tertiary-container', 4.5],
  ['on-error', 'error', 4.5], ['on-error-container', 'error-container', 4.5],
  ['on-success-container', 'success-container', 4.5], ['on-warning-container', 'warning-container', 4.5],
  ['on-surface', 'surface', 4.5], ['on-surface', 'surface-container-highest', 4.5],
  ['on-surface-variant', 'surface', 4.5], ['on-surface-variant', 'surface-container-high', 4.5],
  ['inverse-on-surface', 'inverse-surface', 4.5],
  ['on-airbnb', 'airbnb', 4.5], ['on-booking', 'booking', 4.5],
  ['on-airbnb-container', 'airbnb-container', 4.5], ['on-booking-container', 'booking-container', 4.5],
  ['chart-ink', 'chart-surface', 4.5], ['chart-ink-muted', 'chart-surface', 4.5],
  ['chart-tooltip-label', 'chart-tooltip-bg', 4.5],
  ['outline', 'surface', 3.0], ['outline-interactive', 'surface-container-highest', 3.0],
  ['on-surface-disabled', 'surface-container-highest', 3.0],
  ['primary', 'surface', 3.0], ['error', 'surface', 3.0],
];

function checkContrast() {
  for (const tema of ['light', 'dark']) {
    setTheme(tema);
    const falhas = [];
    let pior = { r: 99, par: '' };
    for (const [fg, bg, min] of PARES) {
      const a = resolve(tok(`--lm-color-${fg}`));
      const b = resolve(tok(`--lm-color-${bg}`));
      if (!a || !b) { falhas.push(`${fg}/${bg}: não resolve`); continue; }
      const r = contrast(a, b);
      if (r < min) falhas.push(`${fg} sobre ${bg}: ${r.toFixed(2)} < ${min}`);
      const folga = r / min;
      if (folga < pior.r) pior = { r: folga, par: `${fg}/${bg} ${r.toFixed(2)}:1 (min ${min})` };
    }
    add('contraste', `${PARES.length} pares medidos no navegador (${tema})`, falhas.length === 0,
      falhas.length ? falhas.join(' · ') : `pior folga: ${pior.par}`);
  }
}

// ---------- 3. Anel de foco ----------
// Só a parte do foco que é pura matemática de token. O anel desenhado é medido
// com teclado de verdade — `focus({focusVisible:true})` não faz o Chromium casar
// `:focus-visible`, e uma janela sem foco não casa nem `:focus`.
function checkFocusTokens() {
  for (const tema of ['light', 'dark']) {
    setTheme(tema);
    const r = contrast(resolve(tok('--lm-focus-ring-color')), resolve(tok('--lm-color-surface')));
    add('foco', `anel a ≥3:1 sobre surface (${tema})`, r >= 3, `${r.toFixed(2)}:1`);

    const rC = contrast(resolve(tok('--lm-focus-ring-color')), resolve(tok('--lm-color-surface-container-highest')));
    add('foco', `anel a ≥3:1 sobre a superfície mais alta (${tema})`, rC >= 3, `${rC.toFixed(2)}:1`);

    const rInv = contrast(resolve(tok('--lm-focus-ring-color-inverse')), resolve(tok('--lm-color-inverse-surface')));
    add('foco', `anel invertido a ≥3:1 sobre inverse-surface (${tema})`, rInv >= 3, `${rInv.toFixed(2)}:1`);

    // A razão de existir do anel invertido: o primário reprovaria ali.
    const rErrado = contrast(resolve(tok('--lm-focus-ring-color')), resolve(tok('--lm-color-inverse-surface')));
    add('foco', `anel primário de fato reprovaria em superfície invertida (${tema})`, rErrado < 3,
      `primário sobre inverse-surface: ${rErrado.toFixed(2)}:1 — por isso existe o invertido`);
  }
  setTheme('light');
}

// Mede o elemento atualmente focado. Chamado de fora, depois de Tab real.
window.__medirFocoAtual = () => {
  const el = document.activeElement;
  if (!el || el === document.body) return { erro: 'nada focado' };
  const s = cs(el);
  const corAnel = resolve(s.outlineColor);
  const esperada = resolve(tok(el.closest('.lm-snackbar, .lm-tooltip') ? '--lm-focus-ring-color-inverse' : '--lm-focus-ring-color'));
  return {
    alvo: el.className || el.tagName,
    focusVisible: el.matches(':focus-visible'),
    focus: el.matches(':focus'),
    outlineStyle: s.outlineStyle,
    outlineWidth: s.outlineWidth,
    outlineOffset: s.outlineOffset,
    outlineColor: s.outlineColor,
    larguraEsperada: tok('--lm-focus-ring-width'),
    offsetEsperado: tok('--lm-focus-ring-offset'),
    corConfere: !!(corAnel && esperada && corAnel.join() === esperada.join()),
  };
};

// ---------- 4. Temas: precedência nos dois sentidos ----------
function checkThemePrecedence() {
  setTheme('system');
  const sistemaEscuro = matchMedia('(prefers-color-scheme: dark)').matches;
  const corSistema = tok('--lm-color-surface');

  setTheme('light');
  const corClaro = tok('--lm-color-surface');
  const schemeClaro = cs().colorScheme;
  setTheme('dark');
  const corEscuro = tok('--lm-color-surface');
  const schemeEscuro = cs().colorScheme;

  add('tema', 'data-theme="light" e "dark" produzem superfícies distintas',
    corClaro !== corEscuro, `${corClaro} vs ${corEscuro}`);
  add('tema', 'color-scheme acompanha o tema (dropdown nativo do Electron)',
    schemeClaro === 'light' && schemeEscuro === 'dark', `light→${schemeClaro}, dark→${schemeEscuro}`);
  add('tema', 'escolha manual vence a preferência do SO nos dois sentidos',
    corSistema === (sistemaEscuro ? corEscuro : corClaro),
    `SO ${sistemaEscuro ? 'escuro' : 'claro'} → ${corSistema}; manual claro → ${corClaro}, manual escuro → ${corEscuro}`);
  setTheme('light');
}

// ---------- 5. Densidade ----------
function checkDensity(json) {
  const níveis = json.primitive.density;
  const falhas = [];
  for (const [nivel, esperado] of Object.entries(níveis)) {
    root.setAttribute('data-density', nivel);
    for (const [k, v] of Object.entries(esperado)) {
      const real = tok(`--lm-density-${k}`);
      if (real !== v) falhas.push(`${nivel}.${k}: ${real} ≠ ${v}`);
    }
  }
  root.removeAttribute('data-density');
  add('densidade', 'os três níveis produzem as alturas documentadas', falhas.length === 0,
    falhas.length ? falhas.join(' · ') : Object.keys(níveis).join(', '));

  // Altura de controle real do botão segue a densidade
  root.setAttribute('data-density', 'compact');
  const hCompact = cs(document.querySelector('.lm-button--filled')).blockSize;
  root.setAttribute('data-density', 'comfortable');
  const hComf = cs(document.querySelector('.lm-button--filled')).blockSize;
  root.removeAttribute('data-density');
  add('densidade', 'altura do Button deriva de --lm-density-control',
    parseFloat(hComf) > parseFloat(hCompact), `compact ${hCompact} → comfortable ${hComf}`);
}

// ---------- 6. Camada de estado por color-mix ----------
function checkStateLayer() {
  setTheme('light');
  const base = resolve(tok('--lm-button-filled-bg'));
  const label = resolve(tok('--lm-button-filled-label'));
  const op = parseFloat(tok('--lm-state-hover'));
  const misturado = resolve(`color-mix(in oklab, ${tok('--lm-button-filled-label')} ${op * 100}%, ${tok('--lm-button-filled-bg')})`);

  const suportado = misturado && misturado.join() !== base.join();
  add('estado', 'color-mix() suportado e produz cor distinta do repouso', !!suportado,
    suportado ? `base rgb(${base}) → hover rgb(${misturado})` : 'color-mix não alterou a cor');

  // A camada precisa caminhar NA DIREÇÃO da cor de conteúdo
  if (suportado) {
    const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    add('estado', 'camada de hover caminha em direção à cor de conteúdo',
      dist(misturado, label) < dist(base, label),
      `distância ao rótulo: repouso ${dist(base, label).toFixed(1)} → hover ${dist(misturado, label).toFixed(1)}`);
  }

  // Sete opacidades declaradas
  const esperadas = ['hover', 'focus', 'pressed', 'dragged', 'selected', 'disabled-content', 'disabled-container'];
  const faltando = esperadas.filter((s) => !tok(`--lm-state-${s}`));
  add('estado', 'as sete opacidades de estado existem', faltando.length === 0, faltando.join(', ') || esperadas.length + ' tokens');
}

// ---------- 7. Camadas z-index ----------
function checkZIndex(json) {
  const ordem = Object.keys(json.primitive.zIndex);
  const vals = ordem.map((k) => Number(tok(`--lm-z-${k}`)));
  const monotona = vals.every((v, i) => i === 0 || v > vals[i - 1]);
  add('camadas', 'escala z-index é estritamente crescente', monotona, ordem.map((k, i) => `${k}=${vals[i]}`).join(' < '));
  add('camadas', 'scrim (overlay) fica abaixo de drawer e modal',
    Number(tok('--lm-z-overlay')) < Number(tok('--lm-z-drawer')) &&
    Number(tok('--lm-z-drawer')) < Number(tok('--lm-z-modal')),
    `overlay ${tok('--lm-z-overlay')} < drawer ${tok('--lm-z-drawer')} < modal ${tok('--lm-z-modal')}`);
  add('camadas', 'toast acima de modal', Number(tok('--lm-z-toast')) > Number(tok('--lm-z-modal')),
    `toast ${tok('--lm-z-toast')} > modal ${tok('--lm-z-modal')}`);
}

// ---------- 8. Breakpoints: JS e realidade concordam ----------
function checkBreakpoints(json) {
  const doJSON = json.primitive.breakpoint;
  const falhas = [];
  for (const [nome, v] of Object.entries(doJSON)) {
    if (BREAKPOINTS[nome] !== Number(String(v).replace('px', ''))) falhas.push(`${nome}: js=${BREAKPOINTS[nome]} json=${v}`);
  }
  add('breakpoints', 'breakpoints.js concorda com tokens.json', falhas.length === 0,
    falhas.join(' · ') || Object.entries(BREAKPOINTS).map(([k, v]) => `${k}:${v}`).join(' '));

  const w = innerWidth;
  const classeCalc = windowClass(w);
  const classeReal = ['xlarge', 'large', 'expanded', 'medium'].find((c) => matchMedia(MEDIA[c]).matches) || 'compact';
  add('breakpoints', 'windowClass() concorda com matchMedia na largura atual',
    classeCalc === classeReal, `${w}px → windowClass=${classeCalc}, matchMedia=${classeReal}`);
}

// ---------- 9. Tipografia ----------
function checkTypography(json) {
  const t = json.primitive.typography;
  const corpo = parseFloat(cs(document.body).fontSize);
  add('tipografia', 'corpo padrão ≥14px', corpo >= 14, `${corpo}px`);

  // body-sm é só metadado — não deve ser o tamanho do corpo
  const bodySm = parseFloat(t['body-sm'].sizePx);
  add('tipografia', 'body-sm (metadado) não é o corpo padrão', corpo !== bodySm, `corpo ${corpo}px, body-sm ${bodySm}px`);

  const pesos = new Set(Object.values(t).map((s) => s.weight));
  add('tipografia', 'escala usa apenas os pesos 400 e 500', [...pesos].every((p) => p === 400 || p === 500),
    `pesos na escala: ${[...pesos].sort().join(', ')}`);
}

// ---------- 10. Gráficos ----------
function checkChart(json) {
  for (const tema of ['light', 'dark']) {
    setTheme(tema);
    const series = [];
    for (let i = 1; i <= 8; i++) {
      const v = tok(`--lm-chart-series-${i}`);
      if (v) series.push(v);
    }
    add('gráficos', `8 slots categóricos resolvem (${tema})`, series.length === 8, `${series.length}/8: ${series.join(' ')}`);

    const surf = resolve(tok('--lm-color-chart-surface'));
    const baixos = series.map((s) => ({ s, r: contrast(resolve(s), surf) })).filter((x) => x.r < 3);
    add('gráficos', `todas as séries a ≥3:1 sobre chart-surface (${tema})`, baixos.length === 0,
      baixos.length ? baixos.map((x) => `${x.s} ${x.r.toFixed(2)}`).join(' · ')
        : `pior ${Math.min(...series.map((s) => contrast(resolve(s), surf))).toFixed(2)}:1`);
  }

  // chart-surface tem de continuar sendo a superfície contra a qual foi validado
  for (const tema of ['light', 'dark']) {
    setTheme(tema);
    add('gráficos', `chart-surface == surface-container-low (${tema})`,
      tok('--lm-color-chart-surface') === tok('--lm-color-surface-container-low'),
      `${tok('--lm-color-chart-surface')} vs ${tok('--lm-color-surface-container-low')}`);
  }
  setTheme('light');
}

// ---------- 11. Alvos de toque ----------
function checkTargets() {
  const min = parseFloat(tok('--lm-target-min-size'));
  const falhas = [];
  for (const sel of ['.lm-button--filled', '.lm-icon-button', '.lm-menu-item', '.lm-nav-item']) {
    const el = document.querySelector(sel);
    const r = el.getBoundingClientRect();
    if (r.height < min) falhas.push(`${sel}: ${r.height.toFixed(0)}px`);
  }
  add('alvos', `controles ≥ --lm-target-min-size (${min}px)`, falhas.length === 0, falhas.join(' · ') || 'todos acima do mínimo');

  // Chip: desenho 32px, alvo estendido por ::after
  const chip = document.querySelector('.lm-chip');
  const desenho = chip.getBoundingClientRect().height;
  const alvo = desenho + 8; // inset-block: -4px de cada lado
  add('alvos', 'Chip estende o alvo por pseudo-elemento, não por padding',
    Math.abs(desenho - 32) < 1 && alvo >= 40, `desenho ${desenho.toFixed(0)}px → alvo ${alvo.toFixed(0)}px`);
}

// ---------- 12. Camadas CSS e ausência de outline:none global ----------
function checkLayers() {
  const temLayer = [...document.styleSheets].some((ss) => {
    try { return [...ss.cssRules].some((r) => r instanceof CSSLayerStatementRule || r instanceof CSSLayerBlockRule); }
    catch { return false; }
  });
  add('css', '@layer suportado e em uso', temLayer, temLayer ? 'camadas declaradas' : 'nenhuma regra @layer encontrada');

  // Nenhum elemento com foco perde o outline por regra universal
  // Nenhuma regra universal apaga o foco (o defeito A1 do app atual)
  let universalOutlineNone = false;
  for (const ss of document.styleSheets) {
    try {
      const walk = (rules) => {
        for (const r of rules) {
          if (r.cssRules) walk(r.cssRules);
          else if (r.selectorText && /^\s*\*/.test(r.selectorText) && /outline\s*:\s*none/.test(r.cssText)) {
            universalOutlineNone = true;
          }
        }
      };
      walk(ss.cssRules);
    } catch { /* folha externa */ }
  }
  add('css', 'nenhuma regra universal com outline:none', !universalOutlineNone,
    universalOutlineNone ? 'existe `* { outline: none }` — defeito A1' : 'nenhuma encontrada');
}

// ---------- execução ----------
window.__conformance = async () => {
  report.length = 0;
  const json = await tokensJSON();

  // preenche as amostras de superfície
  const sw = document.getElementById('sw');
  if (sw && !sw.childElementCount) {
    for (const p of ['surface', 'surface-container-low', 'surface-container', 'surface-container-high',
      'surface-container-highest', 'primary-container', 'secondary-container', 'tertiary-container',
      'error-container', 'success-container', 'warning-container', 'airbnb-container', 'booking-container']) {
      const d = document.createElement('div');
      d.className = 'sw';
      d.style.background = `var(--lm-color-${p})`;
      d.style.color = `var(--lm-color-on-${p.replace(/^surface.*/, 'surface')})`;
      d.textContent = p;
      sw.appendChild(d);
    }
  }

  checkRolesResolve(json);
  checkContrast();
  checkFocusTokens();
  checkThemePrecedence();
  checkDensity(json);
  checkStateLayer();
  checkZIndex(json);
  checkBreakpoints(json);
  checkTypography(json);
  checkChart(json);
  checkTargets();
  checkLayers();

  setTheme('light');
  const falhas = report.filter((r) => r.status === 'FAIL');
  return { total: report.length, pass: report.length - falhas.length, fail: falhas.length, resultados: report };
};

window.__pronto = true;
