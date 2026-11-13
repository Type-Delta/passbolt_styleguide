/**
 * Passbolt ~ Open source password manager for teams
 * Copyright (c) 2020 Passbolt SA (https://www.passbolt.com)
 *
 * Licensed under GNU Affero General Public License version 3 of the or any later version.
 * For full copyright and license information, please see the LICENSE.txt
 * Redistributions of files must retain the above copyright notice.
 *
 * @copyright     Copyright (c) 2020 Passbolt SA (https://www.passbolt.com)
 * @license       https://opensource.org/licenses/AGPL-3.0 AGPL License
 * @link          https://www.passbolt.com Passbolt(tm)
 * @since         2.13.0
 */
import React, { Component } from "react";
import PropTypes from "prop-types";
import { withAppContext } from "../../../../shared/context/AppContext/AppContext";
import { withNavigationContext } from "../../../contexts/NavigationContext";
import { withAccountRecovery } from "../../../contexts/AccountRecoveryUserContext";
import UserAvatar from "../../Common/Avatar/UserAvatar";
import { Trans, withTranslation } from "react-i18next";
import { withMfa } from "../../../contexts/MFAContext";
import { withRbac } from "../../../../shared/context/Rbac/RbacContext";
import ProfileIcon from "../../../../img/svg/profile.svg";
import LogoutIcon from "../../../../img/svg/logout.svg";
import CloseSVG from "../../../../img/svg/close.svg";
import AttentionSVG from "../../../../img/svg/attention.svg";
import { withDialog } from "../../../contexts/DialogContext";
import NotifyError from "../../Common/Error/NotifyError/NotifyError";
import { getServerLabel, withAccounts } from "../../../../shared/context/Accounts/AccountsContext";
import AccountSwitcherList from "../../../../shared/components/Accounts/AccountSwitcherList/AccountSwitcherList";
import PendingAccountNotice from "../../../../shared/components/Accounts/PendingAccountNotice/PendingAccountNotice";
import OpenAddAccountButton from "../../../../shared/components/Accounts/OpenAddAccountButton/OpenAddAccountButton";
import ManageAccountsDialog from "../ManageAccountsDialog/ManageAccountsDialog";
import UserAddSVG from "../../../../img/svg/user_add.svg";
import UserCogSVG from "../../../../img/svg/user_cog.svg";

class DisplayUserBadgeMenu extends Component {
  /**
   * Constructor
   * @param {Object} props
   */
  constructor(props) {
    super(props);
    this.state = this.getDefaultState();
    this.bindCallbacks();
    this.createRefs();
  }

  /**
   * Get default state
   * @returns {Object}
   */
  getDefaultState() {
    return {
      open: false,
    };
  }

  /**
   * Bind callbacks methods
   * @return {void}
   */
  bindCallbacks() {
    this.handleDocumentClickEvent = this.handleDocumentClickEvent.bind(this);
    this.handleDocumentContextualMenuEvent = this.handleDocumentContextualMenuEvent.bind(this);
    this.handleDocumentDragStartEvent = this.handleDocumentDragStartEvent.bind(this);
    this.handleToggleMenuClick = this.handleToggleMenuClick.bind(this);
    this.handleProfileClick = this.handleProfileClick.bind(this);
    this.handleSignOutClick = this.handleSignOutClick.bind(this);
    this.handleManageAccountsClick = this.handleManageAccountsClick.bind(this);
    this.handleAccountSwitched = this.handleAccountSwitched.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.closeUserBadgeMenu = this.closeUserBadgeMenu.bind(this);
  }

  componentDidMount() {
    document.addEventListener("click", this.handleDocumentClickEvent, { capture: true });
    document.addEventListener("contextmenu", this.handleDocumentContextualMenuEvent, { capture: true });
    document.addEventListener("dragstart", this.handleDocumentDragStartEvent, { capture: true });
    if (this.props.context.siteSettings.canIUse("mfaPolicies")) {
      this.props.mfaContext.checkMfaChoiceRequired();
    }
    // Load Account Recovery Policy for pages served by API if not already available
    if (this.props.context.siteSettings.canIUse("accountRecovery")) {
      this.props.accountRecoveryContext.loadAccountRecoveryPolicy();
    }
  }

