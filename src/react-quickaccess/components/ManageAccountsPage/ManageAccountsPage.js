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
import { withAccounts } from "../../../shared/context/Accounts/AccountsContext";
import ManageAccountsList from "../../../shared/components/Accounts/ManageAccountsList/ManageAccountsList";
import { withAppContext } from "../../../shared/context/AppContext/AppContext";
import OpenAddAccountButton from "../../../shared/components/Accounts/OpenAddAccountButton/OpenAddAccountButton";
import CaretLeftSVG from "../../../img/svg/caret_left.svg";

/**
 * Lock or remove the accounts saved in this browser.
 */
class ManageAccountsPage extends Component {
  constructor(props) {
    super(props);
    this.handleGoBackClick = this.handleGoBackClick.bind(this);
  }

  handleGoBackClick(event) {
    event.preventDefault();
    this.props.history.goBack();
  }

  render() {
    const { accounts, activeAccountId, lockAccount, removeAccount } = this.props.accountsContext;
    return (
      <div className="manage-accounts-page">
        <div className="back-link">
          <a href="#" className="primary-action" title={this.props.t("Go back")} onClick={this.handleGoBackClick}>
            <CaretLeftSVG />
            <span className="primary-action-title">
              <Trans>Manage accounts</Trans>
            </span>
          </a>
        </div>
        <ManageAccountsList
          accounts={accounts}
          activeAccountId={activeAccountId}
          onLock={lockAccount}
          onRemove={removeAccount}
        />
        <div className="submit-wrapper">
          <OpenAddAccountButton
            onOpen={this.props.accountsContext.openAddAccount}
            className="button big full-width"
            onOpened={this.props.context.closeWindow}
          >
            <Trans>Add account</Trans>
          </OpenAddAccountButton>
        </div>
      </div>
    );
  }
}

ManageAccountsPage.propTypes = {
  context: PropTypes.any, // The application context
  accountsContext: PropTypes.object, // The accounts context
  history: PropTypes.object, // The router history
  t: PropTypes.func, // The translation function
};

export default withAppContext(withRouter(withAccounts(withTranslation("common")(ManageAccountsPage))));
