import React, { Component } from "react";
import { observer } from "mobx-react";
import UIkit from "uikit";

import chatStore from "../../../stores/ChatStore";
import usersStore from "../../../stores/UsersStore";

@observer
export default class Chatbox extends Component {
  state = {
    message: "",
    addPeopleModal: false,
    modalQuery: "",
    modalQueryResults: []
  };

  messageLength = 0;
  shouldScroll = false;

  componentDidMount() {
    this.scrollToBottom();
    this.refs.chatInput.focus();
  }

  componentDidUpdate = props => {
    if (this.shouldScroll) {
      this.shouldScroll = false;
      this.scrollToBottom();
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
    this.setState({ modalQuery: "", modalQueryResults: [] });
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

  handleModalQuery = e => {
    const modalQuery = e.target.value;
    const modalQueryResults = usersStore.searchFromLocalUsersByField(
      "email",
      modalQuery
    );
    this.setState({ modalQuery, modalQueryResults });
  };

  render() {
    const { conversationId } = this.props;
    const messages = chatStore.getMessages(conversationId);
    const usersTyping = chatStore.getUsersTypingByField(
      conversationId,
      "email"
    );
    const convoTitle = chatStore.getConvoTitle(conversationId);

    if (messages.length !== this.messageLength) {
      //new message, scroll to bottom
      this.shouldScroll = true;
    }
    this.messageLength = messages.length;

    return (
      <div className="Chatbox">
        <div className="chat-header uk-light uk-flex uk-flex-between">
          <span>
            {/* {
              <span
                className={"isOnline " + (user.online ? "online" : "offline")}
              />
            } */}
            <div className="convo-title">{convoTitle}</div>
          </span>
          <span>
            <button
              title="Add People"
              uk-tooltip="true"
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
              title="Close"
              uk-tooltip="true"
              onClick={e => chatStore.markConvoAsClosed(conversationId)}
            />
          </span>
        </div>
        <div className="chat-messages">
          <div
            className="chat-messages-scrollable"
            id={"messagebox-convoId-" + conversationId}
          >
            {messages &&
              messages.map((m, i) => (
                <RenderMessage
                  key={i}
                  message={m}
                  isIncoming={m.sentBy === usersStore.userId}
                />
              ))}
            {usersTyping.length > 0 &&
              usersTyping.map(email => {
                return <span>{email} is typing..</span>;
              })}
          </div>
        </div>
        <div className="message-input">
          <span
            uk-icon="icon: comment"
            uk-tooltip="pos: right"
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
              class="uk-modal-close-default"
              type="button"
              uk-close="true"
              title="Close"
              uk-tooltip="true"
            />
            <div className="uk-margin">
              <label className="uk-form-label" for="form-stacked-text">
                Search by email
              </label>
              <div className="uk-form-controls">
                <input
                  ref="modalInput"
                  autoFocus
                  className="uk-input"
                  id="form-stacked-text"
                  type="text"
                  placeholder="Email..."
                  value={this.state.modalQuery}
                  onChange={this.handleModalQuery}
                />
              </div>
            </div>
            {this.state.modalQueryResults.length > 0 &&
              this.state.modalQueryResults.map(u => {
                return (
                  <div className="uk-margin-small-top">
                    {u.email}{" "}
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

const RenderMessage = props => {
  const { isIncoming, message } = props;
  const sentBy = usersStore.getUserById(message.sentBy);

  return (
    <div
      className={
        "RenderMessage " + (!isIncoming ? "incomingMsg" : "outgoingMsg")
      }
    >
      {!isIncoming && sentBy && <img className="avatar" src={sentBy.iconUrl} />}
      <RenderMessageBubble {...props} />
    </div>
  );
};

const RenderMessageBubble = ({ message, isIncoming }) => {
  return (
    <span
      className={
        "RenderMessageBubble " +
        (isIncoming
          ? "uk-text-primary uk-background-secondary"
          : "uk-background-primary")
      }
    >
      {message.body}
    </span>
  );
};
