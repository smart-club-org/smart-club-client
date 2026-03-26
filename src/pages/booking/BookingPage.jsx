// src/pages/booking/BookingPage.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import BookingWidget from "../../components/BookingWidget";
import { apiGet } from "../../api/api.js";
import Navbar from "../../components/Navbar";
import MenuModal from "../../components/MenuModal";

export default function BookingPage() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get("clubId");
  const packageId = searchParams.get("packageId");

  const location = useLocation();
  const selectedPackageFromState = location.state?.selectedPackage;
  const selectedSeatIds = location.state?.selectedSeatIds ?? [];

  const [club, setClub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!clubId) {
        setLoading(false);
        return;
      }
      try {
        const res = await apiGet(`/clubs/${clubId}`);
        const data = res?.data ?? res;
        if (mounted) setClub(data);
      } catch (err) {
        console.error("Failed to load club for booking:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [clubId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111] text-white">
        <Navbar onMenuClick={() => setMenuOpen(true)} />
        <MenuModal isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
        <div className="p-6">Загрузка...</div>
      </div>
    );
  }

  if (!club) {
    return (
      <div className="min-h-screen bg-[#111] text-white">
        <Navbar onMenuClick={() => setMenuOpen(true)} />
        <MenuModal isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
        <div className="p-6">Клуб не найден</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111] text-white">
      <Navbar onMenuClick={() => setMenuOpen(true)} />
      <MenuModal isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Бронирование — {club.name}</h1>

        <BookingWidget
          club={club}
          initialPackageId={packageId}
          initialPackageRaw={selectedPackageFromState}
          initialSelectedSeatIds={selectedSeatIds}
        />
      </div>
    </div>
  );
}
