// src/utils/uiGlobal.js
// Import this early (in index.jsx) before React render.

function createSimpleToast(message) {
  const wrapper = document.createElement("div");
  wrapper.className = "fixed top-4 right-4 z-[99999] max-w-sm";
  wrapper.style.pointerEvents = "auto";
  wrapper.innerHTML = `
    <div style="background:#1f2937;color:white;padding:12px 16px;border-radius:10px;box-shadow:0 6px 18px rgba(0,0,0,0.4);font-family:Inter, system-ui, -apple-system;">
      ${String(message)}
    </div>
  `;
  document.body.appendChild(wrapper);
  setTimeout(() => wrapper.remove(), 4000);
}

function showNativeModal({ title = "Подтвердите действие", message = "", confirmText = "Да", cancelText = "Отмена" }) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:2147483646;";
    const box = document.createElement("div");
    box.style.cssText = "background:#0b1220;color:#fff;padding:20px;border-radius:12px;max-width:560px;width:90%;box-shadow:0 6px 24px rgba(0,0,0,0.6);font-family:Inter, system-ui, -apple-system;";
    box.innerHTML = `
      <div style="font-weight:600;font-size:18px;margin-bottom:6px">${title}</div>
      <div style="color:#cbd5e1;margin-bottom:14px">${message}</div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button id="g_confirm_cancel" style="background:#374151;color:white;padding:8px 12px;border-radius:8px;border:none">${cancelText}</button>
        <button id="g_confirm_ok" style="background:linear-gradient(90deg,#ec4899,#7c3aed);color:white;padding:8px 12px;border-radius:8px;border:none">${confirmText}</button>
      </div>
    `;
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const cleanup = () => { try { overlay.remove(); } catch {} };

    overlay.querySelector("#g_confirm_ok").addEventListener("click", () => { cleanup(); resolve(true); });
    overlay.querySelector("#g_confirm_cancel").addEventListener("click", () => { cleanup(); resolve(false); });
    overlay.addEventListener("click", (e) => { if (e.target === overlay) { cleanup(); resolve(false); } });
  });
}

export function customAlert(message) {
  try {
    if (window.__REACT_UI_NOTIFY__ && typeof window.__REACT_UI_NOTIFY__ === "function") {
      window.__REACT_UI_NOTIFY__("info", String(message));
      return;
    }
  } catch (e) {}
  createSimpleToast(message);
}

export function customConfirm(opts) {
  if (typeof opts === "string") opts = { message: opts };
  return new Promise(async (resolve) => {
    try {
      if (window.__REACT_UI_CONFIRM__ && typeof window.__REACT_UI_CONFIRM__ === "function") {
        const r = await window.__REACT_UI_CONFIRM__(opts);
        resolve(Boolean(r));
        return;
      }
    } catch (e) {}
    const r = await showNativeModal(opts);
    resolve(Boolean(r));
  });
}

// attach globally for convenience
window.customAlert = customAlert;
window.customConfirm = customConfirm;
