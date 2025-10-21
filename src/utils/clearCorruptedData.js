// Script para limpiar datos corruptos del localStorage
console.log('🧹 Limpiando datos corruptos del localStorage...');

// Función para verificar si un string es JSON válido
function isValidJSON(str) {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

// Función para limpiar datos corruptos
function cleanCorruptedData() {
  const keys = ['qr-menu-items', 'qr-orders', 'qr-order-items', 'qr-messages'];
  
  keys.forEach(key => {
    try {
      const data = localStorage.getItem(key);
      if (data) {
        // Verificar si los datos son JSON válido
        if (!isValidJSON(data)) {
          console.log(`❌ Datos corruptos encontrados en ${key}, limpiando...`);
          localStorage.removeItem(key);
        } else {
          // Verificar si es un array de items del menú
          if (key === 'qr-menu-items') {
            const items = JSON.parse(data);
            if (Array.isArray(items)) {
              const cleanedItems = items.map(item => {
                // Asegurar que tags y variants sean arrays
                if (typeof item.tags === 'string') {
                  try {
                    item.tags = JSON.parse(item.tags);
                  } catch (e) {
                    console.log(`❌ Tags corruptos en item ${item.id}, usando array vacío`);
                    item.tags = [];
                  }
                }
                if (typeof item.variants === 'string') {
                  try {
                    item.variants = JSON.parse(item.variants);
                  } catch (e) {
                    console.log(`❌ Variants corruptos en item ${item.id}, usando array vacío`);
                    item.variants = [];
                  }
                }
                return item;
              });
              localStorage.setItem(key, JSON.stringify(cleanedItems));
              console.log(`✅ Datos de ${key} limpiados y corregidos`);
            }
          } else {
            console.log(`✅ Datos de ${key} están correctos`);
          }
        }
      } else {
        console.log(`ℹ️ No hay datos en ${key}`);
      }
    } catch (error) {
      console.error(`❌ Error procesando ${key}:`, error);
      localStorage.removeItem(key);
    }
  });
}

// Ejecutar la limpieza
cleanCorruptedData();
console.log('✅ Limpieza completada');