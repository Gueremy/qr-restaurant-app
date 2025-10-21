// Utilidad para limpiar localStorage y regenerar datos del menú
// Ejecutar en la consola del navegador para solucionar el error de JSON

console.log('🧹 Limpiando localStorage...');

// Claves a eliminar
const keysToRemove = [
  'restaurant_menu_items',
  'restaurant_orders', 
  'restaurant_order_items',
  'restaurant_messages'
];

// Eliminar cada clave
keysToRemove.forEach(key => {
  if (localStorage.getItem(key)) {
    localStorage.removeItem(key);
    console.log(`✅ Eliminado: ${key}`);
  } else {
    console.log(`ℹ️  No encontrado: ${key}`);
  }
});

console.log('🔄 Recarga la página para regenerar los datos con formato correcto');
console.log('📋 Datos que se regenerarán:');
console.log('   - Menú con formato JSON válido');
console.log('   - Base de datos limpia para pedidos');
console.log('   - Mensajes reiniciados');