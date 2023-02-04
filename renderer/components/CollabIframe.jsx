import { useRef, useEffect } from "react";
import { getXpathSelector, addItemToArray, waitForElm } from "../utils/helpers"
import { SocketService } from "../services/socketService"
import MutationObserver from "mutation-observer"


export default function CollabIframe({ iframeIndex }) {
    const ref = useRef(null);
    let currentPage;
    let localMutationRecords = [];
    let addedMutations = [];
    const maxNumOfRecords = 5;

    const mouseMoveHandler = event => {
        const iframe = document.querySelector(`#iframe_${iframeIndex}`);
        if (iframe) {
            const { width, height } = iframe.getBoundingClientRect();

            const x = event.clientX / width;
            const y = event.clientY / height;
            SocketService.emit("mousemove", { x, y, iframeIndex });
        }

    }

    const mouseClickHandler = event => {
        const selectorString = getXpathSelector(event.target);
        if (selectorString.includes("canvas")) {
            return
        }
        SocketService.emit("mousedown", { selectorString, iframeIndex });
    }

    const observer = new MutationObserver(mutations => {
        mutations.forEach(elem => {
            if (elem.removedNodes.length > 0) {
                // console.log(ref.current)
                const popup = ref.current.contentWindow.document.querySelector(".floating-popup")
                // console.log(popup, ref.current, "popup")
                if (popup === null) {
                    SocketService.emit("removedmutationrecord", { iframeIndex });
                }
                return;
            }
            if (elem.addedNodes.length > 0) {
                const mutationTarget = getXpathSelector(elem.target);
                const addedElemHTML = elem.addedNodes[0].outerHTML;
                // console.log(addedElemHTML, "aaaaa" , mutations.length)
                if (addedElemHTML) {
                    console.log("main", elem.addedNodes[0], elem.target)
                    SocketService.emit("addedmutationrecord", { mutationTarget, addedElemHTML, iframeIndex });
                    addItemToArray(localMutationRecords, elem.addedNodes[0], maxNumOfRecords);
                }
                return;
            }
            if (elem.type === 'attributes') {
                const indexofMut = localMutationRecords.indexOf(elem.target);
                if (indexofMut === -1)
                    return;

                const changedAttribute = elem.attributeName;
                const mutationTarget = getXpathSelector(elem.target);
                const mutationValue = elem.target.attributes[elem.attributeName].value;
                const mutatedElemHTML = elem.target.innerHTML;

                SocketService.emit("modifiedAttributeRecord", {
                    changedAttribute, mutationTarget, mutationValue, mutatedElemHTML, iframeIndex
                });

            }
        })
    })
    // console.log(ref.current);

    useEffect(() => {
        // console.log(addedMutations, localMutationRecords, "on init?")

        const iframe = ref.current;
        let appWindow; let map;
        iframe.addEventListener("load", async () => {

            appWindow = iframe.contentWindow.document.getElementById("root");
            appWindow.addEventListener("mousemove", mouseMoveHandler);
            appWindow.addEventListener("mousedown", mouseClickHandler);
            map = await waitForElm(iframe.contentWindow.document, "div.mapboxgl-map");
            observer.observe(map, { attributes: true, childList: true, subtree: true });
            currentPage = iframe.contentWindow.location.href;

        })

        SocketService.on(`addMut${iframeIndex}`, (data) => {
            if (!map || (iframe.contentWindow === null)) {
                return;
            }
            observer.disconnect();
            const mapRef = iframe.contentWindow.document.querySelector("div.mapboxgl-map");
            if (data.addedElemHTML) {
                var tempDiv = document.createElement('div');
                tempDiv.innerHTML = data.addedElemHTML;
                const mutationTarget = iframe.contentWindow.document.evaluate(
                    data.mutationTarget, iframe.contentWindow.document, null,
                    XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

                if ((mutationTarget === mapRef) || (mutationTarget === addedMutations.at(-1))) {
                    mutationTarget.appendChild(tempDiv.firstChild);
                    addedMutations.push(mutationTarget.lastChild);
                    console.log("receiver", mutationTarget.lastChild);
                }
                tempDiv.remove();
            }
            if (mapRef) {
                observer.observe(mapRef, { attributes: true, childList: true, subtree: true });
            }
        })

        SocketService.on(`deleteMut${iframeIndex}`, () => {
            if (!map || (iframe.contentWindow === null)) {
                return;
            }
            observer.disconnect();
            console.log("delete mut")
            addedMutations.forEach((mut) => {
                mut?.remove();
            })
            const mapRef = iframe.contentWindow.document.querySelector("div.mapboxgl-map");
            if (mapRef) {
                observer.observe(mapRef, { attributes: true, childList: true, subtree: true });
            }

        })

        SocketService.on(`modifyMut${iframeIndex}`, (data) => {
            if (!map || (iframe.contentWindow === null)) {
                return;
            }
            observer.disconnect();
            const mutationTarget = iframe.contentWindow.document.evaluate(data.mutationTarget,
                iframe.contentWindow.document, null,
                XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

            // console.log("modify mut", mutationTarget)
            if (mutationTarget) {
                mutationTarget.innerHTML = data.mutatedElemHTML;
                mutationTarget.attributes[data.changedAttribute].value = data.mutationValue;
            }

            const mapRef = iframe.contentWindow.document.querySelector("div.mapboxgl-map");
            if (mapRef) {
                observer.observe(mapRef, { attributes: true, childList: true, subtree: true });
            }
        })

        const urlObserver = setInterval(() => {
            if (currentPage !== iframe.contentWindow.location.href) {

                const canvas = iframe.contentWindow.document.querySelector("canvas");
                currentPage = iframe.contentWindow.location.href;
                if (!canvas) {
                    observer.disconnect();
                } else {
                    const mapRef = iframe.contentWindow.document.querySelector("div.mapboxgl-map")
                    observer.observe(mapRef, { attributes: true, childList: true, subtree: true });
                }
            }
        }, 500);



        return () => {
            // appWindow.removeEventListener("mousemove", mouseMoveHandler);
            // appWindow.removeEventListener("mousedown", mouseClickHandler);
            observer.disconnect();
            clearInterval(urlObserver);
        }
    }, [])
    return (
        <iframe ref={ref} id={"iframe_" + iframeIndex}
            src="http://52.87.229.169:3000/explore/rochester#map=9.64/43.1556/-77.685"></iframe>
    )
}