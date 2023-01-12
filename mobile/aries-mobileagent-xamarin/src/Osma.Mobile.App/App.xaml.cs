using System;
using System.IO;
using System.Reflection;
using System.Timers;
using Autofac;
using Autofac.Extensions.DependencyInjection;
using Hyperledger.Aries.Agents;
using Hyperledger.Aries.Routing;
using Hyperledger.Aries.Storage;
using Hyperledger.Aries.Utils;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Osma.Mobile.App.Services;
using Osma.Mobile.App.Services.Interfaces;
using Osma.Mobile.App.ViewModels;
using Osma.Mobile.App.ViewModels.Account;
using Osma.Mobile.App.ViewModels.Ble;
using Osma.Mobile.App.ViewModels.Connections;
using Osma.Mobile.App.ViewModels.CreateInvitation;
using Osma.Mobile.App.ViewModels.Credentials;
using Osma.Mobile.App.ViewModels.Proofs;
using Osma.Mobile.App.Views;
using Osma.Mobile.App.Views.Account;
using Osma.Mobile.App.Views.Ble;
using Osma.Mobile.App.Views.Connections;
using Osma.Mobile.App.Views.CreateInvitation;
using Osma.Mobile.App.Views.Credentials;
using Osma.Mobile.App.Views.Proofs;
using Xamarin.Essentials;
using Xamarin.Forms;
using Xamarin.Forms.Xaml;

[assembly: XamlCompilation(XamlCompilationOptions.Compile)]
namespace Osma.Mobile.App
{
    public partial class App : Application
    {
        public new static App Current => Application.Current as App;
        public static IContainer Container { get; set; }

        // Timer to check new messages in the configured mediator agent every 10sec
        private readonly Timer timer;
        private static IHost Host { get; set; }

        public App()
        {
            InitializeComponent();
            
            if (string.IsNullOrEmpty(Preferences.Get("BleIdentifier", string.Empty)))
            {
                Preferences.Set("BleIdentifier", "ble-" + Guid.NewGuid());
            }
            
            timer = new Timer
            {
                Enabled = false,
                AutoReset = true,
                Interval = TimeSpan.FromSeconds(10).TotalMilliseconds
            };
            timer.Elapsed += Timer_Elapsed;
        }

        public App(IHost host) : this() => Host = host;

        public static IHostBuilder BuildHost(Assembly platformSpecific = null) =>
            XamarinHost.CreateDefaultBuilder<App>()
                .ConfigureServices((_, services) =>
                {
                    services.AddAriesFramework(builder => builder.RegisterEdgeAgent(
                        options: options =>
                        {
                            options.EndpointUri = "http://6f0a-2a02-908-1963-cb00-5dcb-b173-4b33-7bc3.ngrok.io";

                            options.WalletConfiguration.StorageConfiguration =
                                new WalletConfiguration.WalletStorageConfiguration
                                {
                                    Path = Path.Combine(
                                        path1: FileSystem.AppDataDirectory,
                                        path2: ".indy_client",
                                        path3: "wallets")
                                };
                            options.WalletConfiguration.Id = "MobileWallet";
                            options.WalletCredentials.Key = "SecretWalletKey";
                            options.RevocationRegistryDirectory = Path.Combine(
                                path1: FileSystem.AppDataDirectory,
                                path2: ".indy_client",
                                path3: "tails");

                            // Available network configurations (see PoolConfigurator.cs):
                            //   sovrin-live
                            //   sovrin-staging
                            //   sovrin-builder
                            //   bcovrin-test
                            options.PoolName = "sovrin-staging";
                        },
                        delayProvisioning: true));

                    services.AddSingleton<IPoolConfigurator, PoolConfigurator>();

                    var containerBuilder = new ContainerBuilder();
                    containerBuilder.RegisterAssemblyModules(typeof(CoreModule).Assembly);
                    if (platformSpecific != null)
                    {
                        containerBuilder.RegisterAssemblyModules(platformSpecific);
                    }

                    containerBuilder.Populate(services);
                    Container = containerBuilder.Build();
                });

        protected override async void OnStart()
        {
            await Host.StartAsync();

            // View models and pages mappings
            var navigationService = Container.Resolve<INavigationService>();
            navigationService.AddPageViewModelBinding<BleViewModel, BlePage>();
            navigationService.AddPageViewModelBinding<MainViewModel, MainPage>();
            navigationService.AddPageViewModelBinding<ConnectionsViewModel, ConnectionsPage>();
            navigationService.AddPageViewModelBinding<ConnectionViewModel, ConnectionPage>();
            navigationService.AddPageViewModelBinding<RegisterViewModel, RegisterPage>();
            navigationService.AddPageViewModelBinding<AcceptInviteViewModel, AcceptInvitePage>();
            navigationService.AddPageViewModelBinding<CredentialsViewModel, CredentialsPage>();
            navigationService.AddPageViewModelBinding<CredentialViewModel, CredentialPage>();
            navigationService.AddPageViewModelBinding<AccountViewModel, AccountPage>();
            navigationService.AddPageViewModelBinding<CreateInvitationViewModel, CreateInvitationPage>();

            navigationService.AddPageViewModelBinding<ProofRequestsViewModel, ProofRequestsPage>();
            navigationService.AddPageViewModelBinding<ProofRequestViewModel, ProofRequestPage>();
            navigationService.AddPageViewModelBinding<ProofRequestAttributeViewModel, ProofRequestAttributePage>();
            
            if (Preferences.Get(AppConstant.LocalWalletProvisioned, false))
            {
                await navigationService.NavigateToAsync<MainViewModel>();
            }
            else
            {
                await navigationService.NavigateToAsync<RegisterViewModel>();
            }

            timer.Enabled = true;
        }

        private void Timer_Elapsed(object sender, ElapsedEventArgs e)
        {
            // Check for new messages with the mediator agent if successfully provisioned
            if (Preferences.Get(AppConstant.LocalWalletProvisioned, false))
            {
                Device.BeginInvokeOnMainThread(async () =>
                {
                    try
                    {
                        var context = await Container.Resolve<IAgentProvider>().GetContextAsync();
                        await Container.Resolve<IEdgeClientService>().FetchInboxAsync(context);
                    }
                    catch (Exception ex)
                    {
                        //Debug.WriteLine(ex);
                    }
                });
            }
        }
        protected override void OnSleep() =>
            // Stop timer when application goes to background
            timer.Enabled = false;

        protected override void OnResume() =>
            // Resume timer when application comes in foreground
            timer.Enabled = true;
    }
}
