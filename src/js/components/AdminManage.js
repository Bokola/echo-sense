var React = require('react');

var SimpleAdmin = require('components/SimpleAdmin');
var LoadStatus = require('components/LoadStatus');
var AppConstants = require('constants/AppConstants');
var SensorTypeActions = require('actions/SensorTypeActions');
var SensorTypeStore = require('stores/SensorTypeStore');
var util = require('utils/util');
import connectToStores from 'alt-utils/lib/connectToStores';
var mui = require('material-ui'),
  FlatButton = mui.FlatButton,
  FontIcon = mui.FontIcon,
  IconMenu = mui.IconMenu,
  MenuItem = mui.MenuItem,
  IconButton = mui.IconButton,
  FontIcon = mui.FontIcon;

@connectToStores
export default class AdminManage extends React.Component {
    static defaultProps = {}
    constructor(props) {
        super(props);
        this.state = {
            tab: "enterprises"
        };
    }

    static getStores() {
        return [SensorTypeStore];
    }

    static getPropsFromStores() {
        return SensorTypeStore.getState();
    }

    gotoTab(tab) {
        this.setState({tab: tab});
    }

    goto(page) {
        this.props.history.push(page);
    }

    render() {
        var that = this;
        var props;
        var tab = this.state.tab;
        var tabs = [
            {id: 'enterprises', label: "Enterprises"}
        ];
        if (tab == "enterprises") {
            var type_opts = util.flattenDict(this.props.sensor_types).map(function(st, i, arr) {
                return { val: st.id, lab: st.name };
            });

            props = {
                'url': "/api/enterprise",
                'id': 'sa',
                'entity_name': "Enterprises",
                'attributes': [
                    { name: 'id', label: "ID" },
                    { name: 'name', label: "Name", editable: true },
                    { name: 'country', label: "Country", editable: true },
                    { name: 'alias', label: "Alias", editable: true, editOnly: true },
                    { name: 'timezone', label: "Timezone", editable: true },
                    { name: 'gateway_config', label: "Gateway Configuration (JSON)", editable: true, editOnly: true, inputType: "textarea" },
                    { name: 'default_sensortype', label: "Default Sensor Type", editable: true, inputType: "select", opts: type_opts,
                        fromValue: function(type_id) { return that.props.sensor_types[type_id].name; }
                    }
                ],
                'add_params': {},
                'unique_key': 'key',
                'max': 50,
                getListFromJSON: function(data) { return data.data.enterprises; },
                getObjectFromJSON: function(data) { return data.data.enterprise; }
            }
        }

        var _tabs = tabs.map(function(t, i, arr) {
            var here = this.state.tab == t.id;
            var cn = here ? "active" : "";
            return <li role="presentation" key={i} data-t={t.id} className={cn}><a href="javascript:void(0)" onClick={this.gotoTab.bind(this, t.id)}>{t.label}</a></li>
        }, this);
        return (
            <div>

                <h1><FontIcon className="material-icons">settings</FontIcon> Admin Manage</h1>

                <div className="pull-right">
                    <IconMenu iconButtonElement={<IconButton><FontIcon className="material-icons">more_vert</FontIcon> /></IconButton>}>
                        <MenuItem primaryText="Spoof Data" onClick={this.goto.bind(this, '/app/admin/spoof/data')} leftIcon={<FontIcon className="material-icons">redo</FontIcon>} />
                        <MenuItem primaryText="Spoof Payment" onClick={this.goto.bind(this, '/app/admin/spoof/payment')} leftIcon={<FontIcon className="material-icons">attach_money</FontIcon>} />
                    </IconMenu>
                </div>

                <ul className="nav nav-pills">
                    { _tabs }
                </ul>

                <SimpleAdmin ref="sa" {...props} />

            </div>
        );
    }
}

module.exports = AdminManage;