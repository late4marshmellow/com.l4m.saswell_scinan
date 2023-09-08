//API V2 Error codes
const ERROR_CODES = {
    "0": "Success",
    "1": "Password Incorrect Multiple Times",  
    "10002": "Need Token",  
    "10003": "Token Expired",  
    "20007": "Password Incorrect",  
    "20014": "User Does Not Exist"
    
};
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

const LIST_URL = 'https://api.scinan.com/v1.0/devices/list';
const AUTHORIZATION_URL = 'https://api.scinan.com/oauth2/authorize';
const CONTROL_URL = 'https://api.scinan.com/v1.0/sensors/control';
const LIST_URL_V2 = 'http://api.saswell.com.cn/v2.0/device/list';
const AUTHORIZATION_URL_V2 = 'http://api.saswell.com.cn/v2.0/user/login';
const CONTROL_URL_V2 = 'http://api.saswell.com.cn/v2.0/sensor/control';
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
  LIST_URL_V2,
  AUTHORIZATION_URL_V2,
  CONTROL_URL_V2,
  REDIRECT_URI,
  USER_AGENT,
  CLIENT_ID,
  COMPANY_ID,
  APP_KEY,
  API_VERSION,
  ERROR_CODES
}