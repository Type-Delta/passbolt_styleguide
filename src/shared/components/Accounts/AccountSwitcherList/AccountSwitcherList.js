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
import { Trans, withTranslation } from "react-i18next";
import { getServerLabel } from "../../../context/Accounts/AccountsContext";
import LockedSVG from "../../../../img/svg/locked.svg";
import SpinnerSVG from "../../../../img/svg/spinner.svg";

/**
 * Email and server of an account, always shown together so identities on one server stay distinct.
 */
export function AccountIdentity({ account }) {
  const fullName = `${account.first_name || ""} ${account.last_name || ""}`.trim();
  return (
    <span className="account-identity" title={fullName ? `${fullName} <${account.username}>` : account.username}>
      <span className="account-identity-email">{account.username}</span>
      <span className="account-identity-server">{getServerLabel(account.domain)}</span>
    </span>
  );
}

AccountIdentity.propTypes = {
  account: PropTypes.object.isRequired, // The account summary
};

/**
 * One click switches to a saved account. The current account is shown as a non-interactive row.
 */
class AccountSwitcherList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      switchingAccountId: null, // The account being switched to
      error: null, // The last switch error
      errorAccount: null, // The account the last switch error relates to
    };
  }

  /**
   * @param {object} account The account summary to switch to
   */
  async handleSwitchClick(account) {
    if (this.state.switchingAccountId) {
      return;
    }
    this.setState({ switchingAccountId: account.id, error: null, errorAccount: null });
    try {
      const result = await this.props.onSwitch(account.id);
      await this.props.onSwitched?.(result);
    } catch (error) {
      this.setState({ error, errorAccount: account });
    } finally {
      // The extension usually navigates away; reset only matters when it does not.
      this.setState({ switchingAccountId: null });
    }
  }

  get accounts() {
    return this.props.showActive
      ? this.props.accounts
      : this.props.accounts.filter((account) => account.id !== this.props.activeAccountId);
  }

  renderState(account) {
    if (account.id === this.props.activeAccountId) {
      return (
        <span className="account-state current">
          <Trans>Current</Trans>
        </span>
      );
    }
    if (account.id === this.state.switchingAccountId) {
      return (
        <span className="account-state">
          <SpinnerSVG />
          <span className="visually-hidden">
            <Trans>Switching</Trans>
          </span>
        </span>
      );
    }
    if (account.is_locked) {
      return (
        <span className="account-state locked">
          <LockedSVG aria-hidden="true" />
          <span className="account-state-label">
            <Trans>Locked</Trans>
          </span>
        </span>
      );
    }
    return null;
  }

  render() {
    const accounts = this.accounts;
    if (accounts.length === 0) {
      return null;
    }
    return (
      <>
        <ul className="account-switcher-list" aria-label={this.props.label || this.props.t("Saved accounts")}>
          {accounts.map((account) => (
            <li key={account.id}>
              {account.id === this.props.activeAccountId ? (
                <div className="account-row active" aria-current="true">
                  <AccountIdentity account={account} />
                  {this.renderState(account)}
                </div>
              ) : (
                <button
                  type="button"
                  className="account-row"
                  disabled={Boolean(this.state.switchingAccountId)}
                  aria-busy={account.id === this.state.switchingAccountId}
                  onClick={() => this.handleSwitchClick(account)}
                >
                  <AccountIdentity account={account} />
                  {this.renderState(account)}
                </button>
              )}
            </li>
          ))}
        </ul>
        {this.state.error && (
          <div className="account-switcher-error error-message" role="alert">
            {this.props.t("Could not switch to {{username}}.", {
              username: this.state.errorAccount.username,
              interpolation: { escapeValue: false },
            })}{" "}
            {this.state.error.message}
          </div>
        )}
      </>
    );
  }
}

AccountSwitcherList.propTypes = {
  accounts: PropTypes.array.isRequired, // The account summaries
  activeAccountId: PropTypes.string, // The current account id
  showActive: PropTypes.bool, // Include the current account as a non-interactive row
  label: PropTypes.string, // Accessible name of the list
  onSwitch: PropTypes.func.isRequired, // Resolves with the extension switch result
  onSwitched: PropTypes.func, // Called with the switch result once the extension accepted it
  t: PropTypes.func, // The translation function
};

export default withTranslation("common")(AccountSwitcherList);
