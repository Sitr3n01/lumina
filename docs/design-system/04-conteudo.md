# 04 · Conteúdo

**LUMINA Design System** · Voz, terminologia, rótulos, erros, estados vazios, números e
internacionalização.

Texto é interface. Um rótulo ambíguo custa o mesmo que um botão invisível, e um erro que não
diz o que fazer custa mais que um erro nenhum. Este documento define as regras de escrita do
LUMINA com o mesmo status dos tokens: improvisar uma palavra é um bug, não um atalho.

Os textos deste documento são para copiar e colar. Onde aparece um exemplo, ele é o texto
final — não um esboço.

---

## 1. Voz e tom

### 1.1 A voz

A voz do LUMINA não muda. Cinco atributos, em ordem de precedência quando conflitam:

| Atributo | Significa | Teste rápido |
|---|---|---|
| **Claro** | Uma leitura basta | Alguém que nunca abriu o app entende a frase isolada? |
| **Humano** | Fala de reservas e hóspedes, não de entidades e endpoints | A frase existiria numa conversa entre duas pessoas? |
| **Direto** | Sujeito, verbo, objeto; sem rodeio | Dá para cortar 30% sem perder informação? |
| **Específico** | Números, nomes e datas reais no lugar de adjetivos | Trocar "algumas" por "3" muda a frase para melhor? |
| **Orientado à ação** | Termina apontando o próximo passo | O usuário sabe o que fazer depois de ler? |

### 1.2 Regras de escrita

| Regra | Justificativa | Certo | Errado |
|---|---|---|---|
| **Sentence case em tudo** — títulos, botões, rótulos, cabeçalhos de tabela, itens de navegação | Português não usa Title Case; caixa alta no meio da frase quebra o ritmo de leitura e não sobrevive à tradução | `Gerar autorização` | `Gerar Autorização` |
| **Acentuação completa, sempre** | Texto sem acento é erro de codificação exposto ao usuário, não economia | `Nenhuma notificação` | `Nenhuma notificacao` |
| **Voz ativa, sujeito nomeado** | Diz quem fez o quê; passiva esconde o agente e alonga a frase | `O servidor recusou a senha` | `A senha não pôde ser aceita` |
| **O sujeito é o objeto, não a empresa** | Não existe "nós" num app local de usuário único | `A sincronização falhou` | `Não conseguimos sincronizar` |
| **Sem "por favor", "desculpe", "infelizmente"** | Cortesia vazia atrasa a informação; o usuário quer o passo, não a mesura | `Descreva como o conflito foi resolvido` | `Por favor, adicione notas de resolução` |
| **Sem ponto de exclamação** | O produto administra dinheiro alheio; entusiasmo soa falso e comemora o que não é conquista | `Nenhum conflito` | `Nenhum conflito detectado!` |
| **Sem caixa alta para ênfase** | Leitores de tela podem soletrar; visualmente é ruído, não hierarquia. Ênfase é tamanho, peso e posição (ver 01) | `Esta ação não pode ser desfeita.` | `ATENÇÃO: esta ação NÃO pode ser desfeita.` |
| **Sem "clique", "toque", "aperte"** | Presume o dispositivo; teclado e leitor de tela não clicam | `Gere a primeira autorização` | `Clique em "Gerar Autorizacao"` |
| **Uma ideia por frase, até ~20 palavras** | Frase longa em interface é lida pela metade | duas frases curtas | uma frase com duas vírgulas e um "e" |
| **Reticências só em progresso, e com o caractere `…`** | `...` são três pontos que quebram diferente no fim da linha | `Sincronizando…` | `Sincronizando...` |
| **Nunca culpar o usuário** | Culpa não é informação e não conduz à correção | `A senha não confere` | `Você digitou a senha errada` |
| **Números em algarismos** | Algarismo é lido mais rápido e escaneável em lista | `3 noites` | `três noites` |

### 1.3 O tom, esse sim, muda

| Situação | Tom | Faça | Não faça |
|---|---|---|---|
| Rotina (rótulos, tabelas, navegação) | Neutro, telegráfico | Substantivo ou verbo, sem frase | Explicar o óbvio |
| Sucesso | Discreto, no passado, quantificado | `12 reservas sincronizadas` | `Pronto!`, emojis, comemoração |
| Atenção (dado que exige decisão) | Factual, com o número na frente | `2 reservas se sobrepõem em julho` | Alarmar sem quantificar |
| Erro do sistema | Responsável, sem desculpa, com saída | `O e-mail não foi enviado.` | Pedir desculpas duas vezes |
| Ação destrutiva | Frio e literal | `O arquivo será apagado deste computador.` | Suavizar a consequência |
| Estado vazio, primeira vez | Instrutivo e curto | Diz o que vai aparecer ali | Vender o recurso |
| Espera | Impessoal | `Sincronizando…` | `Estamos quase lá` |

### 1.4 Antes e depois

Textos da esquerda são os que o código produz hoje. Os da direita são o alvo.

| Onde | Hoje | Alvo |
|---|---|---|
| Calendário, falha de sync | `Erro ao sincronizar. Verifique se as URLs iCal estão configuradas.` | **A sincronização com o Airbnb falhou** · `O endereço iCal não respondeu. As reservas do Airbnb continuam com os dados de 14 de março, às 09:12.` · botões `Tentar novamente` · `Abrir configurações de calendário` |
| E-mail, falha de envio | `Erro ao enviar email. Verifique as configuracoes SMTP.` | **A mensagem não foi enviada** · `O servidor de envio recusou a conexão. Nada chegou ao hóspede e o rascunho foi mantido.` · botões `Tentar novamente` · `Abrir configurações de e-mail` |
| E-mail, validação | `Preencha todos os campos obrigatorios` | `Preencha destinatário, assunto e mensagem para enviar.` |
| Documentos, validação | `Informe o ID da reserva` | `Escolha a reserva que vai gerar o documento.` |
| Documentos, estado vazio | `Nenhum documento gerado` · `Clique em "Gerar Autorizacao" para criar uma autorizacao de hospedagem.` | **Nenhum documento gerado** · `As autorizações de hospedagem e os recibos que você gerar ficam nesta lista, prontos para baixar ou enviar ao condomínio.` |
| Conflitos, validação | `Por favor, adicione notas de resolução` | `Descreva como o conflito foi resolvido antes de salvar.` |
| Conflitos, estado vazio | `Nenhum conflito detectado!` · `Todas as reservas estão sincronizadas corretamente.` | **Nenhum conflito** · `As reservas do Airbnb e do Booking.com não se sobrepõem. Última verificação hoje, às 09:12.` |
| Notificações, estado vazio | `Nenhuma notificacao` · `As notificacoes do sistema apareceriao aqui` | **Nenhuma notificação** · `Avisos de nova reserva, conflito detectado e falha de sincronização aparecem aqui.` |
| Painel, card de conflitos | `Resolver pendências` | `Resolver 3 conflitos` |
| Configurações, teste de conexão | `Conexao OK: ...` | `Conexão estabelecida com o servidor de envio.` |
| IA, falha | `Erro ao comunicar com a IA.` | **As sugestões não foram geradas** · `O serviço de IA recusou a chave de API. Nenhuma sugestão foi alterada.` · botão `Abrir configurações de IA` |

### 1.5 Impacto em acessibilidade e responsivo

