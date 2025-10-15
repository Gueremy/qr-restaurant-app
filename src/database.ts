import Database from 'better-sqlite3';

// Tipo para mensajes
export type Message = {
  id: string;
  tableId: string;
  from: 'cocina' | 'mesero';
  text: string;
  createdAt: string;
};

// Inicializar la base de datos
const db = new Database('restaurant.db');

// Configurar WAL mode para mejor rendimiento
db.pragma('journal_mode = WAL');

// Crear las tablas si no existen
function initializeDatabase() {
  // Tabla de elementos del menú
  db.exec(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      image TEXT,
      tags TEXT, -- JSON array
      variants TEXT, -- JSON array
      in_stock INTEGER NOT NULL DEFAULT 1
    )
  `);

  // Tabla de pedidos
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      table_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pendiente',
      created_at TEXT NOT NULL,
      editable_until TEXT,
      notes TEXT,
      suggestions TEXT,
      questions TEXT,
      eta_minutes INTEGER,
      payment_status TEXT NOT NULL DEFAULT 'pendiente',
      waiter_notes TEXT
    )
  `);

  // Tabla de items de pedidos
  db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL,
      menu_item_id TEXT NOT NULL,
      qty INTEGER NOT NULL,
      options TEXT, -- JSON object
      FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
      FOREIGN KEY (menu_item_id) REFERENCES menu_items (id)
    )
  `);

  // Tabla de mensajes
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      table_id TEXT NOT NULL,
      from_sender TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  // Crear índices para mejor rendimiento
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_orders_table_id ON orders (table_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);
    CREATE INDEX IF NOT EXISTS idx_messages_table_id ON messages (table_id);
  `);

  // Insertar datos de ejemplo si la tabla está vacía
  seedMenuIfEmpty();
}

// Función para insertar datos de ejemplo
function seedMenuIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) as count FROM menu_items').get() as { count: number };
  
  if (count.count === 0) {
    const insertMenuItem = db.prepare(`
      INSERT INTO menu_items (id, name, description, price, tags, variants, in_stock)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const seedItems = [
      { id: '1', name: 'Hamburguesa Clásica', description: '', price: 5500, tags: '[]', variants: '[]', inStock: 1 },
      { id: '2', name: 'Ensalada Vegana', description: '', price: 4800, tags: '["vegano"]', variants: '[]', inStock: 1 },
      { id: '3', name: 'Pasta sin Gluten', description: '', price: 6000, tags: '["sin_gluten"]', variants: '[]', inStock: 1 },
      { id: '4', name: 'Bebida', description: '', price: 1800, tags: '[]', variants: '[]', inStock: 1 },
    ];

    for (const item of seedItems) {
      insertMenuItem.run(item.id, item.name, item.description, item.price, item.tags, item.variants, item.inStock);
    }
  }
}

// Preparar statements para mejor rendimiento
const statements = {
  // Menu items
  getMenuItems: db.prepare('SELECT * FROM menu_items'),
  insertMenuItem: db.prepare(`
    INSERT INTO menu_items (id, name, description, price, image, tags, variants, in_stock)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `),
  updateMenuItem: db.prepare(`
    UPDATE menu_items 
    SET name = ?, description = ?, price = ?, image = ?, tags = ?, variants = ?, in_stock = ?
    WHERE id = ?
  `),
  deleteMenuItem: db.prepare('DELETE FROM menu_items'),

  // Orders
  getOrders: db.prepare('SELECT * FROM orders'),
  getOrdersForTable: db.prepare('SELECT * FROM orders WHERE table_id = ?'),
  insertOrder: db.prepare(`
    INSERT INTO orders (id, table_id, status, created_at, editable_until, notes, suggestions, questions, eta_minutes, payment_status, waiter_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  updateOrderStatus: db.prepare('UPDATE orders SET status = ? WHERE id = ?'),
  updateOrderDetails: db.prepare(`
    UPDATE orders 
    SET notes = ?, suggestions = ?, questions = ?
    WHERE id = ?
  `),
  updateOrderEta: db.prepare('UPDATE orders SET eta_minutes = ? WHERE id = ?'),
  updateOrderPaymentStatus: db.prepare('UPDATE orders SET payment_status = ? WHERE id = ?'),
  updateOrderWaiterNotes: db.prepare('UPDATE orders SET waiter_notes = ? WHERE id = ?'),
  deleteOrder: db.prepare('DELETE FROM orders WHERE id = ?'),
  setTablePaid: db.prepare('UPDATE orders SET payment_status = ? WHERE table_id = ?'),

  // Order items
  getOrderItems: db.prepare('SELECT * FROM order_items WHERE order_id = ?'),
  insertOrderItem: db.prepare(`
    INSERT INTO order_items (order_id, menu_item_id, qty, options)
    VALUES (?, ?, ?, ?)
  `),
  deleteOrderItems: db.prepare('DELETE FROM order_items WHERE order_id = ?'),

  // Messages
  getMessagesForTable: db.prepare('SELECT * FROM messages WHERE table_id = ?'),
  getAllMessages: db.prepare('SELECT * FROM messages'),
  insertMessage: db.prepare(`
    INSERT INTO messages (id, table_id, from_sender, text, created_at)
    VALUES (?, ?, ?, ?, ?)
  `),
};

// Inicializar la base de datos
initializeDatabase();

// Exportar la instancia de la base de datos y los statements
export { db, statements };