import { useEffect, useState, useCallback } from 'react';
import socketService from '../services/socketService';
import type { NotificationData, OrderNotification, TableNotification } from '../services/socketService';

export interface UseSocketOptions {
  room?: string;
  tableId?: string;
  autoConnect?: boolean;
}

export const useSocket = (options: UseSocketOptions = {}) => {
  const { room, tableId, autoConnect = true } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  // Estado de conexión
  useEffect(() => {
    const checkConnection = () => {
      setIsConnected(socketService.isSocketConnected());
    };

    // Verificar conexión inicial
    checkConnection();

    // Verificar cada segundo
    const interval = setInterval(checkConnection, 1000);

    return () => clearInterval(interval);
  }, []);

  // Unirse a salas automáticamente
  useEffect(() => {
    if (isConnected && autoConnect) {
      if (room) {
        socketService.joinRoom(room);
      }
      if (tableId) {
        socketService.joinTable(tableId);
      }
    }

    return () => {
      if (room) {
        socketService.leaveRoom(room);
      }
      if (tableId) {
        socketService.leaveTable(tableId);
      }
    };
  }, [isConnected, room, tableId, autoConnect]);

  // Agregar notificación
  const addNotification = useCallback((notification: NotificationData) => {
    setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Mantener solo las últimas 50
  }, []);

  // Limpiar notificaciones
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Remover notificación específica
  const removeNotification = useCallback((index: number) => {
    setNotifications(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Métodos de utilidad
  const joinRoom = useCallback((roomName: string) => {
    socketService.joinRoom(roomName);
  }, []);

  const leaveRoom = useCallback((roomName: string) => {
    socketService.leaveRoom(roomName);
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    socketService.emit(event, data);
  }, []);

  return {
    isConnected,
    notifications,
    addNotification,
    clearNotifications,
    removeNotification,
    joinRoom,
    leaveRoom,
    emit,
    socketService
  };
};

// Hook específico para órdenes
export const useOrderNotifications = () => {
  const [orderNotifications, setOrderNotifications] = useState<OrderNotification[]>([]);

  useEffect(() => {
    const handleNewOrder = (data: OrderNotification) => {
      setOrderNotifications(prev => [data, ...prev.slice(0, 19)]); // Últimas 20 órdenes
    };

    const handleOrderStatusChanged = (data: OrderNotification) => {
      setOrderNotifications(prev => [data, ...prev.slice(0, 19)]);
    };

    const handleOrderReady = (data: OrderNotification) => {
      setOrderNotifications(prev => [data, ...prev.slice(0, 19)]);
    };

    socketService.on('new-order', handleNewOrder);
    socketService.on('order-status-changed', handleOrderStatusChanged);
    socketService.on('order-ready', handleOrderReady);

    return () => {
      socketService.off('new-order', handleNewOrder);
      socketService.off('order-status-changed', handleOrderStatusChanged);
      socketService.off('order-ready', handleOrderReady);
    };
  }, []);

  const clearOrderNotifications = useCallback(() => {
    setOrderNotifications([]);
  }, []);

  return {
    orderNotifications,
    clearOrderNotifications
  };
};

// Hook específico para mesas
export const useTableNotifications = (tableId?: string) => {
  const [tableNotifications, setTableNotifications] = useState<TableNotification[]>([]);

  useEffect(() => {
    const handleTableStatusChanged = (data: TableNotification) => {
      // Solo mostrar notificaciones de la mesa específica si se proporciona tableId
      if (!tableId || data.data.tableId === tableId) {
        setTableNotifications(prev => [data, ...prev.slice(0, 9)]); // Últimas 10 notificaciones
      }
    };

    const handleTableNotification = (data: TableNotification) => {
      if (!tableId || data.data.tableId === tableId) {
        setTableNotifications(prev => [data, ...prev.slice(0, 9)]);
      }
    };

    socketService.on('table-status-changed', handleTableStatusChanged);
    socketService.on('table-notification', handleTableNotification);

    return () => {
      socketService.off('table-status-changed', handleTableStatusChanged);
      socketService.off('table-notification', handleTableNotification);
    };
  }, [tableId]);

  const clearTableNotifications = useCallback(() => {
    setTableNotifications([]);
  }, []);

  return {
    tableNotifications,
    clearTableNotifications
  };
};

// Hook para notificaciones de emergencia y stock
export const useSystemNotifications = () => {
  const [systemNotifications, setSystemNotifications] = useState<NotificationData[]>([]);

  useEffect(() => {
    const handleEmergency = (data: NotificationData) => {
      setSystemNotifications(prev => [data, ...prev.slice(0, 9)]);
    };

    const handleLowStock = (data: NotificationData) => {
      setSystemNotifications(prev => [data, ...prev.slice(0, 9)]);
    };

    socketService.on('emergency', handleEmergency);
    socketService.on('low-stock', handleLowStock);

    return () => {
      socketService.off('emergency', handleEmergency);
      socketService.off('low-stock', handleLowStock);
    };
  }, []);

  const clearSystemNotifications = useCallback(() => {
    setSystemNotifications([]);
  }, []);

  return {
    systemNotifications,
    clearSystemNotifications
  };
};