import React, { useRef, useEffect, useState } from 'react';
import { getXpathSelector, addItemToArray, waitForElm } from "../utils/helpers"
import { SocketService } from "../services/socketService"
import MutationObserver from "mutation-observer"
import Button from '@mui/material/Button';
import { Container } from '@mui/material';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';

export default function CollabIframe({ iframeIndex, iframeUrl }) {
    const ref = useRef(null);
    const lockRef = useRef(null);
    const [isLockEnabled, setLockEnabled] = useState(true);
    let currentPage;
    let localMutationRecords = [];
    let addedMutations = [];
    const maxNumOfRecords = 5;

    async function switchControl() {
        const lockState = !isLockEnabled;
        SocketService.emit("setLockState", { iframeIndex, lockState });
        setLockEnabled(!isLockEnabled);
        if (!isLockEnabled) {
            const ctrlSwitch = await waitForElm(document, `#controlSwitch${iframeIndex}`);
            ctrlSwitch.addEventListener('mousemove', lockMouseMoveHandler);
        }
    }

    const mouseMoveHandler = event => {
        const iframe = document.querySelector(`#iframe_${iframeIndex}`);
        if (iframe) {
            const { width, height } = iframe.getBoundingClientRect();

            const x = event.clientX / width;
            const y = event.clientY / height;
            SocketService.emit("mousemove", { x, y, iframeIndex });
        }
    }

    const lockMouseMoveHandler = event => {
        const iframe = document.querySelector(`#iframe_${iframeIndex}`);
        if (iframe) {
            const { width, height } = iframe.getBoundingClientRect();

            const x = event.layerX / width;
            const y = event.layerY / height;
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

    const canvasNavigationHandler = event => {
        const selectorString = getXpathSelector(event.target);
        if (!selectorString.includes("canvas")) {
            return
        }
        setTimeout(function () {
            const currentUrl = document.querySelector(`#iframe_${iframeIndex}`).contentWindow.location.href;
            SocketService.emit("canvasnavigation", { currentUrl, iframeIndex });
        }, 100); // Delay is in milliseconds
    }

    const mouseWheelHandler = event => {
        const iframe = document.querySelector(`#iframe_${iframeIndex}`);
        if (!iframe) {
            return;
        }
        const scrollY = event.deltaY;
        const { width, height } = iframe.getBoundingClientRect();
        const x = event.clientX / width;
        const y = event.clientY / height;

        SocketService.emit("mousewheel", { scrollY, x, y, iframeIndex });
    }

    const observer = new MutationObserver(mutations => {
        mutations.forEach(elem => {
            if (elem.removedNodes.length > 0) {
                const popup = ref.current.contentWindow.document.querySelector(".floating-popup")
                if (popup === null) {
                    SocketService.emit("removedmutationrecord", { iframeIndex });
                }
                return;
            }
            if (elem.addedNodes.length > 0) {
                const mutationTarget = getXpathSelector(elem.target);
                const addedElemHTML = elem.addedNodes[0].outerHTML;
                if (addedElemHTML) {
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

    useEffect(() => {

        const iframe = ref.current;
        const lock = lockRef.current;
        if (lock) {
            lock.addEventListener('mousemove', lockMouseMoveHandler);
        }
        let appWindow; let map;
        iframe.addEventListener("load", async () => {
            appWindow = iframe.contentWindow.document.getElementById("root");
            appWindow.addEventListener("mousemove", mouseMoveHandler);
            appWindow.addEventListener("mousedown", mouseClickHandler);
            appWindow.addEventListener("wheel", mouseWheelHandler);
            appWindow.addEventListener("mouseup", canvasNavigationHandler);
            map = await waitForElm(iframe.contentWindow.document, "div.mapboxgl-map");
            observer.observe(map, { attributes: true, childList: true, subtree: true });
            currentPage = iframe.contentWindow.location.href;
        })

        const handleAddMutation = (data) => {
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
                }
                tempDiv.remove();
            }
            if (mapRef) {
                observer.observe(mapRef, { attributes: true, childList: true, subtree: true });
            }
        }

        const handleDeleteMutation = () => {
            if (!map || (iframe.contentWindow === null)) {
                return;
            }
            observer.disconnect();
            addedMutations.forEach((mut) => {
                mut?.remove();
            })
            const mapRef = iframe.contentWindow.document.querySelector("div.mapboxgl-map");
            if (mapRef) {
                observer.observe(mapRef, { attributes: true, childList: true, subtree: true });
            }
        }

        const handleModifyMutation = (data) => {
            if (!map || (iframe.contentWindow === null)) {
                return;
            }
            observer.disconnect();
            const mutationTarget = iframe.contentWindow.document.evaluate(data.mutationTarget,
                iframe.contentWindow.document, null,
                XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

            if (mutationTarget) {
                mutationTarget.innerHTML = data.mutatedElemHTML;
                mutationTarget.attributes[data.changedAttribute].value = data.mutationValue;
            }

            const mapRef = iframe.contentWindow.document.querySelector("div.mapboxgl-map");
            if (mapRef) {
                observer.observe(mapRef, { attributes: true, childList: true, subtree: true });
            }
        }

        const handleRemoteLockStateChange = async (data) => {
            console.log("handleRemoteLockStateChange", data);
            setLockEnabled(!data.lockState);
            if (!isLockEnabled) {
                const ctrlSwitch = await waitForElm(document, `#controlSwitch${iframeIndex}`);
                ctrlSwitch.addEventListener('mousemove', lockMouseMoveHandler);
            }
        }



        SocketService.on(`addMut${iframeIndex}`, handleAddMutation);
        SocketService.on(`deleteMut${iframeIndex}`, handleDeleteMutation);
        SocketService.on(`modifyMut${iframeIndex}`, handleModifyMutation);
        SocketService.on(`setLockStateValue${iframeIndex}`, handleRemoteLockStateChange);

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
            appWindow.removeEventListener("mousemove", mouseMoveHandler);
            appWindow.removeEventListener("mousedown", mouseClickHandler);
            appWindow.removeEventListener("wheel", mouseWheelHandler);
            appWindow.removeEventListener("mouseup", canvasNavigationHandler);
            lock.removeEventListener('mousemove', lockMouseMoveHandler);
            observer.disconnect();
            clearInterval(urlObserver);
            SocketService.off(`addMut${iframeIndex}`, handleAddMutation);
            SocketService.off(`deleteMut${iframeIndex}`, handleDeleteMutation);
            SocketService.off(`modifyMut${iframeIndex}`, handleModifyMutation);
            SocketService.off(`remoteLockStateChange${iframeIndex}`, handleRemoteLockStateChange);
        }
    }, [])
    return (
        <>
            {isLockEnabled && (
                <div ref={lockRef} id={"controlSwitch" + iframeIndex} style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: 2,
                    background: 'transparent',
                }}></div>
            )}
            <iframe ref={ref} id={"iframe_" + iframeIndex}
                src={iframeUrl}></iframe>
            <Container>
                <AppBar position="relative" color="primary" sx={{ backgroundColor: '#000000' }}>
                    <Toolbar sx={{ justifyContent: 'center', alignItems: 'center' }}>
                        <Button variant="outlined" onClick={() => {
                            switchControl();
                        }}>
                            {isLockEnabled ? 'Enable' : 'Disable'} Controls
                        </Button>
                    </Toolbar>
                </AppBar>
            </Container>
        </>
    )
}