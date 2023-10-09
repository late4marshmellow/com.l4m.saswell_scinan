const Homey = require('homey');
const crypto = require('crypto');


async function sendNotification(homey, message) {
    const notification = {
      excerpt: message,
    };
    await homey.notifications.createNotification(notification);
  }
  
// Decode the Base64 appSecret
const appSecret = Buffer.from("RTE0OTkwQ0JGNUM3NDBEQjg1MzBBQTZCRTA0REQ5RjM=", 'base64').toString('utf-8');


function getTimestamp(date = new Date()){
    const year = date.getFullYear();
    const month = date.getMonth() + 1 <= 9 ? `0${date.getMonth() + 1}` : date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours() <= 9 ? `0${date.getHours()}` : date.getHours();
    const minutes = date.getMinutes() <= 9 ? `0${date.getMinutes()}` : date.getMinutes();
    const seconds = date.getSeconds() <= 9 ? `0${date.getSeconds()}` : date.getSeconds();

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

async function createMD5Hash(data, uppercase = false) {
    const hash = crypto.createHash('md5').update(data).digest("hex");
    return uppercase ? hash.toUpperCase() : hash;
}


function createMD5HashForSign(params) {
    let sign = appSecret;
    const sortedKeys = Object.keys(params).sort();
    
    for (const key of sortedKeys) {
        sign += key + params[key];
    }
    
    sign += appSecret;
    return module.exports.createMD5Hash(sign, true);
}

function getStatus(status) {
    const [time = '', onOff = '', tempMeasure = '', tempTarget = '', , away = '', , , , mode = '', min_temp = '', max_temp = ''] = status.split(',');
  // status[0] = 1564834881996 => time
  // status[1] = 1 => is_on (hvac)
  // status[2] = 26.5 => measure_temperature
  // status[3] = 16.0 => target_temperature
  // status[4] = 0 => unit?
  // status[5] = 1 => away
  // status[6] = 1 => isProgram?
  // status[7] = 0 => fanMode?
  // status[8] = 0 => runMode?
  // status[9] = 1 => mode
  // status[10] = 05 => device min temp
  // status[11] = 35 => device max temp

  return {
    time: new Date(Number(time)),
    onoff: onOff === '1',
    measure_temperature: parseFloat(tempMeasure),
    target_temperature: parseFloat(tempTarget),
    away: away === '1',
    mode: Number(mode),
    min_temp: Number(min_temp),
    max_temp: Number(max_temp),
  };
};

async function tokenRepair(homey) {      
    if ((homey.settings.get('token')) && (!(homey.settings.get('tokenv1')))){
    homey.settings.set('tokenv1', homey.settings.get('token'));
    homey.settings.unset('token');
  }
  return
  };

  async function setMD5Password(homey) {      
    if ((homey.settings.get('passwordv2')) && (!(homey.settings.get('md5password')))){
        let passwordv2 = homey.settings.get('passwordv2');
        homey.settings.set('md5password', createMD5Hash(passwordv2));
        homey.settings.unset('passwordv2');
  }
  return
  };

module.exports = {
    sendNotification,
    getStatus,
    createMD5HashForSign,
    createMD5Hash,
    getTimestamp,
    tokenRepair,
    setMD5Password,
};