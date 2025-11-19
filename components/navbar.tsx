'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useCustomer } from '@/hooks/useAutumnCustomer';
import { UserAvatar } from '@/components/ui/user-avatar';
import { Bell } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';

// Separate component that only renders when Autumn is available
function UserCredits() {
  const { customer } = useCustomer();
  const messageUsage = customer?.features?.messages;
  const remainingMessages = messageUsage ? (messageUsage.balance || 0) : 0;

  return (
    <div className="flex items-center text-sm font-medium text-gray-700">
      <span>{remainingMessages}</span>
      <span className="ml-1">credits</span>
    </div>
  );
}

function NotificationBell() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: unreadCountData } = useQuery({
    queryKey: ['unreadNotificationsCount'],
    queryFn: async () => {
      const res = await fetch('/api/notifications/unread-count');
      if (!res.ok) throw new Error('Failed to fetch unread count');
      const data = await res.json();
      return data.count;
    },
    refetchInterval: 30000, // Poll every 30 seconds
  });

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications/list');
      if (!res.ok) throw new Error('Failed to fetch notifications');
      const data = await res.json();
      return data.notifications;
    },
    refetchInterval: 30000, // Poll every 30 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch('/api/notifications/mark-as-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Failed to mark notification as read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationsCount'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const unreadCount = unreadCountData || 0;
  const notificationsList = notificationsData || [];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
          <Bell className="h-6 w-6 text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full transform translate-x-1/2 -translate-y-1/2">
              {unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <div className="max-h-96 overflow-y-auto">
          {notificationsList.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">No notifications</p>
          ) : (
            notificationsList.map((notification: any) => (
              <div
                key={notification.id}
                className={`flex items-center p-3 border-b hover:bg-gray-50 cursor-pointer ${
                  !notification.read ? 'bg-blue-50' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex-1">
                  <p className={`text-sm ${!notification.read ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </p>
                </div>
                {!notification.read && (
                  <span className="ml-2 h-2 w-2 rounded-full bg-blue-500" aria-hidden="true"></span>
                )}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function Navbar() {
  const { data: session, isPending } = useSession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      // Small delay to ensure the session is cleared
      setTimeout(() => {
        router.refresh();
        setIsLoggingOut(false);
      }, 100);
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
    }
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link
              href="/brand-profiles"
              className="flex items-center focus:outline-none"
            >
              <Image
                src="/firecrawl-logo-with-fire.png"
                alt="AutoReach"
                width={120}
                height={25}
                priority
              />
            </Link>
          </div>

          <div className="flex items-center space-x-4">
                        {session && (
                          <>
                            <NotificationBell />
                          </>
                        )}
                        <Link
                          href="/plans"
                          className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                        >
                          Plans
                        </Link>
            {session && (
              <UserCredits />
            )}
            {isPending ? (
              <div className="text-sm text-gray-400">Loading...</div>
            ) : session ? (
              <>
                <Link
                  href="/profile"
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="View Profile"
                >
                  <UserAvatar size="sm" />
                  <span className="text-sm font-medium text-gray-700">Profile</span>
                </Link>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="btn-firecrawl-default inline-flex items-center justify-center whitespace-nowrap rounded-[10px] text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 h-8 px-3"
                >
                  {isLoggingOut ? 'Logging out...' : 'Logout'}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="btn-firecrawl-orange inline-flex items-center justify-center whitespace-nowrap rounded-[10px] text-sm font-medium transition-all duration-200 h-8 px-3"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="btn-firecrawl-orange inline-flex items-center justify-center whitespace-nowrap rounded-[10px] text-sm font-medium transition-all duration-200 h-8 px-3"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
