// SPDX-License-Identifier: MIT
pragma solidity >=0.4.24;

// import "../node_modules/openzeppelin-solidity/contracts/utils/math/SafeMath.sol";

contract FlightSuretyData {
    // using SafeMath for uint256;

    event Refund(address payable passenger, uint refund);

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
        Passenger[] passengers;   
    }
    mapping(string => Flight) private flights;



    struct Passenger {    
        address passenger;
        string flightId;
        uint insuranceValue;
        uint payoutCredit;
    }
    // mapping(string => Passenger) private passengers;


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
        address payable passenger,
        string calldata flightId,
        uint insuranceValue
    )
        external
        payable
        requireIsOperational() 
    {
        Flight storage flight = flights[flightId];
        if (insuranceValue > 1 ether) {
            uint amountToReturn = insuranceValue - 1 ether;
            insuranceValue = 1 ether;
            passenger.transfer(amountToReturn);
            emit Refund(passenger, amountToReturn);
        }
        flight.passengers.push(Passenger(passenger, flightId, insuranceValue, 0));
    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees(string calldata flightId)
        external
    {
        Flight storage flight = flights[flightId];
        for (uint i=0; i < flight.passengers.length; i++) {
            Passenger storage p = flight.passengers[i];
            p.payoutCredit = p.insuranceValue + (p.insuranceValue / 2);
        }
    }
    

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay
                            (
                            )
                            external
                            pure
    {
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

