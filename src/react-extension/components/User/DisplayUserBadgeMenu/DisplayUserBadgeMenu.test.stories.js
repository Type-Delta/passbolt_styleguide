import React from "react";
import DisplayUserBadgeMenu from "./DisplayUserBadgeMenu";
import { defaultProps } from "./DisplayUserBadgeMenu.test.data";
import {
  accountSummaries,
  defaultAccountsContext,
} from "../../../../shared/context/Accounts/AccountsContext.test.data";
import { openAccountMenu } from "../../../../shared/context/Accounts/AccountsStories.test.data";

export default {
  title: "Components/User/DisplayUserBadgeMenu",
  decorators: [
    (Story) => (
      <div className="page">
        <div className="app">
          <div className="panel main">
            <div className="panel middle">
              <div className="header">
                <div className="header-right">
                  <Story />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  ],
  component: DisplayUserBadgeMenu,
};

export const DefaultUserBadgeMenu = {
  args: defaultProps(),
};

const propsAttentionRequired = {
  accountRecoveryContext: {
    isAccountRecoveryChoiceRequired: () => true,
    loadAccountRecoveryPolicy: jest.fn(),
  },
};

export const AttentionRequired = {
  args: defaultProps(propsAttentionRequired),
};

const propsWithUserAvatar = {
  user: {
    username: "user@passbolt.com",
    profile: {
      first_name: "User",
      last_name: "Passbolt",
      avatar: { url: { medium: "img/logo/icon-64.png", small: "img/logo/icon-32.png" } },
    },
  },
};

export const UserAvatarBadgeMenu = {
  args: defaultProps(propsWithUserAvatar),
};

const alex = { user: { username: "alex@home.example", profile: { first_name: "Alex", last_name: "Moreau" } } };

export const SavedAccounts = {
  args: defaultProps({ ...alex, accountsContext: defaultAccountsContext() }),
  play: openAccountMenu,
};

export const SingleSavedAccount = {
  args: defaultProps({
    ...alex,
    accountsContext: defaultAccountsContext({ accounts: accountSummaries().slice(0, 1) }),
  }),
  play: openAccountMenu,
};
