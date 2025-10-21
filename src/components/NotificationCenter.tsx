import React, { useState, useEffect } from 'react';
import { useSocket, useOrderNotifications, useSystemNotifications } from '../hooks/useSocket';
import type { NotificationData } from '../services/socketService';

interface NotificationCenterProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxNotifications?: number;
  autoHide?: boolean;
  hideDelay?: number;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  position = 'top-right',
  maxNotifications = 5,
  autoHide = true,
  hideDelay = 5000
}) => {
  const { isConnected } = useSocket();
  const { orderNotifications } = useOrderNotifications();
  const { systemNotifications } = useSystemNotifications();
  const [visibleNotifications, setVisibleNotifications] = useState<(NotificationData & { id: string })[]>([]);

  // Combinar todas las notificaciones
  useEffect(() => {
    const allNotifications = [
      ...orderNotifications.map(n => ({ ...n, id: `order-${Date.now()}-${Math.random()}` })),
      ...systemNotifications.map(n => ({ ...n, id: `system-${Date.now()}-${Math.random()}` }))
    ].slice(0, maxNotifications);

    setVisibleNotifications(allNotifications);
  }, [orderNotifications, systemNotifications, maxNotifications]);

  // Auto-hide notifications
  useEffect(() => {
    if (!autoHide) return;

    const timers = visibleNotifications.map(notification => {
      return setTimeout(() => {
        setVisibleNotifications(prev => 
          prev.filter(n => n.id !== notification.id)
        );
      }, hideDelay);
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [visibleNotifications, autoHide, hideDelay]);

  const removeNotification = (id: string) => {
    setVisibleNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getPositionClasses = () => {
    const baseClasses = 'fixed z-50 space-y-2';
    switch (position) {
      case 'top-right':
        return `${baseClasses} top-4 right-4`;
      case 'top-left':
        return `${baseClasses} top-4 left-4`;
      case 'bottom-right':
        return `${baseClasses} bottom-4 right-4`;
      case 'bottom-left':
        return `${baseClasses} bottom-4 left-4`;
      default:
        return `${baseClasses} top-4 right-4`;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-500 border-red-600';
      case 'high':
        return 'bg-orange-500 border-orange-600';
      case 'medium':
        return 'bg-blue-500 border-blue-600';
      case 'low':
        return 'bg-gray-500 border-gray-600';
      default:
        return 'bg-blue-500 border-blue-600';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'NEW_ORDER':
        return '🍽️';
      case 'ORDER_STATUS_CHANGED':
        return '📊';
      case 'ORDER_READY':
        return '✅';
      case 'TABLE_STATUS_CHANGED':
        return '🪑';
      case 'TABLE_NOTIFICATION':
        return '📱';
      case 'EMERGENCY':
        return '🚨';
      case 'LOW_STOCK':
        return '📦';
      default:
        return '🔔';
    }
  };

  if (!isConnected) {
    return (
      <div className={getPositionClasses()}>
        <div className="bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg border border-yellow-600">
          <div className="flex items-center space-x-2">
            <span>⚠️</span>
            <span className="text-sm font-medium">Desconectado del servidor</span>
          </div>
        </div>
      </div>
    );
  }

  if (visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div className={getPositionClasses()}>
      {visibleNotifications.map((notification) => (
        <div
          key={notification.id}
          className={`${getPriorityColor(notification.priority)} text-white px-4 py-3 rounded-lg shadow-lg border-l-4 max-w-sm animate-slide-in`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-2 flex-1">
              <span className="text-lg">{getTypeIcon(notification.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {notification.message}
                </p>
                {notification.data && (
                  <div className="mt-1 text-xs opacity-90">
                    {notification.type.includes('ORDER') && notification.data.orderId && (
                      <span>Orden #{notification.data.orderId}</span>
                    )}
                    {notification.type.includes('TABLE') && notification.data.tableNumber && (
                      <span>Mesa {notification.data.tableNumber}</span>
                    )}
                  </div>
                )}
                <p className="text-xs opacity-75 mt-1">
                  {new Date(notification.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="ml-2 text-white hover:text-gray-200 focus:outline-none"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationCenter;