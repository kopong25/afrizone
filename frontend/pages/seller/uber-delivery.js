import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import { useAuth } from "../_app";
import { useRouter } from "next/router";
import api from "../../lib/api";
import toast from "react-hot-toast";
import { FiArrowLeft, FiNavigation, FiDollarSign, FiMapPin, FiClock, FiAlertCircle, FiPackage, FiUser, FiShoppingBag, FiTruck } from "react-icons/fi";

const ZONES = [
  { zone: 1, label: "Nearby",   miles: "0–3",  charge: "$5.99",  uber: "~$3.50", margin: "~$2.49", color: "green" },
  { zone: 2, label: "Local",    miles: "3–7",  charge: "$8.99",  uber: "~$5.50", margin: "~$3.49", color: "blue" },
  { zone: 3, label: "Extended", miles: "7–12", charge: "$12.99", uber: "~$8.50", margin: "~$4.49", color: "yellow" },
  { zone: 4, label: "Far",      miles: "12–20",charge: "$16.99", uber: "~$12.00",margin: "~$4.99", color: "orange" },
];

const colorMap = {
  green:  "bg-green-50  border-green-200  text-green-800",
  blue:   "bg-blue-50   border-blue-200   text-blue-800",
  yellow: "bg-yellow-50 border-yellow-200 text-yellow-800",
  orange: "bg-orange-50 border-orange-200 text-orange-800",
};

