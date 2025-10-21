import { useState } from 'react'
import React from 'react'
import type { MenuItem, Order, OrderItem } from '../store-db'

interface StaffMember {
  id: string
  name: string
  role: 'ADMIN' | 'MANAGER' | 'WAITER' | 'KITCHEN'
  password: string
  active: boolean
  createdAt: Date
}

interface TableInfo {
  id: string
  number: number
  capacity: number
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'OUT_OF_SERVICE'
  qrCode?: string
  currentOrders: string[]
}

// Dashboard Tab
export function DashboardTab({ 
  orders, 
  tables, 
  staff
}: { 
  orders: Order[], 
  tables: TableInfo[], 
  staff: StaffMember[]
}) {
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0)
  const busyTables = tables.filter(t => t.status === 'OCCUPIED').length
  const activeStaff = staff.filter(s => s.active).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Stats Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '20px' 
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          border: '1px solid #f1f5f9'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ 
                margin: '0 0 4px 0', 
                fontSize: '14px', 
                color: '#64748b',
                fontWeight: '500'
              }}>
                Ingresos Totales
              </p>
              <p style={{ 
                margin: 0, 
                fontSize: '28px', 
                fontWeight: '700',
                color: '#0f172a'
              }}>
                ${totalRevenue.toLocaleString()}
              </p>
            </div>
            <div style={{
              width: '48px',
              height: '48px',
              backgroundColor: '#dbeafe',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px'
            }}>
              💰
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          border: '1px solid #f1f5f9'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ 
                margin: '0 0 4px 0', 
                fontSize: '14px', 
                color: '#64748b',
                fontWeight: '500'
              }}>
                Pedidos Hoy
              </p>
              <p style={{ 
                margin: 0, 
                fontSize: '28px', 
                fontWeight: '700',
                color: '#0f172a'
              }}>
                {orders.length}
              </p>
            </div>
            <div style={{
              width: '48px',
              height: '48px',
              backgroundColor: '#dcfce7',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px'
            }}>
              📋
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          border: '1px solid #f1f5f9'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ 
                margin: '0 0 4px 0', 
                fontSize: '14px', 
                color: '#64748b',
                fontWeight: '500'
              }}>
                Mesas Ocupadas
              </p>
              <p style={{ 
                margin: 0, 
                fontSize: '28px', 
                fontWeight: '700',
                color: '#0f172a'
              }}>
                {busyTables}/{tables.length}
              </p>
            </div>
            <div style={{
              width: '48px',
              height: '48px',
              backgroundColor: '#fef3c7',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px'
            }}>
              🪑
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          border: '1px solid #f1f5f9'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ 
                margin: '0 0 4px 0', 
                fontSize: '14px', 
                color: '#64748b',
                fontWeight: '500'
              }}>
                Personal Activo
              </p>
              <p style={{ 
                margin: 0, 
                fontSize: '28px', 
                fontWeight: '700',
                color: '#0f172a'
              }}>
                {activeStaff}
              </p>
            </div>
            <div style={{
              width: '48px',
              height: '48px',
              backgroundColor: '#e0e7ff',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px'
            }}>
              👥
            </div>
          </div>
        </div>
      </div>

      {/* Active Staff Details */}
      <div style={{
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        border: '1px solid #f1f5f9'
      }}>
        <h3 style={{ 
          margin: '0 0 20px 0', 
          fontSize: '18px', 
          fontWeight: '600',
          color: '#0f172a'
        }}>
          Personal Activo ({activeStaff})
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {staff.filter(s => s.active).length === 0 ? (
            <p style={{ 
              margin: 0, 
              fontSize: '14px', 
              color: '#64748b',
              fontStyle: 'italic'
            }}>
              No hay personal activo en este momento
            </p>
          ) : (
            staff.filter(s => s.active).map((member) => (
              <div key={member.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}>
                <div>
                  <p style={{ 
                    margin: '0 0 4px 0', 
                    fontSize: '14px', 
                    fontWeight: '500', 
                    color: '#0f172a' 
                  }}>
                    {member.name}
                  </p>
                  <p style={{ 
                    margin: 0, 
                    fontSize: '12px', 
                    color: '#64748b' 
                  }}>
                    {member.role === 'ADMIN' ? 'Administrador' : 
                    member.role === 'MANAGER' ? 'Gerente' : 
                    member.role === 'KITCHEN' ? 'Chef' : 'Camarero'} • Activo desde {new Date(member.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#22c55e',
                  borderRadius: '50%'
                }}>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        border: '1px solid #f1f5f9'
      }}>
        <h3 style={{ 
          margin: '0 0 20px 0', 
          fontSize: '18px', 
          fontWeight: '600',
          color: '#0f172a'
        }}>
          Actividad Reciente
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {orders.slice(0, 5).map((order, index) => (
            <div key={index} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 0',
              borderBottom: index < 4 ? '1px solid #f1f5f9' : 'none'
            }}>
              <div>
                <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '500', color: '#0f172a' }}>
                  Mesa {order.tableId} - Pedido #{order.id}
                </p>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                  {new Date(order.timestamp).toLocaleTimeString()}
                </p>
              </div>
              <div style={{
                padding: '4px 8px',
                backgroundColor: order.status === 'entregado' ? '#dcfce7' : '#fef3c7',
              color: order.status === 'entregado' ? '#166534' : '#92400e',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500'
              }}>
                ${order.total}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Cash Register Closing Tab
export function CashRegisterTab({ orders }: { orders: Order[] }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [isClosing, setIsClosing] = useState(false)
  const [cashRegisterClosed, setCashRegisterClosed] = useState(false)

  // Filtrar pedidos del día seleccionado
  const selectedDateOrders = orders.filter(order => {
    const orderDate = new Date(order.timestamp).toISOString().split('T')[0]
    return orderDate === selectedDate && order.paymentStatus === 'pagado'
  })

  // Calcular estadísticas del día
  const dailyStats = {
    totalOrders: selectedDateOrders.length,
    totalRevenue: selectedDateOrders.reduce((sum, order) => sum + order.total, 0),
    averageOrderValue: selectedDateOrders.length > 0 
      ? selectedDateOrders.reduce((sum, order) => sum + order.total, 0) / selectedDateOrders.length 
      : 0,
    cashOrders: selectedDateOrders.filter(order => order.paymentStatus === 'pagado').length,
    pendingOrders: orders.filter(order => {
      const orderDate = new Date(order.timestamp).toISOString().split('T')[0]
      return orderDate === selectedDate && order.paymentStatus === 'pendiente'
    }).length
  }

  // Agrupar pedidos por hora
  const hourlyBreakdown = selectedDateOrders.reduce((acc, order) => {
    const hour = new Date(order.timestamp).getHours()
    const hourKey = `${hour}:00 - ${hour + 1}:00`
    
    if (!acc[hourKey]) {
      acc[hourKey] = { orders: 0, revenue: 0 }
    }
    
    acc[hourKey].orders += 1
    acc[hourKey].revenue += order.total
    
    return acc
  }, {} as Record<string, { orders: number, revenue: number }>)

  const handleCloseCashRegister = () => {
    setIsClosing(true)
    
    // Simular proceso de cierre
    setTimeout(() => {
      setCashRegisterClosed(true)
      setIsClosing(false)
      alert(`Caja cerrada exitosamente!\n\nResumen del día ${selectedDate}:\n- Total de pedidos: ${dailyStats.totalOrders}\n- Ingresos totales: $${dailyStats.totalRevenue.toLocaleString()}\n- Promedio por pedido: $${dailyStats.averageOrderValue.toFixed(2)}`)
    }, 2000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        border: '1px solid #f1f5f9'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ 
            margin: 0, 
            fontSize: '24px', 
            fontWeight: '600',
            color: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            💰 Panel de Cierre de Caja
          </h2>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ fontSize: '14px', color: '#64748b' }}>
              Fecha:
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>
        </div>

        {cashRegisterClosed && (
          <div style={{
            backgroundColor: '#dcfce7',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534' }}>
              <span>✅</span>
              <strong>Caja cerrada exitosamente para el día {selectedDate}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Daily Summary Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '16px' 
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          border: '1px solid #f1f5f9'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '20px' }}>📋</span>
            <h3 style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>Total Pedidos</h3>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a' }}>
            {dailyStats.totalOrders}
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          border: '1px solid #f1f5f9'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '20px' }}>💵</span>
            <h3 style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>Ingresos Totales</h3>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#059669' }}>
            ${dailyStats.totalRevenue.toLocaleString()}
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          border: '1px solid #f1f5f9'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '20px' }}>📊</span>
            <h3 style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>Promedio por Pedido</h3>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a' }}>
            ${dailyStats.averageOrderValue.toFixed(2)}
          </div>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          border: '1px solid #f1f5f9'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '20px' }}>⏳</span>
            <h3 style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>Pedidos Pendientes</h3>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#dc2626' }}>
            {dailyStats.pendingOrders}
          </div>
        </div>
      </div>

      {/* Hourly Breakdown */}
      <div style={{
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        border: '1px solid #f1f5f9'
      }}>
        <h3 style={{ 
          margin: '0 0 20px 0', 
          fontSize: '18px', 
          fontWeight: '600',
          color: '#0f172a',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          ⏰ Desglose por Horas
        </h3>

        {Object.keys(hourlyBreakdown).length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  <th style={{ 
                    padding: '12px', 
                    textAlign: 'left', 
                    fontSize: '12px', 
                    fontWeight: '600',
                    color: '#64748b',
                    borderBottom: '1px solid #e2e8f0'
                  }}>
                    HORARIO
                  </th>
                  <th style={{ 
                    padding: '12px', 
                    textAlign: 'center', 
                    fontSize: '12px', 
                    fontWeight: '600',
                    color: '#64748b',
                    borderBottom: '1px solid #e2e8f0'
                  }}>
                    PEDIDOS
                  </th>
                  <th style={{ 
                    padding: '12px', 
                    textAlign: 'right', 
                    fontSize: '12px', 
                    fontWeight: '600',
                    color: '#64748b',
                    borderBottom: '1px solid #e2e8f0'
                  }}>
                    INGRESOS
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(hourlyBreakdown)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([hour, data]) => (
                  <tr key={hour}>
                    <td style={{ 
                      padding: '12px', 
                      fontSize: '14px',
                      color: '#0f172a',
                      borderBottom: '1px solid #f1f5f9'
                    }}>
                      {hour}
                    </td>
                    <td style={{ 
                      padding: '12px', 
                      textAlign: 'center',
                      fontSize: '14px',
                      color: '#0f172a',
                      borderBottom: '1px solid #f1f5f9'
                    }}>
                      {data.orders}
                    </td>
                    <td style={{ 
                      padding: '12px', 
                      textAlign: 'right',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#059669',
                      borderBottom: '1px solid #f1f5f9'
                    }}>
                      ${data.revenue.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px', 
            color: '#64748b',
            fontSize: '16px'
          }}>
            No hay pedidos registrados para la fecha seleccionada
          </div>
        )}
      </div>

      {/* Orders Detail */}
      <div style={{
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        border: '1px solid #f1f5f9'
      }}>
        <h3 style={{ 
          margin: '0 0 20px 0', 
          fontSize: '18px', 
          fontWeight: '600',
          color: '#0f172a',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          📋 Detalle de Pedidos ({selectedDateOrders.length})
        </h3>

        {selectedDateOrders.length > 0 ? (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '16px',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            {selectedDateOrders.map((order) => (
              <div key={order.id} style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '16px',
                backgroundColor: '#f9fafb'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <strong style={{ fontSize: '14px', color: '#374151' }}>
                    Mesa {order.tableId}
                  </strong>
                  <span style={{
                    backgroundColor: '#dcfce7',
                    color: '#166534',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    {order.status}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                  {new Date(order.timestamp).toLocaleTimeString()}
                </div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#059669' }}>
                  ${order.total.toLocaleString()}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  {order.items?.length || 0} items
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px', 
            color: '#64748b',
            fontSize: '16px'
          }}>
            No hay pedidos pagados para la fecha seleccionada
          </div>
        )}
      </div>

      {/* Close Cash Register Button */}
      {!cashRegisterClosed && dailyStats.totalOrders > 0 && (
        <div style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          border: '1px solid #f1f5f9',
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#0f172a' }}>
              ¿Listo para cerrar la caja?
            </h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
              Esta acción generará el reporte final del día y cerrará la caja.
            </p>
          </div>
          
          <button
            onClick={handleCloseCashRegister}
            disabled={isClosing}
            style={{
              backgroundColor: isClosing ? '#9ca3af' : '#dc2626',
              color: 'white',
              border: 'none',
              padding: '12px 32px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isClosing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              margin: '0 auto'
            }}
          >
            {isClosing ? (
              <>
                <span>⏳</span>
                Cerrando caja...
              </>
            ) : (
              <>
                <span>🔒</span>
                Cerrar Caja del Día
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

// Menu Tab
export function MenuTab({ 
  menu, 
  onAddItem,
  onToggleStock,
  onEditItem,
  onDeleteItem,
  // Estados del formulario
  name,
  setName,
  price,
  setPrice,
  description,
  setDescription,
  image,
  setImage,
  categories,
  selectedCategoryId,
  setSelectedCategoryId,
  editingProduct,
  setEditingProduct
}: { 
  menu: MenuItem[], 
  onAddItem: () => void,
  onToggleStock: (id: string, currentStock: boolean) => void,
  onEditItem: (item: MenuItem) => void,
  onDeleteItem: (id: string) => void,
  // Props del formulario
  name: string,
  setName: (name: string) => void,
  price: number,
  setPrice: (price: number) => void,
  description: string,
  setDescription: (description: string) => void,
  image: string,
  setImage: (url: string) => void,
  categories: any[],
  selectedCategoryId: string,
  setSelectedCategoryId: (id: string) => void,
  editingProduct: any | null,
  setEditingProduct: (product: any | null) => void
}) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [imageOption, setImageOption] = useState<'url' | 'upload' | 'none'>('none')
  const [imageFile, setImageFile] = useState<File | null>(null)

  const handleAddItem = () => {
    if (!name || price <= 0 || !selectedCategoryId) {
      alert('Por favor completa todos los campos requeridos (nombre, precio y categoría)')
      return
    }
    onAddItem()
    setShowAddForm(false)
    // Los estados se limpian desde AdminPage.tsx
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      // Crear URL temporal para preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }
  return (
    <div>
      <section className="card">
        <h3>🍽️ Gestión de Menú</h3>
        <button onClick={() => {
          setShowAddForm(!showAddForm);
          if (editingProduct) {
            setEditingProduct(null);
          }
        }} className="primary">
          {showAddForm ? 'Cancelar' : editingProduct ? 'Cancelar Edición' : 'Agregar nuevo plato'}
        </button>
        
        {(showAddForm || editingProduct) && (
          <div style={{ 
            marginTop: 16, 
            padding: 20, 
            border: '1px solid #e0e0e0', 
            borderRadius: 12,
            backgroundColor: '#fafafa'
          }}>
            <h4 style={{ margin: '0 0 16px 0', color: '#333' }}>
              {editingProduct ? '✏️ Editar plato' : '✨ Agregar nuevo plato'}
            </h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold', color: '#555' }}>
                  📝 Nombre del plato *
                </label>
                <input 
                  placeholder="Ej: Hamburguesa Clásica" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '10px 12px', 
                    border: '2px solid #ddd', 
                    borderRadius: 8,
                    fontSize: 14
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold', color: '#555' }}>
                  💰 Precio *
                </label>
                <input 
                  type="number" 
                  placeholder="0" 
                  value={price || ''} 
                  onChange={(e) => setPrice(Number(e.target.value))}
                  style={{ 
                    width: '100%', 
                    padding: '10px 12px', 
                    border: '2px solid #ddd', 
                    borderRadius: 8,
                    fontSize: 14
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold', color: '#555' }}>
                  🏷️ Categoría *
                </label>
                <select 
                  value={selectedCategoryId} 
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  style={{ 
                    width: '100%', 
                    padding: '10px 12px', 
                    border: '2px solid #ddd', 
                    borderRadius: 8,
                    fontSize: 14,
                    backgroundColor: 'white'
                  }}
                >
                  <option value="">Seleccionar categoría...</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold', color: '#555' }}>
                  📄 Descripción
                </label>
                <textarea 
                  placeholder="Describe los ingredientes y características del plato..." 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  style={{ 
                    width: '100%', 
                    padding: '10px 12px', 
                    border: '2px solid #ddd', 
                    borderRadius: 8,
                    fontSize: 14,
                    resize: 'vertical'
                  }}
                />
              </div>
              
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: 6, fontWeight: 'bold', color: '#555' }}>
                  🖼️ Imagen del plato
                </label>
                <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                  <button 
                    type="button"
                    onClick={() => setImageOption('none')}
                    style={{ 
                      padding: '8px 16px', 
                      border: imageOption === 'none' ? '2px solid #007bff' : '1px solid #ddd',
                      borderRadius: 6,
                      backgroundColor: imageOption === 'none' ? '#007bff' : '#f8f9fa',
                      color: imageOption === 'none' ? 'white' : '#333',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Sin imagen
                  </button>
                  <button 
                    type="button"
                    onClick={() => setImageOption('url')}
                    style={{ 
                      padding: '8px 16px', 
                      border: imageOption === 'url' ? '2px solid #007bff' : '1px solid #ddd',
                      borderRadius: 6,
                      backgroundColor: imageOption === 'url' ? '#007bff' : '#f8f9fa',
                      color: imageOption === 'url' ? 'white' : '#333',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    URL de imagen
                  </button>
                  <button 
                    type="button"
                    onClick={() => setImageOption('upload')}
                    style={{ 
                      padding: '8px 16px', 
                      border: imageOption === 'upload' ? '2px solid #007bff' : '1px solid #ddd',
                      borderRadius: 6,
                      backgroundColor: imageOption === 'upload' ? '#007bff' : '#f8f9fa',
                      color: imageOption === 'upload' ? 'white' : '#333',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Subir archivo
                  </button>
                </div>
                
                {imageOption === 'url' && (
                  <input 
                    placeholder="https://ejemplo.com/imagen.jpg" 
                    value={image} 
                    onChange={(e) => setImage(e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: '10px 12px', 
                      border: '2px solid #ddd', 
                      borderRadius: 8,
                      fontSize: 14
                    }}
                  />
                )}
                
                {imageOption === 'upload' && (
                  <div>
                    <input 
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      style={{ 
                        width: '100%', 
                        padding: '10px 12px', 
                        border: '2px solid #ddd', 
                        borderRadius: 8,
                        fontSize: 14
                      }}
                    />
                    {imageFile && (
                      <p style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
                        Archivo seleccionado: {imageFile.name}
                      </p>
                    )}
                  </div>
                )}
                
                {image && (
                  <div style={{ marginTop: 12 }}>
                    <p style={{ marginBottom: 8, color: '#666', fontSize: 12 }}>Vista previa:</p>
                    <img 
                      src={image} 
                      alt="Vista previa" 
                      style={{ 
                        maxWidth: 200, 
                        maxHeight: 150, 
                        borderRadius: 8,
                        border: '1px solid #ddd'
                      }}
                      onError={() => setImage('')}
                    />
                  </div>
                )}
              </div>
            </div>
            
            <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
              <button 
                onClick={handleAddItem} 
                className="primary" 
                style={{ 
                  padding: '12px 24px',
                  fontSize: 16,
                  fontWeight: 'bold'
                }}
              >
                {editingProduct ? '✏️ Actualizar plato' : '✅ Agregar plato'}
              </button>
              <button 
                onClick={() => {
                  setShowAddForm(false);
                  setEditingProduct(null);
                }} 
                style={{ 
                  padding: '12px 24px',
                  fontSize: 16,
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer'
                }}
              >
                ❌ Cancelar
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <span style={{ fontSize: '20px' }}>📋</span>
          <h3 style={{ margin: 0 }}>Menú actual ({menu.length} platos)</h3>
        </div>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', 
          gap: 16 
        }}>
          {menu.map((m) => (
            <div 
              key={m.id} 
              style={{
                backgroundColor: '#f8f9fa',
                border: '1px solid #e9ecef',
                borderRadius: 12,
                padding: 16,
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#333' }}>
                  {m.name}
                </h4>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#333' }}>
                  ${m.price}
                </div>
              </div>

              {/* Status Badge */}
              <div style={{ marginBottom: 12 }}>
                {!m.active && (
                  <span style={{
                    backgroundColor: '#dc3545',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    ¡AGOTADO!
                  </span>
                )}
              </div>

              {/* Tags */}
              {m.tags && m.tags.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  {m.tags.map((tag) => (
                    <span 
                      key={tag}
                      style={{
                        backgroundColor: tag === 'vegano' ? '#28a745' : '#17a2b8',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: '11px',
                        marginRight: 4,
                        textTransform: 'capitalize'
                      }}
                    >
                      {tag === 'vegano' ? 'Vegano' : 'Sin Gluten'}
                    </span>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button 
                  onClick={() => onToggleStock(m.id, m.active)}
                  style={{
                    backgroundColor: m.active ? '#28a745' : '#ffc107',
                  color: m.active ? 'white' : '#212529',
                    border: 'none',
                    padding: '4px 8px',
                    borderRadius: 4,
                    fontSize: '11px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  {m.active ? '✓ Marcar agotado' : 'Volvio stock'}
                </button>
                
                <button 
                  onClick={() => onEditItem(m)}
                  style={{
                    backgroundColor: '#ffc107',
                    color: '#212529',
                    border: 'none',
                    padding: '4px 8px',
                    borderRadius: 4,
                    fontSize: '11px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  📝 Editar
                </button>
                
                <button 
                  onClick={() => onDeleteItem(m.id)}
                  style={{
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    padding: '4px 8px',
                    borderRadius: 4,
                    fontSize: '11px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  🗑️ Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

// Staff Tab
export function StaffTab({ 
  staff,
  onAddStaff,
  onToggleStatus,
  onDeleteStaff,
  newStaffName,
  setNewStaffName,
  newStaffPassword,
  setNewStaffPassword,
  newStaffRole,
  setNewStaffRole
}: { 
  staff: StaffMember[],
  onAddStaff: () => void,
  onToggleStatus: (id: string) => void,
  onDeleteStaff: (id: string) => void,
  newStaffName: string,
  setNewStaffName: (name: string) => void,
  newStaffPassword: string,
  setNewStaffPassword: (password: string) => void,
  newStaffRole: 'ADMIN' | 'MANAGER' | 'WAITER' | 'KITCHEN',
  setNewStaffRole: (role: 'ADMIN' | 'MANAGER' | 'WAITER' | 'KITCHEN') => void
}) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{name?: string, password?: string}>({})

  const validateForm = () => {
    const errors: {name?: string, password?: string} = {}
    
    // Validar nombre (mínimo 8 caracteres)
    if (!newStaffName.trim()) {
      errors.name = 'El nombre es requerido'
    } else if (newStaffName.trim().length < 8) {
      errors.name = 'El nombre debe tener al menos 8 caracteres'
    }
    
    // Validar contraseña (mínimo 8 caracteres)
    if (!newStaffPassword.trim()) {
      errors.password = 'La contraseña es requerida'
    } else if (newStaffPassword.trim().length < 8) {
      errors.password = 'La contraseña debe tener al menos 8 caracteres'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleAddStaff = () => {
    if (!validateForm()) return
    onAddStaff()
    setShowAddForm(false)
    setValidationErrors({})
  }

  return (
    <div>
      <section className="card">
        <h3>👥 Gestión de Personal</h3>
        <button onClick={() => setShowAddForm(!showAddForm)} className="primary">
          {showAddForm ? 'Cancelar' : 'Agregar nuevo miembro'}
        </button>
        
        {showAddForm && (
          <div style={{ 
            marginTop: 20, 
            padding: 24, 
            border: '1px solid #e2e8f0', 
            borderRadius: 12,
            backgroundColor: '#f8fafc'
          }}>
            <h4 style={{ marginBottom: 16, color: '#1e293b' }}>Nuevo miembro del personal</h4>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
              gap: 16 
            }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: 6, 
                  fontSize: '14px', 
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  Nombre completo *
                </label>
                <input 
                   placeholder="Ingrese el nombre completo (mínimo 8 caracteres)" 
                   value={newStaffName} 
                   onChange={(e) => {
                     setNewStaffName(e.target.value)
                     if (validationErrors.name) {
                       setValidationErrors(prev => ({...prev, name: undefined}))
                     }
                   }}
                   style={{
                     width: '100%',
                     padding: '12px 16px',
                     border: `1px solid ${validationErrors.name ? '#dc2626' : '#d1d5db'}`,
                     borderRadius: '8px',
                     fontSize: '14px',
                     backgroundColor: 'white'
                   }}
                 />
                 {validationErrors.name && (
                   <div style={{ 
                     color: '#dc2626', 
                     fontSize: '12px', 
                     marginTop: '4px',
                     fontWeight: '500'
                   }}>
                     {validationErrors.name}
                   </div>
                 )}
               </div>
               <div>
                 <label style={{ 
                   display: 'block', 
                   marginBottom: 6, 
                   fontSize: '14px', 
                   fontWeight: '500',
                   color: '#374151'
                 }}>
                   Contraseña *
                 </label>
                 <input 
                   placeholder="Contraseña para el sistema (mínimo 8 caracteres)" 
                   type="password" 
                   value={newStaffPassword} 
                   onChange={(e) => {
                     setNewStaffPassword(e.target.value)
                     if (validationErrors.password) {
                       setValidationErrors(prev => ({...prev, password: undefined}))
                     }
                   }}
                   style={{
                     width: '100%',
                     padding: '12px 16px',
                     border: `1px solid ${validationErrors.password ? '#dc2626' : '#d1d5db'}`,
                     borderRadius: '8px',
                     fontSize: '14px',
                     backgroundColor: 'white'
                   }}
                 />
                 {validationErrors.password && (
                   <div style={{ 
                     color: '#dc2626', 
                     fontSize: '12px', 
                     marginTop: '4px',
                     fontWeight: '500'
                   }}>
                     {validationErrors.password}
                   </div>
                 )}
               </div>
               <div>
                 <label style={{ 
                   display: 'block', 
                   marginBottom: 6, 
                   fontSize: '14px', 
                   fontWeight: '500',
                   color: '#374151'
                 }}>
                   Cargo
                 </label>
                 <select 
                   value={newStaffRole} 
                   onChange={(e) => setNewStaffRole(e.target.value as any)}
                   style={{
                     width: '100%',
                     padding: '12px 16px',
                     border: '1px solid #d1d5db',
                     borderRadius: '8px',
                     fontSize: '14px',
                     backgroundColor: 'white'
                   }}
                 >
                  <option value="WAITER">Camarero</option>
                <option value="KITCHEN">Chef</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
            </div>
            <button 
              onClick={handleAddStaff} 
              className="primary" 
              style={{ 
                marginTop: 16,
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Agregar miembro
            </button>
          </div>
        )}
      </section>

      <section className="card">
        <h3>📋 Personal actual ({staff.length} miembros)</h3>
        <div style={{ display: 'grid', gap: 16 }}>
          {staff.map((member) => (
            <div key={member.id} className="staff-card" style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: 20,
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              backgroundColor: member.active ? 'white' : '#f1f5f9',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <div>
                <div style={{ 
                  fontWeight: '600', 
                  fontSize: '16px',
                  color: '#1e293b',
                  marginBottom: 4
                }}>
                  {member.name}
                </div>
                <div style={{ 
                  color: '#64748b', 
                  fontSize: '14px',
                  marginBottom: 2
                }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    backgroundColor: member.role === 'ADMIN' ? '#dbeafe' : member.role === 'KITCHEN' ? '#fef3c7' : member.role === 'MANAGER' ? '#f3e8ff' : '#dcfce7',
                    color: member.role === 'ADMIN' ? '#1e40af' : member.role === 'KITCHEN' ? '#92400e' : member.role === 'MANAGER' ? '#7c3aed' : '#166534',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '500',
                    textTransform: 'capitalize'
                  }}>
                    {member.role === 'ADMIN' ? 'Administrador' : 
                member.role === 'MANAGER' ? 'Gerente' : 
                member.role === 'KITCHEN' ? 'Chef' : 'Camarero'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Creado: {new Date(member.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button 
                  onClick={() => onToggleStatus(member.id)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    backgroundColor: member.active ? '#fef2f2' : '#f0fdf4',
                    color: member.active ? '#dc2626' : '#16a34a'
                  }}
                >
                  {member.active ? '⏸️ Desactivar' : '▶️ Activar'}
                </button>
                <button 
                  onClick={() => onDeleteStaff(member.id)} 
                  style={{ 
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    backgroundColor: '#dc2626', 
                    color: 'white' 
                  }}
                >
                  🗑️ Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

// Tables Tab
export function TablesTab({ 
  tables,
  onGenerateQR,
  onAddTable,
  onUpdateStatus,
  onDeleteTable,
  onEditTable
}: { 
  tables: TableInfo[],
  onGenerateQR: (tableId: string) => void,
  onAddTable: (table: Omit<TableInfo, 'id' | 'qrCode' | 'currentOrders'>) => void,
  onUpdateStatus: (tableId: string, status: TableInfo['status']) => void,
  onDeleteTable: (tableId: string) => void,
  onEditTable: (tableId: string, updates: Partial<TableInfo>) => void
}) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingTable, setEditingTable] = useState<string | null>(null)
  
  // Calcular el próximo número de mesa disponible
  const getNextAvailableNumber = () => {
    if (!tables || tables.length === 0) return 1
    const existingNumbers = tables.map(table => table.number).sort((a, b) => a - b)
    for (let i = 1; i <= existingNumbers.length + 1; i++) {
      if (!existingNumbers.includes(i)) {
        return i
      }
    }
    return existingNumbers.length + 1
  }
  
  const [newTable, setNewTable] = useState(() => ({
    number: getNextAvailableNumber(),
    capacity: 4,
    status: 'AVAILABLE' as TableInfo['status']
  }))
  const [editTable, setEditTable] = useState({ number: 0, capacity: 4 })

  // Actualizar el número sugerido cuando cambie la lista de mesas
  React.useEffect(() => {
    if (!showAddForm) {
      setNewTable(prev => ({
        ...prev,
        number: getNextAvailableNumber()
      }))
    }
  }, [tables, showAddForm])

  const handleAddTable = () => {
    // Validar que el número de mesa sea válido
    if (newTable.number <= 0) {
      alert('Por favor, ingrese un número de mesa válido (mayor a 0)')
      return
    }
    
    // Validar que la capacidad sea válida
    if (newTable.capacity <= 0) {
      alert('Por favor, ingrese una capacidad válida (mayor a 0)')
      return
    }
    
    // Verificar si el número de mesa ya existe
    const existingTable = tables.find(table => table.number === newTable.number)
    if (existingTable) {
      alert(`Ya existe una mesa con el número ${newTable.number}. Por favor, elija un número diferente.`)
      return
    }
    
    onAddTable(newTable)
    setShowAddForm(false)
    setNewTable({ number: getNextAvailableNumber(), capacity: 4, status: 'AVAILABLE' })
  }

  const handleEditTable = (tableId: string) => {
    const table = tables.find(t => t.id === tableId)
    if (table) {
      setEditTable({ number: table.number, capacity: table.capacity })
      setEditingTable(tableId)
    }
  }

  const handleSaveEdit = () => {
    if (editingTable) {
      onEditTable(editingTable, editTable)
      setEditingTable(null)
    }
  }

  const handleCancelEdit = () => {
    setEditingTable(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Add Table Section */}
      <div style={{
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        border: '1px solid #f1f5f9'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showAddForm ? '20px' : '0' }}>
          <h3 style={{ 
            margin: 0, 
            fontSize: '18px', 
            fontWeight: '600',
            color: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            🪑 Gestión de Mesas
          </h3>
          <button 
            onClick={() => setShowAddForm(!showAddForm)} 
            style={{
              backgroundColor: showAddForm ? '#64748b' : '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            {showAddForm ? 'Cancelar' : 'Agregar nueva mesa'}
          </button>
        </div>
        
        {showAddForm && (
          <div style={{ 
            padding: '20px', 
            backgroundColor: '#f8fafc', 
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '16px', alignItems: 'end' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '6px', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: '#374151' 
                }}>
                  Número de mesa
                </label>
                <small style={{ 
                  display: 'block', 
                  marginBottom: '6px', 
                  fontSize: '12px', 
                  color: '#6b7280' 
                }}>
                  Mesas existentes: {tables.map(t => t.number).sort((a, b) => a - b).join(', ')}
                </small>
                <input 
                  type="number" 
                  placeholder="Ej: 5" 
                  value={newTable.number} 
                  onChange={(e) => setNewTable({...newTable, number: Number(e.target.value)})} 
                  style={{ 
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '6px', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: '#374151' 
                }}>
                  Capacidad (personas)
                </label>
                <input 
                  type="number" 
                  placeholder="Ej: 4" 
                  value={newTable.capacity} 
                  onChange={(e) => setNewTable({...newTable, capacity: Number(e.target.value)})} 
                  style={{ 
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <button 
                onClick={handleAddTable} 
                style={{
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  height: 'fit-content'
                }}
              >
                Agregar mesa
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tables List */}
      <div style={{
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        border: '1px solid #f1f5f9'
      }}>
        <h3 style={{ 
          margin: '0 0 20px 0', 
          fontSize: '18px', 
          fontWeight: '600',
          color: '#0f172a',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          📋 Mesas del restaurante ({tables.length} mesas)
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
          {tables.map((table) => (
            <div key={table.id} style={{ 
              padding: '20px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              backgroundColor: '#fafafa'
            }}>
              {editingTable === table.id ? (
                // Edit Mode
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>
                      Editando Mesa
                    </h4>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={handleSaveEdit}
                        style={{
                          backgroundColor: '#10b981',
                          color: 'white',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        ✓ Guardar
                      </button>
                      <button 
                        onClick={handleCancelEdit}
                        style={{
                          backgroundColor: '#64748b',
                          color: 'white',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        ✕ Cancelar
                      </button>
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '4px', 
                        fontSize: '12px', 
                        fontWeight: '500', 
                        color: '#374151' 
                      }}>
                        Número de mesa
                      </label>
                      <input 
                        type="number" 
                        value={editTable.number} 
                        onChange={(e) => setEditTable({...editTable, number: Number(e.target.value)})} 
                        style={{ 
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '4px', 
                        fontSize: '12px', 
                        fontWeight: '500', 
                        color: '#374151' 
                      }}>
                        Capacidad (personas)
                      </label>
                      <input 
                        type="number" 
                        value={editTable.capacity} 
                        onChange={(e) => setEditTable({...editTable, capacity: Number(e.target.value)})} 
                        style={{ 
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                // View Mode
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>
                      Mesa {table.number}
                    </h4>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500',
                      backgroundColor: table.status === 'AVAILABLE' ? '#dcfce7' :
            table.status === 'OCCUPIED' ? '#fee2e2' :
            table.status === 'RESERVED' ? '#fef3c7' : '#f3f4f6',
          color: table.status === 'AVAILABLE' ? '#166534' :
            table.status === 'OCCUPIED' ? '#991b1b' :
            table.status === 'RESERVED' ? '#92400e' : '#374151'
                    }}>
                      {table.status}
                    </span>
                  </div>
                  
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>
                      👥 Capacidad: <strong>{table.capacity} personas</strong>
                    </div>
                    <div style={{ fontSize: '14px', color: '#64748b' }}>
                      📋 Pedidos activos: {table.currentOrders?.length || 0}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    <button 
                      onClick={() => onUpdateStatus(table.id, 'AVAILABLE')}
                      style={{
                        backgroundColor: table.status === 'AVAILABLE' ? '#10b981' : '#f1f5f9',
                        color: table.status === 'AVAILABLE' ? 'white' : '#64748b',
                        border: 'none',
                        padding: '6px 10px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      🟢 Libre
                    </button>
                    <button 
                      onClick={() => onUpdateStatus(table.id, 'OCCUPIED')}
                      style={{
                        backgroundColor: table.status === 'OCCUPIED' ? '#ef4444' : '#f1f5f9',
                        color: table.status === 'OCCUPIED' ? 'white' : '#64748b',
                        border: 'none',
                        padding: '6px 10px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      🔴 Ocupada
                    </button>
                    <button 
                      onClick={() => onUpdateStatus(table.id, 'RESERVED')}
                      style={{
                        backgroundColor: table.status === 'RESERVED' ? '#f59e0b' : '#f1f5f9',
                        color: table.status === 'RESERVED' ? 'white' : '#64748b',
                        border: 'none',
                        padding: '6px 10px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      💳 Reservada
                    </button>
                    <button 
                      onClick={() => onUpdateStatus(table.id, 'OUT_OF_SERVICE')}
                      style={{
                        backgroundColor: table.status === 'OUT_OF_SERVICE' ? '#8b5cf6' : '#f1f5f9',
                        color: table.status === 'OUT_OF_SERVICE' ? 'white' : '#64748b',
                        border: 'none',
                        padding: '6px 10px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      🧽 Fuera de Servicio
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => onGenerateQR(table.id)}
                        style={{
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          padding: '8px 12px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        📱 Generar QR
                      </button>
                      <button 
                        onClick={() => handleEditTable(table.id)}
                        style={{
                          backgroundColor: '#f59e0b',
                          color: 'white',
                          border: 'none',
                          padding: '8px 12px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        ✏️ Editar
                      </button>
                    </div>
                    <button 
                      onClick={() => onDeleteTable(table.id)}
                      style={{
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              )}

              {table.qrCode && (
                <div style={{ marginTop: 12, textAlign: 'center' }}>
                  <img src={table.qrCode} alt={`QR Mesa ${table.number}`} style={{ maxWidth: 150, height: 'auto' }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Orders Tab
export function OrdersTab({ orders }: { orders: Order[] }) {
  const getTableNumber = (tableId: string) => {
    // Simplemente mostrar el ID de la mesa si no tenemos acceso a la información completa
    return tableId || 'N/A'
  }

  return (
    <div>
      <section className="card">
        <h3>📋 Control de pedidos ({orders.length} pedidos)</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {orders.map((order) => (
            <div key={order.id} className="order-card" style={{ 
              padding: 16,
              border: '1px solid var(--muted)',
              borderRadius: 8,
              backgroundColor: 'var(--surface)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h4>Mesa {getTableNumber(order.tableId)}</h4>
                <span className={`status-badge status-${order.status}`}>
                  {order.status}
                </span>
              </div>
              
              <div style={{ marginBottom: 12 }}>
                <div>Total: ${order.total}</div>
                <div>Items: {order.items?.length || 0}</div>
                <div>Hora: {new Date(order.timestamp).toLocaleTimeString()}</div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <h5>Items del pedido:</h5>
                {order.items?.map((item: OrderItem, index: number) => (
                  <div key={index} style={{ fontSize: '0.9rem', padding: '2px 0' }}>
                    {item.qty}x Item ID: {item.menuItemId}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className={order.status === 'pendiente' ? 'primary' : ''}>
                  ⏳ Pendiente
                </button>
                <button className={order.status === 'en_cocina' ? 'primary' : ''}>
                  👨‍🍳 En Cocina
                </button>
                <button className={order.status === 'listo' ? 'primary' : ''}>
                  ✅ Listo
                </button>
                <button className={order.status === 'entregado' ? 'primary' : ''}>
                  🚚 Entregado
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

// Payments Tab
export function PaymentsTab({ orders }: { orders: Order[] }) {
  const paidOrders = orders.filter(o => o.paymentStatus === 'pagado')
  const pendingOrders = orders.filter(o => o.paymentStatus === 'pendiente')
  const totalRevenue = paidOrders.reduce((sum, order) => sum + (order.total || 0), 0)

  return (
    <div>
      <section className="card">
        <h3>💳 Resumen de pagos</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div className="stat-card">
            <h4>💰 Ingresos totales</h4>
            <div className="stat-value">${totalRevenue}</div>
          </div>
          <div className="stat-card">
            <h4>✅ Pagos completados</h4>
            <div className="stat-value">{paidOrders.length}</div>
          </div>
          <div className="stat-card">
            <h4>⏳ Pagos pendientes</h4>
            <div className="stat-value">{pendingOrders.length}</div>
          </div>
        </div>
      </section>

      <section className="card">
        <h3>📋 Historial de pagos</h3>
        <div style={{ display: 'grid', gap: 12 }}>
          {orders.map((order) => (
            <div key={order.id} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: 12,
              border: '1px solid var(--muted)',
              borderRadius: 8,
              backgroundColor: order.paymentStatus === 'pagado' ? '#f0f9ff' : '#fef3c7'
            }}>
              <div>
                <div style={{ fontWeight: 'bold' }}>Mesa {order.tableId} - ${order.total}</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>
                  {new Date(order.timestamp).toLocaleString()}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`status-badge ${order.paymentStatus === 'pagado' ? 'status-paid' : 'status-pending'}`}>
                  {order.paymentStatus === 'pagado' ? '✅ Pagado' : '⏳ Pendiente'}
                </span>
                {order.paymentStatus && order.paymentStatus !== 'pendiente' && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                    {order.paymentStatus}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

// Reports Tab
export function ReportsTab({ menu }: { menu: MenuItem[] }) {
  const topSellingItems = menu.map(item => ({
    ...item,
    sales: Math.floor(Math.random() * 50) + 1
  })).sort((a, b) => b.sales - a.sales).slice(0, 4)

  const dailyRevenue = [
    { date: '14/10/2025', amount: 4127 },
    { date: '13/10/2025', amount: 3278 },
    { date: '12/10/2025', amount: 851 },
    { date: '11/10/2025', amount: 2913 },
    { date: '10/10/2025', amount: 920 },
    { date: '9/10/2025', amount: 2467 },
    { date: '8/10/2025', amount: 4462 }
  ]

  const totalWeekRevenue = dailyRevenue.reduce((sum, day) => sum + day.amount, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header with Export Button */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        backgroundColor: 'white',
        padding: '20px 24px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        border: '1px solid #f1f5f9'
      }}>
        <h2 style={{ 
          margin: 0, 
          fontSize: '20px', 
          fontWeight: '600',
          color: '#0f172a',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          📊 Reportes y Estadísticas
        </h2>
        <button style={{
          backgroundColor: '#dc2626',
          color: 'white',
          border: 'none',
          padding: '10px 16px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          📄 Exportar PDF
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Sales by Item */}
        <div style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          border: '1px solid #f1f5f9'
        }}>
          <h3 style={{ 
            margin: '0 0 20px 0', 
            fontSize: '16px', 
            fontWeight: '600',
            color: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            🍽️ Ventas por plato
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topSellingItems.map((item, index) => (
              <div key={item.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: index < topSellingItems.length - 1 ? '1px solid #f1f5f9' : 'none'
              }}>
                <div>
                  <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '500', color: '#0f172a' }}>
                    {item.name}
                  </p>
                  <div style={{
                    width: '100%',
                    height: '4px',
                    backgroundColor: '#f1f5f9',
                    borderRadius: '2px',
                    overflow: 'hidden',
                    marginTop: '4px'
                  }}>
                    <div style={{
                      width: `${(item.sales / topSellingItems[0].sales) * 100}%`,
                      height: '100%',
                      backgroundColor: index === 0 ? '#3b82f6' : index === 1 ? '#10b981' : index === 2 ? '#f59e0b' : '#ef4444',
                      borderRadius: '2px'
                    }} />
                  </div>
                </div>
                <div style={{
                  padding: '4px 8px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#64748b',
                  marginLeft: '16px'
                }}>
                  {item.sales} vendidos
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Revenue */}
        <div style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          border: '1px solid #f1f5f9'
        }}>
          <h3 style={{ 
            margin: '0 0 20px 0', 
            fontSize: '16px', 
            fontWeight: '600',
            color: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            📈 Ingresos por día
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {dailyRevenue.map((day, index) => (
              <div key={index} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ 
                    fontSize: '14px', 
                    color: '#64748b',
                    minWidth: '80px'
                  }}>
                    {day.date === '14/10/2025' ? 'Hoy' : day.date}
                  </span>
                  <div style={{
                    width: '120px',
                    height: '6px',
                    backgroundColor: '#f1f5f9',
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${(day.amount / Math.max(...dailyRevenue.map(d => d.amount))) * 100}%`,
                      height: '100%',
                      backgroundColor: day.date === '14/10/2025' ? '#3b82f6' : '#94a3b8',
                      borderRadius: '3px'
                    }} />
                  </div>
                </div>
                <span style={{ 
                  fontSize: '16px', 
                  fontWeight: '600',
                  color: '#0f172a'
                }}>
                  ${day.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
          <div style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b' }}>
              Últimos 7 Días
            </p>
            <p style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
              ${totalWeekRevenue.toLocaleString()}
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
              Simulación de tarjeta de métricas clave
            </p>
          </div>
        </div>
      </div>

      {/* Detailed Peak Hours Table */}
      <div style={{
        backgroundColor: 'white',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        border: '1px solid #f1f5f9'
      }}>
        <h3 style={{ 
          margin: '0 0 20px 0', 
          fontSize: '16px', 
          fontWeight: '600',
          color: '#0f172a',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          🕐 Horarios Pico (Detalle)
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <th style={{ 
                  padding: '12px', 
                  textAlign: 'left', 
                  fontSize: '12px', 
                  fontWeight: '600',
                  color: '#64748b',
                  borderBottom: '1px solid #e2e8f0'
                }}>
                  PLATO / FECHA
                </th>
                <th style={{ 
                  padding: '12px', 
                  textAlign: 'center', 
                  fontSize: '12px', 
                  fontWeight: '600',
                  color: '#64748b',
                  borderBottom: '1px solid #e2e8f0'
                }}>
                  VENTAS
                </th>
                <th style={{ 
                  padding: '12px', 
                  textAlign: 'center', 
                  fontSize: '12px', 
                  fontWeight: '600',
                  color: '#64748b',
                  borderBottom: '1px solid #e2e8f0'
                }}>
                  FECHA
                </th>
                <th style={{ 
                  padding: '12px', 
                  textAlign: 'right', 
                  fontSize: '12px', 
                  fontWeight: '600',
                  color: '#64748b',
                  borderBottom: '1px solid #e2e8f0'
                }}>
                  INGRESOS
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Hamburguesa Clásica', sales: 4, date: '14/10/2025', revenue: 4127 },
                { name: 'Ensalada Vegana', sales: 30, date: '13/10/2025', revenue: 3278 },
                { name: 'Pasta sin Gluten', sales: 39, date: '12/10/2025', revenue: 851 },
                { name: 'Bebida', sales: 8, date: '11/10/2025', revenue: 2913 },
                { name: '', sales: '', date: '10/10/2025', revenue: 920 },
                { name: '', sales: '', date: '9/10/2025', revenue: 2467 },
                { name: '', sales: '', date: '8/10/2025', revenue: 4462 }
              ].map((row, index) => (
                <tr key={index}>
                  <td style={{ 
                    padding: '12px', 
                    fontSize: '14px', 
                    color: '#0f172a',
                    borderBottom: '1px solid #f1f5f9'
                  }}>
                    {row.name}
                  </td>
                  <td style={{ 
                    padding: '12px', 
                    textAlign: 'center', 
                    fontSize: '14px', 
                    color: '#0f172a',
                    borderBottom: '1px solid #f1f5f9'
                  }}>
                    {row.sales && `${row.sales} vendidos`}
                  </td>
                  <td style={{ 
                    padding: '12px', 
                    textAlign: 'center', 
                    fontSize: '14px', 
                    color: '#64748b',
                    borderBottom: '1px solid #f1f5f9'
                  }}>
                    {row.date}
                  </td>
                  <td style={{ 
                    padding: '12px', 
                    textAlign: 'right', 
                    fontSize: '14px', 
                    fontWeight: '600',
                    color: '#0f172a',
                    borderBottom: '1px solid #f1f5f9'
                  }}>
                    ${row.revenue.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}