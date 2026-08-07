"""Gerador de design tokens do LUMINA Design System.

Fonte única de verdade das decisões visuais recorrentes. Em vez de escolher
valores hexadecimais no olho, este script deriva paletas tonais completas a
partir de sementes definidas em LCh(ab): cada tom N tem luminância CIE L* = N,
o que torna o contraste previsível e auditável.

Saídas (todas geradas, nunca editadas à mão):

    frontend/src/styles/tokens/tokens.json   fonte serializável (primitivos + semânticos + componentes)
    frontend/src/styles/tokens/primitives.css
    frontend/src/styles/tokens/semantic.css
    frontend/src/styles/tokens/components.css

Uso:

    python scripts/design/generate_tokens.py            # gera os arquivos
    python scripts/design/generate_tokens.py --check    # valida contraste e daltonismo (exit 1 em falha)

O modo --check é o portão do sistema, e cobre DUAS propriedades independentes:

1. Contraste WCAG 2.2 AA — percorre todos os pares "on-<papel> sobre <papel>"
   nos dois temas e falha se algum ficar abaixo do mínimo exigido.

2. Separação da paleta de gráficos sob daltonismo — simula protanopia e
   deuteranopia e mede ΔE OKLab entre slots adjacentes.

As duas precisam existir porque medem coisas diferentes: contraste é uma
propriedade de LUMINÂNCIA, e duas cores podem ter luminâncias bem distintas e
ainda assim ser indistinguíveis para quem tem deuteranopia. Azul e violeta
passam no contraste e colidem sob daltonismo.

Rode-o sempre que alterar uma semente.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = REPO_ROOT / "frontend" / "src" / "styles" / "tokens"

# O wizard do Electron é uma janela separada, com HTML próprio e sem bundler: ele
# não alcança `frontend/src/`, e em produção só `electron/**` é empacotado. Por
# isso recebe uma cópia GERADA dos mesmos tokens, num arquivo só.
#
# Antes ele redigitava 21 variáveis à mão — e duas com significado contraditório:
# `--text-muted` valia #94a3b8 no app e #475569 no wizard. Consistência por
# coincidência, que se rompe no primeiro ajuste de paleta.
WIZARD_OUT = REPO_ROOT / "electron" / "wizard" / "tokens.css"

PREFIX = "lm"

# --------------------------------------------------------------------------- #
# Color math: sRGB <-> linear <-> XYZ <-> CIE Lab <-> LCh(ab)
# --------------------------------------------------------------------------- #

D65 = (0.95047, 1.00000, 1.08883)
EPSILON = 216 / 24389
KAPPA = 24389 / 27


def _srgb_to_linear(c: float) -> float:
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def _linear_to_srgb(c: float) -> float:
    return 12.92 * c if c <= 0.0031308 else 1.055 * (c ** (1 / 2.4)) - 0.055


def hex_to_rgb(value: str) -> tuple[float, float, float]:
    value = value.lstrip("#")
    return tuple(int(value[i : i + 2], 16) / 255 for i in (0, 2, 4))  # type: ignore[return-value]


def rgb_to_hex(r: float, g: float, b: float) -> str:
    return "#" + "".join(f"{round(max(0.0, min(1.0, c)) * 255):02x}" for c in (r, g, b))


def lab_to_rgb(lightness: float, a: float, b: float) -> tuple[float, float, float]:
    fy = (lightness + 16) / 116
    fx = fy + a / 500
    fz = fy - b / 200

    def finv(t: float) -> float:
        return t**3 if t**3 > EPSILON else (116 * t - 16) / KAPPA

    x = finv(fx) * D65[0]
    y = (((lightness + 16) / 116) ** 3 if lightness > KAPPA * EPSILON else lightness / KAPPA) * D65[1]
    z = finv(fz) * D65[2]

    rl = 3.2404542 * x - 1.5371385 * y - 0.4985314 * z
    gl = -0.9692660 * x + 1.8760108 * y + 0.0415560 * z
    bl = 0.0556434 * x - 0.2040259 * y + 1.0572252 * z
    return tuple(_linear_to_srgb(c) for c in (rl, gl, bl))  # type: ignore[return-value]


def _in_gamut(rgb: tuple[float, float, float]) -> bool:
    return all(-0.0005 <= c <= 1.0005 for c in rgb)


def lch_to_hex(lightness: float, chroma: float, hue: float) -> str:
    """Converte LCh(ab) para hex, reduzindo a croma até caber no gamut sRGB.

    Manter L* e h fixos e ceder apenas na croma preserva a luminância alvo — e
    portanto o contraste previsto — mesmo nas pontas da escala.
    """
    rad = math.radians(hue)
    lo, hi = 0.0, chroma
    best = lab_to_rgb(lightness, 0.0, 0.0)
    for _ in range(48):
        mid = (lo + hi) / 2
        candidate = lab_to_rgb(lightness, mid * math.cos(rad), mid * math.sin(rad))
        if _in_gamut(candidate):
            best, lo = candidate, mid
        else:
            hi = mid
    return rgb_to_hex(*best)


def relative_luminance(hex_value: str) -> float:
    r, g, b = (_srgb_to_linear(c) for c in hex_to_rgb(hex_value))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(fg: str, bg: str) -> float:
    a, b = relative_luminance(fg), relative_luminance(bg)
    lighter, darker = max(a, b), min(a, b)
    return (lighter + 0.05) / (darker + 0.05)


def hex_to_oklab(value: str) -> tuple[float, float, float]:
    """sRGB hex para OKLab.

    OKLab e não CIELab porque é perceptualmente mais uniforme na faixa de croma que
    esta paleta ocupa: distância euclidiana em OKLab corresponde melhor a "quão
    diferentes essas duas cores parecem".
    """
    r, g, b = (_srgb_to_linear(c) for c in hex_to_rgb(value))

    lms_l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    lms_m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    lms_s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b

    l_, m_, s_ = (math.copysign(abs(c) ** (1 / 3), c) for c in (lms_l, lms_m, lms_s))

    return (
        0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
        1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
        0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
    )


def delta_e_oklab(a: str, b: str) -> float:
    """Distância euclidiana em OKLab, x100 — a escala usada nos comentários da paleta."""
    la, aa, ba = hex_to_oklab(a)
    lb, ab, bb = hex_to_oklab(b)
    return 100 * math.sqrt((la - lb) ** 2 + (aa - ab) ** 2 + (ba - bb) ** 2)


# Simulação de deficiência de visão de cores.
#
# Matrizes de Machado, Oliveira e Fernandes (2009), "A Physiologically-based Model for
# Simulation of Color Vision Deficiency", severidade 1.0 (dicromacia completa). Operam
# sobre RGB LINEAR, não sobre sRGB codificado — aplicar sobre o valor com gama produz
# cores erradas e um resultado otimista, que é o pior tipo de erro num portão de
# acessibilidade.
#
# Protanopia e deuteranopia são as duas que a paleta declara ter validado, e juntas
# respondem pela grande maioria dos casos. Tritanopia entra porque é barata de medir.
CVD_MATRICES: dict[str, tuple[tuple[float, float, float], ...]] = {
    "protanopia": (
        (0.152286, 1.052583, -0.204868),
        (0.114503, 0.786281, 0.099216),
        (-0.003882, -0.048116, 1.051998),
    ),
    "deuteranopia": (
        (0.367322, 0.860646, -0.227968),
        (0.280085, 0.672501, 0.047413),
        (-0.011820, 0.042940, 0.968881),
    ),
    "tritanopia": (
        (1.255528, -0.076749, -0.178779),
        (-0.078411, 0.930809, 0.147602),
        (0.004733, 0.691367, 0.303900),
    ),
}


def simulate_cvd(value: str, kind: str) -> str:
    r, g, b = (_srgb_to_linear(c) for c in hex_to_rgb(value))
    m = CVD_MATRICES[kind]
    out = tuple(row[0] * r + row[1] * g + row[2] * b for row in m)
    return rgb_to_hex(*(_linear_to_srgb(max(0.0, min(1.0, c))) for c in out))


# --------------------------------------------------------------------------- #
# Sementes das paletas tonais
# --------------------------------------------------------------------------- #

# Tons M3 (superfícies e contêineres) + a escala de 5 em 5, que dá espaço para
# afinar os passos da paleta de gráficos sem inventar valores fora do sistema.
TONES = sorted({0, 4, 6, 12, 17, 22, 24, 87, 92, 94, 96, 98, 99, *range(0, 101, 5)})

# hue/chroma em LCh(ab). A croma é um teto: cada tom cede o necessário p/ caber no gamut.
PALETTES: dict[str, tuple[float, float, str]] = {
    # nome            hue   chroma  descrição
    "primary": (281.0, 62.0, "Azul LUMINA — marca, ações primárias, seleção"),
    "secondary": (265.0, 20.0, "Azul-acinzentado — apoio calmo, ênfase média"),
    "tertiary": (200.0, 42.0, "Turquesa — acento expressivo, destaques pontuais"),
    "neutral": (268.0, 4.0, "Neutro de superfícies e texto (leve viés azul)"),
    "neutral-variant": (268.0, 11.0, "Neutro de contornos e divisores"),
    "error": (28.0, 72.0, "Erro e ações destrutivas"),
    "success": (155.0, 52.0, "Sucesso e confirmação"),
    "warning": (73.0, 74.0, "Atenção e avisos"),
    # Identidade das plataformas externas. Usadas apenas em badges com rótulo
    # textual — nunca como único portador de significado, nunca em gráficos.
    "airbnb": (21.0, 76.0, "Identidade Airbnb (badge com rótulo)"),
    "booking": (272.0, 52.0, "Identidade Booking.com (badge com rótulo)"),
    # Famílias exclusivas do módulo de gráficos (ver chart.categorical).
    "chart-violet": (315.0, 52.0, "Família de gráfico — violeta"),
    "chart-orange": (45.0, 68.0, "Família de gráfico — laranja"),
    "chart-cyan": (232.0, 46.0, "Família de gráfico — ciano"),
    "chart-rose": (355.0, 58.0, "Família de gráfico — rosa"),
}


# Afunilamento da croma nas pontas da escala.
#
# Com croma constante, matizes que o sRGB acomoda bem em alta luminância — ciano,
# verde — produzem contêineres neon no tema claro (o tom 90 de uma paleta turquesa
# saía #59f8fc). Reduzir a croma conforme o tom se afasta do meio devolve
# contêineres calmos sem tocar nos tons médios, que são gamut-limitados de todo
# jeito.
#
# O contraste não muda: L* determina a luminância relativa sozinho, então a razão
# de contraste entre dois tons independe da croma e da matiz.
CHROMA_TAPER = 0.55


def chroma_at(cap: float, tone: float) -> float:
    return cap * (1 - CHROMA_TAPER * ((abs(tone - 50) / 50) ** 2))


def build_ramps() -> dict[str, dict[str, str]]:
    ramps: dict[str, dict[str, str]] = {}
    for name, (hue, chroma, _desc) in PALETTES.items():
        ramps[name] = {str(tone): lch_to_hex(float(tone), chroma_at(chroma, tone), hue) for tone in TONES}
    return ramps


# --------------------------------------------------------------------------- #
# Mapeamento semântico (tom por papel, por tema)
# --------------------------------------------------------------------------- #

# Cada entrada: papel -> (paleta, tom_claro, tom_escuro)
SEMANTIC_COLOR: dict[str, tuple[str, int, int]] = {
    # --- Primária ---
    "primary": ("primary", 40, 80),
    "on-primary": ("primary", 100, 20),
    "primary-container": ("primary", 90, 30),
    "on-primary-container": ("primary", 10, 90),
    "primary-fixed": ("primary", 90, 90),
    "on-primary-fixed": ("primary", 10, 10),
    # --- Secundária ---
    "secondary": ("secondary", 40, 80),
    "on-secondary": ("secondary", 100, 20),
    "secondary-container": ("secondary", 90, 30),
    "on-secondary-container": ("secondary", 10, 90),
    # --- Terciária ---
    "tertiary": ("tertiary", 40, 80),
    "on-tertiary": ("tertiary", 100, 20),
    "tertiary-container": ("tertiary", 90, 30),
    "on-tertiary-container": ("tertiary", 10, 90),
    # --- Superfícies ---
    "background": ("neutral", 98, 6),
    "on-background": ("neutral", 10, 90),
    "surface": ("neutral", 98, 6),
    "on-surface": ("neutral", 10, 90),
    "surface-dim": ("neutral", 87, 6),
    "surface-bright": ("neutral", 98, 24),
    "surface-container-lowest": ("neutral", 100, 4),
    "surface-container-low": ("neutral", 96, 10),
    "surface-container": ("neutral", 94, 12),
    "surface-container-high": ("neutral", 92, 17),
    "surface-container-highest": ("neutral", 90, 22),
    "surface-variant": ("neutral-variant", 90, 30),
    "on-surface-variant": ("neutral-variant", 30, 80),
    "inverse-surface": ("neutral", 20, 90),
    "inverse-on-surface": ("neutral", 95, 20),
    "inverse-primary": ("primary", 80, 40),
    # --- Estrutura ---
    "outline": ("neutral-variant", 50, 60),
    # Fronteira de CONTROLE INTERATIVO. Existe separada de `outline` porque
    # WCAG 1.4.11 exige 3:1 quando a borda é o único limite de um controle,
    # enquanto `outline-variant` (contorno decorativo) fica em 1,62:1. Um passo
    # mais forte que `outline` dá folga para o requisito nos dois temas.
    "outline-interactive": ("neutral-variant", 45, 65),
    "outline-variant": ("neutral-variant", 80, 30),
    "divider": ("neutral-variant", 87, 25),
    "scrim": ("neutral", 0, 0),
    "shadow": ("neutral", 0, 0),
    # Texto desabilitado como COR, não como opacidade. Aplicar 38% sobre
    # `on-surface` rende 2,34:1 no claro — desabilitado ainda precisa ser lido.
    # O par mais apertado é sobre `surface-container-highest`, o fundo do campo —
    # justamente onde o texto desabilitado mais aparece.
    "on-surface-disabled": ("neutral-variant", 50, 60),
    # --- Estados semânticos ---
    "error": ("error", 40, 80),
    "on-error": ("error", 100, 20),
    "error-container": ("error", 90, 30),
    "on-error-container": ("error", 10, 90),
    "success": ("success", 35, 80),
    "on-success": ("success", 100, 20),
    "success-container": ("success", 90, 30),
    "on-success-container": ("success", 10, 90),
    "warning": ("warning", 35, 80),
    "on-warning": ("warning", 100, 20),
    "warning-container": ("warning", 90, 30),
    "on-warning-container": ("warning", 10, 90),
    "info": ("primary", 40, 80),
    "on-info": ("primary", 100, 20),
    "info-container": ("primary", 90, 30),
    "on-info-container": ("primary", 10, 90),
    # --- Identidade de plataforma (sempre acompanhada de rótulo textual) ---
    "airbnb": ("airbnb", 40, 80),
    "on-airbnb": ("airbnb", 100, 20),
    "airbnb-container": ("airbnb", 92, 25),
    "on-airbnb-container": ("airbnb", 10, 90),
    "booking": ("booking", 40, 80),
    "on-booking": ("booking", 100, 20),
    "booking-container": ("booking", 92, 25),
    "on-booking-container": ("booking", 10, 90),
    # --- Cenário de gráfico ---
    # A superfície é a mesma contra a qual o contraste das marcas foi verificado
    # (card elevado). Trocá-la invalida a validação da paleta categórica.
    "chart-surface": ("neutral", 96, 10),
    "chart-ink": ("neutral", 10, 90),
    "chart-ink-muted": ("neutral-variant", 30, 80),
    "chart-grid": ("neutral-variant", 87, 25),
    "chart-axis": ("neutral-variant", 70, 40),
    "chart-tooltip-bg": ("neutral", 20, 90),
    "chart-tooltip-label": ("neutral", 95, 20),
}

# Pares que o modo --check valida. (texto, fundo, mínimo)
# 4.5:1 para texto normal, 3.0:1 para elementos não-textuais e texto grande.
CONTRAST_PAIRS: list[tuple[str, str, float]] = [
    ("on-primary", "primary", 4.5),
    ("on-primary-container", "primary-container", 4.5),
    ("on-secondary", "secondary", 4.5),
    ("on-secondary-container", "secondary-container", 4.5),
    ("on-tertiary", "tertiary", 4.5),
    ("on-tertiary-container", "tertiary-container", 4.5),
    ("on-error", "error", 4.5),
    ("on-error-container", "error-container", 4.5),
    ("on-success", "success", 4.5),
    ("on-success-container", "success-container", 4.5),
    ("on-warning", "warning", 4.5),
    ("on-warning-container", "warning-container", 4.5),
    ("on-background", "background", 4.5),
    ("on-surface", "surface", 4.5),
    ("on-surface", "surface-container", 4.5),
    ("on-surface", "surface-container-high", 4.5),
    ("on-surface", "surface-container-highest", 4.5),
    ("on-surface-variant", "surface", 4.5),
    ("on-surface-variant", "surface-container", 4.5),
    ("on-surface-variant", "surface-container-high", 4.5),
    ("inverse-on-surface", "inverse-surface", 4.5),
    ("on-airbnb-container", "airbnb-container", 4.5),
    ("on-booking-container", "booking-container", 4.5),
    ("on-airbnb", "airbnb", 4.5),
    ("on-booking", "booking", 4.5),
    # Texto do cenário de gráfico: rótulo de eixo e legenda são texto.
    ("chart-ink", "chart-surface", 4.5),
    ("chart-ink-muted", "chart-surface", 4.5),
    ("chart-tooltip-label", "chart-tooltip-bg", 4.5),
    # Não-texto: contornos, indicadores e limites de componentes.
    ("outline", "surface", 3.0),
    ("outline", "surface-container", 3.0),
    ("outline", "surface-container-high", 3.0),
    # WCAG 1.4.11 — a borda que É o limite de um controle interativo.
    ("outline-interactive", "surface", 3.0),
    ("outline-interactive", "surface-container", 3.0),
    ("outline-interactive", "surface-container-high", 3.0),
    ("outline-interactive", "surface-container-highest", 3.0),
    # Desabilitado é isento de 1.4.3, mas o sistema exige que continue legível.
    ("on-surface-disabled", "surface", 3.0),
    ("on-surface-disabled", "surface-container", 3.0),
    ("on-surface-disabled", "surface-container-highest", 3.0),
    ("primary", "surface", 3.0),
    ("primary", "surface-container", 3.0),
    ("primary", "surface-container-high", 3.0),
    ("error", "surface", 3.0),
    ("error", "surface-container", 3.0),
    ("success", "surface", 3.0),
    ("warning", "surface", 3.0),
    ("tertiary", "surface", 3.0),
]


def build_semantic(ramps: dict[str, dict[str, str]]) -> dict[str, dict[str, str]]:
    themes: dict[str, dict[str, str]] = {"light": {}, "dark": {}}
    for role, (palette, light_tone, dark_tone) in SEMANTIC_COLOR.items():
        themes["light"][role] = ramps[palette][str(light_tone)]
        themes["dark"][role] = ramps[palette][str(dark_tone)]
    return themes


# --------------------------------------------------------------------------- #
# Primitivos não-cromáticos
# --------------------------------------------------------------------------- #

SPACE = [0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96]

RADIUS = {
    "none": "0",
    "xs": "4px",
    "sm": "8px",
    "md": "12px",
    "lg": "16px",
    "xl": "24px",
    "2xl": "32px",
    "full": "999px",
}

# Escala de tamanho de ícone. Fecha a lacuna registrada em LACUNAS.md: nenhum
# token descrevia o tamanho de um ícone, e o resultado no código legado foram
# nove valores distintos passados como `size={N}` direto no JSX, sem relação
# entre si. Quatro degraus cobrem todo o produto.
ICON_SIZE = {
    "sm": "16px",  # chip, badge, célula de tabela densa
    "md": "20px",  # padrão — botão, campo, item de lista, app bar
    "lg": "24px",  # navegação, cabeçalho de seção
    "xl": "40px",  # estado vazio, avatar de mensagem
}

# name -> (px, line-height px, weight, letter-spacing em, uso)
TYPE_SCALE: dict[str, tuple[int, int, int, float, str]] = {
    "display-lg": (57, 64, 400, -0.0044, "Marketing e telas de foco; raro no produto"),
    "display-md": (45, 52, 400, 0.0, "Números-herói de dashboard"),
    "display-sm": (36, 44, 400, 0.0, "Valores de destaque em cards de estatística"),
    "headline-lg": (32, 40, 400, 0.0, "Título de página em telas expanded+"),
    "headline-md": (28, 36, 400, 0.0, "Título de página padrão"),
    "headline-sm": (24, 32, 400, 0.0, "Título de seção maior; título de página em compact"),
    "title-lg": (22, 28, 400, 0.0, "Título de dialog e de painel"),
    "title-md": (16, 24, 500, 0.0094, "Título de card e de grupo de formulário"),
    "title-sm": (14, 20, 500, 0.0063, "Subtítulo, cabeçalho de lista"),
    "body-lg": (16, 24, 400, 0.0313, "Texto corrido em telas de leitura"),
    "body-md": (14, 20, 400, 0.0156, "Corpo padrão da interface"),
    "body-sm": (12, 16, 400, 0.025, "SOMENTE metadados — nunca texto principal"),
    "label-lg": (14, 20, 500, 0.0063, "Rótulo de botão, aba e item de navegação"),
    "label-md": (12, 16, 500, 0.0313, "Rótulo de campo, chip, badge"),
    "label-sm": (11, 16, 500, 0.0455, "Cabeçalho de tabela, microrrótulo"),
    "code": (13, 20, 400, 0.0, "IDs, código, dados técnicos (fonte monoespaçada)"),
}

MOTION_DURATION = {
    "instant": "0ms",
    "fast": "120ms",
    "standard": "200ms",
    "emphasized": "320ms",
    "complex": "480ms",
}

# Tempo de PERMANÊNCIA — quanto tempo algo fica na tela. Categoria distinta de
# `duration`, que descreve transição e para em 480ms. Confundir as duas leva a
# snackbar de 300ms ou a transição de 5s.
DWELL = {
    "snackbar": "5000ms",
    "snackbar-action": "10000ms",
    "tooltip-delay": "500ms",
    "tooltip-delay-repeat": "0ms",
}

MOTION_EASING = {
    "standard": "cubic-bezier(0.2, 0, 0, 1)",
    "decelerate": "cubic-bezier(0, 0, 0, 1)",
    "accelerate": "cubic-bezier(0.3, 0, 1, 1)",
    "emphasized": "cubic-bezier(0.2, 0, 0, 1)",
    "spring": "cubic-bezier(0.34, 1.3, 0.64, 1)",
}

# Camadas de estado: opacidade do overlay derivado da cor de conteúdo.
STATE_LAYER = {
    "hover": "0.08",
    "focus": "0.10",
    "pressed": "0.12",
    "dragged": "0.16",
    "selected": "0.12",
    "disabled-content": "0.38",
    "disabled-container": "0.12",
}

Z_INDEX = {
    "base": "0",
    "sticky": "100",
    "dropdown": "200",
    "popover": "300",
    "overlay": "400",
    "drawer": "500",
    "modal": "600",
    "toast": "700",
    "critical": "800",
}

BREAKPOINTS = {
    "compact": "0px",
    "medium": "600px",
    "expanded": "840px",
    "large": "1200px",
    "xlarge": "1600px",
}

# Densidade: altura-alvo dos controles interativos por nível.
# O nível do meio se chama "standard" e não "default": `[data-density="default"]`
# lê como "sem escolha" quando na verdade é uma escolha entre três, e a prop React
# equivalente (`density="default"`) seria indistinguível de não passar nada.
DENSITY = {
    "comfortable": {"control": "48px", "row": "64px", "gap": "16px"},
    "standard": {"control": "40px", "row": "52px", "gap": "12px"},
    "compact": {"control": "32px", "row": "40px", "gap": "8px"},
}
DENSITY_BASE = "standard"

# Elevação por tema: no claro a sombra carrega a profundidade; no escuro quem
# carrega é a superfície tonal, com a sombra apenas reforçando a borda.
ELEVATION = {
    "light": {
        "0": "none",
        "1": "0 1px 2px rgba(0,0,0,.06), 0 1px 3px 1px rgba(0,0,0,.04)",
        "2": "0 1px 2px rgba(0,0,0,.06), 0 2px 6px 2px rgba(0,0,0,.05)",
        "3": "0 4px 8px 3px rgba(0,0,0,.06), 0 1px 3px rgba(0,0,0,.07)",
        "4": "0 6px 10px 4px rgba(0,0,0,.06), 0 2px 3px rgba(0,0,0,.07)",
        "5": "0 8px 12px 6px rgba(0,0,0,.07), 0 4px 4px rgba(0,0,0,.08)",
    },
    "dark": {
        "0": "none",
        "1": "0 1px 2px rgba(0,0,0,.30), 0 1px 3px 1px rgba(0,0,0,.15)",
        "2": "0 1px 2px rgba(0,0,0,.30), 0 2px 6px 2px rgba(0,0,0,.18)",
        "3": "0 4px 8px 3px rgba(0,0,0,.18), 0 1px 3px rgba(0,0,0,.30)",
        "4": "0 6px 10px 4px rgba(0,0,0,.20), 0 2px 3px rgba(0,0,0,.30)",
        "5": "0 8px 12px 6px rgba(0,0,0,.22), 0 4px 4px rgba(0,0,0,.32)",
    },
}

# Superfície sobre a qual os gráficos são desenhados (card elevado). É contra ela
# que o contraste das marcas foi verificado — mudar a superfície invalida a paleta.
CHART_SURFACE = {"light": "surface-container-low", "dark": "surface-container-low"}

# Paleta categórica de gráficos.
#
# A ORDEM dos slots é o mecanismo de segurança para daltonismo, não estética: as
# 40.320 permutações foram enumeradas e pontuadas pelo pior par adjacente, e esta
# é a melhor entre as que abrem no azul da marca. Nunca cicle os slots — a 9ª
# série vira "Outros" ou small multiples.
#
# Verificado (dE OKLab x100, modelo Machado-Oliveira-Fernandes 2009 @ 1.0):
#   superfícies de verificação: #f1f4f8 (claro) e #1a1c1f (escuro), que são o
#     valor de `chart-surface`. Mudar a rampa neutra muda essas superfícies e
#     obriga a revalidar — o contraste das marcas é medido contra elas.
#   adjacente  claro  CVD 11.8 · visão normal 21.0 · contraste mín. 3.0:1
#   adjacente  escuro CVD  9.0 · visão normal 21.0 · contraste mín. 3.0:1
#   all-pairs (scatter, bubble, small multiples): teto de 2 séries limpo
#   (CVD 23.5/23.6); a 3ª entra na faixa 6-8 (CVD 6.7, azul x violeta) e só é
#   legal com codificação secundária — rótulo direto ou forma distinta.
CHART_CATEGORICAL: list[tuple[str, str, int, int]] = [
    # rótulo, paleta, tom claro, tom escuro
    ("blue", "primary", 55, 55),
    ("green", "success", 55, 60),
    ("violet", "chart-violet", 55, 55),
    ("orange", "chart-orange", 55, 55),
    ("teal", "tertiary", 55, 60),
    ("amber", "warning", 55, 60),
    ("cyan", "chart-cyan", 55, 60),
    ("rose", "chart-rose", 40, 55),
]


def build_chart(ramps: dict[str, dict[str, str]]) -> dict:
    categorical = {"light": [], "dark": []}
    labels = []
    for label, palette, light_tone, dark_tone in CHART_CATEGORICAL:
        labels.append(label)
        categorical["light"].append(ramps[palette][str(light_tone)])
        categorical["dark"].append(ramps[palette][str(dark_tone)])

    # Sequencial: uma única matiz, claro -> escuro. O passo mais claro pode
    # recuar até quase a superfície porque "quase zero" deve recuar mesmo.
    sequential_tones = [92, 85, 75, 65, 55, 45, 35, 25]
    # Ordinal (etapas discretas ordenadas) usa uma janela mais estreita: o passo
    # vizinho da superfície ainda precisa de 2:1, então não vai até as pontas.
    ordinal_light = [65, 55, 45, 35, 25]
    ordinal_dark = [40, 50, 60, 70, 80]

    return {
        "surface": CHART_SURFACE,
        "categorical": {"labels": labels, **categorical},
        "sequential": {
            "hue": "primary",
            "light": [ramps["primary"][str(t)] for t in sequential_tones],
            "dark": [ramps["primary"][str(t)] for t in reversed(sequential_tones)],
        },
        "ordinal": {
            "hue": "primary",
            "light": [ramps["primary"][str(t)] for t in ordinal_light],
            "dark": [ramps["primary"][str(t)] for t in ordinal_dark],
        },
        # Polos quente/frio com cinza no meio: no meio da escala não há sinal,
        # e cinza é a única cor que comunica "nada".
        "diverging": {
            "negative": {"light": ramps["error"]["50"], "dark": ramps["error"]["60"]},
            "neutral": {"light": ramps["neutral"]["90"], "dark": ramps["neutral"]["30"]},
            "positive": {"light": ramps["primary"]["50"], "dark": ramps["primary"]["60"]},
        },
        # Status nunca segue a paleta categórica: significado reservado, sempre
        # acompanhado de ícone + rótulo, nunca cor sozinha.
        "status": {
            "good": {"light": ramps["success"]["45"], "dark": ramps["success"]["65"]},
            "warning": {"light": ramps["warning"]["55"], "dark": ramps["warning"]["70"]},
            "serious": {"light": ramps["chart-orange"]["50"], "dark": ramps["chart-orange"]["65"]},
            "critical": {"light": ramps["error"]["45"], "dark": ramps["error"]["65"]},
        },
    }


# --------------------------------------------------------------------------- #
# Tokens de componente
# --------------------------------------------------------------------------- #

# Valores são referências a tokens semânticos (var(...)) ou a primitivos.
# Nenhum hexadecimal aparece aqui — essa é a regra que mantém o tema trocável.
COMPONENT_TOKENS: dict[str, dict[str, str]] = {
    "button": {
        "height": f"var(--{PREFIX}-density-control)",
        "padding-inline": f"var(--{PREFIX}-space-24)",
        "radius": f"var(--{PREFIX}-radius-full)",
        "gap": f"var(--{PREFIX}-space-8)",
        "filled-bg": f"var(--{PREFIX}-color-primary)",
        "filled-label": f"var(--{PREFIX}-color-on-primary)",
        "tonal-bg": f"var(--{PREFIX}-color-secondary-container)",
        "tonal-label": f"var(--{PREFIX}-color-on-secondary-container)",
        "outlined-border": f"var(--{PREFIX}-color-outline)",
        "outlined-label": f"var(--{PREFIX}-color-primary)",
        "text-label": f"var(--{PREFIX}-color-primary)",
        "elevated-bg": f"var(--{PREFIX}-color-surface-container-low)",
        "elevated-shadow": f"var(--{PREFIX}-elevation-1)",
        "destructive-bg": f"var(--{PREFIX}-color-error)",
        "destructive-label": f"var(--{PREFIX}-color-on-error)",
    },
    "icon-button": {
        "size": f"var(--{PREFIX}-density-control)",
        "icon-size": f"var(--{PREFIX}-icon-md)",
        "radius": f"var(--{PREFIX}-radius-full)",
        "color": f"var(--{PREFIX}-color-on-surface-variant)",
        "selected-bg": f"var(--{PREFIX}-color-secondary-container)",
        "selected-color": f"var(--{PREFIX}-color-on-secondary-container)",
    },
    "field": {
        "height": f"var(--{PREFIX}-density-control)",
        "radius": f"var(--{PREFIX}-radius-sm)",
        "padding-inline": f"var(--{PREFIX}-space-16)",
        "bg": f"var(--{PREFIX}-color-surface-container-highest)",
        "border": f"var(--{PREFIX}-color-outline)",
        "border-hover": f"var(--{PREFIX}-color-on-surface)",
        "border-focus": f"var(--{PREFIX}-color-primary)",
        "border-error": f"var(--{PREFIX}-color-error)",
        "border-width-focus": "2px",
        "label": f"var(--{PREFIX}-color-on-surface-variant)",
        "text": f"var(--{PREFIX}-color-on-surface)",
        "placeholder": f"var(--{PREFIX}-color-on-surface-variant)",
        "help": f"var(--{PREFIX}-color-on-surface-variant)",
        "error-text": f"var(--{PREFIX}-color-error)",
        "disabled-text": f"var(--{PREFIX}-color-on-surface-disabled)",
        "disabled-border": f"var(--{PREFIX}-color-outline-variant)",
    },
    "card": {
        "radius": f"var(--{PREFIX}-radius-md)",
        "padding": f"var(--{PREFIX}-space-16)",
        "filled-bg": f"var(--{PREFIX}-color-surface-container-high)",
        "elevated-bg": f"var(--{PREFIX}-color-surface-container-low)",
        "elevated-shadow": f"var(--{PREFIX}-elevation-1)",
        "outlined-bg": f"var(--{PREFIX}-color-surface)",
        "outlined-border": f"var(--{PREFIX}-color-outline-variant)",
        "selected-bg": f"var(--{PREFIX}-color-secondary-container)",
    },
    "navigation": {
        "rail-width": "88px",
        "rail-width-expanded": "256px",
        "drawer-width": "320px",
        "item-height": "56px",
        "item-radius": f"var(--{PREFIX}-radius-full)",
        "item-label": f"var(--{PREFIX}-color-on-surface-variant)",
        "item-label-selected": f"var(--{PREFIX}-color-on-secondary-container)",
        "item-bg-selected": f"var(--{PREFIX}-color-secondary-container)",
        "surface": f"var(--{PREFIX}-color-surface)",
        "indicator-height": "32px",
        "indicator-width": "56px",
    },
    "app-bar": {
        "height": "64px",
        "height-compact": "56px",
        "bg": f"var(--{PREFIX}-color-surface)",
        "bg-scrolled": f"var(--{PREFIX}-color-surface-container)",
        "title": f"var(--{PREFIX}-color-on-surface)",
        "icon": f"var(--{PREFIX}-color-on-surface-variant)",
    },
    "dialog": {
        "radius": f"var(--{PREFIX}-radius-xl)",
        "bg": f"var(--{PREFIX}-color-surface-container-high)",
        "shadow": f"var(--{PREFIX}-elevation-4)",
        "padding": f"var(--{PREFIX}-space-24)",
        "max-width": "560px",
        "scrim": f"var(--{PREFIX}-color-scrim)",
        "scrim-opacity": "0.32",
    },
    "menu": {
        "radius": f"var(--{PREFIX}-radius-md)",
        "bg": f"var(--{PREFIX}-color-surface-container)",
        "shadow": f"var(--{PREFIX}-elevation-2)",
        "item-height": "48px",
        "min-width": "112px",
        "max-width": "280px",
    },
    "chip": {
        "height": "32px",
        "radius": f"var(--{PREFIX}-radius-sm)",
        "padding-inline": f"var(--{PREFIX}-space-12)",
        # Interativo: a borda é o único limite do controle, então precisa de 3:1.
        "border": f"var(--{PREFIX}-color-outline-interactive)",
        "label": f"var(--{PREFIX}-color-on-surface-variant)",
        "selected-bg": f"var(--{PREFIX}-color-secondary-container)",
        "selected-label": f"var(--{PREFIX}-color-on-secondary-container)",
    },
    "badge": {
        "size": "16px",
        "size-dot": "6px",
        # Contagem de dois ou três caracteres ("99+") cresce na horizontal.
        "min-width": "16px",
        "padding-inline": f"var(--{PREFIX}-space-4)",
        "radius": f"var(--{PREFIX}-radius-full)",
        "bg": f"var(--{PREFIX}-color-error)",
        "label": f"var(--{PREFIX}-color-on-error)",
    },
    "skeleton": {
        "bg": f"var(--{PREFIX}-color-surface-container-high)",
        "sheen": f"var(--{PREFIX}-color-surface-container-lowest)",
        "radius": f"var(--{PREFIX}-radius-xs)",
        "duration": "1400ms",
    },
    "progress": {
        "track": f"var(--{PREFIX}-color-secondary-container)",
        "indicator": f"var(--{PREFIX}-color-primary)",
        "track-height": "4px",
        "circular-size": "40px",
        "circular-stroke": "4px",
    },
    "dropzone": {
        "border-width": "2px",
        "border-style": "dashed",
        "border": f"var(--{PREFIX}-color-outline-interactive)",
        "border-active": f"var(--{PREFIX}-color-primary)",
        "bg": f"var(--{PREFIX}-color-surface-container-low)",
        "bg-active": f"var(--{PREFIX}-color-primary-container)",
        "radius": f"var(--{PREFIX}-radius-md)",
        "min-height": "160px",
    },
    "side-sheet": {
        "width": "360px",
        "bg": f"var(--{PREFIX}-color-surface-container-low)",
        "shadow": f"var(--{PREFIX}-elevation-1)",
    },
    "supporting-panel": {
        "width": "360px",
        "bg": f"var(--{PREFIX}-color-surface-container-low)",
        "radius": f"var(--{PREFIX}-radius-lg)",
    },
    "form": {
        "column-max-width": "720px",
        "row-gap": f"var(--{PREFIX}-space-20)",
        "section-gap": f"var(--{PREFIX}-space-32)",
    },
    # Véu genérico. `--lm-dialog-scrim-opacity` continua existindo para o diálogo,
    # mas drawer, folha e painel deixam de reusar um token de escopo alheio.
    "scrim": {
        "color": f"var(--{PREFIX}-color-scrim)",
        "opacity": "0.32",
    },
    # Área de resposta ao ponteiro, independente do tamanho DESENHADO do controle
    # (`--lm-density-control`). WCAG 2.2 AA 2.5.8 exige 24x24 CSS.
    "target": {
        "min-size": "24px",
        "min-gap": "8px",
    },
    "table": {
        "header-height": "48px",
        "row-height": f"var(--{PREFIX}-density-row)",
        "header-label": f"var(--{PREFIX}-color-on-surface-variant)",
        "cell-text": f"var(--{PREFIX}-color-on-surface)",
        "divider": f"var(--{PREFIX}-color-outline-variant)",
        "row-hover": f"var(--{PREFIX}-color-on-surface)",
        "row-selected-bg": f"var(--{PREFIX}-color-secondary-container)",
    },
    "snackbar": {
        "radius": f"var(--{PREFIX}-radius-xs)",
        "bg": f"var(--{PREFIX}-color-inverse-surface)",
        "label": f"var(--{PREFIX}-color-inverse-on-surface)",
        "action": f"var(--{PREFIX}-color-inverse-primary)",
        "shadow": f"var(--{PREFIX}-elevation-3)",
        "min-width": "344px",
        "max-width": "560px",
    },
    "tooltip": {
        "radius": f"var(--{PREFIX}-radius-xs)",
        "bg": f"var(--{PREFIX}-color-inverse-surface)",
        "label": f"var(--{PREFIX}-color-inverse-on-surface)",
        "max-width": "288px",
    },
    "focus": {
        "ring-width": "3px",
        "ring-offset": "2px",
        "ring-color": f"var(--{PREFIX}-color-primary)",
        "ring-color-inverse": f"var(--{PREFIX}-color-inverse-primary)",
        # Anel de duas camadas para foco sobre superfície arbitrária — gráfico,
        # miniatura de documento, célula de calendário colorida. O contorno
        # interno neutro garante a separação que a cor sozinha não garante.
        "ring-inner-width": "1px",
        "ring-inner-color": f"var(--{PREFIX}-color-surface)",
    },
}


# --------------------------------------------------------------------------- #
# Montagem do documento de tokens
# --------------------------------------------------------------------------- #


def build_tokens() -> dict:
    ramps = build_ramps()
    semantic = build_semantic(ramps)

    # Tamanhos em rem para respeitar o zoom e a fonte-base do usuário.
    typography = {
        name: {
            "size": f"{size / 16:g}rem",
            "sizePx": size,
            "lineHeight": f"{line / 16:g}rem",
            "weight": weight,
            "tracking": f"{tracking:g}em",
            "usage": usage,
        }
        for name, (size, line, weight, tracking, usage) in TYPE_SCALE.items()
    }

    return {
        "$meta": {
            "name": "LUMINA Design System",
            "version": "1.0.0",
            "prefix": PREFIX,
            "generatedBy": "scripts/design/generate_tokens.py",
            "warning": "Arquivo gerado. Não edite à mão — altere as sementes no gerador e rode-o novamente.",
        },
        "primitive": {
            "color": ramps,
            "palettes": {name: {"hue": h, "chroma": c, "description": d} for name, (h, c, d) in PALETTES.items()},
            "space": {str(v): f"{v}px" for v in SPACE},
            "radius": RADIUS,
            "iconSize": ICON_SIZE,
            "typography": typography,
            # Fonte do sistema, não empacotada. O LUMINA só roda em Windows 10/11,
            # e "Segoe UI Variable Text" é a fonte de interface desenhada para esse
            # SO — sem download, sem bytes no instalador, sem depender de rede.
            #
            # A versão anterior baixava a Inter de fonts.googleapis.com em tempo de
            # execução, num app de desktop: sem rede o produto inteiro caía num
            # `sans-serif` genérico, e o wizard caía num fallback diferente do app.
            #
            # "Text" é o corte óptico para 12-36px, que cobre toda a escala do
            # produto. Windows 10 não tem a variável e cai em "Segoe UI"; qualquer
            # outro SO cai em `system-ui`.
            "fontFamily": {
                "sans": '"Segoe UI Variable Text", "Segoe UI", system-ui, -apple-system, "Noto Sans", Arial, sans-serif',
                "mono": '"Cascadia Mono", Consolas, ui-monospace, "SFMono-Regular", monospace',
            },
            "motion": {"duration": MOTION_DURATION, "easing": MOTION_EASING},
            "dwell": DWELL,
            "stateLayer": STATE_LAYER,
            "zIndex": Z_INDEX,
            "breakpoint": BREAKPOINTS,
            "density": DENSITY,
        },
        "semantic": {
            "light": {"color": semantic["light"], "elevation": ELEVATION["light"]},
            "dark": {"color": semantic["dark"], "elevation": ELEVATION["dark"]},
        },
        "component": COMPONENT_TOKENS,
        "chart": build_chart(ramps),
    }


# --------------------------------------------------------------------------- #
# Emissão de CSS
# --------------------------------------------------------------------------- #

HEADER = """/* =============================================================
   LUMINA Design System — {title}
   ARQUIVO GERADO por scripts/design/generate_tokens.py
   Não edite à mão. Altere as sementes no gerador e rode-o novamente.
   ============================================================= */
