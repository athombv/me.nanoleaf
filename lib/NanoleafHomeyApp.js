'use strict';

const Homey = require('homey');
const NanoleafDiscovery = require('./NanoleafDiscovery');

module.exports = class NanoleafHomeyApp extends Homey.App {
  
  onInit() {    
    this.discovery = new NanoleafDiscovery();
    this.discovery.on('__log', (...props) => this.log('[NanoleafDiscovery]', ...props));
    this.discovery.on('__error', (...props) => this.error('[NanoleafDiscovery]', ...props));
    this.discovery.start();
  }
  
  getDevices() {
    return this.discovery.devices;
  }
  
  async getDevice({ id }) {
    if( this.discovery.devices[id] )
      return this.discovery.devices[id];
      
    return new Promise(resolve => {
      this.discovery.once(`device:${id}`, resolve);
    });
  }
  
}