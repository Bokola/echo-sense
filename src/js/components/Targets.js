'use strict';

var React = require('react');
var Router = require('react-router');

var EntityMap = require('components/EntityMap');
var SensorDetail = require('components/SensorDetail');
var $ = require('jquery');
var util = require('utils/util');
var mapc = require('utils/map_common');
var api = require('utils/api');
var mui = require('material-ui'),
  FlatButton = mui.FlatButton,
  List = mui.List,
  Card = mui.Card,
  CardTitle = mui.CardTitle,
  ListItem = mui.ListItem;
  // IconMenu = mui.IconMenu,
  // MenuItem = mui.MenuItem;
var GroupedSelector = require('components/shared/GroupedSelector');

var IconMenu = mui.IconMenu;


var Link = Router.Link;
import {browserHistory} from 'react-router';

export default class Targets extends React.Component {
  static defaultProps = {
    user: null,
    map_default_center: new google.maps.LatLng(-1.274359, 36.813106)
  }

  constructor(props) {
    super(props);
    this.state = {
      targets: [],
      loading: false,
      map_center: this.props.map_default_center
    };
  }

  componentDidMount() {
    this.fetchTargets();
  }
  componentDidUpdate(prevProps, prevState) {
    var detailOpenClose = (prevProps.params.targetID == null) != (this.props.params.targetID == null);
    if (detailOpenClose) this.refs.map.resize();
  }
  _detail_open() {
    var path = location.pathname;
    return path != "/app/targets"; // Hackish
  }
  fetchTargets() {
    var that = this;
    this.setState({loading: true});
    var data = {
    };
    api.get("/api/target", data, function(res) {
      if (res.success) {
        that.setState({targets: res.data.targets, loading: false });
      } else that.setState({loading: false});
    });
  }
  gotoTarget(t) {
    if (t==null) browserHistory.push(`/app/targets`);
    else browserHistory.push(`/app/targets/${t.id}`);
  }
  closeDetail() {
    this.gotoTarget(null);
  }

  render_item_subhead(g) {
    return "ID: " + g.id;
  }

  render() {
    var detail;
    var _list;
    var center = this.state.map_center;
    var mapClass = "sensorMap";
    if (this._detail_open()) mapClass += " narrow";
    return (
      <div>

        { this.props.children }

        <h1><i className="fa fa-th-large"/> Targets</h1>
        <p className="lead">Targets are physical structures, objects, vehicles or locations that you want to track over time.
          Targets may have one or more associated sensors, which may measure different metrics related to the target.</p>


        <GroupedSelector onItemClick={this.gotoTarget.bind(this)} type="targets" sortProp="ts_updated" subhead={this.render_item_subhead.bind(this)} />

        <EntityMap addClass={mapClass} keyProp="kn" ref="map" labelAtt="name" center={center} entities={this.state.targets} handleEntityClick={this.gotoTarget.bind(this)} />

      </div>
    );
  }
}
