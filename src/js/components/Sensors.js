'use strict';

var React = require('react');
var Router = require('react-router');

var EntityMap = require('components/EntityMap');
var SensorDetail = require('components/SensorDetail');
var $ = require('jquery');
var util = require('utils/util');
var mapc = require('utils/map_common');
var api = require('utils/api');
var GroupedSelector = require('components/shared/GroupedSelector');
var mui = require('material-ui'),
  FlatButton = mui.FlatButton,
  List = mui.List,
  Card = mui.Card,
  FontIcon = mui.FontIcon,
  CardTitle = mui.CardTitle,
  ListItem = mui.ListItem;
  // IconMenu = mui.IconMenu,
  // MenuItem = mui.MenuItem;

var IconMenu = mui.IconMenu;
var MenuItem = mui.MenuItem;

var Link = Router.Link;
import {browserHistory} from 'react-router';

export default class Sensors extends React.Component {
  static defaultProps = {
    user: null,
    map_default_center: new google.maps.LatLng(-1.274359, 36.813106)
  }

  constructor(props) {
    super(props);
    this.state = {
      sensors: [],
      loading: false,
      map_center: this.props.map_default_center
    };
  }

  componentDidMount() {
    this.fetchSensors();
  }

  componentDidUpdate(prevProps, prevState) {
    // var detailOpenClose = (prevProps.params.sensorKn == null) != (this.props.params.sensorKn == null);
    // if (detailOpenClose) this.refs.map.resize();
  }

  _detail_open() {
    var path = location.pathname;
    return path != "/app/sensors"; // Hackish
  }

  fetchSensors() {
    var that = this;
    this.setState({loading: true});
    var data = {
    };
    api.get("/api/sensor", data, function(res) {
      if (res.success) {
        var sensors = res.data.sensors;
        that.setState({sensors: sensors, loading: false });
      } else that.setState({loading: false});
    });
  }

  gotoSensor(kn) {
    browserHistory.push(`/app/sensors/${kn}`);
  }

  gotoSensorObj(s) {
    var that = this;
    var center = mapc.latlngFromString(s.location);
    this.setState({map_center: center}, function() {
      that.gotoSensor(s.kn);
    });
  }

  closeDetail() {
    this.gotoSensor(-1);
  }

  render_item_subhead(s) {
    return "Last update: " + util.printDate(s.ts_updated);
  }

  render() {
    var detail;
    var center = this.state.map_center;
    var _sensors = this.state.sensors.map(function(s, i, arr) {
      return  <MenuItem primaryText={s.name} value={s.kn} key={"s"+i} />
    }, this);
    var mapClass = "sensorMap";
    if (this._detail_open()) mapClass += " narrow";
    return (
      <div>

        <h1><FontIcon className="material-icons">fiber_smart_record</FontIcon> Sensors</h1>

        <p className="lead">Sensors measure one or more properties of their environment, and can be optionally linked to a target.</p>

        { this.props.children }

        <GroupedSelector onItemClick={this.gotoSensorObj.bind(this)} type="sensors" sortProp="ts_updated" subhead={this.render_item_subhead.bind(this)} />

      </div>
    );
  }
}