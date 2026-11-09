import { PackageSearch } from 'lucide-react';
import ProductCard from './ProductCard';
import { Loading } from './Loading';
import { getId } from '../utils/helpers/response';

export default function ProductGrid({
  products = [],
  loading = false,
  emptyTitle = 'محصولی یافت نشد',
  columns = 4,
  skeletonCount,
}) {
  const gridClass =
    columns === 3
      ? 'grid-cols-2 md:grid-cols-3'
      : columns === 5
        ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
        : 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4';

  if (loading && !products.length) {
    return (
      <div
        className={`grid ${gridClass} gap-3`}
        aria-busy="true"
        aria-label="در حال بارگذاری محصولات"
      >
        {Array.from({ length: skeletonCount || columns * 2 }, (_, index) => (
          <div key={index} className="card rounded-2xl overflow-hidden" aria-hidden="true">
            <div className="skeleton aspect-square !rounded-none" />
            <div className="p-3 space-y-3">
              <div className="skeleton h-4" />
              <div className="skeleton h-4 w-2/3" />
              <div className="skeleton h-6 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="card rounded-3xl p-12 text-center min-h-52">
        <PackageSearch size={36} className="mx-auto muted mb-3" />
        <div className="font-black">{emptyTitle}</div>
      </div>
    );
  }

  return (
    <div className="relative" aria-busy={loading}>
      <div
        className={`grid ${gridClass} gap-3 transition-opacity duration-150 ${loading ? 'opacity-35 pointer-events-none' : ''}`}
        inert={loading ? true : undefined}
      >
        {products.map((product) => (
          <ProductCard key={getId(product)} product={product} />
        ))}
      </div>
      {loading && (
        <div className="absolute inset-0 flex justify-center items-start pt-16">
          <Loading
            label="در حال به‌روزرسانی محصولات…"
            className="card rounded-full px-5 py-3 shadow-xl sticky top-44"
          />
        </div>
      )}
    </div>
  );
}
