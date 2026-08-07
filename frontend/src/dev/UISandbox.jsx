import { useState } from 'react';
import {
  Plus,
  Trash2,
  Search,
  Download,
  Settings as SettingsIcon,
  Home,
  ChevronRight,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Chip,
  ConfirmDialog,
  DataTable,
  Dialog,
  EmptyState,
  IconButton,
  Menu,
  Progress,
  Radio,
  RadioGroup,
  Select,
  Skeleton,
  SnackbarProvider,
  Switch,
  Tabs,
  TextField,
  Textarea,
  Tooltip,
  useSnackbar,
} from '../components/ui';
import { useAppearance, THEMES, DENSITIES } from '../contexts/AppearanceContext';
import './UISandbox.css';

/**
 * Bancada dos primitivos — ferramenta de desenvolvimento, não parte do produto.
 * Alcançada em http://localhost:5173/#ui. Removida na fase de limpeza.
 *
 * Existe para uma coisa: ver toda variante, todo estado, nos dois temas e nas três
 * densidades, ao mesmo tempo. Um componente que só foi testado no tema em que foi
 * escrito não foi testado.
 */

function Secao({ titulo, nota, children }) {
  return (
    <section className="sb-secao">
      <h2 className="sb-secao__titulo">{titulo}</h2>
      {nota ? <p className="sb-secao__nota">{nota}</p> : null}
      <div className="sb-grade">{children}</div>
    </section>
  );
}

function Amostra({ rotulo, children }) {
  return (
    <div className="sb-amostra">
      <span className="sb-amostra__rotulo">{rotulo}</span>
      <div className="sb-amostra__palco">{children}</div>
    </div>
  );
}

function BotaoDeSnackbar() {
  const { show } = useSnackbar();
  return (
    <>
      <Button variant="tonal" onClick={() => show('Reserva sincronizada.')}>
        Simples
      </Button>
      <Button
        variant="tonal"
        onClick={() =>
          show('Documento excluído.', { actionLabel: 'Desfazer', action: () => {} })
        }
      >
        Com ação
      </Button>
      <Button
        variant="tonal"
        onClick={() => show('Falha ao conectar ao servidor.', { variant: 'error' })}
      >
        Erro
      </Button>
    </>
  );
}

const COLUNAS = [
  { key: 'hospede', header: 'Hóspede', sortable: true },
  { key: 'plataforma', header: 'Plataforma' },
  { key: 'entrada', header: 'Entrada', sortable: true },
  { key: 'noites', header: 'Noites', align: 'end', sortable: true },
];

// Sem ordenação: uma tabela vazia ou carregando não tem o que ordenar, e o
// componente recusa cabeçalho clicável sem `onSortChange`.
const COLUNAS_FIXAS = COLUNAS.map(({ sortable: _sortable, ...c }) => c);

const LINHAS = [
  { id: 1, hospede: 'Ana Ribeiro', plataforma: 'Airbnb', entrada: '12/08', noites: 4 },
  { id: 2, hospede: 'Bruno Sales', plataforma: 'Booking', entrada: '17/08', noites: 2 },
  { id: 3, hospede: 'Clara Moura', plataforma: 'Manual', entrada: '21/08', noites: 7 },
];

