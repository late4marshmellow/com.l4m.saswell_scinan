const Homey = require('homey');
const { macToImei, createMD5Hash } = require('./lib/Utils')

class ScinanApp extends Homey.App {
  async onInit() {
    this.log('Successfully init Scinan version:', Homey.manifest.version);
    const imei = await macToImei();
    const imeiHash = createMD5Hash(imei, true);
    await this.homey.settings.set('macToImeiMD5', imeiHash);
    this.log("IMEI MD5 HASH:" + imeiHash);
  }
}

module.exports = ScinanApp;