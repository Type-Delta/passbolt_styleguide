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
import Password from "../../Password/Password";
import IsEmailValidator from "../../../lib/Validator/IsEmailValidator";
import { getServerLabel, normalizeDomain } from "../../../context/Accounts/AccountsContext";
import SpinnerSVG from "../../../../img/svg/spinner.svg";

export const OTHER_SERVER = "other";
const PRIVATE_KEY_HEADER = "-----BEGIN PGP PRIVATE KEY BLOCK-----";
const UNREACHABLE_SERVER_ERRORS = ["PassboltServiceUnavailableError", "PassboltApiFetchError"];

/**
 * Collect what the extension needs to verify and save an account. The form only checks the shape of the
 * input; the extension verifies the server, the identity and the key before saving anything.
 */
class AddAccountForm extends Component {
  constructor(props) {
    super(props);
    this.state = this.getDefaultState(props);
    this.bindCallbacks();
    this.createRefs();
  }

  /**
   * The server preselection derived from the props: the page backend when configured, else prefilled as
   * another server, else the first configured server.
   * @returns {{serverChoice: string, customDomain: string}}
   */
  getDefaultServerState(props) {
    const defaultDomain = normalizeDomain(props.defaultDomain);
    const servers = props.servers.map((server) => normalizeDomain(server.domain));
    let serverChoice = OTHER_SERVER;
    if (servers.includes(defaultDomain)) {
      serverChoice = defaultDomain;
    } else if (!defaultDomain && servers.length > 0) {
      serverChoice = servers[0];
    }
    return {
      serverChoice, // A saved server domain or OTHER_SERVER
      customDomain: serverChoice === OTHER_SERVER ? defaultDomain : "", // The typed server URL
    };
  }

  getDefaultState(props) {
    return {
      ...this.getDefaultServerState(props),
      hasChosenServer: false, // True once the user picked a server or typed a URL
      username: "",
      privateKey: "",
      privateKeyFileName: "",
      passphrase: "",
      errors: {}, // Field errors, by field name
      hasBeenValidated: false,
      processing: false,
      submitError: null, // The error returned by the extension
      pendingResult: null, // The add result while the enrollment waits for MFA
    };
  }

  bindCallbacks() {
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handlePrivateKeyFileChange = this.handlePrivateKeyFileChange.bind(this);
    this.handleChooseFileClick = this.handleChooseFileClick.bind(this);
  }

  createRefs() {
    this.fieldRefs = {
      domain: React.createRef(),
      username: React.createRef(),
      privateKey: React.createRef(),
      passphrase: React.createRef(),
    };
    this.fileInputRef = React.createRef();
  }

  /**
   * Servers and the page backend may be discovered after mount: follow them until the user chose a server.
   */
  componentDidUpdate(prevProps) {
    const hasDiscoveryChanged =
      prevProps.servers !== this.props.servers || prevProps.defaultDomain !== this.props.defaultDomain;
    if (hasDiscoveryChanged && !this.state.hasChosenServer) {
      const serverState = this.getDefaultServerState(this.props);
      if (
        serverState.serverChoice !== this.state.serverChoice ||
        serverState.customDomain !== this.state.customDomain
      ) {
        this.setState(serverState);
      }
    }
  }

  get translate() {
    return this.props.t;
  }

  get servers() {
    return this.props.servers.map((server) => normalizeDomain(server.domain));
  }

  get domain() {
    return this.state.serverChoice === OTHER_SERVER
      ? normalizeDomain(this.state.customDomain)
      : this.state.serverChoice;
  }

  handleInputChange(event) {
    const { name, value } = event.target;
    const hasChosenServer = this.state.hasChosenServer || name === "serverChoice" || name === "customDomain";
    this.setState({ [name]: value, hasChosenServer }, () => this.state.hasBeenValidated && this.validate());
  }

  handleChooseFileClick() {
    this.fileInputRef.current.click();
  }

  async handlePrivateKeyFileChange(event) {
    const [file] = event.target.files;
    if (!file) {
      return;
    }
    const privateKey = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
    this.setState({ privateKey, privateKeyFileName: file.name }, () => this.state.hasBeenValidated && this.validate());
  }

  /**
   * @returns {object} The field errors, empty when the form is valid.
   */
  validate() {
    const errors = {};
    const domain = this.domain;
    if (!domain) {
      errors.domain = this.translate("A server URL is required.");
    } else {
      let url = null;
      try {
        url = new URL(domain);
      } catch {
        errors.domain = this.translate("This is not a valid URL.");
      }
      if (url && url.protocol !== "https:") {
        errors.domain = this.translate("The server URL must start with https://.");
      } else if (url && (url.username || url.password || url.search || url.hash)) {
        errors.domain = this.translate("Use the server base URL, without credentials, query or fragment.");
      }
    }
    const username = this.state.username.trim();
    if (!username) {
      errors.username = this.translate("An email is required.");
    } else if (!IsEmailValidator.validate(username)) {
      errors.username = this.translate("This is not a valid email address.");
    }
    if (!this.state.privateKey.trim()) {
      errors.privateKey = this.translate("A private key is required.");
    } else if (!this.state.privateKey.includes(PRIVATE_KEY_HEADER)) {
      errors.privateKey = this.translate("This is not an OpenPGP private key block.");
    }
    if (!this.state.passphrase) {
      errors.passphrase = this.translate("The passphrase is required.");
    }
    this.setState({ errors });
    return errors;
  }

