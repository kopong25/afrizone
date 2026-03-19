import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import Head from "next/head";
import Link from "next/link";
import { FiShoppingBag, FiPackage, FiDollarSign, FiTruck, FiStar, FiSettings, FiCheck, FiArrowRight, FiPhone } from "react-icons/fi";

const steps = [
  {
    number: "01",
    icon: <FiShoppingBag size={24} />,
    title: "Create Your Seller Account",
    color: "bg-green-50 border-green-200 text-green-800",
    iconColor: "bg-green-900 text-white",
    steps: [
      "Register at afrizoneshop.com and select 'Seller' as your account type",
      "Fill in your store name, description, country, and business type",
      "Upload your store logo and banner (recommended: logo 400×400px, banner 1200×400px)",
      "Submit for approval — our team reviews within 1–2 business days",
      "You'll receive an email once your store is approved",
    ]
  },
  {
    number: "02",
    icon: <FiSettings size={24} />,
    title: "Configure Your Store",
    color: "bg-blue-50 border-blue-200 text-blue-800",
    iconColor: "bg-blue-700 text-white",
    steps: [
      "Go to Seller Dashboard → Settings to set up your store profile",
      "Choose your Vendor Type: Grocery, Restaurant, Fashion, Beauty, or Other",
      "Select your Delivery Type: Shipping (nationwide) or Local Delivery (Uber Express)",
      "Restaurant sellers: delivery is automatically set to Uber Express local delivery",
      "Set your store address and coordinates for accurate delivery distance calculation",
    ]
  },
  {
    number: "03",
    icon: <FiPackage size={24} />,
    title: "Add Your Products",
    color: "bg-yellow-50 border-yellow-200 text-yellow-800",
    iconColor: "bg-yellow-500 text-white",
    steps: [
      "Go to Seller Dashboard → Products → Add Product",
      "Add a clear product title, detailed description, price, and stock quantity",
      "Upload high-quality photos (minimum 800×800px, white background recommended)",
      "Set the correct category and country of origin",
      "Products go live immediately after saving",
    ]
  },
  {
    number: "04",
    icon: <FiDollarSign size={24} />,
    title: "Connect Stripe for Payouts",
    color: "bg-purple-50 border-purple-200 text-purple-800",
    iconColor: "bg-purple-700 text-white",
    steps: [
      "Go to Seller Dashboard and click 'Connect Stripe'",
      "Complete the Stripe Express onboarding (takes ~5 minutes)",
      "Provide your bank account details for payout deposits",
      "Afrizone deducts a platform commission from each sale before payout",
      "Payouts are processed automatically after order fulfilment",
    ]
  },
  {
    number: "05",
    icon: <FiTruck size={24} />,
    title: "Fulfil Orders",
    color: "bg-orange-50 border-orange-200 text-orange-800",
    iconColor: "bg-orange-500 text-white",
    steps: [
      "Go to Seller Dashboard → Orders to see incoming orders",
      "Best practice: package and dispatch within 24 hours of payment",
      "Click 'Mark as Processing' when packaging, 'Shipped' once dispatched",
      "For Uber Express orders: click 'Dispatch Uber Driver' when order is ready",
      "For shipping orders: download the Shippo label from the order page",
      "Add a tracking number so customers can track their delivery",
    ]
  },
  {
    number: "06",
    icon: <FiStar size={24} />,
    title: "Grow Your Store",
    color: "bg-pink-50 border-pink-200 text-pink-800",
    iconColor: "bg-pink-600 text-white",
    steps: [
      "Create discount codes in Seller Dashboard → Discounts to attract buyers",
      "Share your store link on social media to drive traffic",
      "Use the Referral program to earn bonuses for bringing in new sellers",
      "Upgrade to Standard or Premium plan to reduce commission and unlock features",
      "Monitor your performance in Seller Dashboard → Analytics",
      "Respond quickly to customer messages to maintain high ratings",
    ]
  },
];

const tips = [
  { icon: "📸", title: "Great Photos Sell", tip: "Use natural lighting and clean backgrounds. Show multiple angles. Products with 3+ photos sell 40% more." },
  { icon: "✍️", title: "Write Clear Descriptions", tip: "Include weight, size, ingredients (for food), and origin. Answer common questions upfront." },
  { icon: "📦", title: "Package Professionally", tip: "Use branded packaging when possible. Include a thank-you note. Great unboxing leads to repeat buyers." },
  { icon: "⚡", title: "Ship Fast", tip: "Sellers who ship within 24 hours get better ratings and more repeat customers." },
  { icon: "💬", title: "Respond to Messages", tip: "Reply to customer messages within a few hours. Fast responses build trust and reduce refund requests." },
  { icon: "🏷️", title: "Use Discount Codes", tip: "Offer 10–15% off for first-time buyers. A small discount drives your first sales and reviews." },
];

