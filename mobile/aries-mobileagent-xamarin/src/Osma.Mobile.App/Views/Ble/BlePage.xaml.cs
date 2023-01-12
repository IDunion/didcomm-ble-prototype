using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Osma.Mobile.App.ViewModels.Ble;
using Xamarin.Forms;
using Xamarin.Forms.Xaml;

namespace Osma.Mobile.App.Views.Ble
{
    [XamlCompilation(XamlCompilationOptions.Compile)]
    public partial class BlePage : ContentPage
    {
        private readonly BleViewModel _vm;
        
        public BlePage()
        {
            InitializeComponent();
            _vm = (BleViewModel) BindingContext;
        }

        private void Switch_OnToggled(object sender, ToggledEventArgs e)
        {
            _vm.ToggleBleServerCommand.ExecuteAsync();
        }
    }
}