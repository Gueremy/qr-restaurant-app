import { statements } from './browser-database';
import type { MenuItem, Order, OrderItem, OrderStatus, PaymentStatus, OrderItemOptions } from './store';

// Tipos para las filas de la base de datos
interface MenuItemRow {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  tags: string | null;
  variants: string | null;
  in_stock: number;
}

interface OrderRow {
  id: string;
  table_id: string;
  status: string;
  created_at: string;
  editable_until: string | null;
  notes: string | null;
  suggestions: string | null;
  questions: string | null;
  eta_minutes: number | null;
  payment_status: string | null;
  waiter_notes: string | null;
}

interface OrderItemRow {
  menu_item_id: string;
  qty: number;
  options: string | null;
}

interface MessageRow {
  id: string;
  table_id: string;
  from_sender: string;
  text: string;
  created_at: string;
}

export type Message = {
  id: string;
  tableId: string;
  from: 'cocina' | 'mesero';
  text: string;
  createdAt: string;
};

// Store listeners
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());
export const onStoreChange = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

// Funciones para el menú
export function getMenu(): MenuItem[] {
  try {
    const rows = statements.getMenuItems.all() as MenuItemRow[];
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      price: row.price,
      image: row.image || undefined,
      tags: Array.isArray(row.tags) ? row.tags : (row.tags ? JSON.parse(row.tags) : []),
        variants: Array.isArray(row.variants) ? row.variants : (row.variants ? JSON.parse(row.variants) : []),
      active: Boolean(row.in_stock)
    }));
  } catch (error) {
    console.error('Error getting menu:', error);
    return [];
  }
}

export function setMenu(menu: MenuItem[]) {
  try {
    // Eliminar todos los items existentes
    statements.deleteMenuItem.run();
    
    // Insertar los nuevos items
    for (const item of menu) {
      statements.insertMenuItem.run(
        item.id,
        item.name,
        item.description || null,
        item.price,
        item.image || null,
        JSON.stringify(item.tags || []),
        JSON.stringify(item.variants || []),
        item.active ? 1 : 0
      );
    }
    
    notify();
  } catch (error) {
    console.error('Error setting menu:', error);
  }
}

// Funciones para pedidos
export function getOrders(): Order[] {
  try {
    const orderRows = statements.getOrders.all() as OrderRow[];
    const orders: Order[] = [];

    for (const orderRow of orderRows) {
      const itemRows = statements.getOrderItems.all(orderRow.id) as OrderItemRow[];
      const items: OrderItem[] = itemRows.map(itemRow => ({
        menuItemId: itemRow.menu_item_id,
        qty: itemRow.qty,
        options: itemRow.options ? JSON.parse(itemRow.options) : undefined
      }));

      orders.push({
        id: orderRow.id,
        tableId: orderRow.table_id,
        items,
        status: orderRow.status as OrderStatus,
        createdAt: orderRow.created_at,
        editableUntil: orderRow.editable_until || undefined,
        notes: orderRow.notes || undefined,
        suggestions: orderRow.suggestions || undefined,
        questions: orderRow.questions || undefined,
        etaMinutes: orderRow.eta_minutes || undefined,
        paymentStatus: (orderRow.payment_status as PaymentStatus) || 'pendiente',
        waiterNotes: orderRow.waiter_notes || undefined,
        total: 0, // Will be calculated based on items
        timestamp: orderRow.created_at
      });
    }

    return orders;
  } catch (error) {
    console.error('Error getting orders:', error);
    return [];
  }
}

