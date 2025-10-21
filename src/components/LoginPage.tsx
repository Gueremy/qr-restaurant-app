import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface LoginPageProps {
  onLogin: (user: any) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al iniciar sesión');
      }

      // Guardar token en localStorage
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));

      // Llamar callback de login
      onLogin(data.data.user);

      // Redireccionar según el rol
      switch (data.data.user.role) {
        case 'ADMIN':
        case 'MANAGER':
          navigate('/admin');
          break;
        case 'WAITER':
          navigate('/mesero');
          break;
        case 'KITCHEN':
          navigate('/cocina');
          break;
        default:
          navigate('/');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role: string) => {
    // Para propósitos de demostración
    const demoUsers = {
      admin: { id: '1', name: 'Admin Demo', email: 'admin@demo.com', role: 'ADMIN' },
      waiter: { id: '2', name: 'Mesero Demo', email: 'waiter@demo.com', role: 'WAITER' },
      kitchen: { id: '3', name: 'Cocina Demo', email: 'kitchen@demo.com', role: 'KITCHEN' }
    };

    const user = demoUsers[role as keyof typeof demoUsers];
    if (user) {
      try {
        // Intentar hacer login real con credenciales demo
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            username: user.name, 
            password: 'demo123' // Contraseña demo
          }),
        });

        if (response.ok) {
          const data = await response.json();
          // Guardar token real
          localStorage.setItem('token', data.data.token);
          localStorage.setItem('user', JSON.stringify(data.data.user));
          onLogin(data.data.user);
        } else {
          // Si falla el login real, usar token demo
          const demoToken = `demo-token-${user.role.toLowerCase()}-${Date.now()}`;
          localStorage.setItem('token', demoToken);
          localStorage.setItem('user', JSON.stringify(user));
          onLogin(user);
        }
      } catch (error) {
        // En caso de error, usar token demo
        const demoToken = `demo-token-${user.role.toLowerCase()}-${Date.now()}`;
        localStorage.setItem('token', demoToken);
        localStorage.setItem('user', JSON.stringify(user));
        onLogin(user);
      }
      
      switch (user.role) {
        case 'ADMIN':
          navigate('/admin');
          break;
        case 'WAITER':
          navigate('/mesero');
          break;
        case 'KITCHEN':
          navigate('/cocina');
          break;
      }
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: '#333' }}>
          Iniciar Sesión
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Usuario:
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
              placeholder="Nombre de usuario"
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Contraseña:
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div style={{
              backgroundColor: '#fee',
              color: '#c33',
              padding: '0.75rem',
              borderRadius: '4px',
              marginBottom: '1rem',
              border: '1px solid #fcc'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: loading ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: '1rem'
            }}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div style={{ 
          borderTop: '1px solid #eee', 
          paddingTop: '1rem',
          marginTop: '1rem'
        }}>
          <p style={{ 
            textAlign: 'center', 
            marginBottom: '1rem', 
            color: '#666',
            fontSize: '0.9rem'
          }}>
            Acceso rápido para demostración:
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button
              onClick={() => handleDemoLogin('admin')}
              style={{
                padding: '0.5rem',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              🔧 Acceder como Administrador
            </button>
            
            <button
              onClick={() => handleDemoLogin('waiter')}
              style={{
                padding: '0.5rem',
                backgroundColor: '#17a2b8',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              🍽️ Acceder como Camarero
            </button>
            
            <button
              onClick={() => handleDemoLogin('kitchen')}
              style={{
                padding: '0.5rem',
                backgroundColor: '#fd7e14',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              👨‍🍳 Acceder como Chef
            </button>
          </div>
        </div>

        <div style={{ 
          marginTop: '1rem', 
          textAlign: 'center',
          fontSize: '0.8rem',
          color: '#666'
        }}>
          <p>
            Para acceso de clientes (mesas), no se requiere login.<br/>
            <a 
              href="/mesa/1" 
              style={{ color: '#007bff', textDecoration: 'none' }}
            >
              Ir a Mesa de Ejemplo
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;