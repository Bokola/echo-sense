var alt = require('config/alt');
var GroupActions = require('actions/GroupActions');
import {findItemById, findIndexById} from 'utils/store-utils';
import {isEmpty} from 'lodash';
var toastr = require('toastr');
var util = require('utils/util');

class GroupStore {
    constructor() {
        this.bindActions(GroupActions);
        this.groups = {}; // id -> group
		this.exportPublicMethods({
			get_groups: this.get_groups
		});
    }

    onFetchGroups(res) {
        if (res.data && res.data.groups != null) {
            this.groups = util.lookupDict(res.data.groups, 'id');
        }
    }

    onFetchGroup(res) {
        if (res.data && res.data.group != null) {
            var g = res.data.group;
            this.groups[g.id] = g;
        }
    }

    onUpdate(res) {
        if (res.data && res.data.group != null) {
            var g = res.data.group;
            this.groups[g.id] = g;
        }
    }

    onDelete(res) {
        if (res.success) {
            var id = res.data.id;
            if (id) delete this.groups[id];
        }
    }


    // Public

    get_groups() {
	    var groups = this.getState().groups;
	    if (isEmpty(groups)) {
		    GroupActions.fetchGroups()
	    	return {};
	    } else {
	    	return groups;
	    }
	}

	// Automatic

    manualUpdate(grp) {
    	this.groups[grp.id] = grp;
    }

    get_group(id) {
        var group = this.groups[id];
        if (!group) GroupActions.fetchGroup(id);
        return group;
    }


}

module.exports = alt.createStore(GroupStore, 'GroupStore');