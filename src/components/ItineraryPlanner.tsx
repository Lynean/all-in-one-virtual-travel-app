import React, { useState } from 'react';
import { Calendar, MapPin, Clock, Plus, Trash2, Edit2, Save, X } from 'lucide-react';

interface Activity {
  id: string;
  time: string;
  title: string;
  location: string;
  duration: string;
  notes: string;
}

interface DayPlan {
  id: string;
  date: string;
  activities: Activity[];
}

export const ItineraryPlanner: React.FC = () => {
  const [days, setDays] = useState<DayPlan[]>([
    {
      id: '1',
      date: '2024-03-15',
      activities: [
        {
          id: '1-1',
          time: '09:00',
          title: 'Visit Eiffel Tower',
          location: 'Champ de Mars, Paris',
          duration: '2 hours',
          notes: 'Book tickets in advance',
        },
        {
          id: '1-2',
          time: '12:00',
          title: 'Lunch at Le Jules Verne',
          location: 'Eiffel Tower, 2nd Floor',
          duration: '1.5 hours',
          notes: 'Reservation required',
        },
        {
          id: '1-3',
          time: '15:00',
          title: 'Louvre Museum',
          location: 'Rue de Rivoli, Paris',
          duration: '3 hours',
          notes: 'See Mona Lisa and Venus de Milo',
        },
      ],
    },
  ]);

  const [editingActivity, setEditingActivity] = useState<string | null>(null);
  const [newActivity, setNewActivity] = useState<Partial<Activity>>({});

  const addDay = () => {
    const lastDate = days.length > 0 ? new Date(days[days.length - 1].date) : new Date();
    lastDate.setDate(lastDate.getDate() + 1);
    
    const newDay: DayPlan = {
      id: Date.now().toString(),
      date: lastDate.toISOString().split('T')[0],
      activities: [],
    };
    
    setDays([...days, newDay]);
  };

  const addActivity = (dayId: string) => {
    const activity: Activity = {
      id: `${dayId}-${Date.now()}`,
      time: newActivity.time || '09:00',
      title: newActivity.title || 'New Activity',
      location: newActivity.location || '',
      duration: newActivity.duration || '1 hour',
      notes: newActivity.notes || '',
    };

    setDays(days.map(day => 
      day.id === dayId 
        ? { ...day, activities: [...day.activities, activity] }
        : day
    ));

    setNewActivity({});
  };

  const deleteActivity = (dayId: string, activityId: string) => {
    setDays(days.map(day =>
      day.id === dayId
        ? { ...day, activities: day.activities.filter(a => a.id !== activityId) }
        : day
    ));
  };

  const deleteDay = (dayId: string) => {
    setDays(days.filter(day => day.id !== dayId));
  };

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Trip Itinerary</h1>
                <p className="text-gray-600 mt-1">Plan your perfect day-by-day adventure</p>
              </div>
            </div>
            <button
              onClick={addDay}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              <Plus className="w-5 h-5" />
              Add Day
            </button>
          </div>
        </div>

        {/* Days */}
        {days.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center shadow-lg border border-gray-200">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No days planned yet</h3>
            <p className="text-gray-600 mb-6">Start planning your trip by adding your first day</p>
            <button
              onClick={addDay}
              className="px-6 py-3 bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              Add First Day
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {days.map((day, dayIndex) => (
              <div
                key={day.id}
                className="bg-white rounded-3xl p-6 shadow-lg border border-gray-200"
              >
                {/* Day Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                      {dayIndex + 1}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        Day {dayIndex + 1}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {new Date(day.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteDay(day.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                {/* Activities */}
                <div className="space-y-4">
                  {day.activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex gap-4 p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors group"
                    >
                      <div className="flex-shrink-0 w-20 text-center">
                        <div className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold">
                          <Clock className="w-4 h-4" />
                          {activity.time}
                        </div>
                      </div>

                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-gray-900 mb-1">
                          {activity.title}
                        </h4>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {activity.location}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {activity.duration}
                          </div>
                        </div>
                        {activity.notes && (
                          <p className="text-sm text-gray-500 italic">{activity.notes}</p>
                        )}
                      </div>

                      <div className="flex-shrink-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditingActivity(activity.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteActivity(day.id, activity.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Add Activity Button */}
                  <button
                    onClick={() => addActivity(day.id)}
                    className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-500 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 font-semibold"
                  >
                    <Plus className="w-5 h-5" />
                    Add Activity
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AI Assistant Promo */}
        <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl p-8 text-white shadow-2xl">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Need help planning?</h2>
            <p className="text-purple-100 mb-6">
              Our AI assistant can create a complete itinerary based on your destination, interests, and travel style.
            </p>
            <button className="px-8 py-4 bg-white text-purple-600 rounded-xl font-semibold hover:shadow-lg transition-all">
              Generate AI Itinerary
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
