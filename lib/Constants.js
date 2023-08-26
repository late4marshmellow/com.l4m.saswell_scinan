const MODES = {
  COMFORT: 'comfort',
  AUTO: 'auto',
  DAY_OR_NIGHT: 'day_or_night',
};

const SENSORS = {
  ON_OFF: '01',
  TARGET_TEMPERATURE: '02',
  AWAY: '03',
  MODE: '12',
};

// 60w / m2
const ENERGY_USAGE = 60;

const LIST_URL = 'http://api.saswell.com.cn/v2.0/device/list';
const AUTHORIZATION_URL = 'http://api.saswell.com.cn/v2.0/user/login';
const CONTROL_URL = 'http://api.saswell.com.cn/v2.0/sensor/control';
const REDIRECT_URI = 'http://localhost.com:8080/testCallBack.action';
const USER_AGENT = 'Thermostat/3.1.0 (iPhone; iOS 11.3; Scale/3.00)';
const CLIENT_ID = '100002';
const COMPANY_ID = '1038';
const APP_KEY = '100027';
const API_VERSION = 'v2';

module.exports = {
  MODES,
  SENSORS,  
  ENERGY_USAGE,
  LIST_URL,
  AUTHORIZATION_URL,
  CONTROL_URL,
  REDIRECT_URI,
  USER_AGENT,
  CLIENT_ID,
  COMPANY_ID,
  APP_KEY,
  API_VERSION
}