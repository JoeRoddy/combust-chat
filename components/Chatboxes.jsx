import React from "react";
import { observer } from "mobx-react";

import chatStore from "../../stores/ChatStore";
import Chatbox from "./Chatbox";
import "./styles/Chat.scss";

const Chatboxes = observer(({ history }) => {
  const convoIds = chatStore.openConversationIds;
  const marginRight = history.location.pathname === "/" ? 270 : 20;

  return (
    <div className="Chatboxes" style={{ marginRight }}>
      {convoIds &&
        convoIds.map((convoId, i) => {
          return <Chatbox key={i} conversationId={convoId} />;
        })}
    </div>
  );
});

export default Chatboxes;
