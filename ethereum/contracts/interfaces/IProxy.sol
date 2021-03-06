pragma solidity ^0.6.2;
pragma experimental ABIEncoderV2;


interface IProxy {
    struct TONEvent {
        uint eventTransaction;
        uint64 eventTransactionLt;
        uint32 eventTimestamp;
        uint32 eventIndex;
        bytes eventData;
        int8 tonEventConfigurationWid;
        uint tonEventConfigurationAddress;
        uint16 requiredConfirmations;
        uint16 requiredRejects;
    }
}
