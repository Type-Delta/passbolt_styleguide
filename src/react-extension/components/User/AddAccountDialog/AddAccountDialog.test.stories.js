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

import { userEvent, within } from "storybook/test";
import AddAccountDialog from "./AddAccountDialog";
import { defaultAccountsContext } from "../../../../shared/context/Accounts/AccountsContext.test.data";
import { fillAndSubmitAddAccount } from "../../../../shared/context/Accounts/AccountsStories.test.data";

export default {
  title: "Components/User/AddAccountDialog",
  component: AddAccountDialog,
};

const context = { userSettings: { getTrustedDomain: () => "https://vault.home.example" } };

export const ConfiguredServers = {
  args: { context, accountsContext: defaultAccountsContext(), onClose: () => {} },
};

export const FirstAccount = {
  args: {
    context: {},
    accountsContext: defaultAccountsContext({ accounts: [], servers: [], activeAccountId: null }),
    onClose: () => {},
  },
};

export const ValidationErrors = {
  args: { context: {}, accountsContext: defaultAccountsContext({ servers: [] }), onClose: () => {} },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement.ownerDocument.body);
    await userEvent.type(canvas.getByLabelText("Server"), "http://vault.example");
    await userEvent.click(canvas.getByRole("button", { name: "Add account" }));
  },
};

export const UnreachableServer = {
  args: {
    context,
    accountsContext: defaultAccountsContext({
      addAccount: jest.fn(() =>
        Promise.reject(Object.assign(new Error("fetch failed"), { name: "PassboltServiceUnavailableError" })),
      ),
    }),
    onClose: () => {},
  },
  play: fillAndSubmitAddAccount,
};

export const PendingMfa = {
  args: { context, accountsContext: defaultAccountsContext(), onClose: () => {} },
  play: fillAndSubmitAddAccount,
};
