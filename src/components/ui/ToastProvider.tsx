import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { XIcon } from './icons';
import styles from './Toast.module.css';

import { ToastContext } from './ToastProvider.helpers';
export type ToastTone = 'success' | 'warning' | 'danger' | 'accent';

interface ToastEntry {
  id: number;
  title: string;
  message?: string;
  tone: ToastTone;
  acao?: AcaoDoToast;
}

/** Um link de ação no toast — o "e agora?" de um desfecho (AT-372). */
export interface AcaoDoToast {
  rotulo: string;
  aoClicar: () => void;
}

interface ToastOptions {
  title: string;
  message?: string;
  tone?: ToastTone;
  durationMs?: number;
  acao?: AcaoDoToast;
}

export interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
}

const TONE_VAR: Record<ToastTone, string> = {
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  accent: 'var(--accent)',
};

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation('ui');
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  // Os temporizadores vivos: a desmontagem os limpa, senão disparam depois do fim do ambiente (AT-1027).
  const timers = useRef(new Set<number>());
  useEffect(() => {
    const vivos = timers.current;
    return () => {
      for (const id of vivos) window.clearTimeout(id);
      vivos.clear();
    };
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ title, message, tone = 'accent', durationMs = 5000, acao }: ToastOptions) => {
      const id = nextId++;
      setToasts((current) => [...current, { id, title, message, tone, acao }]);
      const timer = window.setTimeout(() => {
        timers.current.delete(timer);
        dismiss(id);
      }, durationMs);
      timers.current.add(timer);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.stack}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={styles.toast}
            style={{ ['--tone-color' as string]: TONE_VAR[toast.tone] }}
          >
            <span className={styles.dot} />
            <div className={styles.content}>
              <div className={styles.title}>{toast.title}</div>
              {toast.message && <div className={styles.message}>{toast.message}</div>}
              {toast.acao && (
                <button
                  type="button"
                  className={styles.acao}
                  onClick={() => {
                    toast.acao?.aoClicar();
                    dismiss(toast.id);
                  }}
                >
                  {toast.acao.rotulo}
                </button>
              )}
            </div>
            <button
              type="button"
              className={styles.close}
              onClick={() => dismiss(toast.id)}
              aria-label={t('toast.closeLabel')}
            >
              <XIcon size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

