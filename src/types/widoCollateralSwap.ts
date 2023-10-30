export const IWidoCollateralSwap_ABI = [
  {
    inputs: [
      {
        components: [
          {
            internalType: "address",
            name: "addr",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
        ],
        internalType: "struct LibCollateralSwap.Collateral",
        name: "existingCollateral",
        type: "tuple",
      },
      {
        components: [
          {
            internalType: "address",
            name: "addr",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
        ],
        internalType: "struct LibCollateralSwap.Collateral",
        name: "finalCollateral",
        type: "tuple",
      },
      {
        components: [
          {
            components: [
              {
                internalType: "uint8",
                name: "v",
                type: "uint8",
              },
              {
                internalType: "bytes32",
                name: "r",
                type: "bytes32",
              },
              {
                internalType: "bytes32",
                name: "s",
                type: "bytes32",
              },
            ],
            internalType: "struct LibCollateralSwap.Signature",
            name: "allow",
            type: "tuple",
          },
          {
            components: [
              {
                internalType: "uint8",
                name: "v",
                type: "uint8",
              },
              {
                internalType: "bytes32",
                name: "r",
                type: "bytes32",
              },
              {
                internalType: "bytes32",
                name: "s",
                type: "bytes32",
              },
            ],
            internalType: "struct LibCollateralSwap.Signature",
            name: "revoke",
            type: "tuple",
          },
        ],
        internalType: "struct LibCollateralSwap.Signatures",
        name: "sigs",
        type: "tuple",
      },
      {
        internalType: "bytes",
        name: "swapCallData",
        type: "bytes",
      },
    ],
    name: "swapCollateral",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
]
