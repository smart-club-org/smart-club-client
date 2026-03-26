// src/pages/auth/Register.jsx
import React, { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { formatPhoneForInput, normalizePhoneForSend } from "../../utils/phone";
import { Eye, EyeOff } from "lucide-react";

export default function Register() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const navigate = useNavigate();
  const { register } = useAuth();

  const handlePhoneChange = (raw) => {
    const formatted = formatPhoneForInput(raw);
    setForm((f) => ({ ...f, phone: formatted }));
    requestAnimationFrame(() => {
      try {
        const el = document.activeElement;
        if (el && el.setSelectionRange) {
          const pos = formatted.length;
          el.setSelectionRange(pos, pos);
        }
      } catch {}
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "phone") {
      handlePhoneChange(value);
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  const passwordRules = useMemo(() => {
    const pw = form.password || "";
    return {
      length: pw.length >= 8,
      uppercase: /[A-ZА-ЯЁ]/.test(pw),
      digit: /[0-9]/.test(pw),
    };
  }, [form.password]);

  function firstFailedRuleMessage() {
    if (!passwordRules.length) return "Password must be at least 8 characters";
    if (!passwordRules.uppercase) return "Password must contain at least one uppercase letter";
    if (!passwordRules.digit) return "Password must contain at least one digit";
    return null;
  }

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError("");

    const pwErr = firstFailedRuleMessage();
    if (pwErr) {
      setError(pwErr);
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const normalizedPhone = normalizePhoneForSend(form.phone);
    if (!normalizedPhone || normalizedPhone.length < 11) {
      setError("Please enter a valid phone number");
      return;
    }

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: normalizedPhone,
      password: form.password,
    };

    try {
      setLoading(true);
      await register(payload);
      navigate("/login");
    } catch (err) {
      console.error("Register failed:", err);
      setError(err?.message || "Registration failed. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  const hintClass = (ok) =>
    ok ? "text-green-400 flex items-center gap-2 text-sm" : "text-gray-400 flex items-center gap-2 text-sm";

  return (
    <div className="flex justify-center items-center h-screen bg-gray-900">
      <div className="w-96 p-8 bg-gray-800 rounded-2xl border border-fuchsia-600">
        <h2 className="text-3xl font-bold text-center text-white mb-6">Register</h2>

        {error && <p className="text-red-400 text-center mb-3">{error}</p>}

        <form onSubmit={(e) => e.preventDefault()} className="flex flex-col space-y-4">
          <input
            type="text"
            name="firstName"
            placeholder="First name"
            value={form.firstName}
            onChange={handleChange}
            className="p-3 rounded-lg bg-gray-700 text-white"
            autoComplete="given-name"
          />
          <input
            type="text"
            name="lastName"
            placeholder="Last name"
            value={form.lastName}
            onChange={handleChange}
            className="p-3 rounded-lg bg-gray-700 text-white"
            autoComplete="family-name"
          />
          <input
            type="tel"
            inputMode="tel"
            name="phone"
            placeholder="+7 (XXX) XXX-XX-XX"
            value={form.phone}
            onChange={handleChange}
            autoComplete="tel"
            maxLength="18"
            className="p-3 rounded-lg bg-gray-700 text-white"
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              className="w-full p-3 rounded-lg bg-gray-700 text-white pr-12"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              name="confirmPassword"
              placeholder="Confirm password"
              value={form.confirmPassword}
              onChange={handleChange}
              className="w-full p-3 rounded-lg bg-gray-700 text-white pr-12"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300"
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="bg-[#0f0f0f] p-3 rounded border border-gray-800">
            <div className="text-sm text-gray-300 mb-2">Password requirements:</div>
            <ul className="space-y-1">
              <li className={hintClass(passwordRules.length)}>
                <span className="inline-block w-4">{passwordRules.length ? "✓" : "○"}</span>
                <span className="ml-2">Minimum 8 characters</span>
              </li>
              <li className={hintClass(passwordRules.uppercase)}>
                <span className="inline-block w-4">{passwordRules.uppercase ? "✓" : "○"}</span>
                <span className="ml-2">At least one uppercase letter</span>
              </li>
              <li className={hintClass(passwordRules.digit)}>
                <span className="inline-block w-4">{passwordRules.digit ? "✓" : "○"}</span>
                <span className="ml-2">At least one digit</span>
              </li>
            </ul>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className={`py-3 rounded-full text-white font-semibold ${loading ? "bg-gray-600" : "bg-gradient-to-r from-pink-500 to-purple-500"}`}
          >
            {loading ? "Registering..." : "Sign Up"}
          </button>
        </form>

        <div className="text-center mt-4">
          <Link to="/login" className="text-pink-400 text-sm hover:underline">
            Already have an account? Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
