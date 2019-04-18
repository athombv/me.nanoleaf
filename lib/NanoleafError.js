'use strict';

module.exports = class NanoleafError extends Error {
  
  constructor(props, opts) {
    super(props);
    
    Object.assign(this, opts);
  }
  
}