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
 * Unit tests on ExtAddAccount in regard of specifications
 */

import "@testing-library/jest-dom";
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import MockPort from "./test/mock/MockPort";
import MockTranslationProvider from "./test/mock/components/Internationalisation/MockTranslationProvider";
import { LIST_ACCOUNTS } from "../shared/services/api/accounts/AccountsServiceWorkerService";
import ExtAddAccount from "./ExtAddAccount";

// The real provider loads the locales over HTTP.
jest.mock(
  "../shared/components/Internationalisation/TranslationProvider",
  () =>
    ({ children }) =>
      children,
);

describe("ExtAddAccount", () => {
  it("starts the wizard without any account, on the hinted server", async () => {
    const port = new MockPort();
    port.addRequestListener(LIST_ACCOUNTS, () => ({ active_account_id: null, accounts: [], servers: [] }));
    const onClose = jest.fn();
    render(
      <MockTranslationProvider>
        <ExtAddAccount port={port} storage={{}} domainHint="https://passbolt.new.example" onClose={onClose} />
      </MockTranslationProvider>,
    );
    expect(screen.getByRole("heading", { name: "Which Passbolt server is your account on?" })).toBeInTheDocument();
    expect(await screen.findByLabelText("Server")).toHaveValue("https://passbolt.new.example");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
  });
});
