using System;
using System.Collections.Generic;
using System.Linq;
using System.Reactive.Linq;
using System.Threading.Tasks;
using System.Windows.Input;
using Acr.UserDialogs;
using Autofac;
using Hyperledger.Aries.Agents;
using Hyperledger.Aries.Contracts;
using Hyperledger.Aries.Extensions;
using Hyperledger.Aries.Features.DidExchange;
using Osma.Mobile.App.Events;
using Osma.Mobile.App.Extensions;
using Osma.Mobile.App.Services;
using Osma.Mobile.App.Services.Interfaces;
using Osma.Mobile.App.Utilities;
using Osma.Mobile.App.ViewModels.CreateInvitation;
using Plugin.BluetoothLE;
using Plugin.BluetoothLE.Server;
using ReactiveUI;
using Xamarin.Essentials;
using Xamarin.Forms;

namespace Osma.Mobile.App.ViewModels.Connections
{
    public class ConnectionsViewModel : ABaseViewModel
    {
        public bool IsBleServerOn { get; set; }
        
        private readonly IConnectionService _connectionService;
        private readonly IAgentProvider _agentContextProvider;
        private readonly IEventAggregator _eventAggregator;
        private readonly ILifetimeScope _scope;

        private const string DIDCommServiceUUID = "a422a59a-71fe-11eb-9439-0242ac130002";
        private const string BLEIdentificatorUUID = "ae961332-b57d-47d5-8be3-c3b65aa83761";
        private const string ReceiveDIDCommMessagesUUID = "0d3a0e3a-b86d-46cb-99d9-61c37ebeeac1";

        public ConnectionsViewModel(IUserDialogs userDialogs,
                                    INavigationService navigationService,
                                    IConnectionService connectionService,
                                    IAgentProvider agentContextProvider,
                                    IEventAggregator eventAggregator,
                                    ILifetimeScope scope) :
                                    base("Connections", userDialogs, navigationService)
        {
            _connectionService = connectionService;
            _agentContextProvider = agentContextProvider;
            _eventAggregator = eventAggregator;
            _scope = scope;
        }

        public override async Task InitializeAsync(object navigationData)
        {
            await RefreshConnections();

            _eventAggregator.GetEventByType<ApplicationEvent>()
                            .Where(_ => _.Type == ApplicationEventType.ConnectionsUpdated)
                            .Subscribe(async _ => await RefreshConnections());

            await base.InitializeAsync(navigationData);
        }


        public async Task RefreshConnections()
        {
            RefreshingConnections = true;

            var context = await _agentContextProvider.GetContextAsync();
            var records = await _connectionService.ListAsync(context);

            IList<ConnectionViewModel> connectionVms = new List<ConnectionViewModel>();
            foreach (var record in records)
            {
                var connection = _scope.Resolve<ConnectionViewModel>(new NamedParameter("record", record));
                connectionVms.Add(connection);
            }

            //TODO need to compare with the currently displayed connections rather than disposing all of them
            Connections.Clear();
            Connections.InsertRange(connectionVms);
            HasConnections = connectionVms.Any();

            RefreshingConnections = false;
        }

        public async Task ScanInvite()
        {
            var expectedFormat = ZXing.BarcodeFormat.QR_CODE;
            var opts = new ZXing.Mobile.MobileBarcodeScanningOptions { PossibleFormats = new List<ZXing.BarcodeFormat> { expectedFormat } };

            var scanner = new ZXing.Mobile.MobileBarcodeScanner();

            var result = await scanner.Scan(opts);
            if (result == null) return;
            
            ConnectionInvitationMessage invitation;

            try
            {
                invitation = await MessageDecoder.ParseMessageAsync(result.Text.ToBase64()) as ConnectionInvitationMessage
                    ?? throw new Exception("Unknown message type");
            }
            catch (Exception e)
            {
                DialogService.Alert("Invalid invitation!");
                return;
            }

            Device.BeginInvokeOnMainThread(async () =>
            {
                await NavigationService.NavigateToAsync<AcceptInviteViewModel>(invitation, NavigationType.Modal);
            });
        }

        public async Task StartBleServer()
        {
            try
            {
                if (IsBleServerOn)
                {
                    CrossBleAdapter.Current.Advertiser.Stop();
                    IsBleServerOn = false;
                    DialogService.Alert("BLE Server gestoppt.");
                    return;
                }

                IsBleServerOn = true;

                var server = CrossBleAdapter.Current.CreateGattServer();
                var bleIdentifier = Preferences.Get("BleIdentifier", string.Empty);

                var messageBytes = new List<byte>();
                
                server.Subscribe(gattServer =>
                {
                    var didCommService = gattServer.CreateService(Guid.Parse(DIDCommServiceUUID), true);
                    
                    var bleIdentifierCharacteristic = didCommService.AddCharacteristic(
                        Guid.Parse(BLEIdentificatorUUID),
                        CharacteristicProperties.Read, GattPermissions.Read);
                    
                    var receiveDidCommMessageCharacteristic = didCommService.AddCharacteristic(
                        Guid.Parse(ReceiveDIDCommMessagesUUID),
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
                                
                                var context = await _agentContextProvider.GetContextAsync();
                                
                                var byteArray = messageBytes.ToArray();
                                
                                var packedMessageContext = new PackedMessageContext(byteArray);
                                
                                await context.Agent.ProcessAsync(context, packedMessageContext);

                                await DialogService.AlertAsync("Nachricht über BLE erfolgreich erhalten!");
                                messageBytes.Clear();
                            }
                            
                            catch (Exception e)
                            {
                                Console.WriteLine(e);
                            }
                        });

                    gattServer.AddService(didCommService);
                });

                CrossBleAdapter.Current.Advertiser.Start(new AdvertisementData
                {
                    LocalName = "DIDComm BLE Server",
                    ServiceUuids = new List<Guid>{Guid.Parse(DIDCommServiceUUID)}
                });
                
                DialogService.Alert("BLE Server gestartet!");
            }
            catch (Exception e)
            {
                IsBleServerOn = false;
                Console.WriteLine(e);
            }
        }

        public async Task SelectConnection(ConnectionViewModel connection) => await NavigationService.NavigateToAsync(connection);

        #region Bindable Command

        public ICommand StartBleServerCommand => new Command(async () => await StartBleServer());
        
        public ICommand RefreshCommand => new Command(async () => await RefreshConnections());

        public ICommand ScanInviteCommand => new Command(async () => await ScanInvite());

        public ICommand CreateInvitationCommand => new Command(async () => await NavigationService.NavigateToAsync<CreateInvitationViewModel>());
        
        public ICommand SelectConnectionCommand => new Command<ConnectionViewModel>(async (connection) =>
        {
            if (connection != null)
                await SelectConnection(connection);
        });
        #endregion

        #region Bindable Properties
        private RangeEnabledObservableCollection<ConnectionViewModel> _connections = new RangeEnabledObservableCollection<ConnectionViewModel>();
        public RangeEnabledObservableCollection<ConnectionViewModel> Connections
        {
            get => _connections;
            set => this.RaiseAndSetIfChanged(ref _connections, value);
        }

        private bool _hasConnections;
        public bool HasConnections
        {
            get => _hasConnections;
            set => this.RaiseAndSetIfChanged(ref _hasConnections, value);
        }

        private bool _refreshingConnections;
        public bool RefreshingConnections
        {
            get => _refreshingConnections;
            set => this.RaiseAndSetIfChanged(ref _refreshingConnections, value);
        }
        #endregion
    }
}
