import events from './events.json';
import axios from 'axios';

async function getCurrentDate() {
  try {
    const response = await axios.get('https://time.ir/api/json/today');
    const data = response.data;
    const year = data.year;
    const month = String(data.month).padStart(2, '0');
    const day = String(data.day).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error fetching date from time.ir:', error);
    return null;
  }
}

function getEventsForDate(date) {
  const eventList = events.find(event => event.date === date);
  if (eventList) {
    return eventList.events;
  } else {
    return [];
  }
}

export {
  getCurrentDate,
  getEventsForDate,
};