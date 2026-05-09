import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

export interface PriceTable {
  categorias: Record<string, string[]>;
  precos: Record<string, Record<string, number>>;
}

let priceCache: PriceTable | null = null;
const userPriceCache: Record<string, Record<string, number>> = {};

export async function loadPrices(): Promise<PriceTable> {
  if (priceCache) return priceCache;
  try {
    const res = await fetch("/precos.json");
    if (!res.ok) throw new Error("Falha ao carregar preços");
    priceCache = await res.json();
    return priceCache!;
  } catch {
    priceCache = { categorias: {}, precos: { padrao: {} } };
    return priceCache;
  }
}

export function getAllCategories(): string[] {
  if (!priceCache) return [];
  return Object.keys(priceCache.categorias);
}

export function getAllProductsByCategory(): Record<string, string[]> {
  if (!priceCache) return {};
  return { ...priceCache.categorias };
}

export function getAllProductNames(): string[] {
  if (!priceCache) return [];
  const names: string[] = [];
  for (const prods of Object.values(priceCache.categorias)) {
    names.push(...prods);
  }
  return names;
}

export function normalizeProductName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function getUserPriceOverrides(
  userId: string,
  regionCode: string
): Promise<Record<string, number>> {
  const cacheKey = `${userId}_${regionCode}`;
  if (userPriceCache[cacheKey]) return userPriceCache[cacheKey];

  try {
    const snap = await getDoc(doc(db, "userPrices", `${userId}_${regionCode}`));
    if (snap.exists()) {
      userPriceCache[cacheKey] = snap.data().prices || {};
      return userPriceCache[cacheKey];
    }
  } catch {}
  userPriceCache[cacheKey] = {};
  return {};
}

export async function saveUserPrice(
  userId: string,
  regionCode: string,
  productName: string,
  price: number
) {
  const cacheKey = `${userId}_${regionCode}`;
  if (!userPriceCache[cacheKey]) userPriceCache[cacheKey] = {};
  userPriceCache[cacheKey][normalizeProductName(productName)] = price;
  await setDoc(
    doc(db, "userPrices", `${userId}_${regionCode}`),
    { prices: userPriceCache[cacheKey], updatedAt: new Date() },
    { merge: true }
  );
}

export async function getEstimatedPrice(
  productName: string,
  regionCode: string = "padrao",
  userId?: string
): Promise<number> {
  await loadPrices();

  const normalized = normalizeProductName(productName);

  if (userId) {
    const overrides = await getUserPriceOverrides(userId, regionCode);
    const overrideKey = Object.keys(overrides).find(
      (k) => normalizeProductName(k) === normalized
    );
    if (overrideKey) return overrides[overrideKey];
  }

  const regionPrices = priceCache!.precos[regionCode] || priceCache!.precos["padrao"];
  if (!regionPrices) return 0;

  const match = Object.keys(regionPrices).find(
    (k) =>
      normalizeProductName(k) === normalized ||
      normalizeProductName(k).includes(normalized) ||
      normalized.includes(normalizeProductName(k))
  );

  if (match) return regionPrices[match];

  const padraoPrices = regionCode !== "padrao" ? priceCache!.precos["padrao"] : null;
  if (padraoPrices) {
    const fallback = Object.keys(padraoPrices).find(
      (k) =>
        normalizeProductName(k) === normalized ||
        normalizeProductName(k).includes(normalized) ||
        normalized.includes(normalizeProductName(k))
    );
    if (fallback) return padraoPrices[fallback];
  }

  return 0;
}
