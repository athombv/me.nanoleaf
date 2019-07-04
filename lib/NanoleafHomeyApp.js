'use strict';

const Homey = require('homey');

module.exports = class NanoleafHomeyApp extends Homey.App {
  
  onInit() {
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
  
}