export function addOrder(tableId: string, items: OrderItem[]): Order {
  try {
    const orderId = `${Date.now()}`;
    const createdAt = new Date().toISOString();
    const editableUntil = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutos

    // Insertar el pedido
    statements.insertOrder.run(
      orderId,
      tableId,
      'pendiente',
      createdAt,
      editableUntil,
      null, // notes
      null, // suggestions
      null, // questions
      null, // eta_minutes
      'pendiente', // payment_status
      null // waiter_notes
    );

    // Insertar los items del pedido
    for (const item of items) {
      statements.insertOrderItem.run(
        orderId,
        item.menuItemId,
        item.qty,
        item.options ? JSON.stringify(item.options) : ''
      );
    }

    const order: Order = {
      id: orderId,
      tableId,
      items,
      status: 'pendiente',
      createdAt,
      editableUntil,
      paymentStatus: 'pendiente',
      total: 0, // Will be calculated based on items
      timestamp: createdAt
    };

    notify();
    return order;
  } catch (error) {
    console.error('Error adding order:', error);
    throw error;
  }
}

export function updateOrderStatus(orderId: string, status: OrderStatus) {
  try {
    statements.updateOrderStatus.run(status, orderId);
    notify();
  } catch (error) {
    console.error('Error updating order status:', error);
  }
}

export function updateOrderDetails(orderId: string, items: OrderItem[], notes?: string, suggestions?: string, questions?: string) {
  try {
    // Actualizar notas del pedido
    statements.updateOrderDetails.run(
      notes || null,
      suggestions || null,
      questions || null,
      orderId
    );

    // Eliminar items existentes
    statements.deleteOrderItems.run(orderId);

    // Insertar nuevos items
    for (const item of items) {
      statements.insertOrderItem.run(
        orderId,
        item.menuItemId,
        item.qty,
        item.options ? JSON.stringify(item.options) : ''
      );
    }

    notify();
  } catch (error) {
    console.error('Error updating order details:', error);
  }
}

export function addWaiterNote(orderId: string, note: string) {
  try {
    // Obtener notas existentes
    const existingOrder = statements.getOrder.get(orderId) as OrderRow | undefined;
    const existingNotes = existingOrder?.waiter_notes || '';
    
    const timestamp = new Date().toLocaleTimeString();
    const newNote = `[${timestamp}] ${note}`;
    const updatedNotes = existingNotes 
      ? `${existingNotes}\n${newNote}`
      : newNote;

    statements.updateOrderWaiterNotes.run(updatedNotes, orderId);
    notify();
  } catch (error) {
    console.error('Error adding waiter note:', error);
  }
}

export function cancelOrder(orderId: string) {
  try {
    // Eliminar items del pedido
    statements.deleteOrderItems.run(orderId);
    
    // Eliminar el pedido
    statements.deleteOrder.run(orderId);
    
    notify();
  } catch (error) {
    console.error('Error canceling order:', error);
  }
}

export function setEta(orderId: string, minutes: number) {
  try {
    statements.updateOrderEta.run(minutes, orderId);
    notify();
  } catch (error) {
    console.error('Error setting ETA:', error);
  }
}

export function setPaymentStatus(orderId: string, status: PaymentStatus) {
  try {
    statements.updateOrderPaymentStatus.run(status, orderId);
    
    // Si el pago se completó, verificar si todos los pedidos de la mesa están pagados
    if (status === 'pagado') {
      // Obtener el pedido para saber qué mesa es
      const orderRow = statements.getOrder.get(orderId) as OrderRow | undefined;
      if (orderRow) {
        const tableId = orderRow.table_id;
        
        // Verificar si todos los pedidos de la mesa están pagados
        const allOrders = getOrdersForTable(tableId);
        const allPaid = allOrders.every(order => order.paymentStatus === 'pagado');
        
        if (allPaid) {
          // Marcar mesa como OUT_OF_SERVICE para limpieza
          updateTableStatusToOutOfService(tableId);
        }
      }
    }
    
    notify();
  } catch (error) {
    console.error('Error setting payment status:', error);
  }
}

