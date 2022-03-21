import bleno from '@abandonware/bleno'

const Characteristic = bleno.Characteristic;
const Descriptor = bleno.Descriptor;

export const didcommCharacteristic = new Characteristic({
    uuid: '0d3a0e3a-b86d-46cb-99d9-61c37ebeeac1', // or 'fff1' for 16-bit
    properties: ['read', 'write', 'notify'], // can be a combination of 'read', 'write', 'writeWithoutResponse', 'notify', 'indicate'
    // secure: [ ... ], // enable security for properties, can be a combination of 'read', 'write', 'writeWithoutResponse', 'notify', 'indicate'
    value: null, // optional static value, must be of type Buffer - for read only characteristics
    descriptors: [
      new Descriptor({
        uuid: '2901',
        value: 'Gets or sets.'
      })
    ],
    onReadRequest: null, // optional read request handler, function(offset, callback) { ... }
    onWriteRequest: null, // optional write request handler, function(data, offset, withoutResponse, callback) { ...}
    onSubscribe: null, // optional notify/indicate subscribe handler, function(maxValueSize, updateValueCallback) { ...}
    onUnsubscribe: null, // optional notify/indicate unsubscribe handler, function() { ...}
    onNotify: null, // optional notify sent handler, function() { ...}
    onIndicate: null // optional indicate confirmation received handler, function() { ...}
});

// util.inherits(didcommCharacteristic, BlenoCharacteristic);