function Conteudo() {
  const { theme, setTheme, density, setDensity, resolvedTheme } = useAppearance();
  const [dialogAberto, setDialogAberto] = useState(false);
  const [confirmAberto, setConfirmAberto] = useState(false);
  const [aba, setAba] = useState('visao');
  const [ordem, setOrdem] = useState({ key: 'hospede', direction: 'ascending' });

  return (
    <div className="sb">
      <header className="sb-topo">
        <div>
          <h1 className="sb-topo__titulo">Bancada dos primitivos</h1>
          <p className="sb-topo__nota">
            Tema pintado agora: <strong>{resolvedTheme}</strong>
          </p>
        </div>
        <div className="sb-topo__controles">
          <Select
            label="Tema"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            density="compact"
          >
            {THEMES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          <Select
            label="Densidade"
            value={density}
            onChange={(e) => setDensity(e.target.value)}
            density="compact"
          >
            {DENSITIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
        </div>
      </header>

      <Secao titulo="Button" nota="Seis variantes × repouso, hover, foco, pressionado, desabilitado, carregando.">
        {['filled', 'tonal', 'elevated', 'outlined', 'text', 'destructive'].map((v) => (
          <Amostra key={v} rotulo={v}>
            <Button variant={v}>Salvar</Button>
            <Button variant={v} icon={<Plus />}>
              Nova
            </Button>
            <Button variant={v} disabled>
              Desabilitado
            </Button>
            <Button variant={v} loading>
              Carregando
            </Button>
          </Amostra>
        ))}
        <Amostra rotulo="densidade local">
          <Button density="comfortable">comfortable</Button>
          <Button density="standard">standard</Button>
          <Button density="compact">compact</Button>
        </Amostra>
        <Amostra rotulo="largura total">
          <Button fullWidth trailingIcon={<ChevronRight />}>
            Continuar
          </Button>
        </Amostra>
      </Secao>

      <Secao titulo="IconButton, Chip, Badge">
        <Amostra rotulo="IconButton">
          {['standard', 'filled', 'tonal', 'outlined'].map((v) => (
            <IconButton key={v} variant={v} aria-label={`Buscar (${v})`}>
              <Search />
            </IconButton>
          ))}
          <IconButton aria-label="Excluir" disabled>
            <Trash2 />
          </IconButton>
        </Amostra>
        <Amostra rotulo="Chip">
          <Chip variant="assist" icon={<Download />} label="Exportar" />
          <Chip variant="filter" label="Airbnb" selected />
          <Chip variant="filter" label="Booking" />
          <Chip variant="input" label="ana@exemplo.com" onRemove={() => {}} />
          <Chip variant="suggestion" label="Últimos 30 dias" />
        </Amostra>
        <Amostra rotulo="Badge">
          <Badge count={3} label="3 notificações não lidas" />
          <Badge count={140} label="140 notificações não lidas" />
          <Badge variant="dot" label="Há novidades" />
        </Amostra>
      </Secao>

      <Secao titulo="Campos">
        <Amostra rotulo="TextField">
          <TextField label="Nome do hóspede" placeholder="Como no documento" />
          <TextField label="E-mail" type="email" help="Usado para enviar a autorização." />
          <TextField label="Telefone" error="Informe um número com DDD." defaultValue="9999" />
          <TextField label="Bloqueado" disabled defaultValue="Não editável" />
        </Amostra>
        <Amostra rotulo="Textarea / Select">
          <Textarea label="Observações" help="Aparece na autorização impressa." />
          <Select label="Plataforma" placeholder="Selecione">
            <option value="airbnb">Airbnb</option>
            <option value="booking">Booking</option>
            <option value="manual">Manual</option>
          </Select>
        </Amostra>
      </Secao>

      <Secao titulo="Seleção">
        <Amostra rotulo="Checkbox">
          <Checkbox defaultChecked>Enviar cópia por e-mail</Checkbox>
          <Checkbox indeterminate>Selecionar todos</Checkbox>
          <Checkbox description="Sincroniza a cada 30 minutos.">Sincronização automática</Checkbox>
          <Checkbox disabled>Indisponível</Checkbox>
        </Amostra>
        <Amostra rotulo="Radio">
          <RadioGroup legend="Origem da reserva" description="Define o modelo do documento.">
            <Radio name="sb-origem" value="a" defaultChecked>
              Airbnb
            </Radio>
            <Radio name="sb-origem" value="b">
              Booking
            </Radio>
            <Radio name="sb-origem" value="c" description="Preenchimento manual.">
              Direto
            </Radio>
          </RadioGroup>
        </Amostra>
        <Amostra rotulo="Switch">
          <Switch defaultChecked>Iniciar com o Windows</Switch>
          <Switch description="Notifica no Telegram a cada conflito.">Alertas de conflito</Switch>
          <Switch disabled>Indisponível</Switch>
        </Amostra>
      </Secao>

      <Secao titulo="Superfícies e estados">
        <Amostra rotulo="Card">
          {['filled', 'elevated', 'outlined'].map((v) => (
            <Card key={v} variant={v}>
              <strong>{v}</strong>
              <p>Próximo check-in em 3 dias.</p>
            </Card>
          ))}
          <Card variant="outlined" onClick={() => {}} actionLabel="Abrir reserva de Ana Ribeiro">
            <strong>Clicável</strong>
            <p>O card inteiro é um botão de verdade.</p>
          </Card>
        </Amostra>
        <Amostra rotulo="Skeleton">
          <Skeleton variant="text" lines={3} />
          <Skeleton variant="circle" />
          <Skeleton variant="rect" />
        </Amostra>
        <Amostra rotulo="Progress">
          <Progress variant="linear" value={62} aria-label="Sincronização do calendário" />
          <Progress variant="linear" aria-label="Sincronizando calendário" />
          <Progress variant="circular" value={62} aria-label="Envio do relatório" />
          <Progress variant="circular" aria-label="Enviando relatório" />
        </Amostra>
        <Amostra rotulo="EmptyState">
          <EmptyState
            icon={<Home />}
            title="Nenhuma reserva ainda"
            description="Sincronize seus calendários para ver os check-ins aqui."
            action={<Button icon={<Plus />}>Sincronizar agora</Button>}
          />
        </Amostra>
      </Secao>

      <Secao titulo="Sobreposição">
        <Amostra rotulo="Dialog / Confirm / Menu / Tooltip">
          <Button onClick={() => setDialogAberto(true)}>Abrir diálogo</Button>
          <Button variant="destructive" onClick={() => setConfirmAberto(true)}>
            Excluir documento
          </Button>
          <Menu
            ariaLabel="Ações do aplicativo"
            trigger={
              <IconButton aria-label="Mais ações">
                <SettingsIcon />
              </IconButton>
            }
            items={[
              { label: 'Verificar atualizações', icon: <Download />, onSelect: () => {} },
              { label: 'Configurações', icon: <SettingsIcon />, onSelect: () => {} },
              { separator: true },
              { label: 'Sair do LUMINA', destructive: true, onSelect: () => {} },
            ]}
          />
          <Tooltip content="Sincroniza Airbnb e Booking agora">
            <IconButton aria-label="Sincronizar">
              <Download />
            </IconButton>
          </Tooltip>
        </Amostra>
        <Amostra rotulo="Snackbar">
          <BotaoDeSnackbar />
        </Amostra>
      </Secao>

      <Secao titulo="Abas e tabela">
        <Amostra rotulo="Tabs">
          <Tabs
            ariaLabel="Bancada"
            value={aba}
            onChange={setAba}
            tabs={[
              { key: 'visao', label: 'Visão geral', icon: <Home /> },
              { key: 'reservas', label: 'Reservas', badge: 3 },
              { key: 'ajustes', label: 'Ajustes', icon: <SettingsIcon /> },
              { key: 'off', label: 'Indisponível', disabled: true },
            ]}
          >
            <p>Painel: {aba}</p>
          </Tabs>
        </Amostra>
        <Amostra rotulo="DataTable">
          <DataTable
            caption="Próximos check-ins"
            columns={COLUNAS}
            rows={LINHAS}
            rowKey={(r) => r.id}
            sort={ordem}
            onSortChange={setOrdem}
          />
        </Amostra>
        <Amostra rotulo="DataTable — carregando e vazia">
          <DataTable
            caption="Carregando"
            columns={COLUNAS_FIXAS}
            rows={[]}
            rowKey={(r) => r.id}
            loading
          />
          <DataTable
            caption="Sem resultados"
            columns={COLUNAS_FIXAS}
            rows={[]}
            rowKey={(r) => r.id}
            empty={{
              title: 'Nada por aqui',
              description: 'Nenhuma reserva bate com os filtros atuais.',
              action: <Button variant="text">Limpar filtros</Button>,
            }}
          />
        </Amostra>
      </Secao>

      <Dialog
        open={dialogAberto}
        title="Enviar relatório mensal"
        description="O relatório vai para o e-mail cadastrado nas configurações."
        onClose={() => setDialogAberto(false)}
        actions={
          <>
            <Button variant="text" onClick={() => setDialogAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setDialogAberto(false)}>Enviar</Button>
          </>
        }
      >
        <TextField label="Assunto" defaultValue="Relatório de agosto" />
      </Dialog>

      <ConfirmDialog
        open={confirmAberto}
        destructive
        title="Excluir este documento?"
        message="A autorização de Ana Ribeiro será removida permanentemente."
        confirmLabel="Excluir"
        onCancel={() => setConfirmAberto(false)}
        onConfirm={() => setConfirmAberto(false)}
      />
    </div>
  );
}

export default function UISandbox() {
  return (
    <SnackbarProvider>
      <Conteudo />
    </SnackbarProvider>
  );
}
