import {
  Agent,
  AutoAcceptCredential,
  HttpOutboundTransport, InboundTransport, InitConfig, LogLevel, MediatorPickupStrategy, OutboundTransport, WsOutboundTransport
} from '@aries-framework/core'
import { agentDependencies } from '@aries-framework/node'
import * as fs from 'fs'
import * as jsYaml from 'js-yaml'
import fetch from 'node-fetch'
import { AdminWebServer } from './admin/webserver'
import { DIDCommCentral } from './transport/central/central'
import { BLEPeripheralInboundTransport } from './transport/peripheral/BLEInboundTransport'
import { BLEPeripheralOutboundTransport } from './transport/peripheral/BLEOutboundTransport'
import { DIDCommPeripheral } from './transport/peripheral/peripheral'
import { TestLogger } from './utils/logger'
import * as utils from './utils/utils'


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
  const config: any = jsYaml.load(file);

  // Set genesis transaction from either genesis url, network name or default to idunion
  let network = "idunion"
  let genesisTransactions = utils.gensis.get(network)

  if (config.genesisurl) {
    const response = await fetch(config.genesisurl)
    if (response.ok) {
      const content = await response.text()
      genesisTransactions = content
      network = config.network
      logger.debug('Setting genesis transactions from genesisurl')
    } else {
      logger.error('Could not read from genesis url')
    }
  } else {
    if (config.network) {
      let networkString: string = config.network
      if (utils.gensis.has(networkString)) {
        genesisTransactions = utils.gensis.get(networkString.toLowerCase())
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
  if (!config.blecharacteristic || !config.bleservice) {
    logger.error('Could not find BLE characteristics or service UUIDs, terminating')
    return;
  }

  let inbound: InboundTransport[] = []
  let outbound: OutboundTransport[] = []

  let BLEAddress: String[] = []

  if (config.blemode.indexOf('peripheral') > -1) {
    logger.info('Starting BLE Peripheral mode')
    const device = new DIDCommPeripheral(config.bleservice, config.blecharacteristiread, config.blecharacteristicwrite, logger)
    BLEAddress.push(await device.getDeviceID().then((addr) => {
      return 'ble://' + addr
    }))
    inbound.push(device.inboundTransport)
    outbound.push(device.outboundTransport)
  }
  if (config.blemode.indexOf('central') > -1) {
    logger.info('Starting BLE Central mode')
    const device = new DIDCommCentral(config.bleservice, config.blecharacteristiread, config.blecharacteristicwrite, logger)
    BLEAddress.push('ble-guest://')
    inbound.push(device.inboundTransport)
    outbound.push(device.outboundTransport)
  }


  logger.debug("Got BLEAddress:", BLEAddress)

  const agentConfig: InitConfig = {
    label: 'ble-poc',
    walletConfig: {
      id: 'ble-poc',
      key: process.env.AGENT_WALLET_KEY ?? 'blepoc',
    },
    indyLedgers: [
      {
        id: network,
        genesisTransactions: genesisTransactions,
        isProduction: false,
      },
    ],
    logger: logger,
    autoAcceptConnections: true,
    autoAcceptCredentials: AutoAcceptCredential.Always,
    useLegacyDidSovPrefix: true,
    // mediatorConnectionsInvite: mediatorConnectionsInvite,
    // mediatorPickupStrategy: MediatorPickupStrategy.Implicit,
    // mediatorPollingInterval: 5000,
    endpoints: ["ble://" + BLEAddress],
  }

  const agent = new Agent(agentConfig, agentDependencies)

  // agent.config.clearDefaultMediator

  // Default Transports
  agent.registerOutboundTransport(new HttpOutboundTransport())
  agent.registerOutboundTransport(new WsOutboundTransport())

  // Register BLE Transports
  inbound.forEach((transport) => {
    agent.registerInboundTransport(transport)
  })
  outbound.forEach((transport) => {
    agent.registerOutboundTransport(transport)
  })

  await agent.initialize()

  // Admin webservice 
  const webserver = new AdminWebServer(logger, agent)
  await webserver.listen(8080)

}

run()