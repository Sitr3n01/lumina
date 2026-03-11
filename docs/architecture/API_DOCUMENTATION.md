# API Documentation — LUMINA A.0.1.0

> Atualizado em: 10/03/2026
> Versão: **A.0.1.0** (Alpha 0.1.0 — Desktop Electron)
> Base URL: `http://127.0.0.1:<porta>` (porta aleatória em produção, 8000 em dev)

---

## Início Rápido

**Documentação Interativa (em dev):**
- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

**Autenticação:** Bearer Token JWT
```
Authorization: Bearer <token>
```

**Obter token:**
```bash
curl -X POST http://127.0.0.1:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "sua_senha"}'
```

---

## Prefixos de Routers

| Router | Prefixo | Nota |
|--------|---------|------|
| Auth | `/api/v1/auth` | JWT + lockout |
| Health | `/api/v1/health` | Checks detalhados |
| Documents | `/api/v1/documents` | Geração .docx |
| Emails | `/api/v1/emails` | SMTP/IMAP |
| Settings | `/api/v1/settings` | DB override pattern |
| Notifications | `/api/v1/notifications` | Central DB-backed |
| AI | `/api/v1/ai` | Multi-provider |
| Bookings | `/api/bookings` | Legacy (sem v1) |
| Calendar | `/api/calendar` | Legacy (sem v1) |
| Conflicts | `/api/conflicts` | Legacy (sem v1) |
| Statistics | `/api/statistics` | Legacy (sem v1) |
| Sync Actions | `/api/sync-actions` | Legacy (sem v1) |

> Routers MVP1 (bookings, calendar, conflicts, statistics, sync-actions) mantêm prefixo sem `/v1/` para compatibilidade retroativa.

---

## Níveis de Autenticação

| Símbolo | Significado |
|---------|-------------|
| 🔓 | Público (sem autenticação) |
| 🔑 | Requer JWT ativo (`get_current_active_user`) |
| 👑 | Requer JWT de administrador (`get_current_admin_user`) |
| 🖥️ | Apenas modo desktop (LUMINA_DESKTOP=true) |

---

## 1. Rotas do Sistema

### `GET /` 🔓
Rota raiz — informações básicas da API.

**Response:**
```json
{
  "name": "LUMINA",
  "version": "A.0.1.0",
  "status": "online",
  "environment": "development"
}
```

---

### `GET /health` 🔓
### `HEAD /health` 🔓
Health check para monitoramento. Usado pelo Electron para detectar quando o backend está pronto.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-03-10T12:00:00"
}
```

---

### `GET /api/info` 🔑
Informações detalhadas da API e configurações do imóvel. Requer autenticação (protege PII).

**Response:**
```json
{
  "app_name": "LUMINA",
  "property_name": "Apto 101",
  "timezone": "America/Sao_Paulo",
  "sync_interval_minutes": 30,
  "features": {
    "calendar_sync": true,
    "conflict_detection": true,
    "document_generation": true,
    "conflict_notifications": true
  }
}
```

---

### `POST /api/v1/shutdown` 👑🖥️
Shutdown gracioso do servidor (apenas modo desktop). Usado pelo Electron ao encerrar o app.
Aguarda 500ms antes de enviar SIGTERM para garantir envio da resposta.

**Response:**
```json
{"status": "shutting_down"}
```

---

## 2. Autenticação (`/api/v1/auth`)

### `POST /api/v1/auth/register` 🔓
Registra o primeiro usuário (admin). **Bloqueado após o primeiro cadastro** (invite-only).
Rate limit: 3 tentativas/minuto.

**Request:**
```json
{
  "username": "admin",
  "email": "admin@exemplo.com",
  "password": "SenhaForte123!",
  "full_name": "Administrador"
}
```

**Validações de senha:** mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 número.

**Response (201):**
```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@exemplo.com",
  "full_name": "Administrador",
  "is_active": true,
  "is_admin": true
}
```

**Erros:**
- `403` — Sistema já possui usuário cadastrado
- `400` — Email ou username duplicado

---

### `GET /api/v1/auth/setup-status` 🔓
Verifica se o sistema precisa de configuração inicial (sem autenticação).

**Response:**
```json
{"needs_setup": false}
```

---

### `POST /api/v1/auth/login` 🔓
Autentica usuário e retorna JWT.
Rate limit: 5 tentativas/minuto. Conta bloqueada após 5 tentativas falhas por 15 minutos.

**Request:**
```json
{
  "username": "admin",
  "password": "SenhaForte123!"
}
```

> `username` aceita tanto username quanto email.

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@exemplo.com",
    "full_name": "Administrador",
    "is_active": true,
    "is_admin": true
  }
}
```

