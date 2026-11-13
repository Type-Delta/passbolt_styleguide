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

/**
 * Unit tests on the quick access account pages in regard of specifications
 */

import "@testing-library/jest-dom";
import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Switch } from "react-router-dom";
import MockTranslationProvider from "../../../react-extension/test/mock/components/Internationalisation/MockTranslationProvider";
import AppContext from "../../../shared/context/AppContext/AppContext";
import { AccountsContext } from "../../../shared/context/Accounts/AccountsContext";
import {
  ACCOUNT_WORK_ADMIN_ID,
  ACCOUNT_WORK_ID,
  defaultAccountsContext,
} from "../../../shared/context/Accounts/AccountsContext.test.data";
import AccountsPage, { ACCOUNTS_ROUTE, MANAGE_ACCOUNTS_ROUTE } from "./AccountsPage";
import ManageAccountsPage from "../ManageAccountsPage/ManageAccountsPage";
import Header from "../Header/Header";

function renderQuickAccess({
  accountsContext = defaultAccountsContext(),
  initialEntries = ["/home", ACCOUNTS_ROUTE],
} = {}) {
  const appContext = { port: {}, closeWindow: jest.fn() };
  render(
    <MockTranslationProvider>
      <AppContext.Provider value={appContext}>
        <AccountsContext.Provider value={accountsContext}>
          <MemoryRouter initialEntries={initialEntries} initialIndex={initialEntries.length - 1}>
            <Header />
            <Switch>
              <Route exact path={ACCOUNTS_ROUTE} component={AccountsPage} />
              <Route exact path={MANAGE_ACCOUNTS_ROUTE} component={ManageAccountsPage} />
              <Route path="/home" render={() => <p>Home</p>} />
            </Switch>
          </MemoryRouter>
        </AccountsContext.Provider>
      </AppContext.Provider>
    </MockTranslationProvider>,
  );
  return { appContext, accountsContext };
}

