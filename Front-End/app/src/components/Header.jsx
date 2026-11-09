import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Heart,
  GitCompareArrows,
  User,
  Sun,
  Moon,
  Store,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { fetchCategories, buildCategoryTree } from '../utils/helpers/categories';
import MegaMenu from './MegaMenu';
import SearchBox from './SearchBox';

export default function Header() {
  const navigate = useNavigate();
  const { user, logout, cartCount, theme, toggleTheme, compare, favorites } = useShop();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [catsExpanded, setCatsExpanded] = useState(true);
  const [openBranchIds, setOpenBranchIds] = useState({});

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetchCategories(controller.signal)
      .then(setCategories)
      .catch(() => {
        if (!controller.signal.aborted) setError('دریافت دسته‌بندی‌ها از بک‌اند ناموفق بود.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [retry]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e) => e.key === 'Escape' && setMobileOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);
  const isSeller = user && (user.is_seller || user.role === 'seller' || user.role === 'admin');

  const toggleBranch = (id) =>
    setOpenBranchIds((prev) => ({ ...prev, [id]: !prev[id] }));

  const renderMobileCategory = (node, depth = 0) => {
    const hasChildren = (node.children || []).length > 0;
    const isOpen = Boolean(openBranchIds[node._id]);

    return (
      <div key={node._id} className={depth > 0 ? 'pr-3 mr-2 border-r border-white/15' : ''}>
        {hasChildren ? (
          <>
            <button
              type="button"
              onClick={() => toggleBranch(node._id)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-gray-100 hover:bg-white/10 text-right font-semibold"
            >
              <span className="truncate">{node.name}</span>
              <ChevronDown
                size={14}
                className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {isOpen && (
              <div className="space-y-0.5 mt-0.5 pb-1">
                <Link
                  to={`/products?category_id=${node._id}`}
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-1.5 mr-3 rounded-lg text-[11px] font-bold text-brand-yellow hover:bg-white/10"
                >
                  همه محصولات {node.name}
                </Link>
                {node.children.map((child) => renderMobileCategory(child, depth + 1))}
              </div>
            )}
          </>
        ) : (
          <Link
            to={`/products?category_id=${node._id}`}
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 rounded-xl text-xs text-gray-200 hover:bg-white/10"
          >
            {node.name}
          </Link>
        )}
      </div>
    );
  };

  return (
    <>
      <header className="site-header sticky top-0 z-50">
        {/* ردیف اصلی هدر */}
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap lg:flex-nowrap">
          <button
            type="button"
            className="lg:hidden btn-ghost !p-2"
            aria-label="باز کردن منو"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={20} />
          </button>

          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="brand-logo w-9 h-9 rounded-xl grid place-items-center font-black text-lg">
              ع
            </span>
            <span className="leading-tight">
              <span className="block font-black text-base sm:text-lg">علی‌بازار</span>
              <span className="hidden sm:block text-[10px] muted">بازار داخلی ایران</span>
            </span>
          </Link>

          <div className="search-shell">
            <SearchBox />
          </div>

          <div className="flex items-center gap-1.5 mr-auto lg:mr-0">
            <button
              type="button"
              onClick={toggleTheme}
              className="hidden md:inline-flex btn-ghost !p-2.5"
              aria-label="تغییر تم"
              title="تغییر تم"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <Link
              to="/compare"
              className="hidden md:inline-flex btn-ghost !p-2.5 relative"
              title="مقایسه"
              aria-label="مقایسه"
            >
              <GitCompareArrows size={18} />
              {compare.length > 0 && <span className="header-badge">{compare.length}</span>}
            </Link>

            <Link
              to="/favorites"
              className="hidden md:inline-flex btn-ghost !p-2.5 relative"
              title="علاقه‌مندی"
              aria-label="علاقه‌مندی"
            >
              <Heart size={18} />
              {favorites.length > 0 && <span className="header-badge">{favorites.length}</span>}
            </Link>

            <Link
              to="/cart"
              className="btn-ghost !p-2 sm:!p-2.5 relative"
              title="سبد خرید"
              aria-label="سبد خرید"
            >
              <ShoppingCart size={18} />
              {cartCount > 0 && <span className="header-badge">{cartCount}</span>}
            </Link>

            {user ? (
              <div className="relative group">
                <button type="button" className="btn-ghost flex items-center gap-2 !py-2 !px-2.5">
                  <User size={18} />
                  <span className="hidden md:block text-sm font-bold max-w-[110px] truncate">
                    {user.username}
                  </span>
                </button>
                <div className="absolute left-0 top-full pt-2 hidden group-hover:block group-focus-within:block z-[90]">
                  <div className="card rounded-2xl p-2 w-56 shadow-2xl">
                    <Link to="/profile" className="account-link">
                      <User size={15} /> پنل کاربری
                    </Link>
                    <Link to="/orders" className="account-link">
                      <ShoppingCart size={15} /> سفارش‌های من
                    </Link>
                    {isSeller && (
                      <Link to="/seller" className="account-link">
                        <Store size={15} /> پنل فروشنده
                      </Link>
                    )}
                    {user.role === 'admin' && (
                      <Link to="/admin" className="account-link">
                        <ShieldCheck size={15} /> پنل مدیریت
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        navigate('/');
                      }}
                      className="account-link w-full text-red-400"
                    >
                      <LogOut size={15} /> خروج
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Link to="/auth/pre" className="btn-yellow !py-2 !px-3 flex items-center gap-1.5 text-sm">
                <User size={16} />
                <span className="hidden sm:inline">ورود</span>
              </Link>
            )}
          </div>
        </div>

        {/* منوی اصلی سایت */}
        <nav className="border-t border-white/10" aria-label="منوی اصلی">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-2">
            <MegaMenu
              categories={categories}
              loading={loading}
              error={error}
              onRetry={() => setRetry((value) => value + 1)}
            />

            <div className="hidden lg:flex items-center gap-1 border-r border-white/15 pr-2 mr-1">
              <NavLink to="/" end className={({ isActive }) => `header-nav-link ${isActive ? 'active' : ''}`}>
                صفحه اصلی
              </NavLink>
              <NavLink to="/about" className={({ isActive }) => `header-nav-link ${isActive ? 'active' : ''}`}>
                درباره ما
              </NavLink>
              <NavLink to="/contact" className={({ isActive }) => `header-nav-link ${isActive ? 'active' : ''}`}>
                تماس با ما
              </NavLink>
            </div>

            <div className="hidden md:flex items-center gap-1.5 overflow-x-auto no-scrollbar min-w-0 flex-1 py-0.5 border-r border-white/15 pr-2">
              {loading
                ? [0, 1, 2, 3].map((index) => (
                    <div key={index} className="skeleton h-7 w-20 shrink-0 !rounded-lg opacity-40" />
                  ))
                : categoryTree.slice(0, 6).map((category) => (
                    <Link
                      key={category._id}
                      to={`/products?category_id=${category._id}`}
                      className="header-nav-link text-xs opacity-90"
                    >
                      {category.name}
                    </Link>
                  ))}
            </div>
          </div>
        </nav>
      </header>

      {/* منوی کشویی موبایل بازشو از سمت راست */}
      {mobileOpen && (
        <>
          <div className="mobile-drawer-backdrop lg:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="mobile-drawer lg:hidden" aria-label="منوی موبایل">
            <div className="p-4 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="brand-logo w-8 h-8 rounded-lg grid place-items-center font-black">ع</span>
                <span className="font-black">علی‌بازار</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-lg hover:bg-white/10"
                aria-label="بستن منو"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1 text-sm">
              <Link to="/" onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 rounded-xl hover:bg-white/10 font-bold">
                صفحه اصلی
              </Link>
              <Link to="/products" onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 rounded-xl hover:bg-white/10 font-bold text-brand-yellow">
                همه محصولات
              </Link>
              <Link to="/about" onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 rounded-xl hover:bg-white/10">
                درباره ما
              </Link>
              <Link to="/contact" onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 rounded-xl hover:bg-white/10">
                تماس با ما
              </Link>

              <div className="border-t border-white/10 my-2 pt-2 space-y-1">
                <Link to="/favorites" onClick={() => setMobileOpen(false)} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/10">
                  <span className="flex items-center gap-2"><Heart size={16} /> علاقه‌مندی‌ها</span>
                  {favorites.length > 0 && <span className="text-xs font-black text-brand-yellow">{favorites.length}</span>}
                </Link>
                <Link to="/compare" onClick={() => setMobileOpen(false)} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/10">
                  <span className="flex items-center gap-2"><GitCompareArrows size={16} /> مقایسه محصولات</span>
                  {compare.length > 0 && <span className="text-xs font-black text-brand-yellow">{compare.length}</span>}
                </Link>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/10 text-right"
                >
                  <span className="flex items-center gap-2">
                    {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                    {theme === 'dark' ? 'حالت روشن' : 'حالت تاریک'}
                  </span>
                </button>
              </div>

              {user && (
                <div className="border-t border-white/10 my-2 pt-2 space-y-1">
                  <Link to="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10">
                    <User size={15} /> پنل کاربری
                  </Link>
                  <Link to="/orders" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10">
                    <ShoppingCart size={15} /> سفارش‌های من
                  </Link>
                  {isSeller && (
                    <Link to="/seller" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10">
                      <Store size={15} /> پنل فروشنده
                    </Link>
                  )}
                  {user.role === 'admin' && (
                    <Link to="/admin" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/10">
                      <ShieldCheck size={15} /> پنل مدیریت
                    </Link>
                  )}
                </div>
              )}

              <div className="border-t border-white/10 my-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCatsExpanded((v) => !v)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs text-gray-300 font-bold"
                >
                  <span>دسته‌بندی‌ها</span>
                  <ChevronDown size={14} className={catsExpanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
                </button>
                {catsExpanded && (
                  <div className="space-y-0.5 mt-1">
                    {categoryTree.map((root) => renderMobileCategory(root, 0))}
                  </div>
                )}
              </div>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
