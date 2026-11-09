import axios from 'axios';
import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, X, LoaderCircle } from 'lucide-react';
import StorageImage from './StorageImage';
import { getList, getId } from '../utils/helpers/response';
import { finalPrice, formatPrice, productImages } from '../utils/helpers/format';

const API = (import.meta.env.VITE_APP_API_URL || 'http://localhost:3000');

export default function SearchBox() {
  const navigate = useNavigate();
  const listId = useId();
  const boxRef = useRef(null);
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [retry, setRetry] = useState(0);
  const term = query.trim();

  useEffect(() => {
    const controller = new AbortController();
    setProducts([]);
    setActiveIndex(-1);
    setError('');
    if (!term) {
      setLoading(false);
      return () => controller.abort();
    }
    setLoading(true);
    const timer = window.setTimeout(() => {
      axios
        .get(`${API}/product`, {
          params: { name: term, page: 1, limit: 6 },
          signal: controller.signal,
          timeout: 12000,
        })
        .then((response) => {
          if (response.data?.success === false) throw new Error(response.data.message);
          setProducts(getList(response));
        })
        .catch((err) => {
          if (!axios.isCancel(err)) setError('دریافت نتایج جستجو ناموفق بود. دوباره تلاش کنید.');
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 350);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [term, retry]);

  useEffect(() => {
    const onOutside = (event) => {
      if (!boxRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onOutside);
    return () => document.removeEventListener('pointerdown', onOutside);
  }, []);

  const showAll = () => {
    setOpen(false);
    navigate(`/products${term ? `?name=${encodeURIComponent(term)}` : ''}`);
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      if (products.length) {
        const step = event.key === 'ArrowDown' ? 1 : -1;
        setActiveIndex((index) => (index + step + products.length) % products.length);
      }
    }
    if (event.key === 'Enter' && open && activeIndex >= 0 && products[activeIndex]) {
      event.preventDefault();
      setOpen(false);
      navigate(`/product/${getId(products[activeIndex])}`);
    }
  };

  return (
    <div className="search-box" ref={boxRef}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          showAll();
        }}
        className="search-form"
        role="search"
      >
        <div className="relative flex-1 min-w-0">
          <Search
            size={18}
            className="absolute right-3 top-1/2 -translate-y-1/2 muted"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => term && setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="جستجو در محصولات…"
            className="input !pr-10 !pl-9 !rounded-full"
            role="combobox"
            aria-label="جستجوی محصولات"
            aria-autocomplete="list"
            aria-expanded={Boolean(open && term)}
            aria-controls={listId}
            aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              className="search-clear"
              aria-label="پاک کردن جستجو"
              onClick={() => {
                setQuery('');
                setOpen(false);
                inputRef.current?.focus();
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>
        <button type="submit" className="btn-yellow hidden sm:block">
          جستجو
        </button>
      </form>

      {open && term && (
        <div className="search-dropdown card" aria-busy={loading}>
          <div className="search-dropdown-heading">
            <span>نتایج جستجو</span>
            {loading && (
              <LoaderCircle size={15} className="animate-spin" aria-label="در حال جستجو" />
            )}
          </div>
          <div
            id={listId}
            role="listbox"
            aria-label="نتایج جستجوی محصولات"
            className="search-results"
          >
            {loading ? (
              <div className="p-3 space-y-2" role="status" aria-label="در حال جستجو">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="skeleton h-[72px]" />
                ))}
              </div>
            ) : error ? (
              <div className="p-5 text-center text-sm">
                <p className="muted">{error}</p>
                <button
                  type="button"
                  className="btn-ghost mt-3 text-xs"
                  onClick={() => setRetry((value) => value + 1)}
                >
                  تلاش دوباره
                </button>
              </div>
            ) : products.length ? (
              products.map((product, index) => (
                <Link
                  key={getId(product)}
                  id={`${listId}-${index}`}
                  to={`/product/${getId(product)}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  className={`search-result ${index === activeIndex ? 'selected' : ''}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => setOpen(false)}
                >
                  <StorageImage
                    file={productImages(product)[0]}
                    alt={product.name}
                    className="w-14 h-14 rounded-xl object-cover shrink-0"
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold truncate">{product.name}</span>
                    <span className="block text-xs muted mt-1">{product.brand}</span>
                  </span>
                  <span className="text-xs font-black shrink-0 text-yellow">
                    {formatPrice(finalPrice(product))}
                  </span>
                </Link>
              ))
            ) : (
              <div className="p-7 text-center text-sm muted">محصولی با این نام پیدا نشد.</div>
            )}
          </div>
          <button type="button" className="search-all" onClick={showAll}>
            مشاهده همه نتایج <ArrowLeft size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
