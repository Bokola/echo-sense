'use strict';

var React = require('react');
var mui = require('material-ui'),
  RaisedButton = mui.RaisedButton,
  Paper = mui.Paper,
  Dialog = mui.Dialog,
  TextField = mui.TextField;

var util = require('utils/util');
var toastr = require('toastr');
var api = require('utils/api');
var bootstrap = require('bootstrap');
var UserActions = require('actions/UserActions');
var UserStore = require('stores/UserStore');
import connectToStores from 'alt-utils/lib/connectToStores';
import {changeHandler} from 'utils/component-utils';

@connectToStores
@changeHandler
class Login extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loginForm: {},
      forgotForm: {},
      forgot_dialog: false
    };
  }
  static getStores() {
    return [UserStore];
  }
  static getPropsFromStores() {
    return UserStore.getState();
  }

  login() {
    UserActions.login(this.state.loginForm)
  }

  toggle_forgot() {
    this.setState({forgot_dialog: !this.state.forgot_dialog});
  }

  forgot() {
    var that = this;
    var email = this.state.forgotForm.email;
    if (email) {
      api.post(`/api/public/forgot_password/${email}`, {}, function(res) {
        if (res.message) toastr.info(res.message);
        if (res.success) that.toggle_forgot();
      });
    }
  }

  render() {
    return (
        <div className="row">
          <Paper className="col-sm-6 col-sm-offset-3" zDepth="3" style={{marginTop: "30px", padding: "10px"}} rounded={true}>

            <div className="row">
              <div className="col-sm-4 text-center">
                <img src="/images/logos/echosense_512.png" style={{marginTop: "25px"}} width="100" />
              </div>
              <div className="col-sm-8">
                <div className="alert alert-danger" hidden={!this.props.error}>{ this.props.error }</div>
                <TextField
                  type='text'
                  hintText="Enter email"
                  floatingLabelText="Email"
                  value={this.state.loginForm._login}
                  onChange={this.changeHandler.bind(this, 'loginForm', '_login')} />
                <TextField
                  type='password'
                  hintText="Enter password"
                  floatingLabelText="Password"
                  value={this.state.loginForm._pw}
                  onChange={this.changeHandler.bind(this, 'loginForm', '_pw')} />
                <br/>
                <RaisedButton onClick={this.login.bind(this)} label="Sign In" secondary={true} style={{ marginBottom: "15px" }} />
                <p><small>
                  <a href="javascript:void(0)" onClick={this.toggle_forgot.bind(this)}>Forgot password</a>
                </small></p>
              </div>

            </div>
          </Paper>

          <Dialog title="Forgot Password?" open={this.state.forgot_dialog} onRequestClose={this.toggle_forgot.bind(this)}>
            <TextField
                type='text'
                hintText="Enter Email"
                floatingLabelText="Email"
                value={this.state.forgotForm.email}
                onChange={this.changeHandler.bind(this, 'forgotForm', 'email')} />
            <RaisedButton onClick={this.forgot.bind(this)} label="Reset Password"
              secondary={true} />
          </Dialog>
        </div>

    )
  }
};

module.exports = Login;
