var Discord = require("discord.js");
var http = require('http');
var fs = require("fs");

// ip and port info for http server
const serverDetails = require("../config.json");

http.createServer(function (request, response) { 
	
	if (request.method == 'GET') {
		response.writeHead(200, { "Content-Type": "text/plain" });
		response.write("DirtyBot is running!\n");
		response.end();
	}
	
}).listen(serverDetails.port, serverDetails.ip);

const rootDir = "../";
const dataDir = rootDir + "data/";

const authFile = "auth.json";
const broskiiFile = "broskii.json";
const colorFile = "colors.json";
const responseFile = "responses.json";
const lastOnlineFile = "lastonline.json";

// Get the email and password
const authDetails = require(rootDir + "auth.json");

const broskii = require(dataDir + "broskii.json");

// list of valid role colors
const validColors = require(dataDir + "colors.json");

// set of yes or no responses
const response = require(dataDir + "responses.json");

// last-online data
var lastOnline = require(dataDir + "lastonline.json");

var dirtyBot = new Discord.Client();

var userToChannel = [];

// when the bot is ready
dirtyBot.on("ready", function () {
	// temporary until I find a way to see what voice channel a user is currently in
	const defaultChannelId = dirtyBot.channels.get("name", "The Dirty Den").id;
	
	// track all online user's current voice channel
	var user;
	for (var i = 0; i < dirtyBot.users.length; i++) {
		user = dirtyBot.users[i];
		if (user.status !== "offline") {
			userToChannel[user.id] = defaultChannelId;
		}
	}
		
	console.log("Ready to begin! Serving in " + dirtyBot.channels.length + " channels");
});

// when the bot disconnects
dirtyBot.on("disconnected", function () {
	console.log("Disconnected!");

	// exit node.js with an error
	process.exit(1);
});

dirtyBot.on("raw", function (packet) {
	switch (packet.t) {
		// when a user joins or leaves a channel
		// or when a user has their voice status (mute, deaf) changed
		case "VOICE_STATE_UPDATE":
			var server = dirtyBot.servers.get("id", packet.d.guild_id);
			var user = dirtyBot.users.get("id", packet.d.user_id);
			var channel = dirtyBot.channels.get("id", packet.d.channel_id);
			
			var statusMessage;
			
			if (channel) {
				var oldChannelId = userToChannel[user.id];
				
				if (oldChannelId === channel.id) break;
				
				userToChannel[user.id] = channel.id;
				
				if (oldChannelId) {
					oldChannel = dirtyBot.channels.get("id", oldChannelId);
					
					statusMessage = user + " moved from " + oldChannel + " to " + channel + ".";
				} else {
					statusMessage = user + " has joined " + channel + ".";
				}
			} else {
				userToChannel[user.id] = null;
				
				if (!lastOnline[server.id]) lastOnline[server.id] = {};
				
				lastOnline[server.id][user.id] = Date.now();
				fs.writeFileSync("./data/" + lastOnlineFile, JSON.stringify(lastOnline));
				
				statusMessage = user + " has left the server.";
			}
			
			dirtyBot.sendMessage(server.defaultChannel, statusMessage);
			
			console.log(server.name + ": " + statusMessage + " (" + user.username + ")");
			
			break;
	}
});

// when the bot receives a message
dirtyBot.on("message", function(msg){
	// show a list of all available commands
	if (msg.content === "!help") {
		dirtyBot.sendMessage(msg.channel, 
			"\n" +
			"**!help** - Show a list of all commands.\n" +
			"**!color** *<color>* - Set your name color.\n" + 
			"**!last** @*<username>* - Check when @username was last online.\n" +
			"**!flip** - Flip a coin.\n" + 
			"**!roll** *<min>-<max>* - Roll a random number between <min> and <max>.\n" +
			"**!should** *<question>* - Ask DirtyBot a yes or no question."
		);
	
	// add the user to the role with a specified color
	} else if (msg.content.indexOf("!color") === 0) {
		var color = msg.content.split(" ")[1];
		
		setUserColor(msg.author, color, msg.channel);
		
	// roll a random number
	} else if (msg.content.indexOf("!roll") === 0) {
		var range = msg.content.split(" ")[1];
		
		var min = 1;
		var max = 100;
		
		if (range) {
			range = range.split("-");
			
			// if there are two valid numbers
			if (range.length === 2 && !isNaN(range[0]) && !isNaN(range[1])) {
				min = parseInt(range[0]);
				max = parseInt(range[1]);
			}
		}
		
		var roll = Math.floor(Math.random() * (max - min + 1)) + min;
		
		dirtyBot.sendMessage(msg.channel,  "Range: (" + min + " - " + max + ")\n" + msg.author + " rolled " + roll + "!");
		
	// flip a coin
	} else if (msg.content === "!flip") {
		var result;
		
		if (trueOrFalse()) result = "HEADS";
		else result = "TAILS";
		
		dirtyBot.sendMessage(msg.channel, msg.author + " flipped and got " + result + "!");
	
	// answer a yes/no question
	} else if (msg.content.indexOf("!should") === 0) {
		var answer = 0;
	
		if (trueOrFalse()) answer = 1;
		
		var responseIndex = Math.floor(Math.random() * (response[answer].length));
		
		dirtyBot.sendMessage(msg.channel, response[answer][responseIndex]);
	
	// broskii
	} else if (msg.content === "!broskii") {
		dirtyBot.sendMessage(msg.channel, broskii.image);
		
	// last online
	} else if (msg.content.indexOf("!last") === 0) {
		var user = msg.mentions[0];
		
		if (user) {
			var serverId = msg.channel.server.id;
			var channel = isUserInServer(user, serverId);
			if (channel) {
				dirtyBot.sendMessage(msg.channel, user + " is in " + channel + " right now!");
				return;
			}
			
			var serverData = lastOnline[serverId];
			if (serverData) {
				var userLastOnline = serverData[user.id];
			
				if (userLastOnline) {
					var timeSince = Date.now() - userLastOnline;
				
					dirtyBot.sendMessage(msg.channel, user + " was last in this server " + convertToReadableTime(timeSince) + " ago.");
					return;
				}
			}
			
			dirtyBot.sendMessage(msg.channel, "I have no records of " + user + ".");
		}
	}
});