- Frases curtas e sentence case reduzem o tempo de escuta em leitor de tela e o esforço de
  leitura em dislexia. Caixa alta e abreviação agressiva fazem o oposto.
- Nenhuma regra de tom muda entre `compact`, `medium`, `expanded` e `large`. O que muda é a
  **quantidade** de texto exibido: em `compact`, o corpo de um estado vazio cai para uma
  frase; o título nunca é abreviado. Texto não é responsivo por truncamento — é responsivo
  por corte editorial planejado, com as duas versões escritas por quem escreve, não pelo CSS.

---

## 2. Terminologia canônica

A mesma entidade tem o mesmo nome na interface inteira: navegação, título de página, coluna
de tabela, rótulo de campo, mensagem de erro, notificação, documento gerado e texto de ajuda.
Um sinônimo "para não repetir" cria a suspeita de que são duas coisas diferentes.

O código pode continuar em inglês (`bookings`, `property_id`, `check_in_date`). A regra vale
para o que o usuário lê.

### 2.1 Entidades do domínio

| Termo canônico | O que é | Proibidos | Observação |
|---|---|---|---|
| **reserva** | Um período contratado por um hóspede num imóvel, vindo de uma plataforma ou criado direto | booking, agendamento, locação, estadia, aluguel, evento | "booking" é ambíguo com Booking.com — nunca usar |
| **hóspede** | Quem ocupa o imóvel no período da reserva | cliente, inquilino, locatário, usuário, guest, morador | **usuário** é o administrador do LUMINA; nunca chamar hóspede de usuário |
| **acompanhante** | Pessoa adicional na mesma reserva, listada na autorização | dependente, convidado, extra | Plural: acompanhantes |
| **imóvel** | A unidade administrada no LUMINA | propriedade, unidade, apartamento, listing, anúncio, casa | O código mantém `property`; a interface diz imóvel |
| **plataforma** | Origem da reserva: Airbnb, Booking.com ou Direto | canal, OTA, origem, fonte, site, portal | Nunca chamar o próprio LUMINA de plataforma |
| **Direto** | Reserva criada no LUMINA, sem plataforma intermediária | Manual, Outro, Próprio, Offline | "Manual" descreve o método, não a origem comercial |
| **conflito** | Duas reservas ocupando o mesmo imóvel em datas que se cruzam | choque, colisão, overbooking, erro de agenda, overlap | É o evento |
| **sobreposição** | O intervalo de datas comum às duas reservas de um conflito | overlap, interseção, cruzamento | É o intervalo — termo distinto de conflito, não sinônimo |
| **sincronização** | Leitura dos calendários das plataformas e atualização das reservas locais | sync, atualização, importação, refresh, integração | Verbo: **sincronizar** |
| **endereço iCal** | O texto que o usuário copia da plataforma e cola no LUMINA | URL iCal, link do calendário, feed, iCal URL, endereço ICS | Sempre "endereço iCal", inclusive no rótulo do campo |
| **check-in** | Data de entrada do hóspede | checkin, check in, entrada, chegada | Com hífen, minúsculo no meio da frase. Plural: check-ins |
| **check-out** | Data de saída do hóspede | checkout, check out, saída, partida | Idem |
| **noite** | Unidade de duração de uma reserva | diária (como duração), dia, pernoite | Reserva de 12 a 15 de julho = **3 noites**, não 3 dias |
| **diária** | Valor cobrado por noite | tarifa, preço da noite, rate, valor unitário | Só como preço, nunca como duração |
| **ocupação** | Percentual de noites ocupadas num período | taxa de uso, lotação, aproveitamento, occupancy | Sempre acompanhada do período |
| **receita** | Soma bruta das reservas de um período | faturamento, lucro, ganhos, renda, revenue, rendimento | **Nunca "lucro"**: o LUMINA não subtrai custos |
| **documento** | PDF gerado pelo LUMINA (autorização de hospedagem, recibo) | arquivo, PDF, anexo, papel | Distinto de relatório |
| **relatório** | Resumo financeiro de um mês, enviado por e-mail | extrato, fechamento, report | Distinto de documento |
| **modelo** | O formato fixo de um documento gerado | template, layout, formulário, padrão, esqueleto | Rótulo da página: Modelos de documento |
| **notificação** | Evento registrado pelo LUMINA, com histórico na página Notificações | alerta, aviso, mensagem, toast | Persistente; ver aviso temporário |
| **aviso temporário** | Confirmação efêmera de uma ação, em snackbar | toast, notificação, popup, flash | Nunca guarda informação que o usuário precise reler |
| **mensagem** | Um e-mail individual, recebido ou enviado | email, e-mail (como contável), correspondência | "3 mensagens novas", não "3 e-mails" |
| **e-mail** | O meio: configuração, servidor, endereço | email, mail, correio eletrônico | Com hífen, conforme grafia corrente em pt-BR |
| **sugestão de preço** | Recomendação de diária produzida pela IA local ou remota | dica, insight, recomendação de valor, tip | |
| **conta** | Credencial única de administrador do LUMINA | login, perfil, cadastro, acesso | |

### 2.2 Marcas e nome do produto

| Escrita correta | Errado | Regra |
|---|---|---|
| **LUMINA** | Lumina, LUMINA App, o sistema, a plataforma | Sempre em caixa alta, sem artigo colado a "app". "O LUMINA não respondeu", não "o sistema não respondeu" |
| **Airbnb** | AirBnB, AirBNB, airbnb | Uma maiúscula só |
| **Booking.com** | Booking, booking.com, BOOKING | Sempre com `.com`. "Booking" sozinho colide com "reserva" |

Airbnb e Booking.com aparecem como badge com rótulo textual, nunca como cor sozinha —
`--lm-color-airbnb-container` / `--lm-color-on-airbnb-container` e
`--lm-color-booking-container` / `--lm-color-on-booking-container`. Cor sem rótulo é
inacessível para daltonismo e ilegível fora de contexto (ver 03).

### 2.3 Nomes das páginas

O rótulo da navegação e o título da página são a **mesma palavra**. Quando o rótulo do rail
precisa ser mais curto, ele é um **prefixo** do título — nunca uma palavra diferente, nunca
uma reticência.

| Id no código | Rótulo no rail | Título da página | Por que muda |
|---|---|---|---|
| `dashboard` | Painel | Painel | "Dashboard" é anglicismo sem ganho |
| `calendar` | Calendário | Calendário | — |
| `conflicts` | Conflitos | Conflitos | — |
| `statistics` | Estatísticas | Estatísticas | — |
| `documents` | Documentos | Documentos | — |
| `emails` | Mensagens | Mensagens | A página lista mensagens; "Emails" mistura meio com entidade e vem sem acento |
| `ai-pricing` | Sugestões | Sugestões de preço | "Sugestões IA" é telegráfico e não diz do quê |
| `condo-template` | Modelos | Modelos de documento | "Template" é anglicismo e não diz de quê |
| `notifications` | Notificações | Notificações | — |
| `settings` | Configurações | Configurações | — |

O rail expandido (`--lm-navigation-rail-width-expanded`) e o drawer
(`--lm-navigation-drawer-width`) mostram o título completo; o rail estreito
(`--lm-navigation-rail-width`, 88px) mostra o prefixo em até duas linhas dentro de
`--lm-navigation-item-height`. Nenhum rótulo de navegação é truncado com reticência.

---

## 3. Rótulos de botão

### 3.1 Regras

