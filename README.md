---
Sample: NodeJS Web App
Description: This NodeJS webapp uses the VC Request API to issue and verify verifiable credentials with a credential contract which allows the VC Request API to pass in a payload for the Verifiable Credentials
---

# Hotel Check-In Process using Verifiable Credentials.

### Use Microsoft Verified Credentials for seamless self-check-in 

## Inspiration
The traditional check-in process in a hotel today, requires us to present the proof-of-identity to the receptionist and prove our identity. Upon verifying the identity, they allot us a room and offers us the access-card to get access to the room and other authorized areas within the Hotel premises. 

To prove your identity to the hotel, you might need to handover, a lot of personal documents/Id-Cards while they hotel staff, tries to verify and authorize your access in the hotel premises.
This process of authorization by the hotel receptionist, takes some time, keeping you waiting at the hotel's reception lobby. 

In addition to the expected wait-time, there is always a chance of this wait-time increasing, if the hotel has a huge check-in and check-out rush while you try to check-in.

In order to address the issues listed above, this prototype helps us with the power of un-attended self-check-in, through a kiosk installed in the reception lobby.

## What it does
The prototype, is powered by Microsoft Verifiable Credentials, help us to seamlessly self-check-in by verifying ourselves, and also get access-card issued. All this without the need to handover your physical ID-Cards. All the magic happens through your wallet (Microsoft Authenticator App) installed in your mobile phone.

There is no physical contact required here, as all magic happens through your personal mobile device.

## How it works:
Microsoft Verifiable Credentials, consists of three parts, an issuer, a wallet (to store the credentials) and a verifier.

For setting up Microsoft Verified Credentials, please refer to the [documentation](https://aka.ms/didfordevs) for more details.

This prototype, contains:
- A kiosk application - Acts as the Issuer
- A digital wallet (Microsoft Authenticator App) - Acts as the holder
- A Door lock/unlock mechanism - Acts as the verifier

This prototype makes use of the Microsoft Verified Credential APIs:

## Steps involved for self-check-in
- During the room booking process, on the hotel's website, the user had already verified himself/herself and verification a verifiable credential generated, i.e. a QR Code that can be scanned by the user using the Microsoft Authenticator App on the mobile device and store the VC in the authenticator app (the wallet).

- When at the hotel, using the Kiosk app, the user can verify his/her credentials and get an access-card issued.

- Use this access-card to gain entry into the designated room.

## How we built it

### Architecture Diagram

- The kiosk application calls the verified-credentials APIs. Upon receiving successfully response, it sends the data to the esp8266 micro-controller device connected on each door to either lock or unlock the door.

- The kiosk application uses MQTT protocol to connect to the ESP8266 device to send the instructions to lock and unlock the door.

- Each ESP8266 device as a designated "RoomID" assigned to it. This "RoomID" is mapped to the actual room numbers that are allotted to the customer.

- Here the Kiosk app speaks to the ESP8266 via a MQTT broker.

- Upon successful user-verification using the Microsoft Verified Credentials request apis, the instruction to lock/unlock along with the roomID is sent to the ESP8266 device through the broker.

- Once the ESP8266 device receives the information, it first checks if the request to lock/unlock the door is for the same roomID assigned to that device or not. Once the device figures out that the request is for the same roomID as assigned to that device, it performs the lock/unlock operation.

## Steps to run this project
The repository contains the following components/directories:
- MQTT_broker: This directory contains the code for the MOSCA MQTT broker.
    - Install the dependencies, run `npm install`
    - Run the project, run `npm run start-dev`

**Note**: When you try to run the broker.js file inside the MQTT_Broker directory, it might fail with the following error:
`SchemaError: Expected `schema` to be an object or boolean`

To fix this error, comment out lines 109 to 111 in the `validator.js` inside `node_modules\jsonschema\lib\`


- App_Src: This directory contains the code for the Kiosk app.
    - server.js: main expressjs file and it contains the code for initializing MSAL as confidential client.
    - issuer.js:  This file contains the code to fetch the access-token using the confidential-client created above and then call the VC request API using the issuance_request_config.json and the access-token, to issue a valid verifiable credential.
    - verifier.js: This file contains the code to fetch the access-token using the confidential-client created above and then call the VC request API using the presentation_request_config.json and the access-token, to verify the credential issued in the previous step.
    - Install the dependencies, run `npm install`
    - Run the project, run `npm run start-dev`
- LED_Control_ESP8266_MQTT: This directory contains the .ino file for the ESP8266 device. This device has been assigned a device ID: 210 that depicts the room no. where this device is installed. For each request reaching this device comes with the lock/unlock command and the roomId. Looking at the roomId the device authorizes the request and then performs the actions. Each device that would have their device id hardcoded and mapped to the corresponding room no. where the device is installed.
- To test this .ino file, upload this to an ESP8266 board and set up the an led as per the circuit diagram.

**Note:** The ESP8266 device for this project is just blinking an LED light depicting the lock and unlock status. If the LED is ON, it depicts the lock status is unlocked, and if the LED is OFF, it depicts the lock status is locked.

## What we learned
Things we learned while working on this project are:
- Configuring Verifiable Credentials in Azure AD.
- Configuring B2C with Verifiable Credentials.
- Details on MQTT protocol
- Writing a custom MQTT broker using MOSCA on NodeJS Express app.
- Setting up ESP8266 device to connect to a custom MQTT broker.

## Challenges we ran into
Few of the challenges we faced that are worth mentioning.
- Integrating ESP8266 to a custom MQTT broker.
- The custom broker in this project is running on localhost. We haven't yet hosted it on any cloud service to make it available over the internet.

## Accomplishments that we're proud of
Below are the advantages of the project.

- Reduce the check-in time at the reception.
- Better tracking of the user identification.
- Automate the room access.
- Avoiding physical contact during the check-in process.

## What's next for Hotel Check-In Process using Verifiable Credentials.

- Currently we see a delay of around 8 seconds for the esp8266 to receive the data from the MQTT broker, hence we need to work on reducing this delay.
- Integrate a more widely accepted Government issued ID, to make this solution be used in various other areas, like Hotels, Airports, etc.
- To bring this solution in organizations to provide a seamless entry/exit experience for visitors to only specific conference rooms and other generally authorized spaces like parking, cafeteria, play area etc., inside the office premises.