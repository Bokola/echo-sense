'use strict';

var React = require('react');

var util = require('../utils/util');
var ResourceDropzone = require('./ResourceDropzone');
var toastr = require('toastr');

import connectToStores from 'alt-utils/lib/connectToStores';
import {changeHandler} from '../utils/component-utils';

var mui = require('material-ui'),
  TextField = mui.TextField,
  RaisedButton = mui.RaisedButton;


import UserActions from '../actions/UserActions';

@changeHandler
export default class ProfileEditor extends React.Component {
  static defaultProps = { user: null };
  constructor(props) {
    super(props);
    this.state = {
      profileForm: {
        id: props.user.id,
        name: props.user.name,
        phone: props.user.phone,
        location_text: props.user.location_text
      }
    };
  }

  filesUploaded(data) {
    console.log(data.data.url);
    var user = this.props.user;
    user.avatar_serving_url = data.data.url;
    UserActions.manualUpdate(user);
    // window.location.reload();
  }

  save() {
    var id = this.state.profileForm.id;
    UserActions.update(id, this.state.profileForm);
  }

  render() {
    var user = this.props.user;
    var ppStyle = {
      backgroundImage: "url("+user.avatar_serving_url+")"
    }
    var editable = true;
    var pageTitle = "My Profile";
    var editForm, viewDetails, dropzone;
    dropzone = (
      <ResourceDropzone
        gcs_bucket={"user_"+user.id +"/profile"}
        uploadHandler="/api/user/photo/upload"
        onFilesUploaded={this.filesUploaded.bind(this)}
        videoEnabled={false}
        cta="Drag profile photo here to upload" />
    );
    return (
      <div>
        <h2>{ pageTitle }</h2>
        <h5><i className="fa fa-globe"></i> { user.location_text || "Somewhere" }</h5>

        <div className="row">
          <div className="col-sm-6">
            <div className="img-circle avatar avatar-centered" style={ppStyle}></div>

            { dropzone }

          </div>
          <div className="col-sm-6">

            <div className="well">
              <b>User since:</b> { util.printDate(user.ts_created) }<br/>
              <div>
                <b>Email:</b> { user.email }<br/>
              </div>
            </div>

            <form className="form">
              <input type="hidden" name="id" value={user.id} />
              <div className="form-group">
                <TextField name="name"
                  hintText="Please enter your name"
                  floatingLabelText="Your Name"
                  onChange={this.changeHandler.bind(this, 'profileForm', 'name')}
                  value={ this.state.profileForm.name } />
              </div>
              <div className="form-group">
                <TextField name="phone"
                  hintText="Please enter your phone number"
                  floatingLabelText="Phone Number"
                  onChange={this.changeHandler.bind(this, 'profileForm', 'phone')}
                  value={ this.state.profileForm.phone } />
              </div>
              <div className="form-group">
                <TextField name="location_text"
                  hintText="Where are you?"
                  floatingLabelText="Location (E.g. Nairobi)"
                  onChange={this.changeHandler.bind(this, 'profileForm', 'location_text')}
                  value={ this.state.profileForm.location_text } />
              </div>
              <div className="form-group">
                <TextField name="pw" type="password" hintText="Enter to change your password" floatingLabelText="Password" defaultValue="" />
              </div>
              <p className="pull-right">
                <RaisedButton onClick={this.save.bind(this)} label="Save" primary={true} />
              </p>
            </form>

          </div>
        </div>
      </div>
    );
  }
};

// module.exports = ProfileEditor;