import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import ProductCard from "../../components/ui/ProductCard";
import { storesAPI } from "../../lib/api";
import { FiMapPin, FiStar, FiPackage, FiGlobe, FiPhone } from "react-icons/fi";

export default function StorePage() {
  const router = useRouter();
  const { slug } = router.query;
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    storesAPI.get(slug)
      .then((storeRes) => {
        const s = storeRes.data;
        setStore(s);
        return storesAPI.getProducts(s.id);
      })
      .then((productsRes) => {
        setProducts(productsRes.data?.items || productsRes.data || []);
      })
      .catch(() => router.push("/stores"))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-48 bg-gray-200 rounded-2xl mb-4" />
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
      </div>
    </>
  );

  if (!store) return null;

  return (
    <>
      <Navbar />
      {/* Banner */}
      <div className="h-48 md:h-64 bg-green-900 relative overflow-hidden">
        {store.banner_url && (
          <img src={store.banner_url} alt="" className="w-full h-full object-cover opacity-60" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

      <div className="max-w-6xl mx-auto px-4">
        {/* Store header */}
        <div className="bg-white rounded-2xl shadow-sm border -mt-16 relative z-10 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-5 items-start">
            {store.logo_url ? (
              <img src={store.logo_url} alt={store.name}
                className="w-20 h-20 rounded-2xl border-4 border-white shadow-md object-cover flex-shrink-0" />
            ) : (
              <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-md bg-yellow-400 flex items-center justify-center font-black text-green-900 text-3xl flex-shrink-0">
                {store.name[0]}
              </div>
            )}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 className="text-2xl font-black text-gray-900">{store.name}</h1>
                {store.status === "approved" && (
                  <span className="bg-green-100 text-green-800 text-xs font-bold px-2.5 py-0.5 rounded-full">✓ Verified</span>
                )}
                {store.tier && store.tier !== "basic" && (
                  <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2.5 py-0.5 rounded-full capitalize">⭐ {store.tier}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-3">
                {(store.city || store.country) && (
                  <span className="flex items-center gap-1"><FiMapPin size={13} /> {store.city ? `${store.city}, ` : ""}{store.country}</span>
                )}
                {store.avg_rating > 0 && (
                  <span className="flex items-center gap-1"><FiStar size={13} className="text-yellow-400" /> {store.avg_rating.toFixed(1)} ({store.review_count} reviews)</span>
                )}
                {store.total_sales > 0 && (
                  <span className="flex items-center gap-1"><FiPackage size={13} /> {store.total_sales} sales</span>
                )}
                {store.website && (
                  <a href={store.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-green-700 hover:underline">
                    <FiGlobe size={13} /> Website
                  </a>
                )}
              </div>
              {store.description && <p className="text-gray-600 text-sm max-w-2xl">{store.description}</p>}
            </div>
          </div>
        </div>

        {/* Products */}
        <div className="pb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-5">
            Products <span className="text-gray-400 font-normal">({products.length})</span>
          </h2>
          {products.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border">
              <div className="text-5xl mb-3">📦</div>
              <p className="text-gray-500">No products listed yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}