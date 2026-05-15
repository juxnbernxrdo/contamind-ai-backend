# Arquitectura de Base de Datos — ContaMind AI

## Opción elegida
**Opción B + C (HÍBRIDA)**

## Justificación
Hemos elegido un modelo híbrido para maximizar el rendimiento y la experiencia de desarrollo (DX):
- **Prisma ORM**: Utilizado para el 95% de las operaciones CRUD, proporcionando type-safety y una excelente abstracción.
- **pg.Pool (Nativo)**: Utilizado para operaciones críticas, transacciones complejas o de alto volumen (bulk updates), eliminando el overhead de Prisma.
- **Supabase Dedicated Pooler (Supavisor/PgBouncer)**: Se utiliza en modo transacción para Prisma para gestionar eficientemente las conexiones.

## Diagrama de conexiones
```
┌─────────────────────────────────────────┐
│         NestJS Backend (ContaMind)      │
├─────────────────────────────────────────┤
│  PrismaService (95% queries)            │
│  Port 6543 (Transaction Mode)           │
├─────────────────────────────────────────┤
│  PgPoolService (5% queries)             │
│  Port 5432 (Session/Direct Mode)        │
└──────────┬──────────────┬───────────────┘
           │              │
    (Prisma)              (pg.Pool)
           │              │
    ┌──────▼──────────────▼──────────────┐
    │       Supabase PostgreSQL          │
    │       (AWS RDS Backend)            │
    └────────────────────────────────────┘
```

## Connection strings
- **DATABASE_URL**: `postgresql://...:6543/postgres?pgbouncer=true` (Prisma + Pooling)
- **DIRECT_URL**: `postgresql://...:5432/postgres` (pg.Pool y Migraciones)

## Límites y configuración
- **Prisma Connection Limit**: Gestionado por el pooler de Supabase.
- **PgPoolService Limit**: Max 10 conexiones reales (configurables en `pg-pool.service.ts`).
- **Mode**: Prisma usa `transaction mode` vía puerto 6543. `pg.Pool` usa `session mode` vía puerto 5432.

## Operaciones por driver
| Operación | Driver | Razón |
|-----------|--------|-------|
| CRUD standard | Prisma | Type-safety, DX |
| Bulk updates | pg.Pool | Rendimiento (vía PgPoolService) |
| Migraciones | Prisma | `prisma db push` / `migrate` usando DIRECT_URL |
| Real-time | pg.Pool | Soporte nativo para LISTEN/NOTIFY |

## Monitoreo
```sql
-- Ver conexiones activas por aplicación
SELECT count(*), application_name FROM pg_stat_activity GROUP BY application_name;

-- Ver si el pooler está activo
SHOW application_name;
```

## Troubleshooting
- **"Prepared statement already exists"**: Asegurarse de que `pgbouncer=true` esté en el `DATABASE_URL`.
- **"Too many connections"**: Ajustar el `max` en `PgPoolService` o el pool size en el dashboard de Supabase.
- **"Can't reach database"**: Verificar que la IP del servidor esté permitida o usar el pooler si no hay IPv6.