  componentWillUnmount() {
    document.removeEventListener("click", this.handleDocumentClickEvent, { capture: true });
    document.removeEventListener("contextmenu", this.handleDocumentContextualMenuEvent, { capture: true });
    document.removeEventListener("dragstart", this.handleDocumentDragStartEvent, { capture: true });
  }

  /**
   * Create DOM nodes or React elements references in order to be able to access them programmatically.
   */
  createRefs() {
    this.userBadgeMenuRef = React.createRef();
    this.toggleButtonRef = React.createRef();
  }

  /**
   * Handle click events on document. Hide the component if the click occurred outside of the component.
   * @param {ReactEvent} event The event
   */
  handleDocumentClickEvent(event) {
    // Prevent closing when the user click on an element of the menu
    if (this.userBadgeMenuRef.current.contains(event.target)) {
      return;
    }
    this.closeUserBadgeMenu();
  }

  /**
   * Handle contextual menu events on document. Hide the component if the click occurred outside of the component.
   * @param {ReactEvent} event The event
   */
  handleDocumentContextualMenuEvent(event) {
    // Prevent closing when the user right click on an element of the menu
    if (this.userBadgeMenuRef.current.contains(event.target)) {
      return;
    }
    this.closeUserBadgeMenu();
  }

  /**
   * Handle drag start event on document. Hide the component if any.
   */
  handleDocumentDragStartEvent() {
    this.closeUserBadgeMenu();
  }

  /**
   * Close the user badge menu
   */
  closeUserBadgeMenu() {
    this.setState({ open: false });
  }

  /**
   * Get the user full name
   * @returns {string}
   */
  getUserFullName() {
    if (!this.props.user || !this.props.user.profile) {
      return "...";
    }
    return `${this.props.user.profile.first_name} ${this.props.user.profile.last_name}`;
  }

  /**
   * Get the user username
   * @returns {string}
   */
  getUserUsername() {
    if (!this.props.user || !this.props.user.username) {
      return "...";
    }
    return `${this.props.user.username}`;
  }

  /**
   * Handle click on menu (toggle open state)
   * @param {Event} e
   * @return {void}
   */
  handleToggleMenuClick(e) {
    e.preventDefault();
    const open = !this.state.open;
    this.setState({ open });
  }

  /**
   * Whenever the user wants to navigate to the users settings workspace profile section.
   */
  handleProfileClick() {
    this.props.navigationContext.onGoToUserSettingsProfileRequested();
    this.closeUserBadgeMenu();
  }

  /**
   * Handles the click on Sign out button
   * @returns {Promise<void>}
   */
  async handleSignOutClick() {
    try {
      await this.props.context.onLogoutRequested();
    } catch (error) {
      this.props.dialogContext.open(NotifyError, { error });
    } finally {
      this.closeUserBadgeMenu();
    }
  }

  /**
   * Close the open menu with Escape and give the focus back to its toggle.
   * @param {KeyboardEvent} event
   */
  handleKeyDown(event) {
    if (event.key === "Escape" && this.state.open) {
      event.stopPropagation();
      this.closeUserBadgeMenu();
      this.toggleButtonRef.current?.focus();
    }
  }

  handleManageAccountsClick() {
    this.closeUserBadgeMenu();
    this.props.dialogContext.open(ManageAccountsDialog);
  }

  /**
   * The extension navigates to the selected account (or its unlock step); only the menu is left to close.
   */
  handleAccountSwitched() {
    this.closeUserBadgeMenu();
  }

  /**
   * Account switching is only offered where the extension provides the saved accounts.
   * @returns {boolean}
   */
  get hasAccountSwitcher() {
    return Boolean(this.props.accountsContext?.isAvailable);
  }

  get activeAccount() {
    const { accounts, activeAccountId } = this.props.accountsContext;
    return accounts.find((account) => account.id === activeAccountId);
  }

