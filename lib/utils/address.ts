import { truncateHash } from "@/lib/helpers";

export function truncateAddress(
  address: string,
  prefixLen = 10,
  suffixLen = 4
): string {
  return truncateHash(address, prefixLen, suffixLen, prefixLen + suffixLen + 3);
}
