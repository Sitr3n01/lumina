import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, ShieldCheck } from 'lucide-react';
import {
  Button,
  Card,
  Chip,
  Dialog,
  EmptyState,
  Skeleton,
  Textarea,
  useSnackbar,
} from '../components/ui';
import PageHeader from '../components/layout/PageHeader';
import { conflictsAPI } from '../services/api';
import { usePropertyId } from '../contexts/PropertyContext';
import { formatDateShort, formatDateTime } from '../utils/formatters';
import './ConflictsPage.css';

/**
 * Severidade na escala de status do sistema, com RÓTULO e ÍCONE.
 * A cor sozinha nunca diz a gravidade: para quem não a distingue, três cartões
 * vermelhos, laranjas e azuis são apenas três cartões.
 */
const SEVERIDADE = {
  critical: { rotulo: 'Crítico', papel: 'error', icone: AlertTriangle },
  high: { rotulo: 'Alta', papel: 'warning', icone: AlertTriangle },
  medium: { rotulo: 'Média', papel: 'info', icone: AlertTriangle },
};

const TIPO = {
  duplicate: 'Duplicata',
  overlap: 'Sobreposição',
};

function CartaoDeConflito({ conflict, onResolve }) {
  const sev = SEVERIDADE[conflict.severity] || SEVERIDADE.medium;
  const Icone = sev.icone;
  const reservas = [conflict.booking_1, conflict.booking_2].filter(Boolean);

  return (
    <Card variant="outlined" className="cfl-card" data-papel={sev.papel} as="article">
      <header className="cfl-card__topo">
        <span className="cfl-card__severidade">
          <Icone aria-hidden="true" focusable="false" />
          {sev.rotulo}
        </span>
        <span className="cfl-card__tipo">
          {TIPO[conflict.conflict_type] || conflict.conflict_type}
        </span>
        {conflict.overlap_nights ? (
          <span className="cfl-card__noites">
            {conflict.overlap_nights} noite{conflict.overlap_nights > 1 ? 's' : ''} em choque
          </span>
        ) : null}
      </header>

      {/* Comparação lado a lado. Em tela estreita as colunas empilham e o "vs"
          vira uma régua horizontal — a relação continua legível. */}
      <div className="cfl-card__comparacao">
        {/* A posição entra na chave: num conflito de DUPLICATA as duas reservas
            podem ser o mesmo registro, e `key={b.id}` produziria chaves iguais —
            o React avisa e pode reaproveitar o nó errado entre renders. */}
        {reservas.map((b, i) => (
          <div className="cfl-reserva" key={`${b.id ?? 'sem-id'}-${i}`}>
            <Chip
              variant="assist"
              className="cfl-reserva__plataforma"
              data-plataforma={(b.platform || 'manual').toLowerCase()}
              label={b.platform || 'Manual'}
            />
            <p className="cfl-reserva__hospede">{b.guest_name || 'Hóspede'}</p>
            <p className="cfl-reserva__periodo">
              {formatDateShort(b.check_in_date)} – {formatDateShort(b.check_out_date)}
            </p>
          </div>
        ))}
      </div>

      <footer className="cfl-card__rodape">
        <span className="cfl-card__detectado">
          Detectado em {formatDateTime(conflict.detected_at)}
        </span>
        <Button variant="tonal" density="compact" onClick={onResolve}>
          Resolver
        </Button>
      </footer>
    </Card>
  );
}

