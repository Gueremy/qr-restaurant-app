import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { addOrder, getLatestOrderForTable, getMenu, onStoreChange } from '../store-db'
import type { MenuItem, OrderItem } from '../store-db'
import { getMessagesForTable, setPaymentStatus, updateOrderDetails, cancelOrder, sendMessageToTable } from '../store-db'
import { getOrdersForTable } from '../store-db'

type CartWithOptions = Record<string, { qty: number; options?: { side?: string; variant?: string; comments?: string; accompaniments?: string[] } }>

export default function TablePage() {
  const { tableId = '1' } = useParams()
  const [menu, setMenu] = useState<MenuItem[]>(getMenu())
  const [filter, setFilter] = useState<'todos' | 'vegano' | 'sin_gluten' | 'bebidas' | 'postres' | 'entradas' | 'platos_principales'>('todos')
  const [cart, setCart] = useState<CartWithOptions>({})
  const [status, setStatus] = useState<string>('Sin pedido')
  const [notes, setNotes] = useState('')
  const [suggestions, setSuggestions] = useState('')
  const [questions, setQuestions] = useState('')
  const [messages, setMessages] = useState(getMessagesForTable(tableId))
  const [toast, setToast] = useState<string | null>(null)
  const [lastToastId, setLastToastId] = useState<string | null>(null)
  // Estado para modal de detalle de producto
  const [selected, setSelected] = useState<MenuItem | null>(null)
  const [modalQty, setModalQty] = useState<number>(1)
  const [modalSide, setModalSide] = useState<string>('')
  const [modalVariant, setModalVariant] = useState<string>('')
  const [modalComments, setModalComments] = useState<string>('')
  const [modalAccompaniments, setModalAccompaniments] = useState<string[]>([])
  // Pago y división de cuenta
  const [payOpen, setPayOpen] = useState(false)
  const [payMethod, setPayMethod] = useState<'cash' | 'webpay' | 'mixed' | null>(null)
  const [splitPay, setSplitPay] = useState(false)
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([])
  const [selectedItems, setSelectedItems] = useState<{orderId: string, itemIndex: number}[]>([])
  const [itemLevelSplit, setItemLevelSplit] = useState(false)
  // Estado para controlar la expansión del carrito
  const [cartExpanded, setCartExpanded] = useState(false)
  const [cashAmountMixed, setCashAmountMixed] = useState('')
  const [webpayAmountMixed, setWebpayAmountMixed] = useState('')

  useEffect(() => {
    const unsub = onStoreChange(() => {
      setMenu(getMenu())
      const latest = getLatestOrderForTable(tableId)
      setStatus(latest ? `Estado: ${latest.status}` : 'Sin pedido')
      setMessages(getMessagesForTable(tableId))
      
      // Actualizar selectedOrderIds si hay cambios en los pedidos impagos
      const currentUnpaid = getOrdersForTable(tableId).filter((o) => o.paymentStatus !== 'pagado')
      setSelectedOrderIds(prev => {
        // Mantener solo los IDs que siguen siendo válidos (no pagados)
        const validIds = prev.filter(id => currentUnpaid.some(o => o.id === id))
        // Si no hay IDs válidos y hay pedidos impagos, seleccionar todos
        if (validIds.length === 0 && currentUnpaid.length > 0 && payOpen) {
          return currentUnpaid.map(o => o.id)
        }
        return validIds
      })
    })
    // init status
    const latest = getLatestOrderForTable(tableId)
    setStatus(latest ? `Estado: ${latest.status}` : 'Sin pedido')
    return () => unsub()
  }, [tableId, getMenu, getLatestOrderForTable, onStoreChange, payOpen])

  // Toast de notificación para mensajes de cocina
  useEffect(() => {
    if (!messages || messages.length === 0) return
    const latest = [...messages].sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))[0]
    if (latest && latest.from === 'cocina' && latest.id !== lastToastId) {
      setToast(latest.text)
      setLastToastId(latest.id)
      const t = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(t)
    }
  }, [messages, lastToastId])

  const filteredMenu = useMemo(() => {
    if (filter === 'todos') return menu
    
    // Filtros especiales por características
    if (filter === 'vegano' || filter === 'sin_gluten') {
      return menu.filter((m) => m.tags?.includes(filter))
    }
    
    // Filtros por categoría
    return menu.filter((m) => {
      const category = m.category?.toLowerCase()
      switch (filter) {
        case 'bebidas':
          return category === 'bebidas' || category === 'bebida'
        case 'postres':
          return category === 'postres' || category === 'postre'
        case 'entradas':
          return category === 'entradas' || category === 'entrada' || category === 'aperitivos'
        case 'platos_principales':
          return category === 'platos principales' || category === 'plato principal' || category === 'principales'
        default:
          return true
      }
    })
  }, [menu, filter])

  const updateQty = (id: string, delta: number) => {
    setCart((c) => {
      const next = { ...c }
      const current = next[id]?.qty || 0
      const newQty = Math.max(0, current + delta)
      if (newQty === 0) delete next[id]
      else next[id] = { ...next[id], qty: newQty }
      return next
    })
  }

  // Modal de detalle
  const openDetails = (item: MenuItem) => {
    setSelected(item)
    setModalQty(1)
    setModalSide('')
    setModalVariant('')
    setModalComments('')
    setModalAccompaniments([])
  }
  const closeDetails = () => {
    setSelected(null)
    setModalComments('')
    setModalAccompaniments([])
  }
  const addFromModal = () => {
    if (!selected) return
    const itemKey = `${selected.id}_${Date.now()}` // Clave única para permitir múltiples personalizaciones del mismo item
    setCart((c) => {
      const next = { ...c }
      next[itemKey] = {
        qty: modalQty,
        options: {
          side: modalSide || undefined,
          variant: modalVariant || undefined,
          comments: modalComments || undefined,
          accompaniments: modalAccompaniments.length > 0 ? modalAccompaniments : undefined
        }
      }
      return next
    })
    setSelected(null)
  }


  const sendOrder = () => {
    const items: OrderItem[] = Object.entries(cart).map(([itemKey, cartItem]) => {
      const menuItemId = itemKey.split('_')[0] // Extraer el ID original del item
      return { 
        menuItemId, 
        qty: cartItem.qty,
        options: cartItem.options
      }
    })
    if (items.length === 0) return
    const order = addOrder(tableId, items)
    updateOrderDetails(order.id, items, notes, suggestions, questions)
    setCart({})
    setNotes('')
    setSuggestions('')
    setQuestions('')
    const latest = getLatestOrderForTable(tableId)
    setStatus(latest ? `Estado: ${latest.status}` : 'Sin pedido')
  }

  const editLatestOrder = () => {
    const latest = getLatestOrderForTable(tableId)
    if (!latest) return
    const items: OrderItem[] = Object.entries(cart).map(([menuItemId, cartItem]) => ({ 
      menuItemId, 
      qty: cartItem.qty,
      options: cartItem.options
    }))
    updateOrderDetails(latest.id, items, notes, suggestions, questions)
  }

  const cancelLatestOrder = () => {
    const latest = getLatestOrderForTable(tableId)
    if (!latest) return
    cancelOrder(latest.id)
  }

  const cartTotal = useMemo(() => {
    return Object.entries(cart).reduce((sum, [itemKey, cartItem]) => {
      // Extraer el ID del menú de la clave del carrito
      const menuItemId = itemKey.includes('_') ? itemKey.split('_')[0] : itemKey
      const price = menu.find((m) => m.id === menuItemId)?.price || 0
      const quantity = typeof cartItem === 'number' ? cartItem : cartItem.qty || 0
      return sum + price * quantity
    }, 0)
  }, [cart, menu])

  // Totales y pedidos impagos
  const unpaidOrders = useMemo(() => getOrdersForTable(tableId).filter((o) => o.paymentStatus !== 'pagado'), [tableId])
  const priceFor = (id: string) => menu.find((m) => m.id === id)?.price || 0
  const orderTotal = (o: ReturnType<typeof getOrdersForTable>[number]) => o.items.reduce((sum, it) => sum + it.qty * priceFor(it.menuItemId), 0)
  const selectedTotal = useMemo(() => {
    if (itemLevelSplit) {
      // Calcular total basado en productos individuales seleccionados
      return selectedItems.reduce((sum, { orderId, itemIndex }) => {
        const order = unpaidOrders.find(o => o.id === orderId)
        if (!order || !order.items[itemIndex]) return sum
        const item = order.items[itemIndex]
        const menuItem = menu.find(m => m.id === item.menuItemId)
        return sum + (menuItem ? menuItem.price * item.qty : 0)
      }, 0)
    } else {
      // Calcular total basado en pedidos completos seleccionados
      const selected = unpaidOrders.filter((o) => selectedOrderIds.includes(o.id))
      return selected.reduce((sum, o) => sum + orderTotal(o), 0)
    }
  }, [selectedOrderIds, selectedItems, itemLevelSplit, unpaidOrders, menu])

  const isPaid = useMemo(() => {
    const orders = getOrdersForTable(tableId)
    if (orders.length === 0) return false
    return orders.every((o) => o.paymentStatus === 'pagado')
  }, [tableId])
  const hasUnpaid = useMemo(() => {
    const orders = getOrdersForTable(tableId)
    return orders.some((o) => o.paymentStatus !== 'pagado')
  }, [tableId])

  return (
    <div className="container">
      <header className="header">
        <div style={{ textAlign: 'left' }}>
          <h2>Menú Digital</h2>
          <div>Mesa {tableId} | <span>{status}</span></div>
        </div>
        <nav style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link to="/mesero">Mesero</Link>
          <Link to="/cocina">Cocina</Link>
          <Link to="/admin">Admin</Link>
          {isPaid ? <span className="badge success">Pagado ✓</span> : hasUnpaid ? <span className="badge pending">Pendiente ⏳</span> : null}
        </nav>
      </header>

      <div className="page-grid">
        <div>
          {/* Platillos Disponibles - Primer elemento */}
          <h3>Platillos Disponibles</h3>
          <div className="filter-bar" style={{ 
            display: 'flex', 
            gap: '8px', 
            marginBottom: '16px',
            flexWrap: 'wrap'
          }}>
            <button 
              className={filter === 'todos' ? 'active' : ''} 
              onClick={() => setFilter('todos')}
              style={{
                padding: '8px 16px',
                border: filter === 'todos' ? '2px solid #3b82f6' : '2px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: filter === 'todos' ? '#3b82f6' : '#f9fafb',
                color: filter === 'todos' ? 'white' : '#374151',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              🍽️ Todos
            </button>
            <button 
              className={filter === 'entradas' ? 'active' : ''} 
              onClick={() => setFilter('entradas')}
              style={{
                padding: '8px 16px',
                border: filter === 'entradas' ? '2px solid #3b82f6' : '2px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: filter === 'entradas' ? '#3b82f6' : '#f9fafb',
                color: filter === 'entradas' ? 'white' : '#374151',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              🥗 Entradas
            </button>
            <button 
              className={filter === 'platos_principales' ? 'active' : ''} 
              onClick={() => setFilter('platos_principales')}
              style={{
                padding: '8px 16px',
                border: filter === 'platos_principales' ? '2px solid #3b82f6' : '2px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: filter === 'platos_principales' ? '#3b82f6' : '#f9fafb',
                color: filter === 'platos_principales' ? 'white' : '#374151',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              🍖 Platos principales
            </button>
            <button 
              className={filter === 'bebidas' ? 'active' : ''} 
              onClick={() => setFilter('bebidas')}
              style={{
                padding: '8px 16px',
                border: filter === 'bebidas' ? '2px solid #3b82f6' : '2px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: filter === 'bebidas' ? '#3b82f6' : '#f9fafb',
                color: filter === 'bebidas' ? 'white' : '#374151',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              🥤 Bebidas
            </button>
            <button 
              className={filter === 'postres' ? 'active' : ''} 
              onClick={() => setFilter('postres')}
              style={{
                padding: '8px 16px',
                border: filter === 'postres' ? '2px solid #3b82f6' : '2px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: filter === 'postres' ? '#3b82f6' : '#f9fafb',
                color: filter === 'postres' ? 'white' : '#374151',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              🍰 Postres
            </button>
            <button 
              className={filter === 'vegano' ? 'active' : ''} 
              onClick={() => setFilter('vegano')}
              style={{
                padding: '8px 16px',
                border: filter === 'vegano' ? '2px solid #10b981' : '2px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: filter === 'vegano' ? '#10b981' : '#f9fafb',
                color: filter === 'vegano' ? 'white' : '#374151',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              🌱 Vegano
            </button>
            <button 
              className={filter === 'sin_gluten' ? 'active' : ''} 
              onClick={() => setFilter('sin_gluten')}
              style={{
                padding: '8px 16px',
                border: filter === 'sin_gluten' ? '2px solid #f59e0b' : '2px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: filter === 'sin_gluten' ? '#f59e0b' : '#f9fafb',
                color: filter === 'sin_gluten' ? 'white' : '#374151',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              🌾 Sin gluten
            </button>
          </div>
          <section className="card" style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{ 
              margin: '0 0 16px 0', 
              color: '#1f2937', 
              fontSize: '18px', 
              fontWeight: '600' 
            }}>
              Menú
            </h3>
            <ul className="menu-list" style={{ 
              listStyle: 'none', 
              padding: 0, 
              margin: 0, 
              display: 'grid', 
              gap: '12px' 
            }}>
            {filteredMenu.map((item) => (
              <li key={item.id} className="menu-item product-card" onClick={() => openDetails(item)} style={{ 
                cursor: 'pointer',
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}>
                <div className="product-media">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="product-image" style={{
                      width: '60px',
                      height: '60px',
                      objectFit: 'cover',
                      borderRadius: '8px'
                    }} />
                  ) : (
                    <div className="product-image placeholder" aria-hidden="true" style={{
                      width: '60px',
                      height: '60px',
                      backgroundColor: '#f3f4f6',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#9ca3af',
                      fontSize: '24px'
                    }}>
                      🍽️
                    </div>
                  )}
                </div>
                <div className="product-body" style={{ flex: 1 }}>
                  <div className="product-header" style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start',
                    marginBottom: '4px'
                  }}>
                    <div className="product-title" style={{ 
                      fontWeight: '600', 
                      color: '#1f2937',
                      fontSize: '16px'
                    }}>
                      {item.name}
                    </div>
                    <div className="product-price" style={{ 
                      fontWeight: '700', 
                      color: '#059669',
                      fontSize: '16px'
                    }}>
                      ${item.price}
                    </div>
                  </div>
                  {item.description && (
                    <div className="product-desc" style={{ 
                      color: '#6b7280', 
                      fontSize: '14px',
                      marginBottom: '8px'
                    }}>
                      {item.description}
                    </div>
                  )}
                  <div className="product-tags" style={{ 
                    display: 'flex', 
                    gap: '4px', 
                    flexWrap: 'wrap' 
                  }}>
                    {item.tags?.map((t) => (
                      <span key={t} className="chip" style={{
                        backgroundColor: '#dbeafe',
                        color: '#1e40af',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        {t}
                      </span>
                    ))}
                    {!item.inStock && (
                      <span className="chip danger" style={{
                        backgroundColor: '#fee2e2',
                        color: '#dc2626',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        Agotado
                      </span>
                    )}
                  </div>
                </div>
                <button 
                  className="add-fab" 
                  aria-label="Agregar 1" 
                  disabled={!item.inStock} 
                  onClick={(e) => { e.stopPropagation(); updateQty(item.id, 1) }}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: item.inStock ? '#3b82f6' : '#d1d5db',
                    color: 'white',
                    fontSize: '20px',
                    fontWeight: 'bold',
                    cursor: item.inStock ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease'
                  }}
                >
                  +
                </button>
              </li>
            ))}
            </ul>
          </section>
        </div>

        <aside>
        </aside>
      </div>

      {toast && (
        <div className="toast" role="status" aria-live="polite">{toast}</div>
      )}

      {selected && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={`Detalle ${selected.name}`} onClick={closeDetails}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{selected.name}</div>
              <button className="modal-close" aria-label="Cerrar" onClick={closeDetails}>×</button>
            </div>
            <div className="modal-body">
              <div className="modal-media">
                {selected.image ? (
                  <img src={selected.image} alt={selected.name} />
                ) : (
                  <div className="product-image placeholder" aria-hidden="true" />
                )}
              </div>
              <div className="modal-info">
                <div className="modal-price">${selected.price}</div>
                {selected.description && <p className="modal-desc">{selected.description}</p>}
                {selected.tags && selected.tags.length > 0 && (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Alérgenos / tags</div>
                    <div className="product-tags">
                      {selected.tags.map((t) => (<span key={t} className="chip">{t}</span>))}
                    </div>
                  </div>
                )}
                {/* Selector de variante dinámico según el plato */}
                {selected.variants && selected.variants.length > 0 ? (
                  <div className="product-options" style={{ marginTop: 8 }}>
                    <select value={modalVariant} onChange={(e) => setModalVariant(e.target.value)} aria-label="Variante">
                      <option value="">Variante</option>
                      {selected.variants.map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                ) : null}
                
                {/* Selector de acompañamiento */}
                <div className="product-options" style={{ marginTop: 8 }}>
                  <input 
                    type="text" 
                    placeholder="Acompañamiento (ej: papas fritas, ensalada)" 
                    value={modalSide} 
                    onChange={(e) => setModalSide(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                
                {/* Acompañamientos múltiples */}
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4, fontSize: '14px' }}>Acompañamientos adicionales:</div>
                  <div className="accompaniment-buttons" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                    {['Pan', 'Mantequilla', 'Limón', 'Salsa picante', 'Queso extra', 'Sin cebolla', 'Sin ajo'].map((acc) => (
                      <button
                        key={acc}
                        className="accompaniment-button"
                        onClick={() => {
                          setModalAccompaniments(prev => 
                            prev.includes(acc) 
                              ? prev.filter(a => a !== acc)
                              : [...prev, acc]
                          )
                        }}
                        style={{
                          padding: '4px 8px',
                          fontSize: '12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          backgroundColor: modalAccompaniments.includes(acc) ? '#3b82f6' : 'white',
                          color: modalAccompaniments.includes(acc) ? 'white' : '#374151',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {acc}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Comentarios especiales */}
                <div style={{ marginTop: 8 }}>
                  <textarea 
                    placeholder="Comentarios especiales (ej: sin sal, término medio, etc.)" 
                    value={modalComments} 
                    onChange={(e) => setModalComments(e.target.value)}
                    className="mobile-textarea"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      minHeight: '60px',
                      resize: 'vertical'
                    }}
                  />
                </div>
                
                {/* Sugerencia para cocina dentro del modal */}
                <div style={{ marginTop: 8 }}>
                  <textarea 
                    placeholder="Sugerencia para cocina" 
                    value={suggestions} 
                    onChange={(e) => setSuggestions(e.target.value)}
                    className="mobile-textarea"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      minHeight: '60px',
                      resize: 'vertical'
                    }}
                  />
                </div>
                <div className="product-actions" style={{ marginTop: 8 }}>
                  <button 
                    onClick={() => setModalQty(Math.max(1, modalQty - 1))}
                    className="mobile-button"
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      backgroundColor: 'white',
                      cursor: 'pointer'
                    }}
                  >-</button>
                  <span style={{ padding: '8px 16px', fontWeight: '600' }}>{modalQty}</span>
                  <button 
                    onClick={() => setModalQty(modalQty + 1)}
                    className="mobile-button"
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      backgroundColor: 'white',
                      cursor: 'pointer'
                    }}
                  >+</button>
                  <button 
                    className="primary mobile-button" 
                    onClick={addFromModal}
                    style={{
                      padding: '12px 20px',
                      backgroundColor: '#059669',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >Agregar</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {payOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={`Pago mesa ${tableId}`} onClick={() => setPayOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Pago mesa {tableId}</div>
              <button className="modal-close" aria-label="Cerrar" onClick={() => setPayOpen(false)}>×</button>
            </div>
            <div className="modal-body" style={{ gridTemplateColumns: '1fr' }}>
              <div className="modal-info">
                <div style={{ marginBottom: 8 }}>
                  ¿Quiere pagar por separado?
                  <label style={{ marginLeft: 8 }}>
                    <input type="checkbox" checked={splitPay} onChange={(e) => {
                      const sep = e.target.checked
                      setSplitPay(sep)
                      setItemLevelSplit(false)
                      setSelectedItems([])
                      setSelectedOrderIds(sep ? [] : unpaidOrders.map((o) => o.id))
                    }} /> Sí
                  </label>
                </div>
                {splitPay && (
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input 
                        type="checkbox" 
                        checked={itemLevelSplit} 
                        onChange={(e) => {
                          const itemLevel = e.target.checked
                          setItemLevelSplit(itemLevel)
                          setSelectedOrderIds(itemLevel ? [] : unpaidOrders.map((o) => o.id))
                          setSelectedItems([])
                        }} 
                      />
                      <span>Seleccionar productos individuales</span>
                    </label>
                  </div>
                )}
                {splitPay ? (
                  itemLevelSplit ? (
                    <div>
                      {unpaidOrders.map((order) => (
                        <div key={order.id} style={{ marginBottom: 12, padding: '8px', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
                          <div style={{ fontWeight: 600, marginBottom: 8 }}>Pedido #{order.id}</div>
                          {order.items.map((item, itemIndex) => {
                            const menuItem = menu.find(m => m.id === item.menuItemId)
                            const isSelected = selectedItems.some(si => si.orderId === order.id && si.itemIndex === itemIndex)
                            return (
                              <label key={itemIndex} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', marginLeft: 16 }}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    const checked = e.target.checked
                                    setSelectedItems(prev => 
                                      checked 
                                        ? [...prev, { orderId: order.id, itemIndex }]
                                        : prev.filter(si => !(si.orderId === order.id && si.itemIndex === itemIndex))
                                    )
                                  }}
                                />
                                <span>
                                  {menuItem?.name} x{item.qty} — ${menuItem ? menuItem.price * item.qty : 0}
                                  {item.options?.variant && ` (${item.options.variant})`}
                                  {item.options?.side && ` con ${item.options.side}`}
                                </span>
                              </label>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div>
                      {unpaidOrders.map((o) => (
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
                  )
                ) : (
                  <div>Pagará todos los pedidos pendientes.</div>
                )}
                <div style={{ marginTop: 8, fontWeight: 700 }}>
                  Total a pagar: ${selectedTotal}
                </div>
                {payMethod === 'cash' && (
                  <div style={{ marginTop: 8 }}>
                    Se solicitará asistencia del mesero para confirmar el pago en efectivo en la mesa.
                  </div>
                )}
                {payMethod === 'mixed' && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ marginBottom: 8, fontWeight: 600 }}>Pago Mixto:</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: 4, fontSize: '14px' }}>
                          Monto en efectivo:
                        </label>
                        <input
                          type="number"
                          value={cashAmountMixed}
                          onChange={(e) => {
                            const cash = parseFloat(e.target.value) || 0
                            setCashAmountMixed(e.target.value)
                            setWebpayAmountMixed((selectedTotal - cash).toString())
                          }}
                          placeholder="0"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: 4, fontSize: '14px' }}>
                          Monto con Webpay:
                        </label>
                        <input
                          type="number"
                          value={webpayAmountMixed}
                          onChange={(e) => {
                            const webpay = parseFloat(e.target.value) || 0
                            setWebpayAmountMixed(e.target.value)
                            setCashAmountMixed((selectedTotal - webpay).toString())
                          }}
                          placeholder="0"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        Total: ${(parseFloat(cashAmountMixed) || 0) + (parseFloat(webpayAmountMixed) || 0)}
                        {Math.abs(selectedTotal - ((parseFloat(cashAmountMixed) || 0) + (parseFloat(webpayAmountMixed) || 0))) > 0.01 && (
                          <span style={{ color: '#dc2626', marginLeft: 8 }}>
                            (Diferencia: ${Math.abs(selectedTotal - ((parseFloat(cashAmountMixed) || 0) + (parseFloat(webpayAmountMixed) || 0))).toFixed(2)})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <div className="product-actions" style={{ marginTop: 8 }}>
                  <button onClick={() => setPayOpen(false)}>Cancelar</button>
                  <button
                    className="primary"
                    disabled={selectedTotal <= 0 || (payMethod === 'mixed' && Math.abs(selectedTotal - ((parseFloat(cashAmountMixed) || 0) + (parseFloat(webpayAmountMixed) || 0))) > 0.01)}
                    onClick={() => {
                      if (payMethod === 'cash') {
                        let ids: string
                        if (itemLevelSplit) {
                          const itemDescriptions = selectedItems.map(({ orderId, itemIndex }) => {
                            const order = unpaidOrders.find(o => o.id === orderId)
                            const item = order?.items[itemIndex]
                            const menuItem = menu.find(m => m.id === item?.menuItemId)
                            return `${menuItem?.name} x${item?.qty} (Pedido #${orderId})`
                          }).join(', ')
                          ids = itemDescriptions
                        } else {
                          ids = splitPay ? selectedOrderIds.join(', ') : 'todos los pedidos pendientes'
                        }
                        sendMessageToTable(tableId, 'mesero', `Mesa ${tableId} solicitó pagar en efectivo por ${ids}. Por favor asistencia.`)
                      } else if (payMethod === 'mixed') {
                        const cashAmount = parseFloat(cashAmountMixed) || 0
                        const webpayAmount = parseFloat(webpayAmountMixed) || 0
                        let ids: string
                        if (itemLevelSplit) {
                          const itemDescriptions = selectedItems.map(({ orderId, itemIndex }) => {
                            const order = unpaidOrders.find(o => o.id === orderId)
                            const item = order?.items[itemIndex]
                            const menuItem = menu.find(m => m.id === item?.menuItemId)
                            return `${menuItem?.name} x${item?.qty} (Pedido #${orderId})`
                          }).join(', ')
                          ids = itemDescriptions
                        } else {
                          ids = splitPay ? selectedOrderIds.join(', ') : 'todos los pedidos pendientes'
                        }
                        
                        if (cashAmount > 0) {
                          sendMessageToTable(tableId, 'mesero', `Mesa ${tableId} solicitó pago mixto por ${ids}. Efectivo: $${cashAmount}, Webpay: $${webpayAmount}. Por favor asistencia para el efectivo.`)
                        }
                        
                        // Marcar como pagados después del pago mixto
                        if (itemLevelSplit) {
                          // Para productos individuales, marcar solo esos productos como pagados
                          // Nota: Esta funcionalidad requeriría una extensión del sistema de pagos
                          // Por ahora, marcaremos los pedidos completos
                          const orderIds = [...new Set(selectedItems.map(si => si.orderId))]
                          orderIds.forEach((id) => setPaymentStatus(id, 'pagado'))
                        } else {
                          selectedOrderIds.forEach((id) => setPaymentStatus(id, 'pagado'))
                        }
                      } else {
                        // Webpay (simulado): marcar pagados
                        if (itemLevelSplit) {
                          // Para productos individuales, marcar los pedidos completos por ahora
                          const orderIds = [...new Set(selectedItems.map(si => si.orderId))]
                          orderIds.forEach((id) => setPaymentStatus(id, 'pagado'))
                        } else {
                          selectedOrderIds.forEach((id) => setPaymentStatus(id, 'pagado'))
                        }
                      }
                      setPayOpen(false)
                      setSelectedOrderIds([])
                      setSelectedItems([])
                      setSplitPay(false)
                      setItemLevelSplit(false)
                      setPayMethod(null)
                      setCashAmountMixed('')
                      setWebpayAmountMixed('')
                    }}
                  >{payMethod === 'cash' ? 'Solicitar asistencia del mesero' : 
                    payMethod === 'mixed' ? 'Confirmar pago mixto' : 
                    'Confirmar pago Webpay (simulado)'}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Sección de preguntas y solicitudes - Movida al final */}
      <section className="card" style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb',
        margin: '20px auto',
        maxWidth: '800px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px'
        }}>
          <span style={{ fontSize: '20px' }}>❓</span>
          <span style={{ 
            fontWeight: '600', 
            color: '#1f2937',
            fontSize: '16px'
          }}>
            Preguntas y Solicitudes
          </span>
        </div>
        
        <div style={{ marginBottom: '12px' }}>
          <textarea 
            placeholder="¿Tienes alguna pregunta sobre el menú o solicitud especial? Escríbela aquí y el mesero te responderá..." 
            value={questions} 
            onChange={(e) => setQuestions(e.target.value)}
            className="mobile-textarea"
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              minHeight: '80px',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
          />
        </div>
        
        <button 
          onClick={() => {
            if (questions.trim()) {
              sendMessageToTable(tableId, 'mesero', `Pregunta/Solicitud del cliente: ${questions}`)
              setQuestions('')
              alert('Tu pregunta ha sido enviada al mesero. Te responderá pronto.')
            }
          }}
          disabled={!questions.trim()}
          className="mobile-button"
          style={{
            padding: '8px 16px',
            backgroundColor: questions.trim() ? '#3b82f6' : '#d1d5db',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '500',
            fontSize: '14px',
            cursor: questions.trim() ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease'
          }}
        >
          📤 Enviar pregunta al mesero
        </button>
      </section>

      {/* Botón flotante rojo para Carrito e Historial */}
      <button 
        onClick={() => setCartExpanded(!cartExpanded)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          border: 'none',
          backgroundColor: '#dc2626',
          color: 'white',
          fontSize: '24px',
          fontWeight: '600',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          transition: 'all 0.3s ease',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        title="Historial de Pedidos - Nuevo Pedido (Carrito)"
      >
        🛒
      </button>

      {/* Panel expandible del Carrito e Historial */}
      {cartExpanded && (
        <div style={{
          position: 'fixed',
          bottom: '90px',
          right: '20px',
          width: '350px',
          maxHeight: '70vh',
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          border: '1px solid #e5e7eb',
          zIndex: 1001,
          overflowY: 'auto'
        }}>
          {/* Sección del Carrito */}
          <div style={{
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px'
            }}>
              <span style={{ fontSize: '18px' }}>🛒</span>
              <span style={{ 
                fontWeight: '600', 
                color: '#1f2937',
                fontSize: '16px'
              }}>
                Nuevo Pedido (Carrito)
              </span>
            </div>
            
            {Object.keys(cart).length === 0 ? (
              <p style={{ 
                color: '#6b7280', 
                fontStyle: 'italic',
                textAlign: 'center',
                padding: '20px 0'
              }}>
                El carrito está vacío. Agrega un platillo.
              </p>
            ) : (
              <ul style={{ 
                listStyle: 'none', 
                padding: 0, 
                margin: '0 0 16px 0' 
              }}>
                {Object.entries(cart).map(([itemKey, cartItem]) => {
                  const menuItemId = itemKey.includes('|') ? itemKey.split('|')[0] : itemKey
                  const item = menu.find((m) => m.id === menuItemId)
                  return (
                    <li key={itemKey} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      padding: '8px 0',
                      borderBottom: '1px solid #f3f4f6'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#374151', fontWeight: '500' }}>
                          {item?.name} x {cartItem.qty}
                        </div>
                        {cartItem.options && (
                          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                            {cartItem.options.variant && <span>• {cartItem.options.variant}</span>}
                            {cartItem.options.side && <span>• {cartItem.options.side}</span>}
                            {cartItem.options.accompaniments && cartItem.options.accompaniments.length > 0 && (
                              <span>• {cartItem.options.accompaniments.join(', ')}</span>
                            )}
                            {cartItem.options.comments && <span>• {cartItem.options.comments}</span>}
                          </div>
                        )}
                      </div>
                      <span style={{ 
                        fontWeight: '600', 
                        color: '#059669' 
                      }}>
                        ${cartItem.qty * (item?.price || 0)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              fontWeight: '700',
              fontSize: '18px',
              color: '#1f2937',
              padding: '12px 0',
              borderTop: '2px solid #e5e7eb',
              marginBottom: '16px'
            }}>
              <div>TOTAL:</div>
              <div>${cartTotal}</div>
            </div>
            
            <button 
              className="send-order-btn" 
              onClick={sendOrder} 
              disabled={Object.keys(cart).length === 0}
              style={{
                width: '100%',
                padding: '12px 20px',
                backgroundColor: Object.keys(cart).length === 0 ? '#d1d5db' : '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '16px',
                cursor: Object.keys(cart).length === 0 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Enviar pedido a Cocina
            </button>
            
            {/* Edición y cancelación dentro de 3 minutos */}
            <EditControls tableId={tableId} editLatestOrder={editLatestOrder} cancelLatestOrder={cancelLatestOrder} />
          </div>

          {/* Sección del Resumen de Cuenta */}
          <div style={{
            backgroundColor: '#fef3c7',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px'
            }}>
              <span style={{ fontSize: '18px' }}>📊</span>
              <span style={{ 
                fontWeight: '600', 
                color: '#1f2937',
                fontSize: '16px'
              }}>
                Resumen de cuenta
              </span>
            </div>
            
            {(() => {
              const orders = getOrdersForTable(tableId).filter((o) => o.paymentStatus !== 'pagado')
              if (orders.length === 0) return (
                <p style={{ 
                  color: '#6b7280', 
                  fontStyle: 'italic',
                  textAlign: 'center',
                  padding: '20px 0'
                }}>
                  Sin consumos pendientes
                </p>
              )
              const agg: Record<string, number> = {}
              orders.forEach((o) => o.items.forEach((it) => { agg[it.menuItemId] = (agg[it.menuItemId] || 0) + it.qty }))
              const priceFor = (id: string) => menu.find((m) => m.id === id)?.price || 0
              const total = Object.entries(agg).reduce((sum, [id, qty]) => sum + qty * priceFor(id), 0)
              return (
                <div>
                  <ul style={{ 
                    listStyle: 'none', 
                    padding: 0, 
                    margin: '0 0 16px 0' 
                  }}>
                    {Object.entries(agg).map(([id, qty]) => {
                      const item = menu.find((m) => m.id === id)
                      return (
                        <li key={id} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 0',
                          borderBottom: '1px solid #f3f4f6'
                        }}>
                          <span style={{ color: '#374151' }}>
                            {item?.name || id} x {qty}
                          </span>
                          <span style={{ 
                            fontWeight: '600', 
                            color: '#059669' 
                          }}>
                            ${qty * priceFor(id)}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                  <div style={{ 
                    marginTop: '16px', 
                    padding: '12px 0',
                    borderTop: '2px solid #e5e7eb',
                    fontWeight: '700',
                    fontSize: '18px',
                    color: '#1f2937',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span>Total:</span>
                    <span>${total}</span>
                  </div>
                  <div style={{ 
                    marginTop: '16px', 
                    display: 'flex', 
                    gap: '8px', 
                    flexWrap: 'wrap' 
                  }}>
                    <button 
                      className="primary" 
                      onClick={() => { setPayMethod('cash'); setSplitPay(false); setSelectedOrderIds(unpaidOrders.map((o) => o.id)); setPayOpen(true) }}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      Pagar en efectivo
                    </button>
                    <button 
                      onClick={() => { setPayMethod('webpay'); setSplitPay(false); setSelectedOrderIds(unpaidOrders.map((o) => o.id)); setPayOpen(true) }}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#f9fafb',
                        color: '#374151',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      Pagar con Webpay
                    </button>
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Sección de Estado de Pedidos Activos */}
          {(() => {
            const activeOrders = getOrdersForTable(tableId).filter(o => o.status !== 'entregado')
            if (activeOrders.length === 0) return null
            
            return (
              <div style={{
                backgroundColor: '#f0f9ff',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px'
                }}>
                  <span style={{ fontSize: '18px' }}>🍽️</span>
                  <span style={{ 
                    fontWeight: '600', 
                    color: '#1f2937',
                    fontSize: '16px'
                  }}>
                    Estado de tus Pedidos
                  </span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {activeOrders
                    .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
                    .map((order) => {
                      const total = order.items.reduce((sum, it) => sum + it.qty * (menu.find((m) => m.id === it.menuItemId)?.price || 0), 0)
                      return (
                        <div key={order.id} style={{
                          backgroundColor: 'white',
                          borderRadius: '8px',
                          padding: '16px',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                        }}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: '12px'
                          }}>
                            <div>
                              <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
                                Pedido #{order.id}
                              </div>
                              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                                {new Date(order.createdAt).toLocaleTimeString()}
                              </div>
                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 12px',
                                borderRadius: '16px',
                                fontSize: '13px',
                                fontWeight: '600',
                                backgroundColor: 
                                  order.status === 'pendiente' ? '#fef3c7' :
                                  order.status === 'en_cocina' ? '#fed7aa' :
                                  order.status === 'listo' ? '#dcfce7' : '#f3f4f6',
                                color: 
                                  order.status === 'pendiente' ? '#92400e' :
                                  order.status === 'en_cocina' ? '#c2410c' :
                                  order.status === 'listo' ? '#166534' : '#374151'
                              }}>
                                {order.status === 'pendiente' && '⏳ Pendiente'}
                                {order.status === 'en_cocina' && '👨‍🍳 En Cocina'}
                                {order.status === 'listo' && '✅ Listo para retirar'}
                              </div>
                            </div>
                            <div style={{ 
                              fontWeight: '700', 
                              color: '#059669',
                              fontSize: '16px'
                            }}>
                              ${total}
                            </div>
                          </div>
                          
                          <div style={{ marginBottom: '8px' }}>
                            <div style={{ 
                              fontSize: '14px', 
                              fontWeight: '500', 
                              color: '#374151',
                              marginBottom: '6px'
                            }}>
                              Platos:
                            </div>
                            <ul style={{ 
                              listStyle: 'none', 
                              padding: 0, 
                              margin: 0,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px'
                            }}>
                              {order.items.map((item) => (
                                <li key={item.menuItemId} style={{ 
                                  fontSize: '13px', 
                                  color: '#6b7280',
                                  display: 'flex',
                                  justifyContent: 'space-between'
                                }}>
                                  <span>{menu.find((m) => m.id === item.menuItemId)?.name || item.menuItemId}</span>
                                  <span>x{item.qty}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          {order.status === 'listo' && (
                            <div style={{
                              backgroundColor: '#dcfce7',
                              border: '1px solid #16a34a',
                              borderRadius: '6px',
                              padding: '8px 12px',
                              marginTop: '8px'
                            }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '13px',
                                fontWeight: '600',
                                color: '#166534'
                              }}>
                                🔔 ¡Tu pedido está listo! Puedes retirarlo en el mostrador.
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                </div>
              </div>
            )
          })()}

          {/* Sección del Historial */}
          <div style={{
            backgroundColor: '#f1f5f9',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px'
            }}>
              <span style={{ fontSize: '18px' }}>📋</span>
              <span style={{ 
                fontWeight: '600', 
                color: '#1f2937',
                fontSize: '16px'
              }}>
                Historial de Pedidos
              </span>
            </div>
            
            <div className="history-list">
              {getOrdersForTable(tableId)
                .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
                .map((o) => {
                  const total = o.items.reduce((sum, it) => sum + it.qty * (menu.find((m) => m.id === it.menuItemId)?.price || 0), 0)
                  return (
                    <div key={o.id} style={{
                      backgroundColor: 'white',
                      borderRadius: '6px',
                      padding: '12px',
                      marginBottom: '8px',
                      border: '1px solid #e2e8f0'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px'
                      }}>
                        <div>
                          <div style={{ fontWeight: '600', color: '#1f2937' }}>Pedido #{o.id}</div>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                            {new Date(o.createdAt).toLocaleTimeString()}
                          </div>
                          <div style={{ 
                            display: 'flex', 
                            gap: '8px', 
                            alignItems: 'center',
                            flexWrap: 'wrap'
                          }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: '500',
                              backgroundColor: 
                                o.status === 'pendiente' ? '#fef3c7' :
                                o.status === 'en_cocina' ? '#fed7aa' :
                                o.status === 'listo' ? '#dcfce7' :
                                o.status === 'entregado' ? '#dbeafe' : '#f3f4f6',
                              color: 
                                o.status === 'pendiente' ? '#92400e' :
                                o.status === 'en_cocina' ? '#c2410c' :
                                o.status === 'listo' ? '#166534' :
                                o.status === 'entregado' ? '#1e40af' : '#374151'
                            }}>
                              {o.status === 'pendiente' && '⏳'}
                              {o.status === 'en_cocina' && '👨‍🍳'}
                              {o.status === 'listo' && '✅'}
                              {o.status === 'entregado' && '🚚'}
                              {o.status === 'pendiente' ? 'Pendiente' :
                               o.status === 'en_cocina' ? 'En Cocina' :
                               o.status === 'listo' ? 'Listo para retirar' :
                               o.status === 'entregado' ? 'Entregado' : o.status}
                            </span>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: '500',
                              backgroundColor: (o.paymentStatus || 'pendiente') === 'pagado' ? '#dcfce7' : '#fef3c7',
                              color: (o.paymentStatus || 'pendiente') === 'pagado' ? '#166534' : '#92400e'
                            }}>
                              {(o.paymentStatus || 'pendiente') === 'pagado' ? '✅ Pagado' : '💳 Pendiente'}
                            </span>
                          </div>
                        </div>
                        <div style={{ fontWeight: '600', color: '#059669' }}>${total}</div>
                      </div>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {o.items.map((it) => (
                          <li key={it.menuItemId} style={{ fontSize: '14px', color: '#374151', marginBottom: '2px' }}>
                            {menu.find((m) => m.id === it.menuItemId)?.name || it.menuItemId} x {it.qty}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              {(() => {
                const orders = getOrdersForTable(tableId)
                const grand = orders.reduce((sum, o) => sum + o.items.reduce((s, it) => s + it.qty * (menu.find((m) => m.id === it.menuItemId)?.price || 0), 0), 0)
                return (
                  <div style={{
                    fontWeight: '700',
                    fontSize: '16px',
                    color: '#1f2937',
                    textAlign: 'center',
                    padding: '12px',
                    backgroundColor: 'white',
                    borderRadius: '6px',
                    border: '2px solid #059669'
                  }}>
                    Suma total: ${grand}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EditControls({ tableId, editLatestOrder, cancelLatestOrder }: { tableId: string; editLatestOrder: () => void; cancelLatestOrder: () => void }) {
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const latest = getLatestOrderForTable(tableId)
  
  useEffect(() => {
    if (!latest?.editableUntil) return
    
    const updateTimer = () => {
      const now = new Date()
      const editableUntil = new Date(latest.editableUntil!)
      const remaining = Math.max(0, editableUntil.getTime() - now.getTime())
      setTimeLeft(remaining)
    }
    
    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [latest?.editableUntil])
  
  if (!latest) return null
  
  const now = new Date()
  const editableUntil = latest.editableUntil ? new Date(latest.editableUntil) : undefined
  const canEdit = editableUntil ? now <= editableUntil : false
  const minutes = Math.floor(timeLeft / (1000 * 60))
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000)
  
  return (
    <div style={{
      marginTop: '16px',
      padding: '16px',
      backgroundColor: canEdit ? '#fef3c7' : '#f3f4f6',
      borderRadius: '12px',
      border: `2px solid ${canEdit ? '#f59e0b' : '#e5e7eb'}`,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{
            fontSize: '16px',
            fontWeight: '600',
            color: canEdit ? '#92400e' : '#6b7280'
          }}>
            {canEdit ? '⏰ Tiempo para editar/cancelar:' : '🔒 Tiempo de edición expirado'}
          </span>
          {canEdit && (
            <span style={{
              fontSize: '18px',
              fontWeight: '700',
              color: minutes < 1 ? '#ef4444' : '#92400e',
              backgroundColor: 'white',
              padding: '4px 8px',
              borderRadius: '6px',
              border: `1px solid ${minutes < 1 ? '#ef4444' : '#f59e0b'}`
            }}>
              {minutes}:{seconds.toString().padStart(2, '0')}
            </span>
          )}
        </div>
        
        <div style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap'
        }}>
          {canEdit && (
            <>
              <button 
                onClick={editLatestOrder}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                ✏️ Editar pedido
              </button>
              <button 
                onClick={cancelLatestOrder}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                🗑️ Cancelar pedido
              </button>
            </>
          )}
          {latest.paymentStatus === 'pagado' && (
            <span style={{
              padding: '8px 12px',
              backgroundColor: '#dcfce7',
              color: '#166534',
              borderRadius: '6px',
              fontWeight: '500',
              fontSize: '14px'
            }}>
              ✅ Pagado
            </span>
          )}
        </div>
      </div>
      
      {!canEdit && (
        <p style={{
          margin: '0',
          fontSize: '14px',
          color: '#6b7280',
          fontStyle: 'italic'
        }}>
          Los pedidos solo pueden editarse o cancelarse dentro de los primeros 3 minutos después de realizados.
        </p>)}
    </div>
  )
}