import axios from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  LayoutDashboard,
  Package,
  Store,
  ShoppingBag,
  CreditCard,
  Settings,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Search,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Mail,
  Phone,
  Printer,
  ShieldCheck,
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { authHeaders } from '../utils/helpers/storage';
import DashboardLayout from '../components/DashboardLayout';
import StorageImage from '../components/StorageImage';
import ImageLightbox from '../components/ImageLightbox';
import ProductEditor from '../components/ProductEditor';
import StoreEditorModal from '../components/StoreEditorModal';
import { Loading } from '../components/Loading';
import {
  formatPrice,
  toFa,
  statusFa,
  productImages,
  formatDateTime,
  finalPrice,
  hasDiscount,
} from '../utils/helpers/format';
import { getId } from '../utils/helpers/response';
import { nationalIDValidator } from '../utils/validators/national_id.validator';
import { cardNumberValidator } from '../utils/validators/card_number.validator';
import { shebaNumberValidator } from '../utils/validators/sheba_number.validator';

const API = import.meta.env.VITE_APP_API_URL || 'http://localhost:3000';

export default function SellerPanel() {
  const { user, refreshUser } = useShop();
  const [tab, setTab] = useState('dash');
  const [sellerDoc, setSellerDoc] = useState(null);
  const [products, setProducts] = useState([]);
  const [stores, setStores] = useState([]);
  const [subOrders, setSubOrders] = useState([]);
  const [plans, setPlans] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editingProduct, setEditingProduct] = useState(undefined); // undefined=list, null=new, obj=edit
  const [storeModal, setStoreModal] = useState(undefined); // undefined=closed, null=new, obj=edit
  const [zoomFile, setZoomFile] = useState(null);
  const [productQuery, setProductQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  // فرم ویرایش تنظیمات فروشنده
  const [editingSettings, setEditingSettings] = useState(false);
  const [sellerForm, setSellerForm] = useState({
    seller_type: 'Individual_seller',
    national_ID: '',
    birth_date: '',
    province: '',
    city: '',
    full_address: '',
    card_number: '',
    sheba_number: '',
    firstname_lastname: '',
  });

  const load = useCallback(async () => {
    if (!user) return setLoading(false);
    setLoading(true);
    const get = (u) =>
      axios
        .get(`${API}${u}`, authHeaders())
        .then((r) => r.data.body)
        .catch(() => null);
    const [p, s, o, pl, c, sel] = await Promise.all([
      get('/perm/products?limit=100'),
      get('/perm/stores?limit=50'),
      get('/order/sub/all?limit=100'),
      get('/plan?limit=50'),
      get('/category?limit=100'),
      get(`/seller/${user._id}`),
    ]);
    setProducts(p?.data || []);
    setStores(s?.data || []);
    setSubOrders(o?.data || []);
    setPlans(pl?.data || []);
    setCategories(c?.data || []);
    if (sel) {
      setSellerDoc(sel);
      setSellerForm({
        seller_type: sel.seller_type || 'Individual_seller',
        national_ID: sel.national_ID || '',
        birth_date: sel.birth_date || '',
        province: sel.address?.province || '',
        city: sel.address?.city || '',
        full_address: sel.address?.full_address || '',
        card_number: sel.settlement_account?.card_number || '',
        sheba_number: sel.settlement_account?.sheba_number || '',
        firstname_lastname: sel.settlement_account?.firstname_lastname || '',
      });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const activeUser = sellerDoc || user;
  const storeMap = useMemo(
    () => Object.fromEntries(stores.map((s) => [getId(s), s])),
    [stores],
  );
  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [getId(c), c])),
    [categories],
  );

  const pendingOrders = useMemo(
    () => subOrders.filter((s) => s.status === 'awaiting_approval').length,
    [subOrders],
  );
  const filteredProducts = useMemo(
    () =>
      productQuery.trim()
        ? products.filter(
            (p) =>
              p.name?.toLowerCase().includes(productQuery.toLowerCase()) ||
              p.brand?.toLowerCase().includes(productQuery.toLowerCase()),
          )
        : products,
    [products, productQuery],
  );
  const filteredOrders = useMemo(
    () =>
      orderStatusFilter === 'ALL'
        ? subOrders
        : subOrders.filter((s) => s.status === orderStatusFilter),
    [subOrders, orderStatusFilter],
  );

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card rounded-3xl p-8 max-w-md w-full text-center space-y-4">
          <Store size={38} className="mx-auto text-yellow" />
          <h1 className="font-black text-xl">ورود به پنل فروشندگان</h1>
          <p className="text-sm muted">برای دسترسی به داشبورد فروشندگی ابتدا وارد شوید.</p>
          <Link to="/auth/pre" className="btn-yellow inline-block">
            ورود به حساب
          </Link>
        </div>
      </div>
    );
  }

  if (!(user.is_seller || user.role === 'seller' || user.role === 'admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card rounded-3xl p-8 max-w-md w-full text-center space-y-4">
          <Store size={38} className="mx-auto text-yellow" />
          <h1 className="font-black text-xl">حساب فروشندگی ندارید</h1>
          <p className="text-sm muted">
            ابتدا از بخش پنل کاربری درخواست فروشندگی خود را ثبت کنید.
          </p>
          <div className="flex gap-2 justify-center">
            <Link to="/profile" className="btn-yellow">
              درخواست فروشندگی
            </Link>
            <Link to="/" className="btn-ghost">
              بازگشت به فروشگاه
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const onErr = (err, fallback) => toast.error(err.response?.data?.message || fallback);

  const deleteProduct = (id) => {
    if (!confirm('این محصول حذف شود؟')) return;
    axios
      .delete(`${API}/product/${id}`, authHeaders())
      .then(() => {
        toast.success('محصول حذف شد');
        load();
      })
      .catch((e) => onErr(e, 'خطا در حذف محصول'));
  };

  const toggleStoreStatus = (store) => {
    if (store.status === 'ROOT_DISABLE') {
      toast.error('این فروشگاه توسط مدیر مسدود شده و قابل تغییر نیست');
      return;
    }
    const nextStatus = store.status === 'ENABLE' ? 'DISABLE' : 'ENABLE';
    axios
      .put(
        `${API}/store/${getId(store)}`,
        {
          status: nextStatus,
          contact_info: store.contact_info,
        },
        authHeaders(),
      )
      .then(() => {
        toast.success(`وضعیت فروشگاه به ${statusFa(nextStatus)} تغییر کرد`);
        load();
      })
      .catch((e) => onErr(e, 'خطا در تغییر وضعیت فروشگاه'));
  };

  const deleteStore = async (store) => {
    if (!confirm(`آیا از حذف فروشگاه «${store.name}» مطمئن هستید؟`)) return;
    try {
      await axios.delete(`${API}/store/${getId(store)}`, authHeaders());
      toast.success('فروشگاه حذف شد');
      load();
    } catch (e) {
      const msg = e.response?.data?.message || '';
      // در alibaba_backend متد deleteStoreService باگ userId is not defined دارد؛
      // در صورت بروز خطای سرور 500، گزینه غیرفعال کردن خودکار را ارائه می‌دهیم.
      if (e.response?.status === 500 || msg.includes('userId')) {
        toast.warn('حذف از سمت بک‌اند با خطای سرور مواجه شد؛ فروشگاه غیرفعال می‌شود.');
        try {
          await axios.put(
            `${API}/store/${getId(store)}`,
            { status: 'DISABLE', contact_info: store.contact_info },
            authHeaders(),
          );
          load();
        } catch (err2) {
          onErr(err2, 'خطا در غیرفعال کردن فروشگاه');
        }
      } else {
        onErr(e, 'خطا در حذف فروشگاه');
      }
    }
  };

  const approveSubOrder = (id) => {
    axios
      .put(`${API}/order/sub/${id}/approve`, {}, authHeaders())
      .then(() => {
        toast.success('سفارش تأیید شد');
        load();
      })
      .catch((e) => onErr(e, 'خطا در تأیید سفارش'));
  };

  const updateSubOrderStatus = (id, status) => {
    axios
      .put(`${API}/order/sub/${id}/status`, { status }, authHeaders())
      .then(() => {
        toast.success('وضعیت سفارش به‌روزرسانی شد');
        load();
      })
      .catch((e) => onErr(e, 'خطا در تغییر وضعیت'));
  };

  const submitCancelSubOrder = (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) return toast.error('لطفاً دلیل لغو را وارد کنید');
    axios
      .put(`${API}/order/sub/${cancelTarget}`, { reason: cancelReason.trim() }, authHeaders())
      .then(() => {
        toast.success('سفارش لغو شد');
        setCancelTarget(null);
        setCancelReason('');
        load();
      })
      .catch((err) => onErr(err, 'خطا در لغو سفارش'));
  };

  const buyPlan = (planId) => {
    axios
      .post(`${API}/plan/${planId}/pay`, {}, authHeaders())
      .then((res) => {
        const b = res.data.body || {};
        const url =
          b.pay_url ||
          b.url ||
          (b.authority ? `https://sandbox.zarinpal.com/pg/StartPay/${b.authority}` : null);
        if (url && /^https?:/.test(url)) window.location.href = url;
        else {
          toast.success('درخواست پلن ثبت شد');
          refreshUser();
        }
      })
      .catch((e) => onErr(e, 'خطا در خرید پلن'));
  };

  const saveSellerSettings = (e) => {
    e.preventDefault();
    if (!nationalIDValidator(sellerForm.national_ID)) return toast.error('کد ملی معتبر نیست');
    if (!cardNumberValidator(sellerForm.card_number)) return toast.error('شماره کارت معتبر نیست');
    if (!shebaNumberValidator(sellerForm.sheba_number)) return toast.error('شماره شبا معتبر نیست');
    if (!sellerForm.province || !sellerForm.city || !sellerForm.full_address) {
      return toast.error('اطلاعات آدرس کامل نیست');
    }
    axios
      .put(
        `${API}/seller/${user._id}`,
        {
          seller_type: sellerForm.seller_type,
          national_ID: sellerForm.national_ID,
          birth_date: sellerForm.birth_date,
          address: {
            province: sellerForm.province,
            city: sellerForm.city,
            full_address: sellerForm.full_address,
          },
          settlement_account: {
            type: 'card',
            card_number: sellerForm.card_number.replace(/\s/g, ''),
            sheba_number: sellerForm.sheba_number.replace(/\s/g, '').toUpperCase(),
            firstname_lastname: sellerForm.firstname_lastname,
          },
        },
        authHeaders(),
      )
      .then(() => {
        toast.success('اطلاعات فروشندگی ذخیره شد');
        setEditingSettings(false);
        refreshUser();
        load();
      })
      .catch((err) => onErr(err, 'خطا در ذخیره اطلاعات فروشندگی'));
  };

  const subAmount = (sub) => (sub.amount ?? sub.subtotal ?? 0) - (sub.discount_applied ?? 0);
  const revenue = subOrders
    .filter((s) => !['cancelled', 'rejected'].includes(s.status))
    .reduce((sum, s) => sum + subAmount(s), 0);
  const curPlan = plans.find((pl) => getId(pl) === getId(activeUser.seller_plan?.plan_id));
  const planExpiry =
    curPlan?.duration_days && activeUser.seller_plan?.start_at
      ? new Date(
          new Date(activeUser.seller_plan.start_at).getTime() +
            curPlan.duration_days * 24 * 60 * 60 * 1000,
        )
      : null;

  const navItems = [
    { key: 'dash', label: 'داشبورد', icon: LayoutDashboard },
    { key: 'products', label: 'مدیریت محصولات', icon: Package, badge: products.length },
    { key: 'stores', label: 'فروشگاه‌های من', icon: Store, badge: stores.length },
    { key: 'orders', label: 'سفارش‌ها', icon: ShoppingBag, badge: pendingOrders },
    { key: 'plans', label: 'اشتراک و پلن‌ها', icon: CreditCard },
    { key: 'settings', label: 'تنظیمات فروشنده', icon: Settings },
  ];

  const isSellerActive = String(activeUser.seller_active_status).toUpperCase() === 'ACTIVE';

  return (
    <DashboardLayout
      title="پنل فروشندگان"
      roleLabel={activeUser.seller_approved_status ? 'فروشنده تأییدشده' : 'در انتظار تأیید'}
      subtitle={`فعالیت: ${statusFa(activeUser.seller_active_status)}${curPlan ? ` • پلن ${curPlan.name}` : ''}`}
      navItems={navItems}
      activeTab={tab}
      onTabChange={(next) => {
        setTab(next);
        setEditingProduct(undefined);
      }}
      headerActions={
        <button
          type="button"
          onClick={load}
          className="btn-ghost !p-2"
          title="بروزرسانی اطلاعات"
          aria-label="بروزرسانی"
        >
          <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
        </button>
      }
    >
      {loading ? (
        <div className="py-12 space-y-5">
          <Loading label="در حال دریافت اطلاعات فروشندگی…" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-28" />
            ))}
          </div>
          <div className="skeleton h-64" />
        </div>
      ) : (
        <>
          {(!activeUser.seller_approved_status || !activeUser.seller_plan?.plan_id) && (
            <div className="mb-5 rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap bg-navy text-white border border-[#ffd60a]/40">
              <div className="flex items-center gap-2.5 text-sm">
                <AlertCircle size={19} className="text-brand-yellow shrink-0" />
                <span>
                  {!activeUser.seller_approved_status
                    ? 'حساب فروشندگی شما در انتظار تأیید مدیر سیستم است.'
                    : 'برای ساخت فروشگاه و ثبت محصول باید یک پلن فعال داشته باشید.'}
                </span>
              </div>
              {!activeUser.seller_plan?.plan_id && (
                <button
                  type="button"
                  onClick={() => setTab('plans')}
                  className="btn-yellow !py-1.5 !px-3 text-xs"
                >
                  انتخاب پلن
                </button>
              )}
            </div>
          )}

          {tab === 'dash' && (
            <div className="space-y-6">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'درآمد کل', value: formatPrice(revenue), icon: CreditCard },
                  { label: 'سفارش‌های در انتظار', value: toFa(pendingOrders), icon: ShoppingBag },
                  { label: 'محصولات ثبت‌شده', value: toFa(products.length), icon: Package },
                  { label: 'فروشگاه‌ها', value: toFa(stores.length), icon: Store },
                ].map((stat) => (
                  <div key={stat.label} className="card rounded-2xl p-5 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs muted font-bold">{stat.label}</div>
                      <div className="font-black text-2xl mt-2 text-yellow">{stat.value}</div>
                    </div>
                    <span className="w-10 h-10 rounded-xl bg-navy text-brand-yellow grid place-items-center shrink-0">
                      <stat.icon size={19} />
                    </span>
                  </div>
                ))}
              </div>

              <div className="grid lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 card rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-black">آخرین سفارش‌های فروشگاه</h2>
                    <button type="button" onClick={() => setTab('orders')} className="text-xs font-bold text-yellow">
                      مشاهده همه
                    </button>
                  </div>
                  {subOrders.length === 0 ? (
                    <p className="text-sm muted py-8 text-center">هنوز سفارشی ثبت نشده است.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {subOrders.slice(0, 5).map((sub) => (
                        <div key={sub._id} className="card2 rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap text-sm">
                          <div>
                            <b dir="ltr">#{sub.order_number || String(sub._id).slice(-8)}</b>
                            <span className="text-xs muted mr-2">{formatDateTime(sub.created_at ?? sub.create_at)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="chip !cursor-default !py-0.5 !px-2.5 text-[11px]">{statusFa(sub.status)}</span>
                            <b className="text-yellow">{formatPrice(subAmount(sub))}</b>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="card rounded-2xl p-5 space-y-4">
                  <h2 className="font-black">وضعیت پلن و فروشگاه</h2>
                  <div className="card2 rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="muted">پلن فعال</span>
                      <b>{curPlan ? curPlan.name : 'ندارد'}</b>
                    </div>
                    <div className="flex justify-between">
                      <span className="muted">سقف محصول</span>
                      <b>{curPlan ? `${toFa(products.length)} / ${toFa(curPlan.features?.max_products ?? 0)}` : '—'}</b>
                    </div>
                    <div className="flex justify-between">
                      <span className="muted">سقف فروشگاه</span>
                      <b>{curPlan ? `${toFa(stores.length)} / ${toFa(curPlan.features?.max_shops ?? 0)}` : '—'}</b>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTab('products');
                        setEditingProduct(null);
                      }}
                      className="btn-yellow !py-2.5 text-xs"
                    >
                      + محصول جدید
                    </button>
                    <button type="button" onClick={() => setTab('stores')} className="btn-ghost !py-2.5 text-xs">
                      مدیریت فروشگاه
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── مدیریت محصولات (کاملاً واکنش‌گرا بدون اسکرول افقی + ویرایشگر پیشرفته Markdown) ── */}
          {tab === 'products' && (
            editingProduct !== undefined ? (
              <ProductEditor
                product={editingProduct}
                stores={stores}
                categories={categories}
                onCancel={() => setEditingProduct(undefined)}
                onSaved={() => {
                  setEditingProduct(undefined);
                  load();
                }}
              />
            ) : (
              <div className="space-y-4">
                <div className="card rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 muted" />
                    <input
                      className="input !pr-9 !py-2 text-sm"
                      placeholder="جستجو در محصولات یا برند…"
                      value={productQuery}
                      onChange={(e) => setProductQuery(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="btn-yellow !py-2.5 text-sm flex items-center gap-1.5"
                  >
                    <Plus size={16} /> افزودن محصول جدید
                  </button>
                </div>

                {filteredProducts.length === 0 ? (
                  <div className="card rounded-2xl p-12 text-center space-y-3">
                    <Package size={36} className="mx-auto muted" />
                    <div className="font-black">محصولی یافت نشد</div>
                    <button
                      type="button"
                      onClick={() => setEditingProduct(null)}
                      className="btn-yellow !py-2 text-xs inline-flex items-center gap-1"
                    >
                      <Plus size={14} /> اولین محصول را بسازید
                    </button>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredProducts.map((p) => {
                      const storeName = storeMap[getId(p.store_id)]?.name || '—';
                      const catName = categoryMap[getId(p.category_id)]?.name || '—';
                      const disc = hasDiscount(p);
                      return (
                        <div key={p._id} className="card rounded-2xl p-4 flex flex-col gap-3">
                          <div className="flex gap-3 items-start">
                            <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-theme">
                              <StorageImage
                                file={productImages(p)[0]}
                                alt={p.name}
                                className="w-full h-full object-cover"
                                onZoom={(f, a) => setZoomFile({ file: f, alt: a })}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <Link to={`/product/${p._id}`} className="font-black text-sm line-clamp-2 hover:underline">
                                {p.name}
                              </Link>
                              <div className="text-xs muted mt-1 truncate">
                                {p.brand} • {catName}
                              </div>
                              <div className="text-xs muted mt-0.5 truncate">فروشگاه: {storeName}</div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-theme flex-wrap">
                            <div>
                              {disc && (
                                <div className="text-[11px] muted line-through">
                                  {formatPrice(p.price?.amount)}
                                </div>
                              )}
                              <div className="font-black text-sm text-yellow">
                                {formatPrice(finalPrice(p))}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="chip !cursor-default !py-0.5 !px-2 text-[11px]">
                                موجودی: {toFa(p.stock)}
                              </span>
                              <span className="chip !cursor-default !py-0.5 !px-2 text-[11px]">
                                {statusFa(String(p.status).toUpperCase())}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingProduct(p)}
                              className="btn-ghost !py-2 text-xs flex-1 flex items-center justify-center gap-1"
                            >
                              <Pencil size={13} /> ویرایش کامل
                            </button>
                            <Link
                              to={`/product/${p._id}`}
                              className="btn-ghost !p-2"
                              title="مشاهده در سایت"
                            >
                              <ExternalLink size={14} />
                            </Link>
                            <button
                              type="button"
                              onClick={() => deleteProduct(p._id)}
                              className="btn-ghost !p-2 text-red-400"
                              title="حذف محصول"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )
          )}

          {/* ── فروشگاه‌های من (اصلاح کامل با بنر و آواتار و بزرگ‌نمایی و مدیریت خطای deleteStore) ── */}
          {tab === 'stores' && (
            <div className="space-y-4">
              <div className="card rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="font-black">فروشگاه‌های من ({toFa(stores.length)})</h2>
                  <p className="text-xs muted mt-0.5">مدیریت اطلاعات تماس، تصاویر و وضعیت فروشگاه‌ها</p>
                </div>
                <button
                  type="button"
                  onClick={() => setStoreModal(null)}
                  className="btn-yellow !py-2.5 text-sm flex items-center gap-1.5"
                >
                  <Plus size={16} /> ایجاد فروشگاه جدید
                </button>
              </div>

              {stores.length === 0 ? (
                <div className="card rounded-2xl p-12 text-center space-y-3">
                  <Store size={38} className="mx-auto muted" />
                  <div className="font-black">هنوز فروشگاهی نساخته‌اید</div>
                  <button type="button" onClick={() => setStoreModal(null)} className="btn-yellow !py-2 text-xs">
                    ساخت اولین فروشگاه
                  </button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-5">
                  {stores.map((s) => (
                    <div key={s._id} className="card rounded-3xl overflow-hidden flex flex-col">
                      <div className="h-32 w-full bg-navy relative">
                        <StorageImage
                          file={s.banner_image_id}
                          alt={`بنر ${s.name}`}
                          className="w-full h-full object-cover"
                          onZoom={s.banner_image_id ? (f, a) => setZoomFile({ file: f, alt: a }) : null}
                          fallback={
                            <div
                              className="w-full h-full"
                              style={{
                                background: 'linear-gradient(135deg,#0a1736 0%,#162e66 70%,#ffd60a33 100%)',
                              }}
                            />
                          }
                        />
                        <span
                          className={`absolute top-3 left-3 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                            s.status === 'ENABLE'
                              ? 'bg-emerald-500 text-white'
                              : s.status === 'ROOT_DISABLE'
                                ? 'bg-red-600 text-white'
                                : 'bg-amber-500 text-[#0a1736]'
                          }`}
                        >
                          {statusFa(s.status)}
                        </span>
                      </div>

                      <div className="p-5 flex-1 flex flex-col gap-3">
                        <div className="flex items-end gap-3 -mt-12 relative">
                          <div className="w-16 h-16 rounded-2xl overflow-hidden border-4 border-[var(--card)] bg-navy shrink-0 grid place-items-center font-black text-xl shadow-lg">
                            <StorageImage
                              file={s.profile_image_id}
                              alt={s.name}
                              className="w-full h-full object-cover"
                              onZoom={s.profile_image_id ? (f, a) => setZoomFile({ file: f, alt: a }) : null}
                              fallback={<span className="text-brand-yellow">{s.name?.[0] || 'ف'}</span>}
                            />
                          </div>
                          <div className="min-w-0 pt-2">
                            <Link to={`/store/${s._id}`} className="font-black text-base hover:underline block truncate">
                              {s.name}
                            </Link>
                            <div className="text-[11px] muted">
                              ثبت: {formatDateTime(s.created_at ?? s.create_at)}
                            </div>
                          </div>
                        </div>

                        {s.description && <p className="text-xs muted leading-6">{s.description}</p>}

                        <div className="grid sm:grid-cols-2 gap-2 text-xs">
                          <div className="card2 rounded-xl p-2.5 flex items-center gap-2 truncate">
                            <Mail size={13} className="text-yellow shrink-0" />
                            <span dir="ltr" className="truncate">{s.contact_info?.email || '—'}</span>
                          </div>
                          <div className="card2 rounded-xl p-2.5 flex items-center gap-2 truncate">
                            {s.contact_info?.phone ? (
                              <Phone size={13} className="text-yellow shrink-0" />
                            ) : (
                              <Printer size={13} className="text-yellow shrink-0" />
                            )}
                            <span dir="ltr" className="truncate">
                              {s.contact_info?.phone || s.contact_info?.fax || '—'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2 mt-auto border-t border-theme flex-wrap">
                          <button
                            type="button"
                            onClick={() => setStoreModal(s)}
                            className="btn-ghost !py-2 !px-3 text-xs flex items-center gap-1"
                          >
                            <Pencil size={13} /> ویرایش
                          </button>
                          {s.status !== 'ROOT_DISABLE' && (
                            <button
                              type="button"
                              onClick={() => toggleStoreStatus(s)}
                              className="btn-ghost !py-2 !px-3 text-xs"
                            >
                              {s.status === 'ENABLE' ? 'غیرفعال کردن' : 'فعال کردن'}
                            </button>
                          )}
                          <Link
                            to={`/store/${s._id}`}
                            className="btn-ghost !py-2 !px-3 text-xs flex items-center gap-1"
                          >
                            <ExternalLink size={13} /> نمایش
                          </Link>
                          <button
                            type="button"
                            onClick={() => deleteStore(s)}
                            className="btn-ghost !py-2 !px-3 text-xs text-red-400 mr-auto flex items-center gap-1"
                          >
                            <Trash2 size={13} /> حذف
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── سفارش‌های فروشگاه ── */}
          {tab === 'orders' && (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                {[
                  ['ALL', 'همه'],
                  ['awaiting_approval', 'در انتظار تأیید'],
                  ['preparing', 'در حال آماده‌سازی'],
                  ['ready_to_ship', 'آماده ارسال'],
                  ['shipped', 'ارسال شده'],
                  ['delivered', 'تحویل شده'],
                  ['cancelled', 'لغو شده'],
                  ['rejected', 'رد شده'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setOrderStatusFilter(key)}
                    className={`chip ${orderStatusFilter === key ? 'on' : ''}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                {filteredOrders.map((sub) => (
                  <div
                    key={sub._id}
                    className="card rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <b dir="ltr">#{sub.order_number || String(sub._id).slice(-8)}</b>
                        <span className="chip !cursor-default !py-0.5 !px-2.5 text-[11px]">
                          {statusFa(sub.status)}
                        </span>
                        <span className="text-xs muted">
                          فروشگاه: {storeMap[getId(sub.store_id)]?.name || '—'}
                        </span>
                      </div>
                      <div className="text-xs muted leading-6">
                        {(sub.items || [])
                          .map((i) => `${i.product_name ?? i.name ?? ''} ×${toFa(i.quantity)}`)
                          .join('، ')}
                      </div>
                      <div className="font-black text-yellow">{formatPrice(subAmount(sub))}</div>
                    </div>
                    <div className="flex gap-2 flex-wrap shrink-0">
                      {sub.status === 'awaiting_approval' && (
                        <button
                          type="button"
                          onClick={() => approveSubOrder(sub._id)}
                          className="btn-yellow !py-1.5 !px-3 text-xs flex items-center gap-1"
                        >
                          <Check size={13} /> تأیید
                        </button>
                      )}
                      {sub.status === 'preparing' && (
                        <button
                          type="button"
                          onClick={() => updateSubOrderStatus(sub._id, 'ready_to_ship')}
                          className="btn-navy !py-1.5 !px-3 text-xs"
                        >
                          آماده ارسال
                        </button>
                      )}
                      {sub.status === 'ready_to_ship' && (
                        <button
                          type="button"
                          onClick={() => updateSubOrderStatus(sub._id, 'shipped')}
                          className="btn-navy !py-1.5 !px-3 text-xs"
                        >
                          ارسال شد
                        </button>
                      )}
                      {sub.status === 'shipped' && (
                        <button
                          type="button"
                          onClick={() => updateSubOrderStatus(sub._id, 'delivered')}
                          className="btn-navy !py-1.5 !px-3 text-xs"
                        >
                          تحویل داده شد
                        </button>
                      )}
                      {['awaiting_approval', 'preparing', 'ready_to_ship'].includes(sub.status) && (
                        <button
                          type="button"
                          onClick={() => {
                            setCancelTarget(sub._id);
                            setCancelReason('');
                          }}
                          className="btn-ghost !py-1.5 !px-3 text-xs text-red-400 flex items-center gap-1"
                        >
                          <X size={13} /> لغو
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {filteredOrders.length === 0 && (
                  <div className="card rounded-2xl p-10 text-center muted">
                    سفارشی در این وضعیت نیست.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── پلن‌ها ── */}
          {tab === 'plans' && (
            <div className="grid md:grid-cols-3 gap-5">
              {plans.map((pl) => (
                <div
                  key={pl._id}
                  className="card rounded-3xl p-6 flex flex-col"
                  style={pl.is_featured ? { borderColor: 'var(--primary-color)', borderWidth: '2px' } : {}}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-black text-lg">{pl.name}</span>
                    {getId(activeUser.seller_plan?.plan_id) === getId(pl) && (
                      <span className="chip on text-[10px]">فعلی</span>
                    )}
                  </div>
                  <div className="font-black text-2xl mt-2 text-yellow">
                    {formatPrice(pl.price?.currency === 'IRT' ? pl.price.amount * 10 : pl.price?.amount)}
                  </div>
                  <div className="text-sm muted mt-1">{pl.description}</div>
                  <ul className="text-sm mt-4 space-y-2 muted flex-1">
                    <li>• حداکثر {toFa(pl.features?.max_products ?? 0)} محصول فعال</li>
                    <li>• حداکثر {toFa(pl.features?.max_shops ?? 0)} فروشگاه</li>
                    <li>• حداکثر {toFa(pl.features?.max_images_per_product ?? 0)} تصویر برای هر محصول</li>
                    <li>• اعتبار: {pl.duration_days ? `${toFa(pl.duration_days)} روز` : 'مادام‌العمر'}</li>
                  </ul>
                  <button type="button" onClick={() => buyPlan(pl._id)} className="btn-yellow w-full mt-5">
                    خرید و فعال‌سازی
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── تنظیمات فروشنده (نمایش کامل همه اطلاعات + ویرایش + بزرگ‌نمایی مدارک) ── */}
          {tab === 'settings' && (
            <div className="space-y-5">
              <div className="card rounded-2xl p-5 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className="w-12 h-12 rounded-2xl bg-navy text-brand-yellow grid place-items-center font-black text-xl">
                    {activeUser.username?.[0] || 'ف'}
                  </span>
                  <div>
                    <h2 className="font-black text-lg flex items-center gap-2">
                      {activeUser.firstname || activeUser.lastname
                        ? `${activeUser.firstname || ''} ${activeUser.lastname || ''}`.trim()
                        : activeUser.username}
                      {activeUser.seller_approved_status && (
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 inline-flex items-center gap-1">
                          <ShieldCheck size={13} /> تأییدشده
                        </span>
                      )}
                    </h2>
                    <div className="text-xs muted mt-0.5" dir="ltr">
                      @{activeUser.username} • {toFa(activeUser.phone)} • {statusFa(isSellerActive ? 'ACTIVE' : 'INACTIVE')}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingSettings((v) => !v)}
                  className="btn-ghost !py-2 text-xs flex items-center gap-1.5"
                >
                  <Pencil size={14} /> {editingSettings ? 'بستن فرم ویرایش' : 'ویرایش اطلاعات فروشندگی'}
                </button>
              </div>

              {editingSettings ? (
                <form onSubmit={saveSellerSettings} className="card rounded-2xl p-6 space-y-4">
                  <div className="rounded-xl p-3 bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
                    توجه: مطابق قوانین سیستم، ویرایش اطلاعات هویتی یا بانکی توسط فروشنده وضعیت حساب را تا بررسی مجدد ادمین به حالت «در انتظار تأیید» تغییر می‌دهد.
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <label className="text-xs muted">
                      نوع فروشنده
                      <select
                        className="input mt-1"
                        value={sellerForm.seller_type}
                        onChange={(e) => setSellerForm({ ...sellerForm, seller_type: e.target.value })}
                      >
                        <option value="Individual_seller">فروشنده حقیقی</option>
                        <option value="institutional_seller">فروشنده حقوقی</option>
                      </select>
                    </label>
                    <label className="text-xs muted">
                      کد ملی
                      <input
                        className="input mt-1"
                        dir="ltr"
                        value={sellerForm.national_ID}
                        onChange={(e) => setSellerForm({ ...sellerForm, national_ID: e.target.value })}
                      />
                    </label>
                    <label className="text-xs muted">
                      تاریخ تولد
                      <input
                        className="input mt-1"
                        value={sellerForm.birth_date}
                        onChange={(e) => setSellerForm({ ...sellerForm, birth_date: e.target.value })}
                      />
                    </label>
                    <label className="text-xs muted">
                      استان
                      <input
                        className="input mt-1"
                        value={sellerForm.province}
                        onChange={(e) => setSellerForm({ ...sellerForm, province: e.target.value })}
                      />
                    </label>
                    <label className="text-xs muted">
                      شهر
                      <input
                        className="input mt-1"
                        value={sellerForm.city}
                        onChange={(e) => setSellerForm({ ...sellerForm, city: e.target.value })}
                      />
                    </label>
                    <label className="text-xs muted">
                      نام صاحب حساب
                      <input
                        className="input mt-1"
                        value={sellerForm.firstname_lastname}
                        onChange={(e) => setSellerForm({ ...sellerForm, firstname_lastname: e.target.value })}
                      />
                    </label>
                    <label className="text-xs muted sm:col-span-2 lg:col-span-3">
                      آدرس کامل
                      <input
                        className="input mt-1"
                        value={sellerForm.full_address}
                        onChange={(e) => setSellerForm({ ...sellerForm, full_address: e.target.value })}
                      />
                    </label>
                    <label className="text-xs muted">
                      شماره کارت ۱۶ رقمی
                      <input
                        className="input mt-1"
                        dir="ltr"
                        value={sellerForm.card_number}
                        onChange={(e) => setSellerForm({ ...sellerForm, card_number: e.target.value })}
                      />
                    </label>
                    <label className="text-xs muted sm:col-span-2">
                      شماره شبا (IR...)
                      <input
                        className="input mt-1"
                        dir="ltr"
                        value={sellerForm.sheba_number}
                        onChange={(e) => setSellerForm({ ...sellerForm, sheba_number: e.target.value })}
                      />
                    </label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setEditingSettings(false)} className="btn-ghost !py-2 text-sm">
                      انصراف
                    </button>
                    <button type="submit" className="btn-yellow !py-2 text-sm">
                      ذخیره و ارسال برای بررسی
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid lg:grid-cols-2 gap-5">
                  <div className="card rounded-2xl p-5 space-y-3">
                    <h3 className="font-black text-sm">اطلاعات هویتی و فردی</h3>
                    <div className="grid sm:grid-cols-2 gap-2 text-xs">
                      <InfoBox label="نوع فروشنده" value={statusFa(activeUser.seller_type)} />
                      <InfoBox label="وضعیت تأیید" value={activeUser.seller_approved_status ? 'تأییدشده' : 'در انتظار تأیید'} />
                      <InfoBox label="وضعیت فعالیت" value={statusFa(isSellerActive ? 'ACTIVE' : 'INACTIVE')} />
                      <InfoBox label="نقش کاربری" value={activeUser.role} />
                      <InfoBox label="کد ملی" value={toFa(activeUser.national_ID || '—')} ltr />
                      <InfoBox label="تاریخ تولد" value={activeUser.birth_date || '—'} />
                      <InfoBox label="شماره تماس" value={toFa(activeUser.phone || '—')} ltr />
                      <InfoBox label="ایمیل حساب" value={activeUser.email || 'ثبت نشده'} ltr />
                    </div>
                  </div>

                  <div className="card rounded-2xl p-5 space-y-3">
                    <h3 className="font-black text-sm">حساب تسویه و آدرس</h3>
                    <div className="grid sm:grid-cols-2 gap-2 text-xs">
                      <InfoBox label="روش تسویه" value={activeUser.settlement_account?.type || 'card'} />
                      <InfoBox label="نام صاحب حساب" value={activeUser.settlement_account?.firstname_lastname || '—'} />
                      <InfoBox label="شماره کارت" value={toFa(activeUser.settlement_account?.card_number || '—')} ltr />
                      <InfoBox label="شماره شبا" value={activeUser.settlement_account?.sheba_number || '—'} ltr />
                    </div>
                    <div className="card2 rounded-xl p-3 text-xs">
                      <span className="muted block mb-1">نشانی ثبت‌شده</span>
                      <b className="leading-6">
                        {activeUser.address
                          ? `${activeUser.address.province}، ${activeUser.address.city} — ${activeUser.address.full_address}`
                          : 'ثبت نشده'}
                      </b>
                    </div>
                  </div>

                  <div className="card rounded-2xl p-5 space-y-3">
                    <h3 className="font-black text-sm">تصاویر هویتی (برای بزرگ‌نمایی کلیک کنید)</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <span className="text-xs muted block">تصویر کارت ملی</span>
                        <div className="aspect-video rounded-xl overflow-hidden border border-theme">
                          <StorageImage
                            file={activeUser.identity_image_id}
                            alt="تصویر کارت ملی"
                            className="w-full h-full object-cover"
                            onZoom={(f, a) => setZoomFile({ file: f, alt: a })}
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-xs muted block">سلفی احراز هویت</span>
                        <div className="aspect-video rounded-xl overflow-hidden border border-theme">
                          <StorageImage
                            file={activeUser.identity_verification_image_id}
                            alt="سلفی احراز هویت"
                            className="w-full h-full object-cover"
                            onZoom={(f, a) => setZoomFile({ file: f, alt: a })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card rounded-2xl p-5 space-y-3">
                    <h3 className="font-black text-sm">اطلاعات اشتراک و پلن</h3>
                    <div className="grid sm:grid-cols-2 gap-2 text-xs">
                      <InfoBox label="نام پلن فعال" value={curPlan?.name || 'بدون پلن'} />
                      <InfoBox
                        label="تاریخ شروع"
                        value={
                          activeUser.seller_plan?.start_at
                            ? formatDateTime(activeUser.seller_plan.start_at)
                            : '—'
                        }
                      />
                      <InfoBox
                        label="تاریخ انقضا"
                        value={planExpiry ? formatDateTime(planExpiry) : curPlan ? 'مادام‌العمر' : '—'}
                      />
                      <InfoBox
                        label="سقف مجاز"
                        value={
                          curPlan
                            ? `${toFa(curPlan.features?.max_products)} محصول • ${toFa(curPlan.features?.max_shops)} فروشگاه`
                            : '—'
                        }
                      />
                    </div>
                    <button type="button" onClick={() => setTab('plans')} className="btn-yellow !py-2 text-xs">
                      مدیریت یا ارتقای پلن
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {storeModal !== undefined && (
        <StoreEditorModal
          store={storeModal}
          onClose={() => setStoreModal(undefined)}
          onSaved={() => {
            setStoreModal(undefined);
            load();
          }}
        />
      )}

      {cancelTarget && (
        <div
          className="fixed inset-0 z-[170] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setCancelTarget(null)}
        >
          <form
            onSubmit={submitCancelSubOrder}
            onClick={(e) => e.stopPropagation()}
            className="card rounded-3xl max-w-md w-full p-6 space-y-4"
          >
            <h3 className="font-black text-base">لغو ساب‌سفارش</h3>
            <p className="text-xs muted">طبق قوانین بک‌اند، ثبت دلیل لغو الزامی است.</p>
            <textarea
              className="input"
              rows={3}
              placeholder="دلیل لغو سفارش را بنویسید…"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              required
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setCancelTarget(null)} className="btn-ghost !py-2 text-sm">
                انصراف
              </button>
              <button type="submit" className="btn-yellow !py-2 text-sm">
                ثبت لغو سفارش
              </button>
            </div>
          </form>
        </div>
      )}

      {zoomFile && (
        <ImageLightbox
          file={zoomFile.file}
          alt={zoomFile.alt}
          onClose={() => setZoomFile(null)}
        />
      )}
    </DashboardLayout>
  );
}

function InfoBox({ label, value, ltr }) {
  return (
    <div className="card2 rounded-xl p-3">
      <span className="muted block text-[11px]">{label}</span>
      <b className="mt-1 block truncate" dir={ltr ? 'ltr' : undefined}>
        {value}
      </b>
    </div>
  );
}
