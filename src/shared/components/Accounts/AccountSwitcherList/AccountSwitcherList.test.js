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
 * Unit tests on AccountSwitcherList in regard of specifications
 */

import "@testing-library/jest-dom";
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import MockTranslationProvider from "../../../../react-extension/test/mock/components/Internationalisation/MockTranslationProvider";
import AccountSwitcherList from "./AccountSwitcherList";
import {
  ACCOUNT_HOME_ID,
  ACCOUNT_WORK_ADMIN_ID,
  ACCOUNT_WORK_ID,
  accountSummaries,
} from "../../../context/Accounts/AccountsContext.test.data";

function renderList(props = {}) {
  const defaultProps = {
    accounts: accountSummaries(),
    activeAccountId: ACCOUNT_HOME_ID,
    onSwitch: jest.fn(() => Promise.resolve({ account_id: ACCOUNT_WORK_ID, url: "https://w", requires_unlock: false })),
    onSwitched: jest.fn(),
    ...props,
  };
  render(
    <MockTranslationProvider>
      <AccountSwitcherList {...defaultProps} />
    </MockTranslationProvider>,
  );
  return defaultProps;
}

describe("AccountSwitcherList", () => {
  it("shows the email and the server of every other account, without the current one", () => {
    renderList();
    const rows = screen.getAllByRole("button");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("alex.moreau@work.example");
    expect(rows[0]).toHaveTextContent("passbolt.work.example/vault");
    expect(screen.queryByText("alex@home.example")).toBeNull();
  });

  it("marks locked accounts", () => {
    renderList();
    const lockedRow = screen.getByRole("button", { name: /it-admin@work.example/ });
    expect(lockedRow).toHaveTextContent("Locked");
  });

  it("shows the current account as a non-interactive row when asked", () => {
    renderList({ showActive: true });
    const current = screen.getByText("alex@home.example").closest(".account-row");
    expect(current.tagName).toEqual("DIV");
    expect(current).toHaveAttribute("aria-current", "true");
    expect(current).toHaveTextContent("Current");
  });

  it("switches with a single click and reports the extension result", async () => {
    const props = renderList();
    fireEvent.click(screen.getByRole("button", { name: /alex.moreau@work.example/ }));
    expect(screen.getAllByRole("button").every((button) => button.disabled)).toBe(true);
    await waitFor(() =>
      expect(props.onSwitched).toHaveBeenCalledWith(expect.objectContaining({ requires_unlock: false })),
    );
    expect(props.onSwitch).toHaveBeenCalledWith(ACCOUNT_WORK_ID);
  });

  it("explains a failed switch and lets the user retry", async () => {
    const props = renderList({ onSwitch: jest.fn(() => Promise.reject(new Error("The server is unreachable."))) });
    fireEvent.click(screen.getByRole("button", { name: /it-admin@work.example/ }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Could not switch to it-admin@work.example. The server is unreachable.");
    expect(props.onSwitched).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /it-admin@work.example/ })).not.toBeDisabled();
    expect(props.onSwitch).toHaveBeenCalledWith(ACCOUNT_WORK_ADMIN_ID);
  });

  it("renders nothing when the current account is the only one", () => {
    renderList({ accounts: accountSummaries().slice(0, 1) });
    expect(screen.queryByRole("list")).toBeNull();
  });
});
