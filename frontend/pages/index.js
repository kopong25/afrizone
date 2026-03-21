import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import ProductCard from "../components/ui/ProductCard";
import { productsAPI, storesAPI } from "../lib/api";
import { FiArrowRight, FiTrendingUp, FiStar, FiShield, FiTruck, FiPackage } from "react-icons/fi";

const CATEGORIES = [
  { name: "All", slug: "", icon: "🛒" },
  { name: "Restaurants", slug: "restaurants", icon: "🍝" },
  { name: "Food & Groceries", slug: "food-groceries", icon: "🍲" },
  { name: "Fashion", slug: "fashion", icon: "👗" },
  { name: "Beauty & Hair", slug: "beauty-hair", icon: "💄" },
  { name: "Arts & Crafts", slug: "arts-crafts", icon: "🎨" },
  { name: "Electronics", slug: "electronics", icon: "📱" },
  { name: "Books & Media", slug: "books-media", icon: "📚" },
  { name: "Health & Wellness", slug: "health-wellness", icon: "🌿" },
  { name: "Home & Living", slug: "home-living", icon: "🏠" },
];

const REGIONS = [
  { name: "Popular in North America", flag: "🇺🇸", country: "" },
  { name: "Made in Nigeria", flag: "🇳🇬", country: "Nigeria" },
  { name: "Made in Ghana", flag: "🇬🇭", country: "Ghana" },
  { name: "Made in Kenya", flag: "🇰🇪", country: "Kenya" },
  { name: "Made in Senegal", flag: "🇸🇳", country: "Senegal" },
];

const SORT_OPTIONS = [
  { label: "Newest", value: "created_at" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Top Rated", value: "rating" },
  { label: "Best Sellers", value: "popular" },
];

const ALL_COUNTRIES = ["Nigeria","Ghana","Ethiopia","Kenya","Senegal","Cameroon","South Africa","Congo","Ivory Coast","Tanzania","Chad","Sudan"];

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl overflow-hidden animate-pulse">
      <div className="aspect-square bg-gray-200" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-5 bg-gray-200 rounded w-1/3" />
      </div>
    </div>
  );
}

