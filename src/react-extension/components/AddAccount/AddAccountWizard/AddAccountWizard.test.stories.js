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
import AppContext from "../../../../shared/context/AppContext/AppContext";
import { AccountsContext } from "../../../../shared/context/Accounts/AccountsContext";
import { PENDING_SIGN_IN, defaultAccountsContext } from "../../../../shared/context/Accounts/AccountsContext.test.data";
import AddAccountWizard from "./AddAccountWizard";
import LogoSVG from "../../../../img/svg/logo.svg";

export default {
  title: "Components/AddAccount/AddAccountWizard",
  component: AddAccountWizard,
  parameters: { css: "ext_authentication" },
};

/**
 * The add account tab: the authentication page layout around the wizard.
 */
const Template = ({ accountsContext, domainHint }) => (
  <AppContext.Provider value={{ port: { request: () => Promise.resolve(false) } }}>
    <AccountsContext.Provider value={accountsContext}>
      <div id="container" className="container page login add-account-page">
        <div className="content">
          <div className="header">
            <div className="logo-svg">
              <LogoSVG role="img" width="20rem" height="3.5rem" />
            </div>
          </div>
          <div className="login-form">
            <AddAccountWizard domainHint={domainHint} onClose={() => {}} />
          </div>
        </div>
      </div>
    </AccountsContext.Provider>
  </AppContext.Provider>
);

export const FirstServer = {
  render: Template,
  args: { accountsContext: defaultAccountsContext({ accounts: [], activeAccountId: null, servers: [] }) },
};

export const SavedServers = {
  render: Template,
  args: { accountsContext: defaultAccountsContext(), domainHint: "https://passbolt.work.example/vault" },
};

export const WithPendingSignIn = {
  render: Template,
  args: { accountsContext: defaultAccountsContext({ pending: PENDING_SIGN_IN }) },
};
