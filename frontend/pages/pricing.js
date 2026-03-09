import Link from "next/link";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { FiCheck, FiX } from "react-icons/fi";

const plans = [
  {
    name: "Basic",
    price: "Free",
    period: "",
    commission: "10%",
    products: "Up to 10",
    color: "border-gray-200",
    badge: "",
    cta: "Start for Free",
    ctaStyle: "border-2 border-green-900 text-green-900 hover:bg-green-50",
    features: [
      { text: "Up to 10 products", included: true },
      { text: "10% commission per sale", included: true },
      { text: "Basic store page", included: true },
      { text: "Order management", included: true },
      { text: "Buyer messaging", included: true },
      { text: "Analytics dashboard", included: false },
      { text: "Priority search placement", included: false },
      { text: "Discount codes", included: false },
      { text: "Dedicated support", included: false },
    ],
  },
  {
    name: "Standard",
    price: "$29",
    period: "/month",
    commission: "7%",
    products: "Up to 100",
    color: "border-green-900 shadow-xl shadow-green-900/10",
    badge: "Most Popular",
    cta: "Start Standard",
    ctaStyle: "bg-green-900 text-white hover:bg-green-800",
    features: [
      { text: "Up to 100 products", included: true },
      { text: "7% commission per sale", included: true },
      { text: "Enhanced store page", included: true },
      { text: "Order management", included: true },
      { text: "Buyer messaging", included: true },
      { text: "Analytics dashboard", included: true },
      { text: "Priority search placement", included: true },
      { text: "Discount codes", included: true },
      { text: "Dedicated support", included: false },
    ],
  },
  {
    name: "Premium",
    price: "$79",
    period: "/month",
    commission: "4%",
    products: "Unlimited",
    color: "border-yellow-400 shadow-xl shadow-yellow-400/20",
    badge: "Best Value",
    cta: "Start Premium",
    ctaStyle: "bg-yellow-400 text-green-900 hover:bg-yellow-300 font-black",
    features: [
      { text: "Unlimited products", included: true },
      { text: "4% commission per sale", included: true },
      { text: "Premium store page + banner", included: true },
      { text: "Order management", included: true },
      { text: "Buyer messaging", included: true },
      { text: "Analytics dashboard", included: true },
      { text: "Priority search placement", included: true },
      { text: "Discount codes", included: true },
      { text: "Dedicated support", included: true },
    ],
  },
];

export default function PricingPage() {
  return (
    <>
      <Navbar />

      {/* Hero */}
      <div className="bg-gradient-to-br from-green-900 to-green-800 text-white py-16 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-black mb-4">Simple, Transparent Pricing</h1>
        <p className="text-green-200 text-lg max-w-xl mx-auto">
          Start free and scale as your African store grows. No hidden fees, no surprises.
        </p>
      </div>

      {/* Plans */}
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div key={plan.name} className={`relative border-2 ${plan.color} rounded-2xl p-8 bg-white flex flex-col`}>
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className={`text-xs font-black px-4 py-1 rounded-full ${plan.name === "Premium" ? "bg-yellow-400 text-green-900" : "bg-green-900 text-white"}`}>
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h2 className="text-xl font-black text-gray-900 mb-1">{plan.name}</h2>
                <div className="flex items-end gap-1 mb-2">
                  <span className="text-4xl font-black text-gray-900">{plan.price}</span>
                  <span className="text-gray-400 mb-1">{plan.period}</span>
                </div>
                <div className="flex gap-4 text-sm text-gray-600">
                  <span className="bg-gray-100 px-2 py-1 rounded-lg">💸 {plan.commission} commission</span>
                  <span className="bg-gray-100 px-2 py-1 rounded-lg">📦 {plan.products}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    {f.included
                      ? <FiCheck size={16} className="text-green-600 flex-shrink-0" />
                      : <FiX size={16} className="text-gray-300 flex-shrink-0" />}
                    <span className={f.included ? "text-gray-700" : "text-gray-400"}>{f.text}</span>
                  </li>
                ))}
              </ul>

              <Link href="/register?role=seller"
                className={`w-full text-center py-3 rounded-xl font-bold transition-colors ${plan.ctaStyle}`}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Commission explainer */}
        <div className="mt-16 bg-green-50 border border-green-100 rounded-2xl p-8">
          <h3 className="text-xl font-black text-gray-900 mb-4 text-center">How commissions work</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            {[
              { label: "Customer pays", value: "$100.00", color: "text-gray-900" },
              { label: "Afrizone fee (Basic 10%)", value: "−$10.00", color: "text-red-500" },
              { label: "You receive", value: "$90.00", color: "text-green-700" },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-sm text-gray-500 mb-1">{item.label}</p>
                <p className={`text-3xl font-black ${item.color}`}>{item.value}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-500 mt-6">
            Upgrade to Standard or Premium to keep more of every sale. A $100 sale on Premium earns you <strong>$96</strong>.
          </p>
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <h3 className="text-2xl font-black text-gray-900 mb-8 text-center">Frequently Asked Questions</h3>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { q: "Can I start for free?", a: "Yes! The Basic plan is completely free. You only pay when you make a sale (10% commission)." },
              { q: "When am I charged?", a: "Subscription plans are billed monthly. Commissions are automatically deducted from each sale." },
              { q: "Can I change plans anytime?", a: "Yes, you can upgrade or downgrade at any time from your seller dashboard." },
              { q: "Do I need a Stripe account?", a: "Yes, you'll connect a free Stripe Express account to receive payouts directly to your bank." },
              { q: "What countries can I sell from?", a: "Any African store operating in the USA, Canada, or Europe can sell on Afrizone." },
              { q: "How fast do I get paid?", a: "Stripe sends payouts to your bank within 2–7 business days after a sale." },
            ].map((item) => (
              <div key={item.q} className="bg-white border rounded-xl p-5">
                <p className="font-bold text-gray-900 mb-2">{item.q}</p>
                <p className="text-gray-500 text-sm">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 bg-green-900 text-white rounded-2xl p-10 text-center">
          <h3 className="text-3xl font-black mb-3">Ready to start selling?</h3>
          <p className="text-green-200 mb-6">Join African sellers already earning on Afrizone.</p>
          <Link href="/register?role=seller"
            className="bg-yellow-400 text-green-900 font-black px-8 py-4 rounded-xl hover:bg-yellow-300 transition-colors inline-block">
            Open Your Store — It's Free
          </Link>
        </div>
      </div>

      <Footer />
    </>
  );
}