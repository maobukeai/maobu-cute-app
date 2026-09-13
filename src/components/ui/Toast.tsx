import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react';
import { sound } from '../../utils/sound';
import { haptics } from '../../utils/haptics';
import { Button } from './Button';

type ToastVariant = 'success' | 'error' | 'info' | 'warn';

interface ToastItem {
  id: number;
  variant: ToastVariant;
  message: string;
}

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

interface ToastAPI {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warn: (message: string) => void;
  /** Promise-based replacement for window.confirm */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ToastContext = createContext<ToastAPI | null>(null);

export function useToast(): ToastAPI {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

const variantIcon: Record<ToastVariant, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warn: AlertTriangle,
};

const variantColor: Record<ToastVariant, string> = {
  success: 'text-ok',
  error: 'text-danger',
  info: 'text-accent',
  warn: 'text-warn',
};

let toastSeq = 1;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timer = timers.current[id];
    if (timer) {
      clearTimeout(timer);
      delete timers.current[id];
    }
  }, []);

  const push = useCallback((variant: ToastVariant, message: string) => {
    const id = toastSeq++;
    setToasts(prev => [...prev.slice(-2), { id, variant, message }]);
    const duration = variant === 'error' ? 3200 : 2400;
    timers.current[id] = setTimeout(() => dismiss(id), duration);
  }, [dismiss]);

  const api = useMemo<ToastAPI>(() => ({
    success: (message) => {
      haptics.notificationSuccess();
      sound.playSuccess();
      push('success', message);
    },
    error: (message) => {
      haptics.notificationError();
      sound.playError();
      push('error', message);
    },
    info: (message) => {
      haptics.impactLight();
      sound.playTap();
      push('info', message);
    },
    warn: (message) => {
      haptics.notificationWarning();
      push('warn', message);
    },
    confirm: (options) => {
      haptics.impactMedium();
      return new Promise<boolean>(resolve => {
        setConfirmState({ ...options, resolve });
      });
    },
  }), [push]);

  const closeConfirm = (result: boolean) => {
    confirmState?.resolve(result);
    setConfirmState(null);
  };

  return (
    <ToastContext.Provider value={api}>
      {children}

      {/* Toast stack — top center, below safe area */}
      <div className="fixed top-0 inset-x-0 z-[120] pt-safe flex flex-col items-center gap-2 pointer-events-none px-6">
        <AnimatePresence>
          {toasts.map(t => {
            const Icon = variantIcon[t.variant];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ y: -64, opacity: 0, scale: 0.92 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -40, opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                className="pointer-events-auto max-w-[340px] mt-2 flex items-center gap-2 rounded-full bg-surface/95 backdrop-blur-xl pl-3 pr-4 py-2.5 shadow-elev-3 border border-line/60 cursor-pointer"
                onClick={() => dismiss(t.id)}
              >
                <Icon className={`w-5 h-5 shrink-0 ${variantColor[t.variant]}`} />
                <span className="text-sub font-medium text-ink leading-snug">{t.message}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Confirm dialog — centered card */}
      <AnimatePresence>
        {confirmState && (
          <motion.div
            key="confirm-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[130] bg-black/45 backdrop-blur-[2px] flex items-center justify-center p-6"
            onClick={() => closeConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 8 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              className="w-full max-w-[320px] bg-surface rounded-3xl p-5 shadow-elev-3 border border-line/50"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-headline font-bold text-ink text-center">{confirmState.title}</h3>
              {confirmState.message && (
                <p className="text-sub text-ink-2 text-center mt-2 leading-relaxed">{confirmState.message}</p>
              )}
              <div className="flex gap-2.5 mt-5">
                <Button variant="neutral" size="md" className="flex-1" onClick={() => closeConfirm(false)}>
                  {confirmState.cancelText ?? '取消'}
                </Button>
                <Button
                  variant={confirmState.danger ? 'danger' : 'primary'}
                  size="md"
                  className="flex-1"
                  onClick={() => closeConfirm(true)}
                >
                  {confirmState.confirmText ?? '确定'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
};
