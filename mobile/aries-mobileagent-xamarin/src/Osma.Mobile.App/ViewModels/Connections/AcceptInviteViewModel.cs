using System;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using System.Windows.Input;
using Acr.UserDialogs;
using Osma.Mobile.App.Events;
using Osma.Mobile.App.Services.Interfaces;
using ReactiveUI;
using Xamarin.Forms;
using Hyperledger.Aries.Configuration;
using Hyperledger.Aries.Features.DidExchange;
using Hyperledger.Aries.Agents;
using Hyperledger.Aries.Contracts;

namespace Osma.Mobile.App.ViewModels.Connections
{
    public class AcceptInviteViewModel : ABaseViewModel
    {
        private readonly IConnectionService _connectionService;
        private readonly IMessageService _messageService;
        private readonly IAgentProvider _contextProvider;
        private readonly IEventAggregator _eventAggregator;

        private ConnectionInvitationMessage _invite;

        public AcceptInviteViewModel(IUserDialogs userDialogs,
                                     INavigationService navigationService,
                                     IConnectionService connectionService,
                                     IMessageService messageService,
                                     IAgentProvider contextProvider,
                                     IEventAggregator eventAggregator)
                                     : base("Accept Invitiation", userDialogs, navigationService)
        {
            _connectionService = connectionService;
            _contextProvider = contextProvider;
            _messageService = messageService;
            _contextProvider = contextProvider;
            _eventAggregator = eventAggregator;
        }

        public override Task InitializeAsync(object navigationData)
        {
            if (navigationData is ConnectionInvitationMessage invite)
            {
                InviteTitle = $"Trust {invite.Label}?";
                InviterUrl = invite.ImageUrl;
                InviteContents = $"{invite.Label} would like to establish a pairwise DID connection with you. This will allow secure communication between you and {invite.Label}.";
                _invite = invite;
            }
            return base.InitializeAsync(navigationData);
        }

        #region Bindable Commands
        public ICommand AcceptInviteCommand => new Command(async () =>
        {
            var loadingDialog = DialogService.Loading("Processing");
            var context = await _contextProvider.GetContextAsync();

            try
            {
                ConnectionRequestMessage msg;
                ConnectionRecord rec;

                if (_invite.ServiceEndpoint.Contains("ble"))
                {
                    (msg, rec) = await _connectionService.CreateBleRequestAsync(context,
                        _invite, "ble://4c:f3:70:a9:77:ff");
                    
                    msg.Label = "OSMA";
                    
                    Debug.WriteLine("Recipent Key: " + ((IndyAgentDidDocService)msg.Connection.DidDoc.Services[0]).RecipientKeys[0]);
                    
                    var result = await _messageService.SendReceiveListAsync(context.Wallet, msg, rec);
                    
                    var unpacked1 = new UnpackedMessageContext(((UnpackedMessageContext) result.First()).GetMessageJson(), rec);
                    await context.Agent.ProcessAsync(context, unpacked1);
                    
                    var unpacked2 = new UnpackedMessageContext(((UnpackedMessageContext) result[1]).GetMessageJson(), rec);
                    await context.Agent.ProcessAsync(context, unpacked1);
                    
                    Debug.WriteLine("RESULT: " + result);
                }
                else
                {
                    (msg, rec) = await _connectionService.CreateRequestAsync(context, _invite);
                    msg.Label = "OSMA";
                    await _messageService.SendAsync(context.Wallet, msg, rec);
                }

                _eventAggregator.Publish(new ApplicationEvent() {Type = ApplicationEventType.ConnectionsUpdated});
            }
            catch (Exception e)
            {
                Debug.WriteLine("Unexpected exception occurred during sending accept invite message: " + e);
            }
            finally
            {
                loadingDialog.Hide();
                await NavigationService.PopModalAsync();
            }
        });

        public ICommand RejectInviteCommand => new Command(async () => await NavigationService.PopModalAsync());

        #endregion

        #region Bindable Properties
        private string _inviteTitle;
        public string InviteTitle
        {
            get => _inviteTitle;
            set => this.RaiseAndSetIfChanged(ref _inviteTitle, value);
        }

        private string _inviteContents = "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua";
        public string InviteContents
        {
            get => _inviteContents;
            set => this.RaiseAndSetIfChanged(ref _inviteContents, value);
        }

        private string _inviterUrl;
        public string InviterUrl
        {
            get => _inviterUrl;
            set => this.RaiseAndSetIfChanged(ref _inviterUrl, value);
        }
        #endregion
    }
}
