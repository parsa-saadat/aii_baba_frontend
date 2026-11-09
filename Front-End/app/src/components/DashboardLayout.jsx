import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PanelRightClose,
  PanelRightOpen,
  Menu,
  X,
  Sun,
  Moon,
  LogOut,
  ExternalLink,
} from 'lucide-react';
import { useShop } from '../context/ShopContext';

export default function DashboardLayout({
  title,
  subtitle,
  roleLabel,
  navItems,
  activeTab,
  onTabChange,
  headerActions,
  children,
}) {
  const navigate = useNavigate();
  const { user, logout, theme, toggleTheme } = useShop();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const currentItem = navItems.find((item) => item.key === activeTab) || navItems[0];

  const SidebarInner = ({ isMobile = false }) => {
    const isCompact = !isMobile && collapsed;
    return (
      <div className="flex flex-col h-full bg-[#0a1736] text-white select-none">
        {/* برندینگ پنل */}
        <div className={`p-4 border-b border-white/10 flex items-center ${isCompact ? 'justify-center' : 'justify-between gap-2'}`}>
          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            <span
              className="w-9 h-9 rounded-xl grid place-items-center font-black text-lg shrink-0 shadow"
              style={{ background: 'var(--primary-color)', color: '#0a1736' }}
            >
              ع
            </span>
            {!isCompact && (
              <div className="min-w-0">
                <div className="font-black text-sm truncate">{title}</div>
                <div className="text-[11px] text-[#9aa8cc] truncate">{roleLabel}</div>
              </div>
            )}
          </Link>
          {isMobile && (
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="p-1.5 rounded-lg hover:bg-white/10"
              aria-label="بستن منو"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* لیست ناوبری */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1" aria-label="ناوبری پنل">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.key === activeTab;
            return (
              <button
                key={item.key}
                type="button"
                title={isCompact ? item.label : undefined}
                onClick={() => {
                  onTabChange(item.key);
                  if (isMobile) setMobileOpen(false);
                }}
                className={`w-full flex items-center ${isCompact ? 'justify-center px-2' : 'justify-between px-3'} py-2.5 rounded-xl text-sm transition-all ${
                  active
                    ? 'bg-[#ffd60a] text-[#0a1736] font-black shadow-md'
                    : 'text-[#d8e1fa] hover:bg-white/10'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon size={18} className="shrink-0" />
                  {!isCompact && <span className="truncate">{item.label}</span>}
                </span>
                {!isCompact && item.badge > 0 && (
                  <span
                    className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                      active ? 'bg-[#0a1736] text-[#ffd60a]' : 'bg-white/15 text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* فوتر سایدبار */}
        <div className="p-3 border-t border-white/10 space-y-1">
          <Link
            to="/"
            title={isCompact ? 'بازگشت به فروشگاه' : undefined}
            className={`w-full flex items-center ${isCompact ? 'justify-center px-2' : 'gap-2.5 px-3'} py-2.5 rounded-xl text-sm text-[#d8e1fa] hover:bg-white/10`}
          >
            <ExternalLink size={17} className="shrink-0" />
            {!isCompact && <span>مشاهده فروشگاه</span>}
          </Link>
          <button
            type="button"
            title={isCompact ? 'خروج' : undefined}
            onClick={() => {
              logout();
              navigate('/');
            }}
            className={`w-full flex items-center ${isCompact ? 'justify-center px-2' : 'gap-2.5 px-3'} py-2.5 rounded-xl text-sm text-red-300 hover:bg-red-500/15`}
          >
            <LogOut size={17} className="shrink-0" />
            {!isCompact && <span>خروج از حساب</span>}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      {/* سایدبار دسکتاپ (سمت راست) */}
      <aside
        className={`hidden lg:block shrink-0 border-l border-white/10 transition-all duration-200 sticky top-0 h-screen ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        <SidebarInner />
      </aside>

      {/* سایدبار موبایل (بازشو از راست) */}
      {mobileOpen && (
        <>
          <div className="mobile-drawer-backdrop lg:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="mobile-drawer lg:hidden !p-0">
            <SidebarInner isMobile />
          </aside>
        </>
      )}

      {/* بدنه اصلی پنل */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* هدر اختصاصی پنل */}
        <header
          className="sticky top-0 z-40 px-4 md:px-6 py-3 flex items-center justify-between gap-3 border-b border-theme"
          style={{ background: 'var(--bg2)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* دکمه باز کردن منو در موبایل */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden btn-ghost !p-2"
              aria-label="باز کردن منوی ناوبری"
            >
              <Menu size={19} />
            </button>

            {/* دکمه کوچک‌نمایی و بزرگ‌نمایی منو سمت راست (بخش ناوبری) */}
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className="hidden lg:inline-flex btn-ghost !p-2"
              aria-label={collapsed ? 'بزرگ‌نمایی منوی ناوبری' : 'کوچک‌نمایی منوی ناوبری'}
              title={collapsed ? 'بزرگ‌نمایی منوی ناوبری' : 'کوچک‌نمایی منوی ناوبری'}
            >
              {collapsed ? <PanelRightOpen size={19} /> : <PanelRightClose size={19} />}
            </button>

            <div className="min-w-0">
              <div className="font-black text-base md:text-lg truncate">
                {currentItem?.label || title}
              </div>
              {subtitle && <div className="text-xs muted truncate">{subtitle}</div>}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {headerActions}
            <button
              type="button"
              onClick={toggleTheme}
              className="btn-ghost !p-2"
              aria-label="تغییر تم"
              title="تغییر تم"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link
              to="/"
              className="hidden sm:inline-flex btn-ghost !py-1.5 !px-3 text-xs items-center gap-1.5"
            >
              <ExternalLink size={14} /> فروشگاه
            </Link>
            {user && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl card2 text-xs">
                <span
                  className="w-6 h-6 rounded-lg grid place-items-center font-black"
                  style={{ background: 'var(--primary-color)', color: '#0a1736' }}
                >
                  {user.username?.[0] || 'ک'}
                </span>
                <span className="font-bold max-w-[100px] truncate">{user.username}</span>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">{children}</div>

        {/* فوتر یک‌خطی ساده برای پنل */}
        <footer className="px-4 md:px-6 py-3 border-t border-theme text-xs muted flex items-center justify-between gap-3 flex-wrap">
          <span>© ۱۴۰۴ علی‌بازار — پنل مدیریت فروشندگان داخلی</span>
          <div className="flex items-center gap-4">
            <Link to="/about" className="hover:underline">قوانین و مقررات فروشندگان</Link>
            <Link to="/contact" className="hover:underline">پشتیبانی و تماس</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
