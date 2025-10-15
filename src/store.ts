export type MenuItem = {
  id: string
  name: string
  description?: string
  price: number
  image?: string
  tags?: string[]
  variants?: string[]
  inStock: boolean
  category?: string
}

export type OrderItemOptions = {
  side?: string
  variant?: string
  comments?: string
  accompaniments?: string[]
}
export type OrderItem = {
  menuItemId: string
  qty: number
  options?: OrderItemOptions
}

export type OrderStatus = 'pendiente' | 'en_cocina' | 'listo' | 'entregado'

export type PaymentStatus = 'pendiente' | 'pagado'
export type Order = {
  id: string
  tableId: string
  items: OrderItem[]
  status: OrderStatus
  createdAt: string
  editableUntil?: string
  notes?: string
  suggestions?: string
  questions?: string
  etaMinutes?: number
  paymentStatus?: PaymentStatus
  waiterNotes?: string // Observaciones del mesero
}

const MENU_KEY = 'qr_menu'
const ORDERS_KEY = 'qr_orders'

const listeners = new Set<() => void>()
const notify = () => listeners.forEach((fn) => fn())
export const onStoreChange = (cb: () => void) => {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function seedMenuIfEmpty() {
  if (!localStorage.getItem(MENU_KEY)) {
    const seed: MenuItem[] = [
      { id: '1', name: 'Hamburguesa Clásica', price: 5500, tags: [], inStock: true },
      { id: '2', name: 'Ensalada Vegana', price: 4800, tags: ['vegano'], inStock: true },
      { id: '3', name: 'Pasta sin Gluten', price: 6000, tags: ['sin_gluten'], inStock: true },
      { id: '4', name: 'Bebida', price: 1800, tags: [], inStock: true },
    ]
    localStorage.setItem(MENU_KEY, JSON.stringify(seed))
  }
}

export function getMenu(): MenuItem[] {
  seedMenuIfEmpty()
  try {
    const raw = localStorage.getItem(MENU_KEY)
    return raw ? (JSON.parse(raw) as MenuItem[]) : []
  } catch {
    return []
  }
}

export function setMenu(menu: MenuItem[]) {
  localStorage.setItem(MENU_KEY, JSON.stringify(menu))
  notify()
}

export function getOrders(): Order[] {
  try {
    const raw = localStorage.getItem(ORDERS_KEY)
    return raw ? (JSON.parse(raw) as Order[]) : []
  } catch {
    return []
  }
}

function saveOrders(orders: Order[]) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders))
  notify()
}

export function addOrder(tableId: string, items: OrderItem[]): Order {
  const orders = getOrders()
  const order: Order = {
    id: `${Date.now()}`,
    tableId,
    items,
    status: 'pendiente',
    createdAt: new Date().toISOString(),
    editableUntil: new Date(Date.now() + 3 * 60 * 1000).toISOString(),
    paymentStatus: 'pendiente',
  }
  orders.push(order)
  saveOrders(orders)
  return order
}

export function updateOrderStatus(orderId: string, status: OrderStatus) {
  const orders = getOrders()
  const idx = orders.findIndex((o) => o.id === orderId)
  if (idx >= 0) {
    orders[idx].status = status
    saveOrders(orders)
  }
}

export function updateOrderDetails(orderId: string, items: OrderItem[], notes?: string, suggestions?: string, questions?: string) {
  const orders = getOrders()
  const idx = orders.findIndex((o) => o.id === orderId)
  if (idx >= 0) {
    const now = new Date()
    const editableUntil = orders[idx].editableUntil ? new Date(orders[idx].editableUntil) : undefined
    if (!editableUntil || now <= editableUntil) {
      orders[idx].items = items
      orders[idx].notes = notes
      orders[idx].suggestions = suggestions
      orders[idx].questions = questions
      saveOrders(orders)
    }
  }
}

// Nueva función para agregar observaciones del mesero
export function addWaiterNote(orderId: string, note: string) {
  const orders = getOrders()
  const idx = orders.findIndex((o) => o.id === orderId)
  if (idx >= 0) {
    const currentNotes = orders[idx].waiterNotes || ''
    const timestamp = new Date().toLocaleString()
    const newNote = currentNotes 
      ? `${currentNotes}\n[${timestamp}] ${note}`
      : `[${timestamp}] ${note}`
    orders[idx].waiterNotes = newNote
    saveOrders(orders)
  }
}

export function cancelOrder(orderId: string) {
  const orders = getOrders()
  const idx = orders.findIndex((o) => o.id === orderId)
  if (idx >= 0) {
    const now = new Date()
    const editableUntil = orders[idx].editableUntil ? new Date(orders[idx].editableUntil) : undefined
    if (!editableUntil || now <= editableUntil) {
      orders.splice(idx, 1)
      saveOrders(orders)
    }
  }
}

export function setEta(orderId: string, minutes: number) {
  const orders = getOrders()
  const idx = orders.findIndex((o) => o.id === orderId)
  if (idx >= 0) {
    orders[idx].etaMinutes = minutes
    saveOrders(orders)
  }
}

export function setPaymentStatus(orderId: string, status: PaymentStatus) {
  const orders = getOrders()
  const idx = orders.findIndex((o) => o.id === orderId)
  if (idx >= 0) {
    orders[idx].paymentStatus = status
    saveOrders(orders)
  }
}

// Marcar todos los pedidos de una mesa como pagados
export function setTablePaid(tableId: string) {
  const orders = getOrders()
  const updated = orders.map((o) => (o.tableId === tableId ? { ...o, paymentStatus: 'pagado' as PaymentStatus } : o))
  saveOrders(updated)
}

// Obtener pedidos de una mesa
export function getOrdersForTable(tableId: string): Order[] {
  return getOrders().filter((o) => o.tableId === tableId)
}

// Mensajes por mesa (cocina/mesero -> cliente). Usamos 'mesero' también para solicitudes al mesero.
type Message = { id: string; tableId: string; from: 'cocina' | 'mesero'; text: string; createdAt: string }
const MESSAGES_KEY = 'qr_messages'
export function getMessagesForTable(tableId: string): Message[] {
  try {
    const raw = localStorage.getItem(MESSAGES_KEY)
    const all = raw ? (JSON.parse(raw) as Message[]) : []
    return all.filter((m) => m.tableId === tableId)
  } catch {
    return []
  }
}
export function sendMessageToTable(tableId: string, from: 'cocina' | 'mesero', text: string) {
  const raw = localStorage.getItem(MESSAGES_KEY)
  const all = raw ? (JSON.parse(raw) as Message[]) : []
  const msg: Message = { id: `${Date.now()}`, tableId, from, text, createdAt: new Date().toISOString() }
  all.push(msg)
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(all))
  notify()
}

// Obtener todos los mensajes (para el panel de mesero)
export function getAllMessages(): Message[] {
  try {
    const raw = localStorage.getItem(MESSAGES_KEY)
    return raw ? (JSON.parse(raw) as Message[]) : []
  } catch {
    return []
  }
}

export function getLatestOrderForTable(tableId: string): Order | undefined {
  const orders = getOrders().filter((o) => o.tableId === tableId)
  return orders.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0]
}