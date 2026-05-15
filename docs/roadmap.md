# LUMINA — Oportunidades de Melhoria

> Documento gerado em 10/03/2026 após auditoria pré-produção da versão A.0.1.0.
> Nota geral do projeto: **7.9 / 10**

---

## 🔴 Alta Prioridade

### 1. Cobertura de Testes (Nota atual: 5/10)

**Problema:** Apenas 4 dos 11 routers e 1 dos 13 services possuem testes automatizados.

**Routers sem cobertura:**
- `calendar.py`
- `emails.py`
- `notifications.py`
- `settings.py`
- `statistics.py`
- `sync_actions.py`
- `ai.py`

**Services sem cobertura:**
- `ai_service.py`
- `ai_pricing_service.py`
- `calendar_service.py`
- `document_service.py`
- `email_service.py`
- `notification_db_service.py`
- `settings_service.py`
- `statistics_service.py`

**Ação recomendada:**
```bash
# Adicionar ao tests/ pelo menos:
tests/test_settings.py          # GET, PUT, POST /reset
tests/test_notifications.py     # list, summary, mark-read
tests/test_statistics.py        # dashboard, occupancy, revenue
tests/test_emails.py            # test-connection, send (mock SMTP)
tests/test_ai.py                # chat, test, settings GET/PUT
```

**Impacto:** Regressões silenciosas em produção são o maior risco atual. Sem testes, refactors e novas features podem quebrar comportamentos existentes sem aviso.

---

### 2. AI Pricing — Suporte Multi-Provider Real

**Problema:** `AIPricingService` usa exclusivamente o SDK `anthropic`. Mesmo com `effective_ai_key`, se o usuário configurar OpenAI, as sugestões de precificação falharão.

**Estado atual:**
```python
self.client = anthropic.Anthropic(api_key=self.api_key)  # SDK fixo
```

**Solução:** Refatorar `AIPricingService` para usar `AIService` (que já é multi-provider):
```python
# Em vez de chamar anthropic.Anthropic diretamente:
from app.services.ai_service import AIService
service = AIService()  # respeita provider/key/model do DB
reply = service.chat(messages=[{"role": "user", "content": prompt}])
```

**Esforço estimado:** Médio (1–2 horas). `AIService.chat()` já existe e já retorna texto puro.

---

### 3. Estatísticas — Possível Double-Count em Bookings Multi-Mês

**Problema:** Em `statistics.py`, reservas que cruzam dois meses podem ser contadas em ambos os meses ao calcular `bookings_count` por mês.

```python
# Linha ~162: incrementa para o mês do check_in, mas a reserva
# pode cruzar para o mês seguinte e ser contada novamente
for booking in bookings:
    month_key = booking.check_in_date.strftime("%Y-%m")
    monthly_data[month_key]["bookings_count"] += 1
```

**Solução:** Contar cada `booking.id` apenas uma vez por período, não por mês que toca.

---

## 🟡 Média Prioridade

### 4. Detecção de Conflito nos Eventos do Calendário

**Localização:** `app/routers/calendar.py` linha 73

```python
"conflict": False  # TODO: Detectar se tem conflito
```

Os eventos retornados para o FullCalendar sempre têm `conflict: false`. O `ConflictDetector` existe e funciona, mas não é consultado ao montar os eventos. Adicionar o campo `conflict: true` para reservas com conflito ativo tornaria o calendário visual muito mais informativo.

---

### 5. Email Processor — Extração de Subject/Body

**Localização:** `app/services/email_processor.py` linha 57

```python
# TODO: O fetch_emails atual retorna 'raw', precisamos extrair subject e body
```

O serviço de busca de emails via IMAP retorna dados crus. Implementar parsing correto de `subject` e `body` usando `email.message_from_bytes` do stdlib Python tornaria a página de Emails funcional para leitura real de mensagens.

---

### 6. Fechar HTTP Client do CalendarSyncEngine

**Localização:** `app/core/calendar_sync.py`

O `CalendarSyncEngine` usa um singleton global com `httpx.AsyncClient`. O método `close()` existe mas nunca é chamado durante o shutdown do app. Isso deixa conexões socket abertas até o timeout do OS.

