var React = require('react');
var Router = require('react-router');
var $ = require('jquery');
var DialogChooser = require('components/DialogChooser');
var LoadStatus = require('components/LoadStatus');
var AppConstants = require('constants/AppConstants');
import {RaisedButton, TextField, FlatButton, RefreshIndicator,
  IconButton} from 'material-ui';
var util = require('utils/util');
var toastr = require('toastr');
var bootbox = require('bootbox');
import {browserHistory} from 'react-router';
import {changeHandler} from 'utils/component-utils';
var Link = Router.Link;
var api = require('utils/api');

@changeHandler
export default class UserDetail extends React.Component {
  static defaultProps = {  };
  constructor(props) {
    super(props);
    this.state = {
      user: null,
      gcm_form: {

      }
    };
  }

  componentWillReceiveProps(nextProps) {
    var updated = nextProps.params.userID && (!this.props.params.userID || nextProps.params.userID != this.props.params.userID);
    if (updated) {
      this.fetch();
    }
  }
  componentDidUpdate(prevProps, prevState) {
  }
  componentDidMount() {
    this.fetch();
  }

  fetch() {
    var that = this;
    var uid = this.props.params.userID;
    if (uid) {
      this.setState({loading: true, user: null});
      var data = {
        with_props: 1
      };
      $.getJSON(`/api/user/${uid}`, data, function(res) {
        if (res.success) {
          that.setState({
            user: res.data.user,
            loading: false
          }, function() {
            util.printTimestampsNow(null, null, null, "UTC");
          });
        } else that.setState({loading:false});
      }, 'json');
    }
  }

  send_gcm_test() {
    let {gcm_form, user} = this.state;
    if (gcm_form.message) {
      let params = {
        user_ids: user.id,
        message: gcm_form.message
      }
      api.post("/admin/actions/gcm/manual", params, (res) => {

      });
    }
  }

  render() {
    var u = this.state.user;
    var content;
    let _gcm_test;
    if (!u) {
      content = (<RefreshIndicator size={40} left={50} top={50} status="loading" />);
    } else {
      let {gcm_form} = this.state;
      if (u.gcm_reg_id) _gcm_test = (
        <div>
          <TextField placeholder="Message (JSON)" onChange={this.changeHandler.bind(this, 'gcm_form', 'message')} value={gcm_form.message} />
          <RaisedButton label="Send GCM Message" primary={true} onClick={this.send_gcm_test.bind(this)} />
          <p className="help-text"><small>Payload example: { JSON.stringify({"message": "hello"}) }</small></p>
        </div>
        );
      content = (
        <div>
          <h1>User - { u.id }</h1>
          <div>
            <b>Name:</b> <span>{ u.name || "" }</span><br/>
            <b>Email:</b> <span>{ u.email || "" }</span><br/>
            <b>Phone:</b> <span>{ u.phone || "" }</span><br/>
            <b>Created:</b> <span>{ util.printDate(u.ts_created, true) }</span><br/>
            <b>GCM Reg ID:</b> <span>{ u.gcm_reg_id }</span>

            { _gcm_test }

          </div>

        </div>
      );
    }
    return (
      <div className="userDetail">
        { content }
      </div>
      );
  }
}
