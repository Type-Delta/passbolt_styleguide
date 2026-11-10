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
import { withTranslation } from "react-i18next";
import DialogWrapper from "../../Common/Dialog/DialogWrapper/DialogWrapper";
import AddAccountForm from "../../../../shared/components/Accounts/AddAccountForm/AddAccountForm";
import { withAccounts } from "../../../../shared/context/Accounts/AccountsContext";
import { withAppContext } from "../../../../shared/context/AppContext/AppContext";

/**
 * Add a saved account from the vault. Rendered by the extension app, so the key never reaches the page.
 * Once saved, the extension navigates to the new account (or its MFA/unlock step).
 */
class AddAccountDialog extends Component {
  get defaultDomain() {
    return this.props.context.userSettings?.getTrustedDomain?.() || this.props.context.trustedDomain;
  }

  render() {
    return (
      <DialogWrapper title={this.props.t("Add account")} onClose={this.props.onClose} className="add-account-dialog">
        <AddAccountForm
          servers={this.props.accountsContext.servers}
          defaultDomain={this.defaultDomain}
          onSubmit={this.props.accountsContext.addAccount}
          onAdded={this.props.onClose}
          onCancel={this.props.onClose}
        />
      </DialogWrapper>
    );
  }
}

AddAccountDialog.propTypes = {
  context: PropTypes.any, // The application context
  accountsContext: PropTypes.object, // The accounts context
  onClose: PropTypes.func, // Close the dialog
  t: PropTypes.func, // The translation function
};

export default withAppContext(withAccounts(withTranslation("common")(AddAccountDialog)));
