import { useState } from 'react';
import {
  Send,
  Inbox,
  Zap,
  RefreshCw,
  MailCheck,
  MailX,
  Plug,
  CalendarCheck,
  BellRing,
  Users,
} from 'lucide-react';
import {
  Button,
  Card,
  Checkbox,
  Chip,
  EmptyState,
  Select,
  Tabs,
  TextField,
  Textarea,
  useSnackbar,
} from '../components/ui';
import PageHeader from '../components/layout/PageHeader';
import { emailsAPI } from '../services/api';
import { formatDateTime } from '../utils/formatters';
import './Emails.css';

/** Cartão de automação: uma tarefa, um campo, um botão. Cada bloco é
 *  autossuficiente para que não haja dúvida sobre qual botão usa qual campo. */
function Automacao({ icone: Icone, titulo, descricao, children, acao }) {
  return (
    <Card variant="outlined" className="eml-auto" as="section">
      <header className="eml-auto__topo">
        <span className="eml-auto__icone" aria-hidden="true">
          <Icone />
        </span>
        <div>
          <h3 className="eml-auto__titulo">{titulo}</h3>
          <p className="eml-auto__descricao">{descricao}</p>
        </div>
      </header>
      {children}
      <div className="eml-auto__acao">{acao}</div>
    </Card>
  );
}

