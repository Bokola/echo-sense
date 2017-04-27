/*
Author: Jeremy Gordon
Version: 0.1
Created: May 20, 2014
Updated: May 20, 2014
*/

var React = require('react');

var Dropzone = require('dropzone');
var $ = require('jquery');

Dropzone.autoDiscover = false;

var ResourceDropzone = React.createClass({displayName: 'ResourceDropzone',
  previewTemplate: "<li class='list-group-item'>"+
      "<span data-dz-name></span>"+
      "<span class='sub right' data-dz-size></span>"+
      "<span class='right error text-danger' data-dz-errormessage></span>"+
      "<span class='right dz-progress'><span class='dz-upload' data-dz-uploadprogress></span></span>"+
    "</li>",
  getDefaultProps: function() {
    return {
      visible: true,
      videoEnabled: true,
      gcs_bucket: null,
      uploadHandler: null,
      getUploadUrlHandler: '/api/upload/get_url',
      cta: "Drop images here or click to upload."
    };
  },
  getInitialState: function() {
    return {
      dz: null,
      enteredVideoLink: "",
      updating: false
    };
  },
  componentDidMount: function() {
    this.init();
  },
  componentDidUpdate: function() {
    this.init();
  },
  getUploadURL: function(target, callback) {
    $.getJSON(this.props.getUploadUrlHandler, {'target': target, 'gcs_bucket': this.props.gcs_bucket}, function(resp) {
        if (resp.data.url && callback) callback(resp.data.url);
    });
  },
  runUploads: function(_dz) {
    console.log("Getting url for dropped items...");
    this.getUploadURL(this.props.uploadHandler, function(url) {
      _dz.options.url = url;
      _dz.processQueue();
      // Todo: next batch on complete?
    });
  },
  filesUploaded: function(files, result) {
    var _result = JSON.parse(result);
    if (this.props.onFilesUploaded) this.props.onFilesUploaded(_result);
  },
  init: function() {
    var that = this;
    var shouldInitialize = this.state.dz == null && this.props.visible;
    if (shouldInitialize) {
      var dz = new Dropzone("#dz", {
        url: "/",
        uploadMultiple: true,
        autoProcessQueue: false, // Process called once we have URL
        parallelUploads: 5,
        maxFiles: 10,
        maxFileSize: 10, // 10 mb
        previewsContainer: "#previews",
        previewTemplate: this.previewTemplate,
        acceptFiles: "image/*" // Is this working?
      });
      dz.on("addedfile", function(file) {
        that.runUploads(this);
      });
      dz.on("processingmultiple", function(files) {
        console.log("Processing " + files.length + " files.");
      });
      dz.on("successmultiple", function(files, result) {
        console.log("Completed " + files.length + " files!");
        that.runUploads(this);
        that.filesUploaded(files, result);
      });
      dz.on("dragenter", function() {
      });
      this.setState({dz: dz});
    }
  },
  addVideoResource: function() {
    if (this.haveValidVideo()) {
      this.props.onAddVideoClicked(this.state.enteredVideoLink);
      this.setState({enteredVideoLink: ""});
    }
  },
  handleVideoLinkChange: function(e) {
    this.setState({enteredVideoLink: e.target.value});
  },
  haveValidVideo: function() {
    var url = this.state.enteredVideoLink;
    var allowedServices = ['youtube.com/watch', 'vimeo.com'];
    if (url.indexOf('http://') != 0 && url.indexOf('https://') != 0) return false;
    var nAllowedServices = 0;
    allowedServices.forEach(function(s, i, arr) {
      if (url.indexOf(s) != -1) nAllowedServices++;
    });
    if (nAllowedServices == 0) return false;
    return true;
  },
  render: function() {
    var classes = this.props.visible ? 'dropzone' : 'hidden dropzone';
    var btnClasses = "btn btn-primary";
    if (this.state.updating) btnClasses += " disabled";
    var pbStyle = {
      width: "0%"
    };
    return (
      <div className='resourceDropzone'>

        <ul className="list-group" id="previews">
        </ul>

        <div id="dz" className={classes}>
          <div className="dz-message">
            <span className="center-block">
              <i className="fa fa-cloud-upload fa-2x"></i>
            </span>
            { this.props.cta }
          </div>
        </div>

        <div hidden={!this.props.videoEnabled}>
        <div className="input-group" >
          <input type="text" className="form-control" placeholder="Or paste a link to a video on YouTube or Vimeo" value={this.state.enteredVideoLink} onChange={this.handleVideoLinkChange}/>
          <span className="input-group-btn">
            <button className={btnClasses} onClick={this.addVideoResource} disabled={this.state.updating} hidden={ !this.haveValidVideo() }>Add Video</button>
          </span>
        </div>
        </div>
      </div>
      );
  }
});

module.exports = ResourceDropzone;
