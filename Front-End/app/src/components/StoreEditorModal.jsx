import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { X, Upload, Save } from 'lucide-react';
import StorageImage from './StorageImage';
import { authHeaders, getToken } from '../utils/helpers/storage';
import { validateEmailSyntax } from '../utils/validators/email.validator';
import { getId } from '../utils/helpers/response';

const API = import.meta.env.VITE_APP_API_URL || 'http://localhost:3000';

const EMPTY = {
  name: '',
  description: '',
  email: '',
  phone: '',
  fax: '',
  status: 'ENABLE',
  profile_image_id: '',
  banner_image_id: '',
};

export default function StoreEditorModal({
  store = null,
  isAdmin = false,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const profileRef = useRef(null);
  const bannerRef = useRef(null);

  useEffect(() => {
    if (!store) {
      setForm(EMPTY);
      return;
    }
    setForm({
      name: store.name || '',
      description: store.description || '',
      email: store.contact_info?.email || '',
      phone: store.contact_info?.phone || '',
      fax: store.contact_info?.fax || '',
      status: store.status || 'ENABLE',
      profile_image_id: getId(store.profile_image_id) || '',
      banner_image_id: getId(store.banner_image_id) || '',
    });
  }, [store]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const uploadImage = async (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('files', file);
      const res = await axios.post(`${API}/storage`, fd, {
        headers: { Authorization: getToken(), 'Content-Type': 'multipart/form-data' },
      });
      const id = res.data?.body?.[0]?._id;
      if (id) {
        setForm((prev) => ({ ...prev, [field]: id }));
        toast.success('تصویر آپلود شد');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'خطا در آپلود تصویر');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('نام فروشگاه الزامی است');
    if (form.name.trim().length > 50) return toast.error('نام فروشگاه حداکثر ۵۰ کاراکتر است');
    if (form.description && form.description.length > 255) {
      return toast.error('توضیحات حداکثر ۲۵۵ کاراکتر است');
    }
    if (!validateEmailSyntax(form.email.trim())) return toast.error('ایمیل معتبر وارد کنید');
    if (!form.phone.trim() && !form.fax.trim()) {
      return toast.error('شماره موبایل یا تلفن ثابت (فکس) الزامی است');
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      contact_info: {
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        fax: form.fax.trim() || null,
      },
    };
    if (form.profile_image_id) payload.profile_image_id = form.profile_image_id;
    if (form.banner_image_id) payload.banner_image_id = form.banner_image_id;
    if (store) payload.status = form.status;

    setSaving(true);
    try {
      const req = store
        ? axios.put(`${API}/store/${getId(store)}`, payload, authHeaders())
        : axios.post(`${API}/store`, payload, authHeaders());
      await req;
      toast.success(store ? 'فروشگاه به‌روزرسانی شد' : 'فروشگاه جدید ایجاد شد');
      onSaved?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'خطا در ذخیره فروشگاه');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[160] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="card rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4"
      >
        <div className="flex items-center justify-between gap-2 border-b border-theme pb-3">
          <h2 className="font-black text-lg">
            {store ? `ویرایش فروشگاه: ${store.name}` : 'ایجاد فروشگاه جدید'}
          </h2>
          <button type="button" onClick={onClose} className="btn-ghost !p-2" aria-label="بستن">
            <X size={17} />
          </button>
        </div>

        {/* پیش‌نمایش تصاویر فروشگاه */}
        <div className="rounded-2xl overflow-hidden border border-theme">
          <div className="h-28 bg-navy relative">
            {form.banner_image_id ? (
              <StorageImage file={form.banner_image_id} alt="بنر فروشگاه" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-gray-300">
                بدون تصویر بنر
              </div>
            )}
            <button
              type="button"
              onClick={() => bannerRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-2 left-2 bg-[#0a1736]/90 text-white text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 hover:bg-[#ffd60a] hover:text-[#0a1736]"
            >
              <Upload size={13} /> تغییر بنر
            </button>
          </div>
          <div className="p-3 flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-navy border border-theme shrink-0 grid place-items-center font-black text-lg">
              {form.profile_image_id ? (
                <StorageImage file={form.profile_image_id} alt="لوگو" className="w-full h-full object-cover" />
              ) : (
                <span className="text-brand-yellow">{form.name?.[0] || 'ف'}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => profileRef.current?.click()}
              disabled={uploading}
              className="btn-ghost !py-1.5 !px-3 text-xs flex items-center gap-1.5"
            >
              <Upload size={13} /> {form.profile_image_id ? 'تغییر تصویر پروفایل' : 'آپلود تصویر پروفایل'}
            </button>
          </div>
          <input ref={profileRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadImage(e, 'profile_image_id')} />
          <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadImage(e, 'banner_image_id')} />
        </div>

        <label className="block text-xs muted">
          نام فروشگاه (حداکثر ۵۰ کاراکتر)
          <input
            className="input mt-1"
            maxLength={50}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </label>

        <label className="block text-xs muted">
          توضیحات فروشگاه (حداکثر ۲۵۵ کاراکتر)
          <textarea
            className="input mt-1"
            rows={3}
            maxLength={255}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>

        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-xs muted sm:col-span-2">
            ایمیل (الزامی)
            <input
              className="input mt-1"
              dir="ltr"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </label>
          <label className="text-xs muted">
            شماره موبایل (مثلاً 09123456789)
            <input
              className="input mt-1"
              dir="ltr"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </label>
          <label className="text-xs muted">
            تلفن ثابت / فکس (مثلاً 02188776655)
            <input
              className="input mt-1"
              dir="ltr"
              value={form.fax}
              onChange={(e) => setForm({ ...form, fax: e.target.value })}
            />
          </label>
        </div>

        {store && (
          <label className="block text-xs muted">
            وضعیت فروشگاه
            <select
              className="input mt-1"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="ENABLE">فعال (ENABLE)</option>
              <option value="DISABLE">غیرفعال (DISABLE)</option>
              {isAdmin && <option value="ROOT_DISABLE">مسدود ریشه‌ای (ROOT_DISABLE)</option>}
            </select>
          </label>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-theme">
          <button type="button" onClick={onClose} className="btn-ghost !py-2 text-sm">
            انصراف
          </button>
          <button type="submit" disabled={saving || uploading} className="btn-yellow !py-2 text-sm flex items-center gap-1.5">
            <Save size={15} /> {saving ? 'در حال ذخیره…' : 'ذخیره فروشگاه'}
          </button>
        </div>
      </form>
    </div>
  );
}
