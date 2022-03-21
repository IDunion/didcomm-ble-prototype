# aries-ble-poc
## Installation
Setup libindy for Linux
https://github.com/hyperledger/aries-framework-javascript/blob/main/docs/libindy/linux.md

## npm / yarn
npm install --global yarn

##  libindy
sudo apt install libzmq3-dev libsodium-dev libssl-dev
git clone https://github.com/hyperledger/indy-sdk.git
​cd indy-sdk/libindy
cargo build — release
sudo mv ./target/release/libindy.so /usr/local/lib/libindy.so
npx -p @aries-framework/node is-indy-installed

## Activate libindy
/usr/local/lib might not be in the library path that ldconfig uses. You can just do this:
ldconfig /usr/local/lib

## BLE
sudo apt-get install bluetooth bluez libbluetooth-dev libudev-dev libusb-1.0-0-dev

bluetoothd disabled, if BlueZ 5.14 or later is installed. Use sudo hciconfig hci0 up to power Bluetooth adapter up after stopping or disabling bluetoothd.
systemd
sudo systemctl stop bluetooth (once) x
sudo systemctl disable bluetooth (persist on reboot)
#sudo systemctl disable hciuart.service
sudo systemctl disable bluealsa.service


Running without root/sudo
Run the following command:

sudo setcap cap_net_raw+eip $(eval readlink -f `which node`)
This grants the node binary cap_net_raw privileges, so it can start/stop BLE advertising.

Note: The above command requires setcap to be installed, it can be installed using the following:

apt: sudo apt-get install libcap2-bin
yum: su -c \'yum install libcap2-bin\'

If GATT Server always disconnects
https://github.com/abandonware/bleno/issues/30

## modules
yarn install

# Start
yarn start:dev



Ref:
https://medium.com/@AnimoSolutions/how-to-install-libindy-for-linux-to-use-with-aries-framework-javascript-3470453dd233
https://github.com/abandonware/bleno