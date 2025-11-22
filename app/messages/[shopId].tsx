import React, { useState } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { ArrowLeft, Send } from "lucide-react-native"
import { getShopById, getMessagesByShopId, Message } from "@/lib/mock-data"
import { useAuth } from "@/lib/auth-context"

export default function ChatPage() {
  const { shopId } = useLocalSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const shop = getShopById(shopId as string)
  const [messages, setMessages] = useState<Message[]>(getMessagesByShopId(shopId as string))
  const [newMessage, setNewMessage] = useState("")

  if (!shop) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Boutique non trouvée</Text>
      </View>
    )
  }

  const handleSend = () => {
    if (!newMessage.trim() || !user) return

    const message: Message = {
      id: `m-${Date.now()}`,
      shopId: shopId as string,
      text: newMessage,
      sender: "user",
      timestamp: new Date().toISOString(),
      read: false,
    }

    setMessages([...messages, message])
    setNewMessage("")
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color="#000" />
        </TouchableOpacity>
        <Image source={{ uri: shop.avatar }} style={styles.avatar} />
        <View style={styles.shopInfo}>
          <Text style={styles.shopName}>{shop.name}</Text>
          <Text style={styles.shopStatus}>En ligne</Text>
        </View>
      </View>

      <ScrollView style={styles.messagesContainer} contentContainerStyle={styles.messagesContent}>
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.messageBubble,
              message.sender === "user" ? styles.userMessage : styles.shopMessage,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                message.sender === "user" ? styles.userMessageText : styles.shopMessageText,
              ]}
            >
              {message.text}
            </Text>
            <Text
              style={[
                styles.messageTime,
                message.sender === "user" ? styles.userMessageTime : styles.shopMessageTime,
              ]}
            >
              {new Date(message.timestamp).toLocaleTimeString("fr-DZ", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Écrivez un message..."
          multiline
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!newMessage.trim()}
          style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
        >
          <Send size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  shopInfo: {
    flex: 1,
  },
  shopName: {
    fontSize: 16,
    fontWeight: "600",
  },
  shopStatus: {
    fontSize: 12,
    color: "#22c55e",
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    gap: 12,
  },
  messageBubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
  },
  userMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#000",
  },
  shopMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#f7f7f7",
  },
  messageText: {
    fontSize: 14,
    marginBottom: 4,
  },
  userMessageText: {
    color: "#fff",
  },
  shopMessageText: {
    color: "#000",
  },
  messageTime: {
    fontSize: 10,
  },
  userMessageTime: {
    color: "rgba(255,255,255,0.7)",
  },
  shopMessageTime: {
    color: "#8e8e8e",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: "#f7f7f7",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  errorText: {
    fontSize: 16,
    color: "#8e8e8e",
    textAlign: "center",
    marginTop: 32,
  },
})
