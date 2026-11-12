/**
 * Passbolt ~ Open source password manager for teams
 * Copyright (c) 2022 Passbolt SA (https://www.passbolt.com)
 *
 * Licensed under GNU Affero General Public License version 3 of the or any later version.
 * For full copyright and license information, please see the LICENSE.txt
 * Redistributions of files must retain the above copyright notice.
 *
 * @copyright     Copyright (c) 2022 Passbolt SA (https://www.passbolt.com)
 * @license       https://opensource.org/licenses/AGPL-3.0 AGPL License
 * @link          https://www.passbolt.com Passbolt(tm)
 * @since         3.10.0
 */

import { enableFetchMocks } from "jest-fetch-mock";
import { defaultAppContext } from "../../../contexts/ExtAppContext.test.data";
import { defaultProps } from "./DisplayUserBadgeMenu.test.data";
import DisplayUserBadgeMenuPage from "./DisplayUserBadgeMenu.test.page";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import {
  ACCOUNT_WORK_ID,
  PENDING_SIGN_IN,
  accountSummaries,
  defaultAccountsContext,
} from "../../../../shared/context/Accounts/AccountsContext.test.data";
import ManageAccountsDialog from "../ManageAccountsDialog/ManageAccountsDialog";

describe("DisplayUserBadgeMenu", () => {
  let page; // The page to test against
  const props = defaultProps(); // The props to pass
  const context = defaultAppContext();

  beforeEach(() => {
    enableFetchMocks();
    jest.resetModules();
  });
  it("As a signed-in user I should see a badge on my avatar to display that I have a missing MFA settings", async () => {
    expect.assertions(1);

    jest.spyOn(props.mfaContext, "isMfaChoiceRequired").mockImplementation(() => true);
    jest.spyOn(props.accountRecoveryContext, "isAccountRecoveryChoiceRequired").mockImplementation(() => false);
    page = new DisplayUserBadgeMenuPage(context, props);
    await waitFor(() => {});
    expect(page.attentionRequired).toBeTruthy();
  });

  it("As a signed-in user I should see a badge on my avatar to display that I have a missing Account recovery settings", async () => {
    expect.assertions(1);

    jest.spyOn(props.mfaContext, "isMfaChoiceRequired").mockImplementation(() => false);
    jest.spyOn(props.accountRecoveryContext, "isAccountRecoveryChoiceRequired").mockImplementation(() => true);
    page = new DisplayUserBadgeMenuPage(context, props);
    await waitFor(() => {});
    expect(page.attentionRequired).toBeTruthy();
  });

  it("As a signed-in user I should see a badge on my avatar to display that I have a missing settings", async () => {
    expect.assertions(1);

    jest.spyOn(props.mfaContext, "isMfaChoiceRequired").mockImplementation(() => true);
    jest.spyOn(props.accountRecoveryContext, "isAccountRecoveryChoiceRequired").mockImplementation(() => true);
    page = new DisplayUserBadgeMenuPage(context, props);
    await waitFor(() => {});
    expect(page.attentionRequired).toBeTruthy();
  });

  it("As a signin user I should not have a 404 error with the flag mfa policy disable", async () => {
    expect.assertions(1);
    const propsWithoutPolicy = defaultProps({
      context: {
        siteSettings: {
          canIUse: () => false,
        },
      },
    });
    page = new DisplayUserBadgeMenuPage(defaultAppContext, propsWithoutPolicy);

    jest.spyOn(props.mfaContext, "isMfaChoiceRequired").mockImplementation(() => true);
    await waitFor(() => {});
    expect(page.attentionRequired).toBeFalsy();
  });

  describe("Account switcher", () => {
    const openMenu = () => fireEvent.click(screen.getByRole("button", { name: "Account menu" }));

    it("is not offered where the extension does not provide saved accounts", () => {
      page = new DisplayUserBadgeMenuPage(context, defaultProps());
      openMenu();
      expect(screen.queryByText("Add account")).toBeNull();
    });

    it("switches to another saved account in two clicks", async () => {
      const accountsContext = defaultAccountsContext();
      page = new DisplayUserBadgeMenuPage(context, defaultProps({ accountsContext }));
      openMenu();
      expect(screen.getByRole("button", { name: "Account menu" })).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByText("vault.home.example")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /alex.moreau@work.example/ }));
      await waitFor(() => expect(accountsContext.switchAccount).toHaveBeenCalledWith(ACCOUNT_WORK_ID));
      await waitFor(() => expect(page.userBadgeMenu).not.toHaveClass("open"));
    });

    it("opens the add account tab for the current server and the manage accounts dialog", async () => {
      const accountsContext = defaultAccountsContext();
      const props = defaultProps({ accountsContext });
      page = new DisplayUserBadgeMenuPage(context, props);
      openMenu();
      fireEvent.click(screen.getByRole("button", { name: "Add account" }));
      await waitFor(() => expect(page.userBadgeMenu).not.toHaveClass("open"));
      expect(accountsContext.openAddAccount).toHaveBeenCalledWith("https://vault.home.example");
      expect(props.dialogContext.open).not.toHaveBeenCalled();
      openMenu();
      fireEvent.click(screen.getByRole("button", { name: "Manage accounts" }));
      expect(props.dialogContext.open).toHaveBeenCalledWith(ManageAccountsDialog);
    });

    it("keeps the menu open with the reason when the add account tab cannot be opened", async () => {
      const accountsContext = defaultAccountsContext({
        openAddAccount: jest.fn(() => Promise.reject(new Error("Not allowed here."))),
      });
      page = new DisplayUserBadgeMenuPage(context, defaultProps({ accountsContext }));
      openMenu();
      fireEvent.click(screen.getByRole("button", { name: "Add account" }));
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "The add account page could not be opened. Not allowed here.",
      );
      expect(screen.getByRole("button", { name: "Account menu" })).toHaveAttribute("aria-expanded", "true");
    });

    it("offers to add an account when only the current one is saved", () => {
      const accountsContext = defaultAccountsContext({ accounts: accountSummaries().slice(0, 1) });
      page = new DisplayUserBadgeMenuPage(context, defaultProps({ accountsContext }));
      openMenu();
      expect(screen.queryByText("Switch to")).toBeNull();
      expect(screen.getByRole("button", { name: "Add account" })).toBeInTheDocument();
    });

    it("lets the user retry when the saved accounts cannot be loaded", () => {
      const accountsContext = defaultAccountsContext({ accounts: [], loadError: new Error("down") });
      page = new DisplayUserBadgeMenuPage(context, defaultProps({ accountsContext }));
      openMenu();
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
      expect(accountsContext.refresh).toHaveBeenCalled();
    });

    it("shows a pending sign-in without hiding the two-click switch", async () => {
      const accountsContext = defaultAccountsContext({ pending: PENDING_SIGN_IN });
      page = new DisplayUserBadgeMenuPage(context, defaultProps({ accountsContext }));
      openMenu();
      expect(screen.getByRole("status")).toHaveTextContent(
        "Waiting for multi-factor authentication for erin@home.example on vault.home.example.",
      );
      fireEvent.click(screen.getByRole("button", { name: "Cancel the sign-in of erin@home.example" }));
      await waitFor(() => expect(accountsContext.cancelPending).toHaveBeenCalled());
      fireEvent.click(screen.getByRole("button", { name: /alex.moreau@work.example/ }));
      await waitFor(() => expect(accountsContext.switchAccount).toHaveBeenCalledWith(ACCOUNT_WORK_ID));
    });

    it("closes with Escape", () => {
      page = new DisplayUserBadgeMenuPage(context, defaultProps({ accountsContext: defaultAccountsContext() }));
      openMenu();
      fireEvent.keyDown(screen.getByRole("button", { name: "Add account" }), { key: "Escape" });
      expect(screen.queryByRole("button", { name: "Add account" })).toBeNull();
      expect(screen.getByRole("button", { name: "Account menu" })).toHaveFocus();
    });
  });
});
