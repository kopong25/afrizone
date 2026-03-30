import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import { storesAPI, productsAPI, ordersAPI, paymentsAPI } from "../../lib/api";
import { useAuth } from "../_app";
import { usePushNotifications } from "../../hooks/usePushNotifications";
import toast from "react-hot-toast";
import Link from "next/link";
import { FiPackage, FiShoppingBag, FiDollarSign, FiStar, FiAlertCircle } from "react-icons/fi";

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


function StripeSetupForm({ onConnect }) {
  const [step, setStep] = useState(1);
  const [details, setDetails] = useState({
    legal_name: "", business_type: "individual", country: "US",
    dob_day: "", dob_month: "", dob_year: "",
    address: "", city: "", state: "", zip: "",
    ssn_last4: "", routing_number: "", account_number: "", account_confirm: "",
  });
  const [agreed, setAgreed] = useState(false);

  const fields1 = [
    { key: "legal_name", label: "Legal Full Name", placeholder: "As it appears on your ID", required: true },
  ];

  return (
    <div className="bg-white border-2 border-yellow-300 rounded-2xl p-6 mb-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">💳</div>
        <div>
          <p className="font-black text-gray-900">Set Up Payouts</p>
          <p className="text-xs text-gray-500">Secure bank connection powered by Stripe</p>
        </div>
        <div className="ml-auto flex gap-1">
          {[1,2,3].map(s => (
            <div key={s} className={`w-8 h-1.5 rounded-full ${step >= s ? "bg-green-900" : "bg-gray-200"}`} />
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm font-bold text-gray-700">Step 1 — Personal Information</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-600 block mb-1">Legal Full Name *</label>
              <input value={details.legal_name} onChange={e => setDetails(d => ({...d, legal_name: e.target.value}))}
                placeholder="As it appears on your government ID"
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Business Type</label>
              <select value={details.business_type} onChange={e => setDetails(d => ({...d, business_type: e.target.value}))}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700">
                <option value="individual">Individual / Sole Proprietor</option>
                <option value="company">Company / LLC</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Country</label>
              <select value={details.country} onChange={e => setDetails(d => ({...d, country: e.target.value}))}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700">
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="GB">United Kingdom</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Date of Birth</label>
            <div className="grid grid-cols-3 gap-2">
              <input placeholder="MM" maxLength={2} value={details.dob_month}
                onChange={e => setDetails(d => ({...d, dob_month: e.target.value}))}
                className="border rounded-xl px-3 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-700" />
              <input placeholder="DD" maxLength={2} value={details.dob_day}
                onChange={e => setDetails(d => ({...d, dob_day: e.target.value}))}
                className="border rounded-xl px-3 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-700" />
              <input placeholder="YYYY" maxLength={4} value={details.dob_year}
                onChange={e => setDetails(d => ({...d, dob_year: e.target.value}))}
                className="border rounded-xl px-3 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-700" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Home Address</label>
            <input value={details.address} onChange={e => setDetails(d => ({...d, address: e.target.value}))}
              placeholder="Street address"
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700 mb-2" />
            <div className="grid grid-cols-3 gap-2">
              <input placeholder="City" value={details.city} onChange={e => setDetails(d => ({...d, city: e.target.value}))}
                className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700" />
              <input placeholder="State" value={details.state} onChange={e => setDetails(d => ({...d, state: e.target.value}))}
                className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700" />
              <input placeholder="ZIP" value={details.zip} onChange={e => setDetails(d => ({...d, zip: e.target.value}))}
                className="border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700" />
            </div>
          </div>
          <button onClick={() => {
            if (!details.legal_name || !details.dob_month || !details.address) {
              alert("Please fill in all required fields"); return;
            }
            setStep(2);
          }} className="w-full bg-green-900 hover:bg-green-800 text-white font-black py-3 rounded-xl transition-colors">
            Continue →
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm font-bold text-gray-700">Step 2 — Identity Verification</p>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 flex items-start gap-2">
            <span>🔒</span>
            <span>Required by US law (KYC). Your SSN is encrypted and never stored on Afrizone servers.</span>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Last 4 digits of SSN</label>
            <input type="password" maxLength={4} value={details.ssn_last4}
              onChange={e => setDetails(d => ({...d, ssn_last4: e.target.value}))}
              placeholder="••••"
              className="w-48 border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700 tracking-widest text-center" />
            <p className="text-xs text-gray-400 mt-1">Used to verify your identity with Stripe</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 border-2 border-gray-200 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-50 transition-colors">
              ← Back
            </button>
            <button onClick={() => {
              if (!details.ssn_last4 || details.ssn_last4.length !== 4) {
                alert("Please enter last 4 digits of SSN"); return;
              }
              setStep(3);
            }} className="flex-1 bg-green-900 hover:bg-green-800 text-white font-black py-3 rounded-xl transition-colors">
              Continue →
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm font-bold text-gray-700">Step 3 — Bank Account</p>
          <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-xs text-green-700 flex items-start gap-2">
            <span>🏦</span>
            <span>Your earnings will be deposited directly to this account within 2 business days of each sale.</span>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Routing Number (9 digits)</label>
            <input type="password" maxLength={9} value={details.routing_number}
              onChange={e => setDetails(d => ({...d, routing_number: e.target.value}))}
              placeholder="•••••••••"
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Account Number</label>
            <input type="password" value={details.account_number}
              onChange={e => setDetails(d => ({...d, account_number: e.target.value}))}
              placeholder="••••••••••••"
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Confirm Account Number</label>
            <input value={details.account_confirm}
              onChange={e => setDetails(d => ({...d, account_confirm: e.target.value}))}
              placeholder="Re-enter account number"
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700" />
          </div>
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
              className="mt-1 accent-green-700" />
            <span className="text-xs text-gray-500">
              I agree to Stripe's <a href="https://stripe.com/legal/connect-account" target="_blank" className="text-green-700 hover:underline">Connected Account Agreement</a> and confirm this is my bank account.
            </span>
          </label>
          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="flex-1 border-2 border-gray-200 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-50 transition-colors">
              ← Back
            </button>
            <button onClick={() => {
              if (!details.routing_number || !details.account_number) { alert("Please fill in bank details"); return; }
              if (details.account_number !== details.account_confirm) { alert("Account numbers do not match"); return; }
              if (!agreed) { alert("Please agree to the terms"); return; }
              onConnect();
            }} className="flex-1 bg-green-900 hover:bg-green-800 text-white font-black py-3 rounded-xl transition-colors">
              Connect & Finish →
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1">
            🔒 256-bit SSL · Powered by Stripe · Bank-grade security
          </p>
        </div>
      )}
    </div>
  );
}

export default function SellerDashboard() {
  const { user, loading: authLoading } = useAuth();`n  const { supported: pushSupported, subscribed: pushSubscribed, loading: pushLoading, error: pushError, permission, subscribe: enablePush, unsubscribe: disablePush } = usePushNotifications();
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
        setOrders(o.data?.items || o.data || []);
        setStripeStatus(stripe.data);
      }).catch(console.error).finally(() => setLoading(false));

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
        <div className="flex items-start justify-between mb-8 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Seller Dashboard</h1>
            <p className="text-gray-500 mt-1">
              {store?.name} ·{" "}
              <span className={`font-semibold ${store?.status === "approved" ? "text-green-600" : "text-yellow-600"}`}>
                {store?.status === "approved" ? "✅ Approved" : "⏳ Pending Approval"}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/seller/analytics" className="text-sm border border-gray-200 text-gray-700 hover:bg-gray-50 py-2 px-4 rounded-xl font-medium">📊 Analytics</Link>
            <Link href="/seller/subscription" className="text-sm border border-gray-200 text-gray-700 hover:bg-gray-50 py-2 px-4 rounded-xl font-medium">⚡ Upgrade</Link>
            <Link href="/referral" className="text-sm border border-yellow-200 bg-yellow-50 text-yellow-800 hover:bg-yellow-100 py-2 px-4 rounded-xl font-medium">🎁 Referral</Link>
            <Link href="/seller/store" className="text-sm border border-gray-200 text-gray-700 hover:bg-gray-50 py-2 px-4 rounded-xl font-medium">⚙️ Settings</Link>
            <Link href="/seller/uber-delivery" className="text-sm border border-gray-200 text-gray-700 hover:bg-gray-50 py-2 px-4 rounded-xl font-medium">🚗 Uber Delivery</Link>
            <Link href="/seller/products" className="text-sm bg-green-900 hover:bg-green-800 text-white py-2 px-4 rounded-xl font-bold">+ Add Product</Link>
          </div>
        </div>

        {/* Push Notification Banner */}
        {pushSupported && (
          <div className={`rounded-xl p-4 mb-4 flex items-center justify-between gap-4 ${
            pushSubscribed ? "bg-green-50 border border-green-200" : "bg-blue-50 border border-blue-200"
          }`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{pushSubscribed ? "🔔" : "🔕"}</span>
              <div>
                <p className="font-bold text-gray-900 text-sm">
                  {pushSubscribed ? "Order Notifications Active" : "Enable Order Notifications"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {pushSubscribed
                    ? "You'll get instant alerts on this device when orders arrive"
                    : "Get instant alerts on your phone when a customer places an order"}
                </p>
                {pushError && <p className="text-xs text-red-500 mt-1">{pushError}</p>}
                {permission === "denied" && (
                  <p className="text-xs text-orange-600 mt-1">
                    ⚠️ Notifications blocked — enable in your browser/phone settings
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={pushSubscribed ? disablePush : enablePush}
              disabled={pushLoading || permission === "denied"}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-black transition-colors disabled:opacity-50 ${
                pushSubscribed
                  ? "bg-gray-200 hover:bg-gray-300 text-gray-700"
                  : "bg-green-900 hover:bg-green-800 text-white"
              }`}>
              {pushLoading ? "..." : pushSubscribed ? "Turn Off" : "Enable Now"}
            </button>
          </div>
        )}

        {/* Stripe Connect Banner */}
        {stripeStatus?.connected ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-xl">✅</span>
            </div>
            <div className="flex-1">
              <p className="font-bold text-green-900">Stripe Connected — You can receive payments</p>
              <p className="text-sm text-green-700 mt-0.5">
                Payouts enabled: {stripeStatus?.payouts_enabled ? "✓" : "Pending"} · 
                Card payments: {stripeStatus?.charges_enabled ? "✓" : "Pending"}
              </p>
            </div>
            <button onClick={connectStripe} className="text-xs text-green-700 hover:underline flex-shrink-0">
              Manage →
            </button>
          </div>
        ) : (
          <StripeSetupForm onConnect={connectStripe} />
        )}

        {/* Upgrade nudge */}
        {store?.status === "approved" && store?.tier === "basic" && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-green-900">You're on the Basic plan</p>
              <p className="text-sm text-green-700">Upgrade to list more products and lower your commission.</p>
            </div>
            <Link href="/pricing" className="text-sm bg-yellow-400 hover:bg-yellow-300 text-green-900 font-bold py-2 px-4 rounded-xl flex-shrink-0">
              Upgrade Plan
            </Link>
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
                <p className="mb-3">No products yet</p>
                <Link href="/seller/products" className="text-green-900 text-sm font-semibold hover:underline">Add your first product</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {products.slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      {p.images?.[0]
                        ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-xl">📦</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                      <p className="text-xs text-gray-500">${p.price.toFixed(2)} · {p.stock} in stock</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
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
                  <div key={o.id} className="flex items-center justify-between py-2 border-b last:border-0 gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">Order #{o.id}</p>
                      <p className="text-xs text-gray-500">{new Date(o.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      o.status === "paid" ? "bg-blue-100 text-blue-700" :
                      o.status === "shipped" ? "bg-purple-100 text-purple-700" :
                      o.status === "delivered" ? "bg-green-100 text-green-700" :
                      o.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {o.status}
                    </span>
                    <p className="text-sm font-bold text-gray-900 flex-shrink-0">${Number(o.total).toFixed(2)}</p>
                    <Link href="/seller/orders" className="text-xs bg-green-900 text-white px-3 py-1.5 rounded-lg hover:bg-green-800 flex-shrink-0">
                      Manage →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
