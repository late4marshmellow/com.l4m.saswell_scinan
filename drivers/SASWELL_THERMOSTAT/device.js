'use strict';

const SaswellDeviceV2 = require('../../lib/SaswellDeviceV2.js');

class SASWELL_THERMOSTATDevice extends SaswellDeviceV2 {
    static APIVersion = "2";
}

module.exports = SASWELL_THERMOSTATDevice;
