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
                  // Force light theme on public pages to avoid dark flash from admin usage
                  if (!window.location.pathname.startsWith('/admin')) {
                    document.body.setAttribute('data-theme', 'light');
                  }
                })();
              `
            }}
          />
          {/* Default light theme CSS — applied immediately to avoid dark flash */}
          <style dangerouslySetInnerHTML={{ __html: `
            :root {
              --bg-primary: #ffffff;
              --bg-secondary: #f8fafc;
              --bg-card: #f1f5f9;
              --bg-section: #e2e8f0;
              --bg-input: #ffffff;
              --bg-hover: #f1f5f9;
              --text-primary: #1e293b;
              --text-secondary: #475569;
              --text-muted: #64748b;
              --border-color: #e2e8f0;
              --border-rgb: 226,232,240;
              --accent-blue: #3b82f6;
              --accent-secondary: #10b981;
            }
          ` }} />
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default MyDocument
