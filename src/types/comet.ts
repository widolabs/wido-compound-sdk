export const Comet_ABI = [
  {
    "inputs": [],
    "name": "numAssets",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint8",
        "name": "i",
        "type": "uint8"
      }
    ],
    "name": "getAssetInfo",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint8",
            "name": "offset",
            "type": "uint8"
          },
          {
            "internalType": "address",
            "name": "asset",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "priceFeed",
            "type": "address"
          },
          {
            "internalType": "uint64",
            "name": "scale",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "borrowCollateralFactor",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "liquidateCollateralFactor",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "liquidationFactor",
            "type": "uint64"
          },
          {
            "internalType": "uint128",
            "name": "supplyCap",
            "type": "uint128"
          }
        ],
        "internalType": "struct CometCore.AssetInfo",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
]