import React from "react";
import { observer } from "mobx-react";

import chatStore from "../../stores/ChatStore";
import Chatbox from "./Chatbox";
import "./styles/Chat.css";

const Chatboxes = observer(() => {
  const convoIds = chatStore.openConversationIds;

  return (
    <div className="Chatboxes">
      {convoIds &&
        convoIds.map((convoId, i) => {
          return <Chatbox key={i} conversationId={convoId} />;
        })}
    </div>
  );
});

export default Chatboxes;
