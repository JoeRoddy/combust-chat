import React, { Component } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View
} from "react-native";
import { observer } from "mobx-react";
import { GiftedChat, Bubble } from "react-native-gifted-chat";

import nav from "../../helpers/NavigatorHelper";
import chatStore from "../../stores/ChatStore";
import userStore from "../../stores/UserStore";
import { colors } from "../../assets/styles/AppStyles";
import { Screen } from "../reusable";

@observer
export default class ChatScreen extends Component {
  state = {
    message: "",
    addPeopleModal: false,
    newUserQuery: "",
    newUserQueryResults: [],
    conversationId: ""
  };

  messageLength = 0;
  usersTyping = [];

  componentDidMount() {
    const routeInfo = nav.getCurrentRoute();
    const params = routeInfo ? routeInfo.params : {};
    const conversationId =
      params.id ||
      chatStore.findExistingConversationWithParticipants(params.participantIds)
        .id;
    this.setState({ conversationId });
    chatStore.markConversationAsRead(conversationId);
  }

  handleMessageInput = message => {
    if (message !== this.state.message) {
      this.toggleUserTyping(true);
      this.setState({ message });
    }
  };

  sendMessage = () => {
    Keyboard.dismiss();
    const { conversationId } = this.state;
    chatStore.sendMessage(conversationId, this.state.message);
    this.setState({ message: "" });
    this.toggleUserTyping(false);
  };

  toggleUserTyping(isTyping) {
    const { conversationId } = this.state;
    clearTimeout(this.currentTimeout);
    chatStore.toggleUserTyping(conversationId, isTyping);
    if (isTyping) {
      this.currentTimeout = setTimeout(e => {
        chatStore.toggleUserTyping(conversationId, false);
      }, 3000);
    }
  }

  render() {
    const { conversationId } = this.state;
    if (!conversationId) return <View />;
    const messages = chatStore.getMessages(conversationId);
    const usersTyping = chatStore.getUsersTypingByField(
      conversationId,
      "displayName"
    );
    this.usersTyping = usersTyping;
    this.messageLength = messages.length;

    return (
      <Screen
        title={chatStore.getConversationTitle(conversationId)}
        noPadding
        containerStyle={{ flex: 1 }}
        style={{ flex: 1 }}
      >
        <GiftedChat
          messages={_convertMessagesToGiftedChat(messages)}
          onInputTextChanged={this.handleMessageInput}
          onSend={this.sendMessage}
          renderBubble={_renderBubble}
          renderFooter={() => _renderFooter(usersTyping)}
          user={{
            _id: userStore.userId
          }}
        />
        {Platform.OS === "android" && (
          // Android specific bug, text input will hide behind keyboard:
          // https://github.com/FaridSafi/react-native-gifted-chat/issues/680#issuecomment-359699364
          <KeyboardAvoidingView
            behavior={"padding"}
            keyboardVerticalOffset={80}
          />
        )}
      </Screen>
    );
  }
}

_convertMessagesToGiftedChat = messages => {
  return messages
    .map(m => {
      const user = userStore.getUserById(m.sentBy);
      return {
        _id: m.id,
        text: m.body,
        createdAt: m.createdAt,
        user: {
          _id: m.sentBy,
          name: user.displayName,
          avatar: user.iconUrl
        }
      };
    })
    .reverse();
};

_renderFooter = usersTyping => {
  return usersTyping.length > 0 ? (
    <View style={styles.footerContainer}>
      <Text style={styles.footerText}>
        {usersTyping.map(
          (displayName, i) =>
            `${displayName}${i < usersTyping.length - 1 ? ", " : ""}`
        )}{" "}
        {usersTyping.length > 1 ? "are" : "is"} typing..
      </Text>
    </View>
  ) : (
    <View />
  );
};

_renderBubble = props => {
  return (
    <Bubble
      {...props}
      wrapperStyle={{
        right: {
          backgroundColor: colors.primary
        }
      }}
    />
  );
};

const styles = StyleSheet.create({
  footerContainer: {
    marginTop: 5,
    marginLeft: 10,
    marginRight: 10,
    marginBottom: 10
  },
  footerText: {
    fontSize: 14,
    color: "#aaa"
  }
});
