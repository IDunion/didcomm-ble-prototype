// Copyright (c) 2022 - for information on the respective copyright owner see the NOTICE file or the repository https://github.com/idunion/didcomm-ble-prototype.
//
// SPDX-License-Identifier: Apache-2.0

import type { Agent, Logger, InboundTransport } from '@aries-framework/core'
import { AgentConfig } from '@aries-framework/core'

export class BLEInboundTransport implements InboundTransport {
  private agent!: Agent
  private logger!: Logger

  public async start(agent: Agent): Promise<void> {
    const agentConfig = agent.injectionContainer.resolve(AgentConfig)
    this.logger = agentConfig.logger
    this.agent = agent
    this.logger.debug('Starting BLE peripheral inbound transport agent')
  }

  public async stop(): Promise<void> {
    return new Promise((resolve, ) => { resolve() })
  }

  // Callback for write request on bleCharacateristic
  public async receiveMessage(data: Buffer) {
    try {
      const encryptedMessage = JSON.parse(data.toString('utf8'))
      await this.agent.receiveMessage(encryptedMessage)
    } catch (error) {
      this.logger.debug('Error processing inbound message: ' + error)
      this.logger.debug(data.toString('utf8'))
    }
  }
}
