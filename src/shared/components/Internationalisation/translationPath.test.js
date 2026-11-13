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

import { getTranslationPath } from "./translationPath";

const REVISION = `ui-${"0f".repeat(32)}`;

/**
 * A page document at the given URL, optionally stamped like the server frontend templates.
 */
function pageAt(href, cacheVersion) {
  const { protocol, origin } = new URL(href);
  const stamp = cacheVersion === undefined ? null : { getAttribute: () => cacheVersion };
  return {
    location: { href, protocol, origin },
    querySelector: (selector) => (selector === "#stylesheet-manager[cache-version]" ? stamp : null),
  };
}

describe("getTranslationPath", () => {
  it("keeps extension-local translation paths unchanged", () => {
    const page = pageAt("chrome-extension://abcdef/webAccessibleResources/quickaccess.html", REVISION);
    expect(getTranslationPath("/webAccessibleResources/locales/{{lng}}/{{ns}}.json", "fr-FR", "common", page)).toEqual(
      "/webAccessibleResources/locales/fr-FR/common.json",
    );
    const firefoxPage = pageAt("moz-extension://abcdef/webAccessibleResources/quickaccess.html", REVISION);
    expect(
      getTranslationPath("/webAccessibleResources/locales/{{lng}}/{{ns}}.json", "en-GB", "common", firefoxPage),
    ).toEqual("/webAccessibleResources/locales/en-UK/common.json");
  });

  it("stamps same-origin translations of an HTTPS frontend under its deployment path", () => {
    const page = pageAt("https://vault.example/passbolt/app/passwords", REVISION);
    expect(
      getTranslationPath("https://vault.example/passbolt/locales/{{lng}}/{{ns}}.json", "de-DE", "common", page),
    ).toEqual(`https://vault.example/passbolt/locales/de-DE/common.json?v=${REVISION}`);
  });

  it("resolves a relative path against the page before stamping it", () => {
    const page = pageAt("https://vault.example/passbolt/setup/start", REVISION);
    expect(getTranslationPath("../locales/{{lng}}/{{ns}}.json", "fr-FR", "common", page)).toEqual(
      `https://vault.example/passbolt/locales/fr-FR/common.json?v=${REVISION}`,
    );
  });

  it("keeps the URL without a stamped stylesheet manager", () => {
    const page = pageAt("https://vault.example/app", undefined);
    expect(getTranslationPath("/locales/{{lng}}/{{ns}}.json", "fr-FR", "common", page)).toEqual(
      "/locales/fr-FR/common.json",
    );
  });
});
