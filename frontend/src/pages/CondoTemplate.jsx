import { useEffect, useState } from 'react';
import { Printer, ArrowLeft } from 'lucide-react';
import { Button, Card, Skeleton } from '../components/ui';
import PageHeader from '../components/layout/PageHeader';
import { settingsAPI } from '../services/api';
import './CondoTemplate.css';

/**
 * Pré-visualização da autorização de hospedagem, no formato em que o condomínio
 * a recebe impressa.
 *
 * O papel é branco com tinta preta INDEPENDENTEMENTE do tema da interface: é uma
 * folha que vai para a impressora, não uma tela. Por isso este é o único lugar
 * do produto onde as cores não seguem o tema — e por isso elas vivem em
 * `CondoTemplate.css` sob `@media print`, e não em `style={{}}` no JSX.
 *
 * O que saiu daqui: 77 estilos inline, um bloco `<style>` com dez `!important`, e
 * os DADOS PESSOAIS REAIS da proprietária (nome completo, e-mail, telefone,
 * apartamento, bloco e garagem) que estavam escritos como valores de reserva num
 * repositório público. Campo sem resposta do servidor agora fica em branco, que
 * é o que um formulário em branco deve mostrar.
 */

const TRAVESSAO = '—';

function Linha({ rotulo, valor }) {
  return (
    <>
      <td className="ct-doc__rotulo">{rotulo}</td>
      <td className="ct-doc__valor">{valor || TRAVESSAO}</td>
    </>
  );
}

const CondoTemplateView = ({ onBack }) => {
  const [settings, setSettings] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    settingsAPI
      .getAll()
      .then((r) => setSettings(r.data))
      .catch(() => setSettings({}))
      .finally(() => setCarregando(false));
  }, []);

  const s = settings ?? {};

  return (
    <div className="ct">
      <PageHeader
        description="Modelo oficial do condomínio para autorização de hóspedes temporários. Os dados do proprietário vêm de Configurações."
        actions={
          <>
            {onBack ? (
              <Button variant="outlined" icon={<ArrowLeft />} onClick={onBack}>
                Voltar
              </Button>
            ) : null}
            <Button icon={<Printer />} onClick={() => window.print()}>
              Imprimir
            </Button>
          </>
        }
      />

      {carregando ? (
        <Skeleton variant="rect" />
      ) : (
        <Card variant="elevated" className="ct-folha" id="printable-area" as="article">
          <header className="ct-doc__cabecalho">
            <p className="ct-doc__condominio">{s.condoName || 'Condomínio'}</p>
            <h2 className="ct-doc__titulo">Autorização de hospedagem</h2>
          </header>

          <table className="ct-doc__tabela">
            <tbody>
              <tr>
                <Linha rotulo="Proprietário" valor={s.ownerName} />
                <Linha rotulo="Apto" valor={s.ownerApto} />
              </tr>
              <tr>
                <Linha rotulo="E-mail" valor={s.ownerEmail} />
                <Linha rotulo="Bloco" valor={s.ownerBloco} />
              </tr>
              <tr>
                <Linha rotulo="Celular" valor={s.ownerPhone} />
                <Linha rotulo="Garagem" valor={s.ownerGaragem} />
              </tr>
            </tbody>
          </table>

          <h3 className="ct-doc__secao">Identificação dos hóspedes</h3>
          <table className="ct-doc__tabela">
            <tbody>
              <tr>
                <td className="ct-doc__rotulo">Hóspede principal</td>
                <td className="ct-doc__branco" colSpan={3} />
              </tr>
              <tr>
                <td className="ct-doc__rotulo">Documento</td>
                <td className="ct-doc__branco" />
                <td className="ct-doc__rotulo">Telefone</td>
                <td className="ct-doc__branco" />
              </tr>
              <tr>
                <td className="ct-doc__rotulo">Entrada</td>
                <td className="ct-doc__branco" />
                <td className="ct-doc__rotulo">Saída</td>
                <td className="ct-doc__branco" />
              </tr>
              <tr>
                <td className="ct-doc__rotulo">Endereço</td>
                <td className="ct-doc__branco" />
                <td className="ct-doc__rotulo">CEP</td>
                <td className="ct-doc__branco" />
              </tr>
            </tbody>
          </table>

          <h3 className="ct-doc__secao">Acompanhantes</h3>
          <table className="ct-doc__tabela">
            <tbody>
              {/* Começa em 02 porque o 01 é o hóspede principal da tabela acima —
                  a numeração é a do formulário em papel do condomínio. */}
              {['02', '03', '04', '05', '06'].map((n) => (
                <tr key={n}>
                  <td className="ct-doc__numero">{n}</td>
                  <td className="ct-doc__branco" />
                  <td className="ct-doc__branco" />
                </tr>
              ))}
            </tbody>
          </table>

          <p className="ct-doc__linha-livre">
            Veículo / modelo: <span className="ct-doc__preencher" /> Placa:{' '}
            <span className="ct-doc__preencher ct-doc__preencher--curto" />
          </p>

          <div className="ct-doc__texto">
            <p>
              Autorizo o hóspede e os acompanhantes acima identificados a ocupar meu apartamento no
              período especificado, responsabilizando-me pelo cumprimento das normas do condomínio.
            </p>
            <p>
              Serão de responsabilidade do referido hóspede as despesas e os gastos decorrentes da
              sua estadia, inclusive danos ao imóvel.
            </p>
            <p>
              É de responsabilidade do hóspede o dano causado ao patrimônio do condomínio, devendo
              ser reparado imediatamente.
            </p>
          </div>

          <div className="ct-doc__texto">
            <p>
              <strong>Observação.</strong> O artigo 17 do regimento interno tem a seguinte redação:
            </p>
            <p>
              Na ausência do proprietário e em caso de empréstimo para parentes, amigos ou locação
              por temporada, deverá ser preenchido formulário de autorização de hospedagem junto à
              administração do condomínio.
            </p>
            <p>a) Apartamento de 2 quartos, para 6 pessoas;</p>
            <p>b) Apartamento de 3 quartos, para 8 pessoas;</p>
            <p>
              c) Somente será permitida a ocupação do apartamento mediante autorização por escrito
              do proprietário, com dados completos do hóspede, entregue na recepção;
            </p>
            <p>
              d) Em assembleia, foi decidido que a pulseira de identificação será cobrada conforme
              deliberado.
            </p>
          </div>

          <div className="ct-doc__assinatura">
            <span className="ct-doc__assinatura-linha" />
            <p className="ct-doc__assinatura-nome">{s.ownerName || 'Assinatura do proprietário'}</p>
            <p className="ct-doc__assinatura-detalhe">Proprietário</p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default CondoTemplateView;
