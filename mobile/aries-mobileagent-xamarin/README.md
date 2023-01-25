# DIDComm Over BLE Prototyp

Dieses Readme enthält Informationen um den
BLE über DIDComm Prototypen aufzusetzen und zum
Laufen zu bringen.

## REQUIREMENTS

- Vorzugsweise wird eine IDE genutzt die Xamarin.Forms unterstützt
wie zum Beispiel Visual Studio oder JetBrains Rider.

- Um den Prototyp korrekt testen zu können werden mindestens zwei Smartphones
benötigt die BLE unterstützen. 

- Um eine iOS App auf ein echtes Gerät zu deployen sind außerdem
noch zusätzliche Schritte nötig.
Eine Anleitung um Xamarin.Forms Apps auf iOS Geräte zu deployen ist hier zu finden: 
https://docs.microsoft.com/de-de/xamarin/ios/get-started/installation/device-provisioning/free-provisioning?tabs=macos

- Damit die App korrekt funktioniert muss sie alle nötigen
Berechtigungen erhalten die sie braucht.

## NOTES

- Der Prototyp wurde bisher nur für iOS Geräte getestet weshalb
eine Funktionalität für Android nicht gewährleistet ist.

- Auf iOS ist es möglich das man zweimal auf den Button drücken muss um
den Server zu starten, das ist dadurch bedingt das auf iOS die Bluetooth-Funktionalität nicht sofort verfügbar ist.

## DEPLOYMENT

Um den Prototyp verwenden zu können muss zunächst der Aries Agent
gebaut werden. Eine detailierte Anleitung
dazu ist in der Repo zu finden: LINK

Zusammendfassend sind folgende Schritte zu beachten:

1. Das Indy-SDK installieren: https://github.com/hyperledger/indy-sdk#installing-the-sdk. The [libindy](https://repo.sovrin.org/windows/libindy/stable/1.9.0/) library (lib-folder) needs to be added to path
2. Einen ngrok HTTP Tunnel über Port 5000 öffnen
3. Die HTTP Adresse vom Tunnel in dem Mediator und in der App.xaml.cs als Endpoint definieren.
4. Im Mediator Ordner über das Terminal "dotnet run" ausführen um den Mediator zu starten.
5. Gegebenfalls müssen die alten Wallets bei einem Neustart gelöscht werden. Diese befinden sich "~/.indy_client/wallet" und lassen sich durch 
"rm -rf wallet" entfernen.

## TEST

Für das Testen der App wird das DID-Exchange Protokoll verwendet
mit welchem man eine DIDComm Verbindung aufbauen kann.
Im Prototyp werden dafür folgende Schritte befolgt:

1. Erstellung der Wallet ist abgeschlossen
2. Auf der Startseite ist ein Button um den GATT Server zu starten, der Server muss an bleiben damit der Prototyp richtig funktioniert.
3. Eins der zwei Smartphones muss eine BLE-Einladung erstellen, diese ist
über den "Create Invitation" Button zu finden. Danach muss man auf den
"CreateBleInvitation" Button klicken.
4. Nun wurde ein QR-Code erstellt der die BLE-Einladung darstellt, diese
muss von dem anderen Smartphone eingescannt werden.
5. Wenn dieser den QR-Code eingescannt hat werden die Nachrichten im Hintergrund über BLE ausgetauscht und die Verbindung ist hergestellt. Zur Bestätigung
sollte auf beiden Smartphones ein Fenster erscheinen mit der Nachricht "BLE Nachricht erfolgreich erhalten!" und die "Connection" Einträge auf der Startseite sollten den Zustand "Connected" besitzen.