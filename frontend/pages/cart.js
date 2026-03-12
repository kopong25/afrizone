import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import api, { ordersAPI, paymentsAPI, discountsAPI } from "../lib/api";
import { useAuth } from "./_app";
import toast from "react-hot-toast";
import { FiTrash2, FiShoppingCart, FiArrowRight, FiLock, FiMapPin, FiTruck, FiLoader } from "react-icons/fi";

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
      await api.delete(`/orders/cart/items/${itemId}`);
      setItems(prev => prev.filter(i => i.id !== itemId));
      toast.success("Item removed");
    } catch { toast.error("Failed to remove item"); }
  };

  // ── Delivery routing ───────────────────────────────────────────────────────
  const fetchDeliveryOptions = async () => {
    if (!shipping.address || !shipping.city || !shipping.zip) {
      toast.error("Please fill in your address first");
      return false;
    }
    setLoadingDelivery(true);
    setDeliveryOptions([]);
    setSelectedDelivery(null);

    try {
      const storeId = primaryStore?.id || items[0]?.product?.store_id;
      const isRestaurant = primaryStore?.vendor_type === "restaurant";
      const offersLocal = ["local_delivery", "both"].includes(primaryStore?.delivery_type);
      console.log("[Delivery Debug]", { 
        storeId, 
        vendor_type: primaryStore?.vendor_type, 
        delivery_type: primaryStore?.delivery_type,
        isRestaurant, 
        offersLocal,
        primaryStore 
      });

      // Geocode customer address
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

      const res = await api.post("/uber-direct/delivery-options", {
        store_id: storeId,
        customer_lat: customerLat,
        customer_lng: customerLng,
        customer_address: `${shipping.address}, ${shipping.city}, ${shipping.state}`,
      });

      setDistanceInfo(res.data);
      const distanceMiles = res.data.distance_miles;
      const isLongDistance = !distanceMiles || distanceMiles >= 15;

      let options = [];

      if (isRestaurant && offersLocal && !isLongDistance) {
        // Restaurant within 15 miles — Uber ONLY, no USPS for hot food
        options = [
          {
            id: "uber_express",
            label: "Uber Express Delivery",
            icon: "🛵",
            price: res.data.options?.find(o => o.id === "uber_express")?.price || 9.99,
            eta: "~45 minutes",
            description: "Hot food delivered fresh to your door.",
            provider: "uber_direct",
          }
        ];
      } else if (isLongDistance) {
        // >15 miles — USPS Priority only
        options = [
          { id: "usps_priority", label: "USPS Priority Mail", icon: "📬", price: 6.99, eta: "1–3 business days", description: "Ships nationwide. Tracking included.", provider: "usps" }
        ];
      } else {
        // Non-restaurant within 15 miles — USPS Standard as default
        options = [
          { id: "usps_standard", label: "USPS Standard Shipping", icon: "📦", price: 4.99, eta: "2–3 business days", description: "Reliable shipping with tracking.", provider: "usps" },
          { id: "usps_priority", label: "USPS Priority Mail", icon: "📬", price: 6.99, eta: "1–2 business days", description: "Faster shipping with tracking.", provider: "usps" },
        ];
        // If store also offers local delivery, add Uber Express as optional fast choice
        if (offersLocal) {
          options.push({
            id: "uber_express",
            label: "Uber Express Delivery",
            icon: "🛵",
            price: res.data.options?.find(o => o.id === "uber_express")?.price || 8.99,
            eta: "2–4 hours",
            description: "Same-day local delivery. Faster but costs more.",
            provider: "uber_direct",
          });
        }
      }

      setDeliveryOptions(options);
      setSelectedDelivery(options[0]);
      return true;
    } catch (err) {
      const fallback = [
        { id: "usps_standard", label: "USPS Standard Shipping", icon: "📦", price: 4.99, eta: "2–3 business days", provider: "usps" },
        { id: "usps_priority", label: "USPS Priority Mail", icon: "📬", price: 6.99, eta: "1–2 business days", provider: "usps" },
      ];
      setDeliveryOptions(fallback);
      setSelectedDelivery(fallback[0]);
      return true;
    } finally {
      setLoadingDelivery(false);
    }
  };

  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const shippingCost = selectedDelivery ? selectedDelivery.price : (subtotal > 50 ? 0 : 4.99);
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

  // Determine if ANY store in cart is a restaurant
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
      toast.error(err.response?.data?.detail || "Invalid code");
      setDiscount(null);
    } finally { setApplyingCode(false); }
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;
    const authToken = token || (() => {
      let t = null;
      try { t = sessionStorage.getItem("az_tok"); } catch {}
      if (!t) { try { t = localStorage.getItem("afrizone_token"); } catch {} }
      return t;
    })();

    if (!authToken) {
      toast.error("Session expired — please sign in again");
      router.push("/login?redirect=/cart");
      return;
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
        const r = await api.post("/orders/", {
          store_id: storeGroup.store.id,
          items: orderItems,
          shipping: {
            name: shipping.name,
            address: shipping.address,
            city: shipping.city,
            state: shipping.state,
            country: shipping.country || "USA",
            zip: shipping.zip,
          },
          delivery_method: selectedDelivery?.id || "usps_standard",
          delivery_fee: shippingCost,
          uber_quote_id: selectedDelivery?.quote_id || null,
        }, { headers: authHeaders });
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
      toast.error(err.response?.data?.detail || "Checkout failed. Please try again.");
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
                      <label className="text-sm font-medium text-gray-700 block mb-1">Full Name</label>
                      <input value={shipping.name} onChange={(e) => setShipping({...shipping, name: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-900" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">Street Address</label>
                      <input value={shipping.address} onChange={(e) => setShipping({...shipping, address: e.target.value})}
                        placeholder="123 Main St"
                        className="w-full border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-900" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">City</label>
                        <input value={shipping.city} onChange={(e) => setShipping({...shipping, city: e.target.value})}
                          className="w-full border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-900" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">State</label>
                        <input value={shipping.state} onChange={(e) => setShipping({...shipping, state: e.target.value})}
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
                        <label className="text-sm font-medium text-gray-700 block mb-1">ZIP Code</label>
                        <input value={shipping.zip} onChange={(e) => setShipping({...shipping, zip: e.target.value})}
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
                  <button onClick={() => setStep("shipping")}
                    className="w-full btn-primary py-3 mt-5 flex items-center justify-center gap-2">
                    Continue to Address <FiArrowRight />
                  </button>
                )}
                {step === "shipping" && (
                  <div className="space-y-2 mt-5">
                    <button onClick={async () => {
                      if (!shipping.name || !shipping.address || !shipping.city || !shipping.zip) {
                        toast.error("Please fill in all address fields"); return;
                      }
                      const ok = await fetchDeliveryOptions();
                      if (ok) setStep("delivery");
                    }} className="w-full btn-primary py-3 flex items-center justify-center gap-2">
                      {loadingDelivery ? <FiLoader className="animate-spin" /> : null}
                      Choose Delivery <FiArrowRight />
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