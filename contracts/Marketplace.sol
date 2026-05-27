// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Marketplace is Ownable, ReentrancyGuard {
    uint256 public constant COMMISSION_PERCENT = 5; // 5% marketplace fee
    uint256 private gigIdCounter;
    uint256 private orderIdCounter;

    enum OrderStatus {
        PENDING,
        COMPLETED,
        CONFIRMED,
        CANCELED,
        DISPUTED
    }

    struct Gig {
        uint256 id;
        address seller;
        string title;
        string description;
        string category;
        uint256 price;
        bool active;
        uint256 createdAt;
    }

    struct Order {
        uint256 id;
        uint256 gigId;
        address buyer;
        address seller;
        uint256 amount;
        OrderStatus status;
        uint256 escrowAmount;
        uint256 createdAt;
        uint256 completedAt;
    }

    struct SellerProfile {
        uint256 totalGigs;
        uint256 completedOrders;
        uint256 balance;
        uint256 totalRating;
        uint256 ratingCount;
    }

    mapping(uint256 => Gig) public gigs;
    mapping(uint256 => Order) public orders;
    mapping(address => SellerProfile) public sellers;
    mapping(address => uint256[]) public sellerGigs;
    mapping(address => uint256[]) public buyerOrders;
    mapping(address => uint256[]) public sellerOrders;

    event GigCreated(uint256 indexed gigId, address indexed seller, string title, uint256 price);
    event OrderPlaced(uint256 indexed orderId, uint256 indexed gigId, address indexed buyer, address seller, uint256 amount);
    event OrderCompleted(uint256 indexed orderId, address indexed seller);
    event DeliveryConfirmed(uint256 indexed orderId, address indexed buyer);
    event OrderCanceled(uint256 indexed orderId);
    event PaymentReleased(uint256 indexed orderId, address indexed seller, uint256 amount);
    event BalanceWithdrawn(address indexed seller, uint256 amount);
    event CommissionWithdrawn(address indexed owner, uint256 amount);

    modifier onlySeller(uint256 _gigId) {
        require(gigs[_gigId].seller == msg.sender, "Only seller can call this");
        _;
    }

    modifier onlyBuyerOfOrder(uint256 _orderId) {
        require(orders[_orderId].buyer == msg.sender, "Only buyer can call this");
        _;
    }

    modifier onlySellerOfOrder(uint256 _orderId) {
        require(orders[_orderId].seller == msg.sender, "Only seller can call this");
        _;
    }

    constructor() Ownable(msg.sender) {
        gigIdCounter = 1;
        orderIdCounter = 1;
    }

    function createGig(
        string memory _title,
        string memory _description,
        string memory _category,
        uint256 _price
    ) external {
        require(_price > 0, "Price must be greater than 0");
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_category).length > 0, "Category cannot be empty");

        uint256 gigId = gigIdCounter;
        gigs[gigId] = Gig({
            id: gigId,
            seller: msg.sender,
            title: _title,
            description: _description,
            category: _category,
            price: _price,
            active: true,
            createdAt: block.timestamp
        });

        sellers[msg.sender].totalGigs++;
        sellerGigs[msg.sender].push(gigId);
        gigIdCounter++;

        emit GigCreated(gigId, msg.sender, _title, _price);
    }

    function placeOrder(uint256 _gigId) external payable nonReentrant {
        Gig memory gig = gigs[_gigId];
        require(gig.active, "Gig is not active");
        require(msg.sender != gig.seller, "Seller cannot buy own gig");
        
        // Strictly enforcing native coin payment to match gig price
        require(msg.value == gig.price, "Incorrect payment amount");

        uint256 orderId = orderIdCounter;

        orders[orderId] = Order({
            id: orderId,
            gigId: _gigId,
            buyer: msg.sender,
            seller: gig.seller,
            amount: gig.price,
            status: OrderStatus.PENDING,
            escrowAmount: gig.price,
            createdAt: block.timestamp,
            completedAt: 0
        });

        buyerOrders[msg.sender].push(orderId);
        sellerOrders[gig.seller].push(orderId);
        orderIdCounter++;

        emit OrderPlaced(orderId, _gigId, msg.sender, gig.seller, gig.price);
    }

    function completeOrder(uint256 _orderId) external onlySellerOfOrder(_orderId) {
        Order storage order = orders[_orderId];
        require(order.status == OrderStatus.PENDING, "Order is not pending");

        order.status = OrderStatus.COMPLETED;
        order.completedAt = block.timestamp;

        emit OrderCompleted(_orderId, msg.sender);
    }

    function confirmDelivery(uint256 _orderId) external onlyBuyerOfOrder(_orderId) nonReentrant {
        Order storage order = orders[_orderId];
        require(order.status == OrderStatus.COMPLETED, "Order not completed by seller");

        order.status = OrderStatus.CONFIRMED;

        uint256 commission = (order.amount * COMMISSION_PERCENT) / 100;
        uint256 sellerPayment = order.amount - commission;

        sellers[order.seller].balance += sellerPayment;
        sellers[order.seller].completedOrders++;

        emit PaymentReleased(_orderId, order.seller, sellerPayment);
    }

    function cancelOrder(uint256 _orderId) external nonReentrant {
        Order storage order = orders[_orderId];
        require(
            msg.sender == order.buyer || msg.sender == order.seller,
            "Only buyer or seller can cancel"
        );
        require(
            order.status == OrderStatus.PENDING || order.status == OrderStatus.COMPLETED,
            "Order cannot be canceled"
        );

        order.status = OrderStatus.CANCELED;

        // Native refund
        (bool success, ) = order.buyer.call{value: order.escrowAmount}("");
        require(success, "Refund failed");

        emit OrderCanceled(_orderId);
    }

    function withdrawBalance() external nonReentrant {
        uint256 balance = sellers[msg.sender].balance;
        require(balance > 0, "No balance to withdraw");

        sellers[msg.sender].balance = 0;

        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "Withdrawal failed");

        emit BalanceWithdrawn(msg.sender, balance);
    }

    function withdrawCommission() external onlyOwner nonReentrant {
        uint256 commission = 0;

        for (uint256 i = 1; i < orderIdCounter; i++) {
            if (orders[i].status == OrderStatus.CONFIRMED) {
                commission += (orders[i].amount * COMMISSION_PERCENT) / 100;
            }
        }

        require(commission > 0, "No commission to withdraw");

        (bool success, ) = owner().call{value: commission}("");
        require(success, "Commission withdrawal failed");

        emit CommissionWithdrawn(owner(), commission);
    }

    // View functions
    function getGig(uint256 _gigId) external view returns (Gig memory) {
        return gigs[_gigId];
    }

    function getOrder(uint256 _orderId) external view returns (Order memory) {
        return orders[_orderId];
    }

    function getSellerProfile(address _seller) external view returns (SellerProfile memory) {
        return sellers[_seller];
    }

    function getSellerRating(address _seller) external view returns (uint256) {
        if (sellers[_seller].ratingCount == 0) return 0;
        return sellers[_seller].totalRating / sellers[_seller].ratingCount;
    }

    function getSellerGigs(address _seller) external view returns (uint256[] memory) {
        return sellerGigs[_seller];
    }

    function getBuyerOrders(address _buyer) external view returns (uint256[] memory) {
        return buyerOrders[_buyer];
    }

    function getSellerOrders(address _seller) external view returns (uint256[] memory) {
        return sellerOrders[_seller];
    }

    function getGigsByCategory(string memory _category) external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 1; i < gigIdCounter; i++) {
            if (gigs[i].active && keccak256(abi.encodePacked(gigs[i].category)) == keccak256(abi.encodePacked(_category))) {
                count++;
            }
        }

        uint256[] memory categoryGigs = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 1; i < gigIdCounter; i++) {
            if (gigs[i].active && keccak256(abi.encodePacked(gigs[i].category)) == keccak256(abi.encodePacked(_category))) {
                categoryGigs[index] = i;
                index++;
            }
        }

        return categoryGigs;
    }

    function getAllGigs() external view returns (uint256[] memory) {
        uint256[] memory allGigs = new uint256[](gigIdCounter - 1);
        for (uint256 i = 1; i < gigIdCounter; i++) {
            allGigs[i - 1] = i;
        }
        return allGigs;
    }

    function updateSellerRating(address _seller, uint256 _rating) external {
        require(_rating > 0 && _rating <= 5, "Rating must be between 1 and 5");
        sellers[_seller].totalRating += _rating;
        sellers[_seller].ratingCount++;
    }

    receive() external payable {}
}