// src/config.ts
export const MARKETPLACE_ADDRESS = "0xYourDeployedMarketplaceAddressHere";

// A simplified ABI containing only the functions we need for this demo
export const MARKETPLACE_ABI = [
  "function createGig(string _title, string _description, string _category, uint256 _price) external",
  "function getAllGigs() external view returns (uint256[])",
  "function getGig(uint256 _gigId) external view returns (tuple(uint256 id, address seller, string title, string description, string category, uint256 price, bool active, uint256 createdAt))",
  "function placeOrder(uint256 _gigId) external payable"
];