| Regra | Justificativa | Certo | Errado |
|---|---|---|---|
| **Verbo no infinitivo, sempre** | O botão é uma ação; substantivo obriga o usuário a inferir o verbo | `Criar reserva` | `Nova reserva` |
| **Verbo + objeto quando o objeto não está óbvio** | "Salvar" num formulário único basta; "Salvar" numa página com três formulários, não | `Salvar configurações de e-mail` | `Salvar` |
| **Até 3 palavras / ~24 caracteres em pt-BR** | Acima disso o rótulo compete com o conteúdo e estoura na tradução | `Marcar tudo como lido` | `Marcar todas as notificações como lidas` |
| **Sentence case** | Ver 1.2 | `Enviar relatório` | `Enviar Relatório` |
| **`OK` é proibido quando a ação pode ser nomeada** | "OK" não diz o que vai acontecer; o usuário confirma sem saber o quê. Um rótulo nomeado permite decidir olhando só o botão | `Excluir documento` | `OK` |
| **`Sim` / `Não` são proibidos** | Obrigam a reler a pergunta para saber o que o botão faz | `Restaurar ao estado de fábrica` / `Cancelar` | `Sim` / `Não` |
| **O verbo do botão repete o verbo do título** | O par título/botão é a mesma frase, lida duas vezes | Título `Excluir a reserva de Ana Ribeiro?` → botão `Excluir reserva` | Título `Excluir…` → botão `Confirmar` |
| **Um par por diálogo: ação nomeada + `Cancelar`** | Duas ações primárias na mesma região são proibidas (ver README, 3.4) | `Enviar relatório` / `Cancelar` | `Enviar` / `Não enviar` |
| **Estado de carregamento: gerúndio + `…`, mesma largura** | O botão não pode encolher nem crescer ao trocar de estado, sob pena de mover o layout | `Sincronizando…` | `Buscando...` com largura variável |
| **Botão desabilitado exige motivo visível** | Botão morto sem explicação é beco sem saída | `Salvar` desabilitado + texto de apoio `Preencha o assunto para enviar.` | `Salvar` cinza e silencioso |
| **Botão só de ícone tem rótulo textual acessível** | Sem nome acessível, o botão não existe para leitor de tela (ver 03) | `aria-label="Excluir documento"` | ícone sem rótulo |

### 3.2 Vocabulário aprovado

| Aprovado | Evitar | Por quê |
|---|---|---|
| `Sincronizar agora` | Atualizar, Refresh, Sync, Recarregar | "Sincronizar" é o termo canônico; "agora" separa a ação manual da automática |
| `Verificar novamente` | Tentar de novo, Retry, Recarregar | Usado quando a operação anterior não falhou, apenas não achou nada |
| `Tentar novamente` | Retry, Repetir, Tente de novo | Usado depois de uma falha |
| `Salvar` | Aplicar, Confirmar, OK, Gravar | Uma palavra só quando há um formulário na tela |
| `Cancelar` | Voltar, Fechar, Não, Descartar | "Cancelar" abandona sem gravar; "Fechar" só quando nada seria perdido |
| `Descartar rascunho` | Cancelar, Limpar, Apagar | Nomeia o que se perde |
| `Excluir documento` | Excluir, Remover, Deletar, Apagar, Lixeira | O objeto no rótulo evita exclusão por engano |
| `Resolver conflito` | Marcar, OK, Feito, Concluir | |
| `Marcar como resolvido` | Resolver, OK, Pronto | Usado no diálogo, onde o objeto já está no título |
| `Gerar autorização` | Gerar, Criar PDF, Emitir, Autorização | |
| `Gerar recibo` | Recibo, Emitir recibo | |
| `Baixar` | Download, Salvar arquivo, Exportar | "Baixar" quando o arquivo já existe |
| `Exportar calendário` | Exportar, Download, Gerar iCal | "Exportar" quando o arquivo é produzido na hora |
| `Enviar relatório por e-mail` | Enviar, Enviar Relatório, Mandar | O destino faz parte da ação |
| `Enviar mensagem` | Enviar, Send, Disparar | |
| `Enviar lembrete de check-in` | Enviar Lembrete, Lembrar | |
| `Testar conexão` | Testar, Verificar, Checar | |
| `Marcar tudo como lido` | Limpar, Zerar, Ler tudo | "Limpar" sugere apagar |
| `Criar reserva` | Nova Reserva, Adicionar, `+` | |
| `Adicionar acompanhante` | Novo acompanhante, `+`, Mais um | |
| `Limpar filtros` | Limpar, Resetar, Remover filtros | |
| `Entendi` | OK, Fechar, Certo | Único caso em que um botão não executa nada: diálogo puramente informativo de um botão só |
| `Entrar` | Login, Acessar, Sign in | |
| `Sair` | Logout, Desconectar, Encerrar | |
| `Restaurar ao estado de fábrica` | Hard Reset, Resetar Tudo, Zerar | Nome em português do que realmente acontece |

Tokens do botão: `--lm-button-height`, `--lm-button-padding-inline`, `--lm-button-gap`,
`--lm-button-filled-bg` / `--lm-button-filled-label` na ação primária,
`--lm-button-tonal-bg` na secundária, `--lm-button-destructive-bg` /
`--lm-button-destructive-label` na destrutiva. O rótulo usa a escala `label-lg`
(`--lm-type-label-lg-size`, `--lm-type-label-lg-weight`, `--lm-type-label-lg-tracking`).

### 3.3 Responsivo e acessibilidade

- A **altura** do botão é fixa (`--lm-button-height`, derivado de `--lm-density-control`);
  a **largura** nunca é. Rótulo mais longo empurra a largura — nunca reduz a fonte, nunca
  trunca, nunca quebra em duas linhas.
- Em `compact`, a barra de ações de um diálogo empilha os botões: primária em cima,
  `Cancelar` embaixo, ambas com largura total. A ordem de leitura em DOM continua sendo
  `Cancelar` antes da primária.
- O nome acessível do botão é o rótulo textual. Se o texto visível diz `Excluir documento`,
  o `aria-label` não diz "Remover". Rótulo visível e nome acessível divergentes quebram
  comando por voz.

---

## 4. Mensagens de erro

### 4.1 A estrutura de quatro partes

Toda mensagem de erro do LUMINA responde, nesta ordem:

| Parte | Pergunta | Onde vai | Regra |
|---|---|---|---|
| **1. Fato** | O que aconteceu? | Título | Frase no passado, sujeito nomeado, sem ponto final, até 60 caracteres. **Não começa com "Erro"** |
| **2. Consequência** | Por que isso importa para meus dados? | Primeira frase do corpo | Diz o que **não** foi feito e o que **continua** valendo. Números e datas reais |
| **3. Saída** | O que eu faço? | Segunda frase do corpo | Um passo concreto, com o caminho nomeado (`Configurações → E-mail`) |
| **4. Ação** | Onde clico? | Botões | Uma ação primária que executa ou leva ao passo; no máximo uma secundária |

Se alguma das quatro partes não puder ser escrita, o erro está mal diagnosticado — a correção
é no código que detecta a falha, não no texto.

### 4.2 Regras

- **Nunca expor código técnico sem tradução.** Se o código ajuda no diagnóstico, ele vai num
  bloco secundário recolhido, rotulado `Detalhes técnicos`, em `--lm-font-mono` com
  `--lm-type-code-size`, selecionável e copiável. Nunca no título, nunca no corpo.
