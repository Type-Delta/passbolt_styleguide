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
import { getServerLabel } from "../../../context/Accounts/AccountsContext";
import SpinnerSVG from "../../../../img/svg/spinner.svg";

/**
 * A sign-in waiting for multi-factor authentication in the tab the extension opened. Nothing is saved until
 * it succeeds; cancelling lets the extension forget the key and passphrase it holds for it.
 */
class PendingAccountNotice extends Component {
  constructor(props) {
    super(props);
    this.state = { processing: false, error: null };
    this.handleCancelClick = this.handleCancelClick.bind(this);
  }

  async handleCancelClick() {
    this.setState({ processing: true, error: null });
    try {
      await this.props.onCancel();
    } catch (error) {
      this.setState({ processing: false, error });
    }
  }

  get expiresAt() {
    return new Date(this.props.pending.expires_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  render() {
    const { domain, username } = this.props.pending;
    const values = { username, server: getServerLabel(domain), interpolation: { escapeValue: false } };
    return (
      <div className="pending-account-notice" role="status">
        <p className="pending-account-title">
          {this.props.t("Waiting for multi-factor authentication for {{username}} on {{server}}.", values)}
        </p>
        <p>
          {this.props.t(
            "Complete it in the Passbolt tab before {{time}}. The account is not saved until it succeeds.",
            { time: this.expiresAt, interpolation: { escapeValue: false } },
          )}
        </p>
        {this.state.error && (
          <p className="error-message" role="alert">
            {this.state.error.message || <Trans>The sign-in could not be cancelled.</Trans>}
          </p>
        )}
        <div className="pending-account-actions">
          <button
            type="button"
            className={`button ${this.state.processing ? "processing" : ""}`}
            disabled={this.state.processing}
            onClick={this.handleCancelClick}
            aria-label={this.props.t("Cancel the sign-in of {{username}}", values)}
          >
            <Trans>Cancel sign-in</Trans>
            {this.state.processing && <SpinnerSVG />}
          </button>
        </div>
      </div>
    );
  }
}

PendingAccountNotice.propTypes = {
  pending: PropTypes.shape({
    domain: PropTypes.string.isRequired,
    username: PropTypes.string.isRequired,
    expires_at: PropTypes.number.isRequired,
  }).isRequired, // The public pending sign-in
  onCancel: PropTypes.func.isRequired, // Resolves once the extension cancelled the sign-in
  t: PropTypes.func, // The translation function
};

export default withTranslation("common")(PendingAccountNotice);
