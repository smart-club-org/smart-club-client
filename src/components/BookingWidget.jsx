// src/components/BookingWidget.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { apiPost } from "../api/api.js";
import { useAuth } from "../context/AuthContext";
import { useUi } from "../context/UiContext";
import { useNavigate } from "react-router-dom";

/** Helpers **/
function pad2(n) { return n.toString().padStart(2, "0"); }
function parsePriceNumber(priceStr) {
  if (!priceStr) return null;
  const m = (priceStr + "").replace(/\s/g, "").match(/(\d{2,})/);
  if (m) return Number(m[1]);
  return null;
}
function isBookablePackage(p) {
  if (!p) return false;
  const text = ((p.service || "") + " " + (p.category || "") + " " + (p.title || "") + " " + (p.price || "")).toLowerCase();
  const blacklist = ["скид", "акц", "акция", "подар", "бесплат", "%", "скидка", "скидки"];
  if (blacklist.some(k => text.includes(k))) return false;
  if (!/(\d)/.test(text) && !/(час|день|ночь|мин)/.test(text)) return false;
  return true;
}
function packageIsVip(pkg) {
  if (!pkg) return false;
  if (pkg.vipOnly) return true;
  const text = ((pkg.service || "") + " " + (pkg.category || "") + " " + (pkg.title || "")).toLowerCase();
  return /vip/.test(text);
}
function buildNextSevenDays() {
  const days = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const label = d.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: '2-digit' });
    const isoDate = `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
    days.push({ label, date: isoDate, dateObj: d });
  }
  return days;
}
function genHourOptions() { return Array.from({ length: 24 }).map((_, i) => i); }
function genMinuteOptions(step = 5) {
  const arr = [];
  for (let m = 0; m < 60; m += step) arr.push(m);
  return arr;
}
function localToUTCisoString(localDateTimeString) {
  if (!localDateTimeString) return null;
  const d = new Date(localDateTimeString);
  return new Date(d.getTime()).toISOString();
}

/**
 * Wheel component (compact)
 */
function Wheel({ options = [], value, onChange, itemHeight = 36, ariaLabel = "" }) {
  const listRef = useRef(null);
  const valueIndex = options.findIndex(o => (typeof o === "object" ? o.value : o) === value);
  const safeIndex = valueIndex >= 0 ? valueIndex : 0;
  const desiredScrollTop = (i) => Math.max(0, i * itemHeight);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: desiredScrollTop(safeIndex), behavior: "auto" });
  }, [safeIndex, itemHeight]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    let timer = null;
    const snap = () => {
      const scrollTop = el.scrollTop;
      const idx = Math.round(scrollTop / itemHeight);
      const clamped = Math.max(0, Math.min(options.length - 1, idx));
      el.scrollTo({ top: desiredScrollTop(clamped), behavior: "smooth" });
      const opt = options[clamped];
      if (opt) {
        const v = (typeof opt === "object" ? opt.value : opt);
        if (v !== value) onChange(v);
      }
    };
    const onScroll = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(snap, 80);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => { if (timer) clearTimeout(timer); el.removeEventListener("scroll", onScroll); };
  }, [options, itemHeight, onChange, value]);

  return (
    <div style={{ width: "100%", display: "flex", justifyContent: "center", position: "relative", overflow: "hidden", height: itemHeight }}>
      <div
        ref={listRef}
        role="listbox"
        aria-label={ariaLabel}
        tabIndex={0}
        style={{
          overflowY: "auto",
          padding: 0,
          margin: 0,
          width: "100%",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
          height: itemHeight,
        }}
        className="wheel-list"
      >
        {options.map((opt, i) => {
          const v = (typeof opt === "object" ? opt.value : opt);
          const label = (typeof opt === "object" ? opt.label : String(opt));
          return (
            <div
              key={i}
              onClick={() => {
                const el = listRef.current;
                if (!el) return;
                const top = desiredScrollTop(i);
                el.scrollTo({ top, behavior: "smooth" });
                const val = v;
                if (val !== value) onChange(val);
              }}
              style={{
                height: itemHeight,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 700,
                color: "white",
                userSelect: "none",
                lineHeight: `${itemHeight}px`,
                padding: "0 6px",
              }}
            >
              {label}
            </div>
          );
        })}
      </div>
      <style>{`.wheel-list::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}

/**
 * CombinedTimePicker: renders two Wheel components (hours + minutes)
 * No center overlay.
 */
