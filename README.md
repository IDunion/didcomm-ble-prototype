# Scope
This repository is meant as a technical demonstration of DIDcomm via bluetooth.

***This repository is a Proof of Concept and NOT meant for production.***

# Motivation
Communication between devices - especially IoT-Device or Machines - are often not possible over HTTP as there might be no direct internet connection or no possibility to reach devices in their environment. For this purpose another kind of transport layer has to be used for direct communication between to entities that.
First ideas have been developed by using DIDcomm communication over NFC. Problems have been identified when trying to use the NFC stack on Apple Devices which is very limited. An alternative approach for direct device communication beside *HTTP* could be bluetooth. For simplicity we have chosen in the first iteration an *write-only* approach that doesn´t use reading of characteristics values but writing to another device. The second approach in Iteration 2 uses the describe setup in [DIDComm over Bluetooth
](https://github.com/decentralized-identity/didcomm-bluetooth/blob/main/spec.md).

This project is split into 2 parts:
- ble-verifier: embedded site based on aries-framework-javascript, runs on any kind of embedded linux - e.g. raspberry pi 4
- <TODO>: mobile implementation based on the aries-framework-dotnet

For further information, please refer to the readme files in the corresponding folders.