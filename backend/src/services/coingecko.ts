import axios from 'axios';
import { env } from '../config/env.js';

const BASE_URL = 'https://api.coingecko.com/api/v3';

const TICKER_TO_ID: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'binancecoin',
  SOL: 'solana',
  ADA: 'cardano',
  XRP: 'ripple',
  DOGE: 'dogecoin',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  LINK: 'chainlink',
  AVAX: 'avalanche-2',
  LTC: 'litecoin',
  UNI: 'uniswap',
  ATOM: 'cosmos',
  FIL: 'filecoin',
};

export interface CryptoQuote {
  ticker: string;
  preco: number;
  variacao24h: number;
  marketCap: number;
  nome: string;
}

function buildHeaders(): Record<string, string> {
  if (env.COINGECKO_API_KEY) return { 'x-cg-demo-api-key': env.COINGECKO_API_KEY };
  return {};
}

export async function getCryptoQuote(ticker: string): Promise<CryptoQuote | null> {
  const id = TICKER_TO_ID[ticker.toUpperCase()];
  if (!id) return null;

  try {
    const { data } = await axios.get(`${BASE_URL}/coins/${id}`, {
      headers: buildHeaders(),
      params: { localization: false, tickers: false, community_data: false, developer_data: false },
      timeout: 8000,
    });

    return {
      ticker: ticker.toUpperCase(),
      preco: data.market_data.current_price.brl,
      variacao24h: data.market_data.price_change_percentage_24h,
      marketCap: data.market_data.market_cap.brl,
      nome: data.name,
    };
  } catch {
    return null;
  }
}

export async function getMultipleCryptoQuotes(tickers: string[]): Promise<CryptoQuote[]> {
  if (!tickers.length) return [];

  const ids = tickers
    .map(t => TICKER_TO_ID[t.toUpperCase()])
    .filter(Boolean)
    .join(',');

  if (!ids) return [];

  try {
    const { data } = await axios.get(`${BASE_URL}/simple/price`, {
      headers: buildHeaders(),
      params: { ids, vs_currencies: 'brl', include_24hr_change: true, include_market_cap: true },
      timeout: 8000,
    });

    return tickers
      .filter(t => TICKER_TO_ID[t.toUpperCase()])
      .map(t => {
        const id = TICKER_TO_ID[t.toUpperCase()];
        const coin = data[id];
        if (!coin) return null;
        return {
          ticker: t.toUpperCase(),
          preco: coin.brl,
          variacao24h: coin.brl_24h_change,
          marketCap: coin.brl_market_cap,
          nome: t,
        };
      })
      .filter(Boolean) as CryptoQuote[];
  } catch {
    return [];
  }
}
