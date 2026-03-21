import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { storesAPI } from "../lib/api";
import { FiSearch, FiMapPin, FiStar, FiPackage } from "react-icons/fi";

const COUNTRIES = ["All", "USA", "Canada", "UK", "Germany", "France"];
const CATEGORIES = ["All", "Restaurants", "Food & Groceries", "Fashion", "Beauty & Hair", "Arts & Crafts", "Electronics", "Books & Media", "Health & Wellness", "Home & Living"];

function StoreCard({ store }) {
  return (
    <Link href={`/stores/${store.slug}`}
      className="bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all overflow-hidden group">
      {/* Banner */}
      <div className="h-28 bg-green-900 relative overflow-hidden">
        {store.banner_url && (
          <img src={store.banner_url} alt="" className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-300" />
        )}
        {/* Logo */}
        <div className="absolute bottom-3 left-4">
          {store.logo_url ? (
            <img src={store.logo_url} alt={store.name}
              className="w-14 h-14 rounded-full border-2 border-white object-cover shadow-md" />
          ) : (
            <div className="w-14 h-14 rounded-full border-2 border-white bg-yellow-400 flex items-center justify-center font-black text-green-900 text-xl shadow-md">
              {store.name[0]}
            </div>
          )}
        </div>
        {store.status === "approved" && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            ✓ Verified
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 pt-3">
        <h3 className="font-bold text-gray-900">{store.name}</h3>
        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
          <FiMapPin size={10} /> {store.city ? `${store.city}, ${store.country}` : store.country}
        </p>
        {store.description && (
          <p className="text-xs text-gray-500 mt-2 line-clamp-2">{store.description}</p>
        )}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1">
            <FiStar size={12} className="text-yellow-400 fill-current" />
            <span className="text-sm font-semibold text-gray-700">{store.avg_rating?.toFixed(1) || "New"}</span>
            {store.review_count > 0 && <span className="text-xs text-gray-400">({store.review_count})</span>}
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <FiPackage size={11} />
            <span>{store.total_sales || 0} sales</span>
          </div>
        </div>
        {store.business_type && (
          <span className="inline-block mt-2 text-xs bg-green-50 text-green-800 px-2 py-0.5 rounded-full">
            {store.business_type}
          </span>
        )}
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border overflow-hidden animate-pulse">
      <div className="h-28 bg-gray-200" />
      <div className="p-4 space-y-2">
        <div className="h-5 bg-gray-200 rounded w-2/3" />
        <div className="h-3 bg-gray-200 rounded w-1/3" />
        <div className="h-3 bg-gray-200 rounded w-full" />
      </div>
    </div>
  );
}

export default function StoresPage() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("All");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    storesAPI.list({ limit: 50 })
      .then((r) => setStores(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = stores.filter((s) => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description?.toLowerCase().includes(search.toLowerCase());
    const matchCountry = country === "All" || s.country === country;
    const matchCategory = category === "All" || s.business_type === category;
    return matchSearch && matchCountry && matchCategory;
  });

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black text-gray-900 mb-2">🏪 African Stores</h1>
          <p className="text-gray-500 max-w-xl mx-auto">
            Discover verified African businesses across the USA, Canada & Europe. 
            Every store is run by an African entrepreneur.
          </p>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-2xl border p-4 mb-8 flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="Search stores..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-900" />
          </div>
          <select value={country} onChange={(e) => setCountry(e.target.value)}
            className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-900">
            {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-900">
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        {/* Results count */}
        <p className="text-sm text-gray-500 mb-4">
          <span className="font-bold text-gray-800">{filtered.length}</span> stores found
        </p>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🏪</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">No stores found</h2>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((store) => <StoreCard key={store.id} store={store} />)}
          </div>
        )}

        {/* Sell CTA */}
        <div className="mt-16 bg-gradient-to-r from-green-900 to-green-800 rounded-2xl p-8 text-white text-center">
          <h2 className="text-2xl font-black mb-2">Own an African Business?</h2>
          <p className="text-green-200 mb-5">Join hundreds of African entrepreneurs already selling on Afrizone.</p>
          <Link href="/register?role=seller"
            className="bg-yellow-500 hover:bg-yellow-400 text-green-900 font-bold px-8 py-3 rounded-xl inline-block transition-colors">
            Open Your Store Free →
          </Link>
        </div>
      </div>
      <Footer />
    </>
  );
}
