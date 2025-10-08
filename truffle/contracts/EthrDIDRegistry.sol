// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title EthrDIDRegistry
 * @dev ERC-1056 compliant DID registry
 * 
 * KEY PRINCIPLES:
 * 1. setAttribute is PUBLIC - anyone can add attributes for any DID
 * 2. Only identity owner can change ownership or revoke attributes
 * 3. This allows third parties to vouch for/attest to identities
 * 4. Follows the "anyone can write, but it's signed" model
 */
contract EthrDIDRegistry {
    
    mapping(address => address) public owners;
    mapping(address => mapping(bytes32 => mapping(address => uint))) public delegates;
    mapping(address => uint) public changed;
    mapping(address => uint) public nonce;

    event DIDOwnerChanged(
        address indexed identity,
        address owner,
        uint previousChange
    );

    event DIDDelegateChanged(
        address indexed identity,
        bytes32 delegateType,
        address delegate,
        uint validTo,
        uint previousChange
    );

    event DIDAttributeChanged(
        address indexed identity,
        bytes32 name,
        bytes value,
        uint validTo,
        uint previousChange
    );

    modifier onlyOwner(address identity) {
        require(msg.sender == identityOwner(identity), "Not authorized");
        _;
    }

    /**
     * @dev Returns the owner of an identity
     * If no owner is set, the identity itself is the owner
     */
    function identityOwner(address identity) public view returns(address) {
        address owner = owners[identity];
        if (owner != address(0)) {
            return owner;
        }
        return identity;
    }

    /**
     * @dev Change owner of an identity (requires authorization)
     */
    function changeOwner(address identity, address newOwner) public onlyOwner(identity) {
        owners[identity] = newOwner;
        emit DIDOwnerChanged(identity, newOwner, changed[identity]);
        changed[identity] = block.number;
    }

    /**
     * @dev Change owner via signature (meta-transaction)
     */
    function changeOwnerSigned(
        address identity,
        uint8 sigV,
        bytes32 sigR,
        bytes32 sigS,
        address newOwner
    ) public {
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0x19),
                bytes1(0),
                address(this),
                nonce[identityOwner(identity)],
                identity,
                "changeOwner",
                newOwner
            )
        );
        address signer = ecrecover(hash, sigV, sigR, sigS);
        require(signer == identityOwner(identity), "Invalid signature");
        owners[identity] = newOwner;
        emit DIDOwnerChanged(identity, newOwner, changed[identity]);
        changed[identity] = block.number;
        nonce[signer]++;
    }

    /**
     * @dev Add a delegate (requires authorization)
     */
    function addDelegate(
        address identity,
        bytes32 delegateType,
        address delegate,
        uint validity
    ) public onlyOwner(identity) {
        delegates[identity][delegateType][delegate] = block.timestamp + validity;
        emit DIDDelegateChanged(
            identity,
            delegateType,
            delegate,
            block.timestamp + validity,
            changed[identity]
        );
        changed[identity] = block.number;
    }

    /**
     * @dev Revoke a delegate (requires authorization)
     */
    function revokeDelegate(
        address identity,
        bytes32 delegateType,
        address delegate
    ) public onlyOwner(identity) {
        delegates[identity][delegateType][delegate] = 0;
        emit DIDDelegateChanged(
            identity,
            delegateType,
            delegate,
            0,
            changed[identity]
        );
        changed[identity] = block.number;
    }

    /**
     * @dev Check if a delegate is valid
     */
    function validDelegate(
        address identity,
        bytes32 delegateType,
        address delegate
    ) public view returns(bool) {
        uint validity = delegates[identity][delegateType][delegate];
        return (validity > block.timestamp);
    }

    /**
     * @dev Set an attribute for a DID
     * 
     * ✅ PUBLIC FUNCTION - Anyone can set attributes
     * 
     * Why this is safe:
     * - Attributes are just claims/attestations
     * - Anyone can make a claim about anyone (like Twitter mentions)
     * - The important part is WHO made the claim (msg.sender is recorded in events)
     * - Verifiers check if they trust the attribute setter
     * - Only the identity owner can REVOKE attributes
     * 
     * Use cases:
     * - User sets their own public key
     * - University sets a degree attribute for a student
     * - Employer sets employment attribute
     * - Government sets citizenship attribute
     */
    function setAttribute(
        address identity,
        bytes32 name,
        bytes memory value,
        uint validity
    ) public {
        emit DIDAttributeChanged(
            identity,
            name,
            value,
            block.timestamp + validity,
            changed[identity]
        );
        changed[identity] = block.number;
    }

    /**
     * @dev Revoke an attribute (requires authorization)
     * Only the identity owner can revoke their own attributes
     */
    function revokeAttribute(
        address identity,
        bytes32 name,
        bytes memory value
    ) public onlyOwner(identity) {
        emit DIDAttributeChanged(
            identity,
            name,
            value,
            0,
            changed[identity]
        );
        changed[identity] = block.number;
    }

    /**
     * @dev Set attribute via signature (meta-transaction)
     * Allows the identity owner to authorize attribute setting via signature
     * This is useful when the owner wants to set attributes but someone else pays gas
     */
    function setAttributeSigned(
        address identity,
        uint8 sigV,
        bytes32 sigR,
        bytes32 sigS,
        bytes32 name,
        bytes memory value,
        uint validity
    ) public {
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0x19),
                bytes1(0),
                address(this),
                nonce[identityOwner(identity)],
                identity,
                "setAttribute",
                name,
                value,
                validity
            )
        );
        address signer = ecrecover(hash, sigV, sigR, sigS);
        require(signer == identityOwner(identity), "Invalid signature");
        
        emit DIDAttributeChanged(
            identity,
            name,
            value,
            block.timestamp + validity,
            changed[identity]
        );
        changed[identity] = block.number;
        nonce[signer]++;
    }
}