#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
  
// CONFIGURATION
const char* WIFI_SSID = "iPhone de Sebas";
const char* WIFI_PASSWORD = "Suma1221";
const char* BACKEND_URL = "http://54.183.150.186:3001";

// PIN DEFINITIONS
const int RED_LED   = 2; // Red LED for bad form/error
const int GREEN_LED = 15; // Green LED for good rep
const int SPEAKER   = 13; // Speaker/buzzer for audio feedback
const int BTN_PIN   = 0; // TTGO built-in button (GPIO 0)

// BUZZER/SPEAKER SETUP
const int BUZZER_CHANNEL = 0;
const int BUZZER_FREQ = 2000;  // 2kHz tone

// SESSION STATE
bool sessionActive = false;
String currentSessionId = "";
String currentUserId = "";
int repCount = 0;

// TIMING
unsigned long lastHeartbeat = 0;
const unsigned long HEARTBEAT_INTERVAL = 5000;  // Send heartbeat every 5 seconds
unsigned long lastPoll = 0;
const unsigned long POLL_INTERVAL = 1500;  // Poll for commands every 1.5 seconds

// LED & AUDIO FEEDBACK FUNCTIONS

// Flash green LED and play success tone
void goodRep() {
  Serial.println("✓ Good rep!");
  
  // Green LED ON
  digitalWrite(GREEN_LED, HIGH);
  digitalWrite(RED_LED, LOW);
  
  // Play success tone (short beep)
  ledcWriteTone(BUZZER_CHANNEL, 1000);  // 1kHz
  delay(100);
  ledcWriteTone(BUZZER_CHANNEL, 0);     // Off
  
  delay(400);
  digitalWrite(GREEN_LED, LOW);
}

// Flash red LED and play error tone
void badRep() {
  Serial.println("Bad form!");
  
  // Red LED ON
  digitalWrite(RED_LED, HIGH);
  digitalWrite(GREEN_LED, LOW);
  
  // Play error tone (lower frequency, longer)
  ledcWriteTone(BUZZER_CHANNEL, 500); // 500Hz
  delay(200);
  ledcWriteTone(BUZZER_CHANNEL, 0); // Off
  
  delay(400);
  digitalWrite(RED_LED, LOW);
}

// Turn off all LEDs and speaker
void ledsOff() {
  digitalWrite(RED_LED, LOW);
  digitalWrite(GREEN_LED, LOW);
  ledcWriteTone(BUZZER_CHANNEL, 0);
}

// Celebrate workout completion
void celebrationPattern() {
  Serial.println("Workout complete!");
  
  for (int i = 0; i < 3; i++) {
    digitalWrite(GREEN_LED, HIGH);
    ledcWriteTone(BUZZER_CHANNEL, 1500);
    delay(150);
    digitalWrite(GREEN_LED, LOW);
    ledcWriteTone(BUZZER_CHANNEL, 0);
    delay(150);
  }
}

// BACKEND COMMUNICATION FUNCTIONS

// Register this device with the backend
void registerDevice() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  HTTPClient http;
  String url = String(BACKEND_URL) + "/api/device/register";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  // Create JSON payload with device info
  StaticJsonDocument<200> doc;
  doc["deviceIp"] = WiFi.localIP().toString();
  
  String payload;
  serializeJson(doc, payload);
  
  int httpCode = http.POST(payload);
  
  if (httpCode > 0) {
    String response = http.getString();
    Serial.println("Device registered: " + response);
  } else {
    Serial.println("Failed to register device");
  }
  
  http.end();
}

// Send heartbeat to backend
void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  HTTPClient http;
  String url = String(BACKEND_URL) + "/api/device/heartbeat";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  StaticJsonDocument<200> doc;
  doc["sessionActive"] = sessionActive;
  doc["repCount"] = repCount;
  
  String payload;
  serializeJson(doc, payload);
  
  int httpCode = http.POST(payload);
  http.end();
}

