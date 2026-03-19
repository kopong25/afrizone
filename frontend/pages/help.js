import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import Head from "next/head";
import Link from "next/link";
import { FiPhone, FiMail, FiMessageSquare, FiPackage, FiCreditCard, FiTruck, FiUser, FiShoppingBag, FiChevronDown } from "react-icons/fi";
import { useState } from "react";

const faqs = [
  {
    category: "Orders & Payments",
    icon: <FiCreditCard />,
    color: "bg-blue-50 text-blue-700",
    questions: [
      { q: "How do I place an order?", a: "Browse products, add items to your cart, enter your delivery address, choose a delivery method, and complete payment via Stripe. You'll receive a confirmation email once your order is placed." },
      { q: "What payment methods are accepted?", a: "We accept all major credit and debit cards (Visa, Mastercard, Amex) processed securely by Stripe. Card details are never stored on our servers." },
      { q: "Can I cancel my order?", a: "Orders can be cancelled before the seller marks them as processing. Contact the seller directly via our messaging system as soon as possible." },
      { q: "How do I get a refund?", a: "Contact the seller through the messaging system. If unresolved, email us at support@afrizoneshop.com with your order number." },
    ]
  },
  {
    category: "Shipping & Delivery",
    icon: <FiTruck />,
    color: "bg-green-50 text-green-700",
    questions: [
      { q: "How long does shipping take?", a: "USPS Priority shipping takes 1–2 business days. Uber Express local delivery takes 2–4 hours. Estimated delivery dates are shown at checkout." },
      { q: "How do I track my order?", a: "Once shipped, you'll receive a tracking number via email. You can also view your order status in the Orders section of your account." },
      { q: "Do you ship internationally?", a: "Currently we ship within the USA. Canada and Europe shipping is coming soon." },
      { q: "What is Uber Express Delivery?", a: "Uber Express is same-day local delivery powered by Uber Direct. Available for restaurant orders and select local stores within the delivery radius." },
    ]
  },
  {
    category: "Seller Accounts",
    icon: <FiShoppingBag />,
    color: "bg-yellow-50 text-yellow-700",
    questions: [
      { q: "How do I become a seller?", a: "Register for an account and select 'Seller' as your role. Complete your store profile and submit for approval. Our team reviews applications within 1–2 business days." },
      { q: "What fees does Afrizone charge?", a: "Afrizone charges a platform commission on each sale (shown in your seller dashboard). There are no monthly fees on the Basic plan." },
      { q: "How do I receive payouts?", a: "Connect your Stripe account in the seller dashboard. Payouts are processed after order fulfilment." },
      { q: "Can I sell food items?", a: "Yes! Select 'Restaurant / Hot Food' as your vendor type. Your orders will use Uber Express local delivery to ensure food arrives fresh." },
    ]
  },
  {
    category: "Account & Profile",
    icon: <FiUser />,
    color: "bg-purple-50 text-purple-700",
    questions: [
      { q: "How do I reset my password?", a: "Click 'Forgot password?' on the login page and enter your email. You'll receive a reset link within a few minutes." },
      { q: "How do I update my profile?", a: "Log in and go to your account settings to update your name, email, avatar, and country." },
      { q: "How do I delete my account?", a: "Contact us at support@afrizoneshop.com with your account email and we'll process the deletion within 7 business days." },
    ]
  },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b last:border-0">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left gap-4 hover:text-green-900 transition-colors">
        <span className="font-medium text-gray-800">{q}</span>
        <FiChevronDown size={16} className={`flex-shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <p className="pb-4 text-sm text-gray-600 leading-relaxed">{a}</p>}
    </div>
  );
}

export default function HelpCenter() {
  return (
    <>
      <Head>
        <title>Help Center — Afrizone</title>
        <meta name="description" content="Get help with your Afrizone orders, account, and more." />
      </Head>
      <Navbar />

      {/* Hero */}
      <div className="bg-green-900 text-white py-14 px-4 text-center">
        <h1 className="text-3xl font-black mb-2">How can we help?</h1>
        <p className="text-green-200 mb-6">Find answers to common questions or get in touch with our team.</p>
        <a href="tel:4753079627"
          className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-green-900 font-black px-6 py-3 rounded-xl transition-colors text-lg">
          <FiPhone size={20} /> Call Us: (475) 307-9627
        </a>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">

        {/* Contact Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          <a href="tel:4753079627"
            className="bg-white border rounded-2xl p-6 text-center hover:shadow-md transition-shadow group">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-green-900 transition-colors">
              <FiPhone className="text-green-900 group-hover:text-white transition-colors" size={20} />
            </div>
            <p className="font-bold text-gray-900">Phone Support</p>
            <p className="text-green-700 font-semibold mt-1">(475) 307-9627</p>
            <p className="text-xs text-gray-400 mt-1">Mon–Fri, 9am–6pm EST</p>
          </a>

          <a href="mailto:support@afrizoneshop.com"
            className="bg-white border rounded-2xl p-6 text-center hover:shadow-md transition-shadow group">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-700 transition-colors">
              <FiMail className="text-blue-700 group-hover:text-white transition-colors" size={20} />
            </div>
            <p className="font-bold text-gray-900">Email Support</p>
            <p className="text-blue-700 font-semibold mt-1">support@afrizoneshop.com</p>
            <p className="text-xs text-gray-400 mt-1">Response within 24 hours</p>
          </a>

          <Link href="/messages"
            className="bg-white border rounded-2xl p-6 text-center hover:shadow-md transition-shadow group">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-yellow-500 transition-colors">
              <FiMessageSquare className="text-yellow-700 group-hover:text-white transition-colors" size={20} />
            </div>
            <p className="font-bold text-gray-900">Message a Seller</p>
            <p className="text-yellow-700 font-semibold mt-1">In-app messaging</p>
            <p className="text-xs text-gray-400 mt-1">Direct seller contact</p>
          </Link>
        </div>

        {/* FAQ Sections */}
        <h2 className="text-2xl font-black text-gray-900 mb-6">Frequently Asked Questions</h2>
        <div className="space-y-6">
          {faqs.map((section) => (
            <div key={section.category} className="bg-white border rounded-2xl overflow-hidden shadow-sm">
              <div className={`flex items-center gap-3 px-6 py-4 border-b ${section.color}`}>
                {section.icon}
                <h3 className="font-bold">{section.category}</h3>
              </div>
              <div className="px-6">
                {section.questions.map((item) => (
                  <FAQItem key={item.q} q={item.q} a={item.a} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 bg-green-50 border border-green-100 rounded-2xl p-8 text-center">
          <p className="text-lg font-black text-green-900 mb-1">Still need help?</p>
          <p className="text-green-700 mb-4">Our support team is ready to assist you.</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <a href="tel:4753079627"
              className="flex items-center gap-2 bg-green-900 hover:bg-green-800 text-white font-bold px-6 py-3 rounded-xl transition-colors">
              <FiPhone size={16} /> (475) 307-9627
            </a>
            <a href="mailto:support@afrizoneshop.com"
              className="flex items-center gap-2 border-2 border-green-900 text-green-900 hover:bg-green-900 hover:text-white font-bold px-6 py-3 rounded-xl transition-colors">
              <FiMail size={16} /> Email Us
            </a>
          </div>
        </div>

      </div>
      <Footer />
    </>
  );
}
