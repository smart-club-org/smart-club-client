// src/components/Navbar.jsx
import React from "react";
import { Menu } from "lucide-react";

export default function Navbar({ onMenuClick }) {
  return (
    <nav className="bg-[#111] text-white px-6 py-4 flex justify-between items-center border-b border-pink-600">
      {/* ЛОГО */}
      <div
        className="text-2xl font-bold cursor-pointer select-none"
        onClick={() => (window.location.href = "/")}
      >
        SMART <span className="text-pink-500">CLUB</span>
      </div>

      {/* КНОПКА МЕНЮ */}
      <button
        onClick={onMenuClick}
        className="text-white p-2 rounded hover:bg-white/10 transition"
      >
        <Menu size={28} />
      </button>
    </nav>
  );
}
