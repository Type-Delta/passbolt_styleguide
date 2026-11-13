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
import ManageAccountsDialog from "./ManageAccountsDialog";
import { defaultAccountsContext } from "../../../../shared/context/Accounts/AccountsContext.test.data";
import { defaultDialogContext } from "../../../contexts/DialogContext.test.data";

export default {
  title: "Components/User/ManageAccountsDialog",
  component: ManageAccountsDialog,
};

const args = () => ({
  accountsContext: defaultAccountsContext(),
  dialogContext: defaultDialogContext(),
  onClose: () => {},
});

export const Initial = { args: args() };

export const ConfirmRemoval = {
  args: args(),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement.ownerDocument.body);
    await userEvent.click(canvas.getByRole("button", { name: "Remove alex.moreau@work.example" }));
  },
};

export const NoAccount = {
  args: { ...args(), accountsContext: defaultAccountsContext({ accounts: [], activeAccountId: null }) },
};
