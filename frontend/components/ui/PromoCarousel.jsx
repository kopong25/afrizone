import { useState, useEffect, useCallback } from "react";

// Fallback ads shown when no ads are configured in admin
const FALLBACK_ADS = [
  {
    id: 1,
    title: "Fresh African Groceries",
    subtitle: "Delivered to your door",
    cta_text: "Shop Now",
    cta_url: "/?category=food-groceries",
    bg_color: "#006B3F",
    accent_color: "#FCD116",
    emoji: "🛒",
  },
  {
    id: 2,
    title: "Ankara & African Fashion",
    subtitle: "Authentic styles, diaspora prices",
    cta_text: "Browse Fashion",
    cta_url: "/?category=fashion",
    bg_color: "#7B2D8B",
    accent_color: "#F7B5CD",
    emoji: "👗",
  },
  {
    id: 3,
    title: "Beauty & Hair Care",
    subtitle: "Shea butter, black soap & more",
    cta_text: "Shop Beauty",
    cta_url: "/?category=beauty-hair",
    bg_color: "#C8102E",
    accent_color: "#FFD700",
    emoji: "💄",
  },
  {
    id: 4,
    title: "Sell on Afrizone",
    subtitle: "Reach thousands of diaspora buyers",
    cta_text: "Start Free",
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
    fetch("/api/ads/featured")
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

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % ads.length);
  }, [ads.length]);

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + ads.length) % ads.length);
  }, [ads.length]);

  // Auto-advance every 5 seconds
  useEffect(() => {
    if (!paused && ads.length > 1) {
      const timer = setInterval(next, 5000);
      return () => clearInterval(timer);
    }
  }, [paused, next, ads.length]);

  if (!loaded || ads.length === 0) {
    return (
      <div className="h-full rounded-2xl bg-gray-800 animate-pulse flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const ad = ads[current];

  return (
    <div
      className="relative h-full rounded-2xl overflow-hidden shadow-xl cursor-pointer group"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{ minHeight: "110px" }}
    >
      {/* Slides */}
      {ads.map((a, i) => (
        <a
          key={a.id}
          href={a.cta_url || "#"}
          className="absolute inset-0 flex items-center justify-between px-5 py-4 transition-all duration-500"
          style={{
            background: `linear-gradient(135deg, ${a.bg_color} 0%, ${a.bg_color}cc 60%, #111 100%)`,
            opacity: i === current ? 1 : 0,
            transform: i === current ? "translateX(0)" : i < current ? "translateX(-100%)" : "translateX(100%)",
            pointerEvents: i === current ? "auto" : "none",
            zIndex: i === current ? 2 : 1,
          }}
        >
          {/* Glow */}
          <div className="absolute inset-0 opacity-30" style={{
            background: `radial-gradient(ellipse at 30% 50%, ${a.accent_color}44 0%, transparent 65%)`
          }} />

          {/* Content */}
          <div className="relative z-10 flex-1 min-w-0 pr-3">
            {a.image_url ? (
              <img src={a.image_url} alt={a.title}
                className="w-10 h-10 rounded-lg object-cover mb-1.5" />
            ) : (
              <div className="text-2xl mb-1">{a.emoji || "⚡"}</div>
            )}
            <h3 className="text-white font-black text-base leading-tight truncate"
              style={{ fontFamily: "Bebas Neue, sans-serif", letterSpacing: "1px", fontSize: "clamp(14px, 2vw, 18px)" }}>
              {a.title}
            </h3>
            <p className="text-xs mt-0.5 truncate" style={{ color: `${a.accent_color}cc` }}>
              {a.subtitle}
            </p>
          </div>

          {/* CTA */}
          <div className="flex-shrink-0">
            <span
              className="inline-flex items-center gap-1 font-black text-xs px-3 py-2 rounded-xl whitespace-nowrap group-hover:scale-105 transition-transform"
              style={{ background: `linear-gradient(135deg, ${a.accent_color}, ${a.accent_color}cc)`, color: "#000" }}
            >
              {a.cta_text || "Shop"} →
            </span>
          </div>
        </a>
      ))}

      {/* Prev / Next arrows */}
      {ads.length > 1 && (
        <>
          <button
            onClick={(e) => { e.preventDefault(); prev(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-black/40 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
          >‹</button>
          <button
            onClick={(e) => { e.preventDefault(); next(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-black/40 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
          >›</button>
        </>
      )}

      {/* Dot indicators */}
      {ads.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
          {ads.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.preventDefault(); setCurrent(i); }}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === current ? "16px" : "6px",
                height: "6px",
                background: i === current ? ad.accent_color : "rgba(255,255,255,0.4)",
              }}
            />
          ))}
        </div>
      )}

      {/* Progress bar */}
      {!paused && (
        <div className="absolute bottom-0 left-0 h-0.5 z-10 rounded-full transition-none"
          style={{
            background: ad.accent_color,
            animation: "progress 5s linear infinite",
            width: "100%",
          }}
        />
      )}

      <style>{`
        @keyframes progress {
          from { transform: scaleX(0); transform-origin: left; }
          to   { transform: scaleX(1); transform-origin: left; }
        }
      `}</style>
    </div>
  );
}