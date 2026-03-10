import Layout from '../components/Layout'
import { useState, useEffect } from 'react'
import { formatCurrency } from '../utils/catalogUtils'

export default function Home() {
  return (
    <Layout title="Dashboard - Sistema KOND">
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          fontWeight: 'bold',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '1rem'
        }}>
           Dashboard - Sistema KOND (Next.js)
        </h1>
        
        <p style={{ 
          fontSize: '1.2rem', 
          color: '#6b7280', 
          marginBottom: '2rem' 
        }}>
          ¡Migración completada exitosamente! El sistema está funcionando con Next.js
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          maxWidth: '1000px',
          margin: '0 auto'
        }}>
          <a href="/catalog" style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '2rem',
            borderRadius: '15px',
            textDecoration: 'none',
            boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)',
            transform: 'scale(1)',
            transition: 'transform 0.2s'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}></div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>Catálogo</h3>
            <p style={{ margin: 0, opacity: 0.9 }}>Ver productos y realizar pedidos</p>
          </a>

          <a href="/orders" style={{
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white',
            padding: '2rem',
            borderRadius: '15px',
            textDecoration: 'none',
            boxShadow: '0 10px 30px rgba(245, 87, 108, 0.3)',
            transform: 'scale(1)',
            transition: 'transform 0.2s'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}></div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>Pedidos</h3>
            <p style={{ margin: 0, opacity: 0.9 }}>Administrar órdenes</p>
          </a>

          <a href="/tracking" style={{
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            color: 'white',
            padding: '2rem',
            borderRadius: '15px',
            textDecoration: 'none',
            boxShadow: '0 10px 30px rgba(79, 172, 254, 0.3)',
            transform: 'scale(1)',
            transition: 'transform 0.2s'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}></div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>Tracking</h3>
            <p style={{ margin: 0, opacity: 0.9 }}>Seguimiento de pedidos</p>
          </a>

          <a href="/user" style={{
            background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            color: 'white',
            padding: '2rem',
            borderRadius: '15px',
            textDecoration: 'none',
            boxShadow: '0 10px 30px rgba(250, 112, 154, 0.3)',
            transform: 'scale(1)',
            transition: 'transform 0.2s'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}></div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>Mi Cuenta</h3>
            <p style={{ margin: 0, opacity: 0.9 }}>Gestión de usuario</p>
          </a>
        </div>

        <div style={{
          marginTop: '3rem',
          padding: '2rem',
          background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
          borderRadius: '15px',
          maxWidth: '600px',
          margin: '3rem auto 0'
        }}>
          <h2 style={{ marginTop: 0, color: '#333' }}> Migración Exitosa</h2>
          <div style={{ fontSize: '1.1rem', color: '#555' }}>
            <p> Next.js Framework</p>
            <p> React Hooks</p>
            <p> localStorage Compatible</p>
            <p> 5/5 Páginas Migradas</p>
          </div>
        </div>
      </div>
    </Layout>
  )
}
