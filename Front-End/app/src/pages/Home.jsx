import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Sparkles, Timer, ChevronLeft, Store, BadgePercent } from 'lucide-react';
import ProductGrid from '../components/ProductGrid';
import { useShop } from '../context/ShopContext';
import StorageImage from '../components/StorageImage';
import { hasDiscount, productImages, ratingOf, toFa } from '../utils/helpers/format';
import { readList } from '../utils/helpers/storage';

const API = (import.meta.env.VITE_APP_API_URL || 'http://localhost:3000');

export default function Home() {
  const { user, favorites } = useShop();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    Promise.allSettled([
      axios.get(`${API}/product?limit=100`),
      axios.get(`${API}/category?limit=100`),
      axios.get(`${API}/store?limit=20`),
    ])
      .then(([p, c, s]) => {
        if (p.status === 'fulfilled') setProducts(p.value.data.body?.data || []);
        if (c.status === 'fulfilled') setCategories(c.value.data.body?.data || []);
        if (s.status === 'fulfilled') setStores(s.value.data.body?.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const tick = () => {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const d = Math.max(0, end - Date.now());
      const h = Math.floor(d / 3600000);
      const m = Math.floor((d % 3600000) / 60000);
      const s = Math.floor((d % 60000) / 1000);
      setCountdown(`${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const deals = useMemo(() => products.filter(hasDiscount).slice(0, 5), [products]);
  const bestSellers = useMemo(
    () => [...products].sort((a, b) => (b.sold_count ?? 0) - (a.sold_count ?? 0)).slice(0, 10),
    [products],
  );

  // مهمان → پرفروش‌ها | لاگین → امتیازدهی بر اساس علاقه‌مندی/برند/دسته/بازدید
  const personalised = useMemo(() => {
    if (!user) return bestSellers;
    const history = readList('history');
    const favProducts = products.filter((p) => favorites.includes(p._id));
    const brands = new Set(favProducts.map((p) => p.brand));
    const cats = new Set(favProducts.map((p) => String(p.category_id)));
    return [...products]
      .map((p) => {
        let score = (p.sold_count ?? 0) / 10 + ratingOf(p);
        if (brands.has(p.brand)) score += 50;
        if (cats.has(String(p.category_id))) score += 40;
        if (history.includes(p._id)) score += 30;
        if (hasDiscount(p)) score += 12;
        return { p, score };
      })
      .sort((a, b) => b.score - a.score)
      .map((x) => x.p)
      .slice(0, 10);
  }, [products, user, favorites, bestSellers]);

  return (
    <div className="max-w-7xl mx-auto px-4">
      <section
        className="mt-4 rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg,#0a1736 0%,#162e66 55%,#0f2150 100%)',
          border: '1px solid var(--border)',
        }}
      >
        <div className="grid md:grid-cols-2 gap-6 p-8 md:p-12 items-center">
          <div>
            <span className="chip on !cursor-default">بازار داخلی ایران • بدون واردات</span>
            <h1 className="text-3xl md:text-5xl font-black leading-tight mt-4 text-white">
              خرید مستقیم از <span className="text-brand-yellow">فروشندگان ایرانی</span>
            </h1>
            <p className="mt-3 leading-8 text-gray-300">
              هزاران کالا از فروشگاه‌های داخلی با ضمانت اصالت، قیمت شفاف و ارسال سریع به سراسر کشور.
            </p>
            <div className="flex gap-3 mt-6 flex-wrap">
              <Link to="/products" className="btn-yellow">
                شروع خرید
              </Link>
              <Link to="/products?discount=true" className="btn-ghost text-white">
                پیشنهادهای ویژه
              </Link>
            </div>
          </div>
          <div className="hidden md:grid grid-cols-2 gap-3 floaty">
            {loading
              ? Array.from({ length: 4 }, (_, index) => (
                  <div key={index} className="skeleton aspect-square" />
                ))
              : products.slice(0, 4).map((p) => (
                  <Link
                    key={p._id}
                    to={`/product/${p._id}`}
                    className="rounded-2xl overflow-hidden aspect-square block"
                  >
                    <StorageImage
                      file={productImages(p)[0]}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                  </Link>
                ))}
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black text-lg">دسته‌بندی‌ها</h2>
        <Link
          to="/products"
          className="text-sm font-bold flex items-center gap-1 text-yellow"
        >
          همه <ChevronLeft size={15} />
        </Link>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 min-h-10">
          {loading
            ? [0, 1, 2, 3, 4].map((index) => (
                <div key={index} className="skeleton h-8 w-28 shrink-0" />
              ))
            : categories.map((c) => (
                <Link
                  key={c._id}
                  to={`/products?category_id=${c._id}`}
                  className="chip whitespace-nowrap"
                >
                  {c.name}
                </Link>
              ))}
        </div>
      </section>

      <section className="mt-8 card rounded-3xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <h2 className="font-black text-lg flex items-center gap-2">
            <Flame size={20} className="text-yellow" /> پیشنهادهای شگفت‌انگیز
          </h2>
          <span className="flex items-center gap-2 text-sm font-bold">
            <Timer size={16} className="text-yellow" /> پایان تا:{' '}
            <span dir="ltr">{toFa(countdown)}</span>
          </span>
        </div>
        <ProductGrid
          products={deals}
          loading={loading}
          columns={5}
          emptyTitle="تخفیف فعالی موجود نیست"
        />
      </section>

      <section className="mt-8">
        <div className="flex items-end justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="font-black text-lg flex items-center gap-2">
              <Sparkles size={20} className="text-yellow" />
              {user ? 'پیشنهاد ویژه برای شما' : 'پرفروش‌ترین‌ها'}
            </h2>
            {user && (
              <p className="text-xs muted mt-1">
                بر اساس علاقه‌مندی‌ها، برندهای محبوب و بازدیدهای شما
              </p>
            )}
          </div>
          <Link
            to="/products"
            className="text-sm font-bold flex items-center gap-1 text-yellow"
          >
            همه محصولات <ChevronLeft size={15} />
          </Link>
        </div>
        <ProductGrid products={personalised} loading={loading} columns={5} />
      </section>

      <section className="mt-8">
        <h2 className="font-black text-lg flex items-center gap-2 mb-4">
          <Store size={20} className="text-yellow" /> فروشگاه‌های برگزیده
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {stores.slice(0, 4).map((s) => (
            <Link
              key={s._id}
              to={`/store/${s._id}`}
              className="card rounded-2xl p-4 hover:-translate-y-1 transition-transform"
            >
              <StorageImage
                file={s.profile_image_id}
                alt={s.name}
                className="w-12 h-12 rounded-2xl object-cover mb-3"
              />
              <div className="font-black">{s.name}</div>
              <div className="text-xs muted mt-1 line-clamp-2">
                {s.description || 'فروشگاه ایرانی'}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8 card rounded-3xl p-6 flex flex-col md:flex-row items-center gap-4 justify-between">
        <div className="flex items-center gap-3">
          <BadgePercent size={30} className="text-yellow" />
          <div>
            <div className="font-black">فروشنده شوید و بفروشید</div>
            <div className="text-sm muted">
              درخواست فروشندگی ثبت کنید، پلن انتخاب کنید و فروشگاه خود را بسازید.
            </div>
          </div>
        </div>
        <Link to="/profile" className="btn-yellow shrink-0">
          درخواست فروشندگی
        </Link>
      </section>
    </div>
  );
}
