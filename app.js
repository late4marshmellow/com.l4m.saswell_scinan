const Homey = require('homey');

const {
	getTimestamp,
	createMD5Hash,
	createMD5HashForSign,
	tokenRepair,
	setMD5Password
} = require('./lib/Utils');

const {
	ERROR_CODES,
	LIST_URL_V2,
	COMPANY_ID,
	APP_KEY,
	USER_AGENT_V2,
	AUTHORIZATION_URL_V2
} = require('./lib/Constants');

const reauthState = {
	reauthTimeout: null
};

class ScinanApp extends Homey.App {
	async onInit() {
		await tokenRepair(this.homey);
		await setMD5Password(this.homey);
		//this.api = await HomeyAPI.forCurrentHomey();
		//this.api.post('/hashPassword', this.onHashPassword.bind(this));
		if (!this.homey.settings.get('macToImeiMD5')) {
			this.log('starting mactoimei...');
			const imei = await this.macToImei();
			this.log('set mactoimei...');
			const imeiHash = await createMD5Hash(imei, true);
			this.log('set imeiHash...');
			this.homey.settings.set('macToImeiMD5', imeiHash);
		}
		if (!this.homey.settings.get('u_interval')) {
			this.homey.settings.set('u_interval', 15)
		}
		this.log('u_interval setting: ' + this.homey.settings.get('u_interval'));

		try {
			if (this.homey.settings.get('firstDeviceAdded')) {
				this.reauthorize();
				this.APIv2UpdateInterval();
			} else {
				this.log('No devices paired, skipping reauthorization and APIv2 update');
			}
		} catch (error) {
			this.log(error);
		}

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
		return {
			hashedPassword
		};
	}
	APIv2UpdateInterval() {
		this.interval = setInterval(async () => {
			await this.APIv2();
		}, Number(this.homey.settings.get('u_interval')) * 60 * 1000); // 15 minutes
	}
	cleanupInterval() {
		clearInterval(this.interval);
		if (this.longTimeoutId) {
			clearTimeout(this.longTimeoutId);
		}
	}

	firstDeviceAdded() {
		this.homey.settings.set('firstDeviceAdded', true);
		this.reauthorize();
		this.APIv2UpdateInterval();
		this.log('first device added, reauthorizing and starting APIv2 update interval');
	};

	async APIv2(retryCount = 0) {
		if (this.homey.settings.get('lastTokenRefresh')) {
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
			if (this.homey.settings.get('tokenv2') === null) {	// If token is null, stop API call (Improve this!)
				this.log('Token is null, stopping API call');
				return;
			}
			const response = await fetch(LIST_URL_V2, requestOptions_list);
			this.log('response status: ' + response.status);
			if (!response.ok) {
				this.log('Error response:', response);
				if (response.status === 404) {
					this.homey.settings.set('last APIv2 result', JSON.stringify({
						result_code: "404",
						result_data: []
					}));
					this.log("last apiv2 response 404: " + this.homey.settings.get('last APIv2 result'));
				}
				throw new Error('Error response from API');
			}
			//if (response.headers.get('content-type').includes('application/json')) {
			//this.log('setting response as json')
			const responseData = await response.json();
			if (!(responseData.result_code === "0")) {
				this.log('result_code <> 0')
				this.homey.settings.set('APIv2 result_code <> 0', true)
				if (responseData.result_code === "10003") {
					this.log('result_code 10003 (expired token)')
					// Reauthorize to get a new token
					try {
						await this.reauthorize();
						let MAX_API_RETRIES = 3;
						if (retryCount < MAX_API_RETRIES) {
							return await this.APIv2(retryCount + 1);
						} else {
							this.log(`APIv2: Max retries (${MAX_API_RETRIES}) reached.`);
							// Handle max retry scenario (e.g., log, alert, etc.)
						}
					} catch (error) {
						this.homey.settings.set('last APIv2 result', responseData);
						console.error("Reauthorization failed", error);
					}
				}
			}
			this.homey.settings.set('last APIv2 result', responseData);
			this.log("last apiv2 response: " + 'result_code: ' + responseData.result_code + ' - description: ' + ERROR_CODES[responseData.result_code]);
			return responseData;
		} catch (error) {
			this.log(error);
			if (error.code === 'ECONNRESET') {
				let MAX_API_RETRIES = 3;
				if (retryCount < MAX_API_RETRIES) {
					this.log(`APIv2: ECONNRESET, retrying (${retryCount + 1}/${MAX_API_RETRIES})...`);
					await new Promise(resolve => setTimeout(resolve, 5000));
					return this.APIv2(retryCount + 1);
				} else {
					this.log(`APIv2: Max retries (${MAX_API_RETRIES}) reached.`);
					// TODO: Handle max retry scenario (e.g., log, alert, etc.)
					this.log('Max retries reached. Stopping API calls and setting app as unavailable.');
					this.cleanupInterval();
					await this.homey.app.setUnavailable('APIv2 failed after 3 retries.');
				}
			}
			//throw new Error(error);
		}
	}

