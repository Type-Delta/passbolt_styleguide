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
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Switch } from "react-router-dom";
import MockTranslationProvider from "../../../react-extension/test/mock/components/Internationalisation/MockTranslationProvider";
import AppContext from "../../../shared/context/AppContext/AppContext";
import { AccountsContext } from "../../../shared/context/Accounts/AccountsContext";
import {
  ACCOUNT_WORK_ADMIN_ID,
  ACCOUNT_WORK_ID,
  defaultAccountsContext,
} from "../../../shared/context/Accounts/AccountsContext.test.data";
import AccountsPage, { ACCOUNTS_ROUTE, ADD_ACCOUNT_ROUTE, MANAGE_ACCOUNTS_ROUTE } from "./AccountsPage";
import AddAccountPage from "../AddAccountPage/AddAccountPage";
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
              <Route exact path={ADD_ACCOUNT_ROUTE} component={AddAccountPage} />
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
    expect(screen.getByRole("list", { name: "Saved accounts" })).toBeInTheDocument();
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

  it("reaches add and manage from the switcher", () => {
    renderQuickAccess();
    fireEvent.click(screen.getByRole("button", { name: "Manage accounts" }));
    expect(screen.getByRole("list", { name: "Saved accounts" })).toHaveClass("manage-accounts-list");
    fireEvent.click(screen.getByRole("button", { name: "Add account" }));
    expect(screen.getByLabelText("vault.home.example")).toBeChecked();
  });

  it("offers to add an account before any account is configured", () => {
    const accountsContext = defaultAccountsContext({ accounts: [], activeAccountId: null, servers: [] });
    renderQuickAccess({ accountsContext, initialEntries: [ADD_ACCOUNT_ROUTE] });
    expect(screen.getByRole("heading", { name: "Add your Passbolt account" })).toBeInTheDocument();
    expect(screen.queryByTitle("Go back")).toBeNull();
    expect(screen.queryByRole("link", { name: /Switch account/ })).toBeNull();
    expect(screen.getByLabelText("Server")).toHaveValue("");
  });
});
