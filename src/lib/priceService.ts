import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

export interface PriceTable {
  categorias: Record<string, string[]>;
  precos: Record<string, Record<string, number>>;
  cidades?: Record<string, Record<string, number>>;
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

function findPriceInTable(
  table: Record<string, number>,
  normalized: string
): number | null {
  const match = Object.keys(table).find(
    (k) =>
      normalizeProductName(k) === normalized ||
      normalizeProductName(k).includes(normalized) ||
      normalized.includes(normalizeProductName(k))
  );
  return match ? table[match] : null;
}

export async function getEstimatedPrice(
  productName: string,
  regionCode: string = "padrao",
  userId?: string,
  city?: string
): Promise<number> {
  await loadPrices();
  const normalized = normalizeProductName(productName);

  // 1. User override
  if (userId) {
    const overrideKey = city || regionCode;
    const overrides = await getUserPriceOverrides(userId, overrideKey);
    const match = Object.keys(overrides).find(
      (k) => normalizeProductName(k) === normalized
    );
    if (match) return overrides[match];
  }

  // 2. City prices
  if (city && priceCache!.cidades) {
    const cityPrices = priceCache!.cidades[city];
    if (cityPrices) {
      const found = findPriceInTable(cityPrices, normalized);
      if (found !== null) return found;
    }
  }

  // 3. State prices
  const statePrices = priceCache!.precos[regionCode];
  if (statePrices) {
    const found = findPriceInTable(statePrices, normalized);
    if (found !== null) return found;
  }

  // 4. Default
  const padraoPrices = priceCache!.precos["padrao"];
  if (padraoPrices) {
    const found = findPriceInTable(padraoPrices, normalized);
    if (found !== null) return found;
  }

  return 0;
}
