import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Aparência: tema e densidade.
 *
 * Os dois moram juntos porque fazem exatamente a mesma coisa — escrevem um atributo
 * no <html>, persistem a escolha e leem o padrão antes da primeira pintura. Dois
 * contextos seriam duas cópias do mesmo mecanismo.
 *
 * O atributo vai no <html> e nunca no <body>: os tokens gerados têm escopo em `:root`,
 * e `:root` é o elemento raiz do documento.
 */

export const THEMES = ['light', 'dark', 'system'];
export const DENSITIES = ['comfortable', 'standard', 'compact'];

export const STORAGE_KEY_THEME = 'lumina.theme';
export const STORAGE_KEY_DENSITY = 'lumina.density';

export const DEFAULT_THEME = 'light';
export const DEFAULT_DENSITY = 'standard';

const AppearanceContext = createContext(null);

/** Lê o que o script inline de index.html já aplicou, em vez de recalcular. */
function lerTemaAplicado() {
  if (typeof document === 'undefined') return DEFAULT_THEME;
  const attr = document.documentElement.getAttribute('data-theme');
  // Ausência do atributo é o modo 'system': é assim que semantic.css deixa a
  // media query de prefers-color-scheme decidir.
  if (attr === null) return 'system';
  return THEMES.includes(attr) ? attr : DEFAULT_THEME;
}

function lerDensidadeAplicada() {
  if (typeof document === 'undefined') return DEFAULT_DENSITY;
  const attr = document.documentElement.getAttribute('data-density');
  return DENSITIES.includes(attr) ? attr : DEFAULT_DENSITY;
}

function guardar(chave, valor) {
  try {
    localStorage.setItem(chave, valor);
  } catch {
    // Modo privado ou storage cheio. Perder a preferência é aceitável;
    // quebrar a troca de tema não é.
  }
}

export function AppearanceProvider({ children }) {
  const [theme, setThemeState] = useState(lerTemaAplicado);
  const [density, setDensityState] = useState(lerDensidadeAplicada);
  const [systemDark, setSystemDark] = useState(
    () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches,
  );

  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const ouvir = (e) => setSystemDark(e.matches);
    mq.addEventListener('change', ouvir);
    return () => mq.removeEventListener('change', ouvir);
  }, []);

  useEffect(() => {
    const raiz = document.documentElement;
    if (theme === 'system') raiz.removeAttribute('data-theme');
    else raiz.setAttribute('data-theme', theme);
    guardar(STORAGE_KEY_THEME, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-density', density);
    guardar(STORAGE_KEY_DENSITY, density);
  }, [density]);

  /** O tema que está realmente pintado agora — 'light' ou 'dark', nunca 'system'.
      Quem desenha (os gráficos) precisa disto, não do modo escolhido. */
  const resolvedTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

  // Duas superfícies do Electron ficam fora do CSS e precisam ser avisadas: a cor
  // que a janela pinta antes do primeiro quadro e durante o redimensionamento, e
  // o tema dos diálogos nativos. Sem isto, um app claro abre com flash escuro e
  // o "Salvar como" sai preto. No navegador, `electronAPI` não existe e o efeito
  // simplesmente não faz nada.
  useEffect(() => {
    if (!window.electronAPI?.setTheme) return;
    const fundo = getComputedStyle(document.documentElement)
      .getPropertyValue('--lm-color-background')
      .trim();
    window.electronAPI.setTheme(resolvedTheme, fundo);
  }, [resolvedTheme]);

  const setTheme = useCallback((valor) => {
    if (!THEMES.includes(valor)) return;
    setThemeState(valor);
  }, []);

  const setDensity = useCallback((valor) => {
    if (!DENSITIES.includes(valor)) return;
    setDensityState(valor);
  }, []);

  const valor = useMemo(
    () => ({ theme, setTheme, resolvedTheme, density, setDensity }),
    [theme, setTheme, resolvedTheme, density, setDensity],
  );

  return <AppearanceContext.Provider value={valor}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  const ctx = useContext(AppearanceContext);
  if (!ctx) throw new Error('useAppearance() precisa estar dentro de <AppearanceProvider>.');
  return ctx;
}
