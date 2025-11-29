import 'dotenv/config';
import * as hl from '@nktkas/hyperliquid';
import { testnetFuturesTrade } from './dist/tools/hyperliquid-testnet-futures-trade.js';

async function testTrades() {
  const transport = new hl.HttpTransport({ isTestnet: true });
  const infoClient = new hl.InfoClient({ transport });
  const mids = await infoClient.allMids();

  // === 1. BTC LIMIT ORDER ===
  console.log('='.repeat(50));
  console.log('1. BTC LIMIT ORDER');
  console.log('='.repeat(50));
  
  const btcPrice = parseFloat(mids['BTC']);
  console.log('Current BTC Price:', btcPrice);
  
  const btcSize = (100 / btcPrice).toFixed(5); // $100 position
  const btcLimitPrice = Math.round(btcPrice * 1.001).toString(); // 0.1% above market
  console.log('Size:', btcSize, 'BTC');
  console.log('Limit Price:', btcLimitPrice);
  
  const btcResult = await testnetFuturesTrade({
    symbol: 'BTC',
    side: 'buy',
    size: btcSize,
    orderMode: 'limit',
    limitPrice: btcLimitPrice,
    leverage: 10,
    reduceOnly: false,
    timeInForce: 'Gtc',
  });
  
  console.log('Result:', JSON.stringify(btcResult, null, 2));
  console.log('');

  // === 2. ETH MARKET ORDER ===
  console.log('='.repeat(50));
  console.log('2. ETH MARKET ORDER');
  console.log('='.repeat(50));
  
  const ethPrice = parseFloat(mids['ETH']);
  console.log('Current ETH Price:', ethPrice);
  
  const ethSize = (100 / ethPrice).toFixed(4); // $100 position
  console.log('Size:', ethSize, 'ETH');
  
  const ethResult = await testnetFuturesTrade({
    symbol: 'ETH',
    side: 'buy',
    size: ethSize,
    orderMode: 'market',
    leverage: 10,
    reduceOnly: false,
  });
  
  console.log('Result:', JSON.stringify(ethResult, null, 2));
}

testTrades().catch(err => {
  console.error('Error:', err.message);
  console.error(err);
});
