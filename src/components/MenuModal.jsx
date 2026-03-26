// src/components/MenuModal.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function MenuModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    function handleClick(e) {
      if (e.target.id === "menu-overlay") {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      id="menu-overlay"
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50"
    >
      <div className="bg-[#1C1C1C] border-2 border-pink-500 rounded-2xl px-10 py-8 shadow-2xl w-[350px] text-center">
        <h2 className="text-white text-3xl font-bold mb-6">МЕНЮ</h2>

        {/* 🔥 Главная — добавлено */}
        <button
          onClick={() => {
            navigate("/");
            onClose();
          }}
          className="w-full py-3 mb-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl"
        >
          ГЛАВНАЯ
        </button>

        {!user && (
          <>
            <button
              onClick={() => { navigate("/login"); onClose(); }}
              className="w-full py-3 mb-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl"
            >
              ВОЙТИ
            </button>

            <button
              onClick={() => { navigate("/register"); onClose(); }}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl"
            >
              РЕГИСТРАЦИЯ
            </button>
          </>
        )}

        {user && (
          <>
            <button
              onClick={() => { navigate("/account"); onClose(); }}
              className="w-full py-3 mb-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl"
            >
              МОЙ АККАУНТ
            </button>

            <button
              onClick={() => { navigate("/history"); onClose(); }}
              className="w-full py-3 mb-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl"
            >
              ИСТОРИЯ БРОНЕЙ
            </button>

            <button
              onClick={() => { logout(); onClose(); navigate("/"); }}
              className="w-full py-3 bg-gray-700 text-white font-semibold rounded-xl"
            >
              ВЫЙТИ
            </button>
          </>
        )}
      </div>
    </div>
  );
}
