import React, { Component } from "react";
import { observer } from "mobx-react";
import { Link } from "react-router-dom";
import UIkit from "uikit";

import Avatar from "../reusable/Avatar";
import chatStore from "../../stores/ChatStore";
import userStore from "../../stores/UserStore";
import userDb from "../../db/UserDb";
import { formatDate } from "../../helpers/DateHelper";

@observer
class Chatbox extends Component {
  state = {
    message: "",
    addPeopleModal: false,
    newUserQuery: "",
    newUserQueryResults: []
  };

  messageLength = 0;
  shouldScroll = false;
  usersTyping = [];

  componentDidMount() {
    this.scrollToBottom();
    this.refs.chatInput.focus();
  }

  componentDidUpdate = props => {
    if (this.shouldScroll) {
      this.shouldScroll = false;
      this.scrollToBottom();
    }
    if (props.conversationId) {
      chatStore.markConversationAsRead(props.conversationId);
    }
  };

  handleMessageChange = e => {
    this.setState({ message: e.target.value });
    this.toggleUserTyping(true);
  };

  handleMessageSubmit = e => {
    chatStore.sendMessage(this.props.conversationId, this.state.message);
    this.setState({ message: "" });
    this.toggleUserTyping(false);
  };

  detectEnterKey = e => {
    if (e.key === "Enter") {
      this.handleMessageSubmit();
      e.stopPropagation();
    }
  };

  addUserToConvo = user => {
    UIkit.modal(document.getElementById("modal-add-users-to-convo")).hide();
    chatStore.addParticipantToConversation(user.id, this.props.conversationId);
    this.refs.chatInput.focus();
    this.setState({ newUserQuery: "", newUserQueryResults: [] });
  };

  scrollToBottom = e => {
    var objDiv = document.getElementById(
      "messagebox-convoId-" + this.props.conversationId
    );
    objDiv.scrollTop = objDiv.scrollHeight;
  };

  toggleUserTyping(isTyping) {
    const { conversationId } = this.props;
    clearTimeout(this.currentTimeout);
    chatStore.toggleUserTyping(conversationId, isTyping);
    if (isTyping) {
      this.currentTimeout = setTimeout(e => {
        chatStore.toggleUserTyping(conversationId, false);
      }, 3000);
    }
  }

  handleUserQuery = e => {
    const newUserQuery = e.target.value;
    const newUserQueryResults = userDb.searchByField(
      newUserQuery,
      "displayName"
    );
    this.setState({ newUserQuery, newUserQueryResults });
  };

  render() {
    const { conversationId } = this.props;
    const conversation = chatStore.getConversation(conversationId);

    const messages = chatStore.getMessages(conversationId);
    const usersTyping = chatStore.getUsersTypingByField(
      conversationId,
      "displayName"
    );
    const usersInConvo = chatStore.getUsersInConvo(conversationId);

    if (
      messages.length !== this.messageLength ||
      usersTyping.length !== this.usersTyping.length
    ) {
      //new content, scroll to bottom
      this.shouldScroll = true;
    }

    this.usersTyping = usersTyping;
    this.messageLength = messages.length;

    return (
      <div className="Chatbox">
        <div className="chat-header uk-light uk-flex uk-flex-between uk-background-primary">
          <span>
            <div className="convo-title">
              {usersInConvo &&
                usersInConvo.map((user, i) => {
                  return user ? (
                    <Link key={i} to={"/profile/" + user.id}>
                      {user.displayName}
                      {i < usersInConvo.length - 1 ? "," : ""}
                    </Link>
                  ) : (
                    <span />
                  );
                })}
            </div>
          </span>
          <span>
            <button
              uk-tooltip="Add People"
              title="Add People" // bugfix
              uk-icon="icon: plus-circle; ratio: .8"
              type="button"
              uk-toggle="target: #modal-add-users-to-convo"
              onClick={e => {
                this.refs.modalInput.focus();
              }}
            />
            <button
              type="button"
              uk-close="true"
              uk-tooltip="Close"
              title="Close" // bugfix
              onClick={e => chatStore.markConvoAsClosed(conversationId)}
            />
          </span>
        </div>
        <div className="chat-messages">
          <div
            className="chat-messages-scrollable"
            id={"messagebox-convoId-" + conversationId}
          >
            <div className="uk-margin-small-top" />
            {messages &&
              messages.map((m, i) => (
                <RenderMessage
                  key={i}
                  message={m}
                  isIncoming={m.sentBy !== userStore.userId}
                />
              ))}
            {usersTyping.length > 0 &&
              usersTyping.map((displayName, i) => {
                return <span key={i}>{displayName} is typing..</span>;
              })}
          </div>
        </div>
        <div className="message-input">
          <span
            uk-icon="icon: comment"
            uk-tooltip="pos: top"
            title="Send"
            onClick={this.handleMessageSubmit}
          />
          <input
            ref="chatInput"
            type="text"
            autoFocus
            value={this.state.message}
            onChange={this.handleMessageChange}
            onKeyPress={this.detectEnterKey}
          />
        </div>
        <div id="modal-add-users-to-convo" uk-modal="true">
          <div className="uk-modal-dialog uk-modal-body">
            <h2 className="uk-modal-title">Add Users</h2>
            <button
              className="uk-modal-close-default"
              type="button"
              uk-close="true"
              uk-tooltip="Close"
            />
            <div className="uk-margin">
              <label className="uk-form-label">Find others to chat with</label>
              <div className="uk-form-controls">
                <input
                  ref="modalInput"
                  autoFocus
                  className="uk-input"
                  id="form-stacked-text"
                  type="text"
                  placeholder="Search for users..."
                  value={this.state.newUserQuery}
                  onChange={this.handleUserQuery}
                />
              </div>
            </div>
            {conversation &&
              this.state.newUserQueryResults.length > 0 &&
              this.state.newUserQueryResults.map((u, i) => {
                return Object.keys(conversation.participants).includes(
                  u.id
                ) ? null : (
                  <div
                    key={i}
                    className="uk-margin-small-top uk-flex uk-flex-between"
                  >
                    {u.displayName}{" "}
                    <button
                      className="uk-button uk-button-primary"
                      onClick={e => this.addUserToConvo(u)}
                    >
                      Add to conversation
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    );
  }
}

export default Chatbox;

const RenderMessage = props => {
  const { isIncoming, message } = props;
  const sentBy = userStore.getUserById(message.sentBy);

  return (
    <div
      className={
        "RenderMessage " + (isIncoming ? "incomingMsg" : "outgoingMsg")
      }
    >
      {isIncoming && sentBy && <Avatar src={sentBy.iconUrl} height={25} />}
      <RenderMessageBubble {...props} />
    </div>
  );
};

const RenderMessageBubble = ({ message, isIncoming }) => {
  const timeStamp = formatDate(message.createdAt);

  return (
    <span
      title={timeStamp}
      uk-tooltip={"pos: " + (isIncoming ? "left" : "right")}
      className={
        "RenderMessageBubble " +
        (isIncoming ? "incomingBubble" : "outgoingBubble")
      }
    >
      {message.body}
    </span>
  );
};
