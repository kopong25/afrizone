import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Navbar from "../../components/layout/Navbar";
import { useAuth } from "../_app";
import api from "../../lib/api";
import { FiTrendingUp, FiUsers, FiShoppingBag, FiDollarSign, FiStar, FiArrowLeft } from "react-icons/fi";

function KPI({ label, value, sub, icon: Icon, color = "green" }) {
  const colors = { green: "bg-green-50 text-green-700", blue: "bg-blue-50 text-blue-700", yellow: "bg-yellow-50 text-yellow-700", purple: "bg-purple-50 text-purple-700" };
  return (
    <div className="bg-white rounded-2xl border p-5 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colors[color]}`}><Icon size={18} /></div>
      <p className="text-2xl font-black text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function BarChart({ data, valueKey = "gmv", label = "GMV" }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  return (
    <div className="flex items-end gap-0.5 h-20">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end group relative">
          <div className={`w-full rounded-sm ${d[valueKey] > 0 ? "bg-green-500 group-hover:bg-green-600" : "bg-gray-100"}`}
            style={{ height: `${Math.max((d[valueKey] / max) * 100, d[valueKey] > 0 ? 4 : 2)}%` }} />
          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 z-10 pointer-events-none">
            {d.date?.slice(5)}: ${d[valueKey]?.toFixed(2)}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminAnalytics() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    if (user.role !== "admin") { router.push("/"); return; }
    fetch(days);
  }, [user]);

  const fetch = (d) => {
    setLoading(true);
    api.get(`/admin/analytics?days=${d}`).then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  };

  const handleDays = (d) => { setDays(d); fetch(d); };

  return (
    <>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <Link href="/admin/dashboard" className="text-gray-400 hover:text-gray-600"><FiArrowLeft size={20} /></Link>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2"><FiTrendingUp className="text-green-700" /> Platform Analytics</h1>
          <div className="ml-auto flex gap-2">
            {[7, 30, 90].map(d => (
              <button key={d} onClick={() => handleDays(d)} className={`px-4 py-1.5 rounded-full text-sm font-medium ${days === d ? "bg-green-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{d}d</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4"><div className="col-span-4 h-32 bg-gray-200 rounded-2xl animate-pulse" /></div>
        ) : !data ? null : (
          <>
            {/* All-time stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <KPI label="Total GMV" value={`$${data.all_time.gmv.toFixed(0)}`} sub="All time gross" icon={FiDollarSign} color="green" />
              <KPI label="Platform Fees" value={`$${data.all_time.platform_fees.toFixed(0)}`} sub="All time revenue" icon={FiTrendingUp} color="purple" />
              <KPI label="Total Users" value={data.all_time.total_users} sub={`+${data.period.new_users} this period`} icon={FiUsers} color="blue" />
              <KPI label="Total Orders" value={data.all_time.total_orders} sub={`${data.period.orders} this period`} icon={FiShoppingBag} color="yellow" />
            </div>

            {/* Period stats */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-2xl border shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-gray-900">GMV — Last {days} days</h2>
                  <span className="text-xl font-black text-green-900">${data.period.gmv.toFixed(2)}</span>
                </div>
                <BarChart data={data.daily_chart} valueKey="gmv" />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{data.daily_chart[0]?.date?.slice(5)}</span>
                  <span>{data.daily_chart[data.daily_chart.length - 1]?.date?.slice(5)}</span>
                </div>
              </div>

              <div className="bg-white rounded-2xl border shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-gray-900">Platform Fees — Last {days} days</h2>
                  <span className="text-xl font-black text-purple-700">${data.period.fees.toFixed(2)}</span>
                </div>
                <BarChart data={data.daily_chart} valueKey="fees" />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{data.daily_chart[0]?.date?.slice(5)}</span>
                  <span>{data.daily_chart[data.daily_chart.length - 1]?.date?.slice(5)}</span>
                </div>
              </div>
            </div>

            {/* Top sellers & top products */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border shadow-sm p-6">
                <h2 className="font-bold text-gray-900 mb-4">Top Sellers</h2>
                <div className="space-y-3">
                  {data.top_sellers.filter(s => s.revenue > 0).slice(0, 8).map((s, i) => (
                    <div key={s.id} className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-black text-gray-500 flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{s.name}</p>
                        <p className="text-xs text-gray-400">{s.city} · {s.orders} orders · {s.avg_rating?.toFixed(1)} ★</p>
                      </div>
                      <span className="text-sm font-black text-green-900">${s.revenue.toFixed(2)}</span>
                    </div>
                  ))}
                  {data.top_sellers.every(s => s.revenue === 0) && (
                    <p className="text-gray-400 text-sm text-center py-4">No sales in this period</p>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border shadow-sm p-6">
                <h2 className="font-bold text-gray-900 mb-4">Top Products</h2>
                <div className="space-y-3">
                  {data.top_products.map((p, i) => (
                    <div key={p.id} className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-black text-gray-500 flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.store} · {p.units} units sold</p>
                      </div>
                      <span className="text-sm font-black text-green-900">${p.revenue.toFixed(2)}</span>
                    </div>
                  ))}
                  {data.top_products.length === 0 && (
                    <p className="text-gray-400 text-sm text-center py-4">No sales in this period</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}