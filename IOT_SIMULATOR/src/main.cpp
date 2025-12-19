#include <WiFi.h>               
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <TimeLib.h>
#include <ArduinoJson.h>
const char* deviceID = "smartfarmdevice001";
const char* ssid = "Wokwi-GUEST";
const char* password = "";

//***Set server***
const char* mqttServer = "c97819878efa4a048400b63bb26684d0.s1.eu.hivemq.cloud"; 
int port = 8883; 
const char* mqtt_user = "Giaphu"; 
const char* mqtt_password = "Phu050912";

WiFiClientSecure wifiClient;
PubSubClient mqttClient(wifiClient);

// Cấu hình cảm biến DHT22
#define DHTPIN 4
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

// LCD I2C
LiquidCrystal_I2C lcd(0x27, 16, 2);

// Chân cảm biến đất giả lập (biến trở)
#define SOIL_PIN 36 

// LED
#define RED_LED 17
#define GREEN_LED 16

// Buzzer
#define BUZZER_PIN 18
bool pumpStatus = false;

float TemperatureLimit;
float AirHumidityLimit ;
float SoilMoistureLimit ;

unsigned long lastMeasureTime = 0;
const unsigned long measureInterval = 5000; 

void wifiConnect() {
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" Connected!");
}

bool autoMode;

