import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { ordersAPI } from "../lib/api";
import { useAuth } from "./_app";
import toast from "react-hot-toast";
import { FiPackage, FiTruck, FiCheck, FiClock, FiX, FiChevronDown, FiChevronUp } from "react-icons/fi";

const STATUS_STEPS = ["pending", "paid", "processing", "shipped", "delivered"];

const STATUS_CONFIG = {
  pending:    { label: "Pending",    color: "bg-yellow-100 text-yellow-800", icon: FiClock },
  paid:       { label: "Paid",       color: "bg-blue-100 text-blue-800",    icon: FiCheck },
  processing: { label: "Processing", color: "bg-purple-100 text-purple-800", icon: FiPackage },
  shipped:    { label: "Shipped",    color: "bg-orange-100 text-orange-800", icon: FiTruck },
  delivered:  { label: "Delivered",  color: "bg-green-100 text-green-800",  icon: FiCheck },
  cancelled:  { label: "Cancelled",  color: "bg-red-100 text-red-800",      icon: FiX },
  refunded:   { label: "Refunded",   color: "bg-gray-100 text-gray-600",    icon: FiX },
};

function OrderTracker({ status }) {
  const currentStep = STATUS_STEPS.indexOf(status);
  if (status === "cancelled" || status === "refunded") return (
    <div className="flex items-center gap-2 text-red-500 text-sm">
      <FiX /> Order {status}
    </div>
  );
  return (
    <div className="flex items-center gap-1 mt-3">
      {STATUS_STEPS.map((step, i) => {
        const done = i <= currentStep;
        const active = i === currentStep;
        return (
          <div key={step} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                done ? "bg-green-900 text-white" : "bg-gray-200 text-gray-400"
              } ${active ? "ring-2 ring-green-900 ring-offset-2" : ""}`}>
                {done ? <FiCheck size={12} /> : i + 1}
              </div>
              <span className={`text-xs mt-1 text-center hidden md:block ${done ? "text-green-900 font-medium" : "text-gray-400"}`}>
                {step.charAt(0).toUpperCase() + step.slice(1)}
              </span>
            </div>
            {i < STATUS_STEPS.length - 1 && (
              <div className={`h-1 flex-1 rounded transition-all ${i < currentStep ? "bg-green-900" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function OrderCard({ order }) {
  const [expanded, setExpanded] = useState(false);
  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const Icon = config.icon;

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
      <div className="p-4 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="font-bold text-gray-900">Order #{order.id}</span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.color}`}>
              <Icon size={10} /> {config.label}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            {new Date(order.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            {order.store && <span> · {order.store.name}</span>}
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold text-green-900 text-lg">${Number(order.total || 0).toFixed(2)}</p>
          <button onClick={() => setExpanded(!expanded)}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 mt-1 ml-auto">
            {expanded ? <><FiChevronUp size={12} /> Less</> : <><FiChevronDown size={12} /> Details</>}
          </button>
        </div>
      </div>

      <div className="px-4 pb-4">
        <OrderTracker status={order.status} />
      </div>

      {order.tracking_number && (
        <div className="px-4 pb-3">
          <div className="bg-blue-50 rounded-lg p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-600 font-semibold">Tracking Number</p>
              <p className="text-sm font-mono font-bold text-blue-800">{order.tracking_number}</p>
            </div>
            {order.tracking_url && (
              <a href={order.tracking_url} target="_blank" rel="noreferrer"
                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">
                Track →
              </a>
            )}
          </div>
        </div>
      )}

      {expanded && (
        <div className="border-t bg-gray-50 p-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Items</p>
              <div className="space-y-2">
                {(order.items || []).map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                      {item.product?.images?.[0]
                        ? <img src={item.product.images[0]} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-xl">🛒</div>
                      }
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{item.product?.name || "Product"}</p>
                      <p className="text-xs text-gray-500">Qty: {item.quantity} · ${Number(item.unit_price || 0).toFixed(2)} each</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Shipping Address</p>
              {order.shipping_name ? (
                <div className="text-sm text-gray-600 space-y-0.5">
                  <p className="font-medium text-gray-800">{order.shipping_name}</p>
                  <p>{order.shipping_address}</p>
                  <p>{order.shipping_city}, {order.shipping_state} {order.shipping_zip}</p>
                  <p>{order.shipping_country}</p>
                </div>
              ) : <p className="text-sm text-gray-400">No shipping address provided</p>}
              <div className="mt-3 pt-3 border-t space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Subtotal</span><span>${Number(order.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Shipping</span><span>${Number(order.shipping_cost || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-gray-800">
                  <span>Total</span><span>${Number(order.total || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    ordersAPI.myOrders()
      .then((r) => {
        const data = r.data;
        if (Array.isArray(data)) setOrders(data);
        else if (Array.isArray(data?.items)) setOrders(data.items);
        else setOrders([]);
      })
      .catch(() => { toast.error("Failed to load orders"); setOrders([]); })
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  const filtered = Array.isArray(orders)
    ? (filter === "all" ? orders : orders.filter((o) => o.status === filter))
    : [];

  return (
    <>
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-gray-900">My Orders</h1>
          <Link href="/" className="btn-secondary py-2 px-4 text-sm">Continue Shopping</Link>
        </div>

        <div className="flex gap-2 overflow-x-auto mb-6" style={{ scrollbarWidth: "none" }}>
          {["all", "pending", "paid", "processing", "shipped", "delivered", "cancelled"].map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-all ${
                filter === s ? "bg-green-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-40 bg-gray-200 rounded-2xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">No orders yet</h2>
            <p className="text-gray-500 mb-6">Start shopping to see your orders here</p>
            <Link href="/" className="btn-primary py-3 px-8">Shop Now</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((order) => <OrderCard key={order.id} order={order} />)}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}