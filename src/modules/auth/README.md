# Auth Module — ContaMind AI

> Estado: PARCIAL → mayormente funcional — última revisión: 14 de Mayo, 2026 (Fase 3 aplicada)

Módulo robusto de autenticación y gestión de sesiones para ContaMind AI. Implementa un sistema de autenticación basado en JWT con rotación de tokens, gestión de dispositivos, auditoría de seguridad y soporte para 2FA (TOTP), aunque algunas integraciones avanzadas (scoring de anomalías y rate limiting) están en fase de utilidad sin conexión directa con los servicios principales.

---

## Índice

1. [Arquitectura](#arquitectura)
2. [Integración con Supabase](#integración-con-supabase)
3. [Features implementadas](#features-implementadas)
4. [Features pendientes](#features-pendientes)
5. [Endpoints](#endpoints)
6. [Guards y Decoradores](#guards-y-decoradores)
7. [Flujos de autenticación](#flujos-de-autenticación)
8. [Modelos de base de datos](#modelos-de-base-de-datos)
9. [Variables de entorno](#variables-de-entorno)
10. [Instalación y setup](#instalación-y-setup)
11. [Tests](#tests)
12. [Troubleshooting](#troubleshooting)
13. [Decisiones de diseño](#decisiones-de-diseño)

---

## Arquitectura

El módulo está diseñado siguiendo una arquitectura de servicios especializados y utilidades desacopladas. La lógica central reside en `AuthService`, que coordina el registro y login, delegando la persistencia de sesiones a `AuthSessionService` y la gestión de dispositivos a `AuthDeviceService`. Las tareas de bajo nivel como el hasheo de contraseñas, generación de tokens y geolocalización se delegan a clases en `utils/`.

El flujo de seguridad se apoya en Guards de NestJS que interceptan las peticiones para validar JWTs (`JwtGuard`) y permisos granulares (`PermissionGuard`), consultando directamente la base de datos a través de `PrismaService`.

### Árbol de dependencias

```
AuthController
  └── AuthService
        ├── PrismaService
        ├── PasswordUtil
        ├── AuthSessionService
        │     ├── PrismaService
        │     ├── JwtUtil
        │     └── AuthDeviceService
        │           ├── PrismaService
        │           └── DeviceFingerprintUtil
        └── AuthAuditService
              └── PrismaService

AuthSessionController
  └── AuthSessionService (...)

AuthDeviceController
  └── AuthDeviceService (...)
```

---

## Integración con Supabase

### Modelo de integración actual

**Opción C**: Supabase es utilizado únicamente como base de datos PostgreSQL a través de Prisma. El sistema de autenticación de Supabase (GoTrue) **no se utiliza actualmente**. Toda la lógica de registro, login, emisión de JWT y validación es propia de la aplicación NestJS.

Evidencia en el código:
- `src/modules/auth/auth.service.ts:31`: El campo `supabaseUid` se puebla con un placeholder (`dto.email`).
- `src/modules/auth/strategies/jwt.strategy.ts`: Valida tokens usando un `JWT_SECRET` local, no la clave de Supabase.

### Campo `supabaseUid`

El modelo `User` en Prisma tiene `supabaseUid: String @unique`.
- **Uso actual**: Placeholder (se guarda el email del usuario).
- **Impacto**: No hay conexión real con las identidades de Supabase Auth. Si se decidiera migrar a Supabase Auth en el futuro, este campo debería actualizarse con los UUIDs reales de la tabla `auth.users` de Supabase.

### JWT: ¿de Supabase o propio?

El sistema emite un **JWT propio** firmado con la variable de entorno `JWT_SECRET` definida en NestJS.
- `JwtStrategy` valida contra `JWT_SECRET`.
- No hay validación de tokens emitidos externamente por Supabase.

---

## Features implementadas

- ✅ **Registro de usuario** — Crea usuarios en DB con hash bcrypt (12 rondas). Previene duplicados.
- ✅ **Login con JWT** — Emite Access Token (15m) y Refresh Token (30d). Protegido contra timing attacks.
- ✅ **Gestión de sesiones** — Permite listar sesiones activas, revocar una específica o todas (logout global).
- ✅ **Gestión de dispositivos** — Registro automático al login basado en fingerprint (UA + IP). Marcado como confiable.
- ✅ **2FA TOTP (Core)** — Servicio `Auth2FAService` completo con generación de QR, activación y validación.
- ✅ **Backup codes** — Generación de 10 códigos SHA-256 de un solo uso.
- ✅ **Auditoría** — Logueo de acciones `register` y `login` con IP y User Agent.
- ✅ **Permiso granular** — `PermissionGuard` consulta la tabla `Permission` en DB para autorizar acciones.
- ✅ **Geolocalización** — `GeolocationUtil` funcional con `geoip-lite` y cálculo de distancia (Haversine).
- ✅ **Rate limiting** — Sliding window Redis en `login()`: 5 req/60s por email. Lanza `HttpException(429)` con audit log de fallos.
- ✅ **Anomaly scoring** — 6 factores evaluados en cada login. Score ≥ 90 bloquea; score ≥ 40 requiere 2FA.
- ✅ **2FA Integration** — `Auth2FAController` expone `setup`, `activate`, `verify`, `backup-codes/regenerate` y `disable`.
- ✅ **RequireReauthGuard** — Implementado con reauthToken JWT de 5 min. Protege `POST /auth/change-password`.
- ✅ **Cambio de contraseña** — Con historial de 5 passwords, revocación global de sesiones y audit log.

---

## Features pendientes

### Crítico (bloquea producción)
- **`Require2FAGuard` sigue siendo stub**: retorna `true` siempre sin verificar `twoFAEnabled`. Requiere claim `twoFAVerified` en el JWT de sesión.
- **Invalidación de caché de permisos**: `redis.del('perms:{userId}')` debe llamarse cuando cambien los permisos de un usuario. Actualmente el caché puede servir permisos obsoletos por 5 min.

### Importante
- **`knownCountries` en anomaly scoring**: parsear del campo `geolocation` de `AuthAuditLog` cuando se pueble.
- **`failedAttemptsLast24h`**: query real a `AuthAuditLog` para contar fallos recientes (actualmente hardcoded a 0).
- **Bloqueo automático de cuenta**: incrementar contador y bloquear tras N intentos.

### Nice-to-have
- WebAuthn/FIDO2
- SMS OTP via Twilio

---

## Endpoints

### Auth Core — `POST /auth/*`

| Método | Ruta | Guard | Body | Respuesta | Descripción |
|--------|------|-------|------|-----------|-------------|
| POST | /auth/register | — | RegisterDto | `{ userId, message }` | Registro de nuevo usuario |
| POST | /auth/login | — | LoginDto | `{ accessToken, refreshToken, user, securityWarnings? }` | Login con email+password (Rate Limited) |
| POST | /auth/refresh | JwtRefreshGuard | RefreshDto | `{ accessToken, refreshToken }` | Rotación de tokens |
| POST | /auth/logout | JwtGuard | `{ refreshToken }` | `{ success }` | Cierre de sesión |
| POST | /auth/reauth | JwtGuard | `{ password }` | `{ reauthToken }` | Emite reauth JWT de 5 min |
| POST | /auth/change-password | JwtGuard + RequireReauthGuard | ChangePasswordDto + reauthToken | `{ message }` | Cambia password + revoca sesiones |
| POST | /auth/2fa/setup | JwtGuard | — | `{ secret, qrCode, backupCodes }` | Inicia configuración de TOTP |
| POST | /auth/2fa/activate | JwtGuard | `{ token }` | `{ message, backupCodes }` | Confirma y activa 2FA |
| POST | /auth/2fa/verify | JwtGuard | `{ totpToken?, backupCode? }` | `{ verified, method }` | Verifica token para ops sensibles |
| DELETE | /auth/2fa | JwtGuard | `{ token }` | `{ message }` | Desactiva 2FA del usuario |

### Sesiones — `GET\|DELETE /auth/sessions/*`

| Método | Ruta | Guard | Descripción |
|--------|------|-------|-------------|
| GET | /auth/sessions | JwtGuard | Lista sesiones activas del usuario |
| DELETE | /auth/sessions/:id | JwtGuard | Revoca sesión específica |
| DELETE | /auth/sessions | JwtGuard | Revoca todas las sesiones |

### Dispositivos — `GET\|PATCH\|DELETE /auth/devices/*`

| Método | Ruta | Guard | Descripción |
|--------|------|-------|-------------|
| GET | /auth/devices | JwtGuard | Lista dispositivos registrados |
| PATCH | /auth/devices/:id | JwtGuard | Renombrar o marcar como confiable |
| DELETE | /auth/devices/:id | JwtGuard | Revocar dispositivo y sus sesiones |

---

## Guards y Decoradores

### Guards disponibles

| Guard | Archivo | Estado | Descripción |
|-------|---------|--------|--------------|
| `JwtGuard` | guards/jwt.guard.ts | ✅ | Valida Bearer token en header |
| `JwtRefreshGuard` | guards/jwt-refresh.guard.ts | ✅ | Valida refresh token en body |
| `PermissionGuard` | guards/permission.guard.ts | ✅ | Verifica permiso granular; caché Redis TTL 5 min |
| `Require2FAGuard` | guards/require-2fa.guard.ts | ⚠️ stub | Retorna `true` siempre. Pendiente implementar verificación. |
| `RequireReauthGuard` | guards/require-reauth.guard.ts | ✅ | Valida reauthToken JWT (`reauth: true`, 5 min) |

### Decoradores disponibles

| Decorador | Uso | Descripción |
|-----------|-----|-------------|
| `@CurrentUser()` | `@CurrentUser() user: any` | Inyecta `{ id }` del payload del JWT |
| `@CurrentDevice()` | `@CurrentDevice() device: any` | Inyecta el objeto device (requiere middleware previo) |
| `@HasPermission('name')` | `@HasPermission('invoice.create')` | Setea metadata para `PermissionGuard` |
| `@Require2FA()` | `@Require2FA()` | Setea metadata para `Require2FAGuard` |

---

## Flujos de autenticación

### Flujo 1: Registro

1. Cliente envía `POST /auth/register`.
2. `AuthService` verifica que el email no exista en la tabla `User`.
3. Se hashea la contraseña con bcrypt (12 rondas).
4. Se crea el usuario con un `supabaseUid` temporal (igual al email).
5. Se registra la acción en `AuthAuditLog`.

### Flujo 2: Login (Sin 2FA)

1. Cliente envía `POST /auth/login`.
2. `AuthService` busca el usuario por email. Si no existe, realiza un hash dummy para evitar timing attacks.
3. Se verifica el hash de la contraseña.
4. `AuthSessionService` delega a `AuthDeviceService` el registro/actualización del dispositivo (fingerprint UA+IP).
5. Se crea una nueva entrada en `AuthSession` con un `accessToken` (15m) y `refreshToken` (30d).
6. Se retorna el par de tokens y la información básica del usuario.

### Flujo 3: Refresh de token

1. Cliente envía `POST /auth/refresh` con el `refreshToken`.
2. `JwtRefreshGuard` valida la firma del token.
3. `AuthSessionService` busca la sesión por el token.
4. Verifica que no haya expirado y que no haya sido revocada (detección de replay).
5. Genera nuevos tokens, actualiza la sesión existente (rotación) y retorna los nuevos valores.

---

## Modelos de base de datos

### User (campos de auth)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `supabaseUid` | String | Placeholder (actualmente email). |
| `passwordHash` | String | Hash bcrypt (12 rondas). |
| `twoFAEnabled` | Boolean | Indica si el usuario activó 2FA. |
| `totpSecret` | String? | Secreto TOTP (cifrado no implementado aún). |
| `backupCodes` | String[] | Array de hashes SHA-256. |
| `accountLocked` | Boolean | Indica si la cuenta está bloqueada. |

### AuthSession
Almacena cada sesión activa vinculada a un dispositivo. Contiene `accessToken` y `refreshToken` únicos, con sus respectivas fechas de expiración y estado de revocación.

### AuthDevice
Registra los dispositivos desde los que el usuario accede. Usa un `fingerprint` generado a partir de `UserAgent` e `IP` para reconocer dispositivos recurrentes y marcarlos como confiables.

---

## Variables de entorno

| Variable | Requerida | Default | Descripción |
|----------|-----------|---------|-------------|
| `JWT_SECRET` | ✅ | — | Secreto para firmar y validar tokens JWT. |
| `REDIS_HOST` | ✅ | `localhost` | Host para la conexión con Redis. |
| `REDIS_PORT` | ❌ | `6379` | Puerto de Redis. |
| `DATABASE_URL` | ✅ | — | URL de conexión PostgreSQL (Prisma). |

---

## Instalación y setup

### Dependencias clave
- `bcrypt`: Hasheo de contraseñas.
- `otplib`: Lógica de TOTP.
- `qrcode`: Generación de códigos QR para 2FA.
- `geoip-lite`: Geolocalización por IP.
- `ioredis`: Cliente para Redis (Rate limiting).

---

## Tests

### Estado actual de los tests

| Archivo | Tests | Pasando | Cobertura |
|---------|-------|---------|-----------|
| auth.service.spec.ts | 3 | 3 | Básica |
| auth-2fa.service.spec.ts | 2 | 2 | Básica |

Los tests actuales cubren:
- Prevención de duplicados en registro.
- Resistencia a timing attacks en login.
- Consumo de backup codes de un solo uso.

---

## Decisiones de diseño

### JWT propio vs Supabase JWT
**Decisión**: Uso de JWT propio gestionado por NestJS.
**Razón**: Mayor control sobre la rotación de tokens, vida útil y personalización del payload sin depender de la configuración de un tercero (Supabase Auth). Facilita la implementación de lógica custom como el "replay detection".

### bcrypt 12 rondas
**Decisión**: Cost factor de 12 para hasheo.
**Razón**: Equilibrio óptimo entre seguridad (resistencia a fuerza bruta) y rendimiento del servidor (~250ms por verificación).

### Backup codes con SHA-256
**Decisión**: SHA-256 para los códigos de respaldo.
**Razón**: Los códigos generados aleatoriamente tienen alta entropía intrínseca; no requieren el costo computacional de bcrypt para ser seguros, permitiendo una verificación instantánea.
