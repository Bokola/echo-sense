var React = require('react');
var Router = require('react-router');
var $ = require('jquery');
var DialogChooser = require('components/DialogChooser');
var LoadStatus = require('components/LoadStatus');
var AppConstants = require('constants/AppConstants');
var mui = require('material-ui');
var RefreshIndicator = mui.RefreshIndicator;
var RaisedButton = mui.RaisedButton;
var FlatButton = mui.FlatButton;
var IconButton = mui.IconButton;
var IconMenu = mui.IconMenu;
var MenuItem = mui.MenuItem;
var FontIcon = mui.FontIcon;
var FetchedList = require('components/FetchedList');
var util = require('utils/util');
var toastr = require('toastr');
var bootbox = require('bootbox');
var UserStore = require('stores/UserStore');
var GroupStore = require('stores/GroupStore');
var GroupActions = require('actions/GroupActions');
var IconMenu = mui.IconMenu;
var MenuItem = mui.MenuItem;
var api = require('utils/api');
import {merge} from 'lodash';
import connectToStores from 'alt-utils/lib/connectToStores';
import history from 'config/history'

var Link = Router.Link;

@connectToStores
export default class GroupDetail extends React.Component {

  static defaultProps = { user: null };
  constructor(props) {
    super(props);
    this.state = {
      loading: false
    };
  }
  static getStores() {
    return [UserStore, GroupStore];
  }
  static getPropsFromStores() {
    var st = UserStore.getState();
    merge(st, GroupStore.getState());
    return st;
  }

  componentDidUpdate(prevProps, prevState) {
    var newGroup = this.props.params.groupID && (!prevProps.params.groupID || this.props.params.groupID != prevProps.params.groupID);
    if (newGroup) {
      this.prepareGroup(this.props.params.groupID);
      this.refs.sensors.refresh();
      this.refs.targets.refresh();
    }
  }

  componentDidMount() {
    if (this.props.params.groupID) {
      this.prepareGroup(this.props.params.groupID);
    }
  }

  prepareGroup(id) {
    GroupActions.get_group(id);
  }

  fetch_group() {
    var gid = this.props.params.groupID;
    GroupActions.fetchGroup(gid);
  }

  group() {
    var gid = this.props.params.groupID;
    if (gid) return this.props.groups[gid];
    return null;
  }

  close() {
    if (this.props.onClose) this.props.onClose();
  }

  gotoSensor(s) {
    history.pushState(null, `/app/sensors/${s.kn}`);
  }

  gotoTarget(t) {
    history.pushState(null, `/app/targets/${t.id}`);
  }

  userAdmin() {
    return this.props.user && this.props.user.level == 4;
  }

  confirm_delete() {
    bootbox.confirm("Really delete?", (ok) => {
      if (ok) {
        var g = this.group();
        GroupActions.delete(g.key);
        this.props.history.push("/app/groups");
      }
    });
  }

  show_edit_dialog() {
    bootbox.prompt({
      title: "Enter new group name",
      callback: (result) => {
        if (result === null) {
        } else {
          var g = this.group();
          GroupActions.update({key: g.key, name: result});
        }
      }
    });
  }

  render() {
    var g = this.group();
    var user = this.props.user;
    var can_write = user ? user.level > AppConstants.USER_READ : false;
    var content;
    if (!g) {
      content = (<RefreshIndicator size={40} left={50} top={50} status="loading" />);
    } else {
      var _action_items = [];
      content = (
        <div>
          <Link to="/app/groups" className='close'><i className="fa fa-close"></i></Link>
          <div className="pull-right">
            <IconMenu iconButtonElement={<IconButton><FontIcon className="material-icons">more_vert</FontIcon> /></IconButton>}>
              <MenuItem primaryText="Delete" onClick={this.confirm_delete.bind(this)} leftIcon={<FontIcon className="material-icons">delete</FontIcon>} />
            </IconMenu>
          </div>
          <h2>
            <i className="fa fa-folder"/> { g.name }
            <IconButton iconClassName="fa fa-pencil" tooltip="Edit" onClick={this.show_edit_dialog.bind(this)}/>
            <IconButton iconClassName="fa fa-refresh" tooltip="Refresh" onClick={this.fetch_group.bind(this)}/>
          </h2>
          <div className="row">
            <div className="col-sm-6">
              <small>
                <b>Created:</b> <span data-ts={g.ts_created}></span><br/>
              </small>
            </div>
            <div className="col-sm-6">
              <div hidden={_action_items.length == 0}>
                <IconMenu iconButtonElement={ <FlatButton label="Actions" /> } >
                  { _action_items }
                </IconMenu>
              </div>
            </div>
          </div>

          <div>
            <h2>Sensors</h2>
            <FetchedList ref="sensors" url="/api/sensor" listStyle="mui" params={{group_id: g.id}} icon={<FontIcon className="material-icons">fiber_smart_record</FontIcon>} autofetch={true} listProp="sensors" labelProp="name" subProp="kn" onItemClick={this.gotoSensor.bind(this)} />
          </div>
          <div>
            <h2>Targets</h2>
            <FetchedList ref="targets" url="/api/target" listStyle="mui" params={{group_id: g.id}} autofetch={true} listProp="targets" labelProp="name" onItemClick={this.gotoTarget.bind(this)} />
          </div>

        </div>
      );
    }
    return (
      <div className="detailBox">
        { content }
      </div>
      );
  }
}
