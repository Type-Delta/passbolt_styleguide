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
import DialogWrapper from "../../Common/Dialog/DialogWrapper/DialogWrapper";
import ManageAccountsList from "../../../../shared/components/Accounts/ManageAccountsList/ManageAccountsList";
import { withAccounts } from "../../../../shared/context/Accounts/AccountsContext";
import OpenAddAccountButton from "../../../../shared/components/Accounts/OpenAddAccountButton/OpenAddAccountButton";
import UserAddSVG from "../../../../img/svg/user_add.svg";

/**
 * Lock or remove the accounts saved in this browser, or add another one.
 */
class ManageAccountsDialog extends Component {
  render() {
    const { accounts, activeAccountId, lockAccount, removeAccount } = this.props.accountsContext;
    return (
      <DialogWrapper
        title={this.props.t("Manage accounts")}
        onClose={this.props.onClose}
        className="manage-accounts-dialog"
      >
        <div className="form-content">
          <ManageAccountsList
            accounts={accounts}
            activeAccountId={activeAccountId}
            onLock={lockAccount}
            onRemove={removeAccount}
          />
        </div>
        <div className="submit-wrapper clearfix">
          <OpenAddAccountButton
            onOpen={this.props.accountsContext.openAddAccount}
            className="button"
            onOpened={this.props.onClose}
          >
            <UserAddSVG aria-hidden="true" />
            <Trans>Add account</Trans>
          </OpenAddAccountButton>
          <button type="button" className="button primary" onClick={this.props.onClose}>
            <Trans>Done</Trans>
          </button>
        </div>
      </DialogWrapper>
    );
  }
}

ManageAccountsDialog.propTypes = {
  accountsContext: PropTypes.object, // The accounts context
  onClose: PropTypes.func, // Close the dialog
  t: PropTypes.func, // The translation function
};

export default withAccounts(withTranslation("common")(ManageAccountsDialog));
