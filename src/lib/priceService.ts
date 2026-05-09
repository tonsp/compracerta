interface PriceTable {
  [region: string]: { [product: string]: number };
}

let priceCache: PriceTable | null = null;

export async function loadPrices(): Promise<PriceTable> {
  if (priceCache) return priceCache;

  try {
    const res = await fetch("/precos.json");
    if (!res.ok) throw new Error("Falha ao carregar preços");
    priceCache = await res.json();
    return priceCache!;
  } catch {
    return {
      padrao: {
        arroz: 5.99,
        feijao: 7.49,
        leite: 4.29,
        pao: 0.89,
        manteiga: 12.9,
        frango: 18.5,
      },
    };
  }
}

export function normalizeProductName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

export async function getEstimatedPrice(
  productName: string,
  regionCode: string = "padrao"
): Promise<number> {
  const prices = await loadPrices();
  const region = prices[regionCode] || prices["padrao"];
  if (!region) return 0;

  const key = normalizeProductName(productName);

  const match = Object.keys(region).find(
    (k) => normalizeProductName(k) === key || normalizeProductName(k).includes(key) || key.includes(normalizeProductName(k))
  );

  return match ? region[match] : 0;
}

export async function calculateEstimatedTotal(
  items: { name: string; plannedQty: number; unit: string }[],
  regionCode: string = "padrao"
): Promise<number> {
  let total = 0;
  for (const item of items) {
    const price = await getEstimatedPrice(item.name, regionCode);
    total += price * item.plannedQty;
  }
  return Math.round(total * 100) / 100;
}