// Poll backend for pending commands
void pollForCommands() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  HTTPClient http;
  String url = String(BACKEND_URL) + "/api/poll-commands";
  http.begin(url);
  
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String payload = http.getString();
    
    StaticJsonDocument<1024> doc;
    DeserializationError error = deserializeJson(doc, payload);
    
    if (!error) {
      JsonArray commands = doc["commands"];
      
      for (JsonObject cmd : commands) {
        String type = cmd["type"].as<String>();
        
        if (type == "start") {
          // Handle start workout
          currentSessionId = cmd["sessionId"].as<String>();
          currentUserId = cmd["userId"].as<String>();
          sessionActive = true;
          repCount = 0;
          
          Serial.println("\\n========================================");
          Serial.println("\u2713 WORKOUT STARTED!");
          Serial.println("Session ID: " + currentSessionId);
          Serial.println("User ID: " + currentUserId);
          Serial.println("Waiting for reps from camera...");
          Serial.println("========================================\\n");
          
          // Visual/audio feedback
          digitalWrite(GREEN_LED, HIGH);
          ledcWriteTone(BUZZER_CHANNEL, 1200);
          delay(200);
          ledcWriteTone(BUZZER_CHANNEL, 0);
          digitalWrite(GREEN_LED, LOW);
          
        } else if (type == "stop") {
          // Handle stop workout
          Serial.println("\\n========================================");
          Serial.println("\u2713 WORKOUT ENDED!");
          Serial.println("Final rep count: " + String(repCount));
          Serial.println("Session ID: " + currentSessionId);
          Serial.println("========================================\\n");
          
          celebrationPattern();
          
          sessionActive = false;
          currentSessionId = "";
          currentUserId = "";
          repCount = 0;
          ledsOff();
          
        } else if (type == "rep-feedback") {
          // Handle rep feedback
          int repNumber = cmd["repNumber"];
          bool isCorrect = cmd["isCorrect"];
          String repDuration = cmd["repDuration"].as<String>();
          
          Serial.println("\\n========================================");
          Serial.println("REP #" + String(repNumber));
          Serial.println("Form: " + String(isCorrect ? "GOOD" : "BAD"));
          Serial.println("Duration: " + repDuration + "s");
          Serial.println("========================================\\n");
          
          repCount = repNumber;
          
          if (isCorrect) {
            goodRep();
          } else {
            badRep();
          }
        }
      }
    }
  }
  
  http.end();
}





// ============================================
// SETUP
// ============================================

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("  TracKing Hardware - TTGO T-Display");
  
  // Configure GPIO pins
  pinMode(RED_LED, OUTPUT);
  pinMode(GREEN_LED, OUTPUT);
  
  digitalWrite(RED_LED, LOW);
  digitalWrite(GREEN_LED, LOW);
  
  // Configure buzzer/speaker with PWM
  ledcSetup(BUZZER_CHANNEL, BUZZER_FREQ, 8);
  ledcAttachPin(SPEAKER, BUZZER_CHANNEL);
  ledcWriteTone(BUZZER_CHANNEL, 0);
  
  Serial.println("Hardware initialized");
  
  // Connect to WiFi
  Serial.println("\nConnecting to WiFi: " + String(WIFI_SSID));
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✓ WiFi connected!");
    Serial.println("IP Address: " + WiFi.localIP().toString());
    
    // Flash green LED to indicate WiFi success
    digitalWrite(GREEN_LED, HIGH);
    delay(500);
    digitalWrite(GREEN_LED, LOW);
    
    // Register device with backend
    registerDevice();
    
    Serial.println("Backend URL: " + String(BACKEND_URL));
    Serial.println("Polling backend for commands every 1.5 seconds...");
    
  } else {
    Serial.println("\n✗ WiFi connection failed!");
    Serial.println("Please check your WIFI_SSID and WIFI_PASSWORD");
    
    // Flash red LED to indicate error
    for (int i = 0; i < 5; i++) {
      digitalWrite(RED_LED, HIGH);
      delay(200);
      digitalWrite(RED_LED, LOW);
      delay(200);
    }
  }
  
  Serial.println("Ready! Waiting for workout session...");
}

// MAIN LOOP

void loop() {
  unsigned long now = millis();
  
  // Send periodic heartbeat to backend
  if (now - lastHeartbeat >= HEARTBEAT_INTERVAL) {
    lastHeartbeat = now;
    sendHeartbeat();
  }
  
  // Poll for commands from backend
  if (now - lastPoll >= POLL_INTERVAL) {
    lastPoll = now;
    pollForCommands();
  }
  
  // Small delay to prevent excessive CPU usage
  delay(100);
}