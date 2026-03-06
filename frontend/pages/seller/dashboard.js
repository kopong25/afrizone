import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Navbar from "../../components/layout/Navbar";
import { storesAPI, productsAPI, ordersAPI, paymentsAPI } from "../../lib/api";
import { useAuth } from "../_app";
import toast from "react-hot-toast";
import Link from "next/link";
import { FiPackage, FiShoppingBag, FiDollarSign, FiStar, FiExternalLink, FiAlertCircle } from "react-icons/fi";

function StatCard({ icon, label, value, sub, color = "green" }) {
  const colors = {
    green: "bg-green-50 text-green-900",
    gold: "bg-yellow-50 text-yellow-700",
    blue: "bg-blue-50 text-blue-700",
    purple: "bg-purple-50 text-purple-700",
  };
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border">
      <div className={`inline-flex p-2 rounded-lg mb-3 ${colors[color]}`}>{icon}</div>
      <p className="text-2xl font-black text-gray-900">{value}</p>
      <p className="text-sm font-medium text-gray-600">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function SellerDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stripeStatus, setStripeStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login?redirect=/seller/dashboard");
    if (!authLoading && user && user.role === "buyer") router.push("/");
  }, [user, authLoading]);

  useEffect(() => {
    if (user && user.role !== "buyer") {
      Promise.all([
        storesAPI.myStore(),
        productsAPI.myProducts(),
        ordersAPI.sellerOrders({ size: 5 }),
        paymentsAPI.stripeStatus(),
      ]).then(([s, p, o, stripe]) => {
        setStore(s.data);
        setProducts(p.data);
        setOrders(o.data.items);
        setStripeStatus(stripe.data);
      }).catch(console.error).finally(() => setLoading(false));

      // Handle Stripe redirect
      if (router.query.stripe === "success") {
        toast.success("Stripe account connected! You can now receive payments.");
      }
    }
  }, [user]);

  const connectStripe = async () => {
    try {
      const res = await paymentsAPI.stripeConnect();
      window.location.href = res.data.onboarding_url;
    } catch {
      toast.error("Failed to start Stripe onboarding");
    }
  };

  if (authLoading || loading) return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-gray-200 rounded-xl" />)}
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Seller Dashboard</h1>
            <p className="text-gray-500 mt-1">
              {store?.name} ·{" "}
              <span className={`font-semibold ${store?.status === "approved" ? "text-green-600" : "text-yellow-600"}`}>
                {store?.status === "approved" ? "✅ Approved" : "⏳ Pending Approval"}
              </span>
            </p>
          </div>
          <Link href="/seller/products" className="btn-primary py-2 px-4 text-sm">
            + Add Product
          </Link>
        </div>

        {/* Stripe Alert */}
        {!stripeStatus?.connected && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <FiAlertCircle className="text-yellow-600 mt-0.5 flex-shrink-0" size={20} />
            <div>
              <p className="font-semibold text-yellow-800">Connect Stripe to receive payments</p>
              <p className="text-sm text-yellow-700 mt-1">
                You need to set up a Stripe account to receive payouts when customers buy your products.
              </p>
              <button onClick={connectStripe} className="mt-3 text-sm bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-500">
                Connect Stripe Account →
              </button>
            </div>
          </div>
        )}

        {/* Subscription Alert */}
        {store?.status === "approved" && store?.tier === "basic" && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div>
              <p className="font-semibold text-green-900">You're on the Basic plan (50 products max)</p>
              <p className="text-sm text-green-700">Upgrade to list more products and unlock premium features.</p>
            </div>
            <Link href="/pricing" className="btn-gold text-sm py-2 px-4">Upgrade Plan</Link>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={<FiPackage />} label="Total Products" value={products.length} color="green" />
          <StatCard icon={<FiShoppingBag />} label="Total Orders" value={store?.total_sales || 0} color="blue" />
          <StatCard icon={<FiDollarSign />} label="Total Revenue" value={`$${(store?.total_revenue || 0).toFixed(2)}`} color="gold" />
          <StatCard icon={<FiStar />} label="Avg. Rating" value={`${(store?.avg_rating || 0).toFixed(1)} ★`} sub={`${store?.review_count || 0} reviews`} color="purple" />
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Recent Products */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-gray-800">Recent Products</h2>
              <Link href="/seller/products" className="text-sm text-green-900 hover:underline">View All</Link>
            </div>
            {products.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <FiPackage size={40} className="mx-auto mb-2" />
                <p>No products yet</p>
                <Link href="/seller/products" className="text-green-900 text-sm font-semibold hover:underline">Add your first product</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {products.slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      {p.images?.[0] ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl">📦</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                      <p className="text-xs text-gray-500">${p.price.toFixed(2)} · {p.stock} in stock</p>
                    </div>
                    <span className={`badge text-xs ${p.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {p.is_active ? "Active" : "Draft"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-gray-800">Recent Orders</h2>
              <Link href="/seller/orders" className="text-sm text-green-900 hover:underline">View All</Link>
            </div>
            {orders.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <FiShoppingBag size={40} className="mx-auto mb-2" />
                <p>No orders yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((o) => (
                  <div key={o.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800">Order #{o.id}</p>
                      <p className="text-xs text-gray-500">{new Date(o.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-900">${o.total.toFixed(2)}</p>
                      <span className={`badge text-xs ${
                        o.status === "paid" ? "bg-blue-100 text-blue-700" :
                        o.status === "shipped" ? "bg-purple-100 text-purple-700" :
                        o.status === "delivered" ? "bg-green-100 text-green-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {o.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
