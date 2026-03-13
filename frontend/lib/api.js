import axios from "axios";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Token store ─────────────────────────────────────────────────────────────
// Priority: sessionStorage (works in iOS Private) → localStorage → cookie
// sessionStorage survives page navigation within the same tab on ALL browsers
// including iOS Safari Private mode where localStorage quota is 0.
let _memoryToken = null;

function _write(token) {
  // sessionStorage: works in iOS Private mode, survives navigation within tab
  try { if (token) sessionStorage.setItem("az_tok", token); else sessionStorage.removeItem("az_tok"); } catch {}
  // localStorage: survives across tabs/sessions (blocked in iOS Private — silent fail)
  try { if (token) localStorage.setItem("afrizone_token", token); else localStorage.removeItem("afrizone_token"); } catch {}
  // Cookie: fallback for SSR / desktop
  try {
    if (token) {
      const isProd = typeof window !== "undefined" && window.location.protocol === "https:";
      Cookies.set("afrizone_token", token, { expires: 7, sameSite: isProd ? "None" : "Lax", secure: isProd });
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

export function loadStoredToken() {
  const token = _read();
  if (token) {
    _memoryToken = token;
    // Ensure sessionStorage has it for this tab session
    try { sessionStorage.setItem("az_tok", token); } catch {}
  }
  return token;
}

// ─── Axios instance ──────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// Read token on EVERY request — never trust cached _memoryToken alone
// because iOS Safari resets module state on every page navigation
api.interceptors.request.use((config) => {
  // Use memory if set, otherwise read fresh from all storage layers
  const token = _memoryToken || _read();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    // Keep memory in sync so next call is faster
    if (!_memoryToken) _memoryToken = token;
  }
  return config;
});

// Handle 401 — never wipe stored tokens on 401
// Wiping tokens on /auth/me 401 caused a cascade: one failed check destroyed
// the entire session for all subsequent requests.
// Token cleanup is ONLY done by explicit logout() in _app.js.
api.interceptors.response.use(
  (response) => response,
  (error) => {
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
  // Seller actions
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
  uploadLogo: (formData) =>
    api.post("/sellers/my-store/logo", formData),
  uploadBanner: (formData) =>
    api.post("/sellers/my-store/banner", formData),
};

// ── Orders ──
export const ordersAPI = {
  create: (data) => api.post("/orders", data),
  myOrders: (params) => api.get("/orders/my-orders", { params }),
  sellerOrders: (params) => api.get("/orders/store-orders", { params }),
  get: (id) => api.get(`/orders/${id}`),
  updateStatus: (id, data) => api.put(`/orders/${id}/status`, data),
  // Cart
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
  users: (params) => api.get("/admin/users", { params }),
  featureProduct: (id) => api.put(`/admin/products/${id}/feature`),
};

export default api;

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

export const messagesAPI = {
  list: () => api.get("/messages/"),
  start: (data) => api.post("/messages/start", data),
  get: (id) => api.get(`/messages/${id}`),
  send: (id, body) => api.post(`/messages/${id}/send`, { body }),
  unread: () => api.get("/messages/unread/count"),
};

export const shippingAPI = {
  getRates: (orderId) => api.get(`/shipping/rates/${orderId}`),
  createLabel: (orderId, rateId) => api.post(`/shipping/label/${orderId}?rate_id=${rateId}`),
  getLabel: (orderId) => api.get(`/shipping/label/${orderId}`),
};

export const subscriptionsAPI = {
  plans: () => api.get("/subscriptions/plans"),
  myPlan: () => api.get("/subscriptions/my-plan"),
  upgrade: (tier) => api.post(`/subscriptions/upgrade/${tier}`),
};

export const referralsAPI = {
  myCode: () => api.get("/referrals/my-code"),
  stats: () => api.get("/referrals/stats"),
  use: (code) => api.post(`/referrals/use/${code}`),
};

export const adminAnalyticsAPI = {
  get: (days = 30) => api.get(`/admin/analytics?days=${days}`),
};