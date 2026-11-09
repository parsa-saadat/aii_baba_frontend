import { useEffect, useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { resolveStorageImage } from '../utils/helpers/storage-files';

export default function ImageLightbox({ file, alt = 'تصویر', onClose }) {
  const [url, setUrl] = useState('');
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!file) return;
    let active = true;
    setScale(1);
    resolveStorageImage(file)
      .then((res) => active && setUrl(res))
      .catch(() => active && setUrl(''));
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    return () => {
      active = false;
      document.removeEventListener('keydown', onKey);
    };
  }, [file, onClose]);

  if (!file) return null;

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-sm flex flex-col"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
    >
      <div
        className="flex items-center justify-between px-4 py-3 text-white border-b border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="font-bold text-sm truncate">{alt}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.5, +(s - 0.25).toFixed(2)))}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20"
            title="کوچک‌نمایی"
            aria-label="کوچک‌نمایی"
          >
            <ZoomOut size={17} />
          </button>
          <button
            type="button"
            onClick={() => setScale(1)}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20"
            title="اندازه اصلی"
            aria-label="اندازه اصلی"
          >
            <RotateCcw size={17} />
          </button>
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(3, +(s + 0.25).toFixed(2)))}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20"
            title="بزرگ‌نمایی"
            aria-label="بزرگ‌نمایی"
          >
            <ZoomIn size={17} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-red-500/40"
            title="بستن"
            aria-label="بستن"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div
        className="flex-1 overflow-auto flex items-center justify-center p-4"
        onClick={onClose}
      >
        {url ? (
          <img
            src={url}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            style={{ transform: `scale(${scale})`, transition: 'transform 0.15s ease' }}
            className="max-w-[90vw] max-h-[82vh] object-contain rounded-xl shadow-2xl"
          />
        ) : (
          <div className="text-white text-sm">در حال بارگذاری تصویر…</div>
        )}
      </div>
    </div>
  );
}
