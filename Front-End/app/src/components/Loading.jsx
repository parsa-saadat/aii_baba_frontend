import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';

export function Loading({ label = 'در حال بارگذاری…', className = '' }) {
  return (
    <div className={`loading-label ${className}`} role="status" aria-live="polite">
      <LoaderCircle size={19} className="animate-spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

// اسکلتون متناسب با هر صفحه تا هنگام تغییر مسیر، اسکلتون کارت محصول در صفحات نامربوط نمایش داده نشود
export function PageLoading({ pathname = '/' }) {
  if (pathname.startsWith('/products') || pathname.startsWith('/favorites')) {
    return (
      <div className="page-loading max-w-7xl mx-auto px-4 py-8" aria-busy="true">
        <Loading label="در حال بارگذاری محصولات…" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="skeleton h-72" />
          ))}
        </div>
      </div>
    );
  }

  if (pathname.startsWith('/product/')) {
    return (
      <div className="page-loading max-w-7xl mx-auto px-4 py-8" aria-busy="true">
        <Loading label="در حال بارگذاری جزئیات محصول…" />
        <div className="grid lg:grid-cols-2 gap-8 mt-6">
          <div className="skeleton aspect-square" />
          <div className="space-y-4">
            <div className="skeleton h-10 w-3/4" />
            <div className="skeleton h-20" />
            <div className="skeleton h-48" />
          </div>
        </div>
      </div>
    );
  }

  if (pathname.startsWith('/store/')) {
    return (
      <div className="page-loading max-w-7xl mx-auto px-4 py-8" aria-busy="true">
        <Loading label="در حال بارگذاری فروشگاه…" />
        <div className="skeleton h-48 mt-6" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="skeleton h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (pathname.startsWith('/cart') || pathname.startsWith('/checkout') || pathname.startsWith('/orders')) {
    return (
      <div className="page-loading max-w-5xl mx-auto px-4 py-8" aria-busy="true">
        <Loading label="در حال بارگذاری…" />
        <div className="space-y-3 mt-6">
          <div className="skeleton h-28" />
          <div className="skeleton h-28" />
        </div>
      </div>
    );
  }

  if (pathname.startsWith('/seller') || pathname.startsWith('/admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8" aria-busy="true">
        <Loading label="در حال آماده‌سازی پنل…" />
      </div>
    );
  }

  // صفحات ساده (درباره ما، تماس با ما، ورود، پروفایل، مقایسه و ...)
  return (
    <div className="page-loading max-w-3xl mx-auto px-4 py-24 flex items-center justify-center" aria-busy="true">
      <Loading label="در حال بارگذاری صفحه…" />
    </div>
  );
}

export function RouteProgress() {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 260);
    return () => window.clearTimeout(timer);
  }, [pathname]);
  return visible ? (
    <div key={pathname} className="route-progress" role="progressbar" aria-label="تغییر صفحه" />
  ) : null;
}

export function ScrollToTop() {
  const { pathname, search } = useLocation();
  const params = new URLSearchParams(search);
  const page = params.get('page');
  const category = params.get('category_id');
  const firstRender = useRef(true);

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (pathname === '/products') window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, [pathname, page, category]);
  return null;
}
