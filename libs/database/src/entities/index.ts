import { Organization } from './organization.entity';
import { PlatformSetting } from './platform-setting.entity';
import { User } from './user.entity';
import { UserSession } from './user-session.entity';
import { LoginHistory } from './login-history.entity';
import { AuditLog } from './audit-log.entity';
import { Vehicle } from './vehicle.entity';
import { Device } from './device.entity';
import { Driver } from './driver.entity';
import { Geofence } from './geofence.entity';
import { Order } from './order.entity';
import { Route } from './route.entity';
import { RouteCheckpoint } from './route-checkpoint.entity';
import { MaintenanceLog } from './maintenance-log.entity';
import { FuelNorm } from './fuel-norm.entity';

export {
  Organization,
  PlatformSetting,
  User,
  UserSession,
  LoginHistory,
  AuditLog,
  Vehicle,
  Device,
  Driver,
  Geofence,
  Order,
  Route,
  RouteCheckpoint,
  MaintenanceLog,
  FuelNorm,
};

export const ALL_ENTITIES = [
  Organization,
  PlatformSetting,
  User,
  UserSession,
  LoginHistory,
  AuditLog,
  Vehicle,
  Device,
  Driver,
  Geofence,
  Order,
  Route,
  RouteCheckpoint,
  MaintenanceLog,
  FuelNorm,
];
