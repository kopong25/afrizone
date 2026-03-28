import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import api, { ordersAPI, paymentsAPI, discountsAPI } from "../lib/api";
import { useAuth } from "./_app";
import toast from "react-hot-toast";
import { FiTrash2, FiShoppingCart, FiArrowRight, FiLock, FiMapPin, FiTruck, FiLoader } from "react-icons/fi";

const apiErr = (e, fallback = "Something went wrong") => {
  try {
    const d = e?.response?.data?.detail;
    if (Array.isArray(d)) return d.map(x => x.msg || JSON.stringify(x)).join(", ");
    if (typeof d === "string") return d;
  } catch {}
  return String(fallback);
};

// ─── FIX 1: Centralised address validator ────────────────────────────────────
function validateAddress(shipping) {
  const missing = [];
  if (!shipping.name?.trim())    missing.push("Full Name");
  if (!shipping.address?.trim()) missing.push("Street Address");
  if (!shipping.city?.trim())    missing.push("City");
  if (!shipping.state?.trim())   missing.push("State");
  if (!shipping.zip?.trim())     missing.push("ZIP Code");
  return missing;
}

export default function CartPage() {
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [discount, setDiscount] = useState(null);
  const [applyingCode, setApplyingCode] = useState(false);
  const [step, setStep] = useState("cart"); // cart | shipping | delivery | confirm
  const [shipping, setShipping] = useState({
    name: "", address: "", city: "", state: "", country: "USA", zip: "",
  });

  // Delivery routing state
  const [deliveryOptions, setDeliveryOptions] = useState([]);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [loadingDelivery, setLoadingDelivery] = useState(false);
  const [distanceInfo, setDistanceInfo] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login?redirect=/cart"); return; }
    fetchCart();
    if (user?.full_name) setShipping(s => ({ ...s, name: user.full_name }));
  }, [user, authLoading]);

  const fetchCart = async () => {
    try {
      const r = await api.get("/orders/cart/items");
      setItems(r.data?.items || r.data || []);
    } catch { toast.error("Failed to load cart"); }
    finally { setLoading(false); }
  };

  const removeItem = async (itemId) => {
    try {
      await api.delete(`/orders/cart/${itemId}`);
      setItems(prev => prev.filter(i => i.id !== itemId));
      toast.success("Item removed");
    } catch { toast.error("Failed to remove item"); }
  };

  // ── Delivery routing ───────────────────────────────────────────────────────
  const fetchDeliveryOptions = async () => {
    setLoadingDelivery(true);
    setDeliveryOptions([]);
    setSelectedDelivery(null);

    try {
      const storeId = items[0]?.product?.store_id || primaryStore?.id;

      let storeVendorType = null;
      let storeDeliveryType = null;
      if (storeId) {
        try {
          const storeRes = await api.get(`/sellers/${storeId}/public`);
          storeVendorType = storeRes.data?.vendor_type ?? primaryStore?.vendor_type;
          storeDeliveryType = storeRes.data?.delivery_type ?? primaryStore?.delivery_type;
        } catch {
          storeVendorType = primaryStore?.vendor_type;
          storeDeliveryType = primaryStore?.delivery_type;
        }
      } else {
        storeVendorType = primaryStore?.vendor_type;
        storeDeliveryType = primaryStore?.delivery_type;
      }

      const isRestaurant = storeVendorType === "restaurant";
      const offersLocal = ["local_delivery", "both"].includes(storeDeliveryType);
      console.log("[Delivery Debug]", { storeId, storeVendorType, storeDeliveryType, isRestaurant });

      let customerLat = null, customerLng = null;
      try {
        const geo = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            `${shipping.address}, ${shipping.city}, ${shipping.state} ${shipping.zip}`
          )}`
        );
        const geoData = await geo.json();
        if (geoData?.[0]) {
          customerLat = parseFloat(geoData[0].lat);
          customerLng = parseFloat(geoData[0].lon);
        }
      } catch {}

      let uberData = { options: [], distance_miles: null };
      try {
        const res = await api.post("/uber-direct/delivery-options", {
          store_id: storeId,
          customer_lat: customerLat,
          customer_lng: customerLng,
          customer_address: `${shipping.address}, ${shipping.city}, ${shipping.state}`,
        });
        uberData = res.data;
        setDistanceInfo(res.data);
      } catch {
        // Uber endpoint unavailable - use defaults
      }
      const distanceMiles = uberData.distance_miles;
      const isLongDistance = !distanceMiles || distanceMiles >= 15;

      let options = [];

      if (isRestaurant) {
        options = [
          {
            id: "uber_express",
            label: "Uber Express Delivery",
            icon: "🛵",
            price: uberData.options?.find(o => o.id === "uber_express")?.price || 9.99,
            eta: uberData.options?.find(o => o.id === "uber_express")?.eta || "~45 minutes",
            description: "Hot food delivered fresh to your door.",
            provider: "uber_direct",
            quote_id: uberData.options?.find(o => o.id === "uber_express")?.quote_id || null,
          }
        ];
        if (storeDeliveryType === "both") {
          options.push({
            id: "pickup",
            label: "Customer Pickup",
            icon: "🏪",
            price: 0,
            eta: "Ready in ~30 mins",
            description: "Pick up your order directly from the store. No delivery charge.",
            provider: "pickup",
          });
        }
      } else {
        options = [
          { id: "usps_priority", label: "Chippo USPS Shipping", icon: "📬", price: 6.99, eta: "1–2 business days", description: "Fast tracked shipping.", provider: "usps" },
          {
            id: "uber_express",
            label: "Uber Express Delivery",
            icon: "🛵",
            price: uberData.options?.find(o => o.id === "uber_express")?.price || 8.99,
            eta: "2–4 hours",
            description: "Same-day local delivery.",
            provider: "uber_direct",
          },
        ];
        if (["pickup", "both"].includes(storeDeliveryType)) {
          options.push({
            id: "pickup",
            label: "Customer Pickup",
            icon: "🏪",
            price: 0,
            eta: "Pick up at store",
            description: "Collect your order in person. No delivery charge.",
            provider: "pickup",
          });
        }
        if (storeDeliveryType === "pickup") {
          options = [{
            id: "pickup",
            label: "Customer Pickup",
            icon: "🏪",
            price: 0,
            eta: "Pick up at store",
            description: "Collect your order in person. No delivery charge.",
            provider: "pickup",
          }];
        }
      }

      setDeliveryOptions(options);
      setSelectedDelivery(options[0]);
      return true;
    } catch (err) {
      const isRest = primaryStore?.vendor_type === "restaurant";
      const storeDelType = primaryStore?.delivery_type;
      const pickupOption = { id: "pickup", label: "Customer Pickup", icon: "🏪", price: 0, eta: "Pick up at store", description: "Collect your order in person. No delivery charge.", provider: "pickup" };
      const fallback = isRest
        ? storeDelType === "both"
          ? [{ id: "uber_express", label: "Uber Express Delivery", icon: "🛵", price: 8.99, eta: "~45 minutes", description: "Hot food delivered fresh to your door.", provider: "uber_direct" }, pickupOption]
          : [{ id: "uber_express", label: "Uber Express Delivery", icon: "🛵", price: 8.99, eta: "~45 minutes", description: "Hot food delivered fresh to your door.", provider: "uber_direct" }]
        : storeDelType === "pickup"
          ? [pickupOption]
          : ["both", "pickup"].includes(storeDelType)
            ? [{ id: "usps_priority", label: "Chippo USPS Shipping", icon: "📬", price: 6.99, eta: "1–2 business days", provider: "usps" }, { id: "uber_express", label: "Uber Express Delivery", icon: "🛵", price: 8.99, eta: "2–4 hours", provider: "uber_direct" }, pickupOption]
            : [
                { id: "usps_priority", label: "Chippo USPS Shipping", icon: "📬", price: 6.99, eta: "1–2 business days", provider: "usps" },
                { id: "uber_express", label: "Uber Express Delivery", icon: "🛵", price: 8.99, eta: "2–4 hours", provider: "uber_direct" },
              ];
      setDeliveryOptions(fallback);
      setSelectedDelivery(fallback[0]);
      return true;
    } finally {
      setLoadingDelivery(false);
    }
  };

  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const shippingCost = selectedDelivery ? selectedDelivery.price : 0;
  const discountAmount = discount?.discount_amount || 0;
  const total = subtotal + shippingCost - discountAmount;

  const byStore = items.reduce((acc, item) => {
    const storeId = item.product.store?.id || item.product.store_id || "unknown";
    if (!acc[storeId]) acc[storeId] = { 
      store: item.product.store || { id: storeId, name: "Store" }, 
      items: [] 
    };
    acc[storeId].items.push(item);
    return acc;
  }, {});

  const hasRestaurant = Object.values(byStore).some(
    ({ store }) => store.vendor_type === "restaurant"
  );
  const primaryStore = Object.values(byStore)[0]?.store;

  const applyDiscount = async () => {
    if (!discountCode.trim()) return;
    setApplyingCode(true);
    try {
      const res = await discountsAPI.apply(discountCode, subtotal);
      setDiscount(res.data);
      toast.success(`✅ Code applied! You save $${res.data.discount_amount.toFixed(2)}`);
    } catch (err) {
      toast.error(apiErr(err, "Invalid code"));
      setDiscount(null);
    } finally { setApplyingCode(false); }
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;

    // ─── FIX 2: Final address validation before order is placed ──────────────
    const missingFields = validateAddress(shipping);
    if (missingFields.length > 0) {
      toast.error(`Address incomplete — missing: ${missingFields.join(", ")}`);
      setStep("shipping");
      return;
    }

    let authToken = token;
    if (!authToken) { try { authToken = sessionStorage.getItem("az_tok"); } catch {} }
    if (!authToken) { try { authToken = localStorage.getItem("afrizone_token"); } catch {} }
    if (!authToken) { 
      try {
        const m = document.cookie.match(/(?:^|;\s*)afrizone_token=([^;]+)/);
        authToken = m ? decodeURIComponent(m[1]) : null;
      } catch {}
    }

    if (!authToken) {
      toast.error("Please sign in to place your order");
      router.push("/login?redirect=/cart");
      return;
    }
    if (typeof window !== "undefined") {
      try { window._azMemToken = authToken; } catch {}
    }
    const authHeaders = { Authorization: `Bearer ${authToken}` };
    setCheckingOut(true);
    try {
      const createdOrders = [];
      for (const storeGroup of Object.values(byStore)) {
        const orderItems = storeGroup.items.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
        }));
        const resolvedStoreId = parseInt(storeGroup.store?.id) || 
          parseInt(storeGroup.items[0]?.product?.store_id) ||
          parseInt(items[0]?.product?.store_id);
        
        if (!resolvedStoreId) {
          toast.error("Could not determine store. Please refresh and try again.");
          setCheckingOut(false);
          return;
        }

        const orderPayload = {
          store_id: resolvedStoreId,
          items: orderItems,
          // ─── FIX 3: No fake defaults — send real values only ─────────────
          shipping: {
            name:    shipping.name.trim(),
            address: shipping.address.trim(),
            city:    shipping.city.trim(),
            state:   shipping.state.trim(),
            country: shipping.country || "USA",
            zip:     shipping.zip.trim(),
          },
          delivery_method: selectedDelivery?.id || "usps_priority",
          delivery_fee: shippingCost || 0,
          uber_quote_id: selectedDelivery?.quote_id || null,
        };
        console.log("[Order Payload]", JSON.stringify(orderPayload));
        const r = await api.post("/orders/", orderPayload, { headers: authHeaders });
        createdOrders.push(r.data);
      }
      try { await api.delete("/orders/cart/clear", { headers: authHeaders }); } catch {}
      setItems([]);
      if (createdOrders.length > 0) {
        router.push(`/checkout?order_id=${createdOrders[0].id}`);
      } else {
        router.push("/orders");
      }
    } catch (err) {
      const errMsg = apiErr(err, err.message || "Checkout failed. Please try again.");
      console.error("[Order Error]", errMsg);
      toast.error(String(errMsg));
    } finally {
      setCheckingOut(false);
    }
  };

  const steps = ["cart", "shipping", "delivery", "confirm"];
  const stepLabels = ["Cart", "Address", "Delivery", "Confirm"];

  if (loading) return (
    <>
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-12 animate-pulse space-y-4">
        {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}
      </div>
    </>
  );

  return (
    <>
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-black text-gray-900 mb-2">
          🛒 Your Cart {items.length > 0 && <span className="text-gray-400 font-normal text-lg">({items.length} items)</span>}
        </h1>

        {/* Steps */}
        <div className="flex items-center gap-2 mb-8 text-sm">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s ? "bg-green-900 text-white" :
                steps.indexOf(step) > i ? "bg-green-200 text-green-900" : "bg-gray-200 text-gray-500"
              }`}>{i+1}</span>
              <span className={step === s ? "font-semibold text-green-900" : "text-gray-400 hidden sm:inline"}>
                {stepLabels[i]}
              </span>
              {i < steps.length - 1 && <span className="text-gray-300">→</span>}
            </div>
          ))}
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-7xl mb-4">🛒</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Your cart is empty</h2>
            <p className="text-gray-500 mb-6">Discover amazing African products</p>
            <Link href="/" className="btn-primary py-3 px-8">Start Shopping</Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">

              {/* STEP 1 — Cart Items */}
              {step === "cart" && Object.keys(byStore).length > 1 && (
                <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">🛒</span>
                  <div>
                    <p className="font-bold text-red-800">One store per checkout</p>
                    <p className="text-sm text-red-700 mt-1">Afrizone currently supports one store per checkout. You have items from <strong>{Object.keys(byStore).length} different stores</strong>. Please remove items from other stores before proceeding.</p>
                    <div className="mt-3 space-y-1">
                      {Object.values(byStore).map(({store, items: si}) => (
                        <div key={store?.id} className="flex items-center justify-between text-xs bg-white rounded-lg px-3 py-2 border">
                          <span className="font-medium text-gray-700">{store?.name} ({si.length} item{si.length !== 1 ? "s" : ""})</span>
                          <button onClick={async () => {
                            for (const item of si) await api.delete(`/orders/cart/items/${item.id}`).catch(()=>{});
                            const r = await api.get("/orders/cart/items");
                            setItems(r.data?.items || r.data || []);
                            toast.success("Items removed");
                          }} className="text-red-500 hover:text-red-700 font-bold ml-3">Remove</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {step === "cart" && Object.values(byStore).map(({ store, items: storeItems }) => (
                <div key={store?.id} className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                  <div className="bg-green-900 text-white px-4 py-2.5 flex items-center gap-2">
                    {store?.logo_url
                      ? <img src={store.logo_url} className="w-6 h-6 rounded-full object-cover" />
                      : <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center text-green-900 text-xs font-bold">{store?.name?.[0]}</div>
                    }
                    <span className="font-semibold text-sm">{store?.name}</span>
                  </div>
                  {storeItems.map((item) => (
                    <div key={item.id} className="flex gap-4 p-4 border-b last:border-0">
                      <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                        {item.product.images?.[0]
                          ? <img src={item.product.images[0]} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-3xl">🛒</div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm line-clamp-2">{item.product.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">🌍 {item.product.country_of_origin}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="font-bold text-green-900">${(item.product.price * item.quantity).toFixed(2)}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Qty: {item.quantity}</span>
                            <button onClick={() => removeItem(item.id)}
                              className="text-red-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors">
                              <FiTrash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              {/* STEP 2 — Shipping Address */}
              {step === "shipping" && (
                <div className="bg-white rounded-2xl shadow-sm border p-6">
                  <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><FiMapPin /> Delivery Address</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">Full Name <span className="text-red-500">*</span></label>
                      <input value={shipping.name} onChange={(e) => setShipping({...shipping, name: e.target.value})}
                        placeholder="e.g. John Smith"
                        className="w-full border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-900" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">Street Address <span className="text-red-500">*</span></label>
                      <input value={shipping.address} onChange={(e) => setShipping({...shipping, address: e.target.value})}
                        placeholder="123 Main St"
                        className="w-full border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-900" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">City <span className="text-red-500">*</span></label>
                        <input value={shipping.city} onChange={(e) => setShipping({...shipping, city: e.target.value})}
                          placeholder="e.g. Houston"
                          className="w-full border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-900" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">State <span className="text-red-500">*</span></label>
                        <input value={shipping.state} onChange={(e) => setShipping({...shipping, state: e.target.value})}
                          placeholder="e.g. TX"
                          className="w-full border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-900" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Country</label>
                        <select value={shipping.country} onChange={(e) => setShipping({...shipping, country: e.target.value})}
                          className="w-full border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-900">
                          <option>USA</option><option>Canada</option><option>UK</option>
                          <option>Germany</option><option>France</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">ZIP Code <span className="text-red-500">*</span></label>
                        <input value={shipping.zip} onChange={(e) => setShipping({...shipping, zip: e.target.value})}
                          placeholder="e.g. 77001"
                          className="w-full border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-900" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3 — Delivery Options */}
              {step === "delivery" && (
                <div className="bg-white rounded-2xl shadow-sm border p-6">
                  <h2 className="font-bold text-gray-900 mb-1 flex items-center gap-2"><FiTruck /> Choose Delivery</h2>

                  {distanceInfo && (
                    <div className={`text-xs px-3 py-2 rounded-lg mb-4 font-medium ${
                      distanceInfo.distance_zone === "long_distance"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-green-50 text-green-700"
                    }`}>
                      {distanceInfo.distance_miles
                        ? `📍 Store is ${distanceInfo.distance_miles} miles from your address`
                        : "📍 Calculating distance..."}
                      {distanceInfo.distance_zone === "long_distance" && " — shipping only available"}
                      {distanceInfo.sandbox && " (sandbox mode)"}
                    </div>
                  )}

                  {loadingDelivery ? (
                    <div className="flex items-center gap-3 py-8 justify-center text-gray-500">
                      <FiLoader className="animate-spin" size={20} />
                      <span>Finding delivery options for your address...</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {deliveryOptions.map((opt) => (
                        <label key={opt.id}
                          className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            selectedDelivery?.id === opt.id
                              ? "border-green-700 bg-green-50"
                              : "border-gray-200 hover:border-gray-300"
                          }`}>
                          <input type="radio" name="delivery" value={opt.id}
                            checked={selectedDelivery?.id === opt.id}
                            onChange={() => setSelectedDelivery(opt)}
                            className="mt-1 accent-green-700" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-gray-800">{opt.icon} {opt.label}</span>
                              <span className="font-black text-green-900">${opt.price.toFixed(2)}</span>
                            </div>
                            <p className="text-sm text-gray-500 mt-0.5">{opt.eta}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{opt.description}</p>
                            {opt.provider === "uber_direct" && (
                              <span className="inline-block mt-1 text-xs bg-black text-white px-2 py-0.5 rounded-full font-medium">
                                Powered by Uber
                              </span>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 4 — Confirm */}
              {step === "confirm" && (
                <div className="bg-white rounded-2xl shadow-sm border p-6">
                  <h2 className="font-bold text-gray-900 mb-4">✅ Confirm Order</h2>
                  <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-1">
                    <p className="text-sm font-semibold text-gray-700">📦 Delivering to:</p>
                    <p className="text-sm text-gray-600">{shipping.name}</p>
                    <p className="text-sm text-gray-600">{shipping.address}, {shipping.city}, {shipping.state} {shipping.zip}</p>
                    <p className="text-sm text-gray-600">{shipping.country}</p>
                  </div>
                  {selectedDelivery && (
                    <div className="bg-green-50 rounded-xl p-4 mb-4 flex items-center gap-3">
                      <span className="text-2xl">{selectedDelivery.icon}</span>
                      <div>
                        <p className="font-bold text-green-800 text-sm">{selectedDelivery.label}</p>
                        <p className="text-xs text-green-600">{selectedDelivery.eta} · ${selectedDelivery.price.toFixed(2)}</p>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-gray-600">{item.product.name} × {item.quantity}</span>
                        <span className="font-medium">${(item.product.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg p-3">
                      <FiLock size={14} />
                      <span>Secure checkout — your payment info is protected</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Order Summary Sidebar */}
            <div>
              <div className="bg-white rounded-2xl shadow-sm border p-5 sticky top-24">
                <h2 className="font-bold text-gray-900 mb-4">Order Summary</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal ({items.length} items)</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Delivery</span>
                    <span>{selectedDelivery ? `$${shippingCost.toFixed(2)}` : <span className="text-gray-400 text-xs">Select delivery</span>}</span>
                  </div>
                  {selectedDelivery && (
                    <p className="text-xs text-gray-400">{selectedDelivery.icon} {selectedDelivery.label} · {selectedDelivery.eta}</p>
                  )}
                  {/* Discount */}
                  <div className="pt-2">
                    {discount ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-green-800">{discount.code} applied!</p>
                          <p className="text-xs text-green-600">-${discountAmount.toFixed(2)} off</p>
                        </div>
                        <button onClick={() => { setDiscount(null); setDiscountCode(""); }} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input value={discountCode} onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                          placeholder="Discount code"
                          className="flex-1 border rounded-lg px-3 py-2 text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-green-900" />
                        <button onClick={applyDiscount} disabled={applyingCode || !discountCode}
                          className="bg-green-900 text-white text-xs px-3 py-2 rounded-lg hover:bg-green-800 disabled:opacity-50">
                          {applyingCode ? "..." : "Apply"}
                        </button>
                      </div>
                    )}
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-green-600 font-medium text-sm">
                      <span>Discount</span><span>-${discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t pt-3 flex justify-between font-bold text-base">
                    <span>Total</span>
                    <span className="text-green-900">${total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Navigation buttons */}
                {step === "cart" && (
                  <button onClick={() => {
                    if (Object.keys(byStore).length > 1) {
                      toast.error("Please remove items from other stores first");
                      return;
                    }
                    setStep("shipping");
                  }}
                    className="w-full btn-primary py-3 mt-5 flex items-center justify-center gap-2">
                    Continue to Address <FiArrowRight />
                  </button>
                )}

                {step === "shipping" && (
                  <div className="space-y-2 mt-5">
                    <button onClick={async () => {
                      // ─── FIX 4: Trim whitespace + validate state field ────
                      const trimmed = {
                        name:    shipping.name.trim(),
                        address: shipping.address.trim(),
                        city:    shipping.city.trim(),
                        state:   shipping.state.trim(),
                        country: shipping.country,
                        zip:     shipping.zip.trim(),
                      };
                      const missing = validateAddress(trimmed);
                      if (missing.length > 0) {
                        toast.error(`Please fill in: ${missing.join(", ")}`);
                        return;
                      }
                      // Save trimmed values back to state before proceeding
                      setShipping(trimmed);
                      const ok = await fetchDeliveryOptions();
                      if (ok) setStep("delivery");
                    }} disabled={loadingDelivery}
                    className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-60">
                      {loadingDelivery ? <><FiLoader className="animate-spin" /> Loading options...</> : <>Choose Delivery <FiArrowRight /></>}
                    </button>
                    <button onClick={() => setStep("cart")} className="w-full btn-secondary py-2.5 text-sm">← Back to Cart</button>
                  </div>
                )}

                {step === "delivery" && (
                  <div className="space-y-2 mt-5">
                    <button onClick={() => { if (!selectedDelivery) { toast.error("Please select a delivery option"); return; } setStep("confirm"); }}
                      className="w-full btn-primary py-3 flex items-center justify-center gap-2">
                      Review Order <FiArrowRight />
                    </button>
                    <button onClick={() => setStep("shipping")} className="w-full btn-secondary py-2.5 text-sm">← Back</button>
                  </div>
                )}

                {step === "confirm" && (
                  <div className="space-y-2 mt-5">
                    <button onClick={handleCheckout} disabled={checkingOut}
                      className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-60">
                      <FiLock size={14} />
                      {checkingOut ? "Placing Order..." : `Place Order · $${total.toFixed(2)}`}
                    </button>
                    <button onClick={() => setStep("delivery")} className="w-full btn-secondary py-2.5 text-sm">← Back</button>
                  </div>
                )}

                <p className="text-xs text-gray-400 text-center mt-3 flex items-center justify-center gap-1">
                  <FiLock size={10} /> Secure & encrypted checkout
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}