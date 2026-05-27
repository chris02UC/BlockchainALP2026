// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Ratings {
    struct Review {
        uint256 orderId;
        address reviewer;
        address reviewee;
        uint256 rating; // 1-5
        string comment;
        uint256 timestamp;
    }

    uint256 private reviewIdCounter;
    mapping(uint256 => Review) public reviews;
    mapping(address => uint256[]) public sellerReviews;
    mapping(uint256 => bool) public orderReviewed;

    event ReviewSubmitted(uint256 indexed reviewId, uint256 indexed orderId, address indexed reviewer, uint256 rating);
    event ReviewDeleted(uint256 indexed reviewId);

    constructor() {
        reviewIdCounter = 1;
    }

    function submitReview(
        uint256 _orderId,
        address _reviewee,
        uint256 _rating,
        string memory _comment
    ) external {
        require(_rating > 0 && _rating <= 5, "Rating must be between 1 and 5");
        require(!orderReviewed[_orderId], "Order already reviewed");
        require(bytes(_comment).length > 0, "Comment cannot be empty");

        uint256 reviewId = reviewIdCounter;

        reviews[reviewId] = Review({
            orderId: _orderId,
            reviewer: msg.sender,
            reviewee: _reviewee,
            rating: _rating,
            comment: _comment,
            timestamp: block.timestamp
        });

        sellerReviews[_reviewee].push(reviewId);
        orderReviewed[_orderId] = true;
        reviewIdCounter++;

        emit ReviewSubmitted(reviewId, _orderId, msg.sender, _rating);
    }

    function getReview(uint256 _reviewId) external view returns (Review memory) {
        return reviews[_reviewId];
    }

    function getSellerReviews(address _seller) external view returns (uint256[] memory) {
        return sellerReviews[_seller];
    }

    function getSellerRating(address _seller) external view returns (uint256) {
        uint256[] memory sellerReviewIds = sellerReviews[_seller];
        if (sellerReviewIds.length == 0) return 0;

        uint256 totalRating = 0;
        for (uint256 i = 0; i < sellerReviewIds.length; i++) {
            totalRating += reviews[sellerReviewIds[i]].rating;
        }

        return totalRating / sellerReviewIds.length;
    }

    function getReviewCount(address _seller) external view returns (uint256) {
        return sellerReviews[_seller].length;
    }

    function isOrderReviewed(uint256 _orderId) external view returns (bool) {
        return orderReviewed[_orderId];
    }
}
