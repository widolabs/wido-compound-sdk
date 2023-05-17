export const WidoCollateralSwap_ABI = [
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
        "internalType": "address",
        "name": "widoRouter",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "widoTokenManager",
        "type": "address"
      },
      {
        "internalType": "bytes",
        "name": "widoRouterCalldata",
        "type": "bytes"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function",
    "name": "swapCollateral"
  }
]