'use strict';

var React = require('react');
var mui = require('material-ui'),
  RaisedButton = mui.RaisedButton,
  FlatButton = mui.FlatButton,

  Paper = mui.Paper,
  Dialog = mui.Dialog,
  TextField = mui.TextField;

var util = require('utils/util');
var toastr = require('toastr');
var api = require('utils/api');
var FetchedList = require('components/FetchedList');
var bootstrap = require('bootstrap');
var UserActions = require('actions/UserActions');
var UserStore = require('stores/UserStore');
import connectToStores from 'alt-utils/lib/connectToStores';
import {changeHandler} from 'utils/component-utils';

@connectToStores
@changeHandler
export default class SensorContactEditor extends React.Component {
  static defaultProps = {
    contacts: {}
  }
  constructor(props) {
    super(props);
    this.state = {
      editing: false,
      form: {
        original_role: "",
        role: "",
        uid: null
      },
      issue: null
    };
  }
  static getStores() {
    return [UserStore];
  }
  static getPropsFromStores() {
    return UserStore.getState();
  }

  toggle_editing(editing) {
    this.setState({editing: editing});
  }

  edit_contact(role, uid) {
    this.setState({
      editing: true,
      form: {
        original_role: role,
        role: role,
        uid: uid
      }
    })
  }

  remove_contact(role) {
    var contacts = this.props.contacts || {};
    delete contacts[role];
    this.props.onChange(contacts);
  }

  new_contact() {
    this.edit_contact("", null);
  }

  select_user(u) {
    var that = this;
    var contacts = this.props.contacts || {};
    var form = this.state.form;
    if (form.role.length > 0) {
      if (form.original_role.length > 0) delete contacts[form.original_role];
      var uid = u != null ? u.id : form.uid;
      if (uid != null) {
        contacts[form.role] = uid;
        this.setState({editing: false, issue: null}, function() {
          that.props.onChange(contacts);
        });
      } else this.setState({editing: false, issue: null});
    } else this.setState({issue: "No Role"});
  }

  dismiss() {
    this.setState({editing: false});
  }

  render_user(u) {
    var label = u.name || u.phone || u.email;
    var selected_uid = this.state.form.uid == u.id;
    var cls = selected_uid ? "list-group-item-info" : "";
    return (<li key={u.id} className={"list-group-item " + cls}>
        <a href="javascript:void(0)" onClick={this.select_user.bind(this, u)} className="title">{ label }</a>
        <span className="sub">{ u.id }</span>
      </li>
    );
  }

  render() {
    var list = [];
    var form = this.state.form;
    var contacts = this.props.contacts;
    for (var contact_role in contacts) {
      if (contacts.hasOwnProperty(contact_role)) {
        var user_id = contacts[contact_role];
        var u = UserStore.get_user(user_id);
        var user_label = (u!=null) ? (u.name || u.email) : user_id;
        list.push(
          <li className="list-group-item">
            <a href="javascript:void(0)" className="title" onClick={this.edit_contact.bind(this, contact_role, user_id)}>{ contact_role }</a>&nbsp;
            <a href="javascript:void(0)" onClick={this.remove_contact.bind(this, contact_role)}><i className="fa fa-trash" /></a>
            <span className="right">{ user_label }</span>
          </li>
        );
      }
    }
    var actions = [
      <FlatButton label="Save" onClick={this.select_user.bind(this, null)} primary={true} />,
      <FlatButton label="Dismiss" onClick={this.dismiss.bind(this)} />,
    ];
    var _issue;
    if (this.state.issue) _issue = <div className="alert alert-danger">{ this.state.issue }</div>
    return (
        <div>
          <ul className="list-group">
          { list }
          </ul>

          <div className="vpad">
            <button className="btn btn-default" onClick={this.new_contact.bind(this)}>Add Contact</button>
          </div>

          <Dialog open={this.state.editing} onRequestClose={this.toggle_editing.bind(this, false)} actions={actions} autoScrollBodyContent={true} autoDetectWindowHeight={true}>
            { _issue }

            <p className="lead">Enter a role name, and choose a user below</p>

            <TextField floatingLabelText="ID / Role" hint="No spaces, lower case" value={form.role} onChange={this.changeHandler.bind(this, 'form', 'role')} fullWidth={true} />

            <h3>Users</h3>
            <FetchedList url="/api/user" renderItem={this.render_user.bind(this)} autofetch={true} listProp="users" />

          </Dialog>
        </div>

    )
  }
}
