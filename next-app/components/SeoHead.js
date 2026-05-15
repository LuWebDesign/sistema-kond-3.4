// next-app/components/SeoHead.js
// Renders all SEO meta tags into <Head> from seo_config values.
// Usage: <SeoHead config={seoConfig} pageTitle="Override title" pageDescription="Override desc" pageCanonical="https://..." />

import Head from 'next/head'

export default function SeoHead({
  config = {},
  pageTitle,        // override site title for specific pages
  pageDescription,  // override description for specific pages
  pageCanonical,    // override canonical for specific pages
  ogImage,          // optional OG image URL
}) {
  const title       = pageTitle       || config.siteTitle       || ''
  const description = pageDescription || config.siteDescription || ''
  const canonical   = pageCanonical   || config.canonicalUrl    || config.siteUrl || ''
  const language    = config.language || 'es'

  // robots meta: index/noindex + follow/nofollow
  const robotsDirectives = [
    config.indexSite  !== false ? 'index'  : 'noindex',
    config.followLinks !== false ? 'follow' : 'nofollow',
  ].join(', ')

  return (
    <Head>
      {/* Core */}
      {title       && <title>{title}</title>}
      {description && <meta name="description" content={description} />}
      {config.keywords && <meta name="keywords" content={config.keywords} />}
      <meta name="robots" content={robotsDirectives} />
      <meta httpEquiv="content-language" content={language} />
      {canonical   && <link rel="canonical" href={canonical} />}

      {/* Open Graph */}
      {title       && <meta property="og:title"       content={title} />}
      {description && <meta property="og:description" content={description} />}
      {canonical   && <meta property="og:url"         content={canonical} />}
      {ogImage     && <meta property="og:image"       content={ogImage} />}
      <meta property="og:type" content="website" />

      {/* Twitter Card */}
      <meta name="twitter:card"        content="summary_large_image" />
      {title       && <meta name="twitter:title"       content={title} />}
      {description && <meta name="twitter:description" content={description} />}
      {ogImage     && <meta name="twitter:image"       content={ogImage} />}

      {/* Webmaster verification codes */}
      {config.googleSearchConsole      && <meta name="google-site-verification"  content={config.googleSearchConsole} />}
      {config.bingWebmaster            && <meta name="msvalidate.01"             content={config.bingWebmaster} />}
      {config.yandexWebmaster          && <meta name="yandex-verification"       content={config.yandexWebmaster} />}
      {config.pinterestVerification    && <meta name="p:domain_verify"           content={config.pinterestVerification} />}
      {config.facebookDomainVerification && <meta name="facebook-domain-verification" content={config.facebookDomainVerification} />}

      {/* Google Analytics script tag (ID only — no full gtag injection here) */}
      {config.googleAnalytics && (
        <>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${config.googleAnalytics}`} />
          <script dangerouslySetInnerHTML={{ __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${config.googleAnalytics}', { page_path: window.location.pathname });
          `}} />
        </>
      )}
    </Head>
  )
}
