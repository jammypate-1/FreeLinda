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

export async function fetchMarketSeries(symbol: MarketSymbol, timeframe: MarketTimeframe): Promise<MarketSeries> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Sign in is required to load market data');

  const response = await fetch(`/api/market-data?symbol=${symbol}&timeframe=${timeframe}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error ?? `Market data request failed (${response.status})`);
  }
  return response.json() as Promise<MarketSeries>;
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