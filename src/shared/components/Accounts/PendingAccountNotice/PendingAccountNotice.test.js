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
 * Unit tests on PendingAccountNotice in regard of specifications
 */

import "@testing-library/jest-dom";
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import MockTranslationProvider from "../../../../react-extension/test/mock/components/Internationalisation/MockTranslationProvider";
import PendingAccountNotice from "./PendingAccountNotice";
import { PENDING_SIGN_IN } from "../../../context/Accounts/AccountsContext.test.data";

function renderNotice(onCancel = jest.fn(() => Promise.resolve())) {
  render(
    <MockTranslationProvider>
      <PendingAccountNotice pending={PENDING_SIGN_IN} onCancel={onCancel} />
    </MockTranslationProvider>,
  );
  return onCancel;
}

describe("PendingAccountNotice", () => {
  it("names the pending account, its server and its expiry without claiming it is saved", () => {
    renderNotice();
    const notice = screen.getByRole("status");
    expect(notice).toHaveTextContent("erin@home.example on vault.home.example");
    const time = new Date(PENDING_SIGN_IN.expires_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    expect(notice).toHaveTextContent(`before ${time}`);
    expect(notice).toHaveTextContent("The account is not saved until it succeeds.");
  });

  it("cancels the sign-in", async () => {
    const onCancel = renderNotice();
    fireEvent.click(screen.getByRole("button", { name: "Cancel the sign-in of erin@home.example" }));
    expect(screen.getByRole("button", { name: /Cancel the sign-in/ })).toBeDisabled();
    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
  });

  it("reports a failed cancellation and lets the user retry", async () => {
    renderNotice(jest.fn(() => Promise.reject(new Error("The server could not sign out the pending account."))));
    fireEvent.click(screen.getByRole("button", { name: /Cancel the sign-in/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The server could not sign out the pending account.");
    expect(screen.getByRole("button", { name: /Cancel the sign-in/ })).toBeEnabled();
  });
});
