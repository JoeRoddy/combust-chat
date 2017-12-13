import React, { Component } from "react";
import { observer } from "mobx-react";

import chatStore from "../../../stores/ChatStore";
import Chatbox from "./Chatbox";
import "./styles/Chat.css";

@observer
export default class Chatboxes extends Component {
  state = {};

  componentWillMount() {
    const openConversation = user => {
      chatStore.openConversationWithUser(user.id);
    };
  }

  render() {
    const convoIds = chatStore.openConversationIds;

    return (
      <div className="Chatboxes">
        {convoIds &&
          convoIds.map((convoId, i) => {
            return <Chatbox key={i} conversationId={convoId} />;
          })}
      </div>
    );
  }
}
