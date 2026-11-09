import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="site-footer mt-16">
      <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-6 text-sm">
        <div className="flex items-center gap-3">
          <span
            className="w-9 h-9 rounded-xl grid place-items-center font-black shrink-0"
            style={{ background: 'var(--primary-color)', color: 'var(--navy)' }}
          >
            ع
          </span>
          <div>
            <b className="text-base block">علی‌بازار</b>
            <span className="text-xs muted">بازار داخلی ایران • بدون واردات و صادرات</span>
          </div>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-5 text-xs md:text-sm muted">
          <Link to="/products" className="hover:text-white transition-colors">محصولات</Link>
          <Link to="/about" className="hover:text-white transition-colors">درباره ما</Link>
          <Link to="/contact" className="hover:text-white transition-colors">تماس با ما</Link>
          <Link to="/profile" className="hover:text-white transition-colors">فروشنده شوید</Link>
        </nav>

        <div className="text-xs muted">© ۱۴۰۴ علی‌بازار</div>
      </div>
    </footer>
  );
}
