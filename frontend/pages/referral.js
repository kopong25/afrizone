import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { useAuth } from "./_app";
import api from "../lib/api";
import toast from "react-hot-toast";
import { FiGift, FiCopy, FiCheck, FiUsers } from "react-icons/fi";

export default function ReferralPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [stats, setStats] = useState(null);
  const [copied, setCopied] = useState(false);
  const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || "https://afrizone-frontend.onrender.com";

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    api.get("/referrals/my-code").then(r => setData(r.data)).catch(() => {});
    api.get("/referrals/stats").then(r => setStats(r.data)).catch(() => {});
  }, [user]);

  const copy = () => {
    const link = `${FRONTEND_URL}/register?ref=${data?.code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FiGift size={32} className="text-green-700" />
          </div>
          <h1 className="text-3xl font-black text-gray-900">Refer & Earn</h1>
          <p className="text-gray-500 mt-2">Invite sellers to Afrizone and earn $10 for every seller that joins and makes their first sale.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Referrals", value: stats?.total_referrals ?? "–", icon: FiUsers },
            { label: "Total Earned", value: stats ? `$${stats.total_earned.toFixed(2)}` : "–", icon: FiGift },
            { label: "Per Referral", value: "$10.00", icon: FiCheck },
          ].map(s => (
            <div key={s.label} className="bg-white border rounded-2xl p-4 text-center shadow-sm">
              <s.icon size={20} className="text-green-700 mx-auto mb-2" />
              <p className="text-2xl font-black text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Referral link */}
        <div className="bg-white border rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="font-bold text-gray-900 mb-3">Your Referral Link</h2>
          <div className="flex gap-2">
            <div className="flex-1 bg-gray-50 border rounded-xl px-4 py-3 text-sm text-gray-600 font-mono truncate">
              {data ? `${FRONTEND_URL}/register?ref=${data.code}` : "Loading…"}
            </div>
            <button onClick={copy} className={`px-4 py-3 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${copied ? "bg-green-700 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}>
              {copied ? <FiCheck size={16} /> : <FiCopy size={16} />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-3">Your code: <span className="font-bold text-gray-600">{data?.code}</span></p>
        </div>

        {/* How it works */}
        <div className="bg-green-900 rounded-2xl p-6 text-white">
          <h2 className="font-bold mb-4">How it works</h2>
          <div className="space-y-3">
            {[
              { n: "1", t: "Share your link", d: "Send your referral link to African entrepreneurs who want to sell online" },
              { n: "2", t: "They register", d: "They sign up using your link and open their Afrizone store" },
              { n: "3", t: "They make a sale", d: "Once they complete their first sale, the referral is confirmed" },
              { n: "4", t: "You earn $10", d: "Referral credit is added to your account automatically" },
            ].map(s => (
              <div key={s.n} className="flex gap-3 items-start">
                <span className="w-7 h-7 rounded-full bg-yellow-400 text-green-900 font-black text-sm flex items-center justify-center flex-shrink-0">{s.n}</span>
                <div>
                  <p className="font-semibold text-sm">{s.t}</p>
                  <p className="text-green-200 text-xs mt-0.5">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}