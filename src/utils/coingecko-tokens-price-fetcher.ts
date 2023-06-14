import { CoingeckoApiBaseClient, TokenPriceResponse } from './coingecko-api-base-client';

export class CoingeckoTokensPriceFetcher
  extends CoingeckoApiBaseClient {
  async fetch(addresses: string[], chainId: number): Promise<TokenPriceResponse> {
    return await this.simpleTokenPrice(
      {
        id: this.getPlatform(chainId),
        contract_addresses: addresses.join(","),
        vs_currencies: 'usd',
      }
    );
  }
}
