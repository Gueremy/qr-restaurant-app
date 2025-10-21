import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMenu, getOrders, onStoreChange, updateOrderStatus, getAllMessages, getOrdersForTable, setPaymentStatus, addWaiterNote } from '../store-db'
import { useSocket, useOrderNotifications } from '../hooks/useSocket'
import QRScanner from '../components/QRScanner'

export default function WaiterPanel() {
  const [orders, setOrders] = useState(getOrders())
  const [menu] = useState(getMenu())
  const [messages, setMessages] = useState(getAllMessages())
  const [cashModal, setCashModal] = useState<{ tableId: string | null }>(() => ({ tableId: null }))
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([])
  const [cashAmount, setCashAmount] = useState('')
  const [notifications, setNotifications] = useState<string[]>([])
  const [lastReadyCount, setLastReadyCount] = useState(0)
  const [noteModal, setNoteModal] = useState<{ orderId: string | null, note: string }>({ orderId: null, note: '' })
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [scanResult, setScanResult] = useState<string | null>(null)

  // Socket.io integration
  const { isConnected } = useSocket({ room: 'waiters' })
  const { orderNotifications, clearOrderNotifications } = useOrderNotifications()

  // Definir labelForItem antes del useEffect
  const labelForItem = (id: string) => menu.find((m) => m.id === id)?.name || id

  useEffect(() => {
    const unsub = onStoreChange(() => {
      const newOrders = getOrders()
      const readyOrders = newOrders.filter(o => o.status === 'listo')
      
      // Detectar nuevos pedidos listos
      if (readyOrders.length > lastReadyCount) {
        const newReadyOrders = readyOrders.slice(lastReadyCount)
        const newNotifications = newReadyOrders.map(order => 
          `🔔 ¡Pedido listo! Mesa ${order.tableId} - ${order.items.map(item => labelForItem(item.menuItemId)).join(', ')}`
        )
        setNotifications(prev => [...prev, ...newNotifications])
        
        // Reproducir sonido de notificación (opcional)
        if (newNotifications.length > 0) {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT')
          audio.play().catch(() => {}) // Ignorar errores de audio
        }
      }
      
      setLastReadyCount(readyOrders.length)
      setOrders(newOrders)
      setMessages(getAllMessages())
    })
    return () => {
      unsub()
    }
  }, [])

  // Función para limpiar notificaciones
  const clearNotification = (index: number) => {
    setNotifications(prev => prev.filter((_, i) => i !== index))
  }

  // Función para agregar notificaciones
  const addNotification = (message: string) => {
    setNotifications(prev => [...prev, message])
  }

  const openNoteModal = (orderId: string) => {
    setNoteModal({ orderId, note: '' })
  }

  const closeNoteModal = () => {
    setNoteModal({ orderId: null, note: '' })
  }

  const saveWaiterNote = () => {
    if (noteModal.orderId && noteModal.note.trim()) {
      addWaiterNote(noteModal.orderId, noteModal.note.trim())
      closeNoteModal()
    }
  }

  const unpaidForTable = (tableId: string) => getOrdersForTable(tableId).filter((o) => o.paymentStatus !== 'pagado')
  const priceFor = (id: string) => menu.find((m) => m.id === id)?.price || 0
  const orderTotal = (o: ReturnType<typeof getOrdersForTable>[number]) => o.items.reduce((sum, it) => sum + it.qty * priceFor(it.menuItemId), 0)

  // Función para manejar el resultado del escaneo QR
  const handleQRScan = async (result: string) => {
    try {
      // Extraer el ID de la mesa de la URL escaneada
      const url = new URL(result)
      const pathParts = url.pathname.split('/')
      const tableId = pathParts[pathParts.length - 1]
      
      if (!tableId || isNaN(Number(tableId))) {
        addNotification('❌ QR inválido: No se pudo identificar la mesa')
        return
      }

      // Llamar al backend para marcar la mesa como libre
      const response = await fetch(`/api/tables/${tableId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'AVAILABLE' }),
      })

      if (response.ok) {
        setScanResult(`Mesa ${tableId} marcada como libre`)
        addNotification(`✅ Mesa ${tableId} marcada como libre y lista para nuevos clientes`)
        setShowQRScanner(false)
      } else {
        const errorData = await response.json()
        addNotification(`❌ Error al marcar mesa ${tableId}: ${errorData.message || 'Error desconocido'}`)
      }
    } catch (error) {
      console.error('Error al procesar QR:', error)
      addNotification('❌ Error al procesar el código QR')
    }
  }

  // Función para manejar errores del escáner
  const handleQRError = (error: string) => {
    console.error('Error del escáner QR:', error)
    // No mostrar notificación para errores menores del escáner
  }

  return (
    <div className="container">
      <header className="header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <h2>Panel Mesero</h2>
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
              <Link to="/cocina">Cocina</Link>
              <Link to="/admin">Admin</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Panel de Notificaciones */}
      {notifications.length > 0 && (
        <section style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          maxWidth: '400px'
        }}>
          {notifications.map((notification, index) => (
            <div key={index} style={{
              backgroundColor: '#10b981',
              color: 'white',
              padding: '12px 16px',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              animation: 'slideIn 0.3s ease-out'
            }}>
              <span style={{ fontSize: '14px', fontWeight: '500' }}>
                {notification}
              </span>
              <button
                onClick={() => clearNotification(index)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '18px',
                  padding: '0',
                  marginLeft: '12px'
                }}
              >
                ×
              </button>
            </div>
          ))}
        </section>
      )}

      <section className="card">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          💰 Solicitudes de pago en efectivo
        </h3>
        <div style={{ display: 'grid', gap: 16 }}>
          {messages
            .filter((m) => m.from === 'mesero' && m.text.toLowerCase().includes('pagar en efectivo'))
            .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
            .map((m) => (
              <div key={m.id} style={{
                backgroundColor: '#f8f9fa',
                border: '1px solid #e9ecef',
                borderRadius: 8,
                padding: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#333', marginBottom: 4 }}>
                    🏪 Mesa {m.tableId}
                  </div>
                  <div style={{ color: '#666', fontSize: 14 }}>{m.text}</div>
                </div>
                <button 
                  onClick={() => {
                    setCashModal({ tableId: m.tableId })
                    setSelectedOrderIds([])
                    setCashAmount('')
                  }}
                  style={{
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    padding: '8px 16px',
                    cursor: 'pointer',
                    fontWeight: 500,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#218838'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#28a745'}
                >
                  ✅ Atender
                </button>
              </div>
            ))}
          {messages.filter((m) => m.from === 'mesero' && m.text.toLowerCase().includes('pagar en efectivo')).length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: 32,
              color: '#666',
              fontStyle: 'italic',
              backgroundColor: '#f8f9fa',
              borderRadius: 8,
              border: '1px dashed #dee2e6'
            }}>
              📭 No hay solicitudes de pago en efectivo
            </div>
          )}
        </div>
      </section>

       {/* Sección del Escáner QR para marcar mesas como libres */}
       <section className="card">
         <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
           📱 Escáner QR - Marcar Mesa como Libre
         </h3>
         <div style={{ display: 'grid', gap: 16 }}>
           {!showQRScanner ? (
             <div style={{
               textAlign: 'center',
               padding: 24,
               backgroundColor: '#f8f9fa',
               borderRadius: 8,
               border: '1px solid #e9ecef'
             }}>
               <div style={{ marginBottom: 16, color: '#666', fontSize: 14 }}>
                 Escanea el código QR de la mesa para marcarla como libre después de la limpieza
               </div>
               <button
                 onClick={() => setShowQRScanner(true)}
                 style={{
                   backgroundColor: '#007bff',
                   color: 'white',
                   border: 'none',
                   borderRadius: 8,
                   padding: '12px 24px',
                   cursor: 'pointer',
                   fontWeight: 600,
                   fontSize: 16,
                   transition: 'all 0.2s ease',
                   display: 'flex',
                   alignItems: 'center',
                   gap: 8,
                   margin: '0 auto'
                 }}
                 onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
                 onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#007bff'}
               >
                 📱 Activar Escáner QR
               </button>
               {scanResult && (
                 <div style={{
                   marginTop: 16,
                   padding: 12,
                   backgroundColor: '#d4edda',
                   color: '#155724',
                   borderRadius: 6,
                   border: '1px solid #c3e6cb',
                   fontSize: 14,
                   fontWeight: 500
                 }}>
                   ✅ {scanResult}
                 </div>
               )}
             </div>
           ) : (
             <div style={{
               backgroundColor: '#f8f9fa',
               borderRadius: 8,
               padding: 16,
               border: '1px solid #e9ecef'
             }}>
               <div style={{
                 display: 'flex',
                 justifyContent: 'space-between',
                 alignItems: 'center',
                 marginBottom: 16
               }}>
                 <h4 style={{ margin: 0, color: '#333' }}>📱 Escaneando código QR...</h4>
                 <button
                   onClick={() => setShowQRScanner(false)}
                   style={{
                     backgroundColor: '#dc3545',
                     color: 'white',
                     border: 'none',
                     borderRadius: 6,
                     padding: '6px 12px',
                     cursor: 'pointer',
                     fontWeight: 500,
                     fontSize: 12
                   }}
                 >
                   ❌ Cerrar
                 </button>
               </div>
               <QRScanner
                 onScanSuccess={handleQRScan}
                 onScanError={handleQRError}
                 onClose={() => setShowQRScanner(false)}
               />
               <div style={{
                 marginTop: 12,
                 padding: 12,
                 backgroundColor: '#e3f2fd',
                 borderRadius: 6,
                 fontSize: 12,
                 color: '#1976d2'
               }}>
                 💡 <strong>Instrucciones:</strong> Apunta la cámara hacia el código QR de la mesa que acabas de limpiar. 
                 El sistema automáticamente marcará la mesa como disponible para nuevos clientes.
               </div>
             </div>
           )}
         </div>
       </section>

       <section className="card">
         <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
           🍽️ Listos para retirar
         </h3>
          <div style={{ display: 'grid', gap: 16 }}>
            {orders
              .filter((o) => o.status === 'listo')
              .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
              .map((o) => (
                <div key={o.id} style={{
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #e9ecef',
                  borderRadius: 8,
                  padding: 16,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#333', marginBottom: 4 }}>
                      🏪 Mesa {o.tableId}
                    </div>
                    <div style={{ 
                      display: 'inline-block',
                      backgroundColor: '#28a745',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 500,
                      marginBottom: 8
                    }}>
                      ✅ {o.status}
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 16, color: '#666' }}>
                      {o.items.map((it) => (
                        <li key={it.menuItemId} style={{ marginBottom: 2 }}>
                          {labelForItem(it.menuItemId)} x {it.qty}
                        </li>
                      ))}
                    </ul>
                    {o.waiterNotes && (
                      <div style={{
                        marginTop: 8,
                        padding: 8,
                        backgroundColor: '#e3f2fd',
                        borderRadius: 6,
                        border: '1px solid #bbdefb'
                      }}>
                        <div style={{ fontWeight: 600, fontSize: 12, color: '#1976d2', marginBottom: 4 }}>
                          📝 Observaciones del mesero:
                        </div>
                        <div style={{ fontSize: 12, color: '#424242', whiteSpace: 'pre-line' }}>
                          {o.waiterNotes}
                        </div>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => updateOrderStatus(o.id, 'entregado')}
                    style={{
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontWeight: 500,
                      transition: 'all 0.2s ease',
                      marginLeft: 16
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#007bff'}
                  >
                    🚚 Entregar
                  </button>
                </div>
              ))}
            {orders.filter((o) => o.status === 'listo').length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: 32,
                color: '#666',
                fontStyle: 'italic',
                backgroundColor: '#f8f9fa',
                borderRadius: 8,
                border: '1px dashed #dee2e6'
              }}>
                📭 No hay pedidos listos para retirar
              </div>
            )}
          </div>
    </section>

    <section className="card">
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        📋 Todos los pedidos
      </h3>
        <div style={{ display: 'grid', gap: 16 }}>
          {orders
            .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
            .map((o) => (
              <div key={o.id} style={{
                backgroundColor: '#f8f9fa',
                border: '1px solid #e9ecef',
                borderRadius: 8,
                padding: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#333', marginBottom: 4 }}>
                    🏪 Mesa {o.tableId}
                  </div>
                  <div style={{ 
                    display: 'inline-block',
                    backgroundColor: 
                      o.status === 'pendiente' ? '#ffc107' :
                      o.status === 'en_cocina' ? '#fd7e14' :
                      o.status === 'listo' ? '#28a745' :
                      o.status === 'entregado' ? '#6c757d' : '#007bff',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 500,
                    marginBottom: 8
                  }}>
                    {o.status === 'pendiente' ? '⏳' :
                     o.status === 'en_cocina' ? '👨‍🍳' :
                     o.status === 'listo' ? '✅' :
                     o.status === 'entregado' ? '🚚' : '📋'} {o.status}
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 16, color: '#666' }}>
                    {o.items.map((it) => (
                      <li key={it.menuItemId} style={{ marginBottom: 2 }}>
                        {labelForItem(it.menuItemId)} x {it.qty}
                      </li>
                    ))}
                  </ul>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button 
                    onClick={() => openNoteModal(o.id)}
                    style={{
                      backgroundColor: '#6f42c1',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      padding: '6px 12px',
                      cursor: 'pointer',
                      fontWeight: 500,
                      fontSize: 12,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#5a32a3'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#6f42c1'}
                  >
                    📝 Observación
                  </button>
                  <button 
                    onClick={() => updateOrderStatus(o.id, 'en_cocina')}
                    style={{
                      backgroundColor: '#fd7e14',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      padding: '6px 12px',
                      cursor: 'pointer',
                      fontWeight: 500,
                      fontSize: 12,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e8690b'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#fd7e14'}
                  >
                    👨‍🍳 En cocina
                  </button>
                  <button 
                    onClick={() => updateOrderStatus(o.id, 'listo')}
                    style={{
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      padding: '6px 12px',
                      cursor: 'pointer',
                      fontWeight: 500,
                      fontSize: 12,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#218838'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#28a745'}
                  >
                    ✅ Listo
                  </button>
                  <button 
                    onClick={() => updateOrderStatus(o.id, 'entregado')}
                    style={{
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      padding: '6px 12px',
                      cursor: 'pointer',
                      fontWeight: 500,
                      fontSize: 12,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#007bff'}
                  >
                    🚚 Entregado
                  </button>
                </div>
              </div>
            ))}
          {orders.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: 32,
              color: '#666',
              fontStyle: 'italic',
              backgroundColor: '#f8f9fa',
              borderRadius: 8,
              border: '1px dashed #dee2e6'
            }}>
              📭 No hay pedidos registrados
            </div>
          )}
        </div>
    </section>

      {cashModal.tableId && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={`Confirmar pago efectivo mesa ${cashModal.tableId}`} onClick={() => setCashModal({ tableId: null })}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Confirmar pago efectivo — Mesa {cashModal.tableId}</div>
              <button className="modal-close" aria-label="Cerrar" onClick={() => setCashModal({ tableId: null })}>×</button>
            </div>
            <div className="modal-body" style={{ gridTemplateColumns: '1fr' }}>
              <div className="modal-info">
                <div>Seleccione los pedidos impagos que se van a pagar:</div>
                <div style={{ marginTop: 8 }}>
                  {unpaidForTable(cashModal.tableId!).map((o) => (
                    <label key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                      <input
                        type="checkbox"
                        checked={selectedOrderIds.includes(o.id)}
                        onChange={(e) => {
                          const checked = e.target.checked
                          setSelectedOrderIds((prev) => checked ? [...prev, o.id] : prev.filter((id) => id !== o.id))
                        }}
                      />
                      <span>Pedido #{o.id} — ${orderTotal(o)}</span>
                    </label>
                  ))}
                </div>
                <div style={{ marginTop: 8, fontWeight: 700 }}>
                  Total: ${unpaidForTable(cashModal.tableId!).filter((o) => selectedOrderIds.includes(o.id)).reduce((sum, o) => sum + orderTotal(o), 0)}
                </div>
                <div style={{ marginTop: 8 }}>
                  <input type="number" placeholder="Monto recibido" value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button
                    onClick={() => {
                      const amount = Number(cashAmount) || 0
                      const unpaid = unpaidForTable(cashModal.tableId!)
                      let total = 0
                      const next: string[] = []
                      for (const o of unpaid) {
                        const t = orderTotal(o)
                        if (total + t <= amount) {
                          next.push(o.id)
                          total += t
                        } else {
                          break
                        }
                      }
                      setSelectedOrderIds(next)
                    }}
                  >Ajustar selección al monto</button>
                  <button onClick={() => setSelectedOrderIds(unpaidForTable(cashModal.tableId!).map((o) => o.id))}>Seleccionar todo</button>
                </div>
                <div className="product-actions" style={{ marginTop: 8 }}>
                  <button onClick={() => setCashModal({ tableId: null })}>Cancelar</button>
                  <button
                    className="primary"
                    disabled={selectedOrderIds.length === 0 || Number(cashAmount) < unpaidForTable(cashModal.tableId!).filter((o) => selectedOrderIds.includes(o.id)).reduce((sum, o) => sum + orderTotal(o), 0)}
                    onClick={() => {
                      selectedOrderIds.forEach((id) => setPaymentStatus(id, 'pagado'))
                      setCashModal({ tableId: null })
                      setSelectedOrderIds([])
                      setCashAmount('')
                      // Agregar notificación de confirmación
                      addNotification(`✅ Pago en efectivo confirmado para Mesa ${cashModal.tableId}`)
                    }}
                  >💰 Confirmar pago recibido</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de observaciones del mesero */}
      {noteModal.orderId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: 12,
            padding: 24,
            maxWidth: 500,
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#1f2937' }}>
              📝 Agregar Observación
            </h3>
            <p style={{ margin: '0 0 16px 0', color: '#6b7280', fontSize: 14 }}>
              Pedido #{noteModal.orderId} - Mesa {orders.find(o => o.id === noteModal.orderId)?.tableId}
            </p>
            <textarea
              value={noteModal.note}
              onChange={(e) => setNoteModal(prev => ({ ...prev, note: e.target.value }))}
              placeholder="Escribe tu observación aquí... (ej: Cliente alérgico a mariscos, sin cebolla, etc.)"
              style={{
                width: '100%',
                minHeight: 100,
                padding: 12,
                border: '2px solid #e5e7eb',
                borderRadius: 8,
                fontSize: 14,
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
            <div style={{
              display: 'flex',
              gap: 12,
              marginTop: 20,
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={closeNoteModal}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
              >
                Cancelar
              </button>
              <button
                onClick={saveWaiterNote}
                disabled={!noteModal.note.trim()}
                style={{
                  padding: '10px 20px',
                  backgroundColor: noteModal.note.trim() ? '#3b82f6' : '#9ca3af',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: noteModal.note.trim() ? 'pointer' : 'not-allowed',
                  fontWeight: 500,
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  if (noteModal.note.trim()) {
                    e.currentTarget.style.backgroundColor = '#2563eb'
                  }
                }}
                onMouseOut={(e) => {
                  if (noteModal.note.trim()) {
                    e.currentTarget.style.backgroundColor = '#3b82f6'
                  }
                }}
              >
                💾 Guardar Observación
              </button>
            </div>
          </div>
        </div>
      )}
  </div>
)
}