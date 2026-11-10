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
import { render, act, waitFor } from "@testing-library/react";
import MockPort from "../../../react-extension/test/mock/MockPort";
import { AccountsContext, AccountsContextProvider, getServerLabel } from "./AccountsContext";
import {
  ACCOUNTS_CHANGED_EVENT,
  CANCEL_PENDING_ACCOUNT,
  LIST_ACCOUNTS,
  LOCK_ACCOUNT,
  REMOVE_ACCOUNT,
} from "../../services/api/accounts/AccountsServiceWorkerService";
import { ACCOUNT_WORK_ID, PENDING_SIGN_IN, accountsListDto } from "./AccountsContext.test.data";

// MockPort answers on a 0 ms timer scheduled after a microtask: wait past it, not on a racing 0 ms timer.
const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 10)));
// Wait for a state without counting assertions, so each expectation below runs exactly once.
const until = (predicate) =>
  waitFor(() => {
    if (!predicate()) {
      throw new Error("Not yet");
    }
  });

function renderProvider(port) {
  let contextValue;
  const utils = render(
    <AccountsContextProvider port={port}>
      <AccountsContext.Consumer>
        {(value) => {
          contextValue = value;
          return null;
        }}
      </AccountsContext.Consumer>
    </AccountsContextProvider>,
  );
  return {
    ...utils,
    get context() {
      return contextValue;
    },
  };
}

describe("AccountsContext", () => {
  let port;

  beforeEach(() => {
    port = new MockPort();
  });

  it("loads the saved accounts on mount", async () => {
    expect.assertions(4);
    port.addRequestListener(LIST_ACCOUNTS, () => accountsListDto());
    const page = renderProvider(port);
    expect(page.context.isLoading).toBe(true);
    await until(() => !page.context.isLoading);
    expect(page.context.isLoading).toBe(false);
    expect(page.context.accounts).toHaveLength(3);
    expect(page.context.activeAccountId).toEqual(accountsListDto().active_account_id);
  });

  it("exposes a load error when the extension cannot list accounts", async () => {
    expect.assertions(2);
    port.addRequestListener(LIST_ACCOUNTS, () => Promise.reject(new Error("Unavailable")));
    const page = renderProvider(port);
    await flush();
    expect(page.context.isLoading).toBe(false);
    expect(page.context.loadError.message).toEqual("Unavailable");
  });

  it("applies pushed changes and ignores a list response answered before them", async () => {
    expect.assertions(1);
    let resolveList;
    port.addRequestListener(LIST_ACCOUNTS, () => new Promise((resolve) => (resolveList = resolve)));
    const page = renderProvider(port);
    await flush();
    await act(async () =>
      port.emitListener[ACCOUNTS_CHANGED_EVENT](accountsListDto({ active_account_id: ACCOUNT_WORK_ID })),
    );
    await act(async () => resolveList(accountsListDto()));
    await flush();
    expect(page.context.activeAccountId).toEqual(ACCOUNT_WORK_ID);
  });

  it("applies the list returned by remove and lock", async () => {
    expect.assertions(2);
    port.addRequestListener(LIST_ACCOUNTS, () => accountsListDto());
    port.addRequestListener(REMOVE_ACCOUNT, () =>
      accountsListDto({ accounts: accountsListDto().accounts.slice(0, 2) }),
    );
    const locked = accountsListDto().accounts.map((account) => ({ ...account, is_locked: true }));
    port.addRequestListener(LOCK_ACCOUNT, () => accountsListDto({ accounts: locked }));
    const page = renderProvider(port);
    await flush();
    await act(() => page.context.removeAccount("any"));
    expect(page.context.accounts).toHaveLength(2);
    await act(() => page.context.lockAccount("any"));
    expect(page.context.accounts.every((account) => account.is_locked)).toBe(true);
  });

  it("stops listening on unmount", async () => {
    expect.assertions(1);
    port.addRequestListener(LIST_ACCOUNTS, () => accountsListDto());
    const page = renderProvider(port);
    await flush();
    page.unmount();
    expect(port.emitListener[ACCOUNTS_CHANGED_EVENT]).toBeUndefined();
  });

  it("formats the server label with its deployment path", () => {
    expect(getServerLabel("https://passbolt.work.example/vault/")).toEqual("passbolt.work.example/vault");
    expect(getServerLabel("https://vault.home.example:8443")).toEqual("vault.home.example:8443");
    expect(getServerLabel("not a url")).toEqual("not a url");
  });

  it("exposes the pending sign-in from the list and from pushes", async () => {
    expect.assertions(2);
    port.addRequestListener(LIST_ACCOUNTS, () => accountsListDto({ pending: PENDING_SIGN_IN }));
    const page = renderProvider(port);
    await until(() => page.context.pending);
    expect(page.context.pending).toEqual(PENDING_SIGN_IN);
    await act(async () => port.emitListener[ACCOUNTS_CHANGED_EVENT](accountsListDto()));
    expect(page.context.pending).toBeNull();
  });

  it("applies the list returned by cancelling the pending sign-in", async () => {
    expect.assertions(2);
    port.addRequestListener(LIST_ACCOUNTS, () => accountsListDto({ pending: PENDING_SIGN_IN }));
    port.addRequestListener(CANCEL_PENDING_ACCOUNT, () => accountsListDto());
    const page = renderProvider(port);
    await flush();
    await act(() => page.context.cancelPending());
    expect(page.context.pending).toBeNull();
    expect(page.context.accounts).toHaveLength(3);
  });

  it("keeps the visible accounts when a refresh on focus fails", async () => {
    expect.assertions(3);
    const list = jest.fn(() => accountsListDto({ pending: PENDING_SIGN_IN }));
    port.addRequestListener(LIST_ACCOUNTS, list);
    const page = renderProvider(port);
    await until(() => page.context.pending);
    list.mockImplementation(() => Promise.reject(new Error("Disconnected port.")));
    await act(async () => window.dispatchEvent(new Event("focus")));
    await until(() => page.context.loadError);
    expect(page.context.loadError.message).toEqual("Disconnected port.");
    expect(page.context.accounts).toHaveLength(3);
    expect(page.context.pending).toEqual(PENDING_SIGN_IN);
  });
});
