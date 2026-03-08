import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import { useAuth } from "../_app";
import api from "../../lib/api";
import toast from "react-hot-toast";
import { FiCheck, FiArrowLeft, FiZap } from "react-icons/fi";

const PLANS = {
  basic:    { name: "Basic",    price: 0,  commission: 10, color: "gray",   badge: "",      features: ["Up to 10 products", "10% commission", "Community support", "Basic analytics"] },
  standard: { name: "Standard", price: 29, commission: 7,  color: "green",  badge: "Popular", features: ["Up to 100 products", "7% commission", "Email support", "Full analytics", "Discount codes", "Auto shipping labels"] },
  premium:  { name: "Premium",  price: 79, commission: 4,  color: "yellow", badge: "Best Value", features: ["Unlimited products", "4% commission", "Priority support", "Advanced analytics", "Featured listing", "Auto shipping labels", "Multi-currency", "Referral bonuses"] },
};

export default function SubscriptionPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [currentTier, setCurrentTier] = useState("basic");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    api.get("/subscriptions/my-plan").then(r => setCurrentTier(r.data.tier)).catch(() => {});
  }, [user]);

  const upgrade = async (tier) => {
    if (tier === currentTier) return;
    setLoading(true);
    try {
      const r = await api.post(`/subscriptions/upgrade/${tier}`);
      if (r.data.checkout_url) {
        window.location.href = r.data.checkout_url;
      } else {
        toast.success(r.data.message);
        setCurrentTier(tier);
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Upgrade failed");
    } finally { setLoading(false); }
  };

  return (
    <>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/seller/dashboard" className="text-gray-400 hover:text-gray-600"><FiArrowLeft size={20} /></Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2"><FiZap className="text-yellow-500" /> Seller Plans</h1>
            <p className="text-gray-500 text-sm mt-0.5">Lower your commission and unlock more tools as you grow</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {Object.entries(PLANS).map(([key, plan]) => {
            const isCurrent = currentTier === key;
            const isGreen = plan.color === "green";
            const isYellow = plan.color === "yellow";
            return (
              <div key={key} className={`relative rounded-2xl border-2 p-6 flex flex-col transition-all ${isCurrent ? "border-green-700 shadow-lg" : "border-gray-200 hover:border-gray-300"} ${isGreen ? "bg-green-900 text-white" : "bg-white"}`}>
                {plan.badge && (
                  <span className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold ${isYellow ? "bg-yellow-400 text-green-900" : "bg-green-900 text-white"}`}>
                    {plan.badge}
                  </span>
                )}
                {isCurrent && (
                  <span className="absolute -top-3 right-4 px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">Current Plan</span>
                )}
                <div className="mb-4">
                  <h2 className={`text-xl font-black ${isGreen ? "text-white" : "text-gray-900"}`}>{plan.name}</h2>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className={`text-3xl font-black ${isGreen ? "text-yellow-400" : "text-gray-900"}`}>${plan.price}</span>
                    {plan.price > 0 && <span className={`text-sm ${isGreen ? "text-green-200" : "text-gray-500"}`}>/mo</span>}
                  </div>
                  <p className={`text-sm mt-1 font-medium ${isGreen ? "text-green-200" : "text-gray-500"}`}>{plan.commission}% commission per sale</p>
                </div>

                <ul className="space-y-2 flex-1 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className={`flex items-start gap-2 text-sm ${isGreen ? "text-green-100" : "text-gray-600"}`}>
                      <FiCheck size={15} className={`mt-0.5 flex-shrink-0 ${isGreen ? "text-yellow-400" : "text-green-700"}`} />
                      {f}
                    </li>
                  ))}
                </ul>

                <button onClick={() => upgrade(key)} disabled={isCurrent || loading}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                    isCurrent ? "bg-gray-100 text-gray-400 cursor-default" :
                    isGreen ? "bg-yellow-400 text-green-900 hover:bg-yellow-300" :
                    isYellow ? "bg-green-900 text-white hover:bg-green-800" :
                    "border-2 border-green-900 text-green-900 hover:bg-green-50"
                  }`}>
                  {isCurrent ? "Current Plan" : plan.price === 0 ? "Downgrade to Basic" : `Upgrade to ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-8 bg-gray-50 rounded-2xl p-6 text-center">
          <p className="text-gray-600 text-sm">All plans include free USPS shipping labels, order management, and customer support.</p>
          <p className="text-gray-400 text-xs mt-2">Cancel or change plans anytime. No contracts.</p>
        </div>
      </div>
      <Footer />
    </>
  );
}