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
import { MemoryRouter, Route, Switch } from "react-router-dom";
import AppContext from "../../../shared/context/AppContext/AppContext";
import { AccountsContext } from "../../../shared/context/Accounts/AccountsContext";
import { defaultAccountsContext } from "../../../shared/context/Accounts/AccountsContext.test.data";
import AccountsPage, { ACCOUNTS_ROUTE, MANAGE_ACCOUNTS_ROUTE } from "./AccountsPage";
import ManageAccountsPage from "../ManageAccountsPage/ManageAccountsPage";
import Header from "../Header/Header";

export default {
  title: "Components/QuickAccess/Accounts",
  component: AccountsPage,
  parameters: { css: "ext_quickaccess" },
};

/**
 * The quick access popup frame with its header and the account routes.
 */
const Template = ({ accountsContext, initialEntries }) => (
  <AppContext.Provider value={{ port: {}, closeWindow: () => {} }}>
    <AccountsContext.Provider value={accountsContext}>
      <MemoryRouter initialEntries={initialEntries} initialIndex={initialEntries.length - 1}>
        <div className="container quickaccess" style={{ width: "38rem" }}>
          <Header />
          <Switch>
            <Route exact path={ACCOUNTS_ROUTE} component={AccountsPage} />
            <Route exact path={MANAGE_ACCOUNTS_ROUTE} component={ManageAccountsPage} />
            <Route path="/" render={() => <p style={{ padding: "1.6rem" }}>Home</p>} />
          </Switch>
        </div>
      </MemoryRouter>
    </AccountsContext.Provider>
  </AppContext.Provider>
);

export const Switcher = {
  render: Template,
  args: { accountsContext: defaultAccountsContext(), initialEntries: ["/home", ACCOUNTS_ROUTE] },
};

export const Loading = {
  render: Template,
  args: {
    accountsContext: defaultAccountsContext({ accounts: [], activeAccountId: null, isLoading: true }),
    initialEntries: ["/home", ACCOUNTS_ROUTE],
  },
};

export const FirstUse = {
  render: Template,
  args: {
    accountsContext: defaultAccountsContext({ accounts: [], activeAccountId: null, servers: [] }),
    initialEntries: [ACCOUNTS_ROUTE],
  },
};

export const ServerWithoutAccount = {
  render: Template,
  args: {
    accountsContext: defaultAccountsContext({
      servers: [...defaultAccountsContext().servers, { domain: "https://empty.example/passbolt" }],
    }),
    initialEntries: ["/home", ACCOUNTS_ROUTE],
  },
};

export const ManageAccounts = {
  render: Template,
  args: { accountsContext: defaultAccountsContext(), initialEntries: ["/home", ACCOUNTS_ROUTE, MANAGE_ACCOUNTS_ROUTE] },
};
