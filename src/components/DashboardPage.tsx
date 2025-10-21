import React, { useState, useEffect } from 'react';

interface DashboardData {
  today: {
    orders: number;
    sales: number;
    activeOrders: number;
    tableOccupancy: {
      total: number;
      occupied: number;
      percentage: number;
    };
  };
  weekly: {
    sales: number;
    orders: number;
  };
  topProductsToday: Array<{
    name: string;
    quantity: number;
  }>;
  last7Days: Array<{
    date: string;
    sales: number;
    orders: number;
  }>;
}

const DashboardPage: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/reports/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar datos del dashboard');
      }

      const data = await response.json();
      setDashboardData(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div>Cargando dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', color: '#dc3545' }}>
        Error: {error}
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div style={{ padding: '2rem' }}>
        No hay datos disponibles
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem' }}>
      <h2 style={{ marginBottom: '2rem', color: '#333' }}>
        📊 Dashboard - Resumen Ejecutivo
      </h2>

      {/* Métricas del día */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          backgroundColor: '#e3f2fd',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid #bbdefb'
        }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#1976d2' }}>
            💰 Ventas Hoy
          </h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1976d2' }}>
            ${dashboardData.today.sales.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.9rem', color: '#666' }}>
            {dashboardData.today.orders} pedidos
          </div>
        </div>

        <div style={{
          backgroundColor: '#f3e5f5',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid #ce93d8'
        }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#7b1fa2' }}>
            📋 Pedidos Activos
          </h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#7b1fa2' }}>
            {dashboardData.today.activeOrders}
          </div>
          <div style={{ fontSize: '0.9rem', color: '#666' }}>
            En preparación
          </div>
        </div>

        <div style={{
          backgroundColor: '#e8f5e8',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid #a5d6a7'
        }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#388e3c' }}>
            🪑 Ocupación de Mesas
          </h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#388e3c' }}>
            {dashboardData.today.tableOccupancy.percentage.toFixed(0)}%
          </div>
          <div style={{ fontSize: '0.9rem', color: '#666' }}>
            {dashboardData.today.tableOccupancy.occupied} de {dashboardData.today.tableOccupancy.total} mesas
          </div>
        </div>

        <div style={{
          backgroundColor: '#fff3e0',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid #ffcc02'
        }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#f57c00' }}>
            📈 Ventas Semanales
          </h3>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f57c00' }}>
            ${dashboardData.weekly.sales.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.9rem', color: '#666' }}>
            {dashboardData.weekly.orders} pedidos (7 días)
          </div>
        </div>
      </div>

      {/* Gráfico de ventas de los últimos 7 días */}
      <div style={{
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '8px',
        border: '1px solid #ddd',
        marginBottom: '2rem'
      }}>
        <h3 style={{ marginBottom: '1rem', color: '#333' }}>
          📊 Ventas de los Últimos 7 Días
        </h3>
        <div style={{ 
          display: 'flex', 
          alignItems: 'end', 
          gap: '8px', 
          height: '200px',
          padding: '1rem 0'
        }}>
          {dashboardData.last7Days.map((day, index) => {
            const maxSales = Math.max(...dashboardData.last7Days.map(d => d.sales));
            const height = maxSales > 0 ? (day.sales / maxSales) * 150 : 0;
            
            return (
              <div key={index} style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                flex: 1
              }}>
                <div style={{
                  backgroundColor: '#2196f3',
                  width: '100%',
                  height: `${height}px`,
                  borderRadius: '4px 4px 0 0',
                  minHeight: '2px',
                  display: 'flex',
                  alignItems: 'end',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '0.8rem',
                  padding: '2px'
                }}>
                  {day.sales > 0 && `$${day.sales.toFixed(0)}`}
                </div>
                <div style={{ 
                  fontSize: '0.7rem', 
                  marginTop: '4px',
                  transform: 'rotate(-45deg)',
                  transformOrigin: 'center'
                }}>
                  {new Date(day.date).toLocaleDateString('es-ES', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top productos del día */}
      <div style={{
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '8px',
        border: '1px solid #ddd'
      }}>
        <h3 style={{ marginBottom: '1rem', color: '#333' }}>
          🏆 Top Productos del Día
        </h3>
        {dashboardData.topProductsToday.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {dashboardData.topProductsToday.map((product, index) => (
              <div key={index} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem',
                backgroundColor: index === 0 ? '#fff3e0' : '#f8f9fa',
                borderRadius: '4px',
                border: index === 0 ? '1px solid #ffcc02' : '1px solid #e9ecef'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ 
                    fontSize: '1.2rem',
                    color: index === 0 ? '#f57c00' : '#666'
                  }}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                  </span>
                  <span style={{ fontWeight: index < 3 ? 'bold' : 'normal' }}>
                    {product.name}
                  </span>
                </div>
                <span style={{
                  backgroundColor: index === 0 ? '#f57c00' : '#6c757d',
                  color: 'white',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '12px',
                  fontSize: '0.8rem',
                  fontWeight: 'bold'
                }}>
                  {product.quantity} vendidos
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ 
            textAlign: 'center', 
            color: '#666', 
            padding: '2rem',
            fontStyle: 'italic'
          }}>
            No hay ventas registradas hoy
          </div>
        )}
      </div>

      {/* Botón de actualizar */}
      <div style={{ 
        marginTop: '2rem', 
        textAlign: 'center' 
      }}>
        <button
          onClick={fetchDashboardData}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          🔄 Actualizar Datos
        </button>
      </div>
    </div>
  );
};

export default DashboardPage;