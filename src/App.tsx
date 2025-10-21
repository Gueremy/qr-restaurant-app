import './App.css'
import { Link, Route, Routes, Navigate } from 'react-router-dom'
import TablePage from './pages/TablePage'
import WaiterPanel from './pages/WaiterPanel'
import KitchenPanel from './pages/KitchenPanel'
import AdminPage from './pages/AdminPage'
import NotificationCenter from './components/NotificationCenter'
import LoginPage from './components/LoginPage'
import ProtectedRoute from './components/ProtectedRoute'
import UnauthorizedPage from './components/UnauthorizedPage'
import { useAuth } from './hooks/useAuth'

export default function App() {
  const { user, loading, login, logout, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <div>Cargando...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <h1>QR Pedido Digital</h1>
        <nav style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link to="/mesa/1">Mesa 1</Link>
          {isAuthenticated() && (
            <>
              {user?.role === 'WAITER' && <Link to="/mesero">Panel Mesero</Link>}
              {user?.role === 'KITCHEN' && <Link to="/cocina">Panel Cocina</Link>}
              {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && <Link to="/admin">Panel Admin</Link>}
            </>
          )}
          {!isAuthenticated() ? (
            <Link to="/login">Iniciar Sesión</Link>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: '0.9rem', color: '#666' }}>
                {user?.name} ({user?.role})
              </span>
              <button 
                onClick={logout}
                style={{
                  padding: '4px 8px',
                  fontSize: '0.8rem',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Salir
              </button>
            </div>
          )}
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage onLogin={login} />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/mesa/:tableId" element={<TablePage />} />
        <Route 
          path="/mesero" 
          element={
            <ProtectedRoute allowedRoles={['WAITER']} currentUser={user}>
              <WaiterPanel />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/cocina" 
          element={
            <ProtectedRoute allowedRoles={['KITCHEN']} currentUser={user}>
              <KitchenPanel />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']} currentUser={user}>
              <AdminPage />
            </ProtectedRoute>
          } 
        />
      </Routes>
      <NotificationCenter />
    </div>
  )
}

function Home() {
  return (
    <div className="card">
      <p>Bienvenido al sistema de restaurante QR.</p>
      <p>Para acceder al menú de una mesa, escanea el código QR correspondiente.</p>
      <p>Ejemplo: <Link to="/mesa/7">Mesa 7</Link></p>
    </div>
  )
}
