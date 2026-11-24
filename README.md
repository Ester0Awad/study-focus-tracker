# Study Focus Tracker

A desk device that tracks how long I actually study. An Arduino detects when I'm sitting at my desk, a button starts and stops study sessions, and a web dashboard shows my focus time per day.

**Why:** I wanted real numbers on my study habits instead of guessing. Timers and apps don't know if I actually stayed at my desk. This does.

## How it works

```
[Ultrasonic sensor] --\
                       +--> [Arduino Uno] --USB serial--> [Laptop logger] --> sessions.json --> [Web dashboard]
[Button] + [LED] -----/
```

1. **Arduino Uno** measures the distance to my chair with an ultrasonic sensor. If something is closer than a threshold for a few seconds, I'm "at the desk."
2. **Button** starts and stops a study session. The **LED** is on while a session is running.
3. During a session, time only counts as **focus time** while I'm at the desk, so breaks are excluded automatically.
4. The Arduino prints one JSON event per line over USB serial.
5. A **Node.js logger** on my laptop reads those events and saves sessions to a file.
6. A **web dashboard** charts focus minutes per day.

## Parts

| Part | Qty | Notes |
|---|---|---|
| Arduino Uno | 1 | |
| HC-SR04 ultrasonic distance sensor | 1 | Usually included in Arduino starter kits |
| Push button | 1 | |
| LED + 220 Ω resistor | 1 | |
| Breadboard + jumper wires | | |
| USB cable | 1 | Power + data to the laptop |

## Wiring

| Arduino pin | Connects to |
|---|---|
| 5V | HC-SR04 VCC |
| GND | HC-SR04 GND, button, LED (via resistor) |
| D9 | HC-SR04 TRIG |
| D10 | HC-SR04 ECHO |
| D2 | Button (other leg to GND; uses the internal pull-up) |
| D13 | LED (+ leg), LED (−) leg through 220 Ω to GND |

## Roadmap

- [x] Project plan, parts and wiring
- [ ] Arduino firmware: presence detection, button, LED, JSON events over serial
- [ ] Laptop logger: read serial events, save sessions
- [ ] Web dashboard: focus minutes per day
- [ ] Photos, wiring diagram and demo video
- [ ] Stretch: weekly goals, streaks, and a small OLED display on the device

## License

MIT
