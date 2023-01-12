using System;
using System.Reactive.Linq;
using System.Threading.Tasks;
using System.Windows.Input;
using Acr.UserDialogs;
using Hyperledger.Aries.Agents;
using Hyperledger.Aries.Extensions;
using Hyperledger.Aries.Features.DidExchange;
using Hyperledger.Aries.Features.TrustPing;
using Osma.Mobile.App.Services.Interfaces;
using ReactiveUI;
using Xamarin.Essentials;
using Xamarin.Forms;
using ZXing.Net.Mobile.Forms;

namespace Osma.Mobile.App.ViewModels.CreateInvitation
{
    public class CreateInvitationViewModel : ABaseViewModel
    {
        private readonly IAgentProvider _agentContextProvider;
        private readonly IConnectionService _connectionService;

        public CreateInvitationViewModel(
            IUserDialogs userDialogs,
            INavigationService navigationService,
            IAgentProvider agentContextProvider,
            IConnectionService edgeConnectionService
            ) : base(
                "CreateInvitation",
                userDialogs,
                navigationService
           )
        {
            _agentContextProvider = agentContextProvider;
            _connectionService = edgeConnectionService;
        }

        public override async Task InitializeAsync(object navigationData)
        {
            await base.InitializeAsync(navigationData);
        }

        private async Task CreateInvitation()
        {
            try
            {
                var context = await _agentContextProvider.GetContextAsync();
                var (invitation, _) = await _connectionService.CreateInvitationAsync(context, new InviteConfiguration
                {
                    TheirAlias = new ConnectionAlias { Name = "Invitation" }
                });

                string barcodeValue = invitation.ServiceEndpoint + "?d_m=" + Uri.EscapeDataString(invitation.ToByteArray().ToBase64String());
                QrCodeValue = barcodeValue;
            }
            catch (Exception ex)
            {
                DialogService.Alert(ex.Message);
            }
        }
        
        private async Task CreateBleInvitation()
        {
            try
            {
                if (string.IsNullOrEmpty(Preferences.Get("BleIdentifier", string.Empty)))
                {
                    Preferences.Set("BleIdentifier", "ble-" + Guid.NewGuid());
                }
                
                var context = await _agentContextProvider.GetContextAsync();
                var (invitation, _) = await _connectionService.CreateBleInvitationAsync(context, 
                    Preferences.Get("BleIdentifier", string.Empty),
                    new InviteConfiguration
                {
                    TheirAlias = new ConnectionAlias { Name = "Invitation" }
                });

                string barcodeValue = invitation.ServiceEndpoint + "?d_m=" + Uri.EscapeDataString(invitation.ToByteArray().ToBase64String());
                QrCodeValue = barcodeValue;
            }
            catch (Exception ex)
            {
                DialogService.Alert(ex.Message);
            }
        }

        private ZXingBarcodeImageView QRCodeGenerator(string barcodeValue)
        {
            var barcode = new ZXingBarcodeImageView
            {
                HorizontalOptions = LayoutOptions.FillAndExpand,
                VerticalOptions = LayoutOptions.FillAndExpand,
                AutomationId = "zxingBarcodeImageView",
            };

            barcode.BarcodeFormat = ZXing.BarcodeFormat.QR_CODE;
            barcode.BarcodeOptions.Width = 300;
            barcode.BarcodeOptions.Height = 300;
            barcode.BarcodeOptions.Margin = 10;
            barcode.BarcodeValue = barcodeValue;

            return barcode;
        }

        #region Bindable Command

        public ICommand CreateInvitationCommand => new Command(async () => await CreateInvitation());
        public ICommand CreateBleInvitationCommand => new Command(async () => await CreateBleInvitation());


        #endregion

        #region Bindable Properties

        private string _qrCodeValue;

        public string QrCodeValue
        {
            get => _qrCodeValue;
            set => this.RaiseAndSetIfChanged(ref _qrCodeValue, value);
        }

        #endregion
    }
}
