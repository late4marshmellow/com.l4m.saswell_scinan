'use strict';
const Homey = require('homey');
const fetch = require('node-fetch');
const { getTimestamp, getStatus, createMD5HashForSign, macToImei } = require('./Utils');
const { LIST_URL_V2, CONTROL_URL_V2, MODES, SENSORS, ENERGY_USAGE, APP_KEY, COMPANY_ID}  = require('./Constants');
const IMEI = macToImei();

class SaswellDevice extends Homey.Device {
  async onInit() {
    this.token = this.homey.settings.get('token');
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
    const { device, token } = this;
    this.log(`${this.getName()} - Refresh device - ID: ${device.id}`);
    const timestamp = getTimestamp();
    const params_list = {
      app_key: APP_KEY,
      company_id: COMPANY_ID,
      imei: IMEI,
      timestamp: timestamp,
      token: token,
    };
  
    // Generate the sign using the utility function from Utils.js
    const sign = createMD5HashForSign(params_list);
    params_list.sign = sign;
  
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
        redirect: 'follow',
      };
  
      const response = await fetch(LIST_URL_V2, requestOptions_list);
      if (response.ok) {
        const result = await response.json();
        if (result.result_code === '10003') {
          this.log('Token expired.');
          throw new Error('Token expired. Please re-authenticate.');
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
          this.setUnavailable();
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
      } else {
        this.log('Error response:', response);
        throw new Error('Error response from API');
      }
    } catch (error) {
      this.log(error);
      throw new Error(error);
    }
  }
  

  async updateCapabilityValues(capability, value) {
    const { device, token } = this;
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
          control_data = JSON.stringify({ value: value.toFixed(1) });
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
        imei: IMEI,
        sensor_id: sensor_id,
        sensor_type: 1,
        timestamp: timestamp,
        token: token,
      };
      console.log('params_con:', JSON.stringify(params_con));

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
        return result;
      } else {
        this.log('Error response:', response);
        throw new Error('Error response from API');
      }
    } catch (error) {
      this.log(error);
      throw new Error(error);
    }
  }
  
  async onCapabilityOnOff(value) {
    try {
      //await this.setCapabilityValue('onoff', value);
      this.updateCapabilityValues('onoff', value);
    } catch (error) {
      this.log(error);
      throw new Error(error);
    }
  }



  async onCapabilitySetTemperature(value) {
    try {
      //await this.setCapabilityValue('target_temperature', value);
      this.updateCapabilityValues('target_temperature', value);
    } catch (error) {
      this.log(error);
      throw new Error(error);
    }
  }

  async onCapabilitySetMode(value) {
    try {
      //await this.setCapabilityValue('mode', value);
      this.updateCapabilityValues('mode', value);
    } catch (error) {
      this.log(error);
      throw new Error(error);
    }
  }

  async onCapabilitySetAway(value) {
    try {
      //await this.setCapabilityValue('away', value);
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

module.exports = SaswellDevice;
