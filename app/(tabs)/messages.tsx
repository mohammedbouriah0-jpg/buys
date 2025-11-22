import React from "react"
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from "react-native"
import { Link, useRouter } from "expo-router"
import { MessageCircle } from "lucide-react-native"
import { useAuth } from "@/lib/auth-context"
import { mockMessages, getShopById } from "@/lib/mock-data"

export default function MessagesPage() {
  const { isAuthenticated } = useAuth()
  const router = useRouter()

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <MessageCircle size={80} color="#8e8e8e" />
          <Text style={styles.emptyTitle}>Connectez-vous pour voir vos messages</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.loginButtonText}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const conversations = Object.keys(mockMessages).map((shopId) => {
    const messages = mockMessages[shopId]
    const shop = getShopById(shopId)
    const lastMessage = messages[messages.length - 1]
    const unreadCount = messages.filter((m) => !m.read && m.sender === "shop").length

    return { shop, lastMessage, unreadCount }
  })

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Messages</Text>
        <View style={styles.conversationsList}>
          {conversations.map(({ shop, lastMessage, unreadCount }) => {
            if (!shop) return null

            return (
              <Link key={shop.id} href={`/messages/${shop.id}`} asChild>
                <TouchableOpacity style={styles.conversationItem}>
                  <Image source={{ uri: shop.avatar }} style={styles.avatar} />
                  <View style={styles.conversationContent}>
                    <View style={styles.conversationHeader}>
                      <Text style={styles.shopName}>{shop.name}</Text>
                      <Text style={styles.timestamp}>
                        {new Date(lastMessage.timestamp).toLocaleTimeString("fr-DZ", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                    <View style={styles.messageRow}>
                      <Text
                        style={[
                          styles.lastMessage,
                          unreadCount > 0 && styles.lastMessageUnread,
                        ]}
                        numberOfLines={1}
                      >
                        {lastMessage.text}
                      </Text>
                      {unreadCount > 0 && (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadText}>{unreadCount}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              </Link>
            )
          })}
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 24,
    textAlign: "center",
  },
  loginButton: {
    backgroundColor: "#000",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  conversationsList: {
    gap: 0,
  },
  conversationItem: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  conversationContent: {
    flex: 1,
    justifyContent: "center",
  },
  conversationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  shopName: {
    fontSize: 16,
    fontWeight: "600",
  },
  timestamp: {
    fontSize: 12,
    color: "#8e8e8e",
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    color: "#8e8e8e",
  },
  lastMessageUnread: {
    fontWeight: "600",
    color: "#000",
  },
  unreadBadge: {
    backgroundColor: "#000",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
})
