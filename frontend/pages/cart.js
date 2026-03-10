import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { ordersAPI, paymentsAPI, discountsAPI } from "../lib/api";
import { useAuth } from "./_app";
import toast from "react-hot-toast";
import { FiTrash2, FiMinus, FiPlus, FiShoppingCart, FiArrowRight, FiLock } from "react-icons/fi";

export default function CartPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [discount, setDiscount] = useState(null);
  const [applyingCode, setApplyingCode] = useState(false);
  const [step, setStep] = useState("cart"); // cart | shipping | confirm
  const [shipping, setShipping] = useState({
    name: user?.full_name || "",
    address: "", city: "", state: "", country: "USA", zip: "",
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login?redirect=/cart"); return; }
    fetchCart();
  }, [user, authLoading]);

  const fetchCart = async () => {
    try {
      const res = await ordersAPI.cart();
      setItems(res.data);
    } catch (err) {
      toast.error("Failed to load cart");
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (id) => {
    try {
      await ordersAPI.removeFromCart(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success("Removed from cart");
    } catch {
      toast.error("Failed to remove item");
    }
  };

  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const shipping_cost = subtotal > 50 ? 0 : 5.99;
  const discountAmount = discount?.discount_amount || 0;
  const total = subtotal + shipping_cost - discountAmount;

  // Group items by store
  const byStore = items.reduce((acc, item) => {
    const storeId = item.product.store_id || item.product.store?.id || "unknown";
    if (!acc[storeId]) acc[storeId] = { store: { id: storeId, name: item.product.store?.name || "Store" }, items: [] };
    acc[storeId].items.push(item);
    return acc;
  }, {});

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
    setCheckingOut(true);
    try {
      // Create order for each store and redirect to payment
      const createdOrders = [];
      for (const storeGroup of Object.values(byStore)) {
        const orderItems = storeGroup.items.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
        }));
        const r = await ordersAPI.create({
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
        });
        createdOrders.push(r.data);
      }
      // Clear cart
      try { await ordersAPI.clearCart(); } catch {}
      setItems([]);
      // Redirect to Stripe checkout for first order
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
          {["cart", "shipping", "confirm"].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s ? "bg-green-900 text-white" : 
                ["cart","shipping","confirm"].indexOf(step) > i ? "bg-green-200 text-green-900" : "bg-gray-200 text-gray-500"
              }`}>{i+1}</span>
              <span className={step === s ? "font-semibold text-green-900" : "text-gray-400"}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </span>
              {i < 2 && <span className="text-gray-300">→</span>}
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
            {/* Cart Items / Shipping Form */}
            <div className="lg:col-span-2 space-y-4">
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
                        <Link href={`/products/${item.product.slug}`} className="font-semibold text-gray-800 hover:text-green-900 text-sm line-clamp-2">
                          {item.product.name}
                        </Link>
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

              {step === "shipping" && (
                <div className="bg-white rounded-2xl shadow-sm border p-6">
                  <h2 className="font-bold text-gray-900 mb-4">📦 Shipping Details</h2>
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

              {step === "confirm" && (
                <div className="bg-white rounded-2xl shadow-sm border p-6">
                  <h2 className="font-bold text-gray-900 mb-4">✅ Confirm Order</h2>
                  <div className="bg-gray-50 rounded-xl p-4 mb-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">📦 Shipping to:</p>
                    <p className="text-sm text-gray-600">{shipping.name}</p>
                    <p className="text-sm text-gray-600">{shipping.address}, {shipping.city}, {shipping.state} {shipping.zip}</p>
                    <p className="text-sm text-gray-600">{shipping.country}</p>
                  </div>
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

            {/* Order Summary */}
            <div>
              <div className="bg-white rounded-2xl shadow-sm border p-5 sticky top-24">
                <h2 className="font-bold text-gray-900 mb-4">Order Summary</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal ({items.length} items)</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span>{shipping_cost === 0 ? <span className="text-green-600 font-medium">FREE</span> : `$${shipping_cost.toFixed(2)}`}</span>
                  </div>
                  {shipping_cost > 0 && (
                    <p className="text-xs text-green-600">Add ${(50 - subtotal).toFixed(2)} more for free shipping!</p>
                  )}
                  {/* Discount code input */}
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

                {step === "cart" && (
                  <button onClick={() => setStep("shipping")}
                    className="w-full btn-primary py-3 mt-5 flex items-center justify-center gap-2">
                    Continue to Shipping <FiArrowRight />
                  </button>
                )}
                {step === "shipping" && (
                  <div className="space-y-2 mt-5">
                    <button onClick={() => {
                      if (!shipping.name || !shipping.address || !shipping.city) {
                        toast.error("Please fill in all shipping fields"); return;
                      }
                      setStep("confirm");
                    }} className="w-full btn-primary py-3 flex items-center justify-center gap-2">
                      Review Order <FiArrowRight />
                    </button>
                    <button onClick={() => setStep("cart")} className="w-full btn-secondary py-2.5 text-sm">← Back to Cart</button>
                  </div>
                )}
                {step === "confirm" && (
                  <div className="space-y-2 mt-5">
                    <button onClick={handleCheckout} disabled={checkingOut}
                      className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-60">
                      <FiLock size={14} />
                      {checkingOut ? "Placing Order..." : `Place Order · $${total.toFixed(2)}`}
                    </button>
                    <button onClick={() => setStep("shipping")} className="w-full btn-secondary py-2.5 text-sm">← Back</button>
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