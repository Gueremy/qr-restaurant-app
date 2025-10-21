import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  currentUser: any;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles, 
  currentUser 
}) => {
  // Si no hay usuario logueado, redirigir al login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Si el usuario no tiene el rol permitido, redirigir a página no autorizada
  if (!allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Si todo está bien, mostrar el componente
  return <>{children}</>;
};

export default ProtectedRoute;