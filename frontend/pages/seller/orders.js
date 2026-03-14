import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import { useAuth } from "../_app";
import api from "../../lib/api";
import toast from "react-hot-toast";
import { FiPackage, FiArrowLeft, FiTruck, FiCheck, FiClock, FiX, FiDownload } from "react-icons/fi";

// Safe error extractor — handles Pydantic arrays, strings, and undefined
const apiErr = (e, fallback = "Something went wrong") => {
  const d = e?.response?.data?.detail;
  if (Array.isArray(d)) return d.map(x => x.msg || JSON.stringify(x)).join(", ");
  if (typeof d === "string") return d;
  return fallback;
};

function getPackagingUrgency(order) {
  if (order.status !== "paid") return null;
  const paid = new Date(order.updated_at || order.created_at);
  const now = new Date();
  const hoursElapsed = (now - paid) / (1000 * 60 * 60);
  const hoursLeft = 24 - hoursElapsed;
  if (hoursLeft < 0) return { level: "overdue", label: "⚠️ Package overdue!", color: "bg-red-100 border-red-300 text-red-800" };
  if (hoursLeft < 4) return { level: "urgent", label: `🔴 Package in ${Math.round(hoursLeft)}h`, color: "bg-red-50 border-red-200 text-red-700" };
  if (hoursLeft < 12) return { level: "soon", label: `🟡 Package within ${Math.round(hoursLeft)}h`, color: "bg-yellow-50 border-yellow-200 text-yellow-700" };
  return { level: "ok", label: `🟢 Package by ${new Date(paid.getTime() + 24*60*60*1000).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}`, color: "bg-green-50 border-green-200 text-green-700" };
}

const STATUS_STYLES = {
  pending:    { bg: "bg-yellow-100 text-yellow-800", label: "Pending" },
  paid:       { bg: "bg-blue-100 text-blue-800",     label: "Paid" },
  processing: { bg: "bg-purple-100 text-purple-800", label: "Processing" },
  shipped:    { bg: "bg-orange-100 text-orange-800", label: "Shipped" },
  delivered:  { bg: "bg-green-100 text-green-800",   label: "Delivered" },
  cancelled:  { bg: "bg-red-100 text-red-800",       label: "Cancelled" },
};

const STATUS_FLOW = ["pending", "paid", "processing", "shipped", "delivered"];

export default function SellerOrders() {
  const { user } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [trackingInputs, setTrackingInputs] = useState({});

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    if (user.role !== "seller" && user.role !== "admin") { router.push("/"); return; }
    fetchOrders();
  }, [user]);

  const fetchOrders = () => {
    api.get("/orders/store-orders")
      .then(r => setOrders(r.data?.items || r.data || []))
      .catch(() => toast.error("Failed to load orders"))
      .finally(() => setLoading(false));
  };

  const dispatchUber = async (orderId) => {
    if (!orderId) return;
    setUpdating(orderId + "_uber");
    try {
      const res = await api.post(`/uber-direct/dispatch/${orderId}`);
      if (res.data.sandbox) {
        toast.success("🛵 Sandbox: Driver dispatch simulated! In production a real Uber driver will be sent.");
      } else {
        toast.success("🛵 Uber driver dispatched! Customer will be notified.");
      }
      fetchOrders();
    } catch (e) {
      toast.error(apiErr(e, "Dispatch failed"));
    } finally { setUpdating(null); }
  };

  const updateStatus = async (orderId, status) => {
    setUpdating(orderId);
    const tracking = trackingInputs[orderId] || {};
    try {
      await api.put(`/orders/${orderId}/status`, {
        status,
        tracking_number: tracking.number || undefined,
        tracking_url: tracking.url || undefined,
      });
      toast.success(`Order marked as ${status}`);
      fetchOrders();
    } catch (e) {
      toast.error(apiErr(e, "Update failed"));
    } finally { setUpdating(null); }
  };

  const downloadLabel = async (orderId) => {
    setUpdating(orderId + "_label");
    try {
      let labelUrl = null;
      try {
        const existing = await api.get(`/shipping/label/${orderId}`);
        labelUrl = existing.data?.label_url;
      } catch {}

      if (!labelUrl) {
        const created = await api.post(`/shipping/label/${orderId}?rate_id=auto`);
        labelUrl = created.data?.label_url;
        toast.success("Shipping label created!");
        fetchOrders();
      }

      if (labelUrl) {
        const a = document.createElement("a");
        a.href = labelUrl;
        a.target = "_blank";
        a.rel = "noreferrer";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        toast.error("Could not generate label. Try again.");
      }
    } catch (e) {
      toast.error(apiErr(e, "Label generation failed"));
    } finally {
      setUpdating(null);
    }
  };

  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);

  const counts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <Link href="/seller/dashboard" className="text-gray-400 hover:text-gray-600">
            <FiArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <FiPackage className="text-green-700" /> Orders
          </h1>
          <span className="ml-1 text-sm text-gray-400">{orders.length} total</span>
        </div>

        {orders.filter(o => o.status === "paid").length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
            <span className="text-2xl">📦</span>
            <div>
              <p className="font-black text-yellow-800">
                {orders.filter(o => o.status === "paid").length} order{orders.filter(o => o.status === "paid").length > 1 ? "s" : ""} need packaging
              </p>
              <p className="text-sm text-yellow-700 mt-0.5">
                Package and hand to courier within <strong>24 hours</strong> of payment.
                Mark as <strong>Processing</strong> when packaging, <strong>Shipped</strong> once handed to courier.
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-6 flex-wrap">
          {["all", "pending", "paid", "processing", "shipped", "delivered", "cancelled"].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all capitalize ${
                filter === s ? "bg-green-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {s === "all" ? `All (${orders.length})` : `${s} ${counts[s] ? `(${counts[s]})` : ""}`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-2xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <FiPackage size={48} className="mx-auto mb-3" />
            <p className="font-medium text-lg">No {filter !== "all" ? filter : ""} orders yet</p>
            <p className="text-sm mt-1">Orders from customers will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(order => {
              const s = STATUS_STYLES[order.status] || STATUS_STYLES.pending;
              const isExpanded = expanded === order.id;
              const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1];
              const isUberOrder = order.delivery_method === "uber_express";

              return (
                <div key={order.id} className="bg-white border rounded-2xl shadow-sm overflow-hidden">
                  {getPackagingUrgency(order) && (
                    <div className={`px-4 py-2 border-b text-xs font-bold flex items-center gap-2 ${getPackagingUrgency(order).color}`}>
                      {getPackagingUrgency(order).label}
                      <span className="font-normal opacity-75">— Package & hand to courier within 24hrs of payment</span>
                    </div>
                  )}
                  <div className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpanded(isExpanded ? null : order.id)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-gray-900">Order #{order.id}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${s.bg}`}>{s.label}</span>
                        {isUberOrder && <span className="text-xs bg-black text-white px-2 py-0.5 rounded-full">🛵 Uber</span>}
                        {order.tracking_number && (
                          <span className="text-xs text-gray-400 font-mono">{order.tracking_number}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {new Date(order.created_at).toLocaleDateString()} · {order.items?.length || 0} item{order.items?.length !== 1 ? "s" : ""}
                        {order.shipping_name && ` · ${order.shipping_name}`}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-black text-gray-900">${Number(order.total || 0).toFixed(2)}</p>
                      <p className="text-xs text-green-700">Earn ${Number(order.seller_amount || 0).toFixed(2)}</p>
                    </div>
                    <span className="text-gray-400 text-xs">{isExpanded ? "▲" : "▼"}</span>
                  </div>

                  {isExpanded && (
                    <div className="border-t bg-gray-50 p-4">
                      <div className="mb-4">
                        <p className="text-xs font-bold text-gray-500 uppercase mb-2">Items</p>
                        <div className="space-y-2">
                          {(order.items || []).map(item => (
                            <div key={item.id} className="flex items-center gap-3 bg-white rounded-xl p-3 border">
                              {item.product?.images?.[0] && (
                                <img src={item.product.images[0]} className="w-12 h-12 object-cover rounded-lg" />
                              )}
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-gray-800">{item.product?.name || "Product"}</p>
                                <p className="text-xs text-gray-400">Qty: {item.quantity} × ${Number(item.unit_price).toFixed(2)}</p>
                              </div>
                              <p className="font-bold text-gray-900">${Number(item.total_price).toFixed(2)}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {order.shipping_address && (
                        <div className="mb-4 bg-white rounded-xl p-3 border">
                          <p className="text-xs font-bold text-gray-500 uppercase mb-1">
                            {isUberOrder ? "🛵 Deliver To" : "📦 Ship To"}
                          </p>
                          <p className="text-sm text-gray-700">{order.shipping_name}</p>
                          <p className="text-sm text-gray-500">{order.shipping_address}, {order.shipping_city}, {order.shipping_state} {order.shipping_zip}</p>
                        </div>
                      )}

                      {!isUberOrder && order.status !== "delivered" && order.status !== "cancelled" && (
                        <div className="mb-4 grid grid-cols-2 gap-2">
                          <input
                            placeholder="Tracking number (optional)"
                            value={trackingInputs[order.id]?.number || ""}
                            onChange={e => setTrackingInputs(prev => ({ ...prev, [order.id]: { ...prev[order.id], number: e.target.value } }))}
                            className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                          />
                          <input
                            placeholder="Tracking URL (optional)"
                            value={trackingInputs[order.id]?.url || ""}
                            onChange={e => setTrackingInputs(prev => ({ ...prev, [order.id]: { ...prev[order.id], url: e.target.value } }))}
                            className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                          />
                        </div>
                      )}

                      <div className="flex gap-2 flex-wrap">
                        {nextStatus && order.status !== "cancelled" && (
                          <button onClick={() => updateStatus(order.id, nextStatus)}
                            disabled={updating === order.id}
                            className="flex items-center gap-2 bg-green-900 hover:bg-green-800 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-50">
                            {nextStatus === "shipped" ? <FiTruck size={14} /> : nextStatus === "delivered" ? <FiCheck size={14} /> : <FiClock size={14} />}
                            Mark as {nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
                          </button>
                        )}

                        {/* Uber dispatch — only for uber_express orders in processing status */}
                        {isUberOrder && order.status === "processing" && (
                          <button onClick={() => dispatchUber(order.id)}
                            disabled={updating === order.id + "_uber"}
                            className="flex items-center gap-2 bg-black hover:bg-gray-800 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors">
                            🛵 {updating === order.id + "_uber" ? "Dispatching..." : "Dispatch Uber Driver"}
                          </button>
                        )}

                        {/* Shipping label — only for non-Uber orders */}
                        {!isUberOrder && (
                          <button onClick={() => downloadLabel(order.id)}
                            disabled={updating === order.id + "_label"}
                            className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-green-900 px-4 py-2 rounded-xl text-sm font-bold transition-colors">
                            <FiDownload size={14} /> {updating === order.id + "_label" ? "Generating..." : "Shipping Label"}
                          </button>
                        )}

                        {order.status === "pending" && (
                          <button onClick={() => updateStatus(order.id, "cancelled")}
                            disabled={updating === order.id}
                            className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                            <FiX size={14} /> Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}