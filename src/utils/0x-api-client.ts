import { BigNumber } from "ethers"
import { MAINNET_ID, POLYGON_ID, ARBITRUM_ID } from "."

interface QuoteParams {
  chainId: number
  sellToken: string
  buyToken: string
  sellAmount: string
  takerAddress: string
}

interface QuoteResponse {
  to: string
  data: string
  price: string
  toTokenAmount: string
  guaranteedPrice: string
}

export class ZeroXApiClient {
  // TODO: add API key
  private static readonly API_KEY = ""
  private static readonly WIDO_FEE_RECIPIENT =
    "0x5EF7F250f74d4F11A68054AE4e150705474a6D4a"
  static readonly WIDO_FEE_BPS = "3"
  private static readonly WIDO_FEE = "0.003"
  private static readonly API_URL: Record<number, string> = {
    [MAINNET_ID]: "https://api.0x.org",
    [POLYGON_ID]: "https://polygon.api.0x.org",
    [ARBITRUM_ID]: "https://arbitrum.api.0x.org",
  }

  static async quote({
    chainId,
    sellToken,
    buyToken,
    sellAmount,
    takerAddress,
  }: QuoteParams) {
    const quoteParams = {
      sellToken,
      buyToken,
      sellAmount,
      takerAddress,
      feeRecipient: ZeroXApiClient.WIDO_FEE_RECIPIENT,
      buyTokenPercentageFee: ZeroXApiClient.WIDO_FEE,
    }
    const headers = { "0x-api-key": ZeroXApiClient.API_KEY }

    return await fetch(
      `${ZeroXApiClient.API_URL[chainId]}/swap/v1/quote?${new URLSearchParams(
        quoteParams
      ).toString()}`,
      { headers }
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`)
        }
        if (response.status.toString().slice(0, 1) !== "2") {
          throw new Error(
            `got error from 0x. status code: ${response.status}`
          );
        }
        return response.text()
      })
      .then((text) => {
        return JSON.parse(text) as QuoteResponse
      })
  }
}
