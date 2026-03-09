import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "../../pages/_app";
import { ordersAPI, productsAPI } from "../../lib/api";
import { FiShoppingCart, FiUser, FiMenu, FiX, FiSearch, FiPackage, FiLogOut, FiSettings, FiMessageSquare, FiGift } from "react-icons/fi";

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [cartCount, setCartCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (user) {
      ordersAPI.cart().then((r) => setCartCount(r.data.length)).catch(() => {});
    }
  }, [user]);

  // Search autocomplete
  useEffect(() => {
    if (searchQ.length < 2) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await productsAPI.list({ q: searchQ, size: 5 });
        setSuggestions(res.data.items || []);
        setShowSuggestions(true);
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQ]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQ.trim()) {
      router.push(`/?q=${encodeURIComponent(searchQ)}`);
      setShowSuggestions(false);
    }
  };

  return (
    <nav className="bg-green-900 text-white sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="font-black text-xl text-yellow-400 flex-shrink-0 tracking-tight">
          AFRIZONE
        </Link>

        {/* Search bar */}
        <div className="flex-1 max-w-xl relative hidden md:block">
          <form onSubmit={handleSearch} className="flex">
            <input
              type="text"
              placeholder="Search African products, stores..."
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="flex-1 bg-white text-gray-900 px-4 py-2 rounded-l-lg focus:outline-none text-sm"
            />
            <button type="submit" className="bg-yellow-500 hover:bg-yellow-400 px-4 rounded-r-lg transition-colors">
              <FiSearch className="text-green-900" size={18} />
            </button>
          </form>
          {/* Autocomplete dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white rounded-xl shadow-xl mt-1 overflow-hidden z-50 border">
              {suggestions.map((p) => (
                <Link key={p.id} href={`/products/${p.slug}`}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {p.images?.[0]
                      ? <img src={p.images[0]} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-lg">🛒</div>
                    }
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{p.name}</p>
                    <p className="text-xs text-green-700 font-semibold">${p.price.toFixed(2)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right nav */}
        <div className="flex items-center gap-3 ml-auto">
          <Link href="/" className="hidden md:block text-sm text-green-200 hover:text-white transition-colors">Shop</Link>
          <Link href="/stores" className="hidden md:block text-sm text-green-200 hover:text-white transition-colors">Stores</Link>

          {user ? (
            <>
              {/* Cart */}
              <Link href="/cart" className="relative p-2 hover:bg-green-800 rounded-lg transition-colors">
                <FiShoppingCart size={20} />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-yellow-400 text-green-900 text-xs font-black w-5 h-5 rounded-full flex items-center justify-center">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </Link>

              {/* User menu */}
              <div className="relative">
                <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 hover:bg-green-800 rounded-lg px-2 py-1.5 transition-colors">
                  <div className="w-7 h-7 bg-yellow-400 rounded-full flex items-center justify-center text-green-900 font-black text-sm">
                    {user.full_name?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm hidden md:block max-w-[100px] truncate">{user.full_name?.split(" ")[0]}</span>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl w-52 overflow-hidden z-50 border">
                    <div className="px-4 py-3 border-b bg-gray-50">
                      <p className="text-sm font-bold text-gray-800">{user.full_name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                      <span className="inline-block mt-1 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full capitalize">{user.role}</span>
                    </div>
                    <div className="py-1">
                      <Link href="/orders" onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                        <FiPackage size={15} /> My Orders
                      </Link>
                      <Link href="/cart" onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                        <FiShoppingCart size={15} /> Cart {cartCount > 0 && <span className="ml-auto bg-yellow-400 text-green-900 text-xs font-bold px-1.5 rounded-full">{cartCount}</span>}
                      </Link>
                      <Link href="/referral" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              <FiGift size={14} /> Referral Program
            </Link>
            <Link href="/messages"
              className="text-gray-300 hover:text-white transition-colors text-sm flex items-center gap-1">
              <FiMessageSquare size={16}/> Messages
            </Link>
            <Link
              href="/wishlist" onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                        ❤️ Wishlist
                      </Link>
                      {(user.role === "seller" || user.role === "admin") && (
                        <Link href="/seller/dashboard" onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                          <FiSettings size={15} /> Seller Dashboard
                        </Link>
                      )}
                      {user.role === "admin" && (
                        <Link href="/admin/dashboard" onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                          <FiSettings size={15} /> Admin Panel
                        </Link>
                      )}
                      <div className="border-t mt-1">
                        <button onClick={() => { logout(); setUserMenuOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                          <FiLogOut size={15} /> Sign Out
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="text-sm text-green-200 hover:text-white px-3 py-1.5 transition-colors">Sign In</Link>
              <Link href="/register" className="bg-yellow-500 hover:bg-yellow-400 text-green-900 font-bold px-4 py-1.5 rounded-lg text-sm transition-colors">
                Join Free
              </Link>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 hover:bg-green-800 rounded-lg">
            {mobileOpen ? <FiX size={20} /> : <FiMenu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-green-800 border-t border-green-700 px-4 py-4 space-y-3">
          <form onSubmit={handleSearch} className="flex">
            <input type="text" placeholder="Search..." value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              className="flex-1 bg-white text-gray-900 px-3 py-2 rounded-l-lg text-sm focus:outline-none" />
            <button type="submit" className="bg-yellow-500 px-3 rounded-r-lg"><FiSearch className="text-green-900" /></button>
          </form>
          <Link href="/" className="block text-sm py-2 hover:text-yellow-400" onClick={() => setMobileOpen(false)}>🏪 Shop</Link>
          <Link href="/stores" className="block text-sm py-2 hover:text-yellow-400" onClick={() => setMobileOpen(false)}>🏬 Stores</Link>
          {user ? (
            <>
              <Link href="/cart" className="block text-sm py-2 hover:text-yellow-400" onClick={() => setMobileOpen(false)}>🛒 Cart ({cartCount})</Link>
              <Link href="/orders" className="block text-sm py-2 hover:text-yellow-400" onClick={() => setMobileOpen(false)}>📦 My Orders</Link>
              {user.role === "seller" && <Link href="/seller/dashboard" className="block text-sm py-2 hover:text-yellow-400" onClick={() => setMobileOpen(false)}>📊 Seller Dashboard</Link>}
              <button onClick={logout} className="block text-sm py-2 text-red-300 hover:text-red-200 w-full text-left">Sign Out</button>
            </>
          ) : (
            <>
              <Link href="/login" className="block text-sm py-2" onClick={() => setMobileOpen(false)}>Sign In</Link>
              <Link href="/register" className="block text-sm py-2 text-yellow-400 font-bold" onClick={() => setMobileOpen(false)}>Join Free →</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}