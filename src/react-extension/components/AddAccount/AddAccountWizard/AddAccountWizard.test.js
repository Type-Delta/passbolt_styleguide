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
 * Unit tests on AddAccountWizard in regard of specifications
 */

import "@testing-library/jest-dom";
import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import MockTranslationProvider from "../../../test/mock/components/Internationalisation/MockTranslationProvider";
import MockPort from "../../../test/mock/MockPort";
import AppContext from "../../../../shared/context/AppContext/AppContext";
import { AccountsContext } from "../../../../shared/context/Accounts/AccountsContext";
import { PENDING_SIGN_IN, defaultAccountsContext } from "../../../../shared/context/Accounts/AccountsContext.test.data";
import AddAccountWizard from "./AddAccountWizard";

const SERVER = "https://passbolt.new.example/vault";
const SERVER_FINGERPRINT = "0C1D1761110D1E33C9006D1A5B1B332ED06426D3";
const FICTIONAL_KEY =
  "-----BEGIN PGP PRIVATE KEY BLOCK-----\n\nfictional test key, encrypted\n-----END PGP PRIVATE KEY BLOCK-----";

const namedError = (name, message = name) => Object.assign(new Error(message), { name });

/**
 * Resolves only when the test says so, to deliver a reply after the user moved on.
 */
function deferred() {
  let resolvePromise;
  let rejectPromise;
  const promise = new Promise((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  return { promise, resolve: resolvePromise, reject: rejectPromise };
}

function renderWizard({ accountsContext = defaultAccountsContext({ servers: [] }), ...props } = {}) {
  const port = new MockPort();
  const rememberMe = jest.fn(async () => false);
  port.addRequestListener("passbolt.remember-me.get-user-latest-choice", rememberMe);
  const onClose = jest.fn();
  render(
    <MockTranslationProvider>
      <AppContext.Provider value={{ port }}>
        <AccountsContext.Provider value={accountsContext}>
          <AddAccountWizard onClose={onClose} {...props} />
        </AccountsContext.Provider>
      </AppContext.Provider>
    </MockTranslationProvider>,
  );
  return { accountsContext, onClose, rememberMe };
}

const stageStatuses = () => [...document.querySelectorAll(".add-account-stages li")].map((item) => item.className);

async function verifyServer(url = SERVER) {
  fireEvent.change(screen.getByLabelText("Server"), { target: { value: url } });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  await screen.findByRole("heading", { name: "Enter your email and the private key of your account." });
}

async function importKey(username = "ada@new.example", privateKey = FICTIONAL_KEY) {
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: username } });
  fireEvent.change(screen.getByLabelText("Private key"), { target: { value: privateKey } });
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
}

async function chooseToken(code = "ADA") {
  await screen.findByRole("heading", { name: "Pick a color and enter three characters." });
  fireEvent.change(screen.getByLabelText("Security token"), { target: { value: code } });
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  await screen.findByRole("heading", { name: "Enter your passphrase to add this account." });
}

async function unlock(passphrase = "fictional passphrase") {
  fireEvent.change(document.querySelector("#passphrase"), { target: { value: passphrase } });
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Add account" })));
}

