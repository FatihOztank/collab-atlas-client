import avatarImg  from "../public/images/avatar.png";

const bannedXPathSelectors = ["svg", "path"];

function returnIndexOfElement(elem) {
    const elems = elem?.parentNode.children;
    const length = elems.length;
    let index = 1;
    for (let i = 0; i < length; i++) {
        const _elem = elems[i];
        if (_elem === elem) {
            return index;
        }
        if (_elem.localName === elem.localName) index++;
    }
    return -1;
}


export function addItemToArray(arr, item, maxLen) {
    arr.length >= maxLen ? arr.shift() : null;
    arr.push(item);
}

export function getXpathSelector(elem) {
    if (elem.tagName.toLowerCase() == "html")
        return "/html[1]";
    let elemStr = elem.localName.toLowerCase();
    if (bannedXPathSelectors.indexOf(elemStr) !== -1) {
        return getXpathSelector(elem.parentNode)
    }
    const i = returnIndexOfElement(elem);
    return getXpathSelector(elem.parentNode) + `/${elemStr}[${i}]`;
}


export function executeClick(selectorString, iframeIndex) {
    if (typeof window === "undefined") {
        return;
    }
    const iframeDocument = document.querySelector(`#iframe_${iframeIndex}`).contentWindow.document;
    const elem = iframeDocument.evaluate(selectorString, iframeDocument, null,
        XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (elem?.localName !== "canvas") {
        elem.click();
    }
}


export function waitForElm(doc, selector) {
    return new Promise(resolve => {
        if (doc.querySelector(selector)) {
            return resolve(doc.querySelector(selector));
        }

        const observer = new MutationObserver(mutations => {
            if (doc.querySelector(selector)) {
                resolve(doc.querySelector(selector));
                observer.disconnect();
            }
        });
        observer.observe(doc, {
            childList: true,
            subtree: true,
            attributes: true
        });
    });
}

export function getIframeSize(iframeIndex) {
    const iframe = document.querySelector(`#iframe_${iframeIndex}`);
    if (!iframe) {
        return;
    }
    const { width, height } = iframe.getBoundingClientRect();
    return {width, height}
}

export function drawAvatar(iframeIndex, x, y) {
    if (typeof document === "undefined") {
        return;
    }

    const iframe = document.querySelector(`#iframe_${iframeIndex}`);
    const avatar = document.querySelector(`#avatar_${iframeIndex}`);
    const scaledX = (x) * 100;
    const scaledY = (y) * 100;

    if (!avatar) {
        var tempDiv = document.createElement("div");x   
        var avatarElem = document.createElement('img');
        avatarElem.setAttribute('id', `avatar_${iframeIndex}`);
        avatarElem.setAttribute('class', `avatar`);
        avatarElem.setAttribute('src', `${avatarImg.src}`);
        avatarElem.style.cssText = `width: 50px;
                                    height: 50px;
                                    top: ${scaledY}%;
                                    left: ${scaledX}%;
                                    position: absolute;
                                    opacity: 0.5;
                                    visibility: visible;
                                    z-index: 10;`;

        tempDiv.innerHTML = avatarElem.outerHTML;
        iframe.parentNode.appendChild(tempDiv.firstChild);
    } else {
        avatar.style.top = `${scaledY}%`;
        avatar.style.left = `${scaledX}%`;
    }
}
