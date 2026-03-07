import { useState } from "react";
import { useRouter } from "next/router";
import { reviewsAPI } from "../../lib/api";
import { useAuth } from "../../pages/_app";
import { StarDisplay, StarPicker } from "./StarRating";
import toast from "react-hot-toast";
import { FiThumbsUp, FiTrash2, FiShield, FiEdit3 } from "react-icons/fi";

// Breakdown bar e.g. "5 stars ████████░░ 80%"
function RatingBar({ star, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-500 w-10 text-right flex-shrink-0">{star}★</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div className="bg-yellow-400 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-gray-400 w-8 flex-shrink-0">{count}</span>
    </div>
  );
}

function ReviewCard({ review, currentUserId, onDelete }) {
  const [helpful, setHelpful] = useState(false);

  return (
    <div className="bg-white rounded-2xl border p-5 hover:shadow-sm transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-900 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {review.user?.full_name?.[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-800 text-sm">{review.user?.full_name}</span>
              {review.is_verified_purchase && (
                <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                  <FiShield size={10} /> Verified Purchase
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(review.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StarDisplay rating={review.rating} size={14} />
          {currentUserId === review.user?.id && (
            <button onClick={() => onDelete(review.id)}
              className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded">
              <FiTrash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {review.title && (
        <h4 className="font-bold text-gray-800 mb-1">{review.title}</h4>
      )}
      {review.body && (
        <p className="text-sm text-gray-600 leading-relaxed">{review.body}</p>
      )}

      {/* Helpful */}
      <div className="mt-3 pt-3 border-t flex items-center gap-2">
        <button onClick={() => setHelpful(!helpful)}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${
            helpful ? "bg-green-50 border-green-300 text-green-700" : "border-gray-200 text-gray-400 hover:border-gray-300"
          }`}>
          <FiThumbsUp size={11} />
          {helpful ? "Helpful!" : "Helpful?"}
        </button>
      </div>
    </div>
  );
}

function ReviewForm({ productId, onSubmitted }) {
  const { user } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ rating: 0, title: "", body: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) { router.push("/login"); return; }
    if (form.rating === 0) { toast.error("Please select a star rating"); return; }
    setSubmitting(true);
    try {
      const res = await reviewsAPI.create({ product_id: productId, ...form });
      toast.success("Review posted! Thank you 🙏");
      onSubmitted(res.data);
      setForm({ rating: 0, title: "", body: "" });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-green-50 to-white rounded-2xl border border-green-100 p-5">
      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
        <FiEdit3 size={16} className="text-green-700" /> Write a Review
      </h3>

      {!user ? (
        <div className="text-center py-4">
          <p className="text-gray-500 text-sm mb-3">Sign in to leave a review</p>
          <button onClick={() => router.push("/login")}
            className="btn-primary py-2 px-6 text-sm">Sign In</button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">Your Rating *</label>
            <StarPicker value={form.rating} onChange={(v) => setForm({ ...form, rating: v })} size={32} />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1">Title</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Summarise your experience"
              className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-900" />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1">Review</label>
            <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="What did you love? What could be improved?"
              rows={4}
              className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-900 resize-none" />
          </div>
          <button onClick={handleSubmit} disabled={submitting || form.rating === 0}
            className="btn-primary py-2.5 px-8 text-sm disabled:opacity-50">
            {submitting ? "Posting..." : "Post Review"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function ReviewSection({ productId, initialReviews = [] }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState(initialReviews);
  const [sort, setSort] = useState("newest");
  const [filterStar, setFilterStar] = useState(0);

  // Stats
  const total = reviews.length;
  const avg = total > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
  const breakdown = [5, 4, 3, 2, 1].map((star) => ({
    star, count: reviews.filter((r) => r.rating === star).length,
  }));

  const handleDelete = async (id) => {
    try {
      await reviewsAPI.delete(id);
      setReviews((prev) => prev.filter((r) => r.id !== id));
      toast.success("Review deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const sorted = [...reviews]
    .filter((r) => filterStar === 0 || r.rating === filterStar)
    .sort((a, b) => {
      if (sort === "newest") return new Date(b.created_at) - new Date(a.created_at);
      if (sort === "highest") return b.rating - a.rating;
      if (sort === "lowest") return a.rating - b.rating;
      return 0;
    });

  return (
    <div className="mt-16 border-t pt-12">
      <h2 className="text-2xl font-black text-gray-900 mb-8">Customer Reviews</h2>

      <div className="grid lg:grid-cols-5 gap-8 mb-10">
        {/* Rating summary */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border p-6 text-center mb-4">
            <div className="text-6xl font-black text-gray-900 leading-none mb-1">
              {avg > 0 ? avg.toFixed(1) : "—"}
            </div>
            <StarDisplay rating={avg} size={22} />
            <p className="text-sm text-gray-400 mt-2">{total} review{total !== 1 ? "s" : ""}</p>
          </div>
          <div className="space-y-2">
            {breakdown.map(({ star, count }) => (
              <button key={star} onClick={() => setFilterStar(filterStar === star ? 0 : star)}
                className={`w-full transition-opacity ${filterStar > 0 && filterStar !== star ? "opacity-40" : ""}`}>
                <RatingBar star={star} count={count} total={total} />
              </button>
            ))}
          </div>
          {filterStar > 0 && (
            <button onClick={() => setFilterStar(0)} className="text-xs text-green-700 mt-2 underline">
              Clear filter
            </button>
          )}
        </div>

        {/* Write review */}
        <div className="lg:col-span-3">
          <ReviewForm productId={productId} onSubmitted={(r) => setReviews([r, ...reviews])} />
        </div>
      </div>

      {/* Sort bar */}
      {sorted.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">
            Showing <span className="font-semibold text-gray-800">{sorted.length}</span> review{sorted.length !== 1 ? "s" : ""}
            {filterStar > 0 && <span> with {filterStar} star{filterStar !== 1 ? "s" : ""}</span>}
          </p>
          <select value={sort} onChange={(e) => setSort(e.target.value)}
            className="border rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-900">
            <option value="newest">Newest first</option>
            <option value="highest">Highest rated</option>
            <option value="lowest">Lowest rated</option>
          </select>
        </div>
      )}

      {/* Review cards */}
      {sorted.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl">
          <div className="text-5xl mb-3">⭐</div>
          <p className="font-semibold text-gray-700 mb-1">No reviews yet</p>
          <p className="text-sm text-gray-400">Be the first to review this product</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map((r) => (
            <ReviewCard key={r.id} review={r} currentUserId={user?.id} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}