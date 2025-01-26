document.addEventListener("DOMContentLoaded", () => {

const socket = io("https://maesia.onrender.com/");

const joinBtn = document.getElementById("join-btn");
const sendBtn = document.getElementById("send-btn");
const usernameInput = document.getElementById("username");
const roomInput = document.getElementById("room");
const messageInput = document.getElementById("message-input");
const messagesDiv = document.getElementById("messages");
const leaveBtn = document.getElementById("leave-btn");

let currentRoom = null;
let username = null;

function removePlaceholder() {
    const placeholder = document.getElementById("placeholder");
    if (placeholder) {
        placeholder.remove();
    }
}

async function fetchRooms() {
    try {
        const response = await fetch("/rooms");
        const rooms = await response.json();

        const roomList = document.getElementById("room-list");
        roomList.innerHTML = "";

        rooms.forEach((room) => {
            const roomItem = document.createElement("li");
            roomItem.textContent = room.name;
            roomItem.addEventListener("click", () => joinRoom(room.name));
            roomList.appendChild(roomItem);
        });
    } catch (error) {
        console.error("Error fetching rooms:", error);
    }
}


 joinBtn.addEventListener("click", () => {
    const room = roomInput.value.trim();
    if (!username) {
        username = usernameInput.value.trim();
        if (!username) {
            alert("Just put a name in...");
            return;
        }
    }

    if (room) {
        socket.emit("join_room", { username, room });
        currentRoom = room;

        messageInput.disabled = false;
        sendBtn.disabled = false;
        leaveBtn.disabled = false;

        console.log ("joined room, message input enabled");

        messagesDiv.innerHTML = `<h3>Joined room: ${room}</h3>`;
    } else {
        alert("Enter BOTH a username and room name.");
    }

});


leaveBtn.addEventListener("click", () => {
        if (currentRoom) {
            socket.emit("leave_room", { username, room: currentRoom});
            console.log(`left room: ${currentRoom}`); // debug
            currentRoom = null;
            messagesDiv.innerHTML = `<p id="placeholder">Messages appear right here</p>`;
            messageInput.disabled = true;
            sendBtn.disabled = true;
            leaveBtn.disabled = true;
        } else {
            alert("Join a room to leave it.");
        }
});

sendBtn.addEventListener("click", () => {
    const message = messageInput.value.trim();
    if (message && currentRoom) {
        socket.emit("send_message", {
            username,
            message,
            room: currentRoom,
        });

        appendMessage({ username: "You", message });
        messageInput.value = "";
    }
});

socket.on("message", (data) => {
    removePlaceholder();

    if (data.content) {
        const systemMessage = document.createElement("div");
        systemMessage.innerHTML = `<em>${data.content}</em>`;
        messagesDiv.appendChild(systemMessage);
    } else if (data.username && data.message) {
        appendMessage(data);
    }

    messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

socket.on("message_history", (history) => {
    messagesDiv.innerHTML = "";
    history.forEach((data) => {
        const messageElement = document.createElement("div");
        messageElement.innerHTML = `<strong>${data.username}:</strong> ${data.message} <em>${new Date(data.timestamp).toLocaleString()}</em>`;
        messagesDiv.appendChild(messageElement);
    });
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

function appendMessage(data) {
    const messageElement = document.createElement("div");
    messageElement.innerHTML = `<strong>${data.username}:</strong> ${data.message}`;
    messagesDiv.appendChild(messageElement);

    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

fetchRooms();

});