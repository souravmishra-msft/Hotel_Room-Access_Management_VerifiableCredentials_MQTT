const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const msal = require('@azure/msal-node');
const mqtt = require('mqtt');

const config = require('./config.json');
module.exports.config = config;

/** MSAL Config */
const msalConfig = {
    auth: {
        clientId: config.azClientId,
        authority: `https://login.microsoftonline.com/${config.azTenantId}`,
        clientSecret: config.azClientSecret,
    },
    system: {
        loggerOptions: {
            loggerCallback(loglevel, message, containsPii) {
                console.log(message);
            },
            piiLoggingEnabled: false,
            logLevel: msal.LogLevel.Verbose,
        }
    }
};

const cca = new msal.ConfidentialClientApplication(msalConfig);
const msalClientCredentialRequest = {
  scopes: ["bbb94529-53a3-4be5-a069-7eaf2712b826/.default"],
  skipCache: false, 
};

module.exports.msalCca = cca;
module.exports.msalClientCredentialRequest = msalClientCredentialRequest;

/** Express server setup */
const app = express();
const PORT = 3001; // Port where this server is listening on

let parser = bodyParser.urlencoded({ extended: false });


// Serve static files out of the /public directory
app.use(express.static('public'));

/** Setting up server side session store */
let sessionStore = new session.MemoryStore();
app.use(session({
  secret: 'cookie-secret-key',
  resave: false,
  saveUninitialized: true,
  store: sessionStore
})); 

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Authorization, Origin, X-Requested-With, Content-Type, Accept");
  next();
});

module.exports.sessionStore = sessionStore;
module.exports.app = app;



function requestTrace( req ) {
  var dateFormatted = new Date().toISOString().replace("T", " ");
  var h1 = '//****************************************************************************';
  console.log( `${h1}\n${dateFormatted}: ${req.method} ${req.protocol}://${req.headers["host"]}${req.originalUrl}` );
  console.log( `Headers:`)
  console.log(req.headers);
};

// Serve index.html as the home page
app.get('/', function (req, res) { 
  //requestTrace( req );
  res.sendFile('public/index.html', {root: __dirname});
});

const verifier = require('./verifier');
const issuer = require('./issuer');

/************************ MQTT Publisher ***********************/
app.use(express.json());

// Connect publisher to the broker
const client = mqtt.connect('mqtt:localhost:1883');
const topic = 'Room-Lock-Status';
let message = '';

app.post('/lock_status_check', (req, res) => {
    console.log(`Request: ${JSON.stringify(req.body)}`);
    message = req.body.lock_state + "/" + req.body.room;
    try {
        res.status(200).json({'status': "OK", 'message': req.body.state});
    } catch (err) {
        res.status(400).json({'status': "FAILED", 'error': err});
    }
});

client.on('connect', () => {
    console.log(`Publisher is ready`);
    setInterval(() => {
        client.publish(topic, message);
        console.log(`Message sent from Publisher: `, message);
    }, 3000);
});

/************************************************************* */

// start server
app.listen(PORT, () => console.log(`Server is listening on port http://localhost:${PORT}!`))