function CombinedTimePicker({ hour, minute, onHourChange, onMinuteChange, hourOptions, minuteOptions }) {
  const itemHeight = 36;
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <div style={{ width: 56 }}>
        <Wheel options={hourOptions} value={hour} onChange={v => onHourChange(Number(v))} itemHeight={itemHeight} ariaLabel="Hours" />
      </div>
      <div style={{ width: 56 }}>
        <Wheel options={minuteOptions} value={minute} onChange={v => onMinuteChange(Number(v))} itemHeight={itemHeight} ariaLabel="Minutes" />
      </div>
    </div>
  );
}

/** BookingWidget main **/
export default function BookingWidget({
  club,
  initialPackageId = null,
  initialPackageRaw = null,
  initialSelectedSeatIds = []
}) {
  const { user } = useAuth();
  const { notify, showConfirm } = useUi();
  const navigate = useNavigate();

  const clubId = club?.id ?? club?._id ?? club?.clubId;

  const allPackages = useMemo(() => (club?.prices || []).filter(isBookablePackage), [club?.prices]);
  const [packages, setPackages] = useState(allPackages);
  useEffect(() => setPackages(allPackages), [allPackages]);

  useEffect(() => {
    if (initialPackageRaw) { setPackages([initialPackageRaw]); return; }
    if (initialPackageId && allPackages && allPackages.length) {
      const found = allPackages.find(p => (p.id ?? p.service ?? p.title) === initialPackageId);
      if (found) { setPackages([found]); return; }
    }
    setPackages(allPackages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPackageId, initialPackageRaw, allPackages]);

  const [selectedPackageIdx, setSelectedPackageIdx] = useState(0);
  useEffect(()=> { if (packages.length === 0) setSelectedPackageIdx(-1); else setSelectedPackageIdx(0); }, [packages]);

  const selectedPackage = packages[selectedPackageIdx] ?? null;

  // date/time controls
  const days = useMemo(() => buildNextSevenDays(), []);
  const hourOptions = useMemo(() => genHourOptions(), []);
  const MINUTE_STEP = 5;
  const minuteOptions = useMemo(() => genMinuteOptions(MINUTE_STEP), [MINUTE_STEP]);

  const [selectedDayIso, setSelectedDayIso] = useState(() => days[0]?.date ?? null);

  const getDefaultStart = () => {
    const now = new Date();
    const mins = Math.ceil(now.getMinutes() / MINUTE_STEP) * MINUTE_STEP;
    let h = now.getHours();
    let m = mins;
    if (m === 60) { h = (h+1) % 24; m = 0; }
    return { h, m };
  };
  const ds = getDefaultStart();
  const [startH, setStartH] = useState(ds.h);
  const [startM, setStartM] = useState(ds.m);
  const [endH, setEndH] = useState((ds.h + 1) % 24);
  const [endM, setEndM] = useState(ds.m);

  // seats and availability
  const [seats, setSeats] = useState([]);
  const [loadingAvail, setLoadingAvail] = useState(false);
  const [availError, setAvailError] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState(initialSelectedSeatIds || []);
  useEffect(() => { setSelectedSeats(initialSelectedSeatIds || []); }, [initialSelectedSeatIds]);

  const packagePriceNum = useMemo(() => {
    if (!selectedPackage) return 0;
    if (selectedPackage.price && typeof selectedPackage.price === "number") return selectedPackage.price;
    const parsed = parsePriceNumber(selectedPackage.price);
    return parsed ?? 0;
  }, [selectedPackage]);

  /**
   * NEW: packageType detection:
   * - if package contains explicit timeWindowStart & timeWindowEnd -> treat as 'day' (fixed window)
   * - otherwise fallback to unit/duration heuristics (hour/day)
   */
  const packageType = useMemo(() => {
    if (!selectedPackage) return "hour";
    if (selectedPackage.timeWindowStart && selectedPackage.timeWindowEnd) return "day";
    const unit = (selectedPackage.unit || "").toLowerCase();
    if (unit.includes("день") || unit.includes("днев") || unit.includes("day")) return "day";
    if (unit.includes("час") || unit.includes("ч") || unit.includes("hour")) return "hour";
    if (selectedPackage.durationMinutes && selectedPackage.durationMinutes >= 24*60) return "day";
    return "hour";
  }, [selectedPackage]);

  // If day package with explicit window, we will use that window for start/end calculation.
  const startIsoUTC = useMemo(() => {
    if (!selectedDayIso) return null;
    if (packageType === "day") {
      const tStart = selectedPackage?.timeWindowStart ?? "00:00";
      return localToUTCisoString(`${selectedDayIso}T${tStart}`);
    } else {
      return localToUTCisoString(`${selectedDayIso}T${pad2(startH)}:${pad2(startM)}`);
    }
  }, [selectedDayIso, startH, startM, packageType, selectedPackage]);

  const endIsoUTC = useMemo(() => {
    if (!selectedDayIso) return null;
    if (packageType === "day") {
      const tEnd = selectedPackage?.timeWindowEnd ?? "23:59";
      // if timeWindowEnd is same day and greater than start, keep same day; otherwise if end <= start -> next day
      // we compute based on provided start window
      const startStr = selectedPackage?.timeWindowStart ?? "00:00";
      const startLocal = new Date(`${selectedDayIso}T${startStr}`);
      let endLocal = new Date(`${selectedDayIso}T${tEnd}`);
      if (endLocal.getTime() <= startLocal.getTime()) {
        endLocal = new Date(endLocal.getTime() + 24*60*60*1000);
      }
      return endLocal.toISOString();
    } else {
      let startLocal = new Date(`${selectedDayIso}T${pad2(startH)}:${pad2(startM)}`);
      let endLocal = new Date(`${selectedDayIso}T${pad2(endH)}:${pad2(endM)}`);
      if (endLocal.getTime() <= startLocal.getTime()) {
        endLocal = new Date(endLocal.getTime() + 24*60*60*1000);
      }
      return endLocal.toISOString();
    }
  }, [selectedDayIso, endH, endM, packageType, startH, startM, selectedPackage]);

  const durationHours = useMemo(() => {
    if (!startIsoUTC || !endIsoUTC) return 0;
    const st = new Date(startIsoUTC), en = new Date(endIsoUTC);
    const ms = en.getTime() - st.getTime();
    if (ms <= 0) return 0;
    return ms / (1000 * 60 * 60);
  }, [startIsoUTC, endIsoUTC]);

  const computedTotalPrice = useMemo(() => {
    if (!packagePriceNum || !selectedSeats || selectedSeats.length === 0) return 0;
    const seatsCount = selectedSeats.length;
    if (packageType === "day") {
      const st = new Date(startIsoUTC), en = new Date(endIsoUTC);
      const days = Math.max(1, Math.round((en.getTime() - st.getTime())/(1000*60*60*24)));
      return (packagePriceNum || 0) * seatsCount * days;
    } else {
      return Math.round((packagePriceNum || 0) * seatsCount * durationHours);
    }
  }, [packagePriceNum, selectedSeats, durationHours, packageType, startIsoUTC, endIsoUTC]);

  useEffect(() => {
    async function loadAvailability() {
      if (!clubId || !startIsoUTC || !endIsoUTC) return;
      setLoadingAvail(true);
      setAvailError(null);
      try {
        const body = { clubId, start: startIsoUTC, end: endIsoUTC, durationMinutes: Math.round(durationHours * 60) };
        const res = await apiPost("/booking/availability", body);
        const seatsArr = res?.data?.seats ?? res?.seats ?? res;
        const rawSeats = Array.isArray(seatsArr) ? seatsArr : seatsArr?.seats ?? [];
        const pkgVip = packageIsVip(selectedPackage);
        const filtered = rawSeats.filter(s => {
          if (!s) return false;
          if (pkgVip) return s.isVip === true;
          return !s.isVip;
        });
        setSeats(filtered);
        setSelectedSeats(prev => prev.filter(id => filtered.some(s => s.id === id)));
      } catch (err) {
        console.error("Availability error", err);
        setAvailError(err?.message || "Ошибка загрузки доступности");
        setSeats([]);
      } finally {
        setLoadingAvail(false);
      }
    }
    loadAvailability();
  }, [clubId, startIsoUTC, endIsoUTC, durationHours, selectedPackage]);

  const toggleSeat = (seat) => {
    if (!seat.available) return;
    const exists = selectedSeats.includes(seat.id);
    if (exists) setSelectedSeats(prev => prev.filter(id => id !== seat.id));
    else setSelectedSeats(prev => [...prev, seat.id]);
  };

  const handleReserve = async () => {
    if (!startIsoUTC || !endIsoUTC) { notify("error", "Выберите дату/время."); return; }
    if (!selectedSeats.length) { notify("error", "Выберите хотя бы одно место."); return; }
    if (!user) {
      const ok = await showConfirm({
        title: "Требуется вход",
        message: "Вы должны войти в аккаунт, чтобы забронировать. Перейти на страницу входа?",
        confirmText: "Перейти",
        cancelText: "Отмена"
      });
      if (ok) navigate("/login", { state: { from: `/booking?clubId=${clubId}` } });
      return;
    }
    const computed = computedTotalPrice;
    const summary = [
      `Клуб: ${club?.name ?? clubId}`,
      `Пакет: ${selectedPackage?.service ?? selectedPackage?.title ?? "—"}`,
      `Время: ${new Date(startIsoUTC).toLocaleString()} — ${new Date(endIsoUTC).toLocaleString()}`,
      `Мест: ${selectedSeats.length}`,
      `Стоимость: ${computed ? `${computed} ₸` : "—"}`
    ].join("\n");

    const ok = await showConfirm({ title: "Подтвердите бронирование", message: summary, confirmText: "Подтвердить", cancelText: "Отмена" });
    if (!ok) return;

    try {
      const payload = {
        clubId,
        packageId: selectedPackage?.service ?? selectedPackage?.id ?? selectedPackage?.title,
        seatIds: selectedSeats,
        start: startIsoUTC,
        end: endIsoUTC,
        durationMinutes: Math.round(durationHours * 60),
        totalPrice: computed || undefined
      };
      const res = await apiPost("/booking/reserve", payload);
      if (res?.data?.reservationId || res?.reservationId) {
        notify("success", "Бронирование успешно!");
        try {
          const r = await apiPost("/booking/availability", { clubId, start: startIsoUTC, end: endIsoUTC, durationMinutes: Math.round(durationHours * 60) });
          const seatsArr = r?.data?.seats ?? r?.seats ?? r;
          const rawSeats = Array.isArray(seatsArr) ? seatsArr : seatsArr?.seats ?? [];
          const pkgVip = packageIsVip(selectedPackage);
          const filtered = rawSeats.filter(s => pkgVip ? s.isVip === true : !s.isVip);
          setSeats(filtered);
          setSelectedSeats([]);
        } catch (e) {}
        return;
      }
      if (res?.data?.error || res?.error) {
        notify("error", "Ошибка: " + (res?.data?.error ?? res?.error));
      } else {
        notify("error", "Неожиданный ответ сервера");
      }
    } catch (err) {
      console.error("Reserve error", err);
      notify("error", "Ошибка бронирования: " + (err?.message ?? err));
    }
  };

  // layout helpers
  const cols = 10;
  const seatsByOrder = useMemo(() => {
    const map = {};
    seats.forEach(s => { map[s.order] = s; });
    return map;
  }, [seats]);
  const totalSeatsCount = Math.max(seats.length, 50);
  const hidePackageSelector = (initialPackageRaw || initialPackageId) && packages.length === 1;

  const hourWheelOptions = hourOptions.map(h => ({ value: h, label: pad2(h) }));
  const minuteWheelOptions = minuteOptions.map(m => ({ value: m, label: pad2(m) }));

  return (
    <div className="bg-[#111] p-5 rounded-xl border border-gray-800 text-white">
      <h3 className="text-xl font-bold mb-3">Бронирование</h3>

      {!hidePackageSelector && (
        <div className="mb-4">
          <div className="text-sm text-gray-300 mb-2">Пакет</div>
          <div className="flex gap-2 flex-wrap">
            {packages && packages.length ? (
              packages.map((p, idx) => {
                const title = p.service ?? p.title ?? `${p.category ?? ""} ${p.service ?? ""}`;
                const priceDisplay = p.price ?? "";
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedPackageIdx(idx)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium ${idx === selectedPackageIdx ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white" : "bg-gray-800 text-gray-200"}`}
                  >
                    <div>{title}</div>
                    <div className="text-xs text-gray-300">{priceDisplay}</div>
                  </button>
                );
              })
            ) : (
              <div className="text-gray-400">Пакеты не заданы</div>
            )}
          </div>
        </div>
      )}

      {hidePackageSelector && selectedPackage && (
        <div className="mb-4">
          <div className="text-sm text-gray-300 mb-1">Выбранный пакет</div>
          <div className="inline-block px-3 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 text-white">
            {selectedPackage.service ?? selectedPackage.title}
            <div className="text-xs text-white/80">{selectedPackage.price ?? ""}</div>
          </div>
        </div>
      )}

      {/* Date & Time selectors */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
        <div>
          <label className="block text-sm text-gray-300 mb-1">День (макс неделя)</label>
          <select value={selectedDayIso} onChange={(e) => setSelectedDayIso(e.target.value)} className="w-full p-2 rounded bg-gray-800 text-white">
            {days.map(d => <option key={d.date} value={d.date}>{d.label}</option>)}
          </select>
        </div>

        {packageType === "hour" && (
          <>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Начало</label>
              <div style={{ position: "relative", height: 36 }}>
                <CombinedTimePicker
                  hour={startH} minute={startM}
                  onHourChange={(v) => setStartH(Number(v))}
                  onMinuteChange={(v) => setStartM(Number(v))}
                  hourOptions={hourWheelOptions}
                  minuteOptions={minuteWheelOptions}
                />
              </div>
              <div className="text-xs text-gray-400 mt-1">Шаг: {MINUTE_STEP} мин</div>
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">Окончание</label>
              <div style={{ position: "relative", height: 36 }}>
                <CombinedTimePicker
                  hour={endH} minute={endM}
                  onHourChange={(v) => setEndH(Number(v))}
                  onMinuteChange={(v) => setEndM(Number(v))}
                  hourOptions={hourWheelOptions}
                  minuteOptions={minuteWheelOptions}
                />
              </div>
              <div className="text-xs text-gray-400 mt-1">Если окончание раньше начала — будет считаться на следующий день</div>
            </div>
          </>
        )}

        {packageType === "day" && (
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-300 mb-1">Промежуток (фиксированный для пакета)</label>
            <div className="p-2 rounded bg-gray-800 text-white">
              <div className="text-sm">{selectedPackage?.timeWindowStart ?? "00:00"} — {selectedPackage?.timeWindowEnd ?? "23:59"}</div>
              <div className="text-xs text-gray-400">Выбранный день будет забронирован на этот промежуток автоматически</div>
            </div>
          </div>
        )}
      </div>

      {/* seats */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-gray-300">Места</div>
          <div className="text-sm text-gray-400">{loadingAvail ? "Загрузка..." : `${seats.filter(s => s.available).length ?? 0} свободно`}</div>
        </div>

        {availError && <div className="text-red-400 text-sm mb-2">{availError}</div>}

        <div className="bg-gray-900 p-3 rounded">
          <div className="mb-3 h-40 bg-gradient-to-r from-purple-800 to-pink-800 rounded flex items-center justify-center text-white/60">
            <div>Карта зала (placeholder)</div>
          </div>

          <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
            {Array.from({ length: totalSeatsCount }).map((_, idx) => {
              const order = idx + 1;
              const s = seatsByOrder[order];
              if (!s) return <div key={idx} className="p-2 rounded bg-gray-800/40" />;
              const isSelected = selectedSeats.includes(s.id);
              const baseClass = "text-sm p-2 rounded flex flex-col items-center justify-center";
              const cls = !s.available ? "bg-red-700 text-white/90 opacity-90 cursor-not-allowed" : (isSelected ? "bg-green-600 text-white" : "bg-green-800/80 text-white");
              return (
                <button
                  key={s.id}
                  onClick={() => toggleSeat(s)}
                  className={`${baseClass} ${cls}`}
                  disabled={!s.available}
                  title={`${s.label}${s.isVip ? " (VIP)" : ""}${s.available ? "" : " — занято"}`}
                >
                  <div className="font-semibold">{s.label}</div>
                  {s.isVip && <div className="text-xs mt-1 px-1 rounded bg-yellow-600/70 text-black">VIP</div>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* bottom */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm text-gray-300">Выбрано: {selectedSeats.length}</div>
          <div className="text-lg font-bold">{computedTotalPrice ? `${computedTotalPrice} ₸` : "—"}</div>
          <div className="text-xs text-gray-400">Длительность: {packageType === "day" ? `${Math.max(1, Math.round((new Date(endIsoUTC).getTime() - new Date(startIsoUTC).getTime())/(1000*60*60*24)))} д` : `${durationHours.toFixed(2)} ч`}</div>
        </div>

        <div className="flex items-center gap-3">
          {!user && <div className="text-xs text-gray-400">Войдите, чтобы бронировать</div>}
          <button onClick={handleReserve} disabled={!user || !selectedSeats.length} className={`px-4 py-2 rounded-lg font-semibold text-white ${!user || !selectedSeats.length ? "bg-gray-600" : "bg-gradient-to-r from-pink-500 to-purple-500"}`}>
            Забронировать
          </button>
        </div>
      </div>
    </div>
  );
}