describe("Quick access accounts", () => {
  it("opens the switcher from the header account, the second of three clicks from the toolbar", () => {
    renderQuickAccess({ initialEntries: ["/home"] });
    const headerAccount = screen.getByRole("link", { name: /Current: alex@home.example on vault.home.example/ });
    fireEvent.click(headerAccount);
    expect(screen.getByRole("list", { name: "Accounts on https://vault.home.example" })).toBeInTheDocument();
    expect(screen.getByText("Current")).toBeInTheDocument();
  });

  it("closes the popup after switching to an unlocked account", async () => {
    const { appContext, accountsContext } = renderQuickAccess();
    fireEvent.click(screen.getByRole("button", { name: /alex.moreau@work.example/ }));
    await waitFor(() => expect(appContext.closeWindow).toHaveBeenCalled());
    expect(accountsContext.switchAccount).toHaveBeenCalledWith(ACCOUNT_WORK_ID);
  });

  it("also closes after switching to a locked account, the extension opens its sign-in", async () => {
    const accountsContext = defaultAccountsContext({
      switchAccount: jest.fn(() =>
        Promise.resolve({ account_id: ACCOUNT_WORK_ADMIN_ID, url: "u", requires_unlock: true }),
      ),
    });
    const { appContext } = renderQuickAccess({ accountsContext });
    fireEvent.click(screen.getByRole("button", { name: /it-admin@work.example/ }));
    await waitFor(() => expect(appContext.closeWindow).toHaveBeenCalled());
    expect(accountsContext.switchAccount).toHaveBeenCalledWith(ACCOUNT_WORK_ADMIN_ID);
  });

  it("groups the accounts under whole server URLs, including a verified server without accounts", () => {
    const accountsContext = defaultAccountsContext({
      servers: [...defaultAccountsContext().servers, { domain: "https://empty.example/passbolt" }],
    });
    renderQuickAccess({ accountsContext });
    const headings = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
    expect(headings).toEqual([
      "https://vault.home.example",
      "https://passbolt.work.example/vault",
      "https://empty.example/passbolt",
    ]);
    const workAccounts = screen.getByRole("list", { name: "Accounts on https://passbolt.work.example/vault" });
    expect(within(workAccounts).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("No account added on this server yet.")).toBeInTheDocument();
  });

  it("opens the add account tab for one server and closes the popup", async () => {
    const accountsContext = defaultAccountsContext({
      servers: [...defaultAccountsContext().servers, { domain: "https://empty.example/passbolt" }],
    });
    const { appContext } = renderQuickAccess({ accountsContext });
    fireEvent.click(screen.getByRole("button", { name: "Add account on https://empty.example/passbolt" }));
    await waitFor(() => expect(appContext.closeWindow).toHaveBeenCalled());
    expect(accountsContext.openAddAccount).toHaveBeenCalledWith("https://empty.example/passbolt");
  });

  it("opens the tab for the current server, or for a new server, from the global actions", async () => {
    const { appContext, accountsContext } = renderQuickAccess();
    fireEvent.click(screen.getByRole("button", { name: "Add account" }));
    await waitFor(() => expect(accountsContext.openAddAccount).toHaveBeenCalledWith("https://vault.home.example"));
    fireEvent.click(screen.getByRole("button", { name: "Add server" }));
    await waitFor(() => expect(accountsContext.openAddAccount).toHaveBeenLastCalledWith(undefined));
    expect(appContext.closeWindow).toHaveBeenCalledTimes(2);
  });

  it("keeps Add server once a server is known, even without any account", () => {
    const accountsContext = defaultAccountsContext({ accounts: [], activeAccountId: null });
    renderQuickAccess({ accountsContext });
    expect(screen.getByRole("button", { name: "Add server" })).toBeInTheDocument();
    expect(screen.getAllByText("No account added on this server yet.")).toHaveLength(2);
    expect(screen.queryByText("No Passbolt account in this browser yet.")).toBeNull();
    expect(screen.queryByRole("button", { name: "Manage accounts" })).toBeNull();
  });

  it("shows why the add account tab could not be opened and keeps the popup open", async () => {
    const accountsContext = defaultAccountsContext({
      openAddAccount: jest.fn(() => Promise.reject(new Error("Open the extension to manage saved accounts."))),
    });
    const { appContext } = renderQuickAccess({ accountsContext });
    fireEvent.click(screen.getByRole("button", { name: "Add account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The add account page could not be opened. Open the extension to manage saved accounts.",
    );
    expect(appContext.closeWindow).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Add account" })).toBeEnabled();
  });

  it("offers to add a first account without any key or passphrase field", () => {
    const accountsContext = defaultAccountsContext({ accounts: [], activeAccountId: null, servers: [] });
    renderQuickAccess({ accountsContext, initialEntries: [ACCOUNTS_ROUTE] });
    expect(screen.getByRole("heading", { name: "Accounts" })).toBeInTheDocument();
    expect(screen.getByText("No Passbolt account in this browser yet.")).toBeInTheDocument();
    expect(screen.queryByTitle("Go back")).toBeNull();
    expect(screen.queryByRole("link", { name: /Switch account/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add server" })).toBeNull();
    expect(document.querySelector("textarea, input[type=password], input[type=email]")).toBeNull();
    expect(screen.getByRole("button", { name: "Add account" })).toBeEnabled();
  });

  it("adds an account from the manage page through the tab as well", async () => {
    const { appContext, accountsContext } = renderQuickAccess();
    fireEvent.click(screen.getByRole("button", { name: "Manage accounts" }));
    expect(screen.getByRole("list", { name: "Saved accounts" })).toHaveClass("manage-accounts-list");
    fireEvent.click(screen.getByRole("button", { name: "Add account" }));
    await waitFor(() => expect(appContext.closeWindow).toHaveBeenCalled());
    expect(accountsContext.openAddAccount).toHaveBeenCalledWith(undefined);
  });
});
