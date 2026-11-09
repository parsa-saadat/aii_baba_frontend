import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Mail,
  Phone,
  Printer,
  Store as StoreIcon,
  Package,
  Star,
  BadgeCheck,
  User2,
  CalendarDays,
} from 'lucide-react';
import ProductGrid from '../components/ProductGrid';
import StorageImage from '../components/StorageImage';
import { Loading } from '../components/Loading';
import {
  formatDateTime,
  statusFa,
  toFa,
  ratingOf,
  hasDiscount,
  finalPrice,
} from '../utils/helpers/format';
import { getList, getId } from '../utils/helpers/response';
import { authHeaders, getUser } from '../utils/helpers/storage';

const API = (import.meta.env.VITE_APP_API_URL || 'http://localhost:3000');

// صفحه فروشگاه تکی — همه فیلدهای store بک‌اند + مالک + محصولات
export default function Store() {
  const { id } = useParams();
  const [store, setStore] = useState(null);
  const [owner, setOwner] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('sold');

  useEffect(() => {
    const controller = new AbortController();
    const config = { signal: controller.signal, timeout: 15000 };
    setLoading(true);
    setStore(null);
    setOwner(null);
    setProducts([]);
    const loadStore = async () => {
      try {
        const response = await axios.get(`${API}/store/${id}`, config);
        const data = response.data?.body;
        if (!data?._id) throw new Error('فروشگاه یافت نشد.');
        const currentUser = getUser();
        const canReadOwner =
          currentUser && (currentUser._id === getId(data.user) || currentUser.role === 'admin');
        const [ownerResult, productsResult] = await Promise.allSettled([
          canReadOwner
            ? axios.get(`${API}/user/${getId(data.user)}`, { ...config, ...authHeaders() })
            : Promise.resolve(null),
          axios.get(`${API}/product`, {
            ...config,
            params: { seller_id: getId(data.user), limit: 100 },
          }),
        ]);
        if (controller.signal.aborted) return;
        setStore(data);
        setOwner(ownerResult.status === 'fulfilled' ? ownerResult.value?.data?.body || null : null);
        setProducts(
          productsResult.status === 'fulfilled'
            ? getList(productsResult.value).filter((product) => getId(product.store_id) === id)
            : [],
        );
      } catch {
        if (!controller.signal.aborted) setStore(null);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    loadStore();
    return () => controller.abort();
  }, [id]);

  const stats = useMemo(() => {
    const sold = products.reduce((s, p) => s + (p.sold_count ?? 0), 0);
    const avg = products.length
      ? products.reduce((s, p) => s + ratingOf(p), 0) / products.length
      : 0;
    return {
      sold,
      avg,
      discounted: products.filter(hasDiscount).length,
      inStock: products.filter((p) => p.stock_status === 'IN_STOCK').length,
    };
  }, [products]);

  const visible = useMemo(() => {
    const list = [...products];
    switch (sort) {
      case 'cheap':
        return list.sort((a, b) => finalPrice(a) - finalPrice(b));
      case 'expensive':
        return list.sort((a, b) => finalPrice(b) - finalPrice(a));
      case 'new':
        return list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      case 'discount':
        return list.sort((a, b) => (b.discount?.percentage ?? 0) - (a.discount?.percentage ?? 0));
      default:
        return list.sort((a, b) => (b.sold_count ?? 0) - (a.sold_count ?? 0));
    }
  }, [products, sort]);

  const brands = useMemo(
    () => [...new Set(products.map((p) => p.brand).filter(Boolean))],
    [products],
  );

  if (loading)
    return (
      <div className="max-w-7xl mx-auto px-4 py-8" aria-busy="true">
        <Loading label="در حال بارگذاری فروشگاه…" />
        <div className="skeleton h-52 mt-6" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="skeleton h-28" />
          ))}
        </div>
        <div className="skeleton h-64 mt-5" />
      </div>
    );
  if (!store) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center card rounded-3xl p-10">
        <StoreIcon size={36} className="mx-auto muted mb-3" />
        <div className="font-black">فروشگاه یافت نشد</div>
        <p className="text-sm muted mt-1">این فروشگاه غیرفعال شده یا وجود ندارد.</p>
      </div>
    );
  }

  const contact = store.contact_info || {};

  const Info = ({ label, value, ltr }) => (
    <div className="card2 rounded-xl p-3 flex justify-between gap-2">
      <span className="muted text-xs shrink-0">{label}</span>
      <span className="font-bold text-xs truncate" dir={ltr ? 'ltr' : undefined}>
        {value || '—'}
      </span>
    </div>
  );

  const Stat = ({ label, value, icon }) => (
    <div className="card rounded-3xl p-6">
      <div className="text-sm muted flex items-center gap-2">
        {icon}
        {label}
      </div>
      <div className="font-black text-2xl mt-1 text-yellow">
        {value}
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* بنر و پروفایل */}
      <div
        className="rounded-3xl overflow-hidden border border-theme relative"
        style={{ background: 'linear-gradient(135deg,#0a1736,#162e66)' }}
      >
        <div className="h-40 md:h-52 w-full">
          <StorageImage
            file={store.banner_image_id}
            alt={`بنر ${store.name}`}
            className="w-full h-full object-cover"
            eager
          />
        </div>
        <div className="px-5 md:px-8 pb-5 -mt-12 relative flex flex-col md:flex-row gap-4 md:items-end">
          <div
            className="w-24 h-24 rounded-3xl overflow-hidden border-4 shrink-0 grid place-items-center font-black text-3xl"
            style={{ borderColor: 'var(--bg2)', background: 'var(--card2)', color: 'var(--navy)' }}
          >
            <StorageImage
              file={store.profile_image_id}
              alt={store.name}
              className="w-full h-full object-cover"
              eager
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black flex items-center gap-2 text-white">
                <StoreIcon size={22} style={{ color: 'var(--primary-color)' }} /> {store.name}
              </h1>
              <span
                className="text-[11px] font-bold px-2 py-1 rounded-full flex items-center gap-1"
                style={{ background: 'rgba(52,211,153,.15)', color: '#34d399' }}
              >
                <BadgeCheck size={11} /> {statusFa(store.status)}
              </span>
            </div>
            <p className="mt-1 leading-7 max-w-2xl text-gray-300">
              {store.description || 'این فروشگاه هنوز توضیحاتی ثبت نکرده است.'}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="btn-ghost !p-2.5 text-white"
                title="ایمیل"
              >
                <Mail size={17} />
              </a>
            )}
            {contact.phone && (
              <a href={`tel:${contact.phone}`} className="btn-ghost !p-2.5 text-white" title="تلفن">
                <Phone size={17} />
              </a>
            )}
            {contact.fax && (
              <a href={`tel:${contact.fax}`} className="btn-ghost !p-2.5 text-white" title="فکس">
                <Printer size={17} />
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-5 mt-5 items-start">
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Stat
              label="تعداد محصولات"
              value={toFa(products.length)}
              icon={<Package size={15} />}
            />
            <Stat
              label="کالای موجود"
              value={toFa(stats.inStock)}
              icon={<BadgeCheck size={15} />}
            />
            <Stat
              label="کالای تخفیف‌دار"
              value={toFa(stats.discounted)}
              icon={<Package size={15} />}
            />
            <Stat
              label="تعداد برندها"
              value={toFa(brands.length)}
              icon={<StoreIcon size={15} />}
            />
          </div>

          <div className="card rounded-3xl p-5">
            <h2 className="font-black mb-3">اطلاعات فروشگاه</h2>
            <div className="grid sm:grid-cols-2 gap-2 text-sm">
              <Info label="نام فروشگاه" value={store.name} />
              <Info label="وضعیت" value={statusFa(store.status)} />
              <Info label="ایمیل" value={contact.email} ltr />
              <Info label="تلفن" value={contact.phone} ltr />
              <Info label="فکس" value={contact.fax} ltr />
              <Info label="شناسه فروشگاه" value={store._id} ltr />
              <Info label="تاریخ ثبت" value={formatDateTime(store.created_at ?? store.create_at)} />
              <Info label="آخرین بروزرسانی" value={formatDateTime(store.updated_at ?? store.update_at)} />
              <Info label="شناسه تصویر پروفایل" value={store.profile_image_id} ltr />
              <Info label="شناسه تصویر بنر" value={store.banner_image_id} ltr />
            </div>
          </div>

          {brands.length > 0 && (
            <div className="card rounded-3xl p-5">
              <h2 className="font-black mb-3">برندهای این فروشگاه</h2>
              <div className="flex flex-wrap gap-2">
                {brands.map((b) => (
                  <Link
                    key={b}
                    to={`/products?brand=${encodeURIComponent(b)}`}
                    className="chip text-xs"
                  >
                    {b}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card rounded-3xl p-5">
            <h2 className="font-black mb-3 flex items-center gap-2">
              <User2 size={16} className="text-yellow" /> فروشنده
            </h2>
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl grid place-items-center font-black text-lg"
                style={{ background: 'var(--primary-color)', color: 'var(--navy)' }}
              >
                {(owner?.username || store.name || 'ف')[0]}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-sm truncate">
                  {owner?.username || 'فروشنده علی‌بازار'}
                </div>
                <div className="text-[11px] muted" dir="ltr">
                  {owner?.phone ? toFa(owner.phone) : '—'}
                </div>
              </div>
            </div>
            {owner && (
              <div className="text-xs muted mt-3 space-y-1">
                <div>نوع: {statusFa(owner.seller_type)}</div>
                <div>احراز: {owner.seller_approved_status ? 'تأیید شده' : 'در انتظار'}</div>
                <div>فعالیت: {statusFa(owner.seller_active_status)}</div>
                <div className="flex items-center gap-1">
                  <CalendarDays size={11} /> عضویت: {formatDateTime(owner.created_at)}
                </div>
              </div>
            )}
            <div className="text-[11px] muted mt-2" dir="ltr">
              owner: {store.user}
            </div>
          </div>

          <div className="card rounded-3xl p-5 text-sm">
            <div className="flex justify-between py-1">
              <span className="muted">کالای موجود</span>
              <b>{toFa(stats.inStock)}</b>
            </div>
            <div className="flex justify-between py-1">
              <span className="muted">کالای ناموجود</span>
              <b>{toFa(products.length - stats.inStock)}</b>
            </div>
            <div className="flex justify-between py-1">
              <span className="muted">تخفیف‌دار</span>
              <b>{toFa(stats.discounted)}</b>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="font-black text-lg flex items-center gap-2">
            <Package size={19} className="text-yellow" /> محصولات فروشگاه (
            {toFa(products.length)})
          </h2>
          <select className="input !w-auto" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="sold">پرفروش‌ترین</option>
            <option value="new">جدیدترین</option>
            <option value="cheap">ارزان‌ترین</option>
            <option value="expensive">گران‌ترین</option>
            <option value="discount">بیشترین تخفیف</option>
          </select>
        </div>
        <ProductGrid
          products={visible}
          columns={4}
          emptyTitle="محصولی در این فروشگاه ثبت نشده است"
        />
      </div>
    </div>
  );
}
