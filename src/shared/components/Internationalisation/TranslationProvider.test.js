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

/**
 * Translation file URLs of both translation providers: served frontends are cache-busted by their revision.
 */

import React from "react";
import { render, waitFor } from "@testing-library/react";
import AppContext from "../../context/AppContext/AppContext";

// i18next-http-backend captures fetch when it is loaded: install a stable one first, then load the providers.
const fetchMock = jest.fn();
global.fetch = (...args) => fetchMock(...args);
const TranslationProvider = require("./TranslationProvider").default;
const LegacyTranslationProvider =
  require("../../../react-extension/components/Common/Internationalisation/TranslationProvider").default;

const REVISION = `ui-${"a1".repeat(32)}`;

/**
 * Stamp the page like the server frontend templates do.
 * @param {string} cacheVersion
 */
function stampPage(cacheVersion) {
  const link = document.createElement("link");
  link.id = "stylesheet-manager";
  link.setAttribute("cache-version", cacheVersion);
  document.head.appendChild(link);
}

/**
 * Render a provider and return the translation URL it fetched.
 */
async function fetchedTranslationUrl(Provider, { locale = "fr-FR", loadingPath } = {}) {
  render(
    <AppContext.Provider value={{ locale }}>
      <Provider loadingPath={loadingPath}>
        <p>ready</p>
      </Provider>
    </AppContext.Provider>,
  );
  await waitFor(() => {
    if (fetchMock.mock.calls.length === 0) {
      throw new Error("Not fetched yet");
    }
  });
  return fetchMock.mock.calls[0][0];
}

describe.each([
  ["TranslationProvider", TranslationProvider],
  ["legacy TranslationProvider", LegacyTranslationProvider],
])("%s translation URL", (name, Provider) => {
  beforeEach(() => {
    document.head.innerHTML = "";
    fetchMock.mockReset();
    fetchMock.mockImplementation(() => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve("{}") }));
  });

  it("keeps the URL when the page has no frontend revision", async () => {
    expect.assertions(1);
    const url = await fetchedTranslationUrl(Provider, { loadingPath: "/locales/{{lng}}/{{ns}}.json" });
    expect(url).toEqual("/locales/fr-FR/common.json");
  });

  it("adds the revision of the served frontend so a new release fetches new translations", async () => {
    expect.assertions(1);
    stampPage(REVISION);
    const url = await fetchedTranslationUrl(Provider, { loadingPath: "/locales/{{lng}}/{{ns}}.json" });
    expect(url).toEqual(`http://localhost/locales/fr-FR/common.json?v=${REVISION}`);
  });

  it("maps en-GB to the en-UK folder", async () => {
    expect.assertions(1);
    stampPage(REVISION);
    const url = await fetchedTranslationUrl(Provider, { locale: "en-GB", loadingPath: "/locales/{{lng}}/{{ns}}.json" });
    expect(url).toEqual(`http://localhost/locales/en-UK/common.json?v=${REVISION}`);
  });

  it("keeps a deployment path, an existing query and a fragment, replacing an older revision", async () => {
    expect.assertions(1);
    stampPage(REVISION);
    const url = await fetchedTranslationUrl(Provider, {
      loadingPath: "http://localhost/passbolt/locales/{{lng}}/{{ns}}.json?lang=1&v=ui-old#top",
    });
    expect(url).toEqual(`http://localhost/passbolt/locales/fr-FR/common.json?lang=1&v=${REVISION}#top`);
  });

  it.each([["ui-short"], [`ui-${"A1".repeat(32)}`], [`${REVISION} `], ["v1"]])(
    "ignores a malformed revision %p",
    async (cacheVersion) => {
      expect.assertions(1);
      stampPage(cacheVersion);
      const url = await fetchedTranslationUrl(Provider, { loadingPath: "/locales/{{lng}}/{{ns}}.json" });
      expect(url).toEqual("/locales/fr-FR/common.json");
    },
  );

  it("does not stamp translations of another origin with this page revision", async () => {
    expect.assertions(1);
    stampPage(REVISION);
    const url = await fetchedTranslationUrl(Provider, {
      loadingPath: "https://other.example/locales/{{lng}}/{{ns}}.json",
    });
    expect(url).toEqual("https://other.example/locales/fr-FR/common.json");
  });
});
