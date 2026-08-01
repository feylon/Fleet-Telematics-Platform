import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1753860000000 implements MigrationInterface {
  name = 'InitialSchema1753860000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(`CREATE TYPE "role_enum" AS ENUM ('SUPERADMIN','DISPATCHER','FLEET_MANAGER','DRIVER')`);
    await queryRunner.query(`CREATE TYPE "fuel_type_enum" AS ENUM ('PETROL','DIESEL','GAS','ELECTRIC','HYBRID')`);
    await queryRunner.query(`CREATE TYPE "vehicle_status_enum" AS ENUM ('ACTIVE','MAINTENANCE','OUT_OF_SERVICE')`);
    await queryRunner.query(`CREATE TYPE "order_status_enum" AS ENUM ('CREATED','ASSIGNED','IN_PROGRESS','COMPLETED','CANCELLED')`);
    await queryRunner.query(`CREATE TYPE "order_priority_enum" AS ENUM ('LOW','NORMAL','HIGH','URGENT')`);
    await queryRunner.query(`CREATE TYPE "maintenance_type_enum" AS ENUM ('INSPECTION','REPAIR','OIL_CHANGE','TIRES','OTHER')`);

    await queryRunner.query(`CREATE TABLE "organizations" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "name" varchar(200) NOT NULL,
      "slug" varchar(80) NOT NULL,
      "taxId" varchar(20),
      "address" varchar(300),
      "phone" varchar(40),
      "defaultLocale" varchar(10) NOT NULL DEFAULT 'uz',
      "isActive" boolean NOT NULL DEFAULT true,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_organizations" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_organizations_slug" UNIQUE ("slug")
    )`);

    await queryRunner.query(`CREATE TABLE "platform_settings" (
      "id" smallint NOT NULL DEFAULT 1,
      "platformName" varchar(120) NOT NULL,
      "description" varchar(500),
      "logoDataUrl" text,
      "primaryColor" varchar(20) NOT NULL DEFAULT '#0ea5e9',
      "supportEmail" varchar(120),
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_platform_settings" PRIMARY KEY ("id")
    )`);

    await queryRunner.query(`CREATE TABLE "users" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "organizationId" uuid,
      "login" varchar(80) NOT NULL,
      "passwordHash" varchar(255) NOT NULL,
      "role" "role_enum" NOT NULL,
      "fullName" varchar(200) NOT NULL,
      "phone" varchar(40),
      "email" varchar(200),
      "locale" varchar(10) NOT NULL DEFAULT 'uz',
      "isActive" boolean NOT NULL DEFAULT true,
      "mustChangePassword" boolean NOT NULL DEFAULT false,
      "lastLoginAt" timestamptz,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_users" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_users_login" UNIQUE ("login"),
      CONSTRAINT "FK_users_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_users_organizationId" ON "users" ("organizationId")`);

    await queryRunner.query(`CREATE TABLE "user_sessions" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "userId" uuid NOT NULL,
      "refreshTokenHash" varchar(128) NOT NULL,
      "ip" varchar(64),
      "userAgent" varchar(400),
      "client" varchar(40) NOT NULL DEFAULT 'web',
      "expiresAt" timestamptz NOT NULL,
      "revokedAt" timestamptz,
      "lastUsedAt" timestamptz,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_user_sessions" PRIMARY KEY ("id"),
      CONSTRAINT "FK_user_sessions_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_user_sessions_userId" ON "user_sessions" ("userId")`);

    await queryRunner.query(`CREATE TABLE "login_history" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "userId" uuid,
      "login" varchar(80) NOT NULL,
      "ip" varchar(64),
      "userAgent" varchar(400),
      "success" boolean NOT NULL,
      "reason" varchar(120),
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_login_history" PRIMARY KEY ("id")
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_login_history_userId" ON "login_history" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_login_history_createdAt" ON "login_history" ("createdAt")`);

    await queryRunner.query(`CREATE TABLE "audit_logs" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "organizationId" uuid,
      "userId" uuid,
      "userLogin" varchar(80),
      "action" varchar(120) NOT NULL,
      "resource" varchar(80) NOT NULL,
      "resourceId" varchar(80),
      "method" varchar(10) NOT NULL,
      "path" varchar(300) NOT NULL,
      "statusCode" smallint NOT NULL,
      "payload" jsonb,
      "ip" varchar(64),
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_organizationId" ON "audit_logs" ("organizationId")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_userId" ON "audit_logs" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_logs_createdAt" ON "audit_logs" ("createdAt")`);

    await queryRunner.query(`CREATE TABLE "vehicles" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "organizationId" uuid NOT NULL,
      "plateNumber" varchar(20) NOT NULL,
      "vin" varchar(32),
      "brand" varchar(80) NOT NULL,
      "model" varchar(80) NOT NULL,
      "year" smallint,
      "fuelType" "fuel_type_enum" NOT NULL DEFAULT 'DIESEL',
      "fuelTankCapacity" real,
      "odometerKm" real NOT NULL DEFAULT 0,
      "maxSpeedKmh" smallint NOT NULL DEFAULT 90,
      "status" "vehicle_status_enum" NOT NULL DEFAULT 'ACTIVE',
      "maintenanceIntervalKm" integer NOT NULL DEFAULT 10000,
      "nextInspectionAt" timestamptz,
      "nextInspectionOdometerKm" real,
      "color" varchar(30),
      "iconType" varchar(40) NOT NULL DEFAULT 'truck',
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_vehicles" PRIMARY KEY ("id"),
      CONSTRAINT "FK_vehicles_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_vehicles_organizationId" ON "vehicles" ("organizationId")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_vehicles_org_plate" ON "vehicles" ("organizationId", "plateNumber")`);

    await queryRunner.query(`CREATE TABLE "devices_imei" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "organizationId" uuid NOT NULL,
      "imei" varchar(20) NOT NULL,
      "vehicleId" uuid,
      "tokenHash" varchar(128) NOT NULL,
      "model" varchar(80),
      "simNumber" varchar(30),
      "isActive" boolean NOT NULL DEFAULT true,
      "lastSeenAt" timestamptz,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_devices_imei" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_devices_imei_imei" UNIQUE ("imei"),
      CONSTRAINT "UQ_devices_imei_vehicleId" UNIQUE ("vehicleId"),
      CONSTRAINT "FK_devices_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_devices_vehicle" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_devices_imei_organizationId" ON "devices_imei" ("organizationId")`);

    await queryRunner.query(`CREATE TABLE "drivers" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "organizationId" uuid NOT NULL,
      "userId" uuid,
      "fullName" varchar(200) NOT NULL,
      "phone" varchar(40),
      "licenseNumber" varchar(40),
      "licenseCategories" varchar[] NOT NULL DEFAULT '{}',
      "licenseExpiresAt" date,
      "birthDate" date,
      "vehicleId" uuid,
      "shiftStart" time,
      "shiftEnd" time,
      "isActive" boolean NOT NULL DEFAULT true,
      "hiredAt" date,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_drivers" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_drivers_userId" UNIQUE ("userId"),
      CONSTRAINT "FK_drivers_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_drivers_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL,
      CONSTRAINT "FK_drivers_vehicle" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_drivers_organizationId" ON "drivers" ("organizationId")`);

    await queryRunner.query(`CREATE TABLE "geofences" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "organizationId" uuid NOT NULL,
      "name" varchar(120) NOT NULL,
      "description" varchar(500),
      "polygon" jsonb NOT NULL,
      "speedLimitKmh" smallint,
      "allowedFrom" time,
      "allowedTo" time,
      "alertOnEnter" boolean NOT NULL DEFAULT true,
      "alertOnExit" boolean NOT NULL DEFAULT true,
      "color" varchar(20) NOT NULL DEFAULT '#2563eb',
      "isActive" boolean NOT NULL DEFAULT true,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_geofences" PRIMARY KEY ("id"),
      CONSTRAINT "FK_geofences_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_geofences_organizationId" ON "geofences" ("organizationId")`);

    await queryRunner.query(`CREATE TABLE "orders" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "organizationId" uuid NOT NULL,
      "orderNumber" varchar(40) NOT NULL,
      "customerName" varchar(200) NOT NULL,
      "cargoDescription" varchar(500),
      "cargoWeightKg" real,
      "status" "order_status_enum" NOT NULL DEFAULT 'CREATED',
      "priority" "order_priority_enum" NOT NULL DEFAULT 'NORMAL',
      "originAddress" varchar(300) NOT NULL,
      "originLatitude" double precision NOT NULL,
      "originLongitude" double precision NOT NULL,
      "destinationAddress" varchar(300) NOT NULL,
      "destinationLatitude" double precision NOT NULL,
      "destinationLongitude" double precision NOT NULL,
      "vehicleId" uuid,
      "driverId" uuid,
      "plannedStartAt" timestamptz,
      "plannedEndAt" timestamptz,
      "startedAt" timestamptz,
      "completedAt" timestamptz,
      "notes" varchar(1000),
      "createdById" uuid,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_orders" PRIMARY KEY ("id"),
      CONSTRAINT "FK_orders_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_orders_vehicle" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL,
      CONSTRAINT "FK_orders_driver" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE SET NULL
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_orders_organizationId" ON "orders" ("organizationId")`);
    await queryRunner.query(`CREATE INDEX "IDX_orders_vehicleId" ON "orders" ("vehicleId")`);
    await queryRunner.query(`CREATE INDEX "IDX_orders_driverId" ON "orders" ("driverId")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_orders_org_number" ON "orders" ("organizationId", "orderNumber")`);

    await queryRunner.query(`CREATE TABLE "routes" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "organizationId" uuid NOT NULL,
      "orderId" uuid NOT NULL,
      "polyline" jsonb NOT NULL,
      "distanceKm" real NOT NULL DEFAULT 0,
      "deviationThresholdKm" real NOT NULL DEFAULT 0.5,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_routes" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_routes_orderId" UNIQUE ("orderId"),
      CONSTRAINT "FK_routes_order" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_routes_organizationId" ON "routes" ("organizationId")`);

    await queryRunner.query(`CREATE TABLE "route_checkpoints" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "routeId" uuid NOT NULL,
      "sequence" smallint NOT NULL,
      "name" varchar(200) NOT NULL,
      "latitude" double precision NOT NULL,
      "longitude" double precision NOT NULL,
      "radiusM" integer NOT NULL DEFAULT 200,
      "reachedAt" timestamptz,
      CONSTRAINT "PK_route_checkpoints" PRIMARY KEY ("id"),
      CONSTRAINT "FK_route_checkpoints_route" FOREIGN KEY ("routeId") REFERENCES "routes"("id") ON DELETE CASCADE
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_route_checkpoints_routeId" ON "route_checkpoints" ("routeId")`);

    await queryRunner.query(`CREATE TABLE "maintenance_logs" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "organizationId" uuid NOT NULL,
      "vehicleId" uuid NOT NULL,
      "type" "maintenance_type_enum" NOT NULL,
      "description" varchar(1000) NOT NULL,
      "costAmount" numeric(14,2) NOT NULL DEFAULT 0,
      "odometerKm" real,
      "performedAt" timestamptz NOT NULL,
      "nextDueAt" timestamptz,
      "nextDueOdometerKm" real,
      "downtimeFrom" timestamptz,
      "downtimeTo" timestamptz,
      "performedById" uuid,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_maintenance_logs" PRIMARY KEY ("id"),
      CONSTRAINT "FK_maintenance_logs_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_maintenance_logs_vehicle" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_maintenance_logs_organizationId" ON "maintenance_logs" ("organizationId")`);
    await queryRunner.query(`CREATE INDEX "IDX_maintenance_logs_vehicleId" ON "maintenance_logs" ("vehicleId")`);

    await queryRunner.query(`CREATE TABLE "fuel_norms" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "organizationId" uuid NOT NULL,
      "vehicleId" uuid NOT NULL,
      "litersPer100Km" real NOT NULL,
      "winterCoefficient" real NOT NULL DEFAULT 1.1,
      "cityCoefficient" real NOT NULL DEFAULT 1.15,
      "fuelDropAlertFraction" real NOT NULL DEFAULT 0.2,
      "updatedAt" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "PK_fuel_norms" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_fuel_norms_vehicleId" UNIQUE ("vehicleId"),
      CONSTRAINT "FK_fuel_norms_organization" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE,
      CONSTRAINT "FK_fuel_norms_vehicle" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_fuel_norms_organizationId" ON "fuel_norms" ("organizationId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'fuel_norms',
      'maintenance_logs',
      'route_checkpoints',
      'routes',
      'orders',
      'geofences',
      'drivers',
      'devices_imei',
      'vehicles',
      'audit_logs',
      'login_history',
      'user_sessions',
      'users',
      'platform_settings',
      'organizations',
    ];
    for (const table of tables) {
      await queryRunner.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
    }
    const types = ['maintenance_type_enum', 'order_priority_enum', 'order_status_enum', 'vehicle_status_enum', 'fuel_type_enum', 'role_enum'];
    for (const type of types) {
      await queryRunner.query(`DROP TYPE IF EXISTS "${type}"`);
    }
  }
}