  async handleSubmit(event) {
    event.preventDefault();
    if (this.state.processing) {
      return;
    }
    this.setState({ hasBeenValidated: true, submitError: null });
    const errors = this.validate();
    const firstInvalidField = Object.keys(this.fieldRefs).find((field) => errors[field]);
    if (firstInvalidField) {
      this.fieldRefs[firstInvalidField].current?.focus();
      return;
    }

    this.setState({ processing: true });
    try {
      const result = await this.props.onSubmit({
        domain: this.domain,
        username: this.state.username.trim(),
        user_private_armored_key: this.state.privateKey.trim(),
        passphrase: this.state.passphrase,
      });
      // Do not keep secrets around once the extension holds them.
      this.setState({ passphrase: "", privateKey: "", processing: false });
      if (result?.requires_unlock) {
        // Not saved yet: the extension saves the account only once MFA succeeds in the page it opens.
        this.setState({ pendingResult: result });
        return;
      }
      await this.props.onAdded?.(result);
    } catch (error) {
      if (error?.name === "UserAbortsOperationError") {
        this.setState({ processing: false });
        return;
      }
      this.setState({ processing: false, passphrase: "", submitError: error });
    }
  }

  get submitErrorMessage() {
    const error = this.state.submitError;
    if (UNREACHABLE_SERVER_ERRORS.includes(error?.name)) {
      return this.translate(
        "The server {{server}} could not be reached. Check the URL and your connection, then try again.",
        { server: getServerLabel(this.domain), interpolation: { escapeValue: false } },
      );
    }
    return error?.message || this.translate("The account could not be added.");
  }

  /**
   * @param {string} field
   * @returns {object} Props tying an input to its error message.
   */
  errorProps(field) {
    const hasError = this.state.hasBeenValidated && Boolean(this.state.errors[field]);
    return {
      "aria-invalid": hasError,
      "aria-describedby": hasError ? `add-account-${field}-error` : undefined,
    };
  }

  renderError(field) {
    if (!this.state.hasBeenValidated || !this.state.errors[field]) {
      return null;
    }
    return (
      <div id={`add-account-${field}-error`} className="error-message">
        {this.state.errors[field]}
      </div>
    );
  }

  fieldClassName(base, field) {
    const hasError = this.state.hasBeenValidated && this.state.errors[field];
    return `${base} ${hasError ? "error" : ""} ${this.state.processing ? "disabled" : ""}`;
  }

  renderServerField() {
    const disabled = this.state.processing;
    const urlField = (
      <div className={this.fieldClassName("input text required", "domain")}>
        <label htmlFor="add-account-domain">
          {this.servers.length > 0 ? <Trans>Server URL</Trans> : <Trans>Server</Trans>}
        </label>
        <input
          id="add-account-domain"
          name="customDomain"
          type="text"
          inputMode="url"
          autoComplete="url"
          spellCheck={false}
          placeholder="https://passbolt.example.com"
          value={this.state.customDomain}
          onChange={this.handleInputChange}
          disabled={disabled}
          ref={this.fieldRefs.domain}
          {...this.errorProps("domain")}
        />
        {this.renderError("domain")}
        <div className="help-message">
          <Trans>The address you open Passbolt at, including any path.</Trans>
        </div>
      </div>
    );
    if (this.servers.length === 0) {
      return urlField;
    }
    return (
      <>
        <fieldset className="account-server-choice radiolist">
          <legend>
            <Trans>Server</Trans>
          </legend>
          {this.servers.map((domain, index) => (
            <div className="input radio" key={domain}>
              <input
                type="radio"
                id={`add-account-server-${index}`}
                name="serverChoice"
                value={domain}
                checked={this.state.serverChoice === domain}
                onChange={this.handleInputChange}
                disabled={disabled}
              />
              <label htmlFor={`add-account-server-${index}`}>{getServerLabel(domain)}</label>
            </div>
          ))}
          <div className="input radio">
            <input
              type="radio"
              id="add-account-server-other"
              name="serverChoice"
              value={OTHER_SERVER}
              checked={this.state.serverChoice === OTHER_SERVER}
              onChange={this.handleInputChange}
              disabled={disabled}
            />
            <label htmlFor="add-account-server-other">
              <Trans>Another server</Trans>
            </label>
          </div>
        </fieldset>
        {this.state.serverChoice === OTHER_SERVER && urlField}
      </>
    );
  }

