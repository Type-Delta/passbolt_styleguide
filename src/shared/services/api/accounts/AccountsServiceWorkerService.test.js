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

import MockPort from "../../../../react-extension/test/mock/MockPort";
import AccountsServiceWorkerService, {
  ACCOUNTS_CHANGED_EVENT,
  CANCEL_PENDING_ACCOUNT,
  ADD_ACCOUNT,
  CHECK_PASSPHRASE,
  OPEN_ADD_ACCOUNT_TAB,
  VALIDATE_PRIVATE_KEY,
  VERIFY_SERVER,
  LIST_ACCOUNTS,
  LOCK_ACCOUNT,
  REMOVE_ACCOUNT,
  SWITCH_ACCOUNT,
} from "./AccountsServiceWorkerService";
import { accountsListDto } from "../../../context/Accounts/AccountsContext.test.data";

describe("AccountsServiceWorkerService", () => {
  let port, service;

  beforeEach(() => {
    port = new MockPort();
    service = new AccountsServiceWorkerService(port);
  });

  it("lists the saved accounts", async () => {
    expect.assertions(1);
    port.addRequestListener(LIST_ACCOUNTS, jest.fn().mockResolvedValue(accountsListDto()));
    await expect(service.list()).resolves.toEqual(accountsListDto());
  });

  it("adds an account with the contract payload", async () => {
    expect.assertions(1);
    const listener = jest.fn().mockResolvedValue({ account_id: "a", url: "https://a.test", requires_unlock: false });
    port.addRequestListener(ADD_ACCOUNT, listener);
    const dto = {
      domain: "https://a.test",
      username: "ada@a.test",
      user_private_armored_key: "key",
      passphrase: "secret",
    };
    await service.add(dto);
    expect(listener.mock.calls[0][0]).toEqual(dto);
  });

  it.each([
    [SWITCH_ACCOUNT, "switch"],
    [REMOVE_ACCOUNT, "remove"],
    [LOCK_ACCOUNT, "lock"],
  ])("sends %s with the account id", async (message, method) => {
    expect.assertions(1);
    const listener = jest.fn().mockResolvedValue({});
    port.addRequestListener(message, listener);
    await service[method]("account-id");
    expect(listener.mock.calls[0][0]).toEqual({ account_id: "account-id" });
  });

  it("subscribes and unsubscribes to registry changes", () => {
    expect.assertions(2);
    const callback = jest.fn();
    const unsubscribe = service.onChanged(callback);
    expect(port.emitListener[ACCOUNTS_CHANGED_EVENT]).toBe(callback);
    unsubscribe();
    expect(port.emitListener[ACCOUNTS_CHANGED_EVENT]).toBeUndefined();
  });

  it("cancels the pending sign-in without arguments", async () => {
    expect.assertions(2);
    const listener = jest.fn().mockResolvedValue(accountsListDto());
    port.addRequestListener(CANCEL_PENDING_ACCOUNT, listener);
    await expect(service.cancelPending()).resolves.toEqual(accountsListDto());
    // MockPort appends its storage as the only argument.
    expect(listener.mock.calls[0]).toHaveLength(1);
  });

  it("uses the frozen onboarding message names", () => {
    expect.assertions(4);
    expect(OPEN_ADD_ACCOUNT_TAB).toBe("passbolt.accounts.open-add-tab");
    expect(VERIFY_SERVER).toBe("passbolt.accounts.verify-server");
    expect(VALIDATE_PRIVATE_KEY).toBe("passbolt.accounts.validate-private-key");
    expect(CHECK_PASSPHRASE).toBe("passbolt.accounts.check-passphrase");
  });

  it("opens the add account tab with an optional server hint only", async () => {
    expect.assertions(2);
    const listener = jest.fn().mockResolvedValue({ tab_id: 3 });
    port.addRequestListener(OPEN_ADD_ACCOUNT_TAB, listener);
    await service.openAddTab("https://a.test");
    await service.openAddTab();
    expect(listener.mock.calls[0][0]).toEqual({ domain: "https://a.test" });
    expect(listener.mock.calls[1][0]).toEqual({});
  });

  it.each([
    [VERIFY_SERVER, "verifyServer", { domain: "https://a.test", remember: true }],
    [VALIDATE_PRIVATE_KEY, "validatePrivateKey", { username: "ada@a.test", user_private_armored_key: "key" }],
    [CHECK_PASSPHRASE, "checkPassphrase", { user_private_armored_key: "key", passphrase: "secret" }],
  ])("sends %s with its contract payload", async (message, method, dto) => {
    expect.assertions(1);
    const listener = jest.fn().mockResolvedValue({});
    port.addRequestListener(message, listener);
    await service[method](dto);
    expect(listener.mock.calls[0][0]).toEqual(dto);
  });
});
