import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { useAuth } from "./_app";
import api from "../lib/api";
import toast from "react-hot-toast";
import { FiLock, FiArrowLeft, FiCheck } from "react-icons/fi";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

// ─── Inner Payment Form ───────────────────────────────────────
function PaymentForm({ orderId, total, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState(null);

  const handlePay = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPaying(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) { setError(submitError.message); setPaying(false); return; }

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/orders?paid=1`,
      },
    });

    if (confirmError) {
      setError(confirmError.message);
      setPaying(false);
    }
    // On success Stripe redirects to return_url
  };

  return (
    <form onSubmit={handlePay}>
      <PaymentElement options={{ layout: "tabs" }} />
      {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
      <button type="submit" disabled={!stripe || paying}
        className="w-full mt-5 bg-green-900 hover:bg-green-800 disabled:opacity-50 text-white py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 transition-colors">
        <FiLock size={18} />
        {paying ? "Processing..." : `Pay $${total.toFixed(2)}`}
      </button>
      <p className="text-center text-xs text-gray-400 mt-3 flex items-center justify-center gap-1">
        <FiLock size={11} /> Secured by Stripe · 256-bit SSL encryption
      </p>
    </form>
  );
}

// ─── Main Checkout Page ───────────────────────────────────────
export default function CheckoutPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { order_id } = router.query;

  const [order, setOrder] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authLoading) return; // Wait for auth to load
    if (!user) { router.push("/login?redirect=/checkout?order_id=" + order_id); return; }
    if (!order_id) return;
    initPayment();
  }, [user, order_id, authLoading]);

  const initPayment = async () => {
    try {
      // Fetch order details
      const orderRes = await api.get(`/orders/${order_id}`);
      setOrder(orderRes.data);

      // Create payment intent
      const payRes = await api.post("/payments/checkout", { order_id: parseInt(order_id) });
      setClientSecret(payRes.data.client_secret);
    } catch (e) {
      const msg = e.response?.data?.detail || "Failed to initialize payment";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <>
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-green-700 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-500">Setting up secure payment…</p>
      </div>
    </>
  );

  if (error) return (
    <>
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Payment Setup Failed</h2>
        <p className="text-gray-500 mb-6">{error}</p>
        <Link href="/orders" className="bg-green-900 text-white px-6 py-3 rounded-xl font-bold">View Orders</Link>
      </div>
    </>
  );

  return (
    <>
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/orders" className="text-gray-400 hover:text-gray-600"><FiArrowLeft size={20} /></Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Secure Checkout</h1>
            <p className="text-sm text-gray-400">Order #{order_id}</p>
          </div>
        </div>

        {/* Order summary */}
        {order && (
          <div className="bg-gray-50 rounded-2xl p-5 mb-6 border">
            <h2 className="font-bold text-gray-900 mb-3">Order Summary</h2>
            <div className="space-y-2">
              {order.items?.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">{item.product?.name} × {item.quantity}</span>
                  <span className="font-medium">${Number(item.total_price).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2 space-y-1">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal</span><span>${Number(order.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Shipping</span>
                  <span>{order.shipping_cost === 0 ? "FREE" : `$${Number(order.shipping_cost).toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between font-black text-gray-900 text-lg pt-1 border-t">
                  <span>Total</span><span>${Number(order.total).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Shipping to */}
            <div className="mt-4 pt-3 border-t">
              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Shipping To</p>
              <p className="text-sm text-gray-700">{order.shipping_name}</p>
              <p className="text-sm text-gray-500">{order.shipping_address}, {order.shipping_city}, {order.shipping_state} {order.shipping_zip}</p>
            </div>
          </div>
        )}

        {/* Stripe Payment Form */}
        {clientSecret && (
          <div className="bg-white border rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FiLock size={16} className="text-green-700" /> Payment Details
            </h2>
            <Elements stripe={stripePromise} options={{
              clientSecret,
              appearance: {
                theme: "stripe",
                variables: { colorPrimary: "#1A5C38", borderRadius: "10px" }
              }
            }}>
              <PaymentForm orderId={parseInt(order_id)} total={Number(order?.total || 0)} />
            </Elements>
          </div>
        )}

        {/* Test card hint */}
        <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-xs font-bold text-blue-700 mb-1">🧪 Test Mode — Use test card:</p>
          <p className="text-xs text-blue-600 font-mono">4242 4242 4242 4242 · Any future date · Any CVC</p>
        </div>
      </div>
      <Footer />
    </>
  );
}