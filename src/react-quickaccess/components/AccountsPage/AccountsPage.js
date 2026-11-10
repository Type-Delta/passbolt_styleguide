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
import { Link, withRouter } from "react-router-dom";
import { Trans, withTranslation } from "react-i18next";
import { withAppContext } from "../../../shared/context/AppContext/AppContext";
import { withAccounts } from "../../../shared/context/Accounts/AccountsContext";
import AccountSwitcherList from "../../../shared/components/Accounts/AccountSwitcherList/AccountSwitcherList";
import PendingAccountNotice from "../../../shared/components/Accounts/PendingAccountNotice/PendingAccountNotice";
import CaretLeftSVG from "../../../img/svg/caret_left.svg";
import SpinnerSVG from "../../../img/svg/spinner.svg";

export const ACCOUNTS_ROUTE = "/webAccessibleResources/quickaccess/accounts";
export const ADD_ACCOUNT_ROUTE = "/webAccessibleResources/quickaccess/accounts/add";
export const MANAGE_ACCOUNTS_ROUTE = "/webAccessibleResources/quickaccess/accounts/manage";

/**
 * Quick access account switcher: one click on a saved account switches to it.
 */
class AccountsPage extends Component {
  constructor(props) {
    super(props);
    this.handleGoBackClick = this.handleGoBackClick.bind(this);
    this.handleAccountSwitched = this.handleAccountSwitched.bind(this);
  }

  handleGoBackClick(event) {
    event.preventDefault();
    this.props.history.goBack();
  }

  /**
   * The extension navigates to the selected account, or to its sign-in step when locked. This popup's port
   * belongs to the previous account, so it closes; reopening it connects to the selected account.
   */
  handleAccountSwitched() {
    return this.props.context.closeWindow();
  }

  render() {
    const { accounts, activeAccountId, isLoading, loadError, refresh, switchAccount, pending, cancelPending } =
      this.props.accountsContext;
    return (
      <div className="index-list accounts-page">
        <div className="back-link">
          {this.props.history.length > 1 ? (
            <a href="#" className="primary-action" title={this.props.t("Go back")} onClick={this.handleGoBackClick}>
              <CaretLeftSVG />
              <span className="primary-action-title">
                <Trans>Accounts</Trans>
              </span>
            </a>
          ) : (
            <h1 className="primary-action-title">
              <Trans>Accounts</Trans>
            </h1>
          )}
        </div>
        {pending && <PendingAccountNotice pending={pending} onCancel={cancelPending} />}
        <div className="list-section">
          {isLoading && accounts.length === 0 && (
            <p className="account-switcher-status" role="status">
              <SpinnerSVG />
              <Trans>Loading accounts…</Trans>
            </p>
          )}
          {loadError && (
            <p className="account-switcher-status error-message" role="alert">
              <Trans>Saved accounts could not be loaded.</Trans>{" "}
              <button type="button" className="link" onClick={refresh}>
                <Trans>Retry</Trans>
              </button>
            </p>
          )}
          <AccountSwitcherList
            accounts={accounts}
            activeAccountId={activeAccountId}
            showActive={true}
            onSwitch={switchAccount}
            onSwitched={this.handleAccountSwitched}
          />
        </div>
        <div className="submit-wrapper accounts-page-actions">
          <Link to={ADD_ACCOUNT_ROUTE} className="button primary big full-width" role="button">
            <Trans>Add account</Trans>
          </Link>
          {accounts.length > 0 && (
            <Link to={MANAGE_ACCOUNTS_ROUTE} className="button big full-width" role="button">
              <Trans>Manage accounts</Trans>
            </Link>
          )}
        </div>
      </div>
    );
  }
}

AccountsPage.propTypes = {
  context: PropTypes.any, // The application context
  accountsContext: PropTypes.object, // The accounts context
  history: PropTypes.object, // The router history
  t: PropTypes.func, // The translation function
};

export default withAppContext(withRouter(withAccounts(withTranslation("common")(AccountsPage))));
