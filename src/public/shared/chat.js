import {
  fetchUserSchema,
  createNavigation,
  createBackofficeNavigation,
  populateFormFields,
  createForm,
  attachValidationListeners,
  getUserStatus,
  fetchWithErrorHandling,
  showToastMessage,
} from "./page-utility.js";

let userName;
let userRole; // will be 'user' or 'admin'
let currentChatId = null; // for staff, selected chat
let ws = null;

document.addEventListener("DOMContentLoaded", async () => {
  const userStatus = await getUserStatus();
  createNavigation(userStatus);

  if (userStatus.user_type === "admin") {
    await createBackofficeNavigation(userStatus);
  }

  if (userStatus.user_type === "admin") {
    await createBackofficeNavigation(userStatus);
    userRole = "staff";
    userName = userStatus.first_name || "Staff";
    renderStaffChatInterface();
  } else {
    userRole = "user";
    userName = userStatus.first_name || "Anonymous";
    renderUserChatInterface();
  }
});

function renderUserChatInterface() {
  const contentArea = document.getElementById("content-area");
  contentArea.innerHTML = ""; // Clear any previous content

  // Create a container for the chat interface
  const chatContainer = document.createElement("div");
  chatContainer.classList.add("p-4", "border", "rounded");

  // Create a button to start the chat
  const startButton = document.createElement("button");
  startButton.classList.add("btn", "btn-primary", "mb-3");
  startButton.textContent = "Start Chat";
  chatContainer.appendChild(startButton);

  // Create a div to display chat messages
  const messagesDiv = document.createElement("div");
  messagesDiv.id = "chat-messages";
  messagesDiv.style.height = "300px";
  messagesDiv.style.overflowY = "auto";
  messagesDiv.classList.add("mb-3", "border", "p-2");
  chatContainer.appendChild(messagesDiv);

  // Create an input field for sending messages
  const messageForm = document.createElement("form");
  messageForm.id = "chat-form";
  messageForm.classList.add("d-flex");

  const messageInput = document.createElement("input");
  messageInput.id = "chat-input";
  messageInput.classList.add("form-control");
  messageInput.setAttribute("placeholder", "Type your message…");
  messageInput.setAttribute("autocomplete", "off");
  messageForm.appendChild(messageInput);

  const sendButton = document.createElement("button");
  sendButton.classList.add("btn", "btn-success", "ms-2");
  sendButton.textContent = "Send";
  messageForm.appendChild(sendButton);

  chatContainer.appendChild(messageForm);
  contentArea.appendChild(chatContainer);

  // Setup WebSocket connection after clicking the start button
  let ws = null;
  let chatId = null;

  // Function to display messages on the interface
  function displayMessage(sender, text) {
    const messageElement = document.createElement("div");
    messageElement.innerHTML = `<strong>${sender}:</strong> ${text}`;
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  // Start chat button event listener
  startButton.addEventListener("click", () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      console.log("Already connected");
      return;
    }

    // Create the WebSocket connection (change port/host as appropriate)
    ws = new WebSocket("ws://localhost:5005/ws/chat");

    ws.addEventListener("open", () => {
      console.log("Connected to WebSocket server.");
      // Send init message (change role to "user"; in practice, load user info dynamically)
      ws.send(
        JSON.stringify({
          type: "init",
          role: "user",
          username: userName,
        })
      );
      displayMessage("System", "Chat started. Connection established.");
    });

    ws.addEventListener("message", (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "new_chat") {
            chatId = data.chatId;
          // For staff interface; in a user interface, you might ignore this.
          displayMessage("System", `New chat started: ${data.chatId}`);
        } else if (data.type === "active_chats") {
          // Display active chats (for staff interface)
          displayMessage(
            "System",
            `Active chats: ${data.chats.map((c) => c.chatId).join(", ")}`
          );
        } else if (data.type === "message") {
          // Display the incoming message
          displayMessage(data.sender, data.text);
        } else if (data.type === "chat_closed") {
          displayMessage("System", "Chat session closed.");
        } else if (data.type === "error") {
          displayMessage("Error", data.message);
        }
      } catch (e) {
        console.error("Error parsing message from server:", e);
      }
    });

    ws.addEventListener("close", () => {
      displayMessage("System", "Connection closed.");
    });

    ws.addEventListener("error", (error) => {
      console.error("WebSocket error:", error);
      displayMessage("Error", "WebSocket error occurred.");
    });
  });

  // Message form event listener
  messageForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      alert("Not connected to chat server.");
      return;
    }
    const text = messageInput.value.trim();
    if (text === "") return;

    ws.send(
      JSON.stringify({
        type: "message",
        chatId: chatId,
        sender: userName,
        text: text,
      })
    );
    displayMessage(userName, text);
    messageInput.value = "";
  });
}

