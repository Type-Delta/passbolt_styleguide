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

import React, { Component } from "react";
import PropTypes from "prop-types";
import { Trans, withTranslation } from "react-i18next";
import { withAccounts } from "../../../../shared/context/Accounts/AccountsContext";
import IsEmailValidator from "../../../../shared/lib/Validator/IsEmailValidator";
import PendingAccountNotice from "../../../../shared/components/Accounts/PendingAccountNotice/PendingAccountNotice";
import ChooseServerStep, { UNREACHABLE_SERVER_ERRORS } from "../ChooseServerStep/ChooseServerStep";
import ImportGpgKey, { ImportGpgKeyVariations } from "../../Authentication/ImportGpgKey/ImportGpgKey";
import ChooseSecurityToken from "../../Authentication/ChooseSecurityToken/ChooseSecurityToken";
import Login, { LoginVariations } from "../../AuthenticationLogin/Login/Login";
import Fingerprint from "../../Common/Fingerprint/Fingerprint";

export const AddAccountWizardSteps = {
  SERVER: "server",
  ACCOUNT: "account",
  SECURITY_TOKEN: "security-token",
  PASSPHRASE: "passphrase",
  PENDING_MFA: "pending-mfa",
  ADDED: "added",
  SESSION_EXPIRED: "session-expired",
};

// The errors the reused Login shows next to the passphrase itself.
const LOGIN_ERRORS = ["InvalidMasterPasswordError", "GpgKeyError"];
// The extension can no longer serve this tab's flow: only a new tab opened from the extension can continue.
export const ONBOARDING_SESSION_EXPIRED_ERROR = "OnboardingSessionExpiredError";

/**
 * Add an account in three stages: verify the server, check the email and private key, then pick the security
 * token and unlock the key on the incumbent Login form. Secrets live only in this component's memory and in the
 * mounted Login; going back, changing the server or leaving drops them, and late replies are ignored.
 *
 * Each rendered step is an attempt numbered by `generation`: the importer and the Login are keyed by it and their
 * callbacks carry it, so a reply or a continuation from an abandoned attempt never acts on the current one.
 */
class AddAccountWizard extends Component {
  constructor(props) {
    super(props);
    this.state = this.defaultState;
    // Bumped on every step change, Login reset and unmount: a reply for an abandoned attempt is ignored.
    this.generation = 0;
    // The attempt whose passphrase the extension just checked; consumed by the sign in it allows.
    this.checkedPassphraseAttempt = null;
    this.stepRef = React.createRef();
    this.usernameInputRef = React.createRef();
    this.bindCallbacks();
  }

  get defaultState() {
    return {
      step: AddAccountWizardSteps.SERVER,
      server: null, // The verified server {domain, server_key_fingerprint, checked_at, is_known}
      username: "",
      usernameError: null,
      privateKey: "", // The encrypted private key, kept only while the flow stays on the verified server
      keyInfo: null, // {fingerprint, expires, matches_email}
      securityToken: null, // {code, color, textcolor}
      isAdding: false, // True while the extension adds the account
      error: null, // The last step error not shown by a reused component
      result: null, // The add result
    };
  }

  bindCallbacks() {
    this.handleServerVerified = this.handleServerVerified.bind(this);
    this.handleUsernameChange = this.handleUsernameChange.bind(this);
    this.validatePrivateKey = this.validatePrivateKey.bind(this);
    this.hasKeyExpirationDate = this.hasKeyExpirationDate.bind(this);
    this.handleSecurityTokenChosen = this.handleSecurityTokenChosen.bind(this);
    this.handleBackClick = this.handleBackClick.bind(this);
    this.verifyServer = this.verifyServer.bind(this);
  }

  componentDidUpdate(prevProps, prevState) {
    // The Login focuses its passphrase itself; other steps start from their heading.
    if (prevState.step !== this.state.step && this.state.step !== AddAccountWizardSteps.PASSPHRASE) {
      const heading = this.stepRef.current?.querySelector("h1");
      heading?.setAttribute("tabindex", "-1");
      heading?.focus();
    }
  }

  componentWillUnmount() {
    this.generation++;
  }