describe("AddAccountWizard", () => {
  it("adds a first account: verified server, key, chosen token, then the real Login unlock", async () => {
    const accountsContext = defaultAccountsContext({
      servers: [],
      addAccount: jest.fn(() => Promise.resolve({ account_id: "new", url: SERVER, requires_unlock: false })),
    });
    const { rememberMe } = renderWizard({ accountsContext });
    expect(stageStatuses()).toEqual(["current", "todo", "todo"]);

    await verifyServer();
    expect(accountsContext.verifyServer).toHaveBeenCalledWith(SERVER);
    expect(stageStatuses()).toEqual(["done", "current", "todo"]);
    expect(screen.getByText("Passbolt server verified")).toBeInTheDocument();
    expect(screen.getByText(SERVER)).toBeInTheDocument();
    expect(screen.getByText("0C1D 1761 110D 1E33 C900")).toBeInTheDocument();
    expect(document.activeElement).toHaveTextContent("Enter your email and the private key of your account.");

    await importKey();
    await chooseToken("ADA");
    expect(accountsContext.validatePrivateKey).toHaveBeenCalledWith({
      username: "ada@new.example",
      user_private_armored_key: FICTIONAL_KEY,
    });
    expect(stageStatuses()).toEqual(["done", "done", "current"]);
    // The incumbent passphrase field shows the token just chosen, as every later sign-in will.
    expect(document.querySelector(".security-token")).toHaveTextContent("ADA");
    expect(screen.queryByLabelText("Remember until signed out.")).toBeNull();
    expect(rememberMe).not.toHaveBeenCalled();

    await unlock();
    expect(accountsContext.checkPassphrase).toHaveBeenCalledWith({
      user_private_armored_key: FICTIONAL_KEY,
      passphrase: "fictional passphrase",
    });
    const addAccountDto = accountsContext.addAccount.mock.calls[0][0];
    expect(addAccountDto).toEqual({
      domain: SERVER,
      username: "ada@new.example",
      user_private_armored_key: FICTIONAL_KEY,
      passphrase: "fictional passphrase",
      security_token: { code: "ADA", color: expect.any(String), textcolor: expect.any(String) },
      expected_server_key_fingerprint: SERVER_FINGERPRINT,
    });
    expect(await screen.findByRole("heading", { name: "Account added." })).toBeInTheDocument();
    expect(document.querySelector("#passphrase, textarea")).toBeNull();
    expect(screen.getByRole("button", { name: "Close" })).toBeEnabled();
  });

  it("explains that multi-factor authentication continues in the Passbolt tab", async () => {
    const accountsContext = defaultAccountsContext({ servers: [] });
    renderWizard({ accountsContext });
    await verifyServer();
    await importKey();
    await chooseToken();
    await unlock();
    expect(
      await screen.findByRole("heading", { name: "Finish signing in with multi-factor authentication." }),
    ).toBeInTheDocument();
    expect(screen.getByText(`Passbolt opened the verification page of ${SERVER} for ada@new.example.`)).toBeVisible();
    expect(document.querySelector("#passphrase, textarea")).toBeNull();
  });

  it("re-verifies a hinted saved server and shows its whole URL", async () => {
    const accountsContext = defaultAccountsContext();
    renderWizard({ accountsContext, domainHint: "https://passbolt.work.example/vault/" });
    expect(screen.getByLabelText("https://passbolt.work.example/vault")).toBeChecked();
    expect(screen.getByLabelText("https://vault.home.example")).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByText("Passbolt server verified");
    expect(accountsContext.verifyServer).toHaveBeenCalledWith("https://passbolt.work.example/vault");
  });

  it("starts on another server when no server is hinted", () => {
    renderWizard({ accountsContext: defaultAccountsContext() });
    expect(screen.getByLabelText("Another server")).toBeChecked();
    expect(screen.getByLabelText("Server URL")).toHaveValue("");
  });

  it("keeps the user on the server step when it is not https or cannot be reached", async () => {
    const accountsContext = defaultAccountsContext({
      servers: [],
      verifyServer: jest.fn(() => Promise.reject(namedError("PassboltApiFetchError"))),
    });
    renderWizard({ accountsContext });
    fireEvent.change(screen.getByLabelText("Server"), { target: { value: "http://passbolt.new.example" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("The server URL must start with https://.")).toBeInTheDocument();
    expect(accountsContext.verifyServer).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Server"), { target: { value: SERVER } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      `The server ${SERVER} could not be reached. Check the URL and your connection, then try again.`,
    );
    expect(screen.getByLabelText("Server")).toHaveAttribute("aria-invalid", "true");
    expect(document.activeElement).toBe(screen.getByLabelText("Server"));
    expect(stageStatuses()).toEqual(["current", "todo", "todo"]);
  });

  it("shows a changed server key as reported by the extension", async () => {
    const accountsContext = defaultAccountsContext({
      servers: [],
      verifyServer: jest.fn(() =>
        Promise.reject(
          namedError("Error", "The saved server key changed. Verify the server before adding another account."),
        ),
      ),
    });
    renderWizard({ accountsContext });
    fireEvent.change(screen.getByLabelText("Server"), { target: { value: SERVER } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The saved server key changed.");
  });

  it("ignores a verification that answers after the server was edited", async () => {
    const late = deferred();
    const accountsContext = defaultAccountsContext({ servers: [], verifyServer: jest.fn(() => late.promise) });
    renderWizard({ accountsContext });
    fireEvent.change(screen.getByLabelText("Server"), { target: { value: SERVER } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("status")).toHaveTextContent(`Checking ${SERVER}…`);
    fireEvent.change(screen.getByLabelText("Server"), { target: { value: "https://other.example" } });
    await act(async () =>
      late.resolve({ domain: SERVER, server_key_fingerprint: SERVER_FINGERPRINT, checked_at: "t", is_known: false }),
    );
    expect(screen.queryByText("Passbolt server verified")).toBeNull();
    expect(screen.getByLabelText("Server")).toHaveValue("https://other.example");
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  });

  it("asks for a valid email next to the email field before checking the key", async () => {
    const accountsContext = defaultAccountsContext({ servers: [] });
    renderWizard({ accountsContext });
    await verifyServer();
    await importKey("not an email");
    expect(await screen.findByText("This is not a valid email address.")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(accountsContext.validatePrivateKey).not.toHaveBeenCalled();
    // Let the submit settle: the key form must be usable again, not stuck processing.
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
    expect(screen.getByLabelText("Private key")).toBeEnabled();
  });

  it("shows the key error under the key and warns when the key does not mention the email", async () => {
    const accountsContext = defaultAccountsContext({
      servers: [],
      validatePrivateKey: jest.fn(() =>
        Promise.reject(namedError("GpgKeyError", "The private key should be encrypted.")),
      ),
    });
    renderWizard({ accountsContext });
    await verifyServer();
    await importKey();
    expect(await screen.findByText("The private key should be encrypted.")).toHaveClass("invalid-private-key");

    accountsContext.validatePrivateKey.mockImplementation(() =>
      Promise.resolve({
        fingerprint: "03F60E958F4CB29723ACDF761353B5B15D9B054F",
        expires: "Infinity",
        matches_email: false,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByRole("heading", { name: "Pick a color and enter three characters." });
    expect(
      screen.getByText(
        "This key does not mention ada@new.example. The server confirms your identity before anything is saved.",
      ),
    ).toBeInTheDocument();
  });

  it("lets the reused Login report a wrong passphrase without adding anything", async () => {
    const accountsContext = defaultAccountsContext({
      servers: [],
      checkPassphrase: jest.fn(() => Promise.reject(namedError("InvalidMasterPasswordError"))),
    });
    renderWizard({ accountsContext });
    await verifyServer();
    await importKey();
    await chooseToken();
    await unlock("wrong");
    expect(await screen.findByText("The passphrase is invalid.")).toBeInTheDocument();
    expect(accountsContext.addAccount).not.toHaveBeenCalled();
  });

  it("shows a failed add above a fresh Login that forgot the passphrase", async () => {
    const accountsContext = defaultAccountsContext({
      servers: [],
      addAccount: jest.fn(() =>
        Promise.reject(namedError("Error", "The authenticated account does not match the email and imported key.")),
      ),
    });
    renderWizard({ accountsContext });
    await verifyServer();
    await importKey();
    await chooseToken();
    await unlock();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The authenticated account does not match the email and imported key.",
    );
    expect(document.querySelector("#passphrase")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Add account" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
  });

  it("disables leaving while the extension adds the account", async () => {
    const adding = deferred();
    const accountsContext = defaultAccountsContext({ servers: [], addAccount: jest.fn(() => adding.promise) });
    const { onClose } = renderWizard({ accountsContext });
    await verifyServer();
    await importKey();
    await chooseToken();
    await unlock();
    expect(screen.getByRole("status")).toHaveTextContent(`Verifying your identity on ${SERVER}…`);
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    await act(async () => adding.resolve({ account_id: "new", url: SERVER, requires_unlock: false }));
    expect(await screen.findByRole("heading", { name: "Account added." })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("keeps the key going back on the same server, and drops it when going back to the server", async () => {
    const accountsContext = defaultAccountsContext({ servers: [] });
    renderWizard({ accountsContext });
    await verifyServer();
    await importKey();
    await chooseToken();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(document.querySelector("#passphrase")).toBeNull();
    await screen.findByRole("heading", { name: "Pick a color and enter three characters." });
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    await screen.findByRole("heading", { name: "Enter your email and the private key of your account." });
    expect(screen.getByLabelText("Private key")).toHaveValue(FICTIONAL_KEY);

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    await screen.findByRole("heading", { name: "Which Passbolt server is your account on?" });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByRole("heading", { name: "Enter your email and the private key of your account." });
    expect(accountsContext.verifyServer).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText("Private key")).toHaveValue("");
    expect(screen.getByLabelText("Email")).toHaveValue("ada@new.example");
  });

  it("shows an unrelated pending sign-in with its cancel action, and cancels the wizard", async () => {
    const accountsContext = defaultAccountsContext({ servers: [], pending: PENDING_SIGN_IN });
    const { onClose } = renderWizard({ accountsContext });
    expect(screen.getByText(/Waiting for multi-factor authentication for erin@home.example/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel the sign-in of erin@home.example" }));
    await waitFor(() => expect(accountsContext.cancelPending).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
  });

  describe("late replies of an abandoned attempt", () => {
    const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 20)));
    const KEY_INFO = {
      fingerprint: "03F60E958F4CB29723ACDF761353B5B15D9B054F",
      expires: "Infinity",
      matches_email: true,
    };

    it("does not start validation from an abandoned file read in a newer attempt", async () => {
      let reader;
      const reading = jest.spyOn(FileReader.prototype, "readAsText").mockImplementation(function () {
        reader = this;
      });
      const accountsContext = defaultAccountsContext({
        servers: [],
        validatePrivateKey: jest.fn(() => Promise.reject(namedError("OnboardingSessionExpiredError"))),
      });
      try {
        renderWizard({ accountsContext });
        await verifyServer();
        fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ada@new.example" } });
        fireEvent.change(document.querySelector('input[type="file"]'), {
          target: { files: [new File([FICTIONAL_KEY], "recovery.asc")] },
        });
        expect(reader).toBeDefined();
        fireEvent.click(screen.getByRole("button", { name: "Back" }));
        await verifyServer("https://second.example");

        await act(async () => {
          Object.defineProperty(reader, "result", { value: FICTIONAL_KEY });
          reader.onloadend();
        });

        expect(accountsContext.validatePrivateKey).not.toHaveBeenCalled();
        expect(
          screen.getByRole("heading", { name: "Enter your email and the private key of your account." }),
        ).toBeInTheDocument();
        expect(screen.getByLabelText("Private key")).toHaveValue("");
      } finally {
        reading.mockRestore();
      }
    });

    it("keeps the current add retryable when an abandoned check expires during it", async () => {
      const check = deferred();
      const adding = deferred();
      const accountsContext = defaultAccountsContext({
        servers: [],
        checkPassphrase: jest
          .fn()
          .mockImplementationOnce(() => check.promise)
          .mockResolvedValue(),
        addAccount: jest
          .fn()
          .mockImplementationOnce(() => adding.promise)
          .mockResolvedValue({
            account_id: "new",
            url: SERVER,
            requires_unlock: false,
          }),
      });
      renderWizard({ accountsContext });
      await verifyServer();
      await importKey();
      await chooseToken("OLD");
      await unlock("abandoned passphrase");
      fireEvent.click(screen.getByRole("button", { name: "Back" }));
      await chooseToken("NEW");
      await unlock("current passphrase");
      await waitFor(() => expect(accountsContext.addAccount).toHaveBeenCalledTimes(1));

      await act(async () => check.reject(namedError("OnboardingSessionExpiredError")));
      await act(async () => adding.reject(namedError("PassboltApiFetchError")));

      await screen.findByRole("heading", { name: "Enter your passphrase to add this account." });
      expect(screen.queryByRole("heading", { name: "This add account page has expired." })).toBeNull();
      expect(screen.getByRole("alert")).toHaveTextContent(`The server ${SERVER} could not be reached.`);
      expect(document.querySelector("#passphrase")).toHaveValue("");
      await unlock("explicit retry");
      await screen.findByRole("heading", { name: "Account added." });
      expect(accountsContext.addAccount).toHaveBeenCalledTimes(2);
      expect(accountsContext.addAccount.mock.calls[1][0]).toMatchObject({
        passphrase: "explicit retry",
        user_private_armored_key: FICTIONAL_KEY,
        security_token: { code: "NEW" },
      });
    });

    it("never signs in with a passphrase checked for a Login left with Back and a new token", async () => {
      const check = deferred();
      const accountsContext = defaultAccountsContext({
        servers: [],
        checkPassphrase: jest.fn().mockImplementationOnce(() => check.promise),
        addAccount: jest.fn(() => Promise.resolve({ account_id: "new", url: SERVER, requires_unlock: false })),
      });
      renderWizard({ accountsContext });
      await verifyServer();
      await importKey();
      await chooseToken("OLD");
      await unlock("passphrase typed under OLD");
      expect(accountsContext.checkPassphrase).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole("button", { name: "Back" }));
      await chooseToken("NEW");
      await act(async () => check.resolve());
      await flush();

      expect(accountsContext.addAccount).not.toHaveBeenCalled();
      expect(document.querySelector("#passphrase")).toHaveValue("");
      expect(document.querySelector(".security-token")).toHaveTextContent("NEW");
      expect(screen.getByRole("button", { name: "Add account" })).toBeEnabled();

      // The new Login still works on its own submission, with its own passphrase and token.
      await unlock("passphrase typed under NEW");
      await screen.findByRole("heading", { name: "Account added." });
      expect(accountsContext.addAccount).toHaveBeenCalledTimes(1);
      expect(accountsContext.addAccount.mock.calls[0][0]).toMatchObject({
        passphrase: "passphrase typed under NEW",
        security_token: { code: "NEW" },
      });
    });

    it("does not let a key validated by an importer left with Back come back on another server", async () => {
      const validation = deferred();
      const accountsContext = defaultAccountsContext({
        servers: [],
        validatePrivateKey: jest.fn(() => Promise.resolve(KEY_INFO)),
      });
      renderWizard({ accountsContext });
      await verifyServer();
      fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ada@new.example" } });
      fireEvent.change(screen.getByLabelText("Private key"), { target: { value: FICTIONAL_KEY } });
      await flush();
      // Hold the importer's own validation of the submitted key.
      accountsContext.validatePrivateKey.mockImplementationOnce(() => validation.promise);
      fireEvent.click(screen.getByRole("button", { name: "Next" }));

      fireEvent.click(screen.getByRole("button", { name: "Back" }));
      await screen.findByRole("heading", { name: "Which Passbolt server is your account on?" });
      await verifyServer("https://other.example");
      await act(async () => validation.resolve(KEY_INFO));
      await flush();

      expect(screen.queryByRole("heading", { name: "Pick a color and enter three characters." })).toBeNull();
      expect(
        screen.getByRole("heading", { name: "Enter your email and the private key of your account." }),
      ).toBeVisible();
      expect(screen.getByLabelText("Private key")).toHaveValue("");
      expect(screen.getByText("https://other.example")).toBeInTheDocument();
      expect(accountsContext.addAccount).not.toHaveBeenCalled();
    });

    it("does not advance with the key checked for the wizard's previous attempt", async () => {
      const validation = deferred();
      const accountsContext = defaultAccountsContext({
        servers: [],
        validatePrivateKey: jest.fn(() => Promise.resolve(KEY_INFO)),
      });
      renderWizard({ accountsContext });
      await verifyServer();
      fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ada@new.example" } });
      fireEvent.change(screen.getByLabelText("Private key"), { target: { value: FICTIONAL_KEY } });
      await flush();
      // The importer's validation answers; the wizard's own check of the same key is held.
      accountsContext.validatePrivateKey
        .mockImplementationOnce(() => Promise.resolve(KEY_INFO))
        .mockImplementationOnce(() => validation.promise);
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      await flush();
      expect(accountsContext.validatePrivateKey).toHaveBeenCalledTimes(3);

      fireEvent.click(screen.getByRole("button", { name: "Back" }));
      await verifyServer("https://other.example");
      await act(async () => validation.resolve(KEY_INFO));
      await flush();

      expect(screen.queryByRole("heading", { name: "Pick a color and enter three characters." })).toBeNull();
      expect(screen.getByLabelText("Private key")).toHaveValue("");
    });
  });

  it("retries the unlock after a failed add with a newly typed passphrase", async () => {
    const accountsContext = defaultAccountsContext({
      servers: [],
      addAccount: jest
        .fn()
        .mockImplementationOnce(() => Promise.reject(namedError("PassboltApiFetchError")))
        .mockImplementationOnce(() => Promise.resolve({ account_id: "new", url: SERVER, requires_unlock: false })),
    });
    renderWizard({ accountsContext });
    await verifyServer();
    await importKey();
    await chooseToken();
    await unlock("first");
    expect(await screen.findByRole("alert")).toHaveTextContent(`The server ${SERVER} could not be reached.`);
    expect(document.querySelector("#passphrase")).toHaveValue("");
    await unlock("second");
    await screen.findByRole("heading", { name: "Account added." });
    expect(accountsContext.addAccount.mock.calls.map(([dto]) => dto.passphrase)).toEqual(["first", "second"]);
  });

  describe("when the extension reports the onboarding session expired", () => {
    const expired = () => Promise.reject(namedError("OnboardingSessionExpiredError", "This page expired."));

    const expectTerminal = (onClose) => {
      expect(screen.getByRole("heading", { name: "This add account page has expired." })).toBeInTheDocument();
      expect(
        screen.getByText(
          "The key and passphrase entered here were cleared. To try again, open Add account from the Passbolt extension.",
        ),
      ).toBeInTheDocument();
      expect(document.querySelector("#passphrase, textarea, input")).toBeNull();
      expect(document.querySelector(".add-account-stages, .add-account-summary")).toBeNull();
      expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Add account" })).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
      expect(onClose).toHaveBeenCalled();
    };

    it("ends the flow from a failed final add, without any Login left to retry", async () => {
      const accountsContext = defaultAccountsContext({ servers: [], addAccount: jest.fn(expired) });
      const { onClose } = renderWizard({ accountsContext });
      await verifyServer();
      await importKey();
      await chooseToken();
      await unlock();
      await screen.findByRole("heading", { name: "This add account page has expired." });
      expectTerminal(onClose);
      expect(accountsContext.addAccount).toHaveBeenCalledTimes(1);
    });

    it("ends the flow from the passphrase check without signing in", async () => {
      const accountsContext = defaultAccountsContext({ servers: [], checkPassphrase: jest.fn(expired) });
      const { onClose } = renderWizard({ accountsContext });
      await verifyServer();
      await importKey();
      await chooseToken();
      await unlock();
      await screen.findByRole("heading", { name: "This add account page has expired." });
      await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
      expectTerminal(onClose);
      expect(accountsContext.addAccount).not.toHaveBeenCalled();
    });

    it("ends the flow from the server check", async () => {
      const accountsContext = defaultAccountsContext({ servers: [], verifyServer: jest.fn(expired) });
      const { onClose } = renderWizard({ accountsContext });
      fireEvent.change(screen.getByLabelText("Server"), { target: { value: SERVER } });
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));
      await screen.findByRole("heading", { name: "This add account page has expired." });
      expectTerminal(onClose);
    });
  });
});
