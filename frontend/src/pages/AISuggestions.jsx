import { useState, useRef, useEffect } from 'react';
import { usePropertyId } from '../contexts/PropertyContext';
import { aiAPI } from '../services/api';
import {
  Bot, AlertTriangle, CheckCircle2, RefreshCw, DollarSign,
  Send, User, Settings, MessageSquare, Sparkles,
} from 'lucide-react';

const AI_PURPLE = '#8b5cf6';
const AI_PURPLE_LIGHT = 'rgba(139, 92, 246, 0.12)';
const AI_PURPLE_BORDER = 'rgba(139, 92, 246, 0.25)';

// ─────────────────────────── Main component ───────────────────────────

const AISuggestions = ({ onPageChange }) => {
  const [activeTab, setActiveTab] = useState('chat');

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
          <Bot size={26} style={{ color: AI_PURPLE }} />
          Inteligência Artificial
        </h1>
        <p className="subtitle">Assistente contextual e sugestões de precificação com IA</p>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 24 }}>
        <button
          className={`tab ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
          style={activeTab === 'chat' ? { color: AI_PURPLE, borderBottomColor: AI_PURPLE } : {}}
        >
          <MessageSquare size={14} style={{ display: 'inline', marginRight: 5 }} />
          Assistente
        </button>
        <button
          className={`tab ${activeTab === 'pricing' ? 'active' : ''}`}
          onClick={() => setActiveTab('pricing')}
          style={activeTab === 'pricing' ? { color: AI_PURPLE, borderBottomColor: AI_PURPLE } : {}}
        >
          <DollarSign size={14} style={{ display: 'inline', marginRight: 5 }} />
          Precificação
        </button>
      </div>

      {activeTab === 'chat'
        ? <ChatTab onPageChange={onPageChange} />
        : <PricingTab />
      }
    </div>
  );
};

// ─────────────────────────── Chat tab ───────────────────────────

const ChatTab = ({ onPageChange }) => {
  const { propertyId } = usePropertyId();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const res = await aiAPI.chat({
        property_id: propertyId,
        messages: newMessages,
      });

      const result = res.data;
      if (result.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: result.reply }]);
      } else {
        setError(result.message);
      }
    } catch (err) {
      const detail = err.response?.data?.detail || 'Erro ao comunicar com a IA.';
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Empty state — no messages yet
  if (messages.length === 0 && !loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 220px)' }}>
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
        <div className="glass-card" style={{
          flex: 1, minHeight: 0, overflow: 'auto',
          padding: '48px 32px', textAlign: 'center',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        }}>
          <Bot size={52} style={{ color: AI_PURPLE, opacity: 0.35, marginBottom: 16 }} />
          <h3 style={{ marginBottom: 8 }}>LUMINA AI — Assistente Contextual</h3>
          <p style={{ maxWidth: 480, margin: '0 auto 24px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Conheço seu histórico completo de reservas, receitas e conflitos.
            Pergunte-me sobre precificação, tendências, gestão ou qualquer
            aspecto do seu imóvel.
          </p>

          {/* Suggestion chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 32 }}>
            {[
              'Qual foi a receita dos últimos 30 dias?',
              'Sugestão de preço para este fim de semana',
              'Como está minha taxa de ocupação?',
              'Tenho algum conflito de reserva?',
            ].map(q => (
              <button
                key={q}
                onClick={() => { setInput(q); }}
                style={{
                  background: AI_PURPLE_LIGHT,
                  border: `1px solid ${AI_PURPLE_BORDER}`,
                  color: AI_PURPLE,
                  borderRadius: 20,
                  padding: '7px 14px',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {q}
              </button>
            ))}
          </div>

          {/* If no API key configured */}
          <div style={{
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: 10,
            padding: '12px 16px',
            fontSize: 13,
            color: '#fbbf24',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <Settings size={14} />
            Configure sua API Key em{' '}
            <button
              onClick={() => onPageChange?.('settings')}
              style={{ background: 'none', border: 'none', color: '#fbbf24', cursor: 'pointer', textDecoration: 'underline', padding: 0, fontSize: 'inherit' }}
            >
              Configurações → Inteligência Artificial
            </button>
          </div>
        </div>

        {/* Input */}
        <ChatInput input={input} setInput={setInput} onSend={handleSend} onKeyDown={handleKeyDown} loading={loading} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 220px)' }}>
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Message thread */}
      <div className="glass-card" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '20px 24px', marginBottom: 0 }}>
        {messages.map((msg, idx) => (
          <ChatMessage key={idx} message={msg} />
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '8px 0' }}>
            <div style={avatarStyle('#1e1b4b')}>
              <Bot size={16} style={{ color: AI_PURPLE }} />
            </div>
            <div style={{ ...bubbleBase, background: 'rgba(139, 92, 246, 0.08)', border: `1px solid ${AI_PURPLE_BORDER}` }}>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '4px 0' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: '50%', background: AI_PURPLE,
                    animation: `bounce 1s ease-in-out ${i * 0.15}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Clear button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '6px 0' }}>
        <button
          onClick={() => { setMessages([]); setError(null); }}
          style={{ background: 'none', border: 'none', color: 'var(--text-disable)', cursor: 'pointer', fontSize: 12 }}
        >
          Limpar conversa
        </button>
      </div>

      <ChatInput input={input} setInput={setInput} onSend={handleSend} onKeyDown={handleKeyDown} loading={loading} />

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
};

