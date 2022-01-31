/** MQTT Broker with MongoDB */
const path = require('path');
const mosca = require('mosca');
const dotenv = require('dotenv');


// dotenv.config({path: './config/.env'});


const settings = {port: 1883};
const broker = new mosca.Server(settings);

broker.on('ready', () => {
    console.log(`MQTT_Broker is ready.`);
});

// Receive the data from Publisher
broker.on('published', (packet) => {
    let message = packet.payload.toString();
    console.log(`Message received on Broker: ${message}`);
    // if(message.slice(0,1) != '{' && message.slice(0,4) != 'mqtt') {
    //     const msgObj = new Message({
    //         message: message,
    //     });
    //     console.log(`Message-DB: ${message}`);
    //     msgObj.save((err, msg) => {
    //         if(err) return console.error(err);
    //         console.log(`Message saved successfully to DB.`);
    //     });
    // }
});