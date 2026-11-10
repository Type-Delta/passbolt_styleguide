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

const FICTIONAL_KEY =
  "-----BEGIN PGP PRIVATE KEY BLOCK-----\n\nfictional story key\n-----END PGP PRIVATE KEY BLOCK-----";

/**
 * Story play step: fill and submit the add account form with fictional data.
 */
export async function fillAndSubmitAddAccount({ canvasElement }) {
  const canvas = within(canvasElement.ownerDocument.body);
  await userEvent.type(canvas.getByLabelText("Email"), "alex.moreau@work.example");
  await userEvent.click(canvas.getByLabelText("Private key"));
  await userEvent.paste(FICTIONAL_KEY);
  await userEvent.type(canvasElement.ownerDocument.querySelector("#add-account-passphrase"), "fictional");
  await userEvent.click(canvas.getByRole("button", { name: "Add account" }));
}

/**
 * Story play step: open the user badge menu.
 */
export async function openAccountMenu({ canvasElement }) {
  await userEvent.click(within(canvasElement).getByRole("button", { name: "Account menu" }));
}
