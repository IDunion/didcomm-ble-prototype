

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

```bash
curl -X POST -H "Content-Type: application/json" -d '{"@type":"https://didcomm.org/connections/1.0/invitation","@id":"afe8075e-bd28-4f9a-942d-8174d53041a1","label":"","recipientKeys":["2szyCNQDaJeMdZm8dViGHnXZYg1krvuw7oUuoZnCXUUN"],"serviceEndpoint":"ble://dc:a6:32:12:22:b7","routingKeys":[]}' "http://xxx.xxx.xxx.xxx:8080/invitation"
```

Tthe service endpoint uses the prefix *ble* which allows to route the communication over ble transport layer and the device ID as service endpoint.

3. A posts created invitation on a rest endpoint of B

Connection Invitation
```bash
{"@type":"https://didcomm.org/connections/1.0/invitation","@id":"afe8075e-bd28-4f9a-942d-8174d53041a1","label":"","recipientKeys":["2szyCNQDaJeMdZm8dViGHnXZYg1krvuw7oUuoZnCXUUN"],"serviceEndpoint":"ble://dc:a6:32:12:22:b7","routingKeys":[]}
```

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

## node / yarn
Tested with node version v16.18.0

##  libindy
```bash
sudo apt install libzmq3-dev libsodium-dev libssl-dev (needs to be installed even if not build on device)
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
```bash
sudo ldconfig /usr/local/lib
```

## BLE
```bash
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

### Remove need for root / sudo
```bash
sudo setcap cap_net_raw+eip $(eval readlink -f `which node`)
```
This grants the node binary cap_net_raw privileges, so it can start/stop BLE advertising.

Note: The above command requires setcap to be installed, it can be installed using the following:
```bash
sudo apt-get install libcap2-bin
```

### Errors
1. If GATT Server always disconnects
   - https://github.com/abandonware/bleno/issues/30

## Modules
```bash
yarn install
```

# Get started
```bash
yarn start
```

## Running Flow
When starting the agent a small REST interface will also be spawned for testing and initiating communication flows. The interface is available under http://xxx.xxx.xxx.xxx:8080/ with endpoints for connections, createInvitations, receiveInvitations.

Start two devices one as central and another as peripherial (Setup via config/agent.yaml $blemode)
Request Connection Invitation (peripheral)
```bash
curl -X POST "http://xxx.xxx.xxx.xxx:8080/createconnection"

#  Output Example
{"@type":"https://didcomm.org/connections/1.0/invitation","@id":"edbb9aa2-eec5-4287-bac7-a4c171425236","label":"","recipientKeys":["HqQDpexVqxKw8dacs4TtKAHU4AB4hbK6UdcT9nHtJKQd"],"serviceEndpoint":"ble://dc:a6:32:12:22:b7","routingKeys":[]}
```

POST Invitation Offer (central)
```bash
curl -X POST -H "Content-Type: application/json" -d '{"@type":"https://didcomm.org/connections/1.0/invitation","@id":"xxxxx","label":"","recipientKeys":["xxxxxxxxx"],"serviceEndpoint":"ble://xx:xx:xx:xx:xx:xx","routingKeys":[]}' "http://xxx.xxx.xxx.xxx:8080/invitation"
```

Like written in the spec document (DIDComm over Bluetooth) the central devices starts scanning for a device mac based on the invitation and the two respective characteristics (write / read) which are defined in agent.yaml. <i>ble</i> is registered (serviceEndpoint prefix) for ble transport so the agent will use the ble transport-protocol for inbound / outbound communication. After the central device has found a device that matches the MAC and UUIDs for the characteristics it will start writing to the write characteristic on the peripheral device and subscribe for the answer on the read characteristic. The peripheral device process the incomming message and writes the answer on its read characteristic. After a successful read of the central it will wipe the content. The scenario has been successfully testet with two devices and a connection establishment communication.

# Measures
- By testing the communication speed
   1. Receive Invitation by POST on REST endpoint
   2. Search for a device that offers both (read & write) characteristic that matches the pre-defined ones
   3. Connect to device and write the answer of the connection invitation to the characterstic
   4. Subscribe to read charactersistic for answer
- The whole process takes around xx ms

# Open Points & Considerations
- <i>Both</i> mode is currently experimental
- Encryption of BLE connection is out of scope
- Currently only one connection at a time is possible to handle
   - Should there be an intent from the central device beforehand that the read-characteristic will be filled with related data?
   - ...

# Notes
Ref:
- https://medium.com/@AnimoSolutions/how-to-install-libindy-for-linux-to-use-with-aries-framework-javascript-3470453dd233
- https://github.com/abandonware/bleno
- https://github.com/abandonware/noble