**Erros:**
- `401` — Credenciais inválidas
- `403` — Conta bloqueada (com tempo restante em minutos)

---

### `GET /api/v1/auth/me` 🔑
Retorna dados do usuário autenticado.

**Response:** mesmo formato de `UserResponse` acima.

---

### `POST /api/v1/auth/logout` 🔑
Invalida o token atual via blacklist server-side. Token não pode ser reutilizado.

**Response:**
```json
{"message": "Logout realizado com sucesso. Token invalidado."}
```

---

### `POST /api/v1/auth/change-password` 🔑
Altera senha do usuário. Revoga automaticamente todos os tokens ativos (usuário precisa fazer login novamente).

**Request:**
```json
{
  "old_password": "SenhaAtual123!",
  "new_password": "NovaSenha456!"
}
```

**Response (200):**
```json
{"message": "Senha alterada com sucesso. Faça login novamente com a nova senha."}
```

---

### `DELETE /api/v1/auth/delete-account` 🔑
Deleta a própria conta (IRREVERSÍVEL). Requer confirmação de senha no body.

**Request:**
```json
{"password": "SenhaCorreta123!"}
```

---

### `POST /api/v1/auth/unlock-user/{user_id}` 👑
Desbloqueia manualmente uma conta bloqueada por tentativas de login.

**Response:**
```json
{
  "message": "Usuário admin desbloqueado com sucesso",
  "user_id": 1,
  "username": "admin"
}
```

---

## 3. Reservas (`/api/bookings`)

Todas as rotas requerem 🔑 JWT.

### `GET /api/bookings/` 🔑
Lista reservas com filtros e paginação.

**Query Parameters:**
| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `property_id` | int | ✅ | ID do imóvel |
| `platform` | string | — | airbnb / booking / manual |
| `status` | string | — | confirmed / cancelled / completed |
| `page` | int | — | Página (padrão: 1) |
| `page_size` | int | — | Itens/página (1-100, padrão: 50) |

**Response:**
```json
{
  "bookings": [
    {
      "id": 1,
      "guest_name": "João Silva",
      "check_in_date": "2026-03-10",
      "check_out_date": "2026-03-15",
      "nights_count": 5,
      "platform": "airbnb",
      "status": "confirmed",
      "total_price": 950.00,
      "currency": "BRL"
    }
  ],
  "total": 15,
  "page": 1,
  "page_size": 50
}
```

---

### `GET /api/bookings/current` 🔑
Retorna a reserva ativa no momento (hóspede atual), ou `null` se nenhuma.

**Query Parameters:** `property_id` (obrigatório)

---

### `GET /api/bookings/upcoming` 🔑
Retorna próximas N reservas futuras.

**Query Parameters:** `property_id` (obrigatório), `limit` (1-20, padrão: 5)

---

### `GET /api/bookings/{booking_id}` 🔑
Detalhes de uma reserva específica.

---

### `POST /api/bookings/` 🔑
Cria reserva manual.

**Request:**
```json
{
  "property_id": 1,
  "guest_name": "João Silva",
  "check_in_date": "2026-04-10",
  "check_out_date": "2026-04-15",
  "guest_count": 2,
  "platform": "manual",
  "guest_email": "joao@email.com",
  "guest_phone": "(62) 99999-9999"
}
```

**Response (201):** `BookingResponse`

---

### `PUT /api/bookings/{booking_id}` 🔑
Atualiza dados de uma reserva. Campos não enviados são ignorados (patch semantics).
Noites são recalculadas automaticamente se datas mudarem.

---

### `DELETE /api/bookings/{booking_id}` 🔑
Cancela uma reserva (status → `cancelled`). Retorna **204 No Content**.

---

### `GET /api/bookings/statistics/summary` 🔑
Estatísticas gerais das reservas.

**Response:**
```json
{
  "total": 45,
  "confirmed": 15,
  "completed": 28,
  "cancelled": 2
}
```

