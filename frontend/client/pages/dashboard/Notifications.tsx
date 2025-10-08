import { useState, useEffect } from "react";
import { Clock, Check, X } from "lucide-react";
import { 
  getNotifications, 
  markNotificationAsRead, 
  deleteNotification, 
  markAllNotificationsAsRead,
  type Notification as APINotification 
} from "../../../shared/api/notifications";
import { dynamicPricingService } from "../../../shared/api/dynamic";

interface Notification {
  id: number;
  type: "success" | "warning" | "info" | "error";
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
  isNew: boolean;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentFilter, setCurrentFilter] = useState<"all" | "unread">("unread");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch notifications and trigger MSP check on component load
  useEffect(() => {
    async function loadNotifications() {
      try {
        setIsLoading(true);
        setError(null);
        
        // First, trigger MSP check for all user properties
        // This will create notifications if MSP is missing
        try {
          await dynamicPricingService.checkMSPStatusAllProperties();
          console.log('MSP check completed for all properties');
        } catch (mspError) {
          console.warn('MSP check failed (non-critical):', mspError);
          // Don't fail the whole page if MSP check fails
        }
        
        // Then fetch all notifications
        const response = await getNotifications({ 
          filter: currentFilter === 'unread' ? 'unread' : 'all',
          limit: 100 
        });
        
        // Map API notifications to local format
        const mappedNotifications: Notification[] = response.notifications.map((n: APINotification) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          description: n.description,
          timestamp: n.timestamp,
          isRead: n.is_read,
          isNew: n.is_new,
        }));
        
        setNotifications(mappedNotifications);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load notifications:', err);
        setError('Failed to load notifications. Please try again.');
        setIsLoading(false);
      }
    }
    
    loadNotifications();
  }, [currentFilter]); // Reload when filter changes

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const newCount = notifications.filter((n) => n.isNew).length;
  const totalCount = notifications.length;

  const filteredNotifications =
    currentFilter === "unread"
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  const markAsRead = async (id: number) => {
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, isNew: false } : n)),
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const dismissNotification = async (id: number) => {
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, isNew: false })),
      );
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const getNotificationIcon = (type: string, isNew: boolean) => {
    const iconClass = "w-6 h-6";

    switch (type) {
      case "success":
        return (
          <svg
            className={iconClass}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10.5 15.25C10.3071 15.2352 10.1276 15.1455 10 15L7.00001 12C6.93317 11.86 6.91136 11.7028 6.93759 11.5499C6.96382 11.3971 7.03679 11.2561 7.14646 11.1464C7.25613 11.0368 7.3971 10.9638 7.54996 10.9376C7.70282 10.9113 7.86006 10.9331 8.00001 11L10.47 13.47L19 4.99998C19.14 4.93314 19.2972 4.91133 19.4501 4.93756C19.6029 4.96379 19.7439 5.03676 19.8536 5.14643C19.9632 5.2561 20.0362 5.39707 20.0624 5.54993C20.0887 5.70279 20.0669 5.86003 20 5.99998L11 15C10.8724 15.1455 10.693 15.2352 10.5 15.25Z"
              fill="#16B257"
            />
            <path
              d="M12 21.0002C10.3915 20.9976 8.813 20.564 7.42891 19.7444C6.04481 18.9249 4.90566 17.7493 4.12999 16.3402C3.54118 15.2898 3.17682 14.1286 3.05999 12.9302C2.87697 11.1723 3.2156 9.39935 4.03363 7.83264C4.85167 6.26592 6.1129 4.97474 7.65999 4.12017C8.71036 3.53136 9.87152 3.16701 11.07 3.05017C12.2641 2.92284 13.4717 3.03849 14.62 3.39017C14.7224 3.41064 14.8195 3.4523 14.9049 3.51246C14.9903 3.57263 15.0622 3.64998 15.116 3.73955C15.1698 3.82913 15.2043 3.92896 15.2173 4.03263C15.2302 4.13631 15.2214 4.24155 15.1913 4.34161C15.1612 4.44167 15.1105 4.53433 15.0425 4.61367C14.9745 4.69301 14.8907 4.75726 14.7965 4.80232C14.7022 4.84738 14.5995 4.87224 14.4951 4.87531C14.3907 4.87839 14.2867 4.85961 14.19 4.82017C13.2187 4.52756 12.1987 4.43236 11.19 4.54017C10.1928 4.64145 9.22661 4.94423 8.34999 5.43017C7.50512 5.89628 6.75813 6.52103 6.14999 7.27017C5.52385 8.03333 5.05628 8.91376 4.77467 9.85989C4.49307 10.806 4.40308 11.7988 4.50999 12.7802C4.61126 13.7773 4.91405 14.7435 5.39999 15.6202C5.86609 16.465 6.49084 17.212 7.23999 17.8202C8.00315 18.4463 8.88357 18.9139 9.8297 19.1955C10.7758 19.4771 11.7686 19.5671 12.75 19.4602C13.7472 19.3589 14.7134 19.0561 15.59 18.5702C16.4349 18.1041 17.1818 17.4793 17.79 16.7302C18.4161 15.967 18.8837 15.0866 19.1653 14.1405C19.4469 13.1943 19.5369 12.2015 19.43 11.2202C19.4101 11.012 19.4737 10.8044 19.6069 10.6431C19.74 10.4818 19.9318 10.3801 20.14 10.3602C20.3482 10.3403 20.5558 10.4039 20.717 10.5371C20.8783 10.6702 20.9801 10.862 21 11.0702C21.1821 12.8291 20.842 14.6028 20.0221 16.1696C19.2022 17.7364 17.9389 19.027 16.39 19.8802C15.3284 20.4931 14.1493 20.8748 12.93 21.0002H12Z"
              fill="#16B257"
            />
          </svg>
        );
      case "warning":
        return (
          <svg
            className={iconClass}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10.575 5.21697L3.51699 17C3.37157 17.252 3.29466 17.5377 3.29389 17.8287C3.29313 18.1197 3.36854 18.4058 3.51263 18.6586C3.65673 18.9114 3.86448 19.1221 4.11524 19.2697C4.366 19.4173 4.65103 19.4967 4.94199 19.5H19.058C19.3491 19.497 19.6343 19.4178 19.8852 19.2702C20.1362 19.1227 20.3441 18.912 20.4882 18.6591C20.6324 18.4062 20.7077 18.1199 20.7068 17.8288C20.7059 17.5377 20.6287 17.252 20.483 17L13.426 5.21697C13.2776 4.9719 13.0684 4.76925 12.8188 4.6286C12.5692 4.48796 12.2875 4.41406 12.001 4.41406C11.7145 4.41406 11.4328 4.48796 11.1832 4.6286C10.9336 4.76925 10.7244 4.9719 10.576 5.21697"
              fill="white"
              fillOpacity="0.16"
            />
            <path
              d="M12 16H12.008M12 9.99997V13M10.575 5.21697L3.51699 17C3.37157 17.252 3.29466 17.5377 3.29389 17.8287C3.29313 18.1197 3.36854 18.4058 3.51263 18.6586C3.65673 18.9114 3.86448 19.1221 4.11524 19.2697C4.366 19.4173 4.65103 19.4967 4.94199 19.5H19.058C19.3491 19.497 19.6343 19.4178 19.8852 19.2702C20.1362 19.1227 20.3441 18.912 20.4882 18.6591C20.6324 18.4062 20.7077 18.1199 20.7068 17.8288C20.7059 17.5377 20.6287 17.252 20.483 17L13.426 5.21697C13.2776 4.9719 13.0684 4.76925 12.8188 4.6286C12.5692 4.48796 12.2875 4.41406 12.001 4.41406C11.7145 4.41406 11.4328 4.48796 11.1832 4.6286C10.9336 4.76925 10.7244 4.9719 10.576 5.21697"
              stroke="#F97316"
              strokeWidth="1.5"
              strokeMiterlimit="10"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      case "info":
        return (
          <svg
            className={iconClass}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 22C6.477 22 2 17.523 2 12C2 6.477 6.477 2 12 2C17.523 2 22 6.477 22 12C22 17.523 17.523 22 12 22ZM12 20C14.1217 20 16.1566 19.1571 17.6569 17.6569C19.1571 16.1566 20 14.1217 20 12C20 9.87827 19.1571 7.84344 17.6569 6.34315C16.1566 4.84285 14.1217 4 12 4C9.87827 4 7.84344 4.84285 6.34315 6.34315C4.84285 7.84344 4 9.87827 4 12C4 14.1217 4.84285 16.1566 6.34315 17.6569C7.84344 19.1571 9.87827 20 12 20ZM12 7C12.2652 7 12.5196 7.10536 12.7071 7.29289C12.8946 7.48043 13 7.73478 13 8V13C13 13.2652 12.8946 13.5196 12.7071 13.7071C12.5196 13.8946 12.2652 14 12 14C11.7348 14 11.4804 13.8946 11.2929 13.7071C11.1054 13.5196 11 13.2652 11 13V8C11 7.73478 11.1054 7.48043 11.2929 7.29289C11.4804 7.10536 11.7348 7 12 7ZM12 17C11.7348 17 11.4804 16.8946 11.2929 16.7071C11.1054 16.5196 11 16.2652 11 16C11 15.7348 11.1054 15.4804 11.2929 15.2929C11.4804 15.1054 11.7348 15 12 15C12.2652 15 12.5196 15.1054 12.7071 15.2929C12.8946 15.4804 13 15.7348 13 16C13 16.2652 12.8946 16.5196 12.7071 16.7071C12.5196 16.8946 12.2652 17 12 17Z"
              fill="#1E40AF"
            />
          </svg>
        );
      case "error":
        return (
          <svg
            className={iconClass}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 22C6.477 22 2 17.523 2 12C2 6.477 6.477 2 12 2C17.523 2 22 6.477 22 12C22 17.523 17.523 22 12 22ZM12 20C14.1217 20 16.1566 19.1571 17.6569 17.6569C19.1571 16.1566 20 14.1217 20 12C20 9.87827 19.1571 7.84344 17.6569 6.34315C16.1566 4.84285 14.1217 4 12 4C9.87827 4 7.84344 4.84285 6.34315 6.34315C4.84285 7.84344 4 9.87827 4 12C4 14.1217 4.84285 16.1566 6.34315 17.6569C7.84344 19.1571 9.87827 20 12 20Z"
              fill="#DC2626"
            />
            <path
              d="M12 8V12M12 16H12.01"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-300 mb-8" />

      <div className="px-6">
        {/* Title and Badge */}
        <div className="flex items-center gap-4 mb-8">
          <h1 className="text-3xl font-bold text-[#294758]">
            Notifications
          </h1>
          {newCount > 0 && (
            <div className="bg-[#EF4444] text-white px-3 py-1 rounded-xl text-[12px]">
              {newCount} new
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#294758] mx-auto mb-4"></div>
              <p className="text-[#6B7280] text-base">Loading notifications...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Filter Tabs and Mark All Read */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentFilter("all")}
                  className={`px-4 py-3 rounded-md text-sm transition-colors ${
                    currentFilter === "all"
                      ? "bg-[#294859] text-white"
                      : "bg-white border border-[#E4E4E4] text-[#294859] hover:bg-gray-50"
                  }`}
                >
                  All ({totalCount})
                </button>
                <button
                  onClick={() => setCurrentFilter("unread")}
                  className={`px-4 py-3 rounded-md text-sm transition-colors ${
                    currentFilter === "unread"
                      ? "bg-[#294859] text-white"
                      : "bg-white border border-[#E4E4E4] text-[#294859] hover:bg-gray-50"
                  }`}
                >
                  Unread ({unreadCount})
                </button>
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-2 px-4 py-3 border border-[#DCE0E4] rounded-lg bg-white text-[#294859] text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                  <Check size={20} />
                  Mark all as read
                </button>
              )}
            </div>

            {/* Notifications List */}
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[#6B7280] text-base">
                  {currentFilter === "unread"
                    ? "No unread notifications"
                    : "No notifications"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`w-full rounded-md shadow-lg transition-all ${
                      notification.isRead
                        ? "bg-white border border-[#D0D0D0]"
                        : "bg-[#FAFCFF] border-l-4 border-l-[#294859]"
                    }`}
                  >
                    <div className="p-6">
                      {/* Header with icon, title, and status dot */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {getNotificationIcon(notification.type, notification.isNew)}
                          <h3 className="text-lg font-bold text-[#111827]">
                            {notification.title}
                          </h3>
                          {notification.isNew && (
                            <div className="w-[10px] h-[10px] bg-[#294758] rounded-full" />
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-3">
                          {!notification.isRead && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="text-black hover:text-gray-600 transition-colors"
                              title="Mark as read"
                            >
                              <Check size={20} />
                            </button>
                          )}
                          <button
                            onClick={() => dismissNotification(notification.id)}
                            className="text-black/50 hover:text-black/70 transition-colors"
                            title="Dismiss"
                          >
                            <X size={20} />
                          </button>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-base text-[#485567] mb-4 leading-relaxed">
                        {notification.description}
                      </p>

                      {/* Timestamp */}
                      <div className="flex items-center gap-2 text-[#6B7280] text-[12px]">
                        <Clock size={13} />
                        <span>{notification.timestamp}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
