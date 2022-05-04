# Scope
This repository is meant as a technical demonstration of DIDcomm via bluetooth.

***This repository is a Proof of Concept and NOT meant for production.***

# Motivation
Communication between devices - especially IoT-Device or Machines - are often not possible over HTTP as there might be no direct internet connection or no possibility to reach devices in their environment. For this purpose another kind of transport layer has to be used for direct communication between to entities that.
First ideas have been developed by using DIDcomm communication over NFC. Problems have been identified when trying to use the NFC stack on Apple Devices which is very limited. An alternative approach for direct device communication beside *HTTP* could be bluetooth. For simplicity we have chosen in the first iteration an *write-only* approach that doesn´t use reading of characteristics values but writing to another device. The second approach in Iteration 2 uses the describe setup in [DIDComm over Bluetooth
](https://github.com/decentralized-identity/didcomm-bluetooth/blob/main/spec.md).

# Iteration 1
Iteration 1 uses *peripherial* and *central* mode for each agent at the same time for communication. Every agent has its own GATT-Server with a writeable Service/Characteristic which can be written by another *central* device. Replies will be supplied through the *central* role by writing back to the originated sending agents Gatt-Server.

## Generic Steps
1. Two DIDComm enabled systems (A & B) will start as peripheral and central mode at the same time. Both will advertise DIDComm service on a specific service/characteristic UUID.
2. One system (A) starts interaction by searching for another system advertising the previously defined service/characteristic UUIDs
3. Once the system has found a system (B) with matching UUIDs it will write on the characteristic its message
4. The message-receiving system (B) handles the reveived message (agent) and prepares a response if needed
5. The system (B) starts the same progress like the other system (Step 2-4)

## Steps (connection example)
1. Starting Agent A & B with parameters for Service UUID and Characteristic UUID (opens Gatt Server depending on chosen parameters)
2. A generates invitation and posts it to a REST-endpoint of B

Connection Invitation Call

```curl -X POST -H "Content-Type: application/json" -d '{"@type":"https://didcomm.org/connections/1.0/invitation","@id":"afe8075e-bd28-4f9a-942d-8174d53041a1","label":"","recipientKeys":["2szyCNQDaJeMdZm8dViGHnXZYg1krvuw7oUuoZnCXUUN"],"serviceEndpoint":"ble://dc:a6:32:12:22:b7","routingKeys":[]}' "http://xxx.xxx.xxx.xxx:8080/invitation"```

Tthe service endpoint uses the prefix *ble* which allows to route the communication over ble transport layer and the device ID as service endpoint.

3. A posts created invitation on a rest endpoint of B

Connection Invitation
```{"@type":"https://didcomm.org/connections/1.0/invitation","@id":"afe8075e-bd28-4f9a-942d-8174d53041a1","label":"","recipientKeys":["2szyCNQDaJeMdZm8dViGHnXZYg1krvuw7oUuoZnCXUUN"],"serviceEndpoint":"ble://dc:a6:32:12:22:b7","routingKeys":[]}```

4. B receives the invitation and starts connection establishment over ble transport layer (ble prefix) by activating discovery mode in *central* role (noble). The to be searched device is defined in the invitation/serviceEndpoint behind ble.
5. When B discovered a device with the same device ID it will connect and discover all services and characteristics searching for a predefined service id and characteristic id.
6. When B finds a matching service and characteristic it writes to the discovered characteristic the answer defined in the protocol.
7. A receives a write call on its characteristic and routes the input to the agent.
8. When A wants to reply the process of B (4-6) is applicable independent of the message type

## Open Challenges
- Problems with libraries (When one device is writing to the other, the other is in most cases not yet ready in peripherial mode - switching between peripherial to central and back is not atomic)
- Re-using of existing connection for direct response
- Initiate Connection / Invitation (currently out of band). NFC options?

# Iteration 2
Instead of heaving both roles (peripherial and central) active at the same time in one device iteration 2 focus on having explicit one role at a time. This concept is following the spec [DIDComm over Bluetooth
](https://github.com/decentralized-identity/didcomm-bluetooth/blob/main/spec.md)

# aries-ble-poc
## Installation
Setup libindy for Linux
https://github.com/hyperledger/aries-framework-javascript/blob/main/docs/libindy/linux.md

## npm / yarn
Tested with node version v16.13.2

```bash=
npm install --global yarn
```
##  libindy
```bash=
sudo apt install libzmq3-dev libsodium-dev libssl-dev
sudo apt-get install -y build-essential pkg-config cmake libssl-dev libsqlite3-dev libzmq3-dev  libncursesw5-dev

git clone https://github.com/hyperledger/indy-sdk.git

​cd indy-sdk/libindy

cargo build — release

sudo mv ./target/release/libindy.so /usr/local/lib/libindy.so
# Check if libindy is correct installed
npx -p @aries-framework/node is-indy-installed
```
## Activate libindy
`/usr/local/lib` might not be in the library path that ldconfig uses. You can just do this:
```bash=
ldconfig /usr/local/lib
```

## BLE
```bash=
sudo apt-get install bluetooth bluez libbluetooth-dev libudev-dev libusb-1.0-0-dev

# Disable Bluetooth
sudo systemctl stop bluetooth (once)
sudo systemctl disable bluetooth (persist on reboot)
# sudo systemctl disable hciuart.service
# sudo systemctl disable bluealsa.service

# After bluetoothd disabled, if BlueZ 5.14 or later is installed. Use
sudo hciconfig hci0 up
# to power Bluetooth adapter up after stopping or disabling bluetoothd.

```

### Remove need for root/sudo
```bash=
sudo setcap cap_net_raw+eip $(eval readlink -f `which node`)
```
This grants the node binary cap_net_raw privileges, so it can start/stop BLE advertising.

Note: The above command requires setcap to be installed, it can be installed using the following:
```bash=
sudo apt-get install libcap2-bin
```

### Errors
1. If GATT Server always disconnects
   - https://github.com/abandonware/bleno/issues/30

## modules
yarn install

# Start
yarn start:dev

# Running Flow
Request Connection Invitation
```bash=
curl -X POST "http://xxx.xxx.xxx.xxx:8080/createconnection"
```
POST Request to other party
```bash=
curl -X POST -H "Content-Type: application/json" -d '{"@type":"https://didcomm.org/connections/1.0/invitation","@id":"xxxxx","label":"","recipientKeys":["xxxxxxxxx"],"serviceEndpoint":"ble://xx:xx:xx:xx:xx:xx","routingKeys":[]}' "http://xxx.xxx.xxx.xxx:8080/invitation"
```

# Notes
Ref:
https://medium.com/@AnimoSolutions/how-to-install-libindy-for-linux-to-use-with-aries-framework-javascript-3470453dd233
https://github.com/abandonware/bleno