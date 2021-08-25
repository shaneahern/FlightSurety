
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


let operatingStatus = false;

let STATUS_CODES = {
    0: "STATUS_CODE_UNKNOWN",
    10: "STATUS_CODE_ON_TIME",
    20: "STATUS_CODE_LATE_AIRLINE",
    30: "STATUS_CODE_LATE_WEATHER",
    40: "STATUS_CODE_LATE_TECHNICAL",
    50: "STATUS_CODE_LATE_OTHER",
};


(async() => {

    let result = null;

    let contract = new Contract('localhost', () => {

        operatingStatus = checkOperatingStatus(contract);

        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('flight-number').value;
            // Write transaction
            contract.fetchFlightStatus(flight, (error, result) => {
                displayOracles('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
            });
        })

        DOM.elid('response-oracle').addEventListener('click', () => {
            let flight = DOM.elid('flight-number').value;
            contract.checkOracleResponse(flight, (result) => {
                var resultStr = "None";
                if (result) {
                    resultStr = result.flight + ' ' + result.timestamp + ' ' + STATUS_CODES[result.status];
                }
                displayOracleResponse('Oracle Response', 'FlightStatusInfo event', [ { label: 'Oracle Response:', value: resultStr } ]);
            });
        })

        DOM.elid('submit-buy').addEventListener('click', () => {
            let flight = DOM.elid('flight-number-buy').value;
            // Write transaction
            console.log(contract);
            contract.buyInsurance(flight, (error, result) => {
                console.log("error", error);
                console.log("result", result);
                displayPurchase('Buy', 'Buy Insurance', [ { label: 'Buy Insurance Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
            });
        })

        // User-submitted transaction
        DOM.elid('toggle-operating-status').addEventListener('click', () => {
            console.log("setOperatingStatus", !operatingStatus)
            contract.setOperatingStatus(!operatingStatus, (error, result) => {     
                checkOperatingStatus(contract);
            });
        })
    
    });
    

})();

function checkOperatingStatus(contract) {
    // Read transaction
    contract.isOperational((error, result) => {
        console.log("isOperational", error, typeof(result), result.toString());
        if (error) {
            console.log("isOperational error", error);
        }
        displayStatus('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        operatingStatus = result;
    });
}

function displayPurchase(title, description, results) {
    display("purchase-display-wrapper", title, description, results);
}

function displayStatus(title, description, results) {
    display("status-display-wrapper", title, description, results);
}

function displayOracles(title, description, results) {
    display("oracles-display-wrapper", title, description, results);
}

function displayOracleResponse(title, description, results) {
    display("oracles-response-wrapper", title, description, results);
}


function display(section_id, title, description, results) {
    let displayDiv = DOM.elid(section_id);
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.replaceChildren(section);

}







