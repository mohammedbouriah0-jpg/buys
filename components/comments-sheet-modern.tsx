import React, { useState, useEffect } from "react";
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
  Animated,
} from "react-native";
import { X, Heart, Send, MessageCircle, CornerDownRight } from "lucide-react-native";
import type { Video } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth-context";
import { videosAPI, getMediaUrl } from "@/lib/api";
import { useLanguage } from "@/lib/i18n/language-context";

interface CommentsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video: Video;
}

export function CommentsSheetModern({ open, onOpenChange, video }: CommentsSheetProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [likedComments, setLikedComments] = useState<Set<number>>(new Set());
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalComments, setTotalComments] = useState(0);

  useEffect(() => {
    if (open && video.id) {
      // Reset state when opening
      setComments([]);
      setPage(1);
      setHasMore(true);
      loadComments(1, true);
    }
  }, [open, video.id]);

  const loadComments = async (pageNum: number = 1, reset: boolean = false) => {
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    try {
      const data = await videosAPI.getComments(video.id.toString(), pageNum, 10);
      // Handle both old format (array) and new format (object with comments)
      if (Array.isArray(data)) {
        setComments(reset ? data : [...comments, ...data]);
        setHasMore(false);
        setTotalComments(data.length);
      } else {
        setComments(reset ? data.comments : [...comments, ...data.comments]);
        setHasMore(data.hasMore);
        setTotalComments(data.total);
        setPage(pageNum);
      }
    } catch (error) {
      console.error("Error loading comments:", error);
      if (reset) setComments([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleScroll = (event: any) => {
    if (loadingMore || !hasMore) return;
    
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 50;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
    
    if (isCloseToBottom) {
      loadComments(page + 1, false);
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim() || !user || submitting) return;

    setSubmitting(true);
    try {
      const comment = await videosAPI.addComment(
        video.id.toString(), 
        newComment.trim(),
        replyingTo || undefined
      );
      
      // Reload comments to get updated structure
      await loadComments(1, true);
      setNewComment("");
      setReplyingTo(null);
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId: number) => {
    try {
      const result = await videosAPI.likeComment(commentId.toString());
      
      // Update comment in list
      setComments(comments.map(c => 
        c.id === commentId 
          ? { ...c, liked: result.liked, likes_count: result.likes_count }
          : c
      ));
    } catch (error) {
      console.error("Error liking comment:", error);
    }
  };

  const handleReply = (commentId: number, userName: string) => {
    setReplyingTo(commentId);
    setNewComment(`@${userName} `);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num?.toString() || "0";
  };

  const renderComment = (comment: any, isReply = false) => {
    const isLiked = comment.liked || false;
    const likesCount = comment.likes_count || 0;
    const repliesCount = comment.replies_count || 0;
    
    // Use shop info if user is a shop
    const isShop = comment.user_type === 'shop';
    const displayName = isShop && comment.shop_name ? comment.shop_name : (comment.user_name || t("user"));
    // Prioritize shop_logo for shops, fallback to user_avatar
    const displayAvatar = isShop ? (comment.shop_logo || comment.user_avatar) : comment.user_avatar;
    const hasAvatar = displayAvatar && displayAvatar !== 'null' && displayAvatar !== null;
    const isVerified = isShop && comment.shop_verified;
    
    return (
      <View key={comment.id}>
        <View style={[styles.commentItem, isReply && styles.replyItem]}>
          {/* Avatar / Logo */}
          {hasAvatar ? (
            <Image source={{ uri: getMediaUrl(displayAvatar) }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          {/* Content */}
          <View style={styles.commentContent}>
            <View style={styles.commentHeader}>
              <View style={styles.userNameContainer}>
                <Text style={styles.userName}>{displayName}</Text>
                {isVerified && <Text style={styles.verifiedBadge}>✓</Text>}
              </View>
              <Text style={styles.timestamp}>{formatTimestamp(comment.created_at)}</Text>
            </View>
            
            <Text style={styles.commentText}>{comment.content}</Text>

            {/* Actions */}
            <View style={styles.commentActions}>
              <TouchableOpacity
                onPress={() => handleLikeComment(comment.id)}
                style={styles.actionButton}
              >
                <Heart
                  size={13}
                  color={isLiked ? "#ef4444" : "#9ca3af"}
                  fill={isLiked ? "#ef4444" : "none"}
                />
                {likesCount > 0 && (
                  <Text style={[styles.actionText, isLiked && styles.actionTextLiked]}>
                    {formatNumber(likesCount)}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleReply(comment.id, displayName)}
                style={styles.actionButton}
              >
                <Text style={styles.actionText}>{t("reply")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && !isReply && (
          <View style={styles.repliesSection}>
            <TouchableOpacity
              onPress={() => {
                const newExpanded = new Set(expandedComments);
                if (newExpanded.has(comment.id)) {
                  newExpanded.delete(comment.id);
                } else {
                  newExpanded.add(comment.id);
                }
                setExpandedComments(newExpanded);
              }}
              style={styles.viewRepliesButton}
            >
              <CornerDownRight size={14} color="#3b82f6" />
              <Text style={styles.viewRepliesText}>
                {expandedComments.has(comment.id)
                  ? t("hideReplies")
                  : `${t("viewReplies")} ${comment.replies.length}`
                }
              </Text>
            </TouchableOpacity>
            
            {expandedComments.has(comment.id) && (
              <View style={styles.repliesContainer}>
                {comment.replies.map((reply: any) => renderComment(reply, true))}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return t("justNow");
    if (minutes < 60) return `${minutes}${t("minutesShort")}`;
    if (hours < 24) return `${hours}${t("hoursShort")}`;
    if (days < 7) return `${days}${t("daysShort")}`;
    return date.toLocaleDateString();
  };

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={() => onOpenChange(false)}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => onOpenChange(false)} />

        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <MessageCircle size={20} color="#000" />
              <Text style={styles.headerTitle}>
                {totalComments} {t("comments")}
              </Text>
            </View>
            <TouchableOpacity onPress={() => onOpenChange(false)} style={styles.closeButton}>
              <X size={20} color="#000" />
            </TouchableOpacity>
          </View>

          {/* Comments List */}
          <ScrollView 
            style={styles.commentsList} 
            contentContainerStyle={styles.commentsContent}
            onScroll={handleScroll}
            scrollEventThrottle={400}
          >
            {loading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="large" color="#000" />
              </View>
            ) : comments.length === 0 ? (
              <View style={styles.emptyState}>
                <MessageCircle size={48} color="#d1d5db" />
                <Text style={styles.emptyText}>{t("noComments")}</Text>
                <Text style={styles.emptySubtext}>{t("beFirstToComment")}</Text>
              </View>
            ) : (
              <>
                {comments.map((comment) => renderComment(comment))}
                {loadingMore && (
                  <View style={styles.loadingMore}>
                    <ActivityIndicator size="small" color="#000" />
                  </View>
                )}
              </>
            )}
          </ScrollView>

          {/* Input */}
          <View style={styles.inputContainer}>
            {replyingTo && (
              <View style={styles.replyingBanner}>
                <CornerDownRight size={14} color="#6b7280" />
                <Text style={styles.replyingText}>{t("replying")}</Text>
                <TouchableOpacity onPress={() => { setReplyingTo(null); setNewComment(""); }}>
                  <X size={14} color="#6b7280" />
                </TouchableOpacity>
              </View>
            )}
            
            <View style={styles.inputRow}>
              {((user as any)?.shopLogo || (user as any)?.avatar) ? (
                <Image source={{ uri: getMediaUrl((user as any)?.shopLogo || (user as any)?.avatar) }} style={styles.inputAvatar} />
              ) : (
                <View style={styles.inputAvatarPlaceholder}>
                  <Text style={styles.inputAvatarText}>{((user as any)?.shopName || user?.name)?.charAt(0)}</Text>
                </View>
              )}
              
              <View style={styles.inputWrapper}>
                <TextInput
                  value={newComment}
                  onChangeText={setNewComment}
                  placeholder={t("addComment")}
                  placeholderTextColor="#9ca3af"
                  style={styles.input}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={!newComment.trim() || submitting}
                  style={[styles.sendButton, (!newComment.trim() || submitting) && styles.sendButtonDisabled]}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Send size={18} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: "85%",
    flexDirection: "column",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f3f4f6",
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
    paddingVertical: 40,
  },
  loadingMore: {
    alignItems: "center",
    paddingVertical: 16,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9ca3af",
  },
  commentItem: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  replyItem: {
    marginLeft: 36,
  },
  repliesSection: {
    marginLeft: 36,
  },
  viewRepliesButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  viewRepliesText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3b82f6",
  },
  repliesContainer: {
    marginTop: 2,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
  },
  commentContent: {
    flex: 1,
    gap: 4,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  userNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  userName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  verifiedBadge: {
    fontSize: 10,
    color: "#3b82f6",
    fontWeight: "700",
  },
  timestamp: {
    fontSize: 11,
    color: "#9ca3af",
  },
  commentText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#374151",
  },
  commentActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 2,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9ca3af",
  },
  actionTextLiked: {
    color: "#ef4444",
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    backgroundColor: "#fff",
  },
  replyingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#f9fafb",
  },
  replyingText: {
    flex: 1,
    fontSize: 13,
    color: "#6b7280",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    padding: 16,
  },
  inputAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  inputAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  inputAvatarText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    backgroundColor: "#f3f4f6",
    borderRadius: 20,
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#d1d5db",
  },
});
