'use strict';

const Homey = require('homey');
const mdns = require('mdns-js');
const AuroraAPI = require('nanoleaves');

class NanoleafDriver extends Homey.Driver {
	
	onInit() {
		
		this._foundDevices = {};
		this._discovery = mdns.createBrowser( mdns.tcp('nanoleafapi') );
		this._discovery.on('ready', () => {
		    this._discovery.discover(); 
		});		
		this._discovery.on('update', data => {
			if( !data.query || data.query.indexOf('_nanoleafapi._tcp.local') === -1 ) return;
			
			let txtObj = parseTxt( data.txt );
			if( txtObj === null ) return;
			let id = txtObj.id;
			
			if( typeof this._foundDevices[id] !== 'undefined' ) return;
			
			let device = this._foundDevices[id] = {
				name: data.fullname.replace('._nanoleafapi._tcp.local', ''),
				host: data.host, // TODO IP?
				port: data.port,
				api: new AuroraAPI({
				    host: data.host,
				    port: data.port
				})
			}
			
			this.log(`Found device "${device.name}" @ ${device.host}:${device.port}`);
			
			this.emit(`device:${id}`, device);
					    
		});
		
		new Homey.FlowCardAction('set_effect')
			.register()
			.registerRunListener( args => {
				return args.device.setEffect( args.effect.name )
			})
			.getArgument('effect')
			.registerAutocompleteListener(( query, args ) => {
				return args.device.getEffects().then( effects => {
					return effects.filter( effect => {
						return effect.name.toLowerCase().indexOf( query.toLowerCase() ) > -1
					});
				})
			})
		
		new Homey.FlowCardAction('set_rainbow')
			.register()
			.registerRunListener( args => {
				return args.device.setRainbow()
			})
		
	}
	
	getNanoleafDevice( id ) {
		return this._foundDevices[id];
	}
	
	onPair( socket ) {
		
		var trying = false;
		
		socket.on('list_devices', ( data, callback ) => {
			
			let devices = [];
			
			for( let id in this._foundDevices ) {
				let device = this._foundDevices[id];
				
				devices.push({
					name: device.name,
					data: { id },
					store: { token: null }
				})
			}
			
			callback( null, devices );
			
		})
		
		socket.on('get_token', ( data, callback ) => {
			
			let device = this._foundDevices[ data.id ];
			if( !device ) return callback( new Error('invalid_device') );
			
			function getToken() {
				trying = true;
				return new Promise(resolve => {
					function getTokenTry() {
						device.api.newToken()
							.then(resolve)
							.catch( err => {
								if( !trying ) return resolve();
								setTimeout(() => {
									getTokenTry();
								}, 1000);
							});
					}
					
					getTokenTry();
				});
				
			}
			
			getToken().then( token => {
				if( !token ) return;
				callback( null, {
					name: device.name,
					data: data,
					store: { token }
				});
			}).catch( err => {
				callback( err );
			})
			
		});
		
		socket.on('disconnect', function() {
			trying = false;
		});
		
	}
	
}

module.exports = NanoleafDriver;

function parseTxt( txt ) {
    let resultObj = {};
    if( !Array.isArray(txt) ) return null;
    txt.map(txtEntry => {
	    return txtEntry.split('=');
    }).forEach(txtEntry => {
	    resultObj[ txtEntry[0] ] = txtEntry[1];
    })
    return resultObj;
}