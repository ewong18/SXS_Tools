# Sword x Shield EXP Reminder Creator iOS Shortcut

This is an iOS shortcut to creat an iOS reminder when you've leveled up to your target level. It also includes the daily free 2-hour speed up.

THIS IS REALLY ROUGH CODE. USE AT YOUR OWN RISK.

# Pre-requisites
- [`a-shell`](https://apps.apple.com/us/app/a-shell/id1473805438) app must be installed
  - `a-shell` is a local Unix terminal. We will store the Python assets there, and the shortcut will run the script
- device running iOS. (I've only tried this with iOS 26).
- iOS Shortcuts app


# Workflow
- The shortcut will ask for input variables:
  - Current level
  - Current XP (see this on the bottom of your character tab)
  - Taget level
  - EXP Rate Per Hour (see EXP/hr on your Bed)
- The shortcut passes the variables to an `a-shell` action to execute the python script
- Menu will show the datetime when you will reach the level
- A reminder will be created in  your reminders app with an alert with the time
- A pop up will notify you that a reminder has been created

# Setup

## a-shell
1. Install the a-shell app
1. Open the app, it will take you to a terminal
1. Create a folder to put your script
    - e.g. `mkdir Projects`
1. Navigate to that folder
    - e.g. `cd Projects`
1. Clone this repo
    - `lg2 clone https://github.com/ewong18/swordxshieldtools`
1. Test the script is working correctly 
    - e.g. `python3 swordxsheildtools/exp_calculator/calc_xp.py 104 2350000 106 254657`

## iOS Shortcut Creation
- Here is the share link of the shortcut, but
https://www.icloud.com/shortcuts/159118ddfefc41408915a9dd134bf368
