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
 * Unit tests on ManageAccountsList in regard of specifications
 */

import "@testing-library/jest-dom";
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import MockTranslationProvider from "../../../../react-extension/test/mock/components/Internationalisation/MockTranslationProvider";
import ManageAccountsList from "./ManageAccountsList";
import {
  ACCOUNT_HOME_ID,
  ACCOUNT_WORK_ID,
  accountSummaries,
} from "../../../context/Accounts/AccountsContext.test.data";

function renderList(props = {}) {
  const defaultProps = {
    accounts: accountSummaries(),
    activeAccountId: ACCOUNT_HOME_ID,
    onLock: jest.fn(() => Promise.resolve()),
    onRemove: jest.fn(() => Promise.resolve()),
    ...props,
  };
  render(
    <MockTranslationProvider>
      <ManageAccountsList {...defaultProps} />
    </MockTranslationProvider>,
  );
  return defaultProps;
}

describe("ManageAccountsList", () => {
  it("locks an unlocked account without confirmation", async () => {
    const props = renderList();
    fireEvent.click(screen.getByRole("button", { name: "Lock alex.moreau@work.example" }));
    await waitFor(() => expect(props.onLock).toHaveBeenCalledWith(ACCOUNT_WORK_ID));
  });

  it("does not offer to lock a locked account", () => {
    renderList();
    expect(screen.queryByRole("button", { name: "Lock it-admin@work.example" })).toBeNull();
  });

  it("asks for an inline confirmation before removing an account", async () => {
    const props = renderList();
    fireEvent.click(screen.getByRole("button", { name: "Remove alex.moreau@work.example" }));
    const confirmation = screen.getByRole("group");
    expect(confirmation).toHaveTextContent(
      "Remove alex.moreau@work.example on passbolt.work.example/vault from this browser?",
    );
    expect(props.onRemove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    await waitFor(() => expect(props.onRemove).toHaveBeenCalledWith(ACCOUNT_WORK_ID));
  });

  it("warns that removing the current account signs out", () => {
    renderList();
    fireEvent.click(screen.getByRole("button", { name: "Remove alex@home.example" }));
    expect(screen.getByRole("group")).toHaveTextContent("You will be signed out.");
  });

  it("cancels a removal", () => {
    const props = renderList();
    fireEvent.click(screen.getByRole("button", { name: "Remove alex.moreau@work.example" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("group")).toBeNull();
    expect(props.onRemove).not.toHaveBeenCalled();
  });

  it("reports a failed action", async () => {
    renderList({ onLock: jest.fn(() => Promise.reject(new Error("Could not lock."))) });
    fireEvent.click(screen.getByRole("button", { name: "Lock alex.moreau@work.example" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not lock.");
  });

  it("says when no account is saved", () => {
    renderList({ accounts: [] });
    expect(screen.getByText("No account is saved in this browser yet.")).toBeTruthy();
  });
});
