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

const TIMEFRAME_QUERY: Record<MarketTimeframe, { range: string; interval: string }> = {
  '1D': { range: '1d', interval: '1h' },
  '1M': { range: '1mo', interval: '1d' },
  '1Y': { range: '1y', interval: '1wk' },
  MAX: { range: 'max', interval: '3mo' }
};

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        regularMarketTime?: number;
        exchangeTimezoneName?: string;
        marketState?: string;
      };
      timestamp?: number[];
      indicators?: { quote?: Array<{ close?: Array<number | null> }> };
    }>;
    error?: { description?: string } | null;
  };
}

function formatPointLabel(timestamp: number, timeframe: MarketTimeframe, timezone: string): string {
  const date = new Date(timestamp * 1000);
  if (timeframe === '1D') {
    return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: timezone }).format(date);
  }
  if (timeframe === 'MAX') {
    return new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: timezone }).format(date);
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: timeframe === '1M' ? 'numeric' : undefined,
    year: timeframe === '1Y' ? '2-digit' : undefined,
    timeZone: timezone
  }).format(date);
}

export async function fetchMarketSeries(symbol: MarketSymbol, timeframe: MarketTimeframe): Promise<MarketSeries> {
  const query = TIMEFRAME_QUERY[timeframe];
  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${query.range}&interval=${query.interval}&includePrePost=false`;
  const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(yahooUrl)}`);
  if (!response.ok) {
    throw new Error(`Market data request failed (${response.status})`);
  }

  const payload = await response.json() as YahooChartResponse;
  const result = payload.chart?.result?.[0];
  if (!result) throw new Error(payload.chart?.error?.description ?? 'No market data returned');

  const timezone = result.meta?.exchangeTimezoneName ?? 'America/New_York';
  const timestamps = result.timestamp ?? [];
  const closes = result.indicators?.quote?.[0]?.close ?? [];
  const points = timestamps.flatMap((timestamp, index) => {
    const price = closes[index];
    return typeof price === 'number'
      ? [{ timestamp: timestamp * 1000, label: formatPointLabel(timestamp, timeframe, timezone), price: Number(price.toFixed(2)) }]
      : [];
  });
  if (points.length === 0) throw new Error('No closing prices returned');

  return {
    symbol,
    timeframe,
    latestPrice: result.meta?.regularMarketPrice ?? points.at(-1)!.price,
    marketState: result.meta?.marketState ?? 'UNKNOWN',
    updatedAt: (result.meta?.regularMarketTime ?? Math.floor(Date.now() / 1000)) * 1000,
    retrievedAt: Date.now(),
    points
  };
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