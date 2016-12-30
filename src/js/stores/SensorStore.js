var alt = require('config/alt');
var SensorActions = require('actions/SensorActions');
import {findItemById, findIndexById} from 'utils/store-utils';
var toastr = require('toastr');
var util = require('utils/util');
import {merge} from 'lodash';

class SensorStore {
    constructor() {
        this.bindActions(SensorActions);
        this.sensors = {}; // Key name -> Sensor()
    }

    onFetchSensors(res) {
        if (res.data && res.data.sensors != null) {
            merge(this.sensors, util.lookupDict(res.data.sensors, 'kn'));
        }
    }

    // Automatic

    manualUpdate(sensor) {
    	this.sensors[sensor.kn] = sensor;
    }

    get_sensors_by_key_names(key_names) {
        var kns_not_in_store = [];
        var stored_sensors = {};
        key_names.forEach((kn) => {
            var s = this.sensors[kn];
            if (s == null) kns_not_in_store.push(kn);
            else stored_sensors[kn] = s;
        });
        if (kns_not_in_store.length > 0) SensorActions.fetchSensors(kns_not_in_store);
        return stored_sensors;
    }

}

module.exports = alt.createStore(SensorStore, 'SensorStore');