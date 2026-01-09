'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { messagingService, Conversation, Message } from '@/lib/messaging/messaging-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MessageSquare,
  Search,
  Send,
  Plus,
  MoreVertical,
  User,
  Users,
  Bell,
  BellOff,
  Archive,
  Trash2,
  Check,
  CheckCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export default function MessagesPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessageDialogOpen, setNewMessageDialogOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchConversations();
      fetchAvailableUsers();
    }
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      messagingService.markAsRead(selectedConversation.id);

      // Subscribe to new messages
      const unsubscribe = messagingService.subscribeToMessages(
        selectedConversation.id,
        (newMessage) => {
          setMessages(prev => [...prev, newMessage]);
          scrollToBottom();
        }
      );

      return () => unsubscribe();
    }
  }, [selectedConversation?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  async function fetchConversations() {
    setLoading(true);
    try {
      const data = await messagingService.getConversations();
      setConversations(data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchMessages(conversationId: string) {
    try {
      const data = await messagingService.getMessages(conversationId);
      setMessages(data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }

  async function fetchAvailableUsers() {
    try {
      const { data } = await supabase
        .from('users')
        .select('id, display_name, email, role')
        .neq('id', user?.id)
        .order('display_name');

      setAvailableUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!messageInput.trim() || !selectedConversation) return;

    setSending(true);
    try {
      const message = await messagingService.sendMessage(
        selectedConversation.id,
        messageInput.trim()
      );

      if (message) {
        setMessages(prev => [...prev, message]);
        setMessageInput('');
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send message'
      });
    } finally {
      setSending(false);
    }
  }

  async function handleStartConversation() {
    if (!selectedRecipient) return;

    try {
      const conversationId = await messagingService.getOrCreateDirectConversation(selectedRecipient);
      
      if (conversationId) {
        await fetchConversations();
        const conv = conversations.find(c => c.id === conversationId);
        if (conv) {
          setSelectedConversation(conv);
        } else {
          const newConv = await messagingService.getConversation(conversationId);
          if (newConv) {
            setSelectedConversation(newConv);
            setConversations(prev => [newConv, ...prev]);
          }
        }
        setNewMessageDialogOpen(false);
        setSelectedRecipient('');
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to start conversation'
      });
    }
  }

  async function handleArchiveConversation(conversationId: string) {
    const success = await messagingService.archiveConversation(conversationId);
    if (success) {
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
      }
      toast({ title: 'Conversation archived' });
    }
  }

  async function handleToggleMute(conversationId: string, currentMuted: boolean) {
    const success = await messagingService.toggleMute(conversationId, !currentMuted);
    if (success) {
      await fetchConversations();
      toast({ title: currentMuted ? 'Notifications enabled' : 'Notifications muted' });
    }
  }

  const getConversationName = (conversation: Conversation) => {
    if (conversation.title) return conversation.title;
    if (conversation.type === 'direct') {
      const otherParticipant = conversation.participants?.find(p => p.user_id !== user?.id);
      return otherParticipant?.user?.display_name || 'Unknown User';
    }
    return 'Group Conversation';
  };

  const getConversationAvatar = (conversation: Conversation) => {
    if (conversation.type === 'direct') {
      const otherParticipant = conversation.participants?.find(p => p.user_id !== user?.id);
      return otherParticipant?.user?.avatar_url;
    }
    return null;
  };

  const filteredConversations = conversations.filter(c => {
    if (!searchQuery) return true;
    const name = getConversationName(c).toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return (
      <div className="h-[calc(100vh-200px)] flex gap-4">
        <Skeleton className="w-80 h-full" />
        <Skeleton className="flex-1 h-full" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-200px)] flex gap-4">
      {/* Conversations List */}
      <Card className="w-80 flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Messages
            </CardTitle>
            <Dialog open={newMessageDialogOpen} onOpenChange={setNewMessageDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="ghost">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Message</DialogTitle>
                  <DialogDescription>
                    Start a conversation with a teacher or student
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Input
                    placeholder="Search users..."
                    className="mb-4"
                  />
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {availableUsers.map(u => (
                        <div
                          key={u.id}
                          className={cn(
                            "p-3 rounded-lg cursor-pointer transition-colors",
                            selectedRecipient === u.id
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted"
                          )}
                          onClick={() => setSelectedRecipient(u.id)}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {u.display_name?.charAt(0) || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{u.display_name}</p>
                              <p className={cn(
                                "text-xs",
                                selectedRecipient === u.id ? "text-primary-foreground/70" : "text-muted-foreground"
                              )}>
                                {u.role}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setNewMessageDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleStartConversation} disabled={!selectedRecipient}>
                    Start Conversation
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No conversations yet</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredConversations.map(conversation => (
                  <div
                    key={conversation.id}
                    className={cn(
                      "p-3 cursor-pointer transition-colors hover:bg-muted/50",
                      selectedConversation?.id === conversation.id && "bg-muted"
                    )}
                    onClick={() => setSelectedConversation(conversation)}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={getConversationAvatar(conversation) || undefined} />
                        <AvatarFallback>
                          {conversation.type === 'direct' ? (
                            <User className="h-4 w-4" />
                          ) : (
                            <Users className="h-4 w-4" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm truncate">
                            {getConversationName(conversation)}
                          </p>
                          {conversation.unread_count && conversation.unread_count > 0 && (
                            <Badge variant="default" className="ml-2 h-5 min-w-5 px-1.5">
                              {conversation.unread_count}
                            </Badge>
                          )}
                        </div>
                        {conversation.last_message && (
                          <p className="text-xs text-muted-foreground truncate">
                            {conversation.last_message.content}
                          </p>
                        )}
                        {conversation.last_message_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={getConversationAvatar(selectedConversation) || undefined} />
                    <AvatarFallback>
                      {selectedConversation.type === 'direct' ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Users className="h-4 w-4" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{getConversationName(selectedConversation)}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedConversation.type === 'direct' ? 'Direct message' : `${selectedConversation.participants?.length || 0} participants`}
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleToggleMute(selectedConversation.id, false)}>
                      <BellOff className="h-4 w-4 mr-2" />
                      Mute Notifications
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleArchiveConversation(selectedConversation.id)}>
                      <Archive className="h-4 w-4 mr-2" />
                      Archive
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>

            {/* Messages */}
            <CardContent className="flex-1 p-4 overflow-hidden">
              <ScrollArea className="h-full pr-4">
                <div className="space-y-4">
                  {messages.map((message, index) => {
                    const isOwn = message.sender_id === user?.id;
                    const showAvatar = !isOwn && (index === 0 || messages[index - 1]?.sender_id !== message.sender_id);

                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "flex items-end gap-2",
                          isOwn && "flex-row-reverse"
                        )}
                      >
                        {!isOwn && showAvatar && (
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={message.sender?.avatar_url || undefined} />
                            <AvatarFallback>
                              {message.sender?.display_name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        {!isOwn && !showAvatar && <div className="w-8" />}
                        <div
                          className={cn(
                            "max-w-[70%] px-4 py-2 rounded-2xl",
                            isOwn
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-muted rounded-bl-md"
                          )}
                        >
                          {!isOwn && showAvatar && (
                            <p className="text-xs font-medium mb-1">
                              {message.sender?.display_name}
                            </p>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          <p className={cn(
                            "text-xs mt-1",
                            isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                          )}>
                            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                            {message.is_edited && ' (edited)'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </CardContent>

            {/* Message Input */}
            <div className="p-4 border-t">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <Input
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  disabled={sending}
                  className="flex-1"
                />
                <Button type="submit" disabled={sending || !messageInput.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
              <p className="text-muted-foreground mb-4">
                Choose a conversation from the list or start a new one
              </p>
              <Button onClick={() => setNewMessageDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Message
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
