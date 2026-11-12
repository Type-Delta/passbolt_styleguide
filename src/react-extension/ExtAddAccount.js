/**
 * Passbolt ~ Open source password manager for teams
 * Copyright (c) Passbolt SA (https://www.passbolt.com)
 *
 * Licensed under GNU Affero General Public License version 3 of the or any later version.
 * For full copyright and license information, please see the LICENSE.txt
 * Redistributions of files must retain the above copyright notice.
 *
 * @copyright     Copyright (c) Passbolt SA (https://www.passbolt.com)
 * @license       https://opensource.org/licenses/AGPL-3.0 AGPL License
 * @link          https://www.passbolt.com Passbolt(tm)
 * @since         5.18.0
 */

import React, { Component } from "react";
import PropTypes from "prop-types";
import AppContext from "../shared/context/AppContext/AppContext";
import TranslationProvider from "../shared/components/Internationalisation/TranslationProvider";
import AccountsContextProvider from "../shared/context/Accounts/AccountsContext";
import AddAccountWizard from "./components/AddAccount/AddAccountWizard/AddAccountWizard";
import LogoSVG from "../img/svg/logo.svg";

/**
 * The add account wizard in its own extension tab. It needs no configured account: only the port, the saved
 * accounts registry and the translations.
 */
class ExtAddAccount extends Component {
  constructor(props) {
    super(props);
    this.appContext = { port: props.port, storage: props.storage, locale: "en-UK" };
    this.handleClose = this.handleClose.bind(this);
  }

  handleClose() {
    if (this.props.onClose) {
      this.props.onClose();
    } else {
      window.close();
    }
  }

  render() {
    return (
      <AppContext.Provider value={this.appContext}>
        <AccountsContextProvider port={this.props.port}>
          <TranslationProvider loadingPath="/webAccessibleResources/locales/{{lng}}/{{ns}}.json">
            <div id="container" className="container page login add-account-page">
              <div className="content">
                <div className="header">
                  <div className="logo-svg">
                    <LogoSVG role="img" width="20rem" height="3.5rem" />
                  </div>
                </div>
                <div className="login-form">
                  <AddAccountWizard domainHint={this.props.domainHint} onClose={this.handleClose} />
                </div>
              </div>
            </div>
          </TranslationProvider>
        </AccountsContextProvider>
      </AppContext.Provider>
    );
  }
}

ExtAddAccount.propTypes = {
  port: PropTypes.object.isRequired, // The background page communication port
  storage: PropTypes.object, // The extension storage
  domainHint: PropTypes.string, // An untrusted server to preselect
  onClose: PropTypes.func, // Close the tab, window.close() by default
};

export default ExtAddAccount;
