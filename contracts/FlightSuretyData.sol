// SPDX-License-Identifier: MIT
pragma solidity >=0.4.24;

// import "../node_modules/openzeppelin-solidity/contracts/utils/math/SafeMath.sol";

contract FlightSuretyData {
    // using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational;                                    // Blocks all state changes throughout the contract if false

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    // address[]  airlines;
    uint numAirlines = 0;
    struct Airline {    
        address airlineAddress;
        uint funding; // in wei, min 10eth
    }
    mapping(address => Airline) private airlines;


    struct Flight {    
        address airline;
        string flightId;
        uint256 timestamp;  
        uint passengersSize;
    }
    mapping(string => Flight) private flights;

    mapping(bytes32 => address[]) private flightPassengers;

    struct Passenger {    
        address passengerAddress;
        string flightId;
        uint256 insuranceValue; 
        uint256 payoutCredit;   
    }
    mapping(address => Passenger) private passengers;

    struct PassengerTest {    
        string flightId;
        uint256 insuranceValue; 
        uint256 payoutCredit;   
    }
    mapping(string => PassengerTest) private passengersTest;



    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor(address firstAirlineAddress, address owner)
    {
        // contractOwner = msg.sender;
        contractOwner = owner;
        operational = false;
        airlines[firstAirlineAddress] = Airline(firstAirlineAddress, 0);
        numAirlines++;
    }

    function setContractOwner(address owner) public
    {
        contractOwner = owner;
    }

    function getContractOwner() public view returns(address)
    {
        return contractOwner;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner(address sender)
    {
        // require(msg.sender == contractOwner, "msg.sender != contractOwner");
        require(sender == contractOwner, "msg.sender != contractOwner");
        _;
    }

    modifier requireAirlineRegistered(address airlineAddress) 
    {
        Airline storage airline = airlines[airlineAddress];
        require(airline.airlineAddress != address(0), "Airline not registered");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    modifier requireAirlinesRegistered(address[] calldata airlineAddresses) 
    {
        for (uint i=0; i < airlineAddresses.length; i++) {
            Airline storage airline = airlines[airlineAddresses[i]];
            require(airline.airlineAddress != address(0),  "Airline not registered");
        }
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    modifier requireMinimumConsensus(address[] calldata airlineAddresses) 
    {
        if (numAirlines < 4) {
            require(airlineAddresses.length > 0, "Minimum consesus not met");
        } else {
            require(airlineAddresses.length >= numAirlines/2, "Minimum consesus not met");
        }
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    modifier requireMinimumFunding(address airlineAddress)
    {
        require(airlines[airlineAddress].funding >= 10 ether, "Airline not at minimum funding");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() 
                            public 
                            view 
                            returns(bool) 
    {
        return operational;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus
                            (
                                bool mode,
                                address sender
                            ) 
                            external
                            requireContractOwner(sender)
    {
        operational = mode;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function registerAirline(
        address[] calldata approvingAirlines,
        address newAirline
    ) 
        external 
        requireAirlinesRegistered(approvingAirlines)
        requireMinimumConsensus(approvingAirlines)
    {
        airlines[newAirline] = Airline(newAirline, 0);
        numAirlines++;
    }

    function getAirline(address airlineAddress) 
        external
        view
        requireAirlineRegistered(airlineAddress)
        returns(Airline memory)
    {
        return airlines[airlineAddress];
    }

    function getValidAirline(address airlineAddress) 
        external
        view
        requireAirlineRegistered(airlineAddress)
        requireMinimumFunding(airlineAddress)
        returns(Airline memory)
    {
        return airlines[airlineAddress];
    }

   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy(
        address passenger,
        address airline,
        string memory flightId,
        uint256 timestamp,
        uint256 insuranceValue     
    )
        external
        requireIsOperational() 
        returns(bytes32)
    {
        bytes32 flightKey = getFlightKey(airline, flightId, timestamp);
        passengers[passenger].passengerAddress = passenger;
        passengers[passenger].flightId = flightId;
        passengers[passenger].insuranceValue = insuranceValue;
        passengers[passenger].payoutCredit = 0;
        flightPassengers[flightKey].push(passenger);

        Flight storage flight = flights[flightId];
        flight.passengersSize++;
        return flightKey;
    }


    function getFlightPassengers(
        address airline,
        string memory flightId,
        uint256 timestamp
    )
        public
        view
        requireIsOperational() 
        returns(address[] memory)
    {
        bytes32 flightKey = getFlightKey(airline, flightId, timestamp);
        return flightPassengers[flightKey];
    }


    function getPassenger(
        address passenger
    )
        public
        view
        requireIsOperational() 
        returns(Passenger memory)
    {
        return passengers[passenger];
    }

    function getInsuranceValueForPassenger(address passenger)
        external
        view
        returns(uint256)
    {
        
        Passenger storage p = passengers[passenger];
        return p.insuranceValue;
    }

    function getPayoutCreditForPassenger(address passenger)
        external
        view
        returns(uint256)
    {
        Passenger storage p = passengers[passenger];
        return p.payoutCredit;
    }


    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees(
        address airline,
        string memory flightId,
        uint256 timestamp
    )
        external
    {
        bytes32 flightKey = getFlightKey(airline, flightId, timestamp);
        address[] memory passengersForFlight = flightPassengers[flightKey];
        for (uint i=0; i < passengersForFlight.length; i++) {
            Passenger storage p = passengers[passengersForFlight[i]];
            p.payoutCredit = p.insuranceValue + (p.insuranceValue / 2);
        }
    }
    
    function getBalanceDue(address passenger) public view returns(uint256) {
        Passenger storage p = passengers[passenger];
        if (p.passengerAddress == passenger && p.payoutCredit > 0) {
            return p.payoutCredit;
        }
        return 0;
    }


    bool locked = false;

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay(
        address payable passenger
    )
         public payable
    {
        // require(msg.sender == contractOwner);
        require(!locked, "Reentrant call detected!");
        locked = true;
        Passenger storage p = passengers[passenger];
        if (p.passengerAddress == passenger && p.payoutCredit > 0) {
            uint256 payoutCredit = p.payoutCredit;
            p.payoutCredit = 0;
            passenger.transfer(payoutCredit);
        }
        locked = false;
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */   
    function fund(address airlineAddress, uint funding)
        public
        payable
        requireAirlineRegistered(airlineAddress)
    {
        Airline storage airline = airlines[airlineAddress];
        airline.funding = funding;
    }

   /**
    * @dev Register a future flight for insuring.
    *
    */  
    function registerFlight(
        address airline,
        string calldata flightId,
        uint256 timestamp     
    )
        external
        requireIsOperational()
        requireAirlineRegistered(airline)
        requireMinimumFunding(airline)
    {
        // bytes32 flightKey = getFlightKey(airline, flightId, timestamp);
        Flight storage flight = flights[flightId];
        flight.airline = airline;
        flight.flightId = flightId;
        flight.timestamp = timestamp;
        flight.passengersSize = 0;
    }

    function flightExists(string calldata flightId) public view returns(bool)
    {
        return flights[flightId].airline != address(0);
    }

    function getFlight(string calldata flightId) public view returns(Flight memory)
    {
        return flights[flightId];
    }

    function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

}

