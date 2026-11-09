import axios from 'axios';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronDown, Grid3x3, Search, FolderTree } from 'lucide-react';
import StorageImage from './StorageImage';
import { Loading } from './Loading';
import { getList, getId } from '../utils/helpers/response';
import { buildCategoryTree } from '../utils/helpers/categories';
import { formatPrice, finalPrice, hasDiscount, productImages, toFa } from '../utils/helpers/format';

const API = import.meta.env.VITE_APP_API_URL || 'http://localhost:3000';

// مگامنو: سردسته‌ها در ریل راست قرار دارند؛ با کلیک روی هر سردسته دارای زیردسته،
// زیردسته‌های آن زیر همان سردسته باز می‌شوند (و نمونه محصولات در پنل سمت چپ نمایش داده می‌شوند).
export default function MegaMenu({ categories = [], loading = false, error = '', onRetry }) {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState('');
  const [expandedIds, setExpandedIds] = useState({});
  const [query, setQuery] = useState('');
  const [samples, setSamples] = useState([]);
  const [samplesLoading, setSamplesLoading] = useState(true);
  const [samplesError, setSamplesError] = useState('');
  const [retry, setRetry] = useState(0);
  const boxRef = useRef(null);
  const panelId = useId();

  useEffect(() => {
    const onOutside = (event) => {
      if (!boxRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const tree = useMemo(() => buildCategoryTree(categories), [categories]);
  const normalizedQuery = query.trim().toLowerCase();

  // اگر جستجو وارد شود، سر‌دسته‌هایی که خودشان یا فرزندانشان با جستجو تطابق دارند نگه می‌داریم
  const visibleTree = useMemo(() => {
    if (!normalizedQuery) return tree;
    const filterNode = (node) => {
      const selfMatch = node.name?.toLowerCase().includes(normalizedQuery);
      const matchedChildren = (node.children || []).map(filterNode).filter(Boolean);
      if (selfMatch || matchedChildren.length) {
        return {
          ...node,
          children: matchedChildren.length ? matchedChildren : node.children,
          _autoExpand: matchedChildren.length > 0,
        };
      }
      return null;
    };
    return tree.map(filterNode).filter(Boolean);
  }, [tree, normalizedQuery]);

  const active =
    categories.find((category) => category._id === activeId) ||
    visibleTree[0] ||
    categories[0] ||
    null;
  const selectedId = getId(active);
  const activeChildren = useMemo(
    () => categories.filter((category) => category.parent_id === selectedId),
    [categories, selectedId],
  );

  useEffect(() => {
    if (!open || !selectedId) return;
    const controller = new AbortController();
    setSamplesLoading(true);
    setSamplesError('');
    setSamples([]);
    const timer = window.setTimeout(() => {
      axios
        .get(`${API}/product`, {
          params: { category_id: selectedId, limit: 4, page: 1 },
          signal: controller.signal,
          timeout: 12000,
        })
        .then((response) => {
          if (response.data?.success === false) throw new Error(response.data.message);
          setSamples(getList(response));
        })
        .catch((err) => {
          if (!axios.isCancel(err)) setSamplesError('دریافت نمونه محصولات ناموفق بود.');
        })
        .finally(() => {
          if (!controller.signal.aborted) setSamplesLoading(false);
        });
    }, 120);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, selectedId, retry]);

  const toggleOpen = () => {
    setOpen((value) => !value);
    if (!categories.length && !loading) onRetry?.();
  };

  const handleParentClick = (node) => {
    setActiveId(node._id);
    if (node.children?.length) {
      setExpandedIds((prev) => ({ ...prev, [node._id]: !prev[node._id] }));
    }
  };

  const renderBranch = (node, depth = 0) => {
    const hasChildren = (node.children || []).length > 0;
    const isExpanded = Boolean(expandedIds[node._id] || node._autoExpand);
    const isActive = selectedId === node._id;

    return (
      <div key={node._id} className={depth > 0 ? 'pr-3 mr-2 border-r border-theme' : ''}>
        <button
          type="button"
          onClick={() => handleParentClick(node)}
          onMouseEnter={() => setActiveId(node._id)}
          aria-expanded={hasChildren ? isExpanded : undefined}
          aria-pressed={isActive}
          className={`mega-category ${isActive ? 'active' : ''}`}
        >
          <span className="truncate font-medium">{node.name}</span>
          {hasChildren ? (
            <ChevronDown
              size={14}
              className={`shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            />
          ) : (
            <ChevronLeft size={13} className="shrink-0 opacity-60" />
          )}
        </button>

        {hasChildren && isExpanded && (
          <div className="space-y-0.5 py-1">
            {node.children.map((child) => renderBranch(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mega-menu shrink-0" ref={boxRef}>
      <button
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        aria-controls={panelId}
        className={`chip flex items-center gap-2 font-bold ${open ? 'on' : ''}`}
      >
        <Grid3x3 size={16} /> همه محصولات
        <ChevronLeft size={14} className={`transition-transform ${open ? '-rotate-90' : ''}`} />
      </button>

      {open && (
        <div id={panelId} className="mega-menu-panel card" aria-label="دسته‌بندی محصولات">
          {loading ? (
            <div className="mega-menu-message">
              <Loading label="در حال دریافت دسته‌بندی‌ها…" />
            </div>
          ) : error ? (
            <div className="mega-menu-message">
              <p className="muted text-sm">{error}</p>
              <button type="button" className="btn-ghost mt-3 text-sm" onClick={onRetry}>
                تلاش دوباره
              </button>
            </div>
          ) : !categories.length ? (
            <div className="mega-menu-message">
              <FolderTree size={28} className="muted mb-3" />
              <p className="muted text-sm">هنوز دسته‌بندی‌ای ثبت نشده است.</p>
            </div>
          ) : (
            <div className="mega-menu-grid">
              <aside className="mega-menu-rail">
                <div className="p-3 relative">
                  <Search size={14} className="absolute right-6 top-1/2 -translate-y-1/2 muted" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="جستجوی دسته…"
                    aria-label="جستجوی دسته‌بندی"
                    className="input !py-2 !pr-9 text-sm"
                  />
                </div>
                <div className="mega-menu-category-list space-y-0.5">
                  <Link
                    to="/products"
                    onClick={() => setOpen(false)}
                    className="mega-category font-bold"
                  >
                    همه کالاها <ChevronLeft size={13} />
                  </Link>
                  {visibleTree.map((root) => renderBranch(root, 0))}
                  {!visibleTree.length && (
                    <p className="text-xs muted text-center py-6">دسته‌ای پیدا نشد.</p>
                  )}
                </div>
              </aside>

              <div className="mega-menu-content">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h3 className="font-black text-lg">{active?.name || 'دسته‌بندی‌ها'}</h3>
                  {active && (
                    <Link
                      to={`/products?category_id=${selectedId}`}
                      onClick={() => setOpen(false)}
                      className="btn-yellow !py-2 !px-3 text-xs flex items-center gap-1"
                    >
                      مشاهده دسته <ChevronLeft size={13} />
                    </Link>
                  )}
                </div>

                {activeChildren.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs muted font-bold mb-2">زیردسته‌های {active?.name}</p>
                    <div className="flex flex-wrap gap-2">
                      {activeChildren.map((child) => (
                        <Link
                          key={child._id}
                          to={`/products?category_id=${child._id}`}
                          onClick={() => setOpen(false)}
                          className="chip text-xs"
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs muted font-bold mt-5 mb-3">نمونه محصولات</p>
                <div className="mega-samples" aria-busy={samplesLoading}>
                  {samplesLoading ? (
                    Array.from({ length: 4 }, (_, index) => (
                      <div key={index} className="skeleton mega-sample-skeleton" />
                    ))
                  ) : samplesError ? (
                    <div className="col-span-full text-sm muted py-5">
                      <p>{samplesError}</p>
                      <button
                        type="button"
                        className="btn-ghost mt-2 text-xs"
                        onClick={() => setRetry((value) => value + 1)}
                      >
                        تلاش دوباره
                      </button>
                    </div>
                  ) : samples.length ? (
                    samples.map((product) => (
                      <Link
                        key={getId(product)}
                        to={`/product/${getId(product)}`}
                        onClick={() => setOpen(false)}
                        className="card2 rounded-2xl overflow-hidden block"
                      >
                        <div className="aspect-square relative">
                          <StorageImage
                            file={productImages(product)[0]}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                          {hasDiscount(product) && (
                            <span
                              className="absolute top-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-black"
                              style={{ background: 'var(--primary-color)', color: 'var(--navy)' }}
                            >
                              {toFa(product.discount.percentage)}٪
                            </span>
                          )}
                        </div>
                        <div className="p-2">
                          <p className="text-xs font-bold line-clamp-2 leading-5 min-h-10">
                            {product.name}
                          </p>
                          <p className="text-[11px] font-black text-yellow mt-2">
                            {formatPrice(finalPrice(product))}
                          </p>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="col-span-full text-sm muted py-6">
                      محصولی مستقیماً در این دسته ثبت نشده است.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
