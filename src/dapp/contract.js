import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';
import { first } from 'webpack/lib/util/SetHelpers';

export default class Contract {

    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress, config.dataAddress);
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
        
        console.log(config.dataAddress)
        this.initialize(callback);
        this.owner = config.contractOwner;
        this.airlines = [];
        this.passengers = [];
        this.flights = {};
        this.oracleResponses = {};
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {
           
            this.owner = accts[0];
            console.log(accts)

            let options = {
                filter: {
                    value: [],
                },
                fromBlock: 0
            };
            
            this.flightSuretyApp.events.FlightStatusInfo(options)
                .on('data', event => {
                    console.log("data", event);
                    let flight = event.returnValues.flight;
                    this.oracleResponses[flight] = {
                        airline: event.returnValues.airline,
                        flight: event.returnValues.flight,
                        timestamp: event.returnValues.timestamp,
                        status: event.returnValues.status,
                    };
                })
                .on('changed', changed => console.log(changed))
                .on('error', err => console.log("ERROR:", err))
                .on('connected', str => console.log(str))

            // this.flightSuretyApp.events.OracleReport(options)
            // .on('data', event => console.log(event))
            // .on('changed', changed => console.log(changed))
            // .on('error', err => console.log("ERROR:", err))
            // .on('connected', str => console.log(str))

            // this.flightSuretyApp.methods
            // .getDataContractAddress()
            // .call({ from: self.owner}, (e, r) => console.log("getDataContractAddress", e, r));

            // this.flightSuretyApp.methods
            // .getDataContract()
            // .call({ from: self.owner}, (e, r) => console.log("getDataContract", e, r));
            
            
            let counter = 1;
            // 5 airlines
            while(this.airlines.length < 5) {
                this.airlines.push(accts[counter++]);
            }

            // 5 passengers
            while(this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }

            this.setOperatingStatus(true, () => this.fundAirline(this.airlines[0]));

            callback();
        });
    }

    fundAirline(airline) {
        this.flightSuretyData.methods.getAirline(airline)
        .call({ from: self.owner})
        .then(firstAirline => {
            console.log("firstAirline", firstAirline.airlineAddress, "funding =", this.web3.utils.fromWei(firstAirline.funding), "ETH");
            if (firstAirline.funding < this.web3.utils.toWei("10", "ether")) {
                this.flightSuretyApp.methods
                .fund(firstAirline.airlineAddress)
                .send({from: firstAirline.airlineAddress, value: this.web3.utils.toWei("10", "ether")})
                .then(result => {
                    console.log("first airline funded, registering flights");
                    this.registerFlights(airline);
                });
            } else {
                this.registerFlights(airline);
            }
        });
    }

    registerFlights(airline) {
        var ts = Date.now();
        this.flightSuretyApp.methods
        .registerFlight(airline, "101", ts)
        .call({ from: self.owner})
        .then(result => {
            console.log("registerFlight", airline, "101", ts);
            this.flights[101] = {airline: airline, flight: "101", timestamp: ts, status: 0};
        });
        ts = Date.now();
        this.flightSuretyApp.methods
        .registerFlight(airline, "102", Date.now())
        .call({ from: self.owner})
        .then(result => {
            console.log("registerFlight", airline, "102", ts);
            this.flights[102] = {airline: airline, flight: "102", timestamp: ts, status: 0};
        });
        ts = Date.now();
        this.flightSuretyApp.methods
        .registerFlight(airline, "103", Date.now())
        .call({ from: self.owner})
        .then(result => {
            console.log("registerFlight", airline, "103", ts);
            this.flights[103] = {airline: airline, flight: "103", timestamp: ts, status: 0};
        });
    }

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

    setOperatingStatus(status, callback) {
        let self = this;
        self.flightSuretyApp.methods
             .setOperatingStatus(status, this.owner)
             .send({ from: self.owner}, callback);
     }

    fetchFlightStatus(flight, callback) {
        let self = this;
        // let payload = {
        //     airline: self.firstAirlineAddress,
        //     flight: flight,
        //     timestamp: Math.floor(Date.now() / 1000)
        // } 
        let payload = this.flights[flight];
        console.log("fetchFlightStatus for ", payload)
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner}, (error, result) => {
                callback(error, payload);
            });
    }

    checkOracleResponse(flight, callback) {
        console.log(this.oracleResponses)
        callback(this.oracleResponses[flight]);
    }

    buyInsurance(flight, callback) {
        let self = this;
        // let payload = {
        //     airline: self.airlines[0],
        //     flight: flight,
        //     timestamp: Math.floor(Date.now() / 1000)
        // } 
        let payload = this.flights[flight];
        let passenger = this.passengers[0];
        self.flightSuretyApp.methods
            .buyInsurance(passenger, payload.flight)
            .send({ from: self.owner}, (error, result) => {
                callback(error, payload);
            });
    }
}