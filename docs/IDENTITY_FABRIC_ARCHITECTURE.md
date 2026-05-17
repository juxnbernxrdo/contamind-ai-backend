# ContaMind AI: Identity Fabric Architecture

## Visión General
ContaMind AI no utiliza un sistema de autenticación monolítico. Emplea un **Identity Fabric** diseñado para la automatización financiera soberana y el control de agentes de Inteligencia Artificial (Playwright) mediante Human-in-the-Loop (HITL).

El sistema se basa en un enfoque **Zero Trust**, separando estrictamente la identidad humana de la identidad de la IA, y dividiendo el control de acceso en planos especializados.

## Arquitectura de Planos (Planes)

```text
Identity Plane
 ├── Auth Service
 ├── Session Service
 ├── MFA Service
 ├── Delegation Service

Policy Plane
 ├── ABAC Engine
 ├── Risk Engine
 ├── Compliance Rules
 ├── Tenant Security Policies

Trust Plane
 ├── Vault
 ├── Key Management
 ├── Event Sealing
 ├── Device Trust

Execution Plane
 ├── Agent Orchestrator
 ├── Playwright Workers
 ├── HITL Coordinator

Persistence Plane
 ├── Supabase/Postgres
 ├── Redis
 ├── Immutable Audit Ledger
```

## Principios Críticos de Diseño

### 1. Separación de AuthN y AuthZ
*   **Identity Plane (`/auth`):** Responde a "¿Quién eres?" (Autenticación, MFA, sesiones, emisión de credenciales temporales).
*   **Policy Plane (`/policy`):** Responde a "¿Puedes hacer esto aquí y ahora?" (Autorización basada en atributos, riesgos y reglas del tenant). El módulo `/auth` NO toma decisiones de autorización complejas.

### 2. Session Assurance Levels (SAL)
El acceso a recursos no es binario. Depende del nivel de confianza criptográfica de la sesión actual:
*   **SAL0:** Anónimo (Sin validar).
*   **SAL1:** Credenciales básicas validadas (Ej. Ver dashboard general).
*   **SAL2:** MFA validado (Ej. Descargar Anexo Transaccional SRI).
*   **SAL3:** Dispositivo confiable y conocido (Ej. Preparar borrador de impuestos).
*   **SAL4:** Step-up reciente (Autenticación elevada dentro de la última hora).
*   **SAL5:** Aprobación legal contextual (Firma HITL para una transacción específica, ej. Enviar declaración o pago).

### 3. Trazabilidad Causal (Delegation Chain)
La delegación de tareas a agentes de IA se modela como un **Grafo Forense (`DelegationChain`)**, no como una tabla simple. Esto permite reconstruir el linaje completo:
`Humano -> Sesión de Aprobación -> Intento de Delegación -> Capacidad del Agente -> Ejecución -> Artefacto Producido.`
Garantiza el **No Repudio** ante autoridades legales.

### 4. Ephemeral Trust Workloads (Agentes IA)
Los agentes de automatización (Playwright workers) operan bajo principios de confianza efímera:
*   Nunca tienen sesiones persistentes ni secretos cacheados.
*   Requieren un sandbox completamente aislado por cada ejecución (Proceso, Memoria, Red, Perfil de Navegador).
*   Ciclo de vida estricto: Provisionar -> Atestiguar -> Ejecutar -> Destruir -> Verificar Destrucción.

### 5. Cryptographic Event Sealing
Los logs de auditoría son inmutables no solo a nivel de aplicación, sino criptográficamente. Cada evento de seguridad se encadena usando hashes (Merkle tree/Append chain): `Hash(Evento_Anterior + Payload_Actual + Timestamp)`. Cualquier manipulación manual en la base de datos invalida la cadena.

## Fases de Implementación

### Fase 1 (Actual)
- [x] Autenticación robusta y resiliente.
- [x] Hardening de Refresh Tokens (15s grace period, family revocation).
- [x] 2FA/TOTP real con bloqueo de replay (Redis).
- [x] Aislamiento Tenant y RLS estricto en Supabase.
- [x] Logs de auditoría básicos.
- [x] Modelado MVP de Delegación (M2M / HITL Grants).

### Fase 2 (Próxima)
- [ ] Extraer el Policy Engine (`/policy`) fuera de `/auth`.
- [ ] Implementar la Bóveda Zero-Knowledge (`/vault`).
- [ ] Evolucionar `DelegationGrant` a `DelegationChain`.
- [ ] Implementar evaluación formal de niveles SAL.

### Fase 3 (Enterprise)
- [ ] SSO Corporativo (SAML/OIDC).
- [ ] Soporte para Hardware Keys (FIDO2/WebAuthn).
- [ ] Cryptographic Event Sealing en el ledger de auditoría.
- [ ] Remote Attestation para los workers de automatización.
