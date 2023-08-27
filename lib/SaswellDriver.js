'use strict';
const Homey = require('homey');
const fetch = require('node-fetch');
const { getTimestamp, getStatus, createMD5Hash, createMD5HashForSign, macToImei } = require('./Utils');
const { AUTHORIZATION_URL_V2, LIST_URL_V2, USER_AGENT, CLIENT_ID, REDIRECT_URI, COMPANY_ID, APP_KEY } = require('./Constants');
const IMEI = macToImei();

class SaswellDriver extends Homey.Driver {
  onInit() {}

  async getToken(username, password) {
    this.homey.settings.set('username', username);
    this.homey.settings.set('password', password);
    const md5Password = createMD5Hash(password);
    let timestamp = getTimestamp();
    const params_auth = {
        account: username,
        app_key: APP_KEY,
        company_id: COMPANY_ID,
        imei: IMEI,
        password: md5Password,
        timestamp: timestamp
    };

    // Generate the sign using the utility function from Utils.js
    const sign = createMD5HashForSign(params_auth);
    // Add the sign to the request parameters
    params_auth.sign = sign;
    try {
      
let urlencoded_auth = new URLSearchParams();
for (let [key, value] of Object.entries(params_auth)) {
  urlencoded_auth.append(key, value);
}
urlencoded_auth.append("sign", sign);

let requestOptions_auth= {
  method: 'POST',
  headers: {
  "Content-Type": "application/x-www-form-urlencoded",
  "User-Agent": USER_AGENT
  },
  body: urlencoded_auth,
  redirect: 'follow'
};		

console.log("Starting getToken function...");
    const response = await fetch(AUTHORIZATION_URL_V2, requestOptions_auth);
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
    let timestamp = getTimestamp();
    const IMEI = macToImei()
    const params_list = {
        app_key: APP_KEY,
        company_id: COMPANY_ID,
        imei: IMEI,
        timestamp: timestamp,
        token: token
    };

    // Generate the sign using the utility function from Utils.js
    const sign = createMD5HashForSign(params_list);

    // Add the sign to the request parameters
    params_list.sign = sign;
    console.log("Fetching devices using v2...");
    try {

      let urlencoded_list = new URLSearchParams();
      for (let [key, value] of Object.entries(params_list)) {
        urlencoded_list.append(key, value);
    }
      urlencoded_list.append("sign", sign);
      
      let requestOptions_list = {
      method: 'POST',
      headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      },
      body: urlencoded_list,
      redirect: 'follow'
      };		
      const response = await fetch(LIST_URL_V2, requestOptions_list);
         if (response.ok) {
          const result = await response.json();
          if (result.result_code === '10003') {
            console.log('Token expired.');
            throw new Error('Token expired. Please re-authenticate.');
        }      
          let devices = [];
          if (result.result_code === "0" && result.result_data && Array.isArray(result.result_data)) {
              result.result_data.forEach(data => {

                  if (data.devices && Array.isArray(data.devices)) {
                      data.devices.forEach(device => {
                          this.log(device);
                          const status = getStatus(device.s00);  
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
                                  last_updated: status.time,  // Adjust for v2?
                              },
                          });
                      });
                  }
              });
          }
          console.log("Returning devices:", devices);//
        return devices;
      }
      else {
        console.log('Error response:', response);//
        // ... rest of the error handling code
    }
    } catch (error) {
      this.log(error);
      throw new Error(error);
    }
}

  async onPair(session) {
    session.setHandler('login', async data => {
      if (data.username === '' || data.password === '') return null;
      await this.getToken(data.username, data.password);
      return true;
    });

    session.setHandler('list_devices', async data => {
      return await this.getDevices();
    });
  }
}

module.exports = SaswellDriver;
