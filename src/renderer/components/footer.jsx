import React, { PropTypes } from 'react';
import { shell } from 'electron'; // eslint-disable-line import/no-unresolved
import UpdateChecker from './update-checker.jsx';
import LogStatus from './log-status.jsx';


const STYLE = {
  footer: { minHeight: 'auto' },
  status: { paddingLeft: '0.5em' },
};


function onDocumentationClick(event) {
  event.preventDefault();
  shell.openExternal('https://developers.kissmetrics.com/v3/docs/kissmetrics-sql-interface');
}


const Footer = ({ status }) => (
  <div className="ui bottom fixed menu borderless" style={STYLE.footer}>
    <div style={STYLE.status}>{status}</div>
    <div className="right menu">
      <a href="#" className="item" onClick={onDocumentationClick}>Documentation</a>
    </div>
  </div>
);


Footer.propTypes = {
  status: PropTypes.string.isRequired,
};


export default Footer;
