// Study Focus Tracker - Arduino Uno firmware
//
// - HC-SR04 ultrasonic sensor detects whether someone is sitting at the desk.
// - A button starts/stops a study session; the LED is on during a session.
// - Focus time only counts while a session is running AND someone is present.
// - Prints one JSON event per line over serial (115200 baud) for the laptop logger.

const uint8_t TRIG_PIN = 9;
const uint8_t ECHO_PIN = 10;
const uint8_t BUTTON_PIN = 2;  // other leg to GND, uses INPUT_PULLUP
const uint8_t LED_PIN = 13;

// Presence detection
const float PRESENT_DISTANCE_CM = 70.0;      // closer than this = someone at the desk
const unsigned long PRESENT_CONFIRM_MS = 3000;  // must be near this long to count as present
const unsigned long AWAY_CONFIRM_MS = 5000;     // must be far this long to count as away
const unsigned long MEASURE_INTERVAL_MS = 200;

// Button
const unsigned long DEBOUNCE_MS = 50;

// Status heartbeat while a session is running
const unsigned long STATUS_INTERVAL_MS = 60000;

bool sessionActive = false;
bool present = false;

unsigned long sessionStartMs = 0;
unsigned long focusMs = 0;          // focus time accumulated in the current session
unsigned long lastFocusUpdateMs = 0;

unsigned long nearSinceMs = 0;      // 0 = not currently near
unsigned long farSinceMs = 0;       // 0 = not currently far
unsigned long lastMeasureMs = 0;
unsigned long lastStatusMs = 0;

int lastButtonReading = HIGH;
int buttonState = HIGH;
unsigned long lastButtonChangeMs = 0;

float readDistanceCm() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  // 30 ms timeout is about 5 m; 0 means no echo (nothing in range)
  unsigned long duration = pulseIn(ECHO_PIN, HIGH, 30000UL);
  if (duration == 0) {
    return -1.0;
  }
  return duration / 58.0;  // speed of sound: ~58 us per cm round trip
}

void printEvent(const char* name) {
  Serial.print(F("{\"event\":\""));
  Serial.print(name);
  Serial.print(F("\",\"ms\":"));
  Serial.print(millis());
  if (sessionActive) {
    Serial.print(F(",\"focus_ms\":"));
    Serial.print(focusMs);
    Serial.print(F(",\"session_ms\":"));
    Serial.print(millis() - sessionStartMs);
  }
  Serial.println(F("}"));
}

// Add the time since the last update to focusMs if we're focusing.
void updateFocusTime(unsigned long now) {
  if (sessionActive && present) {
    focusMs += now - lastFocusUpdateMs;
  }
  lastFocusUpdateMs = now;
}

void setPresent(bool value, unsigned long now) {
  if (present == value) return;
  updateFocusTime(now);
  present = value;
  printEvent(present ? "present" : "away");
}

void startSession(unsigned long now) {
  sessionActive = true;
  sessionStartMs = now;
  focusMs = 0;
  lastFocusUpdateMs = now;
  lastStatusMs = now;
  digitalWrite(LED_PIN, HIGH);
  printEvent("session_start");
}

void endSession(unsigned long now) {
  updateFocusTime(now);
  printEvent("session_end");  // includes final focus_ms and session_ms
  sessionActive = false;
  digitalWrite(LED_PIN, LOW);
}

void handleButton(unsigned long now) {
  int reading = digitalRead(BUTTON_PIN);
  if (reading != lastButtonReading) {
    lastButtonChangeMs = now;
    lastButtonReading = reading;
  }
  if (now - lastButtonChangeMs > DEBOUNCE_MS && reading != buttonState) {
    buttonState = reading;
    if (buttonState == LOW) {  // pressed (pull-up)
      if (sessionActive) {
        endSession(now);
      } else {
        startSession(now);
      }
    }
  }
}

void handlePresence(unsigned long now) {
  if (now - lastMeasureMs < MEASURE_INTERVAL_MS) return;
  lastMeasureMs = now;

  float cm = readDistanceCm();
  bool near = cm > 0 && cm < PRESENT_DISTANCE_CM;

  if (near) {
    farSinceMs = 0;
    if (nearSinceMs == 0) nearSinceMs = now;
    if (!present && now - nearSinceMs >= PRESENT_CONFIRM_MS) setPresent(true, now);
  } else {
    nearSinceMs = 0;
    if (farSinceMs == 0) farSinceMs = now;
    if (present && now - farSinceMs >= AWAY_CONFIRM_MS) setPresent(false, now);
  }
}

void setup() {
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  Serial.begin(115200);
  printEvent("boot");
}

void loop() {
  unsigned long now = millis();
  handleButton(now);
  handlePresence(now);

  if (sessionActive && now - lastStatusMs >= STATUS_INTERVAL_MS) {
    updateFocusTime(now);
    lastStatusMs = now;
    printEvent("status");
  }
}
