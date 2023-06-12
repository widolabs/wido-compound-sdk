export const IWidoCollateralSwap_ABI = [
  {
    "inputs": [
      {
        "internalType": "struct WidoCollateralSwap.Collateral",
        "name": "existingCollateral",
        "type": "tuple",
        "components": [
          {
            "internalType": "address",
            "name": "addr",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          }
        ]
      },
      {
        "internalType": "struct WidoCollateralSwap.Collateral",
        "name": "finalCollateral",
        "type": "tuple",
        "components": [
          {
            "internalType": "address",
            "name": "addr",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          }
        ]
      },
      {
        "internalType": "struct WidoCollateralSwap.Signatures",
        "name": "sigs",
        "type": "tuple",
        "components": [
          {
            "internalType": "struct WidoCollateralSwap.Signature",
            "name": "allow",
            "type": "tuple",
            "components": [
              {
                "internalType": "uint8",
                "name": "v",
                "type": "uint8"
              },
              {
                "internalType": "bytes32",
                "name": "r",
                "type": "bytes32"
              },
              {
                "internalType": "bytes32",
                "name": "s",
                "type": "bytes32"
              }
            ]
          },
          {
            "internalType": "struct WidoCollateralSwap.Signature",
            "name": "revoke",
            "type": "tuple",
            "components": [
              {
                "internalType": "uint8",
                "name": "v",
                "type": "uint8"
              },
              {
                "internalType": "bytes32",
                "name": "r",
                "type": "bytes32"
              },
              {
                "internalType": "bytes32",
                "name": "s",
                "type": "bytes32"
              }
            ]
          }
        ]
      },
      {
        "internalType": "struct WidoCollateralSwap.WidoSwap",
        "name": "swap",
        "type": "tuple",
        "components": [
          {
            "internalType": "address",
            "name": "router",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "tokenManager",
            "type": "address"
          },
          {
            "internalType": "bytes",
            "name": "callData",
            "type": "bytes"
          }
        ]
      },
      {
        "internalType": "address",
        "name": "comet",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function",
    "name": "swapCollateral"
  }
]