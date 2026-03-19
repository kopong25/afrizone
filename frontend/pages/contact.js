import { useState } from "react";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import Head from "next/head";
import Link from "next/link";
import { FiPhone, FiMail, FiMessageSquare, FiMapPin, FiSend, FiCheck } from "react-icons/fi";
import toast from "react-hot-toast";

export default function ContactUs() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSending(true);
    // Simulate sending — in production wire to SendGrid or a backend endpoint
    await new Promise(r => setTimeout(r, 1200));
    setSending(false);
    setSent(true);
    toast.success("Message sent! We'll get back to you within 24 hours.");
  };

  return (
    <>
      <Head>
        <title>Contact Us — Afrizone</title>
        <meta name="description" content="Get in touch with the Afrizone team." />
      </Head>
      <Navbar />

      {/* Hero */}
      <div className="bg-green-900 text-white py-14 px-4 text-center">
        <h1 className="text-3xl font-black mb-2">Contact Us</h1>
        <p className="text-green-200">We'd love to hear from you. Our team is here to help.</p>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-10">

          {/* Contact Info */}
          <div>
            <h2 className="text-xl font-black text-gray-900 mb-6">Get in Touch</h2>

            <div className="space-y-5">
              <a href="tel:4753079627"
                className="flex items-start gap-4 p-5 bg-white border rounded-2xl hover:shadow-md transition-shadow group">
                <div className="w-11 h-11 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-green-900 transition-colors">
                  <FiPhone className="text-green-900 group-hover:text-white transition-colors" size={18} />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Phone</p>
                  <p className="text-green-700 font-semibold">(475) 307-9627</p>
                  <p className="text-xs text-gray-400 mt-0.5">Mon–Fri, 9am–6pm EST</p>
                </div>
              </a>

              <a href="mailto:support@afrizoneshop.com"
                className="flex items-start gap-4 p-5 bg-white border rounded-2xl hover:shadow-md transition-shadow group">
                <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-700 transition-colors">
                  <FiMail className="text-blue-700 group-hover:text-white transition-colors" size={18} />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Email</p>
                  <p className="text-blue-700 font-semibold">support@afrizoneshop.com</p>
                  <p className="text-xs text-gray-400 mt-0.5">Response within 24 hours</p>
                </div>
              </a>

              <a href="mailto:sellers@afrizoneshop.com"
                className="flex items-start gap-4 p-5 bg-white border rounded-2xl hover:shadow-md transition-shadow group">
                <div className="w-11 h-11 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-yellow-500 transition-colors">
                  <FiMail className="text-yellow-700 group-hover:text-white transition-colors" size={18} />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Seller Enquiries</p>
                  <p className="text-yellow-700 font-semibold">sellers@afrizoneshop.com</p>
                  <p className="text-xs text-gray-400 mt-0.5">For store approvals & partnerships</p>
                </div>
              </a>

              <div className="flex items-start gap-4 p-5 bg-white border rounded-2xl">
                <div className="w-11 h-11 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FiMapPin className="text-purple-700" size={18} />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Based In</p>
                  <p className="text-gray-600">United States</p>
                  <p className="text-xs text-gray-400 mt-0.5">Serving USA · Canada · Europe</p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-5 bg-green-50 border border-green-100 rounded-2xl">
              <p className="font-bold text-green-900 mb-1">💬 Need help with an order?</p>
              <p className="text-sm text-green-700 mb-3">Use our in-app messaging to contact sellers directly for the fastest response.</p>
              <Link href="/messages" className="inline-flex items-center gap-2 bg-green-900 hover:bg-green-800 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors">
                <FiMessageSquare size={14} /> Open Messages
              </Link>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white border rounded-2xl shadow-sm p-8">
            {sent ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiCheck size={32} className="text-green-700" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">Message Sent!</h3>
                <p className="text-gray-500 mb-6">Thanks for reaching out. We'll get back to you within 24 hours.</p>
                <button onClick={() => { setSent(false); setForm({ name: "", email: "", subject: "", message: "" }); }}
                  className="text-green-700 font-semibold hover:underline text-sm">
                  Send another message
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-black text-gray-900 mb-6">Send us a Message</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Name <span className="text-red-400">*</span></label>
                      <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                        placeholder="Your name"
                        className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Email <span className="text-red-400">*</span></label>
                      <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                        placeholder="your@email.com"
                        className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Subject</label>
                    <select value={form.subject} onChange={e => setForm({...form, subject: e.target.value})}
                      className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700">
                      <option value="">Select a topic</option>
                      <option value="order">Order Issue</option>
                      <option value="payment">Payment Problem</option>
                      <option value="seller">Seller Enquiry</option>
                      <option value="account">Account Help</option>
                      <option value="partnership">Partnership / Press</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Message <span className="text-red-400">*</span></label>
                    <textarea value={form.message} onChange={e => setForm({...form, message: e.target.value})}
                      rows={5} placeholder="How can we help you?"
                      className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-700 resize-none" />
                  </div>
                  <button type="submit" disabled={sending}
                    className="w-full bg-green-900 hover:bg-green-800 disabled:opacity-60 text-white font-black py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                    {sending ? "Sending..." : <><FiSend size={16} /> Send Message</>}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
