// src/pages/main/Home.jsx
import React, { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../../api/api.js";
import Navbar from "../../components/Navbar";
import MenuModal from "../../components/MenuModal";

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

        <h2 className="text-center text-lg text-gray-300 mb-6">Компьютерные клубы:</h2>

        <div className="relative bg-[#1A1A1A] p-6 rounded-xl shadow-lg mb-10">
          <button onClick={goPrev} className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center rounded-full bg-black/40 hover:bg-black/60">‹</button>
          <button onClick={goNext} className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center rounded-full bg-black/40 hover:bg-black/60">›</button>

          <div className="overflow-hidden">
            <div ref={containerRef} className="flex w-full" style={{ width: `${totalPages * 100}%`, transform: `translateX(${-(pageIndex * 100) / totalPages}%)` }}>
              {pages.length === 0 ? (
                <div className="w-full p-2">
                  {loading ? <div className="text-center text-gray-400 py-8">Загрузка...</div> : loadError ? <div className="text-center text-red-400 py-8">Ошибка: {loadError}</div> : <div className="text-center text-gray-400 py-8">Клубы не найдены</div>}
                </div>
              ) : (
                pages.map((pageItems, pIdx) => (
                  <div key={pIdx} className="w-full p-2" style={{ width: `${100 / totalPages}%` }}>
                    <div className={`grid gap-4 ${itemsPerPage === 1 ? "grid-cols-1" : "grid-cols-2 grid-rows-2"}`}>
                      {pageItems.map((club, idx) => (
                        <div key={club.id ?? idx} onClick={() => openClub(club)} className={`p-4 border-2 rounded-lg cursor-pointer transition ${ (pIdx * itemsPerPage + idx) % 2 === 0 ? "border-fuchsia-500" : "border-indigo-500" } hover:bg-[#2A2A2A]`}>
                          <div className="font-extrabold text-xl mb-1">{club.name}</div>
                          <div className="text-gray-400 text-sm">{club.address}</div>
                        </div>
                      ))}

                      {itemsPerPage > pageItems.length && Array.from({ length: itemsPerPage - pageItems.length }).map((_, i) => (
                        <div key={`empty-${i}`} className="p-4 border-2 border-transparent rounded-lg bg-transparent" />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-center mt-6 gap-2">
            {Array.from({ length: totalPages }).map((_, p) => (
              <button key={p} onClick={() => setPageIndex(p)} className={`w-3 h-3 rounded-full ${p === pageIndex ? "bg-pink-500" : "bg-gray-600"}`} aria-label={`page-${p + 1}`} />
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
    </div>
  );
}
