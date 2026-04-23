import axios from 'axios';
import { env } from '../config/env.js';

const BASE_URL = 'https://brapi.dev/api';

export interface StockQuote {
  ticker: string;
  preco: number;
  variacao: number;
  variacaoPercent: number;
  nome: string;
}

export async function getStockQuote(ticker: string): Promise<StockQuote | null> {
  try {
    const params: Record<string, string> = { range: '1d', interval: '1d' };
    if (env.BRAPI_TOKEN) params['token'] = env.BRAPI_TOKEN;

    const { data } = await axios.get(`${BASE_URL}/quote/${ticker}`, { params, timeout: 8000 });
    const result = data?.results?.[0];
    if (!result) return null;

    return {
      ticker: result.symbol,
      preco: result.regularMarketPrice,
      variacao: result.regularMarketChange,
      variacaoPercent: result.regularMarketChangePercent,
      nome: result.shortName ?? result.longName ?? ticker,
    };
  } catch {
    return null;
  }
}

export async function getMultipleStockQuotes(tickers: string[]): Promise<StockQuote[]> {
  if (!tickers.length) return [];
  try {
    const params: Record<string, string> = { range: '1d', interval: '1d' };
    if (env.BRAPI_TOKEN) params['token'] = env.BRAPI_TOKEN;

    const tickerList = tickers.join(',');
    const { data } = await axios.get(`${BASE_URL}/quote/${tickerList}`, { params, timeout: 8000 });

    return (data?.results ?? []).map((r: Record<string, unknown>) => ({
      ticker: r['symbol'],
      preco: r['regularMarketPrice'],
      variacao: r['regularMarketChange'],
      variacaoPercent: r['regularMarketChangePercent'],
      nome: r['shortName'] ?? r['longName'] ?? r['symbol'],
    }));
  } catch {
    return [];
  }
}
