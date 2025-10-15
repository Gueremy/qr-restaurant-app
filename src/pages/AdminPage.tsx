import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import QRCode from 'qrcode'
import { getMenu, setMenu, getOrders } from '../store-db'
import type { MenuItem } from '../store-db'
import { DashboardTab, MenuTab, StaffTab, TablesTab, OrdersTab, PaymentsTab, ReportsTab } from '../components/AdminTabs'

type AdminTab = 'dashboard' | 'menu' | 'staff' | 'tables' | 'orders' | 'payments' | 'reports'

interface StaffMember {
  id: string
  name: string
  role: 'mesero' | 'cocinero' | 'admin'
  password: string
  active: boolean
  createdAt: Date
}

interface TableInfo {
  id: string
  number: number
  capacity: number
  status: 'libre' | 'ocupada' | 'pagando' | 'limpieza'
  qrCode?: string
  currentOrders: string[]
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard')
  const [menu, setMenuState] = useState<MenuItem[]>(getMenu())
  const [orders, setOrders] = useState(getOrders())
  
  // Estados para gestión de menú
  const [name, setName] = useState('')
  const [price, setPrice] = useState<number>(0)
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [variantsInput, setVariantsInput] = useState('')
  const [vegano, setVegano] = useState(false)
  const [sinGluten, setSinGluten] = useState(false)
  const [selected, setSelected] = useState<MenuItem | null>(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState<number>(0)
  const [editDescription, setEditDescription] = useState('')
  const [editImageUrl, setEditImageUrl] = useState('')
  const [editVegano, setEditVegano] = useState(false)
  const [editSinGluten, setEditSinGluten] = useState(false)
  const [editInStock, setEditInStock] = useState(true)
  const [editVariantsInput, setEditVariantsInput] = useState('')

  // Estados para gestión de personal
  const [staff, setStaff] = useState<StaffMember[]>([
    { id: '1', name: 'Juan Pérez', role: 'mesero', password: 'mesero123', active: true, createdAt: new Date() },
    { id: '2', name: 'María García', role: 'cocinero', password: 'cocinero123', active: true, createdAt: new Date() },
    { id: '3', name: 'Admin Principal', role: 'admin', password: 'admin123', active: true, createdAt: new Date() },
  ])
  const [newStaffName, setNewStaffName] = useState('')
  const [newStaffPassword, setNewStaffPassword] = useState('')
  const [newStaffRole, setNewStaffRole] = useState<'mesero' | 'cocinero' | 'admin'>('mesero')

  // Estados para gestión de mesas
  const [tables, setTables] = useState<TableInfo[]>([
    { id: '1', number: 1, capacity: 4, status: 'libre', currentOrders: [] },
    { id: '2', number: 2, capacity: 2, status: 'ocupada', currentOrders: [] },
    { id: '3', number: 3, capacity: 6, status: 'libre', currentOrders: [] },
    { id: '4', number: 4, capacity: 4, status: 'pagando', currentOrders: [] },
  ])
  // Estados para estadísticas

  useEffect(() => {
    setMenuState(getMenu())
    setOrders(getOrders())
  }, [])

  // Funciones para gestión de menú
  const addItem = () => {
    if (!name || price <= 0) return
    const next: MenuItem = {
      id: `${Date.now()}`,
      name,
      price,
      description: description || undefined,
      image: imageUrl || undefined,
      tags: [vegano ? 'vegano' : null, sinGluten ? 'sin_gluten' : null].filter(Boolean) as string[],
      variants: variantsInput
        .split(',')
        .map((v) => v.trim())
        .filter((v) => v.length > 0),
      inStock: true,
    }
    const updated = [...menu, next]
    setMenu(updated)
    setMenuState(updated)
    setName('')
    setPrice(0)
    setDescription('')
    setImageUrl('')
    setVariantsInput('')
    setVegano(false)
    setSinGluten(false)
  }

  const toggleStock = (id: string) => {
    const updated = menu.map((m) => (m.id === id ? { ...m, inStock: !m.inStock } : m))
    setMenu(updated)
    setMenuState(updated)
  }

  const openEdit = (m: MenuItem) => {
    setSelected(m)
    setEditName(m.name)
    setEditPrice(m.price)
    setEditDescription(m.description || '')
    setEditImageUrl(m.image || '')
    setEditVegano(!!m.tags?.includes('vegano'))
    setEditSinGluten(!!m.tags?.includes('sin_gluten'))
    setEditInStock(m.inStock)
    setEditVariantsInput((m.variants || []).join(', '))
  }

  const closeEdit = () => setSelected(null)

  const saveEdit = () => {
    if (!selected) return
    const updated = menu.map((m) =>
      m.id === selected.id
        ? {
            ...m,
            name: editName,
            price: editPrice,
            description: editDescription || undefined,
            image: editImageUrl || undefined,
            tags: [editVegano ? 'vegano' : null, editSinGluten ? 'sin_gluten' : null].filter(Boolean) as string[],
            variants: editVariantsInput
              .split(',')
              .map((v) => v.trim())
              .filter((v) => v.length > 0),
            inStock: editInStock,
          }
        : m
    )
    setMenu(updated)
    setMenuState(updated)
    setSelected(null)
  }

  const deleteItem = () => {
    if (!selected) return
    const updated = menu.filter((m) => m.id !== selected.id)
    setMenu(updated)
    setMenuState(updated)
    setSelected(null)
  }

  // Funciones para gestión de personal
  const addStaffMember = () => {
    if (!newStaffName || !newStaffPassword) return
    const newMember: StaffMember = {
      id: `${Date.now()}`,
      name: newStaffName,
      password: newStaffPassword,
      role: newStaffRole,
      active: true,
      createdAt: new Date()
    }
    setStaff([...staff, newMember])
    setNewStaffName('')
    setNewStaffPassword('')
    setNewStaffRole('mesero')
  }

  const toggleStaffStatus = (id: string) => {
    setStaff(staff.map(s => s.id === id ? { ...s, active: !s.active } : s))
  }

  const deleteStaffMember = (id: string) => {
    setStaff(staff.filter(s => s.id !== id))
  }

  // Funciones para gestión de mesas
  const generateQr = async (tableId: string) => {
    // Usar la URL de producción para los QR codes
    const baseUrl = window.location.hostname === 'localhost' 
      ? 'https://qr-restaurant-app-24lb.onrender.com' 
      : window.location.origin
    const url = `${baseUrl}/mesa/${tableId}`
    const dataUrl = await QRCode.toDataURL(url)
    setTables(tables.map(t => t.id === tableId ? { ...t, qrCode: dataUrl } : t))
  }

  const addTable = (tableData: { number: number; capacity: number; status: TableInfo['status'] }) => {
    const newTable: TableInfo = {
      id: `${Date.now()}`,
      number: tableData.number,
      capacity: tableData.capacity,
      status: tableData.status,
      currentOrders: []
    }
    setTables([...tables, newTable])
  }

  const updateTableStatus = (id: string, status: TableInfo['status']) => {
    setTables(tables.map(t => t.id === id ? { ...t, status } : t))
  }

  const deleteTable = (id: string) => {
    setTables(tables.filter(t => t.id !== id))
  }

  const editTable = (id: string, updates: Partial<TableInfo>) => {
    setTables(tables.map(t => t.id === id ? { ...t, ...updates } : t))
  }

  // Función para renderizar el contenido según la pestaña activa
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab orders={orders} staff={staff} tables={tables} />
      case 'menu':
        return <MenuTab 
          menu={menu} 
          onAddItem={addItem} 
          onToggleStock={toggleStock} 
          onEditItem={openEdit} 
          onDeleteItem={deleteItem}
          // Estados del formulario
          name={name}
          setName={setName}
          price={price}
          setPrice={setPrice}
          description={description}
          setDescription={setDescription}
          imageUrl={imageUrl}
          setImageUrl={setImageUrl}
          vegano={vegano}
          setVegano={setVegano}
          sinGluten={sinGluten}
          setSinGluten={setSinGluten}
        />
      case 'staff':
        return <StaffTab 
          staff={staff} 
          onAddStaff={addStaffMember} 
          onToggleStatus={toggleStaffStatus} 
          onDeleteStaff={deleteStaffMember} 
          newStaffName={newStaffName}
          setNewStaffName={setNewStaffName}
          newStaffPassword={newStaffPassword}
          setNewStaffPassword={setNewStaffPassword}
          newStaffRole={newStaffRole}
          setNewStaffRole={setNewStaffRole}
        />
      case 'tables':
        return <TablesTab 
          tables={tables} 
          onGenerateQR={generateQr} 
          onAddTable={addTable} 
          onUpdateStatus={updateTableStatus} 
          onDeleteTable={deleteTable} 
          onEditTable={editTable}
        />
      case 'orders':
        return <OrdersTab orders={orders} />
      case 'payments':
        return <PaymentsTab orders={orders} />
      case 'reports':
        return <ReportsTab menu={menu} />
      default:
        return <DashboardTab orders={orders} staff={staff} tables={tables} />
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f8fafc',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <header style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e2e8f0',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      }}>
        <h1 style={{ 
          margin: 0, 
          fontSize: '24px', 
          fontWeight: '600',
          color: '#1e293b'
        }}>
          Panel de Administrador
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to="/mesa/1" style={{ 
            padding: '6px 12px', 
            backgroundColor: '#f1f5f9', 
            borderRadius: '6px',
            fontSize: '14px',
            color: '#64748b',
            textDecoration: 'none'
          }}>
            Mesa 1
          </Link>
          <Link to="/mesero" style={{ 
            padding: '6px 12px', 
            backgroundColor: '#f1f5f9', 
            borderRadius: '6px',
            fontSize: '14px',
            color: '#64748b',
            textDecoration: 'none'
          }}>
            Mesero
          </Link>
          <Link to="/cocina" style={{ 
            padding: '6px 12px', 
            backgroundColor: '#f1f5f9', 
            borderRadius: '6px',
            fontSize: '14px',
            color: '#64748b',
            textDecoration: 'none'
          }}>
            Cocina
          </Link>
          <div style={{
            width: '32px',
            height: '32px',
            backgroundColor: '#3b82f6',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            🔔
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e2e8f0',
        padding: '0 24px'
      }}>
        <div style={{ display: 'flex', gap: '0' }}>
          {[
            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
            { id: 'menu', label: 'Menú', icon: '🍽️' },
            { id: 'staff', label: 'Personal', icon: '👥' },
            { id: 'tables', label: 'Mesas', icon: '🪑' },
            { id: 'orders', label: 'Pedidos', icon: '📋' },
            { id: 'payments', label: 'Pagos', icon: '💳' },
            { id: 'reports', label: 'Reportes', icon: '📈' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              style={{
                padding: '16px 20px',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: activeTab === tab.id ? '#3b82f6' : '#64748b',
                borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = '#1e293b'
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = '#64748b'
                }
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main style={{
        padding: '24px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {renderTabContent()}
      </main>

      {/* Modal de edición de menú */}
      {selected && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={`Editar ${selected.name}`} onClick={closeEdit}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Editar plato</div>
              <button className="modal-close" aria-label="Cerrar" onClick={closeEdit}>×</button>
            </div>
            <div className="modal-body">
              <div className="modal-media">
                {editImageUrl ? (
                  <img src={editImageUrl} alt={editName} />
                ) : (
                  <div className="product-image placeholder" aria-hidden="true" />
                )}
              </div>
              <div className="modal-info">
                <input placeholder="Nombre" value={editName} onChange={(e) => setEditName(e.target.value)} />
                <input type="number" placeholder="Precio" value={editPrice} onChange={(e) => setEditPrice(Number(e.target.value))} />
                <input placeholder="Imagen (URL)" value={editImageUrl} onChange={(e) => setEditImageUrl(e.target.value)} />
                <textarea placeholder="Descripción" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
                <input placeholder="Variantes (separadas por coma)" value={editVariantsInput} onChange={(e) => setEditVariantsInput(e.target.value)} />
                <label><input type="checkbox" checked={editVegano} onChange={(e) => setEditVegano(e.target.checked)} /> Vegano</label>
                <label><input type="checkbox" checked={editSinGluten} onChange={(e) => setEditSinGluten(e.target.checked)} /> Sin gluten</label>
                <label><input type="checkbox" checked={editInStock} onChange={(e) => setEditInStock(e.target.checked)} /> En stock</label>
                <div className="product-actions" style={{ marginTop: 8 }}>
                  <button onClick={deleteItem}>Eliminar</button>
                  <button className="primary" onClick={saveEdit}>Guardar cambios</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}