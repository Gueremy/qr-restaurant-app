import React from 'react';
import { Link } from 'react-router-dom';

const UnauthorizedPage: React.FC = () => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      textAlign: 'center',
      padding: '2rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '3rem',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        maxWidth: '500px'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🚫</div>
        
        <h1 style={{ 
          color: '#dc3545', 
          marginBottom: '1rem',
          fontSize: '2rem'
        }}>
          Acceso No Autorizado
        </h1>
        
        <p style={{ 
          color: '#666', 
          marginBottom: '2rem',
          fontSize: '1.1rem',
          lineHeight: '1.5'
        }}>
          No tienes permisos para acceder a esta sección del sistema.
          Por favor, contacta al administrador si crees que esto es un error.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link 
            to="/login"
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#007bff',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              fontSize: '1rem'
            }}
          >
            Iniciar Sesión
          </Link>
          
          <Link 
            to="/"
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#6c757d',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              fontSize: '1rem'
            }}
          >
            Ir al Inicio
          </Link>
        </div>

        <div style={{ 
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
          fontSize: '0.9rem',
          color: '#666'
        }}>
          <strong>Roles del sistema:</strong><br/>
          • Administrador: Gestión completa del sistema<br/>
          • Mesero: Gestión de pedidos y mesas<br/>
          • Cocina: Preparación de pedidos<br/>
          • Cliente: Acceso a menú y pedidos (sin login)
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;