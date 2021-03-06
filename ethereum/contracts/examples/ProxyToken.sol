pragma solidity ^0.6.2;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./../libraries/UniversalERC20.sol";
import "./../interfaces/IBridge.sol";
import "./../interfaces/IProxy.sol";
import "../utils/RedButton.sol";


/*
    This is an example of Ethereum Proxy contract, which allows to implement
    token transfers between Ethereum and TON with Broxus bridge.
    Each ProxyToken corresponds to a single token contract.
    Token has an admin, which can do whatever he want.
*/
contract ProxyToken is IProxy, RedButton {
    using UniversalERC20 for IERC20;

    struct Fee {
        uint128 numerator;
        uint128 denominator;
    }

    struct Configuration {
        address token;
        address bridge;
        bool active;
        uint16 requiredConfirmations;
        Fee fee;
    }

    Configuration public configuration;

    /*
        Calculate the fee amount
        @dev Fee takes when calling broxusBridgeCallback
        @param amount Input amount of tokens
        @return Fee amount
    */
    function getFeeAmount(uint128 amount) public view returns(uint128) {
        return configuration.fee.numerator * amount / configuration.fee.denominator;
    }

    constructor(
        Configuration memory _configuration,
        address _admin
    ) public {
        _setConfiguration(_configuration);
        setAdmin(_admin);
    }

    function _setConfiguration(
        Configuration memory _configuration
    ) internal {
        configuration = _configuration;
    }

    /*
        Update proxy configuration
        @dev Only admin may call
    */
    function setConfiguration(
        Configuration memory _configuration
    ) public onlyAdmin {
        _setConfiguration(_configuration);
    }

    event TokenLock(uint128 amount, int8 wid, uint256 addr, uint256 pubkey);
    event TokenUnlock(uint128 amount, address addr);

    modifier onlyActive() {
        require(configuration.active, 'Configuration not active');
        _;
    }

    /*
        Lock tokens. Emit event that leads to the token minting on TON
        @param amount AMount of tokens to lock
        @param wid Workchain id of the receiver TON address
        @param addr Body of the receiver TON address
        @param pubkey TON pubkey, alternative way to receive
    */
    function lockTokens(
        uint128 amount,
        int8 wid,
        uint256 addr,
        uint256 pubkey
    ) public onlyActive {
        require(
            IERC20(configuration.token).allowance(
                msg.sender,
                address(this)
            ) >= amount,
            "Allowance insufficient"
        );

        // Transfer tokens from user to the
        IERC20(configuration.token).universalTransferFrom(
            msg.sender,
            address(this),
            amount
        );

        emit TokenLock(amount, wid, addr, pubkey);
    }

    /*
        Unlock tokens from the bridge
        @param payload Bytes encoded TONEvent structure
        @param signatures List of payload signatures
    */
    function broxusBridgeCallback(
        bytes memory payload,
        bytes[] memory signatures
    ) public onlyActive {
        require(
            IBridge(configuration.bridge).countRelaysSignatures(
                payload,
                signatures
            ) >= configuration.requiredConfirmations,
            'Not enough relays signed'
        );

        (TONEvent memory _event) = abi.decode(
            payload,
            (TONEvent)
        );

        (uint128 amount, bytes memory addr_bytes) = abi.decode(
            _event.eventData,
            (uint128, bytes)
        );

        address addr = bytesToAddress(addr_bytes);

        uint128 fee = getFeeAmount(amount);

        IERC20(configuration.token).universalTransfer(addr, amount - fee);

        emit TokenUnlock(amount - fee, addr);
    }

    function bytesToAddress(
        bytes memory bys
    ) private pure returns (address) {
        address addr;
        assembly {
            addr := div(mload(add(bys, 0x20)), 0x1000000000000000000000000)
        }
        return addr;
    }
}
