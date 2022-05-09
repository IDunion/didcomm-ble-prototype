import type { Agent, OutboundTransport, OutboundPackage, Logger } from '@aries-framework/core'
import { AgentConfig } from '@aries-framework/core'
import { BleTransport } from './BLETransport'

export class BLEOutboundTransport implements OutboundTransport {
  private logger!: Logger
  private bleTransport!: BleTransport

  public supportedSchemes: string[] = ['blue', 'ble']

  public constructor(bleTransport: BleTransport) {
    this.bleTransport = bleTransport
  }

  public async start(agent: Agent): Promise<void> {
    const agentConfig = agent.injectionContainer.resolve(AgentConfig)
    this.logger = agentConfig.logger
    this.logger.debug('Starting BLE central outbound transport')
  }

  public async stop(): Promise<void> {
  }

  public async sendMessage(outboundPackage: OutboundPackage): Promise<void> {
    // remove prefix from device UUID
    let deviceUUID: string;
    if (outboundPackage.endpoint) {
      deviceUUID = outboundPackage.endpoint
    } else {
      return new Promise(function (resolve, reject) {
        reject()
      });
    }
    this.supportedSchemes.forEach(prefix => {
      deviceUUID = deviceUUID.replace(prefix + '://', '')
    })
    return this.bleTransport.sendMessage(deviceUUID, JSON.stringify(outboundPackage.payload))
  }
}
