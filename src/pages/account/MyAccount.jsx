// src/pages/account/MyAccount.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "../../components/Navbar";
import MenuModal from "../../components/MenuModal";
import { apiGet, apiPost } from "../../api/api.js";
import { useAuth } from "../../context/AuthContext";
import { useUi } from "../../context/UiContext";
import { formatPhoneForInput, normalizePhoneForSend } from "../../utils/phone";
import { useNavigate } from "react-router-dom";

function formatDateRangeShort(startIso, endIso) {
  try {
    const s = new Date(startIso);
    const e = new Date(endIso);
    const sameDay = s.toDateString() === e.toDateString();
    const sDate = s.toLocaleDateString();
    const sTime = s.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const eTime = e.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return sameDay ? `${sDate}, ${sTime} — ${eTime}` : `${s.toLocaleString()} — ${e.toLocaleString()}`;
  } catch {
    return `${startIso} — ${endIso}`;
  }
}

export default function MyAccount() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();
  const { showConfirm, notify } = useUi();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    password: "",
  });
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState([]);
  const [saving, setSaving] = useState(false);

  // для debounce форматирования телефона
  const [typingTimeout, setTypingTimeout] = useState(null);

  // кэши клубов и мест (как в History.jsx)
  const clubsCache = useRef({});
  const availabilityCache = useRef({});

  // загрузка профиля и активных броней
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        // профиль
        const me = await apiGet("/auth/me");
        if (me.ok) {
          const u = me.data;
          if (mounted) {
            setForm({
              firstName: u.firstName || "",
              lastName: u.lastName || "",
              phone: u.phone ? formatPhoneForInput(u.phone) : "",
              password: "",
            });
          }
        }

        // история
        const r = await apiGet("/booking/history");
        if (r.ok && mounted) {
          const all = r.data?.history ?? [];
          const now = new Date();
          const activeNow = all.filter(
            (x) => x.status === "ACTIVE" && new Date(x.end) > now
          );

          // подтянуть клубы
          const uniqueClubIds = Array.from(
            new Set(activeNow.map((x) => x.clubId).filter(Boolean))
          );
          await Promise.all(
            uniqueClubIds.map(async (id) => {
              if (clubsCache.current[id]) return;
              try {
                const c = await apiGet(`/clubs/${id}`);
                if (c.ok && c.data) clubsCache.current[id] = c.data;
              } catch {
                /* ignore */
              }
            })
          );

          // обогатить названиями клубов и мест
          const enriched = await Promise.all(
            activeNow.map(async (r) => {
              const clubName =
                r.clubName || clubsCache.current[r.clubId]?.name || r.clubId;

              const key = `${r.clubId}::${r.start}::${r.end}`;
              let seatLabels = [];

              if (availabilityCache.current[key]) {
                const rawSeats = availabilityCache.current[key];
                const id2label = {};
                rawSeats.forEach((s) => {
                  if (s && s.id) id2label[s.id] = s.label ?? s.id;
                });
                seatLabels = (r.seatIds || []).map(
                  (id) => id2label[id] ?? id
                );
              } else {
                try {
                  const avail = await apiPost("/booking/availability", {
                    clubId: r.clubId,
                    start: r.start,
                    end: r.end,
                  });
                  const seatsArr = avail?.data?.seats ?? avail?.seats ?? avail;
                  const rawSeats = Array.isArray(seatsArr)
                    ? seatsArr
                    : seatsArr?.seats ?? [];
                  availabilityCache.current[key] = rawSeats;
                  const id2label = {};
                  rawSeats.forEach((s) => {
                    if (s && s.id) id2label[s.id] = s.label ?? s.id;
                  });
                  seatLabels = (r.seatIds || []).map(
                    (id) => id2label[id] ?? id
                  );
                } catch {
                  seatLabels = r.seatIds || [];
                }
              }

              return { ...r, clubName, seatLabels };
            })
          );

          setActive(enriched);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // === телефон: как в Login.jsx + возможность полностью очистить ===
  const handlePhoneChange = (raw) => {
    if (typingTimeout) clearTimeout(typingTimeout);

    // сразу ставим сырое значение (чтобы нормально стиралось)
    setForm((prev) => ({ ...prev, phone: raw }));

    const t = setTimeout(() => {
      const digitsOnly = (raw || "").replace(/\D/g, "");
      // если цифр вообще не осталось — очищаем полностью
      if (!digitsOnly) {
        setForm((prev) => ({ ...prev, phone: "" }));
        return;
      }

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
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  // правила пароля — как в регистрации
  const passwordRules = useMemo(() => {
    const pw = form.password || "";
    return {
      length: pw.length >= 8,
      uppercase: /[A-ZА-ЯЁ]/.test(pw),
      digit: /[0-9]/.test(pw),
    };
  }, [form.password]);

  function firstFailedRuleMessage() {
    const pw = form.password || "";
    if (!pw) return null; // пустое поле — пароль не меняем
    if (!passwordRules.length) return "Password must be at least 8 characters";
    if (!passwordRules.uppercase)
      return "Password must contain at least one uppercase letter";
    if (!passwordRules.digit) return "Password must contain at least one digit";
    return null;
  }

  const hintClass = (ok) =>
    ok
      ? "text-green-400 flex items-center gap-2 text-sm"
      : "text-gray-400 flex items-center gap-2 text-sm";

  const handleSave = async () => {
    const pwError = firstFailedRuleMessage();
    if (pwError) {
      notify("error", pwError);
      return;
    }

    const normalizedPhone = normalizePhoneForSend(form.phone);
    if (!normalizedPhone || normalizedPhone.length !== 11) {
      notify("error", "Пожалуйста, введите корректный номер телефона");
      return;
    }

    const ok = await showConfirm({
      title: "Сохранить изменения профиля?",
      message: "Вы уверены, что хотите сохранить изменения в профиле?",
      confirmText: "Сохранить",
      cancelText: "Отмена",
    });
    if (!ok) return;

    setSaving(true);
    try {
      const res = await apiPost("/auth/update", {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: normalizedPhone,
        password: form.password || undefined,
      });
      if (!res.ok) {
        notify("error", res.data?.error ?? "Ошибка");
      } else {
        notify("success", "Профиль обновлён");
      }
    } catch (err) {
      console.error(err);
      notify("error", "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelReservation = async (id) => {
    const r = active.find((x) => x.id === id);
    const summary = r
      ? `${r.clubName ?? r.clubId}\n${formatDateRangeShort(
          r.start,
          r.end
        )}\n${r.seatLabels?.join(", ") ?? r.seatIds?.join(", ")}`
      : "Вы действительно хотите отменить бронь?";

    const ok = await showConfirm({
      title: "Отмена брони",
      message: summary,
      confirmText: "Да, отменить",
      cancelText: "Отмена",
    });
    if (!ok) return;
    try {
      const res = await apiPost("/booking/cancel", { reservationId: id });
      if (!res.ok) notify("error", res.data?.error ?? "Ошибка");
      else {
        notify("success", "Бронь отменена");
        setActive((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err) {
      console.error(err);
      notify("error", "Ошибка");
    }
  };

  return (
    <div className="min-h-screen bg-[#111] text-white">
      <Navbar onMenuClick={() => setMenuOpen(true)} />
      <MenuModal isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Мой профиль</h1>

        <div className="bg-[#1E1E1E] p-6 rounded-xl mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="w-36 h-36 bg-gray-700 rounded-lg flex items-center justify-center">
                Аватар
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="mb-3">
                <label className="text-sm text-gray-300">Имя</label>
                <input
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  className="w-full p-2 rounded bg-gray-800 text-white"
                />
              </div>
              <div className="mb-3">
                <label className="text-sm text-gray-300">Фамилия</label>
                <input
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  className="w-full p-2 rounded bg-gray-800 text-white"
                />
              </div>
              <div className="mb-3">
                <label className="text-sm text-gray-300">Телефон</label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className="w-full p-2 rounded bg-gray-800 text-white"
                  type="tel"
                  inputMode="tel"
                  maxLength={18}
                />
              </div>
              <div className="mb-3">
                <label className="text-sm text-gray-300">
                  Новый пароль (если менять)
                </label>
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full p-2 rounded bg-gray-800 text-white"
                  autoComplete="new-password"
                />
              </div>

              <div className="mb-4">
                <div className="bg-[#0f0f0f] p-3 rounded border border-gray-800">
                  <div className="text-sm text-gray-300 mb-2">
                    Password requirements:
                  </div>
                  <ul className="space-y-1">
                    <li className={hintClass(passwordRules.length)}>
                      <span className="inline-block w-4">
                        {passwordRules.length ? "✓" : "○"}
                      </span>
                      <span className="ml-2">Minimum 8 characters</span>
                    </li>
                    <li className={hintClass(passwordRules.uppercase)}>
                      <span className="inline-block w-4">
                        {passwordRules.uppercase ? "✓" : "○"}
                      </span>
                      <span className="ml-2">
                        At least one uppercase letter
                      </span>
                    </li>
                    <li className={hintClass(passwordRules.digit)}>
                      <span className="inline-block w-4">
                        {passwordRules.digit ? "✓" : "○"}
                      </span>
                      <span className="ml-2">At least one digit</span>
                    </li>
                  </ul>
                  <div className="text-xs text-gray-500 mt-2">
                    Если поле пароля оставить пустым — текущий пароль останется
                    без изменений.
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 rounded bg-pink-600 text-white"
                >
                  {saving ? "Сохранение..." : "Сохранить"}
                </button>
                <button
                  onClick={() => navigate("/")}
                  className="px-4 py-2 rounded bg-gray-700 text-white"
                >
                  Выйти со страницы
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* --- Активные брони с нормальными карточками --- */}
        <h2 className="text-xl font-bold mb-3">Активные брони</h2>
        {loading ? (
          <div className="text-gray-400">Загрузка...</div>
        ) : active.length === 0 ? (
          <div className="text-gray-400">Активных броней нет</div>
        ) : (
          <div className="space-y-4">
            {active.map((a) => (
              <div
                key={a.id}
                className="bg-[#1E1E1E] p-4 rounded-lg border border-gray-800 flex flex-col md:flex-row md:justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="font-extrabold text-lg tracking-wide mb-1">
                    {a.clubName ?? a.clubId}
                  </div>
                  {a.clubId &&
                    (clubsCache.current[a.clubId]?.address || a.address) && (
                      <div className="text-sm text-gray-400 mb-2">
                        {clubsCache.current[a.clubId]?.address ?? a.address}
                      </div>
                    )}

                  <div className="text-sm text-gray-300 mb-1">
                    Пакет: {a.packageName ?? a.packageId ?? "—"}
                  </div>
                  <div className="text-sm text-gray-300">
                    Время: {formatDateRangeShort(a.start, a.end)}
                  </div>
                  <div className="text-sm text-gray-300 mt-1">
                    Места:{" "}
                    {a.seatLabels && a.seatLabels.length
                      ? a.seatLabels.join(", ")
                      : a.seatIds
                      ? a.seatIds.join(", ")
                      : "—"}
                  </div>
                </div>

                <div className="w-48 flex flex-col items-end justify-between">
                  <div className="text-sm text-gray-400 text-right">
                    <div>
                      Статус:{" "}
                      <span className="font-semibold text-white">
                        {a.status}
                      </span>
                    </div>
                    <div className="mt-2">
                      Стоимость:{" "}
                      <span className="font-semibold text-white">
                        {a.totalPrice ? `${a.totalPrice} ₸` : "—"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 mt-3 md:mt-0">
                    <button
                      onClick={() => handleCancelReservation(a.id)}
                      className="px-3 py-2 rounded bg-red-600 text-white text-sm"
                    >
                      Отменить бронь
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
