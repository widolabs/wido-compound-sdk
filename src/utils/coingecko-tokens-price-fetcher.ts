import { CoingeckoApiBaseClient } from './coingecko-api-base-client';

export class CoingeckoTokensPriceFetcher
  extends CoingeckoApiBaseClient
{
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
    const prices = await this.client.simple.fetchTokenPrice(
      {
        contract_addresses: addresses,
        vs_currencies: 'usd',
      },
      this.getPlatform(chainId),
    );
    const results = [];
    for (const [address, price] of Object.entries(prices.data)) {
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
