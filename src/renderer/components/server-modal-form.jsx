import React, { Component, PropTypes } from 'react';
import Select from 'react-select';
import { sqlectron } from '../../browser/remote';
import ConfirmModal from './confim-modal.jsx';
import Message from './message.jsx';
import Checkbox from './checkbox.jsx';
import { requireLogos } from './require-context';


require('react-select/dist/react-select.css');
require('./override-select.css');


const CLIENTS = sqlectron.db.CLIENTS.map(dbClient => ({
  value: dbClient.key,
  logo: requireLogos(`./server-db-client-${dbClient.key}.png`),
  label: dbClient.name,
  defaultHost: dbClient.defaultHost,
  defaultPort: dbClient.defaultPort,
  disabledFeatures: dbClient.disabledFeatures,
}));

const DEFAULT_SSH_PORT = 22;

export default class ServerModalForm extends Component {
  static propTypes = {
    onSaveClick: PropTypes.func.isRequired,
    onCancelClick: PropTypes.func.isRequired,
    onRemoveClick: PropTypes.func.isRequired,
    onTestConnectionClick: PropTypes.func.isRequired,
    onDuplicateClick: PropTypes.func.isRequired,
    server: PropTypes.object,
    error: PropTypes.object,
    testConnection: PropTypes.object,
  }

  constructor(props, context) {
    super(props, context);
    const server = props.server || { client: 'kissmetrics' };
    this.state = {
      ...server,
      isNew: !server.id,
    };
  }
  componentDidUpdate() {
        console.log(this.state.password)
  }
  componentDidMount() {
    console.log(this.state.password)
    $(this.refs.serverModal).modal({
      closable: true,
      detachable: false,
      allowMultiple: true,
      observeChanges: true,
      onHidden: () => {
        this.props.onCancelClick();
        return true;
      },
      onDeny: () => {
        this.props.onCancelClick();
        return true;
      },
      onApprove: () => false,
    }).modal('show');
  }

  componentWillReceiveProps(nextProps) {
    this.setState({ error: nextProps.error });
  }

  componentWillUnmount() {
    $(this.refs.serverModal).modal('hide');
  }

  onSaveClick() {
    this.props.onSaveClick(this.mapStateToServer(this.state));
  }

  onRemoveCancelClick() {
    this.setState({ confirmingRemove: false });
  }

  onRemoveConfirmClick() {
    this.props.onRemoveClick();
  }

  onRemoveOpenClick() {
    this.setState({ confirmingRemove: true });
  }

  onTestConnectionClick() {
    this.props.onTestConnectionClick(this.mapStateToServer(this.state));
  }

  onDuplicateClick() {
    this.props.onDuplicateClick(this.mapStateToServer(this.state));
  }

  isFeatureDisabled(feature) {
    if (!this.state.client) {
      return false;
    }

    const dbClient = CLIENTS.find(dbc => dbc.value === this.state.client);
    return !!(dbClient.disabledFeatures && ~dbClient.disabledFeatures.indexOf(feature));
  }

  mapStateToServer(state) {
    const server = {
      name: state.name,
      client: state.client,
      ssl: !!state.ssl,
      host: state.host && state.host.length ? state.host : null,
      port: state.port || state.defaultPort,
      socketPath: state.socketPath && state.socketPath.length ? state.socketPath : null,
      user: state.user || null,
      password: state.password || null,
      database: state.database,
      domain: state.domain,
      schema: state.schema || null,
      // custom data not availbale trough the interface
      filter: state.filter,
    };
    if (!this.state.ssh) { return server; }

    const { ssh } = state;
    server.ssh = {
      host: ssh.host,
      port: ssh.port || DEFAULT_SSH_PORT,
      user: ssh.user,
      password: ssh.password && ssh.password.length ? ssh.password : null,
      privateKey: ssh.privateKey && ssh.privateKey.length ? ssh.privateKey : null,
      privateKeyWithPassphrase: !!ssh.privateKeyWithPassphrase,
    };

    return server;
  }

