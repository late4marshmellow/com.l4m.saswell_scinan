'use strict';

const SaswellDriverV2 = require('../../lib/SaswellDriverV2.js');

class PST50WDriver extends SaswellDriverV2 {
    static APIVersion = "1";
}

module.exports = PST50WDriver;
