import { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { storesAPI, productsAPI } from "../lib/api";

// ── Engagement Best Practices Built In ────────────────────────────────────────
// ✅ Hero carousel auto-plays (grabs attention immediately)
// ✅ Flash deal countdown timer (urgency)
// ✅ "X people viewing" social proof
// ✅ Category cards visible above fold (fast navigation)
// ✅ Product cards show ratings + stock warnings
// ✅ Sticky announcement bar (free delivery hook)
// ✅ Search is front and center
// ✅ Mobile-first responsive layout

const HERO_SLIDES = [
  {
    id: 1,
    title: "Festival Season",
    subtitle: "UP TO 60% OFF",
    description: "African fashion, food & lifestyle — delivered to your door",
    cta: "Shop Now",
    href: "/products",
    bg: "from-[#1a4731] to-[#2d7a50]",
    badge: "🔥 Hot Deals",
    accent: "#f5a623",
  },
  {
    id: 2,
    title: "Fresh Food\nDelivered",
    subtitle: "~45 MINUTES",
    description: "Local restaurants dispatching via Uber Direct — hot & fresh",
    cta: "Order Food",
    href: "/products?category=food",
    bg: "from-[#7c3626] to-[#c0572e]",
    badge: "🛵 Express",
    accent: "#ffd166",
  },
  {
    id: 3,
    title: "New Arrivals",
    subtitle: "JUST DROPPED",
    description: "Discover the latest from Afrizone sellers this week",
    cta: "Explore",
    href: "/stores",
    bg: "from-[#1a3a5c] to-[#2563a8]",
    badge: "✨ New",
    accent: "#60b8ff",
  },
];

const CATEGORIES = [
  { label: "Food & Dining",   icon: "🍲", slug: "food",      color: "#c0572e" },
  { label: "Fashion",         icon: "👗", slug: "fashion",    color: "#7c3a8a" },
  { label: "Beauty",          icon: "💄", slug: "beauty",     color: "#c2185b" },
  { label: "Fitness",         icon: "🏋️", slug: "fitness",    color: "#2e7d32" },
  { label: "Electronics",     icon: "📱", slug: "electronics",color: "#1565c0" },
  { label: "Home & Decor",    icon: "🏠", slug: "home",       color: "#5d4037" },
  { label: "Sports",          icon: "⚽", slug: "sports",     color: "#00695c" },
  { label: "Groceries",       icon: "🥦", slug: "groceries",  color: "#558b2f" },
];

const PROMO_CARDS = [
  {
    title: "FIFA World Cup\nGear",
    tag: "Sports",
    emoji: "⚽",
    bg: "#0a2f5c",
    accent: "#ffd700",
    href: "/products?category=sports",
  },
  {
    title: "Fitness\nCollection",
    tag: "Health",
    emoji: "🏋️",
    bg: "#1b4332",
    accent: "#74c69d",
    href: "/products?category=fitness",
  },
  {
    title: "Afro\nFashion Week",
    tag: "Trending",
    emoji: "👗",
    bg: "#4a0e2e",
    accent: "#f48fb1",
    href: "/products?category=fashion",
  },
];

// ── Countdown Timer Hook ───────────────────────────────────────────────────────
function useCountdown() {
  const getEnd = () => {
    const end = new Date();
    end.setHours(23, 59, 59, 0);
    return end;
  };
  const [timeLeft, setTimeLeft] = useState({ h: "00", m: "00", s: "00" });
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = getEnd();
      const diff = Math.max(0, Math.floor((end - now) / 1000));
      const h = String(Math.floor(diff / 3600)).padStart(2, "0");
      const m = String(Math.floor((diff % 3600) / 60)).padStart(2, "0");
      const s = String(diff % 60).padStart(2, "0");
      setTimeLeft({ h, m, s });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return timeLeft;
}

// ── Product Card ───────────────────────────────────────────────────────────────
function ProductCard({ product }) {
  const [viewing] = useState(() => Math.floor(Math.random() * 18) + 3);
  const price = product.price ?? product.base_price ?? 0;
  const originalPrice = product.original_price;
  const discount = originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : null;
  const img = product.images?.[0] || product.image_url;
  const isLowStock = product.stock_quantity && product.stock_quantity < 10;

  return (
    <Link href={`/products/${product.id}`} className="group block">
      <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100">
        {/* Image */}
        <div className="relative aspect-square bg-gray-50 overflow-hidden">
          {img ? (
            <img
              src={img}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-green-50 to-amber-50">
              🛍️
            </div>
          )}
          {discount && (
            <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              -{discount}%
            </span>
          )}
          {isLowStock && (
            <span className="absolute bottom-2 left-2 bg-orange-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
              Only {product.stock_quantity} left!
            </span>
          )}
          <button
            onClick={(e) => { e.preventDefault(); }}
            className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full shadow flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
          >
            ♡
          </button>
        </div>

        {/* Info */}
        <div className="p-3">
          <p className="text-xs text-gray-400 mb-0.5 truncate">{product.store?.name || "Afrizone Store"}</p>
          <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug mb-2">{product.name}</h3>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-base font-black text-green-900">${Number(price).toFixed(2)}</span>
              {originalPrice && (
                <span className="ml-1.5 text-xs text-gray-400 line-through">${Number(originalPrice).toFixed(2)}</span>
              )}
            </div>
            {product.avg_rating > 0 && (
              <span className="text-xs text-amber-500 font-semibold">★ {Number(product.avg_rating).toFixed(1)}</span>
            )}
          </div>

          {/* Social proof */}
          <p className="text-xs text-gray-400 mt-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 mr-1 animate-pulse" />
            {viewing} people viewing
          </p>
        </div>
      </div>
    </Link>
  );
}

// ── Main Homepage ──────────────────────────────────────────────────────────────
export default function Home() {
  const router = useRouter();
  const [slide, setSlide] = useState(0);
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const slideTimer = useRef(null);
  const countdown = useCountdown();

  // Auto-advance carousel
  const nextSlide = useCallback(() => {
    setSlide((s) => (s + 1) % HERO_SLIDES.length);
  }, []);

  useEffect(() => {
    slideTimer.current = setInterval(nextSlide, 4500);
    return () => clearInterval(slideTimer.current);
  }, [nextSlide]);

  const goToSlide = (i) => {
    clearInterval(slideTimer.current);
    setSlide(i);
    slideTimer.current = setInterval(nextSlide, 4500);
  };

  // Fetch data
  useEffect(() => {
    const load = async () => {
      try {
        const [prodRes, storeRes] = await Promise.all([
          productsAPI?.getAll?.({ limit: 16 }).catch(() => ({ data: [] })),
          storesAPI?.getAll?.({ limit: 6 }).catch(() => ({ data: [] })),
        ]);
        setProducts(prodRes?.data?.items || prodRes?.data || []);
        setStores(storeRes?.data?.items || storeRes?.data || []);
      } catch {
        setProducts([]);
        setStores([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) router.push(`/products?q=${encodeURIComponent(search.trim())}`);
  };

  const current = HERO_SLIDES[slide];

  return (
    <>
      <Head>
        <title>Afrizone — African Marketplace</title>
        <meta name="description" content="Shop African food, fashion, beauty and more. Local delivery powered by Uber Direct." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      </Head>

      <div style={{ fontFamily: "'DM Sans', sans-serif" }} className="bg-[#f8f6f1] min-h-screen">

        {/* ── Announcement Bar ─────────────────────────────────────────────── */}
        <div className="bg-[#1a4731] text-white text-center text-xs py-2 px-4 font-medium tracking-wide">
          🌍 FREE delivery on your first 3 orders &nbsp;·&nbsp; Use code <span className="font-bold bg-white text-green-900 px-1.5 py-0.5 rounded ml-1">WELCOME</span>
        </div>

        {/* ── Search Bar (sticky) ──────────────────────────────────────────── */}
        <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-40 shadow-sm">
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products, stores, food..."
              className="flex-1 border border-gray-200 rounded-full px-5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4731] bg-gray-50"
            />
            <button
              type="submit"
              className="bg-[#1a4731] text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#2d7a50] transition-colors"
            >
              Search
            </button>
          </form>
        </div>

        {/* ── Flash Deal Bar ───────────────────────────────────────────────── */}
        <div className="bg-[#f5a623] py-2 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-3 text-sm font-bold text-[#1a1a1a]">
            <span>⚡ FLASH DEALS END IN</span>
            <div className="flex gap-1">
              {[countdown.h, countdown.m, countdown.s].map((v, i) => (
                <span key={i} className="bg-[#1a1a1a] text-white rounded px-2 py-0.5 font-mono text-sm">
                  {v}
                </span>
              ))}
            </div>
            <Link href="/products?sale=true" className="underline text-[#1a4731] hover:opacity-80">
              View All →
            </Link>
          </div>
        </div>

        {/* ── Main Hero Section ────────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-3 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr_200px] gap-3">

            {/* LEFT — Category Cards */}
            <div className="hidden lg:flex flex-col gap-2">
              <p style={{ fontFamily: "'Syne', sans-serif" }} className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1 mb-1">
                Categories
              </p>
              {CATEGORIES.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/products?category=${cat.slug}`}
                  className="group flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 shadow-sm hover:shadow-md transition-all border border-gray-100 hover:border-transparent hover:scale-[1.02]"
                  style={{ "--accent": cat.color }}
                >
                  <span className="text-xl w-8 text-center">{cat.icon}</span>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-[#1a4731]">{cat.label}</span>
                  <span className="ml-auto text-gray-300 group-hover:text-[#1a4731] text-xs">›</span>
                </Link>
              ))}
              <Link
                href="/products"
                className="mt-1 text-center text-xs text-[#1a4731] font-semibold hover:underline py-1"
              >
                All Categories →
              </Link>
            </div>

            {/* CENTER — Hero Carousel */}
            <div className="relative rounded-2xl overflow-hidden shadow-lg" style={{ minHeight: 340 }}>
              {HERO_SLIDES.map((s, i) => (
                <div
                  key={s.id}
                  className={`absolute inset-0 bg-gradient-to-br ${s.bg} flex flex-col justify-center px-8 transition-all duration-700 ${
                    i === slide ? "opacity-100 z-10" : "opacity-0 z-0"
                  }`}
                >
                  {/* Badge */}
                  <span
                    className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-4 w-fit"
                    style={{ background: s.accent, color: "#1a1a1a" }}
                  >
                    {s.badge}
                  </span>

                  {/* Title */}
                  <h1
                    style={{ fontFamily: "'Syne', sans-serif", whiteSpace: "pre-line" }}
                    className="text-4xl md:text-5xl font-black text-white leading-tight mb-2"
                  >
                    {s.title}
                  </h1>
                  <p
                    style={{ color: s.accent, fontFamily: "'Syne', sans-serif" }}
                    className="text-2xl font-black mb-3"
                  >
                    {s.subtitle}
                  </p>
                  <p className="text-white/80 text-sm mb-6 max-w-xs">{s.description}</p>

                  <Link
                    href={s.href}
                    className="inline-block px-6 py-3 rounded-full font-bold text-sm w-fit transition-transform hover:scale-105 active:scale-95"
                    style={{ background: s.accent, color: "#1a1a1a" }}
                  >
                    {s.cta} →
                  </Link>

                  {/* Decorative circle */}
                  <div
                    className="absolute -right-10 -bottom-10 w-56 h-56 rounded-full opacity-10"
                    style={{ background: s.accent }}
                  />
                  <div
                    className="absolute right-20 top-10 w-24 h-24 rounded-full opacity-10"
                    style={{ background: s.accent }}
                  />
                </div>
              ))}

              {/* Slide dots */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                {HERO_SLIDES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goToSlide(i)}
                    className={`rounded-full transition-all duration-300 ${
                      i === slide ? "w-6 h-2 bg-white" : "w-2 h-2 bg-white/50"
                    }`}
                  />
                ))}
              </div>

              {/* Arrows */}
              <button
                onClick={() => goToSlide((slide - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-white/20 hover:bg-white/40 text-white rounded-full flex items-center justify-center transition-colors"
              >
                ‹
              </button>
              <button
                onClick={() => goToSlide((slide + 1) % HERO_SLIDES.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-white/20 hover:bg-white/40 text-white rounded-full flex items-center justify-center transition-colors"
              >
                ›
              </button>
            </div>

            {/* RIGHT — Promo Cards */}
            <div className="hidden lg:flex flex-col gap-2">
              {PROMO_CARDS.map((card) => (
                <Link
                  key={card.title}
                  href={card.href}
                  className="group flex-1 rounded-xl overflow-hidden relative flex flex-col justify-end p-4 min-h-[100px] hover:shadow-lg transition-all hover:scale-[1.02]"
                  style={{ background: card.bg }}
                >
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full w-fit mb-1"
                    style={{ background: card.accent, color: "#1a1a1a" }}
                  >
                    {card.tag}
                  </span>
                  <p
                    style={{ fontFamily: "'Syne', sans-serif", whiteSpace: "pre-line", color: card.accent }}
                    className="text-sm font-black leading-tight"
                  >
                    {card.title}
                  </p>
                  <span className="absolute top-3 right-3 text-3xl opacity-80">{card.emoji}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* ── Mobile Categories (horizontal scroll) ─────────────────────── */}
          <div className="flex lg:hidden gap-3 overflow-x-auto py-3 -mx-3 px-3 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/products?category=${cat.slug}`}
                className="flex-none flex flex-col items-center gap-1 bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100"
              >
                <span className="text-2xl">{cat.icon}</span>
                <span className="text-xs font-medium text-gray-600 whitespace-nowrap">{cat.label}</span>
              </Link>
            ))}
          </div>

          {/* ── Featured Stores ────────────────────────────────────────────── */}
          {stores.length > 0 && (
            <section className="mt-8">
              <div className="flex items-center justify-between mb-3">
                <h2 style={{ fontFamily: "'Syne', sans-serif" }} className="text-xl font-black text-gray-900">
                  🏪 Top Stores
                </h2>
                <Link href="/stores" className="text-sm text-[#1a4731] font-semibold hover:underline">
                  See All →
                </Link>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {stores.map((store) => (
                  <Link
                    key={store.id}
                    href={`/stores/${store.slug || store.id}`}
                    className="flex-none w-32 bg-white rounded-xl p-3 shadow-sm border border-gray-100 hover:shadow-md transition-all hover:-translate-y-0.5 text-center"
                  >
                    <div className="w-12 h-12 rounded-full mx-auto mb-2 overflow-hidden bg-gradient-to-br from-green-100 to-amber-100 flex items-center justify-center">
                      {store.logo_url
                        ? <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
                        : <span className="text-2xl">🏪</span>
                      }
                    </div>
                    <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-tight">{store.name}</p>
                    {store.avg_rating > 0 && (
                      <p className="text-xs text-amber-500 mt-1">★ {Number(store.avg_rating).toFixed(1)}</p>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ── Products Grid ──────────────────────────────────────────────── */}
          <section className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ fontFamily: "'Syne', sans-serif" }} className="text-xl font-black text-gray-900">
                ⚡ Trending Now
              </h2>
              <Link href="/products" className="text-sm text-[#1a4731] font-semibold hover:underline">
                View All →
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm animate-pulse">
                    <div className="aspect-square bg-gray-200" />
                    <div className="p-3 space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-2/3" />
                      <div className="h-3 bg-gray-200 rounded" />
                      <div className="h-4 bg-gray-200 rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
                <p className="text-4xl mb-3">🛍️</p>
                <p className="text-gray-500 font-medium">Products loading soon</p>
                <p className="text-sm text-gray-400 mt-1">Sellers are stocking up — check back shortly</p>
                <Link href="/stores" className="mt-4 inline-block bg-[#1a4731] text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-[#2d7a50] transition-colors">
                  Browse Stores
                </Link>
              </div>
            )}
          </section>

          {/* ── Trust Signals ─────────────────────────────────────────────── */}
          <section className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: "🛵", title: "Fast Delivery", desc: "~45 min via Uber Direct" },
              { icon: "🔒", title: "Secure Checkout", desc: "256-bit SSL encryption" },
              { icon: "↩️", title: "Easy Returns", desc: "Hassle-free 30 day policy" },
              { icon: "🌍", title: "African Sellers", desc: "100% verified stores" },
            ].map((t) => (
              <div key={t.title} className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
                <p className="text-2xl mb-2">{t.icon}</p>
                <p className="text-sm font-bold text-gray-800">{t.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
              </div>
            ))}
          </section>

          {/* ── Newsletter ─────────────────────────────────────────────────── */}
          <section className="mt-8 mb-10 bg-gradient-to-r from-[#1a4731] to-[#2d7a50] rounded-2xl p-8 text-center text-white">
            <p className="text-xs font-bold tracking-widest uppercase text-green-300 mb-2">Stay in the loop</p>
            <h3 style={{ fontFamily: "'Syne', sans-serif" }} className="text-2xl font-black mb-2">
              Get deals before anyone else
            </h3>
            <p className="text-white/70 text-sm mb-5">Flash sales, new arrivals and exclusive drops — straight to your inbox.</p>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="flex gap-2 max-w-sm mx-auto"
            >
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 rounded-full px-4 py-2.5 text-sm text-gray-800 focus:outline-none"
              />
              <button
                type="submit"
                className="bg-[#f5a623] text-gray-900 font-bold px-5 py-2.5 rounded-full text-sm hover:bg-[#f0c040] transition-colors whitespace-nowrap"
              >
                Subscribe
              </button>
            </form>
          </section>

        </div>
      </div>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </>
  );
}