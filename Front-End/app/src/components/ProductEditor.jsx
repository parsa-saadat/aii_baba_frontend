import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { X, Upload, Plus, ArrowRight, Save } from 'lucide-react';
import MarkdownEditor, { isValidBackendMarkdown } from './MarkdownEditor';
import StorageImage from './StorageImage';
import ImageLightbox from './ImageLightbox';
import { getToken, authHeaders } from '../utils/helpers/storage';
import { getId } from '../utils/helpers/response';
import {
  measurementValue,
  measurementUnit,
  toFa,
  formatPrice,
} from '../utils/helpers/format';

const API = import.meta.env.VITE_APP_API_URL || 'http://localhost:3000';

const DEFAULT_FORM = {
  name: '',
  store_id: '',
  category_id: '',
  brand: '',
  short_description: '',
  description: '## معرفی محصول\n\n**ویژگی‌های اصلی:**\n- کیفیت ساخت بالا\n- ارسال سریع سراسری',
  production: new Date().getFullYear(),
  images_id: [],
  price_amount: 1000000,
  has_discount: false,
  discount_percentage: 10,
  discount_expiry: '',
  stock: 10,
  stock_status: 'IN_STOCK',
  status: 'ACTIVE',
  visibility: 'PUBLIC',
  warranty: false,
  tags: [],
  width_value: 10,
  width_unit: 'CM',
  height_value: 10,
  height_unit: 'CM',
  weight_value: 200,
  weight_unit: 'G',
};

function toDateInputValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 16);
}

