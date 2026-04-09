import { Html, Head, Main, NextScript } from "next/document";
export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* ── Performance: preconnect to external origins ── */}
        <link rel="preconnect" href="https://js.stripe.com" />
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* ── Favicon — inline SVG fallback so browser never hangs waiting for a file ── */}
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%231A5C38'/><text y='.9em' font-size='80' x='10'>🌍</text></svg>" />
        <link rel="shortcut icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='20' fill='%231A5C38'/><text y='.9em' font-size='80' x='10'>🌍</text></svg>" />

        {/* ── PWA ── */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1A5C38" />
        <meta name="application-name" content="Afrizone" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Afrizone" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />

        {/* ── Apple touch icons — only if files actually exist in /public/icons/ ── */}
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192x192.png" />

        {/* ── SEO ── */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="description" content="Shop authentic African products from stores in the USA, Canada & Europe. Food, fashion, beauty, art and more." />
        <meta property="og:title" content="Afrizone — Pan-African Marketplace" />
        <meta property="og:description" content="Shop authentic African products from stores across the diaspora." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://afrizoneshop.com" />
        <meta name="twitter:card" content="summary_large_image" />

        {/* ── Impact.com affiliate verification ── */}
        <meta name="impact-site-verification" content="4706caff-b8aa-4b08-a725-1a0dec19b04c" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