void mqttConnect() {
  while(!mqttClient.connected()) {
    Serial.println("Attemping MQTT connection...");
    String clientId = "ESP32Client-" + String(random(0xffff), HEX);
    if(mqttClient.connect(clientId.c_str(), mqtt_user, mqtt_password)) {
      Serial.println("connected");

      String subscribeTopic = "devices/" + String(deviceID) + "/commands";
      String subscribeForcastTopic = "devices/" + String(deviceID) + "/forecast";
      mqttClient.subscribe(subscribeTopic.c_str());
      mqttClient.subscribe(subscribeForcastTopic.c_str());
//       khi kết nối với mqtt broker thì publish một cái data như sau 
//        {
//            booted: true
//         }
        // Prepare JSON Payload
    //booted payload is to inform server that device has restarted so that server can broadcasted 
    String jsonPayload = "{\"booted\": true}";

    String topic = "devices/" + String(deviceID) + "/data";

    // Debug print
    Serial.print("Publishing to " + topic + ": ");
    Serial.println(jsonPayload);
    
    mqttClient.publish(topic.c_str(), jsonPayload.c_str());

      Serial.println("Subscribed to: " + subscribeTopic);
      Serial.print("Subscribed to: " + subscribeForcastTopic);
    }
    else {
      Serial.print(mqttClient.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}


//nhận lệnh từ server
void callback(char* topic, byte* message, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");

  // Create a string from the message payload for debugging
  String msgString = "";
  for (int i = 0; i < length; i++) {
    msgString += (char)message[i];
  }
  Serial.println(msgString);

  // Check if the topic matches our command topic
  String commandTopic = "devices/" + String(deviceID) + "/commands";
  // String commandTopicForecast = "devices/" + String(deviceID) + "/forecast";

  if (String(topic) == commandTopic) {
 
    JsonDocument doc; 

 
    DeserializationError error = deserializeJson(doc, message, length);

    if (error) {
      Serial.print("deserializeJson() failed: ");
      Serial.println(error.c_str());
      return;
    }

    //export enum IoTDeviceState {
	  //Pump = 'PUMP',
	  //AutoMode = 'AUTO_MODE',
	  //}
    // export type DeviceStateUpdate = {
    // 	state: IoTDeviceState
    // 	enable: boolean
    // }



    //ack purpose is for confirming the current state after command execution for synchronization 
    //between device and server ( if the server UI need to change based on device state)
    const char* action = doc["action"];

    // ACTION 1: PUMP (Control Buzzer/Pump)
    if (strcmp(action, "PUMP") == 0) {
      bool val = doc["enable"]; 
      pumpStatus = val;
      Serial.print("Command: Pump Manual set to ");
      Serial.println(val ? "ON" : "OFF");
    
      JsonDocument ackDoc;
      ackDoc["state"] = "PUMP";   
      ackDoc["enable"] = pumpStatus;

      char ackBuffer[256];
      serializeJson(ackDoc, ackBuffer);
    
      String dataTopic = "devices/" + String(deviceID) + "/data";
      mqttClient.publish(dataTopic.c_str(), ackBuffer);

      Serial.print("Sent pump ACK: ");
      Serial.println(ackBuffer);
    }
    
    // ACTION 2: TOGGLE AUTO MODE
    else if (strcmp(action, "TOGGLE_AUTO") == 0) {
      bool val = doc["value"];
      autoMode = val;
      Serial.print("Command: Auto Mode set to ");
      Serial.println(val ? "ON" : "OFF");

      JsonDocument ackDoc;
      ackDoc["state"] = "AUTO_MODE"; 
      ackDoc["enable"] = autoMode;      

      char ackBuffer[256];
      serializeJson(ackDoc, ackBuffer);

      // sent back ack
    
      String dataTopic = "devices/" + String(deviceID) + "/data";
      mqttClient.publish(dataTopic.c_str(), ackBuffer);
      
      Serial.print("Sent auto mode ACK: ");
      Serial.println(ackBuffer);
    }
    // ACTION 3: SET THRESHOLD
    else if (strcmp(action, "SetThreshold") == 0) {
      // The "value" here is a nested object (SensorData)
      JsonObject values = doc["value"];
      
      if (values.containsKey("temperature")) {
        TemperatureLimit = values["temperature"];
        Serial.print("Updated Temp Limit: "); Serial.println(TemperatureLimit);
      }
      if (values.containsKey("humidity")) {
        AirHumidityLimit = values["humidity"];
        Serial.print("Updated Hum Limit: "); Serial.println(AirHumidityLimit);
      }
      if (values.containsKey("moisture")) {
        SoilMoistureLimit = values["moisture"];
        Serial.print("Updated Soil Limit: "); Serial.println(SoilMoistureLimit);
      }
    }
    else if(strcmp(action,"GET_DATA") == 0){
      Serial.println("Command: GET_DATA");

      float temperature = dht.readTemperature();
      float humidity = dht.readHumidity();
      int raw_soil = analogRead(SOIL_PIN);
      int soil_percent = map(raw_soil, 0, 4095, 0, 100); 

      String jsonPayload = "{\"sensorData\": {";
      jsonPayload += "\"temperature\": " + String(temperature, 2) + ", ";
      jsonPayload += "\"humidity\": " + String(humidity, 2) + ", ";
      jsonPayload += "\"moisture\": " + String(soil_percent);
      jsonPayload += "}}";

      String topic = "devices/" + String(deviceID) + "/data_for_telegram";

      mqttClient.publish(topic.c_str(), jsonPayload.c_str());

      Serial.print("Publishing to " + topic + ": ");
      Serial.println(jsonPayload);
    }
  }
  // else if (String(topic) == commandTopicForecast) {
  //     String message = "";
  //     for (int i = 0; i < length; i++) {
  //         message += (char)message[i];
  //     }
  //     JsonDocument doc; 
  //     DeserializationError error = deserializeJson(doc, message);

  //   if (error) {
  //     Serial.print("deserializeJson() failed: ");
  //     Serial.println(error.c_str());
  //     return;
  //   }
  //     int rainValue = doc["rain_prob"];
  //     lcd.clear();              
  //     lcd.setCursor(6,1);      
  //     lcd.print("RAIN : ");     
  //     lcd.print(rainValue);     
  //     lcd.print("%");
  // }
}

void setup() {
  Serial.begin(9600);
  dht.begin();

  pinMode(RED_LED, OUTPUT);
  pinMode(GREEN_LED, OUTPUT);
  
  ledcSetup(0, 2000, 8);
  ledcAttachPin(BUZZER_PIN, 0); 

  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Starting...");
  Serial.print("Connecting to WiFi");

  wifiConnect();
  wifiClient.setInsecure(); 
  mqttClient.setServer(mqttServer, port);
  mqttClient.setCallback(callback);
  mqttClient.setKeepAlive(90);
}


//---------//---------//---------BEGIN----------//---------//---------//---------//---------//---------
void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    wifiConnect();
  }

  if (!mqttClient.connected()) {
      mqttConnect();
  }

  mqttClient.loop();

  if (pumpStatus) {
    ledcWrite(0, 128); 
  } else {
    ledcWrite(0, 0);
  }
  
  unsigned long now = millis();
  if (now - lastMeasureTime >= measureInterval) {
    lastMeasureTime = now;

    // Read sensors
    float temperature = dht.readTemperature();
    float humidity = dht.readHumidity();

    int raw_soil = analogRead(SOIL_PIN);
    int soil_percent = map(raw_soil, 0, 4095, 0, 100); 

    if (isnan(temperature) || isnan(humidity)) {
      Serial.println("Loi doc DHT22!");
      return;
    }

    // Prepare JSON Payload
    String jsonPayload = "{\"sensorData\": {";
    jsonPayload += "\"temperature\": " + String(temperature, 2) + ", ";
    jsonPayload += "\"humidity\": " + String(humidity, 2) + ", ";
    jsonPayload += "\"moisture\": " + String(soil_percent);
    jsonPayload += "}}";

    String topic = "devices/" + String(deviceID) + "/data";

    // Debug print
    Serial.print("Publishing to " + topic + ": ");
    Serial.println(jsonPayload);
    
    mqttClient.publish(topic.c_str(), jsonPayload.c_str());

  
    if (autoMode) {
      bool warning = (temperature > TemperatureLimit || humidity > AirHumidityLimit || soil_percent > SoilMoistureLimit);
      
      // Control LEDs based on limits
      digitalWrite(RED_LED, warning ? HIGH : LOW);
      digitalWrite(GREEN_LED, warning ? LOW : HIGH);
    
    }
    // LCD Display
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("T:"); lcd.print(temperature, 1);
    lcd.print(" H:"); lcd.print(humidity, 0);
    lcd.print(" S:"); lcd.print(soil_percent);
    lcd.setCursor(0,1);
    lcd.print(" Mode:"); lcd.print(autoMode ? "Auto" : "Manual");
  }
}