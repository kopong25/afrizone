import { useState, useEffect, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://afrizone-loqr.onrender.com";

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
    return (
      <div className="w-full rounded-2xl bg-gray-200 animate-pulse" style={{ height: "200px" }} />
    );
  }

  const ad = ads[current];

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl shadow-xl group"
      style={{ height: "200px" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides */}
      {ads.map((a, i) => (
        <a
          key={a.id}
          href={a.cta_url || "#"}
          className="absolute inset-0 transition-all duration-500"
          style={{
            opacity: i === current ? 1 : 0,
            transform: i === current ? "translateX(0)" : i < current ? "translateX(-100%)" : "translateX(100%)",
            pointerEvents: i === current ? "auto" : "none",
            zIndex: i === current ? 2 : 1,
          }}
        >
          {/* Full background: image or gradient */}
          {a.image_url ? (
            <>
              <img
                src={a.image_url}
                alt={a.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Dark overlay so text is always readable */}
              <div className="absolute inset-0" style={{
                background: "linear-gradient(90deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.10) 100%)"
              }} />
            </>
          ) : (
            <>
              {/* Colour card fallback */}
              <div className="absolute inset-0" style={{
                background: `linear-gradient(135deg, ${a.bg_color} 0%, ${a.bg_color}cc 60%, #111 100%)`
              }} />
              {/* Accent glow */}
              <div className="absolute inset-0 opacity-30" style={{
                background: `radial-gradient(ellipse at 70% 50%, ${a.accent_color}55 0%, transparent 65%)`
              }} />
              {/* Big emoji watermark */}
              <div className="absolute right-8 top-1/2 -translate-y-1/2 text-8xl opacity-20 select-none">
                {a.emoji}
              </div>
            </>
          )}

          {/* Text content — always on the left */}
          <div className="absolute inset-0 flex flex-col justify-center px-8 gap-2">
            {!a.image_url && (
              <div className="text-4xl mb-1">{a.emoji}</div>
            )}
            <h3
              className="text-white font-black leading-tight drop-shadow"
              style={{
                fontFamily: "Bebas Neue, sans-serif",
                letterSpacing: "2px",
                fontSize: "clamp(22px, 3.5vw, 36px)",
              }}
            >
              {a.title}
            </h3>
            {a.subtitle && (
              <p
                className="text-sm drop-shadow"
                style={{ color: a.image_url ? "rgba(255,255,255,0.85)" : `${a.accent_color}dd` }}
              >
                {a.subtitle}
              </p>
            )}
            <div className="mt-2">
              <span
                className="inline-flex items-center gap-1.5 font-black text-sm px-5 py-2.5 rounded-xl shadow-lg hover:scale-105 transition-transform"
                style={{
                  background: `linear-gradient(135deg, ${a.accent_color}, ${a.accent_color}cc)`,
                  color: "#000",
                }}
              >
                {a.cta_text || "Shop Now"} →
              </span>
            </div>
          </div>
        </a>
      ))}

      {/* Prev / Next arrows */}
      {ads.length > 1 && (
        <>
          <button
            onClick={(e) => { e.preventDefault(); prev(); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/50 text-white text-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
          >‹</button>
          <button
            onClick={(e) => { e.preventDefault(); next(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/50 text-white text-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
          >›</button>
        </>
      )}

      {/* Dot indicators */}
      {ads.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {ads.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.preventDefault(); setCurrent(i); }}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === current ? "20px" : "7px",
                height: "7px",
                background: i === current ? ad.accent_color : "rgba(255,255,255,0.5)",
              }}
            />
          ))}
        </div>
      )}

      {/* Progress bar */}
      {!paused && ads.length > 1 && (
        <div
          key={current}
          className="absolute bottom-0 left-0 h-1 z-10 rounded-full"
          style={{
            background: ad.accent_color,
            animation: "adProgress 5s linear forwards",
          }}
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