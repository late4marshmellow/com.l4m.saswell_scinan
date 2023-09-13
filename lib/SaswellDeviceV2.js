'use strict';
const Homey = require('homey');
const fetch = require('node-fetch');
const { getTimestamp, getStatus, createMD5HashForSign, sendNotification } = require('./Utils');
const { ERROR_CODES, LIST_URL, CONTROL_URL, LIST_URL_V2, CONTROL_URL_V2, USER_AGENT, MODES, SENSORS, ENERGY_USAGE, APP_KEY, COMPANY_ID } = require('./Constants');

class SaswellDeviceV2 extends Homey.Device {
  async onInit() {
    this.IMEI = this.homey.settings.get('macToImeiMD5');
    const driverClass = this.driver.constructor;
    console.log(driverClass);
    if (driverClass.driverName === 'SASWELL_THERMOSTAT') {
      await this.setSettings({ apiVersion: "2" });
    }

    this.tokenv2 = this.homey.settings.get('tokenv2');
    this.tokenv1 = this.homey.settings.get('tokenv1');
    this.device = this.getData();
    this.summary = {
      interval: this.getSettings().interval,
    };
    const { device } = this;
    this.log(`[${this.getName()}]`, `Connected to device - ID: ${device.id}`);
    this.registerCapabilityListener('onoff', this.onCapabilityOnOff.bind(this));
    this.registerCapabilityListener('target_temperature', this.onCapabilitySetTemperature.bind(this));
    this.registerCapabilityListener('mode', this.onCapabilitySetMode.bind(this));
    this.registerCapabilityListener('away', this.onCapabilitySetAway.bind(this));
    this.getDeviceData();
    this.setUpdateInterval();
    this.homey.settings.set(`comerr: ${device.id}`, false);
    this.log(this.homey.settings.get(`comerr: ${device.id}`));
    this.homey.settings.set(`expToken: ${device.id}`, false);
    this.log(this.homey.settings.get(`expToken: ${device.id}`));
  }
 

  setUpdateInterval() {
    const updateInterval = this.getUpdateInterval();
    console.log(`Creating update interval with ${updateInterval}`);
    this.interval = setInterval(async () => {
      await this.getDeviceData();
    }, updateInterval);
  }

  getUpdateInterval() {
    return Number(this.summary.interval) * 1000 * 60;
  }