  renderAccountSwitcher() {
    const { accounts, activeAccountId, isLoading, loadError, refresh, switchAccount, pending, cancelPending } =
      this.props.accountsContext;
    return (
      <div className="account-switcher">
        {pending && <PendingAccountNotice pending={pending} onCancel={cancelPending} />}
        {isLoading && accounts.length === 0 && (
          <p className="account-switcher-status" role="status">
            <Trans>Loading accounts…</Trans>
          </p>
        )}
        {loadError && (
          <p className="account-switcher-status error-message" role="alert">
            <Trans>Saved accounts could not be loaded.</Trans>{" "}
            <button type="button" className="link" onClick={refresh}>
              <Trans>Retry</Trans>
            </button>
          </p>
        )}
        {accounts.some((account) => account.id !== activeAccountId) && (
          <>
            <span className="account-switcher-title" id="account-switcher-title">
              <Trans>Switch to</Trans>
            </span>
            <AccountSwitcherList
              accounts={accounts}
              activeAccountId={activeAccountId}
              label={this.props.t("Switch to")}
              onSwitch={switchAccount}
              onSwitched={this.handleAccountSwitched}
            />
          </>
        )}
        <OpenAddAccountButton
          onOpen={this.props.accountsContext.openAddAccount}
          className="no-border account-switcher-action"
          domain={this.activeAccount?.domain}
          onOpened={this.closeUserBadgeMenu}
        >
          <UserAddSVG aria-hidden="true" />
          <Trans>Add account</Trans>
        </OpenAddAccountButton>
        {accounts.length > 0 && (
          <button type="button" className="no-border account-switcher-action" onClick={this.handleManageAccountsClick}>
            <UserCogSVG aria-hidden="true" />
            <Trans>Manage accounts</Trans>
          </button>
        )}
      </div>
    );
  }

  /**
   * Returns true if the account recovery needs to be configured.
   * @return {boolean}
   */
  get attentionRequired() {
    return (
      this.props.accountRecoveryContext.isAccountRecoveryChoiceRequired() || this.props.mfaContext.isMfaChoiceRequired()
    );
  }

  /**
   * Render the component
   * @return {JSX}
   */
  render() {
    return (
      <div className="profile-wrapper">
        <div className="user profile dropdown" ref={this.userBadgeMenuRef} onKeyDown={this.handleKeyDown}>
          <button
            type="button"
            className={`avatar-with-name button avatar-button ${this.state.open ? "open" : ""}`}
            onClick={this.handleToggleMenuClick}
            aria-expanded={this.state.open}
            aria-label={this.props.t("Account menu")}
            ref={this.toggleButtonRef}
          >
            <UserAvatar
              user={this.props.user}
              baseUrl={this.props.baseUrl}
              attentionRequired={this.attentionRequired}
            />
          </button>
          {this.state.open && (
            <div className="dropdown-content left visible">
              <button
                className="button button-transparent user-profile-close"
                role="button"
                onClick={this.handleToggleMenuClick}
              >
                <CloseSVG className="svg-icon close" />
                <span className="visually-hidden">Close</span>
              </button>
              <UserAvatar user={this.props.user} baseUrl={this.props.baseUrl} />
              <div className="informations">
                <div className="name">{this.getUserFullName()}</div>
                <div className="email">{this.getUserUsername()}</div>
                {this.hasAccountSwitcher && this.activeAccount && (
                  <div className="server">{getServerLabel(this.activeAccount.domain)}</div>
                )}
              </div>
              <div className="manage-account">
                <button className="button primary" onClick={this.handleProfileClick}>
                  <ProfileIcon /> <Trans>Account Settings</Trans>
                  {this.attentionRequired && <AttentionSVG className="attention-required" />}
                </button>
              </div>
              {this.hasAccountSwitcher && this.renderAccountSwitcher()}
              <button type="button" className="no-border sign-out" onClick={this.handleSignOutClick}>
                <LogoutIcon />
                <Trans>Sign out</Trans>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
}

DisplayUserBadgeMenu.propTypes = {
  context: PropTypes.object, // The application context
  navigationContext: PropTypes.any, // The application navigation context
  mfaContext: PropTypes.object, // The mfa context
  accountRecoveryContext: PropTypes.object, // The account recovery context
  baseUrl: PropTypes.string,
  user: PropTypes.object,
  rbacContext: PropTypes.any, // The role based access control context
  dialogContext: PropTypes.object, // the dialog context prop
  accountsContext: PropTypes.object, // The saved accounts context, available in the extension app only
  t: PropTypes.func, // The translation function
};

export default withAppContext(
  withRbac(
    withNavigationContext(
      withDialog(withAccountRecovery(withMfa(withAccounts(withTranslation("common")(DisplayUserBadgeMenu))))),
    ),
  ),
);