- **Nunca dizer "verifique sua conexão com a internet".** O LUMINA é 100% local e offline.
  Quando o backend local não responde, a internet é irrelevante — dizer isso manda o usuário
  investigar o lugar errado.
- **Nunca "tente novamente mais tarde" sem um botão `Tentar novamente`.**
- **Onde cada erro aparece:**

| Escopo do erro | Superfície | Persistência |
|---|---|---|
| Um campo | Texto sob o campo, `--lm-field-error-text`, borda `--lm-field-border-error` | Até o campo ficar válido |
| Uma operação numa página | Banner no topo da região afetada, `--lm-color-error-container` / `--lm-color-on-error-container` | Até resolver ou dispensar |
| Bloqueia a tela inteira | Diálogo (`--lm-dialog-bg`, `--lm-dialog-max-width`) | Até uma decisão |
| Confirmação de algo que já falhou e não exige ação | Snackbar (`--lm-snackbar-bg`, `--lm-snackbar-label`) | Efêmero |

  Snackbar **não** é lugar para erro que exige ação: ele some antes de ser lido e não é
  focalizável.
- **Cor nunca sozinha.** O erro carrega ícone + texto além da cor. `--lm-color-error` e
  `--lm-color-on-error-container` já passam pela verificação de contraste do gerador nos dois
  temas, mas contraste não resolve daltonismo — o texto resolve.
- **Anúncio para leitor de tela** — o container do erro é uma região viva e o foco vai para
  ela ou para o campo inválido. As regras de `role` e `aria-live` estão em 03.

### 4.3 Os erros reais do LUMINA

| Situação | Título | Corpo | Ações | Superfície |
|---|---|---|---|---|
| **Falha de sincronização iCal** | A sincronização com o Airbnb falhou | O endereço iCal não respondeu. As reservas do Airbnb continuam com os dados da última sincronização, de 14 de março às 09:12. Confira o endereço em Configurações → Calendários. | `Tentar novamente` · `Abrir configurações de calendário` | Banner na página Calendário |
| **Falha de sincronização, endereço ausente** | Nenhum endereço iCal cadastrado | O LUMINA não tem de onde ler as reservas. Cadastre o endereço iCal do Airbnb e do Booking.com para sincronizar. | `Abrir configurações de calendário` | Banner na página Calendário |
| **Conflito entre plataformas** | Duas reservas ocupam o mesmo período | Ana Ribeiro (Airbnb) e Marco Dias (Booking.com) se sobrepõem de 12 a 15 de julho — 3 noites. Uma das duas precisa ser cancelada na plataforma de origem. | `Resolver conflito` · `Ver as duas reservas` | Card na página Conflitos |
| **Falha de envio de e-mail** | A mensagem não foi enviada | O servidor de envio recusou a conexão. Nada chegou a Ana Ribeiro e o rascunho foi mantido. Confira servidor, porta e senha em Configurações → E-mail. | `Tentar novamente` · `Abrir configurações de e-mail` | Banner na página Mensagens |
| **Credencial inválida, entrada no app** | Usuário ou senha incorretos | Confira o nome de usuário e se o Caps Lock está ativo. | — (foco volta para o campo de senha) | Texto sob os campos |
| **Credencial inválida, chave de IA** | A chave de API foi recusada | O serviço de IA não aceitou a chave informada. Nenhuma sugestão foi gerada e as sugestões anteriores continuam disponíveis. | `Abrir configurações de IA` | Banner na página Sugestões de preço |
| **Sessão expirada** | Sua sessão expirou | Por segurança, o LUMINA encerrou a sessão depois do período de inatividade. Nada foi perdido. | `Entrar novamente` | Diálogo |
| **Sem conexão com o backend local** | O LUMINA não está respondendo | O serviço local que guarda suas reservas parou. Seus dados continuam neste computador — a tela apenas não consegue lê-los agora. | `Tentar novamente` · `Reiniciar o LUMINA` | Diálogo |
| **Falha ao gerar documento, dado faltando** | A autorização não foi gerada | A reserva de Ana Ribeiro não tem o número do documento do hóspede, obrigatório na autorização de hospedagem. Nenhum arquivo foi criado. | `Preencher dados do hóspede` · `Cancelar` | Diálogo |
| **Falha ao gerar documento, escrita em disco** | A autorização não foi gravada | O LUMINA não conseguiu escrever na pasta de documentos. Verifique se a pasta existe e se há espaço em disco. | `Tentar novamente` · `Abrir pasta de documentos` | Banner na página Documentos |
| **Falha ao baixar documento** | O arquivo não foi encontrado | `autorizacao-ana-ribeiro.pdf` não está mais na pasta de documentos. Ele pode ter sido movido ou apagado fora do LUMINA. | `Gerar novamente` · `Atualizar lista` | Snackbar + item marcado na lista |
| **Falha inesperada de uma seção** | Esta seção não pôde ser carregada | Um erro inesperado interrompeu a página. As demais páginas continuam funcionando. | `Recarregar seção` · `Copiar detalhes técnicos` | Bloco no lugar da seção |

### 4.4 Tradução do técnico para o humano

| Nunca mostrar | Mostrar |
|---|---|
| `ECONNREFUSED 127.0.0.1:8000` | O serviço local do LUMINA não respondeu. |
| `HTTP 401 Unauthorized` | Sua sessão expirou. |
| `HTTP 403 Forbidden` | Esta conta não tem acesso a este recurso. |
| `HTTP 404 /v1/documents/...` | O arquivo não está mais na pasta de documentos. |
| `HTTP 422 Unprocessable Entity` | Alguns campos precisam de correção. |
| `HTTP 500 Internal Server Error` | O LUMINA não conseguiu concluir a operação. |
| `SMTP 535 Authentication failed` | O servidor de e-mail recusou usuário ou senha. |
| `IMAP LOGIN failed` | O servidor de recebimento recusou usuário ou senha. |
| `ETIMEDOUT` na leitura do iCal | O endereço iCal demorou demais para responder. |
| `Invalid iCalendar object` | O conteúdo do endereço iCal não é um calendário válido. |
| `ENOSPC` | Não há espaço em disco para gravar o documento. |
| `EACCES` | O LUMINA não tem permissão para escrever na pasta de documentos. |
| `null is not an object` | Um erro inesperado interrompeu esta seção. |

O código original continua útil e vai para `Detalhes técnicos`, recolhido:

```jsx
<details className="lm-error__tech">
  <summary>Detalhes técnicos</summary>
  <code>SMTP 535 — authentication failed (smtp.exemplo.com:587)</code>
</details>
```

---

## 5. Confirmações destrutivas

### 5.1 Por que "Tem certeza?" é proibido

"Tem certeza?" não informa nada. Não diz o que será apagado, quanto, de onde, nem se dá para
voltar atrás — devolve a decisão ao usuário sem lhe dar o dado necessário para decidir. Pior:
como a pergunta é sempre igual, ela vira reflexo, e o diálogo passa a ser confirmado sem
leitura. Uma confirmação que ninguém lê é pior que nenhuma, porque produz a sensação de
proteção sem a proteção.

A pergunta útil não é "você tem certeza?", é "**é isto que você quer que aconteça?**" — e ela
só pode ser respondida se a consequência estiver escrita.

Proibidos junto: "Esta ação é irreversível. Deseja continuar?" sem dizer o que se perde;
"ATENÇÃO" em caixa alta; três parágrafos de aviso; e o `window.confirm` do navegador, que não
aceita tokens, não é estilizável e não segue as regras de foco do sistema.

