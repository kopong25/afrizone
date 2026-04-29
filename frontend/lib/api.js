import axios from "axios";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Token store ─────────────────────────────────────────────────────────────
let _memoryToken = null;

function _write(token) {
  try { if (token) sessionStorage.setItem("az_tok", token); else sessionStorage.removeItem("az_tok"); } catch {}
  try { if (token) localStorage.setItem("afrizone_token", token); else localStorage.removeItem("afrizone_token"); } catch {}
  try {
    if (token) {
      const isProd = typeof window !== "undefined" && window.location.protocol === "https:";
      // ✅ FIX 1: Extended from 7 → 365 days so login persists for a full year
      Cookies.set("afrizone_token", token, { expires: 365, sameSite: "Lax", secure: isProd });
    } else {
      Cookies.remove("afrizone_token");
    }
  } catch {}
}

function _read() {
  let t = null;
  try { t = sessionStorage.getItem("az_tok"); } catch {}
  if (!t) { try { t = localStorage.getItem("afrizone_token"); } catch {} }
  if (!t) { try { t = Cookies.get("afrizone_token"); } catch {} }
  if (!t && typeof document !== "undefined") {
    try {
      const m = document.cookie.match(/(?:^|;\s*)afrizone_token=([^;]+)/);
      if (m) t = decodeURIComponent(m[1]);
    } catch {}
  }
  return t || null;
}

export function setAuthToken(token) {
  _memoryToken = token || null;
  _write(token || null);
}

export function clearAuthToken() {
  _memoryToken = null;
  _write(null);
}

export function loadStoredToken() {
  const token = _read();
  if (token) {
    _memoryToken = token;
    try { sessionStorage.setItem("az_tok", token); } catch {}
  }
  return token;
}

export function hasToken() {
  return !!(_memoryToken || _read());
}

// ─── Axios instance ──────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = _memoryToken || _read();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    if (!_memoryToken) _memoryToken = token;
  }
  return config;
});

// ─── Global 401 handler ──────────────────────────────────────────────────────
// ✅ FIX 2: Removed aggressive auto-redirect + token wipe on 401.
// Only clear the token if the server explicitly rejects it on a non-auth route,
// but DO NOT force-redirect — let the UI handle it gracefully so the user
// is never unexpectedly kicked out mid-session.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || "";
      const isAuthRoute = url.includes("/auth/me") || url.includes("/auth/login");

      // Only clear memory token for non-auth routes where there's no stored token
      // (i.e. truly unauthenticated requests, not expired JWTs)
      if (!isAuthRoute) {
        const stored = _read();
        if (!stored) {
          _memoryToken = null;
        }
        // ✅ Removed: clearAuthToken() + window.location.href = "/login"
        // Previously this kicked users out whenever any API call got a 401.
        // Now we just reject the promise and let each page/component handle it.
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ──
export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  me: () => api.get("/auth/me"),
  updateMe: (data) => api.put("/auth/me", data),
};

// ── Products ──
export const productsAPI = {
  list: (params) => api.get("/products", { params }),
  get: (slug) => api.get(`/products/${slug}`),
  categories: () => api.get("/products/categories"),
  myProducts: () => api.get("/products/seller/mine"),
  create: (data) => api.post("/products/seller/create", data),
  update: (id, data) => api.put(`/products/seller/${id}`, data),
  uploadImages: (id, formData) =>
    api.post(`/products/seller/${id}/images`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  delete: (id) => api.delete(`/products/seller/${id}`),
};

// ── Stores ──
export const storesAPI = {
  list: (params) => api.get("/sellers", { params }),
  get: (slug) => api.get(`/sellers/${slug}`),
  getProducts: (id) => api.get(`/sellers/${id}/products`),
  myStore: () => api.get("/sellers/my-store"),
  analytics: (days = 30) => api.get(`/sellers/my-store/analytics?days=${days}`),
  updateMyStore: (data) => api.put("/sellers/my-store", data),
  uploadLogo: (formData) => {
    const token = _memoryToken || _read();
    return fetch(`${api.defaults.baseURL}/sellers/my-store/logo`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }).then(r => r.json()).then(data => ({ data }));
  },
  uploadBanner: (formData) => {
    const token = _memoryToken || _read();
    return fetch(`${api.defaults.baseURL}/sellers/my-store/banner`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }).then(r => r.json()).then(data => ({ data }));
  },
};

