import './App.css'
import { Link, Route, Routes } from 'react-router-dom'
import TablePage from './pages/TablePage'
import WaiterPanel from './pages/WaiterPanel'
import KitchenPanel from './pages/KitchenPanel'
import AdminPage from './pages/AdminPage'

export default function App() {
  return (
    <div className="container">
      <header className="header">
        <h1>QR Pedido Digital</h1>
        <nav style={{ display: 'flex', gap: 12 }}>
          <Link to="/mesa/1">Mesa 1</Link>
          <Link to="/mesero">Mesero</Link>
          <Link to="/cocina">Cocina</Link>
          <Link to="/admin">Admin</Link>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/mesa/:tableId" element={<TablePage />} />
        <Route path="/mesero" element={<WaiterPanel />} />
        <Route path="/cocina" element={<KitchenPanel />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </div>
  )
}

function Home() {
  return (
    <div className="card">
      <p>Selecciona una sección o escanea un QR de mesa.</p>
      <p>Ejemplo: <Link to="/mesa/7">Mesa 7</Link></p>
    </div>
  )
}
