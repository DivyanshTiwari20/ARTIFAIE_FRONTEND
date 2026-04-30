export function formatNameWithPrefix(name: string | undefined | null, gender?: string | null): string {
  const cleanName = (name || '').trim();
  if (!cleanName) return '';

  if (/^(mr\.?|miss\.?|ms\.?)\s+/i.test(cleanName)) {
    return cleanName;
  }

  const normalizedGender = (gender || '').toLowerCase().trim();
  const prefix = normalizedGender === 'female' ? 'Miss.' : 'Mr.';
  return `${prefix} ${cleanName}`;
}
