// Copyright (c) 2022 - for information on the respective copyright owner see the NOTICE file or the repository https://github.com/idunion/didcomm-ble-prototype.
//
// SPDX-License-Identifier: Apache-2.0

// small helper to generate some easy configuration for proof requests
export interface ProofConfig {
    attributes: Attribute[],
}

export interface Attribute {
    name: string,
    credDef?: string,
    schema?: string,
}
