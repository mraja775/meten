import { Role } from "@prisma/client";

export function canManageSettings(role: Role) {
  return role === Role.OWNER;
}

export function canManageCrm(role: Role) {
  return role === Role.OWNER || role === Role.STAFF;
}
