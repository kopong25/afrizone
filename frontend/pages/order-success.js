import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Navbar from "../components/layout/Navbar";
import { useAuth, fbq, getSavedUTM } from "./_app";
import api from "../lib/api";

// Returns a human-readable delivery estimate based on the delivery method
function getDeliveryEstimate(deliveryMethod) {
  const method = (deliveryMethod || "").toLowerCase();

  if (method === "uber" || method === "uber_eats" || method === "local") {
    // Same-day: estimate 45–75 min from now
    const now = new Date();
    const low = new Date(now.getTime() + 45 * 60 * 1000);
    const high = new Date(now.getTime() + 75 * 60 * 1000);
    const fmt = (d) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return {
      label: "Today",
      detail: `Estimated between ${fmt(low)} – ${fmt(high)}`,
    };
  }

  // Default: USPS / standard shipping — 3–5 business days
  function addBusinessDays(date, days) {
    let d = new Date(date);
    let added = 0;
    while (added < days) {
      d.setDate(d.getDate() + 1);
      const day = d.getDay();
      if (day !== 0 && day !== 6) added++; // skip weekends
    }
    return d;
  }

  const earliest = addBusinessDays(new Date(), 3);
  const latest = addBusinessDays(new Date(), 5);
  const fmtDate = (d) =>
    d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return {
    label: fmtDate(earliest),
    detail: `Estimated by ${fmtDate(latest)} · Tracking emailed once shipped`,
  };
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
  const [orderLoading, setOrderLoading] = useState(true);
  const [orderError, setOrderError] = useState(false);
  const [confetti, setConfetti] = useState(true);
  const fbqFired = useRef(false); // prevent double-firing purchase pixel

  // Stable random values — won't re-randomize on every render
  const proverb = useMemo(
    () => AFRICAN_PROVERBS[Math.floor(Math.random() * AFRICAN_PROVERBS.length)],
    []
  );

  const firstName = user?.full_name?.split(" ")[0] || "Friend";

  // Derive delivery estimate once order is loaded (so we respect delivery_method)
  const delivery = getDeliveryEstimate(order?.delivery_method);

  // Derive delivery fee: use order.delivery_fee if present, else derive from total - items sum
  const itemsSubtotal = order?.items?.reduce(
    (sum, item) => sum + Number(item.total_price),
    0
  ) ?? 0;
  const deliveryFee =
    order?.delivery_fee != null
      ? Number(order.delivery_fee)
      : order?.total != null
      ? Number(order.total) - itemsSubtotal
      : null;

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }

    if (order_id) {
      setOrderLoading(true);
      api.get(`/orders/${order_id}`)
        .then(r => {
          const fetchedOrder = r.data;
          setOrder(fetchedOrder);
          setOrderLoading(false);

          // ✅ Fire Meta/Facebook Purchase pixel exactly once
          if (!fbqFired.current && fetchedOrder?.total) {
            fbqFired.current = true;
            const utm = getSavedUTM?.() || {};
            fbq("track", "Purchase", {
              value: Number(fetchedOrder.total),
              currency: "USD",
              content_ids: fetchedOrder.items?.map(i => String(i.product?.id)) || [],
              content_type: "product",
              ...utm,
            });
          }
        })
        .catch(() => {
          setOrderLoading(false);
          setOrderError(true);
        });

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
        @keyframes pulse-bg { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .pop { animation: pop 0.6s ease forwards; }
        .slide-up { animation: slide-up 0.5s ease forwards; }
        .slide-up-2 { animation: slide-up 0.5s ease 0.15s forwards; opacity: 0; }
        .slide-up-3 { animation: slide-up 0.5s ease 0.3s forwards; opacity: 0; }
        .slide-up-4 { animation: slide-up 0.5s ease 0.45s forwards; opacity: 0; }
        .skeleton { background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%; animation: shimmer 1.4s infinite; border-radius: 6px; }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
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

          {/* ── Error state ── */}
          {orderError && (
            <div className="slide-up-2 bg-red-50 border border-red-200 rounded-2xl p-6 mt-8 text-left">
              <p className="font-bold text-red-700 mb-1">⚠️ Couldn't load order details</p>
              <p className="text-sm text-red-500 mb-3">
                Your order was placed successfully, but we had trouble fetching the details.
                Check your email for confirmation or visit your orders page.
              </p>
              <Link href="/orders"
                className="text-sm font-bold text-red-700 underline">
                View my orders →
              </Link>
            </div>
          )}

          {/* ── Loading skeleton ── */}
          {!orderError && orderLoading && (
            <div className="slide-up-2 bg-white rounded-2xl border border-green-100 shadow-lg p-6 mt-8 text-left space-y-4">
              <div className="flex justify-between items-center">
                <div className="skeleton h-5 w-20" />
                <div className="skeleton h-6 w-24" />
              </div>
              <div className="skeleton h-20 w-full" />
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-4 w-1/2" />
              <div className="border-t pt-3 skeleton h-5 w-full" />
            </div>
          )}

          {/* ── Order card (loaded) ── */}
          {!orderError && !orderLoading && (
            <div className="slide-up-2 bg-white rounded-2xl border border-green-100 shadow-lg p-6 mt-8 text-left">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase font-bold tracking-wide">Order</p>
                  <p className="font-black text-gray-900 text-lg">#{order_id || order?.id}</p>
                </div>
                <span className="bg-green-100 text-green-800 text-xs font-black px-3 py-1.5 rounded-full">✓ Confirmed</span>
              </div>

              {/* Delivery timeline — dynamic based on delivery_method */}
              <div className="bg-green-50 rounded-xl p-4 mb-4">
                <p className="text-xs font-bold text-green-700 uppercase tracking-wide mb-1">📦 Estimated Delivery</p>
                <p className="text-xl font-black text-green-900">{delivery.label}</p>
                <p className="text-xs text-green-700 mt-1">{delivery.detail}</p>
              </div>

              {/* Order items + delivery fee + total */}
              {order?.items?.length > 0 && (
                <div className="space-y-2 mb-4">
                  {/* Line items */}
                  {order.items.map(item => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">{item.product?.name} × {item.quantity}</span>
                      <span className="font-bold">${Number(item.total_price).toFixed(2)}</span>
                    </div>
                  ))}

                  {/* ✅ FIX 1: Delivery fee row */}
                  {deliveryFee != null && deliveryFee > 0 && (
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Delivery fee</span>
                      <span>${deliveryFee.toFixed(2)}</span>
                    </div>
                  )}
                  {deliveryFee === 0 && (
                    <div className="flex justify-between text-sm text-green-700">
                      <span>Delivery fee</span>
                      <span className="font-bold">Free 🎉</span>
                    </div>
                  )}

                  {/* Total */}
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
          )}

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