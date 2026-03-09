import { Printer, FileText, ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { settingsAPI } from '../services/api';

/**
 * CondoTemplateView — pré-visualização fiel do PDF de Autorização de Hospedagem.
 * Replica a estrutura exata do documento: cabeçalho fixo do condomínio,
 * tabela de identificação do hóspede, tabela de acompanhantes, veículo, texto
 * jurídico e assinaturas — sem logos ou imagens.
 */
const CondoTemplateView = ({ onBack }) => {
    const [settings, setSettings] = useState(null);

    useEffect(() => {
        settingsAPI.getAll().then(r => setSettings(r.data)).catch(() => {});
    }, []);

    const owner     = settings?.ownerName    || 'NOME DO PROPRIETARIO';
    const apto      = settings?.ownerApto    || '000';
    const bloco     = settings?.ownerBloco   || 'X';
    const garagem   = settings?.ownerGaragem || '000';
    const ownerEmail= settings?.ownerEmail   || 'proprietario@exemplo.com';
    const ownerCel  = settings?.ownerPhone   || '(00) 0 0000-0000';
    const condoName = settings?.condoName    || 'CONDOMINIO EXEMPLO';

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            {/* ── Page Header ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
                        <FileText size={26} style={{ color: 'var(--primary)' }} />
                        Template: Autorização de Hospedagem
                    </h1>
                    <p className="subtitle">Modelo oficial do condomínio para autorização de hóspedes temporários</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    {onBack && (
                        <button onClick={onBack} className="btn btn-secondary">
                            <ArrowLeft size={16} /> Voltar
                        </button>
                    )}
                    <button onClick={() => window.print()} className="btn btn-primary">
                        <Printer size={16} /> Imprimir / PDF
                    </button>
                </div>
            </div>

            {/* ── Document ── */}
            <div id="printable-area" style={{
                background: '#fff',
                borderRadius: 12,
                boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
                padding: '40px 48px',
                maxWidth: 820,
                margin: '0 auto',
                fontFamily: 'Arial, sans-serif',
                fontSize: '10pt',
                color: '#000',
                lineHeight: '1.4',
            }}>

                {/* ── Document Header: logo + title ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                    {/* Logo slot: shows image if configured, otherwise a bordered placeholder */}
                    {settings?.condoLogoUrl
                        ? <img
                            src={settings.condoLogoUrl}
                            alt="Logo do condomínio"
                            style={{ maxHeight: 64, maxWidth: 120, objectFit: 'contain', flexShrink: 0 }}
                          />
                        : <div style={{
                            width: 90, minHeight: 64, border: '1px solid #ccc',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '7pt', color: '#bbb', textAlign: 'center', lineHeight: 1.4,
                            flexShrink: 0, padding: 4,
                          }}>
                            LOGO<br/>CONDOMÍNIO
                          </div>
                    }
                    {/* Title block */}
                    <div style={{ flex: 1, textAlign: 'center' }}>
                        <p style={{ fontWeight: 700, fontSize: '12pt', margin: 0, textTransform: 'uppercase' }}>
                            Autorização de Hospedagem
                        </p>
                        <p style={{ fontWeight: 700, margin: '4px 0 0' }}>{condoName}</p>
                    </div>
                </div>

                {/* ── Table 0: Property Header (fixed data) ── */}
                <table style={tableStyle}>
                    <tbody>
                        <tr>
                            <td style={{ ...tdLabel, width: '14%' }}>Proprietário:</td>
                            <td style={{ ...tdValue, width: '48%' }} colSpan={3}>{owner}</td>
                            <td style={{ ...tdLabel, width: '8%' }}>Apto:</td>
                            <td style={{ ...tdValue, width: '10%' }}>{apto}</td>
                        </tr>
                        <tr>
                            <td style={tdLabel}>E-mail:</td>
                            <td style={tdValue} colSpan={3}>{ownerEmail}</td>
                            <td style={tdLabel}>Bloco:</td>
                            <td style={tdValue}>{bloco}</td>
                        </tr>
                        <tr>
                            <td style={tdLabel}>Telefone:</td>
                            <td style={tdValue}></td>
                            <td style={tdLabel}>Celular:</td>
                            <td style={tdValue}>{ownerCel}</td>
                            <td style={tdLabel}>Garagem:</td>
                            <td style={tdValue}>{garagem}</td>
                        </tr>
                    </tbody>
                </table>

                {/* ── Section title ── */}
                <p style={{ fontWeight: 700, margin: '10px 0 4px', textDecoration: 'underline' }}>
                    IDENTIFICAÇÃO DOS HÓSPEDES
                </p>

                {/* ── Table 1: Guest Data (blank fields) ── */}
                <table style={tableStyle}>
                    <tbody>
                        <tr>
                            <td style={{ ...tdLabel, width: '14%' }}>Hóspede:</td>
                            <td style={{ ...tdBlank, width: '46%' }} colSpan={3}>&nbsp;</td>
                            <td style={{ ...tdLabel, width: '8%' }}>CPF:</td>
                            <td style={{ ...tdBlank, width: '18%' }}>&nbsp;</td>
                        </tr>
                        <tr>
                            <td style={tdLabel}>Endereço:</td>
                            <td style={tdBlank} colSpan={3}>&nbsp;</td>
                            <td style={tdLabel}>Telefone:</td>
                            <td style={tdBlank}>&nbsp;</td>
                        </tr>
                        <tr>
                            <td style={tdLabel}>Bairro:</td>
                            <td style={tdBlank} colSpan={3}>&nbsp;</td>
                            <td style={tdLabel}>Celular:</td>
                            <td style={tdBlank}>&nbsp;</td>
                        </tr>
                        <tr>
                            <td style={tdLabel}>Cidade:</td>
                            <td style={tdBlank} colSpan={3}>&nbsp;</td>
                            <td style={tdLabel}>Estado:</td>
                            <td style={tdBlank}>&nbsp;</td>
                        </tr>
                        <tr>
                            <td style={tdLabel}>Entrada:</td>
                            <td style={tdBlank}>&nbsp;</td>
                            <td style={tdLabel}>Saída:</td>
                            <td style={tdBlank}>&nbsp;</td>
                            <td style={tdLabel}>CEP:</td>
                            <td style={tdBlank}>&nbsp;</td>
                        </tr>
                    </tbody>
                </table>

                {/* ── Companions ── */}
                <p style={{ fontWeight: 700, margin: '10px 0 4px' }}>Acompanhantes:</p>
                <table style={tableStyle}>
                    <tbody>
                        {['02', '03', '04', '05', '06'].map(num => (
                            <tr key={num}>
                                <td style={{ ...tdLabel, width: '6%', textAlign: 'center' }}>{num}</td>
                                <td style={{ ...tdBlank, width: '54%' }}>&nbsp;</td>
                                <td style={{ ...tdBlank, width: '40%' }}>&nbsp;</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* ── Vehicle ── */}
                <p style={{ margin: '10px 0 6px' }}>
                    {'Veículo/Modelo:'}
                    <span style={blankLine(200)}></span>
                    {'  Placa:'}
                    <span style={blankLine(180)}></span>
                </p>

                {/* ── Authorization text ── */}
                <p style={{ margin: '12px 0 4px', textAlign: 'justify' }}>
                    Autorizo o hóspede e acompanhantes acima identificados a ocupar meu apartamento
                    no período acima especificado, responsabilizando-me pelo cumprimento das normas do condomínio.
                </p>
                <p style={{ margin: '4px 0', textAlign: 'justify' }}>
                    Será de responsabilidade do referido hóspede as despesas e gastos decorrentes da
                    sua estadia, inclusive danos ao imóvel.
                </p>
                <p style={{ margin: '4px 0', textAlign: 'justify' }}>
                    É de responsabilidade do hóspede os danos causados ao patrimônio do condomínio,
                    devendo ser reparados imediatamente.
                </p>

                {/* ── Art. 17 ── */}
                <p style={{ margin: '10px 0 4px', fontWeight: 700 }}>
                    Observação: O artigo 17° do nosso regimento interno tem a seguinte redação:
                </p>
                <p style={{ margin: '4px 0', paddingLeft: 12, textAlign: 'justify' }}>
                    Na ausência do proprietário e em caso de empréstimo para parentes, amigos ou locação
                    por temporada, deverá ser preenchido formulário de autorização de hospedagem junto
                    à administração do condomínio.
                </p>
                <p style={{ margin: '2px 0', paddingLeft: 12 }}>a) Apartamento de 02 quartos, para 06 pessoas;</p>
                <p style={{ margin: '2px 0', paddingLeft: 12 }}>b) Apartamento de 03 quartos, para 08 pessoas;</p>
                <p style={{ margin: '2px 0', paddingLeft: 12, textAlign: 'justify' }}>
                    c) Somente será permitida a ocupação do apto por meio de autorização por escrito
                    do proprietário, com dados completos do(s) hóspede(s), entregue na recepção;
                </p>
                <p style={{ margin: '2px 0', paddingLeft: 12, textAlign: 'justify' }}>
                    d) Em assembleia realizada, foi decidido que a pulseira de identificação será cobrada
                    conforme deliberado em assembleia.
                </p>

                {/* ── Date + Signature ── */}
                <div style={{ marginTop: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <p style={{ margin: 0 }}>
                        Brasília/DF,<span style={blankLine(180)}></span>
                    </p>
                    <div style={{ textAlign: 'center', minWidth: 200 }}>
                        <div style={{ borderTop: '1px solid #000', paddingTop: 4 }}>
                            <p style={{ margin: 0, fontWeight: 700 }}>{owner}</p>
                            <p style={{ margin: 0 }}>Proprietária</p>
                        </div>
                    </div>
                </div>

                {/* ── Footer ── */}
                <div style={{ marginTop: 28, borderTop: '1px solid #ccc', paddingTop: 8, textAlign: 'center' }}>
                    <p style={{ fontSize: '8pt', color: '#888', margin: 0, fontStyle: 'italic' }}>
                        Documento gerado pelo Sistema LUMINA v3.0
                    </p>
                </div>
            </div>

            {/* ── Print CSS ── */}
            <style>{`
                @media print {
                    body * { visibility: hidden !important; }
                    #printable-area, #printable-area * { visibility: visible !important; }
                    #printable-area {
                        position: fixed !important;
                        left: 0 !important; top: 0 !important;
                        width: 100% !important;
                        padding: 20px 28px !important;
                        box-shadow: none !important;
                        border-radius: 0 !important;
                        margin: 0 !important;
                        max-width: 100% !important;
                    }
                }
            `}</style>
        </div>
    );
};

/* ─── Shared style helpers ─── */
const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    marginBottom: 4,
    fontSize: '10pt',
};
const tdBase = {
    border: '1px solid #000',
    padding: '3px 6px',
    fontSize: '10pt',
    background: '#fff',  // explicit: prevent dark-theme CSS bleed
    color: '#000',       // explicit: guarantee black text regardless of theme
};
const tdLabel = { ...tdBase, fontWeight: 700, background: '#f0f0f0', whiteSpace: 'nowrap' };
const tdValue = { ...tdBase };
const tdBlank = { ...tdBase, minWidth: 60 };
const blankLine = (w) => ({
    display: 'inline-block',
    borderBottom: '1px solid #000',
    width: w,
    marginLeft: 4,
    verticalAlign: 'bottom',
});

export default CondoTemplateView;