---

## 4. Calendário (`/api/calendar`)

### `GET /api/calendar/events` 🔑
Eventos do calendário num período. Formato compatível com FullCalendar.

**Query Parameters:** `property_id`, `start_date` (YYYY-MM-DD), `end_date` (YYYY-MM-DD)

**Response:**
```json
[
  {
    "id": 1,
    "title": "João Silva (AIRBNB)",
    "start": "2026-03-10",
    "end": "2026-03-15",
    "platform": "airbnb",
    "status": "confirmed",
    "color": "#FF5A5F",
    "conflict": false
  }
]
```

**Cores por plataforma:** Airbnb `#FF5A5F`, Booking `#003580`, Manual `#6B7280`

---

### `POST /api/calendar/sync` 🔑
Força sincronização manual dos calendários iCal (Airbnb + Booking).

**Query Parameters:** `property_id` (obrigatório)

**Response:**
```json
{
  "success": true,
  "total_stats": {
    "added": 2,
    "updated": 1,
    "cancelled": 0,
    "unchanged": 12
  },
  "message": "Sincronização concluída"
}
```

---

### `GET /api/calendar/sync-status` 🔑
Status da última sincronização por fonte de calendário.

**Response:**
```json
{
  "sources": [
    {
      "id": 1,
      "platform": "airbnb",
      "last_sync_at": "2026-03-10T10:00:00",
      "last_sync_status": "success",
      "sync_enabled": true,
      "last_log": {
        "status": "success",
        "bookings_added": 1,
        "bookings_updated": 2,
        "conflicts_detected": 0,
        "duration_ms": 1250
      }
    }
  ],
  "total_sources": 2,
  "all_synced_recently": true
}
```

---

## 5. Conflitos (`/api/conflicts`)

### `GET /api/conflicts/` 🔑
Lista conflitos detectados.

**Query Parameters:** `property_id` (obrigatório), `active_only` (bool, padrão: true)

**Response:**
```json
[
  {
    "id": 1,
    "booking_id_1": 10,
    "booking_id_2": 11,
    "conflict_type": "overlap",
    "overlap_start": "2026-03-18",
    "overlap_end": "2026-03-20",
    "overlap_nights": 2,
    "severity": "high",
    "resolved": false,
    "detected_at": "2026-03-01T10:30:00",
    "booking_1_guest": "Maria Santos",
    "booking_1_platform": "airbnb",
    "booking_1_dates": "2026-03-18 - 2026-03-22",
    "booking_2_guest": "Pedro Alves",
    "booking_2_platform": "booking",
    "booking_2_dates": "2026-03-18 - 2026-03-20"
  }
]
```

---

### `GET /api/conflicts/summary` 🔑
Resumo de conflitos por severidade.

**Response:**
```json
{
  "total": 2,
  "critical": 1,
  "high": 1,
  "medium": 0,
  "low": 0,
  "duplicates": 0,
  "overlaps": 2
}
```

---

### `POST /api/conflicts/{conflict_id}/resolve` 🔑
Marca conflito como resolvido.

**Request:**
```json
{"resolution_notes": "Cancelei reserva do Booking, mantive Airbnb"}
```

---

### `POST /api/conflicts/detect` 🔑
Força detecção manual de conflitos (sem sync).

---

## 6. Estatísticas (`/api/statistics`)

### `GET /api/statistics/dashboard` 🔑
Dados completos para o dashboard: reserva atual, próximas reservas, resumo de conflitos.

**Query Parameters:** `property_id` (obrigatório)

**Response:**
```json
{
  "current_booking": {
    "id": 5,
    "guest_name": "Ana Costa",
    "check_out_date": "2026-03-12",
    "platform": "airbnb",
    "nights_remaining": 3
  },
  "upcoming_bookings": [...],
  "booking_statistics": {
    "total": 45,
    "confirmed": 15,
    "completed": 28,
    "cancelled": 2
  },
  "conflict_summary": {"total": 2, "critical": 1, "high": 1},
  "action_summary": {"pending": 3, "critical": 1},
  "alerts": {
    "critical_conflicts": 1,
    "critical_actions": 1,
    "total_pending": 3
  }
}
```

---

### `GET /api/statistics/occupancy` 🔑
Taxa de ocupação por mês.

