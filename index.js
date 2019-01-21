var Discord = require('discord.io');
var auth = require('./auth.json');
const path = require("path");
const fs = require("fs");
const express = require("express");
const bodyParser = require('body-parser');
const http = require('http');
const text_table = require("text-table");



const app = express();

// Parsers for POST data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

let activeFileStreams = [];
let activeOtherStreams = [];
let botIsInChannel = null;

//allows me to curl
app.get('*', (req, res) => {
    handle_message(null,null,null,"${" + req.query.message + ":" + req.query.user + "}");
});

let bot = new Discord.Client({
    token: auth.auth_token,
    autorun: false
 });
 bot.on('ready',  (evt) => {
    console.log('Connected');
    console.log('Logged in as: ');
    console.log(bot.username + ' - (' + bot.id + ')');
});

get_sound_file = (message) => {
    let extensions = ["wav","mp3","ogg"];
    for (let i=0; i<extensions.length; i++) {
        let extension = extensions[i];
        let pathName = path.join(__dirname, "sounds", message + "." + extension);
        if (fs.existsSync(pathName)) {
            return pathName;
        }
    }
    return null;
}

get_voice_channel = (user_id) => {
    for (channel_id in bot.channels) {
        let channel = bot.channels[channel_id];
        if (user_id in channel.members) {
            return channel_id;
        }
    }
    return null;
}

send_to_users_channel = (message, user_id) => {
    let channel_id = get_voice_channel(user_id);
    if (!channel_id) {
        return;
    }
    let file_name = get_sound_file(message);
    if (!file_name) return;
    bot.joinVoiceChannel( channel_id, (error, events) => {
        botIsInChannel = channel_id;
        if (error) {
            console.log(error);
            return;
        }
        else {
            bot.getAudioContext(channel_id, function(error, stream) {
                if (error) {
                    bot.leaveVoiceChannel(channel_id);
                }
                else {
                    //Create a stream to your file and pipe it to the stream
                    //Without {end: false}, it would close up the stream, so make sure to include that.
                    let file_stream = fs.createReadStream(file_name);
                    activeFileStreams.push(file_stream);
                    activeOtherStreams.push(stream);
                    file_stream.pipe(stream, {end: false});
                    //The stream fires `done` when it's got nothing else to send to Discord.
                    stream.on('done', function() {
                        botIsInChannel = null;
                        bot.leaveVoiceChannel(channel_id);
                    }); 
                }     
            })
        }
    });

}

let get_user_id = (userName) => {
    for (id in bot.users) {
        let user = bot.users[id];
        if (user.username == userName) {
            return id;
        }
    }
}

let send_help_message = (channelID) => {
    let message = "```Welcome to Joey's dank ass discord bot! To play a given sound, " +
        "simply type ${sound}. Here is a list of potential sounds to play: \n\n";
    fs.readdir(path.join(__dirname, "sounds"), (err, files) => {
        let arrs = [];
        for (let i=0; i<files.length-2; i+=3) {
            let arr = [];
            arr.push(files[i].toString().split(".")[0]);
            arr.push(files[i+1].toString().split(".")[0]);
            arr.push(files[i+2].toString().split(".")[0]);
            arrs.push(arr);
        }
        message = message + text_table(arrs);
        message = message + "\n\nIf a given sound is playing too long or breaks (some sounds just don't work atm)," + 
            "simply type ${kill} to have the bot stop."
        message = message + "```";
        bot.sendMessage({
            to: channelID,
            message: message
        })
    })     
    
}

let kill_messages = () => {
    activeFileStreams.forEach((stream) => {
        stream.close();
    })
    activeOtherStreams.forEach((stream) => {
        console.log(stream);
        stream.removeAllListeners();
    })
    activeFileStreams = [];
    activeOtherStreams = [];
    if (botIsInChannel) bot.leaveVoiceChannel(botIsInChannel);
}

handle_message = (user, userID, channelID, message, evt) => {
    let regexp = /\$\{([^}].*)\}/g;
    let match = regexp.exec(message);
    if (match != null) {
        match_parts = match[1].split(":");
        if (match_parts.length == 1) {
            if (match_parts[0] == "help") {
                send_help_message(channelID);
            }
            else if (match_parts[0] == "kill") {
                kill_messages();
            }
            else {
                send_to_users_channel(match_parts[0],userID);
            }
        }
        else {
            send_to_users_channel(match_parts[0],get_user_id(match_parts[1]));
        }
    }
}

bot.on('message', handle_message);

bot.on('disconnect', (errMsg, code) => { 
    console.log(errMsg);
    console.log(code);
    console.log("blow me");
});

bot.connect();

const port = 8082;

app.set('port', port);

const server = http.createServer(app);

server.listen(port, () => {
    console.log("listening on port " + port);
})