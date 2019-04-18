'use strict';

const Homey = require('homey');
const NanoleafHomeyDriver = require('../../lib/NanoleafHomeyDriver');

module.exports = class NanoleafAuroraDriver extends NanoleafHomeyDriver {
  
  static get MODELS() {
    return [ 'NL22' ];
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
      })
    
    new Homey.FlowCardAction('set_rainbow')
      .register()
      .registerRunListener( args => {
        return args.device.setRainbow()
      })
  }
  
}