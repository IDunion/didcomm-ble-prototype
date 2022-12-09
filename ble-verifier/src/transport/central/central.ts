// Copyright (c) 2022 - for information on the respective copyright owner see the NOTICE file or the repository https://github.com/idunion/didcomm-ble-prototype.
//
// SPDX-License-Identifier: Apache-2.0

import type { Logger } from '@aries-framework/core'
import noble = require('@abandonware/noble')

interface ConnectedDevice {
  peripheral: noble.Peripheral
  writeCharacteristic: noble.Characteristic
}

export class TransportCentral {
  private readCharacteristicUUID: string
  private writeCharacteristicUUID: string
  private serviceUUID: string
  private logger!: Logger
  private inboundCB: (data?: Buffer) => void
  private connectedDevices: Map<string, ConnectedDevice>

  constructor(serviceUUID: string, readCharacteristic: string, writeCharacteristic: string, logger: Logger, inboundCB: (data?: Buffer) => void) {
    this.readCharacteristicUUID = parseUUID(readCharacteristic)
    this.writeCharacteristicUUID = parseUUID(writeCharacteristic)
    this.serviceUUID = parseUUID(serviceUUID)
    this.logger = logger
    this.inboundCB = inboundCB
    this.connectedDevices = new Map<string, ConnectedDevice>();
  }

  public async stop(): Promise<void> {
    await noble.stopScanningAsync();
    noble.removeAllListeners();
    noble.reset()
  }

  public sendMessage(uuid: string, payload: string): Promise<void> {
    // Convert to noble UUID format
    const deviceUUID = parseUUID(uuid)
    const data = Buffer.from(payload)
    const connectedDevices = this.connectedDevices
    const logger = this.logger
    const service = this.serviceUUID
    const readChar = this.readCharacteristicUUID
    const writeChar = this.writeCharacteristicUUID
    const timeoutDiscovery = 10000
    const timeoutResponse = 10000

    let timeoutId: NodeJS.Timeout
    let discoveredPeripheral: noble.Peripheral
    let cancel = () => {
      logger.debug('Disconnecting from device')
      if (discoveredPeripheral) {
        discoveredPeripheral.disconnectAsync()
      }
      noble.stopScanningAsync()
      noble.removeAllListeners('discover')
      noble.cancelConnect(deviceUUID)
    }

    if(connectedDevices.has(deviceUUID)) {
      this.logger.debug('Already connected to device, no need for discovery')
      let device = connectedDevices.get(deviceUUID)
      return new Promise<void>(function (resolve, reject) {
        device?.writeCharacteristic.writeAsync(data, true).catch((error): void => {
          logger.error('Error writing to characteristic: ' + error)
          cancel()
          reject()
        }).then(_ => {
          logger.debug('Successfully sent message')
          resolve()
        })
      })
    }
    this.logger.debug('Searching for BLE device with UUID: ' + deviceUUID)

    const discoveryTimeout = new Promise<void>((_, reject) => {
      timeoutId = setTimeout(() => {
        logger.error("BLE Discovery Timeout")
        cancel()
        reject('BLE Discovery Timeout')
      }, timeoutDiscovery, 'BLE Device discovery timeout');
    });

    const _this = this;
    const discovery = new Promise<void>(function (resolve, reject) {
      noble.on('discover', async (peripheral: noble.Peripheral) => {
        logger.debug('Found BLE device ' + peripheral.uuid)
        if (peripheral.uuid === deviceUUID) {
          let _cancel = () => {
            clearTimeout(timeoutId)
            cancel()
          }
          // device UUID and service UUID match
          discoveredPeripheral = peripheral
          logger.debug('BLE device matches expected endpoint')
          await noble.stopScanningAsync().catch((error): void => {
            logger.error('Could not stop scanning: ' + error)
            reject()
          })
          logger.debug('Connecting to BLE device')
          discoveredPeripheral.connectAsync().catch((error): void => {
            logger.error('Could not connect to BLE device: ' + error)
            _cancel()
            reject()
          }).then(async () => {
            logger.debug('Getting Characteristics')
            discoveredPeripheral.discoverSomeServicesAndCharacteristicsAsync([service], [readChar, writeChar]).then((serviceAndChars) => {
              logger.debug('Successfully found expected Services/Characteristics')
              let characteristics = serviceAndChars.characteristics
              let writeCharacteristic = characteristics.find(element => element.uuid == writeChar)
              let readCharacteristic = characteristics.find(element => element.uuid == readChar)
              if (writeCharacteristic && readCharacteristic) {
                logger.debug('Sending ' + payload)
                writeCharacteristic.writeAsync(data, true).catch((error): void => {
                  logger.error("Error writing to characteristic: " + error)
                  _cancel()
                  reject()
                }).then(() => {
                  logger.debug('Successfully sent message, registering for possible answers')
                  // Remember device
                  connectedDevices.set(deviceUUID,{
                    peripheral: discoveredPeripheral,
                    writeCharacteristic: writeCharacteristic!,
                  })
                  // Timeout for response
                  let readTimeout = setTimeout(() => {
                    logger.debug("waited 10 seconds for incoming messages, closing connection")
                    readCharacteristic?.removeAllListeners
                    connectedDevices.delete(deviceUUID)
                    _cancel()
                  }, timeoutResponse, 'BLE Device response timeout');
                  // React on events
                  readCharacteristic?.on('read', (_: Buffer, isNotification: boolean) => {
                    if(isNotification){
                      readCharacteristic?.readAsync().then((value: Buffer) => {
                        logger.debug('read from Characteristic: ' + value.toString('utf8'))
                        _this.receiveMessage(value)
                      })
                    }
                  })
                  readCharacteristic?.subscribeAsync().then(_ => {
                    clearTimeout(timeoutId)
                    resolve()
                  }).catch(_ => {
                    _cancel()
                    reject()
                  })
                })
              } else {
                logger.debug('Error while searching for expected characteristics')
                _cancel()
                reject()
              }
            }).catch((error): void => {
              logger.error("BLE endpoint does not expose expected service/characteristic: " + error)
              _cancel()
              reject()
            })
          })
        }
      })
      noble.startScanningAsync([service], false).catch((error): void => {
        logger.error('Could not start scanning: ' + error)
        reject()
      })
    })
    return Promise.race([discovery, discoveryTimeout]);
  }

  private receiveMessage(data?: Buffer): void {
    this.inboundCB(data)
  }
}

function parseUUID(input: string): string {
  let output: string = input?.toLocaleLowerCase()
  output = output.replace(/:/g, '')
  output = output.replace(/-/g, '')
  return output
}
