import axios from 'axios';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { GitCompareArrows, Trash2, ShoppingCart, X } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { authHeaders } from '../utils/helpers/storage';
import StorageImage from '../components/StorageImage';
import {
  formatPrice,
  finalPrice,
  toFa,
  productImages,
  hasDiscount,
  formatDimensions,
  formatWeight,
} from '../utils/helpers/format';

const API = (import.meta.env.VITE_APP_API_URL || 'http://localhost:3000');

const ROWS = [
  ['قیمت نهایی', (p) => formatPrice(finalPrice(p))],
  ['قیمت اصلی', (p) => formatPrice(p.price?.amount)],
  ['تخفیف', (p) => (hasDiscount(p) ? `${toFa(p.discount.percentage)}٪` : '—')],
  ['برند', (p) => p.brand || '—'],
  ['سال تولید', (p) => toFa(p.production)],
  ['گارانتی', (p) => (p.warranty ? 'دارد' : 'ندارد')],
  ['موجودی', (p) => `${toFa(p.stock)} عدد`],
  ['ابعاد', (p) => formatDimensions(p.dimensions)],
  ['وزن', (p) => formatWeight(p.weight)],
];

export default function Compare() {
  const { compare, toggleCompare, clearCompare, user, refreshCart } = useShop();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!compare.length) {
      setProducts([]);
      setLoading(false);
      return;
    }
    Promise.all(
      compare.map((id) =>
        axios
          .get(`${API}/product/${id}`)
          .then((r) => r.data.body)
          .catch(() => null),
      ),
    )
      .then((list) => setProducts(list.filter(Boolean)))
      .finally(() => setLoading(false));
  }, [compare]);

  const addToCart = (id) => {
    if (!user) return toast.error('ابتدا وارد شوید');
    axios
      .post(`${API}/user/${user._id}/cart`, { product_id: id, quantity: 1 }, authHeaders())
      .then(() => {
        toast.success('به سبد اضافه شد');
        refreshCart();
      })
      .catch((err) => toast.error(err.response?.data?.message || 'خطا'));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <h1 className="font-black text-2xl flex items-center gap-2">
          <GitCompareArrows size={24} className="text-yellow" /> مقایسه محصولات
        </h1>
        {compare.length > 0 && (
          <button
            onClick={clearCompare}
            className="btn-ghost !py-2 text-sm flex items-center gap-1"
          >
            <Trash2 size={15} /> پاک کردن همه
          </button>
        )}
      </div>

      {loading ? (
        <div className="muted text-center py-20">در حال بارگذاری…</div>
      ) : products.length < 2 ? (
        <div className="card rounded-3xl p-12 text-center">
          <GitCompareArrows size={36} className="mx-auto muted mb-3" />
          <div className="font-black">برای مقایسه حداقل ۲ محصول انتخاب کنید</div>
          <Link to="/products" className="btn-yellow inline-block mt-4">
            انتخاب محصول
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto card rounded-3xl">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr>
                <th className="p-4 text-right muted w-32 align-bottom">ویژگی</th>
                {products.map((p) => (
                  <th key={p._id} className="p-4 align-top relative">
                    <button
                      onClick={() => toggleCompare(p._id)}
                      className="absolute top-2 left-2 muted hover:text-red-400"
                    >
                      <X size={15} />
                    </button>
                    <Link to={`/product/${p._id}`} className="block">
                      <StorageImage
                        file={productImages(p)[0]}
                        alt={p.name}
                        className="w-32 h-32 object-cover rounded-2xl mx-auto"
                      />
                      <div className="font-bold mt-2 line-clamp-2 text-xs">{p.name}</div>
                    </Link>
                    <button
                      onClick={() => addToCart(p._id)}
                      className="btn-yellow !py-1.5 !px-3 mt-2 text-xs inline-flex items-center gap-1"
                    >
                      <ShoppingCart size={13} /> افزودن به سبد
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([label, render]) => (
                <tr key={label} className="border-t border-theme">
                  <td className="p-4 font-bold muted text-xs">{label}</td>
                  {products.map((p) => (
                    <td key={p._id} className="p-4 text-center">
                      {render(p)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
