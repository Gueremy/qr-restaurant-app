const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testConnection() {
  console.log('🔍 Probando conexión a Supabase...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variables de entorno faltantes');
    return;
  }
  
  console.log('📡 URL:', supabaseUrl);
  console.log('🔑 Key:', supabaseKey.substring(0, 20) + '...');
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Probar una consulta simple
    const { data, error } = await supabase
      .from('_prisma_migrations')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('⚠️  Error en consulta (normal si no hay tablas):', error.message);
    } else {
      console.log('✅ Conexión exitosa!');
    }
    
    // Probar el estado del proyecto
    const { data: healthData, error: healthError } = await supabase
      .from('pg_stat_activity')
      .select('*')
      .limit(1);
      
    if (healthError) {
      console.log('📊 Estado del proyecto:', healthError.message);
    } else {
      console.log('✅ Proyecto activo y funcionando');
    }
    
  } catch (err) {
    console.error('❌ Error de conexión:', err.message);
  }
}

testConnection();