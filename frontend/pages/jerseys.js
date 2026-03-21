import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";

const TEAMS = [
  {
    country: "Ghana",
    flag: "🇬🇭",
    nickname: "Black Stars",
    kit_maker: "Puma",
    colors: ["#006B3F", "#FCD116", "#CE1126"],
    accent: "#FCD116",
    bg: "from-[#006B3F] to-[#004d2d]",
    image: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=600&h=700&fit=crop",
    affiliate_url: "https://www.fanatics.com/ghana",
    price: "$89.99",
    description: "The Black Stars shine at their 5th World Cup. Own the iconic gold & green.",
    hot: true,
  },
  {
    country: "Morocco",
    flag: "🇲🇦",
    nickname: "Atlas Lions",
    kit_maker: "Puma",
    colors: ["#C1272D", "#006233"],
    accent: "#C1272D",
    bg: "from-[#C1272D] to-[#8B0000]",
    image: "https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?w=600&h=700&fit=crop",
    affiliate_url: "https://www.fanatics.com/morocco",
    price: "$89.99",
    description: "Semi-finalists in Qatar 2022. Africa's pride. The Lions roar again.",
    hot: true,
  },
  {
    country: "Senegal",
    flag: "🇸🇳",
    nickname: "Lions of Teranga",
    kit_maker: "Puma",
    colors: ["#00853F", "#FDEF42", "#E31B23"],
    accent: "#FDEF42",
    bg: "from-[#00853F] to-[#005c2b]",
    image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&h=700&fit=crop",
    affiliate_url: "https://www.fanatics.com/senegal",
    price: "$89.99",
    description: "AFCON Champions. Mané's nation. The Lions of Teranga are back.",
    hot: false,
  },
  {
    country: "Egypt",
    flag: "🇪🇬",
    nickname: "Pharaohs",
    kit_maker: "Adidas",
    colors: ["#CE1126", "#FFFFFF"],
    accent: "#CE1126",
    bg: "from-[#CE1126] to-[#8B0000]",
    image: "https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=600&h=700&fit=crop",
    affiliate_url: "https://www.fanatics.com/egypt",
    price: "$84.99",
    description: "7x Africa Cup winners. Salah leads the Pharaohs to glory.",
    hot: false,
  },
  {
    country: "Algeria",
    flag: "🇩🇿",
    nickname: "Desert Foxes",
    kit_maker: "Adidas",
    colors: ["#FFFFFF", "#006233"],
    accent: "#006233",
    bg: "from-[#006233] to-[#004422]",
    image: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=600&h=700&fit=crop",
    affiliate_url: "https://www.fanatics.com/algeria",
    price: "$84.99",
    description: "The Desert Foxes return. AFCON 2019 Champions. Iconic white kit.",
    hot: false,
  },
  {
    country: "Côte d'Ivoire",
    flag: "🇨🇮",
    nickname: "Elephants",
    kit_maker: "Nike",
    colors: ["#F77F00", "#009A44", "#FFFFFF"],
    accent: "#F77F00",
    bg: "from-[#F77F00] to-[#c46300]",
    image: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&h=700&fit=crop",
    affiliate_url: "https://www.fanatics.com/cote-divoire",
    price: "$89.99",
    description: "Fresh AFCON 2024 Champions. The Elephants are unstoppable.",
    hot: true,
  },
  {
    country: "South Africa",
    flag: "🇿🇦",
    nickname: "Bafana Bafana",
    kit_maker: "Nike",
    colors: ["#007A4D", "#FFB612", "#DE3831"],
    accent: "#FFB612",
    bg: "from-[#007A4D] to-[#005535]",
    image: "https://images.unsplash.com/photo-1540747913346-19212a4a691f?w=600&h=700&fit=crop",
    affiliate_url: "https://www.fanatics.com/south-africa",
    price: "$84.99",
    description: "The Rainbow Nation is back on the world stage. Bafana Bafana!",
    hot: false,
  },
  {
    country: "Tunisia",
    flag: "🇹🇳",
    nickname: "Eagles of Carthage",
    kit_maker: "Kappa",
    colors: ["#E70013", "#FFFFFF"],
    accent: "#E70013",
    bg: "from-[#E70013] to-[#a00010]",
    image: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=600&h=700&fit=crop",
    affiliate_url: "https://www.fanatics.com/tunisia",
    price: "$79.99",
    description: "North Africa's Eagles soar. 6th World Cup appearance.",
    hot: false,
  },
  {
    country: "Cabo Verde",
    flag: "🇨🇻",
    nickname: "Blue Sharks",
    kit_maker: "Macron",
    colors: ["#003893", "#CF2027"],
    accent: "#003893",
    bg: "from-[#003893] to-[#002266]",
    image: "https://images.unsplash.com/photo-1606925797300-0b35e9d1794e?w=600&h=700&fit=crop",
    affiliate_url: "https://www.fanatics.com/cabo-verde",
    price: "$74.99",
    description: "The Blue Sharks make history — first-ever World Cup appearance!",
    hot: true,
  },
];

