/**
 * Implementation has been copied from
 * https://github.com/samuraitruong/coingecko-api-v3/blob/main/src/CoinGeckoClient.ts
 * and hugely simplified,
 *
 * because the current released version is hardcoded to only support "ethereum" chain,
 * and that project takes forever to accept PRs.
 *
 * If eventually support for all chains is added, we can simply remove all the private function
 * in this class and use `coingecko-api-v3`
 */

export interface TokenPriceResponse {
  /**
   * ETH contract address same with the input pair
   */
  [contract_address: string]: {
    /**
     * price of coin for this currency
     */
    [currency: string]: number
  }
}

export abstract class CoingeckoApiBaseClient {
  private static readonly API_V3_URL = "https://api.coingecko.com/api/v3";

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

  public async simpleTokenPrice(input: {
    id: string;
    contract_addresses: string;
    vs_currencies: string;
    include_market_cap?: boolean;
    include_24hr_vol?: boolean;
    include_24hr_change?: boolean;
    include_last_updated_at?: boolean;
  }) {
    return this.makeRequest<TokenPriceResponse>(
      "/simple/token_price/{id}",
      input
    );
  }

  /**
   * Generic function to make request use in internal function
   * @param action
   * @param params
   * @returns
   */
  private async makeRequest<T>(
    action: string,
    params: { [key: string]: any } = {}
  ): Promise<T> {
    const qs = Object.entries(params)
      .map(([key, value]) => `${key}=${value}`)
      .join("&");
    const requestUrl = `${
      CoingeckoApiBaseClient.API_V3_URL + this.withPathParams(action, params)
    }?${qs}`;
    return await fetch(requestUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        if (response.status.toString().slice(0, 1) !== "2") {
          throw new Error(
            `got error from coin gecko. status code: ${response.status}`
          );
        }

        return response.text();
      })
      .then(text => {
        return JSON.parse(text)
      })
  }

  private withPathParams(
    path: string,
    replacements: { [x: string]: string } = {}
  ) {
    let pathStr = path;
    Object.entries(replacements).forEach(([key, value]) => {
      pathStr = pathStr.replace(`{${key}}`, value as string);
    });
    return pathStr;
  }
}
