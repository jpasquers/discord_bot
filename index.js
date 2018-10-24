var Discord = require('discord.io');
var auth = require('./auth.json');
const path = require("path");
const fs = require("fs");
const express = require("express");
const bodyParser = require('body-parser');
const http = require('http');



const app = express();

// Parsers for POST data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

//allows me to curl
app.get('*', (req, res) => {
    handle_message(null,null,null,"${" + req.query.message + ":" + req.query.user + "}");
    res.send("yo");
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
    if (message == "party_horn") {
        return path.join(__dirname, "sounds", "Chat_wheel_2018_party_horn.mp3");
    }
    else if (message == "john_cena") {
        return path.join(__dirname, "sounds", "john_cena.wav");
    }
    else if (message == "questionable") {
        return path.join(__dirname, "sounds", "Chat_wheel_2018_that_was_questionable.mp3");
    }
    else if (message == "mission_failed") {
        return path.join(__dirname, "sounds", "mission_failed.wav");
    }
    else if (message == "cannot_get_out") {
        return path.join(__dirname, "sounds", "cannot_get_out.wav");
    }
    else {
        return null;
    }
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
        if (error) return;
        else {
            bot.getAudioContext(channel_id, function(error, stream) {
                if (error) {
                    bot.leaveVoiceChannel(channel_id);
                }
                else {
                    //Create a stream to your file and pipe it to the stream
                    //Without {end: false}, it would close up the stream, so make sure to include that.
                    fs.createReadStream(file_name).pipe(stream, {end: false});
                
                    //The stream fires `done` when it's got nothing else to send to Discord.
                    stream.on('done', function() {
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

handle_message = (user, userID, channelID, message, evt) => {
    let regexp = /\$\{([^}].*)\}/g;
    let match = regexp.exec(message);
    if (match != null) {
        match_parts = match[1].split(":");
        if (match_parts.length == 1) {
            send_to_users_channel(match_parts[0],userID);
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