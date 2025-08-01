#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "YourWiFiSSID";
const char* password = "YourWiFiPassword";

// Static plant data for a single plant
struct PlantData {
  String scientificName = "Rosa alba";
  String plantType = "Flor";
  String irrigationMethod = "Gotejamento";
  int soilMoistureSchedule[4] = {60, 60, 60, 60}; // At 00:00, 06:00, 12:00, 18:00
  int luminosityMinLux = 10000;
  int luminosityMaxLux = 25000;
  String humidityRange = "60-80%";
  String temperatureRange = "18-25°C";
} plant;

// Dynamic plant data
struct DynamicData {
  int currentHumidity = 0;
  float timeToIrrigation = 24.0;
  bool isSuitableToWater = false;
} dynamicData;

// Environmental data
struct EnvironmentalData {
  String reservoirLevel = "Cheio";
  String pumpStatus = "Desligada";
  int luminosity = 0;
  int temperature = 0;
  int atmosphericHumidity = 0;
  bool uvLedStatus = false;
} envData;

// Initialize web server on port 80
AsyncWebServer server(80);

// Buffer for serial communication
String serialBuffer = "";

// Function to send command to Arduino and get response
String sendCommandToArduino(String command, int timeout = 1000) {
  Serial.println(command);
  serialBuffer = "";
  unsigned long startTime = millis();
  while (millis() - startTime < timeout) {
    while (Serial.available()) {
      char c = Serial.read();
      if (c == '\n') {
        String response = serialBuffer;
        serialBuffer = "";
        return response;
      }
      serialBuffer += c;
    }
  }
  return "";
}

// Format time from hours to HH:mm
String formatTime(float hours) {
  int totalMinutes = round(hours * 60);
  int h = totalMinutes / 60;
  int m = totalMinutes % 60;
  char buffer[6];
  sprintf(buffer, "%02d:%02d", h, m);
  return String(buffer);
}

