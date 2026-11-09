import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { User, Store, MapPin, Plus, ShieldCheck, Trash2, Upload } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { authHeaders } from '../utils/helpers/storage';
import { toFa, statusFa } from '../utils/helpers/format';
import { nationalIDValidator } from '../utils/validators/national_id.validator';
import { cardNumberValidator } from '../utils/validators/card_number.validator';
import { shebaNumberValidator } from '../utils/validators/sheba_number.validator';

const API = (import.meta.env.VITE_APP_API_URL || 'http://localhost:3000');
const EMPTY_ADDR = {
  full_name: '',
  province: '',
  city: '',
  neighborhood: '',
  full_address: '',
  building_number: '',
  unit: '',
  postal_code: '',
};
const EMPTY_SELLER = {
  seller_type: 'Individual_seller',
  national_ID: '',
  birth_date: '',
  identity_image_id: '',
  identity_verification_image_id: '',
  province: '',
  city: '',
  full_address: '',
  card_number: '',
  sheba_number: '',
  firstname_lastname: '',
};

export default function Profile() {
  const { user, refreshUser, logout } = useShop();
  const [username, setUsername] = useState('');
  const [addresses, setAddresses] = useState([]);
  const [showAddr, setShowAddr] = useState(false);
  const [addr, setAddr] = useState(EMPTY_ADDR);
  const [seller, setSeller] = useState(EMPTY_SELLER);
  const idRef = useRef(null);
  const verifyRef = useRef(null);

  const loadAddresses = useCallback(() => {
    if (!user) return;
    axios
      .get(`${API}/users/${user._id}/address`, authHeaders())
      .then((res) => setAddresses(Array.isArray(res.data.body) ? res.data.body : res.data.body?.data || []))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      loadAddresses();
    }
  }, [user, loadAddresses]);

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <User size={36} className="mx-auto muted mb-3" />
        <p className="muted mb-4">برای مشاهده پنل کاربری وارد شوید</p>
        <Link to="/auth/pre" className="btn-yellow">ورود</Link>
      </div>
    );
  }

  const saveUsername = () => {
    axios
      .put(`${API}/user/${user._id}`, { username }, authHeaders())
      .then(() => {
        toast.success('نام کاربری به‌روزرسانی شد');
        refreshUser();
      })
      .catch((err) => toast.error(err.response?.data?.message || 'خطا'));
  };

  const addAddress = () => {
    if (!addr.full_name || !addr.province || !addr.city || !addr.neighborhood || !addr.full_address || !addr.building_number || !addr.unit || !addr.postal_code) {
      return toast.error('لطفاً تمام فیلدهای آدرس را کامل وارد کنید');
    }
    axios
      .post(
        `${API}/users/${user._id}/address`,
        {
          address: {
            full_name: addr.full_name,
            province: addr.province,
            city: addr.city,
            neighborhood: addr.neighborhood,
            full_address: addr.full_address,
            building_number: Number(addr.building_number),
            unit: Number(addr.unit),
            postal_code: addr.postal_code,
            is_default: addresses.length === 0,
          },
        },
        authHeaders(),
      )
      .then(() => {
        toast.success('آدرس اضافه شد');
        setShowAddr(false);
        setAddr(EMPTY_ADDR);
        loadAddresses();
      })
      .catch((err) => toast.error(err.response?.data?.message || 'خطا در ثبت آدرس'));
  };

  const removeAddress = (id) => {
    axios
      .delete(`${API}/users/${user._id}/address/${id}`, authHeaders())
      .then(() => {
        toast.success('آدرس حذف شد');
        loadAddresses();
      })
      .catch((err) => toast.error(err.response?.data?.message || 'خطا'));
  };

  // آپلود مدارک به /storage (multer field: files) → _id
  const uploadFile = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('files', file);
      const res = await axios.post(`${API}/storage`, formData, {
        headers: { Authorization: localStorage.getItem('token'), 'Content-Type': 'multipart/form-data' },
      });
      const fileId = res.data.body[0]._id;
      setSeller((s) => ({ ...s, [field]: fileId }));
      toast.success('فایل آپلود شد');
    } catch (err) {
      toast.error(err.response?.data?.message || 'خطا در آپلود');
    }
  };

  const requestSeller = () => {
    if (!nationalIDValidator(seller.national_ID)) return toast.error('کد ملی معتبر وارد کنید');
    if (!cardNumberValidator(seller.card_number)) return toast.error('شماره کارت معتبر نیست');
    if (!shebaNumberValidator(seller.sheba_number)) return toast.error('شماره شبا معتبر نیست');
    if (!seller.identity_image_id || !seller.identity_verification_image_id) return toast.error('تصاویر مدارک را آپلود کنید');
    if (!seller.province || !seller.city || !seller.full_address) return toast.error('آدرس کامل نیست');
    axios
      .post(
        `${API}/seller`,
        {
          seller_type: seller.seller_type,
          national_ID: seller.national_ID,
          birth_date: seller.birth_date,
          identity_image_id: seller.identity_image_id,
          identity_verification_image_id: seller.identity_verification_image_id,
          address: { province: seller.province, city: seller.city, full_address: seller.full_address },
          settlement_account: {
            type: 'card',
            card_number: seller.card_number.replace(/\s/g, ''),
            sheba_number: seller.sheba_number.replace(/\s/g, '').toUpperCase(),
            firstname_lastname: seller.firstname_lastname,
          },
        },
        authHeaders(),
      )
      .then(() => {
        toast.success('درخواست فروشندگی ثبت شد — در انتظار تأیید ادمین');
        refreshUser();
      })
      .catch((err) => toast.error(err.response?.data?.message || 'خطا در ثبت درخواست'));
  };

  const isSeller = user.is_seller || user.role === 'seller' || user.role === 'admin';
  const set = (k) => (e) => setSeller({ ...seller, [k]: e.target.value });

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="font-black text-2xl mb-5 flex items-center gap-2"><User size={24} className="text-yellow" /> پنل کاربری</h1>
      <div className="grid lg:grid-cols-2 gap-5 items-start">
        <div className="space-y-4">
          <div className="card rounded-3xl p-5">
            <h2 className="font-black mb-3">اطلاعات حساب</h2>
            <div className="text-sm muted mb-3">موبایل: <b dir="ltr">{toFa(user.phone)}</b> • نقش: <b>{user.role}</b></div>
            <span className="text-xs muted block mb-1.5">نام کاربری</span>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} />
            <button onClick={saveUsername} className="btn-yellow mt-3">ذخیره</button>
            <div className="flex gap-2 mt-4 flex-wrap">
              <Link to="/orders" className="btn-ghost !py-2 text-sm">سفارش‌های من</Link>
              <Link to="/favorites" className="btn-ghost !py-2 text-sm">علاقه‌مندی‌ها</Link>
              {isSeller && <Link to="/seller" className="btn-ghost !py-2 text-sm flex items-center gap-1"><Store size={14} /> پنل فروشنده</Link>}
              {user.role === 'admin' && <Link to="/admin" className="btn-ghost !py-2 text-sm flex items-center gap-1"><ShieldCheck size={14} /> پنل مدیریت</Link>}
              <button onClick={logout} className="btn-ghost !py-2 text-sm text-red-400">خروج</button>
            </div>
          </div>

          <div className="card rounded-3xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-black flex items-center gap-2"><MapPin size={17} className="text-yellow" /> آدرس‌های من</h2>
              <button onClick={() => setShowAddr((v) => !v)} className="btn-ghost !py-1.5 !px-3 text-sm flex items-center gap-1"><Plus size={14} /> جدید</button>
            </div>
            {showAddr && (
              <div className="grid gap-2 mb-3">
                <input className="input" placeholder="نام و نام خانوادگی گیرنده" value={addr.full_name} onChange={(e) => setAddr({ ...addr, full_name: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <input className="input" placeholder="استان" value={addr.province} onChange={(e) => setAddr({ ...addr, province: e.target.value })} />
                  <input className="input" placeholder="شهر" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} />
                </div>
                <input className="input" placeholder="محله" value={addr.neighborhood} onChange={(e) => setAddr({ ...addr, neighborhood: e.target.value })} />
                <input className="input" placeholder="آدرس کامل" value={addr.full_address} onChange={(e) => setAddr({ ...addr, full_address: e.target.value })} />
                <div className="grid grid-cols-3 gap-2">
                  <input className="input" type="number" placeholder="پلاک" value={addr.building_number} onChange={(e) => setAddr({ ...addr, building_number: e.target.value })} />
                  <input className="input" type="number" placeholder="واحد" value={addr.unit} onChange={(e) => setAddr({ ...addr, unit: e.target.value })} />
                  <input className="input" dir="ltr" placeholder="کد پستی ۱۰ رقمی" value={addr.postal_code} onChange={(e) => setAddr({ ...addr, postal_code: e.target.value })} />
                </div>
                <button onClick={addAddress} className="btn-yellow">ذخیره آدرس</button>
              </div>
            )}
            <div className="space-y-2">
              {addresses.map((a) => {
                const ad = a.address || a;
                return (
                  <div key={a._id} className="card2 rounded-xl p-3 text-sm flex justify-between gap-2">
                    <div><b>{ad.full_name || a.title || 'آدرس'}</b> — {ad.province}، {ad.city}<div className="muted">{ad.neighborhood ? `${ad.neighborhood}، ` : ''}{ad.full_address}</div></div>
                    <div className="flex items-start gap-1 shrink-0">
                      {(a.is_default || ad.is_default) && <span className="chip on !cursor-default text-[10px]">پیش‌فرض</span>}
                      <button onClick={() => removeAddress(a._id)} className="text-red-400 p-1"><Trash2 size={14} /></button>
                    </div>
                  </div>
                );
              })}
              {addresses.length === 0 && <div className="text-sm muted">آدرسی ثبت نشده است.</div>}
            </div>
          </div>
        </div>

        <div className="card rounded-3xl p-5">
          <h2 className="font-black flex items-center gap-2 mb-1"><Store size={18} className="text-yellow" /> فروشنده شوید</h2>
          {isSeller ? (
            <div className="text-sm">
              <p className="muted leading-7 mt-2">
                وضعیت تأیید: <b>{user.seller_approved_status ? 'تأیید شده' : 'در انتظار تأیید'}</b><br />
                وضعیت فعالیت: <b>{statusFa(user.seller_active_status)}</b><br />
                نوع فروشنده: <b>{statusFa(user.seller_type)}</b>
              </p>
              <Link to="/seller" className="btn-yellow inline-block mt-3">ورود به پنل فروشنده</Link>
            </div>
          ) : (
            <div className="space-y-2 mt-3">
              <p className="text-sm muted leading-6">با ثبت درخواست و تأیید ادمین می‌توانید فروشگاه بسازید و محصول بفروشید.</p>
              <select className="input" value={seller.seller_type} onChange={set('seller_type')}>
                <option value="Individual_seller">فروشنده حقیقی</option>
                <option value="institutional_seller">فروشنده حقوقی</option>
              </select>
              <input className="input" dir="ltr" placeholder="کد ملی (۱۰ رقم)" value={seller.national_ID} onChange={set('national_ID')} />
              <input className="input" placeholder="تاریخ تولد (1370-01-01)" value={seller.birth_date} onChange={set('birth_date')} />
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => idRef.current.click()} className="btn-ghost !py-2 text-xs flex items-center justify-center gap-1">
                  <Upload size={13} /> {seller.identity_image_id ? 'کارت ملی ✓' : 'تصویر کارت ملی'}
                </button>
                <button type="button" onClick={() => verifyRef.current.click()} className="btn-ghost !py-2 text-xs flex items-center justify-center gap-1">
                  <Upload size={13} /> {seller.identity_verification_image_id ? 'احراز ✓' : 'سلفی احراز هویت'}
                </button>
                <input ref={idRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadFile(e, 'identity_image_id')} />
                <input ref={verifyRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadFile(e, 'identity_verification_image_id')} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input className="input" placeholder="استان" value={seller.province} onChange={set('province')} />
                <input className="input" placeholder="شهر" value={seller.city} onChange={set('city')} />
              </div>
              <input className="input" placeholder="آدرس کامل" value={seller.full_address} onChange={set('full_address')} />
              <input className="input" dir="ltr" placeholder="شماره کارت ۱۶ رقمی" value={seller.card_number} onChange={set('card_number')} />
              <input className="input" dir="ltr" placeholder="IR..." value={seller.sheba_number} onChange={set('sheba_number')} />
              <input className="input" placeholder="نام صاحب حساب" value={seller.firstname_lastname} onChange={set('firstname_lastname')} />
              <button onClick={requestSeller} className="btn-yellow w-full">ثبت درخواست فروشندگی</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
