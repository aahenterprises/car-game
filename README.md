# Night Drive Pro

A realistic arcade car driving game built by **AAH Enterprises**. Steer with a real steering wheel, shift gears, use the horn and indicators, and obey strict traffic rules across 8 levels. It runs directly in the browser on phones, tablets and desktops. No install, no server and no libraries.

## Features

**Driving**
- On-screen steering wheel that returns to centre when released
- Three steering controls: Wheel, Arrow buttons or Touch drag
- Five-speed gearbox with speedometer and RPM bar
- Auto or Manual gearbox (shift up and down yourself)
- Brake, Nitro boost (3 seconds, smash through traffic) and a cooldown
- Engine sound that follows your RPM

**Horn and indicators**
- Three horn sounds: Classic, Sport and Truck
- Horn makes the cars ahead move out of your lane
- Left and right indicators with blinking lights on the car
- Signal before changing lanes to earn bonus points

**Strict levels**
- 8 levels from Country Road to Death Road
- Each level has a lower speed limit and denser traffic
- Speed limit sign on screen, with a fine if you keep speeding
- Penalty for changing lanes without signalling (Strict rules mode)

**Choices**
- 6 cars, each with its own top speed and handling
- Change car from the main menu or in the middle of a game
- Game speed: Normal, Fast and Extreme (higher speed gives higher score)
- Difficulty: Easy, Normal and Hard
- Settings: sound, horn, steering control, sensitivity, gearbox, game speed, traffic rules, difficulty, speed unit (km/h or mph), button size, screen shake and fullscreen
- Best score and all settings are saved in the browser

**Design**
- Animated loading logo
- Night blue, cyan, lime and orange colour theme
- Particle effects and sound effects generated in code
- Responsive layout, works in fullscreen

## Controls

| Action | Keyboard | Touch |
|---|---|---|
| Steer | Arrow keys or A / D | Wheel, arrows or drag |
| Gear up / down | E or W / Q | Gear buttons |
| Brake | S or Space | BRAKE button |
| Nitro | Shift or N | NITRO button |
| Horn | H | HORN button |
| Indicators | Z (left), C (right) | Arrow buttons next to the wheel |
| Game menu | P or Esc | Three-line button |

## Built with

- HTML5 Canvas for the game graphics
- CSS3 (gradients, grid, animations)
- JavaScript (game loop, physics, collision detection, state management)
- Web Audio API for engine, horn and effect sounds
- localStorage for saving settings and best score
- Pointer Events (touch and mouse) and Fullscreen API

## How to run

1. Download or clone this repository.
2. Open `index.html` in any modern browser.
3. Press **Start game**.

No installation is needed.

## What this project shows

- A real-time game loop with `requestAnimationFrame`
- Vehicle speed, gear and RPM simulation
- Collision detection and a state machine (menu, playing, paused, game over)
- Custom touch controls (rotating steering wheel)
- A complete settings system saved between sessions

## Project structure<img width="1308" height="607" alt="car0" src="https://github.com/user-attachments/assets/995885be-e346-4281-bfe3-9d07efed10f9" />
<img width="1234" height="602" alt="car1" src="https://github.com/user-attachments/assets/2947cdfe-43d1-4188-b71b-31892d371615" />
<img width="1247" height="594" alt="car2" src="https://github.com/user-attachments/assets/a3287a0a-be63-41e4-990c-72868666c5f2" />
<img width="1232" height="546" alt="car3" src="https://github.com/user-attachments/assets/4d8c1604-df48-45c9-a30a-8d6272cdee97" />
<img width="1229" height="346" alt="car4" src="https://github.com/user-attachments/assets/b2660d0b-6541-4fc7-9da3-ba7f5a8249e8" />
<img width="1291" height="554" alt="car5" src="https://github.com/user-attachments/assets/0ec648ef-641c-415b-a096-feb49aea59a9" />
<img width="1172" height="312" alt="car6" src="https://github.com/user-attachments/assets/e3ec6d84-6723-4c3e-a92b-528278a24a93" />
<img width="1272" height="583" alt="car7" src="https://github.com/user-attachments/assets/c9d19674-5cfb-4f12-baba-a656f2a00298" />
<img width="1255" height="584" alt="car8" src="https://github.com/user-attachments/assets/623e0bb4-7c1c-4502-b985-5aa8910cd709" />
<img width="1261" height="579" alt="car9" src="https://github.com/user-attachments/assets/d85bcbd9-320a-4b16-b6c9-bc2f6c20d974" />