  async getDeviceData() {
    let data =this.getData(); 
    if (data && data.id && this.homey && this.homey.settings && this.homey.settings.get(`${data.id} need repair`) === true) {
      if (this.getAvailable() === true){this.setUnavailable('Device unavailable, need repair')};  
      return;
      
    }
    const apiVersion = await this.getSetting('apiVersion');
    if (apiVersion === "2") {
      const { device, token } = this;
      this.log(`${this.getName()} - Refresh device - ID: ${device.id}`);

      try {
        const result = JSON.parse(this.homey.settings.get('last APIv2 result'));
          // Continue with your logic...
      

          this.log('Device result' + result)
          //if result_code is anything else than 0 make device unavailable
          if (!(result.result_code === "0")) { //ERROR_CODES.hasOwnProperty(result.result_code)) {
            this.log(ERROR_CODES[result.result_code]);
            switch (result.result_code) {
              //expired token
              case '10003':
              if (this.homey.settings.get(`expToken: ${this.getData().id}`) === false) {
              await sendNotification(this.homey, `Your token for device ${this.getName()} has expired. Please re-authenticate!`);
              this.homey.settings.set(`expToken: ${this.getData().id}`, true);
            };
            this.homey.settings.set(`${this.getData().id} need repair`, true)
            this.setUnavailable(`Your token for device ${this.getName()} has expired. Please re-authenticate!`)
            return;
              //missing token
                case '10002':
                  this.homey.settings.set(`${this.getData().id} need repair`, true)
                  this.setUnavailable(`Your token for device ${this.getName()} is missing. Please re-authenticate!`);
                  return;
              //password incorrect
              case '20007':
                this.homey.settings.set(`${this.getData().id} need repair`, true)
                this.setUnavailable(`Your password for device ${this.getName()} is incorrect. Please re-authenticate!`)

                return;
              //user does not exist
              case '20014':
                this.homey.settings.set(`${this.getData().id} need repair`, true)
                this.setUnavailable(`Your username for device ${this.getName()} does not exist. Please re-authenticate!`)

                return;
              //password incorrect multiple times
              case '1':
                this.homey.settings.set(`${this.getData().id} need repair`, true)
                this.setUnavailable(`Your password for device ${this.getName()} has been incorrect for 5 times. Please re-authenticate!`)

                return;
                case '404':
                  this.setUnavailable(`404 - ${LIST_URL_V2} Not Found`);
                  const allSettings = this.homey.settings.getKeys();
                  allSettings.forEach(key => {
                    if (key.endsWith(' need repair') && this.homey.settings.get(key) === true) {
                      this.homey.settings.set(key, false);
                    }
                  });

  
                  return;
              default:
              //this is the default if none of the cases has a match...  
              this.homey.settings.set(`${this.getData().id} need repair`, true)
              this.log(ERROR_CODES[result.result_code]);
              this.setUnavailable(ERROR_CODES[result.result_code]);
                return;
            }
            
          }

          const currentDevice = result.result_data[0].devices.find(dev => dev.id === device.id);
          if (!currentDevice) {
            this.log('Device not found.');
            throw new Error('Device not found.');
          }

          const { online } = currentDevice;
          if (online == "1") {
            this.setAvailable();
          } else {
            this.setUnavailable('Device is offline');
          }

          const status = getStatus(currentDevice.s00);

          const measure_power = status.onoff ? ENERGY_USAGE * Number(this.getSetting('m2')) : 0;
          this.setCapabilityValue('target_temperature', status.target_temperature).catch(this.error);
          this.setCapabilityValue('measure_temperature', status.measure_temperature).catch(this.error);
          this.setCapabilityValue('onoff', status.onoff).catch(this.error);
          this.setCapabilityValue('mode', this.valueToMode(status.mode)).catch(this.error);
          this.setCapabilityValue('away', status.away).catch(this.error);
          if (this.hasCapability('measure_power') && typeof measure_power === 'number') {
            this.setCapabilityValue('measure_power', measure_power).catch(this.error);
          }

          return;
        } 
       catch (error) {
        this.log(error);
        this.homey.settings.set(`API call fail: ${this.getData().id}`, true);
        if (this.homey.settings.get(`API call fail: ${this.getData().id}`, true)){
        this.setUnavailable('API call failed');
      }
        //throw new Error(error);
      }
    } else {

      const { device, token } = this;
      this.log(`${this.getName()} - Refresh device - ID: ${device.id}`);
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
          const currentDevice = result.find(devices => {
            return devices.id === device.id;
          });
          // this.log(currentDevice);

          const { online } = currentDevice;
          if (online == 1) {
            this.setAvailable();
          } else {
            this.setUnavailable('Device is offline');
          }

          const status = getStatus(currentDevice.status);

          const measure_power = status.onoff ? ENERGY_USAGE * Number(this.getSetting('m2')) : 0;
          // this.log(`device uses ${measure_power}W`);
          this.setCapabilityValue('target_temperature', status.target_temperature).catch(this.error);
          this.setCapabilityValue('measure_temperature', status.measure_temperature).catch(this.error);
          this.setCapabilityValue('onoff', status.onoff).catch(this.error);
          this.setCapabilityValue('mode', this.valueToMode(status.mode)).catch(this.error);
          this.setCapabilityValue('away', status.away).catch(this.error);
          // calculate power
          if (this.hasCapability('measure_power') && typeof measure_power === 'number') {
            this.setCapabilityValue('measure_power', measure_power).catch(this.error);
          }
//if (this.homey.setting.get((`comerr: ${this.getData().id}`) === true))
          return;
        }
      } catch (error) {
        this.log(error);
        if (error.message.includes('getaddrinfo ENOTFOUND api.scinan.com')) {
          if (this.getAvailable()) {
          await sendNotification(this.homey, 
            `Your Scinan device ${this.getName()} have issues. Please Check Homey community forum for more info!`);
          this.setUnavailable('Please check Homey community forum for info **https://community.homey.app/t/app-pro-scinan-and-saswell-climate-control/88393**');
          this.homey.settings.set(`${this.getData().id} need repair`, true);
        }}else{
          this.setUnavailable();
          this.homey.settings.set(`${this.getData().id} need repair`, true);
        }
        throw new Error('Error: ' + error + ", Device available?: " + this.getAvailable());
      }


    }

    }

  async updateCapabilityValues(capability, value) {
    const { device, token } = this;
    const apiVersion = await this.getSetting('apiVersion');
    if (apiVersion === "2") {
      try {
      let sensor_id = '';
      let control_data = {};
      console.log(capability, this.getCapabilityValue(capability));

      switch (capability) {
        case 'onoff':
          
          sensor_id = SENSORS.ON_OFF;
          control_data = JSON.stringify({ value: value ? '1' : '0' });
          console.log('control_data:', control_data);

          break;
        case 'target_temperature':
          sensor_id = SENSORS.TARGET_TEMPERATURE;
          control_data = JSON.stringify({ value: (value.toFixed(1)).padStart(4, '0') });
          console.log('control_data:', control_data);

          break;
        case 'mode':
          sensor_id = SENSORS.MODE;
          control_data = JSON.stringify({ value: this.modeToValue(value).toString() });
          console.log('control_data:', control_data);

          break;
        case 'away':
          sensor_id = SENSORS.AWAY;
          control_data = JSON.stringify({ value: value ? '1' : '0' });
          console.log('control_data:', control_data);

          break;
      }
  
      const timestamp = getTimestamp();
      const params_con = {
        app_key: APP_KEY,
        company_id: COMPANY_ID,
        control_data: control_data,
        device_id: device.id,
        imei: this.IMEI,
        sensor_id: sensor_id,
        sensor_type: 1,
        timestamp: timestamp,
        token: this.tokenv2,
      };
      const sign = createMD5HashForSign(params_con);
      params_con.sign = sign;
  
      let urlencoded_con = new URLSearchParams();
      for (let [key, value] of Object.entries(params_con)) {
        urlencoded_con.append(key, value);
      }
      urlencoded_con.append("sign", sign);
  
      let requestOptions_con = {
        method: 'POST',
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: urlencoded_con,
        redirect: 'follow',
      };

      const response = await fetch(CONTROL_URL_V2, requestOptions_con);
      if (response.ok) {
        const result = await response.json();
        this.log(result);
        if (['away', 'mode', 'onoff'].includes(capability)) {
          await this.getDeviceData();
        }
        return result;
      } else {
        this.log('Error response:', response);
        throw new Error('Error response from API');
      }
    } catch (error) {
      this.log(error);
      throw new Error(error);
    }
  }else{
      const { device, token } = this;
      try {
        let sensor_id = '';
        let control_data = {};
  
        switch (capability) {
          case 'onoff':
            sensor_id = SENSORS.ON_OFF;
            control_data = `{%22value%22:%22${this.getCapabilityValue('onoff') === true ? '1' : '0'}%22}`;
            break;
          case 'target_temperature':
            sensor_id = SENSORS.TARGET_TEMPERATURE;
            control_data = `{%22value%22:%22${this.getCapabilityValue('target_temperature').toFixed(1).toString().padStart(4, '0')}%22}`;
            break;
          case 'mode':
            sensor_id = SENSORS.MODE;
            control_data = `{%22value%22:%22${this.modeToValue(this.getCapabilityValue('mode'))}%22}`;
            break;
          case 'away':
            sensor_id = SENSORS.AWAY;
            control_data = `{%22value%22:%22${this.getCapabilityValue('away') === true ? '1' : '0'}%22}`;
            break;
        }
  
        const timestamp = getTimestamp(new Date());
  
        const response = await fetch(
          `${CONTROL_URL}?control_data=${control_data}&device_id=${device.id}&format=json&sensor_id=${sensor_id}&sensor_type=1&timestamp=${timestamp}&token=${this.tokenv1}`,
          {
            method: 'POST',
            headers: {
              'User-Agent': USER_AGENT,
            },
          },
        );
  
        if (response.ok) {
          const result = await response.json();
          this.log(result);
          return result;
        }
      } catch (error) {
        this.log(error);
        throw new Error(error);
      }
      
  }
  }
  async onCapabilityOnOff(value) {
    try {
      this.updateCapabilityValues('onoff', value);
    } catch (error) {
      this.log(error);
      throw new Error(error);
    }
  }



  async onCapabilitySetTemperature(value) {
    try {
      this.updateCapabilityValues('target_temperature', value);
    } catch (error) {
      this.log(error);
      throw new Error(error);
    }
  }

  async onCapabilitySetMode(value) {
    try {
      this.updateCapabilityValues('mode', value);
    } catch (error) {
      this.log(error);
      throw new Error(error);
    }
  }

  async onCapabilitySetAway(value) {
    try {
      this.updateCapabilityValues('away', value);
    } catch (error) {
      this.log(error);
      throw new Error(error);
    }
  }

  modeToValue(value) {
    let mode;
    if (value === MODES.COMFORT) {
      mode = 0;
    } else if (value === MODES.AUTO) {
      mode = 1;
    } else if (value === MODES.DAY_OR_NIGHT) {
      mode = 2;
    }
    return mode;
  }
  valueToMode(mode) {
    let value;
    if (mode === 0) {
      value = MODES.COMFORT;
    } else if (mode === 1) {
      value = MODES.AUTO;
    } else if (mode === 2) {
      value = MODES.DAY_OR_NIGHT;
    }
    return value;
  }

  onAdded() {
    this.log('device added');
    this.log('name:', this.getName());
    this.log('class:', this.getClass());
    this.log('data', this.getData());
    // Retrieve the API version from the settings
    const APIVersion = this.homey.settings.get(`APIVersion_${this.getData().id}`);

    try {
        this.setSettings({ APIVersion: APIVersion });
        this.log('APIVersion set in settings');
    } catch (err) {
        this.error('Error setting APIVersion in settings:', err);
    }
}

  onRenamed(name) {
    this.log(`${name} renamed`);
    // await this.updateName();
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (changedKeys.includes('interval')) {
      console.log(`Delete old interval ${oldSettings.interval} and creating new ${newSettings.interval}`);
      this.summary.interval = newSettings.interval;
      this.setUpdateInterval();
    }
  }
  
  onDeleted() {
    const { interval } = this;
    this.log(`${this.name} deleted`);
    clearInterval(interval);
  }
}


module.exports = SaswellDeviceV2;