function renderStaffChatInterface() {
  const contentArea = document.getElementById("content-area");
  contentArea.innerHTML = "";

  // Create a container for staff chat interface
  const container = document.createElement("div");
  container.classList.add("p-4", "border", "rounded");

  // Section for listing active chats
  const chatsSection = document.createElement("div");
  chatsSection.classList.add("mb-3");
  const chatsHeading = document.createElement("h5");
  chatsHeading.textContent = "Active Chats";
  chatsSection.appendChild(chatsHeading);

  const chatList = document.createElement("ul");
  chatList.id = "chat-list";
  chatList.classList.add("list-group");
  chatsSection.appendChild(chatList);
  container.appendChild(chatsSection);

  // Section for the chat conversation once joined.
  const messagesDiv = document.createElement("div");
  messagesDiv.id = "chat-messages";
  messagesDiv.style.height = "300px";
  messagesDiv.style.overflowY = "auto";
  messagesDiv.classList.add("mb-3", "border", "p-2");
  container.appendChild(messagesDiv);

  // Chat form for sending messages in the joined chat.
  const messageForm = document.createElement("form");
  messageForm.id = "chat-form";
  messageForm.classList.add("d-flex");

  const messageInput = document.createElement("input");
  messageInput.id = "chat-input";
  messageInput.classList.add("form-control");
  messageInput.setAttribute("placeholder", "Type your message…");
  messageInput.setAttribute("autocomplete", "off");
  messageForm.appendChild(messageInput);

  const sendButton = document.createElement("button");
  sendButton.classList.add("btn", "btn-success", "ms-2");
  sendButton.textContent = "Send";
  messageForm.appendChild(sendButton);

  container.appendChild(messageForm);
  contentArea.appendChild(container);

  function displayMessage(sender, text) {
    const messageElement = document.createElement("div");
    messageElement.innerHTML = `<strong>${sender}:</strong> ${text}`;
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  // Establish the WebSocket connection for staff; they receive active chats on init.
  ws = new WebSocket("ws://localhost:5005/ws/chat");

  ws.addEventListener("open", () => {
    console.log("Staff connected to WebSocket server.");
    ws.send(
      JSON.stringify({ type: "init", role: "staff", username: userName })
    );
  });

  // When active chats are sent, populate the chat list for staff.
  ws.addEventListener("message", (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === "active_chats") {
        // Clear the current list and rebuild it.
        chatList.innerHTML = "";
        data.chats.forEach((chat) => {
          const li = document.createElement("li");
          li.classList.add(
            "list-group-item",
            "d-flex",
            "justify-content-between",
            "align-items-center"
          );
          li.textContent = chat.username + " (" + chat.chatId + ")";
          li.style.cursor = "pointer";
          li.addEventListener("click", () => {
            // Staff selects this chat to join; save the chatId as current.
            currentChatId = chat.chatId;
            displayMessage("System", `Joined chat: ${currentChatId}`);
            // Optionally, send a join_chat message if desired:
            ws.send(
              JSON.stringify({ type: "join_chat", chatId: currentChatId })
            );
          });
          chatList.appendChild(li);
        });
      } else if (data.type === "message") {
        // Only display messages if they belong to the chat currently joined.
        if (data.chatId === currentChatId) {
          displayMessage(data.sender, data.text);
        }
      } else if (data.type === "chat_closed") {
        displayMessage("System", `Chat ${data.chatId} closed.`);
        // Optionally remove it from the chat list.
        const listItems = Array.from(chatList.children);
        listItems.forEach((li) => {
          if (li.textContent.includes(data.chatId)) {
            li.remove();
          }
        });
        if (data.chatId === currentChatId) {
          currentChatId = null;
        }
      }
    } catch (e) {
      console.error("Error parsing WS message:", e);
    }
  });

  ws.addEventListener("close", () =>
    displayMessage("System", "Connection closed.")
  );
  ws.addEventListener("error", (error) => {
    console.error("WebSocket error:", error);
    displayMessage("Error", "WebSocket error occurred.");
  });

  messageForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      alert("Not connected to chat server.");
      return;
    }
    if (!currentChatId) {
      alert("Please select a chat to join from the active chats list.");
      return;
    }
    const text = messageInput.value.trim();
    if (text === "") return;
    ws.send(
      JSON.stringify({
        type: "message",
        chatId: currentChatId,
        sender: userName,
        text,
      })
    );
    displayMessage(userName, text);
    messageInput.value = "";
  });
}
