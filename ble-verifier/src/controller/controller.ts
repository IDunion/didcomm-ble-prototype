// Copyright (c) 2022 - for information on the respective copyright owner see the NOTICE file or the repository https://github.com/idunion/didcomm-ble-prototype.
//
// SPDX-License-Identifier: Apache-2.0

import { Agent, ProofAttributeInfo, AttributeFilter, ConnectionEventTypes, ConnectionStateChangedEvent, DidExchangeState, AutoAcceptProof, ProofExchangeRecord, ProofEventTypes, ProofStateChangedEvent, ProofState } from '@aries-framework/core'
import { TestLogger } from '../utils/logger'
import { ProofConfig } from './config'
import { Client } from "mqtt"

export class Controller {
  private logger: TestLogger
  private agent: Agent
  private proofConfig: ProofConfig
  private mqttClient: Client
  private topic: string
  private payload: string

  constructor(logger: TestLogger, agent: Agent, proofConfig: ProofConfig, mqttClient: Client, topic: string, payload?: string) {
    this.logger = logger
    this.agent = agent
    this.proofConfig = proofConfig
    this.mqttClient = mqttClient
    this.topic = topic
    this.payload = payload ? payload : ""
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
          autoAcceptProof: AutoAcceptProof.Never,
          protocolVersion: 'v1',
          proofFormats: {
            indy: {
              name: 'proof-request',
              version: '1.0',
              requestedAttributes: this.buildProofAttributes()
            }
          }
        }).catch((err: Error) => {
          this.logger.error('Error during proof request: ' + err)
        }).then((record: void | ProofExchangeRecord) => {
          if (record) {
            this.logger.debug('Successfuly sent request')

          }
        })
      }
    )

    this.agent.events.on<ProofStateChangedEvent>(
      ProofEventTypes.ProofStateChanged, (event) => {
        this.logger.debug('got proof event: ' + event.payload.proofRecord.state)
        if (event.payload.proofRecord.state === ProofState.PresentationReceived && event.payload.proofRecord.isVerified) {
          this.agent.proofs.getFormatData(event.payload.proofRecord.id).then((formatData) => {
            // we default to handle first request attribute
            const val = formatData.presentation?.indy?.requested_proof.revealed_attrs[this.proofConfig.attributes[0].name].raw
            if(val) {
              this.logger.debug('value: ' + val)
              this.do(val);
            }
          })
        }
      }
    )
  }

  private async do(record: string) {
    this.logger.info('doing things: ' + record)
    // Open door
    this.mqttClient.publish(this.topic, this.payload)
  }
}
