// Copyright (c) 2022 - for information on the respective copyright owner see the NOTICE file or the repository https://github.com/idunion/didcomm-ble-prototype.
//
// SPDX-License-Identifier: Apache-2.0

import {
  Agent, AutoAcceptCredential, DidCommMimeType, HttpOutboundTransport,
  InitConfig, LogLevel, WsOutboundTransport
} from '@aries-framework/core'
import { agentDependencies } from '@aries-framework/node'
import * as fs from 'fs'
import * as jsYaml from 'js-yaml'
import fetch from 'node-fetch'
import { AdminWebServer } from './admin/webserver'
import { Config } from './utils/config'
import { BleTransport } from './transport/BLETransport'
import { TestLogger } from './utils/logger'
import * as utils from './utils/utils'
import { Controller } from './controller/controller'
import * as mqtt from 'mqtt'

const logger = new TestLogger(process.env.NODE_ENV ? LogLevel.error : LogLevel.debug)

process.on('unhandledRejection', (error) => {
  if (error instanceof Error) {
    logger.fatal(`Unhandled promise rejection: ${error.message}`, { error })
  } else {
    logger.fatal('Unhandled promise rejection due to non-error error', {
      error,
    })
  }
})

const run = async () => {

  const configPath = process.env.CONFIG_PATH ?? './config/agent.yaml'

  // Read Config File
  const file = fs.readFileSync(configPath, 'utf8');
  const config: Config = jsYaml.load(file) as Config;
  logger.debug('Configuratrion: ' + config)

  // Set genesis transaction from either genesis url, network name or default to idunion
  let network = "idunion:test"
  let genesisTransactions = utils.genesis.get(network)

  if (config.genesisurl) {
    logger.debug('Getting genesis file from url: ' + config.genesisurl)
    const response = await fetch(config.genesisurl)
    if (response.ok) {
      const content = await response.text()
      genesisTransactions = content
      if (config.network) {
        network = config.network
      }
      logger.debug('Setting genesis transactions from genesisurl')
    } else {
      logger.error('Could not read from genesis url')
    }
  } else {
    if (config.network) {
      let networkString: string = config.network
      if (utils.genesis.has(networkString)) {
        genesisTransactions = utils.genesis.get(networkString.toLowerCase())
        network = networkString
        logger.debug('Setting genesis transaction to predefined network: ' + network)
      } else {
        logger.error('Could not find predefined network: ' + network)
      }
    } else {
      logger.debug('No genesisurl or network name set, defaulting to: ' + network)
    }
  }

  let mediatorConnectionsInvite: string = ''
  if (config.mediatorinvite) {
    mediatorConnectionsInvite = config.mediatorinvite
    logger.debug('Found mediator invitation')
  } else {
    logger.debug('Mediator not set')
  }

  // BLE Transport
  let BLEAddress: String = ""
  let BLETransport: BleTransport | undefined = undefined
  if (config.blemode && config.blemode != 'off') {
    if (!config.blecharacteristicwrite || !config.blecharacteristiread || !config.bleservice) {
      logger.error('Could not find BLE characteristics or service UUIDs, terminating')
      return;
    }

    BLETransport = new BleTransport(config.blemode, config.bleservice, config.blecharacteristiread, config.blecharacteristicwrite, logger, config.blechunkinglimit)
    BLEAddress = await BLETransport.getDeviceID();

    logger.debug("Got BLEAddress:", BLEAddress)
  }

  const agentConfig: InitConfig = {
    label: 'ble-poc',
    walletConfig: {
      id: 'ble-poc',
      key: process.env.AGENT_WALLET_KEY ?? 'blepoc',
    },
    indyLedgers: [
      {
        id: network,
        indyNamespace: network,
        genesisTransactions: genesisTransactions,
        isProduction: false,
      },
    ],
    logger: logger,
    autoAcceptConnections: true,
    useDidKeyInProtocols: false,
    didCommMimeType: DidCommMimeType.V0,
    autoAcceptCredentials: AutoAcceptCredential.Always,
    useLegacyDidSovPrefix: true,
    // mediatorConnectionsInvite: mediatorConnectionsInvite,
    // mediatorPickupStrategy: MediatorPickupStrategy.Implicit,
    // mediatorPollingInterval: 5000,
    endpoints: ["ble://" + BLEAddress],
  }

  const agent = new Agent({
    config: agentConfig,
    dependencies: agentDependencies,
  });

  // Default Transports
  agent.registerOutboundTransport(new HttpOutboundTransport())
  agent.registerOutboundTransport(new WsOutboundTransport())

  // Register BLE Transports
  if (config.blemode != 'off' && BLETransport) {
    agent.registerInboundTransport(BLETransport.getInboundTransport())
    agent.registerOutboundTransport(BLETransport.getOutboundTransport())
  }

  await agent.initialize()

  // MQTT Client
  const mqttClientOptions: mqtt.IClientOptions = {
    // Clean session
    clean: true,
    connectTimeout: 4000,
    // Authentication
    clientId: 'BLE-Prototype',
    // Trying to reconnect
    reconnectPeriod: 3000,
  }

  const mqttClient: mqtt.MqttClient = mqtt.connect(config.mqtt.broker, mqttClientOptions)
  mqttClient.on('connect', function () {
    logger.debug("MQTT connected")
  })


  // Register business logic
  let proof = config.proof;
  new Controller(logger, agent, proof, mqttClient, config.mqtt.topic, config.mqtt.payload);

  // Admin webservice 
  const webserver = new AdminWebServer(logger, agent);
  await webserver.listen(8080);

}

run()
