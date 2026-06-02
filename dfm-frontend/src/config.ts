// src/config.ts
export const MARKETPLACE_ADDRESS = "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512";
export const DISPUTES_ADDRESS = "0xcf7ed3acca5a467e9e704c703e8d87f634fb0fc9";
export const RATINGS_ADDRESS = "0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0";

// A simplified ABI containing only the functions we need for this demo
export const MARKETPLACE_ABI = [
  "function createGig(string _title, string _description, string _category, uint256 _price) external",
  "function getAllGigs() external view returns (uint256[])",
  "function getGig(uint256 _gigId) external view returns (tuple(uint256 id, address seller, string title, string description, string category, uint256 price, bool active, uint256 createdAt))",
  "function placeOrder(uint256 _gigId) external payable"
];