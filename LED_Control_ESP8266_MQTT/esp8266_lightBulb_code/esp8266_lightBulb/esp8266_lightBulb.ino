#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include "qrcode.h"
#include <U8g2lib.h>
#include <string.h>

// your wifi name and password
const char* ssid = "*********"; 
const char* pwd   = "**********";

const char* mqttServer = "<mqtt_broker_ip_address>";
const int mqttPort = 1883;
const char* mqttUser = "";
const char* mqttPassword = "";



int ledPin = 2;
int roomID = 210;

U8G2_SH1106_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0);
WiFiClient espClient;
PubSubClient client(espClient);

//void display_qrcode(char *text) {   
//    QRCode qrcode;
//    uint8_t qrcodeData[qrcode_getBufferSize(4)]; //Version 4 114 byte 33x33 res QR code
//    qrcode_initText(&qrcode, qrcodeData, 4, ECC_LOW, text);
// 
//    u8g2.firstPage();
//    do {
//        u8g2.setColorIndex(0);
//        u8g2.drawBox(0, 0, 64, 64);
//        u8g2.setColorIndex(1);
//        for (uint8_t y = 0; y < qrcode.size; y++) {
//            for (uint8_t x = 0; x < qrcode.size; x++) {
//                if (qrcode_getModule(&qrcode, x, y))
//                    u8g2.drawBox(15 + x, 15 + y, 1, 1);
//            }
//        }
//         
//        u8g2.setColorIndex(1);
//        u8g2.drawBox(64, 0, 64, 64);
//        u8g2.setColorIndex(0);
//        for (uint8_t y = 0; y < qrcode.size; y++) {
//            for (uint8_t x = 0; x < qrcode.size; x++) {
//                if (qrcode_getModule(&qrcode, x, y))
//                    u8g2.drawBox(79 + x, 15 + y, 1, 1);
//            }
//        }
//    } while ( u8g2.nextPage() );
//}


void setup() {
  pinMode(ledPin, OUTPUT);
  digitalWrite(ledPin, LOW);

  Serial.begin(115200);
  u8g2.begin();
  
  //display_qrcode("shorturl.at/prstF"); // Generating the QR Code
  
  Serial.println();
  Serial.print("Wifi connecting to: ");
  Serial.println(ssid);

  WiFi.begin(ssid, pwd);
  Serial.println();
  Serial.print("Connecting.");

  while(WiFi.status()!= WL_CONNECTED){
    delay(500);
    Serial.print(".");
  }
  
  digitalWrite(ledPin, HIGH);
  Serial.println();
  Serial.println("Connected to Wifi Successfully.");
  Serial.print("ESP8266 Device IP: ");
  Serial.println(WiFi.localIP());

  client.setServer(mqttServer, mqttPort);
  client.setCallback(callback);

  while(!client.connected()) {
    Serial.println("Connecting to MQTT Broker...");
    if(client.connect("Room-201")) {
      Serial.println("Successfuly connected to MQTT Broker.");
    } else {
      Serial.println("failed with state ");
      Serial.print(client.state());
      Serial.println("");
      delay(2000);
    }
  }
  digitalWrite(ledPin, LOW);
//  client.subscribe(topic);
  
}

void callback(char* topic, byte* payload, unsigned int length)
{
    Serial.print("Message received in topic: ");
    Serial.println(topic);
    Serial.print("Message received from broker:");
    payload[length] = 0;
    char *msg_payload = (char *)payload;
    // Split the payload in two values
    char* separator = strchr(msg_payload, '/');
    if (separator != 0)
    {
        // Actually split the string in 2: replace '/' with 0
        *separator = 0;
        char *lock = msg_payload;
        ++separator;
        int room = atoi(separator);
        // Do something with lock and room
        Serial.println();
        Serial.print("Lock is: ");
        Serial.println(lock);
        Serial.print("For Room: ");
        Serial.println(room);
        
        if((strcmp(lock,"ON") == 0) && (room == 210))
        {
           Serial.println("Light ON");
           digitalWrite(ledPin,HIGH);
        } 
        else if(strcmp(lock,"OFF"))
        {
            Serial.println("Light OFF");
            digitalWrite(ledPin,LOW);
        } 
        else 
        {
            Serial.println("Default OFF");
            digitalWrite(ledPin, LOW);
        }

        Serial.println("-----------------------");
    }
}

void loop() {
  client.subscribe("Room-Lock-Status");
  delay(100);
  client.loop();
}
