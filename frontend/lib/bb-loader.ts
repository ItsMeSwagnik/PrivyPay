import { setUltraHonkBackendLoader } from "@ctd/sdk";

let nativeImport: ((url: string) => Promise<Record<string, unknown>>) | undefined;

function getNativeImport() {
  nativeImport ??= new Function("url", "return import(url)") as (url: string) => Promise<Record<string, unknown>>;
  return nativeImport;
}

let registered = false;

export function ensureBrowserBackend(): void {
  if (registered || typeof window === "undefined") return;
  registered = true;
  setUltraHonkBackendLoader(async () => {
    const mod = await getNativeImport()("/vendor/bb/index.js");
    return mod.UltraHonkBackend as never;
  });
}
