'use strict';

const SaswellDriverV2 = require('../../lib/SaswellDriverV2.js');

class SASWELL_THERMOSTATDriver extends SaswellDriverV2 {
    static driverName = "SASWELL_THERMOSTAT";
}

module.exports = SASWELL_THERMOSTATDriver;
