# LUMINA Design System

**Versão 1.0.0** · Fonte única de verdade para as decisões de interface do LUMINA.

Este sistema existe para que ninguém precise decidir duas vezes a mesma coisa. Toda decisão
visual recorrente — uma cor, um espaçamento, um raio, uma duração, o comportamento de um
estado — está registrada como token ou como regra. Improvisar um valor é um bug, não um
atalho.

---

## Índice

| Documento | Conteúdo |
|---|---|
| [`01-fundamentos.md`](01-fundamentos.md) | Identidade, arquitetura de tokens, cores, tipografia, espaçamento, formas, elevação, iconografia, movimento |
| [`02-layout.md`](02-layout.md) | Grid, breakpoints, densidade, padrões de layout, navegação adaptativa, camadas (z-index) |
| [`03-acessibilidade.md`](03-acessibilidade.md) | WCAG 2.2 AA, foco, teclado, alvos de toque, leitores de tela, matriz de testes |
| [`04-conteudo.md`](04-conteudo.md) | Microcopy, terminologia, mensagens de erro, internacionalização |
| [`05-componentes.md`](05-componentes.md) | Catálogo de componentes, anatomia, variantes, estados, tokens |
| [`06-padroes.md`](06-padroes.md) | Padrões de composição — formulários, busca, dashboards, confirmação destrutiva |
| [`07-implementacao.md`](07-implementacao.md) | Estrutura de arquivos, cascade layers, temas, API de componentes, gráficos |
| [`08-governanca.md`](08-governanca.md) | Versionamento, processo de mudança, testes, checklist de qualidade |
| [`LACUNAS.md`](LACUNAS.md) | Registro consolidado das lacunas de token — fonte autoritativa, substitui as listas ao final de cada documento |
| [`PLANO_REFATORACAO.md`](PLANO_REFATORACAO.md) | **Documento único de execução** — diagnóstico, estratégia, 13 fases, riscos e checklist |

---

## 1. Visão geral

O LUMINA é um aplicativo desktop de gestão de aluguel por temporada. Um único usuário
administrador o mantém aberto durante o dia, alternando entre calendário, conflitos,
documentos e e-mails. Isso define a natureza do sistema:

- **Produtividade antes de vitrine.** Densidade útil, alinhamento à esquerda, teclado de
  primeira classe. Não é um site de marketing.
- **Local, offline, Electron.** Nenhum recurso visual pode depender de rede. Fontes, ícones
  e ilustrações são empacotados.
- **Dados com consequência.** Uma reserva perdida custa dinheiro real. Estados de erro,
  carregamento e vazio não são detalhe — são metade do produto.

## 2. Filosofia

**Luz calma.** A interface deve parecer iluminada e silenciosa: superfícies levemente
tonais em vez de branco puro, uma única cor de ação, cantos generosos, movimento curto e
funcional. O conteúdo é a única coisa que tem permissão para chamar atenção.

Quando duas decisões conflitam, a ordem de desempate é fixa:

| Conflito | Vence |
|---|---|
| Estética × usabilidade | Usabilidade |
| Expressividade × legibilidade | Legibilidade |
| Compactação × acessibilidade | Acessibilidade |
| Exceção local × consistência global | Consistência, salvo justificativa funcional documentada |

## 3. Princípios

### 3.1 Clareza acima de decoração
A tela responde sem esforço: onde estou, o que posso fazer, qual é a ação principal, o que
acabou de acontecer, como desfazer. Nenhum elemento decorativo compete com o conteúdo.

### 3.2 Hierarquia explícita
Hierarquia se constrói com tamanho, espaçamento, posição, agrupamento e peso — **nunca só
com cor**. Cor é o último recurso da hierarquia, não o primeiro.

### 3.3 Familiaridade e previsibilidade
Componentes parecidos se parecem, reagem igual e têm os mesmos estados. Não existem duas
variações do mesmo componente sem motivo funcional documentado.

### 3.4 Simplicidade estrutural
Poucos níveis de navegação, agrupamentos claros, ações contextuais. Proibido: cards dentro
de cards, modal para decisão pequena, divisores em excesso, duas ações primárias na mesma
região.

### 3.5 Expressividade controlada
Formas arredondadas, containers tonais e transições existem — reservadas para ação
principal, seleção, estados vazios, feedback e onboarding. Fora desses momentos, o sistema
é discreto.

