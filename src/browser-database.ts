// Browser-compatible database implementation using localStorage

// Type definitions
export type Message = {
  id: string;
  tableId: string;
  from: 'cocina' | 'mesero';
  text: string;
  createdAt: string;
};

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  tags: string;
  variants: string;
  in_stock: number;
}

interface Order {
  id: string;
  table_id: string;
  status: string;
  created_at: string;
  editable_until: string;
  notes: string | null;
  suggestions: string | null;
  questions: string | null;
  eta_minutes: number | null;
  payment_status: string;
  waiter_notes: string | null;
}

interface OrderItem {
  order_id: string;
  menu_item_id: string;
  qty: number;
  options: string;
}

interface StoredMessage {
  id: string;
  table_id: string;
  from_sender: string;
  text: string;
  created_at: string;
}

// Storage keys
const STORAGE_KEYS = {
  MENU_ITEMS: 'restaurant_menu_items',
  ORDERS: 'restaurant_orders',
  ORDER_ITEMS: 'restaurant_order_items',
  MESSAGES: 'restaurant_messages'
};

// Helper functions for localStorage operations
function getFromStorage<T>(key: string, defaultValue: T[] = []): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage key ${key}:`, error);
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving to localStorage key ${key}:`, error);
  }
}

// Initialize database with sample data if empty
function initializeDatabase() {
  const menuItems = getFromStorage(STORAGE_KEYS.MENU_ITEMS);
  if (menuItems.length === 0) {
    seedMenuIfEmpty();
  }
}

function seedMenuIfEmpty() {
  const sampleMenu = [
    {
      id: '1',
      name: 'Hamburguesa Clásica',
      description: 'Carne de res, lechuga, tomate, cebolla y salsa especial',
      price: 12.99,
      image: undefined,
      tags: ['principal', 'carne'],
      variants: [
        { name: 'Tamaño', options: ['Normal', 'Grande'], required: true },
        { name: 'Punto de cocción', options: ['Poco hecho', 'Término medio', 'Bien cocido'], required: true }
      ],
      in_stock: 1
    },
    {
      id: '2',
      name: 'Pizza Margherita',
      description: 'Salsa de tomate, mozzarella fresca y albahaca',
      price: 15.50,
      image: undefined,
      tags: ['principal', 'vegetariano'],
      variants: [
        { name: 'Tamaño', options: ['Personal', 'Mediana', 'Familiar'], required: true }
      ],
      in_stock: 1
    },
    {
      id: '3',
      name: 'Ensalada César',
      description: 'Lechuga romana, crutones, parmesano y aderezo césar',
      price: 9.99,
      image: undefined,
      tags: ['ensalada', 'vegetariano'],
      variants: [
        { name: 'Proteína adicional', options: ['Sin proteína', 'Pollo', 'Camarones'], required: false }
      ],
      in_stock: 1
    }
  ];
  
  saveToStorage(STORAGE_KEYS.MENU_ITEMS, sampleMenu);
}