**Query Parameters:** `property_id`, `months` (1-12, padrão: 6)

**Response:**
```json
{
  "months": [
    {
      "month": "2026-03",
      "occupied_nights": 23,
      "total_nights": 31,
      "bookings_count": 5,
      "airbnb_nights": 15,
      "booking_nights": 8,
      "occupancy_rate": 74.2
    }
  ],
  "summary": {
    "average_occupancy": 72.5,
    "total_bookings": 28,
    "total_nights": 385
  }
}
```

---

### `GET /api/statistics/revenue` 🔑
Receita por plataforma.

**Response:**
```json
{
  "total_revenue": 7650.00,
  "average_price_per_booking": 510.00,
  "by_platform": {
    "airbnb": 4590.00,
    "booking": 3060.00
  },
  "bookings_with_price": 15,
  "currency": "BRL",
  "period": "últimos 6 meses"
}
```

---

## 7. Ações de Sincronização (`/api/sync-actions`)

Fila de ações manuais pendentes criadas durante detecção de conflitos.

### `GET /api/sync-actions/` 🔑
**Query Parameters:** `property_id` (obrigatório), `status` (pending/completed/dismissed, padrão: pending)

**Response:**
```json
[
  {
    "id": 1,
    "action_type": "block_dates",
    "status": "pending",
    "target_platform": "booking",
    "priority": "high",
    "priority_emoji": "🔴",
    "description": "🔒 Bloquear 18/03 a 20/03/2026 no Booking.com",
    "reason": "🚨 CONFLITO DETECTADO!...",
    "action_url": "https://admin.booking.com/hotel/...",
    "start_date": "2026-03-18",
    "end_date": "2026-03-20",
    "created_at": "2026-03-01T10:35:00",
    "auto_dismiss_after_hours": 72
  }
]
```

### `GET /api/sync-actions/summary` 🔑
Resumo de ações pendentes.

### `POST /api/sync-actions/{action_id}/complete` 🔑
Marca ação como completada.

**Request:** `{"notes": "Bloqueio realizado com sucesso"}`

### `POST /api/sync-actions/{action_id}/dismiss` 🔑
Descarta uma ação.

### `POST /api/sync-actions/auto-dismiss` 🔑
Auto-descarta ações expiradas (`auto_dismiss_after_hours` ultrapassado).

---

## 8. Documentos (`/api/v1/documents`)

Geração de documentos de autorização de condomínio (.docx) com logo do condomínio.

### `POST /api/v1/documents/generate` 🔑
Gera documento com dados fornecidos manualmente.

**Request:**
```json
{
  "booking": {
    "id": 1,
    "check_in": "2026-04-10",
    "check_out": "2026-04-15"
  },
  "property": {
    "name": "Apto 101",
    "address": "Rua Exemplo, 100",
    "condo_name": "Condomínio XYZ",
    "owner_name": "Carlos Proprietário"
  },
  "guest": {
    "name": "Maria Hóspede",
    "cpf": "000.000.000-00",
    "phone": "(62) 99999-9999",
    "email": "maria@email.com"
  },
  "save_to_file": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Documento gerado com sucesso",
  "filename": "condo_auth_booking_1_20260310.docx",
  "file_path": "/data/documents/condo_auth_booking_1_20260310.docx",
  "download_url": "/api/v1/documents/download/condo_auth_booking_1_20260310.docx"
}
```

---

### `POST /api/v1/documents/generate-from-booking` 🔑
Gera documento a partir de uma reserva existente no banco. Busca automaticamente dados do hóspede, imóvel e proprietário.

**Request:**
```json
{
  "booking_id": 1,
  "save_to_file": true
}
```

**Response:** mesmo formato de `DocumentResponse`.

---

### `POST /api/v1/documents/generate-and-download` 🔑
Gera documento e retorna bytes para download imediato (sem salvar em arquivo).

**Request:** mesmo formato de `/generate`.

**Response:** `StreamingResponse` com `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document`

---

### `GET /api/v1/documents/list` 🔑
Lista documentos gerados, paginado.

**Query Parameters:** `limit` (padrão: 20), `page` (padrão: 1)

**Response:**
```json
{
  "total": 5,
  "documents": [
    {
      "filename": "condo_auth_booking_1_20260310.docx",
      "size_bytes": 14500,
      "created_at": "2026-03-10T12:00:00"
    }
  ]
}
```

