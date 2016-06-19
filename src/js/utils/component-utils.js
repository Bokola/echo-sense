var util = require('utils/util');

export default {
  changeHandler: function(target) {
    target.prototype.changeHandler = function(key, attr, event) {
      var state = {};
      state[key] = this.state[key] || {};
      state[key][attr] = event.currentTarget.value;
      this.setState(state);
    };
    target.prototype.changeHandlerVal = function(key, attr, value) {
      var state = {};
      state[key] = this.state[key] || {};
      state[key][attr] = value;
      state.lastChange = util.nowTimestamp(); // ms
      this.setState(state);
    };
    target.prototype.changeHandlerMultiVal = function(key, attr, option_array) {
      var state = {};
      state[key] = this.state[key] || {};
      var value_array = option_array.map((op) => { return op.value });
      state[key][attr] = value_array;
      state.lastChange = util.nowTimestamp(); // ms
      this.setState(state);
    };
    target.prototype.changeHandlerValWithAdditions = function(key, attr, additional_state_updates, value) {
      var state = {};
      state[key] = this.state[key] || {};
      state[key][attr] = value;
      state.lastChange = util.nowTimestamp(); // ms
      if (additional_state_updates != null) merge(state, additional_state_updates);
      this.setState(state);
    };
    target.prototype.changeHandlerNilVal = function(key, attr, nill, value) {
      var state = {};
      state[key] = this.state[key] || {};
      state[key][attr] = value;
      state.lastChange = util.nowTimestamp(); // ms
      this.setState(state);
    };
    return target;
  },
  authDecorator: function(target) {
    target.willTransitionTo = function(transition) {
      if (!localStorage.echosenseUser) {
        transition.redirect('login');
      }
    };
    return target;
  }
};