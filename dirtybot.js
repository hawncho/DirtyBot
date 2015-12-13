var Discord = require("discord.js");

// Get the email and password
var authDetails = require("./auth.json");
 
var dirtyBot = new Discord.Client();

// list of valid role colors
var validColors = ["green", "emerald", "blue", "cyan", "indigo", "violet", "red", "magenta", "gold", "yellow", "redorange", "orange"];

var userToChannel = [];

// when the bot is ready
dirtyBot.on("ready", function () {
	// temporary until I find a way to see what voice channel a user is currently in
	const defaultChannelId = 121801859156410369;
	
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
				if (userToChannel[user.id] === channel.id) break;
				userToChannel[user.id] = channel.id;
			
				statusMessage = user.username + " has joined \"" + channel.name + "\".";
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
			"!color <color> - Set your name color."
		);
	
	// add the user to the role with a specified color
	} else if (msg.content.indexOf("!color") === 0) {
		var color = msg.content.split(" ")[1];
		
		setUserColor(msg.author, color, msg.channel);
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

dirtyBot.login(authDetails.email, authDetails.password);
