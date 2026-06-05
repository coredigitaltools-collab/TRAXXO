import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
  subtitle?: string;
}

export function Modal({ title, onClose, children, maxWidth = 'max-w-xl', subtitle }: ModalProps) {
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal-content ${maxWidth} w-full`} onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between p-6 border-b border-gray-100 dark:border-gray-700 gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-heading-sm text-gray-900 dark:text-gray-100">{title}</h2>
            {subtitle && <p className="text-body-sm text-gray-600 dark:text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="btn-icon btn-secondary text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 shrink-0"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">{children}</div>
      </div>
    </div>
  );
}

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmModalProps) {
  const confirmButtonClass = variant === 'danger' ? 'btn-danger' : 'btn-warning';

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-md w-full">
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-heading-sm text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
            <p className="text-body-sm text-gray-600 dark:text-gray-400">{message}</p>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={onCancel} disabled={isLoading} className="btn-secondary btn">
              {cancelLabel}
            </button>
            <button onClick={onConfirm} disabled={isLoading} className={`btn ${confirmButtonClass}`}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
