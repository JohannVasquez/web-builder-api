export function containsExactKey(json: unknown, targetKey: string): boolean {
  if (typeof json === 'string') {
    return json === targetKey;
  }
  if (Array.isArray(json)) {
    return json.some((item) => containsExactKey(item, targetKey));
  }
  if (json !== null && typeof json === 'object') {
    return Object.values(json).some((val) => containsExactKey(val, targetKey));
  }
  return false;
}
