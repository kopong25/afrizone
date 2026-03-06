import Link from "next/link";
import { FiStar, FiShoppingCart } from "react-icons/fi";
import { ordersAPI } from "../../lib/api";
import toast from "react-hot-toast";
import { useAuth } from "../../pages/_app";

function StarRating({ rating, count }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <FiStar
          key={i}
          size={12}
          className={i <= Math.round(rating) ? "star-filled fill-current" : "star-empty"}
        />
      ))}
      {count > 0 && <span className="text-xs text-gray-500 ml-1">({count})</span>}
    </div>
  );
}

export default function ProductCard({ product }) {
  const { user } = useAuth();
  const discount = product.compare_price
    ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100)
    : 0;

  const handleAddToCart = async (e) => {
    e.preventDefault();
    if (!user) {
      window.location.href = "/login";
      return;
    }
    try {
      await ordersAPI.addToCart({ product_id: product.id, quantity: 1 });
      toast.success("Added to cart!");
    } catch {
      toast.error("Failed to add to cart");
    }
  };

  return (
    <Link href={`/products/${product.slug}`} className="product-card group block">
      {/* Image */}
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🛒</div>
        )}
        {discount > 0 && (
          <span className="absolute top-2 left-2 badge bg-red-500 text-white">-{discount}%</span>
        )}
        {product.country_of_origin && (
          <span className="absolute top-2 right-2 badge bg-green-900 text-white text-xs">
            🌍 {product.country_of_origin}
          </span>
        )}
        {/* Quick add to cart */}
        <button
          onClick={handleAddToCart}
          className="absolute bottom-2 right-2 bg-green-900 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-green-800"
          title="Add to cart"
        >
          <FiShoppingCart size={16} />
        </button>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-sm font-medium text-gray-800 line-clamp-2 mb-1 group-hover:text-green-900">
          {product.name}
        </h3>
        <StarRating rating={product.avg_rating} count={product.review_count} />
        <div className="flex items-baseline gap-2 mt-1.5">
          <span className="font-bold text-green-900">
            ${product.price.toFixed(2)}
          </span>
          {product.compare_price && (
            <span className="text-xs text-gray-400 line-through">
              ${product.compare_price.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
