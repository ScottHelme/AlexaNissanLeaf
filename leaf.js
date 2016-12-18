"use strict";

let https = require("https");

// Do not change this value, it is static.
let initial_app_strings = "geORNtsZe5I4lRGjG9GZiA";
// Possible value are NE (Europe), NNA (North America) and NCI (Canada).
let region_code = "NE";
// You should store your username and password as environment variables. 
// If you don't you can hard code them in the following variables.
let username = process.env.username; // Your NissanConnect username or email address.
let password = process.env.password; // Your NissanConnect account password.

let sessionid, vin, loginFailureCallback;

/**
* Sends a request to the Nissan API.
*
* action - The API endpoint to call, like UserLoginRequest.php.
* requestData - The URL encoded parameter string for the current call.
* successCallback
* failureCallback
**/
function sendRequest(action, requestData, successCallback, failureCallback) {	
	const options = {
		hostname: "gdcportalgw.its-mo.com",
		port: 443,
		path: "/gworchest_160803EC/gdc/" + action,
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			"Content-Length": Buffer.byteLength(requestData),
		}
	};

	const req = https.request(options, resp => {
		if (resp.statusCode < 200 || resp.statusCode > 300) {
			console.log(`Failed to send request ${action} (${resp.statusCode}: ${resp.statusMessage})`);
			if (failureCallback)
				failureCallback();
			return;
		}

		console.log(`Successful request ${action} (${resp.statusCode}: ${resp.statusMessage})`);
		let respData = "";

		resp.on("data", c => {
			respData += c.toString();
		});
		resp.on("end", () => {
			let json = respData && respData.length ? JSON.parse(respData) : null;
			if (json.status == 200) {
				successCallback(respData && respData.length ? JSON.parse(respData) : null);
			}
		});
	});
	
	req.write(requestData);
	req.end();
}

/**
* Log the current user in to retrieve a valid session token.
* 
* successCallback
**/
function login(successCallback) {
	sendRequest("UserLoginRequest.php", 
	"UserId=" + username +
	"&initial_app_strings=" + initial_app_strings +
	"&RegionCode=" + region_code +
	"&Password=" + password,
	loginResponse => {
		// Get the session id and VIN for future API calls.
		// Sometimes the results from the API include a VehicleInfoList array, sometimes they omit it!
		if (loginResponse.VehicleInfoList) {
			sessionid = encodeURIComponent(loginResponse.VehicleInfoList.vehicleInfo[0].custom_sessionid);
			vin = encodeURIComponent(loginResponse.VehicleInfoList.vehicleInfo[0].vin);
		} else  {
			sessionid = encodeURIComponent(loginResponse.vehicleInfo[0].custom_sessionid);
			vin = encodeURIComponent(loginResponse.vehicleInfo[0].vin);			
		}
		successCallback();
	}, 
	loginFailureCallback);
}

/**
* Get the battery information from the API.
**/
exports.getBatteryStatus = (successCallback, failureCallback) => {
	login(() => sendRequest("BatteryStatusRecordsRequest.php",
	"custom_sessionid=" + sessionid +
	"&RegionCode=" + region_code +
	"&VIN=" + vin,
	successCallback,
	failureCallback));
}

/**
* Enable the climate control in the car.
**/
exports.sendPreheatCommand = (successCallback, failureCallback) => {
	login(() => sendRequest("ACRemoteRequest.php",
	"UserId=" + username +
	"&custom_sessionid=" + sessionid +
	"&RegionCode=" + region_code +
	"&VIN=" + vin,
	successCallback,
	failureCallback));
}

/**
* Enable the climate control in the car.
**/
exports.sendCoolingCommand = (successCallback, failureCallback) => {
	login(() => sendRequest("ACRemoteRequest.php",
	"UserId=" + username +
	"&custom_sessionid=" + sessionid +
	"&RegionCode=" + region_code +
	"&VIN=" + vin,
	successCallback,
	failureCallback));
}

/**
* Disable the climate control in the car.
**/
exports.sendClimateControlOffCommand = (successCallback, failureCallback) => {
	login(() => sendRequest("ACRemoteOffRequest.php",
	"UserId=" + username +
	"&custom_sessionid=" + sessionid +
	"&RegionCode=" + region_code +
	"&VIN=" + vin,
	successCallback,
	failureCallback));
}

/**
* Request the API fetch updated data from the car.
**/
exports.sendUpdateCommand = (successCallback, failureCallback) => {
	login(() => sendRequest("BatteryStatusCheckRequest.php",
	"UserId=" + username +
	"&custom_sessionid=" + sessionid +
	"&RegionCode=" + region_code +
	"&VIN=" + vin,
	successCallback,
	failureCallback));
}
