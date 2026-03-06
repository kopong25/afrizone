import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuth } from "../../pages/_app";
import { ordersAPI } from "../../lib/api";
import { FiShoppingCart, FiUser, FiMenu, FiX, FiSearch } from "react-icons/fi";

export default function Navbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (user) {
      ordersAPI.cart().then((res) => setCartCount(res.data.length)).catch(() => {});
    }
  }, [user]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) {
      window.location.href = `/?q=${encodeURIComponent(search)}`;
    }
  };

  return (
    <nav className="bg-green-900 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <span className="text-gold-500 font-black text-2xl tracking-tight">AFRIZONE</span>
          </Link>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl">
            <div className="flex w-full rounded-lg overflow-hidden">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search African products, stores..."
                className="flex-1 px-4 py-2 text-gray-900 text-sm focus:outline-none"
              />
              <button type="submit" className="bg-gold-500 hover:bg-gold-400 px-4 py-2 text-green-900">
                <FiSearch size={18} />
              </button>
            </div>
          </form>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/" className="text-sm hover:text-gold-300 transition-colors">Shop</Link>
            <Link href="/stores" className="text-sm hover:text-gold-300 transition-colors">Stores</Link>

            {user ? (
              <>
                {(user.role === "seller" || user.role === "admin") && (
                  <Link href="/seller/dashboard" className="text-sm bg-gold-500 text-green-900 px-3 py-1.5 rounded-lg font-semibold hover:bg-gold-400">
                    Dashboard
                  </Link>
                )}
                {user.role === "admin" && (
                  <Link href="/admin/dashboard" className="text-sm bg-white text-green-900 px-3 py-1.5 rounded-lg font-semibold">
                    Admin
                  </Link>
                )}
                <Link href="/cart" className="relative">
                  <FiShoppingCart size={22} />
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-gold-500 text-green-900 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </Link>
                <div className="relative group">
                  <button className="flex items-center gap-1 text-sm">
                    <FiUser size={18} />
                    <span className="max-w-[100px] truncate">{user.full_name.split(" ")[0]}</span>
                  </button>
                  <div className="absolute right-0 top-full mt-1 bg-white text-gray-800 rounded-lg shadow-lg py-2 min-w-[160px] hidden group-hover:block">
                    <Link href="/orders" className="block px-4 py-2 text-sm hover:bg-gray-50">My Orders</Link>
                    <Link href="/profile" className="block px-4 py-2 text-sm hover:bg-gray-50">Profile</Link>
                    <button onClick={logout} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50">
                      Sign Out
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm hover:text-gold-300">Sign In</Link>
                <Link href="/register" className="text-sm bg-gold-500 text-green-900 px-4 py-2 rounded-lg font-semibold hover:bg-gold-400">
                  Join Free
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden">
            {menuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 border-t border-green-800 mt-2 pt-4 space-y-2">
            <form onSubmit={handleSearch} className="flex mb-3">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="flex-1 px-3 py-2 rounded-l-lg text-gray-900 text-sm focus:outline-none"
              />
              <button type="submit" className="bg-gold-500 text-green-900 px-3 rounded-r-lg">
                <FiSearch />
              </button>
            </form>
            <Link href="/" className="block py-2 text-sm" onClick={() => setMenuOpen(false)}>Shop</Link>
            <Link href="/stores" className="block py-2 text-sm" onClick={() => setMenuOpen(false)}>Stores</Link>
            {user ? (
              <>
                <Link href="/cart" className="block py-2 text-sm" onClick={() => setMenuOpen(false)}>Cart ({cartCount})</Link>
                <Link href="/orders" className="block py-2 text-sm" onClick={() => setMenuOpen(false)}>My Orders</Link>
                {user.role !== "buyer" && (
                  <Link href="/seller/dashboard" className="block py-2 text-sm font-semibold text-gold-300" onClick={() => setMenuOpen(false)}>Seller Dashboard</Link>
                )}
                <button onClick={logout} className="block py-2 text-sm text-red-400">Sign Out</button>
              </>
            ) : (
              <>
                <Link href="/login" className="block py-2 text-sm" onClick={() => setMenuOpen(false)}>Sign In</Link>
                <Link href="/register" className="block py-2 text-sm font-semibold text-gold-300" onClick={() => setMenuOpen(false)}>Join Free</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
