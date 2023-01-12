using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using Acr.UserDialogs;
using AsyncAwaitBestPractices.MVVM;
using Hyperledger.Aries.Agents;
using Hyperledger.Aries.Extensions;
using Hyperledger.Indy;
using Osma.Mobile.App.Services.Interfaces;
using Plugin.BluetoothLE;
using Plugin.BluetoothLE.Server;
using ReactiveUI;
using Xamarin.Essentials;
using CharacteristicProperties = Plugin.BluetoothLE.CharacteristicProperties;

namespace Osma.Mobile.App.ViewModels.Ble
{
    public class BleViewModel : ABaseViewModel
    {
        private bool _isBleServerOn;
        public bool IsBleServerOn
        {
            get => _isBleServerOn;
            set => this.RaiseAndSetIfChanged(ref _isBleServerOn, value);
        }
        
        public BleViewModel(
            IAgentProvider agentContextProvider,
            IUserDialogs userDialogs,
            INavigationService navigationService) 
            : base("BLE", userDialogs, navigationService)
        {
            _agentContextProvider = agentContextProvider;
        }

        private readonly IAgentProvider _agentContextProvider;

        private const string BleKeyUuid = "ae961332-b57d-47d5-8be3-c3b65aa83761";
        private const string DidCommServiceUuid = "a422a59a-71fe-11eb-9439-0242ac130002";
        private const string ReceiveDidCommMessagesUuid = "0d3a0e3a-b86d-46cb-99d9-61c37ebeeac1";

        public IAsyncCommand ToggleBleServerCommand => new AsyncCommand(ToggleBleServer);
        
        public async Task ToggleBleServer()
        {
            try
            {
                if (IsBleServerOn)
                {
                    StopBleServer();
                    return;
                }
                    
                IsBleServerOn = true;

                var server = CrossBleAdapter.Current.CreateGattServer();
                var bleIdentifier = Preferences.Get("BleIdentifier", string.Empty);

                var messageBytes = new List<byte>();
                
                server.Subscribe(gattServer =>
                {
                    var didCommService = gattServer.CreateService(Guid.Parse(DidCommServiceUuid), true);
                    
                    var bleIdentifierCharacteristic = didCommService.AddCharacteristic(
                        Guid.Parse(BleKeyUuid),
                        CharacteristicProperties.Read, GattPermissions.Read);
                    
                    var receiveDidCommMessageCharacteristic = didCommService.AddCharacteristic(
                        Guid.Parse(ReceiveDidCommMessagesUuid),
                        CharacteristicProperties.Write, GattPermissions.Write);

                    bleIdentifierCharacteristic.WhenReadReceived()
                        .Subscribe(readRequest =>
                        {
                            readRequest.Value = bleIdentifier.ToBase64().GetBytesFromBase64();
                        });

                    receiveDidCommMessageCharacteristic.WhenWriteReceived()
                        .Subscribe(async writeRequest =>
                        {
                            try
                            {
                                foreach (var byteValue in writeRequest.Value)
                                {
                                    messageBytes = messageBytes.Append(byteValue).ToList();
                                }

                                await TryToBuildAndProcessMessage(messageBytes);

                                await DialogService.AlertAsync("Message successfully received over BLE!");
                                messageBytes.Clear();
                            }
                            catch (Exception e)
                            {
                                if (e is InvalidParameterException)
                                    Debug.WriteLine("Trying to unpack message...");
                                
                                Debug.WriteLine(e);
                            }
                        });

                    gattServer.AddService(didCommService);
                });

                CrossBleAdapter.Current.Advertiser.Start(new AdvertisementData
                {
                    LocalName = "DIDComm BLE Server",
                    ServiceUuids = new List<Guid>{Guid.Parse(DidCommServiceUuid)}
                });

                DialogService.Alert("BLE Server started!");
            }
            catch (Exception e)
            {
                IsBleServerOn = false;
                Debug.WriteLine(e);
            }
        }

        private async Task TryToBuildAndProcessMessage(IEnumerable<byte> messageBytes)
        {
            var context = await _agentContextProvider.GetContextAsync();
            var byteArray = messageBytes.ToArray();
                                
            var packedMessageContext = new PackedMessageContext(byteArray);
            await context.Agent.ProcessAsync(context, packedMessageContext);
        }

        private void StopBleServer()
        {
            try
            {
                if (!IsBleServerOn) 
                    return;
                
                CrossBleAdapter.Current.Advertiser.Stop();
                IsBleServerOn = false;
                DialogService.Alert("BLE Server stopped.");
            }
            catch (Exception e)
            {
                Debug.WriteLine(e);
            }
        }
    }
}