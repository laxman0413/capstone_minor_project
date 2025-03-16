export interface Message {
  sender: 'user' | 'admin';
  message: string;
  timestamp: Date;
}

export interface UserTicket {
  _id: string;
  issue: string;
  status: 'open' | 'in-progress' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  messages: Message[];
  userId: {
    name: string;
    email: string;
  };
}