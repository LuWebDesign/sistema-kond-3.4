import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="es">
      <Head>
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" 
          rel="stylesheet"
        />
        {/* Inline script: aplicar estilos del catálogo desde localStorage antes del primer paint para evitar flash */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var raw=localStorage.getItem('catalogStyles');if(!raw)return;var s=JSON.parse(raw);var map={buttonBg:'--kond-btn-bg',buttonTextColor:'--kond-btn-color',buttonRadius:'--kond-btn-radius',accentColor:'--accent-blue',cardBg:'--kond-card-bg',cardBorderColor:'--kond-card-border',cardRadius:'--kond-card-radius',badgeBg:'--kond-badge-bg',badgeTextColor:'--kond-badge-color',headerBg:'--header-bg',headerTextColor:'--header-text-color',catalogBg:'--bg-primary',catalogTextColor:'--text-primary',footerBg:'--footer-bg',footerTextColor:'--footer-text-color',bannerBg:'--banner-bg',bannerTextColor:'--banner-text-color'};Object.keys(map).forEach(function(k){try{var v=s[k];if(v){document.documentElement.style.setProperty(map[k],v)}else{document.documentElement.style.removeProperty(map[k])}}catch(e){}});}catch(e){} })();` }} />
      </Head>
      <body data-theme="dark">
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