  renderPendingMfa() {
    return (
      <div className="add-account-form add-account-pending">
        <div className="form-content" role="status">
          <p className="add-account-pending-title">
            <Trans>Finish signing in with multi-factor authentication.</Trans>
          </p>
          <p>
            {this.translate("Passbolt opened the verification page of {{server}} for {{username}}.", {
              server: getServerLabel(this.domain),
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
        <div className="submit-wrapper clearfix">
          <button
            type="button"
            className="button primary form"
            onClick={() => this.props.onAdded?.(this.state.pendingResult)}
          >
            <Trans>Close</Trans>
          </button>
        </div>
      </div>
    );
  }

  render() {
    if (this.state.pendingResult) {
      return this.renderPendingMfa();
    }
    const disabled = this.state.processing;
    return (
      <form className="add-account-form" onSubmit={this.handleSubmit} noValidate aria-busy={disabled}>
        <div className="form-content">
          {this.renderServerField()}
          <div className={this.fieldClassName("input text required", "username")}>
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
              onChange={this.handleInputChange}
              disabled={disabled}
              ref={this.fieldRefs.username}
              {...this.errorProps("username")}
            />
            {this.renderError("username")}
          </div>
          <div className={this.fieldClassName("input textarea required openpgp-key", "privateKey")}>
            <label htmlFor="add-account-private-key">
              <Trans>Private key</Trans>
            </label>
            <textarea
              id="add-account-private-key"
              name="privateKey"
              autoComplete="off"
              spellCheck={false}
              placeholder={this.translate("Paste your OpenPGP private key block")}
              value={this.state.privateKey}
              onChange={this.handleInputChange}
              disabled={disabled}
              ref={this.fieldRefs.privateKey}
              {...this.errorProps("privateKey")}
            />
            {this.renderError("privateKey")}
          </div>
          <div className={`input file ${disabled ? "disabled" : ""}`}>
            <input
              type="file"
              ref={this.fileInputRef}
              tabIndex={-1}
              aria-hidden="true"
              accept="text/plain,.key,.asc"
              onChange={this.handlePrivateKeyFileChange}
              disabled={disabled}
            />
            <div className="input-file-inline">
              <input
                type="text"
                disabled={true}
                aria-label={this.translate("Selected key file")}
                placeholder={this.translate("No key file selected")}
                value={this.state.privateKeyFileName}
              />
              <button type="button" className="button" onClick={this.handleChooseFileClick} disabled={disabled}>
                <Trans>Choose a file</Trans>
              </button>
            </div>
          </div>
          <div className={this.fieldClassName("input-password-wrapper input required", "passphrase")}>
            <label htmlFor="add-account-passphrase">
              <Trans>Passphrase</Trans>
            </label>
            <Password
              id="add-account-passphrase"
              name="passphrase"
              autoComplete="off"
              value={this.state.passphrase}
              preview={true}
              onChange={this.handleInputChange}
              disabled={disabled}
              inputRef={this.fieldRefs.passphrase}
            />
            {this.renderError("passphrase")}
            <div className="help-message">
              <Trans>The key and passphrase stay in this extension. Passbolt may ask for MFA next.</Trans>
            </div>
          </div>
          {this.state.processing && (
            <p className="add-account-progress" role="status">
              <Trans>Checking the server, your identity and your key…</Trans>
            </p>
          )}
          {this.state.submitError && (
            <div className="add-account-error error-message" role="alert">
              {this.submitErrorMessage}
            </div>
          )}
        </div>
        <div className="submit-wrapper clearfix">
          {this.props.onCancel && (
            <button type="button" className="link cancel" onClick={this.props.onCancel} disabled={disabled}>
              <Trans>Cancel</Trans>
            </button>
          )}
          <button type="submit" className={`button primary form ${disabled ? "processing" : ""}`} disabled={disabled}>
            <Trans>Add account</Trans>
            {disabled && <SpinnerSVG />}
          </button>
        </div>
      </form>
    );
  }
}

AddAccountForm.defaultProps = {
  servers: [],
};

AddAccountForm.propTypes = {
  servers: PropTypes.arrayOf(PropTypes.shape({ domain: PropTypes.string })), // Servers already configured
  defaultDomain: PropTypes.string, // The server preselected, e.g. the one serving the page
  onSubmit: PropTypes.func.isRequired, // Resolves with the extension add result
  onAdded: PropTypes.func, // Called with the add result once saved, or when the pending MFA notice is closed
  onCancel: PropTypes.func, // Optional cancel action
  t: PropTypes.func, // The translation function
};

export default withTranslation("common")(AddAccountForm);
