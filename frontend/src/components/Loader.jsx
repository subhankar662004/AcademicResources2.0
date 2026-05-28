import React from 'react';
import logo from '../assets/logo.png';

function Loader() {
  return (
    <div className="loader">
      <div className="loader-logo-wrap">
        <div className="loader-ring" />
        <img src={logo} alt="Loading" className="loader-logo" />
      </div>
      <p className="loader-text">Academic Resources Hub</p>
      <div className="loader-dots">
        <span /><span /><span />
      </div>
    </div>
  );
}

export default Loader;
