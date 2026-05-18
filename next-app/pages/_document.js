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
            body[data-theme="dark"] {
              --bg-primary: #0f172a;
              --bg-secondary: #1e293b;
              --bg-card: #334155;
              --bg-section: #475569;
              --bg-input: #1e293b;
              --bg-hover: #475569;
              --text-primary: #f1f5f9;
              --text-secondary: #cbd5e1;
              --text-muted: #94a3b8;
              --border-color: #475569;
              --border-rgb: 71,85,105;
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
