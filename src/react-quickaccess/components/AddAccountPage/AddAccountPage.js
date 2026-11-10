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
import { withRouter } from "react-router-dom";
import { Trans, withTranslation } from "react-i18next";
import { withAppContext } from "../../../shared/context/AppContext/AppContext";
import { withAccounts } from "../../../shared/context/Accounts/AccountsContext";
import AddAccountForm from "../../../shared/components/Accounts/AddAccountForm/AddAccountForm";
import CaretLeftSVG from "../../../img/svg/caret_left.svg";

/**
 * Add a saved account from the quick access, including before any account is configured.
 */
class AddAccountPage extends Component {
  constructor(props) {
    super(props);
    this.handleGoBackClick = this.handleGoBackClick.bind(this);
    this.handleAccountAdded = this.handleAccountAdded.bind(this);
  }

  /**
   * Nothing to go back to when the quick access opened on this page (no account configured yet).
   * @returns {boolean}
   */
  get canGoBack() {
    return this.props.history.length > 1;
  }

  get defaultDomain() {
    const { accounts, activeAccountId } = this.props.accountsContext;
    return accounts.find((account) => account.id === activeAccountId)?.domain;
  }

  handleGoBackClick(event) {
    event.preventDefault();
    this.props.history.goBack();
  }

  /**
   * Saved accounts open in the tab the extension navigates; a pending MFA enrollment continues in the
   * verification page it opened. Either way the quick access has nothing left to show.
   */
  handleAccountAdded() {
    return this.props.context.closeWindow();
  }

  render() {
    return (
      <div className="add-account-page">
        <div className="back-link">
          {this.canGoBack ? (
            <a href="#" className="primary-action" title={this.props.t("Go back")} onClick={this.handleGoBackClick}>
              <CaretLeftSVG />
              <span className="primary-action-title">
                <Trans>Add account</Trans>
              </span>
            </a>
          ) : (
            <h1 className="primary-action-title">
              <Trans>Add your Passbolt account</Trans>
            </h1>
          )}
        </div>
        <AddAccountForm
          servers={this.props.accountsContext.servers}
          defaultDomain={this.defaultDomain}
          onSubmit={this.props.accountsContext.addAccount}
          onAdded={this.handleAccountAdded}
        />
      </div>
    );
  }
}

AddAccountPage.propTypes = {
  context: PropTypes.any, // The application context
  accountsContext: PropTypes.object, // The accounts context
  history: PropTypes.object, // The router history
  t: PropTypes.func, // The translation function
};

export default withAppContext(withRouter(withAccounts(withTranslation("common")(AddAccountPage))));
