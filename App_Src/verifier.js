const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const uuid = require('uuid');
const mainApp = require('./server');

const  parser = bodyParser.urlencoded({ extended: false });

const presentationConfig = require('./presentation_request_config.json');

presentationConfig.registration.clientName = "The Hotel - KIOSK (Verifier)";
presentationConfig.authority = mainApp.config.VerifierAuthority;
presentationConfig.presentation.requestedCredentials[0].acceptedIssuers[0] = mainApp.config.IssuerAuthority;


const apiKey = uuid.v4();
if ( presentationConfig.callback.headers ) {
  presentationConfig.callback.headers['api-key'] = apiKey;
};

let requestTrace = (req) => {
  var dateFormatted = new Date().toISOString().replace("T", " ");
  var h1 = '//****************************************************************************';
  console.log( `${h1}\n${dateFormatted}: ${req.method} ${req.protocol}://${req.headers["host"]}${req.originalUrl}` );
  console.log( `Headers:`)
  console.log(req.headers);
};

mainApp.app.get('/api/verifier/presentation-request', async (req, res) => {
    requestTrace(req);
    let id = req.session.id;

    //Prep a session state of 0
    mainApp.sessionStore.get(id, (error, session) => {
        let sessionData = {
            "status" : 0,
            "message": "Waiting for QR code to be scanned."
        };
        if(session) {
            session.sessionData = sessionData;
            mainApp.sessionStore.set(id, session);
        }
    });

    // get the access token
    let accessToken = "";
    try {
        const result = await mainApp.msalCca.acquireTokenByClientCredential(mainApp.msalClientCredentialRequest);
        if(result){
            accessToken = result.accessToken;
        }
    } catch {
        console.log(`failed to get the access token`);
        res.status(401).json({
            'error': 'Could not acquire credentials to access your Azure Key Vault'
        });  
        return; 
    }
    console.log( `accessToken: ${accessToken}` );
    presentationConfig.callback.url = `https://${req.hostname}/api/verifier/presentation-request-callback`;
    presentationConfig.callback.state = id;

    console.log('*******************Calling VC Client API*********************' );
    let payload = JSON.stringify(presentationConfig);
    console.log( payload );
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
    let resp = await response.json();

    resp.id = id;                              // add id so browser can pull status
    console.log( `VC Client API Response: ${resp}` ); 
    res.status(200).json(resp);  
});

mainApp.app.post('/api/verifier/presentation-request-callback', parser, async (req, res) => {
    let body = '';
    req.on('data', (data) => {
        body += data;
    });

    req.on('end', () => {
        //requestTrace( req );
        console.log( body );
        if ( req.headers['api-key'] != apiKey ) {
            res.status(401).json({
                'error': 'api-key wrong or missing'
                });  
            return; 
        }
        let presentationResponse = JSON.parse(body.toString());

        if ( presentationResponse.code == "request_retrieved" ) {
            mainApp.sessionStore.get( presentationResponse.state, (error, session) => {
                let cacheData = {
                    "status": presentationResponse.code,
                    "message": "QR Code is scanned. Waiting for validation..."
                };
                session.sessionData = cacheData;
                mainApp.sessionStore.set( presentationResponse.state, session, (error) => {
                    res.send();
                });
            });      
        }

        if ( presentationResponse.code == "presentation_verified" ) {
            mainApp.sessionStore.get(presentationResponse.state, (error, session) => {
                let cacheData = {
                    "status": presentationResponse.code,
                    "message": "Presentation received",
                    "payload": presentationResponse.issuers,
                    "subject": presentationResponse.subject,
                    "firstName": presentationResponse.issuers[0].claims.firstName,
                    "lastName": presentationResponse.issuers[0].claims.lastName,
                    "presentationResponse": presentationResponse
                };
                session.sessionData = cacheData;
                mainApp.sessionStore.set( presentationResponse.state, session, (error) => {
                    res.send();
                });
            });      
        }
    });
    res.send();
});

mainApp.app.get('/api/verifier/presentation-response', async (req, res) => {
  let id = req.query.id;
  //requestTrace( req );
  mainApp.sessionStore.get( id, (error, session) => {
    if (session && session.sessionData) {
      console.log(`status: ${session.sessionData.status}, message: ${session.sessionData.message}`);
      if ( session.sessionData.status == "presentation_verified" ) {
        delete session.sessionData.presentationResponse; // browser don't need this
      }
      res.status(200).json(session.sessionData);   
    }
  });
});