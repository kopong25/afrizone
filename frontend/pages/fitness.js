import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";

const AMAZON_URL = "https://www.amazon.com";

const AFRICAN_BRANDS = [
  {
    brand: "Tshepo Jeans",
    country: "South Africa",
    flag: "🇿🇦",
    type: "Streetwear",
    accent: "#E8B84B",
    bg: "from-[#1a1a1a] to-[#2d2d2d]",
    image: "https://images.unsplash.com/photo-1556906781-9a412961a28c?w=600&h=700&fit=crop",
    price: "$45–$120",
    description: "Premium African denim and streetwear. Crafted in Johannesburg. Worn worldwide.",
    hot: true,
    tags: ["Denim","Street","Premium"],
  },
  {
    brand: "Vibrations Clothing",
    country: "Ghana",
    flag: "🇬🇭",
    type: "Afro Sportswear",
    accent: "#FCD116",
    bg: "from-[#006B3F] to-[#003d1f]",
    image: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600&h=700&fit=crop",
    price: "$35–$95",
    description: "Kente-inspired athletic wear. Train in your culture. Represent Ghana.",
    hot: true,
    tags: ["Athletic","Cultural","Ghana"],
  },
  {
    brand: "Noir Tribe",
    country: "Nigeria",
    flag: "🇳🇬",
    type: "Luxury Streetwear",
    accent: "#008751",
    bg: "from-[#1a0a00] to-[#3d1f00]",
    image: "https://images.unsplash.com/photo-1523398002811-999ca8dec234?w=600&h=700&fit=crop",
    price: "$65–$180",
    description: "Lagos luxury. New York edge. The diaspora's favourite street label.",
    hot: true,
    tags: ["Luxury","Lagos","Diaspora"],
  },
  {
    brand: "Ubuntu Active",
    country: "Kenya",
    flag: "🇰🇪",
    type: "Performance Wear",
    accent: "#BE0027",
    bg: "from-[#006600] to-[#003300]",
    image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=700&fit=crop",
    price: "$40–$110",
    description: "Built for African champions. Performance gear inspired by Kenya's running legacy.",
    hot: false,
    tags: ["Performance","Running","Kenya"],
  },
  {
    brand: "Ankara Athletics",
    country: "Côte d'Ivoire",
    flag: "🇨🇮",
    type: "Gym & Training",
    accent: "#F77F00",
    bg: "from-[#F77F00] to-[#7a3d00]",
    image: "https://images.unsplash.com/photo-1483721310020-03333e577078?w=600&h=700&fit=crop",
    price: "$38–$85",
    description: "Bold African prints meet gym-ready performance fabric. Train different.",
    hot: false,
    tags: ["Gym","Ankara","Training"],
  },
  {
    brand: "Sahara Street",
    country: "Morocco",
    flag: "🇲🇦",
    type: "Urban Streetwear",
    accent: "#C1272D",
    bg: "from-[#C1272D] to-[#6a0000]",
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=700&fit=crop",
    price: "$50–$140",
    description: "North African streetwear with Mediterranean soul. From Casablanca to the world.",
    hot: true,
    tags: ["Street","North Africa","Morocco"],
  },
];

