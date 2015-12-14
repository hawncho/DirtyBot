var Discord = require("discord.js");

var http = require('http');
http.createServer(function (request, response) { 
	response.writeHead(200, { "Content-Type": "text/plain" });
	response.write("DirtyBot is running!\n");
	response.end();
}).listen(process.env.PORT || 5000);

// Get the email and password
var authDetails = require("../auth.json");
 
var dirtyBot = new Discord.Client();

// list of valid role colors
const validColors = ["green", "emerald", "blue", "cyan", "indigo", "violet", "red", "magenta", "gold", "yellow", "redorange", "orange"];

const navySealCopypasta = "What the fuck did you just fucking say about me, you little bitch? " +
							"I’ll have you know I graduated top of my class in the Navy Seals, " + 
							"and I’ve been involved in numerous secret raids on Al-Quaeda, " + 
							"and I have over 300 confirmed kills. I am trained in gorilla warfare " +
							"and I’m the top sniper in the entire US armed forces. " +
							"You are nothing to me but just another target. " +
							"I will wipe you the fuck out with precision the likes of which has never been seen before on this Earth, " +
							"mark my fucking words. You think you can get away with saying that shit to me over the Internet? " +
							"Think again, fucker. As we speak I am contacting my secret network of spies across the USA " + 
							"and your IP is being traced right now so you better prepare for the storm, maggot. " +
							"The storm that wipes out the pathetic little thing you call your life. " + 
							"You’re fucking dead, kid. I can be anywhere, anytime, and I can kill you in over seven hundred ways, " +
							"and that’s just with my bare hands. Not only am I extensively trained in unarmed combat, " +
							"but I have access to the entire arsenal of the United States Marine Corps and " +
							"I will use it to its full extent to wipe your miserable ass off the face of the continent, you little shit. " +
							"If only you could have known what unholy retribution your little “clever” comment was about to bring down upon you, " +
							"maybe you would have held your fucking tongue. But you couldn’t, you didn’t, " +
							"and now you’re paying the price, you goddamn idiot. " +
							"I will shit fury all over you and you will drown in it. You’re fucking dead, kiddo.";

const response = {
	0: ["Yes.", "Absolutely.", "You should do it twice.", "Fo' shizzle.", "You bet.", "Sure.", "Go right ahead.", "Does a bear shit in the woods?"],
	1: ["No.", "Nah.", "Nope.", "Definitely not.", "Nah, bitch.", "Nononononono.", "Maybe another time.", "Maybe someday.", "Try asking again.", navySealCopypasta];
};

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
					
					statusMessage = user.username + " moved from \"" + oldChannel.name + "\" to \"" + channel.name + "\".";
				} else {
					statusMessage = user.username + " has joined \"" + channel.name + "\".";
				}
			} else {
				userToChannel[user.id] = null;
				
				statusMessage = user.username + " has left the server.";
			}
			
			dirtyBot.sendMessage(server.defaultChannel, statusMessage);
			
			console.log(server.name + ": " + statusMessage);
			
			break;
	}
});

// when the bot receives a message
dirtyBot.on("message", function(msg){
	// show a list of all available commands
	if (msg.content === "!help") {
		dirtyBot.sendMessage(msg.channel, 
			"\n" +
			"!help - Show a list of all commands.\n" +
			"!color <color> - Set your name color.\n" + 
			"!flip - Flip a coin.\n" + 
			"!roll <min>-<max> - Roll a random number between <min> and <max>.\n" +
			"!shouldi <question> - Ask DirtyBot a yes or no question. (Also works with !shouldhe, !shouldshe, ...)"
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
		
		dirtyBot.sendMessage(msg.channel,  "Range: (" + min + " - " + max + ")\n" + msg.author.username + " rolled " + roll + "!");
		
	// flip a coin
	} else if (msg.content === "!flip") {
		var result;
		
		if (trueOrFalse()) result = "HEADS";
		else result = "TAILS";
		
		dirtyBot.sendMessage(msg.channel, msg.author.username + " flipped and got " + result + "!");
	
	// answer a yes/no question
	} else if (msg.content.indexOf("!shouldi") === 0 ||
				msg.content.indexOf("!shouldhe") === 0 ||
				msg.content.indexOf("!shouldshe") === 0 ||
				msg.content.indexOf("!shouldwe") === 0 ||
				msg.content.indexOf("!shouldthey") === 0) {
		var answer = 0;
	
		if (trueOrFalse()) answer = 1;
		
		var responseIndex = Math.floor(Math.random() * (response[answer].length));
		
		dirtyBot.sendMessage(msg.channel, response[answer][responseIndex]);
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
	
		var role = channel.server.roles.get("name", "@" + color);
		
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
		if (role.name === "@" + color) return true;
	}
}

function trueOrFalse() {
	var rand = Math.random();
	
	if (rand < 0.5) return true;
	else return false;
}

dirtyBot.login(authDetails.email, authDetails.password);
