import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@shared/store/auth';
import { ShopProvider } from './store/shop';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Login from './pages/Login';
import Orders from './pages/Orders';
import Cart from './pages/Cart';

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <ShopProvider>
          <Navbar />
          <main className="main">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/login" element={<Login />} />
              {/* สมัครสมาชิก = เข้าสู่ระบบด้วย Google หน้าเดียวกัน ไม่ต้องมีหน้าแยก */}
              <Route path="/register" element={<Navigate to="/login" replace />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/cart" element={<Cart />} />
              {/* หน้าแอดมินย้ายไปอีกเว็บแยกแล้ว — โยกผู้ใช้กลับหน้าแรก */}
              <Route path="/admin" element={<Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </ShopProvider>
      </AuthProvider>
    </HashRouter>
  );
}