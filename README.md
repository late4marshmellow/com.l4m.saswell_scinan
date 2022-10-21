# Scinan Reborn
Since the original app by Petter Ruud seems to be abandoned and i was in need for this app to work, i have tried to to my best without any coding knowledge to make this happend. 

Learing curve is steep but i had made some progress.

What is fixed and what is left to figure out.

# Fixed
Corrected the code that results in forEach is not a function during pairing

# To-Be fixed
It seems that Scinan has done some changes in how tokens should be obtained, the current way seems to just open a window to log in where you need to input your username and password (again) this window would naturally not show up in Homey dialog and results in no new devices found.

- i have sucsessfully obtained this token manually and added my thermostats by tinker with the code and hardcode my token. 
if anyone with javascript knowledge would like to point me in the right direction, its appreciated. 

feel free to contribute :)


# Scinan
Support wifi climate controllers using the Scinan API https://api.scinan.com.

## Supported Devices
It seems that this app will work with any device that make use of the Scinan Api and/or the Smart-E app on Iphone/Android

it is confirmed by Petter Ruud that it works with the two listed below and i can confirm this indeed works with the new Pergo Quick Heat NEQHKITWIFI that looks similar to the Prosmart PST50W

There are probably more devices supported. Open a issue and I'll try to find out.


#### Saswell
 - SAS920FHL-7W-WIFI

#### Prosmart
 - PST50W

## Supported features
 - [x] Turn On/Off
 - [x] Set Away/Home
 - [x] View/Set target temperature
 - [x] View mesured tempature
 - [x] View/Set mode (Comfort, Day or Night or Auto)
 - [ ] Program

## Supported Languages:
 - English
 - Norwegian

## Release notes

1.4
- Added Norwegian Locale

1.3
- Added support for Homey Energy
- Fixed sync

1.2
- Small fixes

1.1
- Added mode

1.0
- Initial
