var util = require('util');
var ARP = require('../lib/arp-find-ip');

var arp = new ARP();
arp.discover();

arp.on('error', function (err) {
    console.log(err);
});

// Discovery (AKA arp-scan) :
arp.on('success', function (res) {
    if (!res) {
        console.log('!res');
        return;
    }
    // Search for a particular MAC's ip :
    console.log(arp.getIP('00:40:ad:9e:a4:eb'));
});