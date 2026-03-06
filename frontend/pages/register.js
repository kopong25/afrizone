import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "./_app";
import { authAPI } from "../lib/api";
import toast from "react-hot-toast";

const COUNTRIES = ["USA", "Canada", "UK", "France", "Germany", "Other"];

export default function Register() {
  const router = useRouter();
  const { login } = useAuth();
  const defaultRole = router.query.role || "buyer";
  const [form, setForm] = useState({
    email: "", password: "", full_name: "", country: "USA", role: defaultRole,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authAPI.register(form);
      login(res.data.access_token, res.data.user);
      toast.success("Account created! Welcome to Afrizone 🌍");
      router.push(form.role === "seller" ? "/seller/dashboard" : "/");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="block text-center">
          <span className="text-green-900 font-black text-3xl">AFRIZONE</span>
        </Link>
        <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">Create your account</h2>
        <p className="mt-2 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/login" className="text-green-900 font-semibold hover:underline">Sign in</Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm rounded-xl">
          {/* Role Toggle */}
          <div className="flex rounded-lg overflow-hidden border mb-6">
            <button
              type="button"
              onClick={() => setForm({ ...form, role: "buyer" })}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                form.role === "buyer" ? "bg-green-900 text-white" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              🛒 Shop (Buyer)
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, role: "seller" })}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                form.role === "seller" ? "bg-green-900 text-white" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              🏪 Sell (Store Owner)
            </button>
          </div>

          {form.role === "seller" && (
            <div className="bg-gold-300 bg-opacity-30 border border-gold-500 rounded-lg p-3 mb-5 text-sm text-green-900">
              ✅ Your store will be reviewed and approved within 24–48 hours. You can set it up immediately.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text" required
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-900 text-sm"
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email" required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-900 text-sm"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password" required minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-900 text-sm"
                placeholder="At least 8 characters"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <select
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-900 text-sm"
              >
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full btn-primary py-3 mt-2 disabled:opacity-50"
            >
              {loading ? "Creating account..." : form.role === "seller" ? "Create Seller Account" : "Create Account"}
            </button>
          </form>
          <p className="mt-4 text-xs text-gray-400 text-center">
            By signing up you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
