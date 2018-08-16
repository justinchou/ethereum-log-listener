const Logger       = require('bearcatjs-logger');
const logger     = Logger.getLogger();

function mockBlock(num) {
  const blockNumber = num ? num : Math.round(Math.random() * 2695852);
  logger.debug("BlockNumber #%s", blockNumber);

  return {
    "blockNumber" : blockNumber,
    "blockInfo" : {
      "uncles" : [ ],
      "difficulty" : 1,
      "extraData" : "0xd88301080c846765746888676f312e31302e33856c696e757800000000000000777dbba04cc020bd23da577c00f9bfb38ca65f779a0f922afb6cb7b737f6f7a516efcbeb138d453c9d70019ec0dbbdd91d30d9ec656c5567018fba30b8d57c5f00",
      "gasLimit" : 7793299,
      "gasUsed" : 2351267,
      "hash" : "0x726a93583f8eedda321a7094749b013bd7dd91fcef179fb87703c0e1fd62fb40",
      "logsBloom" : "0x00000000000000000000000020000000000001000000000000000000200000000000000000200000200000004002000000000000000000000000000000000000000000000000000000000000000000002001000000000000000000000000000000000000000000008000000000008000000000000000000000000000000000000000000000000000000000000000000000000001000000000002000000020000000020000000000000000000000000000000000000000000000000000000000000000010000000000008000200000000800010000000000000000000004000000000020080000000000000000000000000000000000000000040000000000000",
      "miner" : "0x0000000000000000000000000000000000000000",
      "mixHash" : "0x0000000000000000000000000000000000000000000000000000000000000000",
      "nonce" : "0x0000000000000000",
      "number" : blockNumber,
      "parentHash" : "0x89d8d6cc0a40224d0a4e00199259cf846105d4e6bfe0e72227b07b328d8c3356",
      "receiptsRoot" : "0xe7a79a70968a863011afdcd9d50b3ba2e5708629bb082f25825db3808f5bf02d",
      "sha3Uncles" : "0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347",
      "size" : 9518,
      "stateRoot" : "0x4f40bf0d852b8a2cc8affe772228a541a432c72aad860a59d31b36c49d7937b7",
      "timestamp" : 1532507884,
      "totalDifficulty" : 5099748,
      "transactions" : [
        {
          "blockHash" : "0x726a93583f8eedda321a7094749b013bd7dd91fcef179fb87703c0e1fd62fb40",
          "blockNumber" : blockNumber,
          "from" : "0x997a0700bfbaeb045e33b5bd36ffe92b46ce141c",
          "gas" : 4300000,
          "gasPrice" : 22000000000,
          "hash" : "0xc8e5681cc94a4c42358021287be4639dc60a6acfef51778f436e0d1201740fe1",
          "input" : "0x4ac0d66e0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000001057656c6c2068656c6c6f20616761696e00000000000000000000000000000000",
          "nonce" : 5,
          "r" : "0x4bd1ea155072a1ace7f8dd019a8918c93bed0ef423d5179b89d167dde73676cd",
          "s" : "0x11cc3d9d0636a32d2bfa2a915db0b5d251a6cc5db3095836c3c6b7406787b4ae",
          "to" : "0x36c2102e6a35a82e1b882f465235d0e39c8af020",
          "transactionIndex" : 0,
          "v" : "0x1b",
          "value" : 0
        },
        {
          "blockHash" : "0x726a93583f8eedda321a7094749b013bd7dd91fcef179fb87703c0e1fd62fb40",
          "blockNumber" : blockNumber,
          "from" : "0xa852dc0d236c26e5ae431838b6d6ae9639e437d4",
          "gas" : 7703295,
          "gasPrice" : 20000000000,
          "hash" : "0x34c8bb6b1d2b964cc0823585b454cb69075585e4158f17f197e5a6a1cfbb3ba2",
          "input" : "0x60806040526000600260006101000a81548173",
          "nonce" : 14,
          "r" : "0xad83b74d27a700d3bb05c7e3fdc3658c578d6ea1ef3a14a8e4b65b0d6ac071dc",
          "s" : "0x37eda7f7ed75efa169339d7c9db40f849065c3fde2890d198f35bfe7ad231cdd",
          "to" : null,
          "transactionIndex" : 1,
          "v" : "0x1b",
          "value" : 0
        },
        {
          "blockHash" : "0x726a93583f8eedda321a7094749b013bd7dd91fcef179fb87703c0e1fd62fb40",
          "blockNumber" : blockNumber,
          "from" : "0x372967130b1a7cd386348bc59de905e628e36f3a",
          "gas" : 4000000,
          "gasPrice" : 20000000000,
          "hash" : "0x854893ce754b5de6727e1dae9369038557edee93154d26e3037cc1bf88b0df46",
          "input" : "0xe20ccec3",
          "nonce" : 10038,
          "r" : "0x35777d753ea400b7f6805f4c9c4a3e9553068e65c5b10b03f701829e7abe92dc",
          "s" : "0x484ab60274cb88ce98da9d6055c1535a0eed107abee22f532d2fab3eaab0f5d4",
          "to" : "0x7290bb52ff687a4b221eddb33049d7d087e30be2",
          "transactionIndex" : 2,
          "v" : "0x2c",
          "value" : 0
        },
        {
          "blockHash" : "0x726a93583f8eedda321a7094749b013bd7dd91fcef179fb87703c0e1fd62fb40",
          "blockNumber" : blockNumber,
          "from" : "0xe844488207206b43fb0465315af7c082b0f4890a",
          "gas" : 150000,
          "gasPrice" : 10000000000,
          "hash" : "0xab3dc15c1a2337ea785b2b0dc86caf623bf6d8c976a28a99ef4ef6f28f8d036b",
          "input" : "0x994e5f740000000000000000000000000000000000000000000000000000000000000034",
          "nonce" : 114,
          "r" : "0x86f9a39136655b2d3fe5c038c47e7b6ee843c0e017a4da9de47d6af7042bea0e",
          "s" : "0x30dd8fc1945fa8f997db325cc07d4723a01b37875e4c175def438b445ec48658",
          "to" : "0xabb6c71bb5cd654c85a29ba9f4d67878b7116522",
          "transactionIndex" : 3,
          "v" : "0x2c",
          "value" : 0
        }
      ],
      "transactionsRoot" : "0xadd4762ca2ed7628fd9fa1adab0ebe0444c21fbc934f36a42c7dad03ddc881ee"
    },
  };
}

module.exports = mockBlock;


