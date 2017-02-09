var React = require('react');
var Router = require('react-router');

var util = require('utils/util');

var bootstrap = require('bootstrap');
var toastr = require('toastr');
import history from 'config/history'

import Drawer from 'material-ui/Drawer';
import AppBar from 'material-ui/AppBar';
import MenuItem from 'material-ui/MenuItem';

var $ = require('jquery');

var mui = require('material-ui'),
  FontIcon = mui.FontIcon,
  Dialog = mui.Dialog,
  FlatButton = mui.FlatButton;

var UserActions = require('actions/UserActions');
var UserStore = require('stores/UserStore');
var AppConstants = require('constants/AppConstants');

import connectToStores from 'alt-utils/lib/connectToStores';
import {changeHandler} from 'utils/component-utils';

@connectToStores
@changeHandler
class Public extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      ln_open: false,
      faqs_open: false
    };
    this.FAQ = [
      { q: "Who built Echo Sense?", a: "The Nairobi-based team at Echo Mobile Limited." },
      { q: "Who can use Echo Sense? How much does it cost?", a: "Anyone. Echo Sense is free to use, customize, and deploy under the MIT open source license." },
      { q: "What can Echo Sense be used for?", a: "A wide variety of applications may be deployed using Echo Sense. Agricultural applications include monitoring soil acidity and moisture, the temperature on drying tables, local weather patterns, etc. Other applications may leverage structural sensors to monitor the usage of assets or buildings, or location-tracking devices to monitor movement patterns and behavior of vehicles, etc. At the basic level, Echo Sense supports any usage involving the deployment of low-cost sensors to monitor one or more aspects of a program, project, or location over time." },
      { q: "What devices can I use?", a: "Any sensor that can be configured to send data to a remove server can be used. Currently HTTP is the primary communication protocol, but Echo Sense has been used with devices communicating via TCP and UDP with the aid of a light-weight TCP/UDP server."},
      { q: "I want to deploy an Echo Sense project, what do I do?", a: "Get in touch with the Echo Mobile deployment team by reaching out to sense@echomobile.org. Alternatively, organizations with an in-house developer can spin up an instance and customize it, or use it off-the-shelf right away."},
      { q: "How can I get involved?",
        a: <div>Developers can join the <a href="https://github.com/orgs/echomobi/teams/echo-contributors">Echo Contributors</a> team on Github, fork the repository, and start developing. Want to get involved in another way? Send us an email.</div> }
    ]
  }
  static getStores() {
    return [UserStore];
  }
  static getPropsFromStores() {
    return UserStore.getState();
  }

  componentDidMount() {
    console.log("mounted public");
    $("body").addClass("public");
    // $('link[title=public_css]').prop('disabled',false);
  }

  componentWillUnmount() {
    console.log("unmounting public");
    $("body").removeClass("public");
    // $('link[title=public_css]').prop('disabled',true);
  }


  handle_toggle_drawer = () => this.setState({ln_open: !this.state.ln_open});

  handle_leftnav_change = (open, cb) => this.setState({ln_open: open}, function() {
    if (cb) cb();
  });

  goto_page(link) {
    window.location = link;
  }

  navigate_to_page(page) {
    this.handle_leftnav_change(false, function() {
      history.pushState(null, page);
    })
  }

  toggle_faqs(open) {
    this.setState({faqs_open: open});
  }

  render_faqs() {
    return this.FAQ.map(function(faq) {
      return (
        <div>
          <h3>{ faq.q }</h3>
          <div>{ faq.a }</div>
        </div>
        )
    });
  }

  render() {
    return (
      <div>
          <AppBar
            title={AppConstants.SITENAME}
            onTitleTouchTap={this.navigate_to_page.bind(this, '/public/splash')}
            onLeftIconButtonTouchTap={this.handle_toggle_drawer.bind(this)}
            iconElementRight={<FlatButton onClick={this.navigate_to_page.bind(this, '/public/login')}  label="Sign In" />} />

          <Drawer docked={false} open={this.state.ln_open} onRequestChange={this.handle_leftnav_change.bind(this)}>
            <h2 className="nav-subhead">Echo Sense</h2>
            <MenuItem onClick={this.navigate_to_page.bind(this, "/public/splash")} leftIcon={<FontIcon className="material-icons">home</FontIcon>}>Home</MenuItem>
            <MenuItem onClick={this.toggle_faqs.bind(this, true)} leftIcon={<FontIcon className="material-icons">help</FontIcon>}>FAQs</MenuItem>
            <MenuItem onClick={this.navigate_to_page.bind(this, "/public/press")} leftIcon={<FontIcon className="material-icons">radio</FontIcon>}>Press</MenuItem>
            <MenuItem onClick={this.goto_page.bind(this, "/docs/index.html")} leftIcon={<FontIcon className="material-icons">chrome_reader_mode</FontIcon>}>Documentation</MenuItem>
            <h2 className="nav-subhead">Technical Links</h2>
            <MenuItem onClick={this.goto_page.bind(this, "http://facebook.github.io/react/")} leftIcon={<FontIcon className="material-icons">build</FontIcon>}>React.js Documentation</MenuItem>
            <MenuItem onClick={this.goto_page.bind(this, "https://cloud.google.com/appengine/docs")} leftIcon={<FontIcon className="material-icons">cloud_circle</FontIcon>}>Google App Engine</MenuItem>
          </Drawer>

          <Dialog title="FAQs" open={this.state.faqs_open} onRequestClose={this.toggle_faqs.bind(this, false)} autoDetectWindowHeight={true} autoScrollBodyContent={true}>
            { this.render_faqs() }
          </Dialog>

          <div>
            { this.props.children }
          </div>
      </div>
    )
  }
};

module.exports = Public;
