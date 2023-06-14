import https from "https";
import { RequestOptions } from 'https';

/**
 * Implementation has been copied from
 * https://github.com/samuraitruong/coingecko-api-v3/blob/main/src/CoinGeckoClient.ts
 *
 * because the current released version is hardcoded to only support "ethereum" chain,
 * and that project takes forever to accept PRs.
 *
 * If eventually support for all chains is added, we can simply remove all the private function
 * in this class and use `coingecko-api-v3`
 */

interface HttpResponse<T> {
  data: T,
  statusCode: number,
  headers: { [x: string]: string | string[] }
}

interface Options {
  timeout?: number,
  autoRetry?: boolean,
  extraHTTPSOptions?: RequestOptions
}

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
  private options: Options = {
    timeout: 30000,
    autoRetry: true,
  };

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
   * Make HTTP request to the given endpoint
   * @param url the full https URL
   * @returns json content
   */
  private async httpGet<T>(url: string) {
    const { host, pathname, search } = new URL(url);
    const options: https.RequestOptions = {
      host,
      path: pathname + search,
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "coingeckoclient/0.0.1",
      },
      timeout: this.options.timeout, // in ms
      ...this.options.extraHTTPSOptions,
    };
    const parseJson = (input: string) => {
      try {
        return JSON.parse(input);
      } catch (err) {
        return input;
      }
    };

    return new Promise<HttpResponse<T | any>>((resolve, reject) => {
      const req = https.request(options, (res) => {
        if (res.statusCode && res.statusCode === 429) {
          resolve({
            statusCode: res.statusCode,
            data: {
              error: "HTTP 429 - Too many request",
            },
            headers: res.headers as any,
          });
          // reject(new Error(`HTTP status code ${res.statusCode}`));
        }
        const body: Array<Uint8Array> = [];
        res.on("data", (chunk) => body.push(chunk));
        res.on("end", () => {
          const resString = Buffer.concat(body).toString();
          resolve({
            statusCode: res.statusCode as number,
            data: parseJson(resString) as T,
            headers: res.headers as any,
          });
        });
      });

      req.on("error", (err) => {
        reject(err);
      });

      req.on("timeout", () => {
        req.destroy();
        reject(new Error(`HTTP Request timeout after ${this.options.timeout}`));
      });

      req.end();
    });
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
    const res = await this.httpGet<T>(requestUrl); // await this.http.get<T>(requestUrl);
    if (res.statusCode === 429 && this.options.autoRetry) {
      // console.warn("retrying........", requestUrl, res.headers);
      const retryAfter = +res.headers["retry-after"] * 1000;
      // console.log("retrying after ", retryAfter);
      await new Promise((r) => setTimeout(r, retryAfter));
      return (await this.makeRequest<T>(action, params)) as T;
    }

    if (res.statusCode.toString().slice(0, 1) !== "2") {
      throw new Error(
        `got error from coin gecko. status code: ${res.statusCode}`
      );
    }

    return res.data as T;
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
