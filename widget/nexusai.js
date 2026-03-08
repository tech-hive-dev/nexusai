/**
 * NexusAI Chat Widget
 * Embed with: <script src="https://your-api.com/widget/nexusai.js" async></script>
 * Configure: window.NexusAIConfig = { tenantSlug, agentName, brandColor, apiUrl }
 */
(function () {
  "use strict";

  const config = window.NexusAIConfig || {};
  const TENANT = config.tenantSlug || "";
  const AGENT_NAME = config.agentName || "AI Assistant";
  const COLOR = config.brandColor || "#4FFFB0";
  const API = config.apiUrl || "http://localhost:8000";

  if (!TENANT) return console.warn("NexusAI: tenantSlug not set");

  let conversationId = sessionStorage.getItem("nexusai_conv_" + TENANT);
  let isOpen = false;

  // ── Styles ──────────────────────────────────────────────────
  const style = document.createElement("style");
  style.textContent = `
    #nexusai-widget * { box-sizing: border-box; font-family: system-ui, sans-serif; }
    #nexusai-fab {
      position: fixed; bottom: 24px; right: 24px; z-index: 9999;
      width: 56px; height: 56px; border-radius: 50%;
      background: ${COLOR}; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.25);
      transition: transform 0.2s, box-shadow 0.2s;
      color: #000; font-size: 22px;
    }
    #nexusai-fab:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(0,0,0,0.35); }
    #nexusai-window {
      position: fixed; bottom: 92px; right: 24px; z-index: 9998;
      width: 360px; height: 520px; border-radius: 16px;
      background: #0f0f17; border: 1px solid rgba(255,255,255,0.1);
      box-shadow: 0 12px 48px rgba(0,0,0,0.5);
      display: flex; flex-direction: column; overflow: hidden;
      transform: scale(0.8) translateY(20px); opacity: 0;
      transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s;
      pointer-events: none;
    }
    #nexusai-window.open {
      transform: scale(1) translateY(0); opacity: 1; pointer-events: all;
    }
    #nexusai-header {
      background: linear-gradient(135deg, #13131f 0%, #1a1a2e 100%);
      padding: 14px 16px; display: flex; align-items: center; gap: 10px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    #nexusai-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: ${COLOR}20; border: 2px solid ${COLOR};
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; color: ${COLOR};
    }
    #nexusai-agent-info { flex: 1; }
    #nexusai-agent-name { color: #fff; font-size: 14px; font-weight: 600; }
    #nexusai-status { color: #4ade80; font-size: 11px; display: flex; align-items: center; gap: 4px; }
    #nexusai-dot { width: 6px; height: 6px; border-radius: 50%; background: #4ade80; animation: nexusai-pulse 2s infinite; }
    @keyframes nexusai-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
    #nexusai-close { background: none; border: none; color: rgba(255,255,255,0.5); cursor: pointer; font-size: 18px; padding: 4px; }
    #nexusai-messages {
      flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px;
      scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent;
    }
    .nexusai-msg { display: flex; gap: 8px; max-width: 85%; animation: nexusai-fade 0.3s ease; }
    @keyframes nexusai-fade { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
    .nexusai-msg.user { align-self: flex-end; flex-direction: row-reverse; }
    .nexusai-bubble {
      padding: 10px 13px; border-radius: 14px; font-size: 13.5px; line-height: 1.55; color: #e8eaf0;
    }
    .nexusai-msg.bot .nexusai-bubble { background: rgba(255,255,255,0.07); border-radius: 4px 14px 14px 14px; }
    .nexusai-msg.user .nexusai-bubble { background: ${COLOR}25; border: 1px solid ${COLOR}40; border-radius: 14px 4px 14px 14px; }
    .nexusai-typing { display: flex; gap: 4px; padding: 12px 14px; align-items: center; }
    .nexusai-typing span { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.4); animation: nexusai-bounce 1.2s infinite; }
    .nexusai-typing span:nth-child(2){animation-delay:0.2s}
    .nexusai-typing span:nth-child(3){animation-delay:0.4s}
    @keyframes nexusai-bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }
    #nexusai-input-area {
      padding: 12px; border-top: 1px solid rgba(255,255,255,0.08);
      display: flex; gap: 8px; align-items: flex-end;
      background: rgba(255,255,255,0.02);
    }
    #nexusai-input {
      flex: 1; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px; color: #e8eaf0; padding: 9px 12px; font-size: 13px;
      resize: none; outline: none; min-height: 38px; max-height: 100px;
      font-family: inherit; line-height: 1.4;
    }
    #nexusai-input:focus { border-color: ${COLOR}60; }
    #nexusai-input::placeholder { color: rgba(255,255,255,0.3); }
    #nexusai-send {
      width: 38px; height: 38px; border-radius: 10px; border: none;
      background: ${COLOR}; color: #000; cursor: pointer; font-size: 16px;
      display: flex; align-items: center; justify-content: center;
      transition: opacity 0.15s; flex-shrink: 0;
    }
    #nexusai-send:hover { opacity: 0.85; }
    #nexusai-send:disabled { opacity: 0.4; cursor: not-allowed; }
    #nexusai-powered { text-align: center; padding: 6px; color: rgba(255,255,255,0.2); font-size: 10px; }
    @media(max-width: 420px) {
      #nexusai-window { width: calc(100vw - 20px); right: 10px; bottom: 78px; height: 70vh; }
    }
  `;
  document.head.appendChild(style);

  // ── HTML ─────────────────────────────────────────────────────
  const widget = document.createElement("div");
  widget.id = "nexusai-widget";
  widget.innerHTML = `
    <div id="nexusai-window">
      <div id="nexusai-header">
        <div id="nexusai-avatar">◆</div>
        <div id="nexusai-agent-info">
          <div id="nexusai-agent-name">${AGENT_NAME}</div>
          <div id="nexusai-status"><div id="nexusai-dot"></div> Online</div>
        </div>
        <button id="nexusai-close" title="Close">✕</button>
      </div>
      <div id="nexusai-messages">
        <div class="nexusai-msg bot">
          <div class="nexusai-bubble">
            Hi! I'm ${AGENT_NAME} 👋 How can I help you today?
          </div>
        </div>
      </div>
      <div id="nexusai-input-area">
        <textarea id="nexusai-input" placeholder="Type a message..." rows="1"></textarea>
        <button id="nexusai-send" title="Send">➤</button>
      </div>
      <div id="nexusai-powered">Powered by NexusAI</div>
    </div>
    <button id="nexusai-fab" title="Chat with us">💬</button>
  `;
  document.body.appendChild(widget);

  // ── Logic ────────────────────────────────────────────────────
  const fab = document.getElementById("nexusai-fab");
  const win = document.getElementById("nexusai-window");
  const messages = document.getElementById("nexusai-messages");
  const input = document.getElementById("nexusai-input");
  const sendBtn = document.getElementById("nexusai-send");
  const closeBtn = document.getElementById("nexusai-close");

  fab.addEventListener("click", () => {
    isOpen = !isOpen;
    win.classList.toggle("open", isOpen);
    fab.textContent = isOpen ? "✕" : "💬";
    if (isOpen) setTimeout(() => input.focus(), 300);
  });

  closeBtn.addEventListener("click", () => {
    isOpen = false;
    win.classList.remove("open");
    fab.textContent = "💬";
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 100) + "px";
  });

  sendBtn.addEventListener("click", sendMessage);

  function addMessage(text, role) {
    const div = document.createElement("div");
    div.className = `nexusai-msg ${role}`;
    div.innerHTML = `<div class="nexusai-bubble">${text.replace(/\n/g, "<br>")}</div>`;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
  }

  function showTyping() {
    const div = document.createElement("div");
    div.className = "nexusai-msg bot";
    div.id = "nexusai-typing";
    div.innerHTML = `<div class="nexusai-bubble nexusai-typing"><span></span><span></span><span></span></div>`;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function removeTyping() {
    const t = document.getElementById("nexusai-typing");
    if (t) t.remove();
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    input.style.height = "auto";
    sendBtn.disabled = true;

    addMessage(text, "user");
    showTyping();

    try {
      const res = await fetch(`${API}/api/chat/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          tenant_slug: TENANT,
          conversation_id: conversationId,
          channel: "website",
        }),
      });

      const data = await res.json();
      removeTyping();

      if (data.conversation_id) {
        conversationId = data.conversation_id;
        sessionStorage.setItem("nexusai_conv_" + TENANT, conversationId);
      }

      if (data.response) {
        addMessage(data.response, "bot");
      }
    } catch (err) {
      removeTyping();
      addMessage("Sorry, I'm having trouble connecting. Please try again.", "bot");
    } finally {
      sendBtn.disabled = false;
      input.focus();
    }
  }

  // Auto-open after 5 seconds if configured
  if (config.autoOpen) {
    setTimeout(() => {
      isOpen = true;
      win.classList.add("open");
      fab.textContent = "✕";
    }, 5000);
  }
})();
