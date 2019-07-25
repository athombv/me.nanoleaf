'use strict';

const Homey = require('homey');
const NanoleafAPI = require('./NanoleafAPI');

module.exports = class NanoleafDriver extends Homey.Driver {
  
  static get MODELS() {
    return []; // Overload me
  }
  
  onPair( socket ) {
    const discoveryStrategy = this.getDiscoveryStrategy();
    const discoveryResults = discoveryStrategy.getDiscoveryResults();
    
    let selectedDevice;
    let selectedDeviceId;
    let addUserInterval;
    
    socket.on('list_devices', ( data, callback ) => {
      const devices = Object.values(discoveryResults).map(device => {
        return {
          name: device.name,
          data: {
            id: device.id,
          },
        }
      });
      callback(null, devices);      
    });
    
    socket.on('list_devices_selection', ( data, callback ) => {
      callback();
      selectedDevice = data[0];
      selectedDeviceId = selectedDevice.data.id;
    });
    
    socket.on('authenticate', ( data, callback ) => {
      callback();
      
      const discoveryResult = discoveryResults[selectedDeviceId];
      if(!discoveryResult) return callback(new Error('Something went wrong'));
      
      const api = new NanoleafAPI({
        id: discoveryResult.id,
        name: discoveryResult.name,
        port: discoveryResult.port,
        address: discoveryResult.address,
        model: discoveryResult.txt.md,
      });
      
      addUserInterval = setInterval(() => {
        this.log('Trying...');
        api.addUser().then(token => {
          this.log('Got token!');
          socket.emit('device', {
            ...selectedDevice,
            store: {
              token,
            }
          });
        }).catch(err => {
          if( err.code === 403 ) return;
          this.error(err);
          socket.emit('error', err);
          clearInterval(addUserInterval);
        });
      }, 1000);
    });
    
    socket.on('disconnect', () => {
      this.log('Disconnected');
      if( addUserInterval ) 
        clearInterval(addUserInterval);
    });
    
  }
  
  onPairFilterDevice( device ) {
    return this.constructor.MODELS.includes(device.model);
  }
  
}