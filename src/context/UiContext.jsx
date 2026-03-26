// src/context/UiContext.jsx
import React, { createContext, useContext, useCallback, useMemo, useState, useEffect } from "react";

/**
 * UiContext: notify(type, message) and showConfirm(options) -> Promise<boolean>
 */

const UiContext = createContext(null);

let nextToastId = 1;

export function UiProvider({ children }) {
  const [toasts, setToasts] = useState([]); // { id, type, message, timeout }
  const [confirmState, setConfirmState] = useState(null);
  // confirmState: { open: true, title, message, confirmText, cancelText, resolve, _html }

  const notify = useCallback((type, message, { timeout = 4500 } = {}) => {
    const id = nextToastId++;
    const t = { id, type, message, timeout };
    setToasts((s) => [t, ...s]);
    setTimeout(() => setToasts((s) => s.filter(x => x.id !== id)), timeout);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((s) => s.filter(t => t.id !== id));
  }, []);

  const showConfirm = useCallback(({ title = "Подтверждение", message = "", confirmText = "Да", cancelText = "Отмена", _html = false } = {}) => {
    return new Promise((resolve) => {
      setConfirmState({
        open: true,
        title,
        message,
        confirmText,
        cancelText,
        resolve,
        _html,
      });
    });
  }, []);

  const handleConfirmClose = useCallback((result) => {
    if (!confirmState) return;
    try { confirmState.resolve(result); } catch (e) {}
    setConfirmState(null);
  }, [confirmState]);

  // expose to window so uiGlobal can use React-driven UI if available
  useEffect(() => {
    window.__REACT_UI_NOTIFY__ = (type, message) => notify(type, message);
    window.__REACT_UI_CONFIRM__ = (opts) => showConfirm(opts);
    return () => {
      try { delete window.__REACT_UI_NOTIFY__; delete window.__REACT_UI_CONFIRM__; } catch {}
    };
  }, [notify, showConfirm]);

  const value = useMemo(() => ({ notify, showConfirm, removeToast }), [notify, showConfirm, removeToast]);

  return (
    <UiContext.Provider value={value}>
      {children}

      {/* Toasts stack (top-right) */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`w-full animate-slide-in-right shadow-lg border ${t.type === "success" ? "bg-green-600 border-green-700" : t.type === "error" ? "bg-red-600 border-red-700" : "bg-gray-800 border-gray-700"} text-white px-4 py-3 rounded-lg`}
            role="status"
          >
            <div className="flex justify-between items-start gap-3">
              <div className="text-sm leading-tight break-words">{t.message}</div>
              <button onClick={() => removeToast(t.id)} className="ml-2 text-white/80 hover:text-white text-xs">✕</button>
            </div>
          </div>
        ))}
      </div>

      {/* Confirm modal */}
      {confirmState && confirmState.open && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => handleConfirmClose(false)} />
          <div className="relative bg-[#0f1720] p-6 rounded-2xl shadow-2xl border border-gray-700 w-[min(520px,92%)] z-10">
            <h3 className="text-lg font-semibold text-white mb-2">{confirmState.title}</h3>
            {/* Если _html === true, рендерим message как HTML (br-переносы) */}
            {confirmState._html ? (
              <div className="text-sm text-gray-300 mb-4" dangerouslySetInnerHTML={{ __html: confirmState.message }} />
            ) : (
              <div className="text-sm text-gray-300 mb-4">{confirmState.message}</div>
            )}
            <div className="flex justify-end gap-3">
              <button onClick={() => handleConfirmClose(false)} className="px-4 py-2 rounded bg-gray-700 text-white">{confirmState.cancelText}</button>
              <button onClick={() => handleConfirmClose(true)} className="px-4 py-2 rounded bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold">{confirmState.confirmText}</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right { animation: slideInRight 240ms ease; }
      `}</style>
    </UiContext.Provider>
  );
}

export function useUi() {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error("useUi must be used within UiProvider");
  return ctx;
}
