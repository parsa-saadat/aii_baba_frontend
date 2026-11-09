import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { MapPin, Plus, CreditCard } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { authHeaders } from '../utils/helpers/storage';
import StorageImage from '../components/StorageImage';
import { formatPrice, finalPrice, toFa, productImages } from '../utils/helpers/format';

const API = (import.meta.env.VITE_APP_API_URL || 'http://localhost:3000');
const EMPTY = {
  full_name: '',
  province: '',
  city: '',
  neighborhood: '',
  full_address: '',
  building_number: '',
  unit: '',
  postal_code: '',
};

export default function Checkout() {
  const navigate = useNavigate();
  const { user, refreshCart } = useShop();
  const [addresses, setAddresses] = useState([]);
  const [selected, setSelected] = useState('');
  const [note, setNote] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const load = useCallback(async () => {
    if (!user) return setLoading(false);
    try {
      const [a, c] = await Promise.all([
        axios.get(`${API}/users/${user._id}/address`, authHeaders()),
        axios.get(`${API}/user/${user._id}/cart?limit=100`, authHeaders()),
      ]);
      const list = Array.isArray(a.data.body) ? a.data.body : a.data.body?.data || [];
      setAddresses(list);
      const def = list.find((x) => x.is_default || x.address?.is_default) || list[0];
      if (def) setSelected(def._id);
      const rows = c.data.body?.data || [];
      const detailed = await Promise.all(
        rows.map(async (row) => {
          const p = await axios.get(`${API}/product/${row.product_id}`).catch(() => null);
          return p ? { ...row, product: p.data.body } : null;
        }),
      );
      setItems(detailed.filter(Boolean));
    } catch (err) {
      console.error('Error loading checkout:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user)
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center muted">
        برای تسویه حساب وارد شوید
      </div>
    );
  if (loading)
    return <div className="max-w-5xl mx-auto px-4 py-20 text-center muted">در حال بارگذاری…</div>;

  const subtotal = items.reduce((s, i) => s + finalPrice(i.product) * i.quantity, 0);

  const addAddress = () => {
    if (!form.full_name || !form.province || !form.city || !form.neighborhood || !form.full_address || !form.building_number || !form.unit || !form.postal_code) {
      return toast.error('لطفاً تمام فیلدهای آدرس را کامل وارد کنید');
    }
    axios
      .post(
        `${API}/users/${user._id}/address`,
        {
          address: {
            full_name: form.full_name,
            province: form.province,
            city: form.city,
            neighborhood: form.neighborhood,
            full_address: form.full_address,
            building_number: Number(form.building_number),
            unit: Number(form.unit),
            postal_code: form.postal_code,
            is_default: addresses.length === 0,
          },
        },
        authHeaders(),
      )
      .then(() => {
        toast.success('آدرس اضافه شد');
        setShowForm(false);
        setForm(EMPTY);
        load();
      })
      .catch((err) => toast.error(err.response?.data?.message || 'خطا در ثبت آدرس'));
  };

  // ثبت سفارش → درخواست پرداخت → هدایت به درگاه (زرین‌پال)
  const submitOrder = async () => {
    if (!selected) return toast.error('یک آدرس انتخاب کنید');
    if (!items.length) return toast.error('سبد خرید خالی است');
    setPaying(true);
    try {
      const order = await axios.post(
        `${API}/order`,
        { address_id: selected, note: note || undefined },
        authHeaders(),
      );
      const orderId = order.data.body?.parent?._id || order.data.body?._id;
      const pay = await axios.post(`${API}/order/${orderId}/pay/`, {}, authHeaders());
      const body = pay.data.body || {};
      refreshCart();
      // بک‌اند یا URL درگاه می‌ده یا authority
      const url =
        body.pay_url ||
        body.url ||
        body.payment_url ||
        (body.authority ? `https://sandbox.zarinpal.com/pg/StartPay/${body.authority}` : null);
      if (url && /^https?:/.test(url)) {
        window.location.href = url;
      } else {
        toast.success('سفارش ثبت شد');
        navigate('/orders');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'خطا در ثبت سفارش');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="font-black text-2xl mb-5">تسویه حساب</h1>
      <div className="grid lg:grid-cols-[1fr_340px] gap-5 items-start">
        <div className="space-y-4">
          <div className="card rounded-3xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-black flex items-center gap-2">
                <MapPin size={18} className="text-yellow" /> آدرس تحویل
              </h2>
              <button
                onClick={() => setShowForm((v) => !v)}
                className="btn-ghost !py-1.5 !px-3 text-sm flex items-center gap-1"
              >
                <Plus size={14} /> آدرس جدید
              </button>
            </div>
            {showForm && (
              <div
                className="grid sm:grid-cols-2 gap-2 mb-4 p-3 rounded-2xl"
                style={{ background: 'var(--card2)' }}
              >
                <input
                  className="input sm:col-span-2"
                  placeholder="نام و نام خانوادگی گیرنده"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                />
                <input
                  className="input"
                  placeholder="استان"
                  value={form.province}
                  onChange={(e) => setForm({ ...form, province: e.target.value })}
                />
                <input
                  className="input"
                  placeholder="شهر"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
                <input
                  className="input"
                  placeholder="محله"
                  value={form.neighborhood}
                  onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
                />
                <input
                  className="input"
                  dir="ltr"
                  placeholder="کد پستی ۱۰ رقمی"
                  value={form.postal_code}
                  onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                />
                <input
                  className="input sm:col-span-2"
                  placeholder="آدرس کامل"
                  value={form.full_address}
                  onChange={(e) => setForm({ ...form, full_address: e.target.value })}
                />
                <input
                  className="input"
                  type="number"
                  placeholder="پلاک"
                  value={form.building_number}
                  onChange={(e) => setForm({ ...form, building_number: e.target.value })}
                />
                <input
                  className="input"
                  type="number"
                  placeholder="واحد"
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                />
                <button onClick={addAddress} className="btn-yellow sm:col-span-2">
                  ذخیره آدرس
                </button>
              </div>
            )}
            <div className="space-y-2">
              {addresses.length === 0 && <div className="text-sm muted">آدرسی ثبت نشده است.</div>}
              {addresses.map((a) => {
                const ad = a.address || a;
                return (
                  <label
                    key={a._id}
                    className="flex gap-3 p-3 rounded-2xl border cursor-pointer"
                    style={{
                      borderColor: selected === a._id ? 'var(--primary-color)' : 'var(--border)',
                    }}
                  >
                    <input
                      type="radio"
                      name="address"
                      checked={selected === a._id}
                      onChange={() => setSelected(a._id)}
                      className="mt-1"
                    />
                    <div className="text-sm">
                      <b>{a.title || ad.title || 'آدرس'}</b> — {ad.province}، {ad.city}
                      <div className="muted">{ad.full_address}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="card rounded-3xl p-5">
            <h2 className="font-black mb-3">یادداشت سفارش (اختیاری)</h2>
            <textarea
              className="input"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="card rounded-3xl p-5">
            <h2 className="font-black mb-3">اقلام سفارش ({toFa(items.length)})</h2>
            {items.map(({ _id, product, quantity }) => (
              <div
                key={_id}
                className="flex items-center gap-3 py-2 border-b border-theme last:border-0"
              >
                <StorageImage
                  file={productImages(product)[0]}
                  alt={product.name}
                  className="w-12 h-12 rounded-lg object-cover shrink-0"
                />
                <div className="flex-1 text-sm line-clamp-1">{product.name}</div>
                <div className="text-sm muted">×{toFa(quantity)}</div>
                <div className="text-sm font-black">
                  {formatPrice(finalPrice(product) * quantity)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card rounded-3xl p-5 lg:sticky lg:top-40">
          <h2 className="font-black mb-3">مبلغ نهایی</h2>
          <div className="flex justify-between text-sm muted">
            <span>جمع اقلام</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm muted mt-1">
            <span>هزینه ارسال</span>
            <span>طبق تعرفه بک‌اند</span>
          </div>
          <div className="border-t border-theme mt-3 pt-3 flex justify-between font-black text-lg">
            <span>قابل پرداخت</span>
            <span className="text-yellow">{formatPrice(subtotal)}</span>
          </div>
          <button
            onClick={submitOrder}
            disabled={paying}
            className="btn-yellow w-full mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <CreditCard size={17} /> {paying ? 'در حال انتقال…' : 'ثبت سفارش و پرداخت'}
          </button>
          <p className="text-[11px] muted text-center mt-2">پرداخت از طریق درگاه زرین‌پال</p>
        </div>
      </div>
    </div>
  );
}
