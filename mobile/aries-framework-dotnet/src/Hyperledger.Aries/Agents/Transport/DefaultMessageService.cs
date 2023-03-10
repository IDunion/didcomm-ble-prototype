using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Hyperledger.Aries.Agents.Transport;
using Hyperledger.Aries.Utils;
using Hyperledger.Indy.WalletApi;
using Microsoft.Extensions.Logging;

namespace Hyperledger.Aries.Agents
{
    /// <inheritdoc />
    public class DefaultMessageService : IMessageService
    {
        /// <summary>The agent wire message MIME type</summary>
        public const string AgentWireMessageMimeType = "application/ssi-agent-wire";

        /// <summary>The logger</summary>
        // ReSharper disable InconsistentNaming
        protected readonly ILogger<DefaultMessageService> Logger;

        /// <summary>The HTTP client</summary>
        protected readonly IEnumerable<IMessageDispatcher> MessageDispatchers;
        // ReSharper restore InconsistentNaming
        
        private readonly BleMessageDispatcher _bleMessageDispatcher = new();

        /// <summary>Initializes a new instance of the <see cref="DefaultMessageService"/> class.</summary>
        /// <param name="logger">The logger.</param>
        /// <param name="messageDispatchers">The message handler.</param>
        public DefaultMessageService(
            ILogger<DefaultMessageService> logger,
            IEnumerable<IMessageDispatcher> messageDispatchers)
        {
            Logger = logger;
            MessageDispatchers = messageDispatchers;
            MessageDispatchers = MessageDispatchers.Append(_bleMessageDispatcher);
        }

        private async Task<UnpackedMessageContext> UnpackAsync(Wallet wallet, PackedMessageContext message, string senderKey)
        {
            UnpackResult unpacked;

            try
            {
                unpacked = await CryptoUtils.UnpackAsync(wallet, message.Payload);
            }
            catch (Exception e)
            {
                Logger.LogError("Failed to un-pack message", e);
                throw new AriesFrameworkException(ErrorCode.InvalidMessage, "Failed to un-pack message", e);
            }
            
            return new UnpackedMessageContext(unpacked.Message, senderKey);
        }
        
        public async Task<List<MessageContext>> SendReceiveListAsync(Wallet wallet, AgentMessage message, string recipientKey, string endpointUri,
            string[] routingKeys = null, string senderKey = null)
        {
            Logger.LogInformation(LoggingEvents.SendMessage, "Recipient {0} Endpoint {1}", recipientKey,
                endpointUri);

            if (string.IsNullOrEmpty(message.Id))
                throw new AriesFrameworkException(ErrorCode.InvalidMessage, "@id field on message must be populated");

            if (string.IsNullOrEmpty(message.Type))
                throw new AriesFrameworkException(ErrorCode.InvalidMessage, "@type field on message must be populated");

            if (string.IsNullOrEmpty(endpointUri))
                throw new ArgumentNullException(nameof(endpointUri));

            var dispatcher = GetDispatcher(endpointUri);
            
            if (dispatcher == null)
                throw new AriesFrameworkException(ErrorCode.A2AMessageTransmissionError, $"No registered dispatcher for transport scheme : {endpointUri}");

            message.AddReturnRouting();
            var wireMsg = await CryptoUtils.PrepareAsync(wallet, message, recipientKey, routingKeys, senderKey);

            if (!dispatcher.TransportSchemes.Contains("ble")) return null;
            
            var packedMessageContexts = await dispatcher.DispatchBleAsync(endpointUri, wireMsg);
            var result = new List<MessageContext>();
            foreach (var packedMessageContext in packedMessageContexts)
            {
                result.Add(await UnpackAsync(wallet, packedMessageContext, senderKey));
            }
            return result;
        }

        /// <inheritdoc />
        public virtual async Task SendAsync(Wallet wallet, AgentMessage message, string recipientKey,
            string endpointUri, string[] routingKeys = null, string senderKey = null)
        {
            Logger.LogInformation(LoggingEvents.SendMessage, "Recipient {0} Endpoint {1}", recipientKey,
                endpointUri);

            if (string.IsNullOrEmpty(message.Id))
                throw new AriesFrameworkException(ErrorCode.InvalidMessage, "@id field on message must be populated");

            if (string.IsNullOrEmpty(message.Type))
                throw new AriesFrameworkException(ErrorCode.InvalidMessage, "@type field on message must be populated");

            if (string.IsNullOrEmpty(endpointUri))
                throw new ArgumentNullException(nameof(endpointUri));
            
            var dispatcher = GetDispatcher(endpointUri);
            
            if (dispatcher == null)
                throw new AriesFrameworkException(ErrorCode.A2AMessageTransmissionError, $"No registered dispatcher for transport scheme : {endpointUri}");

            var wireMsg = await CryptoUtils.PackAsync(wallet, recipientKey, message, senderKey);

            if (dispatcher.TransportSchemes.Contains("ble"))
                await dispatcher.DispatchAsync(endpointUri, wireMsg);
            else
                await dispatcher.DispatchAsync(new Uri(endpointUri), new PackedMessageContext(wireMsg));
        }

        /// <inheritdoc />
        public async Task<MessageContext> SendReceiveAsync(Wallet wallet, AgentMessage message, string recipientKey,
            string endpointUri, string[] routingKeys = null, string senderKey = null)
        {
            Logger.LogInformation(LoggingEvents.SendMessage, "Recipient {0} Endpoint {1}", recipientKey,
                endpointUri);

            if (string.IsNullOrEmpty(message.Id))
                throw new AriesFrameworkException(ErrorCode.InvalidMessage, "@id field on message must be populated");

            if (string.IsNullOrEmpty(message.Type))
                throw new AriesFrameworkException(ErrorCode.InvalidMessage, "@type field on message must be populated");

            if (string.IsNullOrEmpty(endpointUri))
                throw new ArgumentNullException(nameof(endpointUri));

            var dispatcher = GetDispatcher(endpointUri);
            
            if (dispatcher == null)
                throw new AriesFrameworkException(ErrorCode.A2AMessageTransmissionError, $"No registered dispatcher for transport scheme : {endpointUri}");

            message.AddReturnRouting();
            var wireMsg = await CryptoUtils.PrepareAsync(wallet, message, recipientKey, routingKeys, senderKey);
            
            PackedMessageContext response;
            if (dispatcher.TransportSchemes.Contains("ble"))
            {
                var bytes = await dispatcher.DispatchAsync(endpointUri, wireMsg)!;
                response = new PackedMessageContext(bytes);
            }
            else
            {
                response = await dispatcher.DispatchAsync(new Uri(endpointUri), new PackedMessageContext(wireMsg));
            }
            
            if (response is { } responseContext)
            {
                return await UnpackAsync(wallet, responseContext, senderKey);
            }
            
            return null;
        }
        
        private IMessageDispatcher GetDispatcher(string endpointUri)
        {
            if (endpointUri.Contains("ble"))
            {
                return MessageDispatchers.FirstOrDefault(dispatcher => dispatcher.TransportSchemes.Contains("ble"));
            }

            var uri = new Uri(endpointUri);
            return MessageDispatchers.FirstOrDefault(_ => _.TransportSchemes.Contains(uri.Scheme));
        }
    }
}
