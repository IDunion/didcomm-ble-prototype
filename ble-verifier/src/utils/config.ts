// Copyright (c) 2022 - for information on the respective copyright owner see the NOTICE file or the repository https://github.com/idunion/didcomm-ble-prototype.
//
// SPDX-License-Identifier: Apache-2.0

import { ProofConfig } from "../controller/config";

export interface Config {
    genesisurl?: string,
    network?: string,
    mediatorinvite?: string,
    blecharacteristicwrite?: string,
    blecharacteristiread?: string,
    bleservice?: string,
    blemode?: string,
    blechunkinglimit?: number
    mqtt: MqttConfig
    proof: ProofConfig
}

export interface MqttConfig {
    broker: string,
    topic: string,
}
