import { getId, isDirectImage } from './response.js';

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const UNITS = { CM: 'سانتی‌متر', M: 'متر', G: 'گرم', KG: 'کیلوگرم' };

export const toFa = (value) => String(value ?? '').replace(/\d/g, (digit) => FA_DIGITS[+digit]);

export const formatPrice = (amount) => {
  const toman = Math.round(Number(amount || 0) / 10);
  return `${toFa(toman.toLocaleString('en-US'))} تومان`;
};

export const finalPrice = (product) => {
  if (!product) return 0;
  const amount = Number(product.price?.amount || 0);
  const percentage = Number(product.discount?.percentage || 0);
  const expiry = product.discount?.expirationDate;
  const active = percentage > 0 && (!expiry || new Date(expiry) > new Date());
  return active ? Math.round(amount * (1 - percentage / 100)) : amount;
};

export const hasDiscount = (product) =>
  Number(product?.discount?.percentage || 0) > 0 &&
  (!product.discount?.expirationDate || new Date(product.discount.expirationDate) > new Date());

export const ratingOf = (product) => {
  const rating = Number(product?.rating || 0);
  return rating > 5 ? rating / 10 : rating;
};

// alibaba_backend: dimensions.width = { value, unit }, dimensions.height = { value, unit }.
export const measurementValue = (measurement) => {
  const value =
    typeof measurement === 'object' && measurement !== null
      ? (measurement.value ?? measurement.amount ?? measurement.$numberDecimal)
      : measurement;
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export const measurementUnit = (measurement, fallback = '') => {
  const unit = measurement?.unit ?? fallback;
  return typeof unit === 'string' ? unit : '';
};

export const formatMeasurement = (measurement, fallbackUnit = '') => {
  const value = measurementValue(measurement);
  if (value === null) return 'ثبت نشده';
  const unit = measurementUnit(measurement, fallbackUnit).toUpperCase();
  const number = toFa(value.toLocaleString('en-US', { maximumFractionDigits: 6 }));
  return `${number} ${UNITS[unit] || unit}`.trim();
};

export const formatDimensions = (dimensions) => {
  if (!dimensions || typeof dimensions !== 'object') return 'ثبت نشده';
  const parts = ['length', 'width', 'height']
    .filter((axis) => measurementValue(dimensions[axis]) !== null)
    .map((axis) => formatMeasurement(dimensions[axis], dimensions.unit));
  return parts.length ? parts.join(' × ') : 'ثبت نشده';
};

export const formatWeight = (weight) => formatMeasurement(weight);

export const productImages = (product) => {
  const images = product?.images_id ?? product?.images ?? [];
  return Array.isArray(images)
    ? images.filter((image) => getId(image) || isDirectImage(image))
    : [];
};

export const productImage = (product) => productImages(product).find(isDirectImage) || '';

export const formatDate = (date) => {
  const value = new Date(date);
  return date && !Number.isNaN(value.getTime())
    ? toFa(value.toLocaleDateString('fa-IR'))
    : 'ثبت نشده';
};

export const formatDateTime = (date) => {
  const value = new Date(date);
  return date && !Number.isNaN(value.getTime()) ? toFa(value.toLocaleString('fa-IR')) : 'ثبت نشده';
};

export const STATUS_FA = {
  awaiting_approval: 'در انتظار تأیید فروشنده',
  preparing: 'در حال آماده‌سازی',
  ready_to_ship: 'آماده ارسال',
  shipped: 'ارسال شده',
  delivered: 'تحویل داده شده',
  cancelled: 'لغو شده',
  rejected: 'رد شده',
  finalized: 'نهایی شده',
  awaiting_payment: 'در انتظار پرداخت',
  paid: 'پرداخت شده',
  unpaid: 'پرداخت نشده',
  ACTIVE: 'فعال',
  INACTIVE: 'غیرفعال',
  ENABLE: 'فعال',
  DISABLE: 'غیرفعال',
  ROOT_DISABLE: 'غیرفعال ریشه‌ای',
  IN_STOCK: 'موجود',
  OUT_OF_STOCK: 'ناموجود',
  PUBLIC: 'عمومی',
  PRIVATE: 'خصوصی',
  Individual_seller: 'فروشنده حقیقی',
  institutional_seller: 'فروشنده حقوقی',
};

export const statusFa = (status) => (status ? (STATUS_FA[status] ?? status) : '—');
