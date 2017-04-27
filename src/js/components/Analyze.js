'use strict';

var React = require('react');
var Router = require('react-router');
var util = require('utils/util');
var mui = require('material-ui'),
  FlatButton = mui.FlatButton,
  FontIcon = mui.FontIcon,
  MenuItem = mui.MenuItem;
import {browserHistory} from 'react-router';

export default class Analyze extends React.Component {
  static defaultProps = {}

  constructor(props) {
    super(props);
    this.state = {
    };
  }

  componentDidMount() {

  }

  componentDidUpdate(prevProps, prevState) {

  }

  section_change(section) {
    browserHistory.push(`/app/processing/${section}`)
  }

  render() {
    return (
      <div>
        <h1><FontIcon className="material-icons">show_chart</FontIcon> Processing</h1>

        <p className="alert alert-info">
          Processing can be configured to run X seconds after a batch of data is received, and
          can specify any number of rules to include in processing. Additionally, analysis objects
          can be configured to aggregate or roll-up data across multiple batches of data (e.g. counting events
          or calculating maximum values within a day/week/month or other period). One or more process tasks
          can be configured below, and associated with a particular sensor to activate automated processing for that device.
        </p>

        <FlatButton label="Settings" onClick={this.section_change.bind(this, 'settings')} />
        <FlatButton label="Rules" onClick={this.section_change.bind(this, 'rules')} />
        <FlatButton label="Viewer" onClick={this.section_change.bind(this, 'viewer')} />

        <div>
          { this.props.children }
        </div>
      </div>
    );
  }
}
