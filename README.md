arp-find-ip
==================

 **Sometimes you need to consume a service from a local network segment host, but, you can't/ won't avoid the DHCP server to change default IP leasing mechanism.**
 
 **Use arp-find-ip to populate your ARP table and ask for your 'well known' host MAC's actual leased IP.**


Install
-------

```
npm install -g arp-find-ip

```

Usage
-------

```node
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
```