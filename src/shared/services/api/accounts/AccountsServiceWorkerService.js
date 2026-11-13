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
export const OPEN_ADD_ACCOUNT_TAB = "passbolt.accounts.open-add-tab";
export const VERIFY_SERVER = "passbolt.accounts.verify-server";
export const VALIDATE_PRIVATE_KEY = "passbolt.accounts.validate-private-key";
export const CHECK_PASSPHRASE = "passbolt.accounts.check-passphrase";
export const ACCOUNTS_CHANGED_EVENT = "passbolt.accounts.changed";

/**
 * Saved accounts of the browser extension, through the extension port.
 * The extension owns the account registry: list/remove/lock/cancel-pending resolve with the public list shape
 * {active_account_id, accounts: AccountSummary[], servers: [{domain}], pending: {domain, username, expires_at}|null},
 * add/switch resolve with
 * {account_id, url, requires_unlock}. The add wizard sends add
 * {domain, username, user_private_armored_key, passphrase, security_token, expected_server_key_fingerprint}. Summaries never contain keys or passphrases.
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
   * Open the add account wizard in a new extension tab.
   * @param {string} [domain] An untrusted server hint, verified again by the wizard.
   * @returns {Promise<{tab_id: number}>}
   */
  openAddTab(domain) {
    return this.port.request(OPEN_ADD_ACCOUNT_TAB, domain ? { domain } : {});
  }

  /**
   * Check that a server answers as a genuine Passbolt server, anonymously.
   * @param {{domain: string, remember: boolean}} verifyServerDto
   * @returns {Promise<{domain: string, server_key_fingerprint: string, checked_at: string, is_known: boolean}>}
   */
  verifyServer(verifyServerDto) {
    return this.port.request(VERIFY_SERVER, verifyServerDto);
  }

  /**
   * Check locally that a private key can be imported for an email. Nothing is stored.
   * @param {{username: string, user_private_armored_key: string}} validatePrivateKeyDto
   * @returns {Promise<{fingerprint: string, expires: string, matches_email: boolean}>}
   */
  validatePrivateKey(validatePrivateKeyDto) {
    return this.port.request(VALIDATE_PRIVATE_KEY, validatePrivateKeyDto);
  }

  /**
   * Check locally that a passphrase decrypts a private key. Rejects with InvalidMasterPasswordError otherwise.
   * @param {{user_private_armored_key: string, passphrase: string}} checkPassphraseDto
   * @returns {Promise<void>}
   */
  checkPassphrase(checkPassphraseDto) {
    return this.port.request(CHECK_PASSPHRASE, checkPassphraseDto);
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
