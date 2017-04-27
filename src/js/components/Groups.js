'use strict';

var React = require('react');
var Router = require('react-router');

import AltContainer from 'alt-container';
var FluxFetchedList = require('components/FluxFetchedList');
var SensorDetail = require('components/SensorDetail');
var $ = require('jquery');
var util = require('utils/util');
var mapc = require('utils/map_common');
var api = require('utils/api');
var mui = require('material-ui'),
  FlatButton = mui.FlatButton,
  RaisedButton = mui.RaisedButton,
  List = mui.List,
  Card = mui.Card,
  CardTitle = mui.CardTitle,
  FontIcon = mui.FontIcon,
  ListItem = mui.ListItem;
  // IconMenu = mui.IconMenu,
  // MenuItem = mui.MenuItem;
var GroupedSelector = require('components/shared/GroupedSelector');
var GroupStore = require('stores/GroupStore');
var GroupActions = require('actions/GroupActions');

var IconMenu = mui.IconMenu;
var MenuItem = mui.MenuItem;
var bootbox = require('bootbox');
var Link = Router.Link;
import {browserHistory} from 'react-router';

export default class Groups extends React.Component {
  static defaultProps = {
    user: null
  }

  constructor(props) {
    super(props);
    this.state = {
      groups: [],
      loading: false
    };
  }

  componentDidMount() {

  }

  componentDidUpdate(prevProps, prevState) {

  }

  gotoGroup(g) {
    if (g==null) browserHistory.push(`/app/groups`);
    else browserHistory.push(`/app/groups/${g.id}`);
  }

  closeDetail() {
    this.gotoGroup(null);
  }

  new_group_dialog() {
    bootbox.prompt({
      title: "Enter new group name",
      callback: (result) => {
        if (result === null) {
        } else {
          GroupActions.update({name: result});
        }
      }
    });
  }

  render() {
    var detail;
    var _list;
    var center = this.state.map_center;
    return (
      <div>

        <h1><FontIcon className="material-icons">folder</FontIcon> Groups</h1>

        <p className="lead">Groups are a way to organize sensors and targets. Users can access items in a group they have been given permission for.</p>
        { this.props.children }

        <AltContainer store={GroupStore} actions={ function(props) {
          return {
            fetchItems: function() {
              return GroupActions.fetchGroups();
            }
          }
        } } >
          <FluxFetchedList listStyle="mui" icon={<FontIcon className="material-icons">folder</FontIcon>} listProp="groups" labelProp="name" autofetch={true} onItemClick={this.gotoGroup.bind(this)} store={GroupStore} actions={GroupActions} />
        </AltContainer>

        <RaisedButton label="New Group" primary={true} onClick={this.new_group_dialog.bind(this)} />
      </div>
    );
  }
}