const GYM_GEAR = [
  {
    name: "Nike Air Max 270",
    category: "Training Shoes",
    icon: "👟",
    accent: "#FF6B35",
    price: "$150",
    rating: 4.8,
    reviews: "12.4k",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop",
    description: "Max cushioning for max performance. The diaspora's favourite trainer.",
    hot: true,
  },
  {
    name: "Adidas Originals Tracksuit",
    category: "Tracksuit",
    icon: "🏃",
    accent: "#000000",
    price: "$120",
    rating: 4.7,
    reviews: "8.9k",
    image: "https://images.unsplash.com/photo-1556906781-9a412961a28c?w=400&h=400&fit=crop",
    description: "Iconic three stripes. Street to gym. Never goes out of style.",
    hot: true,
  },
  {
    name: "Puma Training Hoodie",
    category: "Hoodie",
    icon: "🧥",
    accent: "#E50050",
    price: "$75",
    rating: 4.6,
    reviews: "5.2k",
    image: "https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=400&h=400&fit=crop",
    description: "Premium cotton blend. Perfect for gym, street, or travel.",
    hot: false,
  },
  {
    name: "Nike Dri-FIT Shorts",
    category: "Gym Shorts",
    icon: "🩳",
    accent: "#FF6B35",
    price: "$45",
    rating: 4.9,
    reviews: "22.1k",
    image: "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=400&h=400&fit=crop",
    description: "Sweat-wicking tech. Built for the hardest workouts.",
    hot: true,
  },
  {
    name: "Adidas Ultraboost 23",
    category: "Running Shoes",
    icon: "👟",
    accent: "#000000",
    price: "$190",
    rating: 4.8,
    reviews: "18.7k",
    image: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=400&h=400&fit=crop",
    description: "Boost energy return. Run like a Kenyan champion.",
    hot: true,
  },
  {
    name: "Under Armour Sports Bra",
    category: "Women's Activewear",
    icon: "💪",
    accent: "#1C1C1C",
    price: "$55",
    rating: 4.7,
    reviews: "9.3k",
    image: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=400&fit=crop",
    description: "High support. All-day comfort. Made for every body.",
    hot: false,
  },
  {
    name: "Puma Suede Classic",
    category: "Lifestyle Sneaker",
    icon: "👟",
    accent: "#E50050",
    price: "$80",
    rating: 4.6,
    reviews: "15.8k",
    image: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=400&h=400&fit=crop",
    description: "A street legend since 1968. Fresh colourways for the diaspora.",
    hot: false,
  },
  {
    name: "Nike Tech Fleece Jogger",
    category: "Joggers",
    icon: "🏃",
    accent: "#FF6B35",
    price: "$110",
    rating: 4.9,
    reviews: "31.2k",
    image: "https://images.unsplash.com/photo-1591195853828-11db59a44f43?w=400&h=400&fit=crop",
    description: "The jogger that took over the streets. Slim fit. Premium feel.",
    hot: true,
  },
];

const CATEGORIES = [
  { id: "all", label: "Everything", icon: "🔥" },
  { id: "african", label: "African Brands", icon: "🌍" },
  { id: "gym", label: "Gym & Training", icon: "💪" },
  { id: "street", label: "Streetwear", icon: "🧢" },
];

const STATS = [
  { num: "$120B", label: "Global Activewear Market" },
  { num: "340M+", label: "African Diaspora Worldwide" },
  { num: "8–10%", label: "Amazon Associates Commission" },
];

