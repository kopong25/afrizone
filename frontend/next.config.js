const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  reloadOnOnline: false,
  disable: process.env.NODE_ENV === "development",
  cacheOnFrontEndNav: false,
  exclude: [
    /\/checkout/,
    /\/cart/,
  ],
  runtimeCaching: [
    // ── 0. FIRST: exclude checkout and cart from SW entirely ──
    {
      urlPattern: /\/(checkout|cart)(\?.*)?$/i,
      handler: "NetworkOnly",
    },
    // ── 1. Your own pages — NetworkFirst, short timeout ──
    {
      urlPattern: /^https:\/\/afrizoneshop\.com\/.*$/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "page-cache",
        networkTimeoutSeconds: 5,
        expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
      },
    },
    // ── 2. Backend API (new domain) — NetworkOnly (never cache) ──
    {
      urlPattern: /^https:\/\/api\.afrizoneshop\.com\/.*$/i,
      handler: "NetworkOnly",
    },
    // ── 3. Backend API (old domain fallback) — NetworkOnly ──
    {
      urlPattern: /^https:\/\/afrizone-loqr\.onrender\.com\/.*$/i,
      handler: "NetworkOnly",
    },
    // ── 4. Google Analytics — NetworkOnly ──
    {
      urlPattern: /^https:\/\/www\.googletagmanager\.com\/.*$/i,
      handler: "NetworkOnly",
    },
    {
      urlPattern: /^https:\/\/www\.google-analytics\.com\/.*$/i,
      handler: "NetworkOnly",
    },
    // ── 5. Microsoft Clarity — NetworkOnly ──
    {
      urlPattern: /^https:\/\/www\.clarity\.ms\/.*$/i,
      handler: "NetworkOnly",
    },
    // ── 6. Cloudinary images — CacheFirst ──
    {
      urlPattern: /^https:\/\/res\.cloudinary\.com\/.*$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "image-cache",
        expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
      },
    },
    // ── 7. Google Fonts — CacheFirst ──
    {
      urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "font-cache",
        expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
      },
    },
    // ── 8. Stripe JS — NetworkOnly (PCI compliance) ──
    {
      urlPattern: /^https:\/\/js\.stripe\.com\/.*$/i,
      handler: "NetworkOnly",
    },
  ],
});

module.exports = withPWA({
  reactStrictMode: true,
  images: {
    domains: ["res.cloudinary.com"],
  },
  async headers() {
    return [
      {
        source: "/manifest.json",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
      {
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/wp-admin/:path*", destination: "/", permanent: false },
      { source: "/wordpress/:path*", destination: "/", permanent: false },
      { source: "/xmlrpc.php", destination: "/", permanent: false },
    ];
  },
});