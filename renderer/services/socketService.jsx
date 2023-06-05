
import EventEmitter from "events";
import { io } from "socket.io-client";
import { executeClick, executeWheel, drawAvatar } from "../utils/helpers";

export const SocketService = new EventEmitter();
// const ClientSocket = io.connect("https://auspicious-silo-283816.lm.r.appspot.com/");
const ClientSocket = io.connect("http://localhost:8080/");

SocketService.on("mousemove", (data) => {
    const x = data.x;
    const y = data.y;
    const iframeIndex = data.iframeIndex;
    ClientSocket.emit("mousemove", { x, y, iframeIndex });
})

SocketService.on("mousedown", (data) => {
    const selectorString = data.selectorString;
    const iframeIndex = data.iframeIndex;
    ClientSocket.emit("mousedown", { selectorString, iframeIndex });
})

SocketService.on("mousewheel", (data) => {
    const scrollY = data.scrollY;
    const iframeIndex = data.iframeIndex;
    const scaledX = data.x;
    const scaledY = data.y;
    ClientSocket.emit("mousewheel", { scrollY, iframeIndex, scaledX, scaledY });
})

SocketService.on("addedmutationrecord", (data) => {
    const mutationTarget = data.mutationTarget;
    const addedElemHTML = data.addedElemHTML;
    const iframeIndex = data.iframeIndex;
    ClientSocket.emit("addedmutationrecord", {
        mutationTarget, addedElemHTML, iframeIndex
    })

})

SocketService.on("removedmutationrecord", (data) => {
    const iframeIndex = data.iframeIndex;
    ClientSocket.emit("removedmutationrecord", { iframeIndex });
})

SocketService.on("modifiedAttributeRecord", (data) => {
    const changedAttribute = data.changedAttribute; 
    const mutationTarget = data.mutationTarget;
    const mutationValue = data.mutationValue;
    const mutatedElemHTML = data.mutatedElemHTML;
    const iframeIndex = data.iframeIndex;

    ClientSocket.emit("modifiedAttributeRecord", {
        changedAttribute, mutationTarget, mutationValue, 
        mutatedElemHTML, iframeIndex
    });
})

SocketService.on("iframeToggle", () => {
    ClientSocket.emit("opensecondiframe", {});
})

ClientSocket.on("locationrecord", (data => {
    drawAvatar(data.iframeIndex, data.x, data.y);

}))

ClientSocket.on("eventrecord", (data) => {
    executeClick(data.selectorString, data.iframeIndex);
})

ClientSocket.on("scrollrecord", (data) => {
    executeWheel(data.scrollY, data.iframeIndex, data.scaledX, data.scaledY);
})

ClientSocket.on("addedmutation", (data) => {
    const mutationTarget = data.mutationTarget;
    const addedElemHTML = data.addedElemHTML;
    SocketService.emit(`addMut${data.iframeIndex}`, { mutationTarget, addedElemHTML });
})

ClientSocket.on("deletemutations", (data) => {
    SocketService.emit(`deleteMut${data.iframeIndex}`);
})

ClientSocket.on("attributeModify", (data) => {
    const changedAttribute = data.changedAttribute; 
    const mutationTarget = data.mutationTarget;
    const mutationValue = data.mutationValue;
    const mutatedElemHTML = data.mutatedElemHTML;

    SocketService.emit(`modifyMut${data.iframeIndex}`, {
        changedAttribute, mutationTarget, mutationValue, mutatedElemHTML
    });
})

ClientSocket.on("secondiframeopened",() => {
    SocketService.emit("secondIframeToggled", {});
})


