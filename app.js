const Homey = require('homey');
const fetch = require('node-fetch');
const { macToImei, getTimestamp, createMD5Hash, createMD5HashForSign, tokenRepair, setMD5Password } = require('./lib/Utils');
const { ERROR_CODES, LIST_URL_V2, COMPANY_ID, APP_KEY , USER_AGENT_V2, AUTHORIZATION_URL_V2} = require('./lib/Constants');
const reauthState = { reauthTimeout: null };


class ScinanApp extends Homey.App {
  async onInit() {
    await tokenRepair(this.homey);
    await setMD5Password(this.homey);
    //this.api = await HomeyAPI.forCurrentHomey();
    //this.api.post('/hashPassword', this.onHashPassword.bind(this));

    if (!this.homey.settings.get('macToImeiMD5')) {
    this.log('starting mactoimei...');   
    const imei = await macToImei();
    this.log('set mactoimei...');   
    const imeiHash = await createMD5Hash(imei, true);
    this.log('set imeiHash...');
    this.homey.settings.set('macToImeiMD5', imeiHash);

  }
    //this.log("IMEI MD5 HASH: " + this.homey.settings.get('macToImeiMD5'));
    if (!this.homey.settings.get('u_interval')){this.homey.settings.set('u_interval', 15)}
    this.log('u_interval setting: ' + this.homey.settings.get('u_interval'));
    this.APIv2UpdateInterval();
    //this.log('intiate listner...')
    //this.log('refresh status' + this.homey.settings.get('RefreshDevices'));
    /*this.homey.settings.on('set', (key, value) => {
      if ((key === "APIv2 result_code <> 0" && value === false) || 
         (key === "RefreshDevices" && value === true)) {

        this.log('Running APIv2 after Event');
       this.APIv2();
    }
    });*/

    //this.log('listner intiated...')
    this.log('Successfully init Scinan version:', Homey.manifest.version);

  }

  //function for app settings
  async onHashPassword(body) {
    const password = body.password;
    const hashedPassword = await createMD5Hash(password);
    return { hashedPassword };
  }


  APIv2UpdateInterval() {
    this.APIv2();
    this.interval = setInterval(async () => {
        await this.APIv2();
      }, Number(this.homey.settings.get('u_interval')) * 60 * 1000); // 15 minutes
    }

 
  cleanup() {
      clearInterval(this.interval);

  }
  

  async APIv2() {
    if (this.homey.settings.get('lastTokenRefresh')){
      this.log('last token refresh: ' + this.homey.settings.get('lastTokenRefresh'))
    }
      if ((this.homey.settings.get('APIv2 result_code <> 0')) === true) {
          this.log('APIv2 result_code is <> 0 stopping API call');
          
        return;
      }

        const timestamp = getTimestamp();
        const params_list = {
          app_key: APP_KEY,
          company_id: COMPANY_ID,
          imei: this.homey.settings.get('macToImeiMD5'),
          timestamp: timestamp,
          token: this.homey.settings.get('tokenv2'),
        };
  
        const sign = await createMD5HashForSign(params_list);
        params_list.sign = sign;
  
        try {
          let urlencoded_list = new URLSearchParams();
          for (let [key, value] of Object.entries(params_list)) {
            urlencoded_list.append(key, value);
          }
          // this is added twice? | urlencoded_list.append("sign", sign);
  
          let requestOptions_list = {
            method: 'POST',
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "User-Agent": USER_AGENT_V2,
            },
            body: urlencoded_list,
            redirect: 'follow',
          };

          this.log('fetching updates')
          const response = await fetch(LIST_URL_V2, requestOptions_list);
          this.log('response status: ' + response.status);

          if (!response.ok) {
              this.log('Error response:', response);
              if (response.status === 404) {
                this.homey.settings.set('last APIv2 result', JSON.stringify({ result_code: "404", result_data: [] }));
                this.log("last apiv2 response 404: " + this.homey.settings.get('last APIv2 result'));
              }
             

              throw new Error('Error response from API');
            }

            //if (response.headers.get('content-type').includes('application/json')) {
                //this.log('setting response as json')
                const responseData = await response.json();
                this.homey.settings.set('last APIv2 result', responseData);
                
                if (!(responseData.result_code === "0")) {
                  this.log('result_code <> 0')
                  this.homey.settings.set('APIv2 result_code <> 0', true)
                    if (responseData.result_code === "10003") {  
                      this.log('result_code 10003 (expired token)')
                        // Reauthorize to get a new token
                        try {
                            await this.reauthorize();
                            this.homey.settings.set('APIv2 result_code <> 0', true)
                            return await this.APIv2();
                        } catch (error) {
                            console.error("Reauthorization failed", error);
                        }
                    }
                    
                }

            this.log("last apiv2 response: " + 'result_code: ' + responseData.result_code + ' - description: ' + ERROR_CODES[responseData.result_code]);
            return responseData;
                        
          }
          catch (error) {
              this.log(error);
              //throw new Error(error);
              
          }
      }

    
      
  async reauthorize() {
    this.log('reauthorizing')
      const username = this.homey.settings.get('usernamev2');
      const md5Password = this.homey.settings.get('md5Password');
      const timestamp = getTimestamp();
      const params_auth = {
          account: username,
          app_key: APP_KEY,
          company_id: COMPANY_ID,
          imei: this.IMEI,
          password: md5Password,
          timestamp: timestamp,
      };
      const sign = await createMD5HashForSign(params_auth);
      params_auth.sign = sign;
  
      let urlencoded_auth = new URLSearchParams();
      for (let [key, value] of Object.entries(params_auth)) {
          urlencoded_auth.append(key, value);
      }
      // this is added twice? | urlencoded_auth.append("sign", sign);

      const requestOptions_auth = {
          method: 'POST',
          headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "User-Agent": USER_AGENT_V2,
          },
          body: urlencoded_auth,
          redirect: 'follow',
      };
  
      const response = await fetch(AUTHORIZATION_URL_V2, requestOptions_auth);
      if (!response.ok) {
          throw new Error(`Failed to get token:  ${response.statusText}`);
      }
  
      let token;
      let data;
      let expiresIn;
      
      try {
          data = await response.json();
          if (data && data.resultData && data.resultData.access_token) {
              token = data.resultData.access_token;
              expiresIn = Number(data.resultData.expires_in);
          } else {
              // Handle HTML response
              const html = await response.text();
              const start = html.indexOf('token:');
              const end = html.indexOf('\r', start);
              token = html.substring(start + 6, end);
          }
      } catch (error) {
          console.error("Error processing the response:", error);
      }
    // Store the current time/date as the last token refresh time
    const currentTime = new Date().toISOString();
    this.homey.settings.set('lastTokenRefresh', currentTime);
    this.log('last token refresh: ' + this.homey.settings.get('lastTokenRefresh'))
    
    expiresIn = expiresIn || 1000 * 60 * 30;  // Default to 30 minutes
    this.log('expires in: ' + expiresIn + ' seconds')

    // Clear any existing timeout
    if (reauthState.reauthTimeout) {
      clearTimeout(reauthState.reauthTimeout);
    }

    // Set a new timeout to reauthorize 1 hour before the token expires
    reauthState.reauthTimeout = setTimeout(() => {
        this.reauthorize();
    }, (expiresIn - 3600) * 1000);  // Convert seconds to milliseconds

    this.log('reauthorize run sucessfully');
    this.homey.settings.set('tokenv2', token);
    //log the function name and token
    this.log('reauthorize: ' + this.homey.settings.get('tokenv2'));
      return token;
  }

    
    
    


}


module.exports = ScinanApp;