// Database statements simulation
export const statements = {
  // Menu items
  getMenuItems: {
    all: () => getFromStorage(STORAGE_KEYS.MENU_ITEMS)
  },
  
  insertMenuItem: {
    run: (id: string, name: string, description: string | null, price: number, image: string | null, tags: string, variants: string, inStock: number) => {
      const menuItems = getFromStorage(STORAGE_KEYS.MENU_ITEMS);
      const newItem = {
        id,
        name,
        description,
        price,
        image,
        tags: JSON.parse(tags),
        variants: JSON.parse(variants),
        in_stock: inStock
      };
      menuItems.push(newItem);
      saveToStorage(STORAGE_KEYS.MENU_ITEMS, menuItems);
    }
  },
  
  updateMenuItem: {
    run: (name: string, description: string | null, price: number, image: string | null, tags: string, variants: string, inStock: number, id: string) => {
      const menuItems = getFromStorage(STORAGE_KEYS.MENU_ITEMS) as MenuItem[];
      const index = menuItems.findIndex((item: MenuItem) => item.id === id);
      if (index !== -1) {
        menuItems[index] = {
          id,
          name,
          description,
          price,
          image,
          tags: JSON.parse(tags),
          variants: JSON.parse(variants),
          in_stock: inStock
        };
        saveToStorage(STORAGE_KEYS.MENU_ITEMS, menuItems);
      }
    }
  },
  
  deleteMenuItem: {
    run: () => {
      saveToStorage(STORAGE_KEYS.MENU_ITEMS, []);
    }
  },

  // Orders
  getOrders: {
    all: () => getFromStorage(STORAGE_KEYS.ORDERS)
  },
  
  getOrdersForTable: {
    all: (tableId: string) => {
      const orders = getFromStorage(STORAGE_KEYS.ORDERS) as Order[];
      return orders.filter((order: Order) => order.table_id === tableId);
    }
  },
  
  getOrder: {
    get: (id: string) => {
      const orders = getFromStorage(STORAGE_KEYS.ORDERS) as Order[];
      return orders.find((order: Order) => order.id === id);
    }
  },
  
  insertOrder: {
    run: (id: string, tableId: string, status: string, createdAt: string, editableUntil: string, notes: string | null, suggestions: string | null, questions: string | null, etaMinutes: number | null, paymentStatus: string, waiterNotes: string | null) => {
      const orders = getFromStorage(STORAGE_KEYS.ORDERS);
      const newOrder = {
        id,
        table_id: tableId,
        status,
        created_at: createdAt,
        editable_until: editableUntil,
        notes,
        suggestions,
        questions,
        eta_minutes: etaMinutes,
        payment_status: paymentStatus,
        waiter_notes: waiterNotes
      };
      orders.push(newOrder);
      saveToStorage(STORAGE_KEYS.ORDERS, orders);
    }
  },
  
  updateOrderStatus: {
    run: (status: string, id: string) => {
      const orders = getFromStorage(STORAGE_KEYS.ORDERS) as Order[];
      const index = orders.findIndex((order: Order) => order.id === id);
      if (index !== -1) {
        (orders[index] as Order).status = status;
        saveToStorage(STORAGE_KEYS.ORDERS, orders);
      }
    }
  },
  
  updateOrderDetails: {
    run: (notes: string | null, suggestions: string | null, questions: string | null, id: string) => {
      const orders = getFromStorage(STORAGE_KEYS.ORDERS) as Order[];
      const index = orders.findIndex((order: Order) => order.id === id);
      if (index !== -1) {
        (orders[index] as Order).notes = notes;
        (orders[index] as Order).suggestions = suggestions;
        (orders[index] as Order).questions = questions;
        saveToStorage(STORAGE_KEYS.ORDERS, orders);
      }
    }
  },
  
  updateOrderEta: {
    run: (etaMinutes: number, id: string) => {
      const orders = getFromStorage(STORAGE_KEYS.ORDERS) as Order[];
      const index = orders.findIndex((order: Order) => order.id === id);
      if (index !== -1) {
        (orders[index] as Order).eta_minutes = etaMinutes;
        saveToStorage(STORAGE_KEYS.ORDERS, orders);
      }
    }
  },
  
  updateOrderPaymentStatus: {
    run: (paymentStatus: string, id: string) => {
      const orders = getFromStorage(STORAGE_KEYS.ORDERS) as Order[];
      const index = orders.findIndex((order: Order) => order.id === id);
      if (index !== -1) {
        (orders[index] as Order).payment_status = paymentStatus;
        saveToStorage(STORAGE_KEYS.ORDERS, orders);
      }
    }
  },
  
  updateOrderWaiterNotes: {
    run: (waiterNotes: string, id: string) => {
      const orders = getFromStorage(STORAGE_KEYS.ORDERS) as Order[];
      const index = orders.findIndex((order: Order) => order.id === id);
      if (index !== -1) {
        (orders[index] as Order).waiter_notes = waiterNotes;
        saveToStorage(STORAGE_KEYS.ORDERS, orders);
      }
    }
  },
  
  deleteOrder: {
    run: (id: string) => {
      const orders = getFromStorage(STORAGE_KEYS.ORDERS) as Order[];
      const filteredOrders = orders.filter((order: Order) => order.id !== id);
      saveToStorage(STORAGE_KEYS.ORDERS, filteredOrders);
    }
  },
  
  setTablePaid: {
    run: (paymentStatus: string, tableId: string) => {
      const orders = getFromStorage(STORAGE_KEYS.ORDERS) as Order[];
      const updatedOrders = orders.map((order: Order) => {
        if (order.table_id === tableId) {
          return { ...order, payment_status: paymentStatus };
        }
        return order;
      });
      saveToStorage(STORAGE_KEYS.ORDERS, updatedOrders);
    }
  },

  // Order items
  getOrderItems: {
    all: (orderId: string) => {
      const orderItems = getFromStorage(STORAGE_KEYS.ORDER_ITEMS) as OrderItem[];
      return orderItems.filter((item: OrderItem) => item.order_id === orderId);
    }
  },
  
  insertOrderItem: {
    run: (orderId: string, menuItemId: string, qty: number, options: string) => {
      const orderItems = getFromStorage(STORAGE_KEYS.ORDER_ITEMS);
      const newItem = {
        order_id: orderId,
        menu_item_id: menuItemId,
        qty,
        options
      };
      orderItems.push(newItem);
      saveToStorage(STORAGE_KEYS.ORDER_ITEMS, orderItems);
    }
  },
  
  deleteOrderItems: {
    run: (orderId: string) => {
      const orderItems = getFromStorage(STORAGE_KEYS.ORDER_ITEMS) as OrderItem[];
      const filteredItems = orderItems.filter((item: OrderItem) => item.order_id !== orderId);
      saveToStorage(STORAGE_KEYS.ORDER_ITEMS, filteredItems);
    }
  },

  // Messages
  getMessagesForTable: {
    all: (tableId: string) => {
      const messages = getFromStorage(STORAGE_KEYS.MESSAGES) as StoredMessage[];
      return messages.filter((message: StoredMessage) => message.table_id === tableId);
    }
  },
  
  getAllMessages: {
    all: () => getFromStorage(STORAGE_KEYS.MESSAGES)
  },
  
  insertMessage: {
    run: (id: string, tableId: string, fromSender: string, text: string, createdAt: string) => {
      const messages = getFromStorage(STORAGE_KEYS.MESSAGES);
      const newMessage = {
        id,
        table_id: tableId,
        from_sender: fromSender,
        text,
        created_at: createdAt
      };
      messages.push(newMessage);
      saveToStorage(STORAGE_KEYS.MESSAGES, messages);
    }
  }
};

// Initialize the database
initializeDatabase();

// Export a mock db object for compatibility
export const db = {
  pragma: () => {}, // No-op for browser compatibility
  exec: () => {}, // No-op for browser compatibility
};