import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@shared/store/auth';
import { StoreConfigProvider } from '@shared/store/config';
import { ShopProvider } from './store/shop';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Favorites from './pages/Favorites';

export default function App() {
  return (
    <HashRouter>
      <StoreConfigProvider>
        <AuthProvider>
          <ShopProvider>
            <Navbar />
            <main className="main">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                {/* ไม่มีระบบล็อกอินแล้ว — /login และ /register พากลับหน้าแรก */}
                <Route path="/login" element={<Navigate to="/" replace />} />
                <Route path="/register" element={<Navigate to="/" replace />} />
                <Route path="/favorites" element={<Favorites />} />
                {/* หน้าแอดมินย้ายไปอีกเว็บแยกแล้ว — โยกผู้ใช้กลับหน้าแรก */}
                <Route path="/admin" element={<Navigate to="/" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <Footer />
          </ShopProvider>
        </AuthProvider>
      </StoreConfigProvider>
    </HashRouter>
  );
}
