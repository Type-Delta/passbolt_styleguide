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
import { normalizeDomain } from "../../../../shared/context/Accounts/AccountsContext";
import SpinnerSVG from "../../../../img/svg/spinner.svg";

export const OTHER_SERVER = "other";
export const UNREACHABLE_SERVER_ERRORS = ["PassboltServiceUnavailableError", "PassboltApiFetchError"];

/**
 * First step of the add account wizard: pick a saved server or type one, then let the extension check that it
 * answers as a genuine Passbolt server. Every Continue verifies again, saved servers included.
 */
class ChooseServerStep extends Component {
  constructor(props) {
    super(props);
    this.state = {
      ...this.getDefaultServerState(props),
      hasChosenServer: false, // True once the user picked a server or typed a URL
      fieldError: null, // The URL validation error
      verifyError: null, // The verification error returned by the extension
      processing: false,
    };
    // Bumped whenever the input changes or the step goes away: a late verification is then ignored.
    this.generation = 0;
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.domainInputRef = React.createRef();
    this.checkedRadioRef = React.createRef();
  }

  /**
   * The preselection: the hinted server when saved, else the hint (or nothing) typed as another server.
   * @returns {{serverChoice: string, customDomain: string}}
   */
  getDefaultServerState(props) {
    const defaultDomain = normalizeDomain(props.defaultDomain);
    const isSaved = props.servers.some((server) => normalizeDomain(server.domain) === defaultDomain);
    return isSaved
      ? { serverChoice: defaultDomain, customDomain: "" }
      : { serverChoice: OTHER_SERVER, customDomain: defaultDomain };
  }

  componentDidMount() {
    this.focusField();
  }

  /**
   * Saved servers arrive after mount: follow them until the user chose a server.
   */
  componentDidUpdate(prevProps) {
    const hasDiscoveryChanged =
      prevProps.servers !== this.props.servers || prevProps.defaultDomain !== this.props.defaultDomain;
    if (hasDiscoveryChanged && !this.state.hasChosenServer && !this.state.processing) {
      const serverState = this.getDefaultServerState(this.props);
      if (
        serverState.serverChoice !== this.state.serverChoice ||
        serverState.customDomain !== this.state.customDomain
      ) {
        this.setState(serverState);
      }
    }
  }

  componentWillUnmount() {
    this.generation++;
  }

  get servers() {
    return this.props.servers.map((server) => normalizeDomain(server.domain));
  }

  get domain() {
    return this.state.serverChoice === OTHER_SERVER
      ? normalizeDomain(this.state.customDomain)
      : this.state.serverChoice;
  }

  get isTypingServer() {
    return this.servers.length === 0 || this.state.serverChoice === OTHER_SERVER;
  }

  focusField() {
    (this.isTypingServer ? this.domainInputRef : this.checkedRadioRef).current?.focus();
  }

  handleInputChange(event) {
    const { name, value } = event.target;
    this.generation++;
    this.setState({ [name]: value, hasChosenServer: true, verifyError: null, processing: false }, () => {
      if (this.state.fieldError) {
        this.setState({ fieldError: this.validate() });
      }
    });
  }

  /**
   * @returns {string|null} The URL error, null when the URL can be verified.
   */
  validate() {
    const domain = this.domain;
    if (!domain) {
      return this.props.t("A server URL is required.");
    }
    let url;
    try {
      url = new URL(domain);
    } catch {
      return this.props.t("This is not a valid URL.");
    }
    if (url.protocol !== "https:") {
      return this.props.t("The server URL must start with https://.");
    }
    if (url.username || url.password || url.search || url.hash) {
      return this.props.t("Use the server base URL, without credentials, query or fragment.");
    }
    return null;
  }

  async handleSubmit(event) {
    event.preventDefault();
    if (this.state.processing) {
      return;
    }
    const fieldError = this.validate();
    this.setState({ fieldError, verifyError: null });
    if (fieldError) {
      this.focusField();
      return;
    }
    const generation = ++this.generation;
    this.setState({ processing: true });
    try {
      const verifiedServer = await this.props.onVerify(this.domain);
      if (generation === this.generation) {
        this.props.onComplete(verifiedServer);
      }
    } catch (error) {
      if (generation === this.generation) {
        this.setState({ processing: false, verifyError: error }, () => this.focusField());
      }
    }
  }

