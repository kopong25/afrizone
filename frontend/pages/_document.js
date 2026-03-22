import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1A5C38" />
        <meta name="application-name" content="Afrizone" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Afrizone" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />

        {/* Apple touch icons */}
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192x192.png" />

        {/* Favicon */}
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-96x96.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-72x72.png" />
        <link rel="shortcut icon" href="/icons/icon-96x96.png" />

        {/* SEO */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="description" content="Shop authentic African products from stores in the USA, Canada & Europe. Food, fashion, beauty, art and more." />
        <meta property="og:title" content="Afrizone — Pan-African Marketplace" />
        <meta property="og:description" content="Shop authentic African products from stores across the diaspora." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://afrizone-frontend.onrender.com" />
        <meta name="twitter:card" content="summary_large_image" />

        {/* Impact.com affiliate verification */}
        <meta name="impact-site-verification" content="4706caff-b8aa-4b08-a725-1a0dec19b04c" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