---

### `GET /api/v1/documents/download/{filename}` 🔑
Download de documento gerado.

**Segurança:**
- Sanitização de `filename` (path traversal bloqueado)
- Extensões permitidas: `.docx`, `.pdf`, `.txt`
- Verificação IDOR: extrai `booking_id` do nome e valida permissão
- Apenas admins podem baixar documentos sem `booking_id` no nome

**Response:** `FileResponse` com o `.docx`

---

### `DELETE /api/v1/documents/{filename}` 👑
Deleta documento gerado. **Apenas admins.**

---

### `POST /api/v1/documents/analyze-template` 🔑
Analisa um PDF de template de autorização e detecta automaticamente os campos (hóspede, CPF, check-in, etc.) via PyMuPDF. O mapeamento detectado é salvo como `template_map.json`.

**Request:** `multipart/form-data` com campo `file` (PDF, máximo 20MB)

**Response:**
```json
{
  "success": true,
  "message": "8 campos detectados no template",
  "fields": {
    "guest_name": "Hóspede",
    "cpf": "CPF",
    "check_in": "Entrada",
    "check_out": "Saída"
  },
  "total_pages": 1,
  "created_at": "2026-03-10T12:00:00"
}
```

---

### `GET /api/v1/documents/template-map` 🔑
Retorna o mapeamento de campos do template personalizado. Usado pelo wizard para verificar se há template configurado.

**Response:**
```json
{
  "has_custom_template": true,
  "template_map": { ... }
}
```

---

## 9. Emails (`/api/v1/emails`)

Sistema SMTP/IMAP. Requer configuração de `EMAIL_FROM`, `EMAIL_PASSWORD`, `EMAIL_PROVIDER` no `.env`.
Todos os templates usam **Jinja2 SandboxedEnvironment** (segurança contra SSTI).

### `POST /api/v1/emails/send` 🔑
Envia email personalizado (texto ou HTML).
Rate limit: 10 emails/minuto.

**Request:**
```json
{
  "to": ["destinatario@email.com"],
  "subject": "Assunto do email",
  "body": "Corpo em texto puro",
  "html": "<p>Corpo em HTML</p>",
  "cc": [],
  "bcc": [],
  "attachments": []
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email enviado com sucesso",
  "message_id": "<abc123@smtp.gmail.com>"
}
```

---

### `POST /api/v1/emails/send-template` 🔑
Envia email via template Jinja2.
Rate limit: 10 emails/minuto.

**Request:**
```json
{
  "to": ["destinatario@email.com"],
  "subject": "Confirmação de Reserva",
  "template_name": "booking_confirmation.html",
  "context": {
    "guest_name": "João",
    "check_in": "10/04/2026"
  }
}
```

---

### `POST /api/v1/emails/send-booking-confirmation` 🔑
Envia email de confirmação de reserva para o hóspede.
Busca dados do hóspede e imóvel automaticamente a partir do `booking_id`.
Rate limit: 20/minuto. Suporta envio em background.

**Request:**
```json
{
  "booking_id": 1
}
```

**Query Parameters:** `send_in_background` (bool, padrão: false)

---

### `POST /api/v1/emails/send-checkin-reminder` 🔑
Envia lembrete de check-in para o hóspede.
Rate limit: 20/minuto. Suporta envio em background.

**Request:**
```json
{
  "booking_id": 1
}
```

---

### `POST /api/v1/emails/send-bulk-reminders` 👑
Envia lembretes em massa para todas as reservas com check-in em N dias.
Rate limit RESTRITO: 5/hora. Processamento concorrente com semáforo (máx 5 simultâneos).

**Query Parameters:** `days_before` (padrão: 1), `batch_size` (1-500, padrão: 100)

**Response:**
```json
{
  "success": true,
  "message": "Enviando lembretes para 3 reservas em background"
}
```

---

### `POST /api/v1/emails/fetch` 🔑
Busca emails via IMAP.

**Request:**
```json
{
  "folder": "INBOX",
  "limit": 20,
  "unread_only": false
}
```

**Response:**
```json
{
  "success": true,
  "total": 5,
  "emails": [
    {
      "subject": "Assunto",
      "from": "remetente@email.com",
      "date": "2026-03-10T10:00:00",
      "body": "...",
      "read": false
    }
  ]
}
```

