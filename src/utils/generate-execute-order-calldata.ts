import { ethers } from "ethers"

interface GenerateExecuteOrderCalldataParams {
  fromToken: string
  toToken: string
  fromTokenAmount: string
  minOutputAmount: string
  userAddress: string
  nonce: number
  expiration: number
  targetAddress: string
  data: string
  amountIndex: number
  feeBps: string
  partnerAddress: string
}

export function generateExecuteOrderCalldata({
  fromToken,
  toToken,
  fromTokenAmount,
  minOutputAmount,
  userAddress,
  nonce,
  expiration,
  targetAddress,
  data,
  amountIndex,
  feeBps,
  partnerAddress,
}: GenerateExecuteOrderCalldataParams) {
  const order = {
    inputs: [
      {
        tokenAddress: fromToken,
        amount: ethers.BigNumber.from(fromTokenAmount),
      },
    ],
    outputs: [
      {
        tokenAddress: toToken,
        minOutputAmount: ethers.BigNumber.from(minOutputAmount),
      },
    ],
    user: userAddress,
    nonce: nonce,
    expiration: expiration,
  }

  const route = [
    {
      fromToken: fromToken,
      targetAddress: targetAddress,
      data: data,
      amountIndex: amountIndex,
    },
  ]

  const values = [order, route, ethers.BigNumber.from(feeBps), partnerAddress]

  const contract = new ethers.Contract("0x0000000000000000000000000000000000000000", WIDO_ROUTER_ABI)

  return contract.interface.encodeFunctionData("executeOrder", values)
}

const WIDO_ROUTER_ABI = [
  {
    inputs: [
      {
        components: [
          {
            components: [
              {
                internalType: "address",
                name: "tokenAddress",
                type: "address",
              },
              {
                internalType: "uint256",
                name: "amount",
                type: "uint256",
              },
            ],
            internalType: "struct IWidoRouter.OrderInput[]",
            name: "inputs",
            type: "tuple[]",
          },
          {
            components: [
              {
                internalType: "address",
                name: "tokenAddress",
                type: "address",
              },
              {
                internalType: "uint256",
                name: "minOutputAmount",
                type: "uint256",
              },
            ],
            internalType: "struct IWidoRouter.OrderOutput[]",
            name: "outputs",
            type: "tuple[]",
          },
          {
            internalType: "address",
            name: "user",
            type: "address",
          },
          {
            internalType: "uint32",
            name: "nonce",
            type: "uint32",
          },
          {
            internalType: "uint32",
            name: "expiration",
            type: "uint32",
          },
        ],
        internalType: "struct IWidoRouter.Order",
        name: "order",
        type: "tuple",
      },
      {
        components: [
          {
            internalType: "address",
            name: "fromToken",
            type: "address",
          },
          {
            internalType: "address",
            name: "targetAddress",
            type: "address",
          },
          {
            internalType: "bytes",
            name: "data",
            type: "bytes",
          },
          {
            internalType: "int32",
            name: "amountIndex",
            type: "int32",
          },
        ],
        internalType: "struct IWidoRouter.Step[]",
        name: "route",
        type: "tuple[]",
      },
      {
        internalType: "uint256",
        name: "feeBps",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "partner",
        type: "address",
      },
    ],
    name: "executeOrder",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
]
