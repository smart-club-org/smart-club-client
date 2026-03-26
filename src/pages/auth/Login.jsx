// src/pages/auth/Login.jsx
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { formatPhoneForInput, normalizePhoneForSend } from "../../utils/phone";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [form, setForm] = useState({ phone: "", password: "" });
  const [error, setError] = useState("");
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/";

  const { doLogin } = useAuth();

  const handlePhoneChange = (raw) => {
    if (typingTimeout) clearTimeout(typingTimeout);
    setForm((prev) => ({ ...prev, phone: raw }));

    const t = setTimeout(() => {
      const formatted = formatPhoneForInput(raw);
      setForm((prev) => ({ ...prev, phone: formatted }));
      requestAnimationFrame(() => {
        try {
          const el = document.activeElement;
          if (el && el.setSelectionRange) {
            const pos = formatted.length;
            el.setSelectionRange(pos, pos);
          }
        } catch {}
      });
    }, 120);
    setTypingTimeout(t);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "phone") {
      handlePhoneChange(value);
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onKeyDownPhone = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleSubmit = async () => {
    setError("");
    try {
      const payload = {
        phone: normalizePhoneForSend(form.phone),
        password: form.password,
      };
      await doLogin(payload);
      navigate(from);
    } catch (err) {
      console.error("Login error:", err);
      setError(err?.message || "Login failed — check phone and password.");
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-900">
      <div className="w-96 p-8 bg-gray-800 rounded-2xl border border-fuchsia-600">
        <h2 className="text-3xl font-bold text-center text-white mb-6">Log In</h2>

        {error && <p className="text-red-400 text-center mb-3">{error}</p>}

        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex flex-col space-y-4"
          autoComplete="on"
        >
          <input
            type="tel"
            inputMode="tel"
            name="phone"
            placeholder="+7 (XXX) XXX-XX-XX"
            value={form.phone}
            onChange={handleChange}
            onKeyDown={onKeyDownPhone}
            autoComplete="tel"
            maxLength={18}
            className="p-3 rounded-lg bg-gray-700 text-white"
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
              className="p-3 rounded-lg bg-gray-700 text-white pr-12 w-full"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            className="py-3 rounded-full text-white font-semibold bg-gradient-to-r from-pink-500 to-purple-500"
          >
            Log In
          </button>
        </form>

        <div className="flex justify-center text-sm text-pink-400 mt-3">
          <a href="/register">Sign up</a>
        </div>
      </div>
    </div>
  );
}
