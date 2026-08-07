import { useEffect, useState } from 'react';
import {
  Save,
  Bot,
  Zap,
  Monitor,
  Lock,
  Unlock,
  AlertTriangle,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Rows3,
  CheckCircle,
} from 'lucide-react';
import {
  Button,
  Card,
  Checkbox,
  ConfirmDialog,
  IconButton,
  Select,
  Skeleton,
  Switch,
  Tabs,
  TextField,
  useSnackbar,
} from '../components/ui';
import PageHeader from '../components/layout/PageHeader';
import { useAppearance, THEMES, DENSITIES } from '../contexts/AppearanceContext';
import { settingsAPI, aiAPI } from '../services/api';
import './Settings.css';

/** Seção de formulário. `<fieldset>`/`<legend>` e não `<div>`+`<h3>`: é a legenda
 *  que o leitor de tela repete antes de cada campo do grupo. */
function Secao({ titulo, descricao, children }) {
  return (
    <fieldset className="set-secao">
      <legend className="set-secao__titulo">{titulo}</legend>
      {descricao ? <p className="set-secao__descricao">{descricao}</p> : null}
      <div className="set-grade">{children}</div>
    </fieldset>
  );
}

const MODELO_PADRAO = {
  openai: 'gpt-4o-mini',
  compatible: 'llama3',
  anthropic: 'claude-3-5-haiku-latest',
};

const AJUDA_DA_CHAVE = {
  anthropic: 'Obtenha em console.anthropic.com',
  openai: 'Obtenha em platform.openai.com',
  compatible: 'Chave do provedor compatível. Para Ollama local, qualquer valor serve.',
};

const AJUDA_DO_MODELO = {
  anthropic: 'Ex.: claude-3-5-haiku-latest, claude-3-5-sonnet-latest',
  openai: 'Ex.: gpt-4o-mini, gpt-4o',
  compatible: 'Ex.: llama3, gemma3:4b, mistral',
};

