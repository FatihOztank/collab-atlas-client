import avatarImg from "../public/images/avatar.png";

const bannedXPathSelectors = ["svg", "path"];

function returnIndexOfElement(elem) {
    if (elem?.parentNode === null || elem?.parentNode === undefined) {
        return -1;
    }
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
    if (elem.parentNode === null || elem.parentNode === undefined) {
        return "";
    }
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
    if (elem && elem?.localName !== "canvas") {
        elem.click();
    }
}

export function executeWheel(scrollY, iframeIndex, eventX, eventY) {
    if (typeof window === "undefined") {
        return;
    }
    const iframe = document.querySelector(`#iframe_${iframeIndex}`);
    const canvas = iframe.contentWindow.document.querySelector("div.mapboxgl-canvas-container");
    const { width, height } = iframe.getBoundingClientRect();

    if (canvas) {
        var event = new WheelEvent('wheel', {
            clientX: eventX * width,
            clientY: eventY * height,
            deltaX: 0, deltaY: scrollY
        });
        canvas.dispatchEvent(event);
    } else {
        iframe.contentWindow.scrollBy(0, scrollY);
    }
}
export function handleCanvasNavigation(iframeIndex, canvasUrl) {
    if (typeof window === "undefined") {
        return;
    }
    document.querySelector(`#iframe_${iframeIndex}`).src = canvasUrl;
}

export function waitForElm(doc, selector) {
    return new Promise((resolve,reject) => {
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
        setTimeout(() => {
            observer.disconnect();
            reject(new Error('Element not found within time limit'));
        }, 5000);
    });
}


export function drawAvatar(iframeIndex, x, y) {
    if (typeof document === "undefined") {
        return;
    }

    const iframe = document.querySelector(`#iframe_${iframeIndex}`);
    const avatar = document.querySelector(`#avatar_${iframeIndex}`);
    const scaledX = (x) * 100;
    const scaledY = (y) * 100;

    if (!avatar && iframe) {
        var tempDiv = document.createElement("div");
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

export function throttle(func, limit) {
    let inThrottle;
    return function () {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}