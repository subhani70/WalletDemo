// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

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

    function identityOwner(address identity) public view returns(address) {
        address owner = owners[identity];
        if (owner != address(0)) {
            return owner;
        }
        return identity;
    }

    function changeOwner(address identity, address newOwner) public onlyOwner(identity) {
        owners[identity] = newOwner;
        emit DIDOwnerChanged(identity, newOwner, changed[identity]);
        changed[identity] = block.number;
    }

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

    function validDelegate(
        address identity,
        bytes32 delegateType,
        address delegate
    ) public view returns(bool) {
        uint validity = delegates[identity][delegateType][delegate];
        return (validity > block.timestamp);
    }

    function setAttribute(
        address identity,
        bytes32 name,
        bytes memory value,
        uint validity
    ) public onlyOwner(identity) {
        emit DIDAttributeChanged(
            identity,
            name,
            value,
            block.timestamp + validity,
            changed[identity]
        );
        changed[identity] = block.number;
    }

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
}