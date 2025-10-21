# Configuración de Supabase para QR Restaurant

## Pasos para configurar Supabase

### 1. Crear cuenta y proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Crea una cuenta gratuita
3. Crea un nuevo proyecto:
   - **Nombre del proyecto**: `qr-restaurant`
   - **Contraseña de la base de datos**: Guarda esta contraseña de forma segura
   - **Región**: Selecciona la más cercana a tu ubicación

### 2. Obtener las credenciales

Una vez creado el proyecto:

1. Ve a **Settings** → **API**
2. Copia las siguientes credenciales:
   - **Project URL**: `https://your-project-ref.supabase.co`
   - **anon public key**: Para operaciones del cliente
   - **service_role secret key**: Para operaciones del servidor

### 3. Obtener la URL de la base de datos

1. Ve a **Settings** → **Database**
2. En la sección **Connection string**, copia:
   - **URI**: Para `DATABASE_URL`
   - **Direct connection**: Para `DIRECT_URL`

### 4. Configurar variables de entorno

Crea un archivo `.env` en la carpeta `backend` basado en `.env.example`:

```env
# Supabase Configuration
SUPABASE_URL="https://your-project-ref.supabase.co"
SUPABASE_ANON_KEY="tu-anon-key-aqui"
SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key-aqui"
DATABASE_URL="postgresql://postgres:[TU-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[TU-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# JWT
JWT_SECRET="tu-jwt-secret-super-seguro"
JWT_EXPIRES_IN="7d"

# Server Configuration
PORT=3001
NODE_ENV="development"

# CORS
CORS_ORIGIN="http://localhost:5173"

# Webpay (Transbank) - Ambiente de pruebas
WEBPAY_COMMERCE_CODE="597055555532"
WEBPAY_API_KEY="579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C"
WEBPAY_ENVIRONMENT="integration"
```

### 5. Ejecutar migraciones

Una vez configuradas las variables de entorno:

```bash
cd backend
npm run db:generate
npm run db:push
```

### 6. Verificar la conexión

Ejecuta el servidor para verificar que todo funciona:

```bash
npm run dev
```

## Ventajas de usar Supabase

- ✅ **Base de datos PostgreSQL** completamente gestionada
- ✅ **Autenticación** integrada (opcional)
- ✅ **API REST** automática
- ✅ **Realtime subscriptions** para notificaciones
- ✅ **Dashboard** para administrar datos
- ✅ **Backups automáticos**
- ✅ **SSL** incluido
- ✅ **Plan gratuito** generoso

## Próximos pasos

1. Configurar Supabase siguiendo esta guía
2. Ejecutar las migraciones de Prisma
3. Probar la conexión del backend
4. Implementar los endpoints de la API REST