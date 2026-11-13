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
 * @since         5.15.0
 */

import InFormMenuField from "./InformMenuField";
import InFormFieldGeometryService from "./InFormFieldGeometryService";
import { initializeWindow } from "./InformManager.test.data";

describe("InFormMenuField", () => {
  beforeAll(() => {
    initializeWindow();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    document.body.innerHTML = "";
  });

  const buildMenuField = () => {
    const field = document.createElement("input");
    field.type = "text";
    document.body.appendChild(field);
    const host = document.createElement("div");
    const shadowRoot = host.attachShadow({ mode: "open" });
    document.body.appendChild(host);

    /** Mock create element to add a content window property in the iframe due to jest issue with iframe in shadow dom **/
    const iframe = document.createElement("iframe");
    jest.spyOn(document, "createElement").mockImplementation((elementName) => {
      if (elementName === "iframe") {
        const iframeMock = iframe.cloneNode();
        Object.defineProperty(iframeMock, "contentWindow", {
          value: {},
        });
        return iframeMock;
      }

      return Document.prototype.createElement.call(document, elementName);
    });

    jest.spyOn(InFormMenuField.prototype, "insertInformMenuIframe");
    return new InFormMenuField(field, shadowRoot);
  };

  describe("InFormMenuField::constructor", () => {
    it("should initialize the field, the shadow root and the scroll parent", () => {
      expect.assertions(5);

      const menuField = buildMenuField();

      expect(menuField.field).toBe(document.querySelector("input"));
      expect(menuField.shadowRoot.host).toBe(document.querySelector("div"));
      expect(menuField.isMenuMousingOver).toBe(false);
      expect(menuField.scrollableFieldParent).toBe(window);
      expect(menuField.insertInformMenuIframe).toHaveBeenCalledTimes(1);
    });
  });

  describe("InFormMenuField::insertInformMenuIframe", () => {
    it("should not create a second iframe when one is already inserted", async () => {
      expect.assertions(1);

      const menuField = buildMenuField();
      const iframe = document.createElement("iframe");
      iframe.id = menuField.iframeId;
      menuField.shadowRoot.appendChild(iframe);
      menuField.createMenuIframe = jest.fn();

      await menuField.insertInformMenuIframe();

      expect(menuField.createMenuIframe).not.toHaveBeenCalled();
    });

    it("should create the iframe and handle its click", async () => {
      expect.assertions(2);

      const menuField = buildMenuField();
      const iframe = { addEventListener: jest.fn() };
      menuField.createMenuIframe = jest.fn().mockResolvedValue(iframe);
      menuField.handleMenuClicked = jest.fn();

      await menuField.insertInformMenuIframe();

      expect(menuField.createMenuIframe).toHaveBeenCalledTimes(1);
      expect(menuField.handleMenuClicked).toHaveBeenCalledWith(iframe);
    });
  });

  describe("InFormMenuField::calculateIframePosition", () => {
    it("should position the menu below the field, right-aligned", () => {
      expect.assertions(1);

      const menuField = buildMenuField();
      jest
        .spyOn(menuField.field, "getBoundingClientRect")
        .mockReturnValue({ top: 100, left: 500, width: 300, height: 40 });

      expect(menuField.calculateIframePosition()).toEqual({ top: 140, left: 433 });
    });

    it("should position the menu taking account of shadow root host", () => {
      expect.assertions(1);

      const menuField = buildMenuField();
      jest
        .spyOn(menuField.field, "getBoundingClientRect")
        .mockReturnValue({ top: 100, left: 500, width: 300, height: 40 });
      jest
        .spyOn(menuField.shadowRoot.host, "getBoundingClientRect")
        .mockReturnValue({ top: 10, left: 20, width: 0, height: 0 });

      expect(menuField.calculateIframePosition()).toEqual({ top: 130, left: 413 });
    });

    it("should prevent negative coordinates", () => {
      expect.assertions(1);

      const menuField = buildMenuField();
      jest.spyOn(menuField.field, "getBoundingClientRect").mockReturnValue({ top: 10, left: 0, width: 20, height: 20 });

      expect(menuField.calculateIframePosition()).toEqual({ top: 30, left: 0 });
    });
  });

  describe("InFormMenuField::handleMenuClicked", () => {
    it("should track the mouse over the menu iframe state", () => {
      expect.assertions(3);

      const menuField = buildMenuField();
      const iframe = { addEventListener: jest.fn() };

      menuField.handleMenuClicked(iframe);

      expect(iframe.addEventListener).toHaveBeenCalledTimes(2);

      const mouseOverHandler = iframe.addEventListener.mock.calls.find(([event]) => event === "mouseover")[1];
      const mouseOutHandler = iframe.addEventListener.mock.calls.find(([event]) => event === "mouseout")[1];
      mouseOverHandler();

      expect(menuField.isMenuMousingOver).toBe(true);

      mouseOutHandler();

      expect(menuField.isMenuMousingOver).toBe(false);
    });
  });

  /**
   * Insert the menu iframe as the extension would and report a given shadow root active element.
   * @param {InFormMenuField} menuField
   * @param {function(HTMLIFrameElement): (Element|null)} getActiveElement
   */
  const focusInShadowRoot = (menuField, getActiveElement) => {
    const iframe = document.createElement("iframe");
    iframe.id = menuField.iframeId;
    menuField.shadowRoot.appendChild(iframe);
    Object.defineProperty(menuField.shadowRoot, "activeElement", {
      configurable: true,
      get: () => getActiveElement(iframe),
    });
    return iframe;
  };

  describe("InFormMenuField::removeInFormMenu", () => {
    it("should not remove the iframe when the focus moved into its own menu iframe", () => {
      expect.assertions(1);

      const menuField = buildMenuField();
      focusInShadowRoot(menuField, (iframe) => iframe);
      menuField.removeIframe = jest.fn();

      menuField.removeInFormMenu();

      expect(menuField.removeIframe).not.toHaveBeenCalled();
    });

    it("should remove the iframe when the focus is in another iframe of the shadow root", () => {
      expect.assertions(1);

      const menuField = buildMenuField();
      const otherIframe = document.createElement("iframe");
      menuField.shadowRoot.appendChild(otherIframe);
      focusInShadowRoot(menuField, () => otherIframe);
      menuField.removeIframe = jest.fn();

      menuField.removeInFormMenu();

      expect(menuField.removeIframe).toHaveBeenCalledTimes(1);
    });

    it("should remove the menu when its iframe is missing and nothing is focused in the shadow root", () => {
      expect.assertions(1);

      // A missing iframe and no active element must not count as "the menu iframe is focused" (null === null).
      const menuField = buildMenuField();
      Object.defineProperty(menuField.shadowRoot, "activeElement", { configurable: true, get: () => null });
      menuField.removeIframe = jest.fn();

      menuField.removeInFormMenu();

      expect(menuField.removeIframe).toHaveBeenCalledTimes(1);
    });

    it("should remove the iframe when the focus left even if the pointer is still over the menu", () => {
      expect.assertions(1);

      const menuField = buildMenuField();
      focusInShadowRoot(menuField, () => null);
      menuField.isMenuMousingOver = true;
      menuField.removeIframe = jest.fn();

      menuField.removeInFormMenu();

      expect(menuField.removeIframe).toHaveBeenCalledTimes(1);
    });

    it("should not remove the iframe when the field is the active element", () => {
      expect.assertions(1);

      const menuField = buildMenuField();
      menuField.field.focus();
      menuField.removeIframe = jest.fn();

      menuField.removeInFormMenu();

      expect(menuField.removeIframe).not.toHaveBeenCalled();
    });

    it("should remove the iframe", () => {
      expect.assertions(1);

      const menuField = buildMenuField();
      menuField.removeIframe = jest.fn();

      menuField.removeInFormMenu();

      expect(menuField.removeIframe).toHaveBeenCalledTimes(1);
    });
  });

  describe("InFormMenuField::handleRemoveEvent", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should listen on capture to the focus changes of the field document", () => {
      expect.assertions(3);

      const addListenerSpy = jest.spyOn(document, "addEventListener");
      const menuField = buildMenuField();

      ["focusout", "focus", "pointerdown"].forEach((event) =>
        expect(addListenerSpy).toHaveBeenCalledWith(event, menuField.scheduleFocusCheck, true),
      );
    });

    it("should listen to the host document too when the field is in another document", () => {
      expect.assertions(2);

      const menuField = buildMenuField();
      const frameDocument = document.implementation.createHTMLDocument("frame");
      menuField.field = frameDocument.body.appendChild(frameDocument.createElement("input"));
      const frameListenerSpy = jest.spyOn(frameDocument, "addEventListener");
      const hostListenerSpy = jest.spyOn(document, "addEventListener");

      menuField.handleRemoveEvent();

      expect(frameListenerSpy).toHaveBeenCalledWith("focusout", menuField.scheduleFocusCheck, true);
      expect(hostListenerSpy).toHaveBeenCalledWith("focusout", menuField.scheduleFocusCheck, true);
    });

    it("should check the focus only once the focus change settled, on the next task", () => {
      expect.assertions(2);

      const menuField = buildMenuField();
      focusInShadowRoot(menuField, () => null);
      menuField.removeIframe = jest.fn();

      menuField.field.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
      document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
      expect(menuField.removeIframe).not.toHaveBeenCalled();

      jest.advanceTimersByTime(0);
      expect(menuField.removeIframe).toHaveBeenCalledTimes(1);
    });

    it("should keep the menu when the settled focus is in its own iframe", () => {
      expect.assertions(1);

      const menuField = buildMenuField();
      focusInShadowRoot(menuField, (iframe) => iframe);
      menuField.removeIframe = jest.fn();

      menuField.field.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
      jest.advanceTimersByTime(0);

      expect(menuField.removeIframe).not.toHaveBeenCalled();
    });
  });

  describe("InFormMenuField::removeIframe", () => {
    it("should remove the matching iframe and disconnect its port", () => {
      expect.assertions(2);

      const menuField = buildMenuField();
      const iframe = document.createElement("iframe");
      iframe.id = menuField.iframeId;
      menuField.shadowRoot.appendChild(iframe);
      jest.spyOn(window.port, "emit");

      menuField.removeIframe();

      expect(menuField.shadowRoot.querySelector("iframe")).toBeNull();
      expect(window.port.emit).toHaveBeenCalledWith("passbolt.port.disconnect", "InFormMenu");
    });

    it("should not remove the other iframes", () => {
      expect.assertions(2);

      const menuField = buildMenuField();
      const iframe = document.createElement("iframe");
      iframe.id = "another-menu-iframe";
      menuField.shadowRoot.appendChild(iframe);
      jest.spyOn(window.port, "emit");

      menuField.removeIframe();

      expect(menuField.shadowRoot.querySelector("iframe")).toBe(iframe);
      expect(window.port.emit).not.toHaveBeenCalled();
    });
  });

  describe("InFormMenuField::handleScrollEvent", () => {
    it("should register a scroll listener on the field scroll parent", () => {
      expect.assertions(2);

      const scrollableParent = { addEventListener: jest.fn(), removeEventListener: jest.fn() };
      jest.spyOn(InFormFieldGeometryService, "getScrollParent").mockReturnValue(scrollableParent);

      const menuField = buildMenuField();

      expect(menuField.scrollableFieldParent).toBe(scrollableParent);
      expect(scrollableParent.addEventListener).toHaveBeenCalledWith("scroll", menuField.removeIframe);
    });
  });

  describe("InFormMenuField::destroy", () => {
    it("should remove everything", () => {
      expect.assertions(5);

      const scrollableParent = { addEventListener: jest.fn(), removeEventListener: jest.fn() };
      jest.spyOn(InFormFieldGeometryService, "getScrollParent").mockReturnValue(scrollableParent);
      const menuField = buildMenuField();
      const removeListenerSpy = jest.spyOn(document, "removeEventListener");
      menuField.removeIframe = jest.fn();

      menuField.destroy();

      ["focusout", "focus", "pointerdown"].forEach((event) =>
        expect(removeListenerSpy).toHaveBeenCalledWith(event, menuField.scheduleFocusCheck, true),
      );
      expect(scrollableParent.removeEventListener).toHaveBeenCalledWith("scroll", menuField.removeIframe);
      expect(menuField.removeIframe).toHaveBeenCalledTimes(1);
    });

    it("should cancel a pending focus check and stop listening", () => {
      expect.assertions(2);

      jest.useFakeTimers();
      const menuField = buildMenuField();
      const removeInFormMenuSpy = jest.spyOn(menuField, "removeInFormMenu");
      menuField.removeIframe = jest.fn();
      menuField.scheduleFocusCheck();

      menuField.destroy();
      jest.advanceTimersByTime(0);
      document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
      jest.advanceTimersByTime(0);

      expect(removeInFormMenuSpy).not.toHaveBeenCalled();
      expect(menuField.removeIframe).toHaveBeenCalledTimes(1);
      jest.useRealTimers();
    });
  });
});
