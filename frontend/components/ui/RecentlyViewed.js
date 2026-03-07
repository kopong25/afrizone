import { useEffect, useState } from "react";
import Link from "next/link";
import { StarDisplay } from "./StarRating";

const MAX_ITEMS = 5;
const STORAGE_KEY = "afrizone_recently_viewed";

export function trackProductView(product) {
  if (typeof window === "undefined") return;
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const filtered = stored.filter((p) => p.id !== product.id);
    const updated = [{ id: product.id, name: product.name, slug: product.slug, price: product.price, images: product.images, avg_rating: product.avg_rating, store: product.store }, ...filtered].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

export function getRecentlyViewed() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch { return []; }
}

export default function RecentlyViewed({ currentProductId }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const all = getRecentlyViewed();
    setItems(all.filter((p) => p.id !== currentProductId));
  }, [currentProductId]);

  if (items.length === 0) return null;

  return (
    <div className="mt-12 border-t pt-10">
      <h2 className="text-xl font-black text-gray-900 mb-5">🕐 Recently Viewed</h2>
      <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
        {items.map((product) => (
          <Link key={product.id} href={`/products/${product.slug}`}
            className="flex-shrink-0 w-44 bg-white rounded-xl border hover:shadow-md transition-shadow group">
            <div className="aspect-square bg-gray-100 rounded-t-xl overflow-hidden">
              {product.images?.[0]
                ? <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                : <div className="w-full h-full flex items-center justify-center text-4xl">🛒</div>
              }
            </div>
            <div className="p-3">
              <p className="text-xs text-gray-400 truncate mb-0.5">{product.store?.name}</p>
              <p className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug">{product.name}</p>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-sm font-black text-green-900">${Number(product.price).toFixed(2)}</span>
                {product.avg_rating > 0 && <StarDisplay rating={product.avg_rating} size={10} />}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}