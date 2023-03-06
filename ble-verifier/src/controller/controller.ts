// Copyright (c) 2022 - for information on the respective copyright owner see the NOTICE file or the repository https://github.com/idunion/didcomm-ble-prototype.
//
// SPDX-License-Identifier: Apache-2.0

import { Agent, ProofAttributeInfo, AttributeFilter, ConnectionEventTypes, ConnectionStateChangedEvent, DidExchangeState, AutoAcceptProof, ProofExchangeRecord} from '@aries-framework/core'
import { TestLogger } from '../utils/logger'
import { ProofConfig } from './config'
import { Client } from "mqtt"

export class Controller {
  private logger: TestLogger
  private agent: Agent
  private proofConfig: ProofConfig
  private mqttClient: Client

  constructor(logger: TestLogger, agent: Agent, proofConfig: ProofConfig, mqttClient: Client) {
    this.logger = logger
    this.agent = agent
    this.proofConfig = proofConfig
    this.mqttClient = mqttClient
    this.onConnect()
  }

  private buildProofAttributes(): Map<string, ProofAttributeInfo> {
    const proofRequestAttributes = new Map<string, ProofAttributeInfo>()
    this.proofConfig.attributes.forEach((attribute) => {

      const attributeInfo = new ProofAttributeInfo({
        name: attribute.name,
        restrictions: [],
      })
      // credDef > schema
      if (attribute.credDef) {
        attributeInfo.restrictions = [
          new AttributeFilter({
            credentialDefinitionId: attribute.credDef
          })
        ]
      } else if (attribute.schema) {
        attributeInfo.restrictions = [
          new AttributeFilter({
            schemaId: attribute.schema
          })
        ]
      }
      proofRequestAttributes.set(attribute.name, attributeInfo)
    })

    return proofRequestAttributes
  }

  public onConnect() {
    this.agent.events.on<ConnectionStateChangedEvent>(
      ConnectionEventTypes.ConnectionStateChanged, (event) => {
        const record = event.payload.connectionRecord
        this.logger.debug('Connection state changed: ' + record.id + " / " + record.state)
        if (record.state != DidExchangeState.Completed && record.state != DidExchangeState.ResponseSent) {
          this.logger.debug('Connection not ready yet: ' + record.id + " / " + record.state)
          return
        }
        const id = record.id
        this.agent.proofs.requestProof({
          connectionId: id,
          autoAcceptProof: AutoAcceptProof.Always,
          protocolVersion: 'v2',
          proofFormats: {
            indy: {
              name: 'proof-request',
              version: '1.0',
              requestedAttributes: this.buildProofAttributes()
            }
          }
        }).catch((err: any) => {
          this.logger.error('Error during proof request: ' + err)
        }).then((record: any) => {
          if (record) {
            this.logger.debug('Got Proof Request: ' + record.toJSON())
            this.do(record)
          }
        })
      }
    )
  }

  private async do(record: ProofExchangeRecord) {
    // TODO: trigger something
    this.logger.info('doing things: ' + record)
    // Open door
    this.mqttClient.publish('eno/raw/vin', 'F4 07 22 DD C4')
  }
}