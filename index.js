const http = require('http');
const PromiseRetry = require('./lib/promiseretry');
const semaphore = require('await-semaphore');
const mutex = new semaphore.Mutex();
let Service;
let Characteristic;

module.exports = homebridge => {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory('homebridge-nremo-lightbulb', 'NatureRemoLightBulb', RemoAccessory);
};

class RemoAccessory {
  constructor(log, config) {
    this.log = log;
    this.name = config['name'];
    this.lightBulb = new Service.Lightbulb(this.name);
    this.informationService = new Service.AccessoryInformation();
    this.config = config;
    this.order_max = config.command_order[0];
    this.order_high = config.command_order[1];
    this.order_low = config.command_order[2];
    this.order_off = config.command_order[3];
  }

  request(command, delayAfter = 0, timeout = 2000) {
    const options = {
      host: this.config['host'],
      path: this.config['path'],
      method: 'POST',
      headers: {
        'X-Requested-With': 'curl',
        'Content-Type': 'application/json',
        'Content-Length': JSON.stringify(this.config[command]).length
      },
      timeout: timeout
    };

    return new Promise((resolve, reject) => {
      let data = '';
      const req = http.request(options, response => {
        if (response.statusCode != 200) {
          reject(new Error(response.statusCode));
        }
        response.on('data', chunk => {
          data += chunk.toString();
        });
        response.on('end', () => {
          setTimeout(() => {
            resolve({ status: response.statusCode, response: data });
          }, delayAfter);
        });
      });
      req.on('timeout', () => {
        reject(new Error('Request Timeout'));
      });
      req.on('error', error => {
        reject(error);
      });
      req.write(JSON.stringify(this.config[command]));
      req.end();
    });
  }

  async setState(input_bulb_state, callback) {
    this.log(`Swtich: ${input_bulb_state}`);
    if (input_bulb_state && this.brightness === 0) {
      await this.setBrightness(100, callback);
    } else if (input_bulb_state) {
      await this.setBrightness(this.brightness, callback);
    } else {
      await this.sendIr('off', callback);
    }
  }

  async getBrightness(callback) {
    this.log("get brightness: " + this.brightness);
    callback(null, this.brightness);
  }

  async setBrightness(value, callback) {
    this.log("set brightness: " + value);
    this.brightness = value;

    let command_order;
    if (value === 100) {
      command_order = 'max';
    } else if (50 < value && value < 100) {
      command_order = 'high';
    } else if (0 < value && value <= 50) {
      command_order = 'low';
    } else {
      command_order = 'off';
    }
    await this.sendIr(command_order, callback);
  }

  getServices() {
    this.log(`start homebridge Server ${this.name}`);

    this.informationService
      .setCharacteristic(Characteristic.Manufacturer, 'Nature')
      .setCharacteristic(Characteristic.Model, 'Remo')
      .setCharacteristic(Characteristic.SerialNumber, '123-457-000');

    this.lightBulb
      .getCharacteristic(Characteristic.On)
      .on('set', this.setState.bind(this));
    this.lightBulb.getCharacteristic(Characteristic.Brightness)
      .on('get', this.getBrightness.bind(this))
      .on('set', this.setBrightness.bind(this));
    return [this.informationService, this.lightBulb];
  }

  identify(callback) {
    this.log(`called ${this.config['name']}`);
    callback();
  }

  async sendIr(command_order, next) {
    const pre = 'order_' + command_order;

    await new Promise(resolve =>
      setTimeout(resolve, this.config.delayBefore || 0)
    );

    let release;
    try {
      release = await mutex.acquire();
      for (let i = 0; i < this[pre][command_order].length; i++) {
        const promise = new PromiseRetry(
          this.config.retry,
          this.config.retry_interval
        );

        const response = await promise.run(() => {
          return this.request(
            this[pre][command_order][i],
            this.config.delayAfter,
            this.config.timeout
          );
        });
        this.log(`${this[pre][command_order][i]}: ${response.status}`);
        if (command_order === 'off') {
          this.state = false;
        } else {
          this.state = true;
        }
      }
      next();
    } catch (error) {
      this.log(error.message);
      next(error);
    } finally {
      release();
    }
  }

}
