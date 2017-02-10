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
var util = require('utils/util');
var toastr = require('toastr');
var bootbox = require('bootbox');
import {browserHistory} from 'react-router';

var Link = Router.Link;

var AlarmDetail = React.createClass({displayName: 'AlarmDetail',
  getDefaultProps: function() {
    return {
    };
  },
  getInitialState: function() {
    return {
      records: [],
      alarm: null,
      buffer_ms: 1000*15
    };
  },
  componentWillReceiveProps: function(nextProps) {
    var newAlarm = nextProps.params.aid && (!this.props.params.aid || nextProps.params.aid != this.props.params.aid);
    if (newAlarm) {
      this.prepareAlarm(nextProps.params.aid);
    }
  },
  componentDidUpdate: function(prevProps, prevState) {
  },
  componentDidMount: function() {
    console.log(this.props.params.aid);
    if (this.props.params.aid) {
      this.prepareAlarm(this.props.params.aid);
    }
  },
  prepareAlarm: function(skn) {
    this.fetchData(skn);
  },
  fetchData: function(_aid) {
    var that = this;
    var aid = _aid || this.props.params.aid;
    var sensorKn = this.props.params.sensorKn;
    if (aid) {
      this.setState({loading: true, sensor: null});
      var data = {
        'with_records': 1,
        'buffer_ms': this.state.buffer_ms
      };
      $.getJSON("/api/alarm/"+sensorKn+"/"+aid, data, function(res) {
        if (res.success) {
          that.setState({
            alarm: res.data.alarm,
            records: res.data.records,
            loading: false
          }, function() {
            util.printTimestampsNow(null, null, null, "UTC");
          });
        } else that.setState({loading:false});
      }, 'json');
    }
  },
  gotoDataViewer: function() {
    var a = this.state.alarm;
    if (a != null) {
      var params = {
        sensorKn: this.props.params.sensorKn
      };
      var query = {
        sta: a.ts_start - this.state.buffer_ms,
        end: a.ts_end + this.state.buffer_ms,
        col: a.rule_column
      }
      browserHistory.push(`/app/data/${params.sensorKn}?sta=${query.sta}&end=${query.end}&col=${query.col}`);
    }
  },
  render: function() {
    var a = this.state.alarm;
    var content;
    if (!a) {
      content = (<RefreshIndicator size={40} left={50} top={50} status="loading" />);
    } else {
      var _records = this.state.records.map(function(r, i, arr) {
        var within_alarm = r.ts >= a.ts_start && r.ts <= a.ts_end;
        console.log(within_alarm);
        var cls = within_alarm ? " list-group-item-danger" : "";
        return <li className={"list-group-item"+cls} key={"d"+i}>
          <span className="title">{ util.printDate(r.ts, true) }</span>
          <span className="sub" data-ts={r.ts}></span>
          <span className="sub">{ r.columns[a.rule_column] }</span>
        </li>
      }, this);
      var first_record;
      if (a.first_record_kn) first_record = <span><b>First Record:</b> <Link to={`/app/data/${a.sensor_kn}/record/${a.first_record_kn}`}>{ a.first_record_kn }</Link><br/></span>
      content = (
        <div>
          <h1><i className="fa fa-warning"></i> { a.rule_name }</h1>
          <div>
            <b>Started:</b> <span>{ util.printDate(a.ts_start, true) }</span> <span data-ts={a.ts_start}></span><br/>
            <b>Ended:</b> <span>{ util.printDate(a.ts_end, true) }</span> <span data-ts={a.ts_end}></span><br/>
            <b>Sensor:</b> <span><Link to={`/app/sensors/${a.sensor_kn}`}>{ a.sensor_kn }</Link></span><br/>
            { first_record }
            <b>Apex:</b> <span>{ a.apex }</span>
          </div>

          <h3>Data Around Event</h3>
          <ul className="list-group">
            { _records }
          </ul>

          <FlatButton label="View in Data Viewer" onClick={this.gotoDataViewer}/>
        </div>
      );
    }
    return (
      <div className="alarmDetail">
        { content }
      </div>
      );
  }
});


module.exports = AlarmDetail;
