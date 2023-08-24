module.exports.MODES = {
  COMFORT: 'comfort',
  AUTO: 'auto',
  DAY_OR_NIGHT: 'day_or_night',
};

module.exports.SENSORS = {
  ON_OFF: '01',
  TARGET_TEMPERATURE: '02',
  AWAY: '03',
  MODE: '12',
};

// 60w / m2
module.exports.ENERGY_USAGE = 60;

module.exports.LIST_URL = 'http://api.saswell.com.cn/v2.0/device/list';
module.exports.AUTHORIZATION_URL = 'http://api.saswell.com.cn/v2.0/user/login';
module.exports.CONTROL_URL = 'http://api.saswell.com.cn/v2.0/sensor/control';
module.exports.REDIRECT_URI = 'http://localhost.com:8080/testCallBack.action';
module.exports.USER_AGENT = 'Thermostat/3.1.0 (iPhone; iOS 11.3; Scale/3.00)';
module.exports.CLIENT_ID = '100002';
module.exports.IMEI = '357014732382494';
module.exports.COMPANY_ID = '1038';
module.exports.APP_KEY = '100027';
