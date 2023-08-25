'use strict';
const Homey = require('homey');
const fetch = require('node-fetch');
const { getTimestamp, getStatus, createMD5Hash, createMD5HashForSign, macToImei } = require('./Utils');
const { AUTHORIZATION_URL, LIST_URL, USER_AGENT, CLIENT_ID, REDIRECT_URI, COMPANY_ID, APP_KEY } = require('./Constants');


class ScinanDriver extends Homey.Driver {
  onInit() {}

  async getToken(account, password) {
    this.homey.settings.set('account', account);
    this.homey.settings.set('password', password);
    const md5Password = createMD5Hash(password);
    const timestamp = getTimestamp
    const IMEI = macToImei()
    const params = {
        account: account,
        app_key: APP_KEY,
        //area_code: AREA_CODE,
        company_id: COMPANY_ID,
        imei: IMEI,
        password: md5Password,
        timestamp: timestamp
    };

    // Generate the sign using the utility function from Utils.js
    const sign = createMD5HashForSign(params);

    // Add the sign to the request parameters
    params.sign = sign;
    try {
      
let urlencoded = new URLSearchParams();
urlencoded.append("account", account);     
urlencoded.append("app_key", CLIENT_ID);
urlencoded.append("company_id", COMPANY_ID);
urlencoded.append("imei", IMEI);
urlencoded.append("password", md5Password);
urlencoded.append("sign", sign);
urlencoded.append("timestamp", timestamp);

let requestOptions = {
  method: 'POST',
  headers: {
  "Content-Type": "application/x-www-form-urlencoded",
  "User-Agent": USER_AGENT
  },
  body: urlencoded,
  redirect: 'follow'
};		


    const response = await fetch(AUTHORIZATION_URL, requestOptions);
    if (response.ok) {
        const contentType = response.headers.get("content-type");
        let token;

        if (contentType && contentType.includes("application/json")) {
            // Handle JSON response
            const data = await response.json();
            token = data.resultData.access_token;
        } else {
            // Handle HTML response
            const html = await response.text();
            const start = html.indexOf('token:');
            const end = html.indexOf('\r', start);
            token = html.substring(start + 6, end);
        }

        this.homey.settings.set('token', token);
        return token;
    } else {
        this.log('Failed to get token');
        throw new Error('Failed to get token');
    }
    } catch (error) {
      this.log(error);
      throw new Error(error);
    }
  }

  async getDevices() {
    const token = this.homey.settings.get('token');
    const timestamp = getTimestamp(new Date());

    try {
      const response = await fetch(`${LIST_URL}?format=json&timestamp=${timestamp}&token=${token}`, {
        method: 'GET',
        headers: {
          'User-Agent': USER_AGENT,
        },
      });

      if (response.ok) {
        const result = await response.json();
        let devices = [];
        Array.from(result).forEach(device => {
          this.log(device);
          const status = getStatus(device.status);
          devices.push({
            name: device.title,
            data: {
              name: device.title,
              id: device.id,
              onoff: status.onoff,
              online: device.online,
              away: status.away,
              measure_temperature: status.measure_temperature,
              target_temperature: status.target_temperature,
              mode: status.mode,
              last_updated: status.time,
            },
          });
        });
        return devices;
      }
    } catch (error) {
      this.log(error);
      throw new Error(error);
    }
  }

  async onPair(session) {
    session.setHandler('login', async data => {
      if (data.account === '' || data.password === '') return null;
      await this.getToken(data.account, data.password);
      return true;
    });

    session.setHandler('list_devices', async data => {
      return await this.getDevices();
    });
  }
}

module.exports = ScinanDriver;
