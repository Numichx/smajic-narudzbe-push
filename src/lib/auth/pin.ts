export function isPinDigitsOnly(pin: string): boolean {
  return /^\d+$/.test(pin);
}
