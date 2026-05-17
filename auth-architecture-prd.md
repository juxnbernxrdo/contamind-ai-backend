# PRD Definitivo: Arquitectura de Autenticación Frontend (Enterprise SaaS 2026)

**Estado:** Backend Certificado: **PRODUCTION READY** (Readiness Score: 98/100).
**Alineación:** Este documento asume una integración con el backend remediado que implementa Rotación de Familias de Tokens, Blacklist de JTI y Validación Zero-Trust de 2FA.

---

## 1. Auth State Machine (Formal DFA)
El frontend debe implementar un Autómata Finito Determinista (DFA) para gestionar el ciclo de vida de la autenticación:

- **IDLE:** Estado inicial. RAM vacía.
- **HYDRATING:** Verificación Zero-Trust de cookies síncrona con el backend.
- **AUTH_PENDING:** Credenciales enviadas, esperando respuesta.
- **AWAITING_2FA:** Credenciales válidas, pero se requiere OTP (Session Claim: `is2FAVerified: false`).
- **AUTHENTICATED:** Acceso completo (Session Claim: `is2FAVerified: true`). Roles y permisos inyectados en RAM.
- **REFRESHING:** Mutex activo. Solo una petición de refresco permitida. Peticiones concurrentes encoladas.
- **DEGRADED:** Fallo de red temporal. Intentos de reconexión con backoff.
- **FORCED_REAUTH:** Contexto sensible (ej. cambio de password) requiere re-validación.
- **LOGGING_OUT:** Proceso de revocación en backend iniciado.
- **TERMINATED:** Sesión purgada de RAM y cookies.

---

## 2. Security Blockers de Implementación

### [SECURITY BLOCKER 1] Cross-tab Auth Synchronization
- **BroadcastChannel API:** Sincronización obligatoria de Login/Logout entre todas las pestañas abiertas.
- **Leadership Election:** Una sola pestaña actúa como líder para el proceso de Refresh Token Rotation para evitar colisiones de familia.
- **Stale-tab Invalidation:** Si la pestaña A cierra sesión, la pestaña B debe invalidar su estado y mostrar el login inmediatamente sin recargar.

### [SECURITY BLOCKER 2] Formal Device Fingerprint Contract
- El frontend enviará un fingerprint pasivo en cada login/refresh para Session Binding.
- **Señales:** Combinación de `Canvas Fingerprint`, `Screen Resolution`, y `Hardware Concurrency` (sin PII invasivo).
- **Drift Tolerance:** Tolerancia nula para cambios de OS/Browser en la misma familia de tokens. Cualquier drift dispara `AUTH_SUSPICIOUS_ACTIVITY`.

### [SECURITY BLOCKER 3] Deterministic Recovery Resolution
- **Refresh Response Loss:** Si la petición de refresh falla por red tras ser emitida, el cliente debe reintentar usando el `jti` anterior para detectar si el servidor ya lo rotó (usando el estado de revocación de familia).
- **Zombie State Prevention:** Bloqueo de UI si el estado de RAM indica `AUTHENTICATED` pero el backend retorna `401`.

---

## 3. Strict API Schemas & Contracts

### POST /auth/login
- **Success (Standard):** `{ accessToken, refreshToken, user: { is2FAVerified: true, ... } }`
- **Success (2FA Required):** `{ accessToken, user: { is2FAVerified: false }, message: "AUTH_2FA_REQUIRED" }`
- **Error:** `AUTH_INVALID_CREDENTIALS`, `AUTH_ACCOUNT_LOCKED`.

### POST /auth/2fa/verify
- **Request:** `{ totpToken | backupCode, refreshToken? }`
- **Success:** `{ verified: true, accessToken, refreshToken }` -> Emite tokens con claim `is2FAVerified: true`.

### POST /auth/refresh
- **Request:** `{ refreshToken }` (enviado vía HttpOnly cookie o Body según config).
- **Success:** `{ accessToken, refreshToken }` -> Hereda el claim `is2FAVerified` del token original.
- **Error:** `AUTH_REFRESH_REPLAY_DETECTED` (dispara purga total).

---

## 4. Middleware & Route Protection Strategy
- **Zero-Trust SSR:** No se renderiza contenido privado basado solo en la existencia de una cookie. El servidor debe validar el token contra el backend en cada petición de página.
- **Access Token Persistence:** ESTRICTAMENTE PROHIBIDO en `localStorage`. Los tokens viven únicamente en la memoria volátil del closure del AuthProvider.

---

## 5. Auth Observability & Telemetry
El frontend emitirá eventos obligatorios para auditoría:
- `auth_refresh_family_rotated`
- `auth_2fa_bypass_attempt_detected` (si se intenta acceder a ruta protegida con flag false)
- `auth_session_binding_drift`
- `auth_multi_tab_sync_success`

---

## 6. Testing Strategy: Chaos Auth
- **Refresh Storms:** Simulación de 50 peticiones concurrentes disparando un solo refresh.
- **Interrupted Rotation:** Corte de red justo después de enviar el refresh token pero antes de recibir el nuevo.
- **Family Replay simulation:** Intento manual de usar un token de refresco ya rotado.
