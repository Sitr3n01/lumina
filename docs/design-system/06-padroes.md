# Padrões de composição

**LUMINA Design System · Documento 06**

Componentes resolvem "como um botão se parece". Padrões resolvem "quantos botões existem
nesta tela, qual deles é o primário e o que acontece quando a lista está vazia". Este
documento é o segundo tipo de decisão: como os componentes de [`05-componentes.md`](05-componentes.md)
se combinam para formar uma tela que funciona.

Um padrão só entra aqui quando aparece em mais de um lugar do produto. Composição usada uma
única vez é uma tela, não um padrão.

---

## Anatomia de um padrão

Todo padrão neste documento responde às mesmas sete perguntas, sempre na mesma ordem:

| Bloco | Pergunta que responde |
|---|---|
| **Estrutura** | Que regiões existem e em que ordem de leitura |
| **Componentes** | Quais peças do catálogo entram e com quais tokens |
| **Hierarquia de ações** | Qual é a primária, quais são as secundárias, onde ficam |
| **Estados** | Vazio, carregando, erro, parcial, conteúdo |
| **Teclado** | Foco inicial, ordem, atalhos, para onde o foco volta |
| **Responsividade** | O que se reorganiza em cada breakpoint |
| **Erros comuns** | Composições erradas que este padrão existe para impedir |

Quando o padrão mapeia numa página existente do LUMINA, um bloco final **No LUMINA** diz qual
é a página e o que precisa mudar nela.

---

## Regras transversais

Estas regras valem em todos os padrões. Um padrão pode restringi-las, nunca contradizê-las.

### Uma ação primária por região

| Nível | Componente | Token | Quantidade |
|---|---|---|---|
| Primária | Botão preenchido | `--lm-button-filled-bg` / `--lm-button-filled-label` | Exatamente 1 por região |
| Secundária | Botão tonal ou contornado | `--lm-button-tonal-bg` / `--lm-button-outlined-border` | 0 a 2 |
| Terciária | Botão de texto | `--lm-button-text-label` | Sem limite rígido, mas agrupe |
| Destrutiva | Botão destrutivo | `--lm-button-destructive-bg` / `--lm-button-destructive-label` | Nunca é a primária de uma página |
| De item | Botão de ícone ou menu de estouro | `--lm-icon-button-color`, `--lm-menu-bg` | Máx. 2 ícones visíveis + estouro |

"Região" é uma página, um cartão, um dialog ou um painel — qualquer caixa com título próprio.
Duas primárias lado a lado com a mesma largura têm a mesma ênfase percebida, independentemente
da cor: peso visual é área × contraste, não só cor.

### Ordem dos botões

No rodapé de qualquer contêiner de decisão (dialog, painel, formulário), as ações ficam
alinhadas ao fim do contêiner, com **cancelar à esquerda e confirmar à direita**. É a
convenção do Windows, que é a plataforma do LUMINA. Empilhadas (em `compact`), a ordem de
leitura inverte: confirmar em cima, cancelar embaixo, ambas com largura total.

### Contrato de estados

Toda região que exibe dados declara cinco estados. Nenhum é opcional:

| Estado | Quando | Regra |
|---|---|---|
| **Carregando** | Requisição em curso | Esqueleto com a geometria final. Nunca um giro que substitui a região |
| **Vazio inicial** | Nunca houve dado | Explica o que apareceria aqui + a ação que produz o primeiro dado |
| **Vazio por filtro** | Há dado, o filtro zerou | Texto diferente do vazio inicial + "Limpar filtros" |
| **Erro** | A requisição falhou | Escopo nomeado + o que ainda funciona + "Tentar novamente" |
| **Conteúdo** | Há dado | — |

Um sexto estado existe sempre que a tela agrega várias requisições: **parcial**. Cada região
possui o seu próprio estado; uma falha em um endpoint não pode apagar as regiões que
carregaram.

### Feedback: qual superfície para qual mensagem

| Superfície | Uso | Persistência | Token |
|---|---|---|---|
| Snackbar | Confirmar uma ação que o usuário acabou de disparar; no máximo uma ação ("Desfazer") | Efêmera | `--lm-snackbar-bg`, `--lm-snackbar-label`, `--lm-snackbar-action` |
| Faixa inline | Condição que persiste até ser resolvida (serviço fora, sincronização falhou) | Até resolver | `--lm-color-warning-container` / `--lm-color-error-container` |
| Central de notificações | Registro de eventos do sistema; não interrompe | Permanente | Página |
| Dialog | Só quando o fluxo não pode continuar sem uma decisão | Bloqueante | `--lm-dialog-bg`, `--lm-dialog-scrim` |

Um snackbar por vez. O novo substitui o anterior; nunca empilhe. Snackbar não comunica erro
que exige ação — isso é faixa inline.

### Foco declarado

Todo padrão declara três coisas: onde o foco entra, o que o prende e para onde ele volta.
Uma composição que abre uma camada sem mover o foco está incompleta. O anel de foco é único
no sistema:

```css
:where(a, button, input, select, textarea, summary, [tabindex]):focus-visible {
  outline: var(--lm-focus-ring-width) solid var(--lm-focus-ring-color);
  outline-offset: var(--lm-focus-ring-offset);
}
```

Sobre superfícies invertidas (snackbar, tooltip, superfície `--lm-color-inverse-surface`), a
cor do anel passa a `--lm-focus-ring-color-inverse`.

### Camadas

A ordem de empilhamento é fixa e vem de `--lm-z-base`, `--lm-z-sticky`, `--lm-z-dropdown`,
`--lm-z-popover`, `--lm-z-overlay`, `--lm-z-drawer`, `--lm-z-modal`, `--lm-z-toast`,
`--lm-z-critical`. Nenhum valor literal de `z-index` no código de padrão. A faixa de
indisponibilidade do serviço local é a única que usa `--lm-z-critical`.

---

## Padrão 1 — Login e autenticação

**Estrutura.** Tela única, cartão centrado, largura máxima 400px sobre `--lm-color-surface`.
Três regiões verticais: marca, formulário, ação. Nada mais. Sem rodapé, sem links
institucionais, sem ilustração.

O LUMINA tem **um administrador e uma conta**, criada no assistente de instalação. Isso muda
o padrão de forma essencial: **a tela de login não é um funil**. Não há cadastro, não há
"criar conta", não há recuperação por e-mail — não existe servidor de e-mail garantido nem
segundo usuário para quem pedir ajuda. A tela tem exatamente uma pergunta: você é o
administrador desta instalação?

**Componentes.** Cartão elevado (`--lm-card-elevated-bg`, `--lm-card-elevated-shadow`,
`--lm-card-radius`), dois campos de texto (`--lm-field-*`), um interruptor de sessão, um
botão preenchido de largura total, uma região de mensagem.

| Elemento | Tipografia | Cor |
|---|---|---|
| Marca "LUMINA" | `--lm-type-headline-sm-*` | `--lm-color-primary` |
| Subtítulo de contexto | `--lm-type-body-md-*` | `--lm-color-on-surface-variant` |
| Rótulo de campo | `--lm-type-label-md-*` | `--lm-field-label` |
| Mensagem de erro | `--lm-type-body-md-*` | `--lm-color-on-error-container` sobre `--lm-color-error-container` |

**Hierarquia de ações.** Uma primária: "Entrar". Zero secundárias. Uma terciária opcional,
"Não consigo entrar", que abre um dialog explicando o único caminho real de recuperação —
reconfigurar pelo assistente de instalação, com o aviso do que se perde.

**Estados.**

| Estado | Composição |
|---|---|
| Verificando a instalação | O cartão já está desenhado, com os campos presentes e desabilitados e um indicador linear sob a marca. A geometria não muda quando termina |
| Enviando | O botão mantém rótulo e largura, ganha indicador e `aria-busy="true"` |
| Credencial inválida | Faixa `role="alert"` acima das ações; o nome de usuário permanece, a senha é limpa, o foco vai para a senha |
| Serviço local indisponível | Mensagem distinta, com a composição do padrão 16 — nunca "usuário ou senha inválidos" |
| Conta ainda não criada | Só ocorre fora do Electron. É um estado de recuperação, rotulado como tal, não uma tela de cadastro |

**Teclado.** Enter submete de qualquer campo. O foco inicial vai para a senha quando há um
nome de usuário lembrado, e para o nome de usuário quando não há — nunca para um campo já
preenchido que o usuário não vai editar. Ordem: usuário → senha → mostrar senha → manter
sessão → entrar. O botão de mostrar senha é um `<button type="button">` alcançável, com
`aria-pressed` e rótulo que alterna entre "Mostrar senha" e "Ocultar senha".

**Responsividade.** Abaixo de `medium` (600px) o cartão ocupa a largura disponível com margem
`--lm-space-16` e perde a sombra; a marca continua acima da dobra em qualquer altura de
janela. Em `(pointer: coarse)`, os campos herdam `--lm-density-control` de 48px.

**Erros comuns.**

- Dois modos (entrar e cadastrar) no mesmo formulário, decididos por uma chamada de rede. O
  usuário não deve descobrir qual formulário está vendo depois que a tela pintou.
- Desabilitar o botão primário enquanto os campos estiverem vazios: o motivo fica invisível.
  Mantenha habilitado e valide na ativação.
- Esconder as regras de senha até a falha. Elas são texto de ajuda, visíveis antes de digitar.
- Trocar o cartão inteiro por um giro durante a verificação inicial — a tela salta.

**No LUMINA.** `frontend/src/pages/Login.jsx`. O arquivo carrega dois formulários (`mode`
`'login'` e `'setup'`), um estilo `<style>` embutido no fim do componente com `#101922`
literal, e o botão de revelar senha com `tabIndex={-1}`. O alvo: um único formulário, estilo
em folha própria com tokens, botão de revelar acessível, e o caminho de "setup" reduzido a um
estado de recuperação explícito.

---

## Padrão 2 — Onboarding e wizard de configuração inicial

**Estrutura.** Janela cheia, três faixas: indicador de etapas no topo, conteúdo centrado com
largura máxima de 640px, barra de ações fixa no rodapé. O conteúdo rola; o indicador e a barra
não.

Um wizard existe quando a ordem importa e o resultado é uma configuração que o produto exige
para funcionar. É exatamente o caso do LUMINA: sem imóvel, proprietário e conta de
administrador, nenhuma outra tela tem sentido.

**Componentes.** Indicador de etapas (lista ordenada, não uma barra de porcentagem), campos
(`--lm-field-*`), cartões de escolha quando a etapa é uma decisão (`--lm-card-outlined-border`,
selecionado com `--lm-card-selected-bg`), barra de ações com um botão preenchido, um contornado
e, quando a etapa é opcional, um de texto.

**Hierarquia de ações.**

| Posição | Ação | Componente |
|---|---|---|
| Direita | "Continuar" / "Concluir" | Preenchido |
| Esquerda | "Voltar" | Contornado ou texto |
| Junto a "Continuar" | "Pular esta etapa" | Texto — nunca com peso de primária |

"Voltar" nunca é desabilitado, nem na primeira etapa (onde vira "Cancelar instalação", com
confirmação). Uma etapa opcional diz que é opcional **na própria etapa**, não só no botão.

**Estados.**

