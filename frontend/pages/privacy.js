import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import Head from "next/head";

export default function PrivacyPolicy() {
  return (
    <>
      <Head>
        <title>Privacy Policy — Afrizone</title>
        <meta name="description" content="Afrizone Privacy Policy" />
      </Head>
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-black text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-gray-500 mb-8">Last updated: March 18, 2026</p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700">

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Introduction</h2>
            <p>Welcome to Afrizone ("we," "our," or "us"). Afrizone is a pan-African marketplace connecting African diaspora sellers in the USA, Canada, and Europe with buyers worldwide. We are committed to protecting your personal information and your right to privacy.</p>
            <p className="mt-2">This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website at <a href="https://afrizoneshop.com" className="text-green-700 hover:underline">afrizoneshop.com</a> and our mobile application.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Information We Collect</h2>
            <h3 className="font-semibold text-gray-800 mb-2">Information you provide to us:</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Account information: name, email address, password</li>
              <li>Profile information: country, avatar photo</li>
              <li>Seller information: store name, business type, store description, logo and banner images</li>
              <li>Payment information: processed securely by Stripe — we do not store card numbers</li>
              <li>Shipping information: delivery address, name, city, state, zip code</li>
              <li>Communications: messages sent through our messaging system</li>
            </ul>
            <h3 className="font-semibold text-gray-800 mb-2 mt-4">Information collected automatically:</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Device information: browser type, operating system</li>
              <li>Usage data: pages visited, products viewed, search queries</li>
              <li>Cookies and session tokens for authentication</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>To create and manage your account</li>
              <li>To process orders and payments</li>
              <li>To facilitate communication between buyers and sellers</li>
              <li>To send order confirmations and shipping notifications via email</li>
              <li>To provide customer support</li>
              <li>To improve our platform and user experience</li>
              <li>To detect and prevent fraud</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Sharing Your Information</h2>
            <p>We do not sell your personal information. We share information only in these circumstances:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><strong>With sellers:</strong> when you place an order, your shipping name and address are shared with the seller to fulfil your order.</li>
              <li><strong>With buyers:</strong> sellers' store names, descriptions, and product listings are publicly visible.</li>
              <li><strong>Service providers:</strong> Stripe (payments), Cloudinary (image storage), SendGrid (email), Shippo (shipping labels), Uber Direct (local delivery). These providers have their own privacy policies.</li>
              <li><strong>Legal requirements:</strong> if required by law or to protect the rights of Afrizone or its users.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Data Storage and Security</h2>
            <p>Your data is stored on secure servers hosted by Render.com. We use industry-standard encryption (SSL/TLS) for all data transmission. Passwords are hashed and never stored in plain text. Payment data is handled entirely by Stripe and never stored on our servers.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Cookies</h2>
            <p>We use cookies and similar technologies to keep you logged in, remember your preferences, and improve your experience. You can disable cookies in your browser settings, but this may affect functionality.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Your Rights</h2>
            <p>Depending on your location, you may have the right to:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and data</li>
              <li>Object to processing of your data</li>
              <li>Data portability</li>
            </ul>
            <p className="mt-2">To exercise these rights, contact us at <a href="mailto:privacy@afrizoneshop.com" className="text-green-700 hover:underline">privacy@afrizoneshop.com</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Children's Privacy</h2>
            <p>Afrizone is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, please contact us immediately.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">9. Third-Party Links</h2>
            <p>Our platform may contain links to third-party websites. We are not responsible for the privacy practices of those sites and encourage you to review their privacy policies.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">10. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by posting a notice on our website or sending an email. Your continued use of Afrizone after changes constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">11. Contact Us</h2>
            <p>If you have questions about this Privacy Policy or our data practices, contact us at:</p>
            <div className="mt-3 bg-gray-50 rounded-xl p-4 text-sm">
              <p className="font-bold text-gray-900">Afrizone</p>
              <p>Email: <a href="mailto:privacy@afrizoneshop.com" className="text-green-700 hover:underline">privacy@afrizoneshop.com</a></p>
              <p>Website: <a href="https://afrizoneshop.com" className="text-green-700 hover:underline">afrizoneshop.com</a></p>
            </div>
          </section>

        </div>
      </div>
      <Footer />
    </>
  );
}
