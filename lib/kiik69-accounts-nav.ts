import type { Kiik69AccountsModule } from "@/lib/kiik69-accounts";

export type Kiik69InventoryDir = "in" | "out";
export type Kiik69InventoryCategory = "liquor" | "food";

export type Kiik69AccountsNavState = {
  module: Kiik69AccountsModule;
  category: Kiik69InventoryCategory;
  dir: Kiik69InventoryDir;
};

const MODULES = new Set<Kiik69AccountsModule>([
  "purchases",
  "ai",
  "sales",
  "inventory",
  "wallet",
  "utilities",
  "daily",
  "games",
]);

const STORAGE_KEY = "bassik-kiik69-accounts-nav";

export const KIIK69_DEFAULT_NAV: Kiik69AccountsNavState = {
  module: "purchases",
  category: "liquor",
  dir: "in",
};

function parseModule(raw: string | null): Kiik69AccountsModule | null {
  if (!raw) return null;
  return MODULES.has(raw as Kiik69AccountsModule) ? (raw as Kiik69AccountsModule) : null;
}

function parseCategory(raw: string | null): Kiik69InventoryCategory | null {
  return raw === "food" || raw === "liquor" ? raw : null;
}

function parseDir(raw: string | null): Kiik69InventoryDir | null {
  return raw === "in" || raw === "out" ? raw : null;
}

export function readKiik69AccountsNav(search: string): Kiik69AccountsNavState {
  const params = new URLSearchParams(search);
  const fromUrl: Kiik69AccountsNavState = {
    module: parseModule(params.get("m")) ?? KIIK69_DEFAULT_NAV.module,
    category: parseCategory(params.get("cat")) ?? KIIK69_DEFAULT_NAV.category,
    dir: parseDir(params.get("dir")) ?? KIIK69_DEFAULT_NAV.dir,
  };

  if (params.get("m") || params.get("cat") || params.get("dir")) {
    return fromUrl;
  }

  if (typeof window === "undefined") return KIIK69_DEFAULT_NAV;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return KIIK69_DEFAULT_NAV;
    const stored = JSON.parse(raw) as Partial<Kiik69AccountsNavState>;
    return {
      module: parseModule(stored.module ?? null) ?? KIIK69_DEFAULT_NAV.module,
      category: parseCategory(stored.category ?? null) ?? KIIK69_DEFAULT_NAV.category,
      dir: parseDir(stored.dir ?? null) ?? KIIK69_DEFAULT_NAV.dir,
    };
  } catch {
    return KIIK69_DEFAULT_NAV;
  }
}

export function writeKiik69AccountsNav(
  pathname: string,
  state: Kiik69AccountsNavState,
  replace: (href: string) => void
): void {
  const params = new URLSearchParams();
  params.set("m", state.module);
  if (state.module === "inventory") {
    params.set("cat", state.category);
    params.set("dir", state.dir);
  }
  const qs = params.toString();
  replace(qs ? `${pathname}?${qs}` : pathname);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}
