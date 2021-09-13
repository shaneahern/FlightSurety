import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';


let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);

let oracles = [];

let STATUS_CODE_UNKNOWN = 0;
let STATUS_CODE_ON_TIME = 10;
let STATUS_CODE_LATE_AIRLINE = 20;
let STATUS_CODE_LATE_WEATHER = 30;
let STATUS_CODE_LATE_TECHNICAL = 40;
let STATUS_CODE_LATE_OTHER = 50;

let STATUS_CODES = [
  STATUS_CODE_UNKNOWN,
  STATUS_CODE_ON_TIME,
  STATUS_CODE_LATE_AIRLINE,
  STATUS_CODE_LATE_WEATHER,
  STATUS_CODE_LATE_TECHNICAL,
  STATUS_CODE_LATE_OTHER,
];


// Upon startup, 20+ oracles are registered and their assigned indexes are persisted in memory
web3.eth.getAccounts().then((returnedAddresses) => {
  web3.eth.defaultAccount = returnedAddresses[0];
  for(let i=20; i < 40; i++) {
    console.log(returnedAddresses[i]);
    registerOracle(returnedAddresses[i]);
  }
});

flightSuretyApp.events.OracleRequest({
    fromBlock: 'latest',
  }, function (error, event) {
    if (error) console.log(error)
    console.log("OracleRequest event:", event);
    const flight = {
      index: Number(event.returnValues.index),
      airline: event.returnValues.airline,
      flight: event.returnValues.flight,
      timestamp: event.returnValues.timestamp,
    };
    submitOracleResponsesForRequest(flight);
});

function getFlightStatus() {
  let randIndex = Math.floor(Math.random() * STATUS_CODES.length)
  return STATUS_CODES[randIndex];
}

// Server will loop through all registered oracles, identify those oracles for which
// the OracleRequest event applies, and respond by calling into FlightSuretyApp contract
// with random status code of Unknown (0), On Time (10) or Late Airline (20), Late Weather (30),
// Late Technical (40), or Late Other (50)
function submitOracleResponsesForRequest(flight) {
  oracles.forEach(oracle => {
    let indexes = oracle.indexes.map(Number);
    if (indexes.indexOf(flight.index) >= 0) {
      let status = getFlightStatus();
      console.log("submit status", flight.airline, flight.flight, flight.timestamp, status)
      flightSuretyApp.methods.submitOracleResponse(
        flight.index, flight.airline, flight.flight, flight.timestamp, status,
      )
      .send({from: oracle.address, gas: 500000})
      .then((r) => console.log("submitOracleResponse success"))
      .catch(e => console.log("submitOracleResponse error", e));
    }
  });
}

function registerOracle(oracleAddress) {
  flightSuretyApp.methods.registerOracle().estimateGas(
    {from: oracleAddress, value: web3.utils.toWei("1", "ether")}
  ).then(
    gasAmount => {
      flightSuretyApp.methods.registerOracle().send(
        {from: oracleAddress, gas: gasAmount, value: web3.utils.toWei("1", "ether")}
      ).then((r) => {
        flightSuretyApp.methods.getMyIndexes().call(
          {from: r.from}
        ).then((indexes) => {
          console.log("oracle registered", r.from, indexes);
          oracles.push({
            "address": oracleAddress,
            "indexes": indexes,
          });
        });
      });
    }
  )
}
  
const app = express();
app.get('/api', (req, res) => {
      res.send({
        message: 'An API for use with your Dapp!'
      })
})

export default app;


