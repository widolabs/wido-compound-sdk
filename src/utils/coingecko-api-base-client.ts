// eslint-disable-next-line @typescript-eslint/no-var-requires
const CoinGecko = require('coingecko-api');

export abstract class CoingeckoApiBaseClient {
  protected client;

  constructor() {
    this.client = new CoinGecko();
  }

  protected getPlatform(chainId: number): string {
    switch (chainId) {
      case 1:
        return 'ethereum';
      case 137:
        return 'polygon-pos';
      case 42161:
        return 'arbitrum-one';
      default:
        throw new Error('not supported');
    }
  }
}
