var config = require('config');
var util          = require('util')
,   ARP_Discovery = require('./lib/arp-discovery')
;

var cclon = config.get('cclon');
var arp = new ARP_Discovery({timeout:1000, resolve_macvendor:false});

arp.on('error', function(err){
  console.log(err);
});

// Discovery :
arp.on('success', function(res) {
    if (!res) {
        console.log('!res');
        return;
    }
    
    console.log(arp.getIP(cclon.mac));
});
arp.discover();