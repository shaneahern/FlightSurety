// const ConvertLib = artifacts.require("truffle migrate --reset");
// const MetaCoin = artifacts.require("MetaCoin");

// module.exports = function(deployer) {
// //   deployer.deploy(ConvertLib);
// //   deployer.link(ConvertLib, MetaCoin);
// //   deployer.deploy(MetaCoin);
// };

const fs = require('fs');
const flightSuretyApp = artifacts.require("FlightSuretyApp");
const flightSuretyData = artifacts.require("FlightSuretyData");

// module.exports = function(deployer){
//   deployer.deploy(flightSuretyData).then(() =>
//     deployer.deploy(flightSuretyApp, flightSuretyData.address),
//   );
// }

module.exports = function(deployer, network, accounts) {
    // let firstAirline = '0xf17f52151EbEF6C7334FAD080c5704D77216b732';
    let contractOwner = accounts[0];
    let firstAirline = accounts[1];
    deployer.deploy(flightSuretyData, firstAirline, contractOwner)
    .then(() => {
        return deployer.deploy(flightSuretyApp, flightSuretyData.address, contractOwner)
                .then(() => {
                    let config = {
                        localhost: {
                            url: 'http://localhost:7545',
                            contractOwner: contractOwner,
                            dataAddress: flightSuretyData.address,
                            appAddress: flightSuretyApp.address,
                            firstAirline: firstAirline,
                        }
                    }
                    fs.writeFileSync(__dirname + '/../src/dapp/config.json',JSON.stringify(config, null, '\t'), 'utf-8');
                    fs.writeFileSync(__dirname + '/../src/server/config.json',JSON.stringify(config, null, '\t'), 'utf-8');
                });
    })};