	// Helper function to handle long timeouts
	setLongTimeout(callback, duration) {
		const MAX_TIMEOUT = 2147483647; // Maximum setTimeout delay in ms (~24.85 days)
		if (duration > MAX_TIMEOUT) {
			this.longTimeoutId = setTimeout(() => {
				this.setLongTimeout(callback, duration - MAX_TIMEOUT);
			}, MAX_TIMEOUT);
		} else {
			this.longTimeoutId = setTimeout(callback, duration);
		}
	}

	async reauthorize(retryCount = 0) {
		this.log('reauthorizing');
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
		const requestOptions_auth = {
			method: 'POST',
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				"User-Agent": USER_AGENT_V2,
			},
			body: urlencoded_auth,
			redirect: 'follow',
		};
		try {
			const response = await fetch(AUTHORIZATION_URL_V2, requestOptions_auth);
			if (!response.ok) {
				const MAX_RETRIES = 3;
				if (retryCount < MAX_RETRIES) {
					this.log(`Failed to get token, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
					await new Promise(resolve => setTimeout(resolve, 5000));
					return this.reauthorize(retryCount + 1);
				} else {
					this.cleanupInterval();
					await this.homey.app.setUnavailable('APIv2 failed after 3 retries.');
					throw new Error(`Failed to get token after ${MAX_RETRIES} attempts: ${response.statusText}`);
				}
			}
			let data;
			try {
				data = await response.json();
			} catch (error) {
				const text = await response.text();
				this.log('Non-JSON response:', text);
				throw error;
			}
			if (data && data.resultData && data.resultData.access_token) {
				const token = data.resultData.access_token;
				const expiresIn = Number(data.resultData.expires_in); // in seconds
				this.log('token expires in: ' + expiresIn + ' seconds');
				const currentTime = new Date().toISOString();
				this.homey.settings.set('lastTokenRefresh', currentTime);
				this.log('last token refresh: ' + this.homey.settings.get('lastTokenRefresh'));

				// Calculate refresh duration (e.g., 1 hour before expiration)
				const refreshDurationSeconds = expiresIn - 3600; // Refresh 1 hour before expiry
				const refreshDurationMs = refreshDurationSeconds * 1000;

				// Clear existing long timeout if any
				if (this.longTimeoutId) {
					clearTimeout(this.longTimeoutId);
				}

				// Set long timeout using the helper function
				this.setLongTimeout(() => {
					this.reauthorize();
				}, refreshDurationMs);

				this.homey.settings.set('APIv2 result_code <> 0', false);
				this.homey.settings.set('tokenv2', token);
				this.log('reauthorize run successfully, new token set');
			}
			return data.result_code;
		} catch (error) {
			this.log('Error processing the response:', error);
			throw error;
		}
	}

	async macToImei() {
		let mac = await this.fetchMac();
		this.log("going on")
		let base = mac.replace(/:/g, '').substring(0, 12);
		base += '123';
		let checkDigit = await this.luhnCheckDigit(base);
		return base + checkDigit;
	}

	async fetchMac() {
		let mac;
		try {
			//this needs scope: homey.system.readonly
			const data = await Homey.system.getInfo();
			mac = data.wifiMac;
			return mac;
		} catch (error) {
			console.error("An error occurred while fetching the MAC:", error);
			mac = this.homey.settings.get('mac') ? this.homey.settings.get('mac') : null;
			if (!mac) {
				this.log('setting random mac...');
				mac = Array(6).fill().map(() => Math.floor(Math.random() * 256).toString(16)).join(':');
				this.homey.settings.set('randMac', mac);
				return mac;
			}
			return mac;
		}
	};

	async luhnCheckDigit(number) {
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


}
module.exports = ScinanApp;