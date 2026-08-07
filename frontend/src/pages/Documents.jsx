import { useCallback, useEffect, useState } from 'react';
import { FileText, FilePlus, RefreshCw, Download, Trash2, FileStack } from 'lucide-react';
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  IconButton,
  Skeleton,
  useSnackbar,
} from '../components/ui';
import PageHeader from '../components/layout/PageHeader';
import DocumentGenerateDialog from './DocumentGenerateDialog';
import { documentsAPI } from '../services/api';
import { formatDateTimeFull } from '../utils/formatters';
import './Documents.css';

const Documents = ({ onPageChange }) => {
  const { show } = useSnackbar();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gerarAberto, setGerarAberto] = useState(false);
  const [aExcluir, setAExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await documentsAPI.list();
      // O endpoint devolve `{ total, documents: [...] }`, não um array. A versão
      // anterior fazia `data || []`, e como `{...}.length` é `undefined` a tela
      // caía sempre no estado vazio — nenhum documento aparecia, sem erro nenhum.
      // Um defeito silencioso é pior que um estouro: este pelo menos apareceu.
      setDocuments(Array.isArray(data) ? data : (data?.documents ?? []));
    } catch (error) {
      console.error('Error loading documents:', error);
      show('Falha ao carregar os documentos.', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [show]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const baixar = async (filename) => {
    try {
      const response = await documentsAPI.download(filename);
      const url = URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      // Sem o revoke, cada download deixa o blob inteiro preso na memória do
      // processo até a janela fechar.
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      show('Falha ao baixar o documento.', { variant: 'error' });
    }
  };

  const excluir = async () => {
    setExcluindo(true);
    try {
      await documentsAPI.delete(aExcluir);
      show('Documento excluído.');
      setAExcluir(null);
      await carregar();
    } catch (error) {
      console.error('Error deleting document:', error);
      show('Falha ao excluir o documento.', { variant: 'error' });
    } finally {
      setExcluindo(false);
    }
  };

  return (
    <div className="doc">
      <PageHeader
        description="Autorizações de hospedagem e recibos gerados para o condomínio."
        actions={
          <>
            <Button variant="outlined" icon={<RefreshCw />} onClick={carregar}>
              Atualizar
            </Button>
            {/* O template do condomínio é um documento que se gera, como a
                autorização — por isso é uma ação daqui e não um destino da
                navegação. */}
            <Button
              variant="outlined"
              icon={<FileStack />}
              onClick={() => onPageChange?.('condo-template')}
            >
              Template do condomínio
            </Button>
            <Button icon={<FilePlus />} onClick={() => setGerarAberto(true)}>
              Gerar documento
            </Button>
          </>
        }
      />

      {loading ? (
        <div aria-busy="true" aria-label="Carregando documentos">
          <Skeleton variant="text" lines={5} />
        </div>
      ) : documents.length === 0 ? (
        <EmptyState
          icon={<FileText />}
          title="Nenhum documento gerado"
          description="Gere a autorização de hospedagem a partir de uma reserva ou preenchendo os dados à mão."
          action={
            <Button icon={<FilePlus />} onClick={() => setGerarAberto(true)}>
              Gerar o primeiro
            </Button>
          }
        />
      ) : (
        <ul className="doc-lista" role="list">
          {documents.map((d) => (
            <li key={d.filename}>
              <Card variant="outlined" className="doc-item">
                <span className="doc-item__icone" aria-hidden="true">
                  <FileText />
                </span>
                <div className="doc-item__corpo">
                  <p className="doc-item__nome">{d.name || d.filename}</p>
                  <p className="doc-item__meta">
                    {formatDateTimeFull(d.created_at)}
                    {d.size_kb ? ` · ${Math.round(d.size_kb)} KB` : ''}
                  </p>
                </div>
                <div className="doc-item__acoes">
                  <IconButton aria-label={`Baixar ${d.name || d.filename}`} onClick={() => baixar(d.filename)}>
                    <Download />
                  </IconButton>
                  <IconButton
                    aria-label={`Excluir ${d.name || d.filename}`}
                    className="doc-item__excluir"
                    onClick={() => setAExcluir(d.filename)}
                  >
                    <Trash2 />
                  </IconButton>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <DocumentGenerateDialog
        open={gerarAberto}
        onClose={() => setGerarAberto(false)}
        onGerado={carregar}
        show={show}
      />

      {/* Substitui `window.confirm`, que num app Electron aparece com o chrome do
          Windows, tipografia do sistema e os botões "OK/Cancelar" — que não
          dizem o que vai acontecer. */}
      <ConfirmDialog
        open={Boolean(aExcluir)}
        destructive
        title="Excluir este documento?"
        message={`"${aExcluir}" será removido permanentemente do disco. Não há como desfazer.`}
        confirmLabel="Excluir"
        loading={excluindo}
        onCancel={() => setAExcluir(null)}
        onConfirm={excluir}
      />
    </div>
  );
};

export default Documents;
