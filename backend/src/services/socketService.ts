import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { 
  SocketUser, 
  ConnectionStats, 
  SOCKET_EVENTS, 
  SOCKET_ROOMS,
  OrderNotification,
  TableNotification,
  EmergencyNotification,
  LowStockNotification
} from '../types/socket';

export interface AuthenticatedSocket extends Socket {
  user?: SocketUser;
}

export class SocketService {
  private io: Server;
  private connectedUsers: Map<string, SocketUser> = new Map();

  constructor(io: Server) {
    this.io = io;
    this.setupSocketAuth();
    this.setupEventHandlers();
  }

  private setupSocketAuth() {
    this.io.use((socket: AuthenticatedSocket, next) => {
      const token = socket.handshake.auth.token;
      
      // Permitir conexiones de desarrollo sin token válido
      if (!token || token === 'dev-token') {
        socket.user = {
          id: 'dev-user',
          userId: 'dev-user',
          name: 'Development User',
          role: 'waiter', // Rol por defecto para desarrollo
          connectedAt: new Date()
        };
        return next();
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
        socket.user = {
          id: decoded.id,
          userId: decoded.id,
          name: decoded.name,
          role: decoded.role,
          connectedAt: new Date()
        };
        next();
      } catch (error) {
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`🔌 Usuario conectado: ${socket.user?.name} (${socket.user?.role})`);
      
      // Guardar conexión del usuario
      if (socket.user) {
        const socketUser: SocketUser = {
          id: socket.id,
          userId: socket.user.userId,
          role: socket.user.role,
          name: socket.user.name,
          connectedAt: new Date()
        };
        this.connectedUsers.set(socket.user.userId, socketUser);
        
        // Unirse a rooms según el rol
        this.joinRoleBasedRooms(socket);
      }

      // Eventos del socket
      socket.on('join-table', (tableId: string) => {
        socket.join(`table-${tableId}`);
        console.log(`👥 Usuario ${socket.user?.name} se unió a mesa ${tableId}`);
      });

      socket.on('leave-table', (tableId: string) => {
        socket.leave(`table-${tableId}`);
        console.log(`👋 Usuario ${socket.user?.name} dejó mesa ${tableId}`);
      });

      socket.on('disconnect', () => {
        console.log(`🔌 Usuario desconectado: ${socket.user?.name}`);
        if (socket.user) {
          this.connectedUsers.delete(socket.user.userId);
        }
      });

      // Eventos específicos por rol
      this.setupRoleSpecificEvents(socket);
    });
  }

  private joinRoleBasedRooms(socket: AuthenticatedSocket) {
    if (!socket.user) return;

    const { role } = socket.user;
    
    // Todos se unen al room general
    socket.join('restaurant');
    
    // Rooms específicos por rol
    switch (role) {
      case 'ADMIN':
      case 'MANAGER':
        socket.join('management');
        socket.join('kitchen');
        socket.join('waiters');
        break;
      case 'KITCHEN':
        socket.join('kitchen');
        break;
      case 'WAITER':
        socket.join('waiters');
        break;
    }
  }

  private setupRoleSpecificEvents(socket: AuthenticatedSocket) {
    if (!socket.user) return;

    // Eventos para cocina
    if (socket.user.role === 'KITCHEN' || socket.user.role === 'ADMIN' || socket.user.role === 'MANAGER') {
      socket.on('order-status-update', (data: { orderId: string; status: string; estimatedTime?: number }) => {
        this.notifyOrderStatusUpdate(data.orderId, data.status, data.estimatedTime);
      });
    }

    // Eventos para meseros
    if (socket.user.role === 'WAITER' || socket.user.role === 'ADMIN' || socket.user.role === 'MANAGER') {
      socket.on('table-status-update', (data: { tableId: string; status: string }) => {
        this.notifyTableStatusUpdate(data.tableId, data.status);
      });
    }
  }

  // Métodos públicos para notificaciones

  /**
   * Notifica nueva orden a la cocina
   */
  public notifyNewOrder(order: any) {
    this.io.to('kitchen').emit('new-order', {
      type: 'NEW_ORDER',
      message: `Nueva orden #${order.id} - Mesa ${order.table?.number}`,
      data: order,
      timestamp: new Date().toISOString(),
      priority: 'high'
    });

    // Notificar también a management
    this.io.to('management').emit('new-order', {
      type: 'NEW_ORDER',
      message: `Nueva orden #${order.id} - Mesa ${order.table?.number}`,
      data: order,
      timestamp: new Date().toISOString(),
      priority: 'medium'
    });

    console.log(`🍽️ Nueva orden notificada: #${order.id}`);
  }

