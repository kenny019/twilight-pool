const SAFE_PAGE_METHODS = new Set(["GET", "HEAD"]);
const EXCLUDED_PREFIXES = ["/_next", "/api"];

export function isProtectedPagePath(pathname: string): boolean {
  if (!pathname) {
    return false;
  }

  if (EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return false;
  }

  if (pathname.includes(".")) {
    return false;
  }

  return true;
}

export function shouldRejectPageMethod(
  pathname: string,
  method: string
): boolean {
  return (
    isProtectedPagePath(pathname) &&
    !SAFE_PAGE_METHODS.has(method.toUpperCase())
  );
}
