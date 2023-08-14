import React, { useRef, useEffect, useState } from 'react';
import { getXpathSelector, waitForElm, throttle } from "../utils/helpers"
import { SocketService } from "../services/socketService"
import Button from '@mui/material/Button';
import { Container } from '@mui/material';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import styles from '../styles/CollabIframe.module.css'

export default function CollabIframe({ iframeIndex, iframeUrl }) {
    const iframeRef = useRef(null);
    const lockRef = useRef(null);
    const [isLockEnabled, setLockEnabled] = useState(true);
    let currentPage;

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
                ctrlSwitch.addEventListener('mousemove', throttledLockMouseMoveHandler, { passive: true })
            }).catch((err) => console.error(err));
        }
    }

    const mouseMoveHandler = event => {
        const iframe = iframeRef.current;
        if (iframe) {
            const { width, height } = iframe.getBoundingClientRect();
            const x = event.clientX / width;
            const y = event.clientY / height;
            const isLocked = !(lockRef.current === null);
            SocketService.emit("mousemove", { x, y, iframeIndex, isLocked });
        }
    }
    const throttledMouseMoveHandler = throttle(mouseMoveHandler, 40);

    const lockMouseMoveHandler = event => {
        const iframe = iframeRef.current;
        if (iframe) {
            const { width, height } = iframe.getBoundingClientRect();
            const x = event.layerX / width;
            const y = event.layerY / height;
            if (!isFinite(x) || !isFinite(y)) {
                return;
            }
            const isLocked = !(lockRef.current === null);
            SocketService.emit("mousemove", { x, y, iframeIndex, isLocked });
        }
    }
    const throttledLockMouseMoveHandler = throttle(lockMouseMoveHandler, 40);

    const mouseClickHandler = event => {
        const selectorString = getXpathSelector(event.target);
        if (selectorString.includes("canvas")) {
            const iframe = iframeRef.current;
            const { width, height } = iframe.getBoundingClientRect();
            const x = event.clientX / width;
            const y = event.clientY / height;
            SocketService.emit("canvasclick", { iframeIndex, x, y });
            return
        }
        SocketService.emit("mousedown", { selectorString, iframeIndex });
    }

    const mouseWheelHandler = event => {
        const iframe = iframeRef.current;
        if (iframe) {
            const scrollY = event.deltaY;
            const { width, height } = iframe.getBoundingClientRect();
            const x = event.clientX / width;
            const y = event.clientY / height;

            SocketService.emit("mousewheel", { scrollY, x, y, iframeIndex });
        }
    }

    const mapboxMouseMoveHandler = data => {
        const iframe = iframeRef.current;
        const canvas = iframe.contentWindow.document.querySelector("div.mapboxgl-canvas-container");

        if (!canvas || data.isLocked) {
            return;
        }
        const { width, height } = iframe.getBoundingClientRect();
        const x = data.x * width;
        const y = data.y * height;
        const event = new MouseEvent('mousemove', {
            bubbles: false,
            cancelable: true,
            view: iframe.contentWindow,
            clientX: x,
            clientY: y,
        });
        canvas.dispatchEvent(event);
    }
    const throttledMapboxMouseMoveHandler = throttle(mapboxMouseMoveHandler, 20);


    const mapboxMouseClickHandler = data => {
        const iframe = iframeRef.current;
        const canvas = iframe.contentWindow.document.querySelector("div.mapboxgl-canvas-container");

        if (!canvas) {
            return;
        }
        const { width, height } = iframe.getBoundingClientRect();
        const x = data.x * width;
        const y = data.y * height;
        const event = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: iframe.contentWindow,
            clientX: x,
            clientY: y,
        });
        canvas.dispatchEvent(event);
    }

    const mapboxNavigationHandler = data => {
        const iframe = iframeRef.current;
        if (iframe) {
            iframe.src = data.canvasUrl;
        }
    }

    useEffect(() => {

        const iframe = iframeRef.current;
        const lock = lockRef.current;
        if (lock) {
            lock.addEventListener('mousemove', throttledLockMouseMoveHandler, { passive: true });
        }
        let appWindow;
        iframe.addEventListener("load", () => {
            appWindow = iframe.contentWindow.document.querySelector("body");
            iframe.contentWindow.localStorage.clear();
            appWindow.addEventListener("mousemove", throttledMouseMoveHandler, { passive: true });
            appWindow.addEventListener("mousedown", mouseClickHandler, { passive: true });
            appWindow.addEventListener("wheel", mouseWheelHandler, { passive: true });
            currentPage = iframe.contentWindow.location.href;
        })

        const handleRemoteLockStateChange = (data) => {
            if (data.lockState) {
                waitForElm(document, `#controlSwitch${iframeIndex}`).then((ctrlSwitch) => {
                    ctrlSwitch.removeEventListener('mousemove', throttledLockMouseMoveHandler)
                }).catch((err) => console.error(err));
                setLockEnabled(false);
            } else {
                setLockEnabled(true);
                waitForElm(document, `#controlSwitch${iframeIndex}`).then((ctrlSwitch) => {
                    ctrlSwitch.addEventListener('mousemove', throttledLockMouseMoveHandler, { passive: true })
                }).catch((err) => console.error(err));
            }
        }

        SocketService.on(`setLockStateValue${iframeIndex}`, handleRemoteLockStateChange, { passive: true });
        SocketService.on(`mapboxmousemove${iframeIndex}`, throttledMapboxMouseMoveHandler, { passive: true });
        SocketService.on(`mapboxclick${iframeIndex}`, mapboxMouseClickHandler, { passive: true });
        SocketService.on(`mapboxnavigation${iframeIndex}`, mapboxNavigationHandler, { passive: true });

        const urlObserver = setInterval(() => {
            const iframe = iframeRef.current;
            const isLocked = !(lockRef.current === null);
            if (currentPage !== iframe.contentWindow.location.href) {
                const canvas = iframe.contentWindow.document.querySelector("div.mapboxgl-canvas-container");
                if (!canvas || isLocked) {
                    return;
                }
                currentPage = iframe.contentWindow.location.href;
                SocketService.emit("canvasnavigation", { canvasUrl: currentPage, iframeIndex: iframeIndex });
            }
        }, 250);

        return () => {
            if (!appWindow) {
                appWindow = iframe.contentWindow.document.querySelector("body");
            }
            appWindow.removeEventListener("mousemove", throttledMouseMoveHandler);
            appWindow.removeEventListener("mousedown", mouseClickHandler);
            appWindow.removeEventListener("wheel", mouseWheelHandler);
            if (lock) {
                lock.removeEventListener('mousemove', throttledLockMouseMoveHandler);
            }
            clearInterval(urlObserver);
            SocketService.off(`remoteLockStateChange${iframeIndex}`, handleRemoteLockStateChange);
            SocketService.off(`mapboxmousemove${iframeIndex}`, throttledMapboxMouseMoveHandler);
            SocketService.off(`mapboxclick${iframeIndex}`, mapboxMouseClickHandler);
            SocketService.off(`mapboxnavigation${iframeIndex}`, mapboxNavigationHandler);
        }
    }, [])
    return (
        <>
            {isLockEnabled && (
                <div
                    ref={lockRef}
                    id={"controlSwitch" + iframeIndex}
                    className={styles.lockLayer}
                ></div>
            )}
            <iframe
                ref={iframeRef}
                id={"iframe_" + iframeIndex}
                src={iframeUrl}
                className={isLockEnabled ? styles.iframeLocked : styles.iframeUnlocked}
            ></iframe>
            <Container>
                <AppBar position="relative" color="primary" className={styles.appBar}>
                    <Toolbar sx={{ justifyContent: 'center', alignItems: 'center' }}>
                        <Button
                            variant="contained"
                            className={`hover:${styles.buttonHover} ${isLockEnabled ? styles.buttonEnabled : styles.buttonDisabled}`}
                            sx={{
                                '&:hover': {
                                    backgroundColor: '#ff6611'
                                },
                                ...(isLockEnabled ? { backgroundColor: '#ff8822' } : { backgroundColor: '#b22222' })
                            }}
                            onClick={() => {
                                switchControl();
                            }}
                        >
                            {isLockEnabled ? 'Enable' : 'Disable'} Controls
                        </Button>
                    </Toolbar>
                </AppBar>
            </Container>
        </>
    )
}