const Conflicts = () => {
  const { propertyId } = usePropertyId();
  const { show } = useSnackbar();
  const [conflicts, setConflicts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selecionado, setSelecionado] = useState(null);
  const [notas, setNotas] = useState('');
  const [resolvendo, setResolvendo] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [lista, resumo] = await Promise.allSettled([
        conflictsAPI.getAll({ property_id: propertyId, active_only: true }),
        conflictsAPI.getSummary(propertyId),
      ]);
      if (lista.status === 'fulfilled') setConflicts(lista.value.data || []);
      if (resumo.status === 'fulfilled') setSummary(resumo.value.data || {});
    } catch (error) {
      console.error('Error loading conflicts:', error);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const detectar = async () => {
    setLoading(true);
    try {
      await conflictsAPI.detect(propertyId);
      await carregar();
      show('Detecção concluída.');
    } catch (error) {
      console.error('Error detecting conflicts:', error);
      show('Falha ao detectar conflitos.', { variant: 'error' });
      setLoading(false);
    }
  };

  const resolver = async () => {
    if (!notas.trim()) {
      show('Descreva como o conflito foi resolvido antes de concluir.', { variant: 'error' });
      return;
    }
    setResolvendo(true);
    try {
      await conflictsAPI.resolve(selecionado.id, notas);
      setSelecionado(null);
      setNotas('');
      await carregar();
      show('Conflito resolvido.');
    } catch (error) {
      console.error('Error resolving conflict:', error);
      show('Falha ao resolver o conflito.', { variant: 'error' });
    } finally {
      setResolvendo(false);
    }
  };

  const contagens = summary
    ? [
        { chave: 'critical', rotulo: 'Críticos', valor: summary.critical || 0, papel: 'error' },
        { chave: 'high', rotulo: 'Alta', valor: summary.high || 0, papel: 'warning' },
        { chave: 'medium', rotulo: 'Média', valor: summary.medium || 0, papel: 'info' },
        { chave: 'duplicates', rotulo: 'Duplicatas', valor: summary.duplicates || 0, papel: 'neutral' },
        { chave: 'overlaps', rotulo: 'Sobreposições', valor: summary.overlaps || 0, papel: 'neutral' },
      ].filter((c) => c.valor > 0)
    : [];

  return (
    <div className="cfl">
      <PageHeader
        description="Sobreposições e duplicatas entre as plataformas, com o histórico de como cada uma foi tratada."
        actions={
          <Button icon={<RefreshCw />} loading={loading} onClick={detectar}>
            Detectar conflitos
          </Button>
        }
      />

      {loading ? (
        <div aria-busy="true" aria-label="Carregando conflitos">
          <Skeleton variant="text" lines={5} />
        </div>
      ) : conflicts.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck />}
          title="Nenhum conflito em aberto"
          description="Todas as reservas das plataformas estão coerentes entre si."
          action={
            <Button variant="outlined" icon={<RefreshCw />} onClick={detectar}>
              Verificar novamente
            </Button>
          }
        />
      ) : (
        <>
          <Card variant="outlined" className="cfl-resumo" as="section">
            <span className="cfl-resumo__icone" aria-hidden="true">
              <AlertTriangle />
            </span>
            <div>
              <p className="cfl-resumo__valor">{summary?.total ?? conflicts.length}</p>
              <p className="cfl-resumo__rotulo">
                {(summary?.total ?? conflicts.length) === 1
                  ? 'conflito em aberto'
                  : 'conflitos em aberto'}
              </p>
            </div>
            <ul className="cfl-resumo__lista" role="list">
              {contagens.map((c) => (
                <li key={c.chave}>
                  <span className="cfl-tag" data-papel={c.papel}>
                    {c.valor} {c.rotulo}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <ul className="cfl-lista" role="list">
            {conflicts.map((c) => (
              <li key={c.id}>
                <CartaoDeConflito conflict={c} onResolve={() => setSelecionado(c)} />
              </li>
            ))}
          </ul>
        </>
      )}

      <Dialog
        open={Boolean(selecionado)}
        title="Resolver conflito"
        description="Registre o que foi feito. A nota fica no histórico e explica a decisão a quem consultar depois."
        onClose={resolvendo ? undefined : () => setSelecionado(null)}
        actions={
          <>
            <Button variant="text" onClick={() => setSelecionado(null)} disabled={resolvendo}>
              Cancelar
            </Button>
            <Button onClick={resolver} loading={resolvendo}>
              Concluir
            </Button>
          </>
        }
      >
        <Textarea
          label="Como foi resolvido"
          required
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          help="Ex.: cancelei a reserva duplicada do Booking e avisei o hóspede."
        />
      </Dialog>
    </div>
  );
};

export default Conflicts;
