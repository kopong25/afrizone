import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import Head from "next/head";

export default function TermsOfService() {
  return (
    <>
      <Head>
        <title>Terms of Service — Afrizone</title>
        <meta name="description" content="Afrizone Terms of Service" />
      </Head>
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-black text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-gray-500 mb-8">Last updated: March 18, 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700">

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using Afrizone ("the Platform") at <a href="https://afrizoneshop.com" className="text-green-700 hover:underline">afrizoneshop.com</a> or our mobile application, you agree to be bound by these Terms of Service. If you do not agree, please do not use the Platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. About Afrizone</h2>
            <p>Afrizone is a pan-African marketplace that connects African diaspora sellers in the USA, Canada, and Europe with buyers worldwide. We provide a platform for sellers to list products and for buyers to purchase them. Afrizone acts as an intermediary and is not the seller of any products listed on the Platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. Eligibility</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>You must be at least 18 years old to use Afrizone.</li>
              <li>You must provide accurate and complete registration information.</li>
              <li>One person or entity may not maintain more than one account.</li>
              <li>Your account may not be transferred to another party.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Buyer Terms</h2>
            <h3 className="font-semibold text-gray-800 mb-2">Purchases</h3>
            <p>When you place an order, you enter into a contract with the seller, not Afrizone. You agree to pay the listed price plus any applicable shipping and delivery fees. All prices are in USD unless stated otherwise.</p>
            <h3 className="font-semibold text-gray-800 mb-2 mt-3">Payments</h3>
            <p>Payments are processed securely by Stripe. By completing a purchase, you authorize Afrizone to charge your payment method. Orders are not confirmed until payment is successful.</p>
            <h3 className="font-semibold text-gray-800 mb-2 mt-3">Returns & Refunds</h3>
            <p>Return and refund policies are set by individual sellers. Afrizone may intervene in disputes at its discretion. If you have an issue with an order, contact the seller first through our messaging system.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Seller Terms</h2>
            <h3 className="font-semibold text-gray-800 mb-2">Seller Accounts</h3>
            <p>To sell on Afrizone, you must apply for a seller account and be approved. Afrizone reserves the right to approve or reject any seller application at its sole discretion.</p>
            <h3 className="font-semibold text-gray-800 mb-2 mt-3">Listings</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>All product listings must be accurate, complete, and not misleading.</li>
              <li>You must own or have the right to sell all listed items.</li>
              <li>Prohibited items include: illegal goods, counterfeit products, hazardous materials, and any items that violate applicable law.</li>
              <li>Afrizone may remove listings at any time without notice.</li>
            </ul>
            <h3 className="font-semibold text-gray-800 mb-2 mt-3">Fees & Payouts</h3>
            <p>Afrizone charges a platform commission on each completed sale as displayed in your seller dashboard. Payouts are processed to your connected Stripe account after order fulfilment. Afrizone reserves the right to adjust commission rates with 30 days' notice.</p>
            <h3 className="font-semibold text-gray-800 mb-2 mt-3">Fulfilment</h3>
            <p>Sellers are responsible for packaging and dispatching orders within 2 business days of payment. Failure to fulfil orders in a timely manner may result in account suspension.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Prohibited Conduct</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Use the Platform for any unlawful purpose</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Post false, misleading, or fraudulent content</li>
              <li>Attempt to circumvent Afrizone's payment system by transacting outside the Platform</li>
              <li>Scrape, copy, or reproduce Platform content without permission</li>
              <li>Introduce malware or attempt to disrupt Platform services</li>
              <li>Create fake reviews or manipulate ratings</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Intellectual Property</h2>
            <p>The Afrizone name, logo, and Platform design are owned by Afrizone and protected by intellectual property laws. Sellers retain ownership of their product images and descriptions but grant Afrizone a non-exclusive license to display this content on the Platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Disclaimers</h2>
            <p>The Platform is provided "as is" without warranties of any kind. Afrizone does not guarantee the quality, safety, or legality of items listed by sellers. Afrizone is not liable for any disputes between buyers and sellers, shipping delays, or product defects.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">9. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, Afrizone's total liability for any claim arising from use of the Platform shall not exceed the amount you paid to Afrizone in the 3 months preceding the claim. Afrizone is not liable for indirect, incidental, or consequential damages.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">10. Account Termination</h2>
            <p>Afrizone may suspend or terminate your account at any time for violation of these Terms, fraudulent activity, or any conduct deemed harmful to the Platform or its users. You may delete your account at any time by contacting us.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">11. Changes to Terms</h2>
            <p>We may update these Terms at any time. Continued use of the Platform after changes constitutes acceptance. We will notify users of material changes via email or a notice on the Platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">12. Governing Law</h2>
            <p>These Terms are governed by the laws of the State of Delaware, United States, without regard to conflict of law principles.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">13. Contact</h2>
            <div className="mt-3 bg-gray-50 rounded-xl p-4 text-sm">
              <p className="font-bold text-gray-900">Afrizone</p>
              <p>Email: <a href="mailto:legal@afrizoneshop.com" className="text-green-700 hover:underline">legal@afrizoneshop.com</a></p>
              <p>Website: <a href="https://afrizoneshop.com" className="text-green-700 hover:underline">afrizoneshop.com</a></p>
            </div>
          </section>

        </div>
      </div>
      <Footer />
    </>
  );
}