const Settings = () => {
  const { show } = useSnackbar();
  const { theme, setTheme, density, setDensity } = useAppearance();
  const [aba, setAba] = useState('easy');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoLaunch, setAutoLaunch] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [mostrarChave, setMostrarChave] = useState(false);
  const [testando, setTestando] = useState(false);
  const [confirmarReset, setConfirmarReset] = useState(false);
  const [rememberLogin, setRememberLogin] = useState(
    localStorage.getItem('lumina_remember_login') !== 'false',
  );

  const [settings, setSettings] = useState({
    propertyName: '', propertyAddress: '', maxGuests: 6,
    condoName: '', condoAdminName: '', condoEmail: '', condoLogoUrl: '',
    ownerName: '', ownerEmail: '', ownerPhone: '',
    ownerApto: '', ownerBloco: '', ownerGaragem: '',
    airbnbIcalUrl: '', bookingIcalUrl: '',
    syncIntervalMinutes: 30,
    telegramBotToken: '', telegramAdminUserIds: '',
    emailProvider: '', emailFrom: '', emailPasswordSet: false,
    emailSmtpHost: '', emailSmtpPort: 587, emailImapHost: '', emailImapPort: 993,
    enableAutoDocumentGeneration: false, enableConflictNotifications: true,
    aiProvider: 'anthropic', aiApiKey: '', aiModel: '', aiBaseUrl: '', aiApiKeySet: false,
  });

  useEffect(() => {
    window.electronAPI?.getAutoLaunch?.().then(setAutoLaunch).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelado = false;
    settingsAPI
      .getAll()
      .then(({ data }) => {
        if (cancelado) return;
        // Só sobrescreve o que veio: um campo ausente na resposta não pode
        // apagar o valor local do formulário.
        setSettings((prev) => {
          const proximo = { ...prev };
          for (const [chave, valor] of Object.entries(data)) {
            if (chave in prev && valor !== null && valor !== undefined) proximo[chave] = valor;
          }
          return proximo;
        });
      })
      .catch((error) => {
        if (!cancelado) {
          console.error('Error loading settings:', error);
          show('Falha ao carregar as configurações.', { variant: 'error' });
        }
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mudar = (campo) => (e) => {
    const valor = e?.target ? e.target.value : e;
    setSettings((prev) => ({ ...prev, [campo]: valor }));
  };

  const alternar = (campo) => (e) => {
    setSettings((prev) => ({ ...prev, [campo]: e.target.checked }));
  };

  const salvar = async () => {
    setSaving(true);
    try {
      await settingsAPI.update(settings);
      show('Configurações salvas.');
    } catch (error) {
      console.error('Error saving settings:', error);
      show('Falha ao salvar as configurações.', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const resetar = async () => {
    try {
      await settingsAPI.reset();
      if (window.electronAPI?.factoryReset) {
        await window.electronAPI.factoryReset();
      } else {
        localStorage.removeItem('lumina_token');
        sessionStorage.removeItem('lumina_token');
        window.dispatchEvent(new Event('auth:logout'));
      }
    } catch (err) {
      console.error('Hard reset failed:', err);
      show('Falha ao reverter as configurações.', { variant: 'error' });
      setConfirmarReset(false);
    }
  };

  const testarIA = async () => {
    if (!settings.aiApiKey) {
      show('Informe a chave de API antes de testar.', { variant: 'error' });
      return;
    }
    setTestando(true);
    try {
      const { data } = await aiAPI.testConnection({
        provider: settings.aiProvider,
        api_key: settings.aiApiKey,
        model: settings.aiModel || MODELO_PADRAO[settings.aiProvider],
        base_url: settings.aiBaseUrl || null,
      });
      show(data.message, { variant: data.success ? 'success' : 'error' });
    } catch {
      show('Falha ao testar a conexão.', { variant: 'error' });
    } finally {
      setTestando(false);
    }
  };

  const trocarAutoLaunch = async (e) => {
    const ligado = e.target.checked;
    setAutoLaunch(ligado);
    await window.electronAPI?.setAutoLaunch?.(ligado);
  };

  const noElectron = Boolean(window.electronAPI);
  const bloqueado = !editMode;

  if (loading) {
    return (
      <div className="set">
        <Skeleton variant="text" lines={8} />
      </div>
    );
  }

  return (
    <div className="set">
      <PageHeader
        description="Dados do imóvel, integrações e preferências. Os campos ficam travados até você liberar a edição."
        actions={
          <>
            <Button
              variant="outlined"
              icon={editMode ? <Unlock /> : <Lock />}
              onClick={() => setEditMode((v) => !v)}
            >
              {editMode ? 'Edição liberada' : 'Liberar edição'}
            </Button>
            <Button icon={<Save />} loading={saving} disabled={bloqueado} onClick={salvar}>
              Salvar
            </Button>
          </>
        }
      />

      <Tabs
        ariaLabel="Seções das configurações"
        value={aba}
        onChange={setAba}
        tabs={[
          { key: 'easy', label: 'Essencial' },
          { key: 'advanced', label: 'Avançado' },
          { key: 'ai', label: 'Inteligência artificial', icon: <Bot /> },
          { key: 'appearance', label: 'Aparência', icon: <Sun /> },
        ]}
      >
        {aba === 'easy' ? (
          <div className="set-conteudo">
            {bloqueado ? (
              <Card variant="filled" className="set-aviso">
                <Lock aria-hidden="true" focusable="false" />
                <p>
                  Os campos estão em somente leitura. Use <strong>Liberar edição</strong> acima
                  para alterá-los.
                </p>
              </Card>
            ) : null}

            <Secao titulo="Imóvel">
              <TextField label="Nome do imóvel" value={settings.propertyName} onChange={mudar('propertyName')} disabled={bloqueado} />
              <TextField label="Endereço completo" value={settings.propertyAddress} onChange={mudar('propertyAddress')} disabled={bloqueado} />
              <TextField label="Máximo de hóspedes" type="number" value={settings.maxGuests} onChange={mudar('maxGuests')} disabled={bloqueado} />
            </Secao>

            <Secao titulo="Condomínio">
              <TextField label="Nome do condomínio" value={settings.condoName} onChange={mudar('condoName')} disabled={bloqueado} />
              <TextField label="Nome da administração" value={settings.condoAdminName} onChange={mudar('condoAdminName')} disabled={bloqueado} />
              <TextField label="E-mail do condomínio" type="email" value={settings.condoEmail} onChange={mudar('condoEmail')} disabled={bloqueado} />
              <TextField label="URL do logotipo" type="url" value={settings.condoLogoUrl} onChange={mudar('condoLogoUrl')} disabled={bloqueado} help="Aparece no cabeçalho dos documentos gerados." />
            </Secao>

            <Secao titulo="Proprietário" descricao="Estes dados preenchem as autorizações de hospedagem.">
              <TextField label="Nome completo" value={settings.ownerName} onChange={mudar('ownerName')} disabled={bloqueado} />
              <TextField label="E-mail" type="email" value={settings.ownerEmail} onChange={mudar('ownerEmail')} disabled={bloqueado} />
              <TextField label="Telefone" value={settings.ownerPhone} onChange={mudar('ownerPhone')} disabled={bloqueado} />
              <TextField label="Apartamento" value={settings.ownerApto} onChange={mudar('ownerApto')} disabled={bloqueado} />
              <TextField label="Bloco" value={settings.ownerBloco} onChange={mudar('ownerBloco')} disabled={bloqueado} />
              <TextField label="Garagem" value={settings.ownerGaragem} onChange={mudar('ownerGaragem')} disabled={bloqueado} />
            </Secao>

            <Secao titulo="Plataformas" descricao="Definidas no assistente de instalação. Somente leitura.">
              <TextField label="URL iCal do Airbnb" value={settings.airbnbIcalUrl} disabled readOnly />
              <TextField label="URL iCal do Booking.com" value={settings.bookingIcalUrl} disabled readOnly />
            </Secao>
          </div>
        ) : null}

        {aba === 'advanced' ? (
          <div className="set-conteudo">
            {noElectron ? (
              <Secao titulo="Sistema">
                <Switch checked={autoLaunch} onChange={trocarAutoLaunch}>
                  Iniciar o LUMINA junto com o Windows
                </Switch>
                <Switch
                  checked={rememberLogin}
                  onChange={(e) => {
                    setRememberLogin(e.target.checked);
                    localStorage.setItem('lumina_remember_login', e.target.checked ? 'true' : 'false');
                  }}
                >
                  Manter a sessão ativa entre reinícios
                </Switch>
              </Secao>
            ) : null}

            <Secao titulo="Sincronização">
              <TextField
                label="Intervalo de sincronização"
                type="number"
                value={settings.syncIntervalMinutes}
                onChange={mudar('syncIntervalMinutes')}
                disabled={bloqueado}
                help="Em minutos. Abaixo de 15 as plataformas podem limitar as requisições."
              />
            </Secao>

            <Secao titulo="Telegram" descricao="Definido no assistente de instalação. Somente leitura.">
              <TextField label="Token do bot" value={settings.telegramBotToken} disabled readOnly />
            </Secao>

            <Secao titulo="E-mail" descricao="Definido no assistente de instalação. Somente leitura.">
              <TextField label="Provedor" value={settings.emailProvider} disabled readOnly />
              <TextField label="Endereço de envio" value={settings.emailFrom} disabled readOnly />
              {settings.emailPasswordSet ? (
                <p className="set-ok">
                  <CheckCircle aria-hidden="true" focusable="false" />
                  Senha configurada no servidor
                </p>
              ) : null}
            </Secao>

            {/* Estes dois valem só ao salvar, então são Checkbox e não Switch:
                um interruptor promete efeito imediato. */}
            <Secao titulo="Funcionalidades">
              <Checkbox
                checked={settings.enableAutoDocumentGeneration}
                onChange={alternar('enableAutoDocumentGeneration')}
                disabled={bloqueado}
                description="Gera a autorização assim que uma reserva é confirmada."
              >
                Gerar documentos automaticamente
              </Checkbox>
              <Checkbox
                checked={settings.enableConflictNotifications}
                onChange={alternar('enableConflictNotifications')}
                disabled={bloqueado}
                description="Avisa quando duas plataformas reservam a mesma data."
              >
                Notificar conflitos
              </Checkbox>
            </Secao>

            {/* Zona destrutiva, separada e no fim. Uma ação irreversível não pode
                ficar ao lado de "Salvar": a proximidade é metade do acidente. */}
            <section className="set-perigo" aria-labelledby="set-perigo-titulo">
              <h3 className="set-perigo__titulo" id="set-perigo-titulo">
                <AlertTriangle aria-hidden="true" focusable="false" />
                Zona irreversível
              </h3>
              <p className="set-perigo__texto">
                Reverter para fábrica apaga todas as configurações editadas, incluindo chaves de
                IA, e reabre o assistente de instalação.
              </p>
              <Button variant="destructive" onClick={() => setConfirmarReset(true)}>
                Reverter para fábrica
              </Button>
            </section>
          </div>
        ) : null}

        {aba === 'ai' ? (
          <div className="set-conteudo">
            <Secao
              titulo="Assistente de IA"
              descricao="Funciona com Claude (Anthropic), GPT (OpenAI) e qualquer provedor compatível com a API da OpenAI."
            >
              <Select label="Provedor" value={settings.aiProvider} onChange={mudar('aiProvider')} disabled={bloqueado}>
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="openai">OpenAI (GPT)</option>
                <option value="compatible">Compatível (Ollama, Groq, LM Studio…)</option>
              </Select>

              <TextField
                label="Chave de API"
                type={mostrarChave ? 'text' : 'password'}
                value={settings.aiApiKey}
                onChange={mudar('aiApiKey')}
                disabled={bloqueado}
                placeholder={settings.aiApiKeySet ? '••••••••••••••••' : 'sk-ant-… ou sk-…'}
                help={
                  settings.aiApiKeySet
                    ? `Já há uma chave salva no servidor. ${AJUDA_DA_CHAVE[settings.aiProvider]}`
                    : AJUDA_DA_CHAVE[settings.aiProvider]
                }
                trailingAction={
                  <IconButton
                    density="compact"
                    aria-label={mostrarChave ? 'Ocultar a chave' : 'Mostrar a chave'}
                    aria-pressed={mostrarChave}
                    onClick={() => setMostrarChave((v) => !v)}
                  >
                    {mostrarChave ? <EyeOff /> : <Eye />}
                  </IconButton>
                }
              />

              <TextField
                label="Modelo"
                value={settings.aiModel}
                onChange={mudar('aiModel')}
                disabled={bloqueado}
                placeholder={MODELO_PADRAO[settings.aiProvider]}
                help={AJUDA_DO_MODELO[settings.aiProvider]}
              />

              {settings.aiProvider === 'compatible' ? (
                <TextField
                  label="URL base"
                  type="url"
                  value={settings.aiBaseUrl}
                  onChange={mudar('aiBaseUrl')}
                  disabled={bloqueado}
                  placeholder="http://localhost:11434/v1"
                  help="Ollama: http://localhost:11434/v1 · Groq: https://api.groq.com/openai/v1"
                />
              ) : null}
            </Secao>

            <div className="set-testar">
              <Button variant="tonal" icon={<Zap />} loading={testando} onClick={testarIA}>
                Testar conexão
              </Button>
              <p className="set-testar__nota">Verifica a credencial sem salvar nada.</p>
            </div>

            <Card variant="filled" className="set-nota">
              <p>
                <strong>Segurança.</strong> A chave é guardada no banco local. Em produção,
                prefira definir <code>AI_API_KEY</code> no arquivo <code>.env</code>.
              </p>
            </Card>
          </div>
        ) : null}

        {aba === 'appearance' ? (
          <div className="set-conteudo">
            <Secao
              titulo="Tema"
              descricao="Os mesmos controles do menu na barra superior. A escolha vale para todas as telas e persiste entre sessões."
            >
              <Select label="Tema" value={theme} onChange={(e) => setTheme(e.target.value)}>
                {THEMES.map((t) => (
                  <option key={t} value={t}>
                    {{ light: 'Claro', dark: 'Escuro', system: 'Seguir o sistema' }[t]}
                  </option>
                ))}
              </Select>
              <Select label="Densidade" value={density} onChange={(e) => setDensity(e.target.value)}>
                {DENSITIES.map((d) => (
                  <option key={d} value={d}>
                    {{ comfortable: 'Espaçoso', standard: 'Padrão', compact: 'Compacto' }[d]}
                  </option>
                ))}
              </Select>
            </Secao>

            <Card variant="filled" className="set-nota">
              <p>
                <Monitor aria-hidden="true" focusable="false" />{' '}
                <strong>Densidade</strong> muda a altura de todos os controles ao mesmo tempo —
                botões, campos e linhas de tabela. <Rows3 aria-hidden="true" focusable="false" />{' '}
                <strong>Compacto</strong> cabe mais na tela; <Moon aria-hidden="true" focusable="false" />{' '}
                o tema escuro é validado com os mesmos contrastes do claro.
              </p>
            </Card>
          </div>
        ) : null}
      </Tabs>

      <ConfirmDialog
        open={confirmarReset}
        destructive
        title="Reverter tudo para fábrica?"
        message="Todas as configurações editadas serão apagadas, incluindo chaves de IA. O aplicativo reinicia no assistente de instalação. Não há como desfazer."
        confirmLabel="Reverter tudo"
        onCancel={() => setConfirmarReset(false)}
        onConfirm={resetar}
      />
    </div>
  );
};

export default Settings;
