import { useRef } from 'react';
import Dialog from './Dialog';
import Button from './Button';

/**
 * Confirmação — o substituto de `window.confirm`.
 *
 * O diálogo nativo do Chromium aparece com o chrome do sistema operacional, a
 * tipografia do Windows e nenhum token do LUMINA; num app Electron ele parece um
 * erro do programa, não uma pergunta dele. Também não diz o que vai acontecer:
 * "OK/Cancelar" não é rótulo.
 *
 * Duas regras que o nativo não tem e esta tela precisa:
 * - o foco inicial vai no botão de CANCELAR, nunca no destrutivo. Enter reflexo
 *   sobre um diálogo que acabou de aparecer não pode apagar nada;
 * - o rótulo de confirmação nomeia o verbo ("Excluir", "Descartar"), porque é
 *   ele que o leitor de tela anuncia.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
  children,
}) {
  const cancelRef = useRef(null);

  return (
    <Dialog
      open={open}
      title={title}
      description={message}
      onClose={loading ? undefined : onCancel}
      // Enquanto a ação corre não há como fechar: nem Escape, nem "X", nem véu.
      // Fechar no meio deixaria o usuário sem saber se a exclusão aconteceu.
      closable={!loading}
      dismissible={false}
      initialFocus={cancelRef}
      actions={
        <>
          <Button ref={cancelRef} variant="text" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'filled'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Dialog>
  );
}
