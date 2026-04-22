const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  reloadOnOnline: false,
  disable: process.env.NODE_ENV === "development",
  cacheOnFrontEndNav: false,
  runtimeCaching: [
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
    // ── 2. Backend API — NetworkOnly (never cache) ──
    {
      urlPattern: /^https:\/\/afrizone-loqr\.onrender\.com\/.*$/i,
      handler: "NetworkOnly",
    },
    // ── 3. Google Analytics — NetworkOnly ──
    {
      urlPattern: /^https:\/\/www\.googletagmanager\.com\/.*$/i,
      handler: "NetworkOnly",
    },
    {
      urlPattern: /^https:\/\/www\.google-analytics\.com\/.*$/i,
      handler: "NetworkOnly",
    },
    // ── 4. Microsoft Clarity — NetworkOnly ──
    {
      urlPattern: /^https:\/\/www\.clarity\.ms\/.*$/i,
      handler: "NetworkOnly",
    },
    // ── 5. Cloudinary images — CacheFirst ──
    {
      urlPattern: /^https:\/\/res\.cloudinary\.com\/.*$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "image-cache",
        expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
      },
    },
    // ── 6. Google Fonts — CacheFirst ──
    {
      urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "font-cache",
        expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
      },
    },
    // ── 7. Stripe JS — NetworkOnly (PCI compliance) ──
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