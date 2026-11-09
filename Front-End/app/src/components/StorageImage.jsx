import { useEffect, useState } from 'react';
import { ImageOff, LoaderCircle, ZoomIn } from 'lucide-react';
import { resolveStorageImage } from '../utils/helpers/storage-files';
import { getId } from '../utils/helpers/response';

export default function StorageImage({
  file,
  alt = '',
  className = '',
  eager = false,
  fallback = null,
  compact = false,
  onZoom = null,
}) {
  const [state, setState] = useState({ key: '', url: '', error: false });
  const key = typeof file === 'string' ? file : getId(file) || file?.url || (file ? 'embedded' : '');
  const ready = state.key === key;
  const url = ready ? state.url : '';

  useEffect(() => {
    let active = true;
    setState({ key, url: '', error: false });
    if (!file) return undefined;
    resolveStorageImage(file)
      .then((result) => active && setState({ key, url: result, error: false }))
      .catch(() => active && setState({ key, url: '', error: true }));
    return () => {
      active = false;
    };
  }, [file, key]);

  if (!file || (ready && (state.error || !url))) {
    if (fallback !== null) return fallback;
    return (
      <span
        className={`storage-image-placeholder ${className}`}
        role="img"
        aria-label={alt || 'تصویر در دسترس نیست'}
      >
        <ImageOff size={compact ? 16 : 22} aria-hidden="true" />
        {!compact && <span className="storage-image-caption">تصویر در دسترس نیست</span>}
      </span>
    );
  }

  if (!url) {
    return (
      <span
        className={`storage-image-placeholder ${className}`}
        role="img"
        aria-label={`در حال بارگذاری ${alt}`}
      >
        <LoaderCircle className="animate-spin" size={compact ? 15 : 20} aria-hidden="true" />
      </span>
    );
  }

  if (onZoom) {
    return (
      <button
        type="button"
        onClick={() => onZoom(file, alt)}
        className={`relative group overflow-hidden block ${className}`}
        title="بزرگ‌نمایی تصویر"
        aria-label={`بزرگ‌نمایی ${alt || 'تصویر'}`}
      >
        <img
          src={url}
          alt={alt}
          className="w-full h-full object-cover"
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setState({ key, url: '', error: true })}
        />
        <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity grid place-items-center text-white">
          <ZoomIn size={18} />
        </span>
      </button>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setState({ key, url: '', error: true })}
    />
  );
}
