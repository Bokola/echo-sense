var React = require('react');

var mui = require('material-ui');
var api = require('utils/api');
var RefreshIndicator = mui.RefreshIndicator;
var IconButton = mui.IconButton;
var List = mui.List;
var ListItem = mui.ListItem;
var util = require('utils/util');
var $ = require('jquery');
import connectToStores from 'alt-utils/lib/connectToStores';

export default class FluxFetchedList extends React.Component {
  static defaultProps = {
    url: null,
    params: {},
    listProp: 'items',
    labelProp: 'label',
    subProp: null,
    listStyle: 'list', // or 'mui'
    autofetch: false,
    store: null,
    actions: null,
    flatten: true,
    renderItem: null // Function
  };

  constructor(props) {
    super(props);
    this.state = {
      loading: false
    };
  }

  componentWillReceiveProps(nextProps) {
  }
  componentDidUpdate(prevProps, prevState) {
  }
  componentDidMount() {
    if (this.empty()) this.fetchData();
  }

  empty() {
    return this.items().length == 0;
  }

  fetchData() {
    this.props.fetchItems();
  }

  handleItemClick(i) {
    if (this.props.onItemClick) this.props.onItemClick(i);
  }

  refresh() {
    this.fetchData();
  }

  items() {
    if (this.props.flatten) return util.flattenDict(this.props[this.props.listProp]);
    else return this.props[this.props.listProp];
  }

  remove_item_by_key(key, _keyProp) {
    var keyProp = _keyProp || "key";
    var items = this.items();
    for (var i=0; i<items.length; i++) {
      var _item = items[i];
      if (_item) {
        var keyval = _item[keyProp];
        if (keyval == key) {
          // Match
          items.splice(i, 1);
          break;
        }
      }
    }
    this.setState({items: items});
  }

  render() {
    var items = this.items();
    var _items = this.items().map(function(item, i, arr) {
      if (this.props.renderItem != null) return this.props.renderItem(item);
      else {
        var name = item[this.props.labelProp] || "Unnamed";
        var sub = item[this.props.subProp] || null;
        if (this.props.listStyle == 'list') {
          return <li className="list-group-item" key={i}>
            <a href="javascript:void(0)" className="title" onClick={this.handleItemClick.bind(this, item)}>{ name }</a>
            </li>
        } else if (this.props.listStyle == 'mui') {
          return <ListItem key={i} primaryText={name} leftIcon={this.props.icon} secondaryText={sub} onClick={this.handleItemClick.bind(this, item)} />
        }
      }
    }, this);
    var ristatus = this.state.loading ? "loading" : "hide";
    var empty = items.length == 0;
    var _list;
    if (this.props.listStyle == 'list') {
      _list = (
        <ul className="list-group" hidden={empty}>
          { _items }
        </ul>
        )
    } else if (this.props.listStyle == 'mui') {
      _list = (
        <List hidden={empty}>
          { _items }
        </List>
        )
    }

    return (
      <div>
        <RefreshIndicator status={ristatus} size={50} top={50} left={50} />
        <IconButton iconClassName="material-icons" onClick={this.refresh.bind(this)}>refresh</IconButton>
        { _list }
        <div hidden={!empty}>
          <div className="empty">
            <i className="fa fa-warning"></i><br/>
            <span>Nothing to show</span>
          </div>
        </div>
      </div>
    );
  }
}
