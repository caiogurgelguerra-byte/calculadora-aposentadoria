import { Dialog, DialogPanel, DialogTitle, Description } from '@headlessui/react';
import { useRef, type ReactNode } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** Para destrutivos, default false: clicar no overlay NÃO fecha. */
  dismissOnOverlay?: boolean;
  /** Conteúdo extra (ex: input "digite EXCLUIR"). */
  children?: ReactNode;
  /** Desabilita o botão de confirmar (controlado pelo pai). */
  confirmDisabled?: boolean;
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, description,
  confirmLabel, cancelLabel = 'Cancelar',
  destructive = false, dismissOnOverlay,
  children, confirmDisabled = false,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const allowOverlayDismiss = dismissOnOverlay ?? !destructive;

  return (
    <Dialog
      open={open}
      onClose={allowOverlayDismiss ? onClose : () => {}}
      initialFocus={cancelRef}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
          <DialogTitle className="text-xl font-semibold text-gray-900">{title}</DialogTitle>
          <Description as="div" className="mt-2 text-gray-600">{description}</Description>
          {children && <div className="mt-4">{children}</div>}
          <div className="mt-6 flex justify-end gap-2">
            <button
              ref={cancelRef}
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={confirmDisabled}
              className={`px-4 py-2 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed ${
                destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
