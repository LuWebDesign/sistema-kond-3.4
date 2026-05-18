import Document, { Html, Head, Main, NextScript } from 'next/document'

class MyDocument extends Document {
  render() {
    return (
      <Html lang="es">
        <Head />
        <body>
          <script
            dangerouslySetInnerHTML={{
              __html: `
            (function() {
              var theme = localStorage.getItem('theme') || 'light';
              document.body.setAttribute('data-theme', theme);
            })();
              `
            }}
          />
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default MyDocument