  /**
   * Move to a step, invalidating the replies still expected by the previous one.
   * @param {string} step
   * @param {object} [state] Other state to apply
   */
  goTo(step, state = {}) {
    this.generation++;
    this.setState({ step, error: null, ...state });
  }

  get translate() {
    return this.props.t;
  }

  /**
   * Call the accounts context, ending the flow when the extension reports this tab's session as expired.
   * @param {string} method An AccountsContext method
   * @param {...*} args Its arguments
   */
  async callAccounts(method, ...args) {
    const attempt = this.generation;
    try {
      return await this.props.accountsContext[method](...args);
    } catch (error) {
      if (attempt === this.generation && error?.name === ONBOARDING_SESSION_EXPIRED_ERROR) {
        this.expireSession();
      }
      throw error;
    }
  }

  /**
   * Nothing entered here can be used any more: forget it and offer to start again from the extension.
   */
  expireSession() {
    this.checkedPassphraseAttempt = null;
    this.goTo(AddAccountWizardSteps.SESSION_EXPIRED, {
      privateKey: "",
      keyInfo: null,
      securityToken: null,
      isAdding: false,
      result: null,
    });
  }

  get stage() {
    switch (this.state.step) {
      case AddAccountWizardSteps.SERVER:
        return 0;
      case AddAccountWizardSteps.ACCOUNT:
        return 1;
      case AddAccountWizardSteps.SECURITY_TOKEN:
      case AddAccountWizardSteps.PASSPHRASE:
        return 2;
      default:
        return 3;
    }
  }

  get isUsernameValid() {
    return IsEmailValidator.validate(this.state.username.trim());
  }

  /*
   * =============================================================
   *  Server
   * =============================================================
   */

  verifyServer(domain) {
    return this.callAccounts("verifyServer", domain);
  }

  handleServerVerified(server) {
    // A new server invalidates any key material collected for the previous one.
    this.goTo(AddAccountWizardSteps.ACCOUNT, { server, privateKey: "", keyInfo: null, securityToken: null });
  }

  /*
   * =============================================================
   *  Account
   * =============================================================
   */

  handleUsernameChange(event) {
    this.setState({ username: event.target.value }, () => {
      if (this.state.usernameError) {
        this.validateUsername();
      }
    });
  }

  /**
   * @returns {boolean} True when the email is valid; else shows why next to the field.
   */
  validateUsername() {
    const username = this.state.username.trim();
    let usernameError = null;
    if (!username) {
      usernameError = this.translate("An email is required.");
    } else if (!this.isUsernameValid) {
      usernameError = this.translate("This is not a valid email address.");
    }
    this.setState({ usernameError });
    return !usernameError;
  }

  /**
   * ImportGpgKey's validation: the key error shows under the key, an email error under the email.
   * @param {string} privateKey
   */
  async validatePrivateKey(privateKey, attempt) {
    if (attempt !== this.generation) {
      return;
    }
    if (!this.validateUsername()) {
      return;
    }
    await this.callAccounts("validatePrivateKey", {
      username: this.state.username.trim(),
      user_private_armored_key: privateKey,
    });
  }

  /**
   * ImportGpgKey's expiry warning, shown while the key is typed.
   * @param {string} privateKey
   * @returns {Promise<boolean>}
   */
  async hasKeyExpirationDate(privateKey, attempt) {
    if (attempt !== this.generation) {
      return false;
    }
    if (!this.isUsernameValid) {
      return false;
    }
    const keyInfo = await this.callAccounts("validatePrivateKey", {
      username: this.state.username.trim(),
      user_private_armored_key: privateKey,
    });
    return Boolean(keyInfo?.expires) && keyInfo.expires !== "Infinity";
  }

  /**
   * @param {string} privateKey The key ImportGpgKey validated
   * @param {number} attempt The attempt of the importer that validated it
   */
  async handlePrivateKeyImported(privateKey, attempt) {
    if (attempt !== this.generation) {
      return;
    }
    if (!this.validateUsername()) {
      this.usernameInputRef.current?.focus();
      return;
    }
    this.setState({ error: null });
    let keyInfo;
    try {
      keyInfo = await this.callAccounts("validatePrivateKey", {
        username: this.state.username.trim(),
        user_private_armored_key: privateKey,
      });
    } catch (error) {
      if (error?.name === "GpgKeyError") {
        throw error; // ImportGpgKey shows it under the key.
      }
      if (attempt === this.generation) {
        this.setState({ error });
      }
      return;
    }
    if (attempt === this.generation) {
      this.goTo(AddAccountWizardSteps.SECURITY_TOKEN, { privateKey, keyInfo });
    }
  }

