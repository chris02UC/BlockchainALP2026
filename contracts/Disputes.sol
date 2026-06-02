// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Disputes {
    enum DisputeStatus {
        OPEN,
        EVIDENCE_SUBMITTED,
        RESOLVED,
        REJECTED
    }

    enum Resolution {
        REFUND_BUYER,
        PAY_SELLER,
        PARTIAL_SPLIT
    }

    struct Dispute {
        uint256 id;
        uint256 orderId;
        address initiator;
        address respondent;
        string reason;
        DisputeStatus status;
        Resolution resolution;
        uint256 createdAt;
        uint256 resolvedAt;
    }

    struct Evidence {
        uint256 disputeId;
        address submitter;
        string evidenceHash; // IPFS hash
        uint256 timestamp;
    }

    uint256 private disputeIdCounter;
    address public admin;

    mapping(uint256 => Dispute) public disputes;
    mapping(uint256 => Evidence[]) public disputeEvidence;
    mapping(uint256 => bool) public orderDisputed;

    event DisputeOpened(uint256 indexed disputeId, uint256 indexed orderId, address indexed initiator, string reason);
    event EvidenceSubmitted(uint256 indexed disputeId, address indexed submitter, string evidenceHash);
    event DisputeResolved(uint256 indexed disputeId, uint8 resolution);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can resolve disputes");
        _;
    }

    constructor(address _admin) {
        admin = _admin;
        disputeIdCounter = 1;
    }

    function openDispute(
        uint256 _orderId,
        address _respondent,
        string memory _reason
    ) external {
        require(!orderDisputed[_orderId], "Order already has a dispute");
        require(bytes(_reason).length > 0, "Reason cannot be empty");

        uint256 disputeId = disputeIdCounter;

        disputes[disputeId] = Dispute({
            id: disputeId,
            orderId: _orderId,
            initiator: msg.sender,
            respondent: _respondent,
            reason: _reason,
            status: DisputeStatus.OPEN,
            resolution: Resolution.REFUND_BUYER,
            createdAt: block.timestamp,
            resolvedAt: 0
        });

        orderDisputed[_orderId] = true;
        disputeIdCounter++;

        emit DisputeOpened(disputeId, _orderId, msg.sender, _reason);
    }

    function submitEvidence(uint256 _disputeId, string memory _evidenceHash) external {
        Dispute storage dispute = disputes[_disputeId];
        require(
            msg.sender == dispute.initiator || msg.sender == dispute.respondent,
            "Only involved parties can submit evidence"
        );
        require(dispute.status == DisputeStatus.OPEN, "Dispute is not open");
        require(bytes(_evidenceHash).length > 0, "Evidence hash cannot be empty");

        disputeEvidence[_disputeId].push(Evidence({
            disputeId: _disputeId,
            submitter: msg.sender,
            evidenceHash: _evidenceHash,
            timestamp: block.timestamp
        }));

        if (dispute.status == DisputeStatus.OPEN) {
            dispute.status = DisputeStatus.EVIDENCE_SUBMITTED;
        }

        emit EvidenceSubmitted(_disputeId, msg.sender, _evidenceHash);
    }

    function resolveDispute(uint256 _disputeId, uint8 _resolution) external onlyAdmin {
        Dispute storage dispute = disputes[_disputeId];
        require(
            dispute.status == DisputeStatus.OPEN || dispute.status == DisputeStatus.EVIDENCE_SUBMITTED,
            "Dispute cannot be resolved"
        );
        require(_resolution <= 2, "Invalid resolution");

        dispute.status = DisputeStatus.RESOLVED;
        dispute.resolution = Resolution(_resolution);
        dispute.resolvedAt = block.timestamp;

        emit DisputeResolved(_disputeId, _resolution);
    }

    function rejectDispute(uint256 _disputeId) external onlyAdmin {
        Dispute storage dispute = disputes[_disputeId];
        require(
            dispute.status == DisputeStatus.OPEN || dispute.status == DisputeStatus.EVIDENCE_SUBMITTED,
            "Dispute cannot be rejected"
        );

        dispute.status = DisputeStatus.REJECTED;
        orderDisputed[dispute.orderId] = false;

        emit DisputeResolved(_disputeId, 99); // 99 = rejected
    }

    function getDispute(uint256 _disputeId) external view returns (Dispute memory) {
        return disputes[_disputeId];
    }

    function getDisputeEvidence(uint256 _disputeId) external view returns (Evidence[] memory) {
        return disputeEvidence[_disputeId];
    }

    function isOrderDisputed(uint256 _orderId) external view returns (bool) {
        return orderDisputed[_orderId];
    }

    function setAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "Invalid admin address");
        admin = _newAdmin;
    }
}