  highlightError(name) {
    const { error } = this.state;
    let hasError = !!(error && error[name]);
    if (error && error.ssh && /^ssh\./.test(name)) {
      const sshErrors = error.ssh[0].errors[0];
      const lastName = name.replace(/^ssh\./, '');
      hasError = !!~Object.keys(sshErrors).indexOf(lastName);
    }
    return hasError ? 'error' : '';
  }

  handleOnClientChange(client) {
    this.setState({ client });

    const clientConfig = CLIENTS.find(entry => entry.value === client);
    if (clientConfig && (clientConfig.defaultPort || clientConfig.defaultHost)) {
      this.setState({
        defaultPort: clientConfig.defaultPort,
        defaultHost: clientConfig.defaultHost,
      });
    }
  }

  handleChange(event) {
    const newState = {};
    const { target } = event;
    const value = target.files ? target.files[0].path : target.value;
    const [name1, name2] = target.name.replace(/^file\./, '').split('.');

    if (name1 === 'ssh') {
      newState.ssh = { ...this.state.ssh, [name2]: value };
    } else {
      newState[name1] = value;
    }

    return this.setState(newState);
  }

  renderClientItem({ label, logo }) {
    return (
      <div>
        <img alt="logo" src={logo} style={{ width: '16px' }} /> {label}
      </div>
    );
  }

  renderMessage() {
    const { testConnection } = this.props;

    if (testConnection.error) {
      return (
        <Message
          closeable
          title="Connection Error"
          message={testConnection.error.message}
          type="error" />
      );
    }

    if (testConnection.connected) {
      return (
        <Message
          closeable
          title="Connection Test"
          message="Successfully connected"
          type="success" />
      );
    }

    return null;
  }

  renderBasicPanel() {
    return (
      <div>
        <div className="fields">
          <div className={`eight wide field ${this.highlightError('user')}`}>
            <label>User</label>
            <input type="text"
              name="user"
              placeholder="User"
              value={this.state.user || ''}
              disabled={this.isFeatureDisabled('server:user')}
              onChange={::this.handleChange} />
          </div>
          <div className={`eight wide field ${this.highlightError('password')}`}>
            <label>Password</label>
            <input type="password"
              name="password"
              placeholder="Password"
              value={this.state.password || ''}
              disabled={this.isFeatureDisabled('server:password')}
              onChange={::this.handleChange} />
          </div>
        </div>
      </div>
    );
  }

  renderActionsPanel() {
    const { testConnection } = this.props;
    const { isNew, client } = this.state;

    const classStatusButtons = testConnection.connecting ? 'disabled' : '';
    const classStatusTestButton = [
      client ? '' : 'disabled',
      testConnection.connecting ? 'loading' : '',
    ].join(' ');

    return (
      <div className="actions">
        <div className={`small ui black deny right labeled icon button ${classStatusButtons}`}
          tabIndex="0">
          Cancel
          <i className="ban icon"></i>
        </div>
        <div className={`small ui green right labeled icon button ${classStatusButtons}`}
          tabIndex="0"
          onClick={::this.onSaveClick}>
          Save
          <i className="checkmark icon"></i>
        </div>
      </div>
    );
  }

  renderConfirmRemoveModal() {
    const { confirmingRemove } = this.state;

    if (!confirmingRemove) {
      return null;
    }

    return (
      <ConfirmModal
        context="#server-modal"
        title={`Delete ${this.state.name}`}
        message="Are you sure you want to remove this server connection?"
        onCancelClick={::this.onRemoveCancelClick}
        onRemoveClick={::this.onRemoveConfirmClick} />
    );
  }

  render() {
    return (
      <div id="server-modal" className="ui modal" ref="serverModal">
        <div className="header">
          Kissmetrics Settings
        </div>
        <div className="content">
          {this.renderMessage()}
          <form className="ui form">
            {this.renderBasicPanel()}
          </form>
        </div>
        {this.renderActionsPanel()}
        {this.renderConfirmRemoveModal()}
      </div>
    );
  }
}
