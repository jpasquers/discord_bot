var Discord = require('discord.io');
var auth = require('./auth.json');
const path = require("path");
const fs = require("fs");


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
        return path.join(__dirname, "sounds", "AND HIS NAME IS JOHN CENA.mp3");
    }
    else if (message == "questionable") {
        return path.join(__dirname, "sounds", "Chat_wheel_2018_that_was_questionable.mp3");
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

handle_message = (message, user_id) => {
    let channel_id = get_voice_channel(user_id);
    if (!channel_id) {
        console.log("damn");
        return;
    }
    let file_name = get_sound_file(message);
    if (!file_name) return;
    bot.joinVoiceChannel( channel_id, (error, events) => {
        if (error) return;
        else {
            bot.getAudioContext(channel_id, function(error, stream) {
                if (error) {
                    console.error(error);
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

bot.on('message',  (user, userID, channelID, message, evt) => {
    if (message.substring(0,2) == "${") {
        sub_message = message.substring(2,message.length-1);
        handle_message(sub_message, userID);
    }
});

bot.on('disconnect', (errMsg, code) => { 
    console.log(errMsg);
    console.log(code);
    console.log("blow me");
});

bot.connect();
