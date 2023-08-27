# Scinan Reborn
Since the original app by Petter Ruud seems to be abandoned and i was in need for this app to work, i have tried to to my best without any coding knowledge to make this happend. 

Learing curve is steep but i had made some progress.

# Saswell
Support wifi climate controllers using the Saswell API https://api.saswell.com.cn

# Scinan
Support wifi climate controllers using the Scinan API https://api.scinan.com.

## Supported Devices
It seems that this app will work with any device that make use of the Scinan or Saswell Api and/or the Smart-E / Thermostat app on Iphone/Android

it is confirmed by Petter Ruud that it works with the two listed below and i can confirm this indeed works with the new Pergo Quick Heat NEQHKITWIFI that looks similar to the Prosmart PST50W

There are probably more devices supported. Open a issue and I'll try to find out.


#### Saswell
 - SAS920FHL-7W-WIFI

#### Prosmart
 - PST50W

#### Pergo QuickHeat
 - The new one sold in Coop OBS Bygg (Norway)

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

Rework 0.1.0
-  Corrected the "forEach is not a function" during pairing
-  Fixed so token again will be obtained from scinan.
-  Rework of the app, it should now work with the V2 Saswell API (Thermostat App from Saswell)
-  Added two new standard devices. Scinan using API v1 and Saswell using API v2

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
