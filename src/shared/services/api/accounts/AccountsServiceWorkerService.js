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

export const LIST_ACCOUNTS = "passbolt.accounts.list";
export const ADD_ACCOUNT = "passbolt.accounts.add";
export const SWITCH_ACCOUNT = "passbolt.accounts.switch";
export const REMOVE_ACCOUNT = "passbolt.accounts.remove";
export const LOCK_ACCOUNT = "passbolt.accounts.lock";
export const CANCEL_PENDING_ACCOUNT = "passbolt.accounts.cancel-pending";
export const ACCOUNTS_CHANGED_EVENT = "passbolt.accounts.changed";

/**
 * Saved accounts of the browser extension, through the extension port.
 * The extension owns the account registry: list/remove/lock/cancel-pending resolve with the public list shape
 * {active_account_id, accounts: AccountSummary[], servers: [{domain}], pending: {domain, username, expires_at}|null},
 * add/switch resolve with
 * {account_id, url, requires_unlock}. Summaries never contain keys or passphrases.
 */
class AccountsServiceWorkerService {
  constructor(port) {
    this.port = port;
  }

  list() {
    return this.port.request(LIST_ACCOUNTS);
  }

  /**
   * @param {{domain: string, username: string, user_private_armored_key: string, passphrase: string}} addAccountDto
   */
  add(addAccountDto) {
    return this.port.request(ADD_ACCOUNT, addAccountDto);
  }

  switch(accountId) {
    return this.port.request(SWITCH_ACCOUNT, { account_id: accountId });
  }

  remove(accountId) {
    return this.port.request(REMOVE_ACCOUNT, { account_id: accountId });
  }

  lock(accountId) {
    return this.port.request(LOCK_ACCOUNT, { account_id: accountId });
  }

  /**
   * Abandon the sign-in waiting for multi-factor authentication. Idempotent.
   */
  cancelPending() {
    return this.port.request(CANCEL_PENDING_ACCOUNT);
  }

  /**
   * Subscribe to the registry changes pushed by the extension.
   * @param {function(object)} callback Receives the public list shape.
   * @returns {function()} Unsubscribe.
   */
  onChanged(callback) {
    this.port.on(ACCOUNTS_CHANGED_EVENT, callback);
    return () => this.port.removeListener(ACCOUNTS_CHANGED_EVENT, callback);
  }
}

export default AccountsServiceWorkerService;
