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
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "userCollateral",
    "outputs": [
      {
        "internalType": "uint128",
        "name": "balance",
        "type": "uint128"
      },
      {
        "internalType": "uint128",
        "name": "_reserved",
        "type": "uint128"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "userNonce",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "version",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "asset",
        "type": "address"
      }
    ],
    "name": "getAssetInfoByAddress",
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