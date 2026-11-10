import React from "react";
import FilterResourcesByFavoritePage from "./components/FilterResourcesByFavoritePage/FilterResourcesByFavoritePage";
import FilterResourcesByItemsIOwnPage from "./components/FilterResourcesByItemsIOwnPage/FilterResourcesByItemsIOwnPage";
import FilterResourcesByGroupPage from "./components/FilterResourcesByGroupPage/FilterResourcesByGroupPage";
import FilterResourcesByRecentlyModifiedPage from "./components/FilterResourcesByRecentlyModifiedPage/FilterResourcesByRecentlyModifiedPage";
import FilterResourcesBySharedWithMePage from "./components/FilterResourcesBySharedWithMePage/FilterResourcesBySharedWithMePage";
import FilterResourcesByTagPage from "./components/FilterResourcesByTagPage/FilterResourcesByTagPage";
import Header from "./components/Header/Header";
import HomePage from "./components/HomePage/HomePage";
import LoginPage from "./components/LoginPage/LoginPage";
import MoreFiltersPage from "./components/MoreFiltersPage/MoreFiltersPage";
import ResourceCreatePage from "./components/ResourceCreatePage/ResourceCreatePage";
import ResourceViewPage from "./components/ResourceViewPage/ResourceViewPage";
import Search from "./components/Search/Search";
import { MemoryRouter as Router, Route, Switch } from "react-router-dom";
import AnimatedSwitch from "./components/AnimatedSwitch/AnimatedSwitch";
import PassphraseDialog from "./components/PassphraseDialog/PassphraseDialog";
import PropTypes from "prop-types";
import TranslationProvider from "../shared/components/Internationalisation/TranslationProvider";
import SetupExtensionInProgress from "./components/ExtensionSetup/SetupExtensionInProgress/SetupExtensionInProgress";
import ManageQuickAccessMode from "./components/ManageQuickAccessMode/ManageQuickAccessMode";
import PrivateRoute from "./components/PrivateRoute/PrivateRoute";
import SaveResource from "./components/ResourceAutoSave/SaveResource";
import GeneratePasswordPage from "./components/GeneratePasswordPage/GeneratePasswordPage";
import PrepareResourceContextProvider from "./contexts/PrepareResourceContext";
import SsoContextProvider from "./contexts/SsoContext";
import PasswordPoliciesContext from "../shared/context/PasswordPoliciesContext/PasswordPoliciesContext";
import PasswordExpirySettingsContextProvider from "../react-extension/contexts/PasswordExpirySettingsContext";
import ConfirmCreatePage from "./components/ConfirmCreatePage/ConfirmCreatePage";
import ResourceLocalStorageProvider from "./contexts/ResourceLocalStorageContext";
import ResourceTypesLocalStorageContextProvider from "../shared/context/ResourceTypesLocalStorageContext/ResourceTypesLocalStorageContext";
import MetadataTypesSettingsLocalStorageContextProvider from "../shared/context/MetadataTypesSettingsLocalStorageContext/MetadataTypesSettingsLocalStorageContext";
import AccountEntity from "../shared/models/entity/account/accountEntity";
import ConfirmMetadataKeyDialog from "./components/ConfirmMetadataKeyPage/ConfirmMetadataKeyPage";
import MetadataKeyEntity from "../shared/models/entity/metadata/metadataKeyEntity";
import MetadataTrustedKeyEntity from "../shared/models/entity/metadata/metadataTrustedKeyEntity";
import MetadataKeysSettingsLocalStorageContextProvider from "../shared/context/MetadataKeysSettingsLocalStorageContext/MetadataKeysSettingsLocalStorageContext";
import ActionAbortedMissingMetadataKeysPage from "./components/ActionAbortedMissingMetadataKeysPage/ActionAbortedMissingMetadataKeysPage";
import OfflineSettingsLocalStorageContextProvider from "../shared/context/offline/OfflineSettingsLocalStorageContext";
import ActiveSessionLocalStorageContextProvider from "../shared/context/ActiveSession/ActiveSessionLocalStorageContext";
import ExtQuickAccessContextProvider from "./contexts/ExtQuickAccessContext";
import HandleBootstrapRoute from "./components/HandleBootstrapRoute/HandleBootstrapRoute";
import QuickAccessServerUnavailable from "./components/QuickAccessServerUnavailable/QuickAccessServerUnavailable";
import QuickAccessOfflineFooter from "./components/Offline/QuickAccessOfflineFooter";
import OfflineLoginPage from "./components/Offline/OfflineLoginPage";
import OfflineFooterDetailsPage from "./components/Offline/OfflineFooterDetailsPage";
import AccountsContextProvider, { normalizeDomain } from "../shared/context/Accounts/AccountsContext";
import AccountsServiceWorkerService from "../shared/services/api/accounts/AccountsServiceWorkerService";
import AppContext from "../shared/context/AppContext/AppContext";
import AccountsPage, {
  ACCOUNTS_ROUTE,
  ADD_ACCOUNT_ROUTE,
  MANAGE_ACCOUNTS_ROUTE,
} from "./components/AccountsPage/AccountsPage";
import AddAccountPage from "./components/AddAccountPage/AddAccountPage";
import ManageAccountsPage from "./components/ManageAccountsPage/ManageAccountsPage";