const ChatMessage = ({ message }) => {
  const isUser = message.role === 'user';
  return (
    <div style={{
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
      padding: '8px 0',
      flexDirection: isUser ? 'row-reverse' : 'row',
    }}>
      <div style={avatarStyle(isUser ? '#1e3a5f' : '#1e1b4b')}>
        {isUser ? <User size={16} style={{ color: '#60a5fa' }} /> : <Bot size={16} style={{ color: AI_PURPLE }} />}
      </div>
      <div style={{
        ...bubbleBase,
        background: isUser ? 'rgba(19, 127, 236, 0.1)' : 'rgba(139, 92, 246, 0.08)',
        border: isUser ? '1px solid rgba(19, 127, 236, 0.25)' : `1px solid ${AI_PURPLE_BORDER}`,
        maxWidth: '72%',
      }}>
        <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{message.content}</p>
      </div>
    </div>
  );
};

const ChatInput = ({ input, setInput, onSend, onKeyDown, loading }) => (
  <div style={{
    display: 'flex',
    gap: 10,
    alignItems: 'flex-end',
    background: 'var(--card-bg, #16202a)',
    border: '1px solid var(--border-color, #23303d)',
    borderRadius: 12,
    padding: '10px 12px',
    marginTop: 12,
  }}>
    <textarea
      value={input}
      onChange={e => setInput(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder="Escreva sua pergunta... (Enter para enviar, Shift+Enter para quebrar linha)"
      rows={2}
      style={{
        flex: 1,
        resize: 'none',
        background: 'none',
        border: 'none',
        outline: 'none',
        color: 'var(--text-primary, #f1f5f9)',
        fontSize: 14,
        lineHeight: 1.5,
        fontFamily: 'inherit',
      }}
    />
    <button
      onClick={onSend}
      disabled={loading || !input.trim()}
      style={{
        width: 38, height: 38,
        borderRadius: 8,
        background: AI_PURPLE,
        border: 'none',
        color: '#fff',
        cursor: (loading || !input.trim()) ? 'not-allowed' : 'pointer',
        opacity: (loading || !input.trim()) ? 0.5 : 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Send size={16} />
    </button>
  </div>
);

const avatarStyle = (bg) => ({
  width: 32, height: 32,
  borderRadius: 8,
  background: bg,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0,
});

const bubbleBase = {
  borderRadius: 10,
  padding: '10px 14px',
  fontSize: 14,
  color: 'var(--text-primary, #f1f5f9)',
};

// ─────────────────────────── Pricing tab ───────────────────────────

const PricingTab = () => {
  const { propertyId } = usePropertyId();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const handleGenerate = async () => {
    if (!propertyId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await aiAPI.getPriceSuggestions(propertyId);
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao conectar com a API de IA');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <p style={{ margin: 0, fontWeight: 600 }}>Precificação Dinâmica</p>
          <p className="subtitle" style={{ margin: 0 }}>Sugestões de diárias otimizadas para os próximos 90 dias</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading || !propertyId}
          className="btn"
          style={{
            background: AI_PURPLE,
            color: '#fff',
            boxShadow: `0 4px 12px ${AI_PURPLE_BORDER}`,
            opacity: (loading || !propertyId) ? 0.55 : 1,
          }}
        >
          <Sparkles size={15} />
          {data ? 'Atualizar Sugestões' : 'Gerar Sugestões'}
        </button>
      </div>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {loading && (
        <div className="loading-state">
          <Bot size={32} style={{ color: AI_PURPLE }} className="spin" />
          <span>Analisando dados com IA...</span>
        </div>
      )}

      {!loading && !data && (
        <div className="glass-card empty-state" style={{ padding: '48px 32px' }}>
          <DollarSign size={48} style={{ color: AI_PURPLE, opacity: 0.35 }} />
          <h3>Pronto para Otimizar?</h3>
          <p style={{ maxWidth: 420, textAlign: 'center' }}>
            A IA analisará seu histórico de reservas e sugerirá as melhores tarifas para maximizar receita.
          </p>
        </div>
      )}

      {!loading && data && (
        <div>
          <div className="glass-card" style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 20px', marginBottom: 20,
            background: 'rgba(16, 185, 129, 0.06)', borderColor: 'rgba(16, 185, 129, 0.2)',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--success)' }}>
              <CheckCircle2 size={16} /> Análise concluída!
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-disable)' }}>
              {new Date(data.generated_at).toLocaleString('pt-BR')}
            </span>
          </div>

          {data.suggestions?.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 16 }}>
              {data.suggestions.map((sug, idx) => (
                <div key={idx} className="glass-card" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: AI_PURPLE, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>
                        {new Date(sug.date).toLocaleDateString('pt-BR', { weekday: 'long' })}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>
                        {new Date(sug.date).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                    <div style={{
                      width: 34, height: 34, borderRadius: 8,
                      background: AI_PURPLE_LIGHT, border: `1px solid ${AI_PURPLE_BORDER}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <DollarSign size={17} style={{ color: AI_PURPLE }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 10 }}>
                    {formatCurrency(sug.suggested_price)}
                  </div>
                  <div style={{
                    background: 'rgba(0,0,0,0.2)', borderRadius: 8,
                    padding: '9px 12px', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5,
                  }}>
                    <span style={{ color: AI_PURPLE, fontWeight: 600, display: 'block', marginBottom: 3, fontSize: 10, letterSpacing: '0.07em' }}>
                      ANÁLISE
                    </span>
                    {sug.reasoning}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>Nenhuma sugestão gerada. Pode ser que não haja histórico suficiente.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────── Shared ───────────────────────────

const ErrorBanner = ({ message, onDismiss }) => (
  <div className="message message-error" style={{ marginBottom: 16, cursor: 'pointer' }} onClick={onDismiss}>
    <AlertTriangle size={15} />
    {message}
  </div>
);

export default AISuggestions;
