import { CoingeckoApiBaseClient } from './coingecko-api-base-client';

export class CoingeckoTokensPriceFetcher
  extends CoingeckoApiBaseClient {
  async fetch(addresses: string[], chainId: number): Promise<{ address: string; price: number }[]> {
    const results = [];
    do {
      const batch = await this.batch(chainId, addresses.splice(0, 100));
      results.push(...batch);
    } while (addresses.length > 0);

    return results;
  }

  private async batch(chainId: number, addresses: string[]) {
    await this.sleep();
    const prices = await this.simpleTokenPrice(
      {
        id: this.getPlatform(chainId),
        contract_addresses: addresses.join(","),
        vs_currencies: 'usd',
      }
    );
    const results = [];
    for (const [address, price] of Object.entries(prices)) {
      results.push({
        address: address,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        price: price.usd,
      });
    }
    return results;
  }

  private sleep() {
    return new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