function EmptyState({ q, onReset }) {
  return (
    <div className="text-center py-16 px-4">
      <div className="text-7xl mb-4">🌍</div>
      <h3 className="text-2xl font-bold text-gray-800 mb-2">
        {q ? `No results for "${q}"` : "Explore New Arrivals"}
      </h3>
      <p className="text-gray-500 mb-6 max-w-md mx-auto">
        {q ? "Try a different search term or browse by category below." : "New African products are added daily by our verified sellers."}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {q && <button onClick={onReset} className="btn-primary py-2 px-6">Clear Search</button>}
        <Link href="/register?role=seller" className="btn-secondary py-2 px-6">Sell Your Products</Link>
      </div>
      {!q && (
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
          {CATEGORIES.slice(1, 5).map((cat) => (
            <Link key={cat.slug} href={`/?category=${cat.slug}`}
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all text-center border hover:border-green-900">
              <div className="text-3xl mb-2">{cat.icon}</div>
              <p className="text-xs font-medium text-gray-700 leading-tight">{cat.name}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [featuredStores, setFeaturedStores] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1 });
  const [loading, setLoading] = useState(true);
  const [wishlist, setWishlist] = useState([]);
  const [filters, setFilters] = useState({
    q: "", category: "", country_of_origin: "", min_price: "", max_price: "",
    sort: "created_at", page: 1,
  });

  useEffect(() => {
    if (router.query.q) setFilters((f) => ({ ...f, q: router.query.q }));
    if (router.query.category) setFilters((f) => ({ ...f, category: router.query.category }));
  }, [router.query]);

  useEffect(() => {
    productsAPI.list({ featured: true, size: 4 }).then((r) => setFeaturedProducts(r.data.items)).catch(() => {});
    storesAPI.list({ limit: 4 }).then((r) => setFeaturedStores(r.data)).catch(() => {});
  }, []);

  useEffect(() => { fetchProducts(); }, [filters]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = { sort: filters.sort, page: filters.page, size: 24 };
      if (filters.q) params.q = filters.q;
      if (filters.category) params.category = filters.category;
      if (filters.country_of_origin) params.country_of_origin = filters.country_of_origin;
      if (filters.min_price) params.min_price = filters.min_price;
      if (filters.max_price) params.max_price = filters.max_price;
      const res = await productsAPI.list(params);
      setProducts(res.data.items);
      setPagination({ total: res.data.total, pages: res.data.pages, page: res.data.page });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value, page: 1 }));
  const resetFilters = () => setFilters({ q: "", category: "", country_of_origin: "", min_price: "", max_price: "", sort: "created_at", page: 1 });
  const hasActiveFilters = filters.q || filters.category || filters.country_of_origin || filters.min_price || filters.max_price;
  const toggleWishlist = (id) => setWishlist((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);

  return (
    <>
      <Navbar />

      {/* Hero */}
      <div className="bg-gradient-to-br from-green-900 via-green-800 to-green-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10 w-64 h-64 bg-yellow-400 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-20 w-96 h-96 bg-green-400 rounded-full blur-3xl" />
        </div>
        <div className="max-w-5xl mx-auto px-4 py-16 text-center relative">
          <div className="inline-flex items-center gap-2 bg-white bg-opacity-10 rounded-full px-4 py-1.5 text-sm mb-6">
            <span>🌍</span>
            <span className="text-green-100">Verified sellers · USA · Canada · Europe</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-5 leading-tight">
            Shop Authentic<br />
            <span className="text-yellow-400">African Products</span>
          </h1>
          <p className="text-green-200 text-lg mb-8 max-w-2xl mx-auto">
            From African stores across the USA, Canada & Europe — food, fashion, beauty, arts & more.
          </p>
          <div className="flex max-w-2xl mx-auto gap-2 mb-8">
            <input type="text" placeholder="Search jollof rice, ankara fabric, shea butter..."
              value={filters.q} onChange={(e) => setFilter("q", e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchProducts()}
              className="flex-1 px-5 py-4 rounded-xl text-gray-900 focus:outline-none text-base shadow-lg" />
            <button onClick={fetchProducts}
              className="bg-yellow-500 hover:bg-yellow-400 text-green-900 font-bold px-6 py-4 rounded-xl shadow-lg transition-colors">
              Search
            </button>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-green-200">
            <span className="flex items-center gap-1.5"><FiShield size={14} className="text-yellow-400" /> Verified Sellers</span>
            <span className="flex items-center gap-1.5"><FiTruck size={14} className="text-yellow-400" /> USA · Canada · Europe</span>
            <span className="flex items-center gap-1.5"><FiStar size={14} className="text-yellow-400" /> 4.8★ Average Rating</span>
            <span className="flex items-center gap-1.5"><FiPackage size={14} className="text-yellow-400" /> Secure Checkout</span>
          </div>
        </div>
      </div>

      {/* Category Bar */}
      <div className="bg-white border-b sticky top-16 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {CATEGORIES.map((cat) => (
            <button key={cat.slug} onClick={() => setFilter("category", cat.slug)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                filters.category === cat.slug ? "bg-green-900 text-white shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}>
              <span>{cat.icon}</span>{cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Featured Products */}
      {!hasActiveFilters && featuredProducts.length > 0 && (
        <div className="bg-yellow-50 py-10 border-b">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-black text-green-900 flex items-center gap-2">
                  <FiTrendingUp className="text-yellow-500" /> Featured Products
                </h2>
                <p className="text-green-700 text-sm mt-0.5">Hand-picked by our team</p>
              </div>
              <button onClick={() => setFilter("sort", "popular")}
                className="text-green-900 font-semibold text-sm flex items-center gap-1 hover:underline">
                View all <FiArrowRight size={14} />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {featuredProducts.map((p) => (
                <ProductCard key={p.id} product={p} wishlisted={wishlist.includes(p.id)} onWishlist={() => toggleWishlist(p.id)} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Region Tabs */}
      {!hasActiveFilters && (
        <div className="bg-white border-b py-3">
          <div className="max-w-7xl mx-auto px-4 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {REGIONS.map((r) => (
              <button key={r.name} onClick={() => setFilter("country_of_origin", r.country)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-all border ${
                  filters.country_of_origin === r.country && r.country
                    ? "bg-green-900 text-white border-green-900"
                    : "border-gray-200 hover:border-green-900 text-gray-700"
                }`}>
                <span>{r.flag}</span>{r.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Sidebar */}
          <aside className="lg:w-60 flex-shrink-0">
            <div className="bg-white rounded-2xl p-5 shadow-sm sticky top-36 border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800">Filters</h3>
                {hasActiveFilters && <button onClick={resetFilters} className="text-xs text-red-500 hover:underline">Reset all</button>}
              </div>
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Country of Origin</label>
                  <select value={filters.country_of_origin} onChange={(e) => setFilter("country_of_origin", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-900">
                    <option value="">All Countries</option>
                    {ALL_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Price Range (USD)</label>
                  <div className="flex gap-2">
                    <input type="number" placeholder="Min" value={filters.min_price} onChange={(e) => setFilter("min_price", e.target.value)}
                      className="w-1/2 border rounded-lg px-2 py-2 text-sm focus:outline-none" />
                    <input type="number" placeholder="Max" value={filters.max_price} onChange={(e) => setFilter("max_price", e.target.value)}
                      className="w-1/2 border rounded-lg px-2 py-2 text-sm focus:outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Sort By</label>
                  <select value={filters.sort} onChange={(e) => setFilter("sort", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-900">
                    {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Categories</label>
                  <div className="space-y-0.5">
                    {CATEGORIES.slice(1).map((cat) => (
                      <button key={cat.slug} onClick={() => setFilter("category", cat.slug)}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                          filters.category === cat.slug ? "bg-green-900 text-white" : "hover:bg-gray-50 text-gray-700"
                        }`}>
                        <span>{cat.icon}</span>{cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Products Grid */}
          <main id="main-content" className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-gray-500">
                {loading ? "Loading..." : <><span className="font-bold text-gray-800">{pagination.total}</span> products found</>}
              </p>
              {hasActiveFilters && <button onClick={resetFilters} className="text-sm text-red-500 hover:underline">Clear filters</button>}
            </div>

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(12)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : products.length === 0 ? (
              <EmptyState q={filters.q} onReset={resetFilters} />
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {products.map((p) => (
                    <ProductCard key={p.id} product={p} wishlisted={wishlist.includes(p.id)} onWishlist={() => toggleWishlist(p.id)} />
                  ))}
                </div>
                {pagination.pages > 1 && (
                  <div className="flex justify-center gap-2 mt-10">
                    <button disabled={pagination.page === 1} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                      className="px-4 py-2 rounded-lg border text-sm disabled:opacity-40 hover:border-green-900">← Prev</button>
                    {[...Array(Math.min(pagination.pages, 7))].map((_, i) => (
                      <button key={i} onClick={() => setFilters((f) => ({ ...f, page: i + 1 }))}
                        className={`w-9 h-9 rounded-lg text-sm font-medium ${pagination.page === i + 1 ? "bg-green-900 text-white" : "bg-white border hover:border-green-900"}`}>
                        {i + 1}
                      </button>
                    ))}
                    <button disabled={pagination.page === pagination.pages} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                      className="px-4 py-2 rounded-lg border text-sm disabled:opacity-40 hover:border-green-900">Next →</button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>

        {/* Featured Stores */}
        {!hasActiveFilters && featuredStores.length > 0 && (
          <div className="mt-16 border-t pt-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-black text-gray-900">🏪 Featured Stores</h2>
                <p className="text-gray-500 text-sm">Verified African businesses</p>
              </div>
              <Link href="/stores" className="text-green-900 font-semibold text-sm flex items-center gap-1 hover:underline">
                All stores <FiArrowRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {featuredStores.slice(0, 4).map((store) => (
                <Link key={store.id} href={`/stores/${store.slug}`}
                  className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all border group">
                  <div className="h-24 bg-green-900 relative overflow-hidden">
                    {store.banner_url && <img src={store.banner_url} alt="" className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform" />}
                    <div className="absolute bottom-2 left-3">
                      {store.logo_url
                        ? <img src={store.logo_url} alt={store.name} className="w-10 h-10 rounded-full border-2 border-white object-cover" />
                        : <div className="w-10 h-10 rounded-full border-2 border-white bg-yellow-500 flex items-center justify-center font-black text-green-900">{store.name[0]}</div>
                      }
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="font-bold text-gray-800 text-sm">{store.name}</p>
                    <p className="text-xs text-gray-500">📍 {store.city || store.country}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs text-yellow-600 font-medium">★ {store.avg_rating.toFixed(1)}</span>
                      <span className="text-xs text-gray-400">({store.review_count})</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Sell CTA */}
        {!hasActiveFilters && (
          <div className="mt-16 bg-gradient-to-r from-green-900 to-green-800 rounded-2xl p-8 md:p-12 text-white text-center">
            <h2 className="text-3xl font-black mb-3">Own an African Business? 🌍</h2>
            <p className="text-green-200 mb-6 max-w-xl mx-auto">
              List your products and reach thousands of African diaspora customers across the USA, Canada & Europe. Setup takes less than 10 minutes.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/register?role=seller" className="bg-yellow-500 hover:bg-yellow-400 text-green-900 font-bold px-8 py-3 rounded-xl transition-colors">
                Start Selling Free →
              </Link>
              <Link href="/pricing" className="border-2 border-white text-white hover:bg-white hover:text-green-900 font-semibold px-8 py-3 rounded-xl transition-colors">
                View Pricing
              </Link>
            </div>
            <p className="text-green-300 text-sm mt-4">First 3 months free · No credit card required</p>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