void setup() {
  Serial.begin(9600); // Start Serial communication with Arduino
  delay(1000);

  // Connect to WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi...");
  }
  Serial.println("Connected to WiFi");
  Serial.println(WiFi.localIP());

  // Route to get static plant data
  server.on("/getPlantData", HTTP_GET, [](AsyncWebServerRequest *request) {
    DynamicJsonDocument doc(512);
    doc["nome_nome_cientifico"] = plant.scientificName;
    doc["tipo_planta"] = plant.plantType;
    doc["metodo_irrigacao_ideal"] = plant.irrigationMethod;
    JsonObject humiditySchedule = doc.createNestedObject("horarios_umidade_solo");
    humiditySchedule["00:00"] = plant.soilMoistureSchedule[0];
    humiditySchedule["06:00"] = plant.soilMoistureSchedule[1];
    humiditySchedule["12:00"] = plant.soilMoistureSchedule[2];
    humiditySchedule["18:00"] = plant.soilMoistureSchedule[3];
    JsonObject luminosity = doc.createNestedObject("luminosidade_ideal_lux");
    luminosity["min"] = plant.luminosityMinLux;
    luminosity["max"] = plant.luminosityMaxLux;
    doc["umidade_ar_ideal"] = plant.humidityRange;
    doc["temperatura_ideal_celsius"] = plant.temperatureRange;
    
    String response;
    serializeJson(doc, response);
    request->send(200, "application/json", response);
  });

  // Route to get dynamic plant data
  server.on("/getDynamicData", HTTP_GET, [](AsyncWebServerRequest *request) {
    // Request sensor data from Arduino
    String response = sendCommandToArduino("GET_SENSORS");
    if (response != "") {
      DynamicJsonDocument doc(256);
      deserializeJson(doc, response);
      dynamicData.currentHumidity = doc["soilMoisture"];
      envData.luminosity = doc["luminosity"];
      envData.temperature = doc["temperature"];
      envData.atmosphericHumidity = doc["humidity"];
      dynamicData.isSuitableToWater = envData.luminosity >= plant.luminosityMinLux && envData.luminosity <= plant.luminosityMaxLux;
      dynamicData.timeToIrrigation = max(0.0f, dynamicData.timeToIrrigation - 0.1f);
      if (dynamicData.timeToIrrigation == 0) dynamicData.timeToIrrigation = 24.0;
    }

    DynamicJsonDocument doc(256);
    doc["currentHumidity"] = dynamicData.currentHumidity;
    doc["timeToIrrigation"] = formatTime(dynamicData.timeToIrrigation);
    doc["isSuitableToWater"] = dynamicData.isSuitableToWater;
    
    String output;
    serializeJson(doc, output);
    request->send(200, "application/json", output);
  });

  // Route to get environmental data
  server.on("/getEnvironmentalData", HTTP_GET, [](AsyncWebServerRequest *request) {
    DynamicJsonDocument doc(256);
    doc["reservoirLevel"] = envData.reservoirLevel;
    doc["pumpStatus"] = envData.pumpStatus;
    doc["luminosity"] = envData.luminosity;
    doc["temperature"] = envData.temperature;
    doc["atmosphericHumidity"] = envData.atmosphericHumidity;
    doc["uvLedStatus"] = envData.uvLedStatus;
    
    String response;
    serializeJson(doc, response);
    request->send(200, "application/json", response);
  });

  // Route to toggle irrigation
  server.on("/toggleLED", HTTP_POST, [](AsyncWebServerRequest *request) {
    sendCommandToArduino("TOGGLE_PUMP");
    envData.pumpStatus = "Operando";
    dynamicData.currentHumidity = min(100, dynamicData.currentHumidity + 10);
    dynamicData.timeToIrrigation = 24.0;
    
    // Simulate pump operation (turn off after 5 seconds)
    // In a real scenario, Arduino would handle pump timing
    envData.pumpStatus = "Desligada"; // Simplified for demo
    
    request->send(200, "application/json", "{\"message\":\"Irrigation toggled\"}");
  });

  // Route to toggle UV LED
  server.on("/toggleUVLED", HTTP_POST, [](AsyncWebServerRequest *request) {
    envData.uvLedStatus = !envData.uvLedStatus;
    sendCommandToArduino(envData.uvLedStatus ? "UV_ON" : "UV_OFF");
    
    String message = "{\"message\":\"UV LED toggled, now " + String(envData.uvLedStatus ? "Ligado" : "Desligado") + "\"}";
    request->send(200, "application/json", message);
  });

  // Route to set plant data
  server.on("/setPlantData", HTTP_POST, [](AsyncWebServerRequest *request) {
    if (request->hasParam("data", true)) {
      String body = request->getParam("data", true)->value();
      DynamicJsonDocument doc(512);
      deserializeJson(doc, body);
      
      plant.scientificName = doc["nome_nome_cientifico"].as<String>();
      plant.plantType = doc["tipo_planta"].as<String>();
      plant.irrigationMethod = doc["metodo_irrigacao_ideal"].as<String>();
      JsonObject humiditySchedule = doc["horarios_umidade_solo"];
      plant.soilMoistureSchedule[0] = humiditySchedule["00:00"];
      plant.soilMoistureSchedule[1] = humiditySchedule["06:00"];
      plant.soilMoistureSchedule[2] = humiditySchedule["12:00"];
      plant.soilMoistureSchedule[3] = humiditySchedule["18:00"];
      plant.luminosityMinLux = doc["luminosidade_ideal_lux"]["min"];
      plant.luminosityMaxLux = doc["luminosidade_ideal_lux"]["max"];
      plant.humidityRange = doc["umidade_ar_ideal"].as<String>();
      plant.temperatureRange = doc["temperatura_ideal_celsius"].as<String>();
      
      request->send(200, "application/json", "{\"message\":\"Plant data updated\"}");
    } else {
      request->send(400, "application/json", "{\"message\":\"Data required\"}");
    }
  });

  // Start server
  server.begin();
}

void loop() {
  // Update dynamic data every 30 seconds
  static unsigned long lastUpdate = 0;
  if (millis() - lastUpdate >= 30000) {
    lastUpdate = millis();
    String response = sendCommandToArduino("GET_SENSORS");
    if (response != "") {
      DynamicJsonDocument doc(256);
      deserializeJson(doc, response);
      dynamicData.currentHumidity = doc["soilMoisture"];
      envData.luminosity = doc["luminosity"];
      envData.temperature = doc["temperature"];
      envData.atmosphericHumidity = doc["humidity"];
      envData.reservoirLevel = doc["reservoirLevel"].as<String>();
      dynamicData.isSuitableToWater = envData.luminosity >= plant.luminosityMinLux && envData.luminosity <= plant.luminosityMaxLux;
      dynamicData.timeToIrrigation = max(0.0f, dynamicData.timeToIrrigation - 0.1f);
      if (dynamicData.timeToIrrigation == 0) dynamicData.timeToIrrigation = 24.0;
    }
  }
}