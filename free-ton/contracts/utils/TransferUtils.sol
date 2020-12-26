pragma solidity >= 0.6.0;
pragma AbiHeader expire;


contract TransferUtils {
    modifier transferAfter(address receiver, uint128 value) {
        _;
        receiver.transfer({ value: value });
    }
}