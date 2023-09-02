const crypto = require('crypto');

module.exports.sendNotification = async function(homey, message) {
    const notification = {
      excerpt: message,
    };
    await homey.notifications.createNotification(notification);
  }
  
// Decode the Base64 appSecret
const appSecret = Buffer.from("RTE0OTkwQ0JGNUM3NDBEQjg1MzBBQTZCRTA0REQ5RjM=", 'base64').toString('utf-8');

let mac = "00:1A:2B:3C:4D:5E"; //the mac address should be replaced in the future with a function retrieving the actuall mac of homey device.
module.exports.macToImei = function() {
    // Remove colons and take the first 12 characters
    let base = mac.replace(/:/g, '').substring(0, 12);
    
    // Append 3 more characters (you can change this as needed)
    base += '123';
    
    // Calculate the Luhn check digit for the first 14 characters
    let checkDigit = luhnCheckDigit(base);
    
    return base + checkDigit;
}

function luhnCheckDigit(number) {
    let sum = 0;
    let alt = true;
    for (let i = number.length - 1; i >= 0; i--) {
        let n = parseInt(number[i], 10);
        if (alt) {
            n *= 2;
            if (n > 9) n -= 9;
        }
        sum += n;
        alt = !alt;
    }
    return (sum % 10 === 0) ? 0 : (10 - (sum % 10));
}


module.exports.getTimestamp = (date = new Date()) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1 <= 9 ? `0${date.getMonth() + 1}` : date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours() <= 9 ? `0${date.getHours()}` : date.getHours();
    const minutes = date.getMinutes() <= 9 ? `0${date.getMinutes()}` : date.getMinutes();
    const seconds = date.getSeconds() <= 9 ? `0${date.getSeconds()}` : date.getSeconds();

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

module.exports.createMD5Hash = function(data, uppercase = false) {
    const hash = crypto.createHash('md5').update(data).digest("hex");
    return uppercase ? hash.toUpperCase() : hash;
}


module.exports.createMD5HashForSign = function(params) {
    let sign = appSecret;
    const sortedKeys = Object.keys(params).sort();
    
    for (const key of sortedKeys) {
        sign += key + params[key];
    }
    
    sign += appSecret;
    return module.exports.createMD5Hash(sign, true);
}

module.exports.getStatus = status => {
  const statusSplit = status.split(',');
  // status[0] = 1564834881996 => time
  // status[1] = 1 => is_on (hvac)
  // status[2] = 26.5 => measure_temperature
  // status[3] = 16.0 => target_temperature
  // status[4] = 0 =>
  // status[5] = 1 => away
  // status[6] = 1 =>
  // status[7] = 0 =>
  // status[8] = 0 =>
  // status[9] = 1 => mode
  // status[10] = 05 =>
  // status[11] = 35 =>

  return {
    time: new Date(Number(statusSplit[0])),
    onoff: statusSplit[1] === '1' ? true : false,
    measure_temperature: parseFloat(statusSplit[2]),
    target_temperature: parseFloat(statusSplit[3]),
    away: statusSplit[5] === '1' ? true : false,
    mode: Number(statusSplit[9]),
  };
};
