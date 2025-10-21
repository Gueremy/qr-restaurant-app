import React, { useState, useEffect } from 'react';

interface CloseStatus {
  isClosed: boolean;
  lastCloseDate?: string;
  canClose: boolean;
  reason?: string;
}

interface PreCloseValidation {
  canClose: boolean;
  validations: {
    pendingOrders: {
      valid: boolean;
      count: number;
      message: string;
    };
    openShifts: {
      valid: boolean;
      count: number;
      message: string;
    };
    pendingPayments: {
      valid: boolean;
      count: number;
      message: string;
    };
    lowStock: {
      valid: boolean;
      count: number;
      message: string;
      products?: Array<{ name: string; currentStock: number; minStock: number }>;
    };
  };
}

interface CloseResult {
  success: boolean;
  message: string;
  stats?: {
    totalSales: number;
    totalOrders: number;
    topProducts: Array<{ name: string; quantity: number }>;
  };
}

const DailyClosePage: React.FC = () => {
  const [closeStatus, setCloseStatus] = useState<CloseStatus | null>(null);
  const [validation, setValidation] = useState<PreCloseValidation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showValidation, setShowValidation] = useState(false);
  const [closeResult, setCloseResult] = useState<CloseResult | null>(null);

  useEffect(() => {
    fetchCloseStatus();
  }, []);

  const fetchCloseStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/daily-close/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al verificar estado de cierre');
      }

      const data = await response.json();
      setCloseStatus(data.data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const runPreCloseValidation = async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/daily-close/validate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al ejecutar validaciones');
      }

      const data = await response.json();
      setValidation(data.data);
      setShowValidation(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const executeDailyClose = async () => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/daily-close/execute', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al ejecutar cierre diario');
      }

      const data = await response.json();
      setCloseResult(data.data);
      await fetchCloseStatus(); // Actualizar estado
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reopenDay = async () => {
    if (!window.confirm('¿Está seguro de que desea reabrir el día? Esta acción requiere permisos de administrador.')) {
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/daily-close/reopen', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al reabrir el día');
      }

      await fetchCloseStatus(); // Actualizar estado
      setCloseResult(null);
      setValidation(null);
      setShowValidation(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getValidationIcon = (valid: boolean) => valid ? '✅' : '❌';
  const getValidationColor = (valid: boolean) => valid ? '#28a745' : '#dc3545';

  return (
    <div style={{ padding: '1rem' }}>
      <h2 style={{ marginBottom: '2rem', color: '#333' }}>
        🔒 Cierre de Día
      </h2>

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

      {/* Estado actual */}
      {closeStatus && (
        <div style={{
          backgroundColor: closeStatus.isClosed ? '#d4edda' : '#fff3cd',
          color: closeStatus.isClosed ? '#155724' : '#856404',
          padding: '1.5rem',
          borderRadius: '8px',
          border: `1px solid ${closeStatus.isClosed ? '#c3e6cb' : '#ffeaa7'}`,
          marginBottom: '2rem'
        }}>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>
            {closeStatus.isClosed ? '🔒 Día Cerrado' : '🔓 Día Abierto'}
          </h3>
          {closeStatus.lastCloseDate && (
            <p style={{ margin: '0.5rem 0' }}>
              Último cierre: {new Date(closeStatus.lastCloseDate).toLocaleString('es-ES')}
            </p>
          )}
          {closeStatus.reason && (
            <p style={{ margin: '0.5rem 0', fontStyle: 'italic' }}>
              {closeStatus.reason}
            </p>
          )}
        </div>
      )}

      {/* Resultado del cierre */}
      {closeResult && (
        <div style={{
          backgroundColor: closeResult.success ? '#d4edda' : '#f8d7da',
          color: closeResult.success ? '#155724' : '#721c24',
          padding: '1.5rem',
          borderRadius: '8px',
          border: `1px solid ${closeResult.success ? '#c3e6cb' : '#f5c6cb'}`,
          marginBottom: '2rem'
        }}>
          <h3 style={{ margin: '0 0 1rem 0' }}>
            {closeResult.success ? '✅ Cierre Exitoso' : '❌ Error en Cierre'}
          </h3>
          <p style={{ margin: '0.5rem 0' }}>{closeResult.message}</p>
          
          {closeResult.stats && (
            <div style={{ marginTop: '1rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0' }}>📊 Estadísticas del Día:</h4>
              <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
                <li>Ventas totales: ${closeResult.stats.totalSales.toFixed(2)}</li>
                <li>Total de pedidos: {closeResult.stats.totalOrders}</li>
                <li>Productos más vendidos:</li>
                <ul style={{ marginTop: '0.5rem' }}>
                  {closeResult.stats.topProducts.map((product, index) => (
                    <li key={index}>
                      {product.name}: {product.quantity} unidades
                    </li>
                  ))}
                </ul>
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Validaciones pre-cierre */}
      {showValidation && validation && (
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          border: '1px solid #ddd',
          marginBottom: '2rem'
        }}>
          <h3 style={{ marginBottom: '1rem', color: '#333' }}>
            🔍 Validaciones Pre-Cierre
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Pedidos pendientes */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem',
              backgroundColor: validation.validations.pendingOrders.valid ? '#f8f9fa' : '#fff5f5',
              borderRadius: '4px',
              border: `1px solid ${validation.validations.pendingOrders.valid ? '#e9ecef' : '#fed7d7'}`
            }}>
              <span style={{ fontSize: '1.5rem' }}>
                {getValidationIcon(validation.validations.pendingOrders.valid)}
              </span>
              <div style={{ flex: 1 }}>
                <strong>Pedidos Pendientes</strong>
                <div style={{ 
                  color: getValidationColor(validation.validations.pendingOrders.valid),
                  fontSize: '0.9rem'
                }}>
                  {validation.validations.pendingOrders.message}
                </div>
              </div>
              {validation.validations.pendingOrders.count > 0 && (
                <span style={{
                  backgroundColor: '#dc3545',
                  color: 'white',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '12px',
                  fontSize: '0.8rem'
                }}>
                  {validation.validations.pendingOrders.count}
                </span>
              )}
            </div>

            {/* Turnos abiertos */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem',
              backgroundColor: validation.validations.openShifts.valid ? '#f8f9fa' : '#fff5f5',
              borderRadius: '4px',
              border: `1px solid ${validation.validations.openShifts.valid ? '#e9ecef' : '#fed7d7'}`
            }}>
              <span style={{ fontSize: '1.5rem' }}>
                {getValidationIcon(validation.validations.openShifts.valid)}
              </span>
              <div style={{ flex: 1 }}>
                <strong>Turnos Abiertos</strong>
                <div style={{ 
                  color: getValidationColor(validation.validations.openShifts.valid),
                  fontSize: '0.9rem'
                }}>
                  {validation.validations.openShifts.message}
                </div>
              </div>
              {validation.validations.openShifts.count > 0 && (
                <span style={{
                  backgroundColor: '#dc3545',
                  color: 'white',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '12px',
                  fontSize: '0.8rem'
                }}>
                  {validation.validations.openShifts.count}
                </span>
              )}
            </div>

            {/* Pagos pendientes */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem',
              backgroundColor: validation.validations.pendingPayments.valid ? '#f8f9fa' : '#fff5f5',
              borderRadius: '4px',
              border: `1px solid ${validation.validations.pendingPayments.valid ? '#e9ecef' : '#fed7d7'}`
            }}>
              <span style={{ fontSize: '1.5rem' }}>
                {getValidationIcon(validation.validations.pendingPayments.valid)}
              </span>
              <div style={{ flex: 1 }}>
                <strong>Pagos Pendientes</strong>
                <div style={{ 
                  color: getValidationColor(validation.validations.pendingPayments.valid),
                  fontSize: '0.9rem'
                }}>
                  {validation.validations.pendingPayments.message}
                </div>
              </div>
              {validation.validations.pendingPayments.count > 0 && (
                <span style={{
                  backgroundColor: '#dc3545',
                  color: 'white',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '12px',
                  fontSize: '0.8rem'
                }}>
                  {validation.validations.pendingPayments.count}
                </span>
              )}
            </div>

            {/* Stock bajo */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '1rem',
              padding: '1rem',
              backgroundColor: validation.validations.lowStock.valid ? '#f8f9fa' : '#fff3cd',
              borderRadius: '4px',
              border: `1px solid ${validation.validations.lowStock.valid ? '#e9ecef' : '#ffeaa7'}`
            }}>
              <span style={{ fontSize: '1.5rem' }}>
                {validation.validations.lowStock.valid ? '✅' : '⚠️'}
              </span>
              <div style={{ flex: 1 }}>
                <strong>Stock Bajo</strong>
                <div style={{ 
                  color: validation.validations.lowStock.valid ? '#28a745' : '#856404',
                  fontSize: '0.9rem'
                }}>
                  {validation.validations.lowStock.message}
                </div>
                {validation.validations.lowStock.products && validation.validations.lowStock.products.length > 0 && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <strong>Productos con stock bajo:</strong>
                    <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
                      {validation.validations.lowStock.products.map((product, index) => (
                        <li key={index} style={{ fontSize: '0.8rem' }}>
                          {product.name}: {product.currentStock} (mín: {product.minStock})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              {validation.validations.lowStock.count > 0 && (
                <span style={{
                  backgroundColor: '#ffc107',
                  color: '#212529',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '12px',
                  fontSize: '0.8rem'
                }}>
                  {validation.validations.lowStock.count}
                </span>
              )}
            </div>
          </div>

          {/* Resultado de validación */}
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            backgroundColor: validation.canClose ? '#d4edda' : '#f8d7da',
            color: validation.canClose ? '#155724' : '#721c24',
            borderRadius: '4px',
            border: `1px solid ${validation.canClose ? '#c3e6cb' : '#f5c6cb'}`,
            textAlign: 'center'
          }}>
            <strong>
              {validation.canClose 
                ? '✅ El sistema está listo para el cierre diario' 
                : '❌ Hay problemas que deben resolverse antes del cierre'
              }
            </strong>
          </div>
        </div>
      )}

      {/* Botones de acción */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {closeStatus && !closeStatus.isClosed && (
          <>
            <button
              onClick={runPreCloseValidation}
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#17a2b8',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? '🔄 Validando...' : '🔍 Ejecutar Validaciones'}
            </button>

            <button
              onClick={executeDailyClose}
              disabled={loading || (validation !== null && !validation.canClose)}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: (loading || (validation !== null && !validation.canClose)) ? 'not-allowed' : 'pointer',
                opacity: (loading || (validation !== null && !validation.canClose)) ? 0.6 : 1
              }}
            >
              {loading ? '🔄 Cerrando...' : '🔒 Ejecutar Cierre Diario'}
            </button>
          </>
        )}

        {closeStatus && closeStatus.isClosed && (
          <button
            onClick={reopenDay}
            disabled={loading}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? '🔄 Reabriendo...' : '🔓 Reabrir Día (Admin)'}
          </button>
        )}

        <button
          onClick={fetchCloseStatus}
          disabled={loading}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1
          }}
        >
          🔄 Actualizar Estado
        </button>
      </div>
    </div>
  );
};

export default DailyClosePage;