var Discord = require("discord.js");
 
// Get the email and password
var authDetails = require("./auth.json");
 
var dirtyBot = new Discord.Client();

// when the bot is ready
dirtyBot.on("ready", function () {
	console.log("Ready to begin! Serving in " + dirtyBot.channels.length + " channels");
});

// when the bot disconnects
dirtyBot.on("disconnected", function () {
	// alert the console
	console.log("Disconnected!");

	// exit node.js with an error
	process.exit(1);
});

// when the bot receives a message
dirtyBot.on("message", function(msg){
	//if message is "ping"
	if(msg.content === "ping") {
		// send a message to the channel the ping message was sent in
		dirtyBot.reply(msg, "pong");
		
		// alert the console
		console.log("pong-ed " + msg.author.username);
	}
});
 
dirtyBot.login(authDetails.email, authDetails.password);
