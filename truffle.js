var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "script metal achieve input goddess jewel filter deal lion beach castle border ";

module.exports = {
  networks: {
    development: {
      provider: function() {
        return new HDWalletProvider(mnemonic, "wss://127.0.0.1:7545/", 0, 50);
      },
      network_id: '*'
    }
  },
  compilers: {
    solc: {
      version: "0.8", 
    }
  }
};