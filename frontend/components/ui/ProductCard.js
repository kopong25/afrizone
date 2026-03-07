import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/router";
import { ordersAPI } from "../../lib/api";
import { useAuth } from "../../pages/_app";
import toast from "react-hot-toast";
import { FiHeart, FiShoppingCart, FiStar } from "react-icons/fi";

export default function ProductCard({ product, wishlisted, onWishlist }) {
  const { user } = useAuth();
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  const discount = product.compare_price
    ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100)
    : 0;

  const addToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { router.push("/login"); return; }
    setAdding(true);
    try {
      await ordersAPI.addToCart({ product_id: product.id, quantity: 1 });
      toast.success(`Added to cart!`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to add to cart");
    } finally {
      setAdding(false);
    }
  };

  return (
    <Link href={`/products/${product.slug}`} className="product-card group block">
      <div className="relative aspect-square bg-gray-100 overflow-hidden rounded-t-xl">
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">🛒</div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {discount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              -{discount}%
            </span>
          )}
          {product.is_featured && (
            <span className="bg-yellow-400 text-green-900 text-xs font-bold px-2 py-0.5 rounded-full">
              ⭐ Featured
            </span>
          )}
          {product.stock === 0 && (
            <span className="bg-gray-800 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              Out of Stock
            </span>
          )}
        </div>

        {/* Wishlist button */}
        {onWishlist && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onWishlist(); }}
            className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center hover:scale-110 transition-transform opacity-0 group-hover:opacity-100"
          >
            <FiHeart size={14} className={wishlisted ? "fill-red-500 text-red-500" : "text-gray-400"} />
          </button>
        )}

        {/* Quick add to cart */}
        <button
          onClick={addToCart}
          disabled={adding || product.stock === 0}
          className="absolute bottom-2 left-2 right-2 bg-green-900 hover:bg-green-800 text-white text-xs font-semibold py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <FiShoppingCart size={12} />
          {adding ? "Adding..." : "Quick Add"}
        </button>
      </div>

      <div className="p-3">
        {/* Store name */}
        {product.store?.name && (
          <p className="text-xs text-gray-400 mb-0.5 truncate">{product.store.name}</p>
        )}

        {/* Product name */}
        <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug mb-1">
          {product.name}
        </h3>

        {/* Rating */}
        {product.review_count > 0 && (
          <div className="flex items-center gap-1 mb-1.5">
            <div className="flex">
              {[1,2,3,4,5].map((i) => (
                <FiStar key={i} size={10} className={i <= Math.round(product.avg_rating) ? "text-yellow-400 fill-current" : "text-gray-300"} />
              ))}
            </div>
            <span className="text-xs text-gray-400">({product.review_count})</span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-base font-black text-green-900">${product.price.toFixed(2)}</span>
          {product.compare_price && (
            <span className="text-xs text-gray-400 line-through">${product.compare_price.toFixed(2)}</span>
          )}
        </div>

        {/* Origin */}
        {product.country_of_origin && (
          <p className="text-xs text-gray-400 mt-1">🌍 {product.country_of_origin}</p>
        )}
      </div>
    </Link>
  );
}
