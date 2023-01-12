using Microsoft.Extensions.DependencyInjection;
using Shiny;

namespace Osma.Mobile.App
{
    public class CustomShinyStartup : ShinyStartup
    {
        public override void ConfigureServices(IServiceCollection services, IPlatform platform)
        {
            services.UseBleClient();
            services.UseBleHosting();
        }
    }
}
