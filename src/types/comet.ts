export const Comet_ABI = [
  "function numAssets() external view returns (uint8)",
  "function getAssetInfo(uint8 i) public view returns (tuple(uint8 offset, address asset, address priceFeed, uint64 scale, uint64 borrowCollateralFactor, uint64 liquidateCollateralFactor, uint64 liquidationFactor, uint128 supplyCap) memory)",
  "function getAssetInfoByAddress(address) public view returns (uint8 offset, address asset, address priceFeed, uint64 scale, uint64 borrowCollateralFactor, uint64 liquidateCollateralFactor, uint64 liquidationFactor, uint128 supplyCap)",
  "function userCollateral(address, address) public returns (uint128, uint128)",
  "function name() public returns (string memory)",
  "function version() public returns (string memory)",
  "function userNonce(address) public returns (uint256)",
  "function collateralBalanceOf(address account, address asset) external view returns (uint128)",
  "function getPrice(address priceFeed) public view returns (uint128)",
  "function baseTokenPriceFeed() public view returns (address)",
  "function decimals() external view returns (uint)",
  "function borrowBalanceOf(address account) external view returns (uint256)",
]