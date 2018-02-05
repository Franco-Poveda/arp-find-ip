var network = require('network');
var arpScanner = require('arpscan/promise');

network.get_active_interface(function(err, obj) {
/*   
    { name: 'eth0',
      ip_address: '10.0.1.3',
      mac_address: '56:e5:f9:e4:38:1d',
      type: 'Wired',
      netmask: '255.255.255.0',
      gateway_ip: '10.0.1.1' }
   
    */
    console.log(obj);
    arpScanner({interface: obj.name})
    .then(onResult)
    .catch(onError);
  })


function onResult(data) {
    console.log(data);
}

function onError(err) {
    throw err;
}