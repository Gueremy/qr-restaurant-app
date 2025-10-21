import React, { useState, useEffect } from 'react';

interface SalesReport {
  period: string;
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  details: Array<{
    date: string;
    sales: number;
    orders: number;
  }>;
}

const ReportsPage: React.FC = () => {
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    groupBy: 'day' as 'day' | 'week' | 'month',
    status: 'all' as 'all' | 'completed' | 'cancelled'
  });

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        startDate: filters.startDate,
        endDate: filters.endDate,
        groupBy: filters.groupBy,
        ...(filters.status !== 'all' && { status: filters.status })
      });

      const response = await fetch(`/api/reports/sales?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar el reporte');
      }

      const data = await response.json();
      setReport(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const exportToExcel = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        startDate: filters.startDate,
        endDate: filters.endDate,
        type: 'sales'
      });

      const response = await fetch(`/api/reports/export/excel?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al exportar a Excel');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-ventas-${filters.startDate}-${filters.endDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const exportToPDF = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        startDate: filters.startDate,
        endDate: filters.endDate
      });

      const response = await fetch(`/api/reports/export/pdf?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al exportar a PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-ventas-${filters.startDate}-${filters.endDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h2 style={{ marginBottom: '2rem', color: '#333' }}>
        📈 Reportes de Ventas
      </h2>

      {/* Filtros */}
      <div style={{
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '8px',
        border: '1px solid #ddd',
        marginBottom: '2rem'
      }}>
        <h3 style={{ marginBottom: '1rem', color: '#333' }}>Filtros</h3>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '1rem',
          marginBottom: '1rem'
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Fecha Inicio:
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Fecha Fin:
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Agrupar por:
            </label>
            <select
              value={filters.groupBy}
              onChange={(e) => handleFilterChange('groupBy', e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            >
              <option value="day">Día</option>
              <option value="week">Semana</option>
              <option value="month">Mes</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Estado:
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            >
              <option value="all">Todos</option>
              <option value="completed">Completados</option>
              <option value="cancelled">Cancelados</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={fetchReport}
            disabled={loading}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? '🔄 Cargando...' : '🔍 Generar Reporte'}
          </button>

          <button
            onClick={exportToExcel}
            disabled={loading || !report}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: (loading || !report) ? 'not-allowed' : 'pointer',
              opacity: (loading || !report) ? 0.6 : 1
            }}
          >
            📊 Exportar Excel
          </button>

          <button
            onClick={exportToPDF}
            disabled={loading || !report}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: (loading || !report) ? 'not-allowed' : 'pointer',
              opacity: (loading || !report) ? 0.6 : 1
            }}
          >
            📄 Exportar PDF
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '1rem',
          borderRadius: '4px',
          marginBottom: '1rem',
          border: '1px solid #f5c6cb'
        }}>
          ❌ {error}
        </div>
      )}

      {/* Resumen del reporte */}
      {report && (
        <>
          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid #ddd',
            marginBottom: '2rem'
          }}>
            <h3 style={{ marginBottom: '1rem', color: '#333' }}>
              📊 Resumen del Período ({report.period})
            </h3>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '1rem'
            }}>
              <div style={{
                backgroundColor: '#e3f2fd',
                padding: '1rem',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
                  Ventas Totales
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#1976d2' }}>
                  ${report.totalSales?.toFixed(2) || '0.00'}
                </div>
              </div>

              <div style={{
                backgroundColor: '#f3e5f5',
                padding: '1rem',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
                  Total Pedidos
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#7b1fa2' }}>
                  {report.totalOrders || 0}
                </div>
              </div>

              <div style={{
                backgroundColor: '#e8f5e8',
                padding: '1rem',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>
                  Promedio por Pedido
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#388e3c' }}>
                  ${report.averageOrderValue?.toFixed(2) || '0.00'}
                </div>
              </div>
            </div>
          </div>

          {/* Detalle por período */}
          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            border: '1px solid #ddd'
          }}>
            <h3 style={{ marginBottom: '1rem', color: '#333' }}>
              📋 Detalle por {filters.groupBy === 'day' ? 'Día' : filters.groupBy === 'week' ? 'Semana' : 'Mes'}
            </h3>
            
            {report.details.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse',
                  fontSize: '0.9rem'
                }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th style={{ 
                        padding: '0.75rem', 
                        textAlign: 'left', 
                        borderBottom: '2px solid #dee2e6',
                        fontWeight: 'bold'
                      }}>
                        Fecha
                      </th>
                      <th style={{ 
                        padding: '0.75rem', 
                        textAlign: 'right', 
                        borderBottom: '2px solid #dee2e6',
                        fontWeight: 'bold'
                      }}>
                        Ventas
                      </th>
                      <th style={{ 
                        padding: '0.75rem', 
                        textAlign: 'right', 
                        borderBottom: '2px solid #dee2e6',
                        fontWeight: 'bold'
                      }}>
                        Pedidos
                      </th>
                      <th style={{ 
                        padding: '0.75rem', 
                        textAlign: 'right', 
                        borderBottom: '2px solid #dee2e6',
                        fontWeight: 'bold'
                      }}>
                        Promedio
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.details.map((detail, index) => (
                      <tr key={index} style={{ 
                        borderBottom: '1px solid #dee2e6',
                        backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa'
                      }}>
                        <td style={{ padding: '0.75rem' }}>
                          {new Date(detail.date).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold' }}>
                          ${detail.sales?.toFixed(2) || '0.00'}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          {detail.orders || 0}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          ${(detail.orders || 0) > 0 ? ((detail.sales || 0) / (detail.orders || 1)).toFixed(2) : '0.00'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                color: '#666', 
                padding: '2rem',
                fontStyle: 'italic'
              }}>
                No hay datos para el período seleccionado
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ReportsPage;