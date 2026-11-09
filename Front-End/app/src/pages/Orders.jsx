import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Package, ChevronDown } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { authHeaders } from '../utils/helpers/storage';
import { Loading } from '../components/Loading';
import { formatPrice, toFa, formatDateTime, statusFa } from '../utils/helpers/format';

const API = import.meta.env.VITE_APP_API_URL || 'http://localhost:3000';

export default function Orders() {
  const { user } = useShop();
  const [orders, setOrders] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!user) return setLoading(false);
    setLoading(true);
    axios
      .get(`${API}/orders?limit=50`, authHeaders())
      .then((res) => setOrders(res.data.body?.data || res.data.body || []))
      .catch((err) => console.error('Error fetching orders:', err))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const payOrder = (orderId) => {
    axios
      .post(`${API}/order/${orderId}/pay/`, {}, authHeaders())
      .then((res) => {
        const b = res.data.body || {};
        const url =
          b.pay_url ||
          b.url ||
          (b.authority ? `https://sandbox.zarinpal.com/pg/StartPay/${b.authority}` : null);
        if (url && /^https?:/.test(url)) window.location.href = url;
        else toast.info('درخواست پرداخت ارسال شد');
      })
      .catch((err) => toast.error(err.response?.data?.message || 'خطا در شروع پرداخت'));
  };

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center card rounded-3xl p-12">
        <Package size={36} className="mx-auto muted mb-3" />
        <p className="muted mb-4">برای مشاهده سفارش‌ها وارد شوید</p>
        <Link to="/auth/pre" className="btn-yellow">
          ورود
        </Link>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20">
        <Loading label="در حال دریافت سفارش‌ها…" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="font-black text-2xl mb-5 flex items-center gap-2">
        <Package size={24} className="text-yellow" /> سفارش‌های من ({toFa(orders.length)})
      </h1>
      {orders.length === 0 ? (
        <div className="card rounded-3xl p-12 text-center">
          <div className="font-black">سفارشی ثبت نشده است</div>
          <Link to="/products" className="btn-yellow inline-block mt-4">
            شروع خرید
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const payStatus = order.payment?.status || order.payment_status || 'pending';
            const subs = order.sub_orders || [];
            const isOpen = expanded === order._id;
            return (
              <div key={order._id} className="card rounded-2xl p-4">
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : order._id)}
                  className="w-full flex items-center justify-between flex-wrap gap-3 text-right"
                >
                  <div>
                    <div className="font-black text-sm flex items-center gap-2">
                      سفارش <span dir="ltr">#{order.order_number || String(order._id).slice(-8)}</span>
                      <ChevronDown
                        size={15}
                        className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </div>
                    <div className="text-xs muted mt-1">
                      {order.payment?.ref_id && (
                        <>
                          کد رهگیری: <span dir="ltr">{order.payment.ref_id}</span> •{' '}
                        </>
                      )}
                      {formatDateTime(order.created_at)}
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="font-black text-yellow">
                      {formatPrice(order.final_amount ?? order.total_amount ?? order.amount)}
                    </div>
                    <div className="text-xs muted mt-1">
                      {payStatus === 'paid' ? 'پرداخت‌شده' : 'در انتظار پرداخت'} • {toFa(subs.length)} مرسوله
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div className="mt-3 space-y-2 border-t border-theme pt-3">
                    {payStatus !== 'paid' && (
                      <button
                        type="button"
                        onClick={() => payOrder(order._id)}
                        className="btn-yellow !py-1.5 !px-3 text-xs"
                      >
                        پرداخت آنلاین سفارش
                      </button>
                    )}
                    {subs.map((sub) => (
                      <div key={sub._id} className="card2 rounded-xl p-3 text-sm">
                        <div className="flex justify-between flex-wrap gap-2">
                          <b dir="ltr">#{sub.order_number || String(sub._id).slice(-8)}</b>
                          <span className="chip !cursor-default text-xs">{statusFa(sub.status)}</span>
                        </div>
                        <div className="muted mt-1.5 text-xs leading-6">
                          {(sub.items || [])
                            .map((i) => `${i.product_name ?? i.name ?? ''} ×${toFa(i.quantity)}`)
                            .join('، ')}
                        </div>
                        <div className="font-black mt-1 text-yellow">
                          {formatPrice((sub.amount ?? sub.subtotal ?? 0) - (sub.discount_applied ?? 0))}
                        </div>
                      </div>
                    ))}
                    {order.customer_notes && (
                      <div className="text-xs muted">یادداشت: {order.customer_notes}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
