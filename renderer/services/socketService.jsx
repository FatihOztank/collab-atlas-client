
import EventEmitter from "events";
import { io } from "socket.io-client";
import { executeClick, executeWheel, drawAvatar, handleCanvasNavigation } from "../utils/helpers";

export const SocketService = new EventEmitter();
// const ClientSocket = io.connect("http://3.74.211.170:8080/");
const ClientSocket = io.connect("http://localhost:8080/");

SocketService.on("mousemove", (data) => {
    ClientSocket.emit("mousemove", {
        x: data.x, y: data.y,
        iframeIndex: data.iframeIndex, isLocked: data.isLocked
    });
})

SocketService.on("mousedown", (data) => {
    ClientSocket.emit("mousedown", {
        selectorString: data.selectorString,
        iframeIndex: data.iframeIndex
    });
})

SocketService.on("mousewheel", (data) => {
    ClientSocket.emit("mousewheel", {
        scrollY: data.scrollY, iframeIndex: data.iframeIndex,
        scaledX: data.x, scaledY: data.y
    });
})

SocketService.on("canvasnavigation", (data) => {
    ClientSocket.emit("canvasnavigation", {
        iframeIndex: data.iframeIndex,
        canvasUrl: data.canvasUrl
    });
})

SocketService.on("canvasclick", (data) => {
    ClientSocket.emit("canvasclick", {
        iframeIndex: data.iframeIndex,
        x: data.x, y: data.y
    });
})

SocketService.on("setLockState", (data) => {
    ClientSocket.emit("setLockState", { iframeIndex: data.iframeIndex, lockState: data.lockState });
})

SocketService.on("iframeToggle", () => {
    ClientSocket.emit("opensecondiframe", {});
})

SocketService.on("syncrequest", () => {
    ClientSocket.emit("syncrequest", {});
})

ClientSocket.on("locationrecord", (data => {
    drawAvatar(data.iframeIndex, data.x, data.y);
    SocketService.emit(`mapboxmousemove${data.iframeIndex}`, {
        x: data.x, y: data.y,
        isLocked: data.isLocked
    })
}))

ClientSocket.on("eventrecord", (data) => {
    executeClick(data.selectorString, data.iframeIndex);
})

ClientSocket.on("scrollrecord", (data) => {
    executeWheel(data.scrollY, data.iframeIndex, data.scaledX, data.scaledY);
})

ClientSocket.on("canvasnavigationrecord", (data) => {
    SocketService.emit(`mapboxnavigation${data.iframeIndex}`, {
        canvasUrl: data.canvasUrl
    });
})

ClientSocket.on("canvasclickrecord", (data) => {
    SocketService.emit(`mapboxclick${data.iframeIndex}`, {
        x: data.x, y: data.y
    });
})

ClientSocket.on("secondiframeopened", () => {
    SocketService.emit("secondIframeToggled", {});
})

ClientSocket.on("setLockStateValue", (data) => {
    SocketService.emit(`setLockStateValue${data.iframeIndex}`, { lockState: data.lockState });
})

ClientSocket.on("syncrequestrecord", (data) => {
    SocketService.emit(`_syncrequestrecord`, {});
})

