export interface SocketUser {
  id: string;
  userId: string;
  role: string;
  name: string;
  connectedAt: Date;
}

export interface ConnectionStats {
  totalConnections: number;
  usersByRole: {
    [role: string]: number;
  };
  activeRooms: string[];
}

export interface NotificationPayload {
  type: 'NEW_ORDER' | 'ORDER_STATUS' | 'TABLE_STATUS' | 'EMERGENCY' | 'LOW_STOCK' | 'CUSTOM';
  message: string;
  data?: any;
  timestamp: Date;
  from?: string;
}

export interface OrderNotification extends NotificationPayload {
  type: 'NEW_ORDER' | 'ORDER_STATUS';
  data: {
    orderId: string;
    tableNumber?: number;
    status?: string;
    items?: any[];
    total?: number;
  };
}

export interface TableNotification extends NotificationPayload {
  type: 'TABLE_STATUS';
  data: {
    tableId: string;
    tableNumber: number;
    status: string;
    previousStatus?: string;
  };
}

export interface EmergencyNotification extends NotificationPayload {
  type: 'EMERGENCY';
  data: {
    level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    location?: string;
    action?: string;
  };
}

export interface LowStockNotification extends NotificationPayload {
  type: 'LOW_STOCK';
  data: {
    productId: string;
    productName: string;
    currentStock: number;
    minimumStock: number;
    category?: string;
  };
}

export interface CustomNotification extends NotificationPayload {
  type: 'CUSTOM';
  data: {
    title: string;
    body: string;
    action?: string;
    url?: string;
  };
}

// Socket.io event names
export const SOCKET_EVENTS = {
  // Connection events
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  
  // Order events
  NEW_ORDER: 'new_order',
  ORDER_STATUS_UPDATE: 'order_status_update',
  ORDER_READY: 'order_ready',
  
  // Table events
  TABLE_STATUS_UPDATE: 'table_status_update',
  TABLE_CALL_WAITER: 'table_call_waiter',
  
  // Staff events
  EMERGENCY_ALERT: 'emergency_alert',
  LOW_STOCK_ALERT: 'low_stock_alert',
  STAFF_MESSAGE: 'staff_message',
  
  // System events
  SYSTEM_NOTIFICATION: 'system_notification',
  HEARTBEAT: 'heartbeat',
} as const;

// Room names for different user roles
export const SOCKET_ROOMS = {
  KITCHEN: 'kitchen',
  WAITERS: 'waiters',
  MANAGERS: 'managers',
  ADMINS: 'admins',
  ALL_STAFF: 'all_staff',
} as const;

export type SocketEventName = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];
export type SocketRoomName = typeof SOCKET_ROOMS[keyof typeof SOCKET_ROOMS];