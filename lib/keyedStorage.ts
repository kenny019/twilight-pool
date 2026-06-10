// Shared mechanics for the small per-address draft records the deposit flow
// persists in localStorage (reserve selection, deposit intent). Each module
// supplies its key prefix and a validator; SSR and storage failures degrade
// to null reads / no-op writes.
export function createKeyedStorage<T>(
  prefix: string,
  validate: (parsed: unknown) => T | null
) {
  const key = (id: string) => `${prefix}${id}`;

  return {
    read(id: string): T | null {
      if (typeof window === "undefined" || !id) return null;
      let raw: string | null;
      try {
        raw = window.localStorage.getItem(key(id));
      } catch {
        return null;
      }
      if (!raw) return null;
      try {
        return validate(JSON.parse(raw));
      } catch {
        return null;
      }
    },
    write(id: string, value: T): void {
      if (typeof window === "undefined" || !id) return;
      try {
        window.localStorage.setItem(key(id), JSON.stringify(value));
      } catch {
        // localStorage unavailable — degrade gracefully
      }
    },
    clear(id: string): void {
      if (typeof window === "undefined" || !id) return;
      try {
        window.localStorage.removeItem(key(id));
      } catch {
        // ignore
      }
    },
  };
}
