"use strict";

var os        = require('os')
,   ip        = require('ip')
,   util      = require('util')
,   net       = require('net')
,   http      = require('http')
,   async     = require('async')
,   EventEmitter  = require('events').EventEmitter
,   child_process = require('child_process')
;

var ARP_CMD = "arp";
var ARP_ARG = ["-a"];

/**
 * ARP_FIND_IP
 */

var ARP_Discovery = module.exports = function(opts) {
    var self = this;
    EventEmitter.call(this);

    if (!opts) {
        opts = {};
    }

    self.ips = {};
    self.mac = {};
    self.active= {};
    self.hosts = [];
    self.buf = "";
    self.ipv4  = "127.0.0.1";
    self.iface = null;

    opts.max_connections  = opts.max_connections || 64;
    opts.max_hosts        = opts.max_hosts || 4 * 256;
    opts.timeout          = opts.timeout || 2500;         // connection timeout (ms) defaut 2500
    opts.port             = opts.port || 1;
    opts.flood_interval   = opts.flood_interval || 5*60;  // flood interval (sec) default 5 minutes (300)

    self.opts             = opts;

    self.on('scan',   self._read);
    self.on('read',   self._parse);
    self.on('parse',  self._update);

    // find first external ip unless specified with restrict:"ip adress" option
    self._ipv4(opts.restrict);
    // fill in with ips of all hosts in subnet
    self._populate_hosts();

    return this;
}
util.inherits(ARP_Discovery, EventEmitter);

/**
 *  Read and parse ARP table
 */
ARP_Discovery.prototype._read = function(opts) {

    var self = this;

    self.buf = "";

    var c_process = child_process.spawn(ARP_CMD, ARP_ARG );

    c_process.stdout.on('data', function(chunk) {
        self.buf += chunk;
    });

    c_process.on('close', function() {
        self.emit('read');
    });

    c_process.stderr.on('data', function(err) {
        self.emit('error', err);
    });
}

ARP_Discovery.prototype._normalize = function(mac) {
    var parts = mac.toUpperCase().split(":");
    if (parts.length !== 6) {
        return;
    }

    for (var i = 0; i < parts.length; i++) {
        var part = parts[i];
        if (part.length === 1) {
            parts[i] = "0" + part;
        }
    }

    return parts.join(":")
};

ARP_Discovery.prototype._line = function (line) {
    var self = this
    ,   match = line.match(/^([^ ]+) \(([^)]+)\)/)
    ,   res = {}
    ;

    if (match) {
        res.ip = match[2];

        if (match[1] !== '?') {
            res.host = match[1];
        } else {
            res.host = 'unknown';
        }

        match = line.match(/^.* at ([^ ]+)/);
        if (match) {
            res.mac = self._normalize(match[1]);
        }

        match = line.match(/^.* on ([a-z][a-z0-9]+)/);
        if (match) {
            res.interface = match[1];
        }
        if (res.mac && !/FF:FF:FF:FF:FF:FF/.test(res.mac)) {
            res.seen = (new Date()).getTime();
            self.active[res.mac] = res;
        }
    }
};

ARP_Discovery.prototype._parse = function() {
    var self = this
    ,   lines = self.buf.split("\n")
    ,   len   = lines.length - 1;
    for (var i = 0; i < len; i++) {
        self._line(lines[i]);
    }
    self.emit('parse');
}

/**
 * Utility return an object {mac:ip}
 */
ARP_Discovery.prototype.getMacs = function(){

  var self = this;

  var macs = [];

  for (var mac in self.active){
      macs[mac]  = self.active[mac].ip;
  }

  return macs;
}

/**
 * Utility return a MAC's IP if found
 */
ARP_Discovery.prototype.getIP = function(target){

    var self = this;
    var mac = target.toUpperCase();
    if(self.active[mac] !== undefined) {
        return self.active[mac].ip
    }
    else
    return undefined;
  }
/**
 * Keep active hosts table up to date for monitoring
 */
ARP_Discovery.prototype._update = function(){
  var self = this;

    self.emit('success', self.active);

}



/**
 * Flood network to ensure ARP table is up to date
 */

ARP_Discovery.prototype._connect = function(host, next) {
    var self = this
    ,  client
    ,  cb = function(){
      client.destroy();
      next();
    };
    client = net.connect(self.opts.port, host, cb);
    client.on('timeout', cb);
    client.on('error',  cb);
    client.setTimeout(self.opts.timeout);
}

/**
 * Public Methods : perform single ARP discovery
 */
ARP_Discovery.prototype.discover = function() {
        var self = this;
        // now flood
        async.eachLimit(self.hosts, self.opts.max_connections, self._connect.bind(self),
          function(err){
              if (err) self.emit('error', err);
              self.emit('scan');
          });
};

/**
 * Get current host ip/subnet
 */
ARP_Discovery.prototype._ipv4 = function (restrict) {

    var self = this
    ,   ifaces = os.networkInterfaces()
    ;

    for (var dev in ifaces) {
        var devs = ifaces[dev]
        for (var di in devs) {
            var ni = devs[di]

            if (ni.family != 'IPv4') {
                continue
            }
            if (ni.address == '127.0.0.1') {
                continue
            }
            if (ni.internal) {
                continue
            }

            if (restrict !== undefined && !ip.isEqual(restrict, ni.address)) {
                continue;
            }

            self.ipv4 = ni.adress;
            self.iface= ni;
        }
    }
}

ARP_Discovery.prototype._populate_hosts = function(next) {

    var self = this
    ,   ni = self.iface
    ,   subnet     = ip.subnet(ni.address, ni.netmask)
    ,   first_long = ip.toLong(subnet.firstAddress)
    ;

    self.hosts = [];

    for (var i = 0; (i < subnet.numHosts) && (i < self.opts.max_hosts); i++) {
        var cur_long  = first_long + i;
        var cur_ip    = ip.fromLong(cur_long)
        self.hosts.push(cur_ip);
    }

}