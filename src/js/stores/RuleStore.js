var alt = require('config/alt');
var RuleActions = require('actions/RuleActions');
import {findItemById, findIndexById} from 'utils/store-utils';
import {isEmpty} from 'lodash';
var toastr = require('toastr');
var util = require('utils/util');

class RuleStore {
    constructor() {
        this.bindActions(RuleActions);
        this.rules = {};
		this.exportPublicMethods({
			get_rules: this.get_rules
		});
    }

    onFetchRules(res) {
        if (res.data && res.data.rules != null) {
            this.rules = util.lookupDict(res.data.rules, 'id');
        }
    }

    // Public

    get_rules() {
	    var rules = this.getState().rules;
	    if (isEmpty(rules)) {
		    RuleActions.fetchRules()
	    	return {};
	    } else {
	    	return rules;
	    }
	}

	// Automatic

    manualUpdate(rule) {
    	this.rules[rule.id] = rule;
    }

}

module.exports = alt.createStore(RuleStore, 'RuleStore');