import React, { PropTypes } from 'react';
import { shell } from 'electron'; // eslint-disable-line import/no-unresolved

require('./header.css');

const LOGO_PATH = require('./km-logo.png');


function onSiteClick(event) {
  event.preventDefault();
  shell.openExternal('https://sqlectron.github.io');
}

const Header = ({ server, items, onEditClick, onCloseConnectionClick, onReConnectionClick }) => {
  const visibilityButtons = onCloseConnectionClick ? 'visible' : 'hidden';
  const styleItem = { paddingLeft: 0, paddingTop: 0, paddingBottom: 0 };
  return (
    <div id="header" className="ui top fixed menu borderless">
      <a href="#" className="item" onClick={onSiteClick}>
        <img alt="logo" src={LOGO_PATH} style={{ width: '5.5em' }} />
      </a>
      <div style={{ margin: '0 auto' }}>
        <div className="item" style={{ marginLeft: '-109px', marginRight: '-94px' }}>

        </div>
      </div>
      <div className="right menu" style={{ visibility: visibilityButtons }}>
        <div className="item borderless" style={styleItem}>
          <div className="ui mini basic icon buttons">
            <button className="ui icon button"
              title="Settings"
              onClick={() => onEditClick(server)}>
              User Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


Header.propTypes = {
  server: PropTypes.object.isRequired,
  items: PropTypes.array.isRequired,
  onEditClick: PropTypes.func,
  onCloseConnectionClick: PropTypes.func,
  onReConnectionClick: PropTypes.func,
};


export default Header;
