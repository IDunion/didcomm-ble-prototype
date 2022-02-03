import { InitConfig, MediatorPickupStrategy } from '@aries-framework/core'
import {
  ConnectionInvitationMessage,
  LogLevel,
  Agent,
  AutoAcceptCredential,
  HttpOutboundTransport,
} from '@aries-framework/core'
import { agentDependencies, HttpInboundTransport } from '@aries-framework/node'
import { TestLogger } from './utils/logger'
import * as utils from './utils/utils'
import * as fs from 'fs'
import * as jsYaml from 'js-yaml'
import fetch from 'node-fetch'

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
      network = ''
      logger.debug('Setting genesis transactions from genesisurl')
    } else {
      logger.error('Could not read from genesis url')
    }
  } else {
    if (config.network) {
      let networkString: string = config.network
      if ( utils.gensis.has(networkString)) {
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
    mediatorConnectionsInvite: mediatorConnectionsInvite,
    mediatorPickupStrategy: MediatorPickupStrategy.Implicit,
    mediatorPollingInterval: 5000,
  }

  const agent = new Agent(agentConfig, agentDependencies)

  agent.registerOutboundTransport(new HttpOutboundTransport())

  await agent.initialize()
}

run()