export default function FitnessPage() {
  const [activeSection, setActiveSection] = useState("african");

  return (
    <>
      <Head>
        <title>African Fitness & Streetwear — Shop the Culture | Afrizone</title>
        <meta name="description" content="African-designed gym wear, streetwear, hoodies, tracksuits. Shop Nike, Adidas, Puma training gear + African brands. Ships worldwide." />
        <meta property="og:title" content="African Fitness & Streetwear | Afrizone Shop" />
        <meta property="og:description" content="Train in your culture. Represent your roots. Shop African fitness and streetwear." />
      </Head>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:ital,wght@0,700;0,900;1,900&family=Inter:wght@400;500;600;700&display=swap');

        * { box-sizing: border-box; }
        .bebas { font-family: 'Bebas Neue', sans-serif; letter-spacing: 3px; }
        .barlow { font-family: 'Barlow Condensed', sans-serif; }

        .hero-bg {
          background: #050505;
          position: relative;
          overflow: hidden;
        }
        .hero-bg::before {
          content: '';
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse at 0% 100%, rgba(252,209,22,0.18) 0%, transparent 50%),
            radial-gradient(ellipse at 100% 0%, rgba(0,107,63,0.2) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(255,107,53,0.08) 0%, transparent 60%);
        }
        .hero-grid {
          position: absolute; inset: 0;
          background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 60px 60px;
        }
        .kit-card {
          transition: transform 0.35s cubic-bezier(.34,1.56,.64,1), box-shadow 0.3s ease;
          cursor: pointer;
        }
        .kit-card:hover {
          transform: translateY(-12px) scale(1.02);
          box-shadow: 0 40px 80px rgba(0,0,0,0.6);
        }
        .buy-btn {
          background: linear-gradient(135deg, #FCD116, #f5a623);
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .buy-btn:hover {
          background: linear-gradient(135deg, #f5a623, #d4820a);
          transform: scale(1.05);
          box-shadow: 0 8px 24px rgba(252,209,22,0.4);
        }
        .amazon-btn {
          background: linear-gradient(135deg, #FF9900, #e88a00);
          transition: all 0.2s ease;
        }
        .amazon-btn:hover {
          background: linear-gradient(135deg, #e88a00, #cc7a00);
          transform: scale(1.04);
          box-shadow: 0 8px 24px rgba(255,153,0,0.4);
        }
        .hot-badge { animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1)} }
        .img-overlay { background: linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.2) 60%, transparent 100%); }
        .glass { background: rgba(255,255,255,0.04); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.08); }
        .glass-gold { background: rgba(252,209,22,0.08); border: 1px solid rgba(252,209,22,0.2); }
        .tab-btn { transition: all 0.2s ease; border: 1px solid rgba(255,255,255,0.1); }
        .tab-btn.active { background: #FCD116; color: #000; border-color: #FCD116; }
        .tab-btn:not(.active):hover { background: rgba(255,255,255,0.08); }
        .star { color: #FCD116; }
        .tag { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); }
        .sweat-line {
          position: absolute;
          width: 2px;
          background: linear-gradient(to bottom, transparent, rgba(252,209,22,0.6), transparent);
          animation: sweat 3s ease-in-out infinite;
        }
        @keyframes sweat {
          0% { transform: translateY(-100%); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        .section-divider {
          height: 2px;
          background: linear-gradient(90deg, transparent, #FCD116, #006B3F, transparent);
        }
        .gear-card {
          transition: transform 0.3s cubic-bezier(.34,1.56,.64,1), box-shadow 0.3s ease;
        }
        .gear-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        }
        .brand-badge {
          background: linear-gradient(135deg, rgba(252,209,22,0.15), rgba(252,209,22,0.05));
          border: 1px solid rgba(252,209,22,0.3);
        }
      `}</style>

      <Navbar />

      {/* ══════════════════ HERO ══════════════════ */}
      <div className="hero-bg min-h-screen flex flex-col items-center justify-center text-white px-4 py-28 relative">
        <div className="hero-grid" />

        {/* Animated sweat lines */}
        {[15, 30, 50, 70, 85].map((left, i) => (
          <div key={i} className="sweat-line" style={{
            left: `${left}%`,
            height: `${60 + i * 20}px`,
            top: `${10 + i * 5}%`,
            animationDelay: `${i * 0.7}s`,
            animationDuration: `${3 + i * 0.5}s`
          }} />
        ))}

        <div className="relative z-10 max-w-6xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 glass-gold text-yellow-400 text-xs font-black px-5 py-2 rounded-full mb-8 uppercase tracking-widest">
            🌍 African Fitness & Streetwear · Shop the Culture
          </div>

          {/* Hero headline */}
          <div className="mb-6">
            <h1 className="bebas leading-none">
              <span className="block text-7xl md:text-[9rem]" style={{color:'#FCD116'}}>TRAIN</span>
              <span className="block text-7xl md:text-[9rem] text-white">LIKE AN</span>
              <span className="block text-7xl md:text-[9rem]"
                style={{WebkitTextStroke:'2px #FCD116', color:'transparent'}}>AFRICAN</span>
            </h1>
          </div>

          <p className="barlow text-2xl md:text-3xl text-gray-300 font-bold tracking-wider mb-3">
            DIASPORA FITNESS · STREET CULTURE · AFRICAN PRIDE
          </p>
          <p className="text-gray-500 max-w-xl mx-auto text-sm mb-12 leading-relaxed">
            African-designed gym wear, tracksuits & hoodies — plus the world's best sportswear brands.
            Train in your culture. Represent your roots.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mb-12">
            {STATS.map(s => (
              <div key={s.label} className="glass rounded-2xl py-5 px-3">
                <p className="bebas text-3xl md:text-4xl" style={{color:'#FCD116'}}>{s.num}</p>
                <p className="text-gray-500 text-xs uppercase tracking-wider mt-1 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-4 justify-center">
            <button onClick={() => { setActiveSection("african"); document.getElementById("shop")?.scrollIntoView({behavior:"smooth"}); }}
              className="buy-btn text-black font-black text-base px-10 py-4 rounded-2xl shadow-xl">
              🌍 African Brands
            </button>
            <button onClick={() => { setActiveSection("gym"); document.getElementById("shop")?.scrollIntoView({behavior:"smooth"}); }}
              className="amazon-btn text-black font-black text-base px-10 py-4 rounded-2xl shadow-xl">
              💪 Shop Nike · Adidas · Puma
            </button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/20 rounded-full flex items-start justify-center pt-2">
            <div className="w-1 h-3 bg-yellow-400 rounded-full" />
          </div>
        </div>
      </div>

      {/* ══════════════════ POWER STATEMENT ══════════════════ */}
      <div style={{background:'linear-gradient(135deg,#006B3F,#004d2d)'}} className="py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-white text-center">
            {[
              { icon: "🏃", stat: "Kenya", desc: "Holds 30+ world records in distance running. African endurance is unmatched." },
              { icon: "🥊", stat: "Nigeria", desc: "3x Olympic boxing medals. African power is legendary." },
              { icon: "⚽", stat: "Africa", desc: "9 nations at World Cup 2026. The continent is unstoppable." },
            ].map(s => (
              <div key={s.stat} className="glass rounded-2xl p-6">
                <div className="text-4xl mb-2">{s.icon}</div>
                <p className="bebas text-3xl text-yellow-400 mb-1">{s.stat}</p>
                <p className="text-green-200 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════ SHOP SECTION ══════════════════ */}
      <div id="shop" className="bg-gray-950 py-20 px-4">
        <div className="max-w-7xl mx-auto">

          {/* Section header */}
          <div className="text-center mb-10">
            <h2 className="bebas text-6xl md:text-8xl text-white mb-2">
              SHOP THE <span style={{color:'#FCD116'}}>CULTURE</span>
            </h2>
            <p className="text-gray-500 text-sm">African brands + world's best sportswear</p>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {[
              ["african", "🌍 African Brands"],
              ["gym", "💪 Nike · Adidas · Puma"],
            ].map(([val, label]) => (
              <button key={val} onClick={() => setActiveSection(val)}
                className={`tab-btn px-8 py-3 rounded-2xl font-black text-sm ${activeSection === val ? "active" : "text-gray-400"}`}>
                {label}
              </button>
            ))}
          </div>

          {/* ── AFRICAN BRANDS ── */}
          {activeSection === "african" && (
            <>
              <div className="glass-gold rounded-2xl p-4 mb-8 text-center">
                <p className="text-yellow-400 text-sm font-bold">
                  🌍 These African brands are sold via Afrizone partner stores and affiliate links.
                  Support Black-owned businesses while looking incredible.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {AFRICAN_BRANDS.map(brand => (
                  <div key={brand.brand} className="kit-card rounded-3xl overflow-hidden bg-gray-900 border border-white/10">
                    <div className="relative h-72 overflow-hidden">
                      <div className={`absolute inset-0 bg-gradient-to-br ${brand.bg}`} />
                      <img src={brand.image} alt={brand.brand}
                        className="w-full h-full object-cover mix-blend-overlay opacity-90" />
                      <div className="img-overlay absolute inset-0" />
                      {brand.hot && (
                        <div className="hot-badge absolute top-4 right-4 bg-red-500 text-white text-xs font-black px-3 py-1 rounded-full">
                          🔥 TRENDING
                        </div>
                      )}
                      <div className="absolute top-4 left-4 brand-badge text-yellow-400 text-xs font-black px-2 py-1 rounded-lg">
                        {brand.type}
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-5">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-3xl">{brand.flag}</span>
                          <div>
                            <h3 className="bebas text-2xl text-white leading-none">{brand.brand}</h3>
                            <p className="text-xs text-gray-300">{brand.country}</p>
                          </div>
                        </div>
                        <div className="flex gap-1.5 mt-2">
                          {brand.tags.map(t => (
                            <span key={t} className="tag text-xs text-gray-300 px-2 py-0.5 rounded-full">{t}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="p-5">
                      <p className="text-gray-400 text-sm mb-4 leading-relaxed">{brand.description}</p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">Starting From</p>
                          <p className="text-2xl font-black text-white">{brand.price}</p>
                        </div>
                        <a href={AMAZON_URL} target="_blank" rel="noopener noreferrer"
                          className="amazon-btn text-black font-black px-5 py-2.5 rounded-xl text-sm">
                          Shop Now →
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── GYM GEAR ── */}
          {activeSection === "gym" && (
            <>
              <div className="glass rounded-2xl p-4 mb-8 flex items-center gap-3 justify-center">
                <span className="text-2xl">🛒</span>
                <p className="text-gray-300 text-sm font-bold">
                  All gear ships via <span className="text-orange-400">Amazon Prime</span> — 
                  Free 2-day delivery for Prime members. 
                  <span className="text-gray-500 ml-1 text-xs">(Affiliate links — Afrizone earns 8–10% commission)</span>
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {GYM_GEAR.map(item => (
                  <div key={item.name} className="gear-card rounded-2xl overflow-hidden bg-gray-900 border border-white/10">
                    <div className="relative h-52 overflow-hidden">
                      <div className="absolute inset-0" style={{
                        background: `linear-gradient(135deg, ${item.accent}33, ${item.accent}11)`
                      }} />
                      <img src={item.image} alt={item.name}
                        className="w-full h-full object-cover mix-blend-overlay opacity-90" />
                      <div className="img-overlay absolute inset-0" />
                      {item.hot && (
                        <div className="hot-badge absolute top-3 right-3 bg-orange-500 text-white text-xs font-black px-2 py-0.5 rounded-full">
                          🔥
                        </div>
                      )}
                      <div className="absolute bottom-3 left-3">
                        <span className="tag text-xs text-gray-300 px-2 py-0.5 rounded-full">{item.category}</span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-black text-white text-sm mb-1 leading-tight">{item.name}</h3>
                      {/* Stars */}
                      <div className="flex items-center gap-1 mb-2">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <span key={i} className={i < Math.floor(item.rating) ? "star" : "text-gray-600"} style={{fontSize:'12px'}}>★</span>
                          ))}
                        </div>
                        <span className="text-xs text-gray-500">{item.rating} ({item.reviews})</span>
                      </div>
                      <p className="text-gray-500 text-xs mb-3 leading-relaxed">{item.description}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-xl font-black text-white">{item.price}</p>
                        <a href={AMAZON_URL} target="_blank" rel="noopener noreferrer"
                          className="amazon-btn text-black font-black px-4 py-2 rounded-xl text-xs">
                          Amazon →
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Affiliate disclosure */}
          <div className="glass rounded-2xl p-4 mt-14 text-center text-gray-500 text-xs max-w-2xl mx-auto">
            📋 <strong className="text-gray-400">Affiliate Disclosure:</strong> Afrizone is a participant in the Amazon Associates Program and other affiliate programs. We earn commissions on qualifying purchases at no extra cost to you.
          </div>
        </div>
      </div>

      {/* ══════════════════ FEATURED LOOK ══════════════════ */}
      <div className="py-16 px-4" style={{background:'linear-gradient(135deg,#0a0a0a,#1a1a1a)'}}>
        <div className="max-w-5xl mx-auto">
          <div className="section-divider mb-12" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <p className="text-yellow-400 text-xs font-black uppercase tracking-widest mb-3">Why Shop African Fitness</p>
              <h2 className="bebas text-5xl md:text-6xl text-white leading-none mb-6">
                THE DIASPORA<br/>
                <span style={{color:'#FCD116'}}>MOVES</span><br/>
                DIFFERENT
              </h2>
              <div className="space-y-4">
                {[
                  { icon: "🌍", title: "Cultural Identity", desc: "Wear your heritage. African prints, colours, and stories in every thread." },
                  { icon: "💰", title: "Support Black Business", desc: "Every purchase from African brands puts money back into the community." },
                  { icon: "🏆", title: "Premium Quality", desc: "African designers are competing at the highest global level. Expect excellence." },
                  { icon: "🚀", title: "Global Shipping", desc: "USA, Canada, UK, Europe — wherever the diaspora lives, we ship there." },
                ].map(f => (
                  <div key={f.title} className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                      style={{background:'rgba(252,209,22,0.1)', border:'1px solid rgba(252,209,22,0.2)'}}>
                      {f.icon}
                    </div>
                    <div>
                      <p className="font-black text-white text-sm">{f.title}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl opacity-30 blur-2xl"
                style={{background:'linear-gradient(135deg,#FCD116,#006B3F)'}} />
              <img
                src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=700&fit=crop"
                alt="African fitness"
                className="relative rounded-3xl w-full object-cover shadow-2xl"
                style={{height:'420px'}}
              />
              <div className="absolute bottom-6 left-6 right-6 glass rounded-2xl p-4">
                <p className="text-white font-black text-sm">🏃 African Athletes Dominate</p>
                <p className="text-gray-400 text-xs mt-1">From Kenyan marathons to Nigerian boxing — Africa sets the standard.</p>
              </div>
            </div>
          </div>
          <div className="section-divider mt-12" />
        </div>
      </div>

      {/* ══════════════════ CTA ══════════════════ */}
      <div className="bg-gray-950 py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <p className="text-gray-500 text-xs uppercase tracking-widest mb-3">Also on Afrizone</p>
          <h2 className="bebas text-5xl text-white mb-2">
            SHOP <span style={{color:'#FCD116'}}>AFRICAN PRODUCTS</span>
          </h2>
          <p className="text-gray-500 mb-4 text-sm">Food · Fashion · Beauty · Art from African sellers</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="/" className="buy-btn text-black font-black text-base px-8 py-3.5 rounded-2xl">
              🌍 Explore Afrizone Shop
            </Link>
            <Link href="/jerseys" className="glass text-white font-bold text-base px-8 py-3.5 rounded-2xl hover:bg-white/10 transition-colors">
              ⚽ World Cup Jerseys
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
