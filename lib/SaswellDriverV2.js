'use strict';
const Homey = require('homey');
const fetch = require('node-fetch');
const { getTimestamp, getStatus, createMD5Hash, createMD5HashForSign } = require('./Utils');
const { AUTHORIZATION_URL, LIST_URL, AUTHORIZATION_URL_V2, LIST_URL_V2, USER_AGENT, CLIENT_ID, REDIRECT_URI, COMPANY_ID, APP_KEY } = require('./Constants');
//const { APIVersion } = require('../drivers/SASWELL_THERMOSTAT/driver');

    class SaswellDriverV2 extends Homey.Driver {
        onInit() {
            this.IMEI = this.homey.settings.get('macToImeiMD5');
            //this.log("tokenv1: ", this.homey.settings.get('tokenv1'));
            //this.log("tokenv2: ", this.homey.settings.get('tokenv2'));

        }
        
        
      async onPair(session) {
        const { username, password } = this.retrieveCredentials();
    
        if (username && password) {
            // Both username and password are set, so skip the login dialog
            session.setHandler('login', async () => true); // Bypass login by always returning true
        } else {
            // Either username or password is not set, so show the login dialog
            session.setHandler('login', async data => {
                if (!data.username || !data.password) return 'Username and password are required';
                await this.getToken(data.username, data.password);
                return true;
            });
        }
    
        session.setHandler('list_devices', async () => {
            return await this.getDevices();
        });
    }
    
    retrieveCredentials() {
        let username, password;
    
        if (this.constructor.APIVersion === "1") {
            username = this.homey.settings.get('usernamev1');
            password = this.homey.settings.get('passwordv1');
        } else {
            username = this.homey.settings.get('usernamev2');
            password = this.homey.settings.get('passwordv2');
        }
    
        return { username, password };
    }
    
      async onRepair(session, device) {
        let deviceId = device.device.id;
        this.log('Initiating repair...');
        session.setHandler('login', async data => {
          if (data.username === '' || data.password === '') return false; //'Username and password are required';
          await this.getToken(data.username, data.password);
          this.log('Successfully logged in using API v2');
          const allSettings = this.homey.settings.getKeys();

          allSettings.forEach(key => {
              // Check for expToken at the start of the key and reset if its value is true
              if (key.startsWith('expToken') && this.homey.settings.get(key) === true) {
                  this.homey.settings.set(key, false);
                  this.log('Resetting expToken setting: ' + key);
              }
          
              // Check for need repair at the end of the key and reset if its value is true
              if (key.endsWith(' need repair') && this.homey.settings.get(key) === true) {
                  this.homey.settings.set(key, false);
                  this.log('Resetting need repair setting: ' + key);
              }
          });
          
            
            //this.homey.settings.set(`${deviceId} need repair`, false)
            this.homey.settings.set('APIv2 result_code <> 0', false);
            this.log('result code <> 0 setting: ' + this.homey.settings.get('APIv2 result_code <> 0'));
          return true;
        });

      }      
      async getToken(username, password) {
        try {
            this.log('Trying to get token using API v2...');
            const token = await this.getTokenV2(username, password);
            //this.constructor.APIVersion = "2";
            this.homey.settings.set('tokenv2', token);
            this.homey.settings.set('usernamev2', username);
            this.homey.settings.set('passwordv2', password);
            const md5Password = createMD5Hash(password);
            this.homey.settings.set('md5Password', md5Password);

            return token;
        } catch (error) {
            this.log('Failed to get token using API v2:', error);
        }
    
        try {
            const token = await this.getTokenV1(username, password);
            //this.constructor.APIVersion = "1";
            this.homey.settings.set('tokenv1', token);
            this.homey.settings.set('usernamev1', username);
            this.homey.settings.set('passwordv1', password);
            return token;
        } catch (error) {
            this.log('Failed to get token using API v1:', error);
        }
    
        throw new Error('Failed to get token using both API versions');
    }
    
    async getTokenV2(username, password) {
        const timestamp = getTimestamp();
        const md5Password = createMD5Hash(password);
        const params_auth = {
            account: username,
            app_key: APP_KEY,
            company_id: COMPANY_ID,
            imei: this.IMEI,
            password: md5Password,
            timestamp: timestamp,
        };
        const sign = createMD5HashForSign(params_auth);
        params_auth.sign = sign;
    
        let urlencoded_auth = new URLSearchParams();
        for (let [key, value] of Object.entries(params_auth)) {
            urlencoded_auth.append(key, value);
        }
    
        const requestOptions_auth = {
            method: 'POST',
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": USER_AGENT,
            },
            body: urlencoded_auth,
            redirect: 'follow',
        };
    
        const response = await fetch(AUTHORIZATION_URL_V2, requestOptions_auth);
        if (!response.ok) {
            throw new Error(`Failed to get token:  ${response.statusText}`);
        }
    
        const contentType = response.headers.get("content-type");
        let token;
    
        if (contentType && contentType.includes("application/json")) {
            // Handle JSON response
            const data = await response.json();
           //this.log(data)
            token = data.resultData.access_token;
        } else {
            // Handle HTML response
            const html = await response.text();
            const start = html.indexOf('token:');
            const end = html.indexOf('\r', start);
            token = html.substring(start + 6, end);
        }
        return token;
    }
    
    async getTokenV1(username, password) {
        const urlencoded = new URLSearchParams();
        urlencoded.append("client_id", CLIENT_ID);
        urlencoded.append("passwd", password);
        urlencoded.append("redirect_uri", REDIRECT_URI);
        urlencoded.append("response_type", "token");
        urlencoded.append("userId", username);
    
        const requestOptions = {
            method: 'POST',
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": USER_AGENT,
            },
            body: urlencoded,
            redirect: 'follow',
        };
    
        const response = await fetch(AUTHORIZATION_URL, requestOptions);
    
        if (!response.ok) {
            throw new Error('no_token');
        }
    
        const html = await response.text();
        const start = html.indexOf('token:');
        const end = html.indexOf('\r', start);
        const token = html.substring(start + 6, end);
    
        return token;
    }
                    
                  async getDevices() {
                    const token = (this.constructor.APIVersion === "1") ? this.homey.settings.get('tokenv1') : this.homey.settings.get('tokenv2');
                    let timestamp = getTimestamp();
                    const params_list = {
                        app_key: APP_KEY,
                        company_id: COMPANY_ID,
                        imei: this.IMEI,
                        timestamp: timestamp,
                        token: token
                    };
                
                    // Generate the sign using the utility function from Utils.js
                    const sign = createMD5HashForSign(params_list);
                
                    // Add the sign to the request parameters
                    params_list.sign = sign;
                    //console.log("Fetching devices using v2...");
                    try {
                        if (this.constructor.APIVersion === "2") {

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
                                          const deviceData = {
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
                                          };
                                          //const existingDevice = this.getDevices(deviceData.data.id);
                                          //if (!existingDevice) {
                                              devices.push(deviceData);
                                               // Save the API version for the device
                                              this.homey.settings.set(`APIVersion_${device.id}`, "2");
                                          //}
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
                  }else{
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
                
                          const deviceData = {
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
                          };
                          //const existingDevice = this.getDevice(deviceData.data.id);
                         // if (!existingDevice) {
                            devices.push(deviceData);
                            
                            // Save the API version for the device
                            this.homey.settings.set(`APIVersion_${device.id}`, "1");
                          //}
                        });
                        return devices;
                      }
                      
                }
                
            } catch (error) {
                      this.log(error);
                      throw new Error(error);
                    }
                }

                
     
    
                }

    module.exports = SaswellDriverV2;