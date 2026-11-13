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
import SpinnerSVG from "../../../../img/svg/spinner.svg";

/**
 * Opens the add account wizard in its own tab. Keys and passphrases are never entered where this button lives.
 * Shows why the tab could not be opened instead of failing silently.
 */
class OpenAddAccountButton extends Component {
  constructor(props) {
    super(props);
    this.state = { processing: false, error: null };
    this.handleClick = this.handleClick.bind(this);
  }

  componentWillUnmount() {
    this.isUnmounted = true;
  }

  async handleClick() {
    if (this.state.processing) {
      return;
    }
    this.setState({ processing: true, error: null });
    let result;
    try {
      result = await this.props.onOpen(this.props.domain);
    } catch (error) {
      if (!this.isUnmounted) {
        this.setState({ processing: false, error });
      }
      return;
    }
    if (!this.isUnmounted) {
      this.setState({ processing: false });
    }
    await this.props.onOpened?.(result);
  }

  render() {
    return (
      <>
        <button
          type="button"
          className={`${this.props.className} ${this.state.processing ? "processing" : ""}`}
          onClick={this.handleClick}
          disabled={this.state.processing}
          aria-label={this.props.label}
        >
          {this.props.children}
          {this.state.processing && <SpinnerSVG />}
        </button>
        {this.state.error && (
          <p className="add-account-launch-error error-message" role="alert">
            <Trans>The add account page could not be opened.</Trans> {this.state.error.message}
          </p>
        )}
      </>
    );
  }
}

OpenAddAccountButton.defaultProps = {
  className: "button",
};

OpenAddAccountButton.propTypes = {
  onOpen: PropTypes.func.isRequired, // (domain) => Promise, usually accountsContext.openAddAccount
  domain: PropTypes.string, // The server to suggest in the wizard
  className: PropTypes.string, // The button class names
  label: PropTypes.string, // Accessible name when the visible text is not enough
  onOpened: PropTypes.func, // Called once the tab is open, e.g. to close the popup or a menu
  children: PropTypes.node, // The button content
  t: PropTypes.func, // The translation function
};

export default withTranslation("common")(OpenAddAccountButton);
