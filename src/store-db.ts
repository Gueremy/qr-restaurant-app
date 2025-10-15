import { statements } from './browser-database';
import type { MenuItem, Order, OrderItem, OrderStatus, PaymentStatus, OrderItemOptions } from './store';

// Tipo para mensajes (movido desde store.ts)
export type Message = {
  id: string;
  tableId: string;
  from: 'cocina' | 'mesero';
  text: string;
  createdAt: string;
};

// Sistema de notificaciones (igual que en store.ts)
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());
export const onStoreChange = (cb: () => void) => {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
};

// Funciones para el menú
export function getMenu(): MenuItem[] {
  try {
    const rows = statements.getMenuItems.all() as any[];
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      price: row.price,
      image: row.image || undefined,
      tags: row.tags ? JSON.parse(row.tags) : [],
      variants: row.variants ? JSON.parse(row.variants) : [],
      inStock: Boolean(row.in_stock)
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
        item.inStock ? 1 : 0
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
    const orderRows = statements.getOrders.all() as any[];
    const orders: Order[] = [];

    for (const orderRow of orderRows) {
      const itemRows = statements.getOrderItems.all(orderRow.id) as any[];
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
        waiterNotes: orderRow.waiter_notes || undefined
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
    const editableUntil = new Date(Date.now() + 3 * 60 * 1000).toISOString();

    // Insertar el pedido
    statements.insertOrder.run(
      orderId,
      tableId,
      'pendiente',
      createdAt,
      editableUntil,
      null,
      null,
      null,
      null,
      'pendiente',
      null
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
      paymentStatus: 'pendiente'
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
    const orders = getOrders();
    const order = orders.find(o => o.id === orderId);
    
    if (order) {
      const now = new Date();
      const editableUntil = order.editableUntil ? new Date(order.editableUntil) : undefined;
      
      if (!editableUntil || now <= editableUntil) {
        // Actualizar detalles del pedido
        statements.updateOrderDetails.run(notes || null, suggestions || null, questions || null, orderId);
        
        // Actualizar items del pedido
        statements.deleteOrderItems.run(orderId);
        for (const item of items) {
          statements.insertOrderItem.run(
            orderId,
            item.menuItemId,
            item.qty,
            item.options ? JSON.stringify(item.options) : ''
          );
        }
        
        notify();
      }
    }
  } catch (error) {
    console.error('Error updating order details:', error);
  }
}

export function addWaiterNote(orderId: string, note: string) {
  try {
    const orders = getOrders();
    const order = orders.find(o => o.id === orderId);
    
    if (order) {
      const currentNotes = order.waiterNotes || '';
      const timestamp = new Date().toLocaleString();
      const newNote = currentNotes 
        ? `${currentNotes}\n[${timestamp}] ${note}`
        : `[${timestamp}] ${note}`;
      
      statements.updateOrderWaiterNotes.run(newNote, orderId);
      notify();
    }
  } catch (error) {
    console.error('Error adding waiter note:', error);
  }
}

export function cancelOrder(orderId: string) {
  try {
    const orders = getOrders();
    const order = orders.find(o => o.id === orderId);
    
    if (order) {
      const now = new Date();
      const editableUntil = order.editableUntil ? new Date(order.editableUntil) : undefined;
      
      if (!editableUntil || now <= editableUntil) {
        statements.deleteOrder.run(orderId);
        notify();
      }
    }
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
    notify();
  } catch (error) {
    console.error('Error setting payment status:', error);
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
    const orderRows = statements.getOrdersForTable.all(tableId) as any[];
    const orders: Order[] = [];

    for (const orderRow of orderRows) {
      const itemRows = statements.getOrderItems.all(orderRow.id) as any[];
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
        waiterNotes: orderRow.waiter_notes || undefined
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
    const rows = statements.getMessagesForTable.all(tableId) as any[];
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
    const rows = statements.getAllMessages.all() as any[];
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
    return orders.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
  } catch (error) {
    console.error('Error getting latest order for table:', error);
    return undefined;
  }
}

// Re-exportar tipos para compatibilidad
export type { MenuItem, Order, OrderItem, OrderStatus, PaymentStatus, OrderItemOptions };