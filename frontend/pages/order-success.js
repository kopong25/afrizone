import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Navbar from "../components/layout/Navbar";
import { useAuth } from "./_app";
import api from "../lib/api";

function getDeliveryEstimate(deliveryMethod) {
  const now = new Date();
  if (deliveryMethod === "uber_express") {
    const minutes = Math.floor(Math.random() * 20) + 35; // 35-55 mins
    const eta = new Date(now.getTime() + minutes * 60 * 1000);
    return `Today by ${eta.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} (~${minutes} min)`;
  }
  if (deliveryMethod === "usps_priority") {
    const d = new Date(now);
    d.setDate(d.getDate() + Math.floor(Math.random() * 2) + 1); // 1-2 days
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  }
  // usps_standard or default
  const d = new Date(now);
  d.setDate(d.getDate() + Math.floor(Math.random() * 3) + 3); // 3-5 days
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

const AFRICAN_PROVERBS = [
  "\"If you want to go fast, go alone. If you want to go far, go together.\"",
  "\"Ubuntu: I am because we are.\"",
  "\"A child who is not embraced by the village will burn it down to feel its warmth.\"",
];

export default function OrderSuccessPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { order_id } = router.query;
  const [order, setOrder] = useState(null);
  const [confetti, setConfetti] = useState(true);
  const deliveryDate = getDeliveryEstimate(order?.delivery_method);
  const proverb = AFRICAN_PROVERBS[Math.floor(Math.random() * AFRICAN_PROVERBS.length)];
  const firstName = user?.full_name?.split(" ")[0] || "Friend";

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    if (order_id) {
      api.get(`/orders/${order_id}`).then(r => setOrder(r.data)).catch(() => {});
      // Send confirmation email (fires after Stripe redirects here)
      api.post(`/orders/${order_id}/send-confirmation`).catch(() => {});
    }
    const t = setTimeout(() => setConfetti(false), 4000);
    return () => clearTimeout(t);
  }, [user, authLoading, order_id]);

  return (
    <>
      <Navbar />

      {/* Confetti animation */}
      {confetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(40)].map((_, i) => (
            <div key={i} style={{
              position: "absolute",
              left: `${Math.random() * 100}%`,
              top: `-20px`,
              width: `${8 + Math.random() * 8}px`,
              height: `${8 + Math.random() * 8}px`,
              background: ["#FFD700","#1A5C38","#FF6B35","#E91E63","#2196F3","#FF9800"][i % 6],
              borderRadius: Math.random() > 0.5 ? "50%" : "2px",
              animation: `fall ${2 + Math.random() * 3}s linear ${Math.random() * 2}s forwards`,
              transform: `rotate(${Math.random() * 360}deg)`,
            }} />
          ))}
        </div>
      )}

      <style>{`
        @keyframes fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes pop { 0% { transform: scale(0.5); opacity: 0; } 70% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes slide-up { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .pop { animation: pop 0.6s ease forwards; }
        .slide-up { animation: slide-up 0.5s ease forwards; }
        .slide-up-2 { animation: slide-up 0.5s ease 0.15s forwards; opacity: 0; }
        .slide-up-3 { animation: slide-up 0.5s ease 0.3s forwards; opacity: 0; }
        .slide-up-4 { animation: slide-up 0.5s ease 0.45s forwards; opacity: 0; }
      `}</style>

      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
        <div className="max-w-xl mx-auto px-4 py-12 text-center">

          {/* Success icon */}
          <div className="pop mb-6">
            <div className="w-24 h-24 bg-green-900 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-green-900/30">
              <span className="text-5xl">🛍️</span>
            </div>
          </div>

          {/* Personal greeting */}
          <div className="slide-up">
            <h1 className="text-3xl font-black text-gray-900 mb-2">
              Thank you, {firstName}! 🎉
            </h1>
            <p className="text-green-700 font-bold text-lg">Your order is confirmed!</p>
          </div>

          {/* Order card */}
          <div className="slide-up-2 bg-white rounded-2xl border border-green-100 shadow-lg p-6 mt-8 text-left">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-gray-400 uppercase font-bold tracking-wide">Order</p>
                <p className="font-black text-gray-900 text-lg">#{order_id || order?.id}</p>
              </div>
              <span className="bg-green-100 text-green-800 text-xs font-black px-3 py-1.5 rounded-full">✓ Confirmed</span>
            </div>

            {/* Delivery timeline */}
            <div className="bg-green-50 rounded-xl p-4 mb-4">
              <p className="text-xs font-bold text-green-700 uppercase tracking-wide mb-1">📦 Estimated Delivery</p>
              <p className="text-xl font-black text-green-900">{deliveryDate}</p>
              <p className="text-xs text-green-700 mt-1">
               {order?.delivery_method === "uber_express"
              ? "🛵 Uber driver will be dispatched when your order is ready"
              : "We'll email you tracking info once delivered"}
            </p>
            </div>

            {/* Order items if available */}
            {order?.items?.length > 0 && (
              <div className="space-y-2 mb-4">
                {order.items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.product?.name} × {item.quantity}</span>
                    <span className="font-bold">${Number(item.total_price).toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between font-black text-gray-900">
                  <span>Total</span>
                  <span>${Number(order?.total).toFixed(2)}</span>
                </div>
              </div>
            )}

            <div className="border-t pt-3 text-sm text-gray-500">
              <p>📧 Confirmation sent to <strong>{user?.email}</strong></p>
            </div>
          </div>

          {/* Exciting message */}
          <div className="slide-up-3 mt-8">
            <div className="bg-yellow-400 rounded-2xl p-6 text-green-900">
              <p className="text-2xl mb-2">🌍</p>
              <p className="font-black text-lg mb-1">You're supporting African businesses!</p>
              <p className="text-sm font-medium opacity-80">
                Every purchase helps African entrepreneurs in the diaspora thrive. 
                Share Afrizone with a friend and earn $10!
              </p>
            </div>

            {/* Proverb */}
            <p className="text-gray-400 text-sm italic mt-6 px-4">{proverb}</p>
            <p className="text-gray-300 text-xs mt-1">— African Proverb</p>
          </div>

          {/* CTAs */}
          <div className="slide-up-4 flex flex-col gap-3 mt-8">
            <Link href="/orders"
              className="w-full bg-green-900 hover:bg-green-800 text-white font-black py-4 rounded-xl transition-colors text-lg">
              Track My Order →
            </Link>
            <Link href="/"
              className="w-full border-2 border-green-900 text-green-900 hover:bg-green-50 font-bold py-3 rounded-xl transition-colors">
              Continue Shopping
            </Link>
            <Link href="/referral"
              className="text-sm text-gray-400 hover:text-green-900 transition-colors">
              🎁 Share Afrizone & earn $10 per referral
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}