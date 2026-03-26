// src/App.jsx (минимум)
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { UiProvider } from "./context/UiContext";

import Home from "./pages/main/Home";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import BookingPage from "./pages/booking/BookingPage";
import History from "./pages/history/History";
import MyAccount from "./pages/account/MyAccount";
import ClubDetails from "./pages/clubs/ClubDetails";

export default function App() {
  return (
    <AuthProvider>
      <UiProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/clubs/:id" element={<ClubDetails />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/booking" element={<BookingPage />} />
            <Route path="/history" element={<History />} />
            <Route path="/account" element={<MyAccount />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </UiProvider>
    </AuthProvider>
  );
}
