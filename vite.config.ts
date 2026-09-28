import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

function formatLabel(timestamp: number, timeframe: string, timezone: string): string {
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

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'market-data-dev-middleware',
      configureServer(server) {
        server.middlewares.use('/api/market-data', async (req, res) => {
          try {
            const reqUrl = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
            const symbol = (reqUrl.searchParams.get('symbol') || 'SPCX').toUpperCase();
            const timeframe = (reqUrl.searchParams.get('timeframe') || '1D').toUpperCase();

            const TIMEFRAMES: Record<string, { range: string; interval: string }> = {
              '1D': { range: '1d', interval: '1h' },
              '1M': { range: '1mo', interval: '1d' },
              '1Y': { range: '1y', interval: '1wk' },
              'MAX': { range: 'max', interval: '3mo' }
            };

            const query = TIMEFRAMES[timeframe] || TIMEFRAMES['1D'];
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${query.range}&interval=${query.interval}&includePrePost=false`;

            const upstream = await fetch(url, {
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
            });

            if (!upstream.ok) {
              res.statusCode = upstream.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: `Upstream returned ${upstream.status}` }));
              return;
            }

            const payload = await upstream.json() as any;
            const result = payload.chart?.result?.[0];
            if (!result) {
              res.statusCode = 502;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'No market data returned' }));
              return;
            }

            const timezone = result.meta?.exchangeTimezoneName ?? 'America/New_York';
            const timestamps: number[] = result.timestamp ?? [];
            const closes: Array<number | null> = result.indicators?.quote?.[0]?.close ?? [];
            const points = timestamps.flatMap((timestamp: number, index: number) => {
              const price = closes[index];
              return typeof price === 'number'
                ? [{ timestamp: timestamp * 1000, label: formatLabel(timestamp, timeframe, timezone), price: Number(price.toFixed(2)) }]
                : [];
            });

            if (points.length === 0) {
              res.statusCode = 502;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'No closing prices returned' }));
              return;
            }

            const latestPrice = result.meta?.regularMarketPrice ?? points.at(-1)!.price;

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              symbol,
              timeframe,
              latestPrice,
              marketState: result.meta?.marketState ?? 'REGULAR',
              updatedAt: (result.meta?.regularMarketTime ?? Math.floor(Date.now() / 1000)) * 1000,
              retrievedAt: Date.now(),
              points
            }));
          } catch (error: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: error?.message || 'Market data unavailable' }));
          }
        });
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: 'localhost',
    strictPort: false
  },
})

