import React from "react";
import { Instagram, Phone, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Footer() {
  const navigate = useNavigate();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-pink-500/30 bg-[#0F0F0F] text-white">
      
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row justify-between gap-8">
        
        <div>
          <button
            onClick={() => navigate("/")}
            className="text-2xl font-bold mb-3"
          >
            SMART <span className="text-pink-500">CLUB</span>
          </button>

          <p className="text-sm text-gray-400 max-w-sm">
            Бронирование компьютерных клубов быстро и удобно.
          </p>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">Контакты</h3>

          <div className="space-y-2 text-sm text-gray-300">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-pink-500" />
              <span>Алматы</span>
            </div>

            <div className="flex items-center gap-2">
              <Phone size={16} className="text-pink-500" />
              <span>+7 (771) 362-10-07</span>
            </div>

            <div className="flex items-center gap-2">
              <Instagram size={16} className="text-pink-500" />
              <span>@smartclub</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 text-center py-4 text-xs text-gray-500">
        © {year} Smart Club
      </div>
    </footer>
  );
}