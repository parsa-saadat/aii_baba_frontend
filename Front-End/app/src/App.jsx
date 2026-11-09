import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Bounce, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './index.css';
import { ShopProvider } from './context/ShopContext';
import Header from './components/Header';
import Footer from './components/Footer';
import { PageLoading, RouteProgress, ScrollToTop } from './components/Loading';

const Home = lazy(() => import('./pages/Home'));
const Products = lazy(() => import('./pages/Products'));
const Product = lazy(() => import('./pages/Product'));
const Store = lazy(() => import('./pages/Store'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Favorites = lazy(() => import('./pages/Favorites'));
const Compare = lazy(() => import('./pages/Compare'));
const Orders = lazy(() => import('./pages/Orders'));
const Profile = lazy(() => import('./pages/Profile'));
const SellerPanel = lazy(() => import('./pages/SellerPanel'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const PreAuth = lazy(() => import('./pages/PreAuth'));
const VerifyAuth = lazy(() => import('./pages/VerifyAuth'));
const Register = lazy(() => import('./pages/Register'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const NotFound = lazy(() => import('./pages/NotFound'));

function AppShell() {
  const location = useLocation();
  const isPanel =
    location.pathname.startsWith('/seller') || location.pathname.startsWith('/admin');

  return (
    <>
      <ScrollToTop />
      <RouteProgress />
      <ToastContainer
        position="bottom-left"
        autoClose={2500}
        closeOnClick
        rtl
        theme="dark"
        transition={Bounce}
      />
      {!isPanel && <Header />}
      <main className={isPanel ? 'min-h-screen' : 'min-h-[70vh]'}>
        <Suspense
          key={location.pathname}
          fallback={<PageLoading pathname={location.pathname} />}
        >
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/product/:id" element={<Product />} />
            <Route path="/store/:id" element={<Store />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/seller" element={<SellerPanel />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/auth/pre" element={<PreAuth />} />
            <Route path="/auth/verify" element={<VerifyAuth />} />
            <Route path="/auth/register" element={<Register />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      {!isPanel && <Footer />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ShopProvider>
        <AppShell />
      </ShopProvider>
    </BrowserRouter>
  );
}