**Solução:** Chamar `await calendar_engine.close()` no lifespan shutdown:
```python
# Em app/main.py, no bloco finally do lifespan:
from app.core.calendar_sync import get_calendar_engine
await get_calendar_engine().close()
```

---

### 7. Rate Limit no Modo Desktop

**Localização:** `app/api/v1/auth.py` linha 29

```python
limiter = Limiter(..., enabled=not (settings.LUMINA_DESKTOP or settings.APP_ENV == "test"))
```

O rate limiting de login está desabilitado em modo desktop. Para produção com múltiplos usuários via rede local, considerar habilitar rate limit mesmo em desktop.

---

## 🟢 Baixa Prioridade / Qualidade de Código

### 8. Filtros Opcionais Não Implementados

| Arquivo | Linha | TODO |
|---------|-------|------|
| `app/routers/sync_actions.py` | 65 | Filtro por outros status além de `pending` |
| `app/routers/conflicts.py` | 67 | Busca de todos os conflitos sem filtro |
| `app/services/sync_action_service.py` | 231 | Campo `concierge_email` no model Property |

---

### 9. Silent Fallback de Email Provider

**Localização:** `app/services/email_service.py` linha 106

Se o provider configurado for inválido, o serviço faz fallback silencioso para Gmail sem log de aviso. Usuário pode achar que está usando outro provider quando na verdade usa Gmail.

**Solução simples:** Adicionar `logger.warning(f"Unknown email provider '{provider}', falling back to gmail")`.

---

### 10. IMAP — NoneType em Resposta

**Localização:** `app/services/email_service.py` linha 283

```python
email_ids = data[0].split()  # data[0] pode ser None em algumas respostas IMAP
```

Adicionar validação: `if not data or not data[0]: return []` antes de chamar `.split()`.

---

## 📊 Resumo por Módulo

| Módulo | Nota Atual | Potencial com Melhorias |
|--------|-----------|------------------------|
| Segurança | 9.0 | 9.5 (rate limit desktop) |
| Backend | 8.5 | 9.0 (fechar HTTP client) |
| Electron Desktop | 8.5 | 8.5 (já maduro) |
| Documentos | 8.5 | 8.5 (já maduro) |
| Settings | 8.5 | 8.5 (já maduro) |
| Frontend | 8.0 | 8.5 (UX refinements) |
| iCal Sync | 8.0 | 8.5 (conflict nos eventos) |
| Email | 8.0 | 8.5 (email processor + IMAP fix) |
| Notificações | 8.0 | 8.5 (já funcional) |
| AI Chat | 8.0 | 8.5 (já funcional) |
| Telegram | 7.5 | 8.5 (bugs corrigidos na A.0.1.0) |
| AI Pricing | 7.0 | 8.5 (refatorar para AIService) |
| Estatísticas | 7.0 | 8.5 (corrigir double-count) |
| **Testes** | **5.0** | **8.5 (adicionar cobertura MVP2/3)** |

**Nota projetada após melhorias:** ~9.0 / 10

---

## 🗺️ Roadmap Sugerido

### Alpha A.0.2.0 (próximo)
- [ ] Testes para Settings, AI, Notifications, Email (alta prioridade)
- [ ] Refatorar AIPricingService para usar AIService
- [ ] Corrigir double-count em estatísticas mensais
- [ ] Validar IMAP NoneType

### Alpha A.0.3.0
- [ ] Conflict detection nos eventos do calendário (frontend visual)
- [ ] Email processor — extração de subject/body
- [ ] Fechar HTTP client no shutdown
- [ ] Filtros completos em sync_actions e conflicts

### Beta B.0.1.0
- [ ] Cobertura de testes ≥ 80%
- [ ] Performance profiling (SQLite vs PostgreSQL para multi-property)
- [ ] Internacionalização (i18n) para pt-BR/en
- [ ] Suporte a múltiplos imóveis na UI

---

*Para detalhes de arquitetura, consulte `docs/LUMINA_PROJECT_STATE.md` e `docs/architecture/API_DOCUMENTATION.md`.*
