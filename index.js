var util          = require('util')
,   ARP_Discovery = require('./lib/arp-discovery')
;

var arp = new ARP_Discovery({timeout:1000, flood_interval: 300, resolve_macvendor:false});

arp.on('error', function(err){
  console.log(err);
});

// Discovery :
arp.on('success', function(res) {
    if (!res) {
        console.log('!res');
        return;
    }
    var list = arp.getMacs();
    if(list['8C:85:90:0C:AA:03'] !== undefined) {
        console.log("found", list['8C:85:90:0C:AA:03']);
    }
    else
    console.log('not found');
    //console.log('success: '+util.inspect(res, { depth: null }));
    //console.log('getMacs: '+util.inspect(arp.getMacs(), { depth: null }));
    //console.log('getIps:  '+util.inspect(arp.getIps(), { depth: null }));
});
arp.discover();