export default function ProductEditor({
  product = null,
  stores = [],
  categories = [],
  isAdmin = false,
  onCancel,
  onSaved,
}) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [zoomFile, setZoomFile] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!product) {
      setForm({
        ...DEFAULT_FORM,
        store_id: stores[0] ? getId(stores[0]) : '',
        category_id: categories[0] ? getId(categories[0]) : '',
      });
      return;
    }
    const pct = product.discount?.percentage || 0;
    setForm({
      name: product.name || '',
      store_id: getId(product.store_id) || '',
      category_id: getId(product.category_id) || '',
      brand: product.brand || '',
      short_description: product.short_description || '',
      description: product.description || '',
      production: product.production || new Date().getFullYear(),
      images_id: Array.isArray(product.images_id) ? product.images_id.map(getId).filter(Boolean) : [],
      price_amount: product.price?.amount ?? 1000000,
      has_discount: pct > 0,
      discount_percentage: pct || 10,
      discount_expiry: toDateInputValue(product.discount?.expirationDate),
      stock: product.stock ?? 0,
      stock_status: product.stock_status || 'IN_STOCK',
      status: product.status || 'ACTIVE',
      visibility: product.visibility || 'PUBLIC',
      warranty: Boolean(product.warranty),
      tags: Array.isArray(product.tags) ? product.tags : [],
      width_value: measurementValue(product.dimensions?.width) ?? 10,
      width_unit: measurementUnit(product.dimensions?.width, 'CM').toUpperCase() || 'CM',
      height_value: measurementValue(product.dimensions?.height) ?? 10,
      height_unit: measurementUnit(product.dimensions?.height, 'CM').toUpperCase() || 'CM',
      weight_value: measurementValue(product.weight) ?? 200,
      weight_unit: measurementUnit(product.weight, 'G').toUpperCase() || 'G',
    });
  }, [product, stores, categories]);

  const uploadImages = async (files) => {
    if (!files?.length) return [];
    setUploading(true);
    try {
      const fd = new FormData();
      [...files].forEach((f) => fd.append('files', f));
      const res = await axios.post(`${API}/storage`, fd, {
        headers: { Authorization: getToken(), 'Content-Type': 'multipart/form-data' },
      });
      return (res.data.body || []).map((f) => f._id);
    } finally {
      setUploading(false);
    }
  };

  const handleGalleryUpload = async (e) => {
    try {
      const ids = await uploadImages(e.target.files);
      if (ids.length) {
        setForm((prev) => ({ ...prev, images_id: [...prev.images_id, ...ids] }));
        toast.success('تصاویر آپلود شد');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'خطا در آپلود تصویر');
    }
    e.target.value = '';
  };

  const handleMarkdownUpload = async (file) => {
    try {
      const [id] = await uploadImages([file]);
      return id ? `${API}/storage/${id}` : '';
    } catch (err) {
      toast.error(err.response?.data?.message || 'خطا در آپلود تصویر');
      return '';
    }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (form.tags.length >= 20) return toast.warn('حداکثر ۲۰ برچسب مجاز است');
    if (!form.tags.includes(t)) {
      setForm((prev) => ({ ...prev, tags: [...prev.tags, t] }));
    }
    setTagInput('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('نام محصول الزامی است');
    if (!product && !form.store_id) return toast.error('انتخاب فروشگاه الزامی است');
    if (!form.category_id) return toast.error('انتخاب دسته‌بندی الزامی است');
    if (!form.brand.trim()) return toast.error('نام برند الزامی است');
    if (!form.short_description.trim()) return toast.error('توضیح کوتاه الزامی است');
    if (!isValidBackendMarkdown(form.description)) {
      return toast.error('توضیحات محصول باید شامل حداقل یک عنصر Markdown (تیتر ##، لیست - یا متن **ضخیم**) باشد');
    }
    if (!form.images_id.length) return toast.error('حداقل یک تصویر برای محصول آپلود کنید');
    if (Number(form.price_amount) <= 0) return toast.error('قیمت باید بزرگتر از صفر باشد');

    let discountPayload = null;
    if (form.has_discount) {
      const pct = Number(form.discount_percentage);
      if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
        return toast.error('درصد تخفیف باید بین ۱ تا ۱۰۰ باشد');
      }
      if (!form.discount_expiry || new Date(form.discount_expiry) <= new Date()) {
        return toast.error('تاریخ انقضای تخفیف باید در آینده باشد');
      }
      discountPayload = {
        percentage: pct,
        expirationDate: new Date(form.discount_expiry).toISOString(),
      };
    }

    const basePayload = {
      name: form.name.trim(),
      category_id: form.category_id,
      brand: form.brand.trim(),
      short_description: form.short_description.trim(),
      description: form.description,
      production: Number(form.production),
      images_id: form.images_id,
      price: { currency: 'IRR', amount: Number(form.price_amount) },
      discount: discountPayload,
      stock: Number(form.stock),
      warranty: Boolean(form.warranty),
      tags: form.tags,
      dimensions: {
        width: { value: Number(form.width_value), unit: form.width_unit },
        height: { value: Number(form.height_value), unit: form.height_unit },
      },
      weight: { value: Number(form.weight_value), unit: form.weight_unit },
    };

    if (!product) {
      basePayload.store_id = form.store_id;
      basePayload.visibility = form.visibility;
    } else {
      if (form.stock_status !== product.stock_status) basePayload.stock_status = form.stock_status;
      if (String(form.visibility).toLowerCase() !== String(product.visibility).toLowerCase()) {
        basePayload.visibility = form.visibility;
      }
      if (String(form.status).toLowerCase() !== String(product.status).toLowerCase()) {
        basePayload.status = form.status;
      }
    }

    setSaving(true);
    try {
      const req = product
        ? axios.put(`${API}/product/${getId(product)}`, basePayload, authHeaders())
        : axios.post(`${API}/product`, basePayload, authHeaders());
      await req;
      toast.success(product ? 'محصول با موفقیت ویرایش شد' : 'محصول جدید ثبت شد');
      onSaved?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'خطا در ذخیره محصول');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap card rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onCancel} className="btn-ghost !p-2" aria-label="بازگشت">
            <ArrowRight size={18} />
          </button>
          <div>
            <h2 className="font-black text-lg">
              {product ? `ویرایش محصول: ${product.name}` : 'ایجاد محصول جدید'}
            </h2>
            <p className="text-xs muted">
              {isAdmin ? 'ویرایش مستقیم محصول توسط مدیر سیستم' : 'تکمیل مشخصات، تصاویر و توضیحات Markdown'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onCancel} className="btn-ghost !py-2 text-sm">
            انصراف
          </button>
          <button type="submit" disabled={saving || uploading} className="btn-yellow !py-2 text-sm flex items-center gap-1.5">
            <Save size={15} /> {saving ? 'در حال ذخیره…' : product ? 'ذخیره تغییرات' : 'انتشار محصول'}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-5 items-start">
        {/* ستون اصلی: عنوان، توضیحات Markdown، مشخصات و گالری */}
        <div className="space-y-5 min-w-0">
          <div className="card rounded-2xl p-5 space-y-4">
            <h3 className="font-black text-sm">مشخصات اصلی</h3>
            <label className="block text-xs muted">
              نام محصول
              <input
                className="input mt-1.5"
                placeholder="مثلاً: گیرنده GNSS چندفرکانسه مدل X1"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>
            <label className="block text-xs muted">
              معرفی کوتاه (حداکثر ۵۰۰ کاراکتر)
              <input
                className="input mt-1.5"
                placeholder="یک خلاصه کوتاه که زیر نام محصول نمایش داده می‌شود"
                value={form.short_description}
                onChange={(e) => setForm({ ...form, short_description: e.target.value })}
                required
              />
            </label>
          </div>

          <div className="card rounded-2xl p-5 space-y-3">
            <h3 className="font-black text-sm">توضیحات کامل محصول (ویرایشگر Markdown)</h3>
            <MarkdownEditor
              value={form.description}
              onChange={(val) => setForm({ ...form, description: val })}
              onUploadImage={handleMarkdownUpload}
            />
          </div>

          <div className="card rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="font-black text-sm">گالری تصاویر محصول ({toFa(form.images_id.length)} / ۲۰)</h3>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="btn-ghost !py-2 text-xs flex items-center gap-1.5"
              >
                <Upload size={14} /> {uploading ? 'در حال آپلود…' : 'آپلود تصویر'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleGalleryUpload}
              />
            </div>

            {form.images_id.length === 0 ? (
              <div className="rounded-xl border border-dashed border-theme p-8 text-center text-xs muted">
                هنوز تصویری انتخاب نشده است. روی «آپلود تصویر» بزنید.
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {form.images_id.map((id, idx) => (
                  <div key={`${id}-${idx}`} className="relative aspect-square rounded-xl overflow-hidden border border-theme">
                    <StorageImage
                      file={id}
                      alt={`تصویر ${idx + 1}`}
                      className="w-full h-full object-cover"
                      onZoom={(f, a) => setZoomFile({ file: f, alt: a })}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          images_id: prev.images_id.filter((_, i) => i !== idx),
                        }))
                      }
                      className="absolute top-1 left-1 bg-black/75 text-white rounded-full p-1 hover:bg-red-600"
                      aria-label="حذف تصویر"
                    >
                      <X size={12} />
                    </button>
                    {idx === 0 && (
                      <span
                        className="absolute bottom-1 right-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--primary-color)', color: '#0a1736' }}
                      >
                        اصلی
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ستون کناری: دسته‌بندی، قیمت، تخفیف، ابعاد و وزن، برچسب‌ها */}
        <div className="space-y-5 min-w-0">
          <div className="card rounded-2xl p-5 space-y-3">
            <h3 className="font-black text-sm">انتشار و دسته‌بندی</h3>

            {!product ? (
              <label className="block text-xs muted">
                فروشگاه
                <select
                  className="input mt-1"
                  value={form.store_id}
                  onChange={(e) => setForm({ ...form, store_id: e.target.value })}
                  required
                >
                  <option value="">انتخاب فروشگاه</option>
                  {stores.map((s) => (
                    <option key={getId(s)} value={getId(s)}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="card2 rounded-xl p-3 text-xs">
                <span className="muted block">فروشگاه</span>
                <b className="mt-0.5 block">
                  {stores.find((s) => getId(s) === form.store_id)?.name || product.store_name || '—'}
                </b>
              </div>
            )}

            <label className="block text-xs muted">
              دسته‌بندی
              <select
                className="input mt-1"
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                required
              >
                <option value="">انتخاب دسته‌بندی</option>
                {categories.map((c) => (
                  <option key={getId(c)} value={getId(c)}>
                    {c.parent_id ? `— ${c.name}` : c.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs muted">
                برند
                <input
                  className="input mt-1"
                  placeholder="برند"
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  required
                />
              </label>
              <label className="text-xs muted">
                سال تولید
                <input
                  className="input mt-1"
                  type="number"
                  min={1900}
                  max={new Date().getFullYear()}
                  value={form.production}
                  onChange={(e) => setForm({ ...form, production: e.target.value })}
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs muted">
                نمایش
                <select
                  className="input mt-1"
                  value={String(form.visibility).toUpperCase()}
                  onChange={(e) => setForm({ ...form, visibility: e.target.value })}
                >
                  <option value="PUBLIC">عمومی</option>
                  <option value="PRIVATE">خصوصی</option>
                </select>
              </label>
              {product && (
                <label className="text-xs muted">
                  وضعیت انتشار
                  <select
                    className="input mt-1"
                    value={String(form.status).toUpperCase()}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="ACTIVE">فعال</option>
                    <option value="INACTIVE">غیرفعال</option>
                  </select>
                </label>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={form.warranty}
                onChange={(e) => setForm({ ...form, warranty: e.target.checked })}
              />
              دارای گارانتی
            </label>
          </div>

          <div className="card rounded-2xl p-5 space-y-3">
            <h3 className="font-black text-sm">قیمت، تخفیف و موجودی</h3>
            <label className="block text-xs muted">
              قیمت (ریال) — نمایش به کاربر: <b className="text-yellow">{formatPrice(form.price_amount)}</b>
              <input
                className="input mt-1"
                type="number"
                min={1}
                value={form.price_amount}
                onChange={(e) => setForm({ ...form, price_amount: e.target.value })}
                required
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs muted">
                موجودی انبار
                <input
                  className="input mt-1"
                  type="number"
                  min={0}
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  required
                />
              </label>
              {product && (
                <label className="text-xs muted">
                  وضعیت موجودی
                  <select
                    className="input mt-1"
                    value={form.stock_status}
                    onChange={(e) => setForm({ ...form, stock_status: e.target.value })}
                  >
                    <option value="IN_STOCK">موجود</option>
                    <option value="OUT_OF_STOCK">ناموجود</option>
                  </select>
                </label>
              )}
            </div>

            <div className="pt-1 border-t border-theme space-y-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.has_discount}
                  onChange={(e) => setForm({ ...form, has_discount: e.target.checked })}
                />
                اعمال تخفیف روی محصول
              </label>
              {form.has_discount && (
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs muted">
                    درصد تخفیف
                    <input
                      className="input mt-1"
                      type="number"
                      min={1}
                      max={100}
                      value={form.discount_percentage}
                      onChange={(e) => setForm({ ...form, discount_percentage: e.target.value })}
                    />
                  </label>
                  <label className="text-xs muted">
                    تاریخ انقضا
                    <input
                      className="input mt-1 text-xs"
                      type="datetime-local"
                      dir="ltr"
                      value={form.discount_expiry}
                      onChange={(e) => setForm({ ...form, discount_expiry: e.target.value })}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          <div className="card rounded-2xl p-5 space-y-3">
            <h3 className="font-black text-sm">ابعاد و وزن</h3>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs muted">
                عرض
                <input
                  className="input mt-1"
                  type="number"
                  min="0.01"
                  step="any"
                  value={form.width_value}
                  onChange={(e) => setForm({ ...form, width_value: e.target.value })}
                />
              </label>
              <label className="text-xs muted">
                واحد عرض
                <select
                  className="input mt-1"
                  value={form.width_unit}
                  onChange={(e) => setForm({ ...form, width_unit: e.target.value })}
                >
                  <option value="CM">سانتی‌متر</option>
                  <option value="M">متر</option>
                </select>
              </label>
              <label className="text-xs muted">
                ارتفاع
                <input
                  className="input mt-1"
                  type="number"
                  min="0.01"
                  step="any"
                  value={form.height_value}
                  onChange={(e) => setForm({ ...form, height_value: e.target.value })}
                />
              </label>
              <label className="text-xs muted">
                واحد ارتفاع
                <select
                  className="input mt-1"
                  value={form.height_unit}
                  onChange={(e) => setForm({ ...form, height_unit: e.target.value })}
                >
                  <option value="CM">سانتی‌متر</option>
                  <option value="M">متر</option>
                </select>
              </label>
              <label className="text-xs muted">
                وزن
                <input
                  className="input mt-1"
                  type="number"
                  min="0.01"
                  step="any"
                  value={form.weight_value}
                  onChange={(e) => setForm({ ...form, weight_value: e.target.value })}
                />
              </label>
              <label className="text-xs muted">
                واحد وزن
                <select
                  className="input mt-1"
                  value={form.weight_unit}
                  onChange={(e) => setForm({ ...form, weight_unit: e.target.value })}
                >
                  <option value="G">گرم</option>
                  <option value="KG">کیلوگرم</option>
                </select>
              </label>
            </div>
          </div>

          <div className="card rounded-2xl p-5 space-y-3">
            <h3 className="font-black text-sm">برچسب‌ها (تگ)</h3>
            <div className="flex gap-2">
              <input
                className="input !py-2 text-sm"
                placeholder="افزودن برچسب…"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <button type="button" onClick={addTag} className="btn-ghost !px-3" aria-label="افزودن برچسب">
                <Plus size={16} />
              </button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {form.tags.map((t) => (
                  <span key={t} className="chip !py-1 !px-2.5 text-xs flex items-center gap-1.5">
                    {t}
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, tags: prev.tags.filter((x) => x !== t) }))}
                      aria-label={`حذف ${t}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {zoomFile && (
        <ImageLightbox
          file={zoomFile.file}
          alt={zoomFile.alt}
          onClose={() => setZoomFile(null)}
        />
      )}
    </form>
  );
}
