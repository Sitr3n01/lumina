import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Dialog, IconButton, Tabs, TextField } from '../components/ui';
import { documentsAPI } from '../services/api';

/**
 * Geração de documento, em dois caminhos: a partir de uma reserva já existente
 * ou por preenchimento manual.
 *
 * Estava inline na página — cerca de 300 linhas de JSX dentro de
 * `<div className="modal-content modal-large">`, sem foco preso, sem Escape e
 * sem devolução de foco. Aqui é um `<Dialog>` de verdade.
 */

const CAMPOS_DO_HOSPEDE = [
  { chave: 'guest_name', rotulo: 'Nome completo', obrigatorio: true, placeholder: 'Como no documento' },
  { chave: 'guest_cpf', rotulo: 'CPF ou RG', placeholder: '000.000.000-00' },
  { chave: 'guest_phone', rotulo: 'Telefone', placeholder: '(00) 0000-0000' },
  { chave: 'guest_celular', rotulo: 'Celular', placeholder: '(00) 00000-0000' },
];

const CAMPOS_DE_ENDERECO = [
  { chave: 'guest_address', rotulo: 'Endereço', placeholder: 'Rua, número, complemento' },
  { chave: 'guest_bairro', rotulo: 'Bairro' },
  { chave: 'guest_cidade', rotulo: 'Cidade' },
  { chave: 'guest_estado', rotulo: 'Estado' },
  { chave: 'guest_cep', rotulo: 'CEP', placeholder: '00000-000' },
];

const CAMPOS_DO_VEICULO = [
  { chave: 'guest_vehicle', rotulo: 'Veículo', placeholder: 'Ex.: Honda Civic 2022' },
  { chave: 'guest_plate', rotulo: 'Placa', placeholder: 'ABC-1234' },
];

const FORM_VAZIO = {
  guest_name: '', guest_cpf: '', guest_phone: '', guest_celular: '',
  guest_address: '', guest_bairro: '', guest_cidade: '', guest_estado: '', guest_cep: '',
  guest_vehicle: '', guest_plate: '',
  check_in: '', check_out: '',
};

function Grupo({ titulo, children }) {
  return (
    <fieldset className="doc-grupo">
      <legend className="doc-grupo__titulo">{titulo}</legend>
      <div className="doc-grupo__grade">{children}</div>
    </fieldset>
  );
}

