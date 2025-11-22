import React, { useState, useEffect } from "react"
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native"
import { X, Heart, Send, MessageCircle } from "lucide-react-native"
import type { Video } from "@/lib/mock-data"
import { useAuth } from "@/lib/auth-context"
import { videosAPI } from "@/lib/api"
import { useLanguage } from "@/lib/i18n/language-context"

interface CommentsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  video: Video
}

export function CommentsSheet({ open, onOpenChange, video }: CommentsSheetProps) {
  const { user } = useAuth()
  const { t } = useLanguage()
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open && video.id) {
      console.log("Chargement des commentaires pour la vidéo:", video.id)
      loadComments()
    }
  }, [open, video.id])

  const loadComments = async () => {
    setLoading(true)
    try {
      console.log("Récupération des commentaires pour la vidéo ID:", video.id)
      const data = await videosAPI.getComments(video.id.toString())
      console.log("Commentaires chargés:", data.length)
      setComments(data)
    } catch (error) {
      console.error("Erreur lors du chargement des commentaires:", error)
      setComments([]) // Assurer qu'on a un tableau vide en cas d'erreur
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!newComment.trim() || !user || submitting) return

    setSubmitting(true)
    try {
      const comment = await videosAPI.addComment(video.id.toString(), newComment.trim())
      setComments([comment, ...comments])
      setNewComment("")
    } catch (error) {
      console.error("Erreur lors de l'ajout du commentaire:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleLikeComment = (commentId: string) => {
    // Pour l'instant, juste une animation locale
    // À FAIRE: Ajouter l'API pour liker les commentaires
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (hours < 1) return t("justNow")
    if (hours < 24) return `${t("hoursAgo")} ${hours}${t("hoursAgo") === "ago" ? "h" : "س"}`
    if (days < 7) return `${t("daysAgo")} ${days}${t("daysAgo") === "ago" ? "d" : "ي"}`
    return date.toLocaleDateString()
  }

  console.log("📱 CommentsSheet render - open:", open, "comments:", comments.length)

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={() => onOpenChange(false)}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => onOpenChange(false)} />

        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {comments.length} {t("comments")}
            </Text>
            <TouchableOpacity onPress={() => onOpenChange(false)} style={styles.closeButton}>
              <X size={20} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.commentsList} contentContainerStyle={styles.commentsContent}>
            {loading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="large" color="#000" />
              </View>
            ) : comments.length === 0 ? (
              <View style={styles.emptyState}>
                <MessageCircle size={48} color="#8e8e8e" />
                <Text style={styles.emptyText}>{t("noComments")}</Text>
                <Text style={styles.emptySubtext}>{t("beFirstToComment")}</Text>
              </View>
            ) : (
              <>
                {console.log("💬 Rendering", comments.length, "comments")}

                {comments.map((comment, index) => {
                  console.log(`💬 Comment ${index}:`, comment)
                  console.log(`🖼️ Avatar URL:`, comment.user_avatar)
                  const hasAvatar = comment.user_avatar && comment.user_avatar !== 'null' && comment.user_avatar.trim() !== '';
                  console.log(`✅ Has valid avatar:`, hasAvatar)
                  
                  return (
                    <View key={comment.id || index} style={styles.commentItem}>
                      {hasAvatar ? (
                        <Image 
                          source={{ uri: comment.user_avatar }} 
                          style={styles.commentAvatarImage}
                          onError={(e) => console.log('❌ Erreur de chargement de l\'image:', e.nativeEvent.error)}
                          onLoad={() => console.log('✅ Image chargée avec succès')}
                        />
                      ) : (
                        <View style={styles.commentAvatar}>
                          <Text style={styles.commentAvatarText}>
                            {(comment.user_name || comment.userName || 'U').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={styles.commentContent}>
                        <View style={styles.commentHeader}>
                          <Text style={styles.commentUserName}>
                            {comment.user_name || comment.userName || t("user")}
                          </Text>
                          <Text style={styles.commentTime}>
                            {formatTimestamp(comment.created_at || comment.timestamp || new Date().toISOString())}
                          </Text>
                        </View>
                        <Text style={styles.commentText}>
                          {comment.content || comment.text || ''}
                        </Text>
                      </View>
                    </View>
                  )
                })}
              </>
            )}
          </ScrollView>

          <View style={styles.inputContainer}>
            {((user as any)?.shopLogo || (user as any)?.avatar) ? (
              <Image source={{ uri: (user as any)?.shopLogo || (user as any)?.avatar }} style={styles.inputAvatarImage} />
            ) : (
              <View style={styles.inputAvatar}>
                <Text style={styles.inputAvatarText}>{((user as any)?.shopName || user?.name)?.charAt(0)}</Text>
              </View>
            )}
            <View style={styles.inputWrapper}>
              <TextInput
                value={newComment}
                onChangeText={setNewComment}
                placeholder={t("addComment")}
                style={styles.input}
                multiline
              />
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!newComment.trim()}
                style={[styles.sendButton, !newComment.trim() && styles.sendButtonDisabled]}
              >
                <Send size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "80%",
    flexDirection: "column",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  commentsList: {
    flex: 1,
  },
  commentsContent: {
    padding: 16,
    gap: 16,
  },
  loadingState: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: "#8e8e8e",
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#8e8e8e",
  },
  commentItem: {
    flexDirection: "row",
    gap: 12,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#e5e5e5",
    alignItems: "center",
    justifyContent: "center",
  },
  commentAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentAvatarText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  commentUserName: {
    fontSize: 14,
    fontWeight: "600",
  },
  commentTime: {
    fontSize: 12,
    color: "#8e8e8e",
  },
  commentText: {
    fontSize: 14,
    color: "#000",
    marginBottom: 8,
  },
  likeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  likeCount: {
    fontSize: 12,
    color: "#8e8e8e",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    backgroundColor: "#fff",
    gap: 8,
  },
  inputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  inputAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  inputAvatarText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#f7f7f7",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
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
})
