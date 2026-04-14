import { Html, Head, Main, NextScript } from 'next/document'

const Document = () => {
  return (
    <Html lang="es">
      <Head>
        {/* Preconnect to Google Fonts and preload the stylesheet correctly to avoid preload warnings */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap"
          rel="preload"
          as="style"
          onLoad="this.onload=null;this.rel='stylesheet'"
        />
        <noscript>
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap"
            rel="stylesheet"
          />
        </noscript>
      </Head>
      <body data-theme="dark">
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}

export default Document