// Función auxiliar para cambiar el estado de la mesa a OUT_OF_SERVICE
async function updateTableStatusToOutOfService(tableId: string) {
  try {
    // Obtener información de la mesa para obtener su ID
    const tablesResponse = await fetch('/api/tables');
    if (tablesResponse.ok) {
      const tablesData = await tablesResponse.json();
      const tables = tablesData.data || [];
      const currentTable = tables.find((table: any) => table.number.toString() === tableId);
      
      if (currentTable) {
        // Actualizar estado de la mesa a OUT_OF_SERVICE
        const updateResponse = await fetch(`/api/tables/${currentTable.id}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'OUT_OF_SERVICE' }),
        });
        
        if (updateResponse.ok) {
          console.log(`Mesa ${tableId} marcada como OUT_OF_SERVICE para limpieza`);
        } else {
          console.error('Error al actualizar estado de mesa a OUT_OF_SERVICE');
        }
      }
    }
  } catch (error) {
    console.error('Error updating table status to OUT_OF_SERVICE:', error);
  }
}

export function setTablePaid(tableId: string) {
  try {
    statements.setTablePaid.run('pagado', tableId);
    notify();
  } catch (error) {
    console.error('Error setting table paid:', error);
  }
}

export function getOrdersForTable(tableId: string): Order[] {
  try {
    const orderRows = statements.getOrdersForTable.all(tableId) as OrderRow[];
    const orders: Order[] = [];

    for (const orderRow of orderRows) {
      const itemRows = statements.getOrderItems.all(orderRow.id) as OrderItemRow[];
      const items: OrderItem[] = itemRows.map(itemRow => ({
        menuItemId: itemRow.menu_item_id,
        qty: itemRow.qty,
        options: itemRow.options ? JSON.parse(itemRow.options) : undefined
      }));

      orders.push({
        id: orderRow.id,
        tableId: orderRow.table_id,
        items,
        status: orderRow.status as OrderStatus,
        createdAt: orderRow.created_at,
        editableUntil: orderRow.editable_until || undefined,
        notes: orderRow.notes || undefined,
        suggestions: orderRow.suggestions || undefined,
        questions: orderRow.questions || undefined,
        etaMinutes: orderRow.eta_minutes || undefined,
        paymentStatus: (orderRow.payment_status as PaymentStatus) || 'pendiente',
        waiterNotes: orderRow.waiter_notes || undefined,
        total: 0, // Will be calculated based on items
        timestamp: orderRow.created_at
      });
    }

    return orders;
  } catch (error) {
    console.error('Error getting orders for table:', error);
    return [];
  }
}

// Funciones para mensajes
export function getMessagesForTable(tableId: string): Message[] {
  try {
    const rows = statements.getMessagesForTable.all(tableId) as MessageRow[];
    return rows.map(row => ({
      id: row.id,
      tableId: row.table_id,
      from: row.from_sender as 'cocina' | 'mesero',
      text: row.text,
      createdAt: row.created_at
    }));
  } catch (error) {
    console.error('Error getting messages for table:', error);
    return [];
  }
}

export function sendMessageToTable(tableId: string, from: 'cocina' | 'mesero', text: string) {
  try {
    const messageId = `${Date.now()}`;
    const createdAt = new Date().toISOString();
    
    statements.insertMessage.run(messageId, tableId, from, text, createdAt);
    notify();
  } catch (error) {
    console.error('Error sending message to table:', error);
  }
}

export function getAllMessages(): Message[] {
  try {
    const rows = statements.getAllMessages.all() as MessageRow[];
    return rows.map(row => ({
      id: row.id,
      tableId: row.table_id,
      from: row.from_sender as 'cocina' | 'mesero',
      text: row.text,
      createdAt: row.created_at
    }));
  } catch (error) {
    console.error('Error getting all messages:', error);
    return [];
  }
}

export function getLatestOrderForTable(tableId: string): Order | undefined {
  try {
    const orders = getOrdersForTable(tableId);
    return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  } catch (error) {
    console.error('Error getting latest order for table:', error);
    return undefined;
  }
}

export type { MenuItem, Order, OrderItem, OrderStatus, PaymentStatus, OrderItemOptions };