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
 * Unit tests on ExtQuickAccess in regard of specifications
 */

import "@testing-library/jest-dom";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import MockPort from "../react-extension/test/mock/MockPort";
import MockTranslationProvider from "../react-extension/test/mock/components/Internationalisation/MockTranslationProvider";
import ExtQuickAccess from "./ExtQuickAccess";
import { LIST_ACCOUNTS } from "../shared/services/api/accounts/AccountsServiceWorkerService";
import { accountsListDto } from "../shared/context/Accounts/AccountsContext.test.data";
import { defaultAccountDto } from "../shared/models/entity/account/accountEntity.test.data";
import MockStorage from "../react-extension/test/mock/MockStorage";

const PENDING_GATE_ERROR = "Complete or cancel the pending account sign-in first.";

function renderQuickAccess({ getAccount, list }) {
  const port = new MockPort();
  port.addRequestListener("passbolt.account.get", getAccount);
  port.addRequestListener(LIST_ACCOUNTS, list);
  render(
    <MockTranslationProvider>
      <ExtQuickAccess port={port} storage={{}} />
    </MockTranslationProvider>,
  );
  return port;
}

// The real provider loads the locales over HTTP.
jest.mock(
  "../shared/components/Internationalisation/TranslationProvider",
  () =>
    ({ children }) =>
      children,
);

describe("ExtQuickAccess", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  it("opens on adding an account when no account is configured yet", async () => {
    const port = new MockPort();
    port.addRequestListener("passbolt.account.get", () => Promise.reject(new Error("No account configured.")));
    port.addRequestListener(LIST_ACCOUNTS, () => ({ active_account_id: null, accounts: [], servers: [] }));
    jest.spyOn(console, "error").mockImplementation(() => {});

    render(
      <MockTranslationProvider>
        <ExtQuickAccess port={port} storage={{}} />
      </MockTranslationProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Add your Passbolt account" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText("Server")).toHaveValue(""));
    expect(screen.getByRole("button", { name: "Add account" })).toBeEnabled();
  });

  it("keeps the saved accounts reachable when the account cannot be read during a pending sign-in", async () => {
    renderQuickAccess({
      getAccount: () => Promise.reject(new Error(PENDING_GATE_ERROR)),
      list: () =>
        accountsListDto({ pending: { domain: "https://b.example", username: "erin@b.example", expires_at: 1 } }),
    });
    expect(await screen.findByRole("list", { name: "Saved accounts" })).toBeInTheDocument();
    expect(screen.getByText("alex.moreau@work.example")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Waiting for multi-factor authentication for erin@b.example");
    expect(screen.getByRole("button", { name: "Cancel the sign-in of erin@b.example" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Add your Passbolt account" })).toBeNull();
  });

  it("does not pretend first use when the first new account is still pending MFA", async () => {
    renderQuickAccess({
      getAccount: () => Promise.reject(new Error(PENDING_GATE_ERROR)),
      list: () => ({
        active_account_id: null,
        accounts: [],
        servers: [],
        pending: { domain: "https://b.example", username: "erin@b.example", expires_at: 1 },
      }),
    });
    expect(await screen.findByRole("heading", { name: "Accounts" })).toBeInTheDocument();
    expect(await screen.findByText(/erin@b.example on b.example/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add account" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Add your Passbolt account" })).toBeNull();
  });

  it("does not pretend first use when the saved accounts cannot be listed", async () => {
    renderQuickAccess({
      getAccount: () => Promise.reject(new Error("Disconnected port.")),
      list: () => Promise.reject(new Error("Disconnected port.")),
    });
    expect(await screen.findByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.getByText("Saved accounts could not be loaded.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Add your Passbolt account" })).toBeNull();
  });

  describe("with a readable account", () => {
    // defaultAccountDto() is on https://passbolt.local.
    const pendingOn = (domain) => ({ domain, username: "erin@passbolt.local", expires_at: 1 });

    function renderWithAccount(list) {
      const port = new MockPort();
      const storage = new MockStorage();
      jest.spyOn(storage.local, "get");
      port.addRequestListener("passbolt.account.get", () => defaultAccountDto());
      port.addRequestListener(LIST_ACCOUNTS, list);
      render(
        <MockTranslationProvider>
          <ExtQuickAccess port={port} storage={storage} />
        </MockTranslationProvider>,
      );
      return storage;
    }

    it("shows the pending sign-in instead of the foreground when it shares the account backend", async () => {
      const storage = renderWithAccount(() => accountsListDto({ pending: pendingOn("https://passbolt.local/") }));
      expect(await screen.findByText(/erin@passbolt.local on passbolt.local/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Cancel the sign-in of erin@passbolt.local" })).toBeInTheDocument();
      expect(storage.local.get).not.toHaveBeenCalled();
    });

    it("keeps the foreground usable when the pending sign-in is on another backend", async () => {
      const storage = renderWithAccount(() => accountsListDto({ pending: pendingOn("https://other.example") }));
      await waitFor(() => expect(storage.local.get).toHaveBeenCalled());
      expect(screen.queryByText(/Waiting for multi-factor authentication/)).toBeNull();
    });

    it("starts the foreground when nothing is pending", async () => {
      const storage = renderWithAccount(() => accountsListDto());
      await waitFor(() => expect(storage.local.get).toHaveBeenCalled());
      expect(screen.queryByRole("heading", { name: "Accounts" })).toBeNull();
    });

    it("keeps the known account when the saved accounts cannot be listed", async () => {
      const storage = renderWithAccount(() => Promise.reject(new Error("Disconnected port.")));
      await waitFor(() => expect(storage.local.get).toHaveBeenCalled());
      expect(screen.queryByRole("heading", { name: "Add your Passbolt account" })).toBeNull();
    });
  });
});
