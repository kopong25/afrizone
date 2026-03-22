import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";

const AFRICAN_TEAMS = [
  { country: "Ghana", flag: "🇬🇭", nickname: "Black Stars", kit_maker: "Puma", accent: "#FCD116", bg: "from-[#006B3F] to-[#003d1f]", image: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=600&h=700&fit=crop", price: "$89.99", description: "5th World Cup. The Black Stars shine gold.", hot: true },
  { country: "Morocco", flag: "🇲🇦", nickname: "Atlas Lions", kit_maker: "Puma", accent: "#C1272D", bg: "from-[#C1272D] to-[#7a0000]", image: "https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?w=600&h=700&fit=crop", price: "$89.99", description: "Qatar 2022 semi-finalists. Africa's pride.", hot: true },
  { country: "Senegal", flag: "🇸🇳", nickname: "Lions of Teranga", kit_maker: "Puma", accent: "#FDEF42", bg: "from-[#00853F] to-[#004d24]", image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=600&h=700&fit=crop", price: "$89.99", description: "AFCON Champions. Mané's nation.", hot: true },
  { country: "Egypt", flag: "🇪🇬", nickname: "Pharaohs", kit_maker: "Adidas", accent: "#CE1126", bg: "from-[#CE1126] to-[#800000]", image: "https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=600&h=700&fit=crop", price: "$84.99", description: "Salah leads the Pharaohs. 7x AFCON winners.", hot: true },
  { country: "Algeria", flag: "🇩🇿", nickname: "Desert Foxes", kit_maker: "Adidas", accent: "#006233", bg: "from-[#006233] to-[#003d1f]", image: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=600&h=700&fit=crop", price: "$84.99", description: "AFCON 2019 Champions. Iconic white.", hot: false },
  { country: "Côte d'Ivoire", flag: "🇨🇮", nickname: "The Elephants", kit_maker: "Nike", accent: "#F77F00", bg: "from-[#F77F00] to-[#b35a00]", image: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&h=700&fit=crop", price: "$89.99", description: "AFCON 2024 Champions. Unstoppable.", hot: true },
  { country: "South Africa", flag: "🇿🇦", nickname: "Bafana Bafana", kit_maker: "Nike", accent: "#FFB612", bg: "from-[#007A4D] to-[#004d30]", image: "https://images.unsplash.com/photo-1540747913346-19212a4a691f?w=600&h=700&fit=crop", price: "$84.99", description: "The Rainbow Nation returns to the world stage.", hot: false },
  { country: "Tunisia", flag: "🇹🇳", nickname: "Eagles of Carthage", kit_maker: "Kappa", accent: "#E70013", bg: "from-[#E70013] to-[#900010]", image: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=600&h=700&fit=crop", price: "$79.99", description: "North Africa's Eagles. 6th World Cup.", hot: false },
  { country: "Cabo Verde", flag: "🇨🇻", nickname: "Blue Sharks", kit_maker: "Macron", accent: "#003893", bg: "from-[#003893] to-[#001f5c]", image: "https://images.unsplash.com/photo-1606925797300-0b35e9d1794e?w=600&h=700&fit=crop", price: "$74.99", description: "Historic debut. The Blue Sharks make history!", hot: true },
];

const WORLD_TEAMS = [
  { country: "Brazil", flag: "🇧🇷", accent: "#009C3B", price: "$94.99", hot: true },
  { country: "Argentina", flag: "🇦🇷", accent: "#74ACDF", price: "$94.99", hot: true },
  { country: "France", flag: "🇫🇷", accent: "#002395", price: "$94.99", hot: true },
  { country: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", accent: "#CF081F", price: "$89.99", hot: true },
  { country: "Spain", flag: "🇪🇸", accent: "#AA151B", price: "$89.99", hot: false },
  { country: "Germany", flag: "🇩🇪", accent: "#000000", price: "$89.99", hot: false },
  { country: "Portugal", flag: "🇵🇹", accent: "#006600", price: "$89.99", hot: true },
  { country: "Netherlands", flag: "🇳🇱", accent: "#FF6600", price: "$89.99", hot: false },
  { country: "USA", flag: "🇺🇸", accent: "#002868", price: "$84.99", hot: true },
  { country: "Mexico", flag: "🇲🇽", accent: "#006847", price: "$84.99", hot: false },
  { country: "Canada", flag: "🇨🇦", accent: "#FF0000", price: "$84.99", hot: false },
  { country: "Japan", flag: "🇯🇵", accent: "#BC002D", price: "$84.99", hot: false },
  { country: "Colombia", flag: "🇨🇴", accent: "#FCD116", price: "$84.99", hot: false },
  { country: "Uruguay", flag: "🇺🇾", accent: "#75AADB", price: "$79.99", hot: false },
  { country: "Belgium", flag: "🇧🇪", accent: "#EF3340", price: "$84.99", hot: false },
  { country: "Croatia", flag: "🇭🇷", accent: "#FF0000", price: "$84.99", hot: false },
  { country: "Switzerland", flag: "🇨🇭", accent: "#FF0000", price: "$79.99", hot: false },
  { country: "Serbia", flag: "🇷🇸", accent: "#C6363C", price: "$79.99", hot: false },
  { country: "Ecuador", flag: "🇪🇨", accent: "#FFD100", price: "$79.99", hot: false },
  { country: "Qatar", flag: "🇶🇦", accent: "#8D1B3D", price: "$79.99", hot: false },
  { country: "Saudi Arabia", flag: "🇸🇦", accent: "#006C35", price: "$79.99", hot: false },
  { country: "Australia", flag: "🇦🇺", accent: "#00843D", price: "$79.99", hot: false },
  { country: "South Korea", flag: "🇰🇷", accent: "#CD2E3A", price: "$84.99", hot: false },
  { country: "Iran", flag: "🇮🇷", accent: "#239F40", price: "$74.99", hot: false },
  { country: "Poland", flag: "🇵🇱", accent: "#DC143C", price: "$79.99", hot: false },
  { country: "Denmark", flag: "🇩🇰", accent: "#C60C30", price: "$79.99", hot: false },
  { country: "Austria", flag: "🇦🇹", accent: "#ED2939", price: "$79.99", hot: false },
  { country: "Ukraine", flag: "🇺🇦", accent: "#005BBB", price: "$79.99", hot: false },
  { country: "Turkey", flag: "🇹🇷", accent: "#E30A17", price: "$79.99", hot: false },
  { country: "Hungary", flag: "🇭🇺", accent: "#CE2939", price: "$74.99", hot: false },
  { country: "Slovakia", flag: "🇸🇰", accent: "#0B4EA2", price: "$74.99", hot: false },
  { country: "Scotland", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", accent: "#003087", price: "$74.99", hot: false },
  { country: "Peru", flag: "🇵🇪", accent: "#D91023", price: "$74.99", hot: false },
  { country: "Chile", flag: "🇨🇱", accent: "#D52B1E", price: "$74.99", hot: false },
  { country: "Paraguay", flag: "🇵🇾", accent: "#D52B1E", price: "$74.99", hot: false },
  { country: "Bolivia", flag: "🇧🇴", accent: "#D52B1E", price: "$74.99", hot: false },
  { country: "Venezuela", flag: "🇻🇪", accent: "#CF142B", price: "$74.99", hot: false },
  { country: "New Zealand", flag: "🇳🇿", accent: "#00247D", price: "$74.99", hot: false },
  { country: "China", flag: "🇨🇳", accent: "#DE2910", price: "$79.99", hot: false },
];

const CLUB_STARS = [
  { club: "Liverpool FC", star: "Mohamed Salah", country: "Egypt", flag: "🇪🇬", kit_maker: "Nike", accent: "#C8102E", price: "$89.99", image: "https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=500&h=600&fit=crop", description: "Egypt's King. Wear Salah's red.", hot: true },
  { club: "Real Madrid", star: "Vinícius Jr.", country: "Brazil", flag: "🇧🇷", kit_maker: "Adidas", accent: "#FEBE10", price: "$94.99", image: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=500&h=600&fit=crop", description: "Champions League royalty. Pure white.", hot: true },
  { club: "Inter Miami", star: "Lionel Messi", country: "Argentina", flag: "🇦🇷", kit_maker: "Adidas", accent: "#F7B5CD", price: "$99.99", image: "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=500&h=600&fit=crop", description: "GOAT in the USA. Pink is the new legend.", hot: true },
  { club: "Manchester City", star: "Riyad Mahrez", country: "Algeria", flag: "🇩🇿", kit_maker: "Puma", accent: "#6CABDD", price: "$89.99", image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500&h=600&fit=crop", description: "Sky blue dominance. Algeria's finest.", hot: false },
  { club: "Arsenal FC", star: "Thomas Partey", country: "Ghana", flag: "🇬🇭", kit_maker: "Adidas", accent: "#EF0107", price: "$89.99", image: "https://images.unsplash.com/photo-1551958219-acbc685b4cd6?w=500&h=600&fit=crop", description: "Ghana's Gunner. North London red.", hot: true },
  { club: "Bayern Munich", star: "Sadio Mané", country: "Senegal", flag: "🇸🇳", kit_maker: "Adidas", accent: "#DC052D", price: "$94.99", image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=500&h=600&fit=crop", description: "Bundesliga with a Senegalese heart.", hot: false },
  { club: "Chelsea FC", star: "Nicolas Jackson", country: "Senegal", flag: "🇸🇳", kit_maker: "Nike", accent: "#034694", price: "$89.99", image: "https://images.unsplash.com/photo-1540747913346-19212a4a691f?w=500&h=600&fit=crop", description: "Senegal's rising star in blue.", hot: false },
  { club: "Paris Saint-Germain", star: "Achraf Hakimi", country: "Morocco", flag: "🇲🇦", kit_maker: "Nike", accent: "#004170", price: "$94.99", image: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=500&h=600&fit=crop", description: "Morocco's heartbeat in Paris.", hot: true },
];

const FANATICS_URL = "https://www.fanatics.com";

export default function JerseysPage() {
  const [section, setSection] = useState("africa");
  const [worldFilter, setWorldFilter] = useState("all");

  const filteredWorld = worldFilter === "hot"
    ? WORLD_TEAMS.filter(t => t.hot)
    : WORLD_TEAMS;

  return (
    <>
      <Head>
        <title>World Cup 2026 Jerseys + Club Kits | Afrizone Shop</title>
        <meta name="description" content="Official FIFA World Cup 2026 jerseys for all 48 nations + African star club kits. Ghana, Morocco, Senegal, Brazil, Argentina and more. Ships worldwide." />
        <meta property="og:title" content="World Cup 2026 Jerseys — Africa & Beyond | Afrizone" />
        <meta property="og:description" content="9 African nations. 48 World Cup teams. African stars' club kits. All in one place." />
      </Head>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;700;900&family=Inter:wght@400;600;700&display=swap');
        .bebas { font-family: 'Bebas Neue', sans-serif; letter-spacing: 2px; }
        .barlow { font-family: 'Barlow Condensed', sans-serif; }
        .hero-bg {
          background: linear-gradient(135deg, #050505 0%, #0d1117 40%, #0f1f0f 70%, #1a0a00 100%);
          position: relative; overflow: hidden;
        }
        .hero-bg::before {
          content: '';
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse at 15% 50%, rgba(252,209,22,0.12) 0%, transparent 55%),
            radial-gradient(ellipse at 85% 20%, rgba(0,107,63,0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 90%, rgba(206,17,38,0.1) 0%, transparent 50%);
        }
        .kit-card { transition: transform 0.3s cubic-bezier(.34,1.56,.64,1), box-shadow 0.3s ease; }
        .kit-card:hover { transform: translateY(-10px) scale(1.02); box-shadow: 0 32px 64px rgba(0,0,0,0.5); }
        .buy-btn { background: linear-gradient(135deg,#FCD116,#f5a623); transition: all 0.2s ease; }
        .buy-btn:hover { background: linear-gradient(135deg,#f5a623,#d4820a); transform: scale(1.04); }
        .hot-badge { animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
        .img-overlay { background: linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.3) 55%, transparent 100%); }
        .stripe { background: repeating-linear-gradient(-55deg, transparent, transparent 10px, rgba(255,255,255,0.025) 10px, rgba(255,255,255,0.025) 20px); }
        .tab-active { background: #FCD116; color: #000; }
        .tab-inactive { background: rgba(255,255,255,0.08); color: #fff; }
        .tab-inactive:hover { background: rgba(255,255,255,0.15); }
        .world-row { transition: background 0.15s ease; }
        .world-row:hover { background: rgba(255,255,255,0.05); }
        .section-pill { border: 2px solid rgba(255,255,255,0.1); }
        .section-pill.active { border-color: #FCD116; background: rgba(252,209,22,0.1); }
        .glass { background: rgba(255,255,255,0.05); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.1); }
      `}</style>

      <Navbar />

      {/* ══════════════════ HERO ══════════════════ */}
      <div className="hero-bg min-h-screen flex flex-col items-center justify-center text-white text-center px-4 py-24 relative">
        <div className="stripe absolute inset-0" />
        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-yellow-400 text-black text-xs font-black px-5 py-2 rounded-full mb-8 tracking-widest uppercase shadow-lg">
            ⚽ FIFA WORLD CUP 2026 · USA · CANADA · MEXICO
          </div>

          <h1 className="bebas text-8xl md:text-[10rem] leading-none mb-2">
            <span style={{color:'#FCD116'}}>THE</span>
            <br/>
            <span className="text-white">WORLD</span>
            <br/>
            <span style={{
              WebkitTextStroke: '2px #FCD116',
              color: 'transparent',
            }}>PLAYS</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-300 mb-2 barlow font-bold tracking-wider">
            AFRICA LEADS · THE WORLD FOLLOWS
          </p>
          <p className="text-gray-500 mb-10 max-w-lg mx-auto text-sm">
            Official kits for all 48 World Cup nations, 9 African teams, and your favourite African star's club jersey. One destination.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-10">
            {[["9","African Teams"],["48","Nations Total"],["8+","Club Stars"]].map(([n,l])=>(
              <div key={l} className="glass rounded-2xl py-5">
                <p className="bebas text-4xl" style={{color:'#FCD116'}}>{n}</p>
                <p className="text-xs text-gray-400 uppercase tracking-wider mt-1">{l}</p>
              </div>
            ))}
          </div>

          {/* Flag parade */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {AFRICAN_TEAMS.map(t=>(
              <span key={t.country} title={t.country}
                className="text-3xl hover:scale-150 transition-transform duration-200 cursor-default">{t.flag}</span>
            ))}
            <span className="text-gray-600 text-3xl mx-2">·</span>
            {["🇧🇷","🇦🇷","🇫🇷","🏴󠁧󠁢󠁥󠁮󠁧󠁿","🇵🇹","🇪🇸","🇺🇸","🇲🇽"].map(f=>(
              <span key={f} className="text-3xl hover:scale-150 transition-transform duration-200 cursor-default opacity-60">{f}</span>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 justify-center">
            <button onClick={()=>{setSection("africa"); document.getElementById("kits")?.scrollIntoView({behavior:"smooth"});}}
              className="buy-btn text-black font-black text-base px-8 py-3.5 rounded-2xl shadow-xl">
              🌍 African Kits
            </button>
            <button onClick={()=>{setSection("world"); document.getElementById("kits")?.scrollIntoView({behavior:"smooth"});}}
              className="glass text-white font-bold text-base px-8 py-3.5 rounded-2xl hover:bg-white/10 transition-colors">
              ⚽ All 48 Nations
            </button>
            <button onClick={()=>{setSection("clubs"); document.getElementById("kits")?.scrollIntoView({behavior:"smooth"});}}
              className="glass text-white font-bold text-base px-8 py-3.5 rounded-2xl hover:bg-white/10 transition-colors">
              ⭐ Club Kits
            </button>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/20 rounded-full flex items-start justify-center pt-2">
            <div className="w-1 h-3 bg-yellow-400 rounded-full"/>
          </div>
        </div>
      </div>

      {/* ══════════════════ MAIN CONTENT ══════════════════ */}
      <div id="kits" className="bg-gray-950 py-20 px-4">
        <div className="max-w-7xl mx-auto">

          {/* Section Tabs */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {[
              ["africa","🌍 African Nations (9)"],
              ["clubs","⭐ Club Kits — African Stars"],
              ["world","⚽ All 48 World Cup Teams"],
            ].map(([val,label])=>(
              <button key={val} onClick={()=>setSection(val)}
                className={`section-pill px-6 py-3 rounded-2xl font-bold text-sm transition-all ${section===val?"active text-yellow-400":"text-gray-400 hover:text-white"}`}>
                {label}
              </button>
            ))}
          </div>

          {/* ── AFRICAN NATIONS ── */}
          {section === "africa" && (
            <>
              <div className="text-center mb-10">
                <h2 className="bebas text-6xl md:text-8xl text-white">
                  AFRICA <span style={{color:'#FCD116'}}>RISES</span>
                </h2>
                <p className="text-gray-400 mt-2">9 nations. One continent. Own their story.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {AFRICAN_TEAMS.map(team=>(
                  <div key={team.country} className="kit-card rounded-3xl overflow-hidden bg-gray-900 border border-white/10">
                    <div className="relative h-72 overflow-hidden">
                      <div className={`absolute inset-0 bg-gradient-to-br ${team.bg} opacity-80`}/>
                      <img src={team.image} alt={`${team.country} World Cup 2026 Jersey`} className="w-full h-full object-cover mix-blend-overlay"/>
                      <div className="img-overlay absolute inset-0"/>
                      {team.hot && <div className="hot-badge absolute top-4 right-4 bg-red-500 text-white text-xs font-black px-3 py-1 rounded-full">🔥 HOT</div>}
                      <div className="absolute top-4 left-4 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded-lg">{team.kit_maker}</div>
                      <div className="absolute bottom-0 left-0 right-0 p-5">
                        <div className="flex items-center gap-3">
                          <span className="text-4xl">{team.flag}</span>
                          <div>
                            <h3 className="bebas text-3xl text-white leading-none">{team.country}</h3>
                            <p className="text-xs text-gray-300">{team.nickname}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-5">
                      <p className="text-gray-400 text-sm mb-4">{team.description}</p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider">From</p>
                          <p className="text-2xl font-black text-white">{team.price}</p>
                        </div>
                        <a href={FANATICS_URL} target="_blank" rel="noopener noreferrer"
                          className="buy-btn text-black font-black px-6 py-3 rounded-xl text-sm">
                          Buy Kit ⚽
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── CLUB KITS ── */}
          {section === "clubs" && (
            <>
              <div className="text-center mb-10">
                <h2 className="bebas text-6xl md:text-8xl text-white">
                  AFRICAN <span style={{color:'#FCD116'}}>STARS</span>
                </h2>
                <p className="text-gray-400 mt-2">Your hero's club kit. Year-round. Worldwide.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {CLUB_STARS.map(s=>(
                  <div key={s.club} className="kit-card rounded-3xl overflow-hidden bg-gray-900 border border-white/10">
                    <div className="relative h-56 overflow-hidden">
                      <div className="absolute inset-0" style={{background:`linear-gradient(135deg, ${s.accent}cc, ${s.accent}44)`}}/>
                      <img src={s.image} alt={`${s.star} ${s.club} jersey`} className="w-full h-full object-cover mix-blend-overlay opacity-80"/>
                      <div className="img-overlay absolute inset-0"/>
                      {s.hot && <div className="hot-badge absolute top-3 right-3 bg-red-500 text-white text-xs font-black px-2 py-0.5 rounded-full">🔥</div>}
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{s.flag}</span>
                          <div>
                            <p className="font-black text-white text-sm leading-tight">{s.star}</p>
                            <p className="text-xs text-gray-300">{s.club}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-gray-400 text-xs mb-3">{s.description}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-xl font-black text-white">{s.price}</p>
                        <a href={FANATICS_URL} target="_blank" rel="noopener noreferrer"
                          className="buy-btn text-black font-black px-4 py-2 rounded-xl text-xs">
                          Buy ⭐
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-10 glass rounded-2xl p-5 text-center">
                <p className="text-yellow-400 font-bold mb-1">💡 Pro Tip</p>
                <p className="text-gray-400 text-sm">Club jerseys sell year-round — not just every 4 years. These are your biggest revenue opportunity.</p>
              </div>
            </>
          )}

          {/* ── ALL 48 WORLD TEAMS ── */}
          {section === "world" && (
            <>
              <div className="text-center mb-10">
                <h2 className="bebas text-6xl md:text-8xl text-white">
                  ALL <span style={{color:'#FCD116'}}>48</span> NATIONS
                </h2>
                <p className="text-gray-400 mt-2">Every World Cup 2026 team. One place.</p>
                <div className="flex justify-center gap-3 mt-5">
                  {[["all","All Teams"],["hot","🔥 Most Popular"]].map(([v,l])=>(
                    <button key={v} onClick={()=>setWorldFilter(v)}
                      className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${worldFilter===v?"tab-active":"tab-inactive"}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* African teams first */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-yellow-400/30"/>
                  <span className="text-yellow-400 font-black text-sm uppercase tracking-widest">🌍 African Nations</span>
                  <div className="h-px flex-1 bg-yellow-400/30"/>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {AFRICAN_TEAMS.map(t=>(
                    <a key={t.country} href={FANATICS_URL} target="_blank" rel="noopener noreferrer"
                      className="world-row glass rounded-2xl p-4 flex items-center gap-3 group">
                      <span className="text-3xl">{t.flag}</span>
                      <div className="min-w-0">
                        <p className="font-bold text-white text-sm truncate group-hover:text-yellow-400 transition-colors">{t.country}</p>
                        <p className="text-xs text-gray-500">{t.price}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>

              {/* Rest of the world */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-white/10"/>
                  <span className="text-gray-500 font-black text-sm uppercase tracking-widest">⚽ Rest of the World</span>
                  <div className="h-px flex-1 bg-white/10"/>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {filteredWorld.map(t=>(
                    <a key={t.country} href={FANATICS_URL} target="_blank" rel="noopener noreferrer"
                      className="world-row glass rounded-2xl p-4 flex items-center gap-3 group">
                      <span className="text-3xl">{t.flag}</span>
                      <div className="min-w-0">
                        <p className="font-bold text-white text-sm truncate group-hover:text-yellow-400 transition-colors">{t.country}</p>
                        <p className="text-xs text-gray-500">{t.price}</p>
                        {t.hot && <span className="text-xs text-red-400">🔥</span>}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Affiliate disclosure */}
          <div className="glass rounded-2xl p-4 mt-14 text-center text-gray-500 text-xs max-w-2xl mx-auto">
            🤝 <strong className="text-gray-400">Affiliate Disclosure:</strong> Afrizone earns a commission on purchases through our links at no extra cost to you. We only partner with officially licensed retailers.
          </div>
        </div>
      </div>

      {/* ══════════════════ WORLD CUP TICKET SECTION ══════════════════ */}
      <div className="bg-gray-950 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-gray-500 text-xs uppercase tracking-widest mb-2">The Biggest Event on Earth</p>
            <h2 className="bebas text-5xl md:text-7xl text-white">YOUR <span style={{color:'#FCD116'}}>TICKET</span> TO THE GAME</h2>
            <p className="text-gray-400 mt-2 text-sm">Final Match · 19 July 2026 · New York / New Jersey</p>
          </div>

          {/* Ticket Card */}
          <div className="relative max-w-2xl mx-auto group">
            {/* Glow effect */}
            <div className="absolute -inset-1 rounded-3xl opacity-50 blur-xl group-hover:opacity-80 transition-opacity"
              style={{background:'linear-gradient(135deg,#FCD116,#006B3F,#C1272D)'}}/>

            {/* Ticket body */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl"
              style={{background:'linear-gradient(135deg,#1a1a1a 0%,#2a2a2a 100%)'}}>

              {/* Top stripe */}
              <div className="h-2 w-full" style={{background:'linear-gradient(90deg,#FCD116,#006B3F,#C1272D,#FCD116)'}}/>

              <div className="flex">
                {/* Main ticket body */}
                <div className="flex-1 p-8">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <p className="text-yellow-400 font-black text-xs uppercase tracking-widest mb-1">FIFA</p>
                      <h3 className="bebas text-4xl text-white leading-none">WORLD CUP</h3>
                      <h3 className="bebas text-5xl leading-none" style={{color:'#FCD116'}}>2026™</h3>
                    </div>
                    <div className="text-right">
                      <div className="bg-yellow-400 text-black text-xs font-black px-3 py-1 rounded-full mb-2">FINAL MATCH</div>
                      <p className="text-gray-400 text-xs">New York / New Jersey</p>
                    </div>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {[
                      ["DATE","19 JULY 2026"],
                      ["VENUE","MetLife Stadium"],
                      ["EVENT","FIFA World Cup Final"],
                      ["NATIONS","48 Teams · 9 African"],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <p className="text-gray-600 text-xs uppercase tracking-widest font-bold">{label}</p>
                        <p className="text-white font-bold text-sm mt-0.5">{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* African flags row */}
                  <div className="flex items-center gap-2 mb-6">
                    <p className="text-gray-600 text-xs uppercase tracking-wider">Africa Represented:</p>
                    <div className="flex gap-1 text-lg">
                      {["🇬🇭","🇲🇦","🇸🇳","🇪🇬","🇨🇮","🇿🇦","🇩🇿","🇹🇳","🇨🇻"].map(f=>(
                        <span key={f}>{f}</span>
                      ))}
                    </div>
                  </div>

                  {/* CTA */}
                  <a href="#kits" onClick={e=>{e.preventDefault(); document.getElementById("kits")?.scrollIntoView({behavior:"smooth"})}}
                    className="buy-btn inline-flex items-center gap-2 text-black font-black px-8 py-3 rounded-2xl text-sm">
                    ⚽ Get Your Nation's Kit
                  </a>
                </div>

                {/* Tear strip */}
                <div className="w-px bg-gray-600 my-4 border-dashed border-l-2 border-gray-700 mx-0" style={{
                  backgroundImage:'repeating-linear-gradient(to bottom,#444 0px,#444 8px,transparent 8px,transparent 14px)',
                  width:'2px'
                }}/>

                {/* Stub */}
                <div className="w-28 p-4 flex flex-col items-center justify-between"
                  style={{background:'rgba(252,209,22,0.05)'}}>
                  <div className="text-center">
                    <p className="bebas text-yellow-400 text-2xl leading-none">26</p>
                    <p className="text-gray-500 text-xs">FIFA WC</p>
                  </div>
                  {/* Barcode simulation */}
                  <div className="flex gap-px items-end my-2">
                    {[3,5,2,7,4,6,3,5,4,6,3,7,5,3,6,4,5].map((h,i)=>(
                      <div key={i} className="bg-white w-0.5" style={{height:`${h*4}px`}}/>
                    ))}
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500 text-xs">AFRIZONE</p>
                    <p className="text-gray-600 text-xs">SHOP</p>
                  </div>
                </div>
              </div>

              {/* Bottom stripe */}
              <div className="h-1 w-full" style={{background:'linear-gradient(90deg,#C1272D,#006B3F,#FCD116,#C1272D)'}}/>
            </div>
          </div>

          {/* Countdown urgency */}
          <div className="text-center mt-8">
            <p className="text-gray-500 text-sm">
              🗓 <span className="text-white font-bold">485 days</span> until the World Cup Final · July 19, 2026
            </p>
            <p className="text-gray-600 text-xs mt-1">Jerseys are selling fast. Don't miss out on your nation's kit.</p>
          </div>
        </div>
      </div>

      {/* ══════════════════ WHY AFRIZONE ══════════════════ */}
      <div className="py-16 px-4" style={{background:'linear-gradient(135deg,#006B3F,#004d2d)'}}>
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="bebas text-5xl md:text-7xl mb-8">WHY BUY THROUGH <span style={{color:'#FCD116'}}>AFRIZONE?</span></h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {icon:"✅",title:"100% Official",desc:"All kits licensed by FIFA and national federations. Authentic guaranteed."},
              {icon:"🌍",title:"Support Africa",desc:"Commission helps fund youth football programs across the continent."},
              {icon:"🚚",title:"Ships Worldwide",desc:"USA, Canada, UK, Europe — wherever your community is."},
            ].map(f=>(
              <div key={f.title} className="glass rounded-2xl p-6">
                <div className="text-4xl mb-3">{f.icon}</div>
                <h3 className="font-black text-lg mb-2">{f.title}</h3>
                <p className="text-green-200 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════ CTA ══════════════════ */}
      <div className="bg-gray-950 py-16 px-4 text-center border-t border-white/5">
        <p className="text-gray-500 text-xs uppercase tracking-widest mb-3">Also on Afrizone</p>
        <h2 className="bebas text-5xl text-white mb-4">SHOP <span style={{color:'#FCD116'}}>AFRICAN PRODUCTS</span></h2>
        <p className="text-gray-400 mb-8 text-sm">Food · Fashion · Beauty from African sellers across the USA</p>
        <Link href="/" className="buy-btn inline-flex items-center gap-2 text-black font-black text-lg px-10 py-4 rounded-2xl">
          🌍 Explore Afrizone Shop
        </Link>
      </div>

      <Footer />
    </>
  );
}
