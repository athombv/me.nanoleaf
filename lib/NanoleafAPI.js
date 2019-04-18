'use strict';

const fetch = require('node-fetch');
const NanoleafError = require('./NanoleafError');

module.exports = class NanoleafAPI {
  
  static get MODELS() {
    return {
      'NL22': 'Nanoleaf Aurora',
      'NL29': 'Nanoleaf Canvas',
    };
  }
  
  constructor({ id, address, port, name, model = null }) {
    this.id = id;
    this.model = model
    this.port = port;
    this.address = address;
  }
  
  get authenticated() {
    return !!this.token;
  }
  
  get modelName() {
    return this.constructor.MODELS[this.model] || 'Unknown Model';
  }
  
  /*
   * API
   */
  
  async _call({ method, path, json, headers = {}, token = this.token }) {
    if(!token)
      throw new NanoleafError('Missing Authorization Token');
    
    const opts = {
      method,
      headers,
    };
    
    if(['put', 'post'].includes(method) && typeof json !== 'undefined') {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(json);
    }
    
    const url = `http://${this.address}:${this.port}/api/v1/${token}${path}`;
    const res = await fetch(url, opts);
    if( res.status === 204 ) return;
    
    if(!res.ok)
      throw new NanoleafError(`${res.status} ${res.statusText}`, {
        code: res.status,
      });
      
    return res.json();
  }
  
  async _get({ path, token }) {
    return this._call({ method: 'get', path, token });
  }
  
  async _put({ path, json, token }) {
    return this._call({ method: 'put', path, json, token });
  }
  
  async _post({ path, json, token }) {
    return this._call({ method: 'post', path, json, token });
  }
  
  async _delete({ path }) {
    return this._call({ method: 'delete', path, token });
  }
  
  /*
   * Methods
   */
   
  async addUser() {
    return this._post({
      path: '',
      token: 'new',
    }).then(result => result.auth_token);
  }
   
  async getInfo({ token }) {
    return this._get({
      token,
      path: '/',
    });
  }
   
  async getState({ token }) {
    return this._get({
      token,
      path: '/state',
    });
  }
   
  async setState({ token, on, brightness, hue, sat, ct }) {
    const json = {};
    
    if( typeof on === 'boolean' )
      json.on = { value: on };
    
    if( typeof brightness === 'number' )
      json.brightness = { value: brightness };
    
    if( typeof hue === 'number' )
      json.hue = { value: hue };
    
    if( typeof sat === 'number' )
      json.sat = { value: sat };
    
    if( typeof ct === 'number' )
      json.ct = { value: ct };
    
    return this._put({
      token,
      json,
      path: '/state',
    });
  }
  
}