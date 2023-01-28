
import EventEmitter from "events";
import { io } from "socket.io-client";
import { executeClick, drawAvatar } from "../utils/helpers";

export const SocketService = new EventEmitter();
const clientSocket = io.connect("https://auspicious-silo-283816.lm.r.appspot.com/");

SocketService.on("mousemove", (data) => {
    const x = data.x;
    const y = data.y;
    const iframeIndex = data.iframeIndex;
    clientSocket.emit("mousemove", { x, y, iframeIndex });
})

SocketService.on("mousedown", (data) => {
    const selectorString = data.selectorString;
    const iframeIndex = data.iframeIndex;
    clientSocket.emit("mousedown", { selectorString, iframeIndex });
})

SocketService.on("addedmutationrecord", (data) => {
    const mutationTarget = data.mutationTarget;
    const addedElemHTML = data.addedElemHTML;
    const iframeIndex = data.iframeIndex;
    clientSocket.emit("addedmutationrecord", {
        mutationTarget, addedElemHTML, iframeIndex
    })

})

SocketService.on("removedmutationrecord", (data) => {
    const iframeIndex = data.iframeIndex;
    clientSocket.emit("removedmutationrecord", { iframeIndex });
})

SocketService.on("modifiedAttributeRecord", (data) => {
    const changedAttribute = data.changedAttribute; 
    const mutationTarget = data.mutationTarget;
    const mutationValue = data.mutationValue;
    const mutatedElemHTML = data.mutatedElemHTML;
    const iframeIndex = data.iframeIndex;

    clientSocket.emit("modifiedAttributeRecord", {
        changedAttribute, mutationTarget, mutationValue, 
        mutatedElemHTML, iframeIndex
    });
})

clientSocket.on("locationrecord", (data => {
    console.log(data.x, data.y);
    drawAvatar(data.iframeIndex, data.x, data.y);

}))

clientSocket.on("eventrecord", (data) => {
    executeClick(data.selectorString, data.iframeIndex);
})

clientSocket.on("addedmutation", (data) => {
    const mutationTarget = data.mutationTarget;
    const addedElemHTML = data.addedElemHTML;
    SocketService.emit(`addMut${data.iframeIndex}`, { mutationTarget, addedElemHTML });
})

clientSocket.on("deletemutations", (data) => {
    SocketService.emit(`deleteMut${data.iframeIndex}`);
})

clientSocket.on("attributeModify", (data) => {
    const changedAttribute = data.changedAttribute; 
    const mutationTarget = data.mutationTarget;
    const mutationValue = data.mutationValue;
    const mutatedElemHTML = data.mutatedElemHTML;

    SocketService.emit(`modifyMut${data.iframeIndex}`, {
        changedAttribute, mutationTarget, mutationValue, mutatedElemHTML
    });
})


