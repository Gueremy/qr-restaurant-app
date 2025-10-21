import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { addOrder, getLatestOrderForTable, getMenu, onStoreChange } from '../store-db'
import type { MenuItem, OrderItem } from '../store-db'
import { getMessagesForTable, setPaymentStatus, updateOrderDetails, cancelOrder, sendMessageToTable } from '../store-db'
import { getOrdersForTable } from '../store-db'
import { useSocket, useTableNotifications } from '../hooks/useSocket'

type CartWithOptions = Record<string, { qty: number; options?: { side?: string; variant?: string; comments?: string; accompaniments?: string[] } }>

export default function TablePage() {
  const { tableId = '1' } = useParams()
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [filter, setFilter] = useState<'todos' | 'vegano' | 'sin_gluten' | 'bebidas' | 'postres' | 'entradas' | 'platos_principales'>('todos')
  const [cart, setCart] = useState<CartWithOptions>({})
  const [status, setStatus] = useState<string>('Sin pedido')
  const [notes, setNotes] = useState('')
  const [suggestions, setSuggestions] = useState('')
  const [questions, setQuestions] = useState('')
  const [messages, setMessages] = useState(getMessagesForTable(tableId))
  const [toast, setToast] = useState<string | null>(null)
  const [lastToastId, setLastToastId] = useState<string | null>(null)
  const [backendOrders, setBackendOrders] = useState<any[]>([])
  
  // Socket.io integration
  const { isConnected } = useSocket({ tableId })
  const { tableNotifications, clearTableNotifications } = useTableNotifications(tableId)
  
  // Función para cargar pedidos del backend
  const loadBackendOrders = async () => {
    try {
      // Obtener información de la mesa para obtener su ID
      const token = localStorage.getItem('token');
      const tablesResponse = await fetch('/api/tables', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (tablesResponse.ok) {
        const tablesData = await tablesResponse.json();
        const tables = tablesData.data || [];
        const currentTable = tables.find((table: any) => table.number.toString() === tableId);
        
        if (currentTable) {
          // Obtener pedidos de la mesa
          const ordersResponse = await fetch(`/api/orders?tableId=${currentTable.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          if (ordersResponse.ok) {
            const ordersData = await ordersResponse.json();
            setBackendOrders(ordersData.data || []);
          }
        }
      }
    } catch (error) {
      console.error('Error loading backend orders:', error);
    }
  };
  
  // Cargar menú desde la API
  useEffect(() => {
    const loadMenu = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/products', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.ok) {
          const data = await response.json();
          const products = data.data || [];
          // Convertir formato de API a formato local
          const menuItems = products.map((product: { 
            id: string; 
            name: string; 
            description: string; 
            price: number; 
            image: string; 
            category?: { name: string }; 
            active: boolean 
          }) => ({
            id: product.id,
            name: product.name,
            description: product.description,
            price: product.price,
            image: product.image,
            category: product.category?.name, // Incluir la categoría desde la API
            tags: [], // Los productos de la API no tienen tags por ahora
            variants: [], // Los productos de la API no tienen variants por ahora
            active: product.active
          }));
          setMenu(menuItems);
        } else {
          console.error('Error loading menu from API');
          // Fallback a datos locales si la API falla
          setMenu(getMenu());
        }
      } catch (error) {
        console.error('Error loading menu:', error);
        // Fallback a datos locales si hay error
        setMenu(getMenu());
      }
    };
    
    loadMenu();
  }, []);

  // Cargar pedidos del backend
  useEffect(() => {
    loadBackendOrders();
  }, [tableId]);

  // Marcar mesa como ocupada al acceder por primera vez
  useEffect(() => {
    const markTableAsOccupied = async () => {
      try {
        // Obtener información actual de la mesa
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/tables`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.ok) {
          const data = await response.json();
          const tables = data.data || [];
          const currentTable = tables.find((table: any) => table.number.toString() === tableId);
          
          // Si la mesa existe y está disponible, marcarla como ocupada
          if (currentTable && currentTable.status === 'AVAILABLE') {
            const updateResponse = await fetch(`/api/tables/${currentTable.id}/status`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ status: 'OCCUPIED' }),
            });
            
            if (updateResponse.ok) {
              console.log(`Mesa ${tableId} marcada como ocupada automáticamente`);
            }
          }
        }
      } catch (error) {
        console.error('Error al marcar mesa como ocupada:', error);
      }
    };

    // Solo ejecutar si tenemos un tableId válido
    if (tableId) {
      markTableAsOccupied();
    }
  }, [tableId]); // Solo ejecutar cuando cambie el tableId
  
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
  const [cashAmount, setCashAmount] = useState('')
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
    return () => {
      unsub()
    }
  }, [tableId, payOpen])

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

  // Agrupar menú por categorías en orden específico
  const menuByCategories = useMemo(() => {
    const categories = [
      { key: 'entradas', name: 'Entradas', emoji: '🥗' },
      { key: 'platos_principales', name: 'Platos Principales', emoji: '🍽️' },
      { key: 'bebidas', name: 'Bebidas', emoji: '🥤' },
      { key: 'postres', name: 'Postres', emoji: '🍰' }
    ]

    return categories.map(category => {
      const items = menu.filter((item) => {
        const itemCategory = item.category?.toLowerCase()
        switch (category.key) {
          case 'entradas':
            return itemCategory === 'entradas' || itemCategory === 'entrada' || itemCategory === 'aperitivos'
          case 'platos_principales':
            return itemCategory === 'platos principales' || itemCategory === 'plato principal' || itemCategory === 'principales'
          case 'bebidas':
            return itemCategory === 'bebidas' || itemCategory === 'bebida'
          case 'postres':
            return itemCategory === 'postres' || itemCategory === 'postre'
          default:
            return false
        }
      })
      return { ...category, items }
    }).filter(category => category.items.length > 0)
  }, [menu])

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


  const sendOrder = async () => {
    const items: OrderItem[] = Object.entries(cart).map(([itemKey, cartItem]) => {
      const menuItemId = itemKey.split('_')[0] // Extraer el ID original del item
      return { 
        menuItemId, 
        qty: cartItem.qty,
        options: cartItem.options
      }
    })
    if (items.length === 0) return

    try {
      // Obtener información de la mesa para el backend
      const token = localStorage.getItem('token');
      const tablesResponse = await fetch('/api/tables', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!tablesResponse.ok) {
        throw new Error('Error al obtener información de la mesa');
      }
      
      const tablesData = await tablesResponse.json();
      const tables = tablesData.data || [];
      const currentTable = tables.find((table: any) => table.number.toString() === tableId);
      
      if (!currentTable) {
        throw new Error('Mesa no encontrada');
      }

      // Preparar datos para el backend
      const orderData = {
        tableId: currentTable.id,
        items: items.map(item => ({
          productId: item.menuItemId,
          quantity: item.qty,
          notes: item.options ? JSON.stringify(item.options) : undefined
        })),
        notes: [notes, suggestions, questions].filter(Boolean).join(' | ')
      };

      // Enviar pedido al backend
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        throw new Error('Error al crear el pedido');
      }

      const result = await response.json();
      console.log('Pedido creado exitosamente:', result);

      // Limpiar el carrito y formulario
      setCart({})
      setNotes('')
      setSuggestions('')
      setQuestions('')
      
      // Actualizar estado local (esto se podría mejorar con una función que obtenga pedidos del backend)
      setStatus('Pedido enviado')
      
    } catch (error) {
      console.error('Error al enviar pedido:', error);
      // Fallback al método local si el backend falla
      const order = addOrder(tableId, items)
      updateOrderDetails(order.id, items, notes, suggestions, questions)
      setCart({})
      setNotes('')
      setSuggestions('')
      setQuestions('')
      const latest = getLatestOrderForTable(tableId)
      setStatus(latest ? `Estado: ${latest.status}` : 'Sin pedido')
    }
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

  // Totales y pedidos impagos - usar backend orders cuando estén disponibles
  const unpaidOrders = useMemo(() => {
    if (backendOrders.length > 0) {
      return backendOrders.filter(o => o.paymentStatus !== 'PAID')
    }
    return getOrdersForTable(tableId).filter((o) => o.paymentStatus !== 'pagado')
  }, [tableId, backendOrders])
  
  const priceFor = (id: string) => menu.find((m) => m.id === id)?.price || 0
  const orderTotal = (o: any) => {
    if (backendOrders.length > 0) {
      // Para pedidos del backend
      return o.orderItems?.reduce((sum: number, item: any) => sum + item.quantity * item.product.price, 0) || 0
    }
    // Para pedidos locales
    return o.items?.reduce((sum: number, it: any) => sum + it.qty * priceFor(it.menuItemId), 0) || 0
  }
  const selectedTotal = useMemo(() => {
    if (itemLevelSplit) {
      // Calcular total basado en productos individuales seleccionados
      return selectedItems.reduce((sum, { orderId, itemIndex }) => {
        const order = unpaidOrders.find(o => o.id === orderId)
        if (!order) return sum
        
        if (backendOrders.length > 0) {
          const item = order.orderItems?.[itemIndex]
          return sum + (item ? item.quantity * item.product.price : 0)
        } else {
          const item = order.items?.[itemIndex]
          const menuItem = menu.find(m => m.id === item?.menuItemId)
          return sum + (menuItem && item ? menuItem.price * item.qty : 0)
        }
      }, 0)
    } else {
      // Calcular total basado en pedidos completos seleccionados
      const selected = unpaidOrders.filter((o) => selectedOrderIds.includes(o.id))
      return selected.reduce((sum, o) => sum + orderTotal(o), 0)
    }
  }, [selectedOrderIds, selectedItems, itemLevelSplit, unpaidOrders, menu, backendOrders])

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
            
            {/* Mostrar menú agrupado por categorías cuando no hay filtro activo */}
            {filter === 'todos' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {menuByCategories.map((category) => (
                  <div key={category.key}>
                    <h4 style={{
                      margin: '0 0 12px 0',
                      color: '#1f2937',
                      fontSize: '16px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      borderBottom: '2px solid #e5e7eb',
                      paddingBottom: '8px'
                    }}>
                      <span>{category.emoji}</span>
                      {category.name}
                    </h4>
                    <ul className="menu-list" style={{ 
                      listStyle: 'none', 
                      padding: 0, 
                      margin: 0, 
                      display: 'grid', 
                      gap: '12px' 
                    }}>
                      {category.items.map((item) => (
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
                              {!item.active && (
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
                            disabled={!item.active} 
                            onClick={(e) => { e.stopPropagation(); updateQty(item.id, 1) }}
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              border: 'none',
                              backgroundColor: item.active ? '#3b82f6' : '#d1d5db',
                              color: 'white',
                              fontSize: '20px',
                              fontWeight: 'bold',
                              cursor: item.active ? 'pointer' : 'not-allowed',
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
                  </div>
                ))}
              </div>
            ) : (
              /* Mostrar lista filtrada cuando hay un filtro activo */
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
                        {!item.active && (
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
                      disabled={!item.active} 
                      onClick={(e) => { e.stopPropagation(); updateQty(item.id, 1) }}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        border: 'none',
                        backgroundColor: item.active ? '#3b82f6' : '#d1d5db',
                        color: 'white',
                        fontSize: '20px',
                        fontWeight: 'bold',
                        cursor: item.active ? 'pointer' : 'not-allowed',
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
            )}
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
                
                {/* Selector de acompañamiento principal */}
                {selected?.hasAccompaniments !== false && (
                  <div className="product-options" style={{ marginTop: 8 }}>
                    {/* Mostrar acompañamientos por defecto si existen */}
                    {selected?.defaultAccompaniments && selected.defaultAccompaniments.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontWeight: 600, marginBottom: 4, fontSize: '14px' }}>Acompañamientos incluidos:</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                          {selected.defaultAccompaniments.map((acc) => (
                            <button
                              key={acc}
                              onClick={() => {
                                setModalSide(prev => 
                                  prev === acc ? '' : acc
                                )
                              }}
                              style={{
                                padding: '4px 8px',
                                fontSize: '12px',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                backgroundColor: modalSide === acc ? '#3b82f6' : '#f3f4f6',
                                color: modalSide === acc ? 'white' : '#374151',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              {acc}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Campo de texto para acompañamiento personalizado */}
                    <input 
                      type="text" 
                      placeholder="Otro acompañamiento personalizado..." 
                      value={modalSide && !selected?.defaultAccompaniments?.includes(modalSide) ? modalSide : ''} 
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
                )}
                
                {/* Sugerencia para cocina o acompañamiento adicional */}
                <div style={{ marginTop: 8 }}>
                  <textarea 
                    placeholder="Sugerencia para cocina o acompañamiento adicional (ej: sin sal, término medio, extra queso, etc.)" 
                    value={modalComments} 
                    onChange={(e) => setModalComments(e.target.value)}
                    className="mobile-textarea"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      minHeight: '80px',
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
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={`Confirmar pago efectivo mesa ${tableId}`} onClick={() => setPayOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Confirmar pago efectivo — Mesa {tableId}</div>
              <button className="modal-close" aria-label="Cerrar" onClick={() => setPayOpen(false)}>×</button>
            </div>
            <div className="modal-body" style={{ gridTemplateColumns: '1fr' }}>
              <div className="modal-info">
                <div>Seleccione los pedidos impagos que se van a pagar:</div>
                <div style={{ marginTop: 8 }}>
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
                <div style={{ marginTop: 8, fontWeight: 700 }}>
                  Total: ${selectedTotal}
                </div>
                <div style={{ marginTop: 8 }}>
                  <input 
                    type="number" 
                    placeholder="Monto recibido en efectivo" 
                    value={cashAmount} 
                    onChange={(e) => setCashAmount(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                {cashAmount && selectedTotal > 0 && (
                  <div style={{ marginTop: 8 }}>
                    {(parseFloat(cashAmount) || 0) >= selectedTotal ? (
                      <div style={{ fontSize: '14px', color: '#059669', fontWeight: 600 }}>
                        Vuelto: ${Math.max(0, (parseFloat(cashAmount) || 0) - selectedTotal)}
                      </div>
                    ) : (
                      <div style={{ fontSize: '14px', color: '#dc2626', fontWeight: 600 }}>
                        Falta: ${selectedTotal - (parseFloat(cashAmount) || 0)} (se pagará con Webpay)
                      </div>
                    )}
                  </div>
                )}
                <div className="product-actions" style={{ marginTop: 16 }}>
                  <button onClick={() => setPayOpen(false)}>Cancelar</button>
                  <button
                    className="primary"
                    disabled={selectedOrderIds.length === 0 || !cashAmount || (parseFloat(cashAmount) || 0) <= 0}
                    onClick={async () => {
                      const cashAmountNum = parseFloat(cashAmount) || 0
                      const remainingAmount = selectedTotal - cashAmountNum
                      
                      if (cashAmountNum >= selectedTotal) {
                        // Pago completo en efectivo
                        if (backendOrders.length > 0) {
                          // Para pedidos del backend, enviar solicitud al servidor
                          selectedOrderIds.forEach(async (orderId) => {
                            try {
                              const token = localStorage.getItem('token')
                              await fetch(`/api/orders/${orderId}/payment`, {
                                method: 'PATCH',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({ paymentStatus: 'PAID' })
                              })
                            } catch (error) {
                              console.error('Error updating payment status:', error)
                            }
                          })
                        } else {
                          // Para pedidos locales
                          selectedOrderIds.forEach((id) => setPaymentStatus(id, 'pagado'))
                        }
                        
                        setPayOpen(false)
                        setSelectedOrderIds([])
                        setCashAmount('')
                        
                        // Recargar pedidos del backend
                        loadBackendOrders()
                      } else {
                        // Pago mixto: efectivo + Webpay
                        alert(`Pago mixto: $${cashAmountNum} en efectivo recibido. Proceder con Webpay por $${remainingAmount}`)
                        
                        // Aquí se integraría con Webpay para el monto restante
                        // Por ahora, simulamos que el pago fue exitoso
                        if (confirm(`¿Confirmar pago Webpay de $${remainingAmount}?`)) {
                          if (backendOrders.length > 0) {
                            selectedOrderIds.forEach(async (orderId) => {
                              try {
                                const token = localStorage.getItem('token')
                                await fetch(`/api/orders/${orderId}/payment`, {
                                  method: 'PATCH',
                                  headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                  },
                                  body: JSON.stringify({ 
                                    paymentStatus: 'PAID',
                                    paymentMethod: 'mixed',
                                    cashAmount: cashAmountNum,
                                    webpayAmount: remainingAmount
                                  })
                                })
                              } catch (error) {
                                console.error('Error updating payment status:', error)
                              }
                            })
                          } else {
                            selectedOrderIds.forEach((id) => setPaymentStatus(id, 'pagado'))
                          }
                          
                          setPayOpen(false)
                          setSelectedOrderIds([])
                          setCashAmount('')
                          
                          // Recargar pedidos del backend
                          loadBackendOrders()
                        }
                      }
                    }}
                  >
                    {(parseFloat(cashAmount) || 0) >= selectedTotal 
                      ? '💰 Confirmar pago en efectivo' 
                      : '💳 Confirmar pago mixto (Efectivo + Webpay)'
                    }
                  </button>
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
              // Usar pedidos del backend si están disponibles, sino usar localStorage como fallback
              const localOrders = getOrdersForTable(tableId).filter((o) => o.paymentStatus !== 'pagado')
              const hasBackendOrders = backendOrders.length > 0
              const unpaidBackendOrders = backendOrders.filter(o => o.paymentStatus !== 'PAID')
              
              // Determinar qué pedidos usar para el resumen
              const ordersToUse = hasBackendOrders ? unpaidBackendOrders : localOrders
              
              if (ordersToUse.length === 0) return (
                <p style={{ 
                  color: '#6b7280', 
                  fontStyle: 'italic',
                  textAlign: 'center',
                  padding: '20px 0'
                }}>
                  Sin consumos pendientes
                </p>
              )
              
              const agg: Record<string, { qty: number; name: string; price: number }> = {}
              let total = 0
              
              if (hasBackendOrders) {
                // Procesar pedidos del backend
                unpaidBackendOrders.forEach((order: any) => {
                  order.orderItems.forEach((item: any) => {
                    const key = item.product.id
                    if (!agg[key]) {
                      agg[key] = { qty: 0, name: item.product.name, price: item.product.price }
                    }
                    agg[key].qty += item.quantity
                    total += item.quantity * item.product.price
                  })
                })
              } else {
                // Procesar pedidos locales
                localOrders.forEach((order) => {
                  order.items.forEach((item: OrderItem) => {
                    const menuItem = menu.find((m) => m.id === item.menuItemId)
                    const key = item.menuItemId
                    if (!agg[key]) {
                      agg[key] = { 
                        qty: 0, 
                        name: menuItem?.name || item.menuItemId, 
                        price: menuItem?.price || 0 
                      }
                    }
                    agg[key].qty += item.qty
                    total += item.qty * (menuItem?.price || 0)
                  })
                })
              }
              
              return (
                <div>
                  <ul style={{ 
                    listStyle: 'none', 
                    padding: 0, 
                    margin: '0 0 16px 0' 
                  }}>
                    {Object.entries(agg).map(([id, { qty, name, price }]) => (
                      <li key={id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 0',
                        borderBottom: '1px solid #f3f4f6'
                      }}>
                        <span style={{ color: '#374151' }}>
                          {name} x {qty}
                        </span>
                        <span style={{ 
                          fontWeight: '600', 
                          color: '#059669' 
                        }}>
                          ${qty * price}
                        </span>
                      </li>
                    ))}
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
            // Usar pedidos del backend si están disponibles, sino usar localStorage como fallback
            const localOrders = getOrdersForTable(tableId).filter(o => o.status !== 'entregado')
            const activeOrders = backendOrders.length > 0 
              ? backendOrders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED')
              : localOrders
            
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
                      // Adaptar formato según si es del backend o localStorage
                      const isBackendOrder = backendOrders.length > 0
                      const orderItems = isBackendOrder ? order.orderItems : order.items
                      const total = isBackendOrder 
                        ? orderItems.reduce((sum: number, item: any) => sum + item.quantity * item.product.price, 0)
                        : orderItems.reduce((sum: number, it: any) => sum + it.qty * (menu.find((m) => m.id === it.menuItemId)?.price || 0), 0)
                      
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
                                  (isBackendOrder ? order.status === 'PENDING' : order.status === 'pendiente') ? '#fef3c7' :
                                  (isBackendOrder ? order.status === 'PREPARING' : order.status === 'en_cocina') ? '#fed7aa' :
                                  (isBackendOrder ? order.status === 'READY' : order.status === 'listo') ? '#dcfce7' : '#f3f4f6',
                                color: 
                                  (isBackendOrder ? order.status === 'PENDING' : order.status === 'pendiente') ? '#92400e' :
                                  (isBackendOrder ? order.status === 'PREPARING' : order.status === 'en_cocina') ? '#c2410c' :
                                  (isBackendOrder ? order.status === 'READY' : order.status === 'listo') ? '#166534' : '#374151'
                              }}>
                                {(isBackendOrder ? order.status === 'PENDING' : order.status === 'pendiente') && '⏳ Pendiente'}
                                {(isBackendOrder ? order.status === 'PREPARING' : order.status === 'en_cocina') && '👨‍🍳 En Cocina'}
                                {(isBackendOrder ? order.status === 'READY' : order.status === 'listo') && '✅ Listo para retirar'}
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
                              {orderItems.map((item: any) => (
                                <li key={isBackendOrder ? item.id : item.menuItemId} style={{ 
                                  fontSize: '13px', 
                                  color: '#6b7280',
                                  display: 'flex',
                                  justifyContent: 'space-between'
                                }}>
                                  <span>
                                    {isBackendOrder 
                                      ? item.product.name 
                                      : (menu.find((m) => m.id === item.menuItemId)?.name || item.menuItemId)
                                    }
                                  </span>
                                  <span>x{isBackendOrder ? item.quantity : item.qty}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          {(isBackendOrder ? order.status === 'READY' : order.status === 'listo') && (
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