const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const uuid = require('uuid');
const mainApp = require('./server.js');

const  parser = bodyParser.urlencoded({ extended: false });

const issuanceConfig = require('./issuance_request_config.json');

issuanceConfig.registration.clientName = "The Hotel - KIOSK (Issuer)";
issuanceConfig.authority = mainApp.config.IssuerAuthority;
issuanceConfig.issuance.manifest = mainApp.config.CredentialManifest;

if ( issuanceConfig.issuance.pin && issuanceConfig.issuance.pin.length == 0 ) {
  issuanceConfig.issuance.pin = null;
};

const apiKey = uuid.v4();
if ( issuanceConfig.callback.headers ) {
  issuanceConfig.callback.headers['api-key'] = apiKey;
};

function requestTrace( req ) {
  let dateFormatted = new Date().toISOString().replace("T", " ");
  let h1 = '//****************************************************************************';
  console.log( `${h1}\n${dateFormatted}: ${req.method} ${req.protocol}://${req.headers["host"]}${req.originalUrl}` );
  console.log( `Headers:`)
  console.log(req.headers);
};

function generatePin( digits ) {
  var add = 1, max = 12 - add;
  max        = Math.pow(10, digits+add);
  var min    = max/10; // Math.pow(10, n) basically
  var number = Math.floor( Math.random() * (max - min + 1) ) + min;
  return ("" + number).substring(add); 
};

mainApp.app.get('/api/issuer/issuance-request', async (req, res) => {
  requestTrace( req );
  let id = req.session.id;
  // prep a session state of 0
  mainApp.sessionStore.get( id, (error, session) => {
    let sessionData = {
      "status" : 0,
      "message": "Waiting for QR code to be scanned"
    };
    if ( session ) {
      session.sessionData = sessionData;
      mainApp.sessionStore.set( id, session);  
    }
  });

  // get the Access Token
  let accessToken = "";
  try {
    const result = await mainApp.msalCca.acquireTokenByClientCredential(mainApp.msalClientCredentialRequest);
    if ( result ) {
      accessToken = result.accessToken;
    }
  } catch {
    console.log( "failed to get access token" );
    res.status(401).json({
        'error': 'Could not acquire credentials to access your Azure Key Vault'
        });  
      return; 
  }
  console.log( `accessToken: ${accessToken}` );

  // modify the callback method to make it easier to debug 
  // with tools like ngrok since the URI changes all the time
  // this way you don't need to modify the callback URL in the payload every time
  // ngrok changes the URI
  issuanceConfig.callback.url = `https://${req.hostname}/api/issuer/issuance-request-callback`;
  // modify payload with new state, the state is used to be able to update the UI when callbacks are received from the VC Service
  issuanceConfig.callback.state = id;
  // check if pin is required, if found make sure we set a new random pin
  // pincode is only used when the payload contains claim value pairs which results in an IDTokenhint
  // if ( issuanceConfig.issuance.pin ) {
  //   issuanceConfig.issuance.pin.value = generatePin( issuanceConfig.issuance.pin.length );
  // }
  // here you could change the payload manifest and change the firstname and lastname
  // issuanceConfig.issuance.claims.displayName = "Forrest Gump";
  // issuanceConfig.issuance.claims.sponsorName = "Lieutenant Dan";

  console.log( 'VC Client API Request' );
  console.log( issuanceConfig );

  let payload = JSON.stringify(issuanceConfig);
  const fetchOptions = {
    method: 'POST',
    body: payload,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': payload.length.toString(),
      'Authorization': `Bearer ${accessToken}`
    }
  };

  let client_api_request_endpoint = `https://beta.did.msidentity.com/v1.0/${mainApp.config.azTenantId}/verifiablecredentials/request`;
  const response = await fetch(client_api_request_endpoint, fetchOptions);
  let resp = await response.json()
  // the response from the VC Request API call is returned to the caller (the UI). It contains the URI to the request which Authenticator can download after
  // it has scanned the QR code. If the payload requested the VC Request service to create the QR code that is returned as well
  // the javascript in the UI will use that QR code to display it on the screen to the user.            
  resp.id = id;                              // add session id so browser can pull status
  if ( issuanceConfig.issuance.pin ) {
    resp.pin = issuanceConfig.issuance.pin.value;   // add pin code so browser can display it
  }
  console.log( 'VC Client API Response' );
  console.log( resp );  
  res.status(200).json(resp);       
});

mainApp.app.post('/api/issuer/issuance-request-callback', parser, async (req, res) => {
  let body = '';
  req.on('data', function (data) {
    body += data;
  });
  req.on('end', function () {
    requestTrace( req );
    console.log( body );
    if ( req.headers['api-key'] != apiKey ) {
      res.status(401).json({
        'error': 'api-key wrong or missing'
        });  
      return; 
    }
    let issuanceResponse = JSON.parse(body.toString());
    let message = null;
    // there are 2 different callbacks. 1 if the QR code is scanned (or deeplink has been followed)
    // Scanning the QR code makes Authenticator download the specific request from the server
    // the request will be deleted from the server immediately.
    // That's why it is so important to capture this callback and relay this to the UI so the UI can hide
    // the QR code to prevent the user from scanning it twice (resulting in an error since the request is already deleted)
    if ( issuanceResponse.code == "request_retrieved" ) {
      message = "QR Code is scanned. Waiting for issuance to complete...";
    }
    if ( issuanceResponse.code == "issuance_successful" ) {
      message = "Credential successfully issued";
    }
    if ( issuanceResponse.code == "issuance_error" ) {
      message = issuanceResponse.error.message;
    }
    if ( message != null ) {
      mainApp.sessionStore.get(issuanceResponse.state, (error, session) => {
        let sessionData = {
          "status" : issuanceResponse.code,
          "message": message
        };
        session.sessionData = sessionData;
        mainApp.sessionStore.set( issuanceResponse.state, session, (error) => {
          res.send();
        });
      });      
    }
    res.send()
  });  
  res.send()
});


mainApp.app.get('/api/issuer/issuance-response', async (req, res) => {
  let id = req.query.id;
  requestTrace( req );
  mainApp.sessionStore.get( id, (error, session) => {
    if (session && session.sessionData) {
      console.log(`status: ${session.sessionData.status}, message: ${session.sessionData.message}`);
      res.status(200).json(session.sessionData);   
    }
  });
});
