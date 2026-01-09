/**
 * Messaging Service
 * Direct messaging between teachers and students
 */

import { createClient } from '@/lib/supabase/client';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'file' | 'image' | 'system';
  metadata?: Record<string, any>;
  parent_id?: string;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  sender?: {
    id: string;
    display_name: string;
    email: string;
    avatar_url?: string;
  };
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group' | 'class';
  title?: string;
  class_id?: string;
  created_by: string;
  created_at: string;
  last_message_at?: string;
  is_archived: boolean;
  participants?: ConversationParticipant[];
  last_message?: Message;
  unread_count?: number;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  is_admin: boolean;
  is_muted: boolean;
  last_read_at?: string;
  unread_count: number;
  user?: {
    id: string;
    display_name: string;
    email: string;
    avatar_url?: string;
    role?: string;
  };
}

export class MessagingService {
  private supabase = createClient();

  /**
   * Get or create a direct conversation with another user
   */
  async getOrCreateDirectConversation(otherUserId: string): Promise<string | null> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await this.supabase
        .rpc('get_or_create_direct_conversation', {
          user1_id: user.id,
          user2_id: otherUserId
        });

      if (error) {
        console.error('Error getting/creating conversation:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getOrCreateDirectConversation:', error);
      return null;
    }
  }

  /**
   * Create a class conversation
   */
  async createClassConversation(classId: string, title: string): Promise<string | null> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return null;

      // Create conversation
      const { data: conversation, error: convError } = await this.supabase
        .from('conversations')
        .insert({
          type: 'class',
          title,
          class_id: classId,
          created_by: user.id
        })
        .select()
        .single();

      if (convError || !conversation) {
        console.error('Error creating class conversation:', convError);
        return null;
      }

      // Add teacher as participant
      await this.supabase
        .from('conversation_participants')
        .insert({
          conversation_id: conversation.id,
          user_id: user.id,
          is_admin: true
        });

      // Add all class students as participants
      const { data: enrollments } = await this.supabase
        .from('enrollments')
        .select('student_id')
        .eq('class_id', classId)
        .eq('status', 'active');

      if (enrollments && enrollments.length > 0) {
        const participantInserts = enrollments.map(e => ({
          conversation_id: conversation.id,
          user_id: e.student_id,
          is_admin: false
        }));

        await this.supabase
          .from('conversation_participants')
          .insert(participantInserts);
      }

      return conversation.id;
    } catch (error) {
      console.error('Error creating class conversation:', error);
      return null;
    }
  }

  /**
   * Get user's conversations
   */
  async getConversations(): Promise<Conversation[]> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return [];

      // Get conversations where user is a participant
      const { data: participants, error } = await this.supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          unread_count,
          last_read_at,
          is_muted,
          conversation:conversations(
            id,
            type,
            title,
            class_id,
            created_by,
            created_at,
            last_message_at,
            is_archived
          )
        `)
        .eq('user_id', user.id)
        .is('left_at', null)
        .order('conversation(last_message_at)', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        return [];
      }

      // Enrich with participants and last message
      const conversations: Conversation[] = [];
      
      for (const p of participants || []) {
        const conv = p.conversation as any;
        if (!conv) continue;

        // Get other participants
        const { data: convParticipants } = await this.supabase
          .from('conversation_participants')
          .select(`
            user_id,
            is_admin,
            user:users(id, display_name, email, avatar_url, role)
          `)
          .eq('conversation_id', conv.id)
          .is('left_at', null);

        // Get last message
        const { data: lastMessages } = await this.supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(1);

        conversations.push({
          ...conv,
          participants: convParticipants?.map(cp => ({
            ...cp,
            conversation_id: conv.id,
            id: cp.user_id,
            is_muted: false,
            unread_count: 0
          })) || [],
          last_message: lastMessages?.[0] || null,
          unread_count: p.unread_count
        });
      }

      return conversations;
    } catch (error) {
      console.error('Error in getConversations:', error);
      return [];
    }
  }

  /**
   * Get conversation by ID with participants
   */
  async getConversation(conversationId: string): Promise<Conversation | null> {
    try {
      const { data: conversation, error } = await this.supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (error || !conversation) {
        console.error('Error fetching conversation:', error);
        return null;
      }

      // Get participants
      const { data: participants } = await this.supabase
        .from('conversation_participants')
        .select(`
          *,
          user:users(id, display_name, email, avatar_url, role)
        `)
        .eq('conversation_id', conversationId)
        .is('left_at', null);

      return {
        ...conversation,
        participants: participants || []
      };
    } catch (error) {
      console.error('Error in getConversation:', error);
      return null;
    }
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(conversationId: string, limit = 50, before?: string): Promise<Message[]> {
    try {
      let query = this.supabase
        .from('messages')
        .select(`
          *,
          sender:users(id, display_name, email, avatar_url)
        `)
        .eq('conversation_id', conversationId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (before) {
        query = query.lt('created_at', before);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching messages:', error);
        return [];
      }

      // Return in chronological order
      return (data || []).reverse();
    } catch (error) {
      console.error('Error in getMessages:', error);
      return [];
    }
  }

  /**
   * Send a message
   */
  async sendMessage(
    conversationId: string,
    content: string,
    messageType: 'text' | 'file' | 'image' = 'text',
    metadata?: Record<string, any>,
    parentId?: string
  ): Promise<Message | null> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return null;

      const { data: message, error } = await this.supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content,
          message_type: messageType,
          metadata: metadata || {},
          parent_id: parentId
        })
        .select(`
          *,
          sender:users(id, display_name, email, avatar_url)
        `)
        .single();

      if (error) {
        console.error('Error sending message:', error);
        return null;
      }

      return message;
    } catch (error) {
      console.error('Error in sendMessage:', error);
      return null;
    }
  }

  /**
   * Edit a message
   */
  async editMessage(messageId: string, newContent: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('messages')
        .update({
          content: newContent,
          is_edited: true,
          edited_at: new Date().toISOString()
        })
        .eq('id', messageId);

      return !error;
    } catch (error) {
      console.error('Error editing message:', error);
      return false;
    }
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(messageId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('messages')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString()
        })
        .eq('id', messageId);

      return !error;
    } catch (error) {
      console.error('Error deleting message:', error);
      return false;
    }
  }

  /**
   * Mark conversation as read
   */
  async markAsRead(conversationId: string): Promise<boolean> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return false;

      const { error } = await this.supabase
        .from('conversation_participants')
        .update({
          last_read_at: new Date().toISOString(),
          unread_count: 0
        })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);

      return !error;
    } catch (error) {
      console.error('Error marking as read:', error);
      return false;
    }
  }

  /**
   * Mute/unmute conversation
   */
  async toggleMute(conversationId: string, muted: boolean): Promise<boolean> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return false;

      const { error } = await this.supabase
        .from('conversation_participants')
        .update({ is_muted: muted })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);

      return !error;
    } catch (error) {
      console.error('Error toggling mute:', error);
      return false;
    }
  }

  /**
   * Archive conversation
   */
  async archiveConversation(conversationId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('conversations')
        .update({ is_archived: true })
        .eq('id', conversationId);

      return !error;
    } catch (error) {
      console.error('Error archiving conversation:', error);
      return false;
    }
  }

  /**
   * Subscribe to new messages in a conversation
   */
  subscribeToMessages(
    conversationId: string,
    callback: (message: Message) => void
  ): () => void {
    const channel = this.supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          // Fetch sender info
          const { data: sender } = await this.supabase
            .from('users')
            .select('id, display_name, email, avatar_url')
            .eq('id', payload.new.sender_id)
            .single();

          callback({
            ...payload.new as Message,
            sender
          });
        }
      )
      .subscribe();

    return () => {
      this.supabase.removeChannel(channel);
    };
  }

  /**
   * Get unread message count across all conversations
   */
  async getTotalUnreadCount(): Promise<number> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return 0;

      const { data, error } = await this.supabase
        .from('conversation_participants')
        .select('unread_count')
        .eq('user_id', user.id)
        .is('left_at', null);

      if (error || !data) return 0;

      return data.reduce((sum, p) => sum + (p.unread_count || 0), 0);
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Search messages
   */
  async searchMessages(query: string, conversationId?: string): Promise<Message[]> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return [];

      let dbQuery = this.supabase
        .from('messages')
        .select(`
          *,
          sender:users(id, display_name, email, avatar_url),
          conversation:conversations(id, title, type)
        `)
        .ilike('content', `%${query}%`)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (conversationId) {
        dbQuery = dbQuery.eq('conversation_id', conversationId);
      }

      const { data, error } = await dbQuery;

      if (error) {
        console.error('Error searching messages:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in searchMessages:', error);
      return [];
    }
  }
}

export const messagingService = new MessagingService();
