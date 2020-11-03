// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;


/**
    @notice Basic example of the Event contract
    @dev Emits StateChange(uint,address) event each time someone calls the setState method
**/
contract EventContractExample {
    uint public currentState = 0;

    event StateChange(
        uint state,
        address author
    );

    function setState(uint newState) public {
        currentState = newState;

        emit StateChange(newState, msg.sender);
    }
}
