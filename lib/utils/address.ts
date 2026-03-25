export function truncateAddress(
  address: string,
  prefixLen = 10,
  suffixLen = 4
): string {
  if (address.length <= prefixLen + suffixLen + 3) return address;
  return `${address.slice(0, prefixLen)}...${address.slice(-suffixLen)}`;
}
