"use strict";

// Require the leaf.js file with specific vehicle functions.
let car = require("./leaf");

// Build a response to send back to Alexa.
function buildResponse(output, card, shouldEndSession) {
	return {
		version: "1.0",
		response: {
			outputSpeech: {
				type: "PlainText",
				text: output,
			},
			card,
			shouldEndSession
		}
	};
}

// Helper to build the text response for range/battery status.
function buildBatteryStatus(battery) {
	console.log(battery);
	let response = `You have ${Math.floor((battery.BatteryStatusRecords.BatteryStatus.BatteryRemainingAmount / battery.BatteryStatusRecords.BatteryStatus.BatteryCapacity) * 100)}% battery which will get you approximately ${Math.floor(battery.BatteryStatusRecords.CruisingRangeAcOn * 0.000568182)} miles. `;

	if (battery.BatteryStatusRecords.PluginState == "CONNECTED") {
		response += "The car is plugged in";
	} else {
		response += "The car is not plugged in";
	}

	if (battery.BatteryStatusRecords.BatteryStatus.BatteryChargingStatus != "NOT_CHARGING") {
		response += " and charging";
	}

	return response + ".";
}

// Helper to build the text response for charging status.
function buildChargingStatus(charging) {
	let response = "";
	if(charging.BatteryStatusRecords.BatteryStatus.BatteryChargingStatus == "NOT_CHARGING") {
		response += "Your car is not on charge.";
	} else {
		response += "Your car is on charge.";
	}
	
	return response;
}

// Helper to build the text response for connected to power status.
function buildConnectedStatus(connected) {
	let response = "";
	if(connected.BatteryStatusRecords.PluginState == "NOT_CONNECTED") {
		response += "Your car is not connected to a charger.";
	} else {
		response += "Your car is connected to a charger.";
	}
	
	return response;
}

// Handling incoming requests
exports.handler = (event, context) => {
		
	// Helper to return a response with a card.		
	const sendResponse = (title, text) => {
		context.succeed(buildResponse(text, {
			"type": "Simple",
			"title": title,
			"content": text
		}));
	};

	try {
		// Verify the person calling the script. Get your Alexa Application ID here: https://developer.amazon.com/edw/home.html#/skills/list
		// Click on the skill and look for the "Application ID" field.
		// Set the applicationId as an environment variable or hard code it here.
		if(event.session.application.applicationId !== process.env.applicationId) {
			sendResponse("Invalid Application ID", "You are not allowed to use this service.");
			return;
		}

		// Shared callbacks.
		const exitCallback = () => context.succeed(buildResponse("Goodbye!"));
		const helpCallback = () => context.succeed(buildResponse("What would you like to do? You can preheat the car or ask for battery status.", null, false));
		const loginFailureCallback = () => sendResponse("Authorisation Failure", "Unable to login to Nissan Services, please check your login credentials.");

		// Handle launches without intents by just asking what to do.		
		if (event.request.type === "LaunchRequest") {
			helpCallback();
		} else if (event.request.type === "IntentRequest") {
			// Handle different intents by sending commands to the API and providing callbacks.
			switch (event.request.intent.name) {
				case "PreheatIntent":
					car.sendPreheatCommand(
						response => sendResponse("Car Preheat", "The car is warming up for you."),
						() => sendResponse("Car Preheat", "I can't communicate with the car at the moment.")
					);
					break;
				case "CoolingIntent":
					car.sendCoolingCommand(
						response => sendResponse("Car Cooling", "The car is cooling down for you."),
						() => sendResponse("Car Cooling", "I can't communicate with the car at the moment.")
					);
					break;
				case "ClimateControlOffIntent":
					car.sendClimateControlOffCommand(
						response => sendResponse("Climate Control Off", "The cars climate control is off."),
						() => sendResponse("Climate Control Off", "I can't communicate with the car at the moment.")
					);
					break;
				case "UpdateIntent":
					car.sendUpdateCommand(
						response => sendResponse("Car Update", "I'm downloading the latest data for you."),
						() => sendResponse("Car Update", "I can't communicate with the car at the moment.")
					);
					break;
				case "RangeIntent":
					car.getBatteryStatus(
						response => sendResponse("Car Range Status", buildBatteryStatus(response)),
						() => sendResponse("Car Range Status", "Unable to get car battery status.")
					);
					break;
				case "ChargeIntent":
					car.getBatteryStatus(
						response => sendResponse("Car Battery Status", buildBatteryStatus(response)),
						() => sendResponse("Car Battery Status", "Unable to get car battery status.")
					);
					break;
				case "ChargingIntent":
					car.getBatteryStatus(
						response => sendResponse("Car Charging Status", buildChargingStatus(response)),
						() => sendResponse("Car Charging Status", "Unable to get car battery status.")
					);
					break;
				case "ConnectedIntent":
					car.getBatteryStatus(
						response => sendResponse("Car Connected Status", buildConnectedStatus(response)),
						() => sendResponse("Car Connected Status", "Unable to get car battery status.")
					);
					break;
				case "AMAZON.HelpIntent":
					helpCallback();
					break;
				case "AMAZON.StopIntent":
				case "AMAZON.CancelIntent":
					exitCallback();
					break;
			}
		} else if (event.request.type === "SessionEndedRequest") {
			exitCallback();
		}
	} catch (err) {
		console.error(err.message);
		sendResponse("Error Occurred", "An error occurred. Fire the programmer! " + err.message);
	}
};