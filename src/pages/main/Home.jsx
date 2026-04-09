// src/pages/main/Home.jsx
import React, { useEffect, useRef, useState } from "react";
import { MapPin, ChevronLeft, ChevronRight } from "lucide-react";  // new 
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../../api/api.js";
import Navbar from "../../components/Navbar";
import MenuModal from "../../components/MenuModal";
import Footer from "../../components/Footer";

const markerIcon = new L.Icon({
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function chunkArray(arr, size) {
  const res = [];
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
  return res;
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [activeMarkerId, setActiveMarkerId] = useState(null);
  const navigate = useNavigate();

  const [itemsPerPage, setItemsPerPage] = useState(4);
  const [pageIndex, setPageIndex] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await apiGet("/clubs");
        const data = Array.isArray(res) ? res : res?.data ?? res;
        if (mounted) {
          if (Array.isArray(data)) {
            setClubs(data);
          } else {
            console.warn("Unexpected /clubs response shape:", data);
            setClubs([]);
          }
        }
      } catch (err) {
        console.error("Ошибка загрузки клубов:", err);
        if (mounted) {
          setLoadError(err.message || "Ошибка загрузки");
          setClubs([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, []);

  useEffect(() => {
    function update() {
      const w = window.innerWidth;
      if (w < 640) {
        setItemsPerPage(1);
      } else {
        setItemsPerPage(4);
      }
      setPageIndex(0);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const pages = chunkArray(clubs, itemsPerPage);
  const totalPages = Math.max(1, pages.length);

  useEffect(() => {
    if (pageIndex >= totalPages) setPageIndex(totalPages - 1);
  }, [totalPages, pageIndex]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const drag = { active: false, startX: 0, deltaX: 0 };

    const onPointerDown = (e) => {
      drag.active = true;
      drag.startX = (e.clientX ?? (e.touches && e.touches[0].clientX) ?? 0);
      drag.deltaX = 0;
      el.style.transition = "none";
    };

    const onPointerMove = (e) => {
      if (!drag.active) return;
      const x = (e.clientX ?? (e.touches && e.touches[0].clientX) ?? 0);
      drag.deltaX = x - drag.startX;
      const viewportW = el.parentElement.clientWidth || window.innerWidth;
      const percentDelta = (drag.deltaX / viewportW) * 100;
      const containerPercent = -(pageIndex * 100) / totalPages + (percentDelta / totalPages);
      el.style.transform = `translateX(${containerPercent}%)`;
    };

    const onPointerUp = () => {
      if (!drag.active) return;
      const dx = drag.deltaX;
      const threshold = 50;
      el.style.transition = "transform 300ms ease";
      if (dx < -threshold && pageIndex < totalPages - 1) {
        setPageIndex((p) => p + 1);
      } else if (dx > threshold && pageIndex > 0) {
        setPageIndex((p) => p - 1);
      } else {
        const percent = -(pageIndex * 100) / totalPages;
        el.style.transform = `translateX(${percent}%)`;
      }
      drag.active = false;
      drag.startX = 0;
      drag.deltaX = 0;
    };

    el.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    el.addEventListener("touchstart", onPointerDown, { passive: true });
    window.addEventListener("touchmove", onPointerMove, { passive: true });
    window.addEventListener("touchend", onPointerUp);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("touchstart", onPointerDown);
      window.removeEventListener("touchmove", onPointerMove);
      window.removeEventListener("touchend", onPointerUp);
    };
  }, [pageIndex, totalPages]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.style.transition = "transform 300ms ease";
    const percent = -(pageIndex * 100) / totalPages;
    el.style.transform = `translateX(${percent}%)`;
  }, [pageIndex, totalPages]);

  const goPrev = () => setPageIndex((p) => Math.max(0, p - 1));
  const goNext = () => setPageIndex((p) => Math.min(totalPages - 1, p + 1));

  const openClub = (club) => navigate(`/clubs/${club.id}`);

  const almatyCenter = [43.238949, 76.889709];

  return (
    <div className="min-h-screen bg-[#151515] text-white font-sans">
      <Navbar onMenuClick={() => setMenuOpen(true)} />
      <MenuModal isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="max-w-6xl mx-auto px-6 pt-8">
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2 bg-[#2A2A2A] px-4 py-2 rounded-full">
            <MapPin size={16} />
            <span>Алматы</span>
          </div>
        </div>

        <div className="mb-6 text-center">
  <h2 className="text-3xl md:text-4xl font-bold text-white">
        Выберите компьютерный клуб
      </h2>
      <p className="mt-3 text-sm md:text-base text-gray-400">
        Найдите удобный клуб и начните бронирование
      </p>
    </div>

        <div className="relative mb-10 overflow-hidden rounded-[28px] border border-white/5 bg-[#111111] px-5 py-8 md:px-8 md:py-10 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
          <button
            onClick={goPrev}
            className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md transition hover:scale-105 hover:bg-white/10"
            aria-label="Предыдущая страница"
          >
            <ChevronLeft size={24} className="text-white" />
          </button>

          <button
            onClick={goNext}
            className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md transition hover:scale-105 hover:bg-white/10"
            aria-label="Следующая страница"
          >
            <ChevronRight size={24} className="text-white" />
          </button>

          <div className="overflow-hidden">
            <div
              ref={containerRef}
              className="flex w-full"
              style={{
                width: `${totalPages * 100}%`,
                transform: `translateX(${-(pageIndex * 100) / totalPages}%)`,
              }}
            >
              {pages.length === 0 ? (
                <div className="w-full p-2">
                  {loading ? (
                    <div className="py-10 text-center text-gray-400">Загрузка...</div>
                  ) : loadError ? (
                    <div className="py-10 text-center text-red-400">Ошибка: {loadError}</div>
                  ) : (
                    <div className="py-10 text-center text-gray-400">Клубы не найдены</div>
                  )}
                </div>
              ) : (
                pages.map((pageItems, pIdx) => (
                  <div
                    key={pIdx}
                    className="w-full p-2"
                    style={{ width: `${100 / totalPages}%` }}
                  >
                    <div
                      className={`grid gap-5 ${
                        itemsPerPage === 1 ? "grid-cols-1" : "grid-cols-2 grid-rows-2"
                      }`}
                    >
                      {pageItems.map((club, idx) => {
                        const isPink = (pIdx * itemsPerPage + idx) % 2 === 0;

                        return (
                          <div
                            key={club.id ?? idx}
                            onClick={() => openClub(club)}
                            className={`group cursor-pointer rounded-[24px] border p-5 md:p-6 transition-all duration-300 hover:-translate-y-1 ${
                              isPink
                                ? "border-fuchsia-500/70 shadow-[0_0_30px_rgba(217,70,239,0.18)] hover:shadow-[0_0_38px_rgba(217,70,239,0.28)]"
                                : "border-violet-500/70 shadow-[0_0_30px_rgba(139,92,246,0.18)] hover:shadow-[0_0_38px_rgba(139,92,246,0.28)]"
                            } bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.06),_rgba(255,255,255,0.01)_45%,_rgba(0,0,0,0.08)_100%)]`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <h3 className="truncate text-2xl font-extrabold text-white transition group-hover:text-pink-300">
                                  {club.name}
                                </h3>
                                <p className="mt-3 text-base text-gray-400">
                                  {club.address}
                                </p>
                              </div>

                              <div className="shrink-0 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-sm text-emerald-300">
                                Открыт
                              </div>
                            </div>

                            <div className="my-5 h-px bg-white/10" />

                            <div className="flex items-center justify-end">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openClub(club);
                                }}
                                className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition ${
                                  isPink
                                    ? "bg-gradient-to-r from-pink-500 to-fuchsia-600 hover:from-pink-400 hover:to-fuchsia-500"
                                    : "bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500"
                                }`}
                              >
                                Подробнее
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {itemsPerPage > pageItems.length &&
                        Array.from({ length: itemsPerPage - pageItems.length }).map(
                          (_, i) => (
                            <div
                              key={`empty-${i}`}
                              className="rounded-[24px] border border-transparent bg-transparent"
                            />
                          )
                        )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-7 flex justify-center gap-3">
            {Array.from({ length: totalPages }).map((_, p) => (
              <button
                key={p}
                onClick={() => setPageIndex(p)}
                className={`h-3 w-3 rounded-full transition ${
                  p === pageIndex
                    ? "scale-110 bg-pink-500 shadow-[0_0_12px_rgba(236,72,153,0.8)]"
                    : "bg-gray-600 hover:bg-gray-500"
                }`}
                aria-label={`page-${p + 1}`}
              />
            ))}
          </div>
        </div>

        <p className="text-center text-sm text-gray-400 mb-3">или укажите на карте:</p>

        <div className="border-2 border-pink-500 rounded-xl overflow-hidden mb-12">
          <MapContainer center={almatyCenter} zoom={12} scrollWheelZoom={true} style={{ height: "480px", width: "100%" }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {clubs.filter((c) => c.latitude && c.longitude).map((club) => (
              <Marker key={club.id} position={[club.latitude, club.longitude]} icon={markerIcon} eventHandlers={{
                click: (e) => {
                  if (activeMarkerId === club.id) {
                    navigate(`/clubs/${club.id}`);
                  } else {
                    setActiveMarkerId(club.id);
                    try { e.target.openPopup(); } catch {}
                  }
                },
                mouseover: (e) => { setActiveMarkerId(club.id); try { e.target.openPopup(); } catch {} },
                mouseout: (e) => {}
              }}>
                <Popup>
                  <div className="max-w-xs" onClick={() => navigate(`/clubs/${club.id}`)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") navigate(`/clubs/${club.id}`); }} style={{ cursor: "pointer" }}>
                    <div className="font-bold text-sm mb-1">{club.name}</div>
                    {club.address && <div className="text-xs text-gray-600 mb-2">{club.address}</div>}
                    <div className="flex gap-2">
                      <button onClick={(ev) => { ev.stopPropagation(); navigate(`/clubs/${club.id}`); }} className="px-2 py-1 rounded bg-pink-600 text-white text-xs">Подробнее</button>
                      {club.phone && <a href={`tel:${club.phone.replace(/\D/g, "")}`} onClick={(ev) => ev.stopPropagation()} className="px-2 py-1 rounded border border-gray-300 text-xs">Позвонить</a>}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
      <Footer />
    </div>
  );
}
