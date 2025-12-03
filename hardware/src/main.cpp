#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WebServer.h>
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

// BUTTON DEBOUNCING
bool lastBtnState = HIGH;
unsigned long lastDebounceTime = 0;
const unsigned long DEBOUNCE_DELAY = 50;  // 50ms debounce

// TIMING
unsigned long lastHeartbeat = 0;
const unsigned long HEARTBEAT_INTERVAL = 5000;  // Send heartbeat every 5 seconds

// WEB SERVER (for receiving commands from backend)
WebServer server(80);

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

// Send rep update to backend
void sendRepUpdate() {
  if (WiFi.status() != WL_CONNECTED) return;
  if (!sessionActive) return;
  
  HTTPClient http;
  String url = String(BACKEND_URL) + "/api/hardware-rep";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  // Create JSON payload
  StaticJsonDocument<300> doc;
  doc["sessionId"] = currentSessionId;
  doc["repCount"] = repCount;
  doc["timestamp"] = millis();
  
  String payload;
  serializeJson(doc, payload);
  
  int httpCode = http.POST(payload);
  
  if (httpCode > 0) {
    Serial.println("Rep logged to backend: " + String(repCount));
  } else {
    Serial.println("Failed to log rep to backend");
  }
  
  http.end();
}

// WEB SERVER HANDLERS (receive commands from backend)

// Handle /start command - called when user clicks "Start Workout" in app
void handleStart() {
  Serial.println("COMMAND: START WORKOUT");
  
  // Parse JSON body
  if (server.hasArg("plain")) {
    String body = server.arg("plain");
    
    StaticJsonDocument<300> doc;
    DeserializationError error = deserializeJson(doc, body);
    
    if (!error) {
      currentSessionId = doc["sessionId"].as<String>();
      currentUserId = doc["userId"].as<String>();
      
      Serial.println("Session ID: " + currentSessionId);
      Serial.println("User ID: " + currentUserId);
      
      // Start the session
      sessionActive = true;
      repCount = 0;
      
      // Visual/audio feedback
      digitalWrite(GREEN_LED, HIGH);
      ledcWriteTone(BUZZER_CHANNEL, 1200);
      delay(200);
      ledcWriteTone(BUZZER_CHANNEL, 0);
      digitalWrite(GREEN_LED, LOW);
      
      Serial.println("Session started! Press button to count reps.");
      
      // Send success response
      StaticJsonDocument<200> responseDoc;
      responseDoc["success"] = true;
      responseDoc["message"] = "Session started";
      responseDoc["repCount"] = repCount;
      
      String response;
      serializeJson(responseDoc, response);
      server.send(200, "application/json", response);
    } else {
      server.send(400, "application/json", "{\"success\":false,\"error\":\"Invalid JSON\"}");
    }
  } else {
    server.send(400, "application/json", "{\"success\":false,\"error\":\"No body\"}");
  }
}

// Handle /stop command - called when user clicks "End Workout" in app
void handleStop() {
  Serial.println("COMMAND: STOP WORKOUT");
  Serial.println("Final rep count: " + String(repCount));
  
  // Celebration pattern
  celebrationPattern();
  
  // Send response with final rep count
  StaticJsonDocument<200> responseDoc;
  responseDoc["success"] = true;
  responseDoc["message"] = "Session ended";
  responseDoc["finalRepCount"] = repCount;
  
  String response;
  serializeJson(responseDoc, response);
  server.send(200, "application/json", response);
  
  // Reset session state
  sessionActive = false;
  currentSessionId = "";
  currentUserId = "";
  repCount = 0;
  
  ledsOff();
  
  Serial.println("Session ended");
}

// Handle /status request
void handleStatus() {
  StaticJsonDocument<300> doc;
  doc["sessionActive"] = sessionActive;
  doc["sessionId"] = currentSessionId;
  doc["userId"] = currentUserId;
  doc["repCount"] = repCount;
  doc["wifiConnected"] = (WiFi.status() == WL_CONNECTED);
  doc["ipAddress"] = WiFi.localIP().toString();
  
  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

// BUTTON REP COUNTING

void handleButton() {
  // Read button state
  bool currentBtnState = digitalRead(BTN_PIN);
  
  // Debouncing logic
  if (currentBtnState != lastBtnState) {
    lastDebounceTime = millis();
  }
  
  if ((millis() - lastDebounceTime) > DEBOUNCE_DELAY) {
    // Button state has been stable for DEBOUNCE_DELAY ms
    
    // Detect button press (LOW = pressed with INPUT_PULLUP)
    if (lastBtnState == HIGH && currentBtnState == LOW) {
      
      if (sessionActive) {
        // Button pressed during active session = count a rep
        repCount++;
        
        Serial.println("\n>>> REP #" + String(repCount) + " <<<");
        
        // For now, treat all reps as "good" (you can add form logic later)
        goodRep();
        
        // Send rep update to backend
        sendRepUpdate();
        
      } else {
        // Button pressed but no active session
        Serial.println("Button pressed, but no active workout session");
        badRep();  // Error feedback
      }
    }
  }
  
  lastBtnState = currentBtnState;
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
  pinMode(BTN_PIN, INPUT_PULLUP);
  
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
    
    // Start web server to receive commands
    server.on("/start", HTTP_POST, handleStart);
    server.on("/stop", HTTP_POST, handleStop);
    server.on("/status", HTTP_GET, handleStatus);
    server.begin();
    
    Serial.println("✓ Web server started on port 80");
    Serial.println("Backend URL: " + String(BACKEND_URL));
    
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
  // Handle incoming HTTP requests from backend
  server.handleClient();
  
  // Handle button presses for rep counting
  handleButton();
  
  // Send periodic heartbeat to backend
  unsigned long now = millis();
  if (now - lastHeartbeat >= HEARTBEAT_INTERVAL) {
    lastHeartbeat = now;
    sendHeartbeat();
  }
  
  // Small delay to prevent excessive CPU usage
  delay(10);
}