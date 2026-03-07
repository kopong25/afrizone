import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import ProductCard from "../components/ui/ProductCard";
import { wishlistAPI } from "../lib/api";
import { useAuth } from "./_app";
import toast from "react-hot-toast";
import { FiHeart, FiShoppingBag } from "react-icons/fi";

export default function WishlistPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    wishlistAPI.get()
      .then((r) => setItems(Array.isArray(r.data) ? r.data : []))
      .catch(() => toast.error("Failed to load wishlist"))
      .finally(() => setLoading(false));
  }, [user]);

  const removeFromWishlist = async (productId) => {
    await wishlistAPI.toggle(productId);
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
    toast.success("Removed from wishlist");
  };

  return (
    <>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <FiHeart className="text-red-500" /> Wishlist
            {items.length > 0 && <span className="text-gray-400 font-normal text-lg">({items.length})</span>}
          </h1>
          <Link href="/" className="btn-secondary py-2 px-4 text-sm">Continue Shopping</Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <div key={i} className="h-64 bg-gray-200 rounded-2xl animate-pulse" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <FiHeart size={64} className="mx-auto text-gray-200 mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">Your wishlist is empty</h2>
            <p className="text-gray-500 mb-6">Save products you love by clicking the heart icon</p>
            <Link href="/" className="btn-primary py-3 px-8">Discover Products</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item) => (
              <ProductCard
                key={item.id}
                product={item.product}
                wishlisted={true}
                onWishlist={() => removeFromWishlist(item.product.id)}
              />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}