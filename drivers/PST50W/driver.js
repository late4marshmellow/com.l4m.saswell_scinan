'use strict';

const ScinanDriver = require('../../lib/ScinanDriver.js');

class PST50WDriver extends ScinanDriver {
    static APIVersion = "1";
}

module.exports = PST50WDriver;
