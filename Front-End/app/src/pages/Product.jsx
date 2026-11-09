import axios from 'axios';
import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Heart,
  GitCompareArrows,
  ShoppingCart,
  Star,
  Store,
  ShieldCheck,
  Truck,
  Package,
  Minus,
  Plus,
} from 'lucide-react';
import ProductGrid from '../components/ProductGrid';
import StorageImage from '../components/StorageImage';
import MarkdownContent from '../components/MarkdownContent';
import { Loading } from '../components/Loading';
import { useShop } from '../context/ShopContext';
import { authHeaders, readList, writeList } from '../utils/helpers/storage';
import { getList, getId } from '../utils/helpers/response';
import {
  formatPrice,
  finalPrice,
  hasDiscount,
  ratingOf,
  toFa,
  statusFa,
  formatDateTime,
  formatDimensions,
  formatWeight,
  productImages,
} from '../utils/helpers/format';

const API = (import.meta.env.VITE_APP_API_URL || 'http://localhost:3000');

function Spec({ label, value }) {
  return (
    <div className="card2 rounded-xl p-3">
      <span className="muted text-xs block mb-1">{label}</span>
      <b className="text-sm leading-7">{value || 'ثبت نشده'}</b>
    </div>
  );
}

export default function Product() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, toggleFavorite, isFavorite, toggleCompare, compare, refreshCart } = useShop();
  const [product, setProduct] = useState(null);
  const [store, setStore] = useState(null);
  const [related, setRelated] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const config = { signal: controller.signal, timeout: 15000 };
    setLoading(true);
    setError('');
    setProduct(null);
    setStore(null);
    setRelated([]);
    setQuantity(1);
    setActiveImage(0);

    const loadProduct = async () => {
      try {
        const response = await axios.get(`${API}/product/${id}`, config);
        if (response.data?.success === false) throw new Error(response.data.message);
        const item = response.data.body;
        if (!item?._id) throw new Error('محصول یافت نشد.');
        const requests = [
          item.store_id
            ? axios.get(`${API}/store/${getId(item.store_id)}`, config)
            : Promise.resolve(null),
          item.category_id
            ? axios.get(`${API}/product`, {
                ...config,
                params: { category_id: getId(item.category_id), limit: 5 },
              })
            : Promise.resolve(null),
        ];
        const [storeResult, relatedResult] = await Promise.allSettled(requests);
        if (controller.signal.aborted) return;
        setProduct(item);
        setStore(storeResult.status === 'fulfilled' ? storeResult.value?.data?.body || null : null);
        setRelated(
          relatedResult.status === 'fulfilled' && relatedResult.value
            ? getList(relatedResult.value)
                .filter((row) => getId(row) !== id)
                .slice(0, 4)
            : [],
        );
        const history = readList('history');
        writeList('history', [id, ...history.filter((value) => value !== id)].slice(0, 20));
      } catch {
        if (!controller.signal.aborted) setError('دریافت اطلاعات محصول از بک‌اند ناموفق بود.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    loadProduct();
    return () => controller.abort();
  }, [id, retry]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8" aria-busy="true">
        <Loading label="در حال بارگذاری محصول…" />
        <div className="grid lg:grid-cols-2 gap-8 mt-6">
          <div className="skeleton aspect-square" />
          <div className="space-y-5">
            <div className="skeleton h-12" />
            <div className="skeleton h-24" />
            <div className="skeleton h-56" />
          </div>
        </div>
        <div className="skeleton h-56 mt-8" />
      </div>
    );
  }
  if (error || !product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center card rounded-3xl">
        <Package size={34} className="mx-auto muted mb-4" />
        <p>{error || 'محصول یافت نشد.'}</p>
        <button
          type="button"
          className="btn-yellow mt-5"
          onClick={() => setRetry((value) => value + 1)}
        >
          تلاش دوباره
        </button>
      </div>
    );
  }

  const discount = hasDiscount(product);
  const favorite = isFavorite(id);
  const soldOut = product.stock_status === 'OUT_OF_STOCK' || product.stock === 0;
  const images = productImages(product);

  const addToCart = (buyNow) => {
    if (!user) return toast.error('برای خرید ابتدا وارد شوید');
    setAdding(true);
    axios
      .post(`${API}/user/${user._id}/cart`, { product_id: id, quantity }, authHeaders())
      .then((response) => {
        if (response.data?.success === false) throw new Error(response.data.message);
        toast.success('به سبد خرید اضافه شد');
        refreshCart();
        if (buyNow) navigate('/cart');
      })
      .catch((err) =>
        toast.error(err.response?.data?.message || err.message || 'خطا در افزودن به سبد'),
      )
      .finally(() => setAdding(false));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <nav className="text-xs muted mb-4 flex gap-2 flex-wrap" aria-label="مسیر صفحه">
        <Link to="/">خانه</Link>
        <span>/</span>
        <Link to="/products">محصولات</Link>
        <span>/</span>
        <span>{product.name}</span>
      </nav>
      <div className="grid lg:grid-cols-2 gap-8">
        <div className="min-w-0">
          <div className="card rounded-3xl overflow-hidden aspect-square relative">
            <StorageImage
              file={images[activeImage]}
              alt={product.name}
              className="w-full h-full object-cover"
              eager
            />
            {discount && (
              <span className="absolute top-3 right-3 text-sm font-black px-3 py-1 rounded-full bg-yellow text-navy-900">
                {toFa(product.discount.percentage)}٪ تخفیف
              </span>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
              {images.map((image, index) => (
                <button
                  type="button"
                  key={getId(image) || index}
                  onClick={() => setActiveImage(index)}
                  aria-label={`تصویر ${toFa(index + 1)}`}
                  aria-pressed={index === activeImage}
                  className="w-20 h-20 rounded-xl overflow-hidden border-2 shrink-0"
                  style={{
                    borderColor: index === activeImage ? 'var(--primary-color)' : 'transparent',
                  }}
                >
                  <StorageImage file={image} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <h1 className="text-2xl font-black leading-9">{product.name}</h1>
          <div className="flex items-center gap-3 mt-2 text-sm muted flex-wrap">
            {ratingOf(product) > 0 && (
              <span className="flex items-center gap-1">
                <Star size={15} className="text-yellow" fill="currentColor" />
                {toFa(ratingOf(product).toFixed(1))}
              </span>
            )}
            <span>برند: {product.brand}</span>
            <span>•</span>
            <span>{statusFa(product.stock_status)}</span>
          </div>
          <p className="muted mt-3 leading-7">{product.short_description}</p>
          <div className="card rounded-3xl p-5 mt-4">
            {discount && (
              <div className="muted line-through text-sm">{formatPrice(product.price?.amount)}</div>
            )}
            <div className="text-3xl font-black text-yellow">
              {formatPrice(finalPrice(product))}
            </div>
            <div className="text-xs muted mt-2">
              موجودی: {toFa(product.stock)} عدد • سال تولید: {toFa(product.production)}
            </div>
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              <div className="flex items-center gap-1 btn-ghost !p-1">
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  className="p-2"
                  aria-label="کاهش تعداد"
                >
                  <Minus size={15} />
                </button>
                <span className="w-8 text-center font-black">{toFa(quantity)}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.min(product.stock || 1, value + 1))}
                  className="p-2"
                  aria-label="افزایش تعداد"
                >
                  <Plus size={15} />
                </button>
              </div>
              <button
                type="button"
                onClick={() => addToCart(false)}
                disabled={soldOut || adding}
                className="btn-ghost flex items-center gap-2 disabled:opacity-40"
              >
                <ShoppingCart size={17} /> افزودن به سبد
              </button>
              <button
                type="button"
                onClick={() => addToCart(true)}
                disabled={soldOut || adding}
                className="btn-yellow flex-1 min-w-[120px] disabled:opacity-40"
              >
                {adding ? 'در حال افزودن…' : 'خرید فوری'}
              </button>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => toggleFavorite(id)}
                className="btn-ghost flex-1 flex items-center justify-center gap-2 !py-2 text-sm"
              >
                <Heart
                  size={16}
                  fill={favorite ? '#ff4d6d' : 'none'}
                  color={favorite ? '#ff4d6d' : 'currentColor'}
                />{' '}
                علاقه‌مندی
              </button>
              <button
                type="button"
                onClick={() => toggleCompare(id)}
                className="btn-ghost flex-1 flex items-center justify-center gap-2 !py-2 text-sm"
              >
                <GitCompareArrows
                  size={16}
                  color={compare.includes(id) ? 'var(--primary-color)' : 'currentColor'}
                />{' '}
                مقایسه
              </button>
            </div>
          </div>

          {store && (
            <div className="card rounded-3xl p-4 mt-3 min-h-[88px] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <StorageImage
                  file={store.profile_image_id}
                  alt={store.name}
                  className="w-11 h-11 rounded-xl object-cover shrink-0"
                />
                <div className="min-w-0">
                  <div className="font-black text-sm truncate">{store.name}</div>
                  <div className="text-xs muted">{statusFa(store.status)}</div>
                </div>
              </div>
              <Link
                to={`/store/${getId(store)}`}
                className="btn-ghost !py-2 text-sm flex items-center gap-1 shrink-0"
              >
                <Store size={15} /> فروشگاه
              </Link>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
            <div className="card rounded-xl p-3">
              <ShieldCheck size={18} className="mx-auto mb-1 text-yellow" />
              {product.warranty ? 'دارای گارانتی' : 'بدون گارانتی'}
            </div>
            <div className="card rounded-xl p-3">
              <Truck size={18} className="mx-auto mb-1 text-yellow" />
              ارسال سریع
            </div>
            <div className="card rounded-xl p-3">
              <Package size={18} className="mx-auto mb-1 text-yellow" />
              ضمانت بازگشت
            </div>
          </div>
        </div>
      </div>

      <section className="card rounded-3xl p-6 mt-8">
        <h2 className="font-black text-lg mb-4">توضیحات محصول</h2>
        <MarkdownContent content={product.description} />
        <h2 className="font-black text-lg mt-8 mb-3">مشخصات فنی</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <Spec label="برند" value={product.brand} />
          <Spec label="سال تولید" value={toFa(product.production)} />
          <Spec label="ابعاد" value={formatDimensions(product.dimensions)} />
          <Spec label="وزن" value={formatWeight(product.weight)} />
          <Spec label="گارانتی" value={product.warranty ? 'دارد' : 'ندارد'} />
          <Spec label="وضعیت موجودی" value={statusFa(product.stock_status)} />
          <Spec label="ارز" value={product.price?.currency} />
          <Spec label="تاریخ ثبت" value={formatDateTime(product.created_at)} />
        </div>
        {!!product.tags?.length && (
          <div className="flex gap-2 mt-4 flex-wrap">
            {product.tags.map((tag) => (
              <span key={tag} className="chip !cursor-default">
                {tag}
              </span>
            ))}
          </div>
        )}
      </section>
      {related.length > 0 && (
        <section className="mt-8">
          <h2 className="font-black text-lg mb-4">محصولات مرتبط</h2>
          <ProductGrid products={related} columns={4} />
        </section>
      )}
    </div>
  );
}
