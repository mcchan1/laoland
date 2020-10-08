pragma solidity ^0.7.0;

// SPDX-License-Identifier: MIT

import "./interfaces/IOnboarding.sol";
import "../core/DaoConstants.sol";
import "../core/DaoRegistry.sol";
import "../adapters/interfaces/IVoting.sol";
import "../utils/SafeMath.sol";
import "../guards/MemberGuard.sol";
import "../guards/AdapterGuard.sol";
import "../guards/DaoGuard.sol";

contract OnboardingContract is
    IOnboarding,
    DaoConstants,
    MemberGuard,
    AdapterGuard,
    DaoGuard
{
    using SafeMath for uint256;

    struct ProposalDetails {
        uint256 id;
        uint256 amount;
        uint256 sharesRequested;
        address token;
        bool processed;
        address applicant;
    }

    struct OnboardingConfig {
        uint256 chunkSize;
        uint256 sharesPerChunk;
    }

    mapping(address => OnboardingConfig) public configs;
    mapping(address => mapping(uint256 => ProposalDetails)) public proposals;

    function configureDao(
        DaoRegistry dao,
        uint256 chunkSize,
        uint256 sharesPerChunk
    ) external onlyAdapter(dao) {
        configs[address(dao)].chunkSize = chunkSize;
        configs[address(dao)].sharesPerChunk = sharesPerChunk;
    }

    function submitMembershipProposal(
        DaoRegistry dao,
        address applicant,
        uint256 value,
        address token
    ) external override onlyDao(dao) returns (uint256) {
        OnboardingConfig memory config = configs[address(dao)];

        require(config.sharesPerChunk > 0, "sharesPerChunk should not be 0");
        require(config.chunkSize > 0, "chunkSize should not be 0");

        uint256 numberOfChunks = value.div(config.chunkSize);
        require(numberOfChunks > 0, "not sufficient ETH");

        uint256 amount = numberOfChunks.mul(config.chunkSize);
        uint256 sharesRequested = numberOfChunks.mul(config.sharesPerChunk);

        _submitMembershipProposal(
            dao,
            applicant,
            sharesRequested,
            amount,
            token
        );

        return amount;
    }

    function updateDelegateKey(DaoRegistry dao, address delegateKey) external {
        dao.updateDelegateKey(msg.sender, delegateKey);
    }

    function _submitMembershipProposal(
        DaoRegistry dao,
        address newMember,
        uint256 sharesRequested,
        uint256 amount,
        address token
    ) internal {
        uint256 proposalId = dao.submitProposal(msg.sender);
        ProposalDetails memory p = ProposalDetails(
            proposalId,
            amount,
            sharesRequested,
            token,
            false,
            newMember
        );
        proposals[address(dao)][proposalId] = p;
    }

    function sponsorProposal(
        DaoRegistry dao,
        uint256 proposalId,
        bytes calldata data
    ) external override onlyMember(dao) {
        require(
            proposals[address(dao)][proposalId].id == proposalId,
            "proposal does not exist"
        );
        dao.sponsorProposal(proposalId, msg.sender, data);
    }

    function processProposal(DaoRegistry dao, uint256 proposalId)
        external
        override
        onlyMember(dao)
    {
        require(
            proposals[address(dao)][proposalId].id == proposalId,
            "proposal does not exist"
        );

        IVoting votingContract = IVoting(dao.getAdapterAddress(VOTING));
        require(
            votingContract.voteResult(dao, proposalId) == 2,
            "proposal need to pass"
        );
        ProposalDetails storage proposal = proposals[address(dao)][proposalId];

        dao.mintSharesToMember(proposal.applicant, proposal.sharesRequested);

        // address 0 represents native ETH
        dao.addToGuild(ETH_TOKEN, proposal.amount);
        dao.processProposal(proposalId);
    }
}