export default function SellerGuide() {
  return (
    <>
      <Head>
        <title>Seller Guide — Afrizone</title>
        <meta name="description" content="Everything you need to know to sell successfully on Afrizone." />
      </Head>
      <Navbar />

      {/* Hero */}
      <div className="bg-green-900 text-white py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <p className="text-yellow-400 font-bold text-sm uppercase tracking-wider mb-2">Seller Guide</p>
          <h1 className="text-4xl font-black mb-3">Start Selling on Afrizone</h1>
          <p className="text-green-200 text-lg mb-8">Everything you need to set up your store and start earning — step by step.</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href="/register" className="bg-yellow-400 hover:bg-yellow-300 text-green-900 font-black px-6 py-3 rounded-xl transition-colors">
              Start Selling Free →
            </Link>
            <a href="tel:4753079627" className="border-2 border-white text-white hover:bg-white hover:text-green-900 font-bold px-6 py-3 rounded-xl transition-colors flex items-center gap-2">
              <FiPhone size={16} /> (475) 307-9627
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">

        {/* Steps */}
        <h2 className="text-2xl font-black text-gray-900 mb-8 text-center">6 Steps to Your First Sale</h2>
        <div className="space-y-6 mb-16">
          {steps.map((s) => (
            <div key={s.number} className={`border-2 rounded-2xl overflow-hidden ${s.color}`}>
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${s.iconColor}`}>
                    {s.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs font-black opacity-50">STEP {s.number}</span>
                      <h3 className="text-lg font-black text-gray-900">{s.title}</h3>
                    </div>
                    <ul className="space-y-2">
                      {s.steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <FiCheck size={14} className="text-green-600 flex-shrink-0 mt-0.5" />
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pro Tips */}
        <h2 className="text-2xl font-black text-gray-900 mb-6 text-center">Pro Tips for Success</h2>
        <div className="grid md:grid-cols-2 gap-4 mb-12">
          {tips.map((t) => (
            <div key={t.title} className="bg-white border rounded-2xl p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{t.icon}</span>
                <div>
                  <p className="font-bold text-gray-900 mb-1">{t.title}</p>
                  <p className="text-sm text-gray-600">{t.tip}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Commission Table */}
        <div className="bg-white border rounded-2xl shadow-sm overflow-hidden mb-12">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h2 className="font-black text-gray-900">Subscription Plans & Commission Rates</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-6 py-3 text-left">Plan</th>
                  <th className="px-6 py-3 text-left">Monthly Fee</th>
                  <th className="px-6 py-3 text-left">Commission</th>
                  <th className="px-6 py-3 text-left">Products</th>
                  <th className="px-6 py-3 text-left">Perks</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-bold">Basic</td>
                  <td className="px-6 py-4 text-gray-600">Free</td>
                  <td className="px-6 py-4 text-gray-600">10%</td>
                  <td className="px-6 py-4 text-gray-600">Up to 10</td>
                  <td className="px-6 py-4 text-gray-500 text-xs">Basic analytics</td>
                </tr>
                <tr className="hover:bg-gray-50 bg-green-50">
                  <td className="px-6 py-4 font-bold text-green-900">Standard <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full ml-1">Popular</span></td>
                  <td className="px-6 py-4 text-gray-600">$29/mo</td>
                  <td className="px-6 py-4 text-green-700 font-semibold">7%</td>
                  <td className="px-6 py-4 text-gray-600">Up to 100</td>
                  <td className="px-6 py-4 text-gray-500 text-xs">Full analytics, discount codes, auto labels</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-bold text-yellow-700">Premium</td>
                  <td className="px-6 py-4 text-gray-600">$79/mo</td>
                  <td className="px-6 py-4 text-yellow-700 font-semibold">4%</td>
                  <td className="px-6 py-4 text-gray-600">Unlimited</td>
                  <td className="px-6 py-4 text-gray-500 text-xs">Featured listing, priority support, referral bonuses</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-green-900 rounded-2xl p-8 text-white text-center">
          <h2 className="text-2xl font-black mb-2">Ready to start selling?</h2>
          <p className="text-green-200 mb-6">Join hundreds of African diaspora entrepreneurs on Afrizone.</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href="/register" className="bg-yellow-400 hover:bg-yellow-300 text-green-900 font-black px-8 py-3 rounded-xl transition-colors flex items-center gap-2">
              Create Seller Account <FiArrowRight size={16} />
            </Link>
            <Link href="/contact" className="border-2 border-white text-white hover:bg-white hover:text-green-900 font-bold px-6 py-3 rounded-xl transition-colors">
              Talk to Us
            </Link>
          </div>
          <p className="text-green-300 text-sm mt-4">Questions? Call us: <a href="tel:4753079627" className="text-yellow-400 font-bold hover:underline">(475) 307-9627</a></p>
        </div>

      </div>
      <Footer />
    </>
  );
}
