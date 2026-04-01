import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => { setIsHydrated(true); }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const checkSession = useCallback(() => {
    if (typeof window === 'undefined') { setIsLoading(false); setHasChecked(true); return; }
    try {
      const sessionData = localStorage.getItem('adminSession');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        const now = new Date().getTime();
        const sessionDuration = session.sessionDuration || (24 * 60 * 60 * 1000);
        if (now - session.timestamp < sessionDuration) { router.replace('/admin/dashboard'); return; }
        else { localStorage.removeItem('adminSession'); }
      }
      setIsLoading(false); setHasChecked(true);
    } catch (error) { console.error('Error checking session:', error); setIsLoading(false); setHasChecked(true); }
  }, []);

  useEffect(() => { if (hasChecked) return; checkSession(); }, [hasChecked]);

  const scrollToSection = useCallback((sectionId) => {
    setMenuOpen(false);
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleContactSubmit = useCallback((e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('name');
    setSuccessMessage(`Gracias ${name}! Tu mensaje ha sido enviado. Te contactaremos pronto.`);
    e.target.reset();
    setTimeout(() => setSuccessMessage(''), 8000);
  }, []);

  if (!isHydrated || isLoading) {
    return (
      <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', background:'#080c1a', color:'#e2e8f0' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ width:'36px', height:'36px', border:'3px solid #3b82f6', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 1s linear infinite', margin:'0 auto 16px' }} />
          <p style={{ fontSize:'0.9rem', opacity:0.6 }}>Cargando...</p>
        </div>
      </div>
    );
  }

  const features = [
    { icon: <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>, title: 'Gestión de Producción', desc: 'Calcula tiempos de fabricación, optimiza órdenes por lote y planifica producción con calendarios reales.' },
    { icon: <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" /></svg>, title: 'Pedidos Inteligentes', desc: 'Flujo de pedidos con estados claros, seguimiento y notificaciones automáticas para agilizar entregas.' },
    { icon: <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>, title: 'Control Financiero', desc: 'Calcula señas, costos y márgenes por producto con reportes financieros y balances claros.' },
    { icon: <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" /></svg>, title: 'Catálogo Público', desc: 'Publica productos con variantes, imágenes y checkout por WhatsApp o transferencia.' },
    { icon: <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>, title: 'Métricas y Análisis', desc: 'Dashboard con métricas clave para identificar cuellos de botella y oportunidades de mejora.' },
    { icon: <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>, title: 'Fácil de Personalizar', desc: 'Interfaz intuitiva, configuración rápida y APIs para integrar con herramientas existentes.' },
  ];

  return (
    <>
      <Head>
        <title>KOND — Gestión para talleres y producción por encargo</title>
        <meta name="description" content="Reduce tiempos de producción y errores. Gestiona pedidos, catálogo y finanzas desde una única plataforma. Prueba 14 días gratis." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content="KOND — Gestión para talleres y producción por encargo" />
        <meta property="og:description" content="Reduce tiempos de producción y errores. Gestiona pedidos, catálogo y finanzas desde una única plataforma." />
        <meta property="og:image" content="/og-home.png" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "KOND",
          "description": "Sistema integral para gestión de producción, pedidos y catálogo público.",
          "applicationCategory": "BusinessApplication",
          "url": typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'
        }) }} />
      </Head>

      <style jsx global>{`
        * { box-sizing: border-box; }
        body {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          background: #080c1a;
          color: #e2e8f0;
          line-height: 1.6;
          margin: 0;
          overflow-x: hidden;
        }

        .hp-container { max-width: 1140px; margin: 0 auto; padding: 0 24px; }

        /* ── Header ── */
        .hp-header {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          padding: 0 24px;
          transition: background 0.3s, box-shadow 0.3s, border-color 0.3s;
          border-bottom: 1px solid transparent;
        }
        .hp-header.scrolled {
          background: rgba(8, 12, 26, 0.92);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom-color: rgba(148, 163, 184, 0.08);
          box-shadow: 0 1px 24px rgba(0,0,0,0.25);
        }
        .hp-header-inner {
          max-width: 1140px; margin: 0 auto;
          display: flex; justify-content: space-between; align-items: center;
          height: 64px;
        }
        .hp-logo {
          font-size: 1.35rem; font-weight: 800; letter-spacing: -0.5px;
          color: #fff; text-decoration: none;
          display: flex; align-items: center; gap: 8px;
        }
        .hp-logo-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #3b82f6;
          box-shadow: 0 0 12px rgba(59,130,246,0.5);
        }
        .hp-nav { display: flex; align-items: center; gap: 32px; }
        .hp-nav-link {
          color: #94a3b8; text-decoration: none; font-size: 0.875rem;
          font-weight: 500; transition: color 0.2s; background: none; border: none;
          cursor: pointer; padding: 0;
        }
        .hp-nav-link:hover { color: #e2e8f0; }
        .hp-btn-admin {
          background: #3b82f6; color: #fff; border: none; padding: 8px 18px;
          border-radius: 8px; font-size: 0.85rem; font-weight: 600;
          cursor: pointer; transition: background 0.2s, transform 0.15s;
        }
        .hp-btn-admin:hover { background: #2563eb; transform: translateY(-1px); }
        .hp-hamburger {
          display: none; background: none; border: none; cursor: pointer; padding: 4px;
          color: #e2e8f0;
        }
        .hp-mobile-nav {
          display: none; position: fixed; top: 64px; left: 0; right: 0; bottom: 0;
          background: rgba(8,12,26,0.98); backdrop-filter: blur(16px);
          flex-direction: column; align-items: center; justify-content: center; gap: 32px;
          z-index: 99;
        }
        .hp-mobile-nav.open { display: flex; }
        .hp-mobile-nav .hp-nav-link { font-size: 1.1rem; color: #cbd5e1; }

        /* ── Hero ── */
        .hp-hero {
          position: relative; padding: 160px 0 100px; text-align: center;
          overflow: hidden;
        }
        .hp-hero-bg {
          position: absolute; inset: 0; z-index: 0; pointer-events: none;
        }
        .hp-glow {
          position: absolute; border-radius: 50%; filter: blur(120px); opacity: 0.15;
        }
        .hp-glow-1 {
          width: 600px; height: 600px; top: -200px; left: 50%;
          transform: translateX(-50%);
          background: #3b82f6;
        }
        .hp-glow-2 {
          width: 400px; height: 400px; top: 100px; right: -100px;
          background: #06b6d4;
        }
        .hp-hero-content { position: relative; z-index: 1; }
        .hp-badge {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.2);
          padding: 6px 16px; border-radius: 100px; font-size: 0.8rem;
          color: #60a5fa; font-weight: 500; margin-bottom: 28px;
        }
        .hp-badge-dot {
          width: 6px; height: 6px; border-radius: 50%; background: #3b82f6;
          animation: pulse-dot 2s ease-in-out infinite;
        }
        .hp-hero h1 {
          font-size: 3.75rem; font-weight: 800; letter-spacing: -1.5px;
          line-height: 1.1; margin: 0 0 24px; color: #f8fafc;
        }
        .hp-hero h1 span {
          background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hp-hero-desc {
          font-size: 1.15rem; color: #94a3b8; max-width: 540px;
          margin: 0 auto 40px; line-height: 1.7;
        }
        .hp-hero-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
        .hp-btn-primary {
          background: #3b82f6; color: #fff; padding: 13px 28px;
          border-radius: 10px; border: none; font-weight: 600; font-size: 0.95rem;
          cursor: pointer; transition: all 0.2s; text-decoration: none;
          display: inline-flex; align-items: center; gap: 8px;
        }
        .hp-btn-primary:hover { background: #2563eb; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(59,130,246,0.3); }
        .hp-btn-ghost {
          background: transparent; color: #cbd5e1; padding: 13px 28px;
          border: 1px solid #1e293b; border-radius: 10px; font-weight: 600;
          font-size: 0.95rem; cursor: pointer; transition: all 0.2s;
        }
        .hp-btn-ghost:hover { border-color: #334155; color: #f8fafc; background: rgba(30,41,59,0.5); }

        .hp-stats-row {
          display: flex; justify-content: center; gap: 48px;
          margin-top: 64px; padding-top: 48px;
          border-top: 1px solid rgba(148,163,184,0.06);
        }
        .hp-stat { text-align: center; }
        .hp-stat-num {
          font-size: 1.75rem; font-weight: 800; color: #f8fafc;
          letter-spacing: -0.5px;
        }
        .hp-stat-label { font-size: 0.8rem; color: #64748b; margin-top: 4px; }

        /* ── Features ── */
        .hp-features { padding: 100px 0; position: relative; }
        .hp-section-label {
          text-align: center; font-size: 0.8rem; font-weight: 600;
          text-transform: uppercase; letter-spacing: 2px;
          color: #3b82f6; margin-bottom: 12px;
        }
        .hp-section-title {
          text-align: center; font-size: 2.25rem; font-weight: 700;
          color: #f8fafc; margin-bottom: 16px; letter-spacing: -0.5px;
        }
        .hp-section-desc {
          text-align: center; color: #64748b; font-size: 1rem;
          max-width: 520px; margin: 0 auto 56px;
        }
        .hp-features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        .hp-fcard {
          background: rgba(15,23,42,0.6);
          border: 1px solid rgba(148,163,184,0.06);
          border-radius: 14px; padding: 32px 28px;
          transition: all 0.25s ease;
        }
        .hp-fcard:hover {
          border-color: rgba(59,130,246,0.15);
          background: rgba(15,23,42,0.9);
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.2);
        }
        .hp-fcard-icon {
          width: 44px; height: 44px; display: flex; align-items: center;
          justify-content: center; border-radius: 10px;
          background: rgba(59,130,246,0.08); color: #3b82f6;
          margin-bottom: 20px;
        }
        .hp-fcard h3 {
          font-size: 1.05rem; font-weight: 600; color: #f1f5f9;
          margin: 0 0 10px;
        }
        .hp-fcard p { color: #64748b; font-size: 0.9rem; margin: 0; line-height: 1.6; }

        /* ── About ── */
        .hp-about { padding: 100px 0; }
        .hp-about-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center;
        }
        .hp-about-text h2 {
          font-size: 2.25rem; font-weight: 700; color: #f8fafc;
          margin: 0 0 20px; letter-spacing: -0.5px;
        }
        .hp-about-text p { color: #94a3b8; margin: 0 0 16px; font-size: 0.95rem; }
        .hp-checklist { list-style: none; padding: 0; margin: 24px 0 28px; }
        .hp-checklist li {
          display: flex; align-items: flex-start; gap: 12px;
          color: #cbd5e1; font-size: 0.9rem; margin-bottom: 14px;
        }
        .hp-check-icon {
          width: 20px; height: 20px; min-width: 20px; border-radius: 50%;
          background: rgba(59,130,246,0.1); color: #3b82f6;
          display: flex; align-items: center; justify-content: center;
          margin-top: 2px;
        }
        .hp-about-visual {
          background: linear-gradient(145deg, rgba(15,23,42,0.8), rgba(30,41,59,0.4));
          border: 1px solid rgba(148,163,184,0.06); border-radius: 16px;
          padding: 40px; position: relative; overflow: hidden;
        }
        .hp-about-visual::before {
          content: ''; position: absolute; top: -50%; right: -50%;
          width: 100%; height: 100%; border-radius: 50%;
          background: radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%);
        }
        .hp-mini-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; position: relative; }
        .hp-mini-stat {
          background: rgba(8,12,26,0.6); border: 1px solid rgba(148,163,184,0.06);
          border-radius: 12px; padding: 24px; text-align: center;
        }
        .hp-mini-stat-val {
          font-size: 2rem; font-weight: 800; color: #3b82f6; margin-bottom: 4px;
        }
        .hp-mini-stat-lbl { font-size: 0.8rem; color: #64748b; }

        /* ── Pricing ── */
        .hp-pricing {
          padding: 100px 0;
          background: linear-gradient(180deg, transparent 0%, rgba(15,23,42,0.4) 50%, transparent 100%);
        }
        .hp-pricing-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 20px; max-width: 1060px; margin: 0 auto;
        }
        .hp-pcard {
          background: rgba(15,23,42,0.6);
          border: 1px solid rgba(148,163,184,0.06);
          border-radius: 16px; padding: 36px 28px; text-align: center;
          position: relative; transition: all 0.3s ease;
          display: flex; flex-direction: column;
        }
        .hp-pcard:hover {
          border-color: rgba(59,130,246,0.15);
          transform: translateY(-6px);
          box-shadow: 0 16px 48px rgba(0,0,0,0.25);
        }
        .hp-pcard.featured {
          background: rgba(59,130,246,0.05);
          border-color: rgba(59,130,246,0.3);
        }
        .hp-pcard-badge {
          position: absolute; top: -13px; left: 50%; transform: translateX(-50%);
          background: #3b82f6; color: #fff;
          padding: 6px 18px; border-radius: 100px;
          font-size: 0.75rem; font-weight: 600; white-space: nowrap;
        }
        .hp-pcard h3 {
          font-size: 1.15rem; font-weight: 600; color: #e2e8f0;
          margin: 0 0 20px;
        }
        .hp-pcard-price {
          margin-bottom: 8px;
        }
        .hp-price-val {
          font-size: 2.75rem; font-weight: 800; color: #f8fafc; letter-spacing: -1px;
        }
        .hp-price-period { font-size: 0.9rem; color: #64748b; }
        .hp-pcard-desc {
          color: #64748b; font-size: 0.85rem; margin: 0 0 28px; line-height: 1.5;
        }
        .hp-pcard-features {
          text-align: left; margin-bottom: 28px; flex: 1;
        }
        .hp-pf-item {
          display: flex; align-items: center; gap: 10px;
          font-size: 0.85rem; color: #94a3b8; margin-bottom: 10px;
        }
        .hp-pf-check { color: #3b82f6; display: flex; align-items: center; min-width: 16px; }
        .hp-pcard-btn {
          width: 100%; padding: 12px; border-radius: 10px;
          font-weight: 600; font-size: 0.9rem; cursor: pointer;
          transition: all 0.2s; border: 1.5px solid #1e293b;
          background: transparent; color: #cbd5e1;
        }
        .hp-pcard-btn:hover { border-color: #3b82f6; color: #3b82f6; }
        .hp-pcard-btn.primary {
          background: #3b82f6; color: #fff; border-color: #3b82f6;
        }
        .hp-pcard-btn.primary:hover {
          background: #2563eb; border-color: #2563eb; transform: translateY(-1px);
        }
        .hp-pricing-note {
          text-align: center; margin-top: 40px; color: #475569;
          font-size: 0.85rem;
        }
        .hp-pricing-note strong { color: #94a3b8; }

        /* ── Contact ── */
        .hp-contact { padding: 100px 0; }
        .hp-contact-wrapper {
          max-width: 560px; margin: 0 auto;
          background: rgba(15,23,42,0.6);
          border: 1px solid rgba(148,163,184,0.06);
          border-radius: 16px; padding: 40px;
        }
        .hp-form-group { margin-bottom: 20px; }
        .hp-form-group label {
          display: block; margin-bottom: 6px; font-size: 0.85rem;
          font-weight: 500; color: #94a3b8;
        }
        .hp-form-group input,
        .hp-form-group textarea {
          width: 100%; padding: 11px 14px;
          border: 1px solid rgba(148,163,184,0.1);
          border-radius: 10px; background: rgba(8,12,26,0.6);
          color: #e2e8f0; font-size: 0.9rem; font-family: inherit;
          transition: border-color 0.2s;
        }
        .hp-form-group input:focus,
        .hp-form-group textarea:focus {
          outline: none; border-color: #3b82f6;
        }
        .hp-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .hp-form-submit {
          width: 100%; padding: 13px; border-radius: 10px;
          background: #3b82f6; color: #fff; border: none;
          font-weight: 600; font-size: 0.95rem; cursor: pointer;
          transition: all 0.2s; margin-top: 4px;
        }
        .hp-form-submit:hover { background: #2563eb; transform: translateY(-1px); }
        .hp-success-msg {
          background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.2);
          color: #4ade80; padding: 12px 16px; border-radius: 10px;
          font-size: 0.9rem; margin-bottom: 20px; text-align: center;
        }

        /* ── Footer ── */
        .hp-footer {
          border-top: 1px solid rgba(148,163,184,0.06);
          padding: 48px 0 32px;
        }
        .hp-footer-inner {
          display: flex; justify-content: space-between; align-items: flex-start;
          flex-wrap: wrap; gap: 32px;
        }
        .hp-footer-brand p { color: #475569; font-size: 0.85rem; margin: 8px 0 0; max-width: 280px; }
        .hp-footer-col h4 {
          font-size: 0.8rem; font-weight: 600; color: #64748b;
          text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px;
        }
        .hp-footer-col a {
          display: block; color: #94a3b8; text-decoration: none;
          font-size: 0.85rem; margin-bottom: 8px; transition: color 0.2s;
        }
        .hp-footer-col a:hover { color: #e2e8f0; }
        .hp-footer-bottom {
          margin-top: 40px; padding-top: 24px;
          border-top: 1px solid rgba(148,163,184,0.06);
          text-align: center; color: #334155; font-size: 0.8rem;
        }

        /* ── Animations ── */
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; } 50% { opacity: 0.4; }
        }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .hp-features-grid { grid-template-columns: repeat(2, 1fr); }
          .hp-pricing-grid { grid-template-columns: 1fr; max-width: 400px; }
          .hp-about-grid { grid-template-columns: 1fr; }
          .hp-stats-row { gap: 32px; }
        }
        @media (max-width: 768px) {
          .hp-hero { padding: 120px 0 72px; }
          .hp-hero h1 { font-size: 2.5rem; }
          .hp-hero-desc { font-size: 1rem; }
          .hp-nav { display: none; }
          .hp-hamburger { display: block; }
          .hp-section-title { font-size: 1.75rem; }
          .hp-stats-row { flex-direction: column; gap: 20px; align-items: center; }
          .hp-footer-inner { flex-direction: column; }
          .hp-about-text h2 { font-size: 1.75rem; }
          .hp-contact-wrapper { padding: 28px 20px; }
          .hp-form-row { grid-template-columns: 1fr; }
        }
        @media (max-width: 540px) {
          .hp-features-grid { grid-template-columns: 1fr; }
          .hp-hero h1 { font-size: 2rem; }
          .hp-hero-actions { flex-direction: column; align-items: center; }
          .hp-mini-stats { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Header */}
      <header className={`hp-header${scrolled ? ' scrolled' : ''}`}>
        <div className="hp-header-inner">
          <Link href="/" className="hp-logo">
            <span className="hp-logo-dot" /> KOND
          </Link>
          <nav className="hp-nav">
            <button className="hp-nav-link" onClick={() => scrollToSection('inicio')}>Inicio</button>
            <button className="hp-nav-link" onClick={() => scrollToSection('features')}>Funciones</button>
            <button className="hp-nav-link" onClick={() => scrollToSection('sobre')}>Sobre KOND</button>
            <button className="hp-nav-link" onClick={() => scrollToSection('precios')}>Precios</button>
            <button className="hp-nav-link" onClick={() => scrollToSection('contacto')}>Contacto</button>
            <Link href="/catalog" className="hp-nav-link">Catálogo</Link>
            <button className="hp-btn-admin" onClick={() => router.push('/admin/login')}>Acceso Admin</button>
          </nav>
          <button className="hp-hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menú">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile Nav */}
      <div className={`hp-mobile-nav${menuOpen ? ' open' : ''}`}>
        <button className="hp-nav-link" onClick={() => scrollToSection('inicio')}>Inicio</button>
        <button className="hp-nav-link" onClick={() => scrollToSection('features')}>Funciones</button>
        <button className="hp-nav-link" onClick={() => scrollToSection('sobre')}>Sobre KOND</button>
        <button className="hp-nav-link" onClick={() => scrollToSection('precios')}>Precios</button>
        <button className="hp-nav-link" onClick={() => scrollToSection('contacto')}>Contacto</button>
        <Link href="/catalog" className="hp-nav-link" onClick={() => setMenuOpen(false)}>Catálogo</Link>
        <button className="hp-btn-admin" onClick={() => { setMenuOpen(false); router.push('/admin/login'); }}>Acceso Admin</button>
      </div>

      {/* Hero */}
      <section id="inicio" className="hp-hero">
        <div className="hp-hero-bg">
          <div className="hp-glow hp-glow-1" />
          <div className="hp-glow hp-glow-2" />
        </div>
        <div className="hp-container hp-hero-content">
          <div className="hp-badge">
            <span className="hp-badge-dot" />
            Plataforma de gestión para producción
          </div>
          <h1>
            Gestión inteligente<br/>para <span>talleres y producción</span>
          </h1>
          <p className="hp-hero-desc">
            Centraliza pedidos, planificación y finanzas en una sola plataforma. Reduce errores, ahorra tiempo y mejora la comunicación con tus clientes.
          </p>
          <div className="hp-hero-actions">
            <Link href="/catalog" className="hp-btn-primary">
              Probar 14 días gratis
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
            </Link>
            <button className="hp-btn-ghost" onClick={() => scrollToSection('sobre')}>Conocer más</button>
          </div>
          <div className="hp-stats-row">
            <div className="hp-stat">
              <div className="hp-stat-num">98%</div>
              <div className="hp-stat-label">Menos errores en pedidos</div>
            </div>
            <div className="hp-stat">
              <div className="hp-stat-num">3x</div>
              <div className="hp-stat-label">Más rápido que planillas</div>
            </div>
            <div className="hp-stat">
              <div className="hp-stat-num">24/7</div>
              <div className="hp-stat-label">Catálogo siempre online</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="hp-features">
        <div className="hp-container">
          <div className="hp-section-label">Funcionalidades</div>
          <h2 className="hp-section-title">Todo lo que necesita tu taller</h2>
          <p className="hp-section-desc">Herramientas diseñadas para resolver los problemas reales de producción por encargo.</p>
          <div className="hp-features-grid">
            {features.map((f, i) => (
              <div className="hp-fcard" key={i}>
                <div className="hp-fcard-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="sobre" className="hp-about">
        <div className="hp-container">
          <div className="hp-about-grid">
            <div className="hp-about-text">
              <div className="hp-section-label" style={{ textAlign: 'left' }}>Sobre KOND</div>
              <h2>Pensado para talleres que producen por encargo</h2>
              <p>KOND nace de entender los problemas reales: tiempos mal calculados, pedidos que se solapan y falta de visibilidad sobre costos. Una plataforma que se adapta a tu forma de trabajar.</p>
              <ul className="hp-checklist">
                <li>
                  <span className="hp-check-icon"><svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg></span>
                  <span><strong>Planificación real:</strong> calendario de entregas y cálculo automático de tiempos por producto.</span>
                </li>
                <li>
                  <span className="hp-check-icon"><svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg></span>
                  <span><strong>Operación centralizada:</strong> catálogo, carrito, pedidos e inventario en un solo lugar.</span>
                </li>
                <li>
                  <span className="hp-check-icon"><svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg></span>
                  <span><strong>Checkout flexible:</strong> WhatsApp, transferencia o retiro en local.</span>
                </li>
                <li>
                  <span className="hp-check-icon"><svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg></span>
                  <span><strong>Escala a tu ritmo:</strong> funciona localmente y se integra con Supabase para producción.</span>
                </li>
              </ul>
              <button className="hp-btn-primary" onClick={() => scrollToSection('contacto')}>
                Solicitar Demo
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
              </button>
            </div>
            <div className="hp-about-visual">
              <div className="hp-mini-stats">
                <div className="hp-mini-stat">
                  <div className="hp-mini-stat-val">-40%</div>
                  <div className="hp-mini-stat-lbl">Tiempo de gestión</div>
                </div>
                <div className="hp-mini-stat">
                  <div className="hp-mini-stat-val">+85%</div>
                  <div className="hp-mini-stat-lbl">Entregas a tiempo</div>
                </div>
                <div className="hp-mini-stat">
                  <div className="hp-mini-stat-val">0</div>
                  <div className="hp-mini-stat-lbl">Pedidos perdidos</div>
                </div>
                <div className="hp-mini-stat">
                  <div className="hp-mini-stat-val">100%</div>
                  <div className="hp-mini-stat-lbl">Visibilidad de costos</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="precios" className="hp-pricing">
        <div className="hp-container">
          <div className="hp-section-label">Precios</div>
          <h2 className="hp-section-title">Planes simples, sin sorpresas</h2>
          <p className="hp-section-desc">14 días gratis en todos los planes. Sin tarjeta, sin compromisos.</p>
          <div className="hp-pricing-grid">
            {/* Básico */}
            <div className="hp-pcard">
              <h3>Básico</h3>
              <div className="hp-pcard-price">
                <span className="hp-price-val">$29</span>
                <span className="hp-price-period"> /mes</span>
              </div>
              <p className="hp-pcard-desc">Para talleres pequeños que comienzan a digitalizarse.</p>
              <div className="hp-pcard-features">
                {['Hasta 100 pedidos/mes','Catálogo básico online','Control de inventario','Reportes mensuales','Soporte por email','1 usuario administrador'].map((f,i) => (
                  <div className="hp-pf-item" key={i}>
                    <span className="hp-pf-check"><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg></span>
                    {f}
                  </div>
                ))}
              </div>
              <button className="hp-pcard-btn" onClick={() => router.push('/admin/login')}>Comenzar gratis</button>
            </div>

            {/* Profesional */}
            <div className="hp-pcard featured">
              <div className="hp-pcard-badge">Más popular</div>
              <h3>Profesional</h3>
              <div className="hp-pcard-price">
                <span className="hp-price-val">$79</span>
                <span className="hp-price-period"> /mes</span>
              </div>
              <p className="hp-pcard-desc">Ideal para negocios en crecimiento con operaciones medianas.</p>
              <div className="hp-pcard-features">
                {['Pedidos ilimitados','Catálogo avanzado','Inventario avanzado','Reportes en tiempo real','Integración WhatsApp','Hasta 5 usuarios','Soporte prioritario','API para integraciones'].map((f,i) => (
                  <div className="hp-pf-item" key={i}>
                    <span className="hp-pf-check"><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg></span>
                    {f}
                  </div>
                ))}
              </div>
              <button className="hp-pcard-btn primary" onClick={() => router.push('/admin/login')}>Comenzar prueba</button>
            </div>

            {/* Empresarial */}
            <div className="hp-pcard">
              <h3>Empresarial</h3>
              <div className="hp-pcard-price">
                <span className="hp-price-val">$149</span>
                <span className="hp-price-period"> /mes</span>
              </div>
              <p className="hp-pcard-desc">Para grandes operaciones que necesitan máxima eficiencia.</p>
              <div className="hp-pcard-features">
                {['Todo del Plan Profesional','Usuarios ilimitados','Múltiples sucursales','Integración ERP completa','Analíticas avanzadas con IA','Soporte 24/7 telefónico','Consultoría personalizada','Backup garantizado'].map((f,i) => (
                  <div className="hp-pf-item" key={i}>
                    <span className="hp-pf-check"><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg></span>
                    {f}
                  </div>
                ))}
              </div>
              <button className="hp-pcard-btn" onClick={() => router.push('/admin/login')}>Contactar Ventas</button>
            </div>
          </div>
          <p className="hp-pricing-note">
            <strong>Todos los planes incluyen:</strong> 14 días gratis &middot; Actualizaciones automáticas &middot; Seguridad garantizada &middot; Cancela cuando quieras
          </p>
        </div>
      </section>

      {/* Contact */}
      <section id="contacto" className="hp-contact">
        <div className="hp-container">
          <div className="hp-section-label">Contacto</div>
          <h2 className="hp-section-title">¿Tenés preguntas? Escribinos</h2>
          <p className="hp-section-desc">Respondemos en menos de 24 horas. También podés solicitar una demo de 15 minutos.</p>
          <div className="hp-contact-wrapper">
            {successMessage && <div className="hp-success-msg">{successMessage}</div>}
            <form onSubmit={handleContactSubmit}>
              <div className="hp-form-row">
                <div className="hp-form-group">
                  <label htmlFor="name">Nombre</label>
                  <input type="text" id="name" name="name" placeholder="Tu nombre" required />
                </div>
                <div className="hp-form-group">
                  <label htmlFor="email">Email</label>
                  <input type="email" id="email" name="email" placeholder="tu@email.com" required />
                </div>
              </div>
              <div className="hp-form-group">
                <label htmlFor="message">Mensaje</label>
                <textarea id="message" name="message" rows="4" placeholder="¿En qué podemos ayudarte?" required></textarea>
              </div>
              <button type="submit" className="hp-form-submit">Enviar mensaje</button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="hp-footer">
        <div className="hp-container">
          <div className="hp-footer-inner">
            <div className="hp-footer-brand">
              <Link href="/" className="hp-logo"><span className="hp-logo-dot" /> KOND</Link>
              <p>Sistema integral para gestión de producción, pedidos y catálogo público.</p>
            </div>
            <div className="hp-footer-col">
              <h4>Producto</h4>
              <a href="#features" onClick={(e) => { e.preventDefault(); scrollToSection('features'); }}>Funciones</a>
              <a href="#precios" onClick={(e) => { e.preventDefault(); scrollToSection('precios'); }}>Precios</a>
              <Link href="/catalog">Catálogo</Link>
            </div>
            <div className="hp-footer-col">
              <h4>Empresa</h4>
              <a href="#sobre" onClick={(e) => { e.preventDefault(); scrollToSection('sobre'); }}>Sobre KOND</a>
              <a href="#contacto" onClick={(e) => { e.preventDefault(); scrollToSection('contacto'); }}>Contacto</a>
            </div>
            <div className="hp-footer-col">
              <h4>Acceso</h4>
              <Link href="/admin/login">Panel Admin</Link>
              <Link href="/catalog/user">Mi Cuenta</Link>
            </div>
          </div>
          <div className="hp-footer-bottom">
            &copy; {new Date().getFullYear()} KOND &mdash; Todos los derechos reservados
          </div>
        </div>
      </footer>
    </>
  );
}
