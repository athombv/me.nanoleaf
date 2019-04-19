'use strict';

const { SimpleClass } = require('homey');
const mdns = require('mdns-js');
const NanoleafAPI = require('./NanoleafAPI');

mdns.excludeInterface('0.0.0.0');

module.exports = class NanoleafDiscovery extends SimpleClass {
  
  constructor(...props) {
    super(...props);
    
    this.onDiscoveryReady = this.onDiscoveryReady.bind(this);
    this.onDiscoveryUpdate = this.onDiscoveryUpdate.bind(this);
    
    this.devices = {};
  }
  
  start() {
    if(this.discovery) return;
    
    this.discovery = mdns.createBrowser(mdns.tcp('nanoleafapi'));
    this.discovery.on('ready', this.onDiscoveryReady);
    this.discovery.on('update', this.onDiscoveryUpdate);    
  }
  
  onDiscoveryReady() {
    //this.log('onDiscoveryReady');
    this.discovery.discover(); 
  }
  
  onDiscoveryUpdate( data ) {
    //this.log('onDiscoveryUpdate', data);
    
    try {      
      if(!data.txt) return;
      if(!data.query || data.query.indexOf('_nanoleafapi._tcp.local') === -1) return;
            
      const {
        port,
        addresses,
        txt,
        fullname,
      } = data;
      
      const name = fullname.replace('._nanoleafapi._tcp.local', '');
      
      const [
        address,
      ] = addresses;
      
      const {
        id,
        md: model,
      } = this.constructor.parseTxt(txt);
      
      if( this.devices[id] ) {
        this.devices[id].address = address;
        this.devices[id].name = name;
        this.devices[id].port = port;
      } else {
        this.devices[id] = new NanoleafAPI({
          id,
          name,
          port,
          address,
          model,
        });
        
        this.log(`Found device: ${name} [${id}] @ ${address}:${port}`);
        this.emit(`device`, this.devices[id]);
        this.emit(`device:${id}`, this.devices[id]);
      }
    
    } catch( err ) {
      this.error(err);
      this.error('Data:', data);
    }
  }
  
  static parseTxt( txt ) {
      const resultObj = {};
      if( !Array.isArray(txt) ) return null;
      txt.map(txtEntry => {
        return txtEntry.split('=');
      }).forEach(txtEntry => {
        resultObj[ txtEntry[0] ] = txtEntry[1];
      })
      return resultObj;
    }
  
  
}