import { io, Socket } from 'socket.io-client';

export interface NotificationData {
  type: string;
  message: string;
  data?: any;
  timestamp: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface OrderNotification extends NotificationData {
  type: 'NEW_ORDER' | 'ORDER_STATUS_CHANGED' | 'ORDER_READY';
  data: {
    orderId: string;
    tableNumber?: number;
    status?: string;
    items?: any[];
    total?: number;
  };
}

export interface TableNotification extends NotificationData {
  type: 'TABLE_STATUS_CHANGED' | 'TABLE_NOTIFICATION';
  data: {
    tableId: string;
    tableNumber?: number;
    status?: string;
  };
}

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private listeners: Map<string, Function[]> = new Map();

  constructor() {
    this.connect();
  }

  private connect() {
    try {
      // Obtener URL del socket desde variables de entorno o usar URL por defecto
      const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
      
      console.log('🔌 Conectando a Socket.io:', socketUrl);
      
      // Conectar al servidor Socket.io del backend
      this.socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true,
        auth: {
          // Usar un token temporal para desarrollo o permitir conexiones sin autenticación
          token: 'dev-token'
        }
      });

      this.setupEventListeners();
    } catch (error) {
      console.error('Error connecting to socket server:', error);
      this.handleReconnect();
    }
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Conectado al servidor Socket.io');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Autenticar usuario si hay token
      const token = localStorage.getItem('token');
      if (token) {
        this.socket?.emit('authenticate', { token });
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Desconectado del servidor Socket.io:', reason);
      this.isConnected = false;
      
      if (reason === 'io server disconnect') {
        // El servidor desconectó al cliente, reconectar manualmente
        this.handleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Error de conexión Socket.io:', error);
      this.handleReconnect();
    });

    // Eventos de notificaciones
    this.socket.on('new-order', (data: OrderNotification) => {
      this.emitToListeners('new-order', data);
    });

    this.socket.on('order-status-changed', (data: OrderNotification) => {
      this.emitToListeners('order-status-changed', data);
    });

    this.socket.on('order-ready', (data: OrderNotification) => {
      this.emitToListeners('order-ready', data);
    });

    this.socket.on('table-status-changed', (data: TableNotification) => {
      this.emitToListeners('table-status-changed', data);
    });

    this.socket.on('table-notification', (data: TableNotification) => {
      this.emitToListeners('table-notification', data);
    });

    this.socket.on('emergency', (data: NotificationData) => {
      this.emitToListeners('emergency', data);
    });

    this.socket.on('low-stock', (data: NotificationData) => {
      this.emitToListeners('low-stock', data);
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      
      console.log(`🔄 Reintentando conexión en ${delay}ms (intento ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error('❌ Máximo número de intentos de reconexión alcanzado');
    }
  }

  private emitToListeners(event: string, data: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error en listener de evento ${event}:`, error);
        }
      });
    }
  }

  // Métodos públicos
  public on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  public off(event: string, callback?: Function) {
    if (!callback) {
      this.listeners.delete(event);
      return;
    }

    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  public joinRoom(room: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('join-room', room);
      console.log(`📍 Unido a la sala: ${room}`);
    }
  }

  public leaveRoom(room: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave-room', room);
      console.log(`🚪 Saliendo de la sala: ${room}`);
    }
  }

  public joinTable(tableId: string) {
    this.joinRoom(`table-${tableId}`);
  }

  public leaveTable(tableId: string) {
    this.leaveRoom(`table-${tableId}`);
  }

  public emit(event: string, data?: any) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket no conectado, no se puede enviar evento:', event);
    }
  }

  public isSocketConnected(): boolean {
    return this.isConnected;
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

// Instancia singleton del servicio
export const socketService = new SocketService();
export default socketService;