"""


def emit_primitives(tokens: dict) -> str:
    p = tokens["primitive"]
    out = [HEADER.format(title="Tokens primitivos"), "@layer lm.tokens {", "  :root {"]

    out.append("    /* --- Rampas tonais --- */")
    for palette, ramp in p["color"].items():
        out.append(f"    /* {p['palettes'][palette]['description']} */")
        for tone, hex_value in ramp.items():
            out.append(f"    --{PREFIX}-palette-{palette}-{tone}: {hex_value};")

    out.append("")
    out.append("    /* --- Espaçamento (escala de 4px) --- */")
    for key, value in p["space"].items():
        out.append(f"    --{PREFIX}-space-{key}: {value};")

    out.append("")
    out.append("    /* --- Raios --- */")
    for key, value in p["radius"].items():
        out.append(f"    --{PREFIX}-radius-{key}: {value};")

    out.append("")
    out.append("    /* --- Tamanhos de ícone --- */")
    for key, value in p["iconSize"].items():
        out.append(f"    --{PREFIX}-icon-{key}: {value};")

    out.append("")
    out.append("    /* --- Famílias tipográficas --- */")
    for key, value in p["fontFamily"].items():
        out.append(f"    --{PREFIX}-font-{key}: {value};")

    out.append("")
    out.append("    /* --- Escala tipográfica --- */")
    for name, spec in p["typography"].items():
        out.append(f"    /* {spec['sizePx']}px — {spec['usage']} */")
        out.append(f"    --{PREFIX}-type-{name}-size: {spec['size']};")
        out.append(f"    --{PREFIX}-type-{name}-line: {spec['lineHeight']};")
        out.append(f"    --{PREFIX}-type-{name}-weight: {spec['weight']};")
        out.append(f"    --{PREFIX}-type-{name}-tracking: {spec['tracking']};")

    out.append("")
    out.append("    /* --- Movimento --- */")
    for key, value in p["motion"]["duration"].items():
        out.append(f"    --{PREFIX}-duration-{key}: {value};")
    for key, value in p["motion"]["easing"].items():
        out.append(f"    --{PREFIX}-easing-{key}: {value};")

    out.append("")
    out.append("    /* --- Permanência (quanto tempo algo fica na tela) --- */")
    for key, value in p["dwell"].items():
        out.append(f"    --{PREFIX}-dwell-{key}: {value};")

    out.append("")
    out.append("    /* --- Camadas de estado (opacidade do overlay) --- */")
    for key, value in p["stateLayer"].items():
        out.append(f"    --{PREFIX}-state-{key}: {value};")

    out.append("")
    out.append("    /* --- Camadas (z-index) --- */")
    for key, value in p["zIndex"].items():
        out.append(f"    --{PREFIX}-z-{key}: {value};")

    out.append("")
    out.append("    /* --- Densidade (padrão; sobrescrita por [data-density]) --- */")
    for key, value in p["density"][DENSITY_BASE].items():
        out.append(f"    --{PREFIX}-density-{key}: {value};")

    out.append("  }")
    out.append("")
    out.append("  /* --- Níveis de densidade --- */")
    for level, values in p["density"].items():
        out.append(f'  [data-density="{level}"] {{')
        for key, value in values.items():
            out.append(f"    --{PREFIX}-density-{key}: {value};")
        out.append("  }")

    out.append("")
    out.append("  /* Densidade confortável forçada onde o ponteiro é grosseiro (toque). */")
    out.append("  @media (pointer: coarse) {")
    out.append("    :root {")
    for key, value in p["density"]["comfortable"].items():
        out.append(f"      --{PREFIX}-density-{key}: {value};")
    out.append("    }")
    out.append("  }")
    out.append("}")
    return "\n".join(out) + "\n"


def _emit_theme_body(theme: dict, indent: str) -> list[str]:
    out = []
    for role, value in theme["color"].items():
        out.append(f"{indent}--{PREFIX}-color-{role}: {value};")
    out.append("")
    for level, value in theme["elevation"].items():
        out.append(f"{indent}--{PREFIX}-elevation-{level}: {value};")
    return out


def emit_semantic(tokens: dict) -> str:
    light = tokens["semantic"]["light"]
    dark = tokens["semantic"]["dark"]
    chart = tokens["chart"]

    def chart_vars(mode: str, indent: str) -> list[str]:
        rows = [f"{indent}/* Gráficos — paleta categórica em ordem fixa (nunca ciclar) */"]
        for i, hex_value in enumerate(chart["categorical"][mode], start=1):
            label = chart["categorical"]["labels"][i - 1]
            rows.append(f"{indent}--{PREFIX}-chart-series-{i}: {hex_value}; /* {label} */")
        for i, hex_value in enumerate(chart["sequential"][mode], start=1):
            rows.append(f"{indent}--{PREFIX}-chart-sequential-{i}: {hex_value};")
        for i, hex_value in enumerate(chart["ordinal"][mode], start=1):
            rows.append(f"{indent}--{PREFIX}-chart-ordinal-{i}: {hex_value};")
        for pole in ("negative", "neutral", "positive"):
            rows.append(f"{indent}--{PREFIX}-chart-diverging-{pole}: {chart['diverging'][pole][mode]};")
        for status, values in chart["status"].items():
            rows.append(f"{indent}--{PREFIX}-chart-status-{status}: {values[mode]};")
        return rows

    out = [HEADER.format(title="Tokens semânticos (tema claro e escuro)"), "@layer lm.tokens {"]

    out.append("  /* Tema claro — padrão do produto. */")
    out.append("  :root {")
    out.append("    color-scheme: light;")
    out.extend(_emit_theme_body(light, "    "))
    out.append("")
    out.extend(chart_vars("light", "    "))
    out.append("  }")
    out.append("")
    out.append("  /* Preferência do sistema. O :not() permite que um tema claro")
    out.append("     escolhido manualmente vença o escuro do SO. */")
    out.append("  @media (prefers-color-scheme: dark) {")
    out.append('    :root:where(:not([data-theme="light"])) {')
    out.append("      color-scheme: dark;")
    out.extend(_emit_theme_body(dark, "      "))
    out.append("")
    out.extend(chart_vars("dark", "      "))
    out.append("    }")
    out.append("  }")
    out.append("")
    out.append("  /* Escolha explícita do usuário — vence nos dois sentidos. */")
    out.append('  :root[data-theme="dark"] {')
    out.append("    color-scheme: dark;")
    out.extend(_emit_theme_body(dark, "    "))
    out.append("")
    out.extend(chart_vars("dark", "    "))
    out.append("  }")
    out.append("}")
    return "\n".join(out) + "\n"


def emit_breakpoints_js(tokens: dict) -> str:
    """Emite os breakpoints como módulo JS.

    `@media` não consome `var()`, então os limites não podem viver só em CSS.
    Sem uma fonte única, cada media query repete o número literal e nada garante
    que o CSS e o JS concordem. Este módulo é essa fonte para o lado JS; o CSS
    usa os mesmos literais, documentados em 02-layout.md.
    """
    bp = tokens["primitive"]["breakpoint"]
    lines = [
        "// ============================================================",
        "// LUMINA Design System — Breakpoints",
        "// ARQUIVO GERADO por scripts/design/generate_tokens.py",
        "// Não edite à mão. Altere as sementes no gerador e rode-o novamente.",
        "// ============================================================",
        "",
        "/** Limite inferior de cada classe de janela, em px CSS. */",
        "export const BREAKPOINTS = Object.freeze({",
    ]
    for name, value in bp.items():
        lines.append(f"  {name}: {value.removesuffix('px')},")
    lines.append("});")
    lines.append("")
    lines.append("/** Media queries prontas. Só `min-width` — nunca `max-width`. */")
    lines.append("export const MEDIA = Object.freeze({")
    for name, value in bp.items():
        if value == "0px":
            lines.append(f"  {name}: 'all',")
        else:
            lines.append(f"  {name}: '(min-width: {value})',")
    lines.append("});")
    lines.append("")
    lines.append("/** Classe de janela para uma largura em px CSS. */")
    lines.append("export function windowClass(width) {")
    order = [name for name in bp if bp[name] != "0px"]
    for name in reversed(order):
        lines.append(f"  if (width >= BREAKPOINTS.{name}) return '{name}';")
    first = next(iter(bp))
    lines.append(f"  return '{first}';")
    lines.append("}")
    return "\n".join(lines) + "\n"


def emit_components(tokens: dict) -> str:
    out = [HEADER.format(title="Tokens de componente"), "@layer lm.tokens {", "  :root {"]
    for component, entries in tokens["component"].items():
        out.append(f"    /* --- {component} --- */")
        for key, value in entries.items():
            out.append(f"    --{PREFIX}-{component}-{key}: {value};")
        out.append("")
    out.append("  }")
    out.append("}")
    return "\n".join(out) + "\n"


# --------------------------------------------------------------------------- #
# Verificação de contraste
# --------------------------------------------------------------------------- #


def check_contrast(tokens: dict) -> int:
    failures = 0
    print(f"{'tema':6s} {'texto':28s} {'sobre':28s} {'ratio':>7s}  {'min':>5s}  status")
    print("-" * 92)
    for theme in ("light", "dark"):
        colors = tokens["semantic"][theme]["color"]
        for fg_role, bg_role, minimum in CONTRAST_PAIRS:
            ratio = contrast(colors[fg_role], colors[bg_role])
            ok = ratio >= minimum
            failures += 0 if ok else 1
            print(f"{theme:6s} {fg_role:28s} {bg_role:28s} {ratio:7.2f}  {minimum:5.1f}  {'PASS' if ok else 'FAIL'}")
        print("-" * 92)
    if failures:
        print(f"\n{failures} par(es) abaixo do mínimo WCAG 2.2 AA.")
    else:
        print("\nTodos os pares atendem ao mínimo WCAG 2.2 AA.")
    return failures


# --------------------------------------------------------------------------- #
# Verificação de separação da paleta de gráficos sob daltonismo
# --------------------------------------------------------------------------- #

# Mínimos que a paleta categórica precisa sustentar. Os valores são o CHÃO MEDIDO
# da paleta atual, não números aspiracionais — é o que transforma isto num
# ratchet: qualquer regressão cai abaixo e reprova.
#
#   adjacente CVD 9.0   — pior caso medido: 9.07 (escuro, deuteranopia)
#   adjacente normal 20.0 — medido: 21.01 nos dois temas
#   duas séries 20.0    — medido: 23.28 (claro) e 23.32 (escuro)
#   contraste 3.0       — WCAG 1.4.11 para elemento não-textual
SEPARACAO_MINIMA = {
    "adjacente_cvd": 9.0,
    "adjacente_normal": 20.0,
    "duas_series_cvd": 20.0,
    "contraste_superficie": 3.0,
}

# Só protanopia e deuteranopia REPROVAM: são as duas que a paleta declara ter
# validado, e juntas cobrem a grande maioria dos casos. Tritanopia é medida e
# exibida, mas não reprova — a paleta nunca prometeu sustentá-la, e fazer o portão
# falhar por uma promessa que ninguém fez só ensinaria a ignorar o portão.
CVD_BLOQUEANTES = ("protanopia", "deuteranopia")


def check_chart_separation(tokens: dict) -> int:
    """Valida que a paleta categórica continua separável sob daltonismo.

    Fecha a "lacuna de processo" registrada em `docs/design-system/LACUNAS.md`: esta
    verificação existia só como COMENTÁRIO no topo de `CHART_CATEGORICAL`, revalidado
    à mão com uma ferramenta externa. `--check` cobria contraste WCAG, que é uma
    propriedade de luminância — e luminância não diz nada sobre confundir azul com
    violeta. Mudar uma semente de matiz podia degradar a paleta sem que nada
    apontasse.
    """
    rotulos = [rotulo for rotulo, _, _, _ in CHART_CATEGORICAL]
    medidas: list[tuple[str, str, float, float | None, str]] = []

    for theme in ("light", "dark"):
        cores = tokens["chart"]["categorical"][theme]
        superficie = tokens["semantic"][theme]["color"]["chart-surface"]

        # Adjacência é o que importa numa série empilhada, numa linha ou numa legenda
        # em ordem: são os vizinhos que o olho compara. Por isso a ORDEM dos slots é
        # fixa e nunca deve ser ciclada.
        for tipo in (*CVD_BLOQUEANTES, "tritanopia"):
            simuladas = [simulate_cvd(c, tipo) for c in cores]
            pior, par = min(
                (
                    (delta_e_oklab(simuladas[i], simuladas[i + 1]), f"{rotulos[i]}x{rotulos[i + 1]}")
                    for i in range(len(cores) - 1)
                ),
                key=lambda medida: medida[0],
            )
            # Tritanopia entra com mínimo `None`: medida e exibida, nunca bloqueante.
            minimo = SEPARACAO_MINIMA["adjacente_cvd"] if tipo in CVD_BLOQUEANTES else None
            medidas.append((theme, f"adjacente · {tipo}", pior, minimo, par))

        pior_normal = min(delta_e_oklab(cores[i], cores[i + 1]) for i in range(len(cores) - 1))
        medidas.append((theme, "adjacente · visão normal", pior_normal, SEPARACAO_MINIMA["adjacente_normal"], ""))

        # Em scatter e small multiples não há adjacência: qualquer par pode encostar.
        # A paleta só promete DUAS séries limpas nesse cenário; a partir da terceira
        # exige codificação secundária (rótulo direto ou forma).
        duas = min(delta_e_oklab(simulate_cvd(cores[0], k), simulate_cvd(cores[1], k)) for k in CVD_BLOQUEANTES)
        medidas.append((theme, "todos-os-pares · 2 séries · CVD", duas, SEPARACAO_MINIMA["duas_series_cvd"], ""))

        pior_contraste = min(contrast(c, superficie) for c in cores)
        medidas.append((theme, "slot x chart-surface", pior_contraste, SEPARACAO_MINIMA["contraste_superficie"], ""))

    print(f"\n{'tema':6s} {'medida':34s} {'valor':>7s}  {'min':>5s}  status")
    print("-" * 92)
    falhas = 0
    tema_anterior = None
    for theme, nome, valor, minimo, par in medidas:
        if tema_anterior is not None and theme != tema_anterior:
            print("-" * 92)
        tema_anterior = theme
        if minimo is None:
            status, limite = "INFO", "—"
        else:
            ok = valor >= minimo
            falhas += 0 if ok else 1
            status, limite = ("PASS" if ok else "FAIL"), f"{minimo:.1f}"
        sufixo = f"  ({par})" if par else ""
        print(f"{theme:6s} {nome:34s} {valor:7.2f}  {limite:>5s}  {status}{sufixo}")
    print("-" * 92)

    if falhas:
        print(
            f"\n{falhas} medida(s) de separação abaixo do mínimo.\n"
            "A paleta regrediu. Ver o comentário de CHART_CATEGORICAL: a ordem dos slots é\n"
            "o mecanismo de segurança, e mudar uma semente de matiz invalida a validação."
        )
    else:
        print("\nA paleta categórica mantém a separação sob protanopia e deuteranopia.")
    return falhas


def main() -> int:
    parser = argparse.ArgumentParser(description="Gera os design tokens do LUMINA.")
    parser.add_argument("--check", action="store_true", help="Valida contraste sem escrever arquivos.")
    args = parser.parse_args()

    tokens = build_tokens()

    if args.check:
        # Os dois somados, e não `or`: as duas verificações rodam sempre, para que um
        # relatório mostre TODAS as falhas de uma vez em vez de uma por execução.
        return 1 if check_contrast(tokens) + check_chart_separation(tokens) else 0

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "tokens.json").write_text(json.dumps(tokens, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (OUT_DIR / "primitives.css").write_text(emit_primitives(tokens), encoding="utf-8")
    (OUT_DIR / "semantic.css").write_text(emit_semantic(tokens), encoding="utf-8")
    (OUT_DIR / "components.css").write_text(emit_components(tokens), encoding="utf-8")
    (OUT_DIR / "breakpoints.js").write_text(emit_breakpoints_js(tokens), encoding="utf-8")

    # Cópia para o wizard: os três arquivos concatenados, e a ordem das camadas
    # declarada no topo — sem ela, `@layer lm.tokens` num documento que não conhece
    # a ordem entra como a última camada e passa a vencer o CSS do próprio wizard.
    wizard_css = "\n".join(
        [
            HEADER.format(title="Tokens para o wizard do Electron"),
            "@layer lm.tokens, lm.wizard;",
            "",
            emit_primitives(tokens),
            emit_semantic(tokens),
            emit_components(tokens),
        ]
    )
    WIZARD_OUT.parent.mkdir(parents=True, exist_ok=True)
    WIZARD_OUT.write_text(wizard_css, encoding="utf-8")

    for name in ("tokens.json", "primitives.css", "semantic.css", "components.css", "breakpoints.js"):
        path = OUT_DIR / name
        print(f"gerado  {path.relative_to(REPO_ROOT)}  ({path.stat().st_size:,} bytes)")
    print(f"gerado  {WIZARD_OUT.relative_to(REPO_ROOT)}  ({WIZARD_OUT.stat().st_size:,} bytes)")

    print()
    return 1 if check_contrast(tokens) + check_chart_separation(tokens) else 0


if __name__ == "__main__":
    sys.exit(main())
