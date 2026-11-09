import axios from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Users,
  Store,
  Package,
  FolderTree,
  CreditCard,
  ShoppingBag,
  Check,
  X,
  Plus,
  Pencil,
  Trash2,
  LayoutDashboard,
  ShieldAlert,
  Search,
  RefreshCw,
  ChevronDown,
  ExternalLink,
  MapPin,
  User2,
  Mail,
  Phone,
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
import { flattenCategories, buildCategoryTree } from '../utils/helpers/categories';
import { validateEmailSyntax } from '../utils/validators/email.validator';

const API = import.meta.env.VITE_APP_API_URL || 'http://localhost:3000';
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const EMPTY_CAT = { name: '', slug: '', parent_id: '', status: 'ACTIVE', sort_order: 0 };
const EMPTY_PLAN = {
  name: '',
  duration_days: '',
  amount: '',
  max_products: '',
  max_shops: '',
  max_images: '',
  description: '',
  is_featured: false,
};

function makeSlug(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function AdminPanel() {
  const { user } = useShop();
  const [tab, setTab] = useState('dash');
  const [data, setData] = useState({
    users: [],
    sellers: [],
    stores: [],
    products: [],
    categories: [],
    categoryTree: [],
    plans: [],
    orders: [],
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sellerFilter, setSellerFilter] = useState('ALL');
  const [orderPaymentFilter, setOrderPaymentFilter] = useState('ALL');

  const [zoomFile, setZoomFile] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({ username: '', firstname: '', lastname: '', email: '' });
  const [storeModal, setStoreModal] = useState(undefined);
  const [editingProduct, setEditingProduct] = useState(undefined);

  const [editingCat, setEditingCat] = useState(null);
  const [catForm, setCatForm] = useState(EMPTY_CAT);
  const [expandedCatIds, setExpandedCatIds] = useState({});
  const [planForm, setPlanForm] = useState(EMPTY_PLAN);

  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const get = (u) =>
      axios
        .get(`${API}${u}`, authHeaders())
        .then((r) => r.data.body?.data || r.data.body || [])
        .catch(() => []);
    const [users, sellers, stores, products, categories, categoryTree, plans, orders] =
      await Promise.all([
        get('/user?limit=100'),
        get('/sellers?limit=100'),
        get('/perm/stores?limit=100'),
        get('/perm/products?limit=100'),
        get('/category?limit=100'),
        get('/category/tree'),
        get('/plan?limit=50'),
        get('/orders?limit=100'),
      ]);

    const flatCats = categories.length ? flattenCategories(categories) : flattenCategories(categoryTree);
    const tree = Array.isArray(categoryTree) && categoryTree.length ? categoryTree : buildCategoryTree(flatCats);

    setData({
      users,
      sellers,
      stores,
      products,
      categories: flatCats,
      categoryTree: tree,
      plans,
      orders,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') load();
  }, [user, load]);

  const { users, sellers, stores, products, categories, categoryTree, plans, orders } = data;

  const userMap = useMemo(
    () => Object.fromEntries(users.map((u) => [getId(u), u])),
    [users],
  );
  const storeMap = useMemo(
    () => Object.fromEntries(stores.map((s) => [getId(s), s])),
    [stores],
  );
  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [getId(c), c])),
    [categories],
  );

  const pendingSellers = useMemo(
    () => sellers.filter((s) => !s.seller_approved_status),
    [sellers],
  );
  const revenue = useMemo(
    () =>
      orders.reduce(
        (s, o) => s + (o.final_amount ?? o.total_amount ?? 0),
        0,
      ),
    [orders],
  );

  const q = search.trim().toLowerCase();
  const filteredUsers = useMemo(
    () =>
      q
        ? users.filter(
            (u) =>
              u.username?.toLowerCase().includes(q) ||
              u.phone?.includes(q) ||
              u.email?.toLowerCase().includes(q) ||
              `${u.firstname || ''} ${u.lastname || ''}`.toLowerCase().includes(q),
          )
        : users,
    [users, q],
  );

  const filteredSellers = useMemo(() => {
    let list = sellers;
    if (sellerFilter === 'PENDING') list = list.filter((s) => !s.seller_approved_status);
    if (sellerFilter === 'APPROVED') list = list.filter((s) => s.seller_approved_status);
    if (sellerFilter === 'INACTIVE') {
      list = list.filter((s) => String(s.seller_active_status).toUpperCase() !== 'ACTIVE');
    }
    if (q) {
      list = list.filter(
        (s) =>
          s.username?.toLowerCase().includes(q) ||
          s.national_ID?.includes(q) ||
          s.phone?.includes(q),
      );
    }
    return list;
  }, [sellers, sellerFilter, q]);

  const filteredStores = useMemo(
    () =>
      q
        ? stores.filter((s) => {
            const owner = userMap[getId(s.user)];
            return (
              s.name?.toLowerCase().includes(q) ||
              s.contact_info?.email?.toLowerCase().includes(q) ||
              owner?.username?.toLowerCase().includes(q)
            );
          })
        : stores,
    [stores, userMap, q],
  );

  const filteredProducts = useMemo(
    () =>
      q
        ? products.filter((p) => {
            const seller = userMap[getId(p.seller_id)];
            const store = storeMap[getId(p.store_id)];
            return (
              p.name?.toLowerCase().includes(q) ||
              p.brand?.toLowerCase().includes(q) ||
              seller?.username?.toLowerCase().includes(q) ||
              store?.name?.toLowerCase().includes(q)
            );
          })
        : products,
    [products, userMap, storeMap, q],
  );

  const filteredOrders = useMemo(() => {
    let list = orders;
    if (orderPaymentFilter !== 'ALL') {
      list = list.filter((o) => (o.payment?.status || o.payment_status) === orderPaymentFilter);
    }
    if (q) {
      list = list.filter((o) => {
        const customer = userMap[getId(o.customer_id ?? o.user_id)];
        return (
          String(o.order_number || o._id).toLowerCase().includes(q) ||
          customer?.username?.toLowerCase().includes(q) ||
          customer?.phone?.includes(q) ||
          o.shipping_address?.full_name?.toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [orders, orderPaymentFilter, userMap, q]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card rounded-3xl p-8 max-w-md w-full text-center space-y-4">
          <ShieldAlert size={38} className="mx-auto text-yellow" />
          <h1 className="font-black text-xl">ورود به پنل مدیریت</h1>
          <Link to="/auth/pre" className="btn-yellow inline-block">
            ورود
          </Link>
        </div>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card rounded-3xl p-8 max-w-md w-full text-center space-y-4">
          <ShieldAlert size={38} className="mx-auto text-red-400" />
          <p className="muted">دسترسی فقط برای مدیر سیستم مجاز است.</p>
          <Link to="/" className="btn-ghost inline-block">
            بازگشت به فروشگاه
          </Link>
        </div>
      </div>
    );
  }

  const ok = (m) => {
    toast.success(m);
    load();
  };
  const err = (e, m) => toast.error(e.response?.data?.message || m);

  // اقدامات فروشندگان
  const approveSeller = (id) =>
    axios
      .put(
        `${API}/seller/${id}`,
        { seller_approved_status: true, seller_active_status: 'ACTIVE' },
        authHeaders(),
      )
      .then(() => ok('درخواست فروشندگی تأیید و فعال شد'))
      .catch((e) => err(e, 'خطا در تأیید فروشنده'));

  const setSellerActive = (id, activeStatus) =>
    axios
      .put(`${API}/seller/${id}`, { seller_active_status: activeStatus }, authHeaders())
      .then(() =>
        ok(activeStatus === 'ACTIVE' ? 'فروشنده فعال شد' : 'فروشنده غیرفعال شد'),
      )
      .catch((e) => err(e, 'خطا در تغییر وضعیت فعالیت'));

  // ویرایش کاربر (فقط فیلدهای پشتیبانی‌شده در user.service.js: username, firstname, lastname, email)
  const openEditUser = (u) => {
    setEditingUser(u);
    setUserForm({
      username: u.username || '',
      firstname: u.firstname || '',
      lastname: u.lastname || '',
      email: u.email || '',
    });
  };

  const saveUser = (e) => {
    e.preventDefault();
    if (!userForm.username.trim()) return toast.error('نام کاربری الزامی است');
    if (userForm.email.trim() && !validateEmailSyntax(userForm.email.trim())) {
      return toast.error('ایمیل معتبر نیست');
    }
    const payload = { username: userForm.username.trim() };
    if (userForm.firstname.trim()) payload.firstname = userForm.firstname.trim();
    if (userForm.lastname.trim()) payload.lastname = userForm.lastname.trim();
    if (userForm.email.trim()) payload.email = userForm.email.trim();
    axios
      .put(`${API}/user/${editingUser._id}`, payload, authHeaders())
      .then(() => {
        setEditingUser(null);
        ok('اطلاعات کاربر به‌روزرسانی شد');
      })
      .catch((e2) => err(e2, 'خطا در ویرایش کاربر'));
  };

  // فروشگاه‌ها
  const setStoreStatus = (store, status) =>
    axios
      .put(
        `${API}/store/${getId(store)}`,
        { status, contact_info: store.contact_info },
        authHeaders(),
      )
      .then(() => ok(`وضعیت فروشگاه به ${statusFa(status)} تغییر کرد`))
      .catch((e) => err(e, 'خطا در تغییر وضعیت فروشگاه'));

  const deleteStore = async (store) => {
    if (!confirm(`فروشگاه «${store.name}» حذف شود؟`)) return;
    try {
      await axios.delete(`${API}/store/${getId(store)}`, authHeaders());
      ok('فروشگاه حذف شد');
    } catch (e) {
      const msg = e.response?.data?.message || '';
      if (e.response?.status === 500 || msg.includes('userId')) {
        toast.warn('مسیر حذف فروشگاه در بک‌اند خطای سرور داد؛ فروشگاه مسدود (ROOT_DISABLE) می‌شود.');
        setStoreStatus(store, 'ROOT_DISABLE');
      } else {
        err(e, 'خطا در حذف فروشگاه');
      }
    }
  };

  const del = (url, m) => {
    if (!confirm('حذف شود؟')) return;
    axios
      .delete(`${API}${url}`, authHeaders())
      .then(() => ok(m))
      .catch((e) => err(e, 'خطا در حذف'));
  };

  // دسته‌بندی‌ها
  const saveCategory = (e) => {
    e.preventDefault();
    if (!catForm.name.trim()) return toast.error('نام دسته الزامی است');
    const cleanSlug = makeSlug(catForm.slug);
    if (!cleanSlug || !SLUG_REGEX.test(cleanSlug)) {
      return toast.error('اسلاگ باید با حروف کوچک انگلیسی، عدد و خط تیره باشد (مثلاً: mobile-audio)');
    }
    const payload = {
      name: catForm.name.trim(),
      slug: cleanSlug,
      parent_id: catForm.parent_id || null,
      status: catForm.status,
      sort_order: Number(catForm.sort_order) || 0,
    };
    const req = editingCat
      ? axios.put(`${API}/category/${editingCat._id}`, payload, authHeaders())
      : axios.post(`${API}/category`, payload, authHeaders());
    req
      .then(() => {
        ok(editingCat ? 'دسته‌بندی ویرایش شد' : 'دسته‌بندی ساخته شد');
        setEditingCat(null);
        setCatForm(EMPTY_CAT);
      })
      .catch((e2) => err(e2, 'خطا در ذخیره دسته‌بندی'));
  };

  // سفارش‌ها
  const approveSubOrder = (subId) =>
    axios
      .put(`${API}/order/sub/${subId}/approve`, {}, authHeaders())
      .then(() => ok('ساب‌سفارش تأیید شد'))
      .catch((e) => err(e, 'خطا در تأیید'));

  const updateSubOrderStatus = (subId, status) =>
    axios
      .put(`${API}/order/sub/${subId}/status`, { status }, authHeaders())
      .then(() => ok(`وضعیت به ${statusFa(status)} تغییر کرد`))
      .catch((e) => err(e, 'خطا در تغییر وضعیت'));

  const submitCancelSubOrder = (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) return toast.error('دلیل لغو الزامی است');
    axios
      .put(`${API}/order/sub/${cancelTarget}`, { reason: cancelReason.trim() }, authHeaders())
      .then(() => {
        setCancelTarget(null);
        setCancelReason('');
        ok('ساب‌سفارش لغو شد');
      })
      .catch((e2) => err(e2, 'خطا در لغو سفارش'));
  };

  const addPlan = () => {
    if (!planForm.name || !planForm.amount) return toast.error('نام و مبلغ الزامی است');
    axios
      .post(
        `${API}/plan`,
        {
          name: planForm.name,
          duration_days: planForm.duration_days ? Number(planForm.duration_days) : null,
          price: { currency: 'IRR', amount: Number(planForm.amount) },
          description: planForm.description,
          is_featured: planForm.is_featured,
          features: {
            max_products: Number(planForm.max_products || 10),
            max_shops: Number(planForm.max_shops || 1),
            max_images_per_product: Number(planForm.max_images || 5),
          },
        },
        authHeaders(),
      )
      .then(() => {
        ok('پلن ساخته شد');
        setPlanForm(EMPTY_PLAN);
      })
      .catch((e) => err(e, 'خطا'));
  };

  const navItems = [
    { key: 'dash', label: 'داشبورد', icon: LayoutDashboard },
    { key: 'sellers', label: 'درخواست‌های فروشندگی', icon: Store, badge: pendingSellers.length },
    { key: 'users', label: 'مدیریت کاربران', icon: Users, badge: users.length },
    { key: 'stores', label: 'فروشگاه‌ها', icon: Store, badge: stores.length },
    { key: 'products', label: 'مدیریت محصولات', icon: Package, badge: products.length },
    { key: 'categories', label: 'دسته‌بندی‌ها', icon: FolderTree, badge: categories.length },
    { key: 'orders', label: 'سفارش‌ها', icon: ShoppingBag, badge: orders.length },
    { key: 'plans', label: 'پلن‌ها', icon: CreditCard },
  ];

  const SearchInput = ({ placeholder }) => (
    <div className="relative flex-1 min-w-[200px] max-w-sm">
      <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 muted" />
      <input
        className="input !pr-9 !py-2 text-sm"
        placeholder={placeholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>
  );

  // درخت بازشونده دسته‌ها برای تب دسته‌بندی ادمین
  const renderAdminCatNode = (node, depth = 0) => {
    const id = getId(node);
    const hasChildren = (node.children || []).length > 0;
    const isExpanded = Boolean(expandedCatIds[id]);
    return (
      <div key={id} className={depth > 0 ? 'pr-4 mr-3 border-r-2 border-theme space-y-2' : 'space-y-2'}>
        <div className="card rounded-2xl p-3.5 flex items-center justify-between gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => hasChildren && setExpandedCatIds((prev) => ({ ...prev, [id]: !prev[id] }))}
            className={`flex items-center gap-2 text-right min-w-0 flex-1 ${hasChildren ? 'cursor-pointer' : 'cursor-default'}`}
          >
            {hasChildren && (
              <ChevronDown
                size={16}
                className={`shrink-0 text-yellow transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              />
            )}
            <div className="min-w-0">
              <div className="font-bold text-sm flex items-center gap-2 flex-wrap">
                <span>{node.name}</span>
                {hasChildren && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full card2 muted">
                    {toFa(node.children.length)} زیردسته
                  </span>
                )}
                <span className="text-[11px] px-2 py-0.5 rounded-full card2 muted">
                  {statusFa(node.status)}
                </span>
              </div>
              <div className="text-[11px] muted mt-0.5" dir="ltr">
                {node.path || node.slug}
              </div>
            </div>
          </button>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setEditingCat(null);
                setCatForm({ ...EMPTY_CAT, parent_id: id });
              }}
              className="btn-ghost !py-1.5 !px-2.5 text-xs flex items-center gap-1"
              title="افزودن زیردسته"
            >
              <Plus size={13} /> زیردسته
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingCat(node);
                setCatForm({
                  name: node.name || '',
                  slug: node.slug || '',
                  parent_id: getId(node.parent_id) || '',
                  status: node.status || 'ACTIVE',
                  sort_order: node.sort_order ?? 0,
                });
              }}
              className="btn-ghost !p-2"
              title="ویرایش"
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              onClick={() => del(`/category/${id}`, 'دسته حذف شد')}
              className="btn-ghost !p-2 text-red-400"
              title="حذف"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-2">{node.children.map((child) => renderAdminCatNode(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout
      title="پنل مدیریت کل"
      roleLabel="مدیر سیستم"
      subtitle={`کاربران: ${toFa(users.length)} • فروشندگان در انتظار تأیید: ${toFa(pendingSellers.length)}`}
      navItems={navItems}
      activeTab={tab}
      onTabChange={(next) => {
        setTab(next);
        setSearch('');
        setEditingProduct(undefined);
      }}
      headerActions={
        <button
          type="button"
          onClick={load}
          className="btn-ghost !p-2"
          title="بروزرسانی"
          aria-label="بروزرسانی"
        >
          <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
        </button>
      }
    >
      {loading ? (
        <div className="py-12 space-y-5">
          <Loading label="در حال دریافت داده‌های مدیریت…" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-28" />
            ))}
          </div>
          <div className="skeleton h-64" />
        </div>
      ) : (
        <>
          {/* ── داشبورد مدیریت با لیست‌های دسترسی سریع ── */}
          {tab === 'dash' && (
            <div className="space-y-6">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'درآمد سفارش‌ها', value: formatPrice(revenue), icon: CreditCard },
                  { label: 'کل سفارش‌ها', value: toFa(orders.length), icon: ShoppingBag },
                  { label: 'فروشندگان در انتظار', value: toFa(pendingSellers.length), icon: Store },
                  { label: 'کل کاربران', value: toFa(users.length), icon: Users },
                  { label: 'فروشگاه‌ها', value: toFa(stores.length), icon: Store },
                  { label: 'محصولات', value: toFa(products.length), icon: Package },
                  { label: 'دسته‌بندی‌ها', value: toFa(categories.length), icon: FolderTree },
                  { label: 'پلن‌ها', value: toFa(plans.length), icon: CreditCard },
                ].map((stat) => (
                  <div key={stat.label} className="card rounded-2xl p-5 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs muted font-bold">{stat.label}</div>
                      <div className="font-black text-xl mt-2 text-yellow">{stat.value}</div>
                    </div>
                    <span className="w-10 h-10 rounded-xl bg-navy text-brand-yellow grid place-items-center shrink-0">
                      <stat.icon size={18} />
                    </span>
                  </div>
                ))}
              </div>

              <div className="grid lg:grid-cols-2 gap-5">
                {/* لیست سریع فروشندگان تایید نشده */}
                <div className="card rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-black">فروشندگان در انتظار تأیید ({toFa(pendingSellers.length)})</h2>
                    <button type="button" onClick={() => setTab('sellers')} className="text-xs font-bold text-yellow">
                      مشاهده همه
                    </button>
                  </div>
                  {pendingSellers.length === 0 ? (
                    <p className="text-sm muted py-6 text-center">درخواست در انتظار تأیید وجود ندارد.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {pendingSellers.slice(0, 4).map((s) => (
                        <div key={s._id} className="card2 rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap">
                          <div className="min-w-0">
                            <div className="font-bold text-sm">{s.username}</div>
                            <div className="text-xs muted" dir="ltr">
                              {toFa(s.phone)} • ملی: {toFa(s.national_ID || '—')}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {s.identity_image_id && (
                              <button
                                type="button"
                                onClick={() => setZoomFile({ file: s.identity_image_id, alt: `مدرک ${s.username}` })}
                                className="btn-ghost !py-1 !px-2 text-xs"
                              >
                                مدرک
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => approveSeller(s._id)}
                              className="btn-yellow !py-1.5 !px-3 text-xs flex items-center gap-1"
                            >
                              <Check size={13} /> تأیید
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* لیست سریع آخرین محصولات */}
                <div className="card rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-black">آخرین محصولات ({toFa(products.length)})</h2>
                    <button type="button" onClick={() => setTab('products')} className="text-xs font-bold text-yellow">
                      مدیریت همه
                    </button>
                  </div>
                  {products.length === 0 ? (
                    <p className="text-sm muted py-6 text-center">محصولی ثبت نشده است.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {products.slice(0, 4).map((p) => {
                        const seller = userMap[getId(p.seller_id)];
                        const store = storeMap[getId(p.store_id)];
                        return (
                          <div key={p._id} className="card2 rounded-xl p-3 flex items-center gap-3">
                            <StorageImage
                              file={productImages(p)[0]}
                              alt={p.name}
                              className="w-11 h-11 rounded-lg object-cover shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-sm truncate">{p.name}</div>
                              <div className="text-[11px] muted truncate">
                                فروشگاه: {store?.name || '—'} • سازنده: {seller?.username || '—'}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setTab('products');
                                setEditingProduct(p);
                              }}
                              className="btn-ghost !py-1.5 !px-2.5 text-xs shrink-0"
                            >
                              ویرایش
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* لیست سریع فروشگاه‌ها */}
                <div className="card rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-black">فروشگاه‌ها ({toFa(stores.length)})</h2>
                    <button type="button" onClick={() => setTab('stores')} className="text-xs font-bold text-yellow">
                      مشاهده همه
                    </button>
                  </div>
                  {stores.length === 0 ? (
                    <p className="text-sm muted py-6 text-center">فروشگاهی ثبت نشده است.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {stores.slice(0, 4).map((s) => (
                        <div key={s._id} className="card2 rounded-xl p-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-navy shrink-0 grid place-items-center font-black">
                              <StorageImage
                                file={s.profile_image_id}
                                alt={s.name}
                                className="w-full h-full object-cover"
                                fallback={<span className="text-brand-yellow">{s.name?.[0] || 'ف'}</span>}
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-sm truncate">{s.name}</div>
                              <div className="text-[11px] muted">{statusFa(s.status)}</div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setStoreModal(s)}
                            className="btn-ghost !py-1.5 !px-2.5 text-xs shrink-0"
                          >
                            ویرایش
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* لیست سریع آخرین سفارش‌ها */}
                <div className="card rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-black">آخرین سفارش‌ها ({toFa(orders.length)})</h2>
                    <button type="button" onClick={() => setTab('orders')} className="text-xs font-bold text-yellow">
                      مشاهده همه
                    </button>
                  </div>
                  {orders.length === 0 ? (
                    <p className="text-sm muted py-6 text-center">سفارشی ثبت نشده است.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {orders.slice(0, 4).map((o) => {
                        const customer = userMap[getId(o.customer_id ?? o.user_id)];
                        const payStatus = o.payment?.status || o.payment_status;
                        return (
                          <div key={o._id} className="card2 rounded-xl p-3 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-bold text-sm" dir="ltr">
                                #{o.order_number || String(o._id).slice(-8)}
                              </div>
                              <div className="text-[11px] muted truncate">
                                {customer?.username || o.shipping_address?.full_name || 'مشتری'} • {statusFa(payStatus)}
                              </div>
                            </div>
                            <div className="text-left shrink-0">
                              <div className="font-black text-xs text-yellow">
                                {formatPrice(o.final_amount ?? o.total_amount)}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setTab('orders');
                                  setExpandedOrderId(o._id);
                                }}
                                className="text-[11px] muted hover:underline"
                              >
                                جزئیات
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── درخواست‌های فروشندگی ── */}
          {tab === 'sellers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex gap-2 flex-wrap">
                  {[
                    ['ALL', `همه (${toFa(sellers.length)})`],
                    ['PENDING', `در انتظار تأیید (${toFa(pendingSellers.length)})`],
                    ['APPROVED', 'تأییدشده'],
                    ['INACTIVE', 'غیرفعال'],
                  ].map(([k, l]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setSellerFilter(k)}
                      className={`chip ${sellerFilter === k ? 'on' : ''}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <SearchInput placeholder="جستجوی فروشنده، موبایل یا کد ملی…" />
              </div>

              <div className="space-y-3">
                {filteredSellers.map((s) => {
                  const isActive = String(s.seller_active_status).toUpperCase() === 'ACTIVE';
                  return (
                    <div key={s._id} className="card rounded-2xl p-5 flex flex-col lg:flex-row justify-between gap-4">
                      <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <b className="text-base">{s.username}</b>
                          <span className="chip !cursor-default !py-0.5 !px-2 text-[11px]">
                            {statusFa(s.seller_type)}
                          </span>
                          <span
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                              s.seller_approved_status
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : 'bg-amber-500/15 text-amber-400'
                            }`}
                          >
                            {s.seller_approved_status ? 'تأییدشده' : 'در انتظار تأیید'}
                          </span>
                          <span
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                              isActive
                                ? 'bg-blue-500/15 text-blue-400'
                                : 'bg-red-500/15 text-red-400'
                            }`}
                          >
                            {isActive ? 'فعال' : 'غیرفعال'}
                          </span>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-2 text-xs muted">
                          <div>موبایل: <b dir="ltr">{toFa(s.phone || '—')}</b></div>
                          <div>کد ملی: <b dir="ltr">{toFa(s.national_ID || '—')}</b></div>
                          <div>کارت: <b dir="ltr">{toFa(s.settlement_account?.card_number || '—')}</b></div>
                          <div>شبا: <b dir="ltr">{s.settlement_account?.sheba_number || '—'}</b></div>
                        </div>
                        <div className="text-xs muted">
                          نشانی: {s.address ? `${s.address.province}، ${s.address.city} — ${s.address.full_address}` : '—'}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-3 shrink-0">
                        <div className="flex items-center gap-2">
                          {s.identity_image_id && (
                            <div className="w-16 h-16 rounded-xl overflow-hidden border border-theme">
                              <StorageImage
                                file={s.identity_image_id}
                                alt={`کارت ملی ${s.username}`}
                                className="w-full h-full object-cover"
                                onZoom={(f, a) => setZoomFile({ file: f, alt: a })}
                              />
                            </div>
                          )}
                          {s.identity_verification_image_id && (
                            <div className="w-16 h-16 rounded-xl overflow-hidden border border-theme">
                              <StorageImage
                                file={s.identity_verification_image_id}
                                alt={`سلفی احراز ${s.username}`}
                                className="w-full h-full object-cover"
                                onZoom={(f, a) => setZoomFile({ file: f, alt: a })}
                              />
                            </div>
                          )}
                        </div>

                        {/* دکمه‌های دقیق طبق وضعیت: تأیید (اگر تأیید نشده)، غیرفعال (اگر فعال)، فعال (اگر غیرفعال) */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {!s.seller_approved_status && (
                            <button
                              type="button"
                              onClick={() => approveSeller(s._id)}
                              className="btn-yellow !py-2 !px-3.5 text-xs flex items-center gap-1"
                            >
                              <Check size={14} /> تأیید درخواست
                            </button>
                          )}
                          {isActive ? (
                            <button
                              type="button"
                              onClick={() => setSellerActive(s._id, 'INACTIVE')}
                              className="btn-ghost !py-2 !px-3.5 text-xs text-red-400 flex items-center gap-1"
                            >
                              <X size={14} /> غیرفعال کردن
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSellerActive(s._id, 'ACTIVE')}
                              className="btn-navy !py-2 !px-3.5 text-xs flex items-center gap-1"
                            >
                              <Check size={14} /> فعال کردن
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filteredSellers.length === 0 && (
                  <div className="card rounded-2xl p-10 text-center muted">فروشنده‌ای یافت نشد.</div>
                )}
              </div>
            </div>
          )}

          {/* ── مدیریت کاربران (بدون ادمین‌کن/حذف ادمین + همراه با ویرایش کامل کاربر) ── */}
          {tab === 'users' && (
            <div className="space-y-4">
              <div className="card rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
                <h2 className="font-black">کاربران ({toFa(filteredUsers.length)})</h2>
                <SearchInput placeholder="جستجو با نام، نام کاربری، ایمیل یا موبایل…" />
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUsers.map((u) => (
                  <div key={u._id} className="card rounded-2xl p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-10 h-10 rounded-xl bg-navy text-brand-yellow grid place-items-center font-black shrink-0">
                          {(u.firstname || u.username || 'ک')[0]}
                        </span>
                        <div className="min-w-0">
                          <div className="font-black text-sm truncate">
                            {u.firstname || u.lastname
                              ? `${u.firstname || ''} ${u.lastname || ''}`.trim()
                              : u.username}
                          </div>
                          <div className="text-xs muted truncate" dir="ltr">@{u.username}</div>
                        </div>
                      </div>
                      <span className="chip !cursor-default !py-0.5 !px-2 text-[11px] shrink-0">
                        {u.role}{u.is_seller ? ' • فروشنده' : ''}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs muted">
                      <div className="flex items-center gap-1.5">
                        <Phone size={12} className="text-yellow" />
                        <span dir="ltr">{toFa(u.phone || '—')}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail size={12} className="text-yellow shrink-0" />
                        <span dir="ltr" className="truncate">{u.email || 'ایمیل ثبت نشده'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 mt-auto border-t border-theme">
                      <button
                        type="button"
                        onClick={() => openEditUser(u)}
                        className="btn-ghost !py-1.5 text-xs flex-1 flex items-center justify-center gap-1"
                      >
                        <Pencil size={13} /> ویرایش کاربر
                      </button>
                      <button
                        type="button"
                        onClick={() => del(`/user/${u._id}`, 'کاربر حذف شد')}
                        className="btn-ghost !p-2 text-red-400"
                        title="حذف کاربر"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── فروشگاه‌ها (ویرایش کامل + بزرگ‌نمایی تصاویر + دکمه‌های صحیح وضعیت) ── */}
          {tab === 'stores' && (
            <div className="space-y-4">
              <div className="card rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
                <h2 className="font-black">فروشگاه‌ها ({toFa(filteredStores.length)})</h2>
                <SearchInput placeholder="جستجوی نام فروشگاه، ایمیل یا مالک…" />
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                {filteredStores.map((s) => {
                  const owner = userMap[getId(s.user)];
                  return (
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
                                background: 'linear-gradient(135deg,#0a1736 0%,#162e66 75%,#ffd60a33 100%)',
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
                            <div className="text-xs muted">
                              مالک: {owner ? `${owner.username} (${toFa(owner.phone)})` : getId(s.user)}
                            </div>
                          </div>
                        </div>

                        {s.description && <p className="text-xs muted leading-6">{s.description}</p>}

                        <div className="grid sm:grid-cols-2 gap-2 text-xs">
                          <div className="card2 rounded-xl p-2.5 truncate">
                            ایمیل: <b dir="ltr">{s.contact_info?.email || '—'}</b>
                          </div>
                          <div className="card2 rounded-xl p-2.5 truncate">
                            تماس: <b dir="ltr">{s.contact_info?.phone || s.contact_info?.fax || '—'}</b>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 pt-2 mt-auto border-t border-theme flex-wrap">
                          <button
                            type="button"
                            onClick={() => setStoreModal(s)}
                            className="btn-yellow !py-1.5 !px-3 text-xs flex items-center gap-1"
                          >
                            <Pencil size={13} /> ویرایش
                          </button>
                          {s.status !== 'ENABLE' && (
                            <button
                              type="button"
                              onClick={() => setStoreStatus(s, 'ENABLE')}
                              className="btn-ghost !py-1.5 !px-3 text-xs text-emerald-400"
                            >
                              فعال کردن
                            </button>
                          )}
                          {s.status !== 'DISABLE' && (
                            <button
                              type="button"
                              onClick={() => setStoreStatus(s, 'DISABLE')}
                              className="btn-ghost !py-1.5 !px-3 text-xs"
                            >
                              غیرفعال
                            </button>
                          )}
                          {s.status !== 'ROOT_DISABLE' && (
                            <button
                              type="button"
                              onClick={() => setStoreStatus(s, 'ROOT_DISABLE')}
                              className="btn-ghost !py-1.5 !px-3 text-xs text-red-400"
                            >
                              مسدود ریشه‌ای
                            </button>
                          )}
                          <Link
                            to={`/store/${s._id}`}
                            className="btn-ghost !p-2"
                            title="مشاهده"
                          >
                            <ExternalLink size={14} />
                          </Link>
                          <button
                            type="button"
                            onClick={() => deleteStore(s)}
                            className="btn-ghost !p-2 text-red-400 mr-auto"
                            title="حذف فروشگاه"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── محصولات (ویرایش همه محصولات + نمایش دقیق سازنده و فروشگاه + بدون اسکرول) ── */}
          {tab === 'products' && (
            editingProduct !== undefined ? (
              <ProductEditor
                product={editingProduct}
                stores={stores}
                categories={categories}
                isAdmin
                onCancel={() => setEditingProduct(undefined)}
                onSaved={() => {
                  setEditingProduct(undefined);
                  load();
                }}
              />
            ) : (
              <div className="space-y-4">
                <div className="card rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
                  <SearchInput placeholder="جستجوی محصول، برند، فروشنده یا فروشگاه…" />
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="btn-yellow !py-2.5 text-sm flex items-center gap-1.5"
                  >
                    <Plus size={16} /> افزودن محصول جدید
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredProducts.map((p) => {
                    const seller = userMap[getId(p.seller_id)];
                    const store = storeMap[getId(p.store_id)];
                    const cat = categoryMap[getId(p.category_id)];
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
                            <div className="text-xs muted mt-1">
                              {p.brand} • {cat?.name || 'بدون دسته'}
                            </div>
                          </div>
                        </div>

                        {/* نمایش شفاف سازنده/فروشنده و فروشگاه محصول */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="card2 rounded-xl p-2.5 min-w-0">
                            <span className="muted block text-[10px]">سازنده / فروشنده</span>
                            <b className="truncate block mt-0.5">
                              {seller?.username || '—'}
                            </b>
                            {seller?.phone && (
                              <span className="text-[10px] muted block" dir="ltr">
                                {toFa(seller.phone)}
                              </span>
                            )}
                          </div>
                          <div className="card2 rounded-xl p-2.5 min-w-0">
                            <span className="muted block text-[10px]">فروشگاه</span>
                            {store ? (
                              <Link
                                to={`/store/${getId(store)}`}
                                className="font-bold text-yellow truncate block mt-0.5 hover:underline"
                              >
                                {store.name}
                              </Link>
                            ) : (
                              <b className="block mt-0.5">—</b>
                            )}
                            <span className="text-[10px] muted block">
                              {store ? statusFa(store.status) : ''}
                            </span>
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
                          <div className="flex gap-1.5 flex-wrap text-[11px]">
                            <span className="chip !cursor-default !py-0.5 !px-2">
                              موجودی: {toFa(p.stock)}
                            </span>
                            <span className="chip !cursor-default !py-0.5 !px-2">
                              {statusFa(String(p.status).toUpperCase())}
                            </span>
                            <span className="chip !cursor-default !py-0.5 !px-2">
                              {statusFa(String(p.visibility).toUpperCase())}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingProduct(p)}
                            className="btn-yellow !py-2 text-xs flex-1 flex items-center justify-center gap-1"
                          >
                            <Pencil size={13} /> ویرایش محصول
                          </button>
                          <Link to={`/product/${p._id}`} className="btn-ghost !p-2" title="نمایش">
                            <ExternalLink size={14} />
                          </Link>
                          <button
                            type="button"
                            onClick={() => del(`/product/${p._id}`, 'محصول حذف شد')}
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
              </div>
            )
          )}

          {/* ── دسته‌بندی‌ها (درخت بازشونده با کلیک روی سردسته + ویرایش کامل + اعتبارسنجی اسلاگ) ── */}
          {tab === 'categories' && (
            <div className="grid lg:grid-cols-[340px_1fr] gap-5 items-start">
              <form onSubmit={saveCategory} className="card rounded-2xl p-5 space-y-3 lg:sticky lg:top-20">
                <h2 className="font-black">
                  {editingCat ? `ویرایش دسته: ${editingCat.name}` : 'دسته‌بندی جدید'}
                </h2>
                <label className="block text-xs muted">
                  نام دسته
                  <input
                    className="input mt-1"
                    placeholder="مثلاً: تجهیزات نقشه‌برداری"
                    value={catForm.name}
                    onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                    required
                  />
                </label>
                <label className="block text-xs muted">
                  اسلاگ انگلیسی (فقط حروف کوچک، عدد و -)
                  <input
                    className="input mt-1"
                    dir="ltr"
                    placeholder="gnss-receivers"
                    value={catForm.slug}
                    onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })}
                    required
                  />
                </label>
                <label className="block text-xs muted">
                  دسته والد
                  <select
                    className="input mt-1"
                    value={catForm.parent_id}
                    onChange={(e) => setCatForm({ ...catForm, parent_id: e.target.value })}
                  >
                    <option value="">بدون والد (سردسته اصلی)</option>
                    {categories
                      .filter((c) => c._id !== editingCat?._id)
                      .map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs muted">
                    وضعیت
                    <select
                      className="input mt-1"
                      value={catForm.status}
                      onChange={(e) => setCatForm({ ...catForm, status: e.target.value })}
                    >
                      <option value="ACTIVE">فعال</option>
                      <option value="INACTIVE">غیرفعال</option>
                    </select>
                  </label>
                  <label className="text-xs muted">
                    ترتیب نمایش
                    <input
                      className="input mt-1"
                      type="number"
                      min={0}
                      value={catForm.sort_order}
                      onChange={(e) => setCatForm({ ...catForm, sort_order: e.target.value })}
                    />
                  </label>
                </div>
                <button type="submit" className="btn-yellow w-full flex items-center justify-center gap-2">
                  <Plus size={16} /> {editingCat ? 'ذخیره تغییرات' : 'ساخت دسته‌بندی'}
                </button>
                {(editingCat || catForm.parent_id) && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCat(null);
                      setCatForm(EMPTY_CAT);
                    }}
                    className="btn-ghost w-full !py-2 text-xs"
                  >
                    بازگشت به حالت جدید
                  </button>
                )}
              </form>

              <div className="space-y-2.5" aria-label="درخت دسته‌بندی‌ها">
                <div className="text-xs muted mb-1">
                  برای مشاهده یا مدیریت زیردسته‌ها، روی سردسته کلیک کنید تا باز شود.
                </div>
                {categoryTree.length === 0 ? (
                  <div className="card rounded-2xl p-10 text-center muted">دسته‌ای ثبت نشده است.</div>
                ) : (
                  categoryTree.map((root) => renderAdminCatNode(root, 0))
                )}
              </div>
            </div>
          )}

          {/* ── سفارش‌ها (ساختار کامل parent order + sub_orders + مشتری + آدرس + کنترل وضعیت) ── */}
          {tab === 'orders' && (
            <div className="space-y-4">
              <div className="card rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex gap-2 flex-wrap">
                  {[
                    ['ALL', `همه (${toFa(orders.length)})`],
                    ['paid', 'پرداخت‌شده'],
                    ['pending', 'در انتظار پرداخت'],
                    ['failed', 'ناموفق'],
                  ].map(([k, l]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setOrderPaymentFilter(k)}
                      className={`chip ${orderPaymentFilter === k ? 'on' : ''}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <SearchInput placeholder="شماره سفارش، نام مشتری یا موبایل…" />
              </div>

              {filteredOrders.length === 0 ? (
                <div className="card rounded-2xl p-10 text-center muted">سفارشی یافت نشد.</div>
              ) : (
                <div className="space-y-3">
                  {filteredOrders.map((o) => {
                    const customer = userMap[getId(o.customer_id ?? o.user_id)];
                    const payStatus = o.payment?.status || o.payment_status || 'pending';
                    const subs = o.sub_orders || [];
                    const isOpen = expandedOrderId === o._id;
                    const addr = o.shipping_address;

                    return (
                      <div key={o._id} className="card rounded-2xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setExpandedOrderId(isOpen ? null : o._id)}
                          className="w-full p-4 text-right flex items-center justify-between gap-4 flex-wrap hover:bg-white/[0.02]"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <b className="text-base" dir="ltr">
                                #{o.order_number || String(o._id).slice(-8)}
                              </b>
                              <span
                                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                                  payStatus === 'paid'
                                    ? 'bg-emerald-500/15 text-emerald-400'
                                    : payStatus === 'failed'
                                      ? 'bg-red-500/15 text-red-400'
                                      : 'bg-amber-500/15 text-amber-400'
                                }`}
                              >
                                {payStatus === 'paid'
                                  ? 'پرداخت‌شده'
                                  : payStatus === 'failed'
                                    ? 'پرداخت ناموفق'
                                    : 'در انتظار پرداخت'}
                              </span>
                              <span className="chip !cursor-default !py-0.5 !px-2 text-[11px]">
                                {toFa(subs.length)} مرسوله
                              </span>
                            </div>
                            <div className="text-xs muted flex items-center gap-3 flex-wrap">
                              <span className="flex items-center gap-1">
                                <User2 size={12} /> {customer?.username || addr?.full_name || 'مشتری'}
                                {customer?.phone ? ` (${toFa(customer.phone)})` : ''}
                              </span>
                              {addr && (
                                <span className="flex items-center gap-1">
                                  <MapPin size={12} /> {addr.province}، {addr.city}
                                </span>
                              )}
                              <span>{formatDateTime(o.created_at ?? o.create_at)}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-left">
                              <div className="font-black text-base text-yellow">
                                {formatPrice(o.final_amount ?? o.total_amount)}
                              </div>
                              {(o.total_discount ?? 0) > 0 && (
                                <div className="text-[11px] muted">
                                  تخفیف: {formatPrice(o.total_discount)}
                                </div>
                              )}
                            </div>
                            <ChevronDown
                              size={18}
                              className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
                            />
                          </div>
                        </button>

                        {isOpen && (
                          <div className="p-4 pt-0 space-y-4 border-t border-theme">
                            {/* اطلاعات ارسال و پرداخت */}
                            <div className="grid md:grid-cols-2 gap-3 pt-4 text-xs">
                              <div className="card2 rounded-xl p-3 space-y-1">
                                <div className="font-bold text-yellow mb-1">آدرس تحویل</div>
                                {addr ? (
                                  <>
                                    <div>گیرنده: <b>{addr.full_name}</b></div>
                                    <div className="muted leading-6">
                                      {addr.province}، {addr.city}، {addr.neighborhood} — {addr.full_address}
                                      {addr.building_number ? `، پلاک ${toFa(addr.building_number)}` : ''}
                                      {addr.unit ? `، واحد ${toFa(addr.unit)}` : ''}
                                    </div>
                                    <div className="muted">کد پستی: <span dir="ltr">{toFa(addr.postal_code || '—')}</span></div>
                                  </>
                                ) : (
                                  <div className="muted">ثبت نشده</div>
                                )}
                                {o.customer_notes && <div className="pt-1">یادداشت: {o.customer_notes}</div>}
                              </div>

                              <div className="card2 rounded-xl p-3 space-y-1">
                                <div className="font-bold text-yellow mb-1">جزئیات پرداخت</div>
                                <div>وضعیت: <b>{statusFa(payStatus)}</b></div>
                                <div>مبلغ کل: <b>{formatPrice(o.total_amount)}</b> • پرداختی: <b>{formatPrice(o.paid_amount ?? o.final_amount)}</b></div>
                                {o.payment?.ref_id && <div>کد رهگیری: <b dir="ltr">{o.payment.ref_id}</b></div>}
                                {o.payment?.paid_at && <div>زمان پرداخت: <b>{formatDateTime(o.payment.paid_at)}</b></div>}
                              </div>
                            </div>

                            {/* ساب‌سفارش‌ها */}
                            <div className="space-y-2.5">
                              <div className="font-bold text-xs muted">تفکیک ساب‌سفارش‌ها بر اساس فروشگاه:</div>
                              {subs.map((sub) => {
                                const sStore = storeMap[getId(sub.store_id)];
                                const sSeller = userMap[getId(sub.seller_id)];
                                const subTotal = (sub.amount ?? sub.subtotal ?? 0) - (sub.discount_applied ?? 0);
                                return (
                                  <div key={sub._id} className="card2 rounded-2xl p-4 space-y-3">
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                      <div className="text-xs flex items-center gap-2 flex-wrap">
                                        <b dir="ltr">#{sub.order_number || String(sub._id).slice(-8)}</b>
                                        <span>فروشگاه: <b>{sStore?.name || '—'}</b></span>
                                        <span className="muted">فروشنده: {sSeller?.username || '—'}</span>
                                        <span className="chip !cursor-default !py-0.5 !px-2 text-[11px]">
                                          {statusFa(sub.status)}
                                        </span>
                                      </div>
                                      <b className="text-sm text-yellow">{formatPrice(subTotal)}</b>
                                    </div>

                                    <div className="space-y-1 text-xs">
                                      {(sub.items || []).map((item, idx) => (
                                        <div key={idx} className="flex justify-between gap-2 py-1 border-b border-theme last:border-0">
                                          <span>
                                            {item.product_name ?? item.name ?? 'کالا'} × {toFa(item.quantity)}
                                          </span>
                                          <span className="muted">
                                            {formatPrice((item.price ?? item.unit_price ?? 0) * (item.quantity || 1))}
                                          </span>
                                        </div>
                                      ))}
                                    </div>

                                    <div className="flex items-center gap-2 flex-wrap">
                                      {sub.status === 'awaiting_approval' && (
                                        <button
                                          type="button"
                                          onClick={() => approveSubOrder(sub._id)}
                                          className="btn-yellow !py-1.5 !px-3 text-xs flex items-center gap-1"
                                        >
                                          <Check size={13} /> تأیید
                                        </button>
                                      )}
                                      {payStatus === 'paid' && !['delivered', 'cancelled', 'rejected', 'finalized'].includes(sub.status) && (
                                        <>
                                          {['awaiting_approval'].includes(sub.status) && (
                                            <button type="button" onClick={() => updateSubOrderStatus(sub._id, 'preparing')} className="btn-ghost !py-1.5 !px-2.5 text-xs">آماده‌سازی</button>
                                          )}
                                          {sub.status !== 'ready_to_ship' && (
                                            <button type="button" onClick={() => updateSubOrderStatus(sub._id, 'ready_to_ship')} className="btn-ghost !py-1.5 !px-2.5 text-xs">آماده ارسال</button>
                                          )}
                                          {sub.status !== 'shipped' && (
                                            <button type="button" onClick={() => updateSubOrderStatus(sub._id, 'shipped')} className="btn-ghost !py-1.5 !px-2.5 text-xs">ارسال شد</button>
                                          )}
                                          <button type="button" onClick={() => updateSubOrderStatus(sub._id, 'delivered')} className="btn-navy !py-1.5 !px-2.5 text-xs">تحویل داده شد</button>
                                        </>
                                      )}
                                      {['awaiting_approval', 'preparing', 'ready_to_ship'].includes(sub.status) && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setCancelTarget(sub._id);
                                            setCancelReason('');
                                          }}
                                          className="btn-ghost !py-1.5 !px-2.5 text-xs text-red-400"
                                        >
                                          لغو
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── پلن‌ها ── */}
          {tab === 'plans' && (
            <div className="grid lg:grid-cols-[320px_1fr] gap-5 items-start">
              <div className="card rounded-2xl p-5 space-y-2.5">
                <h2 className="font-black">پلن جدید</h2>
                <input className="input" placeholder="نام پلن" value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} />
                <input className="input" placeholder="مدت (روز) — خالی = مادام‌العمر" value={planForm.duration_days} onChange={(e) => setPlanForm({ ...planForm, duration_days: e.target.value })} />
                <input className="input" placeholder="مبلغ (ریال، حداقل ۱۰٬۰۰۰)" value={planForm.amount} onChange={(e) => setPlanForm({ ...planForm, amount: e.target.value })} />
                <input className="input" placeholder="حداکثر محصول" value={planForm.max_products} onChange={(e) => setPlanForm({ ...planForm, max_products: e.target.value })} />
                <input className="input" placeholder="حداکثر فروشگاه" value={planForm.max_shops} onChange={(e) => setPlanForm({ ...planForm, max_shops: e.target.value })} />
                <input className="input" placeholder="حداکثر تصویر محصول" value={planForm.max_images} onChange={(e) => setPlanForm({ ...planForm, max_images: e.target.value })} />
                <input className="input" placeholder="توضیح" value={planForm.description} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={planForm.is_featured} onChange={(e) => setPlanForm({ ...planForm, is_featured: e.target.checked })} /> پلن پیشنهادی
                </label>
                <button type="button" onClick={addPlan} className="btn-yellow w-full flex items-center justify-center gap-2">
                  <Plus size={16} /> ساخت پلن
                </button>
              </div>
              <div className="space-y-2">
                {plans.map((pl) => (
                  <div key={pl._id} className="card rounded-2xl p-4 flex items-center gap-3 flex-wrap">
                    <b className="flex-1">{pl.name}</b>
                    <span className="font-black text-yellow">{formatPrice(pl.price?.amount)}</span>
                    <span className="text-xs muted">{statusFa(pl.status)}</span>
                    <button type="button" onClick={() => del(`/plan/${pl._id}`, 'پلن حذف شد')} className="btn-ghost !p-2 text-red-400">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* مودال ویرایش کاربر */}
      {editingUser && (
        <div
          className="fixed inset-0 z-[165] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setEditingUser(null)}
        >
          <form
            onSubmit={saveUser}
            onClick={(e) => e.stopPropagation()}
            className="card rounded-3xl max-w-md w-full p-6 space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-theme">
              <h3 className="font-black text-base">ویرایش کاربر</h3>
              <button type="button" onClick={() => setEditingUser(null)} className="btn-ghost !p-2">
                <X size={16} />
              </button>
            </div>
            <label className="block text-xs muted">
              نام کاربری
              <input
                className="input mt-1"
                dir="ltr"
                value={userForm.username}
                onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                required
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs muted">
                نام
                <input
                  className="input mt-1"
                  value={userForm.firstname}
                  onChange={(e) => setUserForm({ ...userForm, firstname: e.target.value })}
                />
              </label>
              <label className="text-xs muted">
                نام خانوادگی
                <input
                  className="input mt-1"
                  value={userForm.lastname}
                  onChange={(e) => setUserForm({ ...userForm, lastname: e.target.value })}
                />
              </label>
            </div>
            <label className="block text-xs muted">
              ایمیل
              <input
                className="input mt-1"
                dir="ltr"
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditingUser(null)} className="btn-ghost !py-2 text-sm">
                انصراف
              </button>
              <button type="submit" className="btn-yellow !py-2 text-sm">
                ذخیره تغییرات
              </button>
            </div>
          </form>
        </div>
      )}

      {/* مودال ویرایش فروشگاه */}
      {storeModal !== undefined && (
        <StoreEditorModal
          store={storeModal}
          isAdmin
          onClose={() => setStoreModal(undefined)}
          onSaved={() => {
            setStoreModal(undefined);
            load();
          }}
        />
      )}

      {/* مودال لغو ساب‌سفارش */}
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
            <h3 className="font-black text-base">لغو ساب‌سفارش توسط مدیر</h3>
            <textarea
              className="input"
              rows={3}
              placeholder="دلیل لغو را بنویسید…"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              required
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setCancelTarget(null)} className="btn-ghost !py-2 text-sm">
                انصراف
              </button>
              <button type="submit" className="btn-yellow !py-2 text-sm">
                ثبت لغو
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
