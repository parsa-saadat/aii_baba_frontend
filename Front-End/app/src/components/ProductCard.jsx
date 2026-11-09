import axios from 'axios';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Heart, GitCompareArrows, ShoppingCart, Store } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { authHeaders } from '../utils/helpers/storage';
import StorageImage from './StorageImage';
import { formatPrice, finalPrice, hasDiscount, productImages, toFa } from '../utils/helpers/format';

export default function ProductCard({ product }) {
  const { user, toggleFavorite, isFavorite, toggleCompare, compare, refreshCart } = useShop();
  const id = product._id;
  const fav = isFavorite(id);
  const inCompare = compare.includes(id);
  const discount = hasDiscount(product);
  const soldOut = product.stock_status === 'OUT_OF_STOCK' || product.stock === 0;

  const addToCart = () => {
    if (!user) {
      toast.error('برای افزودن به سبد ابتدا وارد شوید');
      return;
    }
    axios
      .post(
        `${(import.meta.env.VITE_APP_API_URL || 'http://localhost:3000')}/user/${user._id}/cart`,
        { product_id: id, quantity: 1 },
        authHeaders(),
      )
      .then((res) => {
        if (res.data.success) {
          toast.success('به سبد خرید اضافه شد');
          refreshCart();
        } else {
          toast.error(res.data.message);
        }
      })
      .catch((err) => toast.error(err.response?.data?.message || 'خطا در افزودن به سبد'));
  };

  return (
    <div className="card rounded-2xl overflow-hidden group hover:-translate-y-1 transition-transform flex flex-col">
      <div
        className="relative aspect-square overflow-hidden"
        style={{ background: 'var(--card2)' }}
      >
        <Link to={`/product/${id}`} className="block w-full h-full">
          <StorageImage
            file={productImages(product)[0]}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </Link>
        {discount && (
          <span
            className="absolute top-2 right-2 text-xs font-black px-2 py-1 rounded-full"
            style={{ background: 'var(--primary-color)', color: 'var(--navy)' }}
          >
            {toFa(product.discount.percentage)}٪ تخفیف
          </span>
        )}
        <div className="absolute top-2 left-2 flex flex-col gap-1.5">
          <button
            onClick={() => toggleFavorite(id)}
            className="w-8 h-8 rounded-full grid place-items-center backdrop-blur"
            style={{ background: 'rgba(6,13,36,.55)', color: fav ? '#ff4d6d' : '#fff' }}
            aria-label="افزودن به علاقه‌مندی"
          >
            <Heart size={16} fill={fav ? '#ff4d6d' : 'none'} />
          </button>
          <button
            onClick={() => toggleCompare(id)}
            className="w-8 h-8 rounded-full grid place-items-center backdrop-blur"
            style={{
              background: 'rgba(6,13,36,.55)',
              color: inCompare ? 'var(--primary-color)' : '#fff',
            }}
            aria-label="مقایسه محصول"
          >
            <GitCompareArrows size={16} />
          </button>
        </div>
        {soldOut && (
          <span className="absolute bottom-2 right-2 text-[11px] font-bold px-2 py-1 rounded-full bg-black/60 text-white">
            ناموجود
          </span>
        )}
      </div>

      <div className="p-3 flex flex-col flex-1">
        <Link
          to={`/product/${id}`}
          className="block font-bold text-sm leading-6 line-clamp-2 min-h-[3rem] hover:opacity-80"
        >
          {product.name}
        </Link>
        {product.brand && (
          <div className="mt-1 text-xs muted truncate">برند: {product.brand}</div>
        )}
        <div className="mt-auto pt-2 flex items-end justify-between gap-2">
          <div>
            {discount && (
              <div className="text-xs muted line-through">{formatPrice(product.price?.amount)}</div>
            )}
            <div className="font-black text-yellow">{formatPrice(finalPrice(product))}</div>
          </div>
          <button
            onClick={addToCart}
            disabled={soldOut}
            className="btn-yellow !p-2 !rounded-xl disabled:opacity-40"
            title="افزودن به سبد"
          >
            <ShoppingCart size={17} />
          </button>
        </div>
        {product.store_name && (
          <Link
            to={`/store/${product.store_id}`}
            className="mt-2 flex items-center gap-1 text-[11px] muted hover:opacity-80"
          >
            <Store size={12} /> {product.store_name}
          </Link>
        )}
      </div>
    </div>
  );
}