export default function DocumentGenerateDialog({ open, onClose, onGerado, show }) {
  const [modo, setModo] = useState('booking');
  const [bookingId, setBookingId] = useState('');
  const [form, setForm] = useState(FORM_VAZIO);
  const [acompanhantes, setAcompanhantes] = useState([]);
  const [gerando, setGerando] = useState(false);

  const mudar = (chave) => (e) => setForm((p) => ({ ...p, [chave]: e.target.value }));

  const limpar = () => {
    setForm(FORM_VAZIO);
    setAcompanhantes([]);
    setBookingId('');
  };

  const concluir = async (fn, mensagem) => {
    setGerando(true);
    try {
      await fn();
      show(mensagem);
      limpar();
      onClose();
      await onGerado();
    } catch (error) {
      console.error('Error generating document:', error);
      show(error.response?.data?.detail || 'Falha ao gerar o documento.', { variant: 'error' });
    } finally {
      setGerando(false);
    }
  };

  const gerarDaReserva = (recibo) => {
    if (!bookingId.trim()) {
      show('Informe o identificador da reserva.', { variant: 'error' });
      return;
    }
    const chamada = recibo
      ? documentsAPI.generateReceiptFromBooking
      : documentsAPI.generateFromBooking;
    concluir(
      () => chamada({ booking_id: parseInt(bookingId, 10), save_to_file: true }),
      recibo ? 'Recibo gerado.' : 'Autorização gerada.',
    );
  };

  const gerarManual = () => {
    if (!form.guest_name || !form.check_in || !form.check_out) {
      show('Preencha nome, entrada e saída.', { variant: 'error' });
      return;
    }
    concluir(
      () =>
        documentsAPI.generate({
          guest: {
            name: form.guest_name,
            cpf: form.guest_cpf || null,
            phone: form.guest_phone || null,
            celular: form.guest_celular || null,
            address: form.guest_address || null,
            bairro: form.guest_bairro || null,
            cidade: form.guest_cidade || null,
            estado: form.guest_estado || null,
            cep: form.guest_cep || null,
            vehicle: form.guest_vehicle || null,
            plate: form.guest_plate || null,
            companions: acompanhantes.filter((c) => c.name.trim()).length
              ? acompanhantes
                  .filter((c) => c.name.trim())
                  .map((c) => ({ name: c.name, document: c.document || null }))
              : null,
          },
          // Preenchidos pelo backend a partir das configurações.
          property: { name: '', address: '', condo_name: '', owner_name: '' },
          booking: { check_in: form.check_in, check_out: form.check_out },
          save_to_file: true,
        }),
      'Autorização gerada.',
    );
  };

  return (
    <Dialog
      open={open}
      title="Gerar documento"
      description="A autorização de hospedagem é preenchida com os dados do proprietário cadastrados em Configurações."
      onClose={gerando ? undefined : onClose}
      closable={!gerando}
      className="doc-dialogo"
      actions={
        <>
          <Button variant="text" onClick={onClose} disabled={gerando}>
            Cancelar
          </Button>
          {modo === 'booking' ? (
            <>
              <Button variant="outlined" loading={gerando} onClick={() => gerarDaReserva(true)}>
                Gerar recibo
              </Button>
              <Button loading={gerando} onClick={() => gerarDaReserva(false)}>
                Gerar autorização
              </Button>
            </>
          ) : (
            <Button loading={gerando} onClick={gerarManual}>
              Gerar autorização
            </Button>
          )}
        </>
      }
    >
      <Tabs
        ariaLabel="Origem dos dados"
        value={modo}
        onChange={setModo}
        tabs={[
          { key: 'booking', label: 'A partir de uma reserva' },
          { key: 'manual', label: 'Preenchimento manual' },
        ]}
      >
        {modo === 'booking' ? (
          <TextField
            label="Identificador da reserva"
            required
            value={bookingId}
            onChange={(e) => setBookingId(e.target.value)}
            placeholder="Ex.: 1, 2, 3…"
            help="O número que aparece na lista de reservas do calendário."
          />
        ) : (
          <div className="doc-form">
            <Grupo titulo="Hóspede">
              {CAMPOS_DO_HOSPEDE.map((c) => (
                <TextField
                  key={c.chave}
                  label={c.rotulo}
                  required={c.obrigatorio}
                  value={form[c.chave]}
                  onChange={mudar(c.chave)}
                  placeholder={c.placeholder}
                />
              ))}
            </Grupo>

            <Grupo titulo="Endereço">
              {CAMPOS_DE_ENDERECO.map((c) => (
                <TextField
                  key={c.chave}
                  label={c.rotulo}
                  value={form[c.chave]}
                  onChange={mudar(c.chave)}
                  placeholder={c.placeholder}
                />
              ))}
            </Grupo>

            <Grupo titulo="Período">
              <TextField label="Entrada" type="date" required value={form.check_in} onChange={mudar('check_in')} />
              <TextField label="Saída" type="date" required value={form.check_out} onChange={mudar('check_out')} />
            </Grupo>

            <Grupo titulo="Veículo">
              {CAMPOS_DO_VEICULO.map((c) => (
                <TextField
                  key={c.chave}
                  label={c.rotulo}
                  value={form[c.chave]}
                  onChange={mudar(c.chave)}
                  placeholder={c.placeholder}
                />
              ))}
            </Grupo>

            <fieldset className="doc-grupo">
              <legend className="doc-grupo__titulo">Acompanhantes</legend>
              <ul className="doc-acompanhantes" role="list">
                {acompanhantes.map((c, i) => (
                  <li className="doc-acompanhante" key={i}>
                    <TextField
                      label={`Nome do acompanhante ${i + 2}`}
                      value={c.name}
                      onChange={(e) =>
                        setAcompanhantes((p) =>
                          p.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)),
                        )
                      }
                    />
                    <TextField
                      label="Documento"
                      value={c.document}
                      onChange={(e) =>
                        setAcompanhantes((p) =>
                          p.map((x, j) => (j === i ? { ...x, document: e.target.value } : x)),
                        )
                      }
                    />
                    <IconButton
                      aria-label={`Remover acompanhante ${i + 2}`}
                      onClick={() => setAcompanhantes((p) => p.filter((_, j) => j !== i))}
                    >
                      <Trash2 />
                    </IconButton>
                  </li>
                ))}
              </ul>
              {/* O hóspede principal é o 1; os acompanhantes começam em 2, como
                  no formulário impresso do condomínio. Cinco é o teto do papel. */}
              {acompanhantes.length < 5 ? (
                <Button
                  variant="text"
                  icon={<Plus />}
                  onClick={() => setAcompanhantes((p) => [...p, { name: '', document: '' }])}
                >
                  Adicionar acompanhante
                </Button>
              ) : null}
            </fieldset>
          </div>
        )}
      </Tabs>
    </Dialog>
  );
}
