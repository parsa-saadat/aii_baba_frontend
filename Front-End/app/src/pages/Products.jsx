import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, X, ChevronDown } from 'lucide-react';
import ProductGrid from '../components/ProductGrid';
import { fetchCategories, buildCategoryTree } from '../utils/helpers/categories';
import { getBody, getList } from '../utils/helpers/response';
import { finalPrice, toFa } from '../utils/helpers/format';

const API = import.meta.env.VITE_APP_API_URL || 'http://localhost:3000';
const FILTER_KEYS = [
  'name',
  'category_id',
  'brand',
  'min_price',
  'max_price',
  'discount',
  'warranty',
  'stock_status',
  'min_production',
  'max_production',
  'desc',
];
const SORTS = [
  { value: '', label: 'جدیدترین' },
  { value: 'cheap', label: 'ارزان‌ترین' },
  { value: 'expensive', label: 'گران‌ترین' },
  { value: 'discount', label: 'بیشترین تخفیف' },
  { value: 'sold', label: 'پرفروش‌ترین' },
];

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.toString();
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [expandedCatIds, setExpandedCatIds] = useState({});
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState('');
  const filters = Object.fromEntries(FILTER_KEYS.map((key) => [key, searchParams.get(key) || '']));

  const setFilter = (patch) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      Object.entries(patch).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
      next.delete('page');
      return next;
    });
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchCategories(controller.signal)
      .then(setCategories)
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setCategoriesLoading(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams(search);
    params.set('page', String(page));
    params.set('limit', '20');
    setLoading(true);
    setError('');
    axios
      .get(`${API}/product?${params}`, { signal: controller.signal, timeout: 15000 })
      .then((response) => {
        if (response.data?.success === false) throw new Error(response.data.message);
        setProducts(getList(response));
        setTotal(Number(getBody(response)?.total) || 0);
        setTotalPages(Math.max(1, Number(getBody(response)?.totalPages) || 1));
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('دریافت محصولات ناموفق بود. اتصال به بک‌اند را بررسی کنید.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [search, page, retry]);

  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);
  const brands = useMemo(() => [...new Set(products.map((product) => product.brand).filter(Boolean))], [products]);
  const visible = useMemo(() => {
    const list = [...products];
    switch (sort) {
      case 'cheap':
        return list.sort((a, b) => finalPrice(a) - finalPrice(b));
      case 'expensive':
        return list.sort((a, b) => finalPrice(b) - finalPrice(a));
      case 'discount':
        return list.sort((a, b) => (b.discount?.percentage ?? 0) - (a.discount?.percentage ?? 0));
      case 'sold':
        return list.sort((a, b) => (b.sold_count ?? 0) - (a.sold_count ?? 0));
      default:
        return list;
    }
  }, [products, sort]);
  const activeCategory = categories.find((category) => category._id === filters.category_id);

  const renderCategoryFilter = (node, depth = 0) => {
    const hasChildren = (node.children || []).length > 0;
    const isExpanded = Boolean(expandedCatIds[node._id]);
    const isSelected = filters.category_id === node._id;

    return (
      <div key={node._id} className={depth > 0 ? 'pr-3 mr-2 border-r border-theme' : ''}>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setFilter({ category_id: isSelected ? '' : node._id });
              if (hasChildren) {
                setExpandedCatIds((prev) => ({ ...prev, [node._id]: !prev[node._id] }));
              }
            }}
            className={`flex-1 text-right px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors ${
              isSelected ? 'bg-[#ffd60a] text-[#0a1736] font-black' : 'hover:bg-white/5'
            }`}
          >
            <span className="truncate">{node.name}</span>
            {hasChildren && (
              <ChevronDown
                size={13}
                className={`shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              />
            )}
          </button>
        </div>
        {hasChildren && isExpanded && (
          <div className="space-y-0.5 mt-0.5">{node.children.map((c) => renderCategoryFilter(c, depth + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="min-h-16">
          {categoriesLoading && filters.category_id ? (
            <div className="skeleton h-8 w-44" />
          ) : (
            <h1 className="font-black text-2xl">
              {activeCategory?.name || (filters.name ? `نتایج «${filters.name}»` : 'همه محصولات')}
            </h1>
          )}
          <p className="text-sm muted mt-2" aria-live="polite">
            {loading ? 'در حال دریافت کالاها…' : `${toFa(total)} کالا`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-ghost lg:hidden flex items-center gap-2"
            onClick={() => setFiltersOpen((value) => !value)}
          >
            <Filter size={15} /> فیلترها
          </button>
          <select
            className="input !w-auto"
            aria-label="مرتب‌سازی محصولات"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-5 items-start">
        <aside className={`${filtersOpen ? 'block' : 'hidden'} lg:block card rounded-2xl p-4 space-y-4 lg:sticky lg:top-36`}>
          <div className="flex items-center justify-between">
            <b className="flex items-center gap-2">
              <Filter size={15} /> فیلترها
            </b>
            <button type="button" onClick={() => setSearchParams({})} className="text-xs muted flex items-center gap-1">
              <X size={13} /> حذف همه
            </button>
          </div>
          <label className="block text-xs muted">
            جستجو در نام
            <input
              className="input mt-1.5"
              placeholder="نام محصول…"
              value={filters.name}
              onChange={(event) => setFilter({ name: event.target.value })}
            />
          </label>

          <div>
            <span className="text-xs muted block mb-1.5">دسته‌بندی</span>
            <div className="max-h-56 overflow-y-auto space-y-0.5 rounded-xl border border-theme p-1.5">
              <button
                type="button"
                onClick={() => setFilter({ category_id: '' })}
                className={`w-full text-right px-2.5 py-1.5 rounded-lg text-xs ${
                  !filters.category_id ? 'bg-[#ffd60a] text-[#0a1736] font-black' : 'hover:bg-white/5'
                }`}
              >
                همه دسته‌ها
              </button>
              {categoryTree.map((root) => renderCategoryFilter(root, 0))}
            </div>
          </div>

          <label className="block text-xs muted">
            برند
            <input
              className="input mt-1.5"
              list="brand-options"
              value={filters.brand}
              onChange={(event) => setFilter({ brand: event.target.value })}
            />
            <datalist id="brand-options">
              {brands.map((brand) => (
                <option key={brand} value={brand} />
              ))}
            </datalist>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs muted">
              از (ریال)
              <input
                className="input mt-1.5"
                type="number"
                min={0}
                value={filters.min_price}
                onChange={(event) => setFilter({ min_price: event.target.value })}
              />
            </label>
            <label className="text-xs muted">
              تا (ریال)
              <input
                className="input mt-1.5"
                type="number"
                min={0}
                value={filters.max_price}
                onChange={(event) => setFilter({ max_price: event.target.value })}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs muted">
              سال تولید از
              <input
                className="input mt-1.5"
                type="number"
                value={filters.min_production}
                onChange={(event) => setFilter({ min_production: event.target.value })}
              />
            </label>
            <label className="text-xs muted">
              تا
              <input
                className="input mt-1.5"
                type="number"
                value={filters.max_production}
                onChange={(event) => setFilter({ max_production: event.target.value })}
              />
            </label>
          </div>
          <div className="space-y-2 pt-1 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.discount === 'true'}
                onChange={(event) => setFilter({ discount: event.target.checked ? 'true' : '' })}
              />{' '}
              فقط تخفیف‌دار
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.warranty === 'true'}
                onChange={(event) => setFilter({ warranty: event.target.checked ? 'true' : '' })}
              />{' '}
              دارای گارانتی
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={filters.stock_status === 'IN_STOCK'}
                onChange={(event) => setFilter({ stock_status: event.target.checked ? 'IN_STOCK' : '' })}
              />{' '}
              فقط کالای موجود
            </label>
          </div>
        </aside>

        <div className="min-w-0">
          {error && (
            <div className="card rounded-2xl p-4 mb-4 flex items-center justify-between gap-3 text-sm" role="alert">
              <span>{error}</span>
              <button
                type="button"
                className="btn-ghost !py-2 text-xs shrink-0"
                onClick={() => setRetry((value) => value + 1)}
              >
                تلاش دوباره
              </button>
            </div>
          )}
          <ProductGrid products={visible} loading={loading} columns={4} skeletonCount={20} emptyTitle="محصولی با این فیلترها یافت نشد" />
          {!loading && totalPages > 1 && (
            <nav className="flex justify-center gap-2 mt-6 flex-wrap" aria-label="صفحات محصولات">
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => (
                <button
                  type="button"
                  key={number}
                  disabled={loading}
                  onClick={() =>
                    setSearchParams((previous) => {
                      const next = new URLSearchParams(previous);
                      next.set('page', String(number));
                      return next;
                    })
                  }
                  aria-current={number === page ? 'page' : undefined}
                  className={`chip ${number === page ? 'on' : ''}`}
                >
                  {toFa(number)}
                </button>
              ))}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