const SEARCH_VISIBLE_ROUTES = [
  "/webAccessibleResources/quickaccess/home",
  "/webAccessibleResources/quickaccess/resources/favorite",
  "/webAccessibleResources/quickaccess/resources/group",
  "/webAccessibleResources/quickaccess/resources/owned-by-me",
  "/webAccessibleResources/quickaccess/resources/recently-modified",
  "/webAccessibleResources/quickaccess/resources/shared-with-me",
  "/webAccessibleResources/quickaccess/resources/tag",
];

// Supported bootstrap features.
export const BOOTSTRAP_FEATURE = {
  LOGIN: "login",
  CREATE_NEW_CREDENTIALS: "create-new-credentials",
  SAVE_CREDENTIALS: "save-credentials",
  AUTOSAVE_CREDENTIALS: "autosave-credentials",
  REQUEST_PASSPHRASE: "request-passphrase",
};

class ExtQuickAccess extends React.Component {
  constructor(props) {
    super(props);
    this.bindCallbacks();
    this.state = this.defaultState;
    this.initEventListener();
    this.getAccount();
  }

  /**
   * Bind callbacks methods.
   * @return {void}
   */
  bindCallbacks() {
    this.handleBackgroundPageRequiresPassphraseEvent = this.handleBackgroundPageRequiresPassphraseEvent.bind(this);
    this.handlePassphraseDialogCompleted = this.handlePassphraseDialogCompleted.bind(this);
    this.handleBackgroundPageConfirmMetadataKeyEvent = this.handleBackgroundPageConfirmMetadataKeyEvent.bind(this);
    this.handleConfirmMetadataKeyDialogCompleted = this.handleConfirmMetadataKeyDialogCompleted.bind(this);
    this.closeWindow = this.closeWindow.bind(this);
  }

  /**
   * Init event listener
   */
  initEventListener() {
    this.props.port.on("passbolt.passphrase.request", this.handleBackgroundPageRequiresPassphraseEvent);
    this.props.port.on("passbolt.metadata-key.trust-confirm", this.handleBackgroundPageConfirmMetadataKeyEvent);
  }

  /**
   * ComponentDidMount
   * Invoked immediately after component is inserted into the tree
   * @return {void}
   */
  componentDidMount() {
    this.handlePassphraseRequest();
  }

  /**
   * Get the default state value.
   * @returns {object}
   */
  get defaultState() {
    return {
      account: null, // The account
      accountsOnlyRoute: null, // Set when the account cannot be read: only the account pages are available, opened on this route
      // Passphrase
      passphraseRequired: false,
      passphraseRequestId: "",
      // Confirm metadata key
      confirmMetadataKeyRequired: false,
      confirmMetadataKeyRequestId: null,
      confirmMetadataKeyMetadataKey: null,
      confirmMetadataKeyMetadataTrustedKey: null,
    };
  }

  /**
   * Closes the current window.
   * @returns {Promise<void>}
   */
  async closeWindow() {
    if (this.props.detached) {
      await this.props.port.request("passbolt.active-tab.close");
    } else {
      window.close();
    }
  }

