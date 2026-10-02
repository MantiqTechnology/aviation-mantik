import { scryptSync, timingSafeEqual } from 'node:crypto';
import type { DemoAccountHelperDto } from '../../shared/contracts/auth';
import { demoRoleActorIds, demoRoleStationScopes, type DemoRole } from '../../shared/types/roles';

export type DemoAccount = DemoAccountHelperDto & {
  userId: string;
};

const accountDefinitions: Array<
  Omit<DemoAccount, 'userId' | 'stationScopes'> & { role: DemoRole }
> = [
  {
    username: 'director.demo',
    password: 'PRT-Director-2026!',
    role: 'Director',
    displayName: 'Operator Perintis Demo Operations Director',
    personaLabel: 'Executive approver'
  },
  {
    username: 'occ.demo',
    password: 'PRT-OCC-2026!',
    role: 'OCC',
    displayName: 'Operator Perintis Demo OCC Controller',
    personaLabel: 'Operations control'
  },
  {
    username: 'occ.checker',
    password: 'PRT-Checker-2026!',
    role: 'OCC Checker',
    displayName: 'Operator Perintis Demo OCC Readiness Checker',
    personaLabel: 'Independent readiness checker'
  },
  {
    username: 'station.wmx',
    password: 'PRT-WMX-2026!',
    role: 'Station Admin',
    displayName: 'Wamena Station Admin',
    personaLabel: 'Destination station operations'
  },
  {
    username: 'station.djj',
    password: 'PRT-DJJ-2026!',
    role: 'Station Admin Origin',
    displayName: 'Jayapura Station Admin',
    personaLabel: 'Origin station operations'
  },
  {
    username: 'finance.demo',
    password: 'PRT-Finance-2026!',
    role: 'Finance Reviewer',
    displayName: 'Operator Perintis Demo Finance Reviewer',
    personaLabel: 'Invoice and finance review'
  },
  {
    username: 'mro.manager',
    password: 'PRT-MRO-Manager-2026!',
    role: 'Maintenance Manager',
    displayName: 'Operator Perintis Demo Maintenance Manager',
    personaLabel: 'Maintenance review'
  },
  {
    username: 'mro.technician',
    password: 'PRT-MRO-Tech-2026!',
    role: 'Maintenance Technician',
    displayName: 'Operator Perintis Demo Maintenance Technician',
    personaLabel: 'Mechanic sign-off'
  },
  {
    username: 'certifying.demo',
    password: 'PRT-RTS-2026!',
    role: 'Certifying Staff',
    displayName: 'Operator Perintis Demo Certifying Staff',
    personaLabel: 'Technical release'
  },
  {
    username: 'inventory.demo',
    password: 'PRT-Inventory-2026!',
    role: 'Inventory Controller',
    displayName: 'Operator Perintis Demo Inventory Controller',
    personaLabel: 'Inventory and procurement control'
  }
];

export const demoAccounts: DemoAccount[] = accountDefinitions.map((account) => ({
  ...account,
  userId: demoRoleActorIds[account.role],
  stationScopes: [...demoRoleStationScopes[account.role]]
}));

const PASSWORD_SALT = 'mantik-controlled-local-demo-v1';

function derivePassword(password: string) {
  return scryptSync(password, PASSWORD_SALT, 32);
}

export function authenticateDemoAccount(username: string, password: string) {
  const account = demoAccounts.find((candidate) => candidate.username === username.toLowerCase());
  const suppliedHash = derivePassword(password);
  const expectedHash = derivePassword(account?.password ?? 'invalid-demo-password-placeholder');
  return account && timingSafeEqual(suppliedHash, expectedHash) ? account : null;
}

export function demoAccountByRole(role: DemoRole) {
  return demoAccounts.find((account) => account.role === role) ?? null;
}

export function listDemoAccountHelpers(): DemoAccountHelperDto[] {
  return demoAccounts.map((account) => ({
    username: account.username,
    password: account.password,
    role: account.role,
    displayName: account.displayName,
    personaLabel: account.personaLabel,
    stationScopes: account.stationScopes
  }));
}