export default function JerseysPage() {
  const [filter, setFilter] = useState("all");
  const [hoveredCard, setHoveredCard] = useState(null);

  const filtered = filter === "hot" ? TEAMS.filter(t => t.hot) : TEAMS;

  return (
    <>
      <Head>
        <title>Africa at FIFA World Cup 2026 — Official Jerseys | Afrizone</title>
        <meta name="description" content="Shop official Africa World Cup 2026 jerseys. Ghana, Morocco, Senegal, Egypt and more. Authentic kits shipped worldwide." />
        <meta property="og:title" content="Africa at FIFA World Cup 2026 — Official Jerseys" />
        <meta property="og:description" content="9 African nations. One dream. Own their story." />
        <meta property="og:image" content="https://afrizoneshop.com/icons/icon-512x512.png" />
      </Head>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;600;700;900&display=swap');

        .hero-section {
          background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 40%, #16213e 70%, #0f3460 100%);
          position: relative;
          overflow: hidden;
        }
        .hero-section::before {
          content: '';
          position: absolute;
          inset: 0;
          background: 
            radial-gradient(ellipse at 20% 50%, rgba(252, 209, 22, 0.15) 0%, transparent 60%),
            radial-gradient(ellipse at 80% 20%, rgba(206, 17, 38, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 60% 80%, rgba(0, 107, 63, 0.2) 0%, transparent 50%);
        }
        .hero-text {
          font-family: 'Bebas Neue', sans-serif;
          letter-spacing: 2px;
        }
        .kit-card {
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease;
          cursor: pointer;
        }
        .kit-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 24px 48px rgba(0,0,0,0.4);
        }
        .buy-btn {
          background: linear-gradient(135deg, #FCD116, #f5a623);
          transition: all 0.2s ease;
        }
        .buy-btn:hover {
          background: linear-gradient(135deg, #f5a623, #e08c00);
          transform: scale(1.03);
        }
        .hot-badge {
          animation: pulse-badge 2s infinite;
        }
        @keyframes pulse-badge {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .flag-emoji {
          font-size: 2.5rem;
          filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3));
        }
        .stripe-overlay {
          background: repeating-linear-gradient(
            -55deg,
            transparent,
            transparent 10px,
            rgba(255,255,255,0.03) 10px,
            rgba(255,255,255,0.03) 20px
          );
        }
        .countdown-item {
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.15);
        }
        .image-overlay {
          background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 50%, transparent 100%);
        }
        .affiliate-notice {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          backdrop-filter: blur(10px);
        }
      `}</style>

      <Navbar />

      {/* HERO */}
      <div className="hero-section min-h-screen flex flex-col items-center justify-center text-white text-center px-4 py-20 relative">
        <div className="stripe-overlay absolute inset-0" />
        <div className="relative z-10 max-w-5xl mx-auto">
          {/* World Cup Badge */}
          <div className="inline-flex items-center gap-2 bg-yellow-400 text-black text-xs font-black px-4 py-1.5 rounded-full mb-6 tracking-wider uppercase">
            ⚽ FIFA WORLD CUP 2026 · USA · CANADA · MEXICO
          </div>

          <h1 className="hero-text text-7xl md:text-9xl mb-4 leading-none">
            <span style={{color: '#FCD116'}}>AFRICA</span>
            <br />
            <span className="text-white">RISES</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-300 mb-3 font-light">
            9 Nations. One Continent. One Dream.
          </p>
          <p className="text-base text-gray-400 mb-10 max-w-xl mx-auto">
            Own the official kits of every African nation at the 2026 FIFA World Cup.
            Shipped worldwide. Authentic. Iconic.
          </p>

          {/* Flag parade */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {TEAMS.map(t => (
              <a key={t.country} href={`#${t.country.toLowerCase().replace(/\s/g,'-').replace(/'/g,'')}`}
                className="flag-emoji hover:scale-125 transition-transform duration-200 cursor-pointer"
                title={t.country}>
                {t.flag}
              </a>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-10">
            {[
              { num: "9", label: "Nations" },
              { num: "1.8B", label: "African Diaspora" },
              { num: "48", label: "Teams in 2026" },
            ].map(s => (
              <div key={s.label} className="countdown-item rounded-2xl py-4">
                <p className="hero-text text-4xl" style={{color: '#FCD116'}}>{s.num}</p>
                <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          <a href="#kits"
            className="buy-btn inline-flex items-center gap-2 text-black font-black text-lg px-10 py-4 rounded-2xl shadow-xl">
            ⚽ Shop All Kits ↓
          </a>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center pt-2">
            <div className="w-1 h-3 bg-yellow-400 rounded-full" />
          </div>
        </div>
      </div>

      {/* KITS SECTION */}
      <div id="kits" className="bg-gray-950 py-20 px-4">
        <div className="max-w-7xl mx-auto">

          {/* Section header */}
          <div className="text-center mb-12">
            <h2 className="hero-text text-5xl md:text-7xl text-white mb-3">
              OFFICIAL <span style={{color:'#FCD116'}}>KITS</span>
            </h2>
            <p className="text-gray-400 text-lg">Authentic. Worldwide Shipping. Affiliate Partners.</p>

            {/* Filter */}
            <div className="flex justify-center gap-3 mt-6">
              {[["all", "All 9 Nations"], ["hot", "🔥 Most Wanted"]].map(([val, label]) => (
                <button key={val} onClick={() => setFilter(val)}
                  className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
                    filter === val
                      ? "bg-yellow-400 text-black"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Kit Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((team) => (
              <div key={team.country} id={team.country.toLowerCase().replace(/\s/g,'-').replace(/'/g,'')}
                className="kit-card rounded-3xl overflow-hidden bg-gray-900 border border-white/10"
                onMouseEnter={() => setHoveredCard(team.country)}
                onMouseLeave={() => setHoveredCard(null)}>

                {/* Image */}
                <div className="relative h-72 overflow-hidden">
                  <div className={`absolute inset-0 bg-gradient-to-br ${team.bg} opacity-80`} />
                  <img src={team.image} alt={`${team.country} World Cup Jersey`}
                    className="w-full h-full object-cover mix-blend-overlay" />
                  <div className="image-overlay absolute inset-0" />

                  {/* Hot badge */}
                  {team.hot && (
                    <div className="hot-badge absolute top-4 right-4 bg-red-500 text-white text-xs font-black px-3 py-1 rounded-full">
                      🔥 POPULAR
                    </div>
                  )}

                  {/* Kit maker */}
                  <div className="absolute top-4 left-4 bg-black/50 backdrop-blur text-white text-xs font-bold px-2 py-1 rounded-lg border border-white/20">
                    {team.kit_maker}
                  </div>

                  {/* Country info over image */}
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-4xl">{team.flag}</span>
                      <div>
                        <h3 className="hero-text text-3xl text-white leading-none">{team.country}</h3>
                        <p className="text-xs text-gray-300">{team.nickname}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5">
                  <p className="text-gray-400 text-sm mb-4 leading-relaxed">{team.description}</p>

                  {/* Color swatches */}
                  <div className="flex gap-1.5 mb-5">
                    {team.colors.map(c => (
                      <div key={c} className="w-5 h-5 rounded-full border border-white/20 shadow-sm"
                        style={{backgroundColor: c}} />
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">From</p>
                      <p className="text-2xl font-black text-white">{team.price}</p>
                    </div>
                    <a href={team.affiliate_url} target="_blank" rel="noopener noreferrer"
                      className="buy-btn text-black font-black px-6 py-3 rounded-xl text-sm flex items-center gap-2">
                      Buy Kit ⚽
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Affiliate disclosure */}
          <div className="affiliate-notice rounded-2xl p-4 mt-12 text-center text-gray-400 text-xs max-w-2xl mx-auto">
            🤝 <strong className="text-gray-300">Affiliate Disclosure:</strong> Afrizone earns a commission when you purchase through our links at no extra cost to you. We only partner with official licensed retailers.
          </div>
        </div>
      </div>

      {/* BANNER — Why Buy Through Afrizone */}
      <div className="bg-gradient-to-r from-green-900 to-green-800 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="hero-text text-5xl mb-6">WHY BUY THROUGH <span style={{color:'#FCD116'}}>AFRIZONE?</span></h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: "✅", title: "100% Official", desc: "All kits are authentic, licensed by FIFA and the national federations" },
              { icon: "🌍", title: "Support Africa", desc: "A portion of our commission goes to youth football programs across Africa" },
              { icon: "🚚", title: "Ships Worldwide", desc: "USA, Canada, UK, Europe — wherever your diaspora community is" },
            ].map(f => (
              <div key={f.title} className="bg-white/10 rounded-2xl p-6 backdrop-blur">
                <div className="text-4xl mb-3">{f.icon}</div>
                <h3 className="font-black text-lg mb-2">{f.title}</h3>
                <p className="text-green-200 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA — Afrizone Shop */}
      <div className="bg-gray-950 py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <p className="text-gray-500 text-sm uppercase tracking-widest mb-3">Also on Afrizone</p>
          <h2 className="hero-text text-5xl text-white mb-4">
            SHOP <span style={{color:'#FCD116'}}>AFRICAN PRODUCTS</span>
          </h2>
          <p className="text-gray-400 mb-8">Food, fashion, beauty & more from African sellers across the USA</p>
          <Link href="/"
            className="buy-btn inline-flex items-center gap-2 text-black font-black text-lg px-10 py-4 rounded-2xl">
            🌍 Explore Afrizone Shop
          </Link>
        </div>
      </div>

      <Footer />
    </>
  );
}
