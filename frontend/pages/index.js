import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import ProductCard from "../components/ui/ProductCard";
import PromoCarousel from "../components/ui/PromoCarousel";
import { productsAPI, storesAPI } from "../lib/api";
import { FiArrowRight, FiTrendingUp } from "react-icons/fi";

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

      {/* ── Category Bar (sticky under navbar) ── */}
      <div className="bg-green-900 border-b border-green-800 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 py-2 flex gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {CATEGORIES.map((cat) => (
            <button key={cat.slug} onClick={() => setFilter("category", cat.slug)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                filters.category === cat.slug
                  ? "bg-yellow-400 text-green-900 font-black shadow"
                  : "text-green-100 hover:bg-green-800"
              }`}>
              <span>{cat.icon}</span>{cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Amazon-style promo cards — always visible ── */}
      {!hasActiveFilters && (
        <div className="bg-gray-100 py-4 border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

              {/* FIFA WC 2026 card — full image background */}
              <a href="/jerseys"
                className="group relative rounded-lg overflow-hidden hover:shadow-lg transition-all flex flex-col"
                style={{ minHeight: "170px" }}>
                {/* Background image */}
                <img
                  src="https://images.unsplash.com/photo-1551854838-212c50b4c184?w=600&q=80"
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
                {/* Dark gradient overlay */}
                <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,rgba(0,0,0,0.72) 0%,rgba(0,40,10,0.60) 100%)" }} />
                {/* Top accent bar */}
                <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg,#1a6b2e,#FCD116,#1a6b2e)" }} />
                {/* Content */}
                <div className="relative z-10 flex flex-col justify-between h-full p-4" style={{ minHeight: "170px" }}>
                  <div>
                    <span className="inline-block bg-yellow-400 text-green-900 text-xs font-black px-2 py-0.5 rounded uppercase tracking-wide leading-none mb-2">⚽ FIFA 2026</span>
                    <h3 className="text-white font-black text-lg leading-tight tracking-tight drop-shadow">
                      Africa <span style={{ color: "#FCD116" }}>Rises</span>
                    </h3>
                    <div className="flex gap-0.5 mt-1.5">
                      {["🇬🇭","🇲🇦","🇸🇳","🇪🇬","🇨🇮"].map(f => (
                        <span key={f} className="text-sm leading-none">{f}</span>
                      ))}
                    </div>
                    <p className="text-gray-300 text-xs mt-1.5 leading-relaxed">Official kits · Flags · Fan gear</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-yellow-400 font-bold text-xs group-hover:text-yellow-300 transition-colors mt-3">
                    Shop Kits <FiArrowRight size={11} />
                  </span>
                </div>
              </a>

              {/* PromoCarousel — constrained height with desktop font fixes */}
              <div className="rounded-lg overflow-hidden border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all"
                style={{ minHeight: "170px", maxHeight: "200px", position: "relative" }}>
                <div className="h-1.5 w-full" style={{ background: "linear-gradient(90deg,#7c3aed,#db2777,#7c3aed)" }} />
                {/* CSS overrides: scale fonts down & expose nav arrows on desktop */}
                <style>{`
                  .carousel-desktop-fix { height: calc(100% - 6px); overflow: hidden; }
                  .carousel-desktop-fix h2,
                  .carousel-desktop-fix h3,
                  .carousel-desktop-fix .text-2xl { font-size: 1rem !important; line-height: 1.3 !important; }
                  .carousel-desktop-fix p,
                  .carousel-desktop-fix .text-lg { font-size: 0.75rem !important; line-height: 1.4 !important; }
                  .carousel-desktop-fix button svg,
                  .carousel-desktop-fix [aria-label],
                  .carousel-desktop-fix .carousel-arrow,
                  .carousel-desktop-fix button[class*="arrow"],
                  .carousel-desktop-fix button[class*="prev"],
                  .carousel-desktop-fix button[class*="next"],
                  .carousel-desktop-fix button[class*="control"],
                  .carousel-desktop-fix button[class*="nav"] { display: flex !important; visibility: visible !important; opacity: 1 !important; z-index: 20 !important; }
                  .carousel-desktop-fix button { z-index: 20 !important; }
                `}</style>
                <div className="carousel-desktop-fix">
                  <PromoCarousel compact={true} />
                </div>
              </div>

              {/* Fitness card — full image background */}
              <a href="/fitness"
                className="group relative rounded-lg overflow-hidden hover:shadow-lg transition-all flex flex-col"
                style={{ minHeight: "170px" }}>
                {/* Background image */}
                <img
                  src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80"
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
                {/* Dark gradient overlay */}
                <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,rgba(0,0,0,0.70) 0%,rgba(80,20,0,0.58) 100%)" }} />
                {/* Top accent bar */}
                <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg,#c2410c,#f97316,#c2410c)" }} />
                {/* Content */}
                <div className="relative z-10 flex flex-col justify-between h-full p-4" style={{ minHeight: "170px" }}>
                  <div>
                    <span className="inline-block bg-orange-500 text-white text-xs font-black px-2 py-0.5 rounded uppercase tracking-wide leading-none mb-2">💪 Fitness</span>
                    <h3 className="text-white font-black text-lg leading-tight tracking-tight drop-shadow">
                      Train Like An <span style={{ color: "#fb923c" }}>African</span>
                    </h3>
                    <p className="text-gray-300 text-xs mt-1.5 leading-relaxed">Nike · Adidas · Puma · African brands</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-orange-400 font-bold text-xs group-hover:text-orange-300 transition-colors mt-3">
                    Shop Fitness <FiArrowRight size={11} />
                  </span>
                </div>
              </a>

            </div>
          </div>
        </div>
      )}

      {/* ── Featured Products ── */}
      {!hasActiveFilters && featuredProducts.length > 0 && (
        <div className="bg-white py-8 border-b">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <FiTrendingUp className="text-yellow-500" /> Featured Products
              </h2>
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

      {/* ── Region Tabs ── */}
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

      {/* ── Main Content ── */}
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row gap-6">

            {/* Sidebar */}
            <aside className="lg:w-56 flex-shrink-0">
              <div className="bg-white rounded-2xl p-5 shadow-sm sticky top-28 border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-800">Filters</h3>
                  {hasActiveFilters && <button onClick={resetFilters} className="text-xs text-red-500 hover:underline">Reset</button>}
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
            <main className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-4">
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
                        className="px-4 py-2 rounded-lg border text-sm disabled:opacity-40 hover:border-green-900 bg-white">← Prev</button>
                      {[...Array(Math.min(pagination.pages, 7))].map((_, i) => (
                        <button key={i} onClick={() => setFilters((f) => ({ ...f, page: i + 1 }))}
                          className={`w-9 h-9 rounded-lg text-sm font-medium ${pagination.page === i + 1 ? "bg-green-900 text-white" : "bg-white border hover:border-green-900"}`}>
                          {i + 1}
                        </button>
                      ))}
                      <button disabled={pagination.page === pagination.pages} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                        className="px-4 py-2 rounded-lg border text-sm disabled:opacity-40 hover:border-green-900 bg-white">Next →</button>
                    </div>
                  )}
                </>
              )}
            </main>
          </div>

          {/* Featured Stores */}
          {!hasActiveFilters && featuredStores.length > 0 && (
            <div className="mt-12 border-t pt-10">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-black text-gray-900">🏪 Featured Stores</h2>
                <Link href="/stores" className="text-green-900 font-semibold text-sm flex items-center gap-1 hover:underline">
                  All stores <FiArrowRight size={14} />
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            <div className="mt-12 bg-gradient-to-r from-green-900 to-green-800 rounded-2xl p-8 md:p-12 text-white text-center">
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
      </div>

      <Footer />
    </>
  );
}