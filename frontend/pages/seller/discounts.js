import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import { discountsAPI } from "../../lib/api";
import { useAuth } from "../_app";
import toast from "react-hot-toast";
import { FiPlus, FiTrash2, FiTag, FiArrowLeft, FiCopy } from "react-icons/fi";

const EMPTY = { code: "", description: "", discount_type: "percent", discount_value: "", min_order_amount: "", max_uses: "", expires_at: "" };

export default function DiscountsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    if (user.role !== "seller" && user.role !== "admin") { router.push("/"); return; }
    fetchCodes();
  }, [user]);

  const fetchCodes = () => {
    discountsAPI.myCodes()
      .then((r) => setCodes(Array.isArray(r.data) ? r.data : []))
      .catch(() => toast.error("Failed to load codes"))
      .finally(() => setLoading(false));
  };

  const handleCreate = async () => {
    if (!form.code || !form.discount_value) { toast.error("Code and discount value are required"); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        code: form.code.toUpperCase(),
        discount_value: parseFloat(form.discount_value),
        min_order_amount: parseFloat(form.min_order_amount || 0),
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        expires_at: form.expires_at || null,
      };
      const res = await discountsAPI.create(payload);
      setCodes([res.data, ...codes]);
      setForm(EMPTY);
      setShowForm(false);
      toast.success("Discount code created! 🎉");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create code");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this discount code?")) return;
    try {
      await discountsAPI.delete(id);
      setCodes(codes.filter((c) => c.id !== id));
      toast.success("Code deleted");
    } catch { toast.error("Failed to delete"); }
  };

  const copyCode = (code) => {
    navigator.clipboard?.writeText(code);
    toast.success(`Copied: ${code}`);
  };

  return (
    <>
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/seller/dashboard" className="text-gray-400 hover:text-gray-600"><FiArrowLeft size={20} /></Link>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2"><FiTag /> Discount Codes</h1>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary py-2 px-4 text-sm ml-auto flex items-center gap-1.5">
            <FiPlus size={15} /> New Code
          </button>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="bg-white rounded-2xl border shadow-sm p-6 mb-6">
            <h2 className="font-bold text-gray-900 mb-4">Create Discount Code</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">Code *</label>
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="SAVE20" className="w-full border rounded-xl px-3 py-2.5 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-green-900" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">Description</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Summer sale 20% off" className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-900" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">Discount Type</label>
                <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-900">
                  <option value="percent">Percentage (%)</option>
                  <option value="fixed">Fixed Amount ($)</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">
                  Discount Value * {form.discount_type === "percent" ? "(%)" : "($)"}
                </label>
                <input type="number" min="0" max={form.discount_type === "percent" ? "100" : undefined}
                  value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                  placeholder={form.discount_type === "percent" ? "20" : "10.00"}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-900" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">Min. Order Amount ($)</label>
                <input type="number" min="0" value={form.min_order_amount}
                  onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })}
                  placeholder="0 = no minimum"
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-900" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">Max Uses (blank = unlimited)</label>
                <input type="number" min="1" value={form.max_uses}
                  onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                  placeholder="100"
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-900" />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-semibold text-gray-700 block mb-1">Expiry Date (optional)</label>
                <input type="datetime-local" value={form.expires_at}
                  onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-900" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleCreate} disabled={saving}
                className="btn-primary py-2.5 px-8 text-sm disabled:opacity-60">
                {saving ? "Creating..." : "Create Code"}
              </button>
              <button onClick={() => setShowForm(false)} className="btn-secondary py-2.5 px-6 text-sm">Cancel</button>
            </div>
          </div>
        )}

        {/* Codes list */}
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-200 rounded-2xl animate-pulse" />)}</div>
        ) : codes.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border">
            <div className="text-5xl mb-3">🎟️</div>
            <h2 className="font-bold text-gray-800 mb-1">No discount codes yet</h2>
            <p className="text-sm text-gray-500 mb-4">Create codes to attract customers</p>
            <button onClick={() => setShowForm(true)} className="btn-primary py-2.5 px-6 text-sm">Create Your First Code</button>
          </div>
        ) : (
          <div className="space-y-3">
            {codes.map((code) => {
              const expired = code.expires_at && new Date(code.expires_at) < new Date();
              const maxed = code.max_uses && code.uses_count >= code.max_uses;
              const active = code.is_active && !expired && !maxed;
              return (
                <div key={code.id} className="bg-white rounded-2xl border shadow-sm p-5 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <button onClick={() => copyCode(code.code)}
                        className="font-mono font-black text-lg text-green-900 hover:text-green-700 flex items-center gap-1">
                        {code.code} <FiCopy size={13} />
                      </button>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}`}>
                        {active ? "Active" : expired ? "Expired" : maxed ? "Max uses reached" : "Inactive"}
                      </span>
                    </div>
                    {code.description && <p className="text-sm text-gray-500 mb-1">{code.description}</p>}
                    <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                      <span>💰 {code.discount_type === "percent" ? `${code.discount_value}% off` : `$${code.discount_value} off`}</span>
                      {code.min_order_amount > 0 && <span>📦 Min. ${code.min_order_amount}</span>}
                      <span>🔢 {code.uses_count}{code.max_uses ? `/${code.max_uses}` : ""} uses</span>
                      {code.expires_at && <span>⏰ Expires {new Date(code.expires_at).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(code.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50 flex-shrink-0">
                    <FiTrash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}