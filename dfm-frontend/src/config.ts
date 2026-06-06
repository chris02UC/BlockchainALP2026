// src/config.ts
export const MARKETPLACE_ADDRESS = "0x5fbdb2315678afecb367f032d93f642f64180aa3";
export const DISPUTES_ADDRESS = "0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0";
export const RATINGS_ADDRESS = "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512";

// A simplified ABI containing only the functions we need for this demo
export const MARKETPLACE_ABI = [
  "function createGig(string _title, string _description, string _category, uint256 _price) external",
  "function getAllGigs() external view returns (uint256[])",
  "function getGig(uint256 _gigId) external view returns (tuple(uint256 id, address seller, string title, string description, string category, uint256 price, bool active, uint256 createdAt))",
  "function placeOrder(uint256 _gigId) external payable",
  "function completeOrder(uint256 _orderId, string _deliveryHash) external",
  "function getOrder(uint256 _orderId) external view returns (tuple(uint256 id, uint256 gigId, address buyer, address seller, uint256 amount, uint8 status, uint256 escrowAmount, uint256 createdAt, uint256 completedAt, string deliveryHash))",
  "function confirmDelivery(uint256 _orderId) external",
  "function getBuyerOrders(address _buyer) external view returns (uint256[])",
  "function getSellerOrders(address _seller) external view returns (uint256[])",
  "function toggleGigStatus(uint256 _gigId) external",
  "function getSellerGigs(address _seller) external view returns (uint256[])"
];