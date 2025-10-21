import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMenu, getOrders, onStoreChange, updateOrderStatus, sendMessageToTable, setEta } from '../store-db'
import { useSocket, useOrderNotifications } from '../hooks/useSocket'

export default function KitchenPanel() {
  const [orders, setOrders] = useState(getOrders())
  const [menu] = useState(getMenu())
  const [msgOpen, setMsgOpen] = useState(false)
  const [msgText, setMsgText] = useState('')
  const [msgTable, setMsgTable] = useState<string>('')
  const [sortBy, setSortBy] = useState<'time' | 'priority'>('time')
  const [showStats, setShowStats] = useState(false)

  // Socket.io integration
  const { isConnected, joinRoom } = useSocket({ room: 'kitchen' })
  const { orderNotifications, clearOrderNotifications } = useOrderNotifications()

  useEffect(() => {
    const unsub = onStoreChange(() => setOrders(getOrders()))
    return () => {
      unsub()
    }
  }, [])

  const labelForItem = (id: string) => menu.find((m) => m.id === id)?.name || id

  // Función para calcular prioridad basada en tiempo de espera y cantidad de items
  const calculatePriority = (order: any) => {
    const waitTime = Date.now() - new Date(order.createdAt).getTime()
    const itemCount = order.items.reduce((sum: number, item: any) => sum + item.qty, 0)
    const baseScore = waitTime / (1000 * 60) // minutos de espera
    const complexityBonus = itemCount * 0.5 // bonus por cantidad de items
    return baseScore + complexityBonus
  }

  const relevant = orders
    .filter((o) => o.status === 'pendiente' || o.status === 'en_cocina')
    .sort((a, b) => {
      if (sortBy === 'priority') {
        return calculatePriority(b) - calculatePriority(a) // mayor prioridad primero
      } else {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() // más antiguos primero
      }
    })

  const openMessage = (tableId: string) => {
    setMsgTable(tableId)
    setMsgText('')
    setMsgOpen(true)
  }
  const closeMessage = () => setMsgOpen(false)
  const sendMessage = () => {
    if (!msgTable || !msgText.trim()) return
    sendMessageToTable(msgTable, 'cocina', msgText.trim())
    setMsgOpen(false)
    setMsgText('')
    setMsgTable('')
  }

  return (
    <div className="container">
      <header className="header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h2>Panel Cocina/Bar</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Connection Status */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              padding: '4px 8px',
              borderRadius: '6px',
              backgroundColor: isConnected ? '#dcfce7' : '#fee2e2',
              color: isConnected ? '#166534' : '#991b1b',
              fontSize: '12px',
              fontWeight: '500'
            }}>
              <span>{isConnected ? '🟢' : '🔴'}</span>
              {isConnected ? 'Conectado' : 'Desconectado'}
            </div>
            
            {/* Notification Counter */}
            {orderNotifications.length > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 8px',
                borderRadius: '6px',
                backgroundColor: '#fef3c7',
                color: '#92400e',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
              onClick={clearOrderNotifications}
              title="Click para limpiar notificaciones"
              >
                <span>🔔</span>
                {orderNotifications.length} nuevas
              </div>
            )}
            
            <nav style={{ display: 'flex', gap: 12 }}>
              <Link to="/mesa/1">Mesa 1</Link>
              <Link to="/mesero">Mesero</Link>
              <Link to="/admin">Admin</Link>
            </nav>
          </div>
        </div>
      </header>
      <section className="card" style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h3 style={{ 
            margin: '0', 
            color: '#1f2937', 
            fontSize: '20px', 
            fontWeight: '600' 
          }}>
            Pedidos en preparación ({relevant.length})
          </h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setSortBy('time')}
              style={{
                padding: '6px 12px',
                backgroundColor: sortBy === 'time' ? '#3b82f6' : '#f3f4f6',
                color: sortBy === 'time' ? 'white' : '#374151',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              🕒 Por tiempo
            </button>
            <button
              onClick={() => setSortBy('priority')}
              style={{
                padding: '6px 12px',
                backgroundColor: sortBy === 'priority' ? '#3b82f6' : '#f3f4f6',
                color: sortBy === 'priority' ? 'white' : '#374151',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              ⚡ Por prioridad
            </button>
            <button
              onClick={() => setShowStats(!showStats)}
              style={{
                padding: '6px 12px',
                backgroundColor: showStats ? '#059669' : '#f3f4f6',
                color: showStats ? 'white' : '#374151',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              📊 Estadísticas
            </button>
          </div>
        </div>
        <div className="kitchen-list" style={{ 
          display: 'grid', 
          gap: '16px' 
        }}>
          {relevant.length === 0 ? (
            <p style={{ 
              color: '#6b7280', 
              fontStyle: 'italic',
              textAlign: 'center',
              padding: '40px 0',
              fontSize: '16px'
            }}>
              No hay pedidos pendientes en este momento
            </p>
          ) : (
            relevant.map((o) => {
              const waitTime = Math.floor((Date.now() - new Date(o.createdAt).getTime()) / (1000 * 60))
              const priority = calculatePriority(o)
              const isHighPriority = priority > 15 // más de 15 minutos o muchos items
              
              return (
                <div key={o.id} className="kitchen-order" style={{
                  backgroundColor: 'white',
                  border: `2px solid ${isHighPriority ? '#ef4444' : '#e5e7eb'}`,
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: isHighPriority ? '0 4px 12px rgba(239, 68, 68, 0.15)' : '0 2px 4px rgba(0, 0, 0, 0.1)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '16px',
                  position: 'relative'
                }}>
                  {isHighPriority && (
                    <div style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '16px',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '10px',
                      fontWeight: '600'
                    }}>
                      ⚠️ URGENTE
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '8px'
                    }}>
                      <div style={{ 
                        fontWeight: '700',
                        fontSize: '18px',
                        color: '#1f2937'
                      }}>
                        Mesa {o.tableId}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: waitTime > 10 ? '#ef4444' : '#6b7280',
                        fontWeight: '500',
                        backgroundColor: waitTime > 10 ? '#fef2f2' : '#f9fafb',
                        padding: '2px 8px',
                        borderRadius: '8px'
                      }}>
                        ⏱️ {waitTime} min
                      </div>
                      {sortBy === 'priority' && (
                        <div style={{
                          fontSize: '10px',
                          color: '#6366f1',
                          fontWeight: '500',
                          backgroundColor: '#eef2ff',
                          padding: '2px 6px',
                          borderRadius: '6px'
                        }}>
                          Prioridad: {priority.toFixed(1)}
                        </div>
                      )}
                    </div>
                  <div style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '500',
                    marginBottom: '8px',
                    backgroundColor: o.status === 'en_cocina' ? '#dbeafe' : '#fef3c7',
                    color: o.status === 'en_cocina' ? '#1e40af' : '#92400e'
                  }}>
                    Estado: {o.status}
                  </div>
                  {typeof o.etaMinutes === 'number' && (
                    <div style={{
                      color: '#059669',
                      fontWeight: '500',
                      marginBottom: '8px'
                    }}>
                      ETA: {o.etaMinutes} min
                    </div>
                  )}
                  {o.suggestions && o.suggestions.trim() && (
                    <div className="kitchen-suggestion" style={{
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      marginBottom: '12px'
                    }}>
                      Sugerencia: {o.suggestions}
                    </div>
                  )}
                  <ul style={{ 
                    listStyle: 'none', 
                    padding: 0, 
                    margin: 0 
                  }}>
                    {o.items.map((it) => (
                      <li key={it.menuItemId} style={{
                        padding: '6px 0',
                        borderBottom: '1px solid #f3f4f6',
                        color: '#374151',
                        fontSize: '14px'
                      }}>
                        <span style={{ fontWeight: '500' }}>
                          {labelForItem(it.menuItemId)}
                        </span>
                        <span style={{ 
                          color: '#6b7280',
                          marginLeft: '8px'
                        }}>
                          x {it.qty}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  gap: '8px', 
                  alignItems: 'stretch',
                  minWidth: '200px'
                }}>
                  <button 
                    onClick={() => updateOrderStatus(o.id, 'en_cocina')}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: o.status === 'en_cocina' ? '#dbeafe' : '#3b82f6',
                      color: o.status === 'en_cocina' ? '#1e40af' : 'white',
                      border: o.status === 'en_cocina' ? '2px solid #3b82f6' : 'none',
                      borderRadius: '6px',
                      fontWeight: '500',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    En cocina
                  </button>
                  <button 
                    onClick={() => updateOrderStatus(o.id, 'listo')}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#059669',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: '500',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Listo
                  </button>
                  <input 
                    type="number" 
                    style={{ 
                      width: '100%',
                      padding: '8px 12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '14px',
                      color: '#374151'
                    }} 
                    placeholder="ETA (min)" 
                    onChange={(e) => setEta(o.id, Number(e.target.value))} 
                  />
                  <button 
                    onClick={() => openMessage(o.tableId)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#f9fafb',
                      color: '#374151',
                      border: '2px solid #e5e7eb',
                      borderRadius: '6px',
                      fontWeight: '500',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Mensaje
                  </button>
                </div>
                </div>
              )
            })
          )}
        </div>
      </section>
      
      {/* Panel de Estadísticas */}
      {showStats && (
        <section className="card" style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb',
          marginTop: '20px'
        }}>
          <h3 style={{ 
            margin: '0 0 20px 0', 
            color: '#1f2937', 
            fontSize: '20px', 
            fontWeight: '600' 
          }}>
            📊 Estadísticas de Rendimiento
          </h3>
          
          {/* Estadísticas generales */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div style={{
              backgroundColor: '#f8fafc',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>
                {orders.filter(o => o.status === 'entregado').length}
              </div>
              <div style={{ fontSize: '14px', color: '#64748b' }}>Pedidos completados hoy</div>
            </div>
            
            <div style={{
              backgroundColor: '#f8fafc',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626' }}>
                {relevant.length}
              </div>
              <div style={{ fontSize: '14px', color: '#64748b' }}>Pedidos pendientes</div>
            </div>
            
            <div style={{
              backgroundColor: '#f8fafc',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>
                {Math.round(orders.filter(o => o.status === 'entregado').reduce((acc, o) => {
                  const completionTime = new Date(o.createdAt).getTime() - new Date(o.createdAt).getTime()
                  return acc + (completionTime / (1000 * 60))
                }, 0) / Math.max(orders.filter(o => o.status === 'entregado').length, 1))}min
              </div>
              <div style={{ fontSize: '14px', color: '#64748b' }}>Tiempo promedio</div>
            </div>
            
            <div style={{
              backgroundColor: '#f8fafc',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
                {relevant.filter(o => {
                  const waitTime = Date.now() - new Date(o.createdAt).getTime()
                  return waitTime > 20 * 60 * 1000 // más de 20 minutos
                }).length}
              </div>
              <div style={{ fontSize: '14px', color: '#64748b' }}>Pedidos urgentes (+20min)</div>
            </div>
          </div>
          
          {/* Historial reciente */}
          <div>
            <h4 style={{ 
              margin: '0 0 16px 0', 
              color: '#374151', 
              fontSize: '16px', 
              fontWeight: '600' 
            }}>
              📋 Historial Reciente (Últimos 10 pedidos completados)
            </h4>
            <div style={{ 
              maxHeight: '300px', 
              overflowY: 'auto',
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}>
              {orders
                .filter(o => o.status === 'entregado')
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 10)
                .map((order, index) => {
                  const completionTime = Math.round((new Date(order.createdAt).getTime() - new Date(order.createdAt).getTime()) / (1000 * 60))
                  const itemCount = order.items.reduce((sum, item) => sum + item.qty, 0)
                  
                  return (
                    <div key={order.id} style={{
                      padding: '12px 16px',
                      borderBottom: index < 9 ? '1px solid #f1f5f9' : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontWeight: '500', color: '#1f2937' }}>
                          Mesa {order.tableId} - {itemCount} items
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          {new Date(order.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                      <div style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        backgroundColor: completionTime <= 15 ? '#dcfce7' : completionTime <= 25 ? '#fef3c7' : '#fee2e2',
                        color: completionTime <= 15 ? '#166534' : completionTime <= 25 ? '#92400e' : '#991b1b'
                      }}>
                        {completionTime}min
                      </div>
                    </div>
                  )
                })}
              {orders.filter(o => o.status === 'entregado').length === 0 && (
                <div style={{ 
                  padding: '24px', 
                  textAlign: 'center', 
                  color: '#64748b' 
                }}>
                  No hay pedidos completados aún
                </div>
              )}
            </div>
          </div>
        </section>
      )}
      
      {msgOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={`Mensaje a mesa ${msgTable}`} onClick={closeMessage}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Mensaje a mesa {msgTable}</div>
              <button className="modal-close" aria-label="Cerrar" onClick={closeMessage}>×</button>
            </div>
            <div className="modal-body" style={{ gridTemplateColumns: '1fr' }}>
              <div className="modal-info">
                <textarea placeholder="Escribe el mensaje para la mesa" value={msgText} onChange={(e) => setMsgText(e.target.value)} />
                <div className="product-actions" style={{ marginTop: 8 }}>
                  <button className="primary" onClick={sendMessage}>Enviar</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}