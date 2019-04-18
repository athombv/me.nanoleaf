'use strict';

const fetch = require('node-fetch');
const NanoleafError = require('./NanoleafError');

module.exports = class NanoleafAPI {
  
  constructor({ address, token = null }) {
    this.address = address;
    this.token = token;
  }
  
  get authenticated() {
    return !!this.token;
  }
  
  /*
   * API
   */
  
  async _call({ method, path, json, headers = {} }) {
    if(!this.authenticated)
      throw new NanoleafError('unauthenticated');
    
    const opts = {
      method,
      headers,
    };
    
    if(['put', 'post'].includes(method) && typeof json !== 'undefined') {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(json);
    }
    
    const url = `${this.address}/api/v1/${this.token}${path}`;
    const res = await fetch(url, opts);
    if( res.status === 204 ) return;
    
    const body = await res.json();
    if(!res.ok)
      throw new NanoleafError(`${res.status} ${res.statusText}`);
      
    return body;    
  }
  
  async _get({ path }) {
    return this._call({ method: 'get', path });    
  }
  
  async _put({ path, json }) {
    return this._call({ method: 'put', path, json });
  }
  
  async _post({ path, json }) {
    return this._call({ method: 'post', path, json });
  }
  
  async _delete({ path }) {
    return this._call({ method: 'delete', path });
  }
  
  /*
   * Methods
   */
   
  async getInfo() {
    return this._get({
      path: '/',
    });
  }
   
  async getState() {
    return this._get({
      path: '/state',
    });
  }
   
  async setState({ on, brightness }) {
    const json = {};
    
    if( typeof on === 'boolean' )
      json.on = { value: on };
    
    if( typeof brightness === 'number' )
      json.brightness = { value: brightness };
      
    // TODO hue etc
    
    return this._put({
      json,
      path: '/state',
    });
  }
  
}