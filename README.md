# Scope
This repository is meant as a technical demonstration of DIDcomm via bluetooth.

***This repository is a Proof of Concept and NOT meant for production.***

# Verifier
The verifier uses the aries-framework-javascript and spawns a nodejs based aries agent with added ble support.


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

After bluetoothd disabled, if BlueZ 5.14 or later is installed. Use sudo hciconfig hci0 up to power Bluetooth adapter up after stopping or disabling bluetoothd.

```

### Remove need for root/sudo
```bash=
sudo setcap cap_net_raw+eip $(eval readlink -f `which node`)
```
This grants the node binary cap_net_raw privileges, so it can start/stop BLE advertising.

Note: The above command requires setcap to be installed, it can be installed using the following:
```bash=
apt: sudo apt-get install libcap2-bin
```

### Errors
#### If GATT Server always disconnects
https://github.com/abandonware/bleno/issues/30

## modules
yarn install

# Start
yarn start:dev

# Notes
Ref:
https://medium.com/@AnimoSolutions/how-to-install-libindy-for-linux-to-use-with-aries-framework-javascript-3470453dd233
https://github.com/abandonware/bleno