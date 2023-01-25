#nullable enable
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Reactive.Disposables;
using System.Reactive.Linq;
using System.Text;
using System.Threading.Tasks;
using ReactiveUI;
using Shiny;
using Shiny.BluetoothLE;
using Shiny.BluetoothLE.Managed;

namespace Hyperledger.Aries.Agents.Transport
{
    /// <inheritdoc />
    public class BleMessageDispatcher : IMessageDispatcher
    {
        private const string DIDCommServiceUUID = "d2f195b6-2e80-4ab0-be24-32ebe761352f";

        private const string ReadDIDCommMessageCharacteristicUUID = "e6e97879-780a-4c9b-b4e6-dcae3793a3e8";
        private const string WriteDIDCommMessageCharacteristicUUID = "c3103ded-afd7-477c-b279-2ad264e20e74";

        /// <inheritdoc />
        public string[] TransportSchemes => new[]
        {
            "ble"
        };

        private CompositeDisposable DeactivateWith => _deactivateWith ??= new CompositeDisposable();
        private CompositeDisposable? _deactivateWith;

        private readonly IBleManager? _bleManager = ShinyHost.Resolve<IBleManager>();
        private IManagedScan? _scanner;

        /// <inheritdoc />
        public async Task<PackedMessageContext?> DispatchAsync(Uri endpoint, PackedMessageContext msg)
        {
            return null;
        }

        /// <inheritdoc />
        public async Task<byte[]> DispatchAsync(string endpoint, byte[] msg)
        {
            if (_bleManager == null)
                throw new Exception("Ble manager is null");
            if (_bleManager.IsScanning)
                throw new Exception("Ble manager is already scanning");

            _bleManager.RequestAccess().Subscribe(state => { Debug.WriteLine("BLE Access state is: " + state); });

            return await ScanDevicesAndDoWrite(msg);
        }

        private async Task<byte[]> ScanDevicesAndDoWrite(byte[] message)
        {
            byte[] result = null!;
            var taskCompletionSource = new TaskCompletionSource<bool>();

            _scanner = _bleManager?
                .CreateManagedScanner(RxApp.MainThreadScheduler, TimeSpan.FromSeconds(10),
                    new ScanConfig {ServiceUuids = new List<string> {DIDCommServiceUUID}})
                .DisposedBy(DeactivateWith);

            _scanner?.WhenScan().Take(1).SubscribeAsync(async tuple =>
            {
                _scanner.Stop();
        
                var (_, scanResult) = tuple;
        
                if (scanResult == null)
                    return;
                
                Debug.WriteLine("Device discovered during scan: " + scanResult.Peripheral.Name);

                scanResult.Peripheral.WhenConnected().SubscribeAsync(async peripheral =>
                {
                    Debug.WriteLine("Connected to: " + peripheral.Name);
                    Debug.WriteLine("mtu size set: " + peripheral.MtuSize);
                    Debug.WriteLine("Trying to get characteristic " + WriteDIDCommMessageCharacteristicUUID);
                    var writeDidCommMessageCharacteristic = await peripheral.GetKnownCharacteristicAsync(
                        DIDCommServiceUUID, WriteDIDCommMessageCharacteristicUUID);
                    var count = 0;
                    while (count < message.Length)
                    {
                        var chunkLength = Math.Min(scanResult.Peripheral.MtuSize, message.Length - count);
                        var chunk = new byte[chunkLength];
                        
                        Array.Copy(message, count, chunk, 0, chunkLength);
                        
                        Debug.WriteLine("Writing to characteristic " + writeDidCommMessageCharacteristic.Uuid + "...");
                        await writeDidCommMessageCharacteristic.WriteAsync(chunk, true);
                        count += chunkLength;
                    }
                    Debug.WriteLine("Successfully written to characteristic " + writeDidCommMessageCharacteristic.Uuid);
                        
                    await Task.Delay(TimeSpan.FromSeconds(1));
                        
                    var readDidCommMessageCharacteristic = await scanResult.Peripheral.GetKnownCharacteristicAsync(
                        DIDCommServiceUUID, ReadDIDCommMessageCharacteristicUUID);
                        
                    Debug.WriteLine("Reading from characteristic " + readDidCommMessageCharacteristic.Uuid + "...");
                        
                    var isReadSuccessful = false;
                    var readResultComplete = string.Empty;
                    var readResultBytes = new List<byte>();
                    while (!isReadSuccessful)
                    {
                        try
                        {
                            var readResult = await readDidCommMessageCharacteristic.ReadAsync();
                            readResultBytes.AddRange(readResult.Data!);
                                
                            var readResultUtf8 = Encoding.UTF8.GetString(readResult.Data!);
                            readResultComplete += readResultUtf8;
                                
                            isReadSuccessful = readResultComplete.StartsWith("{") && readResultComplete.EndsWith("}");
                            if (!isReadSuccessful) continue;
                                
                            Debug.WriteLine("Successfully read from characteristic " + readDidCommMessageCharacteristic.Uuid);
                            Debug.WriteLine("Reading result in utf8: " + readResultComplete);

                            var da = Encoding.UTF8.GetString(readResultBytes.ToArray());
                            Debug.WriteLine("Reading result in bytes: " + da);
                                
                            result = readResultBytes.ToArray();
                            taskCompletionSource.SetResult(true);
                        }
                        catch (Exception e)
                        {
                            Debug.WriteLine(e);
                        }
                    }
                });

                try
                {
                    var countToFailure = 0;
                    while (!scanResult.Peripheral.IsConnected() || countToFailure >= 5)
                    {
                        Debug.WriteLine("Trying to connect to " + scanResult.Peripheral.Name + "...");
                        scanResult.Peripheral.Connect(new ConnectionConfig
                        {
                            AndroidConnectionPriority = ConnectionPriority.High,
                            AutoConnect = false
                        });
                        
                        await Task.Delay(TimeSpan.FromSeconds(10));
                        countToFailure++;
                    }
                }
                catch (Exception e)
                {
                    Debug.WriteLine("Unexpected Exception occurred while trying to establish BLE Connection with: " +
                                    scanResult.Peripheral.Uuid + " " + e);
                    throw;
                }
            });
        
            await _scanner?.Start()!;
            
            await Task.WhenAll(taskCompletionSource.Task);
            return result;
        }
    }
}
