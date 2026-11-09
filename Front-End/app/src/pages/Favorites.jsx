import axios from 'axios';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import ProductGrid from '../components/ProductGrid';
import { useShop } from '../context/ShopContext';
import { toFa } from '../utils/helpers/format';

export default function Favorites() {
  const { favorites } = useShop();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!favorites.length) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all(
      favorites.map((id) =>
        axios
          .get(`${(import.meta.env.VITE_APP_API_URL || 'http://localhost:3000')}/product/${id}`)
          .then((r) => r.data.body)
          .catch(() => null),
      ),
    )
      .then((list) => setProducts(list.filter(Boolean)))
      .finally(() => setLoading(false));
  }, [favorites]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="font-black text-2xl mb-5 flex items-center gap-2">
        <Heart size={24} style={{ color: '#ff4d6d' }} fill="#ff4d6d" /> علاقه‌مندی‌ها ({toFa(products.length)})
      </h1>
      {!loading && products.length === 0 ? (
        <div className="card rounded-3xl p-12 text-center">
          <Heart size={36} className="mx-auto muted mb-3" />
          <div className="font-black">لیست علاقه‌مندی خالی است</div>
          <Link to="/products" className="btn-yellow inline-block mt-4">مشاهده محصولات</Link>
        </div>
      ) : (
        <ProductGrid products={products} loading={loading} columns={4} />
      )}
    </div>
  );
}
