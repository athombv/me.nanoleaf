'use strict';

const Homey = require('homey');
const NanoleafAPI = require('./NanoleafAPI');

const CT_MIN = 1200;
const CT_MAX = 6500;
const POLL_INTERVAL = 2000;

module.exports = class NanoleafDevice extends Homey.Device {
  
  onInit() {
    this.onPoll = this.onPoll.bind(this);
    this.onMultipleCapabilities = this.onMultipleCapabilities.bind(this);
        
    const { id } = this.getData();
    this.id = id;
    
    const { token } = this.getStore();
    this.token = token;
    
    this.capabilities = this.getCapabilities();
    this.registerMultipleCapabilityListener(this.capabilities, this.onMultipleCapabilities, 150);
    
    /*
    Homey.app.getDevice({ id }).then(api => {
      this.api = api;
      this.setAvailable();
      this.log('Found device on network');
      
      this.pollInterval = setInterval(this.onPoll, POLL_INTERVAL);
      this.onPoll();
    }).catch(this.error);
    */
  }
  
  onDeleted() {
    if( this.pollInterval )
      clearInterval(this.pollInterval);
      
    const { token } = this;
    this.api.deleteUser({ token }).catch(this.error);
  }
  
  onDiscoveryResult(result) {
    console.log('onDiscoveryResult', result);
    return result.id === this.id;
  }
  
  onDiscoveryAvailable(discoveryResult) {
    console.log('onDiscoveryAvailable', discoveryResult);
    this.api = new NanoleafAPI({
      id: discoveryResult.id,
      address: discoveryResult.address,
      port: discoveryResult.port,
    });
  }
  
  onDiscoveryLastSeenChanged(discoveryResult) {
    console.log('onDiscoveryLastSeenChanged', discoveryResult);
    
  }
  
  onDiscoveryAddressChanged(discoveryResult) {
    console.log('onDiscoveryAddressChanged', discoveryResult);
    this.api.address = discoveryResult.address;    
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
          
        if( state.colorMode === 'hs' || state.colorMode === 'effect' )
          this.setCapabilityValue('light_mode', 'color').catch(this.error);
      }
    }).catch(err => {
      this.setUnavailable(err);
      this.error(err);
    });
  }
  
  async onMultipleCapabilities( valueObj ) {    
    const { token } = this;
    let {
      onoff,
      dim,
      light_hue,
      light_saturation,
      light_temperature,
      light_mode,
    } = valueObj;
    
    let on;
    let brightness;
    let hue;
    let sat;
    let ct;
    
    if( typeof onoff === 'boolean' )
      on = onoff;
      
    if( typeof dim === 'number' ) {
      on = (dim > 0);
      this.setCapabilityValue('onoff', on).catch(this.error);
      
      brightness = Math.round(dim * 100);
    }
      
    if( typeof light_hue === 'number' ) {
      on = true;
      this.setCapabilityValue('onoff', true).catch(this.error);
      
      hue = Math.round(light_hue * 360);
      this.setCapabilityValue('light_mode', 'color').catch(this.error);
    }
      
    if( typeof light_saturation === 'number' ) {
      on = true;
      this.setCapabilityValue('onoff', true).catch(this.error);
      
      sat = Math.round(light_saturation * 100);
      this.setCapabilityValue('light_mode', 'color').catch(this.error);
    }
      
    if( typeof light_temperature === 'number' ) {
      on = true;
      this.setCapabilityValue('onoff', true).catch(this.error);
      
      ct = Math.round(CT_MIN + (1-light_temperature) * (CT_MAX - CT_MIN));
      this.setCapabilityValue('light_mode', 'temperature').catch(this.error);
    }
    
    if( typeof light_mode === 'string' ) {
      on = true;
      this.setCapabilityValue('onoff', true).catch(this.error);
      
      if( light_mode === 'color' ) {
        light_hue = typeof light_hue === 'number' ? light_hue : this.getCapabilityValue('light_hue');
        light_saturation = typeof light_saturation === 'number' ? light_saturation : this.getCapabilityValue('light_saturation');
        
        hue = Math.round(light_hue * 360);
        sat = Math.round(light_saturation * 100);
      } else if( light_mode === 'temperature' ) {
        light_temperature = typeof light_temperature === 'number' ? light_temperature : this.getCapabilityValue('light_temperature');
        
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
}