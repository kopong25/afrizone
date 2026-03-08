import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import { storesAPI } from "../../lib/api";
import { useAuth } from "../_app";
import toast from "react-hot-toast";
import { FiArrowLeft, FiTrendingUp, FiTrendingDown, FiPackage, FiStar, FiShoppingBag, FiDollarSign } from "react-icons/fi";

function StatCard({ label, value, sub, change, icon: Icon, color = "green" }) {
  const positive = change > 0;
  const colorMap = { green: "bg-green-50 text-green-700 border-green-100", blue: "bg-blue-50 text-blue-700 border-blue-100", yellow: "bg-yellow-50 text-yellow-700 border-yellow-100", purple: "bg-purple-50 text-purple-700 border-purple-100" };
  return (
    <div className={`bg-white rounded-2xl border p-5 shadow-sm`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${colorMap[color]}`}>
          <Icon size={18} />
        </div>
        {change !== undefined && (
          <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${positive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
            {positive ? <FiTrendingUp size={11} /> : <FiTrendingDown size={11} />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-black text-gray-900 mb-0.5">{value}</p>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function MiniChart({ data, valueKey = "revenue" }) {
  if (!data || data.length === 0) return null;
  const values = data.map(d => d[valueKey]);
  const max = Math.max(...values, 1);
  const hasData = values.some(v => v > 0);

  return (
    <div className="flex items-end gap-1 h-16 mt-2">
      {data.map((d, i) => {
        const height = max > 0 ? Math.max((d[valueKey] / max) * 100, d[valueKey] > 0 ? 4 : 0) : 0;
        const isWeekend = new Date(d.date).getDay() % 6 === 0;
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end group relative">
            <div
              className={`w-full rounded-sm transition-all ${d[valueKey] > 0 ? "bg-green-500 group-hover:bg-green-600" : "bg-gray-100"}`}
              style={{ height: `${height}%`, minHeight: d[valueKey] > 0 ? "3px" : "2px" }}
            />
            {/* Tooltip */}
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">
              {d.date.slice(5)}: ${d[valueKey].toFixed(2)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatusBadge({ status, count }) {
  const colors = {
    pending: "bg-yellow-100 text-yellow-800",
    paid: "bg-blue-100 text-blue-800",
    processing: "bg-purple-100 text-purple-800",
    shipped: "bg-orange-100 text-orange-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };
  return (
    <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm ${colors[status] || "bg-gray-100 text-gray-700"}`}>
      <span className="font-medium capitalize">{status}</span>
      <span className="font-black">{count}</span>
    </div>
  );
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    if (user.role !== "seller" && user.role !== "admin") { router.push("/"); return; }
    fetchAnalytics(days);
  }, [user]);

  const fetchAnalytics = (d) => {
    setLoading(true);
    storesAPI.analytics(d)
      .then((r) => setData(r.data))
      .catch(() => toast.error("Failed to load analytics"))
      .finally(() => setLoading(false));
  };

  const handleDaysChange = (d) => {
    setDays(d);
    fetchAnalytics(d);
  };

  return (
    <>
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <Link href="/seller/dashboard" className="text-gray-400 hover:text-gray-600"><FiArrowLeft size={20} /></Link>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <FiTrendingUp className="text-green-700" /> Store Analytics
          </h1>
          <div className="ml-auto flex gap-2">
            {[7, 30, 90].map((d) => (
              <button key={d} onClick={() => handleDaysChange(d)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${days === d ? "bg-green-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {d}d
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-gray-200 rounded-2xl animate-pulse" />)}
          </div>
        ) : !data ? null : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard label="Revenue" value={`$${data.summary.total_revenue.toFixed(2)}`}
                sub={`Last ${days} days`} change={data.summary.revenue_change_pct}
                icon={FiDollarSign} color="green" />
              <StatCard label="Orders" value={data.summary.total_orders}
                sub={`vs prev ${days} days`} change={data.summary.orders_change_pct}
                icon={FiShoppingBag} color="blue" />
              <StatCard label="Avg Order" value={`$${data.summary.avg_order_value.toFixed(2)}`}
                sub="Per order value" icon={FiTrendingUp} color="purple" />
              <StatCard label="Rating" value={data.summary.avg_rating?.toFixed(1) || "—"}
                sub={`${data.summary.review_count} reviews`} icon={FiStar} color="yellow" />
            </div>

            {/* Revenue chart */}
            <div className="bg-white rounded-2xl border shadow-sm p-6 mb-6">
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-bold text-gray-900">Revenue Over Time</h2>
                <span className="text-sm text-gray-400">Last {days} days</span>
              </div>
              <p className="text-xs text-gray-400 mb-3">Hover over bars for daily details</p>
              <MiniChart data={data.daily_chart} valueKey="revenue" />
              {/* X-axis labels */}
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{data.daily_chart[0]?.date?.slice(5)}</span>
                <span>{data.daily_chart[Math.floor(data.daily_chart.length / 2)]?.date?.slice(5)}</span>
                <span>{data.daily_chart[data.daily_chart.length - 1]?.date?.slice(5)}</span>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Top products */}
              <div className="bg-white rounded-2xl border shadow-sm p-6">
                <h2 className="font-bold text-gray-900 mb-4">Top Products</h2>
                {data.top_products.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <FiPackage size={32} className="mx-auto mb-2" />
                    <p className="text-sm">No sales yet in this period</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.top_products.map((p, i) => (
                      <div key={p.id} className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-black text-gray-500 flex-shrink-0">
                          {i + 1}
                        </span>
                        <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-lg">📦</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                          <p className="text-xs text-gray-400">{p.units} units · {p.orders} orders</p>
                        </div>
                        <span className="text-sm font-black text-green-900 flex-shrink-0">${p.revenue.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Order status breakdown */}
              <div className="bg-white rounded-2xl border shadow-sm p-6">
                <h2 className="font-bold text-gray-900 mb-4">Order Status (All Time)</h2>
                {Object.keys(data.status_breakdown).length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <FiShoppingBag size={32} className="mx-auto mb-2" />
                    <p className="text-sm">No orders yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(data.status_breakdown).map(([status, count]) => (
                      <StatusBadge key={status} status={status} count={count} />
                    ))}
                  </div>
                )}

                {/* Quick links */}
                <div className="mt-4 pt-4 border-t space-y-2">
                  <Link href="/seller/dashboard" className="flex items-center justify-between text-sm text-gray-600 hover:text-green-900 py-1">
                    <span>View all orders</span><span>→</span>
                  </Link>
                  <Link href="/seller/products" className="flex items-center justify-between text-sm text-gray-600 hover:text-green-900 py-1">
                    <span>Manage products</span><span>→</span>
                  </Link>
                  <Link href="/seller/discounts" className="flex items-center justify-between text-sm text-gray-600 hover:text-green-900 py-1">
                    <span>Discount codes</span><span>→</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Empty state CTA */}
            {data.summary.total_orders === 0 && (
              <div className="bg-gradient-to-r from-green-900 to-green-800 rounded-2xl p-8 text-white text-center">
                <h2 className="text-xl font-black mb-2">No orders yet in this period</h2>
                <p className="text-green-200 mb-4">Share your store link and create a discount code to attract your first customers!</p>
                <div className="flex gap-3 justify-center flex-wrap">
                  <Link href="/seller/discounts" className="bg-yellow-500 hover:bg-yellow-400 text-green-900 font-bold px-6 py-2.5 rounded-xl text-sm transition-colors">
                    Create Discount Code
                  </Link>
                  <Link href="/seller/products" className="bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors">
                    Add Products
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <Footer />
    </>
  );
}