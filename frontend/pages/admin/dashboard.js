import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import { useAuth } from "../_app";
import toast from "react-hot-toast";
import { FiUsers, FiShoppingBag, FiPackage, FiDollarSign, FiCheck, FiX, FiSearch, FiUserCheck, FiUserX, FiEye, FiStar } from "react-icons/fi";
import api, { adminAPI, productsAPI } from "../../lib/api";

const STATUS_BADGE = {
  approved: "bg-green-100 text-green-700",
  pending:  "bg-yellow-100 text-yellow-700",
  suspended:"bg-red-100 text-red-600",
};

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [pendingSellers, setPendingSellers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [suspendModal, setSuspendModal] = useState(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [deleting, setDeleting] = useState(null);
  const [allStores, setAllStores] = useState([]);
  const [storeSearch, setStoreSearch] = useState("");

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) router.push("/");
  }, [user, authLoading]);

  useEffect(() => {
    if (user?.role === "admin") {
      Promise.all([adminAPI.stats(), adminAPI.pendingSellers(), adminAPI.users(), api.get("/sellers/")])
        .then(([s, p, u, st]) => {
          setStats(s.data);
          setPendingSellers(p.data);
          setUsers(u.data);
          setAllStores(st.data || []);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user]);

  const fetchProducts = async () => {
    setProductsLoading(true);
    try {
      const r = await productsAPI.list({ size: 50, sort: "created_at" });
      setProducts(r.data.items || []);
    } catch { toast.error("Failed to load products"); }
    finally { setProductsLoading(false); }
  };

  const toggleFeatured = async (productId, currentState) => {
    try {
      await adminAPI.featureProduct(productId);
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, is_featured: !currentState } : p));
      toast.success(currentState ? "Removed from featured" : "⭐ Added to featured!");
    } catch { toast.error("Failed to update"); }
  };

  const deleteStore = async (store) => {
    if (!window.confirm(`DELETE "${store.name}"?\n\nThis is permanent and only works if the store has no real orders.`)) return;
    setDeleting(store.id);
    try {
      await adminAPI.deleteStore(store.id);
      toast.success(`${store.name} deleted`);
      const [p, st] = await Promise.all([adminAPI.pendingSellers(), api.get("/sellers/")]);
      setPendingSellers(p.data || []);
      setAllStores(st.data || []);
    } catch(e) {
      toast.error(e.response?.data?.detail || "Cannot delete store");
    } finally { setDeleting(null); }
  };

  const submitSuspend = async () => {
    if (!suspendModal) return;
    try {
      await adminAPI.suspendStore(suspendModal.store.id, { action: suspendModal.action, reason: suspendReason });
      toast.success(suspendModal.action === "suspend" ? "Store suspended" : "Store reactivated");
      setSuspendModal(null);
      setSuspendReason("");
      const [p, st] = await Promise.all([adminAPI.pendingSellers(), api.get("/sellers/")]);
      setPendingSellers(p.data || []);
      setAllStores(st.data || []);
    } catch(e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const approveSeller = async (storeId, status) => {
    try {
      await adminAPI.approveSeller(storeId, { status });
      toast.success(`Store ${status}`);
      setPendingSellers(pendingSellers.filter((s) => s.id !== storeId));
      const [s, u] = await Promise.all([adminAPI.stats(), adminAPI.users()]);
      setStats(s.data);
      setUsers(u.data);
    } catch {
      toast.error("Action failed");
    }
  };

  const filteredUsers = users.filter(u => {
    const matchSearch = !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  if (authLoading || loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin w-8 h-8 border-4 border-green-900 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500">Manage the Afrizone platform</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            { label: "Total Users",      value: stats?.total_users,     icon: <FiUsers />,       color: "bg-blue-50 text-blue-700" },
            { label: "Total Sellers",    value: stats?.total_sellers,   icon: <FiShoppingBag />, color: "bg-green-50 text-green-700" },
            { label: "Products",         value: stats?.total_products,  icon: <FiPackage />,     color: "bg-purple-50 text-purple-700" },
            { label: "Total Orders",     value: stats?.total_orders,    icon: <FiShoppingBag />, color: "bg-indigo-50 text-indigo-700" },
            { label: "Platform Revenue", value: `$${(stats?.total_revenue || 0).toFixed(0)}`, icon: <FiDollarSign />, color: "bg-yellow-50 text-yellow-700" },
            { label: "Pending Approvals",value: stats?.pending_sellers, icon: <FiUsers />,       color: "bg-red-50 text-red-600", urgent: true },
          ].map((s, i) => (
            <div key={i} className={`bg-white rounded-xl p-4 shadow-sm border ${s.urgent && s.value > 0 ? "border-red-200" : ""}`}>
              <div className={`inline-flex p-2 rounded-lg mb-2 ${s.color}`}>{s.icon}</div>
              <p className="text-xl font-black text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b" onClick={(e) => {
          const btn = e.target.closest("button");
          if (btn && btn.textContent.trim().startsWith("products") && products.length === 0) fetchProducts();
        }}>
          {["overview", "sellers", "users", "products"].map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
                tab === t ? "border-green-900 text-green-900" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {t}
              {t === "sellers" && pendingSellers.length > 0 && (
                <span className="ml-1.5 bg-red-100 text-red-700 text-xs font-bold px-1.5 py-0.5 rounded-full">{pendingSellers.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Pending Sellers */}
        {(tab === "overview" || tab === "sellers") && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
            <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
              <h2 className="font-bold text-gray-800">
                Pending Seller Approvals
                {pendingSellers.length > 0 && (
                  <span className="ml-2 bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">{pendingSellers.length}</span>
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
                  <div key={store.id} className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center font-black text-green-900">
                        {store.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{store.name}</p>
                        <p className="text-sm text-gray-500">
                          {store.country} · {store.business_type || "General"}
                        </p>
                        <p className="text-xs text-gray-400">
                          Registered {new Date(store.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => approveSeller(store.id, "approved")}
                        className="flex items-center gap-1 bg-green-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-800">
                        <FiCheck size={14} /> Approve
                      </button>
                      <button onClick={() => approveSeller(store.id, "suspended")}
                        className="flex items-center gap-1 bg-red-50 text-red-600 border border-red-200 text-sm px-4 py-2 rounded-lg hover:bg-red-100">
                        <FiX size={14} /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* All Stores Management */}
        {tab === "sellers" && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
            <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between flex-wrap gap-3">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                All Stores
                <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">{allStores.length}</span>
              </h2>
              <input value={storeSearch} onChange={e => setStoreSearch(e.target.value)}
                placeholder="Search stores..." 
                className="border rounded-lg px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-green-700" />
            </div>
            <div className="divide-y">
              {allStores.filter(s => !storeSearch || s.name?.toLowerCase().includes(storeSearch.toLowerCase()) || s.owner?.email?.toLowerCase().includes(storeSearch.toLowerCase())).map(store => {
                const statusColors = { approved: "bg-green-100 text-green-700", pending: "bg-yellow-100 text-yellow-700", suspended: "bg-red-100 text-red-600" };
                return (
                  <div key={store.id} className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      {store.logo_url
                        ? <img src={store.logo_url} className="w-10 h-10 rounded-full object-cover border" />
                        : <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center font-black text-green-900">{store.name?.[0]}</div>
                      }
                      <div>
                        <p className="font-bold text-gray-800">{store.name}</p>
                        <p className="text-xs text-gray-500">{store.city || store.country} · {store.business_type || store.vendor_type || "General"}</p>
                        <p className="text-xs text-gray-400">{store.owner?.email || ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full capitalize ${statusColors[store.status] || "bg-gray-100 text-gray-500"}`}>
                        {store.status}
                      </span>
                      {store.status !== "approved" && (
                        <button onClick={() => approveSeller(store.id, "approved")}
                          className="text-xs bg-green-100 hover:bg-green-200 text-green-700 font-bold px-3 py-1.5 rounded-lg">
                          ✓ Approve
                        </button>
                      )}
                      {store.status !== "suspended" ? (
                        <button onClick={() => { setSuspendModal({store, action:"suspend"}); setSuspendReason(""); }}
                          className="text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 font-bold px-3 py-1.5 rounded-lg">
                          ⏸ Suspend
                        </button>
                      ) : (
                        <button onClick={() => { setSuspendModal({store, action:"reactivate"}); setSuspendReason(""); }}
                          className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold px-3 py-1.5 rounded-lg">
                          ▶ Reactivate
                        </button>
                      )}
                      <button onClick={() => deleteStore(store)}
                        disabled={deleting === store.id}
                        className="text-xs bg-red-100 hover:bg-red-200 text-red-700 font-bold px-3 py-1.5 rounded-lg disabled:opacity-50">
                        🗑 Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Users Table */}
        {(tab === "overview" || tab === "users") && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-bold text-gray-800">
                All Users
                <span className="ml-2 text-gray-400 font-normal text-sm">({filteredUsers.length})</span>
              </h2>
              <div className="flex gap-2 flex-wrap">
                {/* Search */}
                <div className="relative">
                  <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search name or email..."
                    className="pl-8 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-900 w-56" />
                </div>
                {/* Role filter */}
                <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
                  className="text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-900">
                  <option value="">All Roles</option>
                  <option value="buyer">Buyers</option>
                  <option value="seller">Sellers</option>
                  <option value="admin">Admins</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3 text-left">User</th>
                    <th className="px-6 py-3 text-left">Email</th>
                    <th className="px-6 py-3 text-left">Role</th>
                    <th className="px-6 py-3 text-left">Store</th>
                    <th className="px-6 py-3 text-left">Joined</th>
                    <th className="px-6 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">No users found</td></tr>
                  ) : filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center font-bold text-green-900 text-xs flex-shrink-0">
                            {u.full_name?.[0]?.toUpperCase() || "?"}
                          </div>
                          <span className="font-medium text-gray-800">{u.full_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-gray-600">{u.email}</td>
                      <td className="px-6 py-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full capitalize ${
                          u.role === "admin" ? "bg-purple-100 text-purple-700" :
                          u.role === "seller" ? "bg-blue-100 text-blue-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>{u.role}</span>
                      </td>
                      <td className="px-6 py-3">
                        {u.store_name ? (
                          <div>
                            <p className="font-medium text-gray-800">{u.store_name}</p>
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full capitalize ${STATUS_BADGE[u.store_status] || "bg-gray-100 text-gray-500"}`}>
                              {u.store_status}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-gray-500 text-xs">
                        {new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${u.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Products Tab */}
        {tab === "products" && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
              <h2 className="font-bold text-gray-800">All Products
                <span className="ml-2 text-gray-400 font-normal text-sm">({products.length})</span>
              </h2>
              <button onClick={fetchProducts} className="text-sm text-green-900 hover:underline">↻ Refresh</button>
            </div>
            {productsLoading ? (
              <div className="py-16 text-center text-gray-400">
                <div className="animate-spin w-8 h-8 border-4 border-green-900 border-t-transparent rounded-full mx-auto mb-3" />
                Loading products...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 text-left">Product</th>
                      <th className="px-4 py-3 text-left">Store</th>
                      <th className="px-4 py-3 text-left">Price</th>
                      <th className="px-4 py-3 text-left">Stock</th>
                      <th className="px-4 py-3 text-center">Featured</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {products.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {p.images?.[0] && <img src={p.images[0]} className="w-10 h-10 rounded-lg object-cover" />}
                            <div>
                              <p className="font-medium text-gray-800 max-w-xs truncate">{p.name}</p>
                              <p className="text-xs text-gray-400">{p.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{p.store?.name || `Store #${p.store_id}`}</td>
                        <td className="px-4 py-3 font-bold text-gray-900">${Number(p.price).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${p.stock > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                            {p.stock > 0 ? p.stock : "Out"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => toggleFeatured(p.id, p.is_featured)}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                              p.is_featured
                                ? "bg-yellow-400 text-yellow-900 hover:bg-yellow-300"
                                : "bg-gray-100 text-gray-500 hover:bg-yellow-100 hover:text-yellow-700"
                            }`}>
                            <FiStar size={12} className={p.is_featured ? "fill-yellow-700" : ""} />
                            {p.is_featured ? "Featured" : "Feature"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
      <Footer />
      {/* Suspend Modal */}
      {suspendModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-black text-gray-900 text-lg mb-1">
              {suspendModal.action === "suspend" ? "⏸ Suspend Store" : "▶ Reactivate Store"}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {suspendModal.action === "suspend"
                ? `Suspending "${suspendModal.store.name}" will hide it from all customers. The seller will be notified.`
                : `Reactivating "${suspendModal.store.name}" will make it visible to customers again.`}
            </p>
            {suspendModal.action === "suspend" && (
              <div className="mb-4">
                <label className="text-xs font-bold text-gray-600 block mb-1">Reason (sent to seller)</label>
                <textarea value={suspendReason} onChange={e => setSuspendReason(e.target.value)}
                  placeholder="e.g. Policy violation, pending review, fraudulent activity..."
                  rows={3}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700" />
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setSuspendModal(null)}
                className="flex-1 border-2 border-gray-200 text-gray-600 font-bold py-2.5 rounded-xl hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={submitSuspend}
                className={`flex-1 text-white font-black py-2.5 rounded-xl transition-colors ${
                  suspendModal.action === "suspend" ? "bg-orange-500 hover:bg-orange-600" : "bg-green-700 hover:bg-green-800"
                }`}>
                {suspendModal.action === "suspend" ? "Suspend Store" : "Reactivate Store"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