export default function UberDeliveryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    if (user.role !== "seller" && user.role !== "admin") router.push("/");
    api.get("/orders/store-orders?size=10")
      .then(r => setRecentOrders((r.data?.items || r.data || []).filter(o => o.delivery_method === "uber_express")))
      .catch(() => {})
      .finally(() => setLoadingOrders(false));
  }, [user]);

  const runSandboxTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // Test 1: Get zones
      const zones = await api.get("/uber-direct/zones");

      // Test 2: Get quote with mock location (Houston, TX)
      const quote = await api.post("/uber-direct/quote", {
        store_id: 1,
        customer_lat: 29.7604,
        customer_lng: -95.3698,
        customer_address: "123 Main St, Houston TX 77001",
        customer_name: "Test Customer",
        customer_phone: "+17135550000",
      });

      setTestResult({
        success: true,
        zones: zones.data,
        quote: quote.data,
      });
      toast.success("✅ Sandbox test passed!");
    } catch (e) {
      setTestResult({
        success: false,
        error: e.response?.data?.detail || e.message,
      });
      toast.error("Test failed — check result below");
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/seller/dashboard" className="text-gray-400 hover:text-gray-600">
            <FiArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            🚗 Uber Direct Delivery
          </h1>
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-bold">SANDBOX</span>
        </div>

        {/* Seller: Recent Uber Delivery Orders */}
        {user?.role !== "admin" && (
          <div className="bg-white rounded-2xl border shadow-sm p-6 mb-6">
            <h2 className="font-black text-gray-900 mb-4 flex items-center gap-2">
              <FiTruck size={18} className="text-green-700" /> Recent Uber Delivery Orders
            </h2>
            {loadingOrders ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <FiTruck size={32} className="mx-auto mb-2" />
                <p className="text-sm">No Uber delivery orders yet</p>
                <p className="text-xs mt-1">Orders using Uber Express will appear here</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-2 px-3 text-xs font-bold text-gray-500 uppercase">Order #</th>
                      <th className="text-left py-2 px-3 text-xs font-bold text-gray-500 uppercase">Date & Time</th>
                      <th className="text-left py-2 px-3 text-xs font-bold text-gray-500 uppercase">Customer</th>
                      <th className="text-right py-2 px-3 text-xs font-bold text-gray-500 uppercase">Products</th>
                      <th className="text-right py-2 px-3 text-xs font-bold text-gray-500 uppercase">Delivery Fee</th>
                      <th className="text-right py-2 px-3 text-xs font-bold text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map(order => {
                      const statusColors = {
                        pending: "bg-yellow-100 text-yellow-800",
                        paid: "bg-blue-100 text-blue-800",
                        processing: "bg-purple-100 text-purple-800",
                        shipped: "bg-orange-100 text-orange-800",
                        delivered: "bg-green-100 text-green-800",
                        cancelled: "bg-red-100 text-red-800",
                      };
                      return (
                        <tr key={order.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-3 font-bold text-gray-900">#{order.id}</td>
                          <td className="py-3 px-3 text-gray-600 text-xs">
                            {new Date(order.created_at).toLocaleDateString("en-US", {month:"short", day:"numeric", year:"numeric"})}
                            <br />
                            <span className="text-gray-400">{new Date(order.created_at).toLocaleTimeString("en-US", {hour:"2-digit", minute:"2-digit"})}</span>
                          </td>
                          <td className="py-3 px-3">
                            <p className="font-medium text-gray-800">{order.shipping_name || "—"}</p>
                            <p className="text-xs text-gray-400">{order.shipping_city}, {order.shipping_state}</p>
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-gray-900">${Number(order.subtotal || 0).toFixed(2)}</td>
                          <td className="py-3 px-3 text-right text-gray-600">${Number(order.shipping_cost || 0).toFixed(2)}</td>
                          <td className="py-3 px-3 text-right">
                            <span className={`text-xs font-bold px-2 py-1 rounded-full capitalize ${statusColors[order.status] || "bg-gray-100 text-gray-600"}`}>
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Admin Only: Integration Status */}
        {user?.role === "admin" && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-6">
            <div className="flex gap-3">
              <FiAlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-blue-800">Integration Status: Sandbox Testing</p>
                <p className="text-sm text-blue-700 mt-1">
                  Uber Direct is in sandbox mode. All dispatch calls are simulated.
                  Add credentials to Render env vars to go live.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  {[
                    ["UBER_CLIENT_ID", "From Uber Developer Dashboard"],
                    ["UBER_CLIENT_SECRET", "From Uber Developer Dashboard"],
                    ["UBER_CUSTOMER_ID", "Your Uber Direct customer ID"],
                    ["UBER_SANDBOX", "Set to false for production"],
                  ].map(([key, desc]) => (
                    <div key={key} className="bg-white rounded-lg p-2 border border-blue-100">
                      <code className="font-bold text-blue-900">{key}</code>
                      <p className="text-blue-600 mt-0.5">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Zone Pricing Table — Admin Only */}
        {user?.role === "admin" && <div className="bg-white rounded-2xl border shadow-sm p-6 mb-6">
          <h2 className="font-black text-gray-900 mb-1 flex items-center gap-2">
            <FiDollarSign size={18} className="text-green-700" /> Zone Pricing Model
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            Customers pay a delivery fee based on distance. Afrizone handles all Uber payments automatically.
            No surprises for customers — they see the price before ordering.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 text-xs font-bold text-gray-500 uppercase">Zone</th>
                  <th className="text-left py-2 px-3 text-xs font-bold text-gray-500 uppercase">Distance</th>
                  <th className="text-left py-2 px-3 text-xs font-bold text-green-700 uppercase">Customer Pays</th>
                  <th className="text-left py-2 px-3 text-xs font-bold text-red-500 uppercase">Uber Cost (est)</th>
                  <th className="text-left py-2 px-3 text-xs font-bold text-blue-600 uppercase">Afrizone Margin</th>
                </tr>
              </thead>
              <tbody>
                {ZONES.map((z) => (
                  <tr key={z.zone} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold border ${colorMap[z.color]}`}>
                        Zone {z.zone} · {z.label}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-600">{z.miles} miles</td>
                    <td className="py-3 px-3 font-black text-gray-900">{z.charge}</td>
                    <td className="py-3 px-3 text-red-600">{z.uber}</td>
                    <td className="py-3 px-3 font-bold text-blue-700">{z.margin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {user?.role === "admin" && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm mt-2">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 text-xs font-bold text-gray-500 uppercase">Zone</th>
                    <th className="text-left py-2 px-3 text-xs font-bold text-gray-500 uppercase">Distance</th>
                    <th className="text-left py-2 px-3 text-xs font-bold text-green-700 uppercase">Customer Pays</th>
                    <th className="text-left py-2 px-3 text-xs font-bold text-red-500 uppercase">Uber Cost</th>
                    <th className="text-left py-2 px-3 text-xs font-bold text-blue-600 uppercase">Afrizone Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { zone:1, label:"Nearby",   miles:"0–3",   charge:"$5.99",  uber:"~$3.50", margin:"~$2.49", color:"green" },
                    { zone:2, label:"Local",    miles:"3–7",   charge:"$8.99",  uber:"~$5.50", margin:"~$3.49", color:"blue" },
                    { zone:3, label:"Extended", miles:"7–12",  charge:"$12.99", uber:"~$8.50", margin:"~$4.49", color:"yellow" },
                    { zone:4, label:"Far",      miles:"12–20", charge:"$16.99", uber:"~$12.00",margin:"~$4.99", color:"orange" },
                  ].map(z => (
                    <tr key={z.zone} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold border ${colorMap[z.color]}`}>Zone {z.zone} · {z.label}</span>
                      </td>
                      <td className="py-3 px-3 text-gray-600">{z.miles} miles</td>
                      <td className="py-3 px-3 font-black text-gray-900">{z.charge}</td>
                      <td className="py-3 px-3 text-red-600 font-medium">{z.uber}</td>
                      <td className="py-3 px-3 text-blue-700 font-bold">{z.margin}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-3">
            * Uber costs are estimates. Actual costs vary by city, time of day, and demand.
            Delivery fees are handled automatically — no action needed from you.
          </p>
        </div>}

        {/* How It Works */}
        <div className="bg-white rounded-2xl border shadow-sm p-6 mb-6">
          <h2 className="font-black text-gray-900 mb-4 flex items-center gap-2">
            <FiClock size={18} className="text-green-700" /> How It Works
          </h2>
          <div className="space-y-4">
            {[
              { step: "1", icon: "🛒", title: "Customer orders", desc: "They select local delivery at checkout. We show them their zone fee based on GPS distance from your store." },
              { step: "2", icon: "👨‍🍳", title: "You prepare the food", desc: "You receive the order and start cooking. Mark it as 'Processing' in your orders dashboard." },
              { step: "3", icon: "🚗", title: "You dispatch the driver", desc: "When food is ready, click 'Dispatch Uber Driver'. Uber sends the nearest available driver to your store within 11.5 minutes." },
              { step: "4", icon: "📍", title: "Driver picks up & delivers", desc: "Driver collects from you and delivers to the customer. Both you and the customer get live tracking updates." },
              { step: "5", icon: "✅", title: "Order complete", desc: "Uber marks delivery complete. Order status updates automatically via webhook. Payment releases to you." },
            ].map((s) => (
              <div key={s.step} className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-green-900 text-white text-sm font-black flex items-center justify-center flex-shrink-0">
                  {s.step}
                </div>
                <div>
                  <p className="font-bold text-gray-800">{s.icon} {s.title}</p>
                  <p className="text-sm text-gray-500">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sandbox Test — Admin Only */}
        {user?.role === "admin" && <div className="bg-white rounded-2xl border shadow-sm p-6 mb-6">
          <h2 className="font-black text-gray-900 mb-2 flex items-center gap-2">
            <FiNavigation size={18} className="text-green-700" /> Sandbox Test
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Run a test API call to verify the integration is working. Uses Houston, TX as mock coordinates.
          </p>
          <button onClick={runSandboxTest} disabled={testing}
            className="bg-black hover:bg-gray-900 text-white font-bold px-6 py-3 rounded-xl text-sm disabled:opacity-50 flex items-center gap-2">
            <FiNavigation size={16} />
            {testing ? "Running test..." : "Run Sandbox Test"}
          </button>

          {testResult && (
            <div className={`mt-4 rounded-xl p-4 border text-sm font-mono overflow-auto max-h-96 ${
              testResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
            }`}>
              <p className={`font-bold mb-2 ${testResult.success ? "text-green-800" : "text-red-800"}`}>
                {testResult.success ? "✅ Test Passed" : "❌ Test Failed"}
              </p>
              {testResult.error && <p className="text-red-700">{testResult.error}</p>}
              {testResult.quote && (
                <div className="space-y-1 text-xs">
                  <p><span className="text-gray-500">Distance:</span> {testResult.quote.distance_miles} miles</p>
                  <p><span className="text-gray-500">Zone:</span> {testResult.quote.zone} — {testResult.quote.zone_label}</p>
                  <p><span className="text-gray-500">Customer fee:</span> ${testResult.quote.delivery_fee}</p>
                  <p><span className="text-gray-500">Est. time:</span> {testResult.quote.estimated_minutes} min</p>
                  <p><span className="text-gray-500">Sandbox mode:</span> {String(testResult.quote.sandbox)}</p>
                  <p className="mt-2 font-bold text-gray-700">Breakdown:</p>
                  <p><span className="text-gray-500">Customer pays:</span> ${testResult.quote.breakdown?.customer_pays}</p>
                  <p><span className="text-gray-500">Uber cost (est):</span> ${testResult.quote.breakdown?.uber_cost_estimate}</p>

                </div>
              )}
            </div>
          )}
        </div>}

        {/* Setup steps — Admin Only */}
        {user?.role === "admin" && (
        <div className="bg-gray-50 rounded-2xl border p-5 text-sm text-gray-600">
          <p className="font-bold text-gray-800 mb-2">📋 To activate production Uber Direct:</p>
          <ol className="space-y-1 list-decimal list-inside">
            <li>Apply at <a href="https://developer.uber.com" target="_blank" rel="noreferrer" className="text-green-700 underline">developer.uber.com</a> for Uber Direct API access</li>
            <li>Complete Uber's sandbox testing (this page helps)</li>
            <li>Submit production access request via Uber dashboard</li>
            <li>Once approved, add credentials to Render environment variables</li>
            <li>Set <code className="bg-gray-200 px-1 rounded">UBER_SANDBOX=false</code> in Render</li>
          </ol>
        </div>)}
      </div>
      <Footer />
    </>
  );
}
