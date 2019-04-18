'use strict';

const Homey = require('homey');
const NanoleafDiscovery = require('./NanoleafDiscovery');

module.exports = class NanoleafHomeyApp extends Homey.App {
  
  onInit() {    
    this.discovery = new NanoleafDiscovery();
    this.discovery.on('__log', (...props) => this.log('[NanoleafDiscovery]', ...props));
    this.discovery.on('__error', (...props) => this.error('[NanoleafDiscovery]', ...props));
    this.discovery.start();
    
    this.onInitFlow();
  }
  
  onInitFlow() {
    new Homey.FlowCardAction('set_effect')
      .register()
      .registerRunListener( async args => {
        return args.device.setEffect( args.effect.name )
      })
      .getArgument('effect')
      .registerAutocompleteListener(async ( query, args ) => {
        const effects = await args.device.getEffects();
        return effects.map(effect => {
          return {
            name: effect,
          };
        }).filter( effect => {
          return effect.name.toLowerCase().includes( query.toLowerCase() );
        });
      });
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