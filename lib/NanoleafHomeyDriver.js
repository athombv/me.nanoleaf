'use strict';

const Homey = require('homey');

module.exports = class NanoleafDriver extends Homey.Driver {
  
  static get MODELS() {
    return []; // Overload me
  }
  
  onPair( socket ) {
    let device;
    let deviceApi;
    let addUserInterval;
    const devices = Homey.app.getDevices();
    
    socket.on('list_devices', ( data, callback ) => {
      const result = Object.values(devices)
        .filter(device => {
          return this.onPairFilterDevice(device);
        })
        .map(device => {
          return {
            name: device.name,
            data: {
              id: device.id,
            },
          }
        });
      callback(null, result);      
    });
    
    socket.on('list_devices_selection', ( data, callback ) => {
      callback();
      
      device = data[0];
      deviceApi = devices[device.data.id];
    });
    
    socket.on('authenticate', ( data, callback ) => {
      callback();
      
      addUserInterval = setInterval(() => {
        this.log('Trying...');
        deviceApi.addUser().then(token => {
          socket.emit('device', {
            ...device,
            store: {
              token,
            }
          });
        }).catch(err => {
          if( err.code === 403 ) return;
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