var React = require('react');

var SimpleAdmin = require('components/SimpleAdmin');
var LoadStatus = require('components/LoadStatus');
var AppConstants = require('constants/AppConstants');
var SensorTypeActions = require('actions/SensorTypeActions');
var SensorTypeStore = require('stores/SensorTypeStore');
var GroupActions = require('actions/GroupActions');
var GroupStore = require('stores/GroupStore');
var util = require('utils/util');
import { merge } from 'lodash';
import connectToStores from 'alt-utils/lib/connectToStores';
import {FlatButton, RaisedButton, FontIcon, IconButton, TextField} from 'material-ui';
import {changeHandler} from 'utils/component-utils';

@connectToStores
@changeHandler
export default class ManageUsers extends React.Component {
    static defaultProps = {}
    constructor(props) {
        super(props);
        this.state = {
            search_form: {
                email: ''
            },
            email_filter: null
        };
    }

    static getStores() {
        return [SensorTypeStore, GroupStore];
    }

    static getPropsFromStores() {
        var st = SensorTypeStore.getState();
        merge(st, GroupStore.getState());
        return st;
    }

    componentDidMount() {
        GroupActions.fetchGroups();
    }

    handle_search() {
        let sf = this.state.search_form;
        if (sf.email.length > 5) {
            this.setState({email_filter: sf.email}, () => {
                this.refs.sa.clearAndFetch();
            });
        }
    }

    clear_search() {
        this.setState({email_filter: null}, () => {
            this.refs.sa.clearAndFetch();
        });
    }

    render() {
        var that = this;
        var props;
        var group_opts = util.flattenDict(this.props.groups).map(function(group, i, arr) {
            return { val: group.id, lab: group.name };
        });

        var level_opts = AppConstants.USER_LABELS.map(function(label, i) {
            return { lab: label, val: i + 1};
        })
        let {email_filter} = this.state;
        let params = {
            order_by: 'dt_created',
            email: email_filter
        }
        let {search_form} = this.state;
        props = {
            'url': "/api/user",
            'id': 'sa',
            'entity_name': "Users",
            'attributes': [
                { name: 'id', label: "ID" },
                { name: 'name', label: "Name", editable: true },
                { name: 'phone', label: "Phone", editable: true },
                { name: 'email', label: "Email", editable: true },
                { name: 'currency', label: "Currency (e.g. USD)", editable: true },
                { name: 'level', label: "Level", editable: true, editOnly: true, inputType: "select", opts: level_opts },
                { name: 'password', label: "Password", editable: true, editOnly: true },
                { name: 'group_ids', label: "Groups", editable: true, editOnly: true, inputType: "select", multiple: true, opts: group_opts },
                { name: 'alert_channel', label: "Alert Channel", editable: true, editOnly: true, inputType: "select", defaultValue: 0, opts: [
                   { lab: "Disabled", val: 0 },
                   { lab: "Email", val: 1 },
                   { lab: "SMS", val: 2 },
                   { lab: "Push Notification (Android)", val: 3 }
                ] },
                { name: 'custom_attrs', label: "Custom Attributes", editable: true, editOnly: true, inputType: "textarea" }
            ],
            'fetch_params': params,
            'unique_key': 'id',
            'max': 50,
            getListFromJSON: function(data) { return data.data.users; },
            getObjectFromJSON: function(data) { return data.data.user; },
            detail_url: function(u) {
                return `/app/users/${u.id}`;
            }
        }
        return (
            <div>

                <h1><FontIcon className="material-icons">people</FontIcon> Users</h1>

                <div className="row vpad">
                    <div className="col-sm-6 col-sm-offset-6 pull-right">
                        <TextField name="email" floatingLabelText="Search by email" value={search_form.email||''} onChange={this.changeHandler.bind(this, 'search_form', 'email')} autoComplete="none" />
                        <span hidden={email_filter == null}>
                            <IconButton tooltip="Clear" onClick={this.clear_search.bind(this)} iconClassName="material-icons">clear</IconButton>
                        </span>
                        <RaisedButton label="Search" onClick={this.handle_search.bind(this)} primary={true} />
                    </div>
                </div>

                <SimpleAdmin ref="sa" {...props} />

            </div>
        );
    }
}

module.exports = ManageUsers;