---

### `GET /api/v1/emails/test-connection` 🔑
Testa conexões SMTP e IMAP sem enviar emails.

**Response:**
```json
{
  "smtp": true,
  "imap": true,
  "message": "Conexão SMTP e IMAP OK"
}
```

---

## 10. Configurações (`/api/v1/settings`)

Usa o **DB Override Pattern**: `.env` como base + `AppSetting` no banco como overrides.

### `GET /api/v1/settings/` 🔑
Retorna todas as configurações (merge `.env` + banco de dados).

**Response (seleção):**
```json
{
  "propertyName": "Apto 101",
  "propertyAddress": "Rua Exemplo, 100",
  "condoName": "Condomínio XYZ",
  "condoEmail": "condo@exemplo.com",
  "maxGuests": 4,
  "syncIntervalMinutes": 30,
  "enableAutoDocumentGeneration": true,
  "enableConflictNotifications": true,
  "aiProvider": "anthropic",
  "aiApiKeySet": true,
  "aiModel": "claude-3-5-sonnet-20241022",
  "condoLogoUrl": "https://exemplo.com/logo.png",
  "emailProvider": "gmail",
  "emailFrom": "email@exemplo.com",
  "emailPasswordSet": true,
  "telegramConfigured": true
}
```

> Campos sensíveis (`emailPassword`, `aiApiKey`) **nunca são retornados** — apenas booleans indicando se estão configurados.

---

### `PUT /api/v1/settings/` 🔑
Salva configurações editáveis no banco de dados. Apenas campos em `EDITABLE_FIELDS` são aceitos.

**EDITABLE_FIELDS:** `condoEmail`, `maxGuests`, `syncIntervalMinutes`, `enableAutoDocumentGeneration`, `enableConflictNotifications`, `propertyName`, `propertyAddress`, `condoName`, `condoAdminName`, `ownerName`, `ownerEmail`, `ownerPhone`, `ownerApto`, `ownerBloco`, `ownerGaragem`, `aiProvider`, `aiApiKey`, `aiModel`, `aiBaseUrl`, `condoLogoUrl`

**Request:**
```json
{
  "maxGuests": 4,
  "syncIntervalMinutes": 60,
  "condoLogoUrl": "https://exemplo.com/logo.png"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Configurações salvas com sucesso",
  "saved": {"maxGuests": "4", "syncIntervalMinutes": "60"}
}
```

---

### `POST /api/v1/settings/reset` 🔑
**Hard reset:** remove todas as configurações do banco de dados, revertendo para os valores originais do `.env` (wizard). Usado junto com o Factory Reset do Electron.

**Response:**
```json
{
  "success": true,
  "message": "Hard reset concluído. 12 configurações revertidas para os valores originais.",
  "cleared": 12
}
```

---

## 11. Notificações (`/api/v1/notifications`)

Central de notificações persistida no banco (DB-backed). Alimentada por eventos do sistema (novas reservas, conflitos, etc.).

### `GET /api/v1/notifications/summary` 🔓*
Resumo para os bento cards do dashboard.

> *Em modo desktop (`LUMINA_DESKTOP=true`), aceita requests de `127.0.0.1`/`::1` **sem autenticação** — usado pelo Electron tray poller. Fora do modo desktop, exige Bearer token.

**Response:**
```json
{
  "total": 15,
  "unread": 3,
  "by_type": {
    "new_booking": 8,
    "conflict": 2,
    "sync": 5
  }
}
```

---

### `GET /api/v1/notifications/` 🔑
Lista notificações com filtros e paginação.

**Query Parameters:**
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `limit` | int | 1-100, padrão: 20 |
| `page` | int | Padrão: 1 |
| `type` | string | Filtrar por tipo (ex: `new_booking,conflict`) |
| `unread_only` | bool | Apenas não lidas (padrão: false) |

**Response:**
```json
{
  "items": [
    {
      "id": 1,
      "type": "new_booking",
      "title": "Nova Reserva",
      "message": "João Silva — 10/04 a 15/04",
      "read": false,
      "created_at": "2026-03-10T12:00:00"
    }
  ],
  "total": 15,
  "unread_count": 3,
  "page": 1,
  "limit": 20
}
```

---

### `PUT /api/v1/notifications/read-all` 🔑
Marca todas as notificações como lidas.

