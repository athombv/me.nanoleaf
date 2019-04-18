'use strict';

const Homey = require('homey');
const NanoleafHomeyDriver = require('../../lib/NanoleafHomeyDriver');

module.exports = class NanoleafAuroraDriver extends NanoleafHomeyDriver {
  
  static get MODELS() {
    return [ 'NL22' ];
  }
  
}