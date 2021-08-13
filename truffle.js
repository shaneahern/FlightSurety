var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "hope basic inmate future blanket rice dawn digital soldier solar office wool";

module.exports = config => {
  config.node.process: true,
  networks: {
    development: {
      provider: function() {
        return new HDWalletProvider(mnemonic, "http://127.0.0.1:7545/", 0, 50);
      },
      network_id: '*'
    }
  },
  compilers: {
    solc: {
      version: ">=0.4.24"
    }
  }
}
};