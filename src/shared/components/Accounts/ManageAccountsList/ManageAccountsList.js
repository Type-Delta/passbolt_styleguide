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
import { AccountIdentity } from "../AccountSwitcherList/AccountSwitcherList";
import { getServerLabel } from "../../../context/Accounts/AccountsContext";
import LockedSVG from "../../../../img/svg/locked.svg";
import SpinnerSVG from "../../../../img/svg/spinner.svg";

/**
 * Lock or remove saved accounts. Removal asks for an inline confirmation on the row itself.
 */
class ManageAccountsList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      confirmRemoveAccountId: null, // The account awaiting a removal confirmation
      processingAccountId: null, // The account being locked or removed
      error: null, // The last error
    };
  }

  /**
   * Run a lock/remove request for an account, keeping the row busy meanwhile.
   * @param {string} accountId
   * @param {function(string): Promise} request
   */
  async run(accountId, request) {
    this.setState({ processingAccountId: accountId, error: null });
    try {
      await request(accountId);
      this.setState({ confirmRemoveAccountId: null });
    } catch (error) {
      this.setState({ error });
    } finally {
      this.setState({ processingAccountId: null });
    }
  }

  renderActions(account) {
    const isBusy = Boolean(this.state.processingAccountId);
    const isProcessing = this.state.processingAccountId === account.id;
    if (this.state.confirmRemoveAccountId === account.id) {
      const isActive = account.id === this.props.activeAccountId;
      return (
        <div className="manage-account-confirm" role="group" aria-labelledby={`remove-account-${account.id}`}>
          <p id={`remove-account-${account.id}`}>
            {this.props.t("Remove {{username}} on {{server}} from this browser?", {
              username: account.username,
              server: getServerLabel(account.domain),
              interpolation: { escapeValue: false },
            })}{" "}
            {isActive ? (
              <Trans>You will be signed out. Adding it again requires its private key.</Trans>
            ) : (
              <Trans>Adding it again requires its private key.</Trans>
            )}
          </p>
          <div className="manage-account-actions">
            <button
              type="button"
              className="link cancel"
              disabled={isBusy}
              onClick={() => this.setState({ confirmRemoveAccountId: null })}
            >
              <Trans>Cancel</Trans>
            </button>
            <button
              type="button"
              className={`button primary form warning ${isProcessing ? "processing" : ""}`}
              disabled={isBusy}
              onClick={() => this.run(account.id, this.props.onRemove)}
            >
              <Trans>Remove</Trans>
              {isProcessing && <SpinnerSVG />}
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="manage-account-actions">
        {account.is_locked ? (
          <span className="account-state locked">
            <LockedSVG aria-hidden="true" />
            <Trans>Locked</Trans>
          </span>
        ) : (
          <button
            type="button"
            className={`button button-transparent ${isProcessing ? "processing" : ""}`}
            disabled={isBusy}
            aria-label={this.props.t("Lock {{username}}", {
              username: account.username,
              interpolation: { escapeValue: false },
            })}
            onClick={() => this.run(account.id, this.props.onLock)}
          >
            <Trans>Lock</Trans>
            {isProcessing && <SpinnerSVG />}
          </button>
        )}
        <button
          type="button"
          className="button button-transparent"
          disabled={isBusy}
          aria-label={this.props.t("Remove {{username}}", {
            username: account.username,
            interpolation: { escapeValue: false },
          })}
          onClick={() => this.setState({ confirmRemoveAccountId: account.id, error: null })}
        >
          <Trans>Remove</Trans>
        </button>
      </div>
    );
  }

  render() {
    if (this.props.accounts.length === 0) {
      return (
        <p className="manage-accounts-empty">
          <Trans>No account is saved in this browser yet.</Trans>
        </p>
      );
    }
    return (
      <>
        <ul className="manage-accounts-list" aria-label={this.props.t("Saved accounts")}>
          {this.props.accounts.map((account) => (
            <li
              key={account.id}
              className={`manage-account-row ${this.state.confirmRemoveAccountId === account.id ? "confirming" : ""}`}
              aria-current={account.id === this.props.activeAccountId ? "true" : undefined}
            >
              <div className="manage-account-summary">
                <AccountIdentity account={account} />
                {account.id === this.props.activeAccountId && (
                  <span className="account-state current">
                    <Trans>Current</Trans>
                  </span>
                )}
              </div>
              {this.renderActions(account)}
            </li>
          ))}
        </ul>
        {this.state.error && (
          <div className="manage-accounts-error error-message" role="alert">
            {this.state.error.message || <Trans>The account could not be updated.</Trans>}
          </div>
        )}
      </>
    );
  }
}

ManageAccountsList.propTypes = {
  accounts: PropTypes.array.isRequired, // The account summaries
  activeAccountId: PropTypes.string, // The current account id
  onLock: PropTypes.func.isRequired, // Locks an account by id
  onRemove: PropTypes.func.isRequired, // Removes an account by id
  t: PropTypes.func, // The translation function
};

export default withTranslation("common")(ManageAccountsList);