  /**
   * Get the foreground account, unless the quick access can only offer the account pages: no readable account,
   * or a sign-in waiting for MFA on the same backend (which shares its cookies).
   * @returns {Promise<void>}
   */
  async getAccount() {
    const accountsService = new AccountsServiceWorkerService(this.props.port);
    // The public list decides; when it cannot be read, keep what is known rather than guess.
    const listPromise = accountsService.list().catch((error) => {
      console.error(error);
      return null;
    });
    let account;
    try {
      account = new AccountEntity(await this.props.port.request("passbolt.account.get"));
    } catch (error) {
      console.error(error);
      const list = await listPromise;
      const isFirstUse = list?.accounts?.length === 0 && !list.pending;
      this.setState({ accountsOnlyRoute: isFirstUse ? ADD_ACCOUNT_ROUTE : ACCOUNTS_ROUTE });
      return;
    }
    const pending = (await listPromise)?.pending;
    if (pending && normalizeDomain(pending.domain) === normalizeDomain(account.domain)) {
      this.setState({ accountsOnlyRoute: ACCOUNTS_ROUTE });
      return;
    }
    this.setState({ account });
  }

  /**
   * Handle background page require passphrase event
   * @param requestId
   */
  handleBackgroundPageRequiresPassphraseEvent(requestId) {
    this.setState({ passphraseRequired: true, passphraseRequestId: requestId });
  }

  /**
   * Handle background page confirm metadata key event
   * @param requestId
   * @param confirmMetadataKey
   */
  handleBackgroundPageConfirmMetadataKeyEvent(requestId, confirmMetadataKey) {
    try {
      // Set validation to false as data is required for the entity used by the service worker but should not be sent to the content code.
      const metadataKey = new MetadataKeyEntity(confirmMetadataKey.metadata_key, { validate: false });
      const metadataTrustedKey = new MetadataTrustedKeyEntity(confirmMetadataKey.metadata_trusted_key);
      this.setState({
        confirmMetadataKeyRequired: true,
        confirmMetadataKeyRequestId: requestId,
        confirmMetadataKeyMetadataKey: metadataKey,
        confirmMetadataKeyMetadataTrustedKey: metadataTrustedKey,
      });
    } catch (error) {
      console.log(error);
      this.setState({
        hasError: true,
        errorMessage: error.message,
      });
    }
  }

  /**
   * Handle passphrase dialog completed
   * If bootstrap feature equals request passphrase, close the windows
   * Else reset the state of passphrase required and request id
   * @return {Promise<void>}
   */
  async handlePassphraseDialogCompleted() {
    if (this.props.bootstrapFeature === BOOTSTRAP_FEATURE.REQUEST_PASSPHRASE) {
      await this.closeWindow();
    } else {
      this.setState({ passphraseRequired: false, passphraseRequestId: null });
    }
  }

  /**
   * Handle passphrase request if bootstrap feature equals request passphrase
   */
  handlePassphraseRequest() {
    if (this.props.bootstrapFeature === BOOTSTRAP_FEATURE.REQUEST_PASSPHRASE) {
      this.handleBackgroundPageRequiresPassphraseEvent(this.props.bootstrapRequestId);
    }
  }

  /**
   * Handle confirm metadata key dialog completed
   */
  handleConfirmMetadataKeyDialogCompleted() {
    this.setState({
      confirmMetadataKeyRequired: false,
      confirmMetadataKeyRequestId: null,
      confirmMetadataKeyMetadataKey: null,
      confirmMetadataKeyMetadataTrustedKey: null,
    });
  }

  /**
   * Is ready
   * @return {boolean}
   */
  isReady() {
    return this.state.account !== null;
  }

  /**
   * The routes reachable without being signed in, including before any account is configured.
   * @returns {JSX}
   */
  renderAccountRoutes() {
    return [
      <Route key="accounts" exact path={ACCOUNTS_ROUTE} component={AccountsPage} />,
      <Route key="add-account" exact path={ADD_ACCOUNT_ROUTE} component={AddAccountPage} />,
      <Route key="manage-accounts" exact path={MANAGE_ACCOUNTS_ROUTE} component={ManageAccountsPage} />,
    ];
  }

