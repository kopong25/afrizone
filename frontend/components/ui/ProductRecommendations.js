import { useState, useEffect } from "react";
import Link from "next/link";
import ProductCard from "./ProductCard";
import { productsAPI } from "../../lib/api";

export default function ProductRecommendations({ product }) {
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    if (!product) return;
    // Fetch products from same category, excluding current
    productsAPI.list({
      category: product.category_id,
      size: 5,
      exclude: product.id,
    }).then((r) => {
      const items = r.data?.items || r.data || [];
      // Filter out current product and limit to 4
      setRecommendations(items.filter((p) => p.id !== product.id).slice(0, 4));
    }).catch(() => {});
  }, [product]);

  if (recommendations.length === 0) return null;

  return (
    <div className="mt-12 border-t pt-10">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-black text-gray-900">✨ You Might Also Like</h2>
        {product.category_id && (
          <Link href={`/?category=${product.category_id}`} className="text-sm text-green-700 hover:underline font-medium">
            See all →
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {recommendations.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}