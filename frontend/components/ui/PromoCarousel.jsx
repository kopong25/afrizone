import { useState, useEffect, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://afrizone-loqr.onrender.com";

const FALLBACK_ADS = [
  {
    id: 1,
    title: "Fresh African Groceries",
    subtitle: "Fufu, garri, jollof rice ingredients & more — delivered to your door across the USA",
    cta_text: "Shop Groceries",
    cta_url: "/?category=food-groceries",
    bg_color: "#006B3F",
    accent_color: "#FCD116",
    emoji: "🛒",
  },
  {
    id: 2,
    title: "Ankara & African Fashion",
    subtitle: "Authentic Kente, Ankara & traditional wear — straight from verified African sellers",
    cta_text: "Browse Fashion",
    cta_url: "/?category=fashion",
    bg_color: "#7B2D8B",
    accent_color: "#F7B5CD",
    emoji: "👗",
  },
  {
    id: 3,
    title: "Beauty & Hair Care",
    subtitle: "Shea butter, black soap, African hair products & cosmetics — ships nationwide",
    cta_text: "Shop Beauty",
    cta_url: "/?category=beauty-hair",
    bg_color: "#C8102E",
    accent_color: "#FFD700",
    emoji: "💄",
  },
  {
    id: 4,
    title: "Sell on Afrizone",
    subtitle: "Reach thousands of African diaspora buyers across the USA, Canada & Europe",
    cta_text: "Start Selling Free",
    cta_url: "/register?role=seller",
    bg_color: "#1a3a1a",
    accent_color: "#FCD116",
    emoji: "🏪",
  },
];

export default function PromoCarousel() {
  const [ads, setAds] = useState([]);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`${API}/ads/featured`)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) && data.length > 0 ? data : FALLBACK_ADS;
        setAds(list.slice(0, 4));
        setLoaded(true);
      })
      .catch(() => {
        setAds(FALLBACK_ADS);
        setLoaded(true);
      });
  }, []);

  const next = useCallback(() => setCurrent((c) => (c + 1) % ads.length), [ads.length]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + ads.length) % ads.length), [ads.length]);

  useEffect(() => {
    if (!paused && ads.length > 1) {
      const timer = setInterval(next, 5000);
      return () => clearInterval(timer);
    }
  }, [paused, next, ads.length]);

  if (!loaded) {
    return <div className="w-full bg-gray-200 animate-pulse" style={{ height: "380px" }} />;
  }

  const ad = ads[current];

  return (
    <div
      className="relative w-full overflow-hidden group"
      style={{ height: "380px" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {ads.map((a, i) => (
        <a
          key={a.id}
          href={a.cta_url || "#"}
          className="absolute inset-0 transition-all duration-700"
          style={{
            opacity: i === current ? 1 : 0,
            transform: i === current ? "translateX(0)" : i < current ? "translateX(-6%)" : "translateX(6%)",
            pointerEvents: i === current ? "auto" : "none",
            zIndex: i === current ? 2 : 1,
          }}
        >
          {/* Background */}
          {a.image_url ? (
            <>
              <img src={a.image_url} alt={a.title} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0" style={{
                background: "linear-gradient(100deg, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0.05) 100%)"
              }} />
            </>
          ) : (
            <>
              <div className="absolute inset-0" style={{
                background: `linear-gradient(135deg, ${a.bg_color} 0%, ${a.bg_color}bb 55%, #0a0a0a 100%)`
              }} />
              <div className="absolute inset-0" style={{
                background: `radial-gradient(ellipse at 75% 50%, ${a.accent_color}22 0%, transparent 60%)`
              }} />
              {/* Big decorative emoji */}
              <div className="absolute right-16 top-1/2 -translate-y-1/2 select-none pointer-events-none"
                style={{ fontSize: "180px", opacity: 0.08, lineHeight: 1 }}>
                {a.emoji}
              </div>
            </>
          )}

          {/* Content */}
          <div className="absolute inset-0 flex flex-col justify-center px-12 md:px-20 max-w-2xl">
            {!a.image_url && (
              <div style={{ fontSize: "52px", lineHeight: 1, marginBottom: "16px" }}>{a.emoji}</div>
            )}
            <h2
              className="text-white font-black leading-none mb-4 drop-shadow-lg"
              style={{
                fontFamily: "Bebas Neue, Impact, sans-serif",
                letterSpacing: "2px",
                fontSize: "clamp(36px, 5vw, 64px)",
              }}
            >
              {a.title}
            </h2>
            {a.subtitle && (
              <p className="mb-8 leading-relaxed drop-shadow"
                style={{
                  color: a.image_url ? "rgba(255,255,255,0.88)" : `${a.accent_color}dd`,
                  fontSize: "clamp(14px, 1.6vw, 18px)",
                  maxWidth: "480px",
                }}>
                {a.subtitle}
              </p>
            )}
            <div>
              <span
                className="inline-flex items-center gap-2 font-black rounded-xl shadow-xl transition-transform hover:scale-105"
                style={{
                  background: `linear-gradient(135deg, ${a.accent_color}, ${a.accent_color}cc)`,
                  color: "#000",
                  padding: "14px 28px",
                  fontSize: "15px",
                }}
              >
                {a.cta_text || "Shop Now"} →
              </span>
            </div>
          </div>
        </a>
      ))}

      {/* Arrows */}
      {ads.length > 1 && (
        <>
          <button
            onClick={(e) => { e.preventDefault(); prev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/50 text-white text-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80 backdrop-blur-sm"
          >‹</button>
          <button
            onClick={(e) => { e.preventDefault(); next(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/50 text-white text-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80 backdrop-blur-sm"
          >›</button>
        </>
      )}

      {/* Dots */}
      {ads.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {ads.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.preventDefault(); setCurrent(i); }}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === current ? "24px" : "8px",
                height: "8px",
                background: i === current ? ad.accent_color : "rgba(255,255,255,0.45)",
              }}
            />
          ))}
        </div>
      )}

      {/* Progress bar */}
      {!paused && ads.length > 1 && (
        <div
          key={current}
          className="absolute bottom-0 left-0 h-1 z-10"
          style={{ background: ad.accent_color, animation: "adProgress 5s linear forwards" }}
        />
      )}

      <style>{`
        @keyframes adProgress {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
    </div>
  );
}