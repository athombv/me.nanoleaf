'use strict';

const NanoleafHomeyDriver = require('../../lib/NanoleafHomeyDriver');

module.exports = class NanoleafCanvasDriver extends NanoleafHomeyDriver {

  static get MODELS() {
    return ['NL42'];
  }

}