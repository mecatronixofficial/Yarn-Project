export function documentNo(prefix: string) {
  const d = new Date();
  const year = d.getFullYear();
  const stamp = `${Date.now()}`.slice(-8);
  return `${prefix}-${year}-${stamp}`;
}
