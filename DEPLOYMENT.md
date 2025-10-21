# Guía de Despliegue - QR Restaurant

## Preparación para GitHub y Render

### 1. Variables de Entorno Requeridas

#### Backend (.env)
```bash
# Supabase Configuration (REQUERIDO)
SUPABASE_URL="https://your-project-ref.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# JWT (REQUERIDO)
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_EXPIRES_IN="7d"

# Server
PORT=3001
NODE_ENV="production"

# CORS (Se configurará automáticamente en Render)
FRONTEND_URL="https://your-frontend-url.onrender.com"

# Webpay (Transbank) - OPCIONAL
WEBPAY_COMMERCE_CODE="your-commerce-code"
WEBPAY_API_KEY="your-api-key"
WEBPAY_ENVIRONMENT="integration" # integration | production

# Email (OPCIONAL)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
```

#### Frontend (.env)
```bash
# API URL (Se configurará automáticamente en Render)
VITE_API_URL="https://your-backend-url.onrender.com"
NODE_ENV="production"
```

### 2. Pasos para Despliegue

#### Paso 1: Subir a GitHub
1. Inicializar repositorio Git:
   ```bash
   git init
   git add .
   git commit -m "Initial commit - QR Restaurant System"
   ```

2. Crear repositorio en GitHub y conectar:
   ```bash
   git remote add origin https://github.com/tu-usuario/qr-restaurant.git
   git branch -M main
   git push -u origin main
   ```

#### Paso 2: Configurar Render
1. Conectar tu repositorio de GitHub a Render
2. El archivo `render.yaml` ya está configurado para desplegar automáticamente
3. Configurar las variables de entorno en Render Dashboard:

**Variables que DEBES configurar manualmente en Render:**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `DIRECT_URL`
- `WEBPAY_COMMERCE_CODE` (opcional)
- `WEBPAY_API_KEY` (opcional)

**Variables que se configuran automáticamente:**
- `JWT_SECRET` (generado automáticamente)
- `FRONTEND_URL` y `VITE_API_URL` (configurados entre servicios)
- `PORT` y `NODE_ENV`

### 3. Configuración de Supabase

1. Crear proyecto en [Supabase](https://supabase.com)
2. Obtener las credenciales del proyecto:
   - Project URL
   - Anon Key
   - Service Role Key
   - Database URL

3. Ejecutar migraciones de Prisma:
   ```bash
   cd backend
   npx prisma db push
   npx prisma db seed
   ```

### 4. Verificación Post-Despliegue

1. **Frontend**: Verificar que redirija a `/login`
2. **Backend**: Verificar endpoint de salud en `/health`
3. **Base de datos**: Verificar conexión y datos iniciales
4. **Autenticación**: Probar login con usuarios seed
5. **WebPay**: Verificar integración (si está configurada)

### 5. URLs de Ejemplo

- **Frontend**: `https://qr-restaurant-frontend.onrender.com`
- **Backend**: `https://qr-restaurant-backend.onrender.com`
- **Health Check**: `https://qr-restaurant-backend.onrender.com/health`

### 6. Usuarios por Defecto (Seed Data)

```
Admin: admin@restaurant.com / admin123
Manager: manager@restaurant.com / manager123
Waiter: mesero@restaurant.com / mesero123
Kitchen: cocina@restaurant.com / cocina123
```

### 7. Troubleshooting

#### Error de Build
- Verificar que todas las dependencias estén en `package.json`
- Revisar logs de build en Render Dashboard

#### Error de Base de Datos
- Verificar credenciales de Supabase
- Ejecutar `npx prisma db push` manualmente

#### Error de CORS
- Verificar que `FRONTEND_URL` esté configurado correctamente
- Revisar configuración de CORS en backend

### 8. Comandos Útiles

```bash
# Desarrollo local
npm run dev                    # Frontend
cd backend && npm run dev      # Backend

# Build para producción
npm run build                  # Frontend
cd backend && npm run build    # Backend

# Base de datos
cd backend && npx prisma studio    # Abrir Prisma Studio
cd backend && npx prisma db push   # Aplicar cambios de schema
cd backend && npx prisma db seed   # Ejecutar seed data
```

## Notas Importantes

- ⚠️ **NUNCA** subas archivos `.env` a GitHub
- 🔐 Usa claves JWT seguras en producción
- 🌐 Configura HTTPS en producción
- 📊 Monitorea logs en Render Dashboard
- 🔄 Los deploys son automáticos con cada push a `main`