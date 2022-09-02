// Copyright (c) 2022 - for information on the respective copyright owner see the NOTICE file or the repository https://github.com/idunion/didcomm-ble-prototype.
//
// SPDX-License-Identifier: Apache-2.0

import { Agent, AttributeFilter, ConnectionEventTypes, ConnectionStateChangedEvent, ProofAttributeInfo, ProofRecord } from '@aries-framework/core'
import { TestLogger } from '../utils/logger'
import { ProofConfig } from './config'

export class Controller {
  private logger: TestLogger
  private agent: Agent
  private proofConfig: ProofConfig

  constructor(logger: TestLogger, agent: Agent, proofConfig: ProofConfig) {
    this.logger = logger
    this.agent = agent
    this.proofConfig = proofConfig
    this.onConnect()
  }

  private buildProofAttributes(): Map<string, ProofAttributeInfo> {
    let proofRequestAttributes = new Map<string, ProofAttributeInfo>()
    this.proofConfig.attributes.forEach((attribute) => {

      let attributeInfo = new ProofAttributeInfo({
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
        let record = event.payload.connectionRecord
        if (!record.isReady) {
          this.logger.debug('Connection not ready yet: ' + record.id)
          return
        }
        let id = record.id

        let req = this.agent.proofs.requestProof(id, {
          requestedAttributes: this.buildProofAttributes()
        }).catch((err) => {
          this.logger.error('Error during proof request: ' + err)
        }).then((record) => {
          if (record) {
            this.logger.debug('Got Proof Request: ' + record)
            this.do(record)
          }
        })
      }
    )
  }

  private async do(record: ProofRecord) {
    // TODO: trigger something
    this.logger.info('Beep: ' + record)
  }
}