const Emails = () => {
  const { show } = useSnackbar();
  const [aba, setAba] = useState('send');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [conexao, setConexao] = useState(null);
  const [emails, setEmails] = useState([]);

  const [envio, setEnvio] = useState({ to: '', subject: '', body: '', html: false });
  const [confirmacao, setConfirmacao] = useState('');
  const [lembrete, setLembrete] = useState('');
  const [lote, setLote] = useState(1);
  const [busca, setBusca] = useState({ folder: 'INBOX', limit: 10, unread_only: false });

  const comErro = (error, padrao) =>
    show(error.response?.data?.detail || padrao, { variant: 'error' });

  const enviar = async () => {
    if (!envio.to || !envio.subject || !envio.body) {
      show('Preencha destinatário, assunto e corpo.', { variant: 'error' });
      return;
    }
    setSending(true);
    try {
      await emailsAPI.send(envio);
      show('E-mail enviado.');
      setEnvio({ to: '', subject: '', body: '', html: false });
    } catch (error) {
      comErro(error, 'Falha ao enviar o e-mail.');
    } finally {
      setSending(false);
    }
  };

  const buscar = async () => {
    setLoading(true);
    try {
      const { data } = await emailsAPI.fetch(busca);
      setEmails(data?.emails || data || []);
    } catch (error) {
      comErro(error, 'Falha ao buscar os e-mails.');
    } finally {
      setLoading(false);
    }
  };

  const disparar = async (fn, mensagem, erro) => {
    setSending(true);
    try {
      const r = await fn();
      show(typeof mensagem === 'function' ? mensagem(r) : mensagem);
    } catch (error) {
      comErro(error, erro);
    } finally {
      setSending(false);
    }
  };

  const testarConexao = async () => {
    setLoading(true);
    try {
      const { data } = await emailsAPI.testConnection();
      setConexao(data);
    } catch (error) {
      comErro(error, 'Falha ao testar a conexão.');
      setConexao(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="eml">
      <PageHeader description="Envio manual, caixa de entrada, automações e diagnóstico da conexão." />

      <Tabs
        ariaLabel="Seções de e-mail"
        value={aba}
        onChange={setAba}
        tabs={[
          { key: 'send', label: 'Enviar', icon: <Send /> },
          { key: 'inbox', label: 'Caixa de entrada', icon: <Inbox /> },
          { key: 'automation', label: 'Automações', icon: <Zap /> },
          { key: 'connection', label: 'Conexão', icon: <Plug /> },
        ]}
      >
        {aba === 'send' ? (
          <div className="eml-form">
            <TextField
              label="Para"
              type="email"
              required
              value={envio.to}
              onChange={(e) => setEnvio((p) => ({ ...p, to: e.target.value }))}
              placeholder="hospede@exemplo.com"
            />
            <TextField
              label="Assunto"
              required
              value={envio.subject}
              onChange={(e) => setEnvio((p) => ({ ...p, subject: e.target.value }))}
            />
            <Textarea
              label="Mensagem"
              required
              rows={8}
              value={envio.body}
              onChange={(e) => setEnvio((p) => ({ ...p, body: e.target.value }))}
            />
            <Checkbox
              checked={envio.html}
              onChange={(e) => setEnvio((p) => ({ ...p, html: e.target.checked }))}
              description="Marque se o corpo já contém marcação HTML."
            >
              Enviar como HTML
            </Checkbox>
            <div className="eml-form__acao">
              <Button icon={<Send />} loading={sending} onClick={enviar}>
                Enviar
              </Button>
            </div>
          </div>
        ) : null}

        {aba === 'inbox' ? (
          <div className="eml-inbox">
            <div className="eml-inbox__filtros">
              <Select
                label="Pasta"
                density="compact"
                value={busca.folder}
                onChange={(e) => setBusca((p) => ({ ...p, folder: e.target.value }))}
              >
                <option value="INBOX">Caixa de entrada</option>
                <option value="Sent">Enviados</option>
              </Select>
              <TextField
                label="Quantidade"
                type="number"
                density="compact"
                value={busca.limit}
                onChange={(e) => setBusca((p) => ({ ...p, limit: Number(e.target.value) }))}
              />
              <Checkbox
                checked={busca.unread_only}
                onChange={(e) => setBusca((p) => ({ ...p, unread_only: e.target.checked }))}
              >
                Só não lidos
              </Checkbox>
              <Button variant="outlined" icon={<RefreshCw />} loading={loading} onClick={buscar}>
                Buscar
              </Button>
            </div>

            {emails.length === 0 ? (
              <EmptyState
                icon={<Inbox />}
                title="Nada carregado ainda"
                description="Busque na caixa de entrada para ver as mensagens recebidas."
                action={
                  <Button icon={<RefreshCw />} loading={loading} onClick={buscar}>
                    Buscar agora
                  </Button>
                }
              />
            ) : (
              <ul className="eml-lista" role="list">
                {emails.map((e, i) => (
                  <li key={e.id ?? i}>
                    <Card variant="outlined" className="eml-item" data-nao-lido={e.unread || undefined}>
                      <div className="eml-item__topo">
                        <span className="eml-item__remetente">{e.sender || e.from}</span>
                        <span className="eml-item__data">{formatDateTime(e.date)}</span>
                      </div>
                      <p className="eml-item__assunto">{e.subject}</p>
                      {e.body_preview ? <p className="eml-item__previa">{e.body_preview}</p> : null}
                      {/* Não lido por selo textual, não só pelo peso da fonte. */}
                      {e.unread ? <span className="eml-item__novo">Não lido</span> : null}
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {aba === 'automation' ? (
          <div className="eml-automacoes">
            <Automacao
              icone={CalendarCheck}
              titulo="Confirmação de reserva"
              descricao="Envia ao hóspede a confirmação com as datas e as instruções de chegada."
              acao={
                <Button
                  loading={sending}
                  onClick={() =>
                    disparar(
                      () =>
                        emailsAPI.sendBookingConfirmation({
                          booking_id: parseInt(confirmacao, 10),
                        }),
                      'Confirmação enviada.',
                      'Falha ao enviar a confirmação.',
                    )
                  }
                >
                  Enviar confirmação
                </Button>
              }
            >
              <TextField
                label="Identificador da reserva"
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                placeholder="Ex.: 12"
              />
            </Automacao>

            <Automacao
              icone={BellRing}
              titulo="Lembrete de check-in"
              descricao="Lembra o hóspede da chegada e reenvia as instruções do condomínio."
              acao={
                <Button
                  loading={sending}
                  onClick={() =>
                    disparar(
                      () => emailsAPI.sendCheckinReminder({ booking_id: parseInt(lembrete, 10) }),
                      'Lembrete enviado.',
                      'Falha ao enviar o lembrete.',
                    )
                  }
                >
                  Enviar lembrete
                </Button>
              }
            >
              <TextField
                label="Identificador da reserva"
                value={lembrete}
                onChange={(e) => setLembrete(e.target.value)}
                placeholder="Ex.: 12"
              />
            </Automacao>

            <Automacao
              icone={Users}
              titulo="Lembretes em lote"
              descricao="Dispara o lembrete para todas as reservas que chegam no prazo escolhido."
              acao={
                <Button
                  loading={sending}
                  onClick={() =>
                    disparar(
                      () => emailsAPI.sendBulkReminders({ days_before: lote }),
                      (r) => `${r?.data?.sent ?? 0} lembretes enviados.`,
                      'Falha ao enviar os lembretes.',
                    )
                  }
                >
                  Disparar lote
                </Button>
              }
            >
              <TextField
                label="Dias antes da chegada"
                type="number"
                value={lote}
                onChange={(e) => setLote(Number(e.target.value))}
                help="1 envia para quem chega amanhã."
              />
            </Automacao>
          </div>
        ) : null}

        {aba === 'connection' ? (
          <div className="eml-conexao">
            <p className="eml-conexao__nota">
              Verifica se o LUMINA consegue enviar (SMTP) e ler (IMAP) com as credenciais
              cadastradas no assistente de instalação.
            </p>

            <Button variant="outlined" icon={<Plug />} loading={loading} onClick={testarConexao}>
              Testar conexão
            </Button>

            {conexao ? (
              <ul className="eml-conexao__lista" role="list">
                {[
                  { chave: 'smtp', rotulo: 'Envio (SMTP)', ok: conexao.smtp ?? conexao.success },
                  { chave: 'imap', rotulo: 'Leitura (IMAP)', ok: conexao.imap ?? conexao.success },
                ].map((c) => (
                  <li key={c.chave}>
                    <Card variant="outlined" className="eml-status" data-ok={c.ok || undefined}>
                      <span className="eml-status__icone" aria-hidden="true">
                        {c.ok ? <MailCheck /> : <MailX />}
                      </span>
                      <div>
                        <p className="eml-status__rotulo">{c.rotulo}</p>
                        {/* O texto diz o estado; a cor apenas reforça. */}
                        <p className="eml-status__valor">{c.ok ? 'Funcionando' : 'Com falha'}</p>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            ) : null}

            {conexao?.message ? (
              <Chip variant="assist" label={conexao.message} className="eml-conexao__mensagem" />
            ) : null}
          </div>
        ) : null}
      </Tabs>
    </div>
  );
};

export default Emails;
