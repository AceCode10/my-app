'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { 
  MessageSquare, 
  Send,
  ArrowLeft,
  Loader2,
  Search,
  Circle
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  class_id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  sender?: { display_name: string; avatar_url?: string };
  recipient?: { display_name: string; avatar_url?: string };
}

interface Conversation {
  recipientId: string;
  recipientName: string;
  recipientAvatar?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: Message[];
}

interface ThreadedMessagesProps {
  classId: string;
}

export function ThreadedMessages({ classId }: ThreadedMessagesProps) {
  const { user } = useUser();
  const supabase = createClient();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) {
      fetchAllMessages();
    }
  }, [user, classId]);

  useEffect(() => {
    scrollToBottom();
  }, [selectedConversation?.messages]);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  async function fetchAllMessages() {
    if (!user) return;
    setIsLoading(true);
    
    try {
      // Fetch all messages where teacher is sender or recipient
      const { data, error } = await supabase
        .from('class_messages')
        .select(`
          *,
          sender:users!class_messages_sender_id_fkey(display_name, avatar_url),
          recipient:users!class_messages_recipient_id_fkey(display_name, avatar_url)
        `)
        .eq('class_id', classId)
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      // Group messages by conversation (the other party)
      const conversationMap = new Map<string, Conversation>();

      (data || []).forEach(msg => {
        // Determine the other party (not the teacher)
        const isTeacherSender = msg.sender_id === user.id;
        const otherPartyId = isTeacherSender ? msg.recipient_id : msg.sender_id;
        const otherPartyName = isTeacherSender 
          ? msg.recipient?.display_name || 'Student'
          : msg.sender?.display_name || 'Student';
        const otherPartyAvatar = isTeacherSender 
          ? msg.recipient?.avatar_url
          : msg.sender?.avatar_url;

        if (!conversationMap.has(otherPartyId)) {
          conversationMap.set(otherPartyId, {
            recipientId: otherPartyId,
            recipientName: otherPartyName,
            recipientAvatar: otherPartyAvatar,
            lastMessage: msg.message,
            lastMessageTime: msg.created_at,
            unreadCount: 0,
            messages: []
          });
        }

        const conv = conversationMap.get(otherPartyId)!;
        conv.messages.push(msg);
        conv.lastMessage = msg.message;
        conv.lastMessageTime = msg.created_at;
        
        // Count unread messages sent TO the teacher
        if (!isTeacherSender && !msg.is_read) {
          conv.unreadCount++;
        }
      });

      // Sort conversations by last message time (newest first)
      const sortedConversations = Array.from(conversationMap.values())
        .sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());

      setConversations(sortedConversations);

      // Update selected conversation if it exists
      if (selectedConversation) {
        const updated = sortedConversations.find(c => c.recipientId === selectedConversation.recipientId);
        if (updated) {
          setSelectedConversation(updated);
        }
      }
    } catch (err) {
      console.error('Exception fetching messages:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSendMessage() {
    if (!user || !selectedConversation || !newMessage.trim()) return;
    setIsSending(true);

    try {
      const { error } = await supabase
        .from('class_messages')
        .insert({
          class_id: classId,
          sender_id: user.id,
          recipient_id: selectedConversation.recipientId,
          message: newMessage.trim(),
          is_read: false
        });

      if (error) {
        console.error('Error sending message:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not send message.' });
      } else {
        setNewMessage('');
        await fetchAllMessages();
      }
    } catch (err) {
      console.error('Exception sending message:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred.' });
    } finally {
      setIsSending(false);
    }
  }

  async function markConversationAsRead(conversation: Conversation) {
    if (!user) return;

    // Mark all unread messages in this conversation as read
    const unreadIds = conversation.messages
      .filter(m => m.recipient_id === user.id && !m.is_read)
      .map(m => m.id);

    if (unreadIds.length > 0) {
      await supabase
        .from('class_messages')
        .update({ is_read: true })
        .in('id', unreadIds);

      await fetchAllMessages();
    }
  }

  function selectConversation(conv: Conversation) {
    setSelectedConversation(conv);
    markConversationAsRead(conv);
  }

  const filteredConversations = conversations.filter(conv =>
    conv.recipientName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Student Messages
          {totalUnread > 0 && (
            <Badge variant="destructive">{totalUnread} unread</Badge>
          )}
        </CardTitle>
        <CardDescription>Chat with students in this class</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <div className="flex h-full">
          {/* Conversation List */}
          <div className={`w-full md:w-1/3 border-r flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <ScrollArea className="flex-1">
              {filteredConversations.length > 0 ? (
                filteredConversations.map((conv) => (
                  <div
                    key={conv.recipientId}
                    className={`p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedConversation?.recipientId === conv.recipientId ? 'bg-muted' : ''
                    }`}
                    onClick={() => selectConversation(conv)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={conv.recipientAvatar} />
                          <AvatarFallback>{conv.recipientName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {conv.unreadCount > 0 && (
                          <Circle className="absolute -top-1 -right-1 h-4 w-4 fill-primary text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`font-medium text-sm truncate ${conv.unreadCount > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {conv.recipientName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(conv.lastMessageTime), { addSuffix: false })}
                          </span>
                        </div>
                        <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                          {conv.lastMessage}
                        </p>
                      </div>
                      {conv.unreadCount > 0 && (
                        <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground text-center">
                    {searchQuery ? 'No conversations found' : 'No messages yet'}
                  </p>
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Chat View */}
          <div className={`flex-1 flex flex-col ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}>
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-3 border-b flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={() => setSelectedConversation(null)}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={selectedConversation.recipientAvatar} />
                    <AvatarFallback>{selectedConversation.recipientName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{selectedConversation.recipientName}</span>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {selectedConversation.messages.map((msg) => {
                      const isTeacherMessage = msg.sender_id === user?.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isTeacherMessage ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                              isTeacherMessage
                                ? 'bg-primary text-primary-foreground rounded-br-md'
                                : 'bg-muted rounded-bl-md'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                            <p className={`text-xs mt-1 ${isTeacherMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                              {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="p-3 border-t">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      disabled={isSending}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={isSending || !newMessage.trim()}
                      size="icon"
                    >
                      {isSending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mb-4" />
                <p className="text-lg font-medium">Select a conversation</p>
                <p className="text-sm">Choose a student from the list to start chatting</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
