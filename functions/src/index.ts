import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { onRequest } from 'firebase-functions/v2/https';

initializeApp();

const ALLOWED_EMAILS = new Set(['jammy.pate@gmail.com', 'linda.a.dada@gmail.com']);
const SYMBOLS = new Set(['SPCX', 'GOOG']);
const TIMEFRAMES = {
  '1D': { range: '1d', interval: '1h' },
  '1M': { range: '1mo', interval: '1d' },
  '1Y': { range: '1y', interval: '1wk' },
  MAX: { range: 'max', interval: '3mo' }
} as const;

type Timeframe = keyof typeof TIMEFRAMES;

const readQueryValue = (value: unknown): string => typeof value === 'string' ? value : '';

interface ChartResponse {
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

function formatLabel(timestamp: number, timeframe: Timeframe, timezone: string): string {
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

export const marketData = onRequest({ region: 'us-central1', timeoutSeconds: 30 }, async (request, response) => {
  try {
    const authorization = request.header('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      response.status(401).json({ error: 'Authentication required' });
      return;
    }

    const token = await getAuth().verifyIdToken(authorization.slice(7));
    if (!token.email || !ALLOWED_EMAILS.has(token.email.toLowerCase())) {
      response.status(403).json({ error: 'Access denied' });
      return;
    }

    const symbol = readQueryValue(request.query.symbol).toUpperCase();
    const timeframe = readQueryValue(request.query.timeframe) as Timeframe;
    if (!SYMBOLS.has(symbol) || !(timeframe in TIMEFRAMES)) {
      response.status(400).json({ error: 'Unsupported symbol or timeframe' });
      return;
    }

    const query = TIMEFRAMES[timeframe];
    const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`);
    url.searchParams.set('range', query.range);
    url.searchParams.set('interval', query.interval);
    url.searchParams.set('includePrePost', 'false');

    const upstream = await fetch(url, { headers: { 'User-Agent': 'FreeLinda/1.0' } });
    if (!upstream.ok) {
      throw new Error(`Market data provider returned ${upstream.status}`);
    }

    const payload = await upstream.json() as ChartResponse;
    const result = payload.chart?.result?.[0];
    if (!result) {
      throw new Error(payload.chart?.error?.description ?? 'No market data returned');
    }

    const timezone = result.meta?.exchangeTimezoneName ?? 'America/New_York';
    const timestamps = result.timestamp ?? [];
    const closes = result.indicators?.quote?.[0]?.close ?? [];
    const points = timestamps.flatMap((timestamp, index) => {
      const price = closes[index];
      return typeof price === 'number'
        ? [{ timestamp: timestamp * 1000, label: formatLabel(timestamp, timeframe, timezone), price: Number(price.toFixed(2)) }]
        : [];
    });

    if (points.length === 0) {
      throw new Error('No closing prices returned');
    }

    const latestPrice = result.meta?.regularMarketPrice ?? points.at(-1)!.price;
    response.set('Cache-Control', 'private, max-age=300');
    response.json({
      symbol,
      timeframe,
      latestPrice,
      marketState: result.meta?.marketState ?? 'UNKNOWN',
      updatedAt: (result.meta?.regularMarketTime ?? Math.floor(Date.now() / 1000)) * 1000,
      retrievedAt: Date.now(),
      points
    });
  } catch (error) {
    console.error('Market data request failed', error);
    response.status(502).json({ error: error instanceof Error ? error.message : 'Market data unavailable' });
  }
});