  /*
   * =============================================================
   *  Unlock
   * =============================================================
   */

  handleSecurityTokenChosen(securityToken) {
    this.goTo(AddAccountWizardSteps.PASSPHRASE, { securityToken });
  }

  /**
   * Login's passphrase check, for the Login of one attempt. Login handles the passphrase and key errors itself;
   * anything else is shown above it and the Login is remounted, so its passphrase is dropped. Only a success for
   * the current attempt allows that attempt's sign in.
   * @param {string} passphrase
   * @param {number} attempt The attempt of the Login that asks
   */
  async checkPassphrase(passphrase, attempt) {
    this.checkedPassphraseAttempt = null;
    try {
      await this.callAccounts("checkPassphrase", {
        user_private_armored_key: this.state.privateKey,
        passphrase,
      });
    } catch (error) {
      if (attempt !== this.generation) {
        return; // Its Login is gone; the sign in it may still request is refused.
      }
      if (LOGIN_ERRORS.includes(error?.name)) {
        throw error;
      }
      this.resetLogin({ error });
      return;
    }
    if (attempt === this.generation) {
      this.checkedPassphraseAttempt = attempt;
    }
  }

  /**
   * Login's sign in: the extension verifies the identity against the server and saves the account.
   * Refused unless the passphrase was just checked for this very attempt.
   * @param {string} passphrase
   * @param {number} attempt The attempt of the Login that asks
   */
  async handleSignIn(passphrase, attempt) {
    if (attempt !== this.generation || this.checkedPassphraseAttempt !== attempt) {
      return;
    }
    this.checkedPassphraseAttempt = null;
    const generation = this.generation;
    this.setState({ isAdding: true, error: null });
    let result;
    try {
      result = await this.callAccounts("addAccount", {
        domain: this.state.server.domain,
        username: this.state.username.trim(),
        user_private_armored_key: this.state.privateKey,
        passphrase,
        security_token: this.state.securityToken,
        expected_server_key_fingerprint: this.state.server.server_key_fingerprint,
      });
    } catch (error) {
      if (generation === this.generation) {
        this.resetLogin({ error: error?.name === "UserAbortsOperationError" ? null : error });
      }
      return;
    }
    if (generation !== this.generation) {
      return;
    }
    // The extension holds the account now: drop the key with the Login and its passphrase.
    const step = result?.requires_unlock ? AddAccountWizardSteps.PENDING_MFA : AddAccountWizardSteps.ADDED;
    this.goTo(step, { result, isAdding: false, privateKey: "", keyInfo: null });
  }

  /**
   * Remount the Login so it forgets the passphrase, and keep the flow on the unlock step.
   */
  resetLogin(state) {
    this.generation++;
    this.checkedPassphraseAttempt = null;
    this.setState({ ...state, isAdding: false });
  }

  /*
   * =============================================================
   *  Navigation
   * =============================================================
   */

  handleBackClick() {
    switch (this.state.step) {
      case AddAccountWizardSteps.ACCOUNT:
        this.goTo(AddAccountWizardSteps.SERVER, { privateKey: "", keyInfo: null, securityToken: null });
        break;
      case AddAccountWizardSteps.SECURITY_TOKEN:
        // Same verified server: the key may be shown again, the token is picked again.
        this.goTo(AddAccountWizardSteps.ACCOUNT, { keyInfo: null, securityToken: null });
        break;
      case AddAccountWizardSteps.PASSPHRASE:
        this.goTo(AddAccountWizardSteps.SECURITY_TOKEN, { securityToken: null });
        break;
    }
  }

  get canGoBack() {
    return this.stage > 0 && this.stage < 3 && !this.state.isAdding;
  }

  /*
   * =============================================================
   *  Render
   * =============================================================
   */

