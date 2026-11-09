import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Trash2, Minus, Plus, ShoppingCart, ArrowLeft, LoaderCircle, Check } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { authHeaders } from '../utils/helpers/storage';
import StorageImage from '../components/StorageImage';
import { Loading } from '../components/Loading';
import { formatPrice, finalPrice, toFa, productImages } from '../utils/helpers/format';

const API = (import.meta.env.VITE_APP_API_URL || 'http://localhost:3000');
const SYNC_DELAY_MS = 1800;

export default function Cart() {
  const navigate = useNavigate();
  const { user, refreshCart, setCartCount } = useShop();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncState, setSyncState] = useState('idle'); // idle | pending | saving | saved
  const timersRef = useRef({});
  const pendingOpsRef = useRef({});

  const fetchCart = useCallback(async () => {
    if (!user) return setLoading(false);
    try {
      const res = await axios.get(`${API}/user/${user._id}/cart?limit=100`, authHeaders());
      const rows = res.data.body?.data || [];
      const detailed = await Promise.all(
        rows.map(async (row) => {
          try {
            const p = await axios.get(`${API}/product/${row.product_id}`);
            return { ...row, product: p.data.body };
          } catch {
            return null;
          }
        }),
      );
      const clean = detailed.filter(Boolean);
      setItems(clean);
      setCartCount(clean.reduce((s, c) => s + (c.quantity || 1), 0));
    } catch (err) {
      console.error('Error fetching cart:', err);
    } finally {
      setLoading(false);
    }
  }, [user, setCartCount]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // هنگام بستن کامپوننت تایمرهای معلق را پاک کن
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      Object.values(timers).forEach((t) => clearTimeout(t));
    };
  }, []);

  const executeOp = useCallback(
    async (productId, op) => {
      if (!user) return;
      delete timersRef.current[productId];
      delete pendingOpsRef.current[productId];
      setSyncState('saving');
      try {
        if (op.type === 'delete') {
          await axios.delete(`${API}/user/${user._id}/cart/${productId}`, authHeaders());
        } else {
          await axios.put(
            `${API}/user/${user._id}/cart/${productId}`,
            { quantity: op.quantity },
            authHeaders(),
          );
        }
        if (Object.keys(pendingOpsRef.current).length === 0) {
          setSyncState('saved');
          setTimeout(() => setSyncState((s) => (s === 'saved' ? 'idle' : s)), 1500);
        } else {
          setSyncState('pending');
        }
      } catch (err) {
        toast.error(err.response?.data?.message || 'خطا در همگام‌سازی سبد خرید');
        setSyncState('idle');
        fetchCart();
        refreshCart();
      }
    },
    [user, fetchCart, refreshCart],
  );

  const scheduleOp = (productId, op) => {
    if (timersRef.current[productId]) clearTimeout(timersRef.current[productId]);
    pendingOpsRef.current[productId] = op;
    setSyncState('pending');
    timersRef.current[productId] = setTimeout(() => {
      executeOp(productId, op);
    }, SYNC_DELAY_MS);
  };

  const changeQty = (productId, nextQty, maxStock) => {
    if (nextQty < 1) return;
    if (maxStock && nextQty > maxStock) {
      toast.warn(`حداکثر موجودی این کالا ${toFa(maxStock)} عدد است`);
      return;
    }
    const updated = items.map((it) =>
      it.product._id === productId ? { ...it, quantity: nextQty } : it,
    );
    setItems(updated);
    setCartCount(updated.reduce((s, c) => s + (c.quantity || 1), 0));
    scheduleOp(productId, { type: 'update', quantity: nextQty });
  };

  const remove = (productId) => {
    const updated = items.filter((it) => it.product._id !== productId);
    setItems(updated);
    setCartCount(updated.reduce((s, c) => s + (c.quantity || 1), 0));
    scheduleOp(productId, { type: 'delete' });
  };

  // قبل از رفتن به تسویه حساب، هر تغییری که هنوز در صف debounce هست را فوری می‌فرستیم
  const goToCheckout = async () => {
    const keys = Object.keys(pendingOpsRef.current);
    if (keys.length > 0) {
      setSyncState('saving');
      keys.forEach((k) => {
        if (timersRef.current[k]) clearTimeout(timersRef.current[k]);
      });
      await Promise.all(keys.map((k) => executeOp(k, pendingOpsRef.current[k])));
    }
    navigate('/checkout');
  };

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center card rounded-3xl p-12">
        <ShoppingCart size={40} className="mx-auto mb-3 muted" />
        <p className="muted mb-4">برای مشاهده سبد خرید وارد شوید</p>
        <Link to="/auth/pre" className="btn-yellow">
          ورود
        </Link>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20">
        <Loading label="در حال بارگذاری سبد خرید…" />
      </div>
    );
  }

  const subtotal = items.reduce((s, i) => s + finalPrice(i.product) * i.quantity, 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <h1 className="font-black text-2xl">سبد خرید ({toFa(items.length)})</h1>
        {syncState !== 'idle' && (
          <span className="text-xs muted flex items-center gap-1.5 card px-3 py-1.5 rounded-full">
            {syncState === 'pending' && (
              <>
                <LoaderCircle size={13} className="animate-spin text-yellow" /> در انتظار ثبت تغییرات…
              </>
            )}
            {syncState === 'saving' && (
              <>
                <LoaderCircle size={13} className="animate-spin text-yellow" /> در حال همگام‌سازی با سرور…
              </>
            )}
            {syncState === 'saved' && (
              <>
                <Check size={13} className="text-emerald-400" /> در سرور ذخیره شد
              </>
            )}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="card rounded-3xl p-12 text-center">
          <div className="font-black">سبد خرید خالی است</div>
          <Link to="/products" className="btn-yellow inline-block mt-4">
            شروع خرید
          </Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_320px] gap-5 items-start">
          <div className="space-y-3">
            {items.map(({ _id, product, quantity }) => (
              <div key={_id} className="card rounded-2xl p-3 flex gap-3">
                <Link
                  to={`/product/${product._id}`}
                  className="w-24 h-24 rounded-xl overflow-hidden shrink-0"
                >
                  <StorageImage
                    file={productImages(product)[0]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/product/${product._id}`} className="font-bold text-sm line-clamp-2">
                    {product.name}
                  </Link>
                  <div className="text-xs muted mt-1">{product.brand}</div>
                  <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
                    <div className="flex items-center gap-1 btn-ghost !p-1">
                      <button
                        type="button"
                        onClick={() => changeQty(product._id, quantity - 1, product.stock)}
                        className="p-1.5 disabled:opacity-30"
                        disabled={quantity <= 1}
                        aria-label="کاهش تعداد"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-7 text-center font-black text-sm">{toFa(quantity)}</span>
                      <button
                        type="button"
                        onClick={() => changeQty(product._id, quantity + 1, product.stock)}
                        className="p-1.5"
                        aria-label="افزایش تعداد"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <div className="font-black text-yellow">
                      {formatPrice(finalPrice(product) * quantity)}
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(product._id)}
                      className="text-red-400 p-2 hover:bg-red-500/10 rounded-lg"
                      aria-label="حذف از سبد"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card rounded-3xl p-5 lg:sticky lg:top-36">
            <h2 className="font-black mb-3">خلاصه سفارش</h2>
            <div className="flex justify-between text-sm muted">
              <span>جمع اقلام</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm muted mt-1">
              <span>هزینه ارسال</span>
              <span>محاسبه در تسویه</span>
            </div>
            <div className="border-t border-theme mt-3 pt-3 flex justify-between font-black">
              <span>مبلغ قابل پرداخت</span>
              <span className="text-yellow">{formatPrice(subtotal)}</span>
            </div>
            <button
              type="button"
              onClick={goToCheckout}
              disabled={syncState === 'saving'}
              className="btn-yellow w-full flex items-center justify-center gap-2 mt-4 disabled:opacity-60"
            >
              ادامه و تسویه <ArrowLeft size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
