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
 * Unit tests on AddAccountForm in regard of specifications
 */

import "@testing-library/jest-dom";
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import MockTranslationProvider from "../../../../react-extension/test/mock/components/Internationalisation/MockTranslationProvider";
import AddAccountForm from "./AddAccountForm";
import { accountsListDto } from "../../../context/Accounts/AccountsContext.test.data";

const PRIVATE_KEY = "-----BEGIN PGP PRIVATE KEY BLOCK-----\n\nfictional\n-----END PGP PRIVATE KEY BLOCK-----";

function renderForm(props = {}) {
  const defaultProps = {
    servers: accountsListDto().servers,
    defaultDomain: "https://vault.home.example/",
    onSubmit: jest.fn(() =>
      Promise.resolve({ account_id: "id", url: "https://vault.home.example", requires_unlock: false }),
    ),
    onAdded: jest.fn(),
    onCancel: jest.fn(),
    ...props,
  };
  render(
    <MockTranslationProvider>
      <AddAccountForm {...defaultProps} />
    </MockTranslationProvider>,
  );
  return defaultProps;
}

function fill({ email = "alex@home.example", key = PRIVATE_KEY, passphrase = "a fictional passphrase" } = {}) {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Private key"), { target: { value: key } });
  fireEvent.change(document.querySelector("#add-account-passphrase"), { target: { value: passphrase } });
}

const submit = () => fireEvent.click(screen.getByRole("button", { name: "Add account" }));

describe("AddAccountForm", () => {
  it("preselects the server serving the page", () => {
    renderForm();
    expect(screen.getByLabelText("vault.home.example")).toBeChecked();
    expect(screen.queryByLabelText("Server URL")).toBeNull();
  });

  it("prefills a new server URL when the page server is not configured yet", () => {
    renderForm({ defaultDomain: "https://new.example/passbolt" });
    expect(screen.getByLabelText("Another server")).toBeChecked();
    expect(screen.getByLabelText("Server URL")).toHaveValue("https://new.example/passbolt");
  });

  it("asks for a server URL when no server is configured", () => {
    renderForm({ servers: [], defaultDomain: undefined });
    expect(screen.getByLabelText("Server")).toHaveValue("");
  });

  it("sends the contract payload for a configured server", async () => {
    const props = renderForm();
    fill();
    submit();
    await waitFor(() => expect(props.onAdded).toHaveBeenCalled());
    expect(props.onSubmit).toHaveBeenCalledWith({
      domain: "https://vault.home.example",
      username: "alex@home.example",
      user_private_armored_key: PRIVATE_KEY,
      passphrase: "a fictional passphrase",
    });
  });

  it("validates every field before calling the extension", async () => {
    const props = renderForm({ servers: [], defaultDomain: "http://insecure.example" });
    fill({ email: "not-an-email", key: "a public key", passphrase: "" });
    submit();
    expect(await screen.findByText("The server URL must start with https://.")).toBeTruthy();
    expect(screen.getByText("This is not a valid email address.")).toBeTruthy();
    expect(screen.getByText("This is not an OpenPGP private key block.")).toBeTruthy();
    expect(screen.getByText("The passphrase is required.")).toBeTruthy();
    expect(screen.getByLabelText("Server")).toHaveFocus();
    expect(screen.getByLabelText("Server")).toHaveAttribute("aria-invalid", "true");
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it("rejects a server URL carrying a query or credentials", async () => {
    renderForm({ servers: [], defaultDomain: "https://user:pass@vault.example/?next=1" });
    fill();
    submit();
    expect(await screen.findByText("Use the server base URL, without credentials, query or fragment.")).toBeTruthy();
  });

  it("explains an unreachable server and clears the passphrase", async () => {
    const error = Object.assign(new Error("fetch failed"), { name: "PassboltServiceUnavailableError" });
    renderForm({ onSubmit: jest.fn(() => Promise.reject(error)) });
    fill();
    submit();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("The server vault.home.example could not be reached.");
    expect(document.querySelector("#add-account-passphrase")).toHaveValue("");
    expect(screen.getByLabelText("Email")).toHaveValue("alex@home.example");
  });

  it("shows the extension error message for other failures", async () => {
    const error = new Error("The key does not match the user registered on this server.");
    renderForm({ onSubmit: jest.fn(() => Promise.reject(error)) });
    fill();
    submit();
    expect(await screen.findByRole("alert")).toHaveTextContent(error.message);
  });

  it("does not report a pending MFA enrollment as added until the user closes the notice", async () => {
    const pending = { account_id: "id", url: "https://vault.home.example/mfa/verify", requires_unlock: true };
    const props = renderForm({ onSubmit: jest.fn(() => Promise.resolve(pending)) });
    fill();
    submit();
    expect(await screen.findByText("Finish signing in with multi-factor authentication.")).toBeTruthy();
    expect(screen.getByRole("status")).toHaveTextContent("nothing is saved");
    expect(document.querySelector("#add-account-private-key")).toBeNull();
    expect(props.onAdded).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(props.onAdded).toHaveBeenCalledWith(pending);
  });

  it("reads the private key from a file", async () => {
    renderForm();
    const file = new File([PRIVATE_KEY], "alex.asc", { type: "text/plain" });
    fireEvent.change(document.querySelector('input[type="file"]'), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByLabelText("Private key")).toHaveValue(PRIVATE_KEY));
    expect(screen.getByLabelText("Selected key file")).toHaveValue("alex.asc");
  });

  describe("servers discovered after mount", () => {
    const discovered = [{ domain: "https://a.localhost:18443" }];

    function renderBeforeDiscovery() {
      const props = { servers: [], defaultDomain: undefined, onSubmit: jest.fn(), onAdded: jest.fn() };
      const ui = (extra) => (
        <MockTranslationProvider>
          <AddAccountForm {...props} {...extra} />
        </MockTranslationProvider>
      );
      const { rerender } = render(ui());
      return (extra) => rerender(ui(extra));
    }

    it("selects the discovered server while the user has not chosen one", () => {
      const discover = renderBeforeDiscovery();
      discover({ servers: discovered, defaultDomain: "https://a.localhost:18443/" });
      expect(screen.getByLabelText("a.localhost:18443")).toBeChecked();
      expect(screen.queryByLabelText("Server URL")).toBeNull();
    });

    it("prefills the page backend discovered later when it is not configured", () => {
      const discover = renderBeforeDiscovery();
      discover({ servers: [], defaultDomain: "https://b.localhost:18443" });
      expect(screen.getByLabelText("Server")).toHaveValue("https://b.localhost:18443");
    });

    it("never replaces a URL the user typed", () => {
      const discover = renderBeforeDiscovery();
      fireEvent.change(screen.getByLabelText("Server"), { target: { value: "https://typed.example" } });
      discover({ servers: discovered, defaultDomain: "https://a.localhost:18443" });
      expect(screen.getByLabelText("Another server")).toBeChecked();
      expect(screen.getByLabelText("Server URL")).toHaveValue("https://typed.example");
    });

    it("never replaces a server the user picked on a later refresh", () => {
      const discover = renderBeforeDiscovery();
      discover({ servers: discovered, defaultDomain: "https://a.localhost:18443" });
      fireEvent.click(screen.getByLabelText("Another server"));
      discover({
        servers: [...discovered, { domain: "https://c.localhost" }],
        defaultDomain: "https://a.localhost:18443",
      });
      expect(screen.getByLabelText("Another server")).toBeChecked();
    });
  });
});
