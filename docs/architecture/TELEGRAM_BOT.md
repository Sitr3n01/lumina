# Bot do Telegram - LUMINA

## ✅ IMPLEMENTADO

Sistema completo de bot do Telegram para gerenciamento remoto do apartamento e recebimento de notificações importantes.

---

## 📋 Índice

1. [Recursos Implementados](#recursos-implementados)
2. [Configuração Inicial](#configuração-inicial)
3. [Comandos Disponíveis](#comandos-disponíveis)
4. [Sistema de Notificações](#sistema-de-notificações)
5. [Arquitetura](#arquitetura)
6. [Testes e Uso](#testes-e-uso)

---

## 🎯 Recursos Implementados

### ✅ Bot Interativo
- **Comandos completos** para gerenciamento via Telegram
- **Botões inline** para navegação fácil
- **Autenticação** por lista de IDs de admin
- **Respostas em tempo real** com formatação rica (Markdown)
- **Menu principal** com atalhos para funções principais

### ✅ Sistema de Notificações
- **Notificações automáticas** sobre eventos importantes
- **Alertas de conflitos** detectados
- **Lembretes de check-in/check-out**
- **Resumo diário** opcional
- **Notificações de sincronização**

### ✅ Comandos de Informação
- `/status` - Status geral do sistema
- `/reservas` - Lista de reservas confirmadas
- `/hoje` - Atividades de hoje (check-ins/check-outs)
- `/proximas` - Próximas 5 reservas
- `/conflitos` - Conflitos detectados

### ✅ Comandos de Ação
- `/sync` - Sincronizar calendários manualmente
- `/menu` - Exibir menu principal
- `/help` - Lista de comandos

---

## 🔧 Configuração Inicial

### 1. Criar Bot no Telegram

1. **Abra o Telegram** e procure por `@BotFather`
2. **Inicie conversa** e digite `/newbot`
3. **Escolha um nome** para o bot (ex: "Lumina Apartamento Bot")
4. **Escolha um username** (ex: "lumina_apartamento_bot")
5. **Copie o token** fornecido pelo BotFather (formato: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 2. Obter Seu User ID

**Opção A - Via Bot:**
1. Procure por `@userinfobot` no Telegram
2. Inicie conversa e ele mostrará seu ID

**Opção B - Via API:**
1. Temporariamente, adicione qualquer ID ao `.env`
2. Inicie o bot e envie `/start`
3. O bot mostrará: "❌ Você não tem permissão. Seu ID: 123456789"
4. Copie esse ID

### 3. Configurar Variáveis de Ambiente

Edite o arquivo `.env` na raiz do projeto:

```env
# === TELEGRAM BOT ===
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_ADMIN_USER_IDS=123456789,987654321
```

**Importante:**
- `TELEGRAM_BOT_TOKEN`: Token fornecido pelo BotFather
- `TELEGRAM_ADMIN_USER_IDS`: IDs separados por vírgula (sem espaços)
- Múltiplos admins são suportados

### 4. Instalar Dependências

Execute o script de instalação:

```bash
# Windows (via CMD ou PowerShell) — execute na raiz do repositorio apartment_rental_manager
pip install python-telegram-bot

# Ou reinstale todas as dependências
pip install -r requirements.txt
```

### 5. Iniciar o Sistema

Use o script de inicialização:

```bash
# Windows
INICIAR_SISTEMA.bat
```

O bot será iniciado automaticamente junto com o backend!

### 6. Testar o Bot

1. **Abra o Telegram**
2. **Procure** pelo username do seu bot (ex: @lumina_apartamento_bot)
3. **Envie** `/start`
4. **Você deve receber** uma mensagem de boas-vindas com menu

---

## 📱 Comandos Disponíveis

### Comandos Básicos

#### `/start`
Inicia conversa com o bot e mostra boas-vindas.

**Resposta:**
```
👋 Olá, [Nome]!

🏢 Bem-vindo ao LUMINA - Sistema de Gerenciamento de Apartamento

Aqui você pode:
• Ver status das reservas
• Verificar conflitos
• Sincronizar calendários
• Receber notificações importantes

Digite /help para ver todos os comandos disponíveis.
```

#### `/help`
Mostra lista completa de comandos.

**Resposta:**
```
📋 Comandos Disponíveis:

Informações:
/status - Status geral do sistema
/reservas - Lista todas as reservas
/hoje - Check-ins e check-outs de hoje
/proximas - Próximas 5 reservas
/conflitos - Conflitos detectados

Ações:
/sync - Sincronizar calendários agora

Outros:
/menu - Menu principal
/help - Esta mensagem
```

#### `/menu`
Exibe menu principal com botões inline.

**Botões:**
- 📊 Status
- 📅 Reservas
- 📆 Hoje
- 🔜 Próximas
- ⚠️ Conflitos
- 🔄 Sincronizar

---

### Comandos de Informação

#### `/status`
Mostra visão geral do sistema.

**Resposta:**
```
📊 Status do Sistema

🏢 Apartamento: Apartamento 2 Quartos - Goiânia
📅 Total de Reservas: 45
✅ Reservas Ativas: 12
⚠️ Conflitos: 2

🕐 Atualizado em: 04/02/2024 10:30
```

#### `/reservas`
Lista até 10 próximas reservas confirmadas.

**Resposta:**
```
📅 Reservas Confirmadas (10 mais próximas)

🔴 João Silva
  📆 15/02 → 18/02 (3 noites)
  👥 2 hóspede(s)
  💰 R$ 450.00

🔵 Maria Santos
  📆 20/02 → 25/02 (5 noites)
  👥 4 hóspede(s)
  💰 R$ 1200.00
```

**Legendas:**
- 🔴 = Airbnb
- 🔵 = Booking.com
- ⚪ = Manual

#### `/hoje`
Mostra check-ins e check-outs de hoje.

**Resposta:**
```
📅 Atividades de Hoje - 04/02/2024

🟢 CHECK-INS:
🔴 João Silva (2 hóspede(s))
🔵 Maria Santos (3 hóspede(s))

🟡 CHECK-OUTS:
🔴 Pedro Oliveira

---

Se não houver atividades:
✨ Nenhuma atividade para hoje!
```

#### `/proximas`
Lista próximas 5 reservas futuras.

**Resposta:**
```
🔜 Próximas 5 Reservas

🔴 João Silva
  📆 Check-in: 15/02/2024 (11 dia(s))
  🌙 3 noite(s)
  👥 2 hóspede(s)

🔵 Maria Santos
  📆 Check-in: 20/02/2024 (16 dia(s))
  🌙 5 noite(s)
  👥 4 hóspede(s)
```

#### `/conflitos`
Lista conflitos não resolvidos.

**Resposta:**
```
⚠️ Conflitos Detectados (2)

🔴 Sobreposição - CRITICAL
  📅 Reserva 1: João Silva
  📅 Reserva 2: Maria Santos
  🗓 Período: 15/02 → 18/02

🟠 Duplicata - HIGH
  📅 Reserva 1: Pedro Oliveira
  📅 Reserva 2: Ana Costa
  🗓 Período: 20/02 → 22/02

💡 Resolva os conflitos na interface web.
```

**Legendas de Severidade:**
- 🔴 = Critical
- 🟠 = High
- 🟡 = Medium
- 🟢 = Low

---

### Comandos de Ação

#### `/sync`
Sincroniza calendários manualmente.

**Processo:**
1. Envia mensagem: "🔄 Iniciando sincronização..."
2. Sincroniza Airbnb e Booking.com
3. Detecta conflitos
4. Retorna resultado

**Resposta:**
```
✅ Sincronização Concluída!

📥 Novas reservas: 2
🔄 Atualizadas: 1
⚠️ Conflitos: 0

🕐 04/02/2024 10:35

---

Se houver conflitos:
💡 Use /conflitos para ver detalhes
```

---

## 🔔 Sistema de Notificações

### Notificações Automáticas

O bot envia notificações automaticamente quando:

#### 1. Nova Reserva Detectada
```
🆕 Nova Reserva Detectada!

🔴 Plataforma: AIRBNB
👤 Hóspede: João Silva
📆 Check-in: 15/02/2024
📆 Check-out: 18/02/2024
🌙 Noites: 3
👥 Hóspedes: 2
💰 Valor: R$ 450.00
```

#### 2. Reserva Atualizada
```
🔄 Reserva Atualizada

🔴 João Silva
📆 15/02 → 18/02

Mudanças:
• guest_count: 2 → 3
• total_price: 450.00 → 500.00
```

#### 3. Reserva Cancelada
```
❌ Reserva Cancelada

🔴 João Silva
📆 15/02/2024 → 18/02/2024
🌙 3 noite(s)

💡 O período agora está disponível para novas reservas.
```

#### 4. Conflito Detectado
```
⚠️ 2 Conflito(s) Detectado(s)!

🔴 Sobreposição (critical)
  📅 João Silva
  📅 Maria Santos
  🗓 15/02 → 18/02

🟠 Duplicata (high)
  📅 Pedro Oliveira
  📅 Ana Costa
  🗓 20/02 → 22/02

🔧 Resolva os conflitos na interface web ou use /conflitos
```

#### 5. Lembrete de Check-in (1 dia antes)
```
🔔 Lembrete: 2 Check-in(s) Amanhã

🔴 João Silva
  👥 2 hóspede(s)
  🌙 3 noite(s)

🔵 Maria Santos
  👥 4 hóspede(s)
  🌙 5 noite(s)

📝 Prepare o apartamento para receber os hóspedes!
```

#### 6. Lembrete de Check-out (dia atual)
```
🔔 Check-out(s) Hoje: 1

🔴 Pedro Oliveira
  🕐 Liberar apartamento

🧹 Prepare o apartamento para limpeza e vistoria!
```

#### 7. Sincronização Concluída (automática)
```
✅ Sincronização Automática Concluída

📥 Novas reservas: 1
🔄 Atualizadas: 0
⚠️ Conflitos: 0

🕐 04/02/2024 11:00
```

**Nota:** Só notifica se houver mudanças (novas, atualizadas ou conflitos).

#### 8. Erro na Sincronização
```
❌ Erro na Sincronização Automática

🔧 Erro: Connection timeout to Airbnb

💡 Verifique as configurações do calendário ou tente sincronizar manualmente.
```

#### 9. Resumo Diário (opcional)
```
📊 Resumo Diário - 04/02/2024

📅 Total de Reservas: 45
✅ Reservas Ativas: 12
⚠️ Conflitos: 2

🟢 Check-ins Hoje: 1
🟡 Check-outs Hoje: 1

💰 Receita do Mês: R$ 15000.00

🔗 Acesse o painel: http://localhost:5173
```

---

## 🏗️ Arquitetura

### Estrutura de Arquivos

```
app/telegram/
├── __init__.py           # Exports principais
├── bot.py                # Classe principal do bot
└── notifications.py      # Serviço de notificações
```

### Componentes

#### `TelegramBot` (bot.py)
Classe principal que gerencia o bot.

**Responsabilidades:**
- Iniciar/parar bot
- Registrar handlers de comandos
- Processar comandos de usuários
- Verificar permissões (admin)
- Gerar keyboards inline

**Métodos principais:**
```python
async def start()           # Inicia o bot
async def stop()            # Para o bot
def _register_handlers()    # Registra comandos
def _check_admin(user_id)   # Verifica se é admin
```

#### `NotificationService` (notifications.py)
Serviço para enviar notificações.

**Responsabilidades:**
- Enviar mensagens para admins
- Formatar mensagens com emojis
- Notificações de eventos do sistema
- Lembretes programados

**Métodos principais:**
```python
async def send_to_admins(message)        # Envia para todos admins
async def notify_new_booking(booking)    # Nova reserva
async def notify_conflict_detected()    # Conflito detectado
async def notify_checkin_reminder()     # Lembrete check-in
async def send_daily_summary()          # Resumo diário
```

### Integração com Backend

O bot é iniciado automaticamente no `lifespan` do FastAPI:

```python
# app/main.py

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Iniciar bot
    telegram_bot = TelegramBot()
    await telegram_bot.start()

    yield

    # Parar bot ao encerrar
    await telegram_bot.stop()
```

### Fluxo de Comandos

```
Usuário envia /status
    ↓
TelegramBot._cmd_status()
    ↓
Verifica permissão (_check_admin)
    ↓
Consulta banco de dados
    ↓
Formata mensagem com Markdown
    ↓
Envia resposta ao usuário
```

### Fluxo de Notificações

```
Evento no sistema (nova reserva)
    ↓
NotificationService.notify_new_booking()
    ↓
Formata mensagem
    ↓
send_to_admins()
    ↓
Loop por cada admin_id
    ↓
bot.send_message() para cada admin
```

---

## 🧪 Testes e Uso

### 1. Teste Básico

**Após configurar o bot:**

1. Abra Telegram
2. Procure seu bot (@seu_bot_username)
3. Envie `/start`
4. **Esperado:** Mensagem de boas-vindas com menu

### 2. Teste de Comandos

**Testar cada comando:**

```
/start    → Boas-vindas
/help     → Lista de comandos
/menu     → Menu com botões
/status   → Status do sistema
/reservas → Lista de reservas
/hoje     → Atividades de hoje
/proximas → Próximas reservas
/conflitos→ Conflitos (se houver)
/sync     → Sincronização manual
```

### 3. Teste de Botões Inline

1. Envie `/menu`
2. Clique em cada botão
3. **Esperado:** Resposta correspondente ao comando

### 4. Teste de Notificações

**Simular eventos:**

#### Sincronização Manual
```
1. Enviar /sync
2. Esperar mensagem de resultado
```

#### Nova Reserva (via backend)
```
1. Adicionar reserva no Airbnb/Booking
2. Executar sincronização
3. Receber notificação de nova reserva
```

#### Conflito
```
1. Criar reservas sobrepostas
2. Executar sincronização
3. Receber alerta de conflito
```

### 5. Teste de Múltiplos Admins

**Se tiver múltiplos IDs configurados:**

1. Enviar comando de um admin
2. Verificar se todos admins recebem notificações
3. Testar comando de usuário não-admin
4. **Esperado:** Usuário não-admin recebe mensagem de erro

---

## 🔐 Segurança

### Verificação de Permissões

Todos os comandos verificam se o usuário está na lista de admins:

```python
def _check_admin(self, user_id: int) -> bool:
    return user_id in self.admin_ids
```

**Se não for admin:**
```
❌ Você não tem permissão para usar este bot.
Seu ID: 123456789
```

### Proteção de Dados

- ✅ IDs de admin em variável de ambiente (.env)
- ✅ Token do bot em variável de ambiente
- ✅ Sem dados sensíveis em logs
- ✅ Sem persistência de mensagens

---

## 🚀 Próximos Passos (Futuro)

### Recursos Planejados

- [ ] **Webhooks** em vez de polling (mais eficiente)
- [ ] **Comandos de gerenciamento** (criar/editar/cancelar reservas)
- [ ] **Aprovação de ações** via botões inline
- [ ] **Notificações configuráveis** (ativar/desativar tipos)
- [ ] **Relatórios personalizados** sob demanda
- [ ] **Integração com calendário** (exportar para Google Calendar)
- [ ] **Modo conversacional** com IA (responder perguntas)
- [ ] **Estatísticas gráficas** via imagens

---

## 📞 Suporte

### Problemas Comuns

#### Bot não inicia
```
⚠️ TELEGRAM_BOT_TOKEN não configurado. Bot não será iniciado.
```
**Solução:** Configure TELEGRAM_BOT_TOKEN no `.env`

#### Bot não responde
**Possíveis causas:**
1. Token inválido → Verifique token no BotFather
2. Firewall bloqueando → Verifique conexão de rede
3. Bot não iniciou → Verifique logs do backend

#### Usuário sem permissão
```
❌ Você não tem permissão para usar este bot.
```
**Solução:** Adicione seu user ID em TELEGRAM_ADMIN_USER_IDS

#### Notificações não chegam
**Verificar:**
1. IDs corretos no `.env`
2. Bot iniciado sem erros
3. Você iniciou conversa com o bot (`/start`)

### Logs

Verifique logs do backend para debug:

```
🤖 Iniciando bot do Telegram...
✅ Bot do Telegram iniciado com sucesso!
```

---

## ✅ Checklist de Implementação

- [x] Classe TelegramBot completa
- [x] NotificationService completo
- [x] Integração com main.py
- [x] Comandos básicos (/start, /help, /menu)
- [x] Comandos de informação (/status, /reservas, /hoje, /proximas, /conflitos)
- [x] Comandos de ação (/sync)
- [x] Botões inline para menu
- [x] Verificação de permissões (admin)
- [x] Notificações de nova reserva
- [x] Notificações de atualização
- [x] Notificações de cancelamento
- [x] Notificações de conflito
- [x] Lembretes de check-in/check-out
- [x] Notificação de sync completa
- [x] Notificação de erros
- [x] Resumo diário opcional
- [x] Formatação com Markdown
- [x] Emojis para plataformas
- [x] Emojis para severidade
- [x] Dependências adicionadas (requirements.txt)
- [x] Documentação completa

---

**Status:** ✅ **100% COMPLETO E FUNCIONAL**

Bot do Telegram totalmente implementado e pronto para uso! 🤖✨