| Estado | Composição |
|---|---|
| Etapa válida | Barra normal |
| Etapa com pendência | "Continuar" permanece habilitado; ao ativar, o foco vai para o primeiro campo inválido e a mensagem aparece sob ele |
| Verificando (testar iCal, testar SMTP) | Indicador dentro do próprio botão de teste, resultado inline sob o grupo. A etapa continua avançável mesmo com o teste falhando, desde que o dado seja opcional |
| Gravando ao concluir | Botão ocupado + lista de tarefas com estado ("Criando banco de dados", "Salvando configuração", "Criando conta") |
| Falha ao concluir | Nada é perdido: o wizard permanece na revisão com a mensagem do que falhou e "Tentar novamente" |

**Etapa de revisão.** Obrigatória. Lista todos os grupos com os valores preenchidos e um botão
de texto "Editar" por grupo, que salta para a etapa correspondente e volta para a revisão ao
concluir. Segredos aparecem mascarados, com o estado ("Senha configurada"), nunca o valor.
A revisão declara onde os dados serão gravados e que tudo permanece na máquina.

**Teclado.** Enter avança quando o foco está num campo. Escape não faz nada — abandonar a
instalação é uma decisão que passa por "Cancelar instalação" com confirmação. Na troca de
etapa, o foco vai para o **título da etapa** (`tabindex="-1"` + `focus()`), não para o primeiro
campo: quem usa leitor de tela precisa ouvir onde está antes de digitar. O indicador de etapas
não é uma lista de links navegáveis para frente — só etapas já concluídas são clicáveis.

**Responsividade.** Em `medium` e abaixo, o indicador colapsa para "Etapa 4 de 8" com uma barra
de progresso; a barra de ações permanece fixa no rodapé; o conteúdo ganha
`padding-inline: var(--lm-space-16)`.

**Erros comuns.**

- Emoji como ícone de etapa. Renderiza diferente por plataforma, não herda cor e é anunciado
  literalmente por leitores de tela. Use ícone `lucide-react` + rótulo textual.
- Barra de porcentagem sem número de etapa: "73%" não diz quanto falta em decisões.
- Esconder o que acontece ao concluir.
- Um wizard com identidade visual própria. A primeira tela do produto tem de parecer o produto.

**No LUMINA.** `electron/wizard/wizard.html` (8 etapas: boas-vindas, imóvel, proprietário,
calendários, e-mail, conta de administrador, template de autorização, revisão) com
`electron/wizard/wizard.css` — uma folha de estilo de 23 KB completamente independente do
frontend. Duas linguagens visuais para o mesmo produto. O alvo: o wizard importa
`primitives.css`, `semantic.css` e `components.css`, e os títulos de etapa trocam o emoji por
ícone + rótulo. As oito etapas em si estão bem divididas e devem ser mantidas.

---

## Padrão 3 — Criação de item

**Estrutura.** O contêiner é escolhido pelo tamanho do formulário, não pelo gosto:

| Campos | Contêiner | Justificativa |
|---|---|---|
| Até 4, sem dependências entre campos | Dialog (`--lm-dialog-max-width`, 560px) | A decisão cabe sem rolagem e o contexto atrás continua útil |
| 5 a 12 | Painel lateral, altura total | O usuário precisa ver a lista enquanto cria |
| Mais de 12, ou com seções, ou com listas dinâmicas | Página dedicada | Rolagem dentro de camada modal é um erro estrutural |

Um formulário com rolagem interna dentro de um dialog significa que o contêiner errado foi
escolhido.

**Componentes.** Cabeçalho com título (`--lm-type-title-lg-*`) e botão de fechar; corpo com
grupos de campos; rodapé de ações. Campos agrupados em `<fieldset>` com `<legend>` quando há
mais de um grupo.