### 5.2 A estrutura

| Parte | Regra | Exemplo |
|---|---|---|
| **Título** | Pergunta curta com o **verbo da ação** e o **nome real do objeto**. Até 60 caracteres | `Excluir a reserva de Ana Ribeiro?` |
| **Corpo** | O que some, o que fica, se volta atrás e quem mais é afetado. Quantificado | `A reserva de 12 a 15 de julho sai do calendário deste computador, junto com as notas ligadas a ela. Reservas importadas do Airbnb voltam na próxima sincronização; reservas diretas não podem ser recuperadas.` |
| **Botão destrutivo** | O **mesmo verbo** do título + objeto | `Excluir reserva` |
| **Botão de fuga** | Sempre `Cancelar` | `Cancelar` |

Regras de comportamento:

- O botão destrutivo usa `--lm-button-destructive-bg` / `--lm-button-destructive-label`.
- **O foco inicial vai para `Cancelar`**, nunca para o botão destrutivo. `Esc` cancela.
  `Enter` não dispara a destruição.
- O diálogo usa `--lm-dialog-bg`, `--lm-dialog-radius`, `--lm-dialog-padding`,
  `--lm-dialog-max-width` e scrim `--lm-dialog-scrim` com `--lm-dialog-scrim-opacity`.
- Título em `title-lg` (`--lm-type-title-lg-size`), corpo em `body-md`
  (`--lm-type-body-md-size`) sobre `--lm-color-on-surface-variant`.
- Sem ícone de alerta gigante. A gravidade está no texto e na cor do botão.

### 5.3 Escala: nem toda destruição merece um diálogo

| Reversibilidade | Padrão | Justificativa |
|---|---|---|
| Reversível em segundos | Executa e oferece **`Desfazer`** em snackbar (`--lm-snackbar-action`) | Interrompe o fluxo zero vezes e protege igual |
| Irreversível, escopo pequeno | Diálogo de confirmação | O usuário precisa ler antes |
| Irreversível, escopo total | Diálogo + **confirmação por digitação** | O atrito é o ponto: impede o reflexo |

Confirmação por digitação é reservada a **uma** ação: restaurar ao estado de fábrica. Usá-la
em mais lugares a transforma em ritual e anula o efeito.

### 5.4 Os casos reais

**Excluir documento gerado** — reversível na prática (o documento pode ser gerado de novo).
Sem diálogo:

> Ação imediata + snackbar: `Documento excluído` · ação `Desfazer`

**Excluir reserva direta** — irreversível. Diálogo:

> **Excluir a reserva de Ana Ribeiro?**
> A reserva de 12 a 15 de julho sai do calendário deste computador, junto com as notas
> ligadas a ela. Reservas importadas do Airbnb voltam na próxima sincronização; reservas
> diretas não podem ser recuperadas.
> `Cancelar` · `Excluir reserva`

**Descartar rascunho de mensagem** — irreversível, escopo pequeno. Diálogo:

> **Descartar esta mensagem?**
> O texto escrito para Ana Ribeiro será perdido. Nada foi enviado.
> `Continuar escrevendo` · `Descartar rascunho`

**Restaurar ao estado de fábrica** — irreversível, escopo total. Diálogo + digitação.
Substitui o texto atual, que abre com `ATENÇÃO` em caixa alta e termina em "Deseja
continuar?":

> **Restaurar o LUMINA ao estado de fábrica?**
> Todas as configurações que você editou são apagadas: endereços iCal, dados de e-mail e
> chaves de IA. Suas reservas e documentos não são apagados. O LUMINA reinicia na tela de
> configuração inicial e você refaz o cadastro. Não há como desfazer.
> Campo: `Digite RESTAURAR para confirmar`
> `Cancelar` · `Restaurar ao estado de fábrica` (desabilitado até a digitação conferir)

**Marcar conflito como resolvido** — não é destrutivo: muda o estado de um registro, não apaga
nada. Não usa diálogo de confirmação nem botão destrutivo. Usa o formulário de resolução, com
as notas obrigatórias, e confirma em snackbar: `Conflito marcado como resolvido`.

**Sair** — não é destrutivo. Só pede confirmação se houver rascunho não enviado, e aí a
pergunta é sobre o rascunho, não sobre sair.

### 5.5 Acessibilidade e responsivo

- O diálogo é modal: foco preso dentro, `Esc` fecha, foco retorna ao elemento que o abriu.
  Detalhes em 03.
- O nome acessível do diálogo é o próprio título; o corpo é a descrição. Nada de rótulo
  genérico "Confirmação".
- Em `compact`, o diálogo ocupa a largura disponível respeitando `--lm-dialog-max-width` como
  teto, os botões empilham com largura total, e o destrutivo fica **embaixo** — mais longe do
  polegar em alcance natural.

---

## 6. Estados vazios

### 6.1 As quatro perguntas

Todo estado vazio responde, nesta ordem, e falha se pular alguma:

1. **O que deveria estar aqui?** — nomeia o conteúdo ausente com o termo canônico.
2. **Por que está vazio?** — a causa: ainda não existe, o filtro excluiu, foi removido, o
   recurso não está configurado, o serviço não respondeu.
3. **O que eu faço agora?** — um passo. No máximo uma ação primária.
4. **O que muda quando deixar de estar vazio?** — o que vai aparecer ali, para o usuário
   reconhecer o sucesso quando ele chegar.

### 6.2 Anatomia e regras

| Elemento | Token / regra |
|---|---|
| Ícone | Decorativo, `aria-hidden`, `--lm-color-on-surface-variant`. Em `compact`, some |
| Título | `--lm-type-title-md-size` / `--lm-type-title-md-weight`, `--lm-color-on-surface`, sentence case, sem exclamação, sem ponto final |
| Corpo | `--lm-type-body-md-size`, `--lm-color-on-surface-variant`, 1–2 frases |
| Ação | No máximo uma primária; a secundária só quando há duas saídas legítimas |
| Espaçamento | `--lm-space-16` entre elementos, `--lm-space-48` de respiro vertical |

Proibido em estado vazio: exclamação, "clique", ilustração maior que o texto, card dentro de
card, e a palavra "vazio".

**Estado vazio não é estado de carregamento nem estado de erro.** Enquanto a resposta não
chega, a tela mostra esqueleto — nunca "Nenhum documento gerado", que é uma afirmação falsa
que pisca. E quando a leitura falha, a tela mostra o erro da seção 4, não o estado vazio: dizer
"nenhuma reserva" quando o backend caiu é mentir sobre os dados do usuário.

### 6.3 As seis variantes

| Variante | Quando | Tom | Ação |
|---|---|---|---|
| **Primeira utilização** | O conteúdo nunca existiu | Instrutivo | A que cria o primeiro item |
| **Sem resultados** | Busca não encontrou nada | Neutro, repete o termo buscado | `Limpar busca` |
| **Filtro sem resultados** | Existe conteúdo, o filtro escondeu | Neutro, nomeia os filtros ativos e quantos itens estão ocultos | `Limpar filtros` — **nunca** uma ação que cria conteúdo |
| **Conteúdo removido / tudo concluído** | Havia itens, agora não há | Sucesso discreto | Nenhuma obrigatória |
| **Recurso não configurado** | O recurso existe mas depende de configuração | Factual, sem culpa | `Abrir configurações de …` |
| **Serviço indisponível** | O backend local não respondeu | Tranquilizador quanto aos dados | `Tentar novamente` |

