const Logger       = require('bearcatjs-logger');
const logger     = Logger.getLogger();

const CHECK_BLOCKS = 6e3;
const FAKE_BLOCKS  = 1.6e3;
const RANDOM_BASE  = Math.round(Math.random() * CHECK_BLOCKS) + 2e7;
const dbBlocks = [];

function mockTxInfo() {
  const txHash = Math.floor(Math.random() * 8999999999) + 1000000000;

  return {
    "uber-trace-id": `${txHash}123123:0:${txHash}234234:0`,
    "txHash" : "0xb1689657b47def7d90a7c849dcc411a6f1aa24ee3a0de22f1f9576" + txHash,
    "method" : "prediction.participateDoubleSelectionTopic",
    "args" : {
      "id" : 498,
      "orderId" : "0x3062303837663336666535333431643562303866623361653163356635323861",
      "userId" : "0x37685a626852716a414a524651756d",
      "payment" : 10000000000000000000,
      "agree" : true,
      "quantity" : 14038651854646804000,
      "reasonHash" : "b6d767d2f8ed5d21a44b0e5886680cb9"
    },
    "raw" : {
      "router" : "actor",
      "op" : [
        {
          "col" : "User.spxBalance",
          "action" : "sub",
          "value" : 10,
          "done" : true
        },
        {
          "col" : "Topics.tokenPool",
          "action" : "add",
          "value" : 10,
          "done" : true
        }
      ],
      "method" : "prediction.participateDoubleSelectionTopic",
      "args" : {
        "id" : 498,
        "orderId" : "0x3062303837663336666535333431643562303866623361653163356635323861",
        "userId" : "0x37685a626852716a414a524651756d",
        "payment" : 10000000000000000000,
        "agree" : true,
        "quantity" : 14038651854646804000,
        "reasonHash" : "b6d767d2f8ed5d21a44b0e5886680cb9"
      }
    },
    "returnRaw" : {
      "jsonrpc" : "2.0",
      "id" : "28916b31-1a81-4c2d-8bb4-aab071d74184",
      "error" : {
        "code" : 1002,
        "message" : "gas required exceeds allowance or always failing transaction"
      }
    }
  }
}

module.exports = mockTxInfo;


