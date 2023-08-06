import React, { useRef, useEffect, useState } from 'react';
import { getXpathSelector, waitForElm, throttle } from "../utils/helpers"
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
    let addedMutations = [];
    let iframe;
    console.log("rendered")
    function switchControl() {
        const lockState = !isLockEnabled;
        SocketService.emit("setLockState", { iframeIndex, lockState });

        if (isLockEnabled) {
            waitForElm(document, `#controlSwitch${iframeIndex}`).then((ctrlSwitch) => {
                ctrlSwitch.removeEventListener('mousemove', throttledLockMouseMoveHandler)
            }).catch((err) => console.error(err));
            setLockEnabled(false);
        } else {
            setLockEnabled(true);
            waitForElm(document, `#controlSwitch${iframeIndex}`).then((ctrlSwitch) => {
                ctrlSwitch.addEventListener('mousemove', throttledLockMouseMoveHandler)
            }).catch((err) => console.error(err));
        }
    }

    const mouseMoveHandler = event => {
        if (iframe) {
            const { width, height } = iframe.getBoundingClientRect();
            const x = event.clientX / width;
            const y = event.clientY / height;
            SocketService.emit("mousemove", { x, y, iframeIndex });
        } else {
            iframe = document.querySelector(`#iframe_${iframeIndex}`);
        }
    }
    const throttledMouseMoveHandler = throttle(mouseMoveHandler, 40);

    const lockMouseMoveHandler = event => {
        if (iframe) {
            const { width, height } = iframe.getBoundingClientRect();
            const x = event.layerX / width;
            const y = event.layerY / height;
            if (!isFinite(x) || !isFinite(y)) {
                return;
            }
            SocketService.emit("mousemove", { x, y, iframeIndex });
        } else {
            iframe = document.querySelector(`#iframe_${iframeIndex}`);
        }
    }
    const throttledLockMouseMoveHandler = throttle(lockMouseMoveHandler, 40);

    const mouseClickHandler = event => {
        const selectorString = getXpathSelector(event.target);
        if (selectorString.includes("canvas")) {
            return
        }
        SocketService.emit("mousedown", { selectorString, iframeIndex });
    }

    const canvasNavigationHandler = event => {
        const canvas = iframe.contentWindow.document.querySelector("div.mapboxgl-canvas-container");
        if (!canvas) {
            return;
        }
        setTimeout(function () {
            const currentUrl = document.querySelector(`#iframe_${iframeIndex}`).contentWindow.location.href;
            SocketService.emit("canvasnavigation", { currentUrl, iframeIndex });
        }, 100);
    }

    const mouseWheelHandler = event => {
        if (iframe) {
            const scrollY = event.deltaY;
            const { width, height } = iframe.getBoundingClientRect();
            const x = event.clientX / width;
            const y = event.clientY / height;

            SocketService.emit("mousewheel", { scrollY, x, y, iframeIndex });
        } else {
            iframe = document.querySelector(`#iframe_${iframeIndex}`);
        }
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
                }
                return;
            }
            if (elem.type === 'attributes' && elem.attributeName === "style") {
                const changedAttribute = elem.attributeName;
                const mutationTarget = getXpathSelector(elem.target);
                const mutationValue = elem.target.attributes[elem.attributeName].value;
                const mutatedElemHTML = elem.target.innerHTML;

                SocketService.emit("modifiedAttributeRecord", {
                    changedAttribute, mutationTarget, mutationValue, mutatedElemHTML, iframeIndex
                });
                return;
            }
        })
    })

    useEffect(() => {

        iframe = ref.current;
        const lock = lockRef.current;
        if (lock) {
            lock.addEventListener('mousemove', throttledLockMouseMoveHandler, { passive: true });
        }
        let appWindow; let map;
        iframe.addEventListener("load", () => {
            appWindow = iframe.contentWindow.document.getElementById("root");
            appWindow.addEventListener("mousemove", throttledMouseMoveHandler);
            appWindow.addEventListener("mousedown", mouseClickHandler);
            appWindow.addEventListener("wheel", mouseWheelHandler);
            appWindow.addEventListener("mouseup", canvasNavigationHandler);
            waitForElm(iframe.contentWindow.document, "div.mapboxgl-map").then((mapRef) => {
                map = mapRef;
                console.log(map)
                observer.observe(map, { attributes: true, childList: true, subtree: true });
            }).catch((err) => console.error(err));
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

        const handleRemoteLockStateChange = (data) => {
            if (data.lockState) {
                waitForElm(document, `#controlSwitch${iframeIndex}`).then((ctrlSwitch) => {
                    ctrlSwitch.removeEventListener('mousemove', throttledLockMouseMoveHandler)
                }).catch((err) => console.error(err));
                setLockEnabled(false);
            } else {
                setLockEnabled(true);
                waitForElm(document, `#controlSwitch${iframeIndex}`).then((ctrlSwitch) => {
                    ctrlSwitch.addEventListener('mousemove', throttledLockMouseMoveHandler)
                }).catch((err) => console.error(err));
            }
        }

        SocketService.on(`addMut${iframeIndex}`, handleAddMutation, { passive: true });
        SocketService.on(`deleteMut${iframeIndex}`, handleDeleteMutation, { passive: true });
        SocketService.on(`modifyMut${iframeIndex}`, handleModifyMutation, { passive: true });
        SocketService.on(`setLockStateValue${iframeIndex}`, handleRemoteLockStateChange, { passive: true });

        const urlObserver = setInterval(() => {
            if (currentPage !== iframe.contentWindow.location.href) {
                const canvas = iframe.contentWindow.document.querySelector("canvas");
                currentPage = iframe.contentWindow.location.href;
                if (!canvas) {
                    observer.disconnect();
                    return;
                }
                const mapRef = iframe.contentWindow.document.querySelector("div.mapboxgl-map")
                observer.observe(mapRef, { attributes: true, childList: true, subtree: true });
            }
        }, 3000);

        return () => {
            // console.log(appWindow, iframe)
            if (!appWindow) {
                appWindow = iframe.contentWindow.document.getElementById("root");
            }
            appWindow.removeEventListener("mousemove", throttledMouseMoveHandler);
            appWindow.removeEventListener("mousedown", mouseClickHandler);
            appWindow.removeEventListener("wheel", mouseWheelHandler);
            if (lock) {
                console.log("lock removed")
                lock.removeEventListener('mousemove', throttledLockMouseMoveHandler);
            }
            observer.disconnect();
            clearInterval(urlObserver);
            SocketService.off(`addMut${iframeIndex}`, handleAddMutation);
            SocketService.off(`deleteMut${iframeIndex}`, handleDeleteMutation);
            SocketService.off(`modifyMut${iframeIndex}`, handleModifyMutation);
            SocketService.off(`remoteLockStateChange${iframeIndex}`, handleRemoteLockStateChange);
            console.log("unmounted")
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
                    cursor: 'not-allowed'
                }}></div>
            )}
            <iframe ref={ref} id={"iframe_" + iframeIndex}
                src={iframeUrl} style={{
                    ...(isLockEnabled ?
                        { border: "5px solid #b22222" } :
                        { border: "3px solid #ffcc66" })
                }}></iframe>
            <Container>
                <AppBar position="relative" color="primary" sx={{ backgroundColor: '#000000' }}>
                    <Toolbar sx={{ justifyContent: 'center', alignItems: 'center' }}>
                        <Button variant="contained" sx={{
                            '&:hover': {
                                backgroundColor: '#ff6611'
                            },
                            ...(isLockEnabled ? { backgroundColor: '#ff8822' } : { backgroundColor: '#b22222' })
                        }}
                            onClick={() => {
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