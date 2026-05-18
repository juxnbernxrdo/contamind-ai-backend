


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";








ALTER SCHEMA "public" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."Role" AS ENUM (
    'SUPER_ADMIN',
    'ADMIN',
    'USER',
    'MANAGER',
    'ACCOUNTANT',
    'VIEWER',
    'CUSTOM'
);


ALTER TYPE "public"."Role" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."AuthAuditLog" (
    "id" "text" NOT NULL,
    "tenantId" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "action" "text" NOT NULL,
    "ipAddress" "text" NOT NULL,
    "userAgent" "text" NOT NULL,
    "deviceId" "text",
    "geolocation" "jsonb",
    "result" "text" NOT NULL,
    "reason" "text",
    "metadata" "jsonb",
    "durationMs" integer,
    "severity" "text" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."AuthAuditLog" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."AuthDevice" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "name" "text" NOT NULL,
    "deviceType" "text" NOT NULL,
    "userAgent" "text" NOT NULL,
    "ipAddress" "text" NOT NULL,
    "fingerprint" "text" NOT NULL,
    "osVersion" "text",
    "appVersion" "text",
    "isTrusted" boolean DEFAULT false NOT NULL,
    "trustedUntil" timestamp(3) without time zone,
    "lastActivityAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastActivityIp" "text",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."AuthDevice" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."AuthSession" (
    "id" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "deviceId" "text" NOT NULL,
    "accessToken" "text" NOT NULL,
    "refreshToken" "text" NOT NULL,
    "refreshTokenFamily" "text",
    "securityVersion" integer DEFAULT 1 NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "refreshExpiresAt" timestamp(3) without time zone NOT NULL,
    "revokedAt" timestamp(3) without time zone,
    "revokeReason" "text",
    "lastActivityAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."AuthSession" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."AuthTokenBlacklist" (
    "id" "text" NOT NULL,
    "jti" "text" NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."AuthTokenBlacklist" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."DelegationGrant" (
    "id" "text" NOT NULL,
    "tenantId" "text" NOT NULL,
    "delegatorUserId" "text" NOT NULL,
    "agentId" "text" NOT NULL,
    "actionScope" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "contextMetadata" "jsonb",
    "actionToken" "text",
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."DelegationGrant" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Permission" (
    "id" "text" NOT NULL,
    "module" "text" NOT NULL,
    "action" "text" NOT NULL,
    "userId" "text" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."Permission" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ServicePrincipal" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "hashedSecret" "text",
    "publicKey" "text",
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "securityVersion" integer DEFAULT 1 NOT NULL
);


ALTER TABLE "public"."ServicePrincipal" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Tenant" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "ruc" "text" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."Tenant" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."User" (
    "id" "text" NOT NULL,
    "tenantId" "text" NOT NULL,
    "firstName" "text",
    "lastName" "text",
    "email" "text" NOT NULL,
    "emailVerified" boolean DEFAULT false NOT NULL,
    "emailVerifiedAt" timestamp(3) without time zone,
    "passwordHash" "text" NOT NULL,
    "passwordChangedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "passwordHistory" "text"[] DEFAULT ARRAY[]::"text"[],
    "roles" "public"."Role"[],
    "twoFAEnabled" boolean DEFAULT false NOT NULL,
    "totpSecret" "text",
    "totpIv" "text",
    "totpAuthTag" "text",
    "backupCodes" "text"[] DEFAULT ARRAY[]::"text"[],
    "accountLocked" boolean DEFAULT false NOT NULL,
    "accountLockedUntil" timestamp(3) without time zone,
    "accountDisabled" boolean DEFAULT false NOT NULL,
    "securityVersion" integer DEFAULT 1 NOT NULL,
    "rememberMe" boolean DEFAULT false NOT NULL,
    "inactivityTimeout" integer DEFAULT 28800 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "public"."User" OWNER TO "postgres";


ALTER TABLE ONLY "public"."AuthAuditLog"
    ADD CONSTRAINT "AuthAuditLog_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."AuthDevice"
    ADD CONSTRAINT "AuthDevice_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."AuthSession"
    ADD CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."AuthTokenBlacklist"
    ADD CONSTRAINT "AuthTokenBlacklist_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."DelegationGrant"
    ADD CONSTRAINT "DelegationGrant_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Permission"
    ADD CONSTRAINT "Permission_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ServicePrincipal"
    ADD CONSTRAINT "ServicePrincipal_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Tenant"
    ADD CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");



CREATE INDEX "AuthAuditLog_action_idx" ON "public"."AuthAuditLog" USING "btree" ("action");



CREATE INDEX "AuthAuditLog_createdAt_idx" ON "public"."AuthAuditLog" USING "btree" ("createdAt");



CREATE INDEX "AuthAuditLog_tenantId_idx" ON "public"."AuthAuditLog" USING "btree" ("tenantId");



CREATE INDEX "AuthAuditLog_userId_idx" ON "public"."AuthAuditLog" USING "btree" ("userId");



CREATE INDEX "AuthDevice_fingerprint_idx" ON "public"."AuthDevice" USING "btree" ("fingerprint");



CREATE INDEX "AuthDevice_userId_idx" ON "public"."AuthDevice" USING "btree" ("userId");



CREATE UNIQUE INDEX "AuthSession_accessToken_key" ON "public"."AuthSession" USING "btree" ("accessToken");



CREATE INDEX "AuthSession_deviceId_idx" ON "public"."AuthSession" USING "btree" ("deviceId");



CREATE INDEX "AuthSession_expiresAt_idx" ON "public"."AuthSession" USING "btree" ("expiresAt");



CREATE UNIQUE INDEX "AuthSession_refreshToken_key" ON "public"."AuthSession" USING "btree" ("refreshToken");



CREATE INDEX "AuthSession_revokedAt_idx" ON "public"."AuthSession" USING "btree" ("revokedAt");



CREATE INDEX "AuthSession_userId_idx" ON "public"."AuthSession" USING "btree" ("userId");



CREATE INDEX "AuthTokenBlacklist_expiresAt_idx" ON "public"."AuthTokenBlacklist" USING "btree" ("expiresAt");



CREATE UNIQUE INDEX "AuthTokenBlacklist_jti_key" ON "public"."AuthTokenBlacklist" USING "btree" ("jti");



CREATE INDEX "DelegationGrant_actionToken_idx" ON "public"."DelegationGrant" USING "btree" ("actionToken");



CREATE UNIQUE INDEX "DelegationGrant_actionToken_key" ON "public"."DelegationGrant" USING "btree" ("actionToken");



CREATE INDEX "DelegationGrant_agentId_idx" ON "public"."DelegationGrant" USING "btree" ("agentId");



CREATE INDEX "DelegationGrant_delegatorUserId_idx" ON "public"."DelegationGrant" USING "btree" ("delegatorUserId");



CREATE INDEX "DelegationGrant_tenantId_idx" ON "public"."DelegationGrant" USING "btree" ("tenantId");



CREATE UNIQUE INDEX "ServicePrincipal_name_key" ON "public"."ServicePrincipal" USING "btree" ("name");



CREATE UNIQUE INDEX "Tenant_ruc_key" ON "public"."Tenant" USING "btree" ("ruc");



CREATE INDEX "User_email_idx" ON "public"."User" USING "btree" ("email");



CREATE UNIQUE INDEX "User_email_key" ON "public"."User" USING "btree" ("email");



CREATE INDEX "User_tenantId_idx" ON "public"."User" USING "btree" ("tenantId");



ALTER TABLE ONLY "public"."AuthAuditLog"
    ADD CONSTRAINT "AuthAuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."AuthDevice"
    ADD CONSTRAINT "AuthDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."AuthSession"
    ADD CONSTRAINT "AuthSession_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "public"."AuthDevice"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."AuthSession"
    ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."DelegationGrant"
    ADD CONSTRAINT "DelegationGrant_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "public"."ServicePrincipal"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."DelegationGrant"
    ADD CONSTRAINT "DelegationGrant_delegatorUserId_fkey" FOREIGN KEY ("delegatorUserId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."DelegationGrant"
    ADD CONSTRAINT "DelegationGrant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."Permission"
    ADD CONSTRAINT "Permission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."User"
    ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON UPDATE CASCADE ON DELETE RESTRICT;





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;













































































































































































































revoke delete on table "public"."AuthAuditLog" from "anon";

revoke insert on table "public"."AuthAuditLog" from "anon";

revoke references on table "public"."AuthAuditLog" from "anon";

revoke select on table "public"."AuthAuditLog" from "anon";

revoke trigger on table "public"."AuthAuditLog" from "anon";

revoke truncate on table "public"."AuthAuditLog" from "anon";

revoke update on table "public"."AuthAuditLog" from "anon";

revoke delete on table "public"."AuthAuditLog" from "authenticated";

revoke insert on table "public"."AuthAuditLog" from "authenticated";

revoke references on table "public"."AuthAuditLog" from "authenticated";

revoke select on table "public"."AuthAuditLog" from "authenticated";

revoke trigger on table "public"."AuthAuditLog" from "authenticated";

revoke truncate on table "public"."AuthAuditLog" from "authenticated";

revoke update on table "public"."AuthAuditLog" from "authenticated";

revoke delete on table "public"."AuthAuditLog" from "service_role";

revoke insert on table "public"."AuthAuditLog" from "service_role";

revoke references on table "public"."AuthAuditLog" from "service_role";

revoke select on table "public"."AuthAuditLog" from "service_role";

revoke trigger on table "public"."AuthAuditLog" from "service_role";

revoke truncate on table "public"."AuthAuditLog" from "service_role";

revoke update on table "public"."AuthAuditLog" from "service_role";

revoke delete on table "public"."AuthDevice" from "anon";

revoke insert on table "public"."AuthDevice" from "anon";

revoke references on table "public"."AuthDevice" from "anon";

revoke select on table "public"."AuthDevice" from "anon";

revoke trigger on table "public"."AuthDevice" from "anon";

revoke truncate on table "public"."AuthDevice" from "anon";

revoke update on table "public"."AuthDevice" from "anon";

revoke delete on table "public"."AuthDevice" from "authenticated";

revoke insert on table "public"."AuthDevice" from "authenticated";

revoke references on table "public"."AuthDevice" from "authenticated";

revoke select on table "public"."AuthDevice" from "authenticated";

revoke trigger on table "public"."AuthDevice" from "authenticated";

revoke truncate on table "public"."AuthDevice" from "authenticated";

revoke update on table "public"."AuthDevice" from "authenticated";

revoke delete on table "public"."AuthDevice" from "service_role";

revoke insert on table "public"."AuthDevice" from "service_role";

revoke references on table "public"."AuthDevice" from "service_role";

revoke select on table "public"."AuthDevice" from "service_role";

revoke trigger on table "public"."AuthDevice" from "service_role";

revoke truncate on table "public"."AuthDevice" from "service_role";

revoke update on table "public"."AuthDevice" from "service_role";

revoke delete on table "public"."AuthSession" from "anon";

revoke insert on table "public"."AuthSession" from "anon";

revoke references on table "public"."AuthSession" from "anon";

revoke select on table "public"."AuthSession" from "anon";

revoke trigger on table "public"."AuthSession" from "anon";

revoke truncate on table "public"."AuthSession" from "anon";

revoke update on table "public"."AuthSession" from "anon";

revoke delete on table "public"."AuthSession" from "authenticated";

revoke insert on table "public"."AuthSession" from "authenticated";

revoke references on table "public"."AuthSession" from "authenticated";

revoke select on table "public"."AuthSession" from "authenticated";

revoke trigger on table "public"."AuthSession" from "authenticated";

revoke truncate on table "public"."AuthSession" from "authenticated";

revoke update on table "public"."AuthSession" from "authenticated";

revoke delete on table "public"."AuthSession" from "service_role";

revoke insert on table "public"."AuthSession" from "service_role";

revoke references on table "public"."AuthSession" from "service_role";

revoke select on table "public"."AuthSession" from "service_role";

revoke trigger on table "public"."AuthSession" from "service_role";

revoke truncate on table "public"."AuthSession" from "service_role";

revoke update on table "public"."AuthSession" from "service_role";

revoke delete on table "public"."AuthTokenBlacklist" from "anon";

revoke insert on table "public"."AuthTokenBlacklist" from "anon";

revoke references on table "public"."AuthTokenBlacklist" from "anon";

revoke select on table "public"."AuthTokenBlacklist" from "anon";

revoke trigger on table "public"."AuthTokenBlacklist" from "anon";

revoke truncate on table "public"."AuthTokenBlacklist" from "anon";

revoke update on table "public"."AuthTokenBlacklist" from "anon";

revoke delete on table "public"."AuthTokenBlacklist" from "authenticated";

revoke insert on table "public"."AuthTokenBlacklist" from "authenticated";

revoke references on table "public"."AuthTokenBlacklist" from "authenticated";

revoke select on table "public"."AuthTokenBlacklist" from "authenticated";

revoke trigger on table "public"."AuthTokenBlacklist" from "authenticated";

revoke truncate on table "public"."AuthTokenBlacklist" from "authenticated";

revoke update on table "public"."AuthTokenBlacklist" from "authenticated";

revoke delete on table "public"."AuthTokenBlacklist" from "service_role";

revoke insert on table "public"."AuthTokenBlacklist" from "service_role";

revoke references on table "public"."AuthTokenBlacklist" from "service_role";

revoke select on table "public"."AuthTokenBlacklist" from "service_role";

revoke trigger on table "public"."AuthTokenBlacklist" from "service_role";

revoke truncate on table "public"."AuthTokenBlacklist" from "service_role";

revoke update on table "public"."AuthTokenBlacklist" from "service_role";

revoke delete on table "public"."DelegationGrant" from "anon";

revoke insert on table "public"."DelegationGrant" from "anon";

revoke references on table "public"."DelegationGrant" from "anon";

revoke select on table "public"."DelegationGrant" from "anon";

revoke trigger on table "public"."DelegationGrant" from "anon";

revoke truncate on table "public"."DelegationGrant" from "anon";

revoke update on table "public"."DelegationGrant" from "anon";

revoke delete on table "public"."DelegationGrant" from "authenticated";

revoke insert on table "public"."DelegationGrant" from "authenticated";

revoke references on table "public"."DelegationGrant" from "authenticated";

revoke select on table "public"."DelegationGrant" from "authenticated";

revoke trigger on table "public"."DelegationGrant" from "authenticated";

revoke truncate on table "public"."DelegationGrant" from "authenticated";

revoke update on table "public"."DelegationGrant" from "authenticated";

revoke delete on table "public"."DelegationGrant" from "service_role";

revoke insert on table "public"."DelegationGrant" from "service_role";

revoke references on table "public"."DelegationGrant" from "service_role";

revoke select on table "public"."DelegationGrant" from "service_role";

revoke trigger on table "public"."DelegationGrant" from "service_role";

revoke truncate on table "public"."DelegationGrant" from "service_role";

revoke update on table "public"."DelegationGrant" from "service_role";

revoke delete on table "public"."Permission" from "anon";

revoke insert on table "public"."Permission" from "anon";

revoke references on table "public"."Permission" from "anon";

revoke select on table "public"."Permission" from "anon";

revoke trigger on table "public"."Permission" from "anon";

revoke truncate on table "public"."Permission" from "anon";

revoke update on table "public"."Permission" from "anon";

revoke delete on table "public"."Permission" from "authenticated";

revoke insert on table "public"."Permission" from "authenticated";

revoke references on table "public"."Permission" from "authenticated";

revoke select on table "public"."Permission" from "authenticated";

revoke trigger on table "public"."Permission" from "authenticated";

revoke truncate on table "public"."Permission" from "authenticated";

revoke update on table "public"."Permission" from "authenticated";

revoke delete on table "public"."Permission" from "service_role";

revoke insert on table "public"."Permission" from "service_role";

revoke references on table "public"."Permission" from "service_role";

revoke select on table "public"."Permission" from "service_role";

revoke trigger on table "public"."Permission" from "service_role";

revoke truncate on table "public"."Permission" from "service_role";

revoke update on table "public"."Permission" from "service_role";

revoke delete on table "public"."ServicePrincipal" from "anon";

revoke insert on table "public"."ServicePrincipal" from "anon";

revoke references on table "public"."ServicePrincipal" from "anon";

revoke select on table "public"."ServicePrincipal" from "anon";

revoke trigger on table "public"."ServicePrincipal" from "anon";

revoke truncate on table "public"."ServicePrincipal" from "anon";

revoke update on table "public"."ServicePrincipal" from "anon";

revoke delete on table "public"."ServicePrincipal" from "authenticated";

revoke insert on table "public"."ServicePrincipal" from "authenticated";

revoke references on table "public"."ServicePrincipal" from "authenticated";

revoke select on table "public"."ServicePrincipal" from "authenticated";

revoke trigger on table "public"."ServicePrincipal" from "authenticated";

revoke truncate on table "public"."ServicePrincipal" from "authenticated";

revoke update on table "public"."ServicePrincipal" from "authenticated";

revoke delete on table "public"."ServicePrincipal" from "service_role";

revoke insert on table "public"."ServicePrincipal" from "service_role";

revoke references on table "public"."ServicePrincipal" from "service_role";

revoke select on table "public"."ServicePrincipal" from "service_role";

revoke trigger on table "public"."ServicePrincipal" from "service_role";

revoke truncate on table "public"."ServicePrincipal" from "service_role";

revoke update on table "public"."ServicePrincipal" from "service_role";

revoke delete on table "public"."Tenant" from "anon";

revoke insert on table "public"."Tenant" from "anon";

revoke references on table "public"."Tenant" from "anon";

revoke select on table "public"."Tenant" from "anon";

revoke trigger on table "public"."Tenant" from "anon";

revoke truncate on table "public"."Tenant" from "anon";

revoke update on table "public"."Tenant" from "anon";

revoke delete on table "public"."Tenant" from "authenticated";

revoke insert on table "public"."Tenant" from "authenticated";

revoke references on table "public"."Tenant" from "authenticated";

revoke select on table "public"."Tenant" from "authenticated";

revoke trigger on table "public"."Tenant" from "authenticated";

revoke truncate on table "public"."Tenant" from "authenticated";

revoke update on table "public"."Tenant" from "authenticated";

revoke delete on table "public"."Tenant" from "service_role";

revoke insert on table "public"."Tenant" from "service_role";

revoke references on table "public"."Tenant" from "service_role";

revoke select on table "public"."Tenant" from "service_role";

revoke trigger on table "public"."Tenant" from "service_role";

revoke truncate on table "public"."Tenant" from "service_role";

revoke update on table "public"."Tenant" from "service_role";

revoke delete on table "public"."User" from "anon";

revoke insert on table "public"."User" from "anon";

revoke references on table "public"."User" from "anon";

revoke select on table "public"."User" from "anon";

revoke trigger on table "public"."User" from "anon";

revoke truncate on table "public"."User" from "anon";

revoke update on table "public"."User" from "anon";

revoke delete on table "public"."User" from "authenticated";

revoke insert on table "public"."User" from "authenticated";

revoke references on table "public"."User" from "authenticated";

revoke select on table "public"."User" from "authenticated";

revoke trigger on table "public"."User" from "authenticated";

revoke truncate on table "public"."User" from "authenticated";

revoke update on table "public"."User" from "authenticated";

revoke delete on table "public"."User" from "service_role";

revoke insert on table "public"."User" from "service_role";

revoke references on table "public"."User" from "service_role";

revoke select on table "public"."User" from "service_role";

revoke trigger on table "public"."User" from "service_role";

revoke truncate on table "public"."User" from "service_role";

revoke update on table "public"."User" from "service_role";


