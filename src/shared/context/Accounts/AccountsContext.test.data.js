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

export const ACCOUNT_HOME_ID = "8f6a9f8e-5b2a-4c8b-9a51-6f1d6c7a0001";
export const ACCOUNT_WORK_ID = "8f6a9f8e-5b2a-4c8b-9a51-6f1d6c7a0002";
export const ACCOUNT_WORK_ADMIN_ID = "8f6a9f8e-5b2a-4c8b-9a51-6f1d6c7a0003";

/**
 * Account summaries as returned by passbolt.accounts.list. Fictional accounts, no credentials.
 */
export function accountSummaries() {
  return [
    {
      id: ACCOUNT_HOME_ID,
      domain: "https://vault.home.example",
      username: "alex@home.example",
      first_name: "Alex",
      last_name: "Moreau",
      is_locked: false,
    },
    {
      id: ACCOUNT_WORK_ID,
      domain: "https://passbolt.work.example/vault",
      username: "alex.moreau@work.example",
      first_name: "Alex",
      last_name: "Moreau",
      is_locked: false,
    },
    {
      id: ACCOUNT_WORK_ADMIN_ID,
      domain: "https://passbolt.work.example/vault",
      username: "it-admin@work.example",
      first_name: "IT",
      last_name: "Admin",
      is_locked: true,
    },
  ];
}

export const PENDING_SIGN_IN = {
  domain: "https://vault.home.example",
  username: "erin@home.example",
  expires_at: Date.UTC(2026, 10, 10, 15, 30),
};

export function accountsListDto(data = {}) {
  return {
    pending: null,
    active_account_id: ACCOUNT_HOME_ID,
    accounts: accountSummaries(),
    servers: [{ domain: "https://vault.home.example" }, { domain: "https://passbolt.work.example/vault" }],
    ...data,
  };
}

/**
 * A ready accounts context value, for component tests and stories.
 */
export function defaultAccountsContext(data = {}) {
  const listDto = accountsListDto();
  return {
    isAvailable: true,
    isLoading: false,
    loadError: null,
    activeAccountId: listDto.active_account_id,
    accounts: listDto.accounts,
    servers: listDto.servers,
    pending: null,
    refresh: jest.fn(),
    addAccount: jest.fn(() =>
      Promise.resolve({ account_id: "new", url: "https://new.example", requires_unlock: true }),
    ),
    switchAccount: jest.fn(() =>
      Promise.resolve({
        account_id: ACCOUNT_WORK_ID,
        url: "https://passbolt.work.example/vault",
        requires_unlock: false,
      }),
    ),
    removeAccount: jest.fn(() => Promise.resolve()),
    lockAccount: jest.fn(() => Promise.resolve()),
    cancelPending: jest.fn(() => Promise.resolve()),
    ...data,
  };
}
