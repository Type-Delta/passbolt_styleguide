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

import React from "react";
import PropTypes from "prop-types";
import AccountsServiceWorkerService from "../../services/api/accounts/AccountsServiceWorkerService";

/**
 * Saved accounts of the extension. `isAvailable` is false wherever no provider is mounted (e.g. pages
 * served by the API), which is how consumers know to hide account switching.
 */
export const AccountsContext = React.createContext({
  isAvailable: false,
  isLoading: false,
  loadError: null,
  activeAccountId: null,
  accounts: [],
  servers: [],
  pending: null,
  refresh: () => {},
  addAccount: () => {},
  switchAccount: () => {},
  removeAccount: () => {},
  lockAccount: () => {},
  cancelPending: () => {},
  openAddAccount: () => {},
  verifyServer: () => {},
  validatePrivateKey: () => {},
  checkPassphrase: () => {},
});

/**
 * Trim trailing slashes so "https://a.test/" and "https://a.test" designate the same server.
 * @param {string} domain
 * @returns {string}
 */
export function normalizeDomain(domain = "") {
  return domain.trim().replace(/\/+$/, "");
}

/**
 * Readable server label: host plus deployment path, e.g. "vault.example.com/passbolt".
 * @param {string} domain The account base URL
 * @returns {string}
 */
export function getServerLabel(domain) {
  try {
    const url = new URL(domain);
    const path = url.pathname.replace(/\/+$/, "");
    return `${url.host}${path}`;
  } catch {
    return domain || "";
  }
}

/**
 * Provides the saved accounts through the extension port. Credentials, identity checks and navigation
 * stay in the extension; this context only mirrors the public account summaries.
 */
export class AccountsContextProvider extends React.Component {
  constructor(props) {
    super(props);
    this.accountsService = new AccountsServiceWorkerService(props.port);
    // Bumped on every applied list; a list request answered after a newer push is ignored.
    this.listVersion = 0;
    this.state = {
      isAvailable: true,
      isLoading: true,
      loadError: null,
      activeAccountId: null,
      accounts: [],
      servers: [],
      pending: null, // The sign-in waiting for MFA: {domain, username, expires_at}, not a saved account
      refresh: this.refresh.bind(this),
      addAccount: this.addAccount.bind(this),
      switchAccount: this.switchAccount.bind(this),
      removeAccount: this.removeAccount.bind(this),
      lockAccount: this.lockAccount.bind(this),
      cancelPending: this.cancelPending.bind(this),
      openAddAccount: this.openAddAccount.bind(this),
      verifyServer: this.verifyServer.bind(this),
      validatePrivateKey: this.validatePrivateKey.bind(this),
      checkPassphrase: this.checkPassphrase.bind(this),
    };
    this.applyList = this.applyList.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
  }

  componentDidMount() {
    this.unsubscribe = this.accountsService.onChanged(this.applyList);
    // A pending MFA enrollment completes in another page: list again whenever this one is shown.
    window.addEventListener("focus", this.handleVisibilityChange);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    this.refresh();
  }

  componentWillUnmount() {
    this.unsubscribe?.();
    window.removeEventListener("focus", this.handleVisibilityChange);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    this.isUnmounted = true;
  }

  handleVisibilityChange() {
    if (document.visibilityState === "visible") {
      this.refresh();
    }
  }

  /**
   * @param {{active_account_id: string|null, accounts: Array, servers: Array}} listDto
   */
  applyList(listDto) {
    if (this.isUnmounted) {
      return;
    }
    this.listVersion++;
    this.setState({
      isLoading: false,
      loadError: null,
      activeAccountId: listDto?.active_account_id ?? null,
      accounts: listDto?.accounts || [],
      servers: listDto?.servers || [],
      pending: listDto?.pending || null,
    });
  }

  async refresh() {
    const version = this.listVersion;
    this.setState({ isLoading: true });
    try {
      const listDto = await this.accountsService.list();
      if (version === this.listVersion) {
        this.applyList(listDto);
      }
    } catch (error) {
      if (!this.isUnmounted && version === this.listVersion) {
        this.setState({ isLoading: false, loadError: error });
      }
    }
  }

  /**
   * @returns {Promise<{account_id: string, url: string, requires_unlock: boolean}>}
   */
  addAccount(addAccountDto) {
    return this.accountsService.add(addAccountDto);
  }

  /**
   * @returns {Promise<{account_id: string, url: string, requires_unlock: boolean}>}
   */
  switchAccount(accountId) {
    return this.accountsService.switch(accountId);
  }

  async removeAccount(accountId) {
    this.applyList(await this.accountsService.remove(accountId));
  }

  async lockAccount(accountId) {
    this.applyList(await this.accountsService.lock(accountId));
  }

  async cancelPending() {
    this.applyList(await this.accountsService.cancelPending());
  }

  /**
   * Open the add account wizard in its own tab.
   * @param {string} [domain] The server to suggest, verified again by the wizard
   * @returns {Promise<{tab_id: number}>}
   */
  openAddAccount(domain) {
    return this.accountsService.openAddTab(domain);
  }

  /**
   * Verify a server and remember its public metadata once the user continues with it.
   * @returns {Promise<{domain: string, server_key_fingerprint: string, checked_at: string, is_known: boolean}>}
   */
  verifyServer(domain) {
    return this.accountsService.verifyServer({ domain, remember: true });
  }

  /**
   * @param {{username: string, user_private_armored_key: string}} validatePrivateKeyDto
   * @returns {Promise<{fingerprint: string, expires: string, matches_email: boolean}>}
   */
  validatePrivateKey(validatePrivateKeyDto) {
    return this.accountsService.validatePrivateKey(validatePrivateKeyDto);
  }

  /**
   * @param {{user_private_armored_key: string, passphrase: string}} checkPassphraseDto
   * @returns {Promise<void>}
   */
  checkPassphrase(checkPassphraseDto) {
    return this.accountsService.checkPassphrase(checkPassphraseDto);
  }

  render() {
    return <AccountsContext.Provider value={this.state}>{this.props.children}</AccountsContext.Provider>;
  }
}

AccountsContextProvider.propTypes = {
  port: PropTypes.object.isRequired, // The extension port
  children: PropTypes.any,
};

export default AccountsContextProvider;

/**
 * Provides the `accountsContext` prop.
 */
export function withAccounts(WrappedComponent) {
  return class WithAccounts extends React.Component {
    render() {
      return (
        <AccountsContext.Consumer>
          {(accountsContext) => <WrappedComponent accountsContext={accountsContext} {...this.props} />}
        </AccountsContext.Consumer>
      );
    }
  };
}
