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

// The frontend revision stamped by the server templates on the stylesheet manager.
const FRONTEND_REVISION_PATTERN = /^ui-[a-f0-9]{64}$/;

/**
 * The revision of the frontend served by this HTTP(S) page, if the page carries a valid one.
 * It is only used as a cache key, never trusted for anything else.
 * @param {Document} pageDocument
 * @returns {string|null}
 */
function getServedFrontendRevision(pageDocument) {
  if (!/^https?:$/.test(pageDocument.location?.protocol)) {
    return null;
  }
  const revision = pageDocument.querySelector("#stylesheet-manager[cache-version]")?.getAttribute("cache-version");
  return FRONTEND_REVISION_PATTERN.test(revision) ? revision : null;
}

/**
 * The URL of a translation file. On a page served by a stamped frontend, translation files of the same origin
 * carry its revision so a new release does not reuse cached translations. Other URLs are unchanged.
 * @param {string} loadingPath The path pattern, with {{lng}} and {{ns}} placeholders
 * @param {string} lng The locale requested by i18next
 * @param {string} ns The namespace
 * @param {Document} [pageDocument] The current page
 * @returns {string}
 */
export function getTranslationPath(loadingPath, lng, ns, pageDocument = document) {
  // i18next is doing a fallback on en-GB we are redirecting to our en-UK folder
  const actualLng = lng === "en-GB" ? "en-UK" : lng;
  const path = loadingPath.replace("{{lng}}", actualLng).replace("{{ns}}", ns);
  const revision = getServedFrontendRevision(pageDocument);
  if (!revision) {
    return path;
  }
  const url = new URL(path, pageDocument.location.href);
  if (url.origin !== pageDocument.location.origin) {
    return path;
  }
  url.searchParams.set("v", revision);
  return url.href;
}