// ── Orders ──
export const ordersAPI = {
  create: (data) => api.post("/orders", data),
  myOrders: (params) => api.get("/orders/my-orders", { params }),
  sellerOrders: (params) => api.get("/orders/store-orders", { params }),
  get: (id) => api.get(`/orders/${id}`),
  updateStatus: (id, data) => api.put(`/orders/${id}/status`, data),
  cart: () => api.get("/orders/cart/items"),
  addToCart: (data) => api.post("/orders/cart/add", data),
  removeFromCart: (id) => api.delete(`/orders/cart/${id}`),
  clearCart: () => api.delete("/orders/cart/clear"),
};

// ── Payments ──
export const paymentsAPI = {
  checkout: (data) => api.post("/payments/checkout", data),
  stripeConnect: () => api.post("/payments/seller/connect"),
  stripeStatus: () => api.get("/payments/seller/connect/status"),
  payouts: () => api.get("/payments/seller/payouts"),
  subscribe: (tier) => api.post(`/payments/subscribe/${tier}`),
};

// ── Reviews ──
export const reviewsAPI = {
  getForProduct: (id) => api.get(`/reviews/product/${id}`),
  create: (data) => api.post("/reviews", data),
  delete: (id) => api.delete(`/reviews/${id}`),
};

// ── Admin ──
export const adminAPI = {
  stats: () => api.get("/admin/stats"),
  pendingSellers: () => api.get("/admin/sellers/pending"),
  approveSeller: (id, data) => api.put(`/admin/sellers/${id}/approve`, data),
  suspendStore: (id, data) => api.put(`/admin/stores/${id}/suspend`, data),
  deleteStore: (id) => api.delete(`/admin/stores/${id}`),
  users: (params) => api.get("/admin/users", { params }),
  featureProduct: (id) => api.put(`/admin/products/${id}/feature`),
};

// ── Wishlist ──
export const wishlistAPI = {
  get: () => api.get("/wishlist/"),
  getIds: () => api.get("/wishlist/ids"),
  toggle: (productId) => api.post(`/wishlist/${productId}`),
};

// ── Discounts ──
export const discountsAPI = {
  apply: (code, subtotal) => api.post("/discounts/apply", { code, subtotal }),
  myCodes: () => api.get("/discounts/seller"),
  create: (data) => api.post("/discounts/seller", data),
  delete: (id) => api.delete(`/discounts/seller/${id}`),
};

// ── Variants ──
export const variantsAPI = {
  getForProduct: (productId) => api.get(`/variants/product/${productId}`),
  create: (productId, data) => api.post(`/variants/product/${productId}`, data),
  delete: (id) => api.delete(`/variants/${id}`),
};

// ── Messages ──
export const messagesAPI = {
  list: () => api.get("/messages/"),
  start: (data) => api.post("/messages/start", data),
  get: (id) => api.get(`/messages/${id}`),
  send: (id, body) => api.post(`/messages/${id}/send`, { body }),
  unread: () => api.get("/messages/unread/count"),
};

// ── Shipping ──
export const shippingAPI = {
  getRates: (orderId) => api.get(`/shipping/rates/${orderId}`),
  createLabel: (orderId, rateId) => api.post(`/shipping/label/${orderId}?rate_id=${rateId}`),
  getLabel: (orderId) => api.get(`/shipping/label/${orderId}`),
};

// ── Subscriptions ──
export const subscriptionsAPI = {
  plans: () => api.get("/subscriptions/plans"),
  myPlan: () => api.get("/subscriptions/my-plan"),
  upgrade: (tier) => api.post(`/subscriptions/upgrade/${tier}`),
};

// ── Referrals ──
export const referralsAPI = {
  myCode: () => api.get("/referrals/my-code"),
  stats: () => api.get("/referrals/stats"),
  use: (code) => api.post(`/referrals/use/${code}`),
};

// ── Admin Analytics ──
export const adminAnalyticsAPI = {
  get: (days = 30) => api.get(`/admin/analytics?days=${days}`),
};

export default api;