import React, { useState, useEffect } from 'react';
import DashboardPage from '../components/DashboardPage';
import ReportsPage from '../components/ReportsPage';
import DailyClosePage from '../components/DailyClosePage';
import { 
  DashboardTab, 
  CashRegisterTab, 
  MenuTab, 
  StaffTab, 
  TablesTab, 
  OrdersTab, 
  PaymentsTab, 
  ReportsTab 
} from '../components/AdminTabs';
import type { MenuItem } from '../store';

interface TableInfo {
  id: string;
  number: number;
  capacity: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'OUT_OF_SERVICE';
  qrCode?: string;
  currentOrders: string[];
}

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'WAITER' | 'KITCHEN';
  password: string;
  active: boolean;
  createdAt: Date;
}

const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados para formularios
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'ADMIN' | 'MANAGER' | 'WAITER' | 'KITCHEN'>('WAITER');

  // Estados adicionales
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [editingProduct, setEditingProduct] = useState<any>(null);

  // Cargar datos iniciales
  useEffect(() => {
    const loadAllData = async () => {
      setIsLoading(true);
      await Promise.all([
        loadTables(),
        loadStaff(),
        loadMenu(),
        loadCategories()
      ]);
      setIsLoading(false);
    };
    
    loadAllData();
  }, []);

  const loadTables = async () => {
    try {
      const response = await fetch('/api/tables');
      if (response.ok) {
        const result = await response.json();
        // La API devuelve {success: true, data: [...]}
        const data = result.data || result;
        // Asegurar que data sea un array
        setTables(Array.isArray(data) ? data : []);
      } else {
        console.error('Error loading tables: Response not ok');
        setTables([]);
      }
    } catch (error) {
      console.error('Error loading tables:', error);
      setTables([]);
    }
  };

  const loadStaff = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        // Extraer los usuarios de la respuesta paginada
        const users = data.data || [];
        setStaff(Array.isArray(users) ? users : []);
      } else {
        console.error('Error loading staff: Response not ok');
        setStaff([]);
      }
    } catch (error) {
      console.error('Error loading staff:', error);
      setStaff([]);
    }
  };

  const loadCategories = async () => {
    try {
      console.log('Cargando categorías...');
      const response = await fetch('/api/categories');
      console.log('Respuesta de categorías:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Datos de categorías recibidos:', data);
        const categoriesData = data.data || [];
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
        console.log('Categorías establecidas:', categoriesData);
      } else {
        console.error('Error loading categories: Response not ok', response.status);
        setCategories([]);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategories([]);
    }
  };

  const loadMenu = async () => {
    try {
      const response = await fetch('/api/products');
      if (response.ok) {
        const data = await response.json();
        // Extraer los productos de la respuesta paginada
        const products = data.data || [];
        setMenu(Array.isArray(products) ? products : []);
      } else {
        console.error('Error loading menu: Response not ok');
        setMenu([]);
      }
    } catch (error) {
      console.error('Error loading menu:', error);
      setMenu([]);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  // Funciones para mesas
  const handleAddTable = async (table: Omit<TableInfo, 'id' | 'qrCode' | 'currentOrders'>) => {
    try {
      const newTable = {
        ...table,
        currentOrders: []
      };
      
      const response = await fetch('/api/tables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTable),
      });
      
      if (response.ok) {
        await loadTables(); // Recargar las mesas después de agregar
      } else {
        const errorData = await response.json();
        console.error('Error adding table:', errorData);
        alert(`Error al agregar mesa: ${errorData.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error adding table:', error);
      alert('Error al agregar mesa. Por favor, intente nuevamente.');
    }
  };

  const handleGenerateQR = async (tableId: string) => {
    try {
      const response = await fetch(`/api/tables/${tableId}/qr`, {
        method: 'POST',
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`Código QR generado exitosamente: ${result.data.qrCode}`);
        loadTables(); // Recargar para obtener el QR actualizado
      } else {
        const error = await response.json();
        alert(`Error al generar QR: ${error.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error generating QR:', error);
      alert('Error al generar código QR. Por favor, intente nuevamente.');
    }
  };

  const handleUpdateTableStatus = async (tableId: string, status: TableInfo['status']) => {
    try {
      const response = await fetch(`/api/tables/${tableId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      
      if (response.ok) {
        loadTables();
      } else {
        const error = await response.json();
        alert(`Error al actualizar estado: ${error.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error updating table status:', error);
      alert('Error al actualizar estado de la mesa. Por favor, intente nuevamente.');
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    if (!confirm('¿Está seguro de que desea eliminar esta mesa?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/tables/${tableId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        alert('Mesa eliminada exitosamente');
        loadTables();
      } else {
        const error = await response.json();
        
        // Manejo específico para error 409 (Conflict)
        if (response.status === 409) {
          alert('❌ No se puede eliminar la mesa porque tiene pedidos activos.\n\nPor favor, complete o cancele todos los pedidos de esta mesa antes de eliminarla.');
        } else {
          alert(`Error al eliminar mesa: ${error.error || 'Error desconocido'}`);
        }
      }
    } catch (error) {
      console.error('Error deleting table:', error);
      alert('Error al eliminar mesa. Por favor, intente nuevamente.');
    }
  };

  const handleEditTable = async (tableId: string, updates: Partial<TableInfo>) => {
    try {
      const response = await fetch(`/api/tables/${tableId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (response.ok) {
        alert('Mesa actualizada exitosamente');
        loadTables();
      } else {
        const error = await response.json();
        alert(`Error al actualizar mesa: ${error.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error editing table:', error);
      alert('Error al editar mesa. Por favor, intente nuevamente.');
    }
  };

  // Funciones para personal
  const handleAddStaff = async () => {
    if (!newStaffName.trim() || !newStaffPassword.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      const newStaffMember = {
        name: newStaffName.trim(),
        email: `${newStaffName.trim().toLowerCase().replace(/\s+/g, '.')}@restaurant.com`,
        password: newStaffPassword.trim(),
        role: newStaffRole // Ya está en mayúsculas
      };
      
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newStaffMember),
      });
      
      if (response.ok) {
        loadStaff();
        // Limpiar formulario
        setNewStaffName('');
        setNewStaffPassword('');
        setNewStaffRole('WAITER');
      } else {
        const errorData = await response.json();
        console.error('Error adding staff member:', errorData);
      }
    } catch (error) {
      console.error('Error adding staff member:', error);
    }
  };

  const handleToggleStaffStatus = async (id: string) => {
    try {
      console.log('Intentando cambiar estado del staff con ID:', id);
      
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Error: {success: false, error: Token de acceso requerido}');
        return;
      }
      
      // Encontrar el miembro del staff para obtener su estado actual
      const staffMember = staff.find(member => member.id === id);
      if (!staffMember) {
        console.error('Staff member not found with ID:', id);
        return;
      }

      console.log('Staff member encontrado:', staffMember);
      console.log('Cambiando active de', staffMember.active, 'a', !staffMember.active);

      const response = await fetch(`/api/users/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ active: !staffMember.active }),
      });

      console.log('Respuesta del servidor:', response.status, response.statusText);

      if (response.ok) {
        const result = await response.json();
        console.log('Estado actualizado exitosamente:', result);
        loadStaff(); // Recargar la lista de staff
      } else {
        const errorData = await response.json();
        console.error('Error toggling staff status:', errorData);
        
        if (response.status === 401) {
          alert('Error: {success: false, error: Token de acceso requerido}');
        } else {
          alert(`Error: ${errorData.message || 'No se pudo cambiar el estado del personal'}`);
        }
      }
    } catch (error) {
      console.error('Error toggling staff status:', error);
      alert('Error de conexión al cambiar estado del personal');
    }
  };

  const handleDeleteStaff = async (id: string) => {
    try {
      console.log('Intentando eliminar staff con ID:', id);
      const token = localStorage.getItem('token');
      
      if (!token) {
        alert('Error deleting staff: {success: false, error: Token de acceso requerido}');
        return;
      }
      
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      console.log('Respuesta del servidor para eliminación:', response.status, response.statusText);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Staff eliminado exitosamente:', result);
        loadStaff();
        alert('Personal eliminado exitosamente');
      } else {
        const errorData = await response.json();
        console.error('Error deleting staff:', errorData);
        
        if (response.status === 401) {
          alert('Error deleting staff: {success: false, error: Token de acceso requerido}');
        } else {
          alert(`Error: ${errorData.message || 'No se pudo eliminar el personal'}`);
        }
      }
    } catch (error) {
      console.error('Error deleting staff:', error);
      alert('Error de conexión al eliminar personal');
    }
  };

  // Funciones para menú
  const handleAddItem = async () => {
    if (!name || !price || !selectedCategoryId) {
      alert('Por favor completa todos los campos requeridos (nombre, precio y categoría)');
      return;
    }

    try {
      const method = editingProduct ? 'PUT' : 'POST';
      const url = editingProduct 
        ? `/api/products/${editingProduct.id}` 
        : '/api/products';

      console.log('Enviando datos:', {
        name,
        price,
        image: image || undefined,
        categoryId: selectedCategoryId,
        active: true
      });

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          price,
          image: image || undefined,
          categoryId: selectedCategoryId,
          active: true
        }),
      });

      console.log('Respuesta del servidor:', response.status, response.statusText);

      if (response.ok) {
        const result = await response.json();
        console.log('Producto procesado exitosamente:', result);
        await loadMenu();
        // Limpiar formulario
        setName('');
        setDescription('');
        setPrice(0);
        setImage('');
        setSelectedCategoryId('');
        setEditingProduct(null);
        alert(editingProduct ? 'Producto actualizado exitosamente' : 'Producto agregado exitosamente');
      } else {
        const errorData = await response.json();
        console.error('Error del servidor:', errorData);
        alert(`Error: ${errorData.message || 'No se pudo procesar el producto'}`);
      }
    } catch (error) {
      console.error('Error de conexión:', error);
      alert('Error de conexión');
    }
  };

  const handleToggleStock = async (id: string, currentStock: boolean) => {
    try {
      const response = await fetch(`/api/products/${id}/availability`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ active: !currentStock }),
      });

      if (response.ok) {
        loadMenu(); // Reload menu to reflect changes
      } else {
        console.error('Error toggling stock');
      }
    } catch (error) {
      console.error('Error toggling stock:', error);
    }
  };

  const handleEditItem = (item: MenuItem) => {
    // Cargar los datos del producto en el formulario
    setEditingProduct(item);
    setName(item.name);
    setPrice(item.price);
    setDescription(''); // Limpiar descripción ya que no se usa
    setImage(item.image || '');
    setSelectedCategoryId(item.category || '');
  };

  const handleDeleteItem = async (id: string) => {
    // Buscar el producto para mostrar su nombre en la confirmación
    const product = menu.find(item => item.id === id);
    const productName = product ? product.name : 'este producto';
    
    // Mostrar mensaje de confirmación
    const confirmDelete = window.confirm(
      `¿Estás seguro de que quieres eliminar "${productName}"?\n\nEsta acción no se puede deshacer.`
    );
    
    if (!confirmDelete) {
      return; // El usuario canceló la eliminación
    }

    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        loadMenu();
        alert(`Producto "${productName}" eliminado exitosamente`);
      } else if (response.status === 409) {
        // Error 409: Conflicto - el producto tiene órdenes activas
        const errorData = await response.json();
        alert(`No se puede eliminar el producto "${productName}": ${errorData.message || 'El producto tiene historial de órdenes'}`);
      } else {
        const errorData = await response.json();
        alert(`Error al eliminar el producto "${productName}": ${errorData.message || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error deleting menu item:', error);
      alert(`Error de conexión al eliminar el producto "${productName}"`);
    }
  };

  // Renderizar componente activo basado en activeTab
  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab orders={orders} tables={tables} staff={staff} />;
      case 'cash-register':
        return <CashRegisterTab orders={orders} />;
      case 'menu':
        return <MenuTab 
          menu={menu}
          onAddItem={handleAddItem}
          onToggleStock={handleToggleStock}
          onEditItem={handleEditItem}
          onDeleteItem={handleDeleteItem}
          name={name}
          setName={setName}
          price={price}
          setPrice={setPrice}
          description={description}
          setDescription={setDescription}
          image={image}
          setImage={setImage}
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          setSelectedCategoryId={setSelectedCategoryId}
          editingProduct={editingProduct}
          setEditingProduct={setEditingProduct}
        />;
      case 'staff':
        return <StaffTab 
          staff={staff}
          onAddStaff={handleAddStaff}
          onToggleStatus={handleToggleStaffStatus}
          onDeleteStaff={handleDeleteStaff}
          newStaffName={newStaffName}
          setNewStaffName={setNewStaffName}
          newStaffPassword={newStaffPassword}
          setNewStaffPassword={setNewStaffPassword}
          newStaffRole={newStaffRole}
          setNewStaffRole={setNewStaffRole}
        />;
      case 'tables':
        return <TablesTab 
          tables={tables}
          onGenerateQR={handleGenerateQR}
          onAddTable={handleAddTable}
          onUpdateStatus={handleUpdateTableStatus}
          onDeleteTable={handleDeleteTable}
          onEditTable={handleEditTable}
        />;
      case 'orders':
        return <OrdersTab orders={orders} />;
      case 'payments':
        return <PaymentsTab orders={orders} />;
      case 'reports':
        return <ReportsPage />;
      case 'daily-close':
        return <DailyClosePage />;
      default:
        return <DashboardTab orders={orders} tables={tables} staff={staff} />;
    }
  };

  const tabs = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'cash-register', label: '💰 Caja' },
    { id: 'menu', label: '🍽️ Menú' },
    { id: 'staff', label: '👥 Personal' },
    { id: 'tables', label: '🪑 Mesas' },
    { id: 'orders', label: '📋 Órdenes' },
    { id: 'payments', label: '💳 Pagos' },
    { id: 'reports', label: '📈 Reportes' },
    { id: 'daily-close', label: '🔒 Cierre de Día' }
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #dee2e6',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ margin: 0, color: '#333' }}>
          👨‍💼 Panel de Administración
        </h1>
        <button
          onClick={handleLogout}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🚪 Cerrar Sesión
        </button>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #dee2e6',
        padding: '0 2rem',
        overflowX: 'auto'
      }}>
        <div style={{ display: 'flex', gap: '0', minWidth: 'max-content' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '1rem 1.5rem',
                backgroundColor: activeTab === tab.id ? '#007bff' : 'transparent',
                color: activeTab === tab.id ? 'white' : '#666',
                border: 'none',
                borderBottom: activeTab === tab.id ? '3px solid #007bff' : '3px solid transparent',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                transition: 'all 0.3s ease',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '2rem' }}>
        {isLoading ? (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '200px',
            fontSize: '18px',
            color: '#666'
          }}>
            🔄 Cargando datos...
          </div>
        ) : (
          renderActiveComponent()
        )}
      </div>
    </div>
  );
};

export default AdminPage;