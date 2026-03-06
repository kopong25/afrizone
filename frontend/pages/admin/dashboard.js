import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Navbar from "../../components/layout/Navbar";
import { adminAPI } from "../../lib/api";
import { useAuth } from "../_app";
import toast from "react-hot-toast";
import { FiUsers, FiShoppingBag, FiPackage, FiDollarSign, FiCheck, FiX } from "react-icons/fi";

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [pendingSellers, setPendingSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      router.push("/");
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (user?.role === "admin") {
      Promise.all([adminAPI.stats(), adminAPI.pendingSellers()])
        .then(([s, p]) => {
          setStats(s.data);
          setPendingSellers(p.data);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user]);

  const approveSeller = async (storeId, status) => {
    try {
      await adminAPI.approveSeller(storeId, { status });
      toast.success(`Store ${status}`);
      setPendingSellers(pendingSellers.filter((s) => s.id !== storeId));
      const s = await adminAPI.stats();
      setStats(s.data);
    } catch {
      toast.error("Action failed");
    }
  };

  if (authLoading || loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin w-8 h-8 border-4 border-green-900 border-t-transparent rounded-full" /></div>;

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-black text-gray-900 mb-2">Admin Dashboard</h1>
        <p className="text-gray-500 mb-8">Manage the Afrizone platform</p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            { label: "Total Users", value: stats?.total_users, icon: <FiUsers />, color: "bg-blue-50 text-blue-700" },
            { label: "Total Sellers", value: stats?.total_sellers, icon: <FiShoppingBag />, color: "bg-green-50 text-green-700" },
            { label: "Products", value: stats?.total_products, icon: <FiPackage />, color: "bg-purple-50 text-purple-700" },
            { label: "Total Orders", value: stats?.total_orders, icon: <FiShoppingBag />, color: "bg-indigo-50 text-indigo-700" },
            { label: "Platform Revenue", value: `$${(stats?.total_revenue || 0).toFixed(0)}`, icon: <FiDollarSign />, color: "bg-yellow-50 text-yellow-700" },
            { label: "Pending Approvals", value: stats?.pending_sellers, icon: <FiUsers />, color: "bg-red-50 text-red-600", urgent: true },
          ].map((s, i) => (
            <div key={i} className={`bg-white rounded-xl p-4 shadow-sm border ${s.urgent && s.value > 0 ? "border-red-200" : ""}`}>
              <div className={`inline-flex p-2 rounded-lg mb-2 ${s.color}`}>{s.icon}</div>
              <p className="text-xl font-black text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b">
          {["overview", "sellers", "users"].map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
                tab === t ? "border-green-900 text-green-900" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {t}
            </button>
          ))}
        </div>

        {/* Pending Sellers */}
        {(tab === "overview" || tab === "sellers") && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h2 className="font-bold text-gray-800">
                Pending Seller Approvals
                {pendingSellers.length > 0 && (
                  <span className="ml-2 badge bg-red-100 text-red-700">{pendingSellers.length}</span>
                )}
              </h2>
            </div>
            {pendingSellers.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <FiCheck size={32} className="mx-auto mb-2 text-green-500" />
                <p>All sellers reviewed — no pending approvals</p>
              </div>
            ) : (
              <div className="divide-y">
                {pendingSellers.map((store) => (
                  <div key={store.id} className="px-6 py-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-gray-800">{store.name}</p>
                      <p className="text-sm text-gray-500">
                        {store.country} · {store.business_type || "General"} ·
                        Registered {new Date(store.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => approveSeller(store.id, "approved")}
                        className="flex items-center gap-1 bg-green-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-800"
                      >
                        <FiCheck size={14} /> Approve
                      </button>
                      <button
                        onClick={() => approveSeller(store.id, "suspended")}
                        className="flex items-center gap-1 bg-red-50 text-red-600 border border-red-200 text-sm px-4 py-2 rounded-lg hover:bg-red-100"
                      >
                        <FiX size={14} /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
