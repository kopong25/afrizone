const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  reloadOnOnline: false,         // ← was true: caused repeated HEAD checks on reconnect
  disable: process.env.NODE_ENV === "development",

  // Stop Workbox from doing background HEAD checks on navigation routes
  cacheOnFrontEndNav: false,     // ← prevents HEAD polls on every page visit

  runtimeCaching: [
    // ── 1. Your own pages — NetworkFirst, short timeout, no HEAD polling ──
    {
      urlPattern: /^https:\/\/afrizoneshop\.com\/.*$/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "page-cache",
        networkTimeoutSeconds: 5,
        expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
      },
    },

    // ── 2. Backend API — NetworkOnly (never cache, never HEAD poll) ──
    {
      urlPattern: /^https:\/\/afrizone-loqr\.onrender\.com\/.*$/i,
      handler: "NetworkOnly",
    },

    // ── 3. Cloudinary images — CacheFirst (unchanged) ──
    {
      urlPattern: /^https:\/\/res\.cloudinary\.com\/.*$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "image-cache",
        expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
      },
    },

    // ── 4. Google Fonts — CacheFirst (unchanged) ──
    {
      urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "font-cache",
        expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
      },
    },

    // ── 5. Stripe JS — NetworkOnly (must always be fresh for PCI compliance) ──
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