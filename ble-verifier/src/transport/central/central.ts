import type { Logger } from '@aries-framework/core'
import noble = require('@abandonware/noble')

export class TransportCentral {
  private readCharacteristicUUID: string
  private writeCharacteristicUUID: string
  private serviceUUID: string

  private logger!: Logger
  private connected: noble.Peripheral[] = []

  private inboundCB: (data?: Buffer) => void


  constructor(serviceUUID: string, readCharacteristic: string, writeCharacteristic: string, logger: Logger, inboundCB: (data?: Buffer) => void) {
    this.readCharacteristicUUID = parseUUID(readCharacteristic)
    this.writeCharacteristicUUID = parseUUID(writeCharacteristic)
    this.serviceUUID = parseUUID(serviceUUID)
    this.logger = logger
    this.inboundCB = inboundCB

  }

  public async stop(): Promise<void> {
    await noble.stopScanningAsync();
    await noble.removeAllListeners();
    noble.reset()
  }

  public sendMessage(uuid: string, payload: string): Promise<void> {
    // Convert to noble UUID format
    const deviceUUID = parseUUID(uuid)
    this.logger.debug('Searching for BLE device with UUID: ' + deviceUUID)
    const logger = this.logger
    const service = this.serviceUUID
    const readChar = this.readCharacteristicUUID
    const writeChar = this.writeCharacteristicUUID
    const timeoutDiscovery = 10000

    let timeoutId: NodeJS.Timeout
    let discoveredPeripheral: noble.Peripheral
    let cancel = () => {
      logger.debug('Disconnecting from device')
      if (discoveredPeripheral) {
        discoveredPeripheral.disconnectAsync()
      }
      noble.stopScanningAsync()
      noble.removeAllListeners()
      noble.cancelConnect(deviceUUID)
    }
    const discoveryTimeout = new Promise<void>((_, reject) => {
      timeoutId = setTimeout(() => {
        logger.error("BLE Outbound Timeout")
        cancel()
        reject('BLE Outbound Timeout')
      }, timeoutDiscovery, 'BLE Device discovery timeout');
    });
    const _this = this;
    const discovery = new Promise<void>(function (resolve, reject) {
      noble.on('discover', async (peripheral: noble.Peripheral) => {
        discoveredPeripheral = peripheral
        logger.debug('Found BLE device ' + peripheral.uuid)
        if (discoveredPeripheral.uuid === deviceUUID) {
          let cancel = () => {
            clearTimeout(timeoutId)
            cancel()
          }
          // device UUID and service UUID match
          logger.debug('BLE device matches expected endpoint')
          await noble.stopScanningAsync().catch((error): void => {
            logger.error('Could not stop scanning: ' + error)
            reject()
          })
          logger.debug('Connecting to BLE device')
          discoveredPeripheral.connectAsync().catch((error): void => {
            logger.error('Could not connect to BLE device: ' + error)
            cancel()
            reject()
          }).then(async () => {
            logger.debug('Getting Characteristics')
            discoveredPeripheral.discoverSomeServicesAndCharacteristicsAsync([service], [readChar, writeChar]).then((serviceAndChars) => {
              logger.debug('Successfuly found expected Services/Characteristics')
              let characteristics = serviceAndChars.characteristics
              characteristics.find(element => element.uuid == readChar)
              if (characteristics.length > 0) {
                const data = Buffer.from(payload)
                logger.debug('Sending ' + payload)
                characteristics[0].writeAsync(data, false).catch((error): void => {
                  logger.error("Error writing to characteristic: " + error)
                  cancel()
                  reject()
                }).then(() => {
                  _this.connected.push(discoveredPeripheral)
                  resolve()
                })
              } else {
                logger.debug('Error while searching for expected characteristic')
                cancel()
                reject()
              }
            }).catch((error): void => {
              logger.error("BLE endpoint does not expose expected service/characteristic: " + error)
              cancel()
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

  private receieveMessage(data?: Buffer): void {
    this.inboundCB(data)
  }
}

function parseUUID(input: string): string {
  let output: string = input?.toLocaleLowerCase()
  output = output.replace(/:/g, '')
  output = output.replace(/-/g, '')
  return output
}