**Hierarquia de ações.** Uma primária com o verbo do resultado ("Gerar autorização", "Criar
reserva"), nunca "Salvar" nem "OK". Uma secundária "Cancelar". Variantes do mesmo resultado
(autorização × recibo) não são dois botões: são uma escolha **antes** do formulário, feita por
um grupo de opções ou um seletor segmentado.

**Estados.**

| Estado | Composição |
|---|---|
| Salvando | Primária ocupada; os campos permanecem legíveis e não são desabilitados em bloco |
| Erro de validação | Foco no primeiro campo inválido; mensagem sob o campo com `--lm-field-error-text` e borda `--lm-field-border-error`. Um sumário no topo só quando houver 3 erros ou mais |
| Erro do servidor | Faixa inline no topo do corpo, dados preservados, ação "Tentar novamente" |
| Sucesso | A camada fecha, o item novo aparece destacado na lista por um instante, snackbar com "Ver" ou "Desfazer" |

**Teclado.** Foco inicial no primeiro campo editável. Foco preso na camada. Escape fecha
**apenas se o formulário estiver limpo**; sujo, Escape abre a confirmação de descarte. Ao
fechar, o foco volta ao gatilho. Enter dentro de um campo de linha única submete; dentro de um
`textarea`, quebra linha.

**Responsividade.** Abaixo de `medium`, o dialog vira folha de tela cheia com a barra de ações
fixa no rodapé. O painel lateral vira página com "Voltar". A página dedicada mantém-se em uma
coluna com largura máxima de leitura.

**Erros comuns.**

- Fechar ao clicar no scrim com o formulário sujo.
- Duas ações de mesma largura no rodapé competindo pelo papel de primária.
- Abas dentro do dialog: duas camadas de navegação dentro de uma camada modal.
- Pedir a chave primária ("ID da Reserva") em vez de oferecer um seletor de reserva com busca
  por hóspede e data.

**No LUMINA.** `frontend/src/pages/Documents.jsx`, modal "Gerar Autorização de Hospedagem"
(linhas 371–681): `modal-large` de 800px, com abas internas, cinco seções, cerca de quinze
campos e lista dinâmica de acompanhantes. Pela tabela acima, é uma página dedicada. As duas
ações de mesma largura com `flex: 1` (linhas 413–432) viram um seletor "Tipo de documento"
(Autorização | Recibo) acima de uma única primária. O campo "ID da Reserva" (linhas 399–411)
vira um seletor de reserva.

---

## Padrão 4 — Edição de item

**Estrutura.** Idêntica à da criação. O que muda é o título, o rótulo da primária ("Salvar
alterações") e a existência de um estado "nada alterado".

**Duas formas, dois usos:**

| Forma | Quando | Confirmação |
|---|---|---|
| Edição inline | Um valor atômico dentro de uma linha ou cartão | Confirma ao sair do campo; Escape reverte |
| Formulário de edição | Um conjunto coerente de campos | Confirma na ação primária |

**Hierarquia de ações.** Uma primária "Salvar alterações". Uma secundária "Cancelar". As ações
destrutivas do item (excluir, arquivar) **não ficam no rodapé de edição** — ficam no menu de
estouro do cabeçalho ou numa zona destrutiva ao fim do formulário, e passam pelo padrão 13.

**Estados.**

| Estado | Composição |
|---|---|
| Sem alterações | A primária permanece habilitada. Ao ativar sem mudanças, snackbar "Nada a salvar" e a camada fecha |
| Sujo | Indicador discreto no cabeçalho ("Alterações não salvas") com `--lm-type-label-md-*` e `--lm-color-on-surface-variant` |
| Salvando | Primária ocupada |
| Salvo | Snackbar com "Desfazer" quando a operação for revertível |
| Campo derivado de sincronização | Somente leitura, com a origem declarada e uma ação explícita para descolar |

**Reversibilidade.** Toda edição precisa de um caminho de volta. Quando o desfazer imediato
não for possível, o registro da alteração aparece na central de notificações com o valor
anterior.

**Dado que o sistema reescreve.** As reservas do LUMINA vêm de iCal e são reescritas pela
sincronização automática. Editar um campo que a próxima sincronização vai sobrescrever é uma
armadilha. Regra: campos de origem externa são somente leitura por padrão, exibem a plataforma
de origem com `--lm-color-airbnb-container` / `--lm-color-booking-container`, e só se tornam
editáveis por uma ação nomeada que declare a consequência ("Este campo deixará de ser
atualizado pela sincronização").

**Teclado.** Igual ao padrão 3. Na edição inline: Enter confirma, Escape reverte e devolve o
foco à linha, Tab confirma e avança.

**Responsividade.** Igual ao padrão 3.

**Erros comuns.**

- Um modo global de edição que destrava dezenas de campos de uma vez. É um modo oculto: o
  usuário não sabe o que está editável nem por quê.
- Reduzir a opacidade de campos somente leitura. `opacity` derruba o contraste do texto abaixo
  do mínimo AA. Um campo somente leitura mantém a cor do texto, muda o fundo para
  `--lm-color-surface-container` e ganha um rótulo de estado.
- Misturar excluir e salvar na mesma barra.

**No LUMINA.** `frontend/src/pages/Settings.jsx` linha 12 e linhas 277–283: o interruptor
`editMode` (cadeado aberto/fechado) alterna `readOnly` em cerca de doze campos simultaneamente.
Substituir por desbloqueio por seção, com o motivo declarado em cada campo travado
("Definido na instalação"). E `frontend/src/styles/global.css` linhas 292–295
(`input[readonly] { opacity: 0.7 }`) deixa de existir.

---

## Padrão 5 — Formulário longo e seccionado

**Estrutura.** Duas colunas a partir de `expanded` (840px):

```
┌──────────────┬───────────────────────────────┐
│ índice de    │ seção ativa                   │
│ seções       │  ├ cabeçalho + descrição      │
│ (sticky,     │  ├ campos                     │
│  240px)      │  └ ações da seção (só se suja)│
│ + filtro     │ próxima seção…                │
└──────────────┴───────────────────────────────┘
```

O conteúdo tem largura máxima de leitura (cerca de 720px). O índice é uma lista de âncoras que
destaca a seção visível. Todas as seções ficam na mesma página, roláveis — o índice navega,
não troca de tela.

**Salvamento por seção, não global.** Cada seção tem a sua própria barra de ações, que aparece
somente quando aquela seção está suja e desaparece ao salvar. Justificativa: num formulário de
dez seções, um único botão global torna o raio de impacto de um engano igual à configuração
inteira e torna impossível responder "o que exatamente eu mudei?".

**Componentes.** Índice (lista de âncoras + campo de filtro), cabeçalho de seção
(`--lm-type-title-md-*` + descrição em `--lm-type-body-md-*` com `--lm-color-on-surface-variant`),
grupos de campos em `<fieldset>`/`<legend>`, barra de ações da seção, zona destrutiva ao fim.

**Hierarquia de ações.** Por seção: uma primária "Salvar" e uma secundária "Descartar". No
nível da página: nenhuma ação primária. A zona destrutiva vive na sua própria seção, no fim, e
usa contorno de erro em vez de preenchimento — um botão destrutivo preenchido em repouso atrai
o olho para a única coisa que ninguém deveria clicar sem querer.

**Estados.**

| Estado | Composição |
|---|---|
| Carregando | Esqueleto do índice + esqueleto de três seções |
| Seção suja | Barra de ações da seção aparece; o item correspondente no índice ganha um marcador |
| Salvando seção | Primária da seção ocupada; as demais seções continuam utilizáveis |
| Erro ao salvar seção | Faixa dentro da seção, valores preservados |
| Campo somente leitura | Valor visível, fundo `--lm-color-surface-container`, chip com a origem e ação "Como alterar" |
| Segredo configurado | Nunca mostra o valor: estado + "Substituir" + "Remover" |

**Teclado.** O índice é navegável por Tab; ativar um item rola até a seção **e move o foco para
o título dela**. O campo de filtro do índice responde a `/` quando nenhum campo está em foco.
Cada seção é `<section aria-labelledby>` com o título em `h2`.

**Responsividade.**

| Breakpoint | Composição |
|---|---|
| `large` e `xlarge` | Índice fixo 240px + conteúdo |
| `expanded` | Índice fixo 200px + conteúdo |
| `medium` | Índice vira uma linha de chips roláveis no topo |
| `compact` | Lista de seções → uma seção por tela, com "Voltar" |

**Erros comuns.**

- Agrupar por dificuldade ("Fácil" × "Avançada"). O usuário sabe **o que** quer mudar, não o
  quão avançado isso é. Agrupe por assunto.
- Um botão global "Salvar tudo" no rodapé.
- Uma aba com cor própria, criando uma segunda marca dentro do produto.
- Ação catastrófica na mesma barra que a ação rotineira.

**No LUMINA.** `frontend/src/pages/Settings.jsx` — 893 linhas, três abas ("Configuração Fácil",
"Configuração Avançada", "Inteligência Artificial"). Estrutura alvo, dez seções derivadas dos
campos que já existem no arquivo:

| # | Seção | Conteúdo | Salvamento |
|---|---|---|---|
| 1 | Imóvel | Nome, endereço, máximo de hóspedes | Explícito |
| 2 | Condomínio | Nome, administração, e-mail, logo | Explícito |
| 3 | Proprietário | Nome, e-mail, telefone, apto, bloco, garagem | Explícito |
| 4 | Plataformas | URLs iCal (origem: instalação), intervalo de sincronização | Explícito |
| 5 | E-mail | Provedor, remetente, estado da senha + "Testar conexão" | Explícito |
| 6 | Telegram | Token mascarado, IDs de administrador | Explícito |
| 7 | Inteligência artificial | Provedor, chave, modelo, URL base + "Testar conexão" | Explícito |
| 8 | Aparência | Tema (claro/escuro/sistema), densidade | Imediato |
| 9 | Sistema | Iniciar com o Windows, manter sessão, versão, atualizações | Imediato |
| 10 | Dados e reinicialização | Hard Reset | Confirmação por digitação |

A seção 8 não existe hoje e é obrigatória: sem ela, as decisões de tema e densidade do sistema
não têm controle. O "Hard Reset" (linhas 266–276, com `background: '#e53e3e'` embutido) sai da
barra de ações e vai para a seção 10. A aba de IA com `#8b5cf6` (linhas 242 e 732) perde a cor
própria — o acento do sistema é `--lm-color-tertiary`.

---

## Padrão 6 — Filtros e busca

**Estrutura.** Uma faixa acima da lista, sempre visível, com três linhas lógicas: busca,
filtros disponíveis, filtros aplicados. A terceira linha só existe quando há filtro ativo.

**Componentes.** Campo de busca (`type="search"`, ícone de lupa à esquerda, botão de limpar à
direita quando há texto), chips de filtro (`--lm-chip-height`, `--lm-chip-radius`,
selecionados com `--lm-chip-selected-bg` / `--lm-chip-selected-label`), menu
(`--lm-menu-bg`, `--lm-menu-item-height`) quando as opções passam de seis.

| Nº de opções | Componente |
|---|---|
| 2 a 3, exclusivas | Botão segmentado |
| 4 a 6 | Chips de filtro |
| 7 ou mais | Menu com busca interna |
| Intervalo (datas, valores) | Campo par com validação cruzada |

**Hierarquia de ações.** Nenhuma primária. Filtros são controles, não decisões. "Limpar tudo"
é um botão de texto e só aparece com dois ou mais filtros ativos.

**Estados.**

| Estado | Composição |
|---|---|
| Buscando | Indicador dentro do campo, à direita; a lista anterior permanece visível e esmaecida — nunca é apagada |
| Resultado | Contagem anunciada por `aria-live="polite"`: "12 resultados" |
| Vazio por filtro | "Nenhum conflito com estes filtros" + "Limpar filtros". Distinto do vazio inicial |
| Erro na consulta | Faixa acima da lista, filtros preservados |

**Regras.**

- Filtro aplicado é sempre visível como chip removível. Esconder filtros atrás de um painel
  fechado faz o usuário concluir que não há dados.
- A busca é debounced em 250 ms e nunca reordena a lista enquanto o usuário digita.
- O estado dos filtros sobrevive à navegação de ida e volta na mesma sessão.
- O identificador interno de um filtro nunca aparece no rótulo.

**Teclado.** `/` foca a busca quando nenhum campo está em foco. Escape limpa o campo na
primeira vez e devolve o foco à lista na segunda. Chips aplicados são alcançáveis por Tab;
`Delete` ou `Backspace` remove o chip em foco.

**Responsividade.** Em `compact`, a linha de chips rola horizontalmente com desvanecimento nas
bordas e sem barra de rolagem visível; a busca ocupa a largura total acima dela.

**Erros comuns.**

- Apagar a lista durante a busca.
- Usar o mesmo texto de vazio para "nunca houve dado" e "o filtro zerou".
- Filtros num painel recolhido por padrão.
- Contagem de resultados que não é anunciada — quem usa leitor de tela não percebe a mudança.

**No LUMINA.** `frontend/src/pages/Notifications.jsx` linhas 249–259 tem seis abas de filtro
mas nenhuma busca textual; as abas são o componente errado (aba = seção de conteúdo, chip =
filtro). `frontend/src/pages/Emails.jsx` linhas 307–345 mistura filtros (pasta, não lidos) com
um parâmetro técnico ("Limite") e um botão que dispara a consulta — o limite é paginação e sai
do painel de filtros. `Conflicts`, `Documents` e `Calendar` não têm nenhum filtro e precisam
de, no mínimo, busca por nome de hóspede e por período.

---

## Padrão 7 — Busca global e command palette

**Estrutura.** Camada única sobre scrim, em `--lm-z-modal`. Painel de 640px, alinhado ao topo
com deslocamento de `--lm-space-96` — nunca centrado verticalmente, porque a lista cresce para
baixo e um painel centrado pula a cada tecla. Três regiões: campo de entrada sem borda no topo,
resultados agrupados no meio, dicas de teclado no rodapé.

**Uma única camada resolve três coisas**, porque o usuário não sabe de antemão em qual delas
está pensando:

| Grupo | Exemplos no LUMINA |
|---|---|
| Ir para | Dashboard, Calendário, Conflitos, Estatísticas, Documentos, Emails, Notificações, Sugestões IA, Template, Configurações |
| Fazer | Sincronizar calendário, Detectar conflitos, Gerar autorização, Marcar tudo como lido, Alternar tema, Testar conexão de e-mail |
| Encontrar | Reserva por hóspede ou data, documento por nome, notificação por texto |

**Componentes.** Campo de entrada (`--lm-type-body-lg-*`), cabeçalhos de grupo
(`--lm-type-label-sm-*` com `--lm-color-on-surface-variant`), itens de altura
`--lm-menu-item-height`, item ativo com `--lm-color-secondary-container` /
`--lm-color-on-secondary-container`, atalhos à direita em `--lm-font-mono` com
`--lm-type-code-*`.

**Hierarquia de ações.** Nenhum botão. A ação é o item ativo. Comandos destrutivos não entram
na paleta sem passar pelo padrão 13 depois de selecionados.

**Estados.**

| Estado | Composição |
|---|---|
| Aberto, vazio | Ações recentes (até 5) + sugestões fixas. Nunca uma lista em branco |
| Digitando | Grupos com no máximo 5 itens cada e "Ver todos os N" ao fim do grupo |
| Sem resultado | "Nada encontrado para «texto»" + uma ação de escape ("Buscar em Documentos") |
| Grupo indisponível | Uma linha inline no grupo — a paleta inteira não falha porque um provedor falhou |

**Teclado.** `Ctrl+K` abre e fecha. ↑/↓ movem o item ativo, com rolagem contínua entre grupos.
Enter executa. `Ctrl+Enter` executa numa nova visualização quando fizer sentido. Escape fecha e
devolve o foco ao elemento anterior. Tab **não** navega dentro da paleta: o campo mantém o foco
e a lista é controlada por `role="combobox"` + `role="listbox"` + `aria-activedescendant`.

**Descoberta.** Um atalho invisível não existe. A paleta precisa de um ponto de entrada visual:
um botão de busca no app bar com o atalho impresso ao lado, em `--lm-type-label-md-*`.

**Responsividade.** Em `compact`, a paleta ocupa a tela inteira, com o campo na posição do app
bar e a lista abaixo; o rodapé de dicas some (não há teclado).

**Erros comuns.**

- Centralizar verticalmente.
- Misturar navegação e ações sem cabeçalhos de grupo.
- Executar comando destrutivo direto do Enter.
- Nenhum ponto de entrada visível.

**No LUMINA.** Não existe hoje. Com dez páginas, oito abas horizontais e ações espalhadas por
página (sincronizar em Calendário, detectar em Conflitos, testar conexão em Emails e em
Configurações), a paleta é o que torna o rail adaptativo suficiente: a navegação passa a ser
uma estrutura estável e a paleta cobre o acesso rápido.

---

## Padrão 8 — Seleção múltipla e ações em lote

**Estrutura.** A seleção é uma camada opcional sobre uma lista ou tabela existente. A lista não
muda de forma quando ganha seleção; ganha uma coluna de caixas de seleção que aparece no
sobrevoo e no foco, e permanece visível enquanto houver algo selecionado.

Quando há pelo menos um item selecionado, a barra de ações da região é **substituída** por uma
barra de seleção, na mesma altura, para que a página não salte:

```
[×]  3 selecionados        [Baixar]  [Excluir]  [⋮]
```

**Componentes.** Caixa de seleção por linha, caixa no cabeçalho, barra de seleção com
`--lm-color-secondary-container` / `--lm-color-on-secondary-container`, linhas selecionadas com
`--lm-table-row-selected-bg`, ações em lote como botões de texto ou de ícone com rótulo.

**Hierarquia de ações.** No máximo três ações em lote visíveis; o resto num menu de estouro. A
ação destrutiva em lote é a última da linha e usa `--lm-color-error` no rótulo, não preenchimento.

**Regras.**

- Clique na linha **abre** o item. Nunca seleciona. `Ctrl+clique` alterna a seleção,
  `Shift+clique` estende o intervalo.
- A caixa do cabeçalho seleciona a página carregada. Se houver mais itens além dela, uma faixa
  oferece "Selecionar todos os N".
- Resultado parcial nunca vira sucesso genérico: "8 de 10 excluídos. 2 falharam." com "Ver
  detalhes".
- A seleção é perdida ao mudar de filtro, e isso é anunciado.

**Estados.**

| Estado | Composição |
|---|---|
| Nada selecionado | Barra de ações normal da região |
| Selecionado | Barra de seleção com a contagem em `aria-live="polite"` |
| Executando lote | Barra ocupada, progresso determinado quando o total é conhecido, "Cancelar" quando a operação for interrompível |
| Concluído | Snackbar com o resultado e "Desfazer" quando aplicável |
| Parcial | Faixa inline com a contagem de falhas e o detalhamento |

**Teclado.** Espaço alterna a seleção da linha em foco. `Ctrl+A` seleciona tudo na região em
foco. `Shift+↑/↓` estende. Escape limpa a seleção e devolve o foco à linha ativa. A lista
declara `aria-multiselectable="true"` e cada linha, `aria-selected`.

**Responsividade.** Em `compact`, a barra de seleção migra para o rodapé da tela, fixa, com o
contador à esquerda e as ações à direita; o estouro passa a conter todas as ações menos uma.

**Erros comuns.**

- Clique na linha selecionando em vez de abrir.
- "Selecionar tudo" que seleciona só o que está carregado sem dizer.
- Ação em lote destrutiva sem a contagem no texto de confirmação.
- Barra de seleção que empurra o conteúdo para baixo.

**No LUMINA.** Nenhuma lista tem seleção múltipla hoje. As candidatas reais:
`Documents` (excluir e baixar vários — hoje só há ações por linha, `Documents.jsx` 349–364),
`Notifications` (marcar várias como lidas — hoje só há o "tudo" de uma vez,
`Notifications.jsx` 184–189) e `Emails` (caixa de entrada). `Conflicts` **não** recebe ações em
lote: resolver um conflito exige ler duas reservas e escrever uma justificativa; em lote isso
vira um carimbo.

---

## Padrão 9 — Upload de arquivo

**Estrutura.** Uma zona retangular com contorno tracejado (`--lm-color-outline-variant`,
`--lm-radius-md`), contendo ícone, frase de ação, botão "Escolher arquivo" e, abaixo, as
restrições em `--lm-type-body-sm-*`. As restrições aparecem **antes** de qualquer tentativa,
nunca só na mensagem de erro.

**Componentes.** Zona (que é um `<button>` ou contém um), botão contornado, lista de arquivos
com miniatura, nome, tamanho, progresso e ação de remover.

**Hierarquia de ações.** "Escolher arquivo" é secundária dentro da zona. A primária é a do
formulário que contém o upload. Arrastar é sempre um atalho, nunca o único caminho.

**Estados.**

| Estado | Composição |
|---|---|
| Repouso | Contorno tracejado `--lm-color-outline-variant`, texto `--lm-color-on-surface-variant` |
| Arquivo sobrevoando | Fundo `--lm-color-primary-container`, contorno `--lm-color-primary`, texto `--lm-color-on-primary-container` |
| Enviando/copiando | Progresso determinado + nome + "Cancelar" |
| Concluído | Miniatura + nome + tamanho + destino no disco + "Remover" |
| Rejeitado | Motivo específico: tipo, tamanho ou ilegível. Nunca "arquivo inválido" |

**Local antes de tudo.** O LUMINA é offline. Um arquivo escolhido é **copiado** para o
diretório de dados do aplicativo, e a interface diz para onde. Referenciar um caminho externo
que o usuário pode mover depois é um defeito silencioso.

**Teclado.** A zona recebe foco e responde a Enter e Espaço abrindo o seletor nativo. Cada
arquivo da lista é uma linha com foco próprio e ação de remover alcançável. O progresso é
anunciado por `aria-live="polite"` em marcos, não a cada quadro.

**Responsividade.** A zona mantém altura mínima confortável em qualquer largura; em `compact`
perde o texto de arrastar (não há arrastar em toque) e vira um botão de largura total com as
restrições abaixo.

**Erros comuns.**

- Um campo de texto que aceita uma URI `data:` colada e chama isso de upload.
- Não mostrar progresso para operações acima de 200 ms.
- Remover sem avisar que o arquivo já está em uso num documento gerado.
- Declarar as restrições apenas depois da falha.

**No LUMINA.** Não existe upload hoje. O caso concreto é o logo do condomínio:
`Settings.jsx` linhas 387–399 oferece um campo de texto "URL do Logo (opcional)" que aceita
`https://…` **ou** `data:image/png;base64,…`. Numa aplicação offline, a primeira opção quebra e
a segunda transforma um campo de texto num carregador de arquivo improvisado. O alvo é uma zona
de upload que copia o arquivo para o diretório de dados e grava o caminho local. O segundo caso
é a importação de um `.ics` avulso, hoje inexistente.

---

## Padrão 10 — Dashboard

**Estrutura.** Um dashboard responde, de cima para baixo, a três perguntas nesta ordem:

1. **O que exige minha ação agora?** — alertas e pendências
2. **O que vem a seguir?** — próximos check-ins
3. **Como estamos?** — indicadores do período

E, à direita ou ao fim, **o que aconteceu** — atividade recente.

Esta ordem não é estética. Num produto onde uma reserva perdida custa dinheiro, o conflito vem
antes da receita.

**Componentes.** Faixa de alerta (quando há), grade de cartões de indicador, tabela de
próximos check-ins, feed de atividade.

**Anatomia do cartão de indicador.**

| Elemento | Tipografia | Cor |
|---|---|---|
| Rótulo | `--lm-type-label-lg-*` | `--lm-color-on-surface-variant` |
| Valor | `--lm-type-display-sm-*` | `--lm-color-on-surface` — sempre |
| Variação | `--lm-type-label-md-*` | `--lm-color-success` ou `--lm-color-error`, **com** seta e sinal |
| Período | `--lm-type-body-sm-*` | `--lm-color-on-surface-variant` |

Regras do cartão: o valor nunca é colorido (cor no número faz o olho ler estado onde há
grandeza); a variação só é renderizada quando existe o número e o período; o cartão é uma
leitura, **não** um contêiner de controles.

**Hierarquia de ações.** No cabeçalho da página: uma primária ("Sincronizar") e um menu de
estouro. Dentro de cada região: no máximo uma ação de texto no cabeçalho da região. Dentro dos
cartões de indicador: nenhuma.

**Estados.**

| Estado | Composição |
|---|---|
| Carregando | Esqueleto com a geometria final dos cartões e da tabela. A casca e os títulos já estão pintados |
| Parcial | Cada região tem o seu estado. A região que falhou mostra "Não foi possível carregar" + "Tentar novamente" dentro da própria caixa |
| Vazio (instalação nova) | Um cartão de boas-vindas com dois próximos passos ("Sincronizar calendários", "Configurar e-mail"). Nunca quatro cartões zerados |
| Sem conflitos | O alerta não vira um cartão dizendo "0". Vira uma linha de confirmação discreta |
| Com conflitos | Faixa de largura total acima dos indicadores, `--lm-color-error-container` / `--lm-color-on-error-container`, com "Resolver" |
| Atualizando | O conteúdo permanece; um indicador linear aparece sob o cabeçalho da região |

**Teclado.** Após o app bar, o primeiro ponto de tabulação é a ação primária da página.
Cartões de indicador não recebem foco (não são controles). A tabela de check-ins é um `<table>`
real, com `<caption>` e cabeçalhos com escopo.

**Responsividade.**

| Breakpoint | Grade de indicadores | Check-ins | Atividade |
|---|---|---|---|
| `xlarge` / `large` | 4 colunas | Tabela, coluna principal | Coluna lateral |
| `expanded` | 2 colunas | Tabela, largura total | Abaixo |
| `medium` | 2 colunas | Lista de cartões | Abaixo |
| `compact` | 1 coluna | Lista de cartões | Abaixo, colapsada em "Ver atividade" |

**Erros comuns.**

- Colocar um botão de largura total dentro de um cartão de indicador.
- Renderizar uma seta de tendência sem valor.
- Um cartão inteiro dedicado a dizer "zero".
- Substituir o dashboard inteiro por um indicador de carregamento.
- Usar a cor de alerta como fundo do cartão em vez do contêiner tonal.

**No LUMINA.** `frontend/src/pages/Dashboard.jsx`. Quatro indicadores (Ocupação, Receita
Mensal, Reservas Ativas, Conflitos), tabela de próximos check-ins e feed de atividade — a
seleção de conteúdo está certa; a composição não. Mudanças exigidas: o cartão de conflitos
(linhas 225–241, com `rgba(239,68,68,0.05)` e `rgba(16,185,129,0.05)` embutidos) vira faixa
tonal acima da grade; o botão "Enviar Relatório" (linhas 207–216) sai de dentro do cartão de
receita e vai para o menu de estouro da página; `trend="up"` sem `trendValue` (linhas 196–201 e
202–217) deixa de ser passado; o `loading` de página inteira (linhas 163–172) vira esqueleto por
região, aproveitando que as quatro requisições já são um `Promise.allSettled` (linhas 97–102) —
a estrutura de dados já suporta estados parciais, só a interface não.

---

## Padrão 11 — List-detail

**Estrutura.** Duas colunas a partir de `expanded`: lista de 360 a 400px à esquerda, detalhe
ocupando o resto. Abaixo de `expanded`, só a lista; abrir um item empurra o detalhe como página
com "Voltar".

```
expanded+                          medium e abaixo
┌────────┬──────────────────┐      ┌──────────────┐   ┌──────────────┐
│ lista  │ detalhe          │      │ lista        │ → │ ← detalhe    │
│        │                  │      │              │   │              │
└────────┴──────────────────┘      └──────────────┘   └──────────────┘
```

**Componentes.** Lista com linhas de altura `--lm-density-row`, no máximo duas linhas de texto
por item; indicador de estado à esquerda (forma **e** cor, nunca só cor); detalhe com cabeçalho,
corpo rolável e rodapé de ações quando houver.

**Hierarquia de ações.** A lista tem no máximo uma ação de cabeçalho (busca ou filtro). O
detalhe tem uma primária no rodapé e o resto no menu de estouro do seu cabeçalho. A primária do
detalhe **não** é a primária da página — são regiões distintas.

**Estados.**

| Região | Estado | Composição |
|---|---|---|
| Lista | Carregando | 6 linhas de esqueleto com a altura real |
| Lista | Vazia | Vazio inicial ou vazio por filtro, conforme o padrão 6 |
| Detalhe | Nada selecionado | "Selecione um item para ver os detalhes" — texto simples, sem ilustração |
| Detalhe | Carregando | Esqueleto do cabeçalho + três blocos |
| Detalhe | Item removido | "Este item não existe mais" + "Voltar para a lista" (padrão 18) |
| Detalhe | Erro | Erro escopado à coluna de detalhe; a lista continua utilizável |

**Não autosselecione o primeiro item** quando os itens tiverem estado "não lido" — abrir marca
como lido, e autosselecionar apaga informação que o usuário não pediu para apagar. Em listas sem
estado de leitura (conflitos), autosselecionar o primeiro em `expanded` é correto.

**Teclado.** Setas movem o foco dentro da lista sem abrir; Enter ou Espaço abre no detalhe. A
lista usa `tabindex` móvel (um único ponto de tabulação para a lista inteira). Tab sai da lista
e entra no detalhe. `Escape` no detalhe, em `compact`, volta para a lista.

**Responsividade.** Coberta na estrutura. A largura da lista não é fluida: fixa em 360px até
`large`, 400px acima.

**Erros comuns.**

- Modal para exibir o detalhe quando existe espaço em coluna: perde-se o contexto da lista e a
  navegação entre itens.
- Autosselecionar uma caixa de entrada.
- Painel de detalhe vazio inventado para uma lista cujos itens não têm detalhe.
- Duas ações primárias, uma em cada coluna, com o mesmo peso.

**No LUMINA.** Três páginas mapeiam aqui:

| Página | Hoje | Alvo |
|---|---|---|
| **Conflitos** | Lista de cartões + modal de resolução de 560px onde duas reservas são comparadas lado a lado (`Conflicts.jsx` 215–304) | List-detail. A comparação é a tarefa central e precisa de largura; a lista dá o contexto de quantos faltam |
| **Emails** | Quatro abas: Enviar, Caixa de Entrada, Automações, Conexão (`Emails.jsx` 178–195) | List-detail da caixa de entrada. "Enviar" vira ação primária com compositor em página; "Automações" vira página própria; "Conexão" vira a seção E-mail de Configurações |
| **Notificações** | Feed de cartões com filtros e "Carregar mais" (`Notifications.jsx` 262–319) | Lista simples — a notificação não tem detalhe próprio. O item é um `<button>` que navega para a origem (a reserva, o conflito) e marca como lido. Não invente um painel de detalhe |

---

## Padrão 12 — Calendário e visualização temporal

**Estrutura.** Cabeçalho com o período por extenso, navegação (`Hoje`, anterior, próximo,
seletor de mês/ano) e seletor de escala; grade abaixo; legenda ao fim.

**Uma reserva é um intervalo, não um evento pontual.** Essa é a decisão estrutural: a grade de
mês desenha **barras contínuas** do check-in ao check-out, com cantos arredondados apenas nas
pontas, atravessando as células. Renderizar um chip por dia dentro de cada célula destrói a
leitura do intervalo — o usuário não consegue ver onde a reserva começa e termina, que é a
única coisa que importa em gestão de aluguel.

**Componentes.** Grade (`role="grid"`), célula de dia com número no canto superior esquerdo,
barras de reserva, indicador "+N mais" quando estourar, legenda com forma e cor.

| Elemento | Composição |
|---|---|
| Hoje | Número em pílula `--lm-color-primary` / `--lm-color-on-primary` + contorno na célula |
| Dia de outro mês | Número em `--lm-color-on-surface-variant`; a célula continua navegável |
| Barra Airbnb | `--lm-color-airbnb-container` / `--lm-color-on-airbnb-container` + rótulo |
| Barra Booking.com | `--lm-color-booking-container` / `--lm-color-on-booking-container` + rótulo |
| Barra manual | `--lm-color-secondary-container` / `--lm-color-on-secondary-container` |
| Dia com conflito | Célula em `--lm-color-error-container` + ícone de alerta na barra |

Cor nunca é o único portador: a barra carrega o nome do hóspede e a plataforma; a legenda existe
para quem chegar sem esse contexto.

**Hierarquia de ações.** Uma primária no cabeçalho: "Sincronizar". Navegação de período é
controle, não ação. O clique numa barra abre o detalhe.

**Estados.**

| Estado | Composição |
|---|---|
| Carregando | A grade permanece desenhada, com as células em esqueleto. A estrutura temporal é o layout, não o conteúdo |
| Vazio | A grade permanece. Uma faixa sob o cabeçalho diz "Nenhuma reserva em agosto de 2026" + a ação que produz dados |
| Erro de sincronização | Faixa acima da grade com a hora da última sincronização bem-sucedida e "Sincronizar novamente" |
| Sincronizando | Indicador linear sob o cabeçalho; a grade anterior continua legível |

**Teclado.** Setas movem o dia em foco; `Home`/`End` vão ao início e ao fim da semana;
`PageUp`/`PageDown` mudam de mês; `Ctrl+Home` volta para hoje. Enter abre o dia. Cada célula
anuncia a data por extenso e o número de reservas. As barras dentro do dia são alcançáveis por
Tab quando a célula está focada.

**Responsividade.**

| Breakpoint | Escala padrão |
|---|---|
| `large` / `xlarge` | Grade de mês com nome do hóspede nas barras |
| `expanded` | Grade de mês com barras sem rótulo + tooltip |
| `medium` | Grade compacta: pontos por plataforma e contagem por dia |
| `compact` | Lista agrupada por dia, com cabeçalhos fixos |

Uma grade de mês nunca rola horizontalmente. Quando não cabe, ela troca de forma.

**Erros comuns.**

- Sumir com a grade quando não há eventos.
- `title` do HTML como único meio de ver o nome do hóspede: não funciona por teclado nem em
  toque.
- `<div onClick>` no evento.
- Modal para o detalhe quando o painel lateral permitiria navegar entre reservas.

**No LUMINA.** `frontend/src/pages/Calendar.jsx` e `frontend/src/components/Calendar.jsx`.
Quando `events.length === 0` (página, linhas 146–152), a grade inteira desaparece e sobra um
texto — o usuário perde a referência temporal e o botão de sincronizar fica órfão de contexto.
O componente renderiza um chip por dia (`components/Calendar.jsx` 140–149) em vez de barras de
intervalo, com `onClick` num `<div>` e `title` como único rótulo. A escala única (mês) precisa
ganhar pelo menos a lista de próximos, que é a escala correta em `compact`. O `EventModal`
(`components/EventModal.jsx`) vira painel de detalhe.

---

## Padrão 13 — Confirmação destrutiva

**Escada de proporcionalidade.** A confirmação é calibrada pela consequência, não pelo hábito:

| Consequência | Composição |
|---|---|
| Reversível em segundos | **Sem confirmação.** Executa e mostra snackbar com "Desfazer" |
| Irreversível, um item, custo baixo | Dialog de um passo. O título nomeia o item |
| Irreversível, vários itens | Dialog com a contagem e a lista (até 5 + "e mais N") |
| Catastrófico (apagar a configuração inteira) | Dialog com confirmação por digitação: o usuário digita uma palavra declarada |

Confirmar tudo é o mesmo que não confirmar nada: o usuário aprende a clicar sem ler.

**Anatomia do dialog.**

| Parte | Regra | Token |
|---|---|---|
| Título | Uma pergunta específica, com o nome do objeto: "Excluir a autorização de 12/08?" | `--lm-type-title-lg-*` |
| Corpo | O que se perde **e** o que não se perde. Duas frases no máximo | `--lm-type-body-md-*` |
| Ação destrutiva | O verbo do resultado: "Excluir documento". Nunca "OK", nunca "Sim" | `--lm-button-destructive-bg` / `--lm-button-destructive-label` |
| Ação de escape | "Cancelar". Recebe o **foco inicial** | Botão de texto ou contornado |
| Superfície | `--lm-dialog-bg`, `--lm-dialog-radius`, `--lm-dialog-shadow`, scrim `--lm-dialog-scrim` a `--lm-dialog-scrim-opacity` | |

**Teclado.** Escape cancela. O foco inicial é o botão de cancelar — Enter não deve disparar a
destruição. O foco fica preso no dialog e volta ao gatilho ao fechar. O dialog é
`role="alertdialog"` com `aria-labelledby` no título e `aria-describedby` no corpo.

**Responsividade.** Abaixo de `medium`, o dialog vira folha centrada de largura quase total com
as ações empilhadas: a destrutiva em cima, "Cancelar" embaixo, ambas com altura
`--lm-density-control` — que em `(pointer: coarse)` já é 48px.

**Diálogos nativos.** `window.confirm` está proibido: não respeita o tema, não é estilizável, os
rótulos dos botões vêm do sistema operacional e o texto não pode ser específico. A **única**
exceção documentada é a ação que reinicia ou encerra o processo principal do Electron — nesse
caso, `dialog.showMessageBox` via IPC é correto, porque a janela de renderização vai deixar de
existir. É o caso do Hard Reset.

**Erros comuns.**

- "Tem certeza?" como título e "Sim/Não" como botões: nenhum dos dois diz o que vai acontecer.
- Botão destrutivo em foco inicial.
- Confirmar operações reversíveis, treinando o usuário a ignorar dialogs.
- Ação destrutiva preenchida e proeminente numa barra de ações de uso diário.

**No LUMINA.** Dois lugares. `Documents.jsx` linha 130 usa `window.confirm` para excluir um
documento — deve virar dialog do sistema, com o nome do arquivo no título e "Desfazer" quando o
arquivo for movido para uma lixeira local em vez de removido. `Settings.jsx` linhas 130–165
implementa o Hard Reset com um texto longo em `window.confirm` (ou `showConfirmDialog` no
Electron): mantém o dialog nativo — é o caso legítimo — mas o gatilho sai da barra de ações
(linhas 266–276, com `background: '#e53e3e'` embutido) e passa a exigir digitação de confirmação
na seção "Dados e reinicialização".

---

## Padrão 14 — Notificações e central de alertas

**Estrutura.** Três superfícies com papéis distintos, definidas na tabela de feedback das regras
transversais. Este padrão detalha a terceira: a central.

Página de lista única, agrupada **por tempo** ("Hoje", "Ontem", data por extenso), com filtro
por tipo disponível. Agrupar por tipo como estrutura primária é errado: o usuário chega à
central perguntando "o que aconteceu desde ontem?", não "quais são as notificações de
sincronização?".

**Componentes.** Cabeçalhos de grupo temporais (`--lm-type-label-sm-*`), itens de lista que são
`<button>` ou link, indicador de não lido (forma + cor), ícone por tipo, tempo relativo,
`--lm-badge-*` no sino do app bar.

**Anatomia do item.**

| Elemento | Regra |
|---|---|
| Indicador de não lido | Ponto `--lm-badge-size-dot` à esquerda, com `--lm-color-primary` — e o título em peso 500 |
| Ícone de tipo | `lucide-react`, `--lm-color-on-surface-variant`; a cor do tipo entra só quando o tipo for de erro |
| Título | `--lm-type-title-sm-*`, uma linha, com reticências |
| Mensagem | `--lm-type-body-md-*`, no máximo duas linhas |
| Tempo | `--lm-type-body-sm-*`, `--lm-color-on-surface-variant`, com `<time datetime>` |
| Ações | No sobrevoo e no foco: "Marcar como lida" e estouro |

**Hierarquia de ações.** Cabeçalho da página: "Marcar todas como lidas" (secundária) e
"Atualizar" (ícone). Nenhuma primária — a central é um registro, não uma tarefa.

**Regras.**

- **Toda notificação aponta para a sua origem.** Uma notificação sem destino é ruído; se não há
  para onde ir, o evento pertence a um log, não à central.
- Ler nunca é efeito colateral de rolagem. Abrir a origem marca como lido; há também a ação
  explícita.
- O sino do app bar leva contagem quando ela importa (não lidas) e ponto quando não importa.
- Nunca mais de 99 no badge: acima disso, "99+".

**Estados.**

| Estado | Composição |
|---|---|
| Carregando | 6 linhas de esqueleto |
| Vazio | "Nada por aqui" + uma frase do que apareceria (novas reservas, conflitos, sincronizações) |
| Vazio por filtro | Texto próprio + "Limpar filtros" |
| Erro | Faixa + "Tentar novamente"; o que já carregou permanece |
| Fim da lista | "Carregar mais (N restantes)" — botão explícito, não rolagem infinita |

Rolagem infinita é descartada de propósito: sequestra o teclado, impede chegar ao fim da página
e torna a posição irrecuperável.

**Teclado.** Cada item é focável e ativável por Enter. "Marcar todas como lidas" é a primeira
ação da barra. A mudança de contagem é anunciada por `aria-live="polite"`.

**Responsividade.** Lista de largura total em qualquer breakpoint; a linha de contagens
(padrão 10) some abaixo de `medium`.

**Erros comuns.**

- `<div onClick>` como item.
- Dashboard dentro da central: quatro cartões de indicador acima da lista.
- Um contador de "Total" que não é acionável.
- Empilhar snackbars.

**No LUMINA.** `frontend/src/pages/Notifications.jsx`. Os cartões de resumo (linhas 198–230:
Não Lidas, Hoje, Conflitos, Total) viram uma linha de contagens; "Conflitos" já tem lugar no
Dashboard e "Total" não é acionável. O cartão de notificação (linhas 275–279) é um `<div>` com
`onClick` que marca como lido — vira `<button>` que navega para a origem. Os chips de
detalhamento por tipo (linhas 233–246) e as abas de filtro (linhas 249–259) são a mesma
informação duas vezes: fica só o filtro, em chips (padrão 6). O agrupamento temporal não existe
hoje e é obrigatório.

---

## Padrão 15 — Configurações e preferências

O padrão 5 define a mecânica do formulário. Este define **quais controles** e **quando o efeito
acontece**.

**A regra que separa tudo:** preferência aplica-se imediatamente e é reversível; configuração
altera o comportamento do sistema e exige salvamento explícito.

| Item | Tipo | Aplicação | Componente | Persistência |
|---|---|---|---|---|
| Tema (claro / escuro / sistema) | Preferência | Imediata | Botão segmentado, 3 opções | `localStorage` + `[data-theme]` no `:root` |
| Densidade (padrão / compacta / confortável) | Preferência | Imediata | Botão segmentado, 3 opções | `localStorage` + `[data-density]` |
| Iniciar com o Windows | Preferência | Imediata (IPC) | Interruptor | Sistema operacional |
| Manter sessão ativa | Preferência | Imediata | Interruptor | `localStorage` |
| Notificações de conflito | Preferência | Imediata | Interruptor | Servidor local |
| Geração automática de documentos | Preferência | Imediata | Interruptor | Servidor local |
| Intervalo de sincronização | Configuração | Explícita | Campo numérico + unidade | Servidor local |
| Credenciais (e-mail, Telegram, IA) | Configuração | Explícita | Campo de segredo | Servidor local |
| URLs iCal | Configuração de instalação | Somente leitura | Campo travado + origem | Arquivo de ambiente |

**Interruptor × caixa de seleção.** Interruptor = liga e desliga com efeito imediato. Caixa de
seleção = escolha que só vale quando o formulário for submetido. Usar caixa de seleção para uma
preferência imediata mente sobre o momento do efeito.

**Confirmação do efeito.** Quando o efeito é visível (tema muda sozinho), nenhuma confirmação.
Quando é invisível (iniciar com o Windows), snackbar curto.

**Densidade e ponteiro.** `comfortable` é forçada em `(pointer: coarse)` pelo sistema de tokens.
O controle de densidade continua visível nesse contexto, mas mostra o motivo do bloqueio — não
some.

**Configuração ausente não é erro.** Um recurso que depende de uma chave não configurada
(assistente de IA, envio de e-mail) aparece **desabilitado com o motivo e o caminho**, nunca
escondido. Esconder gera a pergunta "onde está?", que é pior do que a resposta "falta
configurar".

**Estados.** Herdados do padrão 5, mais:

| Estado | Composição |
|---|---|
| Preferência aplicada | O efeito é a confirmação |
| Preferência que falhou (IPC) | O controle volta ao valor anterior + faixa com o motivo |
| Ambiente sem o recurso | A seção inteira não é renderizada (sem Electron, não há "Iniciar com o Windows") |

**Teclado.** Interruptores respondem a Espaço. Botões segmentados usam setas dentro do grupo e
um único ponto de tabulação. Grupos em `<fieldset>` com `<legend>` visível.

**Erros comuns.**

- Caixa de seleção para preferência imediata.
- Esconder recursos por falta de configuração.
- Preferências de aparência ausentes num produto que tem dois temas e três densidades.

**No LUMINA.** `Settings.jsx` usa `checkbox-label` para "Iniciar com o Windows" (linhas 565–577),
"Manter sessão ativa" (579–591), "Notificações de Conflitos" (697–709) e "Geração Automática de
Documentos" (711–723) — as quatro são preferências imediatas e viram interruptores. A seção
"Aparência" (tema + densidade) não existe e precisa existir. O condicional
`isElectron && (…)` (linha 554) está correto e deve ser mantido: é exatamente a regra "não mostre
o que não se aplica ao ambiente".

---

## Padrão 16 — Estado offline e serviço local indisponível

O LUMINA é 100% local, mas não é 100% autocontido: o frontend conversa com um processo Python
gerenciado pelo Electron, e a sincronização fala com a internet. "Offline" é ambíguo — o padrão
exige distinguir três falhas que exigem três respostas diferentes.

| Falha | O que ainda funciona | Composição | Ação |
|---|---|---|---|
| **Serviço local fora** (o processo não subiu ou caiu) | Nada | Tela de bloqueio, `--lm-z-critical` | "Tentar novamente" + "Ver detalhes técnicos" + reiniciar o serviço |
| **Rede externa fora** (iCal não sincroniza) | Tudo o que já está no banco local | Faixa na página Calendário | "Sincronizar novamente" |
| **E-mail indisponível** (SMTP/IMAP) | Todo o resto do produto | Erro inline no compositor | "Testar conexão" + link para Configurações → E-mail |

**Nunca bloqueie a leitura por causa de uma falha de rede.** Os dados sincronizados estão no
banco local; o produto continua útil sem internet. Bloquear é confundir "a fonte externa está
fora" com "o produto está fora".

**Estrutura da tela de bloqueio.** Coluna única, centrada, largura máxima 480px:
ícone discreto, título que nomeia o que está fora ("O serviço local do LUMINA não está
respondendo"), uma frase sobre o que isso significa, estado da tentativa de reconexão, ação
primária "Tentar novamente", ação terciária "Ver detalhes técnicos" que revela o log recente em
`--lm-font-mono` numa caixa rolável.

**Frescor do dado.** Toda tela que exibe dado sincronizado carrega uma marca de frescor em
`--lm-type-body-sm-*` com `--lm-color-on-surface-variant`: "Sincronizado há 2 h". Quando a última
sincronização falhou, a marca vira "Desatualizado desde 14:02" com `--lm-color-warning`.

**Reconexão.** Automática, com espera crescente. A faixa mostra "Tentando reconectar…" com
indicador indeterminado — e a ação manual permanece disponível o tempo todo. Uma reconexão
automática que não pode ser forçada manualmente é uma espera sem saída.

**Estados.**

| Estado | Composição |
|---|---|
| Detectando | Nada nos primeiros 2 s — falhas transitórias não merecem interface |
| Fora | Faixa ou tela de bloqueio, conforme a tabela |
| Reconectando | Indicador indeterminado + contagem de tentativas |
| Restaurado | Snackbar "Conexão restaurada" + recarregamento silencioso da região visível |

**Teclado.** Na tela de bloqueio, o foco vai para "Tentar novamente". Na faixa, o foco não é
roubado; a faixa é `role="status"` (`aria-live="polite"`) quando é aviso, e `role="alert"`
quando bloqueia.

**Responsividade.** Tela de bloqueio em coluna única em qualquer largura. A faixa é de largura
total e fica presa abaixo do app bar (`--lm-z-sticky`).

**Erros comuns.**

- Chamar de "sem internet" a queda do serviço local.
- Cair silenciosamente para uma tela de login que nunca vai funcionar.
- `alert()` ou tela em branco.
- Bloquear o produto inteiro porque a sincronização externa falhou.

**No LUMINA.** `frontend/src/pages/Login.jsx` linhas 24–28: `authAPI.checkSetup()` faz
`.catch(() => setMode('login'))` — se o backend estiver fora, o usuário recebe um formulário de
login perfeitamente normal que vai falhar em toda tentativa, sem explicação. É o caso 1 da
tabela. `frontend/src/services/api.js` linhas 32–46 trata apenas 401; erros de rede caem no
`console.error` e somem. Cada página trata a sua falha com `console.error` e um estado vazio
genérico. O alvo: um detector de saúde do serviço no nível do aplicativo, que decide entre tela
de bloqueio e faixa, e páginas que só tratam a sua própria falha de domínio.

---

## Padrão 17 — Erro de sistema

**Estrutura.** O erro ocupa **exatamente a caixa da região que falhou**. Uma falha na tabela de
check-ins não derruba o dashboard; uma falha no dashboard não derruba a casca.

```
┌─ Próximos check-ins ───────────────────┐
│  ⚠  Não foi possível carregar os        │
│     próximos check-ins.                 │
│     Os indicadores acima continuam      │
│     atualizados.                        │
│     [Tentar novamente]  [Ver detalhes]  │
└─────────────────────────────────────────┘
```

**Anatomia.**

| Parte | Regra |
|---|---|
| Título | Nomeia **o que** falhou: "Não foi possível carregar as estatísticas" |
| Corpo | Uma frase sobre o que ainda funciona. Isso reduz o pânico e evita recarregamentos desnecessários |
| Ação primária | "Tentar novamente" |
| Ação terciária | "Ver detalhes técnicos" — revelação progressiva, nunca a pilha por padrão |
| Código | Identificador curto em `--lm-font-mono` com `--lm-type-code-*`, copiável |
| Superfície | `--lm-color-error-container` / `--lm-color-on-error-container` para a faixa; o ícone acompanha, nunca carrega sozinho o significado |

**Três escalas de erro.**

| Escala | Composição |
|---|---|
| Campo | Mensagem sob o campo, `--lm-field-error-text` + `--lm-field-border-error` |
| Região | Caixa de erro dentro da região (acima) |
| Aplicação | Só quando a casca não pode ser desenhada. Tela cheia, com opção de reiniciar |

**Teclado.** O foco vai para o título da região de erro (`tabindex="-1"`), que é
`role="alert"`. "Tentar novamente" é o próximo ponto de tabulação.

**Responsividade.** A caixa de erro herda as dimensões da região. Nunca vira tela cheia por
causa de uma falha parcial.

**Erros comuns.**

- "Algo deu errado" sem escopo: não diz o que falhou, o que ainda funciona nem o que fazer.
- Mostrar a pilha de execução por padrão.
- Transformar falha parcial em falha total.
- Erro sem identificador copiável — o usuário não consegue relatar.

**No LUMINA.** `frontend/src/components/ErrorBoundary.jsx` linhas 36–41: "Algo deu errado" /
"Ocorreu um erro inesperado nesta seção. Tente recarregar a página.", com estilos embutidos e
`var(--warning, #f59e0b)` — cor de aviso para um erro. O uso de `key={currentPage}` em
`App.jsx` linha 72 está correto: reinicia a fronteira ao trocar de página. Falta granularidade:
fronteiras por região dentro de cada página, escopo nomeado, código copiável e a cor de erro
correta.

---

## Padrão 18 — Rota inválida e recurso inexistente

O LUMINA não tem rotas de URL: `App.jsx` navega com `useState('dashboard')` e um `switch` cujo
`default` devolve o Dashboard silenciosamente (linhas 36–61). Isso significa que o "404"
tradicional não existe — mas dois casos reais existem e precisam de composição.

| Caso | O que é | Composição |
|---|---|---|
| **Identificador de página inválido** | Estado da aplicação corrompido ou atalho apontando para uma página removida | Não é uma tela: registra o erro, navega para o Dashboard e mostra snackbar "A seção solicitada não existe" |
| **Recurso inexistente** | A notificação aponta para uma reserva excluída; o documento foi apagado fora do app | Estado vazio **dentro do painel de detalhe**: "Esta reserva não existe mais" + "Voltar para Conflitos" |

**Estrutura do recurso inexistente.** Ocupa a coluna de detalhe do padrão 11, não a tela. Ícone
discreto, título específico com o tipo do objeto, uma frase sobre a causa provável ("Pode ter
sido removida em uma sincronização"), e uma ação de retorno nomeada.

**Quando houver rotas.** Se o LUMINA adotar um roteador de hash, a página de rota inválida é uma
página completa **com o rail visível**: o usuário precisa poder ir a outro lugar sem usar o
histórico. Título que diz o que aconteceu, campo de busca global (padrão 7) e três destinos
prováveis.

**Estados.** Um só. Não há carregamento nem erro dentro deste padrão — ele já é o resultado.

**Teclado.** O foco vai para o título (`tabindex="-1"`). A ação de retorno é o próximo ponto de
tabulação.

**Responsividade.** Coluna única, centrada na região, largura máxima 420px.

**Erros comuns.**

- Redirecionar silenciosamente e deixar o usuário achando que clicou errado.
- Página de rota inválida sem navegação: um beco sem saída.
- Usar "não encontrado" para dizer "sem permissão" — são causas diferentes e ações diferentes
  (padrão 19).

**No LUMINA.** `App.jsx` linhas 58–59 (`default: return <Dashboard />`) engole silenciosamente
um estado inválido. O alvo: registrar, navegar e avisar. O caso de recurso inexistente aparece
assim que as notificações passarem a navegar para a origem (padrão 14) — uma notificação de
conflito já resolvido e removido é o exemplo canônico.

---

## Padrão 19 — Sem permissão

O LUMINA tem **um administrador**. Não há papéis, não há permissões granulares e não deve haver
uma página "403" genérica esperando por um sistema de autorização que não existe. O padrão cobre
as três situações reais em que o produto diz "você não pode fazer isso agora".

| Situação | Diagnóstico | Composição |
|---|---|---|
| **Sessão expirada (401)** | Não é falta de permissão: é reautenticação | Dialog de reautenticação **sobre** o conteúdo, preservando o estado da tela. Só a senha é pedida; o nome de usuário já é conhecido |
| **Recurso não configurado** | Não é erro: falta uma credencial | Painel dentro da região, dizendo o que falta e levando direto à seção de Configurações correspondente |
| **Campo de origem externa** | O valor pertence à instalação | Campo travado + chip com a origem + ação "Como alterar" |

**Reautenticação sem perda.** Descartar a tela inteira para voltar ao login é a resposta errada
a um token expirado: o usuário perde o formulário meio preenchido por causa de um problema que
não é dele. O correto é um dialog modal com o campo de senha, foco inicial nele, e retomada
exata do que estava acontecendo.

**Nunca esconda por falta de configuração.** O assistente de IA sem chave, o envio de e-mail sem
SMTP — a funcionalidade permanece visível e desabilitada, com o motivo e o caminho. Esconder
transforma "falta configurar" em "esse recurso não existe".

**Estrutura do painel de não configurado.**

| Parte | Regra |
|---|---|
| Título | O que está indisponível: "O assistente precisa de uma chave de IA" |
| Corpo | Uma frase do que será possível depois |
| Ação primária | "Configurar agora" — navega para a seção exata, não para a página de configurações genérica |
| Superfície | `--lm-color-surface-container` com contorno `--lm-color-outline-variant`; nunca cor de erro, porque não é erro |

**Teclado.** No dialog de reautenticação: foco no campo de senha, foco preso, Escape **não**
fecha (fechar significaria perder a sessão sem decidir); a saída é "Sair da conta", uma ação de
texto explícita.

**Responsividade.** O dialog de reautenticação segue o padrão de dialog. O painel de não
configurado ocupa a região.

**Erros comuns.**

- Mandar para o login e perder o trabalho.
- Esconder funcionalidades por falta de credencial.
- Página "sem permissão" sem navegação.
- Usar cor de erro para um estado de configuração pendente.

**No LUMINA.** `frontend/src/services/api.js` linhas 37–42: qualquer 401 limpa os dois
armazenamentos e dispara `auth:logout`, que em `AuthContext.jsx` linhas 74–82 zera o usuário e
devolve a tela de login — o trabalho em curso é descartado. O alvo é o dialog de reautenticação.
O caso "não configurado" já aparece em `AISuggestions.jsx` linhas 154–173, com uma faixa âmbar
embutida que aponta para "Configurações → Inteligência Artificial": a intenção está certa, a
composição precisa virar o painel padronizado, com as cores de superfície em vez de
`rgba(245, 158, 11, 0.08)` e `#fbbf24` literais.

---

## Padrão 20 — Carregamento inicial da aplicação

**A sequência real do LUMINA.** Splash do Electron → janela principal → validação do token →
tela de login ou casca → dados da página. São quatro momentos, e cada um pode introduzir um
salto visual se não forem tratados como uma sequência única.

**Orçamento de carregamento.** A composição depende da duração esperada:

| Duração | Composição |
|---|---|
| Menos de 200 ms | **Nada.** Um indicador que pisca é pior do que nenhum |
| 200 ms a 1 s | Esqueleto com a geometria final |
| 1 s a 5 s | Esqueleto + texto de status dizendo o que está acontecendo ("Iniciando o serviço local…") |
| Mais de 5 s | Status + ação de escape ("Ver detalhes", "Tentar novamente") |

**A casca vem primeiro.** O app bar e o navigation rail são desenhados **antes** de qualquer
dado. O usuário vê onde está imediatamente; só o miolo tem esqueleto. Uma tela inteira ocupada
por um indicador central desperdiça o único momento em que a orientação é mais importante.

**Continuidade de superfície.** O fundo do splash, o fundo da janela e a superfície da casca são
a mesma cor (`--lm-color-surface`). Qualquer divergência produz um flash na transição — e com
dois temas, um flash de tema errado é grave.

**Tema antes da primeira pintura.** A preferência tem de ser aplicada em script síncrono no
documento, antes de qualquer CSS pintar:

```html
<script>
  var t = localStorage.getItem('lumina_theme');
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
</script>
```

Sem isso, quem escolheu o tema claro num sistema escuro vê um lampejo escuro em toda abertura.

**Movimento reduzido.** Com `prefers-reduced-motion: reduce`, nada gira. O indicador vira uma
barra linear com transição suave, ou apenas o texto de status. As durações
(`--lm-duration-fast`, `--lm-duration-standard`) caem para `--lm-duration-instant`.

**Estados.**

| Momento | Composição |
|---|---|
| Splash | Marca + barra de progresso indeterminada; sobre `--lm-color-surface` |
| Validando sessão | Casca desenhada, miolo em esqueleto. Nenhum indicador de tela cheia |
| Sem sessão | Transição direta para a tela de login (padrão 1), sem indicador intermediário |
| Dados da página | Esqueleto por região (padrão 10) |
| Serviço local demorando | A partir de 5 s, texto de status e ação de escape (padrão 16) |

**Teclado.** Durante o carregamento, o foco permanece no corpo do documento. Assim que a casca
aparece, o primeiro ponto de tabulação é "Pular para o conteúdo".

**Responsividade.** O esqueleto respeita o layout do breakpoint atual — esqueleto de quatro
colunas em `large`, de uma coluna em `compact`. Um esqueleto que não corresponde ao layout final
produz o salto que ele existia para evitar.

**Erros comuns.**

- Indicadores em série: um por camada da aplicação.
- Indicador de tela cheia quando a casca já poderia estar desenhada.
- Cor de fundo diferente entre splash, janela e casca.
- Esqueleto com geometria diferente do conteúdo final.

**No LUMINA.** Três indicadores em sequência no arranque: `App.jsx` linhas 24–30 (giro centrado
em `height: 100vh` sobre `#101922` embutido), `Login.jsx` linhas 75–84 (cartão diferente do
cartão final, com giro) e `Dashboard.jsx` linhas 163–172 (giro que substitui a página inteira) —
mais o mesmo padrão em `Conflicts`, `Documents`, `Notifications`, `Settings`, `Statistics` e
`Calendar`. Três geometrias diferentes antes do primeiro dado. `#101922` aparece embutido em
`App.css` linhas 11 e 18, `App.jsx` linha 26 e `Login.jsx` linha 219 — quatro lugares que
precisam virar `--lm-color-surface`, sob pena de o tema claro nascer com flash.

---

## Mapa de padrões por página

| Página | Padrões que a governam | Mudança estrutural principal |
|---|---|---|
| Login | 1, 16, 20 | Um único formulário; falha de serviço distinta de credencial inválida |
| Wizard (Electron) | 2, 9, 13 | Adotar os tokens do sistema; trocar emoji por ícone + rótulo |
| Dashboard | 10, 6, 17, 20 | Conflito como faixa acima; tirar controle de dentro do cartão de indicador |
| Calendário | 12, 6, 16 | Barras de intervalo; a grade nunca desaparece; escala de lista em `compact` |
| Conflitos | 11, 6, 13, 17 | De cartões + modal para list-detail |
| Estatísticas | 10, 6, 17 | Paleta de gráfico do sistema; tooltip que respeita o tema |
| Documentos | 3, 8, 9, 13, 6 | Modal de 15 campos vira página; seletor de reserva; seleção múltipla |
| Emails | 11, 3, 6, 15 | Quebrar as quatro abas: caixa (list-detail), compor (ação), automações (página), conexão (Configurações) |
| Notificações | 14, 6, 11, 18 | Agrupar por tempo; item navega para a origem; tirar o painel de indicadores |
| Sugestões IA | 19, 17, 6 | Estado "não configurado" padronizado; sem cor de marca própria |
| Template de Condomínio | — | Superfície de papel isolada do tema (exceção documentada) |
| Configurações | 5, 15, 13, 19 | Dez seções com salvamento por seção; zona destrutiva separada; seção Aparência |
| Todas | 7, 20 | Paleta de comandos; casca antes dos dados |

**Sobre o Template de Condomínio.** `CondoTemplate.jsx` renderiza um documento com `#fff` e
`#000` literais dentro de um aplicativo escuro. Isso **não** é um anti-padrão: é uma superfície
de papel, que representa o que será impresso e precisa ser independente do tema. A regra é
declará-la como exceção — um contêiner com rótulo "Pré-visualização do documento", contorno
`--lm-color-outline-variant`, e os estilos internos isolados numa folha de impressão dedicada em
vez do truque de `visibility` em `body *` (linhas 237–252), que quebra assim que qualquer
conteúdo for renderizado por portal.

---

## Anti-padrões observados no LUMINA hoje

Cada linha foi verificada no código. Nada aqui é hipotético.

### Foco, teclado e semântica

| # | Composição errada | Onde | Composição correta |
|---|---|---|---|
| 1 | `* { … outline: none }` mata o foco em toda a aplicação | `styles/global.css:64` | Reset sem `outline` + `:focus-visible` com `--lm-focus-ring-width`, `--lm-focus-ring-offset`, `--lm-focus-ring-color` |
| 2 | `<div onClick>` como controle: cartão de notificação, evento do calendário, itens do menu do aplicativo | `pages/Notifications.jsx:275-279`, `components/Calendar.jsx:141-148`, `components/Sidebar.jsx:179-218` | `<button>` — recebe foco, responde a Enter e Espaço, tem papel |
| 3 | `tabIndex={-1}` no botão de revelar senha: só o mouse consegue usá-lo | `pages/Login.jsx:168` | Botão alcançável, `aria-pressed`, rótulo alternante |
| 4 | `title=` do HTML como único portador de informação (nome do hóspede, "Baixar", "Excluir") | `components/Calendar.jsx:145`, `pages/Documents.jsx:353,361` | Rótulo visível, ou `aria-label` + tooltip com `--lm-tooltip-bg` / `--lm-tooltip-label` |
| 5 | Zero atributos `aria-*`, zero `role=`, zero `:focus-visible` em 9.259 linhas | Todo o `frontend/src` | Contrato de foco e semântica declarado por padrão, conforme [`03-acessibilidade.md`](03-acessibilidade.md) |

### Camadas e contêineres

| # | Composição errada | Onde | Composição correta |
|---|---|---|---|
| 6 | Formulário de ~15 campos, 5 seções, abas internas e lista dinâmica dentro de um modal de 800px | `pages/Documents.jsx:371-681` | Página dedicada (padrão 3) |
| 7 | Abas dentro do corpo de um modal: duas camadas de navegação dentro de uma camada modal | `pages/Documents.jsx:382-395` | Seletor de tipo antes do formulário, ou dois pontos de entrada |
| 8 | Duas ações de mesma largura (`flex: 1`) disputando o papel de primária | `pages/Documents.jsx:413-432` | Uma primária + seletor "Tipo de documento" |
| 9 | Clique no scrim fecha o modal com o formulário sujo | `pages/Documents.jsx:372`, `pages/Conflicts.jsx:216`, `pages/Dashboard.jsx:49`, `components/EventModal.jsx:29` | Scrim fecha apenas quando não há alterações; sujo, abre confirmação de descarte |
| 10 | Comparação de duas reservas lado a lado espremida em `max-width: 560px` | `pages/Conflicts.jsx:215-304` | List-detail (padrão 11) |
| 11 | Quatro tarefas distintas em quatro abas da mesma página — "Conexão" é configuração, não e-mail | `pages/Emails.jsx:178-195` | Quebrar conforme o mapa de páginas |

### Ações destrutivas

| # | Composição errada | Onde | Composição correta |
|---|---|---|---|
| 12 | `window.confirm` para excluir documento | `pages/Documents.jsx:130` | Dialog do sistema com o nome do arquivo no título (padrão 13) |
| 13 | Botão destrutivo com `background: '#e53e3e'` embutido, na mesma barra que "Salvar Configurações" | `pages/Settings.jsx:266-276` | Zona destrutiva ao fim da seção "Dados e reinicialização", com confirmação por digitação |

### Estados

| # | Composição errada | Onde | Composição correta |
|---|---|---|---|
| 14 | Três indicadores de carregamento em sequência, com três geometrias diferentes, antes do primeiro dado | `App.jsx:24-30`, `pages/Login.jsx:75-84`, `pages/Dashboard.jsx:163-172` | Casca imediata + esqueleto por região (padrão 20) |
| 15 | "Atualizar" define `loading = true` e apaga a página inteira, destruindo o contexto que o usuário estava lendo | `pages/Notifications.jsx:190-193`, `pages/Documents.jsx:295-298`, `pages/Conflicts.jsx:123-126` | Conteúdo permanece; indicador linear sob o cabeçalho da região |
| 16 | Estado vazio que apaga o layout: sem reservas, a grade do calendário desaparece | `pages/Calendar.jsx:146-152` | A grade permanece; faixa informativa acima (padrão 12) |
| 17 | Erro genérico sem escopo: "Algo deu errado" / "Ocorreu um erro inesperado nesta seção", com cor de aviso | `components/ErrorBoundary.jsx:35-41` | Escopo nomeado + o que ainda funciona + código copiável + `--lm-color-error-container` |
| 18 | Falha de rede cai em `console.error` e a página mostra um vazio genérico, indistinguível de "não há dados" | `services/api.js:32-46` e todas as páginas | Estado de erro por região (padrão 17) e detector de saúde do serviço (padrão 16) |
| 19 | Backend fora produz um formulário de login que nunca vai funcionar, sem explicação | `pages/Login.jsx:24-28` | Tela de bloqueio de serviço (padrão 16) |
| 20 | 401 descarta a tela inteira e o trabalho em curso | `services/api.js:37-42` + `contexts/AuthContext.jsx:74-82` | Dialog de reautenticação preservando o estado (padrão 19) |

### Cor, marca e leitura

| # | Composição errada | Onde | Composição correta |
|---|---|---|---|
| 21 | Segunda cor de marca inventada para IA (`#8b5cf6`) em abas, botões, chips e bolhas de conversa | `pages/AISuggestions.jsx:9-11`, `pages/Settings.jsx:242,732` | `--lm-color-tertiary` / `--lm-color-tertiary-container`, ou nenhum acento — a IA não é submarca |
| 22 | Cor de alerta como fundo do cartão, com `rgba()` literal | `pages/Dashboard.jsx:225-241` | `--lm-color-error-container` / `--lm-color-on-error-container` e o par de sucesso correspondente |
| 23 | Cores de plataforma e de série de gráfico embutidas (`#FF5A5F`, `#003580`, `#2563eb`, `#16a34a`, `#6366f1`) | `pages/Statistics.jsx:149-153,268,307,401` | `--lm-color-airbnb`, `--lm-color-booking` e `--lm-chart-series-1` … `--lm-chart-series-8` |
| 24 | Tooltip de gráfico com `background: 'white'` dentro de um aplicativo escuro; grade em `rgba(255,255,255,0.06)` | `pages/Statistics.jsx:338-343,241,284,380` | Superfície e grade por token, funcionando nos dois temas |
| 25 | `input[readonly] { opacity: 0.7 }` derruba o contraste do texto abaixo do mínimo AA | `styles/global.css:292-295` | Cor de texto mantida, fundo `--lm-color-surface-container`, chip declarando a origem |
| 26 | `#101922` embutido em quatro arquivos como cor de fundo da aplicação | `App.css:11,18`, `App.jsx:26`, `pages/Login.jsx:219` | `--lm-color-surface` |
| 27 | Fonte carregada por `@import` do CDN do Google Fonts num aplicativo offline | `styles/global.css:1` | Inter auto-hospedada, empacotada, com `--lm-font-sans` |

### Densidade de informação e hierarquia

| # | Composição errada | Onde | Composição correta |
|---|---|---|---|
| 28 | Controle de largura total dentro de um cartão de leitura ("Enviar Relatório" dentro do KPI de receita) | `pages/Dashboard.jsx:207-216` | Ação na barra da região ou no menu de estouro da página |
| 29 | Indicador de tendência sem valor: `trend="up"` passado sem `trendValue` | `pages/Dashboard.jsx:196-201,202-217` | Variação só é renderizada com número, período e sinal |
| 30 | Painel de quatro indicadores dentro da central de notificações, um deles ("Total") não acionável | `pages/Notifications.jsx:198-230` | Uma linha de contagens; conflitos já vivem no Dashboard |
| 31 | A mesma informação duas vezes: chips de detalhamento por tipo **e** abas de filtro por tipo | `pages/Notifications.jsx:233-246,249-259` | Apenas o filtro, em chips (padrão 6) |
| 32 | Chave primária pedida ao usuário: "ID da Reserva — Ex: 1, 2, 3…" | `pages/Documents.jsx:399-411`, `pages/Emails.jsx:395-401,419-425` | Seletor de reserva com busca por hóspede e data |
| 33 | Modo global de edição destravando ~12 campos de uma vez | `pages/Settings.jsx:12,277-283` | Desbloqueio por seção, com o motivo declarado por campo |
| 34 | Agrupamento por dificuldade ("Configuração Fácil" × "Configuração Avançada") | `pages/Settings.jsx:226-247` | Agrupamento por assunto: dez seções (padrão 5) |
| 35 | Caixa de seleção para preferências de efeito imediato | `pages/Settings.jsx:565-577,579-591,697-709,711-723` | Interruptor |
| 36 | Aba usada como filtro de lista | `pages/Notifications.jsx:249-259` | Chips de filtro. Aba é seção de conteúdo, não filtro |
| 37 | Chip por dia em vez de barra contínua de check-in a check-out | `components/Calendar.jsx:140-149` | Barra de intervalo atravessando as células (padrão 12) |

### Consistência do produto

| # | Composição errada | Onde | Composição correta |
|---|---|---|---|
| 38 | 171 estilos embutidos `style={{}}` — 55 em `AISuggestions.jsx`, 43 em `CondoTemplate.jsx`, 16 em `Settings.jsx`, 15 em `Dashboard.jsx`, 11 em `Login.jsx` | Todo o `frontend/src` | Classes com tokens; estilo embutido apenas para valor calculado em tempo de execução |
| 39 | Folha de estilo `<style>` embutida no corpo de um componente React | `pages/Login.jsx:213-242`, `pages/AISuggestions.jsx:223-228` | Folha própria do componente |
| 40 | Assistente de instalação com linguagem visual independente (`wizard.css`, 23 KB) | `electron/wizard/` | Mesmos arquivos de token do frontend |
| 41 | Emoji como ícone de etapa nos títulos do assistente | `electron/wizard/wizard.html` (etapas 2 a 8) | Ícone `lucide-react` + rótulo textual |
| 42 | Truque de impressão com `body * { visibility: hidden }` | `pages/CondoTemplate.jsx:237-252` | Folha de impressão dedicada com `@page`, documento em rota própria |

---

## Lacunas
> **Registro autoritativo:** [`LACUNAS.md`](LACUNAS.md). A lista abaixo reflete o estado
> do dia em que este documento foi escrito e não é atualizada quando uma lacuna fecha —
> várias destas já foram fechadas por extensão do gerador.


Regras deste documento que precisariam de um token que **não existe** em
`frontend/src/styles/tokens/`. Registradas aqui em vez de inventadas.

| # | Regra afetada | O que falta |
|---|---|---|
| 1 | Padrões 3, 4, 11, 12 — painel lateral de conteúdo | Largura de folha lateral. O único token de largura de painel é `--lm-navigation-drawer-width`, que é de navegação e não deve ser reaproveitado para conteúdo |
| 2 | Padrões 7, 8, 16 — camadas não modais sobre scrim | Opacidade de scrim genérica. Existe apenas `--lm-dialog-scrim-opacity`, semanticamente presa ao dialog |
| 3 | Regras transversais, padrões 4, 8 — snackbar com "Desfazer" | Duração de permanência. Existem durações de movimento (`--lm-duration-*`), nenhuma de exibição |
| 4 | Todos os estados de carregamento | Tokens de esqueleto: cor da base, cor do brilho, duração e sentido do ciclo. Sem eles, cada esqueleto será improvisado |
| 5 | Padrões 4, 12 — badge preenchido com a cor da plataforma | Cor de conteúdo sobre `--lm-color-airbnb` e `--lm-color-booking`. Existem apenas os pares `-container` / `on-…-container`; um preenchimento sólido não tem par de contraste verificado |
| 6 | Padrões 1, 2, 9, 12, 16, 20 — indicadores de progresso | Barra de progresso linear e circular: altura da trilha, cor da trilha, cor do indicador, espessura do arco |
| 7 | Padrão 9 — zona de soltar arquivo | Estilo do contorno tracejado: largura do traço e espaçamento |
| 8 | Padrão 12 — estados de disponibilidade | Livre, ocupado, bloqueado e sobreposto. Hoje existem apenas as cores de plataforma e as de status de gráfico (`--lm-chart-status-*`), que são de visualização de dados, não de calendário |
| 9 | Padrão 12 | Altura mínima de célula de calendário e altura de barra de reserva |
| 10 | Padrões 3, 5 — largura de leitura | Largura máxima de coluna de formulário (a regra "cerca de 720px" não tem token) |
| 11 | Padrão 14 — badge com contagem | `--lm-badge-size` é 16px, adequado a um dígito. Falta largura mínima e recuo interno para "99+" |
| 12 | Todas as regras de responsividade | Os breakpoints existem em `tokens.json` (`primitive.breakpoint`) mas não são emitidos como custom properties — e `@media` não aceita `var()`. Precisa de uma fonte única gerada (constantes JS + um arquivo de media queries), senão cada `@media` repete o número literal |
