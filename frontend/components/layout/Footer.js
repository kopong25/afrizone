import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-green-900 text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h2 className="text-gold-500 font-black text-2xl mb-3">AFRIZONE</h2>
            <p className="text-green-200 text-sm leading-relaxed">
              The Pan-African digital marketplace connecting African stores in the USA, Canada & Europe with the diaspora community.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-gold-400">Shop</h4>
            <ul className="space-y-2 text-sm text-green-200">
              <li><Link href="/jerseys" className="hover:text-white font-bold" style={{color:"#FCD116"}}>? World Cup 2026 Jerseys</Link></li>`n              <li><Link href="/?category=food className="hover:text-white">Food & Groceries</Link></li>
              <li><Link href="/?category=fashion" className="hover:text-white">Fashion & Clothing</Link></li>
              <li><Link href="/?category=beauty" className="hover:text-white">Beauty & Hair</Link></li>
              <li><Link href="/?category=arts" className="hover:text-white">Arts & Crafts</Link></li>
              <li><Link href="/?category=electronics" className="hover:text-white">Electronics</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-gold-400">Sell on Afrizone</h4>
            <ul className="space-y-2 text-sm text-green-200">
              <li><Link href="/register?role=seller" className="hover:text-white">Start Selling</Link></li>
              <li><Link href="/seller/dashboard" className="hover:text-white">Seller Dashboard</Link></li>
              <li><Link href="/pricing" className="hover:text-white">Pricing & Plans</Link></li>
              <li><Link href="/seller/guide" className="hover:text-white">Seller Guide</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-gold-400">Support</h4>
            <ul className="space-y-2 text-sm text-green-200">
              <li><Link href="/help" className="hover:text-white">Help Center</Link></li>
              <li><Link href="/contact" className="hover:text-white">Contact Us</Link></li>
              <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-green-800 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-green-300 text-sm">© {new Date().getFullYear()} Afrizone. All rights reserved.</p>
          <p className="text-green-300 text-sm">🌍 Connecting Africa to the World</p>
        </div>
      </div>
    </footer>
  );
}
