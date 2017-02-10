var alt = require('config/alt');
var UserActions = require('actions/UserActions');
import {findItemById, findIndexById} from 'utils/store-utils';
var toastr = require('toastr');
var AppConstants = require('constants/AppConstants');
import {browserHistory} from 'react-router';

class UserStore {
    constructor() {
        this.bindActions(UserActions);
        this.users = {}; // uid -> User
        this.user = null;
        this.error = null;

        this.exportPublicMethods({
            get_user: this.get_user
        });
    }

    storeUser(user) {
        this.user = user;
        this.users[user.id] = user;
        this.error = null;
        console.log("Stored user "+user.email);
        // api.updateToken(user.token);
        localStorage.setItem(AppConstants.USER_STORAGE_KEY, JSON.stringify(user));
    }

    loadLocalUser() {
        var user;
        try {
            user = JSON.parse(localStorage.getItem(AppConstants.USER_STORAGE_KEY));
        } finally {
            if (user) {
                console.log("Successfully loaded user " + user.email);
                this.storeUser(user);
            }
        }
    }

    clearUser() {
        this.user = null;
        // api.updateToken(null);
        localStorage.removeItem(AppConstants.USER_STORAGE_KEY);
    }

    onLogin(data) {
        if (data.ok) {
            this.storeUser(data.user);
            browserHistory.push('/app');
        } else {
            this.clearUser();
            this.error = data.error;
        }
    }

    onLogout(data) {
        if (data.success) {
            this.clearUser();
            this.error = null;
            toastr.success("You're logged out!");
            browserHistory.push('/public');
        }
    }

    onUpdate(data) {
        if (data.success) {
            this.storeUser(data.data.user);
            toastr.success("Saved!! ");
        }
    }

    manualUpdate(user) {
        this.storeUser(user);
    }

    // Automatic

    get_user(uid) {
        var u = this.getState().users[uid];
        return u;
    }
}

module.exports = alt.createStore(UserStore, 'UserStore');