### 3.6 Acessibilidade nativa
Contraste, foco, teclado e semântica são requisitos de projeto, não uma etapa posterior. Um
componente sem estado de foco visível e sem operação por teclado está incompleto, não
"quase pronto".

### 3.7 Responsividade real
Layout não encolhe: ele se reorganiza. Rail vira drawer vira navegação inferior; painel
auxiliar desaparece; tabela vira lista de cards.

### 3.8 Consistência sem rigidez
Exceções são permitidas quando têm motivo funcional, são documentadas, reutilizam tokens e
não criam uma linguagem visual paralela.

---

## 4. Decisões estruturais desta versão

Registradas aqui porque afetam todo o resto do sistema.

| Decisão | Escolha | Motivo |
|---|---|---|
| **Navegação** | Navigation rail adaptativo | Escala melhor que abas horizontais com as 10 páginas atuais e libera altura vertical num app de uso prolongado |
| **CSS** | Custom properties + `@layer`, sem novas dependências | Permite migração incremental arquivo a arquivo sem tocar no build Vite existente |
| **Temas** | Claro (padrão) e escuro, ambos completos | Requisito de acessibilidade e conforto; superfícies tonais claras são a base da identidade |
| **Ícones** | `lucide-react` (mantido) | Família única e consistente, já instalada, SVG tree-shakeable e offline. Material Symbols exigiria empacotar uma fonte variável — custo sem ganho |
| **Tipografia** | Inter **auto-hospedada** | O `@import` atual aponta para o CDN do Google Fonts: sem rede, o app perde a fonte. Empacotar é correção de bug, não preferência |
| **Densidade** | `default` (controles de 40px) | `compact` disponível para tabelas; `comfortable` forçado onde o ponteiro é grosseiro |
| **Cor** | Derivada por matemática de cor, não escolhida no olho | Tons com luminância CIE L\* conhecida tornam o contraste previsível e auditável |

## 5. Como as cores são produzidas

As paletas **não são escolhidas manualmente**. `scripts/design/generate_tokens.py` deriva
cada rampa a partir de uma semente em LCh(ab): matiz e croma fixos, luminância igual ao
número do tom. O tom 40 tem L\* = 40 em qualquer paleta — por isso `primary` e `error` têm
praticamente o mesmo contraste sobre a mesma superfície, e por isso trocar uma matiz não
quebra o contraste do sistema.

```bash
python scripts/design/generate_tokens.py
```

```bash
python scripts/design/generate_tokens.py --check
```

O modo `--check` percorre 68 pares "texto sobre fundo" nos dois temas e sai com código 1 se
algum ficar abaixo do mínimo WCAG 2.2 AA. **Todos os 68 passam nesta versão.** Rode-o sempre
que alterar uma semente; ele é o teste de contraste do sistema.

Os arquivos em `frontend/src/styles/tokens/` são **gerados**. Editá-los à mão é sempre
errado — a próxima execução do gerador descarta a edição.

## 6. Estado de completude

Honestidade sobre o que já existe e o que ainda não:

| Área | Estado |
|---|---|
| Tokens primitivos, semânticos e de componente | ✅ Gerados e validados — 68 papéis semânticos, 22 blocos de componente |
| Temas claro e escuro | ✅ Completos, 80+ pares de contraste verificados |
| Paleta de gráficos (categórica, sequencial, ordinal, divergente, status) | ✅ Validada nos dois modos |
| Os oito documentos, `01` a `08` | ✅ Escritos |
| Componentes — os 19 fundamentais | ✅ Documentação completa |
| Componentes — o catálogo restante | ⚠️ Especificação resumida; documentação completa é backlog de governança |
| Lacunas de token com contraste reprovado | ✅ Fechadas — ver [`LACUNAS.md`](LACUNAS.md) |
| Plano de refatoração consolidado | ✅ 13 fases |
| Código dos componentes React | ❌ Não iniciado — é o objeto do plano |

**Verificações executadas.** Nenhum token inventado: todo nome `--lm-*` citado na
documentação existe nos arquivos gerados, é contraexemplo didático explícito, ou está
declarado como lacuna. Contraste verificado por `--check` nos dois temas. Paleta de gráficos
revalidada contra as superfícies reais após a última mudança na rampa neutra.

**Não executado.** A crítica adversarial de consistência cruzada entre os oito documentos
não rodou por completo — a verificação foi mecânica (nomes de token, cobertura de
componentes, coerência numérica das dimensões e durações).

Para executar a refatoração, abra [`PLANO_REFATORACAO.md`](PLANO_REFATORACAO.md).
