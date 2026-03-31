/** Normalize backend role strings for comparisons (handles Admin, admin, EMPLOYEE, etc.). */
export function normalizeRole(role: string | undefined | null): string {
  return (role ?? '').toString().trim().toLowerCase();
}

export function isEmployeeRole(role: string | undefined | null): boolean {
  return normalizeRole(role) === 'employee';
}

export function isAdminOrManager(role: string | undefined | null): boolean {
  const r = normalizeRole(role);
  return r === 'admin' || r === 'manager';
}