  get verifyErrorMessage() {
    const error = this.state.verifyError;
    if (UNREACHABLE_SERVER_ERRORS.includes(error?.name)) {
      return this.props.t(
        "The server {{server}} could not be reached. Check the URL and your connection, then try again.",
        { server: this.domain, interpolation: { escapeValue: false } },
      );
    }
    return error?.message || this.props.t("This server could not be verified as a Passbolt server.");
  }

  /**
   * Ties the server input or choice to the message explaining what is wrong with it.
   */
  get errorProps() {
    const hasError = Boolean(this.state.fieldError || this.state.verifyError);
    return { "aria-invalid": hasError, "aria-describedby": hasError ? "add-account-server-error" : undefined };
  }

  renderError() {
    if (this.state.fieldError) {
      return (
        <div id="add-account-server-error" className="error-message">
          {this.state.fieldError}
        </div>
      );
    }
    if (this.state.verifyError) {
      return (
        <div id="add-account-server-error" className="error-message" role="alert">
          {this.verifyErrorMessage}
        </div>
      );
    }
    return null;
  }

  renderUrlField() {
    const hasError = Boolean(this.state.fieldError || this.state.verifyError);
    return (
      <div className={`input text required ${hasError ? "error" : ""} ${this.state.processing ? "disabled" : ""}`}>
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
          disabled={this.state.processing}
          ref={this.domainInputRef}
          {...this.errorProps}
        />
        {this.renderError()}
        <div className="help-message">
          <Trans>The address you open Passbolt at, including any path.</Trans>
        </div>
      </div>
    );
  }

  renderServerChoice() {
    return (
      <fieldset className="account-server-choice radiolist" {...(this.isTypingServer ? {} : this.errorProps)}>
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
              disabled={this.state.processing}
              ref={this.state.serverChoice === domain ? this.checkedRadioRef : undefined}
            />
            <label htmlFor={`add-account-server-${index}`} className="account-server-url">
              {domain}
            </label>
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
            disabled={this.state.processing}
          />
          <label htmlFor="add-account-server-other">
            <Trans>Another server</Trans>
          </label>
        </div>
        {!this.isTypingServer && this.renderError()}
      </fieldset>
    );
  }

  render() {
    return (
      <div className="add-account-server">
        <h1>
          <Trans>Which Passbolt server is your account on?</Trans>
        </h1>
        <form onSubmit={this.handleSubmit} noValidate aria-busy={this.state.processing}>
          {this.servers.length > 0 && this.renderServerChoice()}
          {this.isTypingServer && this.renderUrlField()}
          {this.state.processing && (
            <p className="add-account-progress" role="status">
              {this.props.t("Checking {{server}}…", { server: this.domain, interpolation: { escapeValue: false } })}
            </p>
          )}
          <div className="form-actions">
            <button
              type="submit"
              className={`button primary big full-width ${this.state.processing ? "processing" : ""}`}
              disabled={this.state.processing}
            >
              <Trans>Continue</Trans>
              {this.state.processing && <SpinnerSVG />}
            </button>
          </div>
        </form>
      </div>
    );
  }
}

ChooseServerStep.defaultProps = {
  servers: [],
};

ChooseServerStep.propTypes = {
  servers: PropTypes.arrayOf(PropTypes.shape({ domain: PropTypes.string })), // Servers already known
  defaultDomain: PropTypes.string, // The server preselected, an untrusted hint
  onVerify: PropTypes.func.isRequired, // (domain) => Promise<{domain, server_key_fingerprint, checked_at, is_known}>
  onComplete: PropTypes.func.isRequired, // Called with the verification result
  t: PropTypes.func, // The translation function
};

export default withTranslation("common")(ChooseServerStep);
