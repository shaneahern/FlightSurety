import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {

    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress, config.dataAddress);
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
        

        this.ts101 = new Date(2021, 12, 24, 10, 30);
        this.ts102 = new Date(2021, 12, 24, 11, 30);
        this.ts103 = new Date(2021, 12, 24, 12, 30);
        this.ts201 = new Date(2021, 12, 26, 10, 30);
        this.ts202 = new Date(2021, 12, 26, 11, 30);
        this.ts203 = new Date(2021, 12, 26, 12, 30);
        
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


            // Update flight status requests from client Dapp result in OracleRequest event emitted 
            // by Smart Contract that is captured by server (displays on console and handled in code)
            this.flightSuretyApp.events.FlightStatusInfo(options)
                .on('data', event => {
                    console.log("FlightStatusInfo Event: ", event);
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
            
            let counter = 1;
            // 5 airlines
            while(this.airlines.length < 5) {
                this.airlines.push(accts[counter++]);
            }

            // 5 passengers
            while(this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }
            var select = document.getElementById("selectPassenger");
            this.createSelectMenu(this.passengers, "selectPassenger" );

            // First airline is registered when contract is deployed.
            this.setOperatingStatus(true, () => this.fundFirstAirline(this.airlines[0]));

            callback();
        });
    }

    getFlights() {
        return this.flights;
    }

    fundFirstAirline(airlineAddress) {
        this.flightSuretyData.methods.getAirline(airlineAddress)
        .call({ from: self.owner})
        .then(firstAirline => {
            var minFunding = "10";
            console.log("firstAirline", firstAirline.airlineAddress, "funding =", this.web3.utils.fromWei(firstAirline.funding), "ETH");
            if (firstAirline.funding < this.web3.utils.toWei(minFunding, "ether")) {
                this.flightSuretyApp.methods
                .fund(firstAirline.airlineAddress)
                .send({from: firstAirline.airlineAddress, gas: 999999, value: this.web3.utils.toWei(minFunding, "ether")})
                .then(result => {
                    console.log("first airline funded, registering flights");
                    this.registerFlights(firstAirline.airlineAddress);
                });
            } else {
                this.registerFlights(firstAirline.airlineAddress);
            }
        });
    }

    registerFlights(airline) {
        this.flightSuretyApp.methods
        .registerFlight(airline, "101", this.ts101.getTime())
        .call({ from: self.owner})
        .then(result => {
            console.log("registerFlight", airline, "101", this.ts101.getTime());
            this.flights[101] = {airline: airline, flight: "101", timestamp: this.ts101.getTime(), status: 0};
        });
        this.flightSuretyApp.methods
        .registerFlight(airline, "102", this.ts102.getTime())
        .call({ from: self.owner})
        .then(result => {
            console.log("registerFlight", airline, "102", this.ts102.getTime());
            this.flights[102] = {airline: airline, flight: "102", timestamp: this.ts102.getTime(), status: 0};
        });
        this.flightSuretyApp.methods
        .registerFlight(airline, "103",this.ts103.getTime())
        .call({ from: self.owner})
        .then(result => {
            console.log("registerFlight", airline, "103", this.ts103.getTime());
            this.flights[103] = {airline: airline, flight: "103", timestamp: this.ts103.getTime(), status: 0};
        }).then(result => {
            let flightIds =  Object.keys(this.flights);
            this.createSelectMenu(flightIds, "selectFlight" );
        });
    }

    createSelectMenu(options, elementId) {
        var select = document.getElementById(elementId);
            for(var i = 0; i < options.length; i++) {
                var opt = options[i];
                var el = document.createElement("option");
                el.textContent = opt;
                el.value = opt;
                select.appendChild(el);
            }
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

    fetchFlightStatus(airline, flight, timestamp, callback) {
        let self = this;
        this.oracleResponses = {};
        console.log("fetchFlightStatus for ", airline, flight, timestamp)
        self.flightSuretyApp.methods
            .fetchFlightStatus(airline, flight, timestamp)
            .send({ from: self.owner}, (error, result) => {
                let payload = {
                    airline: airline,
                    flight: flight,
                    timestamp: timestamp,
                };
                callback(error, payload);
            });
    }

    checkOracleResponse(flight, callback) {
        console.log(this.oracleResponses)
        callback(this.oracleResponses[flight]);
    }


    getPassengerInsuranceValue(passenger, callback) {
        let self = this;
        console.log(".getPassenger(passenger)", passenger);
        self.flightSuretyData.methods
            .getPassenger(passenger)
            .call({ from: self.owner}, (error, result) => {
                console.log(result);
                callback(error, result);
            });
    }

    // Passengers may pay up to 1 ether for purchasing flight insurance.
    buyInsurance(passenger, airline, flightId, timestamp, insuranceAmount, callback) {
        console.log("passenger", passenger, "value", this.web3.utils.toWei(insuranceAmount, "ether"));
        this.flightSuretyApp.methods.buy(
            passenger,
            airline,
            flightId,
            timestamp,
        ).send({from: passenger, gas: 5000000, value: this.web3.utils.toWei(insuranceAmount, "ether")},
        ).then(
            txResult => this.web3.eth.getTransaction(txResult.tx).then(
                tx => console.log(tx),
            ),
        );
    }


    // Passengers may pay up to 1 ether for purchasing flight insurance.
    withdrawCredit(passenger, callback) {
        let self = this;
        console.log(this.flightSuretyApp.methods);
        this.flightSuretyApp.methods.getBalanceDue(passenger)
        .call({ from: self.owner}).then(
            balanceDue =>
                self.flightSuretyApp.methods.pay(passenger)
                .send({from: self.owner, value: balanceDue.toString(10)}).then(
                    txResult => this.web3.eth.getTransaction(txResult.tx).then(
                        tx => console.log(tx),
                    ),
                ),
        );
    }
}