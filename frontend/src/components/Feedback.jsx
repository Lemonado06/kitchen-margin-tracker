// App-wide toasts and confirm dialogs; pages use useToast()('Saved') and `if (await useConfirm()({...}))` from hooks.js
import { useCallback, useRef, useState } from 'react';
import { FeedbackContext } from '../hooks';
import Icon from './Icon';
import { Button, Modal } from './ui';

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const resolver = useRef(null);
  const nextId = useRef(0);

  const toast = useCallback((message, tone = 'success') => {
    const id = ++nextId.current;
    setToasts((list) => [...list, { id, message, tone }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 3200);
  }, []);

  const confirm = useCallback((options) => new Promise((resolve) => {
    resolver.current = resolve;
    setDialog(options);
  }), []);

  function close(result) {
    resolver.current?.(result);
    setDialog(null);
  }

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}

      <div className="pointer-events-none fixed bottom-6 right-6 z-[60] flex flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} role="status"
            className="glass-strong pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-100 animate-slide-in-right">
            <span className={`rounded-lg p-1 ${t.tone === 'error' ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
              <Icon name={t.tone === 'error' ? 'alert' : 'check'} className="w-4 h-4" />
            </span>
            {t.message}
          </div>
        ))}
      </div>

      <Modal open={!!dialog} onClose={() => close(false)} title={dialog?.title}>
        <p className="mb-6 text-sm text-slate-300">{dialog?.message}</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => close(false)}>Cancel</Button>
          <Button variant={dialog?.danger === false ? 'primary' : 'danger'} icon={dialog?.danger === false ? 'check' : 'trash'} onClick={() => close(true)}>
            {dialog?.confirmLabel || 'Delete'}
          </Button>
        </div>
      </Modal>
    </FeedbackContext.Provider>
  );
}
