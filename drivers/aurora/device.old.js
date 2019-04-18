'use strict';

const Homey = require('homey');
const AuroraAPI = require('nanoleaves');

const POLL_INTERVAL = 5000;
const CAPABILITY_DEBOUNCE = 200;

class NanoleafDevice extends Homey.Device {
	
	onInit() {
				
		this._data = this.getData();
		this._id = this._data.id;
		
		this._store = this.getStore();
		this._token = this._store.token;
		
		this._api = null;
		this._info = null;
		this._added = false;
		
		this.setUnavailable( Homey.__('searching') );
		
		this._driver = this.getDriver();
		this._driver.ready(() => {
			
			let nanoleafDevice = this._driver.getNanoleafDevice( this._id );
			if( nanoleafDevice ) return this._initNanoleafDevice( nanoleafDevice );
			
			this._driver.once(`device:${this._id}`, this._initNanoleafDevice.bind(this));
		})
		
		this.registerMultipleCapabilityListener([ 'onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature', 'light_mode' ], this._onCapabilityChange.bind(this), CAPABILITY_DEBOUNCE);
		
		
	}
	
	onAdded() {
		this._added = true; // flash briefly after initialization
	}
	
	onDeleted() {
		if( this._syncInterval ) clearInterval(this._syncInterval);
	}
	
	_sync() {
		
		if( this._saving ) return;
		
		this._api.info().then( info => {
			this._info = info;
			//this.log(info)
			this.setAvailable();
			
			let state = this._info.state;
			
			this.setCapabilityValue('onoff', NanoleafDevice.nanoleafToHomeyValue('on', state.on) );
			this.setCapabilityValue('dim', NanoleafDevice.nanoleafToHomeyValue('brightness', state.brightness) );
			this.setCapabilityValue('light_hue', NanoleafDevice.nanoleafToHomeyValue('hue', state.hue) );
			this.setCapabilityValue('light_saturation', NanoleafDevice.nanoleafToHomeyValue('sat', state.sat) );
			this.setCapabilityValue('light_temperature', NanoleafDevice.nanoleafToHomeyValue('ct', state.ct) );
			this.setCapabilityValue('light_mode', NanoleafDevice.nanoleafToHomeyValue('colorMode', state.colorMode) );
			
			if( this._added ) {
				this._added = false;
				return this._api.identify();
			}
		}).catch( err => {
			if( err.code === 'ECONNREFUSED' ) return;
			
			this.error( err.message || err.toString() );
			this.setUnavailable( err );
		})
	}
	
	static nanoleafToHomeyValue( id, input ) {
		
		if( id === 'on' ) return input.value === true;
		if( id === 'colorMode' ) {
			if( input === 'ct' ) return 'temperature';
			if( input === 'hs' ) return 'color';
			return null;
		}
		if( id === 'brightness' || id === 'hue' || id === 'sat' ) {
			return ( input.value - input.min ) / ( input.max - input.min );			
		}
		if( id === 'ct' ) {
			return 1 - ( input.value - input.min ) / ( input.max - input.min );
		}
		
	}
	
	_onCapabilityChange( valueObj, optsObj ) {
		
		// if only light_mode changed
		if( Object.keys(valueObj).length === 1 && valueObj.light_mode ) {
			let obj = {};
			
			if( valueObj.light_mode === 'color' )			
				return this._onCapabilityChange({
					light_hue: this.getCapabilityValue('light_hue')
				}, optsObj)
			
			if( valueObj.light_mode === 'temperature' )			
				return this._onCapabilityChange({
					light_temperature: this.getCapabilityValue('light_temperature')
				}, optsObj)
		}
				
		let cmds = [];
		
		if( typeof valueObj.onoff === 'boolean' ) {
			cmds.push( valueObj.onoff ? this._api.on() : this._api.off() )
		}
		
		if( typeof valueObj.dim === 'number' ) {
			cmds.push( this._api.setBrightness( valueObj.dim * 100 ) )
		}
		
		if( typeof valueObj.light_hue === 'number' ) {
			cmds.push( this._api.setHue( valueObj.light_hue * 360 ) )
		}
		
		if( typeof valueObj.light_saturation === 'number' ) {
			cmds.push( this._api.setSaturation( valueObj.light_saturation * 100 ) )
		}
		
		if( typeof valueObj.light_temperature === 'number' ) {
			cmds.push( this._api.setTemperature( 1200 + (1-valueObj.light_temperature) * ( 6500 - 1200 ) ) )
		}
				
		this._saving = true;
		
		return Promise.all( cmds ).then(() => {
			this._saving = false;
		}).catch( err => {
			this._saving = false;
			throw err;
		});
	}
	
	_initNanoleafDevice( nanoleafDevice ) {
		this._api = new AuroraAPI({
			host: nanoleafDevice.host,
			port: nanoleafDevice.port,
			token: this._token,
		})
		
		if( this._syncInterval ) clearInterval(this._syncInterval);
		this._syncInterval = setInterval(this._sync.bind(this), POLL_INTERVAL)
		this._sync();
		
	}
	
	getEffects() {
		return this._api.effects().then( effects => {
			return effects.map( effect => {
				return {
					name: effect
				};
			})
		})
	}
	
	setEffect( effect ) {
		return this._api.setEffect( effect );
	}
	
}

module.exports = NanoleafDevice;

/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   {number}  h       The hue
 * @param   {number}  s       The saturation
 * @param   {number}  l       The lightness
 * @return  {Array}           The RGB representation
 */
function hslToRgb(h, s, l){
    var r, g, b;

    if(s == 0){
        r = g = b = l; // achromatic
    }else{
        var hue2rgb = function hue2rgb(p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return { r, g, b };
}
