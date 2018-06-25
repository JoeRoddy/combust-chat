import React, { Component } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { observer } from "mobx-react";
import moment from "moment";

import nav from "../../helpers/NavigatorHelper";
import chatStore from "../../stores/ChatStore";
import userStore from "../../stores/UserStore";
import { Screen } from "../reusable";

@observer
export default class MyMessages extends Component {
  state = {};

  render() {
    const conversations = chatStore.conversationMap.values();
    return (
      <Screen title="My Messages" noPadding>
        <FlatList
          data={conversations}
          renderItem={data => <ConversationListItem data={data} />}
          keyExtractor={item => item.id}
        />
      </Screen>
    );
  }
}

const ConversationListItem = observer(({ data }) => {
  const conversation = data.item;
  const { lastMessage } = conversation;

  let bg, nameWeight;
  if (
    lastMessage &&
    lastMessage.usersWhoveRead &&
    lastMessage.usersWhoveRead[userStore.userId]
  ) {
    bg = "#edeff2";
    nameWeight = "400";
  } else {
    bg = "white";
    nameWeight = "700";
  }

  return (
    <TouchableOpacity
      key={conversation.id}
      onPress={() => {
        chatStore.openConversationById(conversation.id);
        nav.navigate("ChatScreen", { id: conversation.id });
      }}
      style={[styles.convoItem, { backgroundColor: bg }]}
    >
      <View style={styles.nameAndCount}>
        <Text
          style={{
            fontSize: 16,
            color: "black",
            marginRight: 4,
            fontWeight: nameWeight
          }}
        >
          {chatStore.getConversationTitle(conversation.id)}
        </Text>
        <Text style={{ color: "#918e91", fontWeight: "bold" }}>
          {conversation.messages && Object.keys(conversation.messages).length}
        </Text>
      </View>
      <View style={styles.messageAndTime}>
        <Text style={styles.message}>
          {lastMessage && _getPreviewText(lastMessage.body)}
        </Text>
        <Text style={styles.timeStamp}>
          {lastMessage && _getTimeStamp(lastMessage.createdAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  convoItem: {
    padding: 15,
    height: 80,
    flexDirection: "column",
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: "#a5a0a5"
  },
  nameAndCount: {
    flexDirection: "row",
    alignItems: "center"
  },
  messageAndTime: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  message: {
    color: "#a5a0a5",
    maxWidth: 220
  },
  timeStamp: {
    color: "#a5a0a5",
    fontSize: 14
  }
});

const _getPreviewText = body => {
  if (!body) {
    return null;
  }
  let clipped = body.substring(0, 30);
  let newLine = clipped.indexOf("\n");
  return clipped.substring(0, newLine > 0 ? newLine : clipped.length);
};

const _getTimeStamp = (createdAt = new Date()) => {
  const time = moment(new Date(createdAt)).fromNow();
  return time === "in a few seconds" ? "a few seconds ago" : time;
};
