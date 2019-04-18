'use strict';

const Homey = require('homey');
const CT_MIN = 1200;
const CT_MAX = 6500;
const POLL_INTERVAL = 2000;

module.exports = class NanoleafDevice extends Homey.Device {
  
  onInit() {
    this.onPoll = this.onPoll.bind(this);
    this.onMultipleCapabilities = this.onMultipleCapabilities.bind(this);    
    
    this.setUnavailable(Homey.__('loading'));
        
    const { id } = this.getData();
    this.id = id;
    
    const { token } = this.getStore();
    this.token = token;
    
    this.capabilities = this.getCapabilities();
    this.registerMultipleCapabilityListener(this.capabilities, this.onMultipleCapabilities, 150);
    
    Homey.app.getDevice({ id }).then(api => {
      this.api = api;
      this.setAvailable();
      this.log('Found device on network');
      
      this.pollInterval = setInterval(this.onPoll, POLL_INTERVAL);
      this.onPoll();
    }).catch(this.error);
  }
  
  onDeleted() {
    if( this.pollInterval )
      clearInterval(this.pollInterval);
      
    const { token } = this;
    this.api.deleteUser({ token }).catch(this.error);
  }
  
  /*
   * Capabilities
   */
  
  onPoll() {
    const { token } = this;
    this.api.getState({ token }).then(state => {
      this.setAvailable();
      
      if( this.hasCapability('onoff') && state.on )
        this.setCapabilityValue('onoff', !!state.on.value).catch(this.error);
      
      if( this.hasCapability('dim') && state.brightness )
        this.setCapabilityValue('dim', state.brightness.value/100).catch(this.error);
      
      if( this.hasCapability('light_hue') && state.hue )
        this.setCapabilityValue('light_hue', state.hue.value/360).catch(this.error);
      
      if( this.hasCapability('light_saturation') && state.sat )
        this.setCapabilityValue('light_saturation', state.sat.value/100).catch(this.error);
      
      if( this.hasCapability('light_temperature') && state.ct )
        this.setCapabilityValue('light_temperature', 1-(state.ct.value-CT_MIN)/(CT_MAX-CT_MIN)).catch(this.error);
        
      if( this.hasCapability('light_mode') && state.colorMode ) {
        if( state.colorMode === 'ct' )
          this.setCapabilityValue('light_mode', 'temperature').catch(this.error);
          
        if( state.colorMode === 'hs' )
          this.setCapabilityValue('light_mode', 'color').catch(this.error);
      }
    }).catch(err => {
      this.setUnavailable(err);
      this.error(err);
    });
  }
  
  async onMultipleCapabilities( valueObj ) {    
    const { token } = this;
    const {
      onoff = this.getCapabilityValue('onoff'),
      dim = this.getCapabilityValue('dim'),
      light_hue = this.getCapabilityValue('light_hue'),
      light_saturation = this.getCapabilityValue('light_saturation'),
      light_temperature = this.getCapabilityValue('light_temperature'),
      light_mode = this.getCapabilityValue('light_mode'),
    } = valueObj;
    
    this.setCapabilityValue('onoff', onoff).catch(this.error);
    this.setCapabilityValue('dim', dim).catch(this.error);
    this.setCapabilityValue('light_hue', light_hue).catch(this.error);
    this.setCapabilityValue('light_saturation', light_saturation).catch(this.error);
    this.setCapabilityValue('light_temperature', light_temperature).catch(this.error);
    this.setCapabilityValue('light_mode', light_mode).catch(this.error);
    
    let on = !!onoff;
    let brightness;
    let hue;
    let sat;
    let ct;
    
    if( on === true ) {
      brightness = Math.round(dim * 100);
    
      if( light_mode === 'color' ) {
        hue = Math.round(light_hue * 360);
        sat = Math.round(light_saturation * 100);
      } else if( light_mode === 'temperature' ) {
        ct = Math.round(CT_MIN + (1-light_temperature) * (CT_MAX - CT_MIN));
      }
    }
    
    return this.api.setState({
      token,
      on,
      brightness,
      hue,
      sat,
      ct,
    });
  }
  
  /*
   * Flow
   */
   
  async getEffects() {
    const { token } = this;
    return this.api.getEffects({ token });
  }
  
  async setEffect(effect) {
    const { token } = this;
    return this.api.setEffect({ token, effect });    
  }
  
  async setRainbow() {
    throw new Error('Not Implemented');    
    
    const { token } = this;  
    return this.api.setState({
      token,
      on: true,
      hue:  Math.floor(Math.random() * 360),
    }).then(() => {
      return this.api.getPanelLayout({ token })
    }).then( result => {
      const list = [];
      result.layout.positionData.forEach((panel, index) => {
        
        const hue = ( index / result.panels.length );          
        const rgb = hslToRgb( hue, 1, 0.5 );
        
        list.push({
          id: panel.id,
          r: Math.floor( rgb.r * 255 ),
          g: Math.floor( rgb.g * 255 ),
          b: Math.floor( rgb.b * 255 ),
        })
      })
            
      return this.api.setStaticPanel({ token, list });
    });
  }
}

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