  /**
   * Notifica cambio de estado de orden
   */
  public notifyOrderStatusUpdate(orderId: string, status: string, estimatedTime?: number) {
    const statusMessages = {
      'CONFIRMED': 'Orden confirmada',
      'PREPARING': 'Orden en preparación',
      'READY': 'Orden lista para servir',
      'DELIVERED': 'Orden entregada',
      'CANCELLED': 'Orden cancelada'
    };

    const message = statusMessages[status as keyof typeof statusMessages] || 'Estado actualizado';
    
    // Notificar a meseros si la orden está lista
    if (status === 'READY') {
      this.io.to('waiters').emit('order-ready', {
        type: 'ORDER_READY',
        message: `🔔 Orden #${orderId} lista para servir`,
        data: { orderId, status, estimatedTime },
        timestamp: new Date().toISOString(),
        priority: 'high'
      });
    }

    // Notificar cambio general a todos los roles relevantes
    this.io.to('restaurant').emit('order-status-changed', {
      type: 'ORDER_STATUS_CHANGED',
      message: `Orden #${orderId}: ${message}`,
      data: { orderId, status, estimatedTime },
      timestamp: new Date().toISOString(),
      priority: status === 'READY' ? 'high' : 'medium'
    });

    console.log(`📊 Estado orden actualizado: #${orderId} -> ${status}`);
  }

  /**
   * Notifica cambio de estado de mesa
   */
  public notifyTableStatusUpdate(tableId: string, status: string) {
    this.io.to('waiters').to('management').emit('table-status-changed', {
      type: 'TABLE_STATUS_CHANGED',
      message: `Mesa ${tableId}: ${status}`,
      data: { tableId, status },
      timestamp: new Date().toISOString(),
      priority: 'medium'
    });

    console.log(`🪑 Estado mesa actualizado: ${tableId} -> ${status}`);
  }

  /**
   * Notifica a una mesa específica
   */
  public notifyTable(tableId: string, message: string, data?: any) {
    this.io.to(`table-${tableId}`).emit('table-notification', {
      type: 'TABLE_NOTIFICATION',
      message,
      data,
      timestamp: new Date().toISOString(),
      priority: 'medium'
    });

    console.log(`📱 Notificación a mesa ${tableId}: ${message}`);
  }

  /**
   * Notificación de emergencia a todos
   */
  public notifyEmergency(message: string, data?: any) {
    this.io.to('restaurant').emit('emergency', {
      type: 'EMERGENCY',
      message,
      data,
      timestamp: new Date().toISOString(),
      priority: 'critical'
    });

    console.log(`🚨 Notificación de emergencia: ${message}`);
  }

  /**
   * Notifica inventario bajo
   */
  public notifyLowStock(product: any) {
    this.io.to('management').to('kitchen').emit('low-stock', {
      type: 'LOW_STOCK',
      message: `⚠️ Stock bajo: ${product.name} (${product.stock} restantes)`,
      data: product,
      timestamp: new Date().toISOString(),
      priority: 'high'
    });

    console.log(`📦 Stock bajo notificado: ${product.name}`);
  }

  /**
   * Obtener usuarios conectados por rol
   */
  public getConnectedUsersByRole(role: string): SocketUser[] {
    const users: SocketUser[] = [];
    this.connectedUsers.forEach((socketUser) => {
      if (socketUser.role === role) {
        users.push(socketUser);
      }
    });
    return users;
  }

  /**
   * Obtener estadísticas de conexiones
   */
  public getConnectionStats(): ConnectionStats {
    const usersByRole: Record<string, number> = {};
    
    this.connectedUsers.forEach((socketUser) => {
      const role = socketUser.role;
      usersByRole[role] = (usersByRole[role] || 0) + 1;
    });

    return {
      totalConnections: this.connectedUsers.size,
      usersByRole,
      activeRooms: ['restaurant', 'kitchen', 'waiters', 'management'] // Rooms básicos
    };
  }
}