O LUMINA tem um único usuário administrador: **não existe estado "sem permissão"**. O caso que
existe de verdade é *recurso não configurado* (e-mail sem servidor, IA sem chave). Escrever
"você não tem permissão" num app de usuário único é inventar um obstáculo que não existe e
esconder a causa real.

### 6.4 Os textos

| Tela · variante | Título | Corpo | Ação |
|---|---|---|---|
| **Calendário** · primeira utilização | Nenhuma reserva importada ainda | Cadastre o endereço iCal do Airbnb e do Booking.com. As reservas de cada plataforma aparecem neste calendário com a cor e o rótulo da origem. | `Abrir configurações de calendário` |
| **Calendário** · mês sem reservas | Nenhuma reserva em julho de 2025 | O próximo mês com reservas é agosto. | `Ir para agosto` |
| **Conflitos** · tudo limpo | Nenhum conflito | As reservas do Airbnb e do Booking.com não se sobrepõem. Última verificação hoje, às 09:12. | `Verificar novamente` |
| **Conflitos** · primeira utilização | Ainda não há reservas para comparar | Depois da primeira sincronização, o LUMINA compara as datas de todas as plataformas e mostra aqui qualquer sobreposição. | `Sincronizar agora` |
| **Estatísticas** · sem dados | Ainda não há dados para o período | As estatísticas usam reservas já concluídas. Sincronize as plataformas ou escolha um período anterior. | `Sincronizar agora` |
| **Estatísticas** · período filtrado vazio | Nenhuma reserva entre 1 e 31 de março | Há 24 reservas fora deste período. | `Limpar filtros` |
| **Documentos** · primeira utilização | Nenhum documento gerado | As autorizações de hospedagem e os recibos que você gerar ficam nesta lista, prontos para baixar ou enviar ao condomínio. | `Gerar autorização` |
| **Documentos** · filtro sem resultados | Nenhum documento com "recibo" no nome | 3 documentos estão ocultos pelo filtro atual. | `Limpar filtros` |
| **Mensagens** · primeira utilização | Nenhuma mensagem carregada | O LUMINA lê a caixa de entrada configurada e mostra aqui as mensagens dos hóspedes. | `Buscar mensagens` |
| **Mensagens** · não configurado | O e-mail ainda não está configurado | Informe o servidor de recebimento e o de envio para ler e responder mensagens dentro do LUMINA. | `Abrir configurações de e-mail` |
| **Mensagens** · busca sem resultado | Nada encontrado para "ribeiro" | A busca cobre remetente, assunto e corpo das mensagens carregadas. | `Limpar busca` |
| **Notificações** · vazio | Nenhuma notificação | Avisos de nova reserva, conflito detectado e falha de sincronização aparecem aqui. | — |
| **Notificações** · tudo lido | Tudo em dia | Você leu as 12 notificações deste mês. | — |
| **Sugestões de preço** · não configurado | As sugestões de preço estão desligadas | Ligue a integração de IA e informe a chave de API para receber sugestões de diária com base no seu histórico. | `Abrir configurações de IA` |
| **Sugestões de preço** · sem histórico | Ainda não há histórico suficiente | As sugestões precisam de pelo menos 30 dias de reservas concluídas. Você tem 8. | `Ver calendário` |
| **Modelos de documento** · nenhum campo preenchido | O modelo ainda não tem os dados do imóvel | Endereço, número da unidade e nome do condomínio aparecem em toda autorização gerada. | `Preencher dados do imóvel` |
| **Painel** · próximos check-ins | Nenhum check-in nos próximos 7 dias | O próximo check-in agendado é 12 de agosto. | — |
| **Painel** · atividade recente | Nenhuma atividade nas últimas 24 horas | Sincronizações, mensagens enviadas e documentos gerados aparecem aqui. | — |
| **Qualquer lista** · serviço indisponível | Não foi possível carregar as reservas | O serviço local do LUMINA não respondeu. Seus dados continuam neste computador. | `Tentar novamente` |

### 6.5 Acessibilidade e responsivo

- O bloco de estado vazio é uma região com nome acessível igual ao título. O ícone é
  decorativo e não é anunciado.
- Quando uma lista passa de cheia para vazia por causa de um filtro, a mudança é anunciada em
  região viva ("Nenhum documento com 'recibo' no nome") — senão, quem usa leitor de tela
  digita no filtro e não recebe retorno nenhum.
- Em `compact`: sem ícone, corpo reduzido a uma frase, ação com largura total.
- Em `expanded` e `large`: o bloco fica centralizado na região vazia, com medida de leitura
  limitada — texto de estado vazio ocupando 1200px de largura é ilegível.

---

## 7. Números, datas e moeda

O LUMINA é pt-BR. Formatação errada aqui não é deselegância: um separador decimal trocado ou
um dia deslocado é um erro de dado exibido como se fosse dado.

### 7.1 Moeda

| Regra | Certo | Errado |
|---|---|---|
| Sempre via `Intl.NumberFormat` com `style: 'currency'` | `R$ 1.234,56` | `R$ ${valor.toLocaleString('pt-BR')}` montado à mão |
| O espaço entre `R$` e o número é não separável (o `Intl` já o produz) | `R$ 1.234,56` numa linha só | `R$` sozinho no fim da linha |
| Duas casas decimais em tabela, card e detalhe | `R$ 890,00` | `R$ 890` |
| Zero casas apenas no eixo de gráfico | eixo `R$ 2 mil` | eixo `R$ 2.000,00` |
| Abreviação só em eixo de gráfico, com vírgula e sufixo em português | `R$ 1,2 mil` · `R$ 3,4 mi` | `R$ 1.2k` |
| Valor exato nunca é abreviado | card `R$ 12.480,00` | card `R$ 12,5 mil` |
| **Ausência de dado é `—`, não `R$ 0,00`** | `—` | `R$ 0,00` para um mês sem informação |

A última linha é a mais importante e é a que o código erra hoje: `formatCurrency` devolve
`R$ 0,00` para `null` e `undefined` porque testa `!value`. Isso faz "não sei" e "zero" ficarem
idênticos na tela — o usuário lê receita zero onde não há dado. Zero real continua sendo
`R$ 0,00`; ausência é travessão.

A moeda é um dado da **reserva**, não do idioma: uma reserva paga em euro é exibida em euro,
formatada com o locale do usuário. Fixar `currency: 'BRL'` no formatador impede isso.

### 7.2 Datas

| Contexto | Formato | Exemplo |
|---|---|---|
| Data isolada em prosa, documento gerado, diálogo | Mês por extenso | `15 de janeiro de 2025` |
| Coluna de tabela, densidade `default` | Mês abreviado | `15 jan 2025` |
| Coluna de tabela, densidade `compact` | Numérico | `15/01/2025` |
| Ano corrente, em lista | Sem ano | `15 jan` |
| Intervalo no mesmo mês | `a` | `12 a 15 de julho` |
| Intervalo em meses diferentes | `a`, mês nos dois lados | `28 de julho a 3 de agosto` |
| Intervalo em anos diferentes | ano nos dois lados | `28 de dezembro de 2025 a 3 de janeiro de 2026` |
| Intervalo em tabela compacta | Meia-risca sem espaços | `12–15 jul` |
| Hora | 24 h, dois dígitos, `:` | `09:12` |
| Data + hora em prosa | `às` antes da hora | `14 de março, às 09:12` |