  get errorMessage() {
    const error = this.state.error;
    if (UNREACHABLE_SERVER_ERRORS.includes(error?.name)) {
      return this.translate(
        "The server {{server}} could not be reached. Check the URL and your connection, then try again.",
        { server: this.state.server?.domain, interpolation: { escapeValue: false } },
      );
    }
    return error?.message || this.translate("The account could not be added.");
  }

  renderStages() {
    const stages = [this.translate("Server"), this.translate("Account"), this.translate("Unlock")];
    return (
      <ol className="add-account-stages" aria-label={this.translate("Add account progress")}>
        {stages.map((label, index) => {
          const status = index < this.stage ? "done" : index === this.stage ? "current" : "todo";
          return (
            <li key={label} className={status} aria-current={status === "current" ? "step" : undefined}>
              <span className="add-account-stage-number" aria-hidden="true">
                {index + 1}
              </span>
              <span className="add-account-stage-label">{label}</span>
              {status === "done" && (
                <span className="visually-hidden">
                  <Trans>completed</Trans>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    );
  }

  /**
   * What the earlier stages established, so the user can check it before unlocking.
   */
  renderSummary() {
    const { server, keyInfo, username } = this.state;
    if (!server || this.stage > 2) {
      return null;
    }
    return (
      <dl className="add-account-summary">
        <div className="add-account-summary-row">
          <dt>
            <Trans>Passbolt server verified</Trans>
          </dt>
          <dd>
            <span className="add-account-summary-url">{server.domain}</span>
            <span className="add-account-summary-label">
              <Trans>Server key fingerprint</Trans>
            </span>
            <Fingerprint fingerprint={server.server_key_fingerprint} />
          </dd>
        </div>
        {keyInfo && (
          <div className="add-account-summary-row">
            <dt>
              <Trans>Account</Trans>
            </dt>
            <dd>
              <span className="add-account-summary-url">{username.trim()}</span>
              <span className="add-account-summary-label">
                <Trans>Private key fingerprint</Trans>
              </span>
              <Fingerprint fingerprint={keyInfo.fingerprint} />
              {!keyInfo.matches_email && (
                <span className="warning-message">
                  {this.translate(
                    "This key does not mention {{username}}. The server confirms your identity before anything is saved.",
                    { username: username.trim(), interpolation: { escapeValue: false } },
                  )}
                </span>
              )}
            </dd>
          </div>
        )}
      </dl>
    );
  }

  renderUsernameField() {
    const hasError = Boolean(this.state.usernameError);
    return (
      <div className={`input text required ${hasError ? "error" : ""}`}>
        <label htmlFor="add-account-username">
          <Trans>Email</Trans>
        </label>
        <input
          id="add-account-username"
          name="username"
          type="email"
          autoComplete="username"
          spellCheck={false}
          maxLength={255}
          placeholder={this.translate("you@example.com")}
          value={this.state.username}
          onChange={this.handleUsernameChange}
          ref={this.usernameInputRef}
          aria-invalid={hasError}
          aria-describedby={hasError ? "add-account-username-error" : undefined}
        />
        {hasError && (
          <div id="add-account-username-error" className="error-message">
            {this.state.usernameError}
          </div>
        )}
      </div>
    );
  }

  renderStep() {
    const { accountsContext } = this.props;
    // Callbacks of this render's importer or Login belong to this attempt only.
    const attempt = this.generation;
    switch (this.state.step) {
      case AddAccountWizardSteps.SERVER:
        return (
          <ChooseServerStep
            servers={accountsContext.servers}
            defaultDomain={this.state.server?.domain || this.props.domainHint}
            onVerify={this.verifyServer}
            onComplete={this.handleServerVerified}
          />
        );
      case AddAccountWizardSteps.ACCOUNT:
        return (
          <ImportGpgKey
            key={attempt}
            displayAs={ImportGpgKeyVariations.ADD_ACCOUNT}
            defaultPrivateKey={this.state.privateKey}
            validatePrivateGpgKey={(privateKey) => this.validatePrivateKey(privateKey, attempt)}
            hasKeyExpirationDate={(privateKey) => this.hasKeyExpirationDate(privateKey, attempt)}
            onComplete={(privateKey) => this.handlePrivateKeyImported(privateKey, attempt)}
          >
            {this.renderUsernameField()}
          </ImportGpgKey>
        );
      case AddAccountWizardSteps.SECURITY_TOKEN:
        return <ChooseSecurityToken onComplete={this.handleSecurityTokenChosen} />;
      case AddAccountWizardSteps.PASSPHRASE:
        return (
          <>
            <h1>
              <Trans>Enter your passphrase to add this account.</Trans>
            </h1>
            {this.state.isAdding && (
              <p className="add-account-progress" role="status">
                {this.translate("Verifying your identity on {{server}}…", {
                  server: this.state.server.domain,
                  interpolation: { escapeValue: false },
                })}
              </p>
            )}
            <Login
              key={attempt}
              displayAs={LoginVariations.ADD_ACCOUNT}
              canRememberMe={false}
              account={{
                username: this.state.username.trim(),
                domain: this.state.server.domain,
                first_name: "",
                last_name: "",
                security_token: this.state.securityToken,
              }}
              onCheckPassphrase={(passphrase) => this.checkPassphrase(passphrase, attempt)}
              onSignIn={(passphrase) => this.handleSignIn(passphrase, attempt)}
            />
          </>
        );
      case AddAccountWizardSteps.PENDING_MFA:
        return (
          <div className="add-account-result" role="status">
            <h1>
              <Trans>Finish signing in with multi-factor authentication.</Trans>
            </h1>
            <p>
              {this.translate("Passbolt opened the verification page of {{server}} for {{username}}.", {
                server: this.state.server.domain,
                username: this.state.username.trim(),
                interpolation: { escapeValue: false },
              })}
            </p>
            <p>
              <Trans>
                The account is saved and selected once the verification succeeds. If you do not finish it, nothing is
                saved and the key is forgotten when the browser closes.
              </Trans>
            </p>
          </div>
        );
      case AddAccountWizardSteps.SESSION_EXPIRED:
        return (
          <div className="add-account-result" role="alert">
            <h1>
              <Trans>This add account page has expired.</Trans>
            </h1>
            <p>
              <Trans>
                The key and passphrase entered here were cleared. To try again, open Add account from the Passbolt
                extension.
              </Trans>
            </p>
          </div>
        );
      case AddAccountWizardSteps.ADDED:
        return (
          <div className="add-account-result" role="status">
            <h1>
              <Trans>Account added.</Trans>
            </h1>
            <p>
              {this.translate("{{username}} on {{server}} is saved in this browser.", {
                server: this.state.server.domain,
                username: this.state.username.trim(),
                interpolation: { escapeValue: false },
              })}
            </p>
          </div>
        );
    }
    return null;
  }

  render() {
    const { pending, cancelPending } = this.props.accountsContext;
    const isFinished = this.stage === 3;
    return (
      <div className="add-account-wizard">
        {this.state.step !== AddAccountWizardSteps.SESSION_EXPIRED && this.renderStages()}
        {pending && <PendingAccountNotice pending={pending} onCancel={cancelPending} />}
        {this.renderSummary()}
        {this.state.error && (
          <div className="add-account-error error-message" role="alert">
            {this.errorMessage}
          </div>
        )}
        <div className="add-account-step" ref={this.stepRef}>
          {this.renderStep()}
        </div>
        <div className="add-account-actions">
          {this.canGoBack && (
            <button type="button" className="link" onClick={this.handleBackClick}>
              <Trans>Back</Trans>
            </button>
          )}
          {this.props.onClose && (
            <button
              type="button"
              className={isFinished ? "button primary big full-width" : "link"}
              onClick={this.props.onClose}
              disabled={this.state.isAdding}
            >
              {isFinished ? <Trans>Close</Trans> : <Trans>Cancel</Trans>}
            </button>
          )}
        </div>
      </div>
    );
  }
}

AddAccountWizard.propTypes = {
  accountsContext: PropTypes.object, // The accounts context
  domainHint: PropTypes.string, // An untrusted server to preselect, verified like any other
  onClose: PropTypes.func, // Leave the wizard, e.g. close its tab
  t: PropTypes.func, // The translation function
};

export default withAccounts(withTranslation("common")(AddAccountWizard));
