// src/pages/history/History.jsx
import React, { useEffect, useState, useRef } from "react";
import Navbar from "../../components/Navbar";
import MenuModal from "../../components/MenuModal";
import { apiGet, apiPost } from "../../api/api.js";
import { useNavigate } from "react-router-dom";
import { useUi } from "../../context/UiContext";

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

export default function History() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelling, setCancelling] = useState({});
  const [clearing, setClearing] = useState(false);
  const navigate = useNavigate();
  const { showConfirm, notify } = useUi();

  // caches to avoid duplicate requests
  const clubsCache = useRef({});
  const availabilityCache = useRef({});

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet("/booking/history");
      if (!res.ok) {
        setError(res.data?.error ?? "Ошибка загрузки");
        setHistory([]);
        return;
      }
      const raw = res.data?.history ?? [];

      // collect unique clubIds
      const uniqueClubIds = Array.from(new Set(raw.map(r => r.clubId).filter(Boolean)));

      // fetch clubs (cache-aware)
      await Promise.all(uniqueClubIds.map(async id => {
        if (clubsCache.current[id]) return;
        try {
          const c = await apiGet(`/clubs/${id}`);
          if (c.ok && c.data) clubsCache.current[id] = c.data;
        } catch (e) { /* ignore */ }
      }));

      // enrich each reservation with clubName and seatLabels
      const enriched = await Promise.all(raw.map(async r => {
        const clubName = r.clubName || (clubsCache.current[r.clubId]?.name) || r.clubId;
        // availability cache key: clubId + start + end
        const key = `${r.clubId}::${r.start}::${r.end}`;
        let seatLabels = [];
        if (availabilityCache.current[key]) {
          const rawSeats = availabilityCache.current[key];
          const id2label = {};
          rawSeats.forEach(s => { if (s && s.id) id2label[s.id] = s.label ?? s.id; });
          seatLabels = (r.seatIds || []).map(id => id2label[id] ?? id);
        } else {
          try {
            const avail = await apiPost("/booking/availability", { clubId: r.clubId, start: r.start, end: r.end });
            const seatsArr = avail?.data?.seats ?? avail?.seats ?? avail;
            const rawSeats = Array.isArray(seatsArr) ? seatsArr : seatsArr?.seats ?? [];
            availabilityCache.current[key] = rawSeats;
            const id2label = {};
            rawSeats.forEach(s => { if (s && s.id) id2label[s.id] = s.label ?? s.id; });
            seatLabels = (r.seatIds || []).map(id => id2label[id] ?? id);
          } catch (e) {
            seatLabels = r.seatIds || [];
          }
        }
        return { ...r, clubName, seatLabels };
      }));

      setHistory(enriched);
    } catch (err) {
      console.error(err);
      setError(err.message || "Ошибка");
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadHistory(); }, []);

  const handleCancel = async (reservationId) => {
    const r = history.find(h => h.id === reservationId);
    const summary = r ? `${r.clubName ?? r.clubId}\n${formatDateRangeShort(r.start, r.end)}\n${r.seatLabels?.join(", ") ?? r.seatIds?.join(", ")}` : "Отменить бронь?";
    const ok = await showConfirm({ title: "Отмена брони", message: summary, confirmText: "Да, отменить", cancelText: "Отмена" });
    if (!ok) return;
    setCancelling(prev => ({ ...prev, [reservationId]: true }));
    try {
      const res = await apiPost("/booking/cancel", { reservationId });
      if (!res.ok) notify("error", res.data?.error ?? "Ошибка отмены");
      else {
        notify("success", "Бронь отменена");
        setHistory(prev => prev.map(it => it.id === reservationId ? { ...it, status: "CANCELLED" } : it));
      }
    } catch (err) {
      console.error(err);
      notify("error", "Ошибка отмены");
    } finally {
      setCancelling(prev => ({ ...prev, [reservationId]: false }));
    }
  };

  const handleRepeat = (r) => {
    const url = `/booking?clubId=${encodeURIComponent(r.clubId)}&packageId=${encodeURIComponent(r.packageId ?? "")}`;
    navigate(url, { state: { selectedPackage: null, selectedSeatIds: r.seatIds } });
  };

  const handleClear = async () => {
    const ok = await showConfirm({ title: "Очистить историю", message: "Удалить все прошедшие/отменённые брони из вашей истории? Это действие необратимо.", confirmText: "Удалить", cancelText: "Отмена" });
    if (!ok) return;
    setClearing(true);
    try {
      const res = await apiPost("/booking/clear-past", {});
      if (res.ok) {
        notify("success", `Удалено: ${res.data?.removed ?? 0}`);
        await loadHistory();
      } else {
        notify("error", res.data?.error ?? "Ошибка очистки истории");
      }
    } catch (err) {
      console.error(err);
      notify("error", "Ошибка при запросе");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111] text-white">
      <Navbar onMenuClick={() => setMenuOpen(true)} />
      <MenuModal isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">История бронирований</h1>
          <div>
            <button onClick={handleClear} disabled={clearing} className={`px-3 py-2 rounded ${clearing ? "bg-red-500/60" : "bg-red-600"} text-white text-sm`}>
              {clearing ? "Удаление..." : "Очистить историю"}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-gray-400">Загрузка...</div>
        ) : error ? (
          <div className="text-red-400">{error}</div>
        ) : history.length === 0 ? (
          <div className="text-gray-400">Прошлых броней нет</div>
        ) : (
          <div className="space-y-4">
            {history.map((r) => (
              <div key={r.id} className="bg-[#1E1E1E] p-4 rounded-lg border border-gray-800 flex flex-col md:flex-row md:justify-between gap-4">
                <div className="flex-1">
                  <div className="font-extrabold text-lg tracking-wide mb-1">{r.clubName ?? r.clubId}</div>
                  {r.clubId && (clubsCache.current[r.clubId]?.address || r.address) && (
                    <div className="text-sm text-gray-400 mb-2">{clubsCache.current[r.clubId]?.address ?? r.address}</div>
                  )}
                  <div className="text-sm text-gray-300 mb-1">Пакет: {r.packageName ?? r.packageId ?? "—"}</div>
                  <div className="text-sm text-gray-300">Время: {formatDateRangeShort(r.start, r.end)}</div>
                  <div className="text-sm text-gray-300 mt-1">Места: {r.seatLabels && r.seatLabels.length ? r.seatLabels.join(", ") : (r.seatIds ? r.seatIds.join(", ") : "—")}</div>
                </div>

                <div className="w-48 flex flex-col items-end justify-between">
                  <div className="text-sm text-gray-400 text-right">
                    <div>Статус: <span className="font-semibold text-white">{r.status}</span></div>
                    <div className="mt-2">Стоимость: <span className="font-semibold text-white">{r.totalPrice ? `${r.totalPrice} ₸` : "—"}</span></div>
                  </div>

                  <div className="flex flex-col gap-2 mt-3 md:mt-0">
                    {r.status !== "CANCELLED" && new Date(r.end) > new Date() ? (
                      <button onClick={() => handleCancel(r.id)} disabled={cancelling[r.id]} className="px-3 py-2 rounded bg-red-600 text-white">
                        {cancelling[r.id] ? "Отмена..." : "Отменить"}
                      </button>
                    ) : (
                      <div className="text-xs text-gray-400">Прошло / Отменено</div>
                    )}

                    <button onClick={() => handleRepeat(r)} className="px-3 py-2 rounded bg-pink-600 text-white">Повторить бронь</button>
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
