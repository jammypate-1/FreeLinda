import { auth } from '../firebase';

export type MarketTimeframe = '1D' | '1M' | '1Y' | 'MAX';
export type MarketSymbol = 'SPCX' | 'GOOG';

export interface MarketPoint {
  timestamp: number;
  label: string;
  price: number;
}

export interface MarketSeries {
  symbol: MarketSymbol;
  timeframe: MarketTimeframe;
  latestPrice: number;
  marketState: string;
  updatedAt: number;
  retrievedAt: number;
  points: MarketPoint[];
}

const FALLBACK_PRICES: Record<MarketSymbol, number> = {
  SPCX: 137.95,
  GOOG: 345.50
};

export function getFallbackMarketSeries(symbol: MarketSymbol, timeframe: MarketTimeframe): MarketSeries {
  const basePrice = FALLBACK_PRICES[symbol] ?? 100;
  const now = Date.now();

  const labelsMap: Record<MarketTimeframe, string[]> = {
    '1D': ['9:30 AM', '10:30 AM', '11:30 AM', '12:30 PM', '1:30 PM', '2:30 PM', '3:30 PM', '4:00 PM'],
    '1M': ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    '1Y': ['Q1', 'Q2', 'Q3', 'Q4'],
    'MAX': ['2023', '2024', '2025', '2026']
  };

  const labels = labelsMap[timeframe];
  const points: MarketPoint[] = labels.map((label, idx) => {
    const variation = (idx - labels.length + 1) * (basePrice * 0.005);
    return {
      timestamp: now - (labels.length - 1 - idx) * 3600000 * 24,
      label,
      price: Math.round((basePrice + variation) * 100) / 100
    };
  });

  return {
    symbol,
    timeframe,
    latestPrice: basePrice,
    marketState: 'REGULAR',
    updatedAt: now,
    retrievedAt: now,
    points
  };
}

export async function fetchMarketSeries(symbol: MarketSymbol, timeframe: MarketTimeframe): Promise<MarketSeries> {
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return getFallbackMarketSeries(symbol, timeframe);

    const response = await fetch(`/api/market-data?symbol=${symbol}&timeframe=${timeframe}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      return getFallbackMarketSeries(symbol, timeframe);
    }
    return await response.json() as MarketSeries;
  } catch {
    return getFallbackMarketSeries(symbol, timeframe);
  }
}

export function isUsMarketOpen(date = new Date()): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  if (values.weekday === 'Sat' || values.weekday === 'Sun') return false;
  const minutes = Number(values.hour) * 60 + Number(values.minute);
  return minutes >= 9 * 60 + 30 && minutes < 16 * 60;
}