  /**
   * Quick access without a readable account: add, switch or manage saved accounts only.
   * @returns {JSX}
   */
  renderWithoutAccount() {
    const appContext = {
      port: this.props.port,
      storage: this.props.storage,
      locale: "en-UK",
      closeWindow: this.closeWindow,
    };
    return (
      <AppContext.Provider value={appContext}>
        <AccountsContextProvider port={this.props.port}>
          <TranslationProvider loadingPath="/webAccessibleResources/locales/{{lng}}/{{ns}}.json">
            <Router initialEntries={[this.state.accountsOnlyRoute]}>
              <Header />
              <Switch>{this.renderAccountRoutes()}</Switch>
            </Router>
          </TranslationProvider>
        </AccountsContextProvider>
      </AppContext.Provider>
    );
  }

  /**
   * Renders the component
   * @returns {JSX.Element}
   */
  render() {
    if (this.state.accountsOnlyRoute) {
      return this.renderWithoutAccount();
    }
    return (
      this.isReady() && (
        <AccountsContextProvider port={this.props.port}>
          <ActiveSessionLocalStorageContextProvider
            account={this.state.account}
            port={this.props.port}
            storage={this.props.storage}
          >
            <ExtQuickAccessContextProvider
              storage={this.props.storage}
              port={this.props.port}
              account={this.state.account}
              openerTabId={this.props.openerTabId}
              bootstrapFeature={this.props.bootstrapFeature}
              detached={this.props.detached}
            >
              <TranslationProvider loadingPath="/webAccessibleResources/locales/{{lng}}/{{ns}}.json">
                <OfflineSettingsLocalStorageContextProvider>
                  <Router initialEntries={[`/webAccessibleResources/quickaccess.html`]}>
                    <Header />
                    <ManageQuickAccessMode />
                    <Switch>
                      {/* The initial route the quickaccess panel is loaded on is a triage url. */}
                      <Route
                        exact
                        path={"/webAccessibleResources/quickaccess.html"}
                        render={() => <HandleBootstrapRoute bootstrapFeature={this.props.bootstrapFeature} />}
                      />
                      {/* The route when the user is not authenticated */}
                      <Route
                        exact
                        path="/webAccessibleResources/quickaccess/login"
                        render={() => (
                          <SsoContextProvider>
                            <LoginPage />
                          </SsoContextProvider>
                        )}
                      />
                      {/* The route to sign in when the server is not reachable (offline mode). */}
                      <Route
                        exact
                        path="/webAccessibleResources/quickaccess/login-offline"
                        render={() => <OfflineLoginPage />}
                      />
                      {/* The route displaying the expanded offline footer of Offline mode. */}
                      <Route
                        exact
                        path="/webAccessibleResources/quickaccess/offline-footer-details"
                        render={() => <OfflineFooterDetailsPage />}
                      />
                      {/* Saved accounts: switch, add and manage, signed in or not. */}
                      {this.renderAccountRoutes()}
                      {/* The route when the server is not reachable (offline). */}
                      <Route
                        exact
                        path="/webAccessibleResources/quickaccess/server-not-reachable"
                        component={QuickAccessServerUnavailable}
                      />
                      {/* Any other authenticated routes. */}
                      <Route path="/">
                        {this.state.passphraseRequired && (
                          <PassphraseDialog
                            requestId={this.state.passphraseRequestId}
                            onComplete={this.handlePassphraseDialogCompleted}
                          />
                        )}
                        {this.state.confirmMetadataKeyRequired && (
                          <ConfirmMetadataKeyDialog
                            requestId={this.state.confirmMetadataKeyRequestId}
                            metadataKey={this.state.confirmMetadataKeyMetadataKey}
                            metadataTrustedKey={this.state.confirmMetadataKeyMetadataTrustedKey}
                            onComplete={this.handleConfirmMetadataKeyDialogCompleted}
                          />
                        )}
                        <div
                          className={`${this.state.passphraseRequired || this.state.confirmMetadataKeyRequired ? "visually-hidden" : ""}`}
                        >
                          <Route path={SEARCH_VISIBLE_ROUTES} render={() => <Search />} />
                          <ResourceTypesLocalStorageContextProvider>
                            <ResourceLocalStorageProvider>
                              <MetadataTypesSettingsLocalStorageContextProvider>
                                <MetadataKeysSettingsLocalStorageContextProvider>
                                  <PasswordPoliciesContext>
                                    <PrepareResourceContextProvider>
                                      <PasswordExpirySettingsContextProvider>
                                        <AnimatedSwitch>
                                          <PrivateRoute
                                            exact
                                            path="/webAccessibleResources/quickaccess/resources/group"
                                            component={FilterResourcesByGroupPage}
                                          />
                                          <PrivateRoute
                                            path="/webAccessibleResources/quickaccess/resources/group/:id"
                                            component={FilterResourcesByGroupPage}
                                          />
                                          <PrivateRoute
                                            exact
                                            path="/webAccessibleResources/quickaccess/resources/tag"
                                            component={FilterResourcesByTagPage}
                                          />
                                          <PrivateRoute
                                            path="/webAccessibleResources/quickaccess/resources/tag/:id"
                                            component={FilterResourcesByTagPage}
                                          />
                                          <PrivateRoute
                                            exact
                                            path="/webAccessibleResources/quickaccess/resources/favorite"
                                            component={FilterResourcesByFavoritePage}
                                          />
                                          <PrivateRoute
                                            exact
                                            path="/webAccessibleResources/quickaccess/resources/owned-by-me"
                                            component={FilterResourcesByItemsIOwnPage}
                                          />
                                          <PrivateRoute
                                            exact
                                            path="/webAccessibleResources/quickaccess/resources/recently-modified"
                                            component={FilterResourcesByRecentlyModifiedPage}
                                          />
                                          <PrivateRoute
                                            exact
                                            path="/webAccessibleResources/quickaccess/resources/shared-with-me"
                                            component={FilterResourcesBySharedWithMePage}
                                          />
                                          <PrivateRoute
                                            path="/webAccessibleResources/quickaccess/resources/create"
                                            component={ResourceCreatePage}
                                          />
                                          <PrivateRoute
                                            exact
                                            path="/webAccessibleResources/quickaccess/resources/confirm-create"
                                            component={ConfirmCreatePage}
                                          />
                                          <PrivateRoute
                                            exact
                                            path="/webAccessibleResources/quickaccess/resources/autosave"
                                            component={SaveResource}
                                          />
                                          <PrivateRoute
                                            path="/webAccessibleResources/quickaccess/resources/view/:id"
                                            component={ResourceViewPage}
                                          />
                                          <PrivateRoute
                                            exact
                                            path="/webAccessibleResources/quickaccess/more-filters"
                                            component={MoreFiltersPage}
                                          />
                                          <PrivateRoute
                                            exact
                                            path="/webAccessibleResources/quickaccess/setup-extension-in-progress"
                                            component={SetupExtensionInProgress}
                                          />
                                          <PrivateRoute
                                            path="/webAccessibleResources/quickaccess/resources/generate-password"
                                            component={GeneratePasswordPage}
                                          />
                                          <PrivateRoute
                                            path="/webAccessibleResources/quickaccess/resources/action-aborted-missing-metadata-keys"
                                            component={ActionAbortedMissingMetadataKeysPage}
                                          />
                                          <PrivateRoute
                                            exact
                                            path="/webAccessibleResources/quickaccess/home"
                                            component={HomePage}
                                          />
                                        </AnimatedSwitch>
                                      </PasswordExpirySettingsContextProvider>
                                    </PrepareResourceContextProvider>
                                  </PasswordPoliciesContext>
                                </MetadataKeysSettingsLocalStorageContextProvider>
                              </MetadataTypesSettingsLocalStorageContextProvider>
                            </ResourceLocalStorageProvider>
                          </ResourceTypesLocalStorageContextProvider>
                        </div>
                      </Route>
                    </Switch>
                    <QuickAccessOfflineFooter />
                  </Router>
                </OfflineSettingsLocalStorageContextProvider>
              </TranslationProvider>
            </ExtQuickAccessContextProvider>
          </ActiveSessionLocalStorageContextProvider>
        </AccountsContextProvider>
      )
    );
  }
}

ExtQuickAccess.propTypes = {
  port: PropTypes.object,
  storage: PropTypes.object,
  bootstrapFeature: PropTypes.string,
  bootstrapRequestId: PropTypes.string,
  openerTabId: PropTypes.string,
  detached: PropTypes.bool,
};

export default ExtQuickAccess;