Proibidos: `de 12/07 até 15/07`, `12-15/07`, `9h12` misturado com `09:12`, mês só em número
em documento que sai do app (`01/02` é ambíguo fora do Brasil).

**Tempo relativo** só para o passado e só até 7 dias: `agora mesmo`, `há 5 minutos`,
`há 2 horas`, `há 3 dias`. Depois disso, data absoluta. Todo tempo relativo carrega a data
absoluta em `title`, porque "há 3 dias" não serve para conferir nada. Abreviações
(`há 5 min`) são permitidas apenas em linha de metadado com `--lm-type-body-sm-size`.

**Data civil não é instante.** Um check-in é uma data, sem hora e sem fuso. Interpretar
`"2025-07-12"` com `new Date(...)` faz o motor tratá-la como meia-noite UTC; em UTC−3 a tela
mostra 11 de julho. Um dia de diferença aqui é uma noite de diferença — e uma noite errada num
documento entregue ao condomínio. A regra é converter explicitamente:

```js
// Data civil "2025-07-12" → meia-noite local, sem deslocamento de fuso.
export function parseDataCivil(iso) {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}
```

### 7.3 Porcentagem e variação

| Regra | Certo | Errado |
|---|---|---|
| Sem espaço antes do `%` | `72%` | `72 %` |
| Ocupação em inteiro; casa decimal só quando 0,1 ponto muda uma decisão | `Ocupação em julho: 72%` | `Ocupação: 72,384%` |
| Diferença **entre** porcentagens em pontos percentuais | `+8 p.p. em relação a junho` | `+8% em relação a junho` |
| Sinal de menos é `−` (U+2212), não hífen | `−4%` | `-4%` |
| Variação carrega sinal **e** seta, além da cor | `↑ +12%` | apenas verde |

`+8%` e `+8 p.p.` são números diferentes: de 50% para 58% a variação é de 8 pontos
percentuais e de 16%. Trocar um pelo outro é erro de dado, não de estilo.

Cor de variação: `--lm-chart-diverging-positive` e `--lm-chart-diverging-negative`, sempre
acompanhadas de sinal e seta — cor sozinha é inacessível (ver 03).

### 7.4 Números em coluna

Coluna numérica alinha à direita, com numerais tabulares e a mesma quantidade de casas
decimais em todas as células. A unidade vai no cabeçalho, não repetida em cada linha.

```css
.lm-table__cell--num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: var(--lm-table-cell-text);
}
.lm-table__header--num {
  text-align: right;
  color: var(--lm-table-header-label);
}
```

| Certo | Errado |
|---|---|
| Cabeçalho `Receita (R$)`, células `1.234,56` / `890,00` / `—` | Cabeçalho `Receita`, células `R$ 1.234,56` / `R$ 890` / `R$ 0,00` |
| `3 noites` | `3` sozinho numa coluna chamada `Duração` |
| `3 conflitos` | `Conflitos: 3` |

Quantidade sempre vem com o substantivo do domínio: `3 noites`, `2 hóspedes`,
`12 reservas sincronizadas`. Número solto obriga o usuário a procurar a unidade no cabeçalho.

### 7.5 Identificadores técnicos

IDs, nomes de arquivo e códigos usam `--lm-font-mono` com `--lm-type-code-size`, são
selecionáveis e nunca aparecem no meio de uma frase corrida. `autorizacao-ana-ribeiro.pdf` é
um nome de arquivo, não uma palavra — quebra de linha no meio dele atrapalha a leitura e a
cópia.

---

## 8. Internacionalização

O LUMINA é pt-BR hoje e pode continuar sendo. Isso não autoriza travar larguras em rótulos
curtos, concatenar plurais nem espalhar `'pt-BR'` pelo código — são decisões que custam pouco
agora e custam uma reescrita depois. Hoje o literal `'pt-BR'` aparece **14 vezes** em 6
arquivos, e a pluralização é feita com ternário dentro do JSX.

### 8.1 Expansão de texto

| Par de idiomas | Variação típica |
|---|---|
| pt-BR → en | −15% |
| en → pt-BR, es, fr | +15% a +30% |
| en → de, fi, ru | +30% a +40%, com palavras isoladas muito longas |
| pt-BR → ja, zh | −40%, mas com altura de linha maior |

| Elemento | Regra | Justificativa |
|---|---|---|
| Botão | Altura fixa (`--lm-button-height`), largura livre, `--lm-button-padding-inline` intacto | Fonte reduzida ou reticência num botão esconde a ação |
| Rótulo de navegação | Até 2 linhas dentro de `--lm-navigation-item-height`; nunca reticência | Rail estreito é 88px (`--lm-navigation-rail-width`): "Configurações" já não cabe em uma linha |
| Rótulo de campo | Quebra livre acima do campo | |
| Cabeçalho de tabela | Quebra em 2 linhas dentro de `--lm-table-header-height` | |
| Célula com conteúdo do usuário | Truncamento permitido, com o texto completo em `title` | Nome de hóspede e de arquivo são dados, não rótulos |
| Célula com rótulo do sistema | Truncamento proibido | |
| Chip, badge | Sem truncamento; se não cabe, o texto está errado | `--lm-badge-size` é 16px: badge é contador, não frase |
| Snackbar | `--lm-snackbar-min-width` 344px, `--lm-snackbar-max-width` 560px, quebra em até 2 linhas | |
| Tooltip | `--lm-tooltip-max-width` 288px, quebra livre | |
| Menu | `--lm-menu-max-width` 280px, quebra livre | |
| Diálogo | `--lm-dialog-max-width` 560px, altura livre | |

Nenhum contêiner que contém texto de interface tem largura fixa em px. O teste é um
pseudo-locale que multiplica cada string por 1,4 e acentua tudo: o que estourar, estoura.

### 8.2 Pluralização

Concatenar `s` funciona em pt-BR e falha em quase todo o resto — russo tem 3 formas, polonês
4, árabe 6. E o remendo já aparece hoje na raiz da palavra:
`` `Sobreposiç${n !== 1 ? 'ões' : 'ão'}` ``.

A regra tem duas partes: **`Intl.PluralRules` decide a forma** e **a frase inteira vive no
dicionário**, com marcador nomeado. Nunca montar frase por concatenação de fragmentos — a
ordem das palavras muda entre idiomas.

```js
// frontend/src/i18n/locale.js
export const LOCALE = 'pt-BR';
export const CURRENCY = 'BRL';

const regras = new Intl.PluralRules(LOCALE);

export function t(dicionario, chave, vars = {}) {
  const entrada = dicionario[chave];
  const modelo = typeof entrada === 'string'
    ? entrada
    : entrada[regras.select(vars.count)] ?? entrada.other;
  return modelo.replace(/\{(\w+)\}/g, (_, nome) => vars[nome]);
}
```

```js
// frontend/src/i18n/pt-BR.js
export default {
  'conflitos.sobreposicao': {
    one: 'Sobreposição de {count} noite',
    other: 'Sobreposição de {count} noites',
  },
  'conflitos.ativos': {
    one: '{count} conflito ativo',
    other: '{count} conflitos ativos',
  },
  'conflitos.vazio.titulo': 'Nenhum conflito',
};
```

