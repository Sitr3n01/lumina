import { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, DollarSign, Send, User, MessageSquare, Sparkles, Settings } from 'lucide-react';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Progress,
  Tabs,
  Textarea,
  useSnackbar,
} from '../components/ui';
import PageHeader from '../components/layout/PageHeader';
import { usePropertyId } from '../contexts/PropertyContext';
import { aiAPI } from '../services/api';
import { formatCurrency, formatDateShort } from '../utils/formatters';
import './AISuggestions.css';

/**
 * Assistente e precificação.
 *
 * A SEGUNDA COR DE MARCA morreu aqui. Havia `AI_PURPLE = '#8b5cf6'` com duas
 * variantes, duplicado também em Settings.jsx — um roxo que não existe em
 * nenhuma paleta do sistema e que fazia a tela parecer outro produto. A IA passa
 * a usar o papel TERCIÁRIO, que é o acento do sistema. Um produto tem uma cor de
 * marca; um "acento especial" por seção é o começo de não ter nenhuma.
 */

const SUGESTOES_INICIAIS = [
  'Como está minha ocupação neste mês?',
  'Quais datas estão livres nas próximas semanas?',
  'Há algum conflito de reserva em aberto?',
  'Qual foi a receita dos últimos três meses?',
];

function Mensagem({ message }) {
  const doUsuario = message.role === 'user';
  return (
    <li className="ai-msg" data-de={doUsuario ? 'usuario' : 'assistente'}>
      <span className="ai-msg__avatar" aria-hidden="true">
        {doUsuario ? <User /> : <Bot />}
      </span>
      <div className="ai-msg__bolha">
        {/* O papel de quem falou é texto de verdade, não só posição e cor:
            alinhamento à direita não é anunciado por leitor de tela. */}
        <span className="lm-sr">{doUsuario ? 'Você:' : 'Assistente:'}</span>
        {message.content}
      </div>
    </li>
  );
}

function Assistente({ onPageChange }) {
  const { propertyId } = usePropertyId();
  const { show } = useSnackbar();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const fimRef = useRef(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const enviar = useCallback(
    async (texto) => {
      const conteudo = (texto ?? input).trim();
      if (!conteudo || loading) return;

      const novas = [...messages, { role: 'user', content: conteudo }];
      setMessages(novas);
      setInput('');
      setLoading(true);

      try {
        const { data } = await aiAPI.chat({ property_id: propertyId, messages: novas });
        if (data.success) {
          setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
        } else {
          show(data.message || 'A IA não conseguiu responder.', { variant: 'error' });
        }
      } catch (err) {
        show(err.response?.data?.detail || 'Falha ao falar com a IA.', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    },
    [input, loading, messages, propertyId, show],
  );

  const teclado = (e) => {
    // Enter envia, Shift+Enter quebra linha. A convenção é a de aplicativos de
    // mensagem, e a dica abaixo do campo diz isso em texto.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  };

  return (
    <div className="ai-chat">
      {messages.length === 0 && !loading ? (
        <EmptyState
          icon={<Sparkles />}
          title="Pergunte sobre o seu apartamento"
          description="O assistente enxerga suas reservas, conflitos e estatísticas para responder."
          action={
            <Button variant="text" icon={<Settings />} onClick={() => onPageChange?.('settings')}>
              Configurar a IA
            </Button>
          }
        />
      ) : null}

      {messages.length > 0 || loading ? (
        // `aria-live="polite"` para que a resposta seja anunciada quando chega,
        // sem interromper quem está digitando a próxima pergunta.
        <div className="ai-thread" aria-live="polite" aria-busy={loading}>
          <ul className="ai-thread__lista" role="list">
            {messages.map((m, i) => (
              <Mensagem key={i} message={m} />
            ))}
            {loading ? (
              <li className="ai-msg" data-de="assistente">
                <span className="ai-msg__avatar" aria-hidden="true">
                  <Bot />
                </span>
                <div className="ai-msg__bolha">
                  <Progress variant="linear" aria-label="O assistente está respondendo" />
                </div>
              </li>
            ) : null}
          </ul>
          <div ref={fimRef} />
        </div>
      ) : null}

      {messages.length === 0 && !loading ? (
        <ul className="ai-sugestoes" role="list">
          {SUGESTOES_INICIAIS.map((s) => (
            <li key={s}>
              <Chip variant="suggestion" label={s} onClick={() => enviar(s)} />
            </li>
          ))}
        </ul>
      ) : null}

      <div className="ai-compositor">
        <Textarea
          label="Sua pergunta"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={teclado}
          rows={2}
          placeholder="O que você quer saber?"
          help="Enter envia. Shift+Enter quebra a linha."
        />
        <Button
          icon={<Send />}
          loading={loading}
          disabled={!input.trim()}
          onClick={() => enviar()}
        >
          Enviar
        </Button>
      </div>

      {messages.length > 0 ? (
        <div className="ai-limpar">
          <Button variant="text" density="compact" onClick={() => setMessages([])}>
            Limpar conversa
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function Precificacao() {
  const { propertyId } = usePropertyId();
  const { show } = useSnackbar();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const gerar = async () => {
    setLoading(true);
    try {
      const response = await aiAPI.getPriceSuggestions(propertyId);
      setData(response.data);
    } catch (err) {
      show(err.response?.data?.detail || 'Falha ao gerar as sugestões.', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="ai-carregando" role="status">
        <Progress variant="circular" aria-label="Gerando sugestões de preço" />
        <p>Analisando ocupação e sazonalidade…</p>
      </div>
    );
  }

  if (!data?.suggestions?.length) {
    return (
      <EmptyState
        icon={<DollarSign />}
        title="Nenhuma sugestão gerada ainda"
        description="A IA analisa a ocupação, a sazonalidade e o histórico para propor uma diária por data."
        action={
          <Button icon={<Sparkles />} onClick={gerar}>
            Gerar sugestões
          </Button>
        }
      />
    );
  }

  return (
    <div className="ai-precos">
      <div className="ai-precos__topo">
        <p className="ai-precos__nota">
          {data.suggestions.length} sugestões
          {data.generated_at ? ` · geradas em ${formatDateShort(data.generated_at)}` : ''}
        </p>
        <Button variant="outlined" icon={<Sparkles />} onClick={gerar}>
          Gerar novamente
        </Button>
      </div>

      <ul className="ai-precos__lista" role="list">
        {data.suggestions.map((sug, i) => (
          <li key={sug.date ?? i}>
            <Card variant="outlined" className="ai-preco">
              <p className="ai-preco__data">{formatDateShort(sug.date)}</p>
              <p className="ai-preco__valor">{formatCurrency(sug.suggested_price)}</p>
              {sug.reasoning ? <p className="ai-preco__motivo">{sug.reasoning}</p> : null}
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

const AISuggestions = ({ onPageChange }) => {
  const [aba, setAba] = useState('chat');

  return (
    <div className="ai">
      <PageHeader description="Assistente contextual e sugestões de diária, a partir dos seus próprios dados." />

      <Tabs
        ariaLabel="Modos do assistente"
        value={aba}
        onChange={setAba}
        tabs={[
          { key: 'chat', label: 'Assistente', icon: <MessageSquare /> },
          { key: 'pricing', label: 'Precificação', icon: <DollarSign /> },
        ]}
      >
        {aba === 'chat' ? <Assistente onPageChange={onPageChange} /> : <Precificacao />}
      </Tabs>
    </div>
  );
};

export default AISuggestions;
