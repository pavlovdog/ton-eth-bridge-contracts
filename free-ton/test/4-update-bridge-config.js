const logger = require('mocha-logger');
const { expect } = require('chai');
const freeton = require('ton-testing-suite');
const _ = require('underscore');
const utils = require('./utils');


let Bridge;


const tonWrapper = new freeton.TonWrapper({
  network: process.env.TON_NETWORK,
  seed: process.env.TON_SEED,
});

const relaysManager = new utils.RelaysManager(
  parseInt(process.env.RELAYS_AMOUNT),
  tonWrapper,
);


const newBridgeConfiguration = {
  bridgeUpdateRequiredConfirmations: 2,
  bridgeUpdateRequiredRejects: 3,
  active: true,
  nonce: 2,
};


describe('Test Bridge configuration update', async function() {
  this.timeout(12000000);

  before(async function() {
    await tonWrapper.setup();
    await relaysManager.setup();

    Bridge = await freeton
      .requireContract(tonWrapper, 'Bridge');
    await Bridge.loadMigration();

    logger.log(`Bridge address: ${Bridge.address}`);
  });

  describe('Reject Bridge configuration update', async function() {
    it('Initial check', async () => {
      const {
        confirmRelays,
        rejectRelays,
      } = await Bridge.runLocal('getBridgeConfigurationVotes', {
        _bridgeConfiguration: newBridgeConfiguration
      });

      expect(confirmRelays).to.have.lengthOf(0, 'Non-empty confirmations');
      expect(rejectRelays).to.have.lengthOf(0, 'Non-empty rejects');
    });

    it('Confirm not enough times', async function() {
      const {
        bridgeUpdateRequiredConfirmations,
      } = await Bridge.runLocal('getDetails');

      for (const keyId of _.range(bridgeUpdateRequiredConfirmations.toNumber() - 1)) {
        await relaysManager.runTarget({
          contract: Bridge,
          method: 'updateBridgeConfiguration',
          input: {
            _bridgeConfiguration: newBridgeConfiguration,
            _vote: {
              signature: freeton.utils.stringToBytesArray('123'),
            },
          }
        }, keyId);
      }

      const {
        confirmRelays,
        rejectRelays,
      } = await Bridge.runLocal('getBridgeConfigurationVotes', {
        _bridgeConfiguration: newBridgeConfiguration
      });

      expect(confirmRelays).to.have.lengthOf(
        bridgeUpdateRequiredConfirmations.toNumber() - 1,
        'Non-empty confirmations'
      );
      expect(rejectRelays).to.have.lengthOf(0, 'Non-empty rejects');
    });

    it('Reject enough times', async function() {
      const bridgeConfiguration = await Bridge.runLocal('getDetails');

      for (const keyId of _.range(bridgeConfiguration.bridgeUpdateRequiredRejects.toNumber())) {
        await relaysManager.runTarget({
          contract: Bridge,
          method: 'updateBridgeConfiguration',
          input: {
            _bridgeConfiguration: newBridgeConfiguration,
            _vote: {
              signature: freeton.utils.stringToBytesArray(''),
            },
          },
        }, keyId);
      }

      const {
        confirmRelays,
        rejectRelays,
      } = await Bridge.runLocal('getBridgeConfigurationVotes', {
        _bridgeConfiguration: newBridgeConfiguration
      });

      expect(confirmRelays).to.have.lengthOf(0, 'Non-empty confirmations');
      expect(rejectRelays).to.have.lengthOf(0, 'Non-empty rejects');

      const _bridgeConfiguration = await Bridge.runLocal('getDetails');

      expect(bridgeConfiguration).to.deep.equal(_bridgeConfiguration, 'Bridge configuration changed');
    });
  });

  describe('Confirm Bridge configuration update', async function() {
    it('Confirm enough times', async function() {
      const bridgeConfiguration = await Bridge.runLocal('getDetails');

      for (const keyId of _.range(bridgeConfiguration.bridgeUpdateRequiredConfirmations.toNumber())) {
        await relaysManager.runTarget({
          contract: Bridge,
          method: 'updateBridgeConfiguration',
          input: {
            _bridgeConfiguration: newBridgeConfiguration,
            _vote: {
              signature: freeton.utils.stringToBytesArray('123'),
            },
          }
        }, keyId);
      }

      const {
        confirmRelays,
        rejectRelays,
      } = await Bridge.runLocal('getBridgeConfigurationVotes', {
        _bridgeConfiguration: newBridgeConfiguration
      });

      expect(confirmRelays).to.have.lengthOf(0, 'Non-empty confirmations');
      expect(rejectRelays).to.have.lengthOf(0, 'Non-empty rejects');

      const _bridgeConfiguration = await Bridge.runLocal('getDetails');

      expect(bridgeConfiguration).to.not.deep.equal(_bridgeConfiguration, 'Bridge configuration not changed');
      expect(_bridgeConfiguration.bridgeUpdateRequiredRejects.toNumber())
        .to
        .equal(newBridgeConfiguration.bridgeUpdateRequiredRejects, 'Wrong new configuration');
    });
  });
});