**Response:**
```json
{
  "success": true,
  "message": "3 notificação(ões) marcada(s) como lida(s)",
  "count": 3
}
```

---

### `PUT /api/v1/notifications/{notification_id}/read` 🔑
Marca uma notificação específica como lida.

**Response:** `NotificationResponse` (objeto da notificação atualizada)

---

## 12. Inteligência Artificial (`/api/v1/ai`)

Multi-provider: Anthropic Claude, OpenAI, ou qualquer API compatível com OpenAI.

### `POST /api/v1/ai/price-suggestions` 👑
Analisa histórico do imóvel e retorna sugestões de precificação via AI.
Requer nível administrador.

**Query Parameters:** `property_id` (obrigatório)

**Response:**
```json
{
  "success": true,
  "suggestions": [
    {
      "period": "Alta temporada (jan-fev)",
      "suggested_price": 350.00,
      "reason": "Alta demanda histórica, ocupação média de 92%"
    }
  ],
  "context_summary": "Imóvel com 45 reservas nos últimos 12 meses...",
  "provider_used": "anthropic"
}
```

---

### `POST /api/v1/ai/chat` 🔑
Envia mensagens para o agente de IA com contexto completo do imóvel.

**Request:**
```json
{
  "property_id": 1,
  "messages": [
    {"role": "user", "content": "Qual é a taxa de ocupação atual?"}
  ]
}
```

**Response:**
```json
{
  "success": true,
  "reply": "Com base nos dados disponíveis, a taxa de ocupação atual é de 72.5%..."
}
```

**Em caso de erro de configuração (API key ausente):**
```json
{
  "success": false,
  "message": "API Key não configurada. Configure em Configurações → Inteligência Artificial."
}
```

---

### `POST /api/v1/ai/test` 🔑
Testa conectividade com um provider de IA usando credenciais fornecidas. **Não persiste configurações.**

**Request:**
```json
{
  "provider": "anthropic",
  "api_key": "sk-ant-...",
  "model": "claude-3-5-sonnet-20241022",
  "base_url": null
}
```

**Response:**
```json
{
  "success": true,
  "message": "Conexão com Anthropic OK — claude-3-5-sonnet-20241022",
  "provider": "anthropic",
  "model": "claude-3-5-sonnet-20241022"
}
```

---

### `GET /api/v1/ai/settings` 🔑
Retorna configurações de IA atuais. **API Key nunca é retornada** — apenas `api_key_set` (bool).

**Response:**
```json
{
  "provider": "anthropic",
  "api_key_set": true,
  "model": "claude-3-5-sonnet-20241022",
  "base_url": ""
}
```

---

### `PUT /api/v1/ai/settings` 🔑
Persiste configurações de IA no banco via SettingsService.

**Campos aceitos:** `aiProvider`, `aiApiKey`, `aiModel`, `aiBaseUrl`

**Request:**
```json
{
  "aiProvider": "openai",
  "aiApiKey": "sk-...",
  "aiModel": "gpt-4o"
}
```

---

## Códigos de Status HTTP

| Código | Significado |
|--------|-------------|
| `200` | OK |
| `201` | Created |
| `204` | No Content |
| `400` | Bad Request (validação, dados inválidos) |
| `401` | Unauthorized (token ausente ou inválido) |
| `403` | Forbidden (sem permissão ou conta bloqueada) |
| `404` | Not Found |
| `429` | Too Many Requests (rate limit) |
| `500` | Internal Server Error |
| `503` | Service Unavailable (email não configurado) |

**Formato de erro:**
```json
{
  "error": "Not Found",
  "message": "Reserva não encontrada"
}
```

---

## Notas Gerais

- Todas as datas são ISO 8601 (`YYYY-MM-DD`)
- Timestamps incluem timezone UTC
- Valores monetários: Decimal (2 casas decimais), BRL
- Paginação padrão: 50 itens por página (bookings), 20 (notificações/documentos)
- Logs detalhados em `data/logs/` — erros internos **nunca são expostos** ao cliente
- Em modo desktop (`LUMINA_DESKTOP=true`): rate limiting desabilitado, CORS aberto para localhost
- Sincronização automática: a cada `CALENDAR_SYNC_INTERVAL_MINUTES` minutos (padrão: 30)