function displayAllAvailableColors(channel) {
	var nameColorString = "\nAvailable name colors: \n";
	
	for (var i = 0; i < validColors.length; i++) {
		nameColorString += validColors[i] + "\n";
	}
	
	nameColorString += "Use \"!color reset\" to remove all colors from your name."

	dirtyBot.sendMessage(channel, nameColorString);
}

function setUserColor(user, color, channel) {
	// delay before adding the new role
	// since trying to do both without waiting for a removal command to finish
	// causes the later commands to fail
	const waitTimeForRemovals = 300;
	
	if (color == null) {
		return displayAllAvailableColors(channel);
	}
	
	color = color.toLowerCase();
	
	if (color === "reset") {
		return removeAllColorRoles(user, channel.server);
	}
	
	if (validColors.indexOf(color) !== -1) {
		removeAllColorRoles(user, channel.server);
	
		var role = channel.server.roles.get("name", color);
		
		// if there are existing color roles to remove,
		// wait for them to be removed before adding the new role
		if (getColorRole(user, channel.server)) {
			setTimeout( function () {
				dirtyBot.addMemberToRole(user, role)
			}, waitTimeForRemovals);
		} else {
			dirtyBot.addMemberToRole(user, role)
		}
		
		console.log("set color of " + user.username + " to " + color);
	} else {
		return displayAllAvailableColors(channel);
	}
}

function removeAllColorRoles(user, server) {
	const timeBetweenRemovals = 200;

	var colorRole = getColorRole(user, server);
	
	// continue attempting to remove color roles until all are removed
	if (colorRole) {
		removeUserFromRole(user, colorRole);
		
		setTimeout( function () {
			removeAllColorRoles(user, server);
		}, timeBetweenRemovals);
	} else {
		console.log("removed all colors from " + user.username);
	}
}

function removeUserFromRole(user, role) {
	dirtyBot.removeMemberFromRole(user, role)

	console.log("removed user " + user.username + " from role " + role.name);
}

function getColorRole(user, server) {
	var userRoles = server.rolesOfUser(user);
	var role;
	for (var i = 0; i < userRoles.length; i++) {
		role = userRoles[i];
		if (isColorRole(role)) return role;
	}
	return null;
}

function isColorRole(role) {
	var color;
	for (var i = 0; i < validColors.length; i++) {
		color = validColors[i];
		if (role.name === color) return true;
	}
}

function isUserInServer(user, serverId) {
	if (user.status === "offline") return null;

	var channelId = userToChannel[user.id];
	if (channelId) {
		var channel = dirtyBot.channels.get("id", channelId);
		if (channel.server.id == serverId) {
			return channel;
		}
	}
	return null;
}

function convertToReadableTime(milliseconds) {
	var seconds = Math.floor(milliseconds / 1000);
	milliseconds -= seconds * 1000;
	
	var minutes = Math.floor(seconds / 60);
	seconds -= minutes * 60;
	
	var hours = Math.floor(minutes / 60);
	minutes -= hours * 60;
	
	var days = Math.floor(hours / 24);
	hours -= days * 24;
	
	const _seconds = 0
	const _minutes = 1;
	const _hours = 2;
	const _days = 3;
	var isZero = [seconds == 0, minutes == 0, hours == 0, days == 0];
	var isLabelPlural = [seconds != 1, minutes != 1, hours != 1, days != 1];
	
	var readable;
	readable = seconds + (isLabelPlural[_seconds] ? " seconds" : " second");
	if (!isZero[_minutes] || !isZero[_hours] || !isZero[_days]) { readable = minutes + (isLabelPlural[_minutes] ? " minutes and " : " minute and ") + readable; }
	if (!isZero[_hours] || !isZero[_days]) { readable = hours + (isLabelPlural[_hours] ? " hours, " : " hour, ") + readable; }
	if (!isZero[_days]) { readable = days + (isLabelPlural[_days] ? " days, " : " day, ") + readable; }
	
	return readable;
}

function trueOrFalse() {
	var rand = Math.random();
	
	if (rand < 0.5) return true;
	else return false;
}

dirtyBot.login(authDetails.email, authDetails.password);
