// src/pages/clubs/ClubDetails.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import Navbar from "../../components/Navbar";
import MenuModal from "../../components/MenuModal";
import PackageModal from "../../components/PackageModal";
import { apiGet } from "../../api/api.js";
import { useAuth } from "../../context/AuthContext";

const markerIcon = new L.Icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function ClubDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [club, setClub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [packagesOpen, setPackagesOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await apiGet(`/clubs/${id}`);
        const data = res?.data ?? res;
        if (mounted) setClub(data);
      } catch (err) {
        console.error("Failed to load club:", err);
        if (mounted) setClub(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111] text-white">
        <Navbar onMenuClick={() => setMenuOpen(true)} />
        <MenuModal isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-gray-300">Загрузка...</div>
        </div>
      </div>
    );
  }

  if (!club) {
    return (
      <div className="min-h-screen bg-[#111] text-white">
        <Navbar onMenuClick={() => setMenuOpen(true)} />
        <MenuModal isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
        <div className="max-w-4xl mx-auto p-6">
          <button onClick={() => navigate(-1)} className="mb-4 text-sm text-pink-400">← Назад</button>
          <div className="bg-[#1E1E1E] p-6 rounded-xl">Клуб не найден</div>
        </div>
      </div>
    );
  }

  const grouped = {};
  (club.prices || []).forEach((p) => {
    const cat = p.category || "Прочее";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(p);
  });

  const handlePackageSelect = (pkg) => {
    const packageId = pkg.id ?? pkg.service ?? pkg.title ?? (pkg.category + "-" + (pkg.service || ""));
    const url = `/booking?clubId=${encodeURIComponent(club.id)}&packageId=${encodeURIComponent(packageId)}`;
    navigate(url, { state: { selectedPackage: pkg } });
  };

  return (
    <div className="min-h-screen bg-[#111] text-white">
      <Navbar onMenuClick={() => setMenuOpen(true)} />
      <MenuModal isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <PackageModal
        isOpen={packagesOpen}
        onClose={() => setPackagesOpen(false)}
        packages={club.prices || []}
        onSelect={(pkg) => { setPackagesOpen(false); handlePackageSelect(pkg); }}
      />

      <div className="max-w-5xl mx-auto p-6">
        <button onClick={() => navigate(-1)} className="mb-4 text-sm text-pink-400">← Назад</button>

        <div className="bg-[#1E1E1E] p-6 rounded-xl">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="md:w-1/2 space-y-4">
              {club.image ? (
                <img src={club.image} alt={club.name} className="w-full h-64 object-cover rounded-lg" />
              ) : (
                <div className="w-full h-64 bg-gray-800 rounded-lg flex items-center justify-center"><span className="text-gray-400">No image</span></div>
              )}

              {club.latitude && club.longitude && (
                <div className="h-64 rounded-lg overflow-hidden border border-gray-800">
                  <MapContainer center={[club.latitude, club.longitude]} zoom={15} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={[club.latitude, club.longitude]} icon={markerIcon} />
                  </MapContainer>
                </div>
              )}
            </div>

            <div className="md:w-1/2 space-y-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">{club.name}</h1>
                <p className="text-gray-300 mb-4">{club.description}</p>

                <div className="text-sm text-gray-300 space-y-2 mb-4">
                  <div><strong>Адрес:</strong> {club.address}</div>
                  {club.phone && <div><strong>Телефон:</strong> {club.phone}</div>}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      if (!user) { navigate("/login", { state: { from: `/clubs/${club.id}` } }); return; }
                      setPackagesOpen(true);
                    }}
                    className="px-4 py-2 rounded bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold"
                  >
                    Забронировать
                  </button>

                  <button
                    onClick={() => { navigator.clipboard?.writeText(window.location.href); alert("Ссылка скопирована"); }}
                    className="px-4 py-2 rounded border border-gray-700 text-sm"
                  >
                    Поделиться
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Краткие тарифы</h3>
                <div className="flex gap-2 flex-wrap">
                  {(club.prices || []).slice(0, 4).map((p, i) => (
                    <div key={i} className="px-3 py-2 bg-gray-800 rounded text-sm">
                      {(p.service ?? p.title ?? p.category) + (p.price ? ` — ${p.price}` : "")}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-2xl font-semibold mb-3">Цены и услуги</h2>

            {Object.keys(grouped).length === 0 ? (
              <div className="text-gray-400">Информация о ценах отсутствует</div>
            ) : (
              Object.entries(grouped).map(([category, items]) => (
                <div key={category} className="mb-5">
                  <h3 className="text-lg font-bold mb-2">{category}</h3>
                  <div className="bg-[#0f0f0f] p-3 rounded border border-gray-800">
                    {items.map((it, i) => (
                      <div key={i} className="flex justify-between items-center py-2 border-b border-gray-800 last:border-b-0">
                        <div>
                          <div className="font-medium">{it.service}</div>
                          {it.unit && <div className="text-sm text-gray-400">{it.unit}</div>}
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{it.price}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
