// src/components/PackageModal.jsx
import React from "react";

export default function PackageModal({ isOpen, onClose, packages = [], onSelect }) {
  if (!isOpen) return null;

  return (
    <div
      id="package-modal-overlay"
      className="fixed inset-0 bg-black/60 flex items-center justify-center"
      style={{ zIndex: 99999 }}
      onMouseDown={(e) => { if (e.target.id === "package-modal-overlay") onClose(); }}
    >
      <div className="bg-[#1C1C1C] rounded-2xl p-6 w-[420px] text-white border border-pink-600" style={{ zIndex: 100000 }}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Выберите тариф</h3>
          <button onClick={onClose} className="text-gray-400">✕</button>
        </div>

        {(!packages || packages.length === 0) && <div className="text-gray-400">Тарифы отсутствуют</div>}

        <div className="space-y-3 max-h-72 overflow-auto">
          {packages.map((p, idx) => {
            const title = p.service ?? p.title ?? `${p.category ?? ""} ${p.service ?? ""}`;
            const price = p.price ?? "";
            return (
              <div
                key={idx}
                className="p-3 rounded-lg bg-gray-800 flex justify-between items-center cursor-pointer hover:bg-gray-700"
                onClick={() => onSelect(p, idx)}
              >
                <div>
                  <div className="font-medium">{title}</div>
                  {p.unit && <div className="text-xs text-gray-400">{p.unit}</div>}
                </div>
                <div className="text-sm text-pink-300 font-semibold">{price}</div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 text-right">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-700 text-sm">Отмена</button>
        </div>
      </div>
    </div>
  );
}