| Certo | Errado |
|---|---|
| `t(dic, 'conflitos.sobreposicao', { count: n })` | `` `Sobreposição de ${n} noite${n !== 1 ? 's' : ''}` `` |
| `'{count} reservas sincronizadas'` | `` n + ' reservas ' + 'sincronizadas' `` |
| Zero tem forma própria quando o idioma exige | assumir que 0 usa a forma plural |

**Gênero:** evitar concordância com o usuário. `Boas-vindas` em vez de `Bem-vindo`;
`Sua sessão expirou` em vez de `Você foi desconectado`.

### 8.3 Datas, moedas e calendário locais

| Regra | Justificativa |
|---|---|
| Um único módulo exporta `LOCALE` e `CURRENCY`; zero literais `'pt-BR'` fora dele | Hoje são 14 pontos de mudança; deveria ser 1 |
| Todo formato passa por `Intl` | `substring` em data ISO ignora fuso, calendário e idioma |
| Data civil convertida explicitamente (ver 7.2) | Um dia de erro é uma noite de erro |
| A moeda vem do dado, não do idioma | Reserva em euro não vira real por tradução |
| Primeiro dia da semana vem do locale | pt-BR começa no domingo; en-GB e a maior parte da Europa, na segunda. O grid do calendário não pode presumir |
| Nome de mês e de dia sempre do `Intl`, nunca de array fixo em português | Array fixo é intraduzível por definição |
| Fuso horário é o do sistema, exibido só onde há hora real (envio de e-mail, sincronização) | Reserva não tem fuso; log tem |

### 8.4 RTL

Árabe e hebraico invertem a direção da leitura. O custo de suportá-los depois é proporcional
à quantidade de propriedades físicas escritas antes.

| Use | Nunca use |
|---|---|
| `padding-inline`, `margin-inline-start/end` | `padding-left`, `margin-left` |
| `inset-inline-start/end` | `left`, `right` |
| `border-inline-start` | `border-left` |
| `text-align: start / end` | `text-align: left / right` |
| `margin-block`, `inset-block` | `margin-top`/`bottom` quando o eixo é lógico |

Os tokens já são neutros quanto à direção — `--lm-button-padding-inline` e
`--lm-chip-padding-inline` são horizontais lógicos, e `--lm-space-*` não carrega direção.
O que precisa de disciplina é o CSS que os consome.

| Espelha em RTL | Não espelha |
|---|---|
| Setas de navegação (voltar, próximo mês) | Ícones de objeto: calendário, sino, lixeira, envelope |
| Ordem de colunas e do rail | Números, datas, horas, valores monetários |
| Direção do eixo de tempo em gráficos e da legenda | Logotipos e marcas |
| Progresso e sliders | Ícones de mídia (play) |

O documento declara `dir="ltr"` explicitamente no elemento raiz. Trocar para `rtl` passa a ser
uma mudança de atributo, não uma auditoria de 13 arquivos CSS.

### 8.5 Fonte e fallback

`--lm-font-sans` é `"Inter", "Inter Variable", system-ui, …`. Inter cobre latino, latino
estendido, grego e cirílico; **não** cobre árabe, hebraico, CJK nem tailandês. `system-ui` na
pilha resolve esses casos pelo sistema operacional — por isso `system-ui` nunca é removido da
pilha, mesmo com a Inter empacotada localmente.

Consequências práticas:

- Métricas do fallback diferem: um contêiner de uma linha precisa aceitar duas. Os tokens de
  entrelinha (`--lm-type-body-md-line` e afins) são relativos e absorvem parte da variação,
  mas não toda.
- Texto nunca é renderizado como imagem, nem desenhado dentro de SVG de ilustração — imagem
  não se traduz, não se busca, não se copia e não é lida por leitor de tela.
- Ícone nunca contém letra. `lucide-react` é neutro quanto a idioma; manter assim.

### 8.6 O que fazer agora

| Ação agora | Custo agora | Custo se adiada |
|---|---|---|
| Extrair as strings de interface para `frontend/src/i18n/pt-BR.js`, com chaves por domínio (`conflitos.vazio.titulo`) | Mecânico, arquivo a arquivo | Reler 19 arquivos `.jsx` procurando texto entre tags e dentro de `style={{}}` |
| Uma constante `LOCALE` única | Uma linha e 14 substituições | 14 pontos de divergência silenciosa |
| `Intl.PluralRules` + marcadores nomeados desde já | Uma função de 8 linhas | Reescrever toda frase que tem número |
| Propriedades lógicas no CSS | Zero — é só qual propriedade se escreve | Auditar 13 arquivos `.css` |
| `lang="pt-BR"` e `dir="ltr"` no elemento raiz | Dois atributos | Hifenização, leitor de tela e corretor errados até lá (ver 03) |
| Nenhuma largura fixa em contêiner de texto | Zero, se feito na refatoração | Layout quebrado no primeiro idioma novo |
| Data civil convertida explicitamente | Uma função | Bug de um dia em documento entregue a terceiros |

---

## 9. Lacunas
> **Registro autoritativo:** [`LACUNAS.md`](LACUNAS.md). A lista abaixo reflete o estado
> do dia em que este documento foi escrito e não é atualizada quando uma lacuna fecha —
> várias destas já foram fechadas por extensão do gerador.


Regras deste documento que precisariam de um token que **não existe** em `tokens.json` nem nos
`*.css` gerados. Enquanto não existirem, valem como regra em prosa. Criar qualquer um deles
passa pelo processo de governança (08) e pelo gerador — nunca por edição manual dos arquivos.

| Regra | Token que faltaria | O que se faz enquanto isso |
|---|---|---|
| Medida de leitura máxima para corpo de texto, estado vazio e corpo de diálogo | Um token de medida (`ch` ou `rem`) para largura de coluna de texto | Limitar em prosa: corpo de texto entre 45 e 75 caracteres por linha, definido no componente |
| Numerais tabulares em coluna numérica (7.4) | Token de `font-variant-numeric` / `font-feature-settings`; hoje só existem `--lm-font-sans` e `--lm-font-mono` | Declarar `font-variant-numeric: tabular-nums` na classe da célula numérica |
| Tempo de permanência do snackbar e do aviso temporário | Token de duração de **exibição**; `--lm-duration-*` vai só até 480 ms e descreve transição, não persistência | Fixar em prosa: 5 s sem ação, 10 s com ação `Desfazer`, indefinido quando o ponteiro está sobre o snackbar |
| Largura mínima de botão, para absorver expansão de texto (8.1) | `--lm-button-min-width`; existem só altura, raio, espaçamento interno e cores | Deixar a largura livre e testar com pseudo-locale de +40% |
| Tamanho tipográfico do texto de ajuda e de erro de campo (4.2) | Tokens de tipo no componente `field`; `--lm-field-help` e `--lm-field-error-text` são apenas cores | Aplicar `--lm-type-body-sm-size` diretamente no componente |
| Número máximo de linhas antes de truncar conteúdo do usuário (8.1) | Token de `line-clamp` | Definir por componente: 1 linha em célula de tabela, 2 em card |
| Direção do documento e espelhamento em RTL (8.4) | Token de direção lógica | Usar `dir` no elemento raiz e propriedades lógicas no CSS |
| Cor de fundo do bloco `Detalhes técnicos` recolhido (4.4) | Nenhum token de superfície de "código"; o mais próximo é `--lm-color-surface-container-low` | Reaproveitar `--lm-color-surface-